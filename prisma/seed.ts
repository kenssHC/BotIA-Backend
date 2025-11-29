import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Crear tenant por defecto
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

  // Hash de la contraseña por defecto
  const hashedPassword = await bcrypt.hash('admin123', 10);

  // Crear usuario administrador
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
      requiresPasswordChange: false, // Para pruebas, no requerir cambio
      tenantId: tenant.id,
    },
  });

  console.log('✅ Usuario admin creado:', adminUser.email);

  // Crear usuario de prueba
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
      requiresPasswordChange: true, // Este sí requiere cambio
      tenantId: tenant.id,
    },
  });

  console.log('✅ Usuario de prueba creado:', testUser.email);

  // Crear un reporte de ejemplo
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

