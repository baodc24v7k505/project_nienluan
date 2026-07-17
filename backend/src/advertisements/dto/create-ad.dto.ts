import { IsDateString, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreateAdDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsUrl()
  imageUrl: string;

  @IsOptional()
  @IsUrl()
  linkUrl?: string;

  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;
}
