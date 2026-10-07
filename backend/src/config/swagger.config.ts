import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ACCESS_TOKEN } from 'src/common/constants/auth.constants';

export const setupSwagger = (app: INestApplication) => {
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
  document.security = [{ [ACCESS_TOKEN]: [] }];

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Keep auth after reload
      withCredentials: true, // Only enable if using cookie/session auth
      docExpansion: 'list',
      defaultModelsExpandDepth: 1,

      deepLinking: true, // Enables URL links per endpoint
      displayRequestDuration: true, // Show request timing for debugging
      showExtensions: false, // Optional: hide x-* extensions for cleaner UI
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });
};
