import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListProductsQueryDto extends PaginationQueryDto {
  @IsOptional() @IsIn(['newest', 'price_asc', 'price_desc']) sort?:
    'newest' | 'price_asc' | 'price_desc';
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  shopId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;
}
