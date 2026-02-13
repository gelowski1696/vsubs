import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhooksDispatcher {
  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processRetries() {
    const due = await this.prisma.webhookDelivery.findMany({
      where: {
        status: 'PENDING',
        nextRetryAt: { lte: new Date() },
      },
      include: { endpoint: true },
      take: 20,
      orderBy: { createdAt: 'asc' },
    });

    for (const delivery of due) {
      try {
        const response = await fetch(delivery.endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-SubMan-Signature': delivery.signature,
            'X-SubMan-Event': delivery.event,
            'X-SubMan-Delivery-Id': delivery.id,
          },
          body: delivery.payload,
        });

        if (!response.ok) {
          throw new Error(`Webhook failed with status ${response.status}`);
        }

        await this.prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: { status: 'SUCCESS' },
        });
      } catch (err: any) {
        const attemptCount = delivery.attemptCount + 1;
        if (attemptCount >= 5) {
          await this.prisma.webhookDelivery.update({
            where: { id: delivery.id },
            data: {
              status: 'FAILED',
              attemptCount,
              lastError: err?.message ?? 'Unknown error',
            },
          });
        } else {
          const delaySeconds = Math.pow(2, attemptCount) + Math.floor(Math.random() * 3);
          const nextRetryAt = new Date(Date.now() + delaySeconds * 1000);
          await this.prisma.webhookDelivery.update({
            where: { id: delivery.id },
            data: {
              attemptCount,
              lastError: err?.message ?? 'Unknown error',
              nextRetryAt,
            },
          });
        }
      }
    }
  }
}
