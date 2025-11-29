import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Platform } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';
import * as iconv from 'iconv-lite';

// Tipos para el mapeo de columnas
interface ColumnMapping {
  campaignId: number | null;
  campaignName: number | null;
  date: number | null;
  dateStart: number | null;
  dateEnd: number | null;
  impressions: number | null;
  clicks: number | null;
  spend: number | null;
  conversions: number | null;
  cpc: number | null;
  cpm: number | null;
  ctr: number | null;
  results: number | null;
  costPerResult: number | null;
  reach: number | null;
  status: number | null;
  budget: number | null;
}

interface ParsedRow {
  externalId: string;
  name: string;
  date: Date;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  cpc: number | null;
  cpm: number | null;
  ctr: number | null;
}

interface IngestResult {
  platform: string;
  fileName: string;
  totalRows: number;
  campaignsCreated: number;
  campaignsUpdated: number;
  metricsCreated: number;
  metricsUpdated: number;
  errors: string[];
  duration: number;
}

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);
  
  // ============================================
  // MAPEOS ESPECÍFICOS POR PLATAFORMA
  // Normalizados (sin tildes, minúsculas, sin espacios)
  // ============================================
  
  private readonly tiktokColumns: Record<string, keyof ColumnMapping> = {
    'campaignname': 'campaignName',
    'primarystatus': 'status',
    'campaignbudget': 'budget',
    'cost': 'spend',
    'cpcdestination': 'cpc',
    'cpm': 'cpm',
    'impressions': 'impressions',
    'clicksdestination': 'clicks',
    'ctrdestination': 'ctr',
    'conversionsmmp': 'conversions',
    'costperconversionmmp': 'costPerResult',
    'results': 'results',
    'costperresult': 'costPerResult',
  };

  private readonly metaColumns: Record<string, keyof ColumnMapping> = {
    'iniciodelinforme': 'dateStart',
    'findelinforme': 'dateEnd',
    'nombredelacampana': 'campaignName',
    'entregadelacampana': 'status',
    'resultados': 'results',
    'costoporresultados': 'costPerResult',
    'presupuestodelconjuntodeanuncios': 'budget',
    'importegastadousd': 'spend',
    'impresiones': 'impressions',
    'alcance': 'reach',
    'cpmcostopormilimpresionesusd': 'cpm',
    'clicsenelenlace': 'clicks',
    'cpccostoporclicenelenlaceusd': 'cpc',
  };

  private readonly googleColumns: Record<string, keyof ColumnMapping> = {
    'campana': 'campaignName',
    'campania': 'campaignName',
    'campaign': 'campaignName',
    'estadodelacampana': 'status',
    'presupuesto': 'budget',
    'clics': 'clicks',
    'clicks': 'clicks',
    'impr': 'impressions',
    'impressions': 'impressions',
    'ctr': 'ctr',
    'promcpc': 'cpc',
    'cpcpromedio': 'cpc',
    'costo': 'spend',
    'cost': 'spend',
    'conversiones': 'conversions',
    'conversions': 'conversions',
    'costoconv': 'costPerResult',
    'costconv': 'costPerResult',
    'porcentajedeconv': 'ctr',
  };

  constructor(private prisma: PrismaService) {}

  /**
   * Normalizar texto: quitar tildes, minúsculas, sin espacios ni caracteres especiales
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
      .replace(/[^a-z0-9]/g, ''); // Solo letras y números
  }

  /**
   * Detectar si un archivo es UTF-16 LE (BOM: FF FE)
   */
  private isUTF16LE(filePath: string): boolean {
    const buffer = Buffer.alloc(2);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 2, 0);
    fs.closeSync(fd);
    return buffer[0] === 0xFF && buffer[1] === 0xFE;
  }

  /**
   * Leer archivo CSV manejando diferentes encodings
   */
  private readCSVContent(filePath: string): string {
    const rawBuffer = fs.readFileSync(filePath);
    
    // Detectar UTF-16 LE (común en exports de Google Ads)
    if (rawBuffer[0] === 0xFF && rawBuffer[1] === 0xFE) {
      this.logger.log('📝 Detectado encoding UTF-16 LE, convirtiendo...');
      return iconv.decode(rawBuffer, 'utf16le');
    }
    
    // Detectar UTF-16 BE
    if (rawBuffer[0] === 0xFE && rawBuffer[1] === 0xFF) {
      this.logger.log('📝 Detectado encoding UTF-16 BE, convirtiendo...');
      return iconv.decode(rawBuffer, 'utf16be');
    }
    
    // Por defecto UTF-8
    return rawBuffer.toString('utf8');
  }

  /**
   * Parsear CSV manualmente (para manejar encodings especiales)
   */
  private parseCSVManually(content: string, delimiter: string = '\t'): string[][] {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    return lines.map(line => {
      // Manejar campos con comillas
      const fields: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          fields.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      fields.push(current.trim().replace(/^"|"$/g, ''));
      
      return fields;
    });
  }

  /**
   * Ingestar todos los archivos de la carpeta data/raw
   */
  async ingestAll(tenantSlug: string = 'richarq'): Promise<IngestResult[]> {
    const results: IngestResult[] = [];
    const dataDir = path.join(process.cwd(), 'data', 'raw');

    if (!fs.existsSync(dataDir)) {
      throw new Error(`La carpeta ${dataDir} no existe. Créala y coloca los archivos.`);
    }

    const files = fs.readdirSync(dataDir).filter(f => 
      f.endsWith('.xlsx') || f.endsWith('.xls') || f.endsWith('.csv')
    );

    if (files.length === 0) {
      throw new Error(`No se encontraron archivos Excel/CSV en ${dataDir}`);
    }

    this.logger.log(`📂 Encontrados ${files.length} archivos`);

    for (const file of files) {
      const filePath = path.join(dataDir, file);
      const platform = this.detectPlatform(file);
      
      try {
        const result = await this.ingestFile(filePath, platform, tenantSlug);
        results.push(result);
      } catch (error) {
        this.logger.error(`❌ Error procesando ${file}: ${error.message}`);
        results.push({
          platform: platform,
          fileName: file,
          totalRows: 0,
          campaignsCreated: 0,
          campaignsUpdated: 0,
          metricsCreated: 0,
          metricsUpdated: 0,
          errors: [error.message],
          duration: 0,
        });
      }
    }

    return results;
  }

  /**
   * Ingestar un archivo específico
   */
  async ingestFile(
    filePath: string, 
    platform: Platform, 
    tenantSlug: string = 'richarq'
  ): Promise<IngestResult> {
    const startTime = Date.now();
    const fileName = path.basename(filePath);
    const isCSV = fileName.toLowerCase().endsWith('.csv');
    
    this.logger.log(`📊 Procesando: ${fileName} (${platform})`);

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant) {
      throw new Error(`Tenant '${tenantSlug}' no encontrado`);
    }

    let rows: ParsedRow[];

    if (isCSV && platform === Platform.GOOGLE_ADS) {
      // Procesamiento especial para CSV de Google Ads (UTF-16)
      rows = await this.parseGoogleAdsCSV(filePath);
    } else if (isCSV) {
      // CSV normal
      rows = await this.parseCSVFile(filePath, platform);
    } else {
      // Excel
      rows = await this.parseExcelFile(filePath, platform);
    }

    this.logger.log(`📝 Filas parseadas: ${rows.length}`);

    // Insertar en base de datos
    const result = await this.insertData(rows, platform, tenant.id);

    const duration = Date.now() - startTime;

    return {
      platform: platform,
      fileName,
      totalRows: rows.length,
      ...result,
      duration,
    };
  }

  /**
   * Parsear CSV de Google Ads (formato especial UTF-16 con headers en fila 3)
   */
  private async parseGoogleAdsCSV(filePath: string): Promise<ParsedRow[]> {
    const content = this.readCSVContent(filePath);
    const lines = this.parseCSVManually(content, '\t');
    
    this.logger.log(`📄 Total líneas en CSV: ${lines.length}`);

    if (lines.length < 4) {
      throw new Error('El archivo CSV de Google Ads tiene muy pocas filas');
    }

    // Fila 2 (índice 1) tiene el rango de fechas
    const dateRangeLine = lines[1]?.join(' ') || '';
    const defaultDate = this.extractDateFromRange(dateRangeLine);
    this.logger.log(`📅 Fecha extraída del rango: ${defaultDate?.toISOString().split('T')[0]}`);

    // Fila 3 (índice 2) tiene los headers
    const headerRow = lines[2] || [];
    const headers = new Map<number, string>();
    
    headerRow.forEach((header, index) => {
      const normalized = this.normalizeText(header);
      headers.set(index, normalized);
      if (normalized) {
        this.logger.debug(`   Col ${index}: "${header}" → "${normalized}"`);
      }
    });

    // Detectar mapeo de columnas
    const mapping = this.detectColumnMapping(headers, Platform.GOOGLE_ADS);
    this.logger.log(`📋 Columnas mapeadas: ${JSON.stringify(mapping)}`);

    // Parsear filas de datos (desde índice 3)
    const rows: ParsedRow[] = [];
    
    for (let i = 3; i < lines.length; i++) {
      const rowData = lines[i];
      
      try {
        const getCellValue = (colNum: number | null): string => {
          if (colNum === null || colNum >= rowData.length) return '';
          return rowData[colNum] || '';
        };

        const campaignName = getCellValue(mapping.campaignName)?.trim();
        
        // Saltar filas sin nombre, totales, o vacías
        if (!campaignName || 
            campaignName === '' || 
            campaignName === '--' ||
            campaignName.toLowerCase().includes('total')) {
          continue;
        }

        const externalId = campaignName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100);

        const parsedRow: ParsedRow = {
          externalId,
          name: campaignName,
          date: defaultDate || new Date(),
          impressions: this.parseNumber(getCellValue(mapping.impressions)),
          clicks: this.parseNumber(getCellValue(mapping.clicks)),
          spend: this.parseNumber(getCellValue(mapping.spend)),
          conversions: this.parseNumber(getCellValue(mapping.conversions)),
          cpc: this.parseNumberOrNull(getCellValue(mapping.cpc)),
          cpm: this.parseNumberOrNull(getCellValue(mapping.cpm)),
          ctr: this.parseCTR(getCellValue(mapping.ctr)),
        };

        // Solo agregar si tiene datos relevantes
        if (parsedRow.name) {
          rows.push(parsedRow);
          this.logger.debug(`   ✓ Campaña: ${parsedRow.name}, Impr: ${parsedRow.impressions}, Clics: ${parsedRow.clicks}`);
        }
      } catch (error) {
        this.logger.warn(`⚠️ Error en línea ${i + 1}: ${error.message}`);
      }
    }

    return rows;
  }

  /**
   * Parsear archivo CSV normal
   */
  private async parseCSVFile(filePath: string, platform: Platform): Promise<ParsedRow[]> {
    const content = this.readCSVContent(filePath);
    const lines = this.parseCSVManually(content, platform === Platform.GOOGLE_ADS ? '\t' : ',');
    
    if (lines.length < 2) {
      throw new Error('El archivo CSV tiene muy pocas filas');
    }

    // Headers en primera fila
    const headerRow = lines[0];
    const headers = new Map<number, string>();
    
    headerRow.forEach((header, index) => {
      headers.set(index, this.normalizeText(header));
    });

    const mapping = this.detectColumnMapping(headers, platform);
    
    const rows: ParsedRow[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const rowData = lines[i];
      
      try {
        const getCellValue = (colNum: number | null): string => {
          if (colNum === null || colNum >= rowData.length) return '';
          return rowData[colNum] || '';
        };

        const campaignName = getCellValue(mapping.campaignName)?.trim();
        if (!campaignName || campaignName === '' || campaignName.toLowerCase().includes('total')) {
          continue;
        }

        const externalId = campaignName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100);

        let date: Date;
        if (platform === Platform.META_ADS && mapping.dateStart !== null) {
          date = this.parseDate(getCellValue(mapping.dateStart)) || new Date();
        } else {
          date = new Date();
        }

        let conversions = this.parseNumber(getCellValue(mapping.conversions));
        if (conversions === 0 && mapping.results !== null) {
          conversions = this.parseNumber(getCellValue(mapping.results));
        }

        rows.push({
          externalId,
          name: campaignName,
          date,
          impressions: this.parseNumber(getCellValue(mapping.impressions)),
          clicks: this.parseNumber(getCellValue(mapping.clicks)),
          spend: this.parseNumber(getCellValue(mapping.spend)),
          conversions,
          cpc: this.parseNumberOrNull(getCellValue(mapping.cpc)),
          cpm: this.parseNumberOrNull(getCellValue(mapping.cpm)),
          ctr: this.parseCTR(getCellValue(mapping.ctr)),
        });
      } catch (error) {
        this.logger.warn(`⚠️ Error en línea ${i + 1}: ${error.message}`);
      }
    }

    return rows;
  }

  /**
   * Parsear archivo Excel
   */
  private async parseExcelFile(filePath: string, platform: Platform): Promise<ParsedRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('El archivo no tiene hojas de cálculo');
    }

    let headerRowNum = 1;
    let defaultDate: Date | null = null;

    if (platform === Platform.GOOGLE_ADS) {
      headerRowNum = 3;
      const dateRow = worksheet.getRow(2);
      const dateCell = dateRow.getCell(1).value?.toString();
      if (dateCell) {
        defaultDate = this.extractDateFromRange(dateCell);
      }
    }

    const headers = new Map<number, string>();
    const headerRow = worksheet.getRow(headerRowNum);
    headerRow.eachCell((cell, colNumber) => {
      const value = cell.value?.toString() || '';
      headers.set(colNumber, this.normalizeText(value));
    });

    const mapping = this.detectColumnMapping(headers, platform);
    
    const rows: ParsedRow[] = [];

    worksheet.eachRow((row, rowIndex) => {
      if (rowIndex <= headerRowNum) return;

      try {
        const getCellValue = (colNum: number | null): any => {
          if (!colNum) return null;
          return row.getCell(colNum).value;
        };

        const campaignName = getCellValue(mapping.campaignName)?.toString()?.trim();
        if (!campaignName || campaignName === '' || campaignName.toLowerCase().includes('total')) {
          return;
        }

        const externalId = campaignName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100);

        let date: Date;
        if (platform === Platform.META_ADS) {
          date = this.parseDate(getCellValue(mapping.dateStart)) || new Date();
        } else if (platform === Platform.GOOGLE_ADS) {
          date = defaultDate || new Date();
        } else {
          date = new Date();
        }

        let conversions = this.parseNumber(getCellValue(mapping.conversions));
        if (conversions === 0 && mapping.results) {
          conversions = this.parseNumber(getCellValue(mapping.results));
        }

        rows.push({
          externalId,
          name: campaignName,
          date,
          impressions: this.parseNumber(getCellValue(mapping.impressions)),
          clicks: this.parseNumber(getCellValue(mapping.clicks)),
          spend: this.parseNumber(getCellValue(mapping.spend)),
          conversions,
          cpc: this.parseNumberOrNull(getCellValue(mapping.cpc)),
          cpm: this.parseNumberOrNull(getCellValue(mapping.cpm)),
          ctr: this.parseCTR(getCellValue(mapping.ctr)),
        });
      } catch (error) {
        this.logger.warn(`⚠️ Error en fila ${rowIndex}: ${error.message}`);
      }
    });

    return rows;
  }

  /**
   * Ingestar por plataforma específica
   */
  async ingestByPlatform(
    platform: 'google' | 'meta' | 'tiktok', 
    tenantSlug: string = 'richarq'
  ): Promise<IngestResult> {
    const dataDir = path.join(process.cwd(), 'data', 'raw');
    const platformMap: Record<string, Platform> = {
      google: Platform.GOOGLE_ADS,
      meta: Platform.META_ADS,
      tiktok: Platform.TIKTOK_ADS,
    };

    const files = fs.readdirSync(dataDir).filter(f => {
      const lower = f.toLowerCase();
      const isValidFile = lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv');
      return isValidFile &&
             (lower.includes(platform) || 
              (platform === 'google' && lower.includes('google')) ||
              (platform === 'meta' && (lower.includes('meta') || lower.includes('facebook'))) ||
              (platform === 'tiktok' && lower.includes('tiktok')));
    });

    if (files.length === 0) {
      throw new Error(`No se encontró archivo para la plataforma ${platform}`);
    }

    const filePath = path.join(dataDir, files[0]);
    return this.ingestFile(filePath, platformMap[platform], tenantSlug);
  }

  /**
   * Detectar plataforma basándose en el nombre del archivo
   */
  private detectPlatform(fileName: string): Platform {
    const lower = fileName.toLowerCase();
    
    if (lower.includes('google')) return Platform.GOOGLE_ADS;
    if (lower.includes('meta') || lower.includes('facebook') || lower.includes('fb')) return Platform.META_ADS;
    if (lower.includes('tiktok') || lower.includes('tik')) return Platform.TIKTOK_ADS;
    
    this.logger.warn(`⚠️ No se pudo detectar plataforma para ${fileName}, usando GOOGLE_ADS por defecto`);
    return Platform.GOOGLE_ADS;
  }

  /**
   * Detectar mapeo de columnas según plataforma
   */
  private detectColumnMapping(headers: Map<number, string>, platform: Platform): ColumnMapping {
    const mapping: ColumnMapping = {
      campaignId: null,
      campaignName: null,
      date: null,
      dateStart: null,
      dateEnd: null,
      impressions: null,
      clicks: null,
      spend: null,
      conversions: null,
      cpc: null,
      cpm: null,
      ctr: null,
      results: null,
      costPerResult: null,
      reach: null,
      status: null,
      budget: null,
    };

    let platformColumns: Record<string, keyof ColumnMapping>;
    switch (platform) {
      case Platform.TIKTOK_ADS:
        platformColumns = this.tiktokColumns;
        break;
      case Platform.META_ADS:
        platformColumns = this.metaColumns;
        break;
      case Platform.GOOGLE_ADS:
        platformColumns = this.googleColumns;
        break;
      default:
        platformColumns = {};
    }

    headers.forEach((normalizedHeader, colNumber) => {
      if (platformColumns[normalizedHeader]) {
        const field = platformColumns[normalizedHeader];
        if (mapping[field] === null) {
          mapping[field] = colNumber;
        }
      }
    });

    return mapping;
  }

  /**
   * Extraer fecha de un rango de texto
   */
  private extractDateFromRange(rangeText: string): Date | null {
    const monthMap: Record<string, number> = {
      'ene': 0, 'enero': 0, 'jan': 0, 'january': 0,
      'feb': 1, 'febrero': 1, 'february': 1,
      'mar': 2, 'marzo': 2, 'march': 2,
      'abr': 3, 'abril': 3, 'apr': 3, 'april': 3,
      'may': 4, 'mayo': 4,
      'jun': 5, 'junio': 5, 'june': 5,
      'jul': 6, 'julio': 6, 'july': 6,
      'ago': 7, 'agosto': 7, 'aug': 7, 'august': 7,
      'sep': 8, 'sept': 8, 'septiembre': 8, 'september': 8,
      'oct': 9, 'octubre': 9, 'october': 9,
      'nov': 10, 'noviembre': 10, 'november': 10,
      'dic': 11, 'diciembre': 11, 'dec': 11, 'december': 11,
    };

    // Buscar patrón: "1 de octubre de 2025" o "1 oct 2025"
    const patterns = [
      /(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i,
      /(\d{1,2})\s+(\w+)\s+(\d{4})/i,
    ];

    for (const pattern of patterns) {
      const match = rangeText.match(pattern);
      if (match) {
        const day = parseInt(match[1]);
        const monthStr = match[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const year = parseInt(match[3]);
        
        const month = monthMap[monthStr];
        if (month !== undefined) {
          return new Date(year, month, day);
        }
      }
    }

    return new Date();
  }

  /**
   * Parsear fecha
   */
  private parseDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    
    if (typeof value === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      return new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    }

    const strValue = value.toString().trim();
    const parsed = new Date(strValue);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  /**
   * Parsear número
   */
  private parseNumber(value: any): number {
    if (value === null || value === undefined || value === '' || value === '--') return 0;
    
    let strValue = value.toString()
      .replace(/[,$\s"]/g, '')
      .replace(',', '.');
    
    if (strValue.endsWith('K') || strValue.endsWith('k')) {
      return parseFloat(strValue.slice(0, -1)) * 1000 || 0;
    }
    if (strValue.endsWith('M') || strValue.endsWith('m')) {
      return parseFloat(strValue.slice(0, -1)) * 1000000 || 0;
    }
    
    const num = parseFloat(strValue);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Parsear número o null
   */
  private parseNumberOrNull(value: any): number | null {
    if (value === null || value === undefined || value === '' || value === '--') return null;
    
    let strValue = value.toString()
      .replace(/[,$\s"]/g, '')
      .replace(',', '.');
    const num = parseFloat(strValue);
    return isNaN(num) ? null : num;
  }

  /**
   * Parsear CTR
   */
  private parseCTR(value: any): number | null {
    if (value === null || value === undefined || value === '' || value === '--') return null;
    
    let strValue = value.toString()
      .replace(/[%\s"]/g, '')
      .replace(',', '.');
    const num = parseFloat(strValue);
    
    if (isNaN(num)) return null;
    return num > 1 ? num / 100 : num;
  }

  /**
   * Insertar datos en la base de datos
   */
  private async insertData(
    rows: ParsedRow[], 
    platform: Platform, 
    tenantId: string
  ): Promise<{
    campaignsCreated: number;
    campaignsUpdated: number;
    metricsCreated: number;
    metricsUpdated: number;
    errors: string[];
  }> {
    let campaignsCreated = 0;
    let campaignsUpdated = 0;
    let metricsCreated = 0;
    let metricsUpdated = 0;
    const errors: string[] = [];

    const campaignMap = new Map<string, ParsedRow[]>();
    for (const row of rows) {
      const key = row.externalId;
      if (!campaignMap.has(key)) {
        campaignMap.set(key, []);
      }
      campaignMap.get(key)!.push(row);
    }

    this.logger.log(`📊 Procesando ${campaignMap.size} campañas únicas`);

    for (const [externalId, campaignRows] of campaignMap) {
      try {
        const firstRow = campaignRows[0];
        
        const existingCampaign = await this.prisma.campaign.findUnique({
          where: {
            externalId_platform: { externalId, platform },
          },
        });

        const campaign = await this.prisma.campaign.upsert({
          where: {
            externalId_platform: { externalId, platform },
          },
          create: {
            externalId,
            name: firstRow.name,
            platform,
            status: 'ACTIVE',
            tenantId,
          },
          update: {
            name: firstRow.name,
            updatedAt: new Date(),
          },
        });

        if (existingCampaign) {
          campaignsUpdated++;
        } else {
          campaignsCreated++;
        }

        for (const row of campaignRows) {
          try {
            const existingMetric = await this.prisma.campaignMetric.findUnique({
              where: {
                campaignId_date: {
                  campaignId: campaign.id,
                  date: row.date,
                },
              },
            });

            await this.prisma.campaignMetric.upsert({
              where: {
                campaignId_date: {
                  campaignId: campaign.id,
                  date: row.date,
                },
              },
              create: {
                campaignId: campaign.id,
                date: row.date,
                impressions: row.impressions,
                clicks: row.clicks,
                spend: row.spend,
                conversions: row.conversions,
                cpc: row.cpc,
                cpm: row.cpm,
                ctr: row.ctr,
              },
              update: {
                impressions: row.impressions,
                clicks: row.clicks,
                spend: row.spend,
                conversions: row.conversions,
                cpc: row.cpc,
                cpm: row.cpm,
                ctr: row.ctr,
              },
            });

            if (existingMetric) {
              metricsUpdated++;
            } else {
              metricsCreated++;
            }
          } catch (metricError) {
            errors.push(`Métrica ${externalId}/${row.date}: ${metricError.message}`);
          }
        }
      } catch (error) {
        errors.push(`Campaña ${externalId}: ${error.message}`);
      }
    }

    return {
      campaignsCreated,
      campaignsUpdated,
      metricsCreated,
      metricsUpdated,
      errors,
    };
  }

  /**
   * Obtener estadísticas
   */
  async getStats(tenantSlug: string = 'richarq') {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant) {
      throw new Error(`Tenant '${tenantSlug}' no encontrado`);
    }

    const [totalCampaigns, totalMetrics, byPlatform] = await Promise.all([
      this.prisma.campaign.count({ where: { tenantId: tenant.id } }),
      this.prisma.campaignMetric.count({
        where: { campaign: { tenantId: tenant.id } },
      }),
      this.prisma.campaign.groupBy({
        by: ['platform'],
        where: { tenantId: tenant.id },
        _count: { id: true },
      }),
    ]);

    return {
      totalCampaigns,
      totalMetrics,
      byPlatform: byPlatform.map(p => ({
        platform: p.platform,
        count: p._count.id,
      })),
    };
  }
}
