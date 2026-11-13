import { IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class MomoCallbackDto {
  @IsString()
  partnerCode: string;

  @IsString()
  orderId: string;

  @IsString()
  requestId: string;

  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'number' ? String(value) : value,
  )
  amount: string;

  @IsOptional()
  @IsString()
  orderInfo?: string;

  @IsOptional()
  @IsString()
  orderType?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'number' ? String(value) : value,
  )
  transId?: string;

  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'number' ? String(value) : value,
  )
  resultCode: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  payType?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'number' ? String(value) : value,
  )
  responseTime?: string;

  @IsOptional()
  @IsString()
  extraData?: string;

  @IsString()
  signature: string;
}
