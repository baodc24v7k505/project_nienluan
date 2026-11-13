import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { StatisticsService } from './statistics.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { StatisticsQueryDto } from './statistics-query.dto';

@Controller('seller/statistics')
@UseGuards(RolesGuard)
@Roles(Role.SELLER)
export class SellerStatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  getStatistics(
    @CurrentUser() user: AuthUser,
    @Query() query: StatisticsQueryDto,
  ) {
    return this.statisticsService.getSellerStatistics(user.id, query);
  }
}
