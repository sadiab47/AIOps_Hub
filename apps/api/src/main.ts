import { NestFactory } from '@nestjs/core';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Parse HTTP cookies
  app.use(cookieParser());

  // Use nestjs-pino logger
  app.useLogger(app.get(Logger));
  app.useGlobalInterceptors(new LoggerErrorInterceptor(), new ResponseEnvelopeInterceptor());
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // Set API prefix and versioning
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Configure Swagger Document
  const swaggerConfig = new DocumentBuilder()
    .setTitle('AIOps Hub API')
    .setDescription(
      'Production-ready AI Automation Platform built with Next.js, NestJS, Prisma, PostgreSQL, Redis, LangGraph, and OpenAI. Modular multi-tenant SaaS platform.',
    )
    .setVersion('0.2.0')
    .addCookieAuth('aiops_access_token', {
      type: 'apiKey',
      in: 'cookie',
      name: 'aiops_access_token',
      description: 'JWT Access Token stored in HttpOnly cookie',
    })
    .addCookieAuth('aiops_refresh_token', {
      type: 'apiKey',
      in: 'cookie',
      name: 'aiops_refresh_token',
      description: 'JWT Refresh Token stored in HttpOnly cookie',
    })
    .addTag('Authentication', 'User authentication, registration, login, logout, and token refresh')
    .addTag('Organizations', 'Multi-tenant organization management, switching, settings, and profile')
    .addTag('Members', 'Organization member lifecycle, roles, permissions, ownership transfer, and leave')
    .addTag('Invitations', 'Organization invitation creation, accept token verification, listing, and revoking')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);

  await app.listen(port);
  console.log(`🚀 API Application is running on: http://localhost:${port}/api/v1`);
  console.log(`📑 API Documentation is available at: http://localhost:${port}/api/docs`);
}
bootstrap();
