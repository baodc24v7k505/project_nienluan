import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { VouchersService } from './vouchers.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Controller('admin/vouchers')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.STAFF)
export class AdminVouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Get()
  list(@Query() query: PaginationQueryDto) {
    return this.vouchersService.adminList(query);
  }

  @Post()
  create(@Body() dto: CreateVoucherDto) {
    return this.vouchersService.adminCreate(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVoucherDto) {
    return this.vouchersService.adminUpdate(id, dto);
  }
}
