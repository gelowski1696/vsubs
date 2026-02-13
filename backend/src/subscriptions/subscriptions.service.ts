import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlansService } from '../plans/plans.service';
import { toPaginationMeta } from '../common/utils/pagination';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { addInterval, isBeforeDay } from './subscriptions.lifecycle';
import { PlanInterval, SubscriptionStatus, WebhookEvent } from '../common/constants/domain';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { QuerySubscriptionsDto } from './dto/query-subscriptions.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plansService: PlansService,
    private readonly webhooksService: WebhooksService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async create(clientId: string, dto: CreateSubscriptionDto, actorId?: string) {
    const plan = await this.plansService.findOne(clientId, dto.planId);
    const startDate = new Date(dto.startDate);
    const nextBillingDate = addInterval(startDate, plan.interval as PlanInterval, plan.intervalCount);

    const row = await this.prisma.subscription.create({
      data: {
        clientId,
        customerId: dto.customerId,
        planId: dto.planId,
        startDate,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        status: dto.status ?? 'ACTIVE',
        autoRenew: dto.autoRenew ?? true,
        nextBillingDate,
        cancelReason: dto.cancelReason,
      },
    });

    await this.auditLogs.log({
      clientId,
      actorType: actorId ? 'USER' : 'SYSTEM',
      actorId,
      action: 'SUBSCRIPTION_CREATE',
      entity: 'subscription',
      entityId: row.id,
      metadata: { dto },
    });
    await this.webhooksService.emit(clientId, 'subscription_created', row);
    return row;
  }

  async findAll(clientId: string, query: QuerySubscriptionsDto) {
    const where: Prisma.SubscriptionWhereInput = {
      clientId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, data] = await Promise.all([
      this.prisma.subscription.count({ where }),
      this.prisma.subscription.findMany({
        where,
        include: { customer: true, plan: true },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
      }),
    ]);

    return { data, meta: toPaginationMeta(total, query.page, query.limit) };
  }

  async findOne(clientId: string, id: string) {
    const row = await this.prisma.subscription.findFirst({
      where: { clientId, id },
      include: { customer: true, plan: true },
    });
    if (!row) {
      throw new NotFoundException('Subscription not found');
    }
    return row;
  }

  async update(clientId: string, id: string, dto: UpdateSubscriptionDto) {
    await this.findOne(clientId, id);
    const row = await this.prisma.subscription.update({ where: { id }, data: dto as any });
    await this.webhooksService.emit(clientId, 'subscription_updated', row);
    return row;
  }

  async remove(clientId: string, id: string) {
    await this.findOne(clientId, id);
    await this.prisma.subscription.delete({ where: { id } });
    return { deleted: true };
  }

  async pause(clientId: string, id: string) {
    await this.findOne(clientId, id);
    const row = await this.prisma.subscription.update({
      where: { id },
      data: { status: 'PAUSED' },
    });
    await this.webhooksService.emit(clientId, 'subscription_updated', row);
    return row;
  }

  async resume(clientId: string, id: string) {
    const sub = await this.findOne(clientId, id);
    const today = new Date();
    let nextBillingDate = sub.nextBillingDate;
    if (nextBillingDate && isBeforeDay(nextBillingDate, today)) {
      nextBillingDate = addInterval(today, sub.plan.interval as PlanInterval, sub.plan.intervalCount);
    }

    const row = await this.prisma.subscription.update({
      where: { id },
      data: { status: 'ACTIVE', nextBillingDate },
    });
    await this.webhooksService.emit(clientId, 'subscription_updated', row);
    return row;
  }

  async cancel(clientId: string, id: string, dto: CancelSubscriptionDto) {
    const sub = await this.findOne(clientId, id);
    const row = await this.prisma.subscription.update({
      where: { id },
      data: {
        status: 'CANCELED',
        autoRenew: false,
        endDate: sub.endDate ?? new Date(),
        cancelReason: dto.reason ?? sub.cancelReason,
      },
    });
    await this.webhooksService.emit(clientId, 'subscription_canceled', row);
    return row;
  }

  async getEndingSoon(clientId: string, days: number) {
    const now = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + days);

    return this.prisma.subscription.findMany({
      where: {
        clientId,
        status: 'ACTIVE',
        nextBillingDate: { gte: now, lte: soon },
      },
      include: { customer: true, plan: true },
      orderBy: { nextBillingDate: 'asc' },
    });
  }

  async getExpiredSince(clientId: string, since: string) {
    return this.prisma.subscription.findMany({
      where: {
        clientId,
        status: 'EXPIRED',
        updatedAt: { gte: new Date(since) },
      },
      include: { customer: true, plan: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async evaluateExpirations(clientId?: string) {
    const today = new Date();
    const where: Prisma.SubscriptionWhereInput = {
      ...(clientId ? { clientId } : {}),
      status: { in: ['ACTIVE', 'CANCELED', 'TRIALING'] },
    };

    const rows = await this.prisma.subscription.findMany({
      where,
      include: { plan: true },
    });

    const results = { renewed: 0, expired: 0, checked: rows.length };

    for (const sub of rows) {
      let updated = false;
      const data: Prisma.SubscriptionUpdateInput = {};

      if (sub.endDate && isBeforeDay(sub.endDate, today)) {
        data.status = 'EXPIRED';
        updated = true;
      } else if (sub.nextBillingDate && isBeforeDay(sub.nextBillingDate, today)) {
        if (!sub.autoRenew) {
          data.status = 'EXPIRED';
          updated = true;
        } else if (sub.status === 'ACTIVE') {
          let next = sub.nextBillingDate;
          while (next && isBeforeDay(next, today)) {
            next = addInterval(next, sub.plan.interval as PlanInterval, sub.plan.intervalCount);
          }
          data.nextBillingDate = next;
          updated = true;
          results.renewed += 1;
        }
      }

      if (updated) {
        const updatedSub = await this.prisma.subscription.update({ where: { id: sub.id }, data });
        if (updatedSub.status === 'EXPIRED') {
          results.expired += 1;
          await this.webhooksService.emit(updatedSub.clientId, 'subscription_expired', updatedSub);
        } else {
          await this.webhooksService.emit(updatedSub.clientId, 'subscription_renewed', updatedSub);
        }
      }
    }

    return results;
  }
}
