import { Controller, Get, Param, Query } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { Public } from '../common/decorators/public.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Controller('products/:productId/reviews')
export class ProductReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get()
  findByProduct(@Param('productId') productId: string, @Query() query: PaginationQueryDto) {
    return this.reviewsService.findByProduct(productId, query);
  }
}
