import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  
  const configService = app.get(ConfigService);

  // Enable DTO validation (class-validator) for all endpoints
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  
  // Get allowed origins from environment variable (comma-separated)
  // Default to localhost for development
  const allowedOrigins = configService
    .get<string>('ALLOWED_ORIGINS')
    ?.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin) || ['http://localhost:3000', 'http://localhost:3001' , 'https://mgm-user.vercel.app'];
  
  // Enable CORS with limited origins
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  const port = configService.get<number>('PORT') || 3000;
  
  await app.listen(port);
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`🌐 Allowed CORS origins: ${allowedOrigins.join(', ')}`);
}
bootstrap();
