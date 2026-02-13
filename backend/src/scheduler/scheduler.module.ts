import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ExpirationJob } from './expiration.job';

@Module({
  imports: [SubscriptionsModule],
  providers: [ExpirationJob],
})
export class SchedulerModule {}