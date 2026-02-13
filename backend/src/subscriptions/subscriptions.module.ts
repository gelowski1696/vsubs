import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { PlansModule } from '../plans/plans.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [PlansModule, WebhooksModule, AuditLogsModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}