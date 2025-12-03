/**
 * Script para probar el flujo de CONSULTAS (query) del LLM
 * 
 * Uso: npx ts-node scripts/test-query.ts
 * 
 * Este script simula el flujo de WhatsApp:
 * 1. Hace login para obtener token
 * 2. Envía una consulta al endpoint /api/llm/query
 * 3. Muestra la respuesta de la IA
 */

import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:4007';

// Credenciales de prueba (del seed)
const TEST_USER = {
  username: 'admin',
  password: 'admin123',
};

// Consultas de ejemplo para probar
const TEST_QUERIES = [
  '¿Cuál es el CPA promedio de todas las campañas?',
  '¿Qué plataforma tiene mejor rendimiento en conversiones?',
  '¿Cuántas conversiones generamos este mes?',
  '¿Cuál es la tendencia de conversiones por semana?',
  '¿Qué porcentaje del gasto corresponde a cada plataforma?',
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

async function testQuery(token: string, query: string): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log(`📝 CONSULTA: "${query}"`);
  console.log('='.repeat(60));

  const startTime = Date.now();

  try {
    const response = await axios.post(
      `${API_URL}/api/llm/query`,
      { query },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': 'richarq',
        },
        timeout: 60000, // 60 segundos para respuestas de OpenAI
      }
    );

    const elapsed = Date.now() - startTime;

    console.log(`\n⏱️  Tiempo de respuesta: ${elapsed}ms`);
    console.log(`📊 Campañas analizadas: ${response.data.data.dataContext?.campaigns || 0}`);
    console.log(`📈 Métricas procesadas: ${response.data.data.dataContext?.metrics || 0}`);
    
    if (response.data.data.formulasUsed?.length > 0) {
      console.log(`📐 Fórmulas utilizadas: ${response.data.data.formulasUsed.join(', ')}`);
    }

    if (response.data.data.isDemo) {
      console.log('\n⚠️  MODO DEMO (sin OpenAI configurado)');
    }

    console.log('\n📋 RESPUESTA:');
    console.log('-'.repeat(60));
    console.log(response.data.data.response);
    console.log('-'.repeat(60));

  } catch (error: any) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
  }
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
  console.log(`   - Proveedor: ${data.provider}`);
  console.log(`   - Fórmulas cargadas: ${data.knowledge?.totalFormulas || 0}`);
  console.log(`   - Categorías: ${data.knowledge?.categories?.length || 0}`);
}

async function main(): Promise<void> {
  console.log('═'.repeat(60));
  console.log('🧪 TEST DE CONSULTAS (Flujo WhatsApp)');
  console.log('═'.repeat(60));
  console.log(`📍 API URL: ${API_URL}`);

  try {
    // 1. Login
    const token = await login();

    // 2. Verificar estado del LLM
    await checkLlmStatus(token);

    // 3. Seleccionar consulta a probar
    const queryIndex = parseInt(process.argv[2]) || 0;
    const query = process.argv[3] || TEST_QUERIES[queryIndex % TEST_QUERIES.length];

    // 4. Ejecutar consulta
    await testQuery(token, query);

    console.log('\n═'.repeat(60));
    console.log('✅ Test completado');
    console.log('═'.repeat(60));

    // Mostrar otras consultas disponibles
    console.log('\n📋 Otras consultas de prueba disponibles:');
    TEST_QUERIES.forEach((q, i) => {
      console.log(`   ${i}: "${q}"`);
    });
    console.log('\nUso: npx ts-node scripts/test-query.ts [índice] "[consulta personalizada]"');

  } catch (error: any) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
}

main();

