import { Injectable, UnauthorizedException } from '@nestjs/common';
import crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ApiKeyGuard {
  constructor(private readonly prisma: PrismaService) {}

  async validate(req: any): Promise<boolean> {
    const raw = req.headers['x-api-key'];
    const apiKey = Array.isArray(raw) ? raw[0] : raw;
    if (!apiKey) {
      return false;
    }
    const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const apiClient = await this.prisma.apiClient.findFirst({
      where: { clientId: req.clientId, apiKeyHash: hash, isActive: true },
    });
    if (!apiClient) {
      throw new UnauthorizedException('Invalid API key');
    }
    req.apiClient = apiClient;
    return true;
  }
}