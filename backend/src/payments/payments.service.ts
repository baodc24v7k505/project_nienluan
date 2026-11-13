import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MomoService } from './momo.service';
import { MomoCallbackDto } from './dto/momo-callback.dto';
import { requestRefund, syncPayment, transact } from '../common/commerce';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly momoService: MomoService,
    private readonly orders: OrdersService,
  ) {}
  async createMomoPayment(customerId: string, orderId: string) {
    await this.orders.expireUnpaid();
    const attempt = await transact(this.prisma, async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, customerId },
        include: {
          shopOrders: true,
          paymentAttempts: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
      if (order.paymentMethod !== 'MOMO')
        throw new BadRequestException('Đơn không sử dụng MoMo');
      if (!['PENDING', 'FAILED'].includes(order.paymentStatus))
        throw new ConflictException('Đơn đã được thanh toán');
      if (
        order.shopOrders.some((s) => s.status !== 'PENDING') ||
        (order.expiresAt && order.expiresAt <= new Date())
      )
        throw new BadRequestException(
          'Đơn đã hủy hoặc hết hạn. Vui lòng đặt đơn mới',
        );
      const previous = order.paymentAttempts[0];
      if (previous && (!previous.resultCode || previous.resultCode === '9000'))
        return previous;
      return tx.paymentAttempt.create({
        data: {
          orderId,
          providerOrderId: `${orderId}-${randomUUID().slice(0, 8)}`,
          requestId: randomUUID(),
          amount: order.totalAmount,
        },
      });
    });
    if (attempt.payUrl) return { payUrl: attempt.payUrl };
    // Reuse both providerOrderId and requestId after network uncertainty.
    const response = await this.momoService.createPayment(
      attempt.providerOrderId,
      Number(attempt.amount),
      `Thanh toan don ${orderId}`,
      attempt.requestId,
    );
    if (response.resultCode !== 0 || !response.payUrl) {
      // Duplicate request may mean an earlier create succeeded; don't make a new charge identity.
      if (response.resultCode !== 40)
        await this.prisma.paymentAttempt.update({
          where: { id: attempt.id },
          data: { resultCode: String(response.resultCode) },
        });
      throw new BadRequestException(
        response.message ?? 'Không thể tạo giao dịch MoMo. Vui lòng thử lại',
      );
    }
    await this.prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: { payUrl: response.payUrl },
    });
    return { payUrl: response.payUrl };
  }
  async confirmCallback(dto: MomoCallbackDto) {
    if (!this.momoService.verifyCallbackSignature(dto))
      throw new ForbiddenException('Chữ ký hoặc đối tác không hợp lệ');
    await this.orders.expireUnpaid();
    return transact(this.prisma, async (tx) => {
      let attempt = await tx.paymentAttempt.findUnique({
        where: { providerOrderId: dto.orderId },
      });
      // Older checkouts created before the upgrade may still send their original order id.
      const order = await tx.order.findUnique({
        where: { id: attempt?.orderId ?? dto.orderId },
        include: { payment: true, shopOrders: true },
      });
      if (!order || order.paymentMethod !== 'MOMO')
        throw new NotFoundException('Không tìm thấy giao dịch MoMo');
      if (attempt && dto.requestId !== attempt.requestId)
        throw new BadRequestException('Mã yêu cầu không khớp');
      if (
        !/^\d+$/.test(dto.amount) ||
        Number(dto.amount) !== Number(attempt?.amount ?? order.totalAmount)
      )
        throw new BadRequestException('Số tiền thanh toán không khớp');
      const success = dto.resultCode === '0';
      if (attempt?.resultCode === '0')
        return {
          success: true,
          orderId: order.id,
          message: 'Đã ghi nhận thanh toán',
        };
      if (
        !attempt &&
        order.payment?.momoTransId === dto.transId &&
        order.paymentStatus !== 'PENDING'
      )
        return { success: true, orderId: order.id, message: 'Đã ghi nhận' };
      if (success && !dto.transId)
        throw new BadRequestException('Thiếu mã giao dịch');
      if (!attempt)
        attempt = await tx.paymentAttempt.create({
          data: {
            orderId: order.id,
            providerOrderId: dto.orderId,
            requestId: dto.requestId,
            amount: order.totalAmount,
          },
        });
      if (attempt)
        await tx.paymentAttempt.update({
          where: { id: attempt.id },
          data: {
            resultCode: dto.resultCode,
            ...(success ? { transactionId: dto.transId } : {}),
          },
        });
      if (success) {
        const alreadyCaptured = order.shopOrders.some(
          (s) => Number(s.paidAmount) > 0,
        );
        if (alreadyCaptured) {
          await tx.refund.create({
            data: {
              orderId: order.id,
              amount: dto.amount,
              reason: `Thanh toán trùng giao dịch ${dto.transId}`,
            },
          });
        } else {
          for (const so of order.shopOrders) {
            await tx.shopOrder.update({
              where: { id: so.id },
              data: { paidAmount: so.totalAmount },
            });
            if (['CANCELLED', 'RETURNED'].includes(so.status))
              await requestRefund(
                tx,
                so.id,
                'Thanh toán đến sau khi đơn đã hủy/trả hàng',
              );
          }
          await tx.payment.update({
            where: { orderId: order.id },
            data: { momoTransId: dto.transId, paidAt: new Date() },
          });
        }
        await syncPayment(tx, order.id);
      } else if (
        dto.resultCode !== '9000' &&
        !order.shopOrders.some((s) => Number(s.paidAmount) > 0)
      ) {
        await tx.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'FAILED' },
        });
        await tx.payment.update({
          where: { orderId: order.id },
          data: { status: 'FAILED' },
        });
      }
      return {
        success:
          success || order.shopOrders.some((s) => Number(s.paidAmount) > 0),
        orderId: order.id,
        message: dto.message,
      };
    });
  }
  async getStatus(customerId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId },
      include: { payment: true },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    return { paymentStatus: order.paymentStatus, payment: order.payment };
  }
}
