"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.setGlobalPrefix('api');
    app.enableCors({
        origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
        credentials: true,
    });
    app.useGlobalFilters(new http_exception_filter_1.AllExceptionsFilter());
    app.useGlobalPipes(new common_1.ValidationPipe({
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
//# sourceMappingURL=main.js.map