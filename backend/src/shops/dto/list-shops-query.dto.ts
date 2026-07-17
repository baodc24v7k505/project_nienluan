import { IsEnum, IsOptional } from 'class-validator';
import { ShopStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListShopsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ShopStatus)
  status?: ShopStatus;
}
