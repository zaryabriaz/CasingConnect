import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NextFunction, Request, Response } from 'express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();
  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3011')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (!origin || corsOrigins.includes(origin) || origin.endsWith(':3011')) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    allowedHeaders: ['Authorization', 'Content-Type'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Api-Version', '1');
    next();
  });

  const config = new DocumentBuilder()
    .setTitle('CasingConnect API')
    .setDescription(
      'Version 1 of the CasingConnect HTTP API. The web app and a future mobile app use these same endpoints. Send Authorization: Bearer <accessToken>. A token is scoped to one business. Call POST /api/v1/auth/switch-business to receive a token for another business. Successful responses are { data }. Errors are { error: { code, message, details } }.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addServer(`http://localhost:${process.env.PORT ?? 3010}`)
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  await app.listen(process.env.PORT ?? 3010);
}

void bootstrap();
