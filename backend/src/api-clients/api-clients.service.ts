import { Injectable, NotFoundException } from '@nestjs/common';
import crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApiClientDto } from './dto/create-api-client.dto';
import { UpdateApiClientDto } from './dto/update-api-client.dto';

@Injectable()
export class ApiClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clientId: string, dto: CreateApiClientDto) {
    const apiKey = `sm_${crypto.randomBytes(24).toString('hex')}`;
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const row = await this.prisma.apiClient.create({
      data: { clientId, name: dto.name, isActive: dto.isActive ?? true, apiKeyHash },
    });
    return { ...row, apiKey };
  }

  findAll(clientId: string) {
    return this.prisma.apiClient.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' } });
  }

  async findOne(clientId: string, id: string) {
    const row = await this.prisma.apiClient.findFirst({ where: { clientId, id } });
    if (!row) {
      throw new NotFoundException('API client not found');
    }
    return row;
  }

  async update(clientId: string, id: string, dto: UpdateApiClientDto) {
    await this.findOne(clientId, id);
    return this.prisma.apiClient.update({ where: { id }, data: dto });
  }

  async remove(clientId: string, id: string) {
    await this.findOne(clientId, id);
    await this.prisma.apiClient.delete({ where: { id } });
    return { deleted: true };
  }
}