import { Body, Controller, Get, Headers, Post, Req, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('auth/login')
  @ApiHeader({ name: 'X-Client-Id', required: true })
  login(@Headers('x-client-id') clientId: string, @Body() dto: LoginDto) {
    return this.authService.login(clientId, dto.email, dto.password);
  }

  @Public()
  @Post('auth/refresh')
  @ApiHeader({ name: 'X-Client-Id', required: true })
  refresh(@Headers('x-client-id') clientId: string, @Body() dto: RefreshDto) {
    return this.authService.refresh(clientId, dto.refreshToken);
  }

  @Post('auth/logout')
  @ApiBearerAuth()
  logout(@Headers('x-client-id') clientId: string, @Req() req: any) {
    if (!req.user?.id) {
      throw new UnauthorizedException('JWT auth required for logout');
    }
    return this.authService.logout(clientId, req.user.id);
  }

  @Get('me')
  @ApiBearerAuth()
  me(@Req() req: any) {
    return req.user ?? req.apiClient;
  }
}