import 'reflect-metadata';
import { Controller, Get, Inject, Module, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json } from 'express';
import helmet from 'helmet';
import { DataSource } from 'typeorm';
import { makeDataSource } from './database/data-source';
import { UsersService } from './users/users.service';
import { UsersController } from './users/users.controller';
import { ExportsService } from './users/exports.service';

@Controller('health')
class HealthController {
  constructor(@Inject(DataSource) private readonly db: DataSource) {}
  @Get() async health() {
    await this.db.query('SELECT 1');
    return { status: 'ok', database: 'postgresql' };
  }
}
export async function createApp(db?: DataSource) {
  const source = db || makeDataSource();
  if (!source.isInitialized) await source.initialize();
  @Module({
    controllers: [UsersController, HealthController],
    providers: [UsersService, ExportsService, { provide: DataSource, useValue: source }],
  })
  class AppModule {}
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: process.env.NODE_ENV === 'test' ? false : ['log', 'warn', 'error'],
  });
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(json({ limit: '4mb' }));
  app.use((_req: unknown, res: { setHeader: (k: string, v: string) => void }, next: () => void) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  const allowed = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((s) => s.trim());
  app.enableCors({
    origin: allowed,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type'],
    exposedHeaders: ['Content-Disposition'],
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      validationError: { target: false, value: false },
    }),
  );
  const config = new DocumentBuilder()
    .setTitle('IntentTech Profiles API')
    .setDescription(
      'Five CRUD endpoints. POST and PUT each accept four nested objects and write all records in one PostgreSQL transaction. PDF and editable DOCX exports are available separately. Use fictional data in this assessment demo.',
    )
    .setVersion('1.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/openapi.json',
    swaggerOptions: { persistAuthorization: false },
  });
  await app.init();
  return app;
}
