import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ShopsService } from './shops.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';

@Controller('shops')
export class ShopsController {
  constructor(
    private readonly shopsService: ShopsService,
    private readonly vouchersService: VouchersService,
  ) {}

  @UseGuards(RolesGuard)
  @Roles(Role.SELLER)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateShopDto) {
    return this.shopsService.create(user.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SELLER)
  @Get('me')
  getMine(@CurrentUser() user: AuthUser) {
    return this.shopsService.getMine(user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SELLER)
  @Patch('me')
  updateMine(@CurrentUser() user: AuthUser, @Body() dto: UpdateShopDto) {
    return this.shopsService.updateMine(user.id, dto);
  }

  @Public()
  @Get(':id')
  getPublic(@Param('id') id: string) {
    return this.shopsService.getPublicById(id);
  }

  @Public()
  @Get(':id/vouchers')
  getVouchers(@Param('id') id: string) {
    return this.vouchersService.listActiveForShop(id);
  }
}
