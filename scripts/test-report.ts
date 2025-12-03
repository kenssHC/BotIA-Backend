/**
 * Script para probar el flujo de REPORTES del LLM
 * 
 * Uso: npx ts-node scripts/test-report.ts
 * 
 * Este script simula el flujo de reportes programados:
 * 1. Hace login para obtener token
 * 2. Crea un reporte de prueba (o usa uno existente)
 * 3. Ejecuta el reporte y muestra el análisis de IA
 */

import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:4007';

// Credenciales de prueba (del seed)
const TEST_USER = {
  username: 'admin',
  password: 'admin123',
};

// Instrucciones de reporte de ejemplo
const TEST_REPORT_INSTRUCTIONS = [
  'Genera un análisis completo del rendimiento de las campañas de la última semana, incluyendo métricas de Google Ads, Meta Ads y TikTok Ads. Destaca las campañas con mejor y peor rendimiento.',
  'Analiza el CPA por plataforma y recomienda dónde optimizar el presupuesto.',
  'Compara el rendimiento de conversiones entre todas las plataformas y sugiere acciones de mejora.',
  'Identifica las campañas que están gastando sin generar conversiones y recomienda acciones.',
];

async function login(): Promise<string> {
  console.log('\n🔐 Iniciando sesión...');
  
  const response = await axios.post(`${API_URL}/api/auth/login`, TEST_USER, {
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': 'richarq',
    },
  });

  const token = response.data.data.access_token;
  console.log('✅ Login exitoso');
  return token;
}

async function checkLlmStatus(token: string): Promise<void> {
  console.log('\n🔍 Verificando estado del LLM...');
  
  const response = await axios.get(`${API_URL}/api/llm/status`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': 'richarq',
    },
  });

  const data = response.data.data;
  console.log(`   - OpenAI configurado: ${data.configured ? '✅ Sí' : '❌ No (modo demo)'}`);
  console.log(`   - Fórmulas cargadas: ${data.knowledge?.totalFormulas || 0}`);
  
  if (data.knowledge?.categories) {
    console.log('   - Categorías de conocimiento:');
    data.knowledge.categories.forEach((cat: any) => {
      console.log(`     • ${cat.name}: ${cat.formulasCount} fórmulas`);
    });
  }
}

async function testDirectReport(token: string, instruction: string): Promise<void> {
  console.log('\n' + '═'.repeat(70));
  console.log('📋 GENERACIÓN DIRECTA DE REPORTE');
  console.log('═'.repeat(70));
  console.log(`📝 Instrucción: "${instruction.substring(0, 100)}..."`);

  const startTime = Date.now();

  try {
    const response = await axios.post(
      `${API_URL}/api/llm/generate-report`,
      { instruction },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': 'richarq',
        },
        timeout: 120000, // 2 minutos para reportes largos
      }
    );

    const elapsed = Date.now() - startTime;
    const data = response.data.data;

    console.log(`\n⏱️  Tiempo de generación: ${elapsed}ms`);
    console.log(`📊 Datos analizados:`);
    console.log(`   - Campañas: ${data.dataContext?.totalCampaigns || 0}`);
    console.log(`   - Gasto total: $${data.dataContext?.totalSpend || 0}`);
    console.log(`   - Conversiones: ${data.dataContext?.totalConversions || 0}`);
    
    if (data.templateUsed) {
      console.log(`   - Template usado: ${data.templateUsed}`);
    }

    if (data.isDemo) {
      console.log('\n⚠️  MODO DEMO (sin OpenAI configurado)');
    }

    console.log('\n📋 REPORTE GENERADO:');
    console.log('─'.repeat(70));
    console.log(data.analysis);
    console.log('─'.repeat(70));

  } catch (error: any) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
  }
}

async function testReportExecution(token: string): Promise<void> {
  console.log('\n' + '═'.repeat(70));
  console.log('🚀 EJECUCIÓN DE REPORTE EXISTENTE');
  console.log('═'.repeat(70));

  try {
    // 1. Obtener reportes existentes
    console.log('\n📋 Obteniendo reportes existentes...');
    const reportsResponse = await axios.get(`${API_URL}/api/reports`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': 'richarq',
      },
    });

    const reports = reportsResponse.data.data;
    
    if (!reports || reports.length === 0) {
      console.log('⚠️  No hay reportes existentes. Creando uno de prueba...');
      
      // Crear reporte de prueba
      const createResponse = await axios.post(
        `${API_URL}/api/reports`,
        {
          name: 'Reporte de Prueba - Script',
          instruction: TEST_REPORT_INSTRUCTIONS[0],
          frequency: 'weekly',
          frequencyDetails: { day: 'lunes' },
          time: '09:00',
          isActive: true,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Tenant-ID': 'richarq',
          },
        }
      );
      
      reports.push(createResponse.data.data);
      console.log('✅ Reporte de prueba creado');
    }

    // 2. Mostrar reportes disponibles
    console.log(`\n📊 Reportes disponibles (${reports.length}):`);
    reports.forEach((r: any, i: number) => {
      console.log(`   ${i + 1}. ${r.name} (${r.frequency}) - ${r.isActive ? '🟢 Activo' : '🔴 Inactivo'}`);
    });

    // 3. Ejecutar el primer reporte
    const reportToExecute = reports[0];
    console.log(`\n▶️  Ejecutando reporte: "${reportToExecute.name}"...`);
    
    const startTime = Date.now();

    const execResponse = await axios.post(
      `${API_URL}/api/reports/${reportToExecute.id}/execute-immediate`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': 'richarq',
        },
        timeout: 120000,
      }
    );

    const elapsed = Date.now() - startTime;
    const execData = execResponse.data.data;

    console.log(`\n⏱️  Tiempo de ejecución: ${elapsed}ms`);
    console.log(`📝 ID de ejecución: ${execData.executionId || 'N/A'}`);
    
    if (execData.dataContext) {
      console.log(`📊 Contexto de datos:`);
      console.log(`   - Campañas: ${execData.dataContext.totalCampaigns || 0}`);
      console.log(`   - Gasto: $${execData.dataContext.totalSpend || 0}`);
    }

    console.log('\n📋 ANÁLISIS DEL REPORTE:');
    console.log('─'.repeat(70));
    console.log(execData.llmAnalysis || execData.analysis || 'Sin análisis disponible');
    console.log('─'.repeat(70));

  } catch (error: any) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
  }
}

async function main(): Promise<void> {
  console.log('═'.repeat(70));
  console.log('🧪 TEST DE REPORTES (Flujo de Reportes Programados)');
  console.log('═'.repeat(70));
  console.log(`📍 API URL: ${API_URL}`);

  try {
    // 1. Login
    const token = await login();

    // 2. Verificar estado del LLM
    await checkLlmStatus(token);

    // 3. Determinar qué test ejecutar
    const testType = process.argv[2] || 'both';

    if (testType === 'direct' || testType === 'both') {
      // Test de generación directa
      const instructionIndex = parseInt(process.argv[3]) || 0;
      const instruction = TEST_REPORT_INSTRUCTIONS[instructionIndex % TEST_REPORT_INSTRUCTIONS.length];
      await testDirectReport(token, instruction);
    }

    if (testType === 'execute' || testType === 'both') {
      // Test de ejecución de reporte existente
      await testReportExecution(token);
    }

    console.log('\n═'.repeat(70));
    console.log('✅ Test de reportes completado');
    console.log('═'.repeat(70));

    // Mostrar instrucciones de uso
    console.log('\n📋 Instrucciones de reporte disponibles:');
    TEST_REPORT_INSTRUCTIONS.forEach((instr, i) => {
      console.log(`   ${i}: "${instr.substring(0, 80)}..."`);
    });
    console.log('\nUso:');
    console.log('  npx ts-node scripts/test-report.ts direct [índice]  - Solo generación directa');
    console.log('  npx ts-node scripts/test-report.ts execute          - Solo ejecución de reporte');
    console.log('  npx ts-node scripts/test-report.ts both             - Ambos tests (default)');

  } catch (error: any) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
}

main();

