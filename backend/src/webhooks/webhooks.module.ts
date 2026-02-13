import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhooksDispatcher } from './webhooks.dispatcher';

@Module({
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhooksDispatcher],
  exports: [WebhooksService],
})
export class WebhooksModule {}