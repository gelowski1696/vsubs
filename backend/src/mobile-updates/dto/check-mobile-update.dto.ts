import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CheckMobileUpdateDto {
  @ApiProperty({ enum: ['android'] })
  @IsString()
  @IsIn(['android'])
  platform!: string;

  @ApiPropertyOptional({ enum: ['stable', 'beta'], default: 'stable' })
  @IsOptional()
  @IsString()
  @IsIn(['stable', 'beta'])
  channel?: string;

  @ApiProperty({ example: '1.0.0' })
  @IsString()
  @MaxLength(32)
  appVersion!: string;

  @ApiProperty({ example: 'web-20260213-001' })
  @IsString()
  @MaxLength(80)
  bundleVersion!: string;
}
