import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  log(data: {
    clientId: string;
    actorType: string;
    actorId?: string;
    action: string;
    entity: string;
    entityId?: string;
    metadata?: any;
  }) {
    return this.prisma.auditLog.create({
      data: {
        ...data,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      } as any,
    });
  }
}
