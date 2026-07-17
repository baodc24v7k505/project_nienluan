import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { OrdersService } from './orders.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Controller('admin/orders')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.STAFF)
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  list(@Query() query: PaginationQueryDto) {
    return this.ordersService.adminList(query);
  }
}
