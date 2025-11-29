"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ReportsService = class ReportsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAllByTenant(tenantId, limit = 100, offset = 0) {
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
    async findById(id, tenantId) {
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
            throw new common_1.NotFoundException('Reporte no encontrado');
        }
        return report;
    }
    async create(dto, userId, tenantId) {
        return this.prisma.report.create({
            data: {
                name: dto.name,
                instruction: dto.instruction,
                frequency: dto.frequency,
                frequencyDetails: dto.frequencyDetails,
                time: dto.time,
                isActive: dto.isActive ?? true,
                userId,
                tenantId,
            },
        });
    }
    async update(id, dto, tenantId) {
        await this.findById(id, tenantId);
        return this.prisma.report.update({
            where: { id },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.instruction && { instruction: dto.instruction }),
                ...(dto.frequency && { frequency: dto.frequency }),
                ...(dto.frequencyDetails && { frequencyDetails: dto.frequencyDetails }),
                ...(dto.time && { time: dto.time }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
            },
        });
    }
    async remove(id, tenantId) {
        await this.findById(id, tenantId);
        return this.prisma.report.delete({
            where: { id },
        });
    }
    async executeReport(id, tenantId) {
        const report = await this.findById(id, tenantId);
        const execution = await this.prisma.reportExecution.create({
            data: {
                reportId: id,
                status: 'RUNNING',
            },
        });
        try {
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
        }
        catch (error) {
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
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map