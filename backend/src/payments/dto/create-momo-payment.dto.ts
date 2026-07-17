import { IsString } from 'class-validator';

export class CreateMomoPaymentDto {
  @IsString()
  orderId: string;
}
