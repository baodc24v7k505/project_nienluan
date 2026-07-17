import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AdvertisementsService } from './advertisements.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CreateAdDto } from './dto/create-ad.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Controller('seller/ads')
@UseGuards(RolesGuard)
@Roles(Role.SELLER)
export class SellerAdsController {
  constructor(private readonly advertisementsService: AdvertisementsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.advertisementsService.sellerList(user.id, query);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAdDto) {
    return this.advertisementsService.sellerCreate(user.id, dto);
  }
}
