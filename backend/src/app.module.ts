import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { PlansModule } from './plans/plans.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ApiClientsModule } from './api-clients/api-clients.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { MobileUpdatesModule } from './mobile-updates/mobile-updates.module';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import { CompositeAuthGuard } from './common/guards/composite-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ApiKeyGuard } from './common/guards/api-key.guard';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    JwtModule.register({}),
    PrismaModule,
    UsersModule,
    AuthModule,
    CustomersModule,
    PlansModule,
    SubscriptionsModule,
    WebhooksModule,
    ApiClientsModule,
    HealthModule,
    AuditLogsModule,
    SchedulerModule,
    MobileUpdatesModule,
  ],
  providers: [
    ApiKeyGuard,
    {
      provide: APP_GUARD,
      useClass: CompositeAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
