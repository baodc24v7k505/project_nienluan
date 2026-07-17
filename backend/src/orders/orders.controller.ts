import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { OrdersService } from './orders.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CreateOrderDto } from './dto/create-order.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';

@Controller('orders')
@UseGuards(RolesGuard)
@Roles(Role.CUSTOMER)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.checkout(user.id, dto);
  }

  @Get()
  findMine(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.ordersService.findMine(user.id, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.findMineOne(user.id, id);
  }

  @Patch('shop-orders/:id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CancelOrderDto) {
    return this.ordersService.cancelByCustomer(user.id, id, dto.reason);
  }
}
