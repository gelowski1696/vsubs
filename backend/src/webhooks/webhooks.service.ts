import { Injectable, NotFoundException } from '@nestjs/common';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toPaginationMeta } from '../common/utils/pagination';
import { WebhookEvent } from '../common/constants/domain';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  create(clientId: string, dto: CreateWebhookDto) {
    return this.prisma.webhookEndpoint.create({
      data: { clientId, ...dto, events: dto.events.join(',') },
    });
  }

  async findAll(clientId: string, query: { page?: number; limit?: number }) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const where: Prisma.WebhookEndpointWhereInput = { clientId };
    const [total, data] = await Promise.all([
      this.prisma.webhookEndpoint.count({ where }),
      this.prisma.webhookEndpoint.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { data, meta: toPaginationMeta(total, page, limit) };
  }

  async findOne(clientId: string, id: string) {
    const row = await this.prisma.webhookEndpoint.findFirst({ where: { clientId, id } });
    if (!row) {
      throw new NotFoundException('Webhook endpoint not found');
    }
    return row;
  }

  async update(clientId: string, id: string, dto: UpdateWebhookDto) {
    await this.findOne(clientId, id);
    const { events, ...rest } = dto;
    return this.prisma.webhookEndpoint.update({
      where: { id },
      data: {
        ...rest,
        ...(events ? { events: events.join(',') } : {}),
      },
    });
  }

  async remove(clientId: string, id: string) {
    await this.findOne(clientId, id);
    await this.prisma.webhookEndpoint.delete({ where: { id } });
    return { deleted: true };
  }

  async emit(clientId: string, event: WebhookEvent, payload: any) {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: { clientId, isActive: true },
    });

    const matched = endpoints.filter((endpoint) => {
      const events =
        typeof endpoint.events === 'string'
          ? endpoint.events.split(',').map((item) => item.trim()).filter(Boolean)
          : [];
      return events.includes(event);
    });

    for (const endpoint of matched) {
      const body = {
        event: event.replace('_', '.'),
        clientId,
        timestamp: new Date().toISOString(),
        data: payload,
      };
      const serialized = JSON.stringify(body);
      const signature = crypto.createHmac('sha256', endpoint.secret).update(serialized).digest('hex');

      await this.prisma.webhookDelivery.create({
        data: {
          clientId,
          endpointId: endpoint.id,
          event,
          payload: serialized,
          signature,
          status: 'PENDING',
          attemptCount: 0,
          nextRetryAt: new Date(),
        },
      });
    }
  }
}
