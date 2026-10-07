import { WsAdapter } from '@nestjs/platform-ws';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { GlobalExceptionFilter } from 'src/common/filters/global-exception.filter';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';
import { NestExpressApplication } from '@nestjs/platform-express';

export async function createNestApp(): Promise<INestApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  app.useWebSocketAdapter(new WsAdapter(app));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.set('trust proxy', true); // for ip address retrieval behind proxies/load balancers

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      // forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const customOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: [
      'https://backlyst.co.uk',
      'https://admin.backlyst.co.uk',
      'https://api.backlyst.co.uk',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://backlyst-admin.vercel.app',
      'https://backlyst-frontend.vercel.app',
      'https://backlystadmin.softvenceomegaforce.cloud',
      'https://backlystweb.softvenceomegaforce.cloud',
      'http://3.7.116.63/app',
      'http://127.0.0.1:5500',
      'http://localhost:5500',
      ...customOrigins,
    ],
    credentials: true,
  });

  return app;
}
async function bootstrap() {
  const app = await createNestApp();

  setupSwagger(app);

  await app.listen(process.env.PORT || 5000, '0.0.0.0');

  console.log(`Application is running on: Port ${process.env.PORT || 5000}`);

  if (process.env.NODE_ENV !== 'production') {
    console.log(
      `API documentation available at: http://localhost:${process.env.PORT || 5000}/api/docs`,
    );
  }
}

if (require.main === module) {
  void bootstrap();
}
