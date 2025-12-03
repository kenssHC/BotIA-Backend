import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeService } from './knowledge.service';
import OpenAI from 'openai';

@Injectable()
export class LlmService implements OnModuleInit {
  private readonly logger = new Logger(LlmService.name);
  private openai: OpenAI;
  private model: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private knowledgeService: KnowledgeService,
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
   * Obtiene estadísticas del conocimiento cargado
   */
  getKnowledgeStats(): any {
    return this.knowledgeService.getKnowledgeStats();
  }

  /**
   * Analiza datos de campañas con IA (usando conocimiento especializado)
   */
  async analyzeCampaigns(query: string, tenantId: string): Promise<any> {
    const campaignData = await this.getCampaignDataForAnalysis(tenantId);

    if (!this.openai) {
      return this.getMockAnalysis(query, campaignData);
    }

    try {
      // Usar el KnowledgeService para construir prompts especializados
      const { systemPrompt, userPrompt: baseUserPrompt } = this.knowledgeService.buildFullQueryPrompt(query);
      const userPrompt = this.buildUserPromptWithData(baseUserPrompt, query, campaignData);

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2500,
      });

      const response = completion.choices[0]?.message?.content || 'No se pudo generar análisis.';

      return {
        success: true,
        analysis: response,
        query,
        dataPointsAnalyzed: campaignData.totalMetrics,
        model: this.model,
        generatedAt: new Date().toISOString(),
        knowledgeUsed: {
          formulasApplied: this.knowledgeService.getRelevantFormulas(query).length,
          analysisType: this.knowledgeService.detectAnalysisType(query),
        },
      };
    } catch (error) {
      this.logger.error('Error en análisis con OpenAI:', error);
      throw error;
    }
  }

  /**
   * Procesa consulta en lenguaje natural sobre campañas (usando conocimiento)
   */
  async processQuery(query: string, tenantId: string, maxResults = 100): Promise<any> {
    const campaignData = await this.getCampaignDataForAnalysis(tenantId, maxResults);

    if (!this.openai) {
      return this.getMockQueryResponse(query, campaignData);
    }

    try {
      // Obtener fórmulas relevantes para esta consulta
      const relevantFormulas = this.knowledgeService.getRelevantFormulas(query);
      const masterPrompt = this.knowledgeService.getMasterSystemPrompt();
      
      const systemPrompt = `${masterPrompt}

## 📐 FÓRMULAS RELEVANTES PARA ESTA CONSULTA
${relevantFormulas.map(f => `• ${f.question}\n  Fórmula: ${f.formula}`).join('\n\n')}`;

      const userPrompt = `
## Pregunta del Usuario
"${query}"

## Datos Disponibles de Campañas
${JSON.stringify(campaignData, null, 2)}

## Instrucciones
1. Analiza la pregunta e identifica qué métricas necesitas calcular.
2. Usa las fórmulas proporcionadas cuando aplique.
3. Muestra los cálculos paso a paso.
4. Responde de forma clara y estructurada.`;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 2000,
      });

      return {
        success: true,
        response: completion.choices[0]?.message?.content,
        query,
        dataContext: {
          campaigns: campaignData.campaigns?.length || 0,
          metrics: campaignData.totalMetrics || 0,
        },
        formulasUsed: relevantFormulas.map(f => f.id),
      };
    } catch (error) {
      this.logger.error('Error procesando query:', error);
      throw error;
    }
  }

  /**
   * Genera análisis para un reporte específico (usando templates)
   */
  async generateReportAnalysis(reportInstruction: string, tenantId: string): Promise<any> {
    const campaignData = await this.getCampaignDataForAnalysis(tenantId);

    if (!this.openai) {
      return this.getMockReportAnalysis(reportInstruction, campaignData);
    }

    try {
      // Usar el template de reporte ejecutivo
      const { systemPrompt, userPrompt: reportTemplate } = this.knowledgeService.buildReportPrompt(reportInstruction);
      
      const userPrompt = `${reportTemplate}

## 📊 DATOS DE CAMPAÑAS DISPONIBLES

### Resumen General
- Total de campañas: ${campaignData.summary.totalCampaigns}
- Gasto total: $${campaignData.summary.totalSpend}
- Impresiones totales: ${campaignData.summary.totalImpressions.toLocaleString()}
- Clics totales: ${campaignData.summary.totalClicks.toLocaleString()}
- Conversiones totales: ${campaignData.summary.totalConversions.toLocaleString()}
- CTR promedio: ${campaignData.summary.avgCTR}%
- CPC promedio: $${campaignData.summary.avgCPC}
- Costo por conversión (CPA): $${campaignData.summary.costPerConversion}

### Rendimiento por Plataforma
${JSON.stringify(campaignData.byPlatform, null, 2)}

### Top 10 Campañas por Conversiones
${JSON.stringify(campaignData.topCampaigns, null, 2)}

### Detalle de Campañas
${JSON.stringify(campaignData.campaigns, null, 2)}

---
Genera el reporte completo siguiendo la estructura indicada en el template.`;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      return {
        success: true,
        analysis: completion.choices[0]?.message?.content,
        instruction: reportInstruction,
        generatedAt: new Date().toISOString(),
        dataContext: campaignData.summary,
        templateUsed: 'reporte_ejecutivo',
      };
    } catch (error) {
      this.logger.error('Error generando análisis de reporte:', error);
      throw error;
    }
  }

  /**
   * Combina el prompt base con los datos de campaña
   */
  private buildUserPromptWithData(basePrompt: string, query: string, data: any): string {
    return `${basePrompt}

## 📊 DATOS DE CAMPAÑAS (Dataset Real)

### Resumen General
- Total de campañas: ${data.summary.totalCampaigns}
- Gasto total (inversión): $${data.summary.totalSpend}
- Impresiones totales: ${data.summary.totalImpressions.toLocaleString()}
- Clics totales: ${data.summary.totalClicks.toLocaleString()}
- Conversiones totales: ${data.summary.totalConversions.toLocaleString()}
- CTR promedio: ${data.summary.avgCTR}%
- CPC promedio: $${data.summary.avgCPC}
- Costo por conversión (CPA): $${data.summary.costPerConversion}

### Rendimiento por Plataforma
${JSON.stringify(data.byPlatform, null, 2)}

### Top 10 Campañas por Conversiones
${JSON.stringify(data.topCampaigns, null, 2)}

### Lista de Todas las Campañas
${JSON.stringify(data.campaigns, null, 2)}

---
Pregunta original: "${query}"

Analiza estos datos y responde siguiendo las reglas y estructura indicadas.`;
  }

  /**
   * Obtiene datos de campañas para análisis
   */
  private async getCampaignDataForAnalysis(tenantId: string, limit = 1000): Promise<any> {
    const campaigns = await this.prisma.campaign.findMany({
      where: { tenantId },
      include: {
        metrics: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    });

    const allMetrics = campaigns.flatMap(c => c.metrics);
    
    const totalSpend = allMetrics.reduce((sum, m) => sum + Number(m.spend || 0), 0);
    const totalImpressions = allMetrics.reduce((sum, m) => sum + (m.impressions || 0), 0);
    const totalClicks = allMetrics.reduce((sum, m) => sum + (m.clicks || 0), 0);
    const totalConversions = allMetrics.reduce((sum, m) => sum + (m.conversions || 0), 0);

    const byPlatform = {
      GOOGLE_ADS: campaigns.filter(c => c.platform === 'GOOGLE_ADS'),
      META_ADS: campaigns.filter(c => c.platform === 'META_ADS'),
      TIKTOK_ADS: campaigns.filter(c => c.platform === 'TIKTOK_ADS'),
    };

    const platformStats = {};
    for (const [platform, platformCampaigns] of Object.entries(byPlatform)) {
      const platformMetrics = platformCampaigns.flatMap(c => c.metrics);
      const pSpend = platformMetrics.reduce((sum, m) => sum + Number(m.spend || 0), 0);
      const pClicks = platformMetrics.reduce((sum, m) => sum + (m.clicks || 0), 0);
      const pConversions = platformMetrics.reduce((sum, m) => sum + (m.conversions || 0), 0);
      
      platformStats[platform] = {
        campaigns: platformCampaigns.length,
        totalSpend: pSpend,
        totalImpressions: platformMetrics.reduce((sum, m) => sum + (m.impressions || 0), 0),
        totalClicks: pClicks,
        totalConversions: pConversions,
        avgCPC: pClicks > 0 ? (pSpend / pClicks).toFixed(2) : 0,
        avgCPA: pConversions > 0 ? (pSpend / pConversions).toFixed(2) : 0,
      };
    }

    const topCampaigns = campaigns
      .map(c => ({
        name: c.name,
        platform: c.platform,
        totalConversions: c.metrics.reduce((sum, m) => sum + (m.conversions || 0), 0),
        totalSpend: c.metrics.reduce((sum, m) => sum + Number(m.spend || 0), 0),
        totalClicks: c.metrics.reduce((sum, m) => sum + (m.clicks || 0), 0),
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
   * Respuesta mock cuando no hay OpenAI configurado
   */
  private getMockAnalysis(query: string, data: any): any {
    const analysisType = this.knowledgeService.detectAnalysisType(query);
    const relevantFormulas = this.knowledgeService.getRelevantFormulas(query);

    return {
      success: true,
      analysis: `## 📊 Análisis de Campañas (Modo Demo)

### 🎯 Tipo de Análisis Detectado
**${analysisType.replace(/_/g, ' ').toUpperCase()}**

### 📐 Fórmulas que se aplicarían
${relevantFormulas.slice(0, 3).map(f => `- ${f.formula}`).join('\n')}

### Resumen Ejecutivo
Se analizaron **${data.summary.totalCampaigns} campañas** con un gasto total de **$${data.summary.totalSpend}**.

### Métricas Generales
- 👁️ Impresiones: ${data.summary.totalImpressions.toLocaleString()}
- 🖱️ Clics: ${data.summary.totalClicks.toLocaleString()}
- 🎯 Conversiones: ${data.summary.totalConversions}
- 📈 CTR: ${data.summary.avgCTR}%
- 💰 CPC: $${data.summary.avgCPC}
- 🎯 CPA: $${data.summary.costPerConversion}

### ⚠️ Nota
Este es un análisis de demostración. Para análisis con IA real, configura tu API key de OpenAI en el archivo .env.

---
*Consulta: "${query}"*`,
      query,
      dataPointsAnalyzed: data.totalMetrics,
      model: 'mock',
      generatedAt: new Date().toISOString(),
      isDemo: true,
      knowledgeUsed: {
        formulasApplied: relevantFormulas.length,
        analysisType,
      },
    };
  }

  private getMockQueryResponse(query: string, data: any): any {
    const relevantFormulas = this.knowledgeService.getRelevantFormulas(query);
    
    return {
      success: true,
      response: `## 📋 Respuesta (Modo Demo)

**Consulta:** "${query}"

### 📊 Datos disponibles:
- ${data.summary.totalCampaigns} campañas
- ${data.totalMetrics} puntos de datos

### 📐 Fórmulas que se usarían:
${relevantFormulas.slice(0, 3).map(f => `- ${f.id}: ${f.formula}`).join('\n')}

---
*Configura OPENAI_API_KEY para respuestas reales con IA.*`,
      query,
      dataContext: {
        campaigns: data.campaigns?.length || 0,
        metrics: data.totalMetrics || 0,
      },
      isDemo: true,
      formulasUsed: relevantFormulas.map(f => f.id),
    };
  }

  private getMockReportAnalysis(instruction: string, data: any): any {
    return {
      success: true,
      analysis: `## 📋 Reporte de Campañas (Modo Demo)

### 📝 Instrucción del Reporte
${instruction}

### 📊 Resumen Ejecutivo
- **Campañas analizadas:** ${data.summary.totalCampaigns}
- **Gasto total:** $${data.summary.totalSpend}
- **Conversiones:** ${data.summary.totalConversions}
- **CPA promedio:** $${data.summary.costPerConversion}

### 🎯 Rendimiento por Plataforma
${Object.entries(data.byPlatform).map(([platform, stats]: [string, any]) => 
  `- **${platform}**: ${stats.campaigns} campañas, $${stats.totalSpend?.toFixed(2) || 0} gasto, ${stats.totalConversions || 0} conversiones`
).join('\n')}

### 🏆 Top Campañas
${data.topCampaigns.slice(0, 5).map((c, i) => 
  `${i + 1}. **${c.name}** (${c.platform}): ${c.totalConversions} conv, $${c.totalSpend.toFixed(2)}`
).join('\n')}

### ⚠️ Modo Demo
Este reporte fue generado en modo demostración. Configura OPENAI_API_KEY para análisis real con IA.

---
*Generado: ${new Date().toISOString()}*`,
      instruction,
      generatedAt: new Date().toISOString(),
      dataContext: data.summary,
      isDemo: true,
      templateUsed: 'reporte_ejecutivo',
    };
  }
}
