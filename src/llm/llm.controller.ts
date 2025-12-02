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
    return {
      success: true,
      data: {
        configured: this.llmService.isConfigured(),
        provider: 'OpenAI',
        message: this.llmService.isConfigured()
          ? 'LLM configurado y listo'
          : 'LLM en modo demo (configura OPENAI_API_KEY)',
      },
    };
  }

  /**
   * POST /api/llm/analyze
   * Analiza datos de campañas con IA
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
   * Procesa consulta en lenguaje natural
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
   * Genera análisis para un reporte
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

