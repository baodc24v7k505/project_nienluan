import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import axios from 'axios';
import { MomoCallbackDto } from './dto/momo-callback.dto';

interface MomoCreateResponse {
  payUrl: string;
  deeplink?: string;
  qrCodeUrl?: string;
  resultCode: number;
  message: string;
}

@Injectable()
export class MomoService {
  constructor(private readonly configService: ConfigService) {}

  private get config() {
    return {
      partnerCode: this.configService.get<string>('MOMO_PARTNER_CODE')!,
      accessKey: this.configService.get<string>('MOMO_ACCESS_KEY')!,
      secretKey: this.configService.get<string>('MOMO_SECRET_KEY')!,
      endpoint: this.configService.get<string>('MOMO_ENDPOINT')!,
      redirectUrl: this.configService.get<string>('MOMO_REDIRECT_URL')!,
      ipnUrl: this.configService.get<string>('MOMO_IPN_URL')!,
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
    const requestType = 'captureWallet';
    const extraData = '';
    const amountStr = String(Math.round(amount));

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
      partnerName: 'Sàn TMĐT Niên Luận',
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

    const res = await axios.post<MomoCreateResponse>(cfg.endpoint, body, {
      timeout: 12000,
    });
    return res.data;
  }

  verifyCallbackSignature(dto: MomoCallbackDto): boolean {
    const cfg = this.config;
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
