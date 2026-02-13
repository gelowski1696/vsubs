import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1', {
    exclude: ['health'],
  });
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );

  const defaultOrigins = ['http://localhost:8100', 'http://127.0.0.1:8100'];
  const corsOriginsRaw = process.env.CORS_ORIGINS ?? '';
  const allowAllOrigins = corsOriginsRaw.trim() === '*';
  const configuredOrigins = corsOriginsRaw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  const allowedOrigins = new Set([...defaultOrigins, ...configuredOrigins]);

  app.enableCors({
    origin: (origin, callback) => {
      if (allowAllOrigins) {
        callback(null, true);
        return;
      }
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Id', 'X-API-Key'],
    credentials: false,
    optionsSuccessStatus: 204,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('SubMan API')
    .setDescription('Reusable multi-tenant subscription API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', in: 'header', name: 'X-API-Key' }, 'apiKey')
    .addServer('/')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const docsDir = join(process.cwd(), 'docs');
  if (!existsSync(docsDir)) {
    mkdirSync(docsDir, { recursive: true });
  }
  writeFileSync(join(docsDir, 'openapi.json'), JSON.stringify(document, null, 2));
  (app as any).useStaticAssets(docsDir, { prefix: '/docs/' });

  const port = Number(process.env.PORT ?? 3003);
  await app.listen(port, '0.0.0.0');
}

bootstrap();
