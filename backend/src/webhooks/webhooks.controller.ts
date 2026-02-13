import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Client-Id', required: true })
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @Roles('ADMIN')
  create(@Headers('x-client-id') clientId: string, @Body() dto: CreateWebhookDto) {
    return this.webhooksService.create(clientId, dto);
  }

  @Get()
  @Roles('ADMIN')
  findAll(@Headers('x-client-id') clientId: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.webhooksService.findAll(clientId, { page: Number(page), limit: Number(limit) });
  }

  @Get(':id')
  @Roles('ADMIN')
  findOne(@Headers('x-client-id') clientId: string, @Param('id') id: string) {
    return this.webhooksService.findOne(clientId, id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Headers('x-client-id') clientId: string, @Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.webhooksService.update(clientId, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Headers('x-client-id') clientId: string, @Param('id') id: string) {
    return this.webhooksService.remove(clientId, id);
  }
}