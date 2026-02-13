import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMobileUpdateEventDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  releaseId?: string;

  @ApiProperty({ enum: ['CHECKED', 'DOWNLOADED', 'APPLIED', 'FAILED'] })
  @IsString()
  @IsIn(['CHECKED', 'DOWNLOADED', 'APPLIED', 'FAILED'])
  eventType!: string;

  @ApiProperty({ example: '1.0.0' })
  @IsString()
  @MaxLength(32)
  appVersion!: string;

  @ApiProperty({ example: 'web-20260213-001' })
  @IsString()
  @MaxLength(80)
  bundleVersion!: string;

  @ApiPropertyOptional({ example: 'android-12345' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceId?: string;

  @ApiPropertyOptional({ example: 'Checksum mismatch during apply.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
