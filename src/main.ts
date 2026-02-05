import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
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

  // Get allowed origins: merge env var with defaults so localhost always works
  const defaultOrigins = [
    'http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://localhost:5174',
    'https://mgm-admin-amber.vercel.app', 'https://mgm-agent-form.vercel.app', 'https://mgm-user.vercel.app',
  ];
  const envOrigins = configService
    .get<string>("ALLOWED_ORIGINS")
    ?.split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin) || [];
  const allowedOrigins = [...new Set([...envOrigins, ...defaultOrigins])];
  
  // Enable CORS with limited origins
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  const port = configService.get<number>("PORT") || 3000;

  await app.listen(port);
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`🌐 Allowed CORS origins: ${allowedOrigins.join(", ")}`);
}
bootstrap();
