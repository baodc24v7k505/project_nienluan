import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @MinLength(2)
  recipientName: string;

  @IsString()
  @MinLength(8)
  phone: string;

  @IsString()
  @MinLength(4)
  line: string;

  @IsString()
  @MinLength(2)
  city: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
