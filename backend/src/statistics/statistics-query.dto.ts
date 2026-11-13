import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';
export class StatisticsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(366) days?: number;
  @IsOptional() @IsDateString({ strict: true }) from?: string;
  @IsOptional() @IsDateString({ strict: true }) to?: string;
}
