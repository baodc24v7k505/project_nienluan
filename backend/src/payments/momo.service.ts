import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import axios from 'axios';
import { MomoCallbackDto } from './dto/momo-callback.dto';

interface MomoCreateResponse {
  payUrl?: string;
  deeplink?: string;
  qrCodeUrl?: string;
  resultCode: number;
  message: string;
}

@Injectable()
export class MomoService {
  private readonly logger = new Logger(MomoService.name);
  constructor(private readonly configService: ConfigService) {}

  private get config() {
    return {
      partnerCode:
        this.configService.get<string>('MOMO_PARTNER_CODE')?.trim() ?? '',
      accessKey:
        this.configService.get<string>('MOMO_ACCESS_KEY')?.trim() ?? '',
      secretKey:
        this.configService.get<string>('MOMO_SECRET_KEY')?.trim() ?? '',
      endpoint: this.configService.get<string>('MOMO_ENDPOINT')?.trim() ?? '',
      redirectUrl:
        this.configService.get<string>('MOMO_REDIRECT_URL')?.trim() ?? '',
      ipnUrl: this.configService.get<string>('MOMO_IPN_URL')?.trim() ?? '',
    };
  }

  private sign(rawSignature: string, secretKey: string): string {
    return createHmac('sha256', secretKey).update(rawSignature).digest('hex');
  }

  async diagnoseSandbox() {
    const cfg = this.config;
    const target = new URL(cfg.endpoint);
    if (
      target.origin !== 'https://test-payment.momo.vn' ||
      target.pathname !== '/v2/gateway/api/create'
    )
      throw new BadRequestException(
        'Chẩn đoán chỉ dùng cho endpoint sandbox MoMo chính thức',
      );
    const addresses = await lookup(target.hostname, { all: true });
    const probes: {
      mode: string;
      httpStatus?: number;
      server?: string;
      contentType?: string;
      resultCode?: number;
      hasPayUrl?: boolean;
      remoteAddress?: string;
      error?: string;
    }[] = [];
    for (const mode of [
      'legacy-axios',
      'current-fetch',
      'current-https-ipv4',
    ]) {
      const baseId = randomUUID(),
        requestId = randomUUID();
      const orderId =
        mode === 'legacy-axios'
          ? baseId
          : `${baseId}-${randomUUID().slice(0, 8)}`;
      const orderInfo =
        mode === 'legacy-axios'
          ? `Thanh toan don hang ${baseId}`
          : `Thanh toan don ${baseId}`;
      const amount = '10000',
        extraData = '',
        requestType = 'captureWallet';
      const raw = `accessKey=${cfg.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${cfg.ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${cfg.partnerCode}&redirectUrl=${cfg.redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
      const body = {
        partnerCode: cfg.partnerCode,
        partnerName:
          mode === 'legacy-axios' ? 'Sàn TMĐT Niên Luận' : 'Sàn TMĐT Tiểu Luận',
        storeId: 'NienLuanStore',
        requestId,
        amount,
        orderId,
        orderInfo,
        redirectUrl: cfg.redirectUrl,
        ipnUrl: cfg.ipnUrl,
        lang: 'vi',
        extraData,
        requestType,
        signature: this.sign(raw, cfg.secretKey),
      };
      try {
        let status: number,
          text: string,
          server: string | undefined,
          contentType: string | undefined,
          remoteAddress: string | undefined;
        if (mode === 'legacy-axios') {
          const res = await axios.post<unknown>(cfg.endpoint, body, {
            timeout: 35000,
            validateStatus: () => true,
            responseType: 'text',
          });
          status = res.status;
          text =
            typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
          const serverHeader: unknown = res.headers.server,
            typeHeader: unknown = res.headers['content-type'];
          server = typeof serverHeader === 'string' ? serverHeader : undefined;
          contentType = typeof typeHeader === 'string' ? typeHeader : undefined;
        } else if (mode === 'current-fetch') {
          const res = await fetch(cfg.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(35000),
            redirect: 'error',
          });
          status = res.status;
          text = await res.text();
          server = res.headers.get('server') ?? undefined;
          contentType = res.headers.get('content-type') ?? undefined;
        } else {
          const payload = JSON.stringify(body);
          const res = await new Promise<{
            status: number;
            text: string;
            server?: string;
            contentType?: string;
            remoteAddress?: string;
          }>((resolve, reject) => {
            const req = httpsRequest(
              cfg.endpoint,
              {
                method: 'POST',
                family: 4,
                headers: {
                  'Content-Type': 'application/json',
                  Accept: 'application/json',
                  'Content-Length': Buffer.byteLength(payload),
                },
                timeout: 35000,
              },
              (response) => {
                let output = '';
                response.setEncoding('utf8');
                response.on('data', (chunk: string) => {
                  output += chunk;
                });
                response.on('error', reject);
                response.on('end', () =>
                  resolve({
                    status: response.statusCode ?? 0,
                    text: output,
                    server:
                      typeof response.headers.server === 'string'
                        ? response.headers.server
                        : undefined,
                    contentType: response.headers['content-type'],
                    remoteAddress: response.socket?.remoteAddress,
                  }),
                );
              },
            );
            req.on('error', reject);
            req.on('timeout', () => req.destroy(new Error('timeout')));
            req.end(payload);
          });
          status = res.status;
          text = res.text;
          server = res.server;
          contentType = res.contentType;
          remoteAddress = res.remoteAddress;
        }
        let data: unknown;
        try {
          data = JSON.parse(text) as unknown;
        } catch {
          data = null;
        }
        const result = this.readResponse(data);
        probes.push({
          mode,
          httpStatus: status,
          server,
          contentType,
          remoteAddress,
          resultCode: result?.resultCode,
          hasPayUrl: !!result?.payUrl,
        });
      } catch {
        probes.push({ mode, error: 'transport-error' });
      }
    }
    return {
      node: process.version,
      endpoint: target.origin + target.pathname,
      partnerCode: cfg.partnerCode,
      redirectUrl:
        new URL(cfg.redirectUrl).origin + new URL(cfg.redirectUrl).pathname,
      ipnUrl: new URL(cfg.ipnUrl).origin + new URL(cfg.ipnUrl).pathname,
      addresses,
      probes,
    };
  }

  async createPayment(
    orderId: string,
    amount: number,
    orderInfo: string,
    requestId: string,
  ) {
    const cfg = this.config;
    if (Object.values(cfg).some((value) => !value?.trim())) {
      throw new ServiceUnavailableException({
        message:
          'Thanh toán MoMo chưa được cấu hình đầy đủ. Vui lòng liên hệ quản trị viên.',
        code: 'MOMO_NOT_CONFIGURED',
      });
    }
    if (!Number.isSafeInteger(amount) || amount < 1000 || amount > 50000000) {
      throw new BadRequestException(
        'MoMo hỗ trợ số tiền nguyên từ 1.000đ đến 50.000.000đ. Vui lòng chọn phương thức khác cho đơn này.',
      );
    }
    const requestType = 'captureWallet';
    const extraData = '';
    const amountStr = String(amount);

    const rawSignature =
      `accessKey=${cfg.accessKey}` +
      `&amount=${amountStr}` +
      `&extraData=${extraData}` +
      `&ipnUrl=${cfg.ipnUrl}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&partnerCode=${cfg.partnerCode}` +
      `&redirectUrl=${cfg.redirectUrl}` +
      `&requestId=${requestId}` +
      `&requestType=${requestType}`;

    const signature = this.sign(rawSignature, cfg.secretKey);

    const body = {
      partnerCode: cfg.partnerCode,
      partnerName: 'Sàn TMĐT Tiểu Luận',
      storeId: 'NienLuanStore',
      requestId,
      amount: amountStr,
      orderId,
      orderInfo,
      redirectUrl: cfg.redirectUrl,
      ipnUrl: cfg.ipnUrl,
      lang: 'vi',
      extraData,
      requestType,
      signature,
    };

    let res: Response;
    let data: unknown;
    try {
      // MoMo recommends a minimum 30-second timeout. Never log the signed body
      // or a transport exception: both may contain integration credentials.
      res = await fetch(cfg.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(35000),
        redirect: 'error',
      });
      const text = await res.text();
      try {
        data = JSON.parse(text) as unknown;
      } catch {
        data = null;
      }
    } catch (error: unknown) {
      const name =
        error && typeof error === 'object' && 'name' in error
          ? error.name
          : undefined;
      const timeout = name === 'TimeoutError' || name === 'AbortError';
      const code = timeout ? 'MOMO_TIMEOUT' : 'MOMO_UNREACHABLE';
      this.logger.warn(`${code} orderId=${orderId} requestId=${requestId}`);
      throw new ServiceUnavailableException({
        code,
        message: timeout
          ? 'Chưa nhận được phản hồi từ MoMo. Đơn vẫn chưa được xác nhận thanh toán; vui lòng kiểm tra và thử lại.'
          : 'Không kết nối được cổng MoMo. Vui lòng thử lại sau; đơn chưa được xác nhận thanh toán.',
      });
    }
    const result = this.readResponse(data);
    if (!result || (!res.ok && result.resultCode === 0)) {
      const code = [401, 403].includes(res.status)
        ? 'MOMO_GATEWAY_BLOCKED'
        : 'MOMO_INVALID_RESPONSE';
      this.logger.warn(
        `${code} status=${res.status} orderId=${orderId} requestId=${requestId}`,
      );
      throw new ServiceUnavailableException({
        code,
        message:
          code === 'MOMO_GATEWAY_BLOCKED'
            ? 'Cổng MoMo đang từ chối kết nối thanh toán. Vui lòng thử lại sau hoặc hủy đơn để chọn COD.'
            : 'Cổng MoMo chưa trả về kết quả hợp lệ. Vui lòng kiểm tra đơn và thử lại sau.',
      });
    }
    if (result.resultCode !== 0) {
      this.logger.warn(
        `MOMO_REJECTED status=${res.status} resultCode=${result.resultCode} orderId=${orderId} requestId=${requestId}`,
      );
    }
    return result;
  }

  private readResponse(data: unknown): MomoCreateResponse | null {
    if (!data || typeof data !== 'object' || !('resultCode' in data))
      return null;
    const code =
      typeof data.resultCode === 'number'
        ? data.resultCode
        : typeof data.resultCode === 'string' && /^\d+$/.test(data.resultCode)
          ? Number(data.resultCode)
          : NaN;
    if (!Number.isSafeInteger(code) || code < 0) return null;
    const payUrl =
      'payUrl' in data && typeof data.payUrl === 'string'
        ? data.payUrl
        : undefined;
    if (code === 0) {
      if (!payUrl) return null;
      try {
        if (new URL(payUrl).protocol !== 'https:') return null;
      } catch {
        return null;
      }
    }
    // Provider errors can include the raw signature string; expose only a safe
    // description and numeric result code to the shopper.
    const description =
      code === 0
        ? 'Thành công'
        : code === 40
          ? 'MoMo đã nhận yêu cầu này. Vui lòng kiểm tra đơn và thử lại sau'
          : code === 22
            ? 'Số tiền không nằm trong giới hạn thanh toán MoMo'
            : code === 10
              ? 'MoMo đang bảo trì. Vui lòng thử lại sau'
              : [11, 12, 13, 20].includes(code)
                ? 'MoMo chưa chấp nhận cấu hình thanh toán của cửa hàng. Vui lòng liên hệ quản trị viên'
                : 'MoMo chưa tạo được liên kết thanh toán. Vui lòng thử lại sau';
    return {
      resultCode: code,
      payUrl,
      message: code === 0 ? description : `${description} (mã ${code}).`,
    };
  }

  verifyCallbackSignature(dto: MomoCallbackDto): boolean {
    const cfg = this.config;
    if (!cfg.secretKey || !cfg.accessKey || !cfg.partnerCode) return false;
    const rawSignature =
      `accessKey=${cfg.accessKey}` +
      `&amount=${dto.amount}` +
      `&extraData=${dto.extraData ?? ''}` +
      `&message=${dto.message ?? ''}` +
      `&orderId=${dto.orderId}` +
      `&orderInfo=${dto.orderInfo ?? ''}` +
      `&orderType=${dto.orderType ?? ''}` +
      `&partnerCode=${dto.partnerCode}` +
      `&payType=${dto.payType ?? ''}` +
      `&requestId=${dto.requestId}` +
      `&responseTime=${dto.responseTime ?? ''}` +
      `&resultCode=${dto.resultCode}` +
      `&transId=${dto.transId ?? ''}`;

    const expected = this.sign(rawSignature, cfg.secretKey);
    if (
      dto.partnerCode !== cfg.partnerCode ||
      !/^[a-fA-F0-9]{64}$/.test(dto.signature)
    )
      return false;
    return timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(dto.signature, 'hex'),
    );
  }
}
