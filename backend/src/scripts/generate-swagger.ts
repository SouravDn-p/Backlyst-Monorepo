import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { ACCESS_TOKEN } from '../common/constants/auth.constants';

async function generate() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Blacklyst API')
    .setDescription('API Documentation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      ACCESS_TOKEN,
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // ✅ Global auth
  document.security = [{ [ACCESS_TOKEN]: [] }];

  // ✅ Write file
  writeFileSync('./swagger.json', JSON.stringify(document, null, 2));

  await app.close();

  console.log('✅ Swagger JSON generated: swagger.json');
}

generate();
