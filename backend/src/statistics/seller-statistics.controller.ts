import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { StatisticsService } from './statistics.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';

@Controller('seller/statistics')
@UseGuards(RolesGuard)
@Roles(Role.SELLER)
export class SellerStatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  getStatistics(@CurrentUser() user: AuthUser, @Query('days') days?: string) {
    return this.statisticsService.getSellerStatistics(user.id, days ? Number(days) : undefined);
  }
}
