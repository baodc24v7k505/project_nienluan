import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { VouchersService } from './vouchers.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { ValidateVoucherDto } from './dto/validate-voucher.dto';

@Controller('vouchers')
@UseGuards(RolesGuard)
@Roles(Role.CUSTOMER)
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Post('validate')
  validate(@CurrentUser() user: AuthUser, @Body() dto: ValidateVoucherDto) {
    return this.vouchersService.validateForCustomer(user.id, dto.code);
  }
}
