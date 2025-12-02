import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';

@Injectable()
export class LlmService implements OnModuleInit {
  private readonly logger = new Logger(LlmService.name);
  private openai: OpenAI;
  private model: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini';

    if (!apiKey) {
      this.logger.warn('⚠️ OPENAI_API_KEY no configurada. El módulo LLM funcionará en modo mock.');
      return;
    }

    this.openai = new OpenAI({
      apiKey,
    });

    this.logger.log(`✅ OpenAI inicializado con modelo: ${this.model}`);
  }

  /**
   * Verifica si OpenAI está configurado
   */
  isConfigured(): boolean {
    return !!this.openai;
  }

  /**
   * Analiza datos de campañas con IA
   */
  async analyzeCampaigns(query: string, tenantId: string): Promise<any> {
    // Obtener datos de campañas del tenant
    const campaignData = await this.getCampaignDataForAnalysis(tenantId);

    if (!this.openai) {
      return this.getMockAnalysis(query, campaignData);
    }

    try {
      const systemPrompt = this.buildMarketingAnalystPrompt();
      const userPrompt = this.buildUserPrompt(query, campaignData);

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const response = completion.choices[0]?.message?.content || 'No se pudo generar análisis.';

      return {
        success: true,
        analysis: response,
        query,
        dataPointsAnalyzed: campaignData.totalMetrics,
        model: this.model,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error en análisis con OpenAI:', error);
      throw error;
    }
  }

  /**
   * Procesa consulta en lenguaje natural sobre campañas
   */
  async processQuery(query: string, tenantId: string, maxResults = 100): Promise<any> {
    const campaignData = await this.getCampaignDataForAnalysis(tenantId, maxResults);

    if (!this.openai) {
      return this.getMockQueryResponse(query, campaignData);
    }

    try {
      const systemPrompt = `Eres un analista de marketing digital experto. 
Tu trabajo es responder preguntas sobre el rendimiento de campañas publicitarias en Google Ads, Meta Ads y TikTok Ads.
Responde de manera clara, concisa y con datos específicos cuando estén disponibles.
Si no hay suficientes datos para responder, indícalo claramente.
Usa formato markdown para mejor legibilidad.`;

      const userPrompt = `
Pregunta del usuario: "${query}"

Datos disponibles de campañas:
${JSON.stringify(campaignData, null, 2)}

Por favor responde la pregunta basándote en estos datos.`;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 1500,
      });

      return {
        success: true,
        response: completion.choices[0]?.message?.content,
        query,
        dataContext: {
          campaigns: campaignData.campaigns?.length || 0,
          metrics: campaignData.totalMetrics || 0,
        },
      };
    } catch (error) {
      this.logger.error('Error procesando query:', error);
      throw error;
    }
  }

  /**
   * Genera análisis para un reporte específico
   */
  async generateReportAnalysis(reportInstruction: string, tenantId: string): Promise<any> {
    const campaignData = await this.getCampaignDataForAnalysis(tenantId);

    if (!this.openai) {
      return this.getMockReportAnalysis(reportInstruction, campaignData);
    }

    try {
      const systemPrompt = `Eres un analista de marketing digital senior generando un reporte ejecutivo.
El reporte debe ser profesional, con insights accionables y recomendaciones claras.
Estructura tu respuesta con:
1. Resumen Ejecutivo
2. Métricas Clave
3. Análisis por Plataforma (Google Ads, Meta Ads, TikTok Ads)
4. Tendencias y Patrones
5. Recomendaciones
6. Próximos Pasos

Usa formato markdown y emojis para mejor legibilidad.`;

      const userPrompt = `
Instrucción del reporte: "${reportInstruction}"

Datos de campañas disponibles:
${JSON.stringify(campaignData, null, 2)}

Genera un análisis completo siguiendo la estructura indicada.`;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      });

      return {
        success: true,
        analysis: completion.choices[0]?.message?.content,
        instruction: reportInstruction,
        generatedAt: new Date().toISOString(),
        dataContext: campaignData.summary,
      };
    } catch (error) {
      this.logger.error('Error generando análisis de reporte:', error);
      throw error;
    }
  }

  /**
   * Obtiene datos de campañas para análisis
   */
  private async getCampaignDataForAnalysis(tenantId: string, limit = 1000): Promise<any> {
    // Obtener campañas con sus métricas
    const campaigns = await this.prisma.campaign.findMany({
      where: { tenantId },
      include: {
        metrics: {
          orderBy: { date: 'desc' },
          take: 30, // Últimos 30 días de métricas por campaña
        },
      },
    });

    // Calcular métricas agregadas
    const allMetrics = campaigns.flatMap(c => c.metrics);
    
    const totalSpend = allMetrics.reduce((sum, m) => sum + Number(m.spend || 0), 0);
    const totalImpressions = allMetrics.reduce((sum, m) => sum + (m.impressions || 0), 0);
    const totalClicks = allMetrics.reduce((sum, m) => sum + (m.clicks || 0), 0);
    const totalConversions = allMetrics.reduce((sum, m) => sum + (m.conversions || 0), 0);

    // Agrupar por plataforma
    const byPlatform = {
      GOOGLE_ADS: campaigns.filter(c => c.platform === 'GOOGLE_ADS'),
      META_ADS: campaigns.filter(c => c.platform === 'META_ADS'),
      TIKTOK_ADS: campaigns.filter(c => c.platform === 'TIKTOK_ADS'),
    };

    const platformStats = {};
    for (const [platform, platformCampaigns] of Object.entries(byPlatform)) {
      const platformMetrics = platformCampaigns.flatMap(c => c.metrics);
      platformStats[platform] = {
        campaigns: platformCampaigns.length,
        totalSpend: platformMetrics.reduce((sum, m) => sum + Number(m.spend || 0), 0),
        totalImpressions: platformMetrics.reduce((sum, m) => sum + (m.impressions || 0), 0),
        totalClicks: platformMetrics.reduce((sum, m) => sum + (m.clicks || 0), 0),
        totalConversions: platformMetrics.reduce((sum, m) => sum + (m.conversions || 0), 0),
        avgCPC: platformMetrics.length > 0 
          ? platformMetrics.reduce((sum, m) => sum + Number(m.cpc || 0), 0) / platformMetrics.length 
          : 0,
      };
    }

    // Top campañas por conversiones
    const topCampaigns = campaigns
      .map(c => ({
        name: c.name,
        platform: c.platform,
        totalConversions: c.metrics.reduce((sum, m) => sum + (m.conversions || 0), 0),
        totalSpend: c.metrics.reduce((sum, m) => sum + Number(m.spend || 0), 0),
      }))
      .sort((a, b) => b.totalConversions - a.totalConversions)
      .slice(0, 10);

    return {
      summary: {
        totalCampaigns: campaigns.length,
        totalSpend: totalSpend.toFixed(2),
        totalImpressions,
        totalClicks,
        totalConversions,
        avgCTR: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0,
        avgCPC: totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : 0,
        costPerConversion: totalConversions > 0 ? (totalSpend / totalConversions).toFixed(2) : 0,
      },
      byPlatform: platformStats,
      topCampaigns,
      campaigns: campaigns.map(c => ({
        id: c.id,
        name: c.name,
        platform: c.platform,
        status: c.status,
        metricsCount: c.metrics.length,
      })),
      totalMetrics: allMetrics.length,
    };
  }

  /**
   * Construye el prompt del sistema para análisis de marketing
   */
  private buildMarketingAnalystPrompt(): string {
    return `Eres un analista de marketing digital experto especializado en campañas publicitarias de Google Ads, Meta Ads (Facebook/Instagram) y TikTok Ads.

Tu experiencia incluye:
- Análisis de métricas de rendimiento (CTR, CPC, CPM, ROAS, conversiones)
- Identificación de tendencias y patrones en datos de campañas
- Optimización de presupuestos publicitarios
- Segmentación de audiencias
- A/B testing y experimentación

Cuando analices datos:
1. Sé específico con números y porcentajes
2. Identifica las campañas de mejor y peor rendimiento
3. Compara métricas entre plataformas
4. Sugiere optimizaciones concretas
5. Destaca anomalías o tendencias importantes

Responde siempre en español y usa formato markdown para mejor legibilidad.
Incluye emojis relevantes para hacer el análisis más visual (📊 📈 📉 💰 🎯 ⚠️ ✅).`;
  }

  /**
   * Construye el prompt del usuario con los datos
   */
  private buildUserPrompt(query: string, data: any): string {
    return `
## Solicitud de Análisis
${query}

## Datos Disponibles

### Resumen General
- Total de campañas: ${data.summary.totalCampaigns}
- Gasto total: $${data.summary.totalSpend}
- Impresiones totales: ${data.summary.totalImpressions.toLocaleString()}
- Clics totales: ${data.summary.totalClicks.toLocaleString()}
- Conversiones totales: ${data.summary.totalConversions.toLocaleString()}
- CTR promedio: ${data.summary.avgCTR}%
- CPC promedio: $${data.summary.avgCPC}
- Costo por conversión: $${data.summary.costPerConversion}

### Rendimiento por Plataforma
${JSON.stringify(data.byPlatform, null, 2)}

### Top 10 Campañas por Conversiones
${JSON.stringify(data.topCampaigns, null, 2)}

### Lista de Campañas
${JSON.stringify(data.campaigns, null, 2)}

Por favor, analiza estos datos y responde a la solicitud de manera detallada y profesional.`;
  }

  /**
   * Respuesta mock cuando no hay OpenAI configurado
   */
  private getMockAnalysis(query: string, data: any): any {
    return {
      success: true,
      analysis: `## 📊 Análisis de Campañas (Modo Demo)

### Resumen Ejecutivo
Se analizaron **${data.summary.totalCampaigns} campañas** con un gasto total de **$${data.summary.totalSpend}**.

### Métricas Generales
- 👁️ Impresiones: ${data.summary.totalImpressions.toLocaleString()}
- 🖱️ Clics: ${data.summary.totalClicks.toLocaleString()}
- 🎯 Conversiones: ${data.summary.totalConversions}
- 📈 CTR: ${data.summary.avgCTR}%
- 💰 CPC: $${data.summary.avgCPC}

### ⚠️ Nota
Este es un análisis de demostración. Para análisis con IA real, configura tu API key de OpenAI en el archivo .env.

---
*Consulta realizada: "${query}"*`,
      query,
      dataPointsAnalyzed: data.totalMetrics,
      model: 'mock',
      generatedAt: new Date().toISOString(),
      isDemo: true,
    };
  }

  private getMockQueryResponse(query: string, data: any): any {
    return {
      success: true,
      response: `Respuesta de demostración para: "${query}"\n\nDatos disponibles: ${data.summary.totalCampaigns} campañas, ${data.totalMetrics} métricas.\n\n*Configura OPENAI_API_KEY para respuestas reales con IA.*`,
      query,
      dataContext: {
        campaigns: data.campaigns?.length || 0,
        metrics: data.totalMetrics || 0,
      },
      isDemo: true,
    };
  }

  private getMockReportAnalysis(instruction: string, data: any): any {
    return {
      success: true,
      analysis: `## 📋 Reporte de Campañas (Modo Demo)

### Instrucción
${instruction}

### 📊 Resumen de Datos
- Campañas analizadas: ${data.summary.totalCampaigns}
- Gasto total: $${data.summary.totalSpend}
- Conversiones: ${data.summary.totalConversions}

### 🎯 Rendimiento por Plataforma
${Object.entries(data.byPlatform).map(([platform, stats]: [string, any]) => 
  `- **${platform}**: ${stats.campaigns} campañas, $${stats.totalSpend?.toFixed(2) || 0} gasto`
).join('\n')}

### ⚠️ Modo Demo
Este reporte fue generado en modo demostración. Configura OPENAI_API_KEY para análisis real con IA.

---
*Generado: ${new Date().toISOString()}*`,
      instruction,
      generatedAt: new Date().toISOString(),
      dataContext: data.summary,
      isDemo: true,
    };
  }
}

