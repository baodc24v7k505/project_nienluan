import { Module } from '@nestjs/common';
import { AdvertisementsController } from './advertisements.controller';
import { SellerAdsController } from './seller-ads.controller';
import { AdminAdsController } from './admin-ads.controller';
import { AdvertisementsService } from './advertisements.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [
    AdvertisementsController,
    SellerAdsController,
    AdminAdsController,
  ],
  providers: [AdvertisementsService],
})
export class AdvertisementsModule {}
