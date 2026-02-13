import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { SUBSCRIPTION_STATUSES, SubscriptionStatus } from '../../common/constants/domain';

export class CreateSubscriptionDto {
  @ApiProperty()
  @IsString()
  customerId!: string;

  @ApiProperty()
  @IsString()
  planId!: string;

  @ApiProperty()
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: SUBSCRIPTION_STATUSES, default: 'ACTIVE' })
  @IsOptional()
  @IsIn([...SUBSCRIPTION_STATUSES])
  status?: SubscriptionStatus;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cancelReason?: string;
}
