import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ReturnStatus } from '@prisma/client';
export class ShippingDto {
  @IsString() @MinLength(2) @MaxLength(100) carrier: string;
  @IsString() @MinLength(3) @MaxLength(100) trackingCode: string;
}
export class CreateReturnDto {
  @IsString() @MinLength(5) @MaxLength(2000) reason: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsUrl(
    { protocols: ['https', 'http'], require_protocol: true },
    { each: true },
  )
  evidenceUrls?: string[];
}
export class ResolveReturnDto {
  @IsEnum(ReturnStatus) status: ReturnStatus;
  @IsString() @MinLength(3) @MaxLength(2000) resolution: string;
}
export class CompleteRefundDto {
  @IsString() @MinLength(5) @MaxLength(200) reference: string;
}
