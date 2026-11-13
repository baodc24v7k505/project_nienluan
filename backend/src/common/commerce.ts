import { ConflictException } from '@nestjs/common';
import { Prisma, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export async function transact<T>(
  db: PrismaService,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await db.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 15000,
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2034'
      )
        throw error;
      if (attempt === 4)
        throw new ConflictException(
          'Dữ liệu đang được cập nhật, vui lòng thử lại',
        );
      await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
    }
  }
  throw new ConflictException();
}

export async function syncProduct(
  tx: Prisma.TransactionClient,
  productId: string,
) {
  const variants = await tx.productVariant.aggregate({
    where: { productId, isActive: true },
    _sum: { stock: true },
    _min: { price: true },
  });
  await tx.product.update({
    where: { id: productId },
    data: {
      stock: variants._sum.stock ?? 0,
      ...(variants._min.price ? { price: variants._min.price } : {}),
    },
  });
}

export async function restoreStock(
  tx: Prisma.TransactionClient,
  shopOrderId: string,
) {
  const items = await tx.orderItem.findMany({ where: { shopOrderId } });
  for (const item of items) {
    if (item.variantId)
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      });
    else
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
  }
  for (const id of new Set(
    items.filter((i) => i.variantId).map((i) => i.productId),
  ))
    await syncProduct(tx, id);
}

export async function requestRefund(
  tx: Prisma.TransactionClient,
  shopOrderId: string,
  reason: string,
) {
  const so = await tx.shopOrder.findUniqueOrThrow({
    where: { id: shopOrderId },
  });
  if (Number(so.paidAmount) <= 0) return;
  const existing = await tx.refund.findFirst({ where: { shopOrderId } });
  if (!existing)
    await tx.refund.create({
      data: { shopOrderId, orderId: so.orderId, amount: so.paidAmount, reason },
    });
}

export async function syncPayment(
  tx: Prisma.TransactionClient,
  orderId: string,
) {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      shopOrders: true,
      refunds: true,
      paymentAttempts: { where: { resultCode: '0' } },
    },
  });
  const captured = Math.max(
    order.shopOrders.reduce((s, o) => s + Number(o.paidAmount), 0),
    order.paymentAttempts.reduce((s, a) => s + Number(a.amount), 0),
  );
  const active = order.shopOrders.filter(
    (o) => !['CANCELLED', 'RETURNED'].includes(o.status),
  );
  const due = active.reduce((s, o) => s + Number(o.totalAmount), 0);
  const refunded = order.refunds
    .filter((r) => r.status === 'COMPLETED')
    .reduce((s, r) => s + Number(r.amount), 0);
  let status: PaymentStatus =
    captured > 0 && captured >= due ? 'PAID' : 'PENDING';
  if (refunded > 0)
    status = refunded >= captured ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
  if (!captured && !due) status = active.length ? 'PAID' : 'FAILED';
  await tx.order.update({
    where: { id: orderId },
    data: { paymentStatus: status },
  });
  await tx.payment.update({
    where: { orderId },
    data: {
      status,
      ...(captured
        ? { paidAt: order.paymentStatus === 'PENDING' ? new Date() : undefined }
        : {}),
    },
  });
}
