import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MomoService } from './momo.service';
import { MomoCallbackDto } from './dto/momo-callback.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly momoService: MomoService,
  ) {}

  async createMomoPayment(customerId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order || order.customerId !== customerId) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }
    if (order.paymentMethod !== PaymentMethod.MOMO) {
      throw new BadRequestException('Đơn hàng này không sử dụng phương thức MoMo');
    }
    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new ConflictException('Đơn hàng đã được thanh toán');
    }

    const response = await this.momoService.createPayment(
      order.id,
      Number(order.totalAmount),
      `Thanh toan don hang ${order.id}`,
    );

    if (response.resultCode !== 0 || !response.payUrl) {
      throw new BadRequestException(response.message ?? 'Không thể tạo giao dịch MoMo');
    }

    return { payUrl: response.payUrl };
  }

  async confirmCallback(dto: MomoCallbackDto) {
    if (!this.momoService.verifyCallbackSignature(dto)) {
      throw new ForbiddenException('Chữ ký không hợp lệ');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { payment: true },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    const success = Number(dto.resultCode) === 0;

    if (order.paymentStatus !== PaymentStatus.PAID) {
      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { orderId: order.id },
          data: {
            status: success ? PaymentStatus.PAID : PaymentStatus.FAILED,
            momoTransId: dto.transId,
            paidAt: success ? new Date() : null,
          },
        }),
        this.prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: success ? PaymentStatus.PAID : PaymentStatus.FAILED },
        }),
      ]);
    }

    return { success, orderId: order.id, message: dto.message };
  }

  async getStatus(customerId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order || order.customerId !== customerId) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }
    return { paymentStatus: order.paymentStatus, payment: order.payment };
  }
}
