import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class PauseSubscriptionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}