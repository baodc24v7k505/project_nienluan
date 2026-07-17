import { IsOptional, IsString } from 'class-validator';

export class MomoCallbackDto {
  @IsString()
  partnerCode: string;

  @IsString()
  orderId: string;

  @IsString()
  requestId: string;

  @IsString()
  amount: string;

  @IsOptional()
  @IsString()
  orderInfo?: string;

  @IsOptional()
  @IsString()
  orderType?: string;

  @IsOptional()
  @IsString()
  transId?: string;

  @IsString()
  resultCode: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  payType?: string;

  @IsOptional()
  @IsString()
  responseTime?: string;

  @IsOptional()
  @IsString()
  extraData?: string;

  @IsString()
  signature: string;
}
