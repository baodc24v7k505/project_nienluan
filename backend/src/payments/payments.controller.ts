import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CreateMomoPaymentDto } from './dto/create-momo-payment.dto';
import { MomoCallbackDto } from './dto/momo-callback.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER)
  @Post('momo/create')
  createMomoPayment(@CurrentUser() user: AuthUser, @Body() dto: CreateMomoPaymentDto) {
    return this.paymentsService.createMomoPayment(user.id, dto.orderId);
  }

  @Public()
  @Post('momo/confirm')
  confirm(@Body() dto: MomoCallbackDto) {
    return this.paymentsService.confirmCallback(dto);
  }

  @Public()
  @Post('momo/ipn')
  ipn(@Body() dto: MomoCallbackDto) {
    return this.paymentsService.confirmCallback(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER)
  @Get(':orderId/status')
  getStatus(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) {
    return this.paymentsService.getStatus(user.id, orderId);
  }
}
