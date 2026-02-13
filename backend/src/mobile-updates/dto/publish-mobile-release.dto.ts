import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class PublishMobileReleaseDto {
  @ApiProperty({ default: true })
  @IsBoolean()
  publish!: boolean;
}
