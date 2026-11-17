import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
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
