import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ResumeSubscriptionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}