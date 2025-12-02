import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../llm/llm.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { Frequency } from '@prisma/client';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private prisma: PrismaService,
    private llmService: LlmService,
  ) {}

  async findAllByTenant(tenantId: string, limit = 100, offset = 0) {
    return this.prisma.report.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, tenantId: string) {
    const report = await this.prisma.report.findFirst({
      where: { id, tenantId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        executions: {
          take: 10,
          orderBy: { executedAt: 'desc' },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Reporte no encontrado');
    }

    return report;
  }

  async create(dto: CreateReportDto, userId: string, tenantId: string) {
    return this.prisma.report.create({
      data: {
        name: dto.name,
        instruction: dto.instruction,
        frequency: dto.frequency as Frequency,
        frequencyDetails: dto.frequencyDetails,
        time: dto.time,
        isActive: dto.isActive ?? true,
        userId,
        tenantId,
      },
    });
  }

  async update(id: string, dto: UpdateReportDto, tenantId: string) {
    // Verificar que existe
    await this.findById(id, tenantId);

    return this.prisma.report.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.instruction && { instruction: dto.instruction }),
        ...(dto.frequency && { frequency: dto.frequency as Frequency }),
        ...(dto.frequencyDetails && { frequencyDetails: dto.frequencyDetails }),
        ...(dto.time && { time: dto.time }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(id: string, tenantId: string) {
    // Verificar que existe
    await this.findById(id, tenantId);

    return this.prisma.report.delete({
      where: { id },
    });
  }

  /**
   * Ejecuta un reporte usando el LLM para generar análisis
   */
  async executeReport(id: string, tenantId: string) {
    const report = await this.findById(id, tenantId);

    this.logger.log(`Ejecutando reporte: ${report.name} (ID: ${id})`);

    // Crear registro de ejecución
    const execution = await this.prisma.reportExecution.create({
      data: {
        reportId: id,
        status: 'RUNNING',
      },
    });

    try {
      // Usar el LlmService para generar análisis real
      const llmResult = await this.llmService.generateReportAnalysis(
        report.instruction,
        tenantId,
      );

      // Actualizar ejecución como completada
      await this.prisma.reportExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          result: llmResult,
        },
      });

      this.logger.log(`Reporte ejecutado exitosamente: ${report.name}`);

      return {
        executionId: execution.id,
        llmAnalysis: llmResult.analysis,
        message: llmResult.isDemo 
          ? 'Reporte ejecutado en modo demo (configura OPENAI_API_KEY para análisis real)'
          : 'Reporte ejecutado exitosamente con análisis de IA',
        dataContext: llmResult.dataContext,
        generatedAt: llmResult.generatedAt,
      };
    } catch (error) {
      this.logger.error(`Error ejecutando reporte ${id}:`, error);

      // Actualizar ejecución como fallida
      await this.prisma.reportExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          error: error.message,
        },
      });

      throw error;
    }
  }
}
