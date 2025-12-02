import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../llm/llm.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
export declare class ReportsService {
    private prisma;
    private llmService;
    private readonly logger;
    constructor(prisma: PrismaService, llmService: LlmService);
    findAllByTenant(tenantId: string, limit?: number, offset?: number): Promise<({
        user: {
            id: string;
            username: string;
            email: string;
        };
    } & {
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        instruction: string;
        frequency: import(".prisma/client").$Enums.Frequency;
        frequencyDetails: import("@prisma/client/runtime/library").JsonValue | null;
        time: string;
        recipients: string[];
        userId: string;
    })[]>;
    findById(id: string, tenantId: string): Promise<{
        user: {
            id: string;
            username: string;
            email: string;
        };
        executions: {
            error: string | null;
            id: string;
            result: import("@prisma/client/runtime/library").JsonValue | null;
            status: import(".prisma/client").$Enums.ExecutionStatus;
            executedAt: Date;
            reportId: string;
        }[];
    } & {
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        instruction: string;
        frequency: import(".prisma/client").$Enums.Frequency;
        frequencyDetails: import("@prisma/client/runtime/library").JsonValue | null;
        time: string;
        recipients: string[];
        userId: string;
    }>;
    create(dto: CreateReportDto, userId: string, tenantId: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        instruction: string;
        frequency: import(".prisma/client").$Enums.Frequency;
        frequencyDetails: import("@prisma/client/runtime/library").JsonValue | null;
        time: string;
        recipients: string[];
        userId: string;
    }>;
    update(id: string, dto: UpdateReportDto, tenantId: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        instruction: string;
        frequency: import(".prisma/client").$Enums.Frequency;
        frequencyDetails: import("@prisma/client/runtime/library").JsonValue | null;
        time: string;
        recipients: string[];
        userId: string;
    }>;
    remove(id: string, tenantId: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        instruction: string;
        frequency: import(".prisma/client").$Enums.Frequency;
        frequencyDetails: import("@prisma/client/runtime/library").JsonValue | null;
        time: string;
        recipients: string[];
        userId: string;
    }>;
    executeReport(id: string, tenantId: string): Promise<{
        executionId: string;
        llmAnalysis: any;
        message: string;
        dataContext: any;
        generatedAt: any;
    }>;
}
