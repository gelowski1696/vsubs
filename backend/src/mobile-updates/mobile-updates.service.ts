import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Prisma, MobileRelease } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toPaginationMeta } from '../common/utils/pagination';
import { CheckMobileUpdateDto } from './dto/check-mobile-update.dto';
import { CreateMobileReleaseDto } from './dto/create-mobile-release.dto';
import { CreateMobileUpdateEventDto } from './dto/create-mobile-update-event.dto';
import { PublishMobileReleaseDto } from './dto/publish-mobile-release.dto';
import { QueryMobileReleasesDto } from './dto/query-mobile-releases.dto';

@Injectable()
export class MobileUpdatesService {
  private readonly checkWindowMs = 3000;
  private readonly checkWindowMax = 15;
  private readonly checkCounters = new Map<string, { count: number; startedAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  private getStorageDir(clientId: string): string {
    const dir = join(process.cwd(), 'storage', 'mobile-updates', clientId);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  private getDownloadTokenSecret(): string {
    return process.env.MOBILE_UPDATE_TOKEN_SECRET ?? process.env.JWT_ACCESS_SECRET ?? 'subman-mobile-update-secret';
  }

  createSignedDownloadToken(clientId: string, releaseId: string, ttlSeconds = 900): string {
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
    const payload = `${clientId}:${releaseId}:${expiresAt}`;
    const payloadBase64 = Buffer.from(payload, 'utf8').toString('base64url');
    const signature = createHmac('sha256', this.getDownloadTokenSecret())
      .update(payloadBase64)
      .digest('hex');
    return `${payloadBase64}.${signature}`;
  }

  parseSignedDownloadToken(token: string): { clientId: string; releaseId: string } {
    const [payloadBase64, signature] = token.split('.');
    if (!payloadBase64 || !signature) {
      throw new BadRequestException('Invalid download token');
    }

    const expectedSignature = createHmac('sha256', this.getDownloadTokenSecret())
      .update(payloadBase64)
      .digest('hex');
    const actual = Buffer.from(signature, 'utf8');
    const expected = Buffer.from(expectedSignature, 'utf8');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new BadRequestException('Invalid download token signature');
    }

    const payload = Buffer.from(payloadBase64, 'base64url').toString('utf8');
    const [clientId, releaseId, expiresAtRaw] = payload.split(':');
    const expiresAt = Number.parseInt(expiresAtRaw ?? '', 10);

    if (!clientId || !releaseId || Number.isNaN(expiresAt)) {
      throw new BadRequestException('Invalid download token payload');
    }
    if (Math.floor(Date.now() / 1000) > expiresAt) {
      throw new BadRequestException('Download token expired');
    }

    return { clientId, releaseId };
  }

  private compareVersions(left: string, right: string): number {
    const clean = (value: string): number[] =>
      value
        .split('-')[0]
        .split('.')
        .map((part) => Number.parseInt(part, 10))
        .map((n) => (Number.isNaN(n) ? 0 : n));

    const a = clean(left);
    const b = clean(right);
    const length = Math.max(a.length, b.length);
    for (let i = 0; i < length; i += 1) {
      const x = a[i] ?? 0;
      const y = b[i] ?? 0;
      if (x > y) {
        return 1;
      }
      if (x < y) {
        return -1;
      }
    }
    return 0;
  }

  private assertCheckRateLimit(clientId: string): void {
    const now = Date.now();
    const state = this.checkCounters.get(clientId);
    if (!state || now - state.startedAt > this.checkWindowMs) {
      this.checkCounters.set(clientId, { count: 1, startedAt: now });
      return;
    }

    state.count += 1;
    if (state.count > this.checkWindowMax) {
      throw new HttpException('Too many update checks. Please retry shortly.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async createRelease(clientId: string, dto: CreateMobileReleaseDto) {
    return this.prisma.mobileRelease.create({
      data: {
        clientId,
        platform: dto.platform,
        channel: dto.channel ?? 'stable',
        appVersion: dto.appVersion,
        bundleVersion: dto.bundleVersion,
        releaseNotes: dto.releaseNotes,
        mandatory: dto.mandatory ?? false,
        minimumSupportedAppVersion: dto.minimumSupportedAppVersion,
      },
    });
  }

  async listReleases(clientId: string, query: QueryMobileReleasesDto) {
    const where: Prisma.MobileReleaseWhereInput = {
      clientId,
      ...(query.platform ? { platform: query.platform } : {}),
      ...(query.channel ? { channel: query.channel } : {}),
      ...(query.published ? { isPublished: query.published === 'true' } : {}),
    };

    const [total, data] = await Promise.all([
      this.prisma.mobileRelease.count({ where }),
      this.prisma.mobileRelease.findMany({
        where,
        include: {
          assets: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    return { data, meta: toPaginationMeta(total, query.page, query.limit) };
  }

  async uploadReleaseBundle(clientId: string, releaseId: string, file: any) {
    if (!file) {
      throw new BadRequestException('Bundle zip file is required');
    }

    const release = await this.prisma.mobileRelease.findFirst({ where: { id: releaseId, clientId } });
    if (!release) {
      throw new NotFoundException('Release not found');
    }

    const ext = file.originalname.toLowerCase().endsWith('.zip') ? '.zip' : '';
    if (!ext) {
      throw new BadRequestException('Only .zip bundle files are supported');
    }

    const storageDir = this.getStorageDir(clientId);
    const fileName = `${release.id}-${Date.now()}-${randomUUID()}.zip`;
    const filePath = join(storageDir, fileName);

    writeFileSync(filePath, file.buffer);

    const checksumSha256 = createHash('sha256').update(file.buffer).digest('hex');
    const sizeBytes = file.buffer.byteLength;

    await this.prisma.mobileReleaseAsset.create({
      data: {
        releaseId: release.id,
        clientId,
        filePath,
        checksumSha256,
        sizeBytes,
        mimeType: 'application/zip',
      },
    });

    return {
      releaseId: release.id,
      checksumSha256,
      sizeBytes,
      fileName,
    };
  }

  async publishRelease(clientId: string, releaseId: string, dto: PublishMobileReleaseDto) {
    const release = await this.prisma.mobileRelease.findFirst({
      where: { id: releaseId, clientId },
      include: { assets: true },
    });
    if (!release) {
      throw new NotFoundException('Release not found');
    }

    if (dto.publish && release.assets.length === 0) {
      throw new BadRequestException('Upload a bundle asset before publishing');
    }

    return this.prisma.mobileRelease.update({
      where: { id: release.id },
      data: {
        isPublished: dto.publish,
        publishedAt: dto.publish ? new Date() : null,
      },
    });
  }

  async checkForUpdate(clientId: string, dto: CheckMobileUpdateDto) {
    this.assertCheckRateLimit(clientId);

    const channel = dto.channel ?? 'stable';
    const latestRelease = await this.prisma.mobileRelease.findFirst({
      where: {
        clientId,
        platform: dto.platform,
        channel,
        isPublished: true,
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        assets: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!latestRelease || latestRelease.assets.length === 0) {
      return {
        updateAvailable: false,
        latestAppVersion: dto.appVersion,
        minimumSupportedAppVersion: null,
        mandatory: false,
        releaseNotes: null,
        bundle: null,
      };
    }

    const latestAsset = latestRelease.assets[0];
    const minVersion = latestRelease.minimumSupportedAppVersion ?? null;
    const appBelowMinimum = Boolean(
      minVersion && this.compareVersions(dto.appVersion, minVersion) < 0,
    );

    const updateAvailable = appBelowMinimum || dto.bundleVersion !== latestRelease.bundleVersion;

    const token = this.createSignedDownloadToken(clientId, latestRelease.id);
    const bundleUrl = `/v1/mobile-updates/releases/${latestRelease.id}/bundle?token=${encodeURIComponent(token)}`;

    return {
      updateAvailable,
      latestAppVersion: latestRelease.appVersion,
      minimumSupportedAppVersion: minVersion,
      mandatory: latestRelease.mandatory || appBelowMinimum,
      releaseNotes: latestRelease.releaseNotes,
      bundle: updateAvailable
        ? {
            id: latestRelease.id,
            url: bundleUrl,
            checksumSha256: latestAsset.checksumSha256,
            sizeBytes: latestAsset.sizeBytes,
          }
        : null,
    };
  }

  async createEvent(clientId: string, dto: CreateMobileUpdateEventDto) {
    if (dto.releaseId) {
      const release = await this.prisma.mobileRelease.findFirst({
        where: { id: dto.releaseId, clientId },
      });
      if (!release) {
        throw new NotFoundException('Release not found for event log');
      }
    }

    return this.prisma.mobileUpdateEvent.create({
      data: {
        clientId,
        releaseId: dto.releaseId,
        eventType: dto.eventType,
        appVersion: dto.appVersion,
        bundleVersion: dto.bundleVersion,
        deviceId: dto.deviceId,
        message: dto.message,
      },
    });
  }

  async readBundleFile(clientId: string, releaseId: string): Promise<{ release: MobileRelease; filePath: string; sizeBytes: number }> {
    const release = await this.prisma.mobileRelease.findFirst({
      where: { id: releaseId, clientId, isPublished: true },
      include: {
        assets: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!release || release.assets.length === 0) {
      throw new NotFoundException('Bundle not found');
    }

    const asset = release.assets[0];
    if (!existsSync(asset.filePath)) {
      throw new NotFoundException('Bundle file missing on server');
    }

    return {
      release,
      filePath: asset.filePath,
      sizeBytes: statSync(asset.filePath).size,
    };
  }

  getBundleBuffer(filePath: string): Buffer {
    return readFileSync(filePath);
  }
}
