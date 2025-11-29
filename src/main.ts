import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Prefijo global para todas las rutas
  app.setGlobalPrefix('api');
  
  // Habilitar CORS para el frontend
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
    credentials: true,
  });
  
  // Filtro global de excepciones para mejor manejo de errores
  app.useGlobalFilters(new AllExceptionsFilter());
  
  // Validación global de DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  const port = process.env.PORT || 4006;
  await app.listen(port);
  
  console.log(`
  ==========================================
  🚀 KIA Miami Backend está corriendo
  ==========================================
  📍 URL: http://localhost:${port}
  📍 API: http://localhost:${port}/api
  📍 Auth: http://localhost:${port}/api/auth
  ==========================================
  `);
}

bootstrap();

