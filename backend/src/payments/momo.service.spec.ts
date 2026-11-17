import {
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { MomoService } from './momo.service';

describe('MoMo gateway transport', () => {
  const credentials = {
    MOMO_PARTNER_CODE: 'TEST',
    MOMO_ACCESS_KEY: 'test-access',
    MOMO_SECRET_KEY: 'test-secret-do-not-expose',
    MOMO_ENDPOINT: 'https://test-payment.momo.vn/v2/gateway/api/create',
    MOMO_REDIRECT_URL: 'https://shop.example/payment/momo/return',
    MOMO_IPN_URL: 'https://api.example/api/payments/momo/ipn',
  };
  let service: MomoService;
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  let warn: jest.SpiedFunction<typeof Logger.prototype.warn>;
  beforeEach(() => {
    service = new MomoService(new ConfigService(credentials));
    fetchMock = jest.spyOn(globalThis, 'fetch');
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());
  const create = () =>
    service.createPayment(
      'order-1',
      10000,
      'Thanh toan don order-1',
      'request-1',
    );

  it('sends the documented signature and a 35-second timeout without credentials in the body', async () => {
    const timeout = jest.spyOn(AbortSignal, 'timeout');
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          resultCode: 0,
          payUrl: 'https://test-payment.momo.vn/pay/demo',
        }),
        { status: 200 },
      ),
    );
    await expect(create()).resolves.toMatchObject({
      resultCode: 0,
      payUrl: 'https://test-payment.momo.vn/pay/demo',
    });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(credentials.MOMO_ENDPOINT);
    expect(options?.method).toBe('POST');
    expect(options?.headers).toEqual({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });
    const raw = `accessKey=test-access&amount=10000&extraData=&ipnUrl=${credentials.MOMO_IPN_URL}&orderId=order-1&orderInfo=Thanh toan don order-1&partnerCode=TEST&redirectUrl=${credentials.MOMO_REDIRECT_URL}&requestId=request-1&requestType=captureWallet`;
    const signature = createHmac('sha256', credentials.MOMO_SECRET_KEY)
      .update(raw)
      .digest('hex');
    const serializedBody =
      typeof options?.body === 'string' ? options.body : '';
    expect(JSON.parse(serializedBody) as unknown).toMatchObject({
      signature,
      requestId: 'request-1',
      orderId: 'order-1',
      amount: '10000',
    });
    expect(serializedBody).not.toContain(credentials.MOMO_SECRET_KEY);
    expect(timeout).toHaveBeenCalledWith(35000);
  });
  it('turns a non-JSON nginx 403 into an actionable 503 without leaking transport data', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html>403 Forbidden</html>', { status: 403 }),
    );
    let caught: unknown;
    try {
      await create();
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ServiceUnavailableException);
    const error = caught as ServiceUnavailableException;
    expect(error.getStatus()).toBe(503);
    expect(error.getResponse()).toMatchObject({
      code: 'MOMO_GATEWAY_BLOCKED',
      message: expect.stringContaining('COD') as unknown,
    });
    expect(JSON.stringify(warn.mock.calls)).toContain('status=403');
    expect(JSON.stringify(warn.mock.calls)).not.toContain(
      credentials.MOMO_SECRET_KEY,
    );
  });
  it('normalizes JSON errors even if MoMo returns HTTP 400 and removes signature diagnostics', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          resultCode: 13,
          message: `Expected raw signature: ${credentials.MOMO_SECRET_KEY}`,
        }),
        { status: 400 },
      ),
    );
    const result = await create();
    expect(result.resultCode).toBe(13);
    expect(result.message).toContain('mã 13');
    expect(JSON.stringify(result)).not.toContain(credentials.MOMO_SECRET_KEY);
    expect(JSON.stringify(warn.mock.calls)).not.toContain(
      credentials.MOMO_SECRET_KEY,
    );
  });
  it('reports an uncertain timeout without exposing the underlying error', async () => {
    fetchMock.mockRejectedValue(
      new DOMException(credentials.MOMO_SECRET_KEY, 'TimeoutError'),
    );
    await expect(create()).rejects.toMatchObject({
      response: { code: 'MOMO_TIMEOUT' },
    });
    expect(JSON.stringify(warn.mock.calls)).not.toContain(
      credentials.MOMO_SECRET_KEY,
    );
  });
  it('reports network failures without logging signed request data', async () => {
    fetchMock.mockRejectedValue(new Error(credentials.MOMO_SECRET_KEY));
    await expect(create()).rejects.toMatchObject({
      response: { code: 'MOMO_UNREACHABLE' },
    });
    expect(JSON.stringify(warn.mock.calls)).not.toContain(
      credentials.MOMO_SECRET_KEY,
    );
  });
  it.each([
    { resultCode: 0 },
    { resultCode: 'broken' },
    '<html>maintenance</html>',
    { resultCode: 0, payUrl: 'javascript:alert(1)' },
  ])('rejects an unusable provider response %#', async (body) => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200 }),
    );
    await expect(create()).rejects.toMatchObject({
      response: { code: 'MOMO_INVALID_RESPONSE' },
    });
  });
  it('rejects missing integration settings before making a request', async () => {
    const incomplete = new MomoService(
      new ConfigService({ ...credentials, MOMO_SECRET_KEY: '' }),
    );
    await expect(
      incomplete.createPayment('order-1', 10000, 'Order', 'request-1'),
    ).rejects.toMatchObject({ response: { code: 'MOMO_NOT_CONFIGURED' } });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([999, 1000.5, 50000001])(
    'does not round or send an unsupported amount: %s',
    async (amount) => {
      await expect(
        service.createPayment('order-1', amount, 'Order', 'request-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});
