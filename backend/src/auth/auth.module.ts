import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@Module({
  imports: [JwtModule.register({}) , UsersModule],
  controllers: [AuthController],
  providers: [AuthService, ApiKeyGuard],
  exports: [AuthService],
})
export class AuthModule {}