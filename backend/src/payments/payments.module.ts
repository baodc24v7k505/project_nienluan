import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MomoService } from './momo.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, MomoService],
})
export class PaymentsModule {}
