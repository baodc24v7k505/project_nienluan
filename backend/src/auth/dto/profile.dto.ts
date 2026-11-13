import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class ProfileDto {
  @IsString() @MinLength(2) @MaxLength(100) fullName: string;
  @IsOptional() @IsString() @MaxLength(20) phone?: string;
}
export class ChangePasswordDto {
  @IsString() @MinLength(6) currentPassword: string;
  @IsString() @MinLength(8) @MaxLength(72) newPassword: string;
}
