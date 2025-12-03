import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LlmService } from './llm.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyzeDto } from './dto/analyze.dto';
import { QueryDto } from './dto/query.dto';

@Controller('llm')
@UseGuards(JwtAuthGuard)
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  /**
   * GET /api/llm/status
   * Verifica el estado del servicio LLM
   */
  @Get('status')
  async getStatus() {
    const knowledgeStats = this.llmService.getKnowledgeStats();
    
    return {
      success: true,
      data: {
        configured: this.llmService.isConfigured(),
        provider: 'OpenAI',
        message: this.llmService.isConfigured()
          ? 'LLM configurado y listo con conocimiento especializado'
          : 'LLM en modo demo (configura OPENAI_API_KEY)',
        knowledge: knowledgeStats,
      },
    };
  }

  /**
   * GET /api/llm/knowledge
   * Obtiene estadísticas del conocimiento cargado
   */
  @Get('knowledge')
  async getKnowledge() {
    return {
      success: true,
      data: this.llmService.getKnowledgeStats(),
    };
  }

  /**
   * POST /api/llm/analyze
   * Analiza datos de campañas con IA (usa fórmulas y prompts especializados)
   */
  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  async analyze(@Body() analyzeDto: AnalyzeDto, @Request() req) {
    const result = await this.llmService.analyzeCampaigns(
      analyzeDto.query,
      req.user.tenantId,
    );

    return {
      success: true,
      message: 'Análisis completado',
      data: result,
    };
  }

  /**
   * POST /api/llm/query
   * Procesa consulta en lenguaje natural (detecta fórmulas relevantes)
   */
  @Post('query')
  @HttpCode(HttpStatus.OK)
  async query(@Body() queryDto: QueryDto, @Request() req) {
    const result = await this.llmService.processQuery(
      queryDto.query,
      req.user.tenantId,
      queryDto.maxResults,
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * POST /api/llm/generate-report
   * Genera análisis para un reporte (usa template de reporte ejecutivo)
   */
  @Post('generate-report')
  @HttpCode(HttpStatus.OK)
  async generateReport(
    @Body() body: { instruction: string },
    @Request() req,
  ) {
    const result = await this.llmService.generateReportAnalysis(
      body.instruction,
      req.user.tenantId,
    );

    return {
      success: true,
      message: 'Reporte generado exitosamente',
      data: result,
    };
  }
}
