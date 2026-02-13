import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString, IsUrl } from 'class-validator';
import { WEBHOOK_EVENTS, WebhookEvent } from '../../common/constants/domain';

export class CreateWebhookDto {
  @ApiProperty()
  @IsUrl()
  url!: string;

  @ApiProperty()
  @IsString()
  secret!: string;

  @ApiProperty({ enum: WEBHOOK_EVENTS, isArray: true })
  @IsArray()
  @IsIn([...WEBHOOK_EVENTS], { each: true })
  events!: WebhookEvent[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
