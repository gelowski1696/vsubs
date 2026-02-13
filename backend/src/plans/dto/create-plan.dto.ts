import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PLAN_INTERVALS, PlanInterval } from '../../common/constants/domain';

export class CreatePlanDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ example: '499.00' })
  @IsString()
  price!: string;

  @ApiPropertyOptional({ default: 'PHP' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ enum: PLAN_INTERVALS })
  @IsIn([...PLAN_INTERVALS])
  interval!: PlanInterval;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  intervalCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
