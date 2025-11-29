"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Iniciando seed de la base de datos...');
    const tenant = await prisma.tenant.upsert({
        where: { slug: 'richarq' },
        update: {},
        create: {
            name: 'KIA Miami',
            slug: 'richarq',
            isActive: true,
        },
    });
    console.log('✅ Tenant creado:', tenant.name);
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@kiamami.com' },
        update: {},
        create: {
            username: 'admin',
            email: 'admin@kiamami.com',
            password: hashedPassword,
            firstName: 'Administrador',
            lastName: 'Sistema',
            role: 'ADMIN',
            isActive: true,
            requiresPasswordChange: false,
            tenantId: tenant.id,
        },
    });
    console.log('✅ Usuario admin creado:', adminUser.email);
    const testUser = await prisma.user.upsert({
        where: { email: 'usuario@kiamami.com' },
        update: {},
        create: {
            username: 'usuario',
            email: 'usuario@kiamami.com',
            password: hashedPassword,
            firstName: 'Usuario',
            lastName: 'Prueba',
            role: 'USER',
            isActive: true,
            requiresPasswordChange: true,
            tenantId: tenant.id,
        },
    });
    console.log('✅ Usuario de prueba creado:', testUser.email);
    const sampleReport = await prisma.report.upsert({
        where: { id: 'sample-report-1' },
        update: {},
        create: {
            id: 'sample-report-1',
            name: 'Reporte Semanal de Campañas',
            instruction: 'Genera un análisis completo del rendimiento de las campañas de la última semana, incluyendo métricas de Google Ads, Meta Ads y TikTok Ads. Destaca las campañas con mejor y peor rendimiento.',
            frequency: 'weekly',
            frequencyDetails: { day: 'lunes' },
            time: '09:00',
            isActive: true,
            userId: adminUser.id,
            tenantId: tenant.id,
        },
    });
    console.log('✅ Reporte de ejemplo creado:', sampleReport.name);
    console.log(`
  ==========================================
  🎉 Seed completado exitosamente!
  ==========================================
  
  📧 Usuarios creados:
  
  1. Administrador (sin cambio de contraseña):
     - Usuario: admin
     - Email: admin@kiamami.com
     - Contraseña: admin123
  
  2. Usuario de prueba (requiere cambio):
     - Usuario: usuario
     - Email: usuario@kiamami.com
     - Contraseña: admin123
  
  🏢 Tenant: ${tenant.name} (${tenant.slug})
  
  ==========================================
  `);
}
main()
    .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map