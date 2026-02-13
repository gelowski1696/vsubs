import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMobileReleaseDto {
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

  @ApiPropertyOptional({ example: 'Minor UI improvements and bug fixes.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  releaseNotes?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  mandatory?: boolean;

  @ApiPropertyOptional({ example: '1.0.0' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  minimumSupportedAppVersion?: string;
}
