import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { SellerProductsController } from './seller-products.controller';
import { AdminProductsController } from './admin-products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [
    ProductsController,
    SellerProductsController,
    AdminProductsController,
  ],
  providers: [ProductsService],
})
export class ProductsModule {}
