import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { OrdersService } from './orders.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CompleteRefundDto, ResolveReturnDto } from './dto/fulfillment.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';

@Controller('admin/orders')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.STAFF)
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles(Role.ADMIN)
  @Patch('shop-orders/:id/return')
  resolveReturn(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ResolveReturnDto,
  ) {
    return this.ordersService.resolveReturn(user, id, dto);
  }

  @Roles(Role.ADMIN)
  @Patch('refunds/:id/complete')
  completeRefund(@Param('id') id: string, @Body() dto: CompleteRefundDto) {
    return this.ordersService.completeRefund(id, dto.reference);
  }

  @Get()
  list(@Query() query: PaginationQueryDto) {
    return this.ordersService.adminList(query);
  }
}
