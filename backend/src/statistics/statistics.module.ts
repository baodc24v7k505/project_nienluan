import { Module } from '@nestjs/common';
import { SellerStatisticsController } from './seller-statistics.controller';
import { AdminStatisticsController } from './admin-statistics.controller';
import { StatisticsService } from './statistics.service';

@Module({
  controllers: [SellerStatisticsController, AdminStatisticsController],
  providers: [StatisticsService],
})
export class StatisticsModule {}
