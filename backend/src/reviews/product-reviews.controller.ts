import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ReviewsService } from './reviews.service';
import { Public } from '../common/decorators/public.decorator';
import { ListReviewsQueryDto } from './dto/list-reviews-query.dto';

@Controller('products/:productId/reviews')
export class ProductReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get()
  findByProduct(
    @Param('productId') productId: string,
    @Query() query: ListReviewsQueryDto,
    @Req() req: Request,
  ) {
    return this.reviewsService.findByProduct(
      productId,
      query,
      process.env.PUBLIC_API_URL ?? `${req.protocol}://${req.get('host')}/api`,
    );
  }
}
