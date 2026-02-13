import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ApiKeyGuard } from './api-key.guard';

@Injectable()
export class CompositeAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly apiKeyGuard: ApiKeyGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    if (!req.clientId) {
      throw new UnauthorizedException('X-Client-Id header is required');
    }

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: process.env.JWT_ACCESS_SECRET,
        });
        const user = await this.prisma.user.findFirst({
          where: { id: payload.sub, clientId: req.clientId },
        });
        if (!user) {
          throw new UnauthorizedException('User not found');
        }
        req.user = { id: user.id, email: user.email, role: user.role, clientId: user.clientId };
        return true;
      } catch {
        throw new UnauthorizedException('Invalid bearer token');
      }
    }

    if (await this.apiKeyGuard.validate(req)) {
      return true;
    }

    throw new UnauthorizedException('Authentication required');
  }
}