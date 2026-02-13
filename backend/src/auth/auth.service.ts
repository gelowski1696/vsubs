import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  private async signTokens(user: { id: string; email: string; role: string; clientId: string }) {
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, role: user.role, clientId: user.clientId },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, clientId: user.clientId },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
      },
    );

    return { accessToken, refreshToken };
  }

  async login(clientId: string, email: string, password: string) {
    const user = await this.usersService.findByEmail(clientId, email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.signTokens(user);
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.usersService.updateRefreshTokenHash(clientId, user.id, refreshTokenHash);
    return {
      user: { id: user.id, email: user.email, role: user.role },
      ...tokens,
    };
  }

  async refresh(clientId: string, refreshToken: string) {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(clientId, payload.sub);
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.signTokens(user);
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.usersService.updateRefreshTokenHash(clientId, user.id, refreshTokenHash);
    return tokens;
  }

  async logout(clientId: string, userId: string) {
    await this.usersService.updateRefreshTokenHash(clientId, userId, null);
    return { loggedOut: true };
  }
}
