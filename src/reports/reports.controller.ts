import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Patch,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  async findAll(
    @Request() req,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const reports = await this.reportsService.findAllByTenant(
      req.user.tenantId,
      limit ? +limit : 100,
      offset ? +offset : 0,
    );
    
    return {
      success: true,
      data: reports,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const report = await this.reportsService.findById(id, req.user.tenantId);
    return {
      success: true,
      data: report,
    };
  }

  @Post()
  async create(@Body() createReportDto: CreateReportDto, @Request() req) {
    const report = await this.reportsService.create(
      createReportDto,
      req.user.id,
      req.user.tenantId,
    );
    
    return {
      success: true,
      message: 'Reporte creado exitosamente',
      data: report,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateReportDto: UpdateReportDto,
    @Request() req,
  ) {
    const report = await this.reportsService.update(
      id,
      updateReportDto,
      req.user.tenantId,
    );
    
    return {
      success: true,
      message: 'Reporte actualizado exitosamente',
      data: report,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    await this.reportsService.remove(id, req.user.tenantId);
    
    return {
      success: true,
      message: 'Reporte eliminado exitosamente',
    };
  }

  @Post(':id/execute-immediate')
  async executeImmediate(@Param('id') id: string, @Request() req) {
    const result = await this.reportsService.executeReport(id, req.user.tenantId);
    
    return {
      success: true,
      message: 'Reporte ejecutado exitosamente',
      data: result,
    };
  }

  @Post(':id/execute-with-charts')
  async executeWithCharts(@Param('id') id: string, @Request() req) {
    const result = await this.reportsService.executeReport(id, req.user.tenantId);
    
    return {
      success: true,
      message: 'Reporte ejecutado con análisis IA y gráficas enviado por correo',
      data: result,
    };
  }

  @Post(':id/execute')
  async execute(@Param('id') id: string, @Request() req) {
    const result = await this.reportsService.executeReport(id, req.user.tenantId);
    
    return {
      success: true,
      message: 'Reporte ejecutado exitosamente',
      data: result,
    };
  }
}

