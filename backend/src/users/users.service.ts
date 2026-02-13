import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(clientId: string, email: string) {
    return this.prisma.user.findFirst({ where: { clientId, email } });
  }

  findById(clientId: string, id: string) {
    return this.prisma.user.findFirst({ where: { clientId, id } });
  }

  updateRefreshTokenHash(clientId: string, id: string, refreshTokenHash: string | null) {
    return this.prisma.user.update({
      where: { id },
      data: { refreshTokenHash },
    });
  }
}