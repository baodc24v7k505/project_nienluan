import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AdvertisementsService } from './advertisements.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateAdStatusDto } from './dto/update-ad-status.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Controller('admin/ads')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.STAFF)
export class AdminAdsController {
  constructor(private readonly advertisementsService: AdvertisementsService) {}

  @Get()
  list(@Query() query: PaginationQueryDto) {
    return this.advertisementsService.adminList(query);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateAdStatusDto) {
    return this.advertisementsService.adminUpdateStatus(id, dto);
  }
}
