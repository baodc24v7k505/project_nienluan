import { IsEnum } from 'class-validator';
import { AdStatus } from '@prisma/client';

export class UpdateAdStatusDto {
  @IsEnum(AdStatus)
  status: AdStatus;
}
