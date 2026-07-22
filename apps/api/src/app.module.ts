import { Module, ValidationPipe, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_PIPE, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { validateEnv } from './common/config/env.validation';
import { DatabaseModule } from './common/database/database.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { EventsModule } from './common/events/events.module';
import { AiModule } from './modules/ai/ai.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

import { AppThrottlerGuard } from './common/guards/throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== 'production' ? {
          target: 'pino-pretty',
          options: {
            singleLine: true,
          },
        } : undefined,
      },
    }),
    EventsModule,
    DatabaseModule,
    HealthModule,
    UsersModule,
    AuthModule,
    OrganizationsModule,
    AiModule,
    ThrottlerModule.forRoot([
      {
        name: 'login',
        limit: 5,
        ttl: 60000,
      },
      {
        name: 'register',
        limit: 5,
        ttl: 60000,
      },
      {
        name: 'refresh',
        limit: 20,
        ttl: 60000,
      },
      {
        name: 'chat',
        limit: 20,
        ttl: 60000,
      },
      {
        name: 'providerValidation',
        limit: 10,
        ttl: 60000,
      },
      {
        name: 'promptRender',
        limit: 60,
        ttl: 60000,
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          whitelist: true,
          transform: true,
          forbidNonWhitelisted: true,
        }),
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
