import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Public } from '../common/decorators/public.decorator';
import { ListProductsQueryDto } from './dto/list-products-query.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  findAll(@Query() query: ListProductsQueryDto) {
    return this.productsService.findPublic(query);
  }

  @Public()
  @Get('suggestions')
  suggest(@Query('q') q?: string) {
    return this.productsService.suggest(q ?? '');
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findPublicOne(id);
  }
}
