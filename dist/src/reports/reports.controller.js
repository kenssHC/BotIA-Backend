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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const reports_service_1 = require("./reports.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const create_report_dto_1 = require("./dto/create-report.dto");
const update_report_dto_1 = require("./dto/update-report.dto");
let ReportsController = class ReportsController {
    constructor(reportsService) {
        this.reportsService = reportsService;
    }
    async findAll(req, limit, offset) {
        const reports = await this.reportsService.findAllByTenant(req.user.tenantId, limit ? +limit : 100, offset ? +offset : 0);
        return {
            success: true,
            data: reports,
        };
    }
    async findOne(id, req) {
        const report = await this.reportsService.findById(id, req.user.tenantId);
        return {
            success: true,
            data: report,
        };
    }
    async create(createReportDto, req) {
        const report = await this.reportsService.create(createReportDto, req.user.id, req.user.tenantId);
        return {
            success: true,
            message: 'Reporte creado exitosamente',
            data: report,
        };
    }
    async update(id, updateReportDto, req) {
        const report = await this.reportsService.update(id, updateReportDto, req.user.tenantId);
        return {
            success: true,
            message: 'Reporte actualizado exitosamente',
            data: report,
        };
    }
    async remove(id, req) {
        await this.reportsService.remove(id, req.user.tenantId);
        return {
            success: true,
            message: 'Reporte eliminado exitosamente',
        };
    }
    async executeImmediate(id, req) {
        const result = await this.reportsService.executeReport(id, req.user.tenantId);
        return {
            success: true,
            message: 'Reporte ejecutado exitosamente',
            data: result,
        };
    }
    async executeWithCharts(id, req) {
        const result = await this.reportsService.executeReport(id, req.user.tenantId);
        return {
            success: true,
            message: 'Reporte ejecutado con análisis IA y gráficas enviado por correo',
            data: result,
        };
    }
    async execute(id, req) {
        const result = await this.reportsService.executeReport(id, req.user.tenantId);
        return {
            success: true,
            message: 'Reporte ejecutado exitosamente',
            data: result,
        };
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_report_dto_1.CreateReportDto, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_report_dto_1.UpdateReportDto, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/execute-immediate'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "executeImmediate", null);
__decorate([
    (0, common_1.Post)(':id/execute-with-charts'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "executeWithCharts", null);
__decorate([
    (0, common_1.Post)(':id/execute'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "execute", null);
exports.ReportsController = ReportsController = __decorate([
    (0, common_1.Controller)('reports'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map