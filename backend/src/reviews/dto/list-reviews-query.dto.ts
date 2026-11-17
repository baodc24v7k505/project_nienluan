import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListReviewsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsIn(['true', 'false'])
  withImages?: string;

  @IsOptional()
  @IsIn(['newest', 'oldest'])
  sort?: 'newest' | 'oldest';
}
