import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { Frequency } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

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

  async executeReport(id: string, tenantId: string) {
    const report = await this.findById(id, tenantId);

    // Crear registro de ejecución
    const execution = await this.prisma.reportExecution.create({
      data: {
        reportId: id,
        status: 'RUNNING',
      },
    });

    try {
      // TODO: Aquí irá la lógica real de ejecución con LLM
      // Por ahora, simulamos una ejecución exitosa
      
      const mockAnalysis = {
        summary: `Análisis del reporte "${report.name}"`,
        instruction: report.instruction,
        generatedAt: new Date().toISOString(),
        insights: [
          'Este es un análisis de demostración',
          'La integración con LLM se implementará próximamente',
          'Los datos de campañas se procesarán automáticamente',
        ],
      };

      // Actualizar ejecución como completada
      await this.prisma.reportExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          result: mockAnalysis,
        },
      });

      return {
        executionId: execution.id,
        llmAnalysis: mockAnalysis,
        message: 'Reporte ejecutado exitosamente (modo demo)',
      };
    } catch (error) {
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

