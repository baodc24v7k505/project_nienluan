import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ShopsService } from './shops.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ListShopsQueryDto } from './dto/list-shops-query.dto';
import { UpdateShopStatusDto } from './dto/update-shop-status.dto';

@Controller('admin/shops')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.STAFF)
export class AdminShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get()
  list(@Query() query: ListShopsQueryDto) {
    return this.shopsService.adminList(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shopsService.adminFindOne(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateShopStatusDto) {
    return this.shopsService.adminUpdateStatus(id, dto);
  }
}
