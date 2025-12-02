import { 
  Controller, 
  Post, 
  Get,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IngestService, IngestResult } from './ingest.service';

@Controller('ingest')
export class IngestController {
  constructor(private readonly ingestService: IngestService) {}

  /**
   * POST /api/ingest/all
   * Ingestar todos los archivos Excel de data/raw
   */
  @Post('all')
  @HttpCode(HttpStatus.OK)
  async ingestAll(@Headers('x-tenant-id') tenantId?: string) {
    const tenant = tenantId || 'richarq';
    const results = await this.ingestService.ingestAll(tenant);
    
    return {
      success: true,
      message: 'Ingesta completada',
      data: results,
    };
  }

  /**
   * POST /api/ingest/:platform
   * Ingestar archivo de una plataforma específica
   */
  @Post(':platform')
  @HttpCode(HttpStatus.OK)
  async ingestByPlatform(
    @Param('platform') platform: 'google' | 'meta' | 'tiktok',
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    const tenant = tenantId || 'richarq';
    const result = await this.ingestService.ingestByPlatform(platform, tenant);
    
    return {
      success: true,
      message: `Ingesta de ${platform} completada`,
      data: result,
    };
  }

  /**
   * GET /api/ingest/stats
   * Obtener estadísticas de datos cargados
   */
  @Get('stats')
  async getStats(@Headers('x-tenant-id') tenantId?: string) {
    const tenant = tenantId || 'richarq';
    const stats = await this.ingestService.getStats(tenant);
    
    return {
      success: true,
      data: stats,
    };
  }
}

