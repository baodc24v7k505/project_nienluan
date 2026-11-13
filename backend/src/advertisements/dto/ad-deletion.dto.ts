import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AdStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
export class ListAdsQueryDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(AdStatus) status?: AdStatus;
  @IsOptional() @IsIn(['true', 'false']) deletionRequested?: string;
}
export class RequestAdDeletionDto {
  @IsString() @MinLength(5) @MaxLength(1000) reason: string;
}
export class RejectAdDeletionDto {
  @IsString() @MinLength(5) @MaxLength(1000) note: string;
}
