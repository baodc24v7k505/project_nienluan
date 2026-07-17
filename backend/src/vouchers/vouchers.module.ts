import { Module } from '@nestjs/common';
import { VouchersController } from './vouchers.controller';
import { SellerVouchersController } from './seller-vouchers.controller';
import { AdminVouchersController } from './admin-vouchers.controller';
import { VouchersService } from './vouchers.service';

@Module({
  controllers: [VouchersController, SellerVouchersController, AdminVouchersController],
  providers: [VouchersService],
  exports: [VouchersService],
})
export class VouchersModule {}
