import { Module } from '@nestjs/common';
import { ShopsController } from './shops.controller';
import { AdminShopsController } from './admin-shops.controller';
import { ShopsService } from './shops.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { VouchersModule } from '../vouchers/vouchers.module';

@Module({
  imports: [NotificationsModule, VouchersModule],
  controllers: [ShopsController, AdminShopsController],
  providers: [ShopsService],
  exports: [ShopsService],
})
export class ShopsModule {}
