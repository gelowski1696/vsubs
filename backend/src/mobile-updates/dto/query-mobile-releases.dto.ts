import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryMobileReleasesDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ enum: ['android'] })
  @IsOptional()
  @IsString()
  @IsIn(['android'])
  platform?: string;

  @ApiPropertyOptional({ enum: ['stable', 'beta'] })
  @IsOptional()
  @IsString()
  @IsIn(['stable', 'beta'])
  channel?: string;

  @ApiPropertyOptional({ description: 'Filter by publication state', enum: ['true', 'false'] })
  @IsOptional()
  @IsString()
  @IsIn(['true', 'false'])
  published?: string;
}
