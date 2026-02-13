import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class ExpirationJob {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Cron('10 0 * * *')
  async run() {
    await this.subscriptionsService.evaluateExpirations();
  }
}