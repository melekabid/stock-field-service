import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const configuredOrigins = [
    config.get<string>('APP_URL'),
    ...(config
            .get<string>('ALLOWED_ORIGINS')
            ?.split(',')
            .map((origin) => origin.trim())
            .filter(Boolean) ?? []),
  ];
  const allowedOrigins = new Set(
    [
      ...configuredOrigins,
      'http://localhost:3000',
      'http://localhost:8080',
      'http://localhost:8081',
      'http://localhost:8090',
      'http://localhost:8091',
      'http://localhost:8092',
      'http://localhost:8093',
      'http://localhost:8094',
      'http://localhost:8095',
      'http://localhost:3002',
      'http://localhost:3003',
    ].filter((origin): origin is string => Boolean(origin)),
  );

  app.use(helmet());
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix('api');
  app.useStaticAssets(join(process.cwd(), config.get<string>('UPLOAD_DIR') ?? 'uploads'), {
    prefix: '/static/',
  });

  await app.listen(config.get<number>('PORT') ?? 3001);
}

bootstrap();
