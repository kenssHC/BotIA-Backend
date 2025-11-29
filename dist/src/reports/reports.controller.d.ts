import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    findAll(req: any, limit?: number, offset?: number): Promise<{
        success: boolean;
        data: ({
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
        })[];
    }>;
    findOne(id: string, req: any): Promise<{
        success: boolean;
        data: {
            user: {
                id: string;
                username: string;
                email: string;
            };
            executions: {
                error: string | null;
                id: string;
                result: import("@prisma/client/runtime/library").JsonValue | null;
                executedAt: Date;
                status: import(".prisma/client").$Enums.ExecutionStatus;
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
        };
    }>;
    create(createReportDto: CreateReportDto, req: any): Promise<{
        success: boolean;
        message: string;
        data: {
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
        };
    }>;
    update(id: string, updateReportDto: UpdateReportDto, req: any): Promise<{
        success: boolean;
        message: string;
        data: {
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
        };
    }>;
    remove(id: string, req: any): Promise<{
        success: boolean;
        message: string;
    }>;
    executeImmediate(id: string, req: any): Promise<{
        success: boolean;
        message: string;
        data: {
            executionId: string;
            llmAnalysis: {
                summary: string;
                instruction: string;
                generatedAt: string;
                insights: string[];
            };
            message: string;
        };
    }>;
    executeWithCharts(id: string, req: any): Promise<{
        success: boolean;
        message: string;
        data: {
            executionId: string;
            llmAnalysis: {
                summary: string;
                instruction: string;
                generatedAt: string;
                insights: string[];
            };
            message: string;
        };
    }>;
    execute(id: string, req: any): Promise<{
        success: boolean;
        message: string;
        data: {
            executionId: string;
            llmAnalysis: {
                summary: string;
                instruction: string;
                generatedAt: string;
                insights: string[];
            };
            message: string;
        };
    }>;
}
