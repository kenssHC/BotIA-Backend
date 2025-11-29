# KIA Miami Backend

Backend NestJS con PostgreSQL para el sistema de análisis de campañas con IA.

## 📋 Requisitos Previos

- Node.js 18+
- PostgreSQL 14+
- npm o yarn

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd kia_miami-backend
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Base de datos - CAMBIA tu_password por tu contraseña de PostgreSQL
DATABASE_URL="postgresql://postgres:tu_password@localhost:5432/kia_miami_db?schema=public"

# JWT
JWT_SECRET="kia_miami_super_secret_key_2024_change_in_production"
JWT_EXPIRES_IN="24h"

# Servidor
PORT=4006
NODE_ENV=development

# Tenant
DEFAULT_TENANT_ID=richarq
```

### 3. Crear la base de datos en PostgreSQL

```bash
# Conectar a PostgreSQL
psql -U postgres

# Crear la base de datos
CREATE DATABASE kia_miami_db;

# Salir
\q
```

### 4. Ejecutar migraciones de Prisma

```bash
# Generar cliente Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev --name init
```

### 5. Cargar datos iniciales (seed)

```bash
npx ts-node prisma/seed.ts
```

### 6. Iniciar el servidor

```bash
# Desarrollo (con hot-reload)
npm run start:dev

# Producción
npm run build
npm run start:prod
```

## 📍 Endpoints Disponibles

El servidor corre en `http://localhost:4006`

### Autenticación (`/api/auth`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/verify-token` | Verificar token JWT |
| POST | `/api/auth/first-login-change-password` | Cambiar contraseña (primer login) |
| POST | `/api/auth/forgot-password` | Solicitar reset de contraseña |
| POST | `/api/auth/reset-password` | Restablecer contraseña |

### Usuarios (`/api/users`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/users/profile` | Obtener perfil del usuario actual |
| GET | `/api/users` | Listar usuarios del tenant |
| GET | `/api/users/:id` | Obtener usuario por ID |

### Reportes (`/api/reports`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/reports` | Listar reportes |
| GET | `/api/reports/:id` | Obtener reporte por ID |
| POST | `/api/reports` | Crear reporte |
| PATCH | `/api/reports/:id` | Actualizar reporte |
| DELETE | `/api/reports/:id` | Eliminar reporte |
| POST | `/api/reports/:id/execute-immediate` | Ejecutar reporte |

## 👤 Usuarios de Prueba

Después de ejecutar el seed:

| Usuario | Email | Contraseña | Rol |
|---------|-------|------------|-----|
| admin | admin@kiamami.com | admin123 | ADMIN |
| usuario | usuario@kiamami.com | admin123 | USER |

## 📥 Ingesta de Datos Excel

### Preparación

1. Coloca los archivos Excel en `data/raw/`:
   - `google_ads.xlsx` (o cualquier nombre con "google")
   - `meta_ads.xlsx` (o "facebook", "meta")
   - `tiktok_ads.xlsx` (o "tiktok")

2. Asegúrate de que tengan columnas como:
   - `campaign_id` o `id`
   - `campaign_name` o `name`
   - `date` o `fecha`
   - `impressions`, `clicks`, `spend`, `conversions`

### Comandos de ingesta

```bash
# Ingestar todos los archivos
npm run ingest:all

# Ingestar por plataforma
npm run ingest:google
npm run ingest:meta
npm run ingest:tiktok
```

### Endpoints de ingesta (API)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/ingest/all` | Ingestar todos los archivos |
| POST | `/api/ingest/google` | Ingestar Google Ads |
| POST | `/api/ingest/meta` | Ingestar Meta Ads |
| POST | `/api/ingest/tiktok` | Ingestar TikTok Ads |
| GET | `/api/ingest/stats` | Ver estadísticas de datos cargados |

---

## 🛠️ Comandos Útiles

```bash
# Ver base de datos con Prisma Studio
npx prisma studio

# Resetear base de datos
npx prisma migrate reset

# Generar nueva migración
npx prisma migrate dev --name nombre_migracion

# Ver logs de Prisma
DEBUG=prisma:query npm run start:dev
```

## 📁 Estructura del Proyecto

```
kia_miami-backend/
├── prisma/
│   ├── schema.prisma      # Modelos de BD
│   ├── seed.ts            # Datos iniciales
│   └── migrations/        # Migraciones
├── src/
│   ├── auth/              # Autenticación
│   │   ├── dto/
│   │   ├── guards/
│   │   ├── strategies/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── users/             # Usuarios
│   ├── reports/           # Reportes
│   ├── prisma/            # Servicio Prisma
│   ├── app.module.ts
│   └── main.ts
├── .env
├── package.json
└── tsconfig.json
```

## 🔗 Conexión con Frontend

El frontend ya está configurado para conectarse a `http://localhost:4006`. 
Asegúrate de que el backend esté corriendo antes de iniciar el frontend.

```bash
# Terminal 1: Backend
cd kia_miami-backend
npm run start:dev

# Terminal 2: Frontend
cd kia_miami-frontend
npm run dev
```

