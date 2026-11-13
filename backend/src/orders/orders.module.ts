import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { SellerOrdersController } from './seller-orders.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { OrdersService } from './orders.service';
import { VouchersModule } from '../vouchers/vouchers.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [VouchersModule, NotificationsModule],
  controllers: [
    OrdersController,
    SellerOrdersController,
    AdminOrdersController,
  ],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
