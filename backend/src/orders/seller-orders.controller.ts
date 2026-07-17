import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { OrdersService } from './orders.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { UpdateShopOrderStatusDto } from './dto/update-shop-order-status.dto';

@Controller('seller/orders')
@UseGuards(RolesGuard)
@Roles(Role.SELLER)
export class SellerOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findMine(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.ordersService.findForSeller(user.id, query);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateShopOrderStatusDto,
  ) {
    return this.ordersService.updateShopOrderStatus(user.id, id, dto.status, dto.reason);
  }
}
