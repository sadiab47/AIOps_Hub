import { NestFactory } from '@nestjs/core';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Parse HTTP cookies
  app.use(cookieParser());

  // Use nestjs-pino logger
  app.useLogger(app.get(Logger));
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

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
      'Production-ready AI Automation Platform built with Next.js, NestJS, Prisma, PostgreSQL, Redis, LangGraph, and OpenAI. Modular, multi-tenant SaaS for AI agents, knowledge bases, workflow automation, and enterprise operations.',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
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
