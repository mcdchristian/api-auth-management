import { NestFactory } from '@nestjs/core';
import {
  ValidationPipe,
  Logger,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const configService = app.get(ConfigService);

  // Security: HTTP headers
  app.use(helmet());

  // CORS
  const allowedOrigins = configService.get<string[]>('cors.allowedOrigins') || [
    'http://localhost:3000',
  ];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // API versioning — global prefix
  app.setGlobalPrefix('api/v1');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global serialization interceptor (applies @Exclude / @Expose from class-transformer)
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Swagger setup
  const swaggerEnabled = configService.get<boolean>('swagger.enabled') ?? true;
  const config = new DocumentBuilder()
    .setTitle('API Auth & User Management')
    .setDescription(
      'Secure, production-ready REST API for authentication and user management.\n\n' +
        '**Features:** JWT auth, refresh token rotation, RBAC (user/admin/manager), ' +
        'rate limiting, soft-delete, and pagination.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag(
      'Authentication',
      'Login, register, logout, refresh tokens, change password',
    )
    .addTag('Users', 'User CRUD, profile management (admin & self-service)')
    .addTag('Health', 'Application health checks')
    .addTag('Audit', 'Security audit trail (admin only)')
    .build();
  if (swaggerEnabled) {
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Let Nest run onModuleDestroy/onApplicationShutdown on SIGTERM so the
  // TypeORM pool drains and in-flight requests finish. Container runtimes send
  // SIGTERM and then SIGKILL a few seconds later; without this the process
  // ignores the first signal entirely and connections are severed.
  app.enableShutdownHooks();

  const port = configService.get<number>('port') || 3000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`API Base URL: http://localhost:${port}/api/v1`);
  if (swaggerEnabled) {
    logger.log(`Swagger documentation: http://localhost:${port}/api/docs`);
  } else {
    logger.log('Swagger documentation is disabled (SWAGGER_ENABLED=false)');
  }
}
void bootstrap();
