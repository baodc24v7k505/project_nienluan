import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AdvertisementsService } from './advertisements.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateAdStatusDto } from './dto/update-ad-status.dto';
import { ListAdsQueryDto, RejectAdDeletionDto } from './dto/ad-deletion.dto';

@Controller('admin/ads')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.STAFF)
export class AdminAdsController {
  constructor(private readonly advertisementsService: AdvertisementsService) {}

  @Get()
  list(@Query() query: ListAdsQueryDto) {
    return this.advertisementsService.adminList(query);
  }
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.advertisementsService.adminRemove(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/deletion-request')
  rejectDeletion(@Param('id') id: string, @Body() dto: RejectAdDeletionDto) {
    return this.advertisementsService.rejectDeletion(id, dto.note);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateAdStatusDto) {
    return this.advertisementsService.adminUpdateStatus(id, dto);
  }
}
