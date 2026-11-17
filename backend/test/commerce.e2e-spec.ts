import { Test } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createHmac, randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { MomoService } from '../src/payments/momo.service';
import { OrdersService } from '../src/orders/orders.service';

jest.setTimeout(60000);
describe('Commerce integration with PostgreSQL', () => {
  let app: NestExpressApplication,
    db: PrismaService,
    orders: OrdersService,
    momo: MomoService;
  const users: Record<
    string,
    { id: string; token: string; addressId: string }
  > = {};
  let shopId: string, secondShop: string;
  const tag = randomUUID().slice(0, 8);
  const call = (
    role: string,
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
  ) =>
    request(app.getHttpServer())
      [method](`/api${path}`)
      .set('Authorization', `Bearer ${users[role].token}`);
  async function product(stock = 10, shop = shopId) {
    return db.product.create({
      data: {
        name: `Áo thử ${randomUUID()}`,
        slug: randomUUID(),
        shopId: shop,
        status: 'ACTIVE',
        price: 100000,
        stock,
        variants: {
          create: { sku: 'TEST', name: 'Màu đen / M', price: 100000, stock },
        },
      },
      include: { variants: true },
    });
  }
  function payload(
    role: string,
    p: Awaited<ReturnType<typeof product>>,
    extra: Record<string, unknown> = {},
  ) {
    return {
      addressId: users[role].addressId,
      paymentMethod: 'COD',
      directItem: { productId: p.id, variantId: p.variants[0].id, quantity: 1 },
      idempotencyKey: randomUUID(),
      ...extra,
    };
  }
  async function placed(role = 'customer', method = 'COD') {
    const p = await product();
    const response = await call(role, 'post', '/orders')
      .send(payload(role, p, { paymentMethod: method }))
      .expect(201);
    return { p, order: response.body, so: response.body.shopOrders[0] };
  }
  function callback(
    attempt: any,
    code = 0,
    amount = 130000,
    trans = String(Date.now()) + Math.floor(Math.random() * 1000),
  ) {
    const d = {
      partnerCode: 'TEST_PARTNER',
      orderId: attempt.providerOrderId,
      requestId: attempt.requestId,
      amount,
      orderInfo: 'test',
      orderType: 'momo_wallet',
      transId: trans,
      resultCode: code,
      message: 'Successful',
      payType: 'qr',
      responseTime: Date.now(),
      extraData: '',
    };
    const raw = `accessKey=integration-access&amount=${d.amount}&extraData=&message=${d.message}&orderId=${d.orderId}&orderInfo=${d.orderInfo}&orderType=${d.orderType}&partnerCode=${d.partnerCode}&payType=${d.payType}&requestId=${d.requestId}&responseTime=${d.responseTime}&resultCode=${d.resultCode}&transId=${d.transId}`;
    return {
      ...d,
      signature: createHmac('sha256', 'integration-secret')
        .update(raw)
        .digest('hex'),
    };
  }
  beforeAll(async () => {
    if (!new URL(process.env.DATABASE_URL!).pathname.endsWith('_test'))
      throw new Error('Integration tests require a separate *_test database');
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
    db = app.get(PrismaService);
    orders = app.get(OrdersService);
    momo = app.get(MomoService);
    jest.spyOn(momo, 'createPayment').mockResolvedValue({
      resultCode: 0,
      message: 'OK',
      payUrl: 'https://test-payment.momo.vn/demo',
    });
    const passwordHash = await bcrypt.hash('password123', 4);
    for (const [key, role] of Object.entries({
      customer: 'CUSTOMER',
      other: 'CUSTOMER',
      seller: 'SELLER',
      seller2: 'SELLER',
      admin: 'ADMIN',
      staff: 'STAFF',
    } as const)) {
      const user = await db.user.create({
        data: {
          email: `${key}-${tag}@test.local`,
          fullName: `Test ${key}`,
          passwordHash,
          role,
        },
      });
      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: user.email, password: 'password123' })
        .expect(200);
      const address = await db.address.create({
        data: {
          userId: user.id,
          recipientName: 'Người nhận thử',
          phone: '0901234567',
          line: '123 Đường Kiểm Thử',
          city: 'Cần Thơ',
        },
      });
      users[key] = {
        id: user.id,
        token: login.body.accessToken,
        addressId: address.id,
      };
    }
    shopId = (
      await db.shop.create({
        data: {
          ownerId: users.seller.id,
          name: 'Shop test',
          status: 'APPROVED',
        },
      })
    ).id;
    secondShop = (
      await db.shop.create({
        data: {
          ownerId: users.seller2.id,
          name: 'Shop test 2',
          status: 'APPROVED',
        },
      })
    ).id;
  });
  afterAll(async () => {
    await app?.close();
  });

  it('rejects unauthenticated checkout and access to another customer order', async () => {
    await request(app.getHttpServer()).post('/api/orders').send({}).expect(401);
    const { order } = await placed();
    await call('other', 'get', `/orders/${order.id}`).expect(404);
  });
  it('creates product variants through the seller API', async () => {
    const response = await call('seller', 'post', '/seller/products')
      .send({
        name: 'Áo phân loại',
        price: 100000,
        stock: 0,
        variants: [
          { sku: 'M', name: 'Size M', price: 120000, stock: 3 },
          { sku: 'L', name: 'Size L', price: 150000, stock: 4 },
        ],
      })
      .expect(201);
    expect(response.body.stock).toBe(7);
    expect(response.body.variants).toHaveLength(2);
    expect(Number(response.body.price)).toBe(120000);
  });
  it('does not oversell the final SKU under concurrent checkout', async () => {
    const p = await product(1);
    const responses = await Promise.all(
      ['customer', 'other'].map((role) =>
        call(role, 'post', '/orders').send(payload(role, p)),
      ),
    );
    expect(responses.filter((r) => r.status === 201)).toHaveLength(1);
    expect(responses.filter((r) => [400, 409].includes(r.status))).toHaveLength(
      1,
    );
    expect(
      (
        await db.productVariant.findUniqueOrThrow({
          where: { id: p.variants[0].id },
        })
      ).stock,
    ).toBe(0);
  });
  it('returns the same order for concurrent idempotent requests', async () => {
    const p = await product(5),
      data = payload('customer', p);
    const responses = await Promise.all([
      call('customer', 'post', '/orders').send(data),
      call('customer', 'post', '/orders').send(data),
    ]);
    expect(responses.map((r) => r.status)).toEqual([201, 201]);
    expect(responses[0].body.id).toBe(responses[1].body.id);
    expect(
      (
        await db.productVariant.findUniqueOrThrow({
          where: { id: p.variants[0].id },
        })
      ).stock,
    ).toBe(4);
  });
  it('enforces the final voucher redemption under concurrency', async () => {
    const p = await product(),
      code = `FINAL-${randomUUID()}`.toUpperCase();
    await db.voucher.create({
      data: {
        code,
        scope: 'PLATFORM',
        discountType: 'FIXED',
        discountValue: 10000,
        usageLimit: 1,
        startAt: new Date(Date.now() - 1000),
        endAt: new Date(Date.now() + 86400000),
      },
    });
    const responses = await Promise.all(
      ['customer', 'other'].map((role) =>
        call(role, 'post', '/orders').send(
          payload(role, p, { voucherCode: code }),
        ),
      ),
    );
    expect(responses.filter((r) => r.status === 201)).toHaveLength(1);
    expect(
      await db.voucherRedemption.count({ where: { voucher: { code } } }),
    ).toBe(1);
  });
  it('restores stock only once when cancellation requests race', async () => {
    const { p, so } = await placed();
    const responses = await Promise.all(
      [1, 2].map(() =>
        call('customer', 'patch', `/orders/shop-orders/${so.id}/cancel`).send({
          reason: 'Đổi ý mua hàng',
        }),
      ),
    );
    expect(responses.filter((r) => r.status === 200)).toHaveLength(1);
    expect(
      (
        await db.productVariant.findUniqueOrThrow({
          where: { id: p.variants[0].id },
        })
      ).stock,
    ).toBe(10);
    expect(
      await db.orderStatusHistory.count({
        where: { shopOrderId: so.id, status: 'CANCELLED' },
      }),
    ).toBe(1);
  });
  it('keeps unselected cart rows and direct-buy does not consume the cart', async () => {
    const a = await product(),
      b = await product();
    const ca = await call('customer', 'post', '/cart')
      .send({ productId: a.id, variantId: a.variants[0].id, quantity: 1 })
      .expect(201);
    const cb = await call('customer', 'post', '/cart')
      .send({ productId: b.id, variantId: b.variants[0].id, quantity: 1 })
      .expect(201);
    await call('customer', 'post', '/orders')
      .send(payload('customer', a))
      .expect(201);
    expect(
      await db.cartItem.count({
        where: { id: { in: [ca.body.id, cb.body.id] } },
      }),
    ).toBe(2);
    await call('customer', 'post', '/orders')
      .send({
        addressId: users.customer.addressId,
        paymentMethod: 'COD',
        cartItemIds: [ca.body.id],
        idempotencyKey: randomUUID(),
      })
      .expect(201);
    expect(
      await db.cartItem.findUnique({ where: { id: cb.body.id } }),
    ).not.toBeNull();
  });
  it('splits shipping and discounts exactly across two shops', async () => {
    const a = await product(),
      b = await product(10, secondShop);
    const rows = await Promise.all(
      [a, b].map((p) =>
        call('other', 'post', '/cart').send({
          productId: p.id,
          variantId: p.variants[0].id,
          quantity: 1,
        }),
      ),
    );
    const code = `SPLIT-${tag}`.toUpperCase();
    await db.voucher.create({
      data: {
        code,
        scope: 'PLATFORM',
        discountType: 'FIXED',
        discountValue: 33333,
        startAt: new Date(Date.now() - 1000),
        endAt: new Date(Date.now() + 86400000),
      },
    });
    const response = await call('other', 'post', '/orders')
      .send({
        addressId: users.other.addressId,
        paymentMethod: 'COD',
        cartItemIds: rows.map((r) => r.body.id),
        voucherCode: code,
      })
      .expect(201);
    expect(response.body.shopOrders).toHaveLength(2);
    expect(
      response.body.shopOrders.reduce(
        (s: number, o: any) => s + Number(o.discountAmount),
        0,
      ),
    ).toBe(33333);
    expect(Number(response.body.totalAmount)).toBe(226667);
  });
  it('prevents staff management and admin banning through the API', async () => {
    await call('staff', 'post', '/admin/staff')
      .send({
        email: 'new@test.local',
        fullName: 'Staff test',
        password: 'password123',
      })
      .expect(403);
    await call('staff', 'patch', `/admin/users/${users.admin.id}/status`)
      .send({ status: 'BANNED' })
      .expect(403);
    await call('admin', 'patch', `/admin/users/${users.admin.id}/status`)
      .send({ status: 'BANNED' })
      .expect(409);
  });
  it('rejects another seller and unpaid MoMo fulfillment', async () => {
    const { so } = await placed('customer', 'MOMO');
    await call('seller2', 'patch', `/seller/orders/${so.id}/status`)
      .send({ status: 'CONFIRMED' })
      .expect(404);
    await call('seller', 'patch', `/seller/orders/${so.id}/status`)
      .send({ status: 'CONFIRMED' })
      .expect(400);
  });
  it('keeps the same MoMo attempt after a blocked or uncertain gateway request', async () => {
    const { order } = await placed('customer', 'MOMO');
    const mock = jest.spyOn(momo, 'createPayment');
    mock.mockRejectedValueOnce(
      new ServiceUnavailableException({
        message: 'MoMo gateway blocked',
        code: 'MOMO_GATEWAY_BLOCKED',
      }),
    );
    const first = await call('customer', 'post', '/payments/momo/create')
      .send({ orderId: order.id })
      .expect(503);
    expect(first.body.message).toBe('MoMo gateway blocked');
    expect(first.body.code).toBe('MOMO_GATEWAY_BLOCKED');
    const attempt = await db.paymentAttempt.findFirstOrThrow({
      where: { orderId: order.id },
    });
    expect(attempt.resultCode).toBeNull();
    await call('customer', 'post', '/payments/momo/create')
      .send({ orderId: order.id })
      .expect(201);
    expect(
      await db.paymentAttempt.count({ where: { orderId: order.id } }),
    ).toBe(1);
    expect(mock.mock.calls.at(-1)).toEqual(mock.mock.calls.at(-2));
    const pending = await db.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(pending.paymentStatus).toBe('PENDING');
    expect(
      (await db.payment.findUniqueOrThrow({ where: { orderId: order.id } }))
        .status,
    ).toBe('PENDING');
  });
  it('accepts numeric signed IPN, rejects wrong amounts and handles duplicate callbacks', async () => {
    const { order, so } = await placed('customer', 'MOMO');
    await call('customer', 'post', '/payments/momo/create')
      .send({ orderId: order.id })
      .expect(201);
    const attempt = await db.paymentAttempt.findFirstOrThrow({
      where: { orderId: order.id },
    });
    await request(app.getHttpServer())
      .post('/api/payments/momo/ipn')
      .send(callback(attempt, 0, 1))
      .expect(400);
    const valid = callback(attempt);
    await request(app.getHttpServer())
      .post('/api/payments/momo/ipn')
      .send({ ...valid, signature: '0'.repeat(64) })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/payments/momo/ipn')
      .send(valid)
      .expect(204);
    await request(app.getHttpServer())
      .post('/api/payments/momo/ipn')
      .send(valid)
      .expect(204);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } }))
        .paymentStatus,
    ).toBe('PAID');
    expect(
      Number(
        (await db.shopOrder.findUniqueOrThrow({ where: { id: so.id } }))
          .paidAmount,
      ),
    ).toBe(130000);
    await request(app.getHttpServer())
      .post('/api/payments/momo/ipn')
      .send(callback(attempt, 1006))
      .expect(204);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } }))
        .paymentStatus,
    ).toBe('PAID');
  });
  it('expires abandoned payment once and queues a late payment refund', async () => {
    const { order, so, p } = await placed('customer', 'MOMO');
    await call('customer', 'post', '/payments/momo/create')
      .send({ orderId: order.id })
      .expect(201);
    const attempt = await db.paymentAttempt.findFirstOrThrow({
      where: { orderId: order.id },
    });
    await db.order.update({
      where: { id: order.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await orders.expireUnpaid();
    await orders.expireUnpaid();
    expect(
      (
        await db.productVariant.findUniqueOrThrow({
          where: { id: p.variants[0].id },
        })
      ).stock,
    ).toBe(10);
    await request(app.getHttpServer())
      .post('/api/payments/momo/ipn')
      .send(callback(attempt))
      .expect(204);
    expect(await db.refund.count({ where: { shopOrderId: so.id } })).toBe(1);
    expect(
      (await db.shopOrder.findUniqueOrThrow({ where: { id: so.id } })).status,
    ).toBe('CANCELLED');
  });
  it('completes COD, shipping, return approval, restock and manual refund', async () => {
    const { order, so, p } = await placed();
    await call('seller', 'patch', `/seller/orders/${so.id}/status`)
      .send({ status: 'CONFIRMED' })
      .expect(200);
    await call('seller', 'patch', `/seller/orders/${so.id}/status`)
      .send({ status: 'SHIPPING' })
      .expect(400);
    await call('seller', 'patch', `/seller/orders/${so.id}/shipping`)
      .send({ carrier: 'Vận chuyển demo', trackingCode: 'DEMO12345' })
      .expect(200);
    await call('seller', 'patch', `/seller/orders/${so.id}/status`)
      .send({ status: 'SHIPPING' })
      .expect(200);
    await call('seller', 'patch', `/seller/orders/${so.id}/status`)
      .send({ status: 'DELIVERED' })
      .expect(200);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } }))
        .paymentStatus,
    ).toBe('PAID');
    await call('customer', 'post', `/orders/shop-orders/${so.id}/return`)
      .send({ reason: 'Sản phẩm giao không đúng phân loại', evidenceUrls: [] })
      .expect(201);
    await call('seller', 'patch', `/seller/orders/${so.id}/return`)
      .send({ status: 'APPROVED', resolution: 'Chấp thuận nhận lại hàng' })
      .expect(200);
    await call('seller', 'patch', `/seller/orders/${so.id}/return`)
      .send({ status: 'RECEIVED', resolution: 'Đã kiểm tra nhận đủ hàng' })
      .expect(200);
    expect(
      (
        await db.productVariant.findUniqueOrThrow({
          where: { id: p.variants[0].id },
        })
      ).stock,
    ).toBe(10);
    const refund = await db.refund.findFirstOrThrow({
      where: { shopOrderId: so.id },
    });
    await call('staff', 'patch', `/admin/orders/refunds/${refund.id}/complete`)
      .send({ reference: 'BANK12345' })
      .expect(403);
    await call('admin', 'patch', `/admin/orders/refunds/${refund.id}/complete`)
      .send({ reference: 'BANK12345' })
      .expect(200);
    await call('admin', 'patch', `/admin/orders/refunds/${refund.id}/complete`)
      .send({ reference: 'BANK12345' })
      .expect(409);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } }))
        .paymentStatus,
    ).toBe('REFUNDED');
  });
  it('reports only the requested period and rejects an invalid range', async () => {
    const result = await call(
      'admin',
      'get',
      '/admin/statistics?from=2001-01-01&to=2001-01-02',
    ).expect(200);
    expect(result.body.totalRevenue).toBe(0);
    expect(result.body.totalOrders).toBe(0);
    expect(result.body.revenueByDay).toHaveLength(2);
    await call(
      'admin',
      'get',
      '/admin/statistics?from=2026-12-01&to=2026-01-01',
    ).expect(400);
    await call('admin', 'get', '/admin/statistics?days=abc').expect(400);
  });
  it('uploads real image bytes and rejects fake image files', async () => {
    await call('seller', 'post', '/media')
      .attach('file', Buffer.from('not an image'), {
        filename: 'fake.png',
        contentType: 'image/png',
      })
      .expect(400);
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=',
      'base64',
    );
    const result = await call('seller', 'post', '/media')
      .attach('file', png, { filename: 'pixel.png', contentType: 'image/png' })
      .expect(201);
    await request(app.getHttpServer())
      .get(new URL(result.body.url as string).pathname)
      .expect(200)
      .expect('Content-Type', /image\/png/);
  });
  it('rejects already-issued access tokens when the user is banned', async () => {
    await call('admin', 'patch', `/admin/users/${users.other.id}/status`)
      .send({ status: 'BANNED' })
      .expect(200);
    await call('other', 'get', '/auth/me').expect(401);
  });
  it('paginates chat history, marks read and links seller notifications correctly', async () => {
    const conv = await call('customer', 'post', '/conversations')
      .send({ type: 'DIRECT', shopId })
      .expect(201);
    await db.message.createMany({
      data: Array.from({ length: 35 }, (_, i) => ({
        conversationId: conv.body.id,
        senderId: users.customer.id,
        body: `Tin nhắn ${i}`,
        createdAt: new Date(Date.now() - 100000 + i * 1000),
      })),
    });
    const page1 = await call(
      'seller',
      'get',
      `/conversations/${conv.body.id}/messages?page=1&pageSize=20`,
    ).expect(200);
    const page2 = await call(
      'seller',
      'get',
      `/conversations/${conv.body.id}/messages?page=2&pageSize=20`,
    ).expect(200);
    expect(page1.body).toHaveLength(20);
    expect(page2.body).toHaveLength(15);
    expect(new Set([...page1.body, ...page2.body].map((m) => m.id)).size).toBe(
      35,
    );
    expect(
      await db.message.count({
        where: { conversationId: conv.body.id, readAt: null },
      }),
    ).toBe(0);
    await call(
      'seller2',
      'get',
      `/conversations/${conv.body.id}/messages`,
    ).expect(403);
    await call('customer', 'post', `/conversations/${conv.body.id}/messages`)
      .send({ body: 'Xin chào shop' })
      .expect(201);
    expect(
      (
        await db.notification.findFirstOrThrow({
          where: { userId: users.seller.id, type: 'NEW_MESSAGE' },
          orderBy: { createdAt: 'desc' },
        })
      ).link,
    ).toBe(`/seller/chat?conversationId=${conv.body.id}`);
  });
  it('rejects category cycles and invalid voucher percentages', async () => {
    const a = await db.category.create({
      data: { name: 'Cha', slug: randomUUID() },
    });
    const b = await db.category.create({
      data: { name: 'Con', slug: randomUUID(), parentId: a.id },
    });
    await call('admin', 'patch', `/categories/${a.id}`)
      .send({ parentId: b.id })
      .expect(409);
    await call('admin', 'post', '/admin/vouchers')
      .send({
        code: `BAD-${tag}`,
        discountType: 'PERCENT',
        discountValue: 110,
        startAt: new Date(Date.now() - 1000).toISOString(),
        endAt: new Date(Date.now() + 100000).toISOString(),
      })
      .expect(400);
  });
  it('handles a zero-cost voucher order without requiring MoMo payment', async () => {
    const p = await product();
    await db.productVariant.update({
      where: { id: p.variants[0].id },
      data: { price: 500000 },
    });
    await db.product.update({ where: { id: p.id }, data: { price: 500000 } });
    const code = `FREE-${tag}`.toUpperCase();
    await db.voucher.create({
      data: {
        code,
        scope: 'PLATFORM',
        discountType: 'PERCENT',
        discountValue: 100,
        startAt: new Date(Date.now() - 1000),
        endAt: new Date(Date.now() + 100000),
      },
    });
    const response = await call('customer', 'post', '/orders')
      .send(
        payload('customer', p, { paymentMethod: 'MOMO', voucherCode: code }),
      )
      .expect(201);
    expect(Number(response.body.totalAmount)).toBe(0);
    expect(response.body.paymentStatus).toBe('PAID');
    await call(
      'seller',
      'patch',
      `/seller/orders/${response.body.shopOrders[0].id}/status`,
    )
      .send({ status: 'CONFIRMED' })
      .expect(200);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: response.body.id } }))
        .paymentStatus,
    ).toBe('PAID');
  });
  it('accounts for a second successful payment and queues its refund only once', async () => {
    const { order } = await placed('customer', 'MOMO');
    await call('customer', 'post', '/payments/momo/create')
      .send({ orderId: order.id })
      .expect(201);
    const first = await db.paymentAttempt.findFirstOrThrow({
      where: { orderId: order.id },
    });
    await request(app.getHttpServer())
      .post('/api/payments/momo/ipn')
      .send(callback(first))
      .expect(204);
    const before = await call('admin', 'get', '/admin/statistics').expect(200);
    const second = await db.paymentAttempt.create({
      data: {
        orderId: order.id,
        providerOrderId: randomUUID(),
        requestId: randomUUID(),
        amount: 130000,
      },
    });
    const data = callback(second);
    await request(app.getHttpServer())
      .post('/api/payments/momo/ipn')
      .send(data)
      .expect(204);
    await request(app.getHttpServer())
      .post('/api/payments/momo/ipn')
      .send(data)
      .expect(204);
    const refund = await db.refund.findFirstOrThrow({
      where: { orderId: order.id, shopOrderId: null },
    });
    expect(await db.refund.count({ where: { orderId: order.id } })).toBe(1);
    const after = await call('admin', 'get', '/admin/statistics').expect(200);
    expect(after.body.totalCollected - before.body.totalCollected).toBe(130000);
    await call('admin', 'patch', `/admin/orders/refunds/${refund.id}/complete`)
      .send({ reference: 'DUPLICATE-REFUND' })
      .expect(200);
    const settled = await call('admin', 'get', '/admin/statistics').expect(200);
    expect(settled.body.totalRevenue).toBe(before.body.totalRevenue);
  });
  it('protects advertisement deletion requests and lets owners cancel or resubmit', async () => {
    const response = await call('seller', 'post', '/seller/ads')
      .send({
        title: `Campaign ${tag}`,
        imageUrl: 'https://example.com/banner.jpg',
        startAt: new Date(Date.now() - 60000).toISOString(),
        endAt: new Date(Date.now() + 86400000).toISOString(),
      })
      .expect(201);
    const id = response.body.id;
    await call('admin', 'patch', `/admin/ads/${id}/status`)
      .send({ status: 'APPROVED' })
      .expect(200);
    await call('seller2', 'post', `/seller/ads/${id}/deletion-request`)
      .send({ reason: 'Not my campaign' })
      .expect(404);
    await call('seller', 'post', `/seller/ads/${id}/deletion-request`)
      .send({ reason: '     ' })
      .expect(400);
    await call('seller', 'post', `/seller/ads/${id}/deletion-request`)
      .send({ reason: '  Campaign has ended  ' })
      .expect(201);
    await call('seller', 'post', `/seller/ads/${id}/deletion-request`)
      .send({ reason: 'Another request' })
      .expect(409);
    await call(
      'seller2',
      'delete',
      `/seller/ads/${id}/deletion-request`,
    ).expect(404);
    await call('staff', 'delete', `/admin/ads/${id}`).expect(403);
    await call('staff', 'patch', `/admin/ads/${id}/deletion-request`)
      .send({ note: 'Not authorized' })
      .expect(403);
    await call('admin', 'patch', `/admin/ads/${id}/status`)
      .send({ status: 'REJECTED' })
      .expect(409);
    const pending = await call(
      'admin',
      'get',
      `/admin/ads?deletionRequested=true&status=APPROVED&search=${tag}&pageSize=1`,
    ).expect(200);
    expect(pending.body.total).toBe(1);
    expect(pending.body.items[0].deletionReason).toBe('Campaign has ended');
    const active = await request(app.getHttpServer())
      .get('/api/ads/active')
      .expect(200);
    expect(active.body.some((ad: any) => ad.id === id)).toBe(true);
    await call('admin', 'patch', `/admin/ads/${id}/deletion-request`)
      .send({ note: 'Please confirm campaign dates' })
      .expect(200);
    const rejected = await db.advertisement.findUniqueOrThrow({
      where: { id },
    });
    expect(rejected.deletionRequestedAt).toBeNull();
    expect(rejected.deletionReviewNote).toBe('Please confirm campaign dates');
    expect(rejected.status).toBe('APPROVED');
    await call('seller', 'post', `/seller/ads/${id}/deletion-request`)
      .send({ reason: 'Confirmed end of campaign' })
      .expect(201);
    await call('seller', 'delete', `/seller/ads/${id}/deletion-request`).expect(
      200,
    );
    expect(
      (await db.advertisement.findUniqueOrThrow({ where: { id } }))
        .deletionRequestedAt,
    ).toBeNull();
    await call('seller', 'post', `/seller/ads/${id}/deletion-request`)
      .send({ reason: 'Ready to remove this banner' })
      .expect(201);
    await call('admin', 'delete', `/admin/ads/${id}`).expect(200);
    expect(
      (await db.advertisement.findUniqueOrThrow({ where: { id } })).deletedAt,
    ).not.toBeNull();
    expect(
      (await call('admin', 'get', `/admin/ads?search=${tag}`).expect(200)).body
        .items,
    ).toHaveLength(0);
    expect(
      (await call('seller', 'get', '/seller/ads').expect(200)).body.items.some(
        (ad: any) => ad.id === id,
      ),
    ).toBe(false);
    expect(
      (
        await request(app.getHttpServer()).get('/api/ads/active').expect(200)
      ).body.some((ad: any) => ad.id === id),
    ).toBe(false);
    await call('admin', 'delete', `/admin/ads/${id}`).expect(404);
    await call('admin', 'patch', `/admin/ads/${id}/status`)
      .send({ status: 'APPROVED' })
      .expect(404);
    await call('seller', 'post', `/seller/ads/${id}/deletion-request`)
      .send({ reason: 'Cannot revive this ad' })
      .expect(404);
  });
  it('lets ADMIN remove an advertisement directly and hides suspended-shop banners', async () => {
    const ad = await db.advertisement.create({
      data: {
        shopId: secondShop,
        title: 'Direct removal',
        imageUrl: 'https://example.com/ad.jpg',
        status: 'APPROVED',
        startAt: new Date(Date.now() - 1000),
        endAt: new Date(Date.now() + 86400000),
      },
    });
    await db.shop.update({
      where: { id: secondShop },
      data: { status: 'SUSPENDED' },
    });
    const active = await request(app.getHttpServer())
      .get('/api/ads/active')
      .expect(200);
    expect(active.body.some((a: any) => a.id === ad.id)).toBe(false);
    await db.shop.update({
      where: { id: secondShop },
      data: { status: 'APPROVED' },
    });
    await call('admin', 'delete', `/admin/ads/${ad.id}`).expect(200);
    expect(
      (await db.advertisement.findUniqueOrThrow({ where: { id: ad.id } }))
        .deletedAt,
    ).not.toBeNull();
  });
  it('invalidates old access tokens after a password change', async () => {
    await call('customer', 'post', '/auth/password')
      .send({ currentPassword: 'password123', newPassword: 'newPassword123' })
      .expect(201);
    await call('customer', 'get', '/auth/me').expect(401);
  });
  it('allows a seller to reconcile an old delivered COD order exactly once', async () => {
    const order = await db.order.create({
      data: {
        customerId: users.customer.id,
        recipientName: 'Khách thử COD cũ',
        recipientPhone: '0901234567',
        shippingAddress: 'Cần Thơ',
        paymentMethod: 'COD',
        totalAmount: 130000,
        payment: { create: { method: 'COD' } },
        shopOrders: {
          create: {
            shopId,
            status: 'DELIVERED',
            subtotal: 100000,
            totalAmount: 130000,
            shippingFee: 30000,
            deliveredAt: new Date(),
            paidAmount: 0,
          },
        },
      },
      include: { shopOrders: true },
    });
    const so = order.shopOrders[0];
    await call('seller', 'patch', `/seller/orders/${so.id}/collect-cod`).expect(
      200,
    );
    await call('seller', 'patch', `/seller/orders/${so.id}/collect-cod`).expect(
      409,
    );
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: order.id } }))
        .paymentStatus,
    ).toBe('PAID');
  });
  it('reconciles collected cash, delivered merchandise and refunds by Vietnamese date', async () => {
    const order = await db.order.create({
      data: {
        customerId: users.customer.id,
        recipientName: 'Báo cáo thử',
        recipientPhone: '0901234567',
        shippingAddress: 'Cần Thơ',
        paymentMethod: 'MOMO',
        paymentStatus: 'PAID',
        totalAmount: 130000,
        payment: {
          create: {
            method: 'MOMO',
            status: 'PAID',
            paidAt: new Date('2099-01-01T03:00:00Z'),
          },
        },
        shopOrders: {
          create: {
            shopId,
            status: 'DELIVERED',
            subtotal: 100000,
            totalAmount: 130000,
            shippingFee: 30000,
            paidAmount: 130000,
            deliveredAt: new Date('2099-01-02T03:00:00Z'),
          },
        },
      },
      include: { shopOrders: true },
    });
    await db.refund.create({
      data: {
        orderId: order.id,
        shopOrderId: order.shopOrders[0].id,
        amount: 30000,
        reason: 'Kiểm thử báo cáo',
        status: 'COMPLETED',
        completedAt: new Date('2099-01-02T03:00:00Z'),
      },
    });
    const result = await call(
      'seller',
      'get',
      '/seller/statistics?from=2099-01-01&to=2099-01-02',
    ).expect(200);
    expect(result.body.totalCollected).toBe(130000);
    expect(result.body.totalRefunded).toBe(30000);
    expect(result.body.totalRevenue).toBe(100000);
    expect(result.body.grossMerchandiseValue).toBe(100000);
    expect(result.body.revenueByDay).toEqual([
      { date: '2099-01-01', revenue: 130000 },
      { date: '2099-01-02', revenue: -30000 },
    ]);
  });
});
