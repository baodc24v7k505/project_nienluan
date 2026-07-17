import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { StatisticsService } from './statistics.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('admin/statistics')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.STAFF)
export class AdminStatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  getStatistics(@Query('days') days?: string) {
    return this.statisticsService.getAdminStatistics(days ? Number(days) : undefined);
  }
}
