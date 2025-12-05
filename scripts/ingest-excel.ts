/**
 * Script para ingestar archivos Excel/CSV de campañas
 * Soporta UTF-16 LE (Google Ads) y UTF-8
 */

import { PrismaClient, Platform } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';
import * as iconv from 'iconv-lite';

const prisma = new PrismaClient();

// ============================================
// MAPEOS ESPECÍFICOS POR PLATAFORMA (normalizados)
// ============================================

interface ColumnMapping {
  campaignName: number | null;
  dateStart: number | null;
  impressions: number | null;
  clicks: number | null;
  spend: number | null;
  conversions: number | null;
  cpc: number | null;
  cpm: number | null;
  ctr: number | null;
  results: number | null;
}

const tiktokColumns: Record<string, keyof ColumnMapping> = {
  'campaignname': 'campaignName',
  'cost': 'spend',
  'cpcdestination': 'cpc',
  'cpm': 'cpm',
  'impressions': 'impressions',
  'clicksdestination': 'clicks',
  'ctrdestination': 'ctr',
  'conversionsmmp': 'conversions',
  'results': 'results',
};

const metaColumns: Record<string, keyof ColumnMapping> = {
  'iniciodelinforme': 'dateStart',
  'nombredelacampana': 'campaignName',
  'resultados': 'results',
  'importegastadousd': 'spend',
  'impresiones': 'impressions',
  'cpmcostopormilimpresionesusd': 'cpm',
  'clicsenelenlace': 'clicks',
  'cpccostoporclicenelenlaceusd': 'cpc',
};

const googleColumns: Record<string, keyof ColumnMapping> = {
  'campana': 'campaignName',
  'campania': 'campaignName',
  'clics': 'clicks',
  'clicks': 'clicks',
  'impr': 'impressions',
  'ctr': 'ctr',
  'promcpc': 'cpc',
  'costo': 'spend',
  'cost': 'spend',
  'conversiones': 'conversions',
};

// ============================================
// UTILIDADES
// ============================================

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function readCSVContent(filePath: string): string {
  const rawBuffer = fs.readFileSync(filePath);
  
  if (rawBuffer[0] === 0xFF && rawBuffer[1] === 0xFE) {
    console.log('📝 Detectado encoding UTF-16 LE, convirtiendo...');
    return iconv.decode(rawBuffer, 'utf16le');
  }
  
  if (rawBuffer[0] === 0xFE && rawBuffer[1] === 0xFF) {
    console.log('📝 Detectado encoding UTF-16 BE, convirtiendo...');
    return iconv.decode(rawBuffer, 'utf16be');
  }
  
  return rawBuffer.toString('utf8');
}

function parseCSVManually(content: string, delimiter: string = '\t'): string[][] {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  return lines.map(line => {
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

function detectPlatform(fileName: string): Platform {
  const lower = fileName.toLowerCase();
  if (lower.includes('google')) return Platform.GOOGLE_ADS;
  if (lower.includes('meta') || lower.includes('facebook') || lower.includes('fb')) return Platform.META_ADS;
  if (lower.includes('tiktok') || lower.includes('tik')) return Platform.TIKTOK_ADS;
  console.log(`⚠️ No se detectó plataforma para ${fileName}, usando GOOGLE_ADS`);
  return Platform.GOOGLE_ADS;
}

function detectColumnMapping(headers: Map<number, string>, platform: Platform): ColumnMapping {
  const mapping: ColumnMapping = {
    campaignName: null,
    dateStart: null,
    impressions: null,
    clicks: null,
    spend: null,
    conversions: null,
    cpc: null,
    cpm: null,
    ctr: null,
    results: null,
  };

  let platformColumns: Record<string, keyof ColumnMapping>;
  switch (platform) {
    case Platform.TIKTOK_ADS: platformColumns = tiktokColumns; break;
    case Platform.META_ADS: platformColumns = metaColumns; break;
    case Platform.GOOGLE_ADS: platformColumns = googleColumns; break;
    default: platformColumns = {};
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

function extractDateFromRange(rangeText: string): Date {
  const monthMap: Record<string, number> = {
    'ene': 0, 'enero': 0, 'jan': 0,
    'feb': 1, 'febrero': 1,
    'mar': 2, 'marzo': 2,
    'abr': 3, 'abril': 3, 'apr': 3,
    'may': 4, 'mayo': 4,
    'jun': 5, 'junio': 5,
    'jul': 6, 'julio': 6,
    'ago': 7, 'agosto': 7, 'aug': 7,
    'sep': 8, 'sept': 8, 'septiembre': 8,
    'oct': 9, 'octubre': 9,
    'nov': 10, 'noviembre': 10,
    'dic': 11, 'diciembre': 11, 'dec': 11,
  };

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

function parseNumber(value: any): number {
  if (value === null || value === undefined || value === '' || value === '--') return 0;
  let strValue = value.toString().replace(/[,$\s"]/g, '').replace(',', '.');
  if (strValue.endsWith('K') || strValue.endsWith('k')) {
    return parseFloat(strValue.slice(0, -1)) * 1000 || 0;
  }
  if (strValue.endsWith('M') || strValue.endsWith('m')) {
    return parseFloat(strValue.slice(0, -1)) * 1000000 || 0;
  }
  const num = parseFloat(strValue);
  return isNaN(num) ? 0 : num;
}

function parseNumberOrNull(value: any): number | null {
  if (value === null || value === undefined || value === '' || value === '--') return null;
  let strValue = value.toString().replace(/[,$\s"]/g, '').replace(',', '.');
  const num = parseFloat(strValue);
  return isNaN(num) ? null : num;
}

function parseCTR(value: any): number | null {
  if (value === null || value === undefined || value === '' || value === '--') return null;
  let strValue = value.toString().replace(/[%\s"]/g, '').replace(',', '.');
  const num = parseFloat(strValue);
  if (isNaN(num)) return null;
  return num > 1 ? num / 100 : num;
}

function parseDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
  }
  const parsed = new Date(value.toString().trim());
  return isNaN(parsed.getTime()) ? null : parsed;
}

// ============================================
// INGESTIÓN
// ============================================

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

async function parseGoogleAdsCSV(filePath: string): Promise<ParsedRow[]> {
  const content = readCSVContent(filePath);
  const lines = parseCSVManually(content, '\t');
  
  console.log(`📄 Total líneas en CSV: ${lines.length}`);

  if (lines.length < 4) {
    throw new Error('El archivo CSV de Google Ads tiene muy pocas filas');
  }

  const dateRangeLine = lines[1]?.join(' ') || '';
  const defaultDate = extractDateFromRange(dateRangeLine);
  console.log(`📅 Fecha extraída: ${defaultDate.toISOString().split('T')[0]}`);

  const headerRow = lines[2] || [];
  const headers = new Map<number, string>();
  
  headerRow.forEach((header, index) => {
    const normalized = normalizeText(header);
    headers.set(index, normalized);
  });

  const mapping = detectColumnMapping(headers, Platform.GOOGLE_ADS);
  console.log(`📋 Columnas mapeadas:`, mapping);

  const rows: ParsedRow[] = [];
  
  for (let i = 3; i < lines.length; i++) {
    const rowData = lines[i];
    
    try {
      const getCellValue = (colNum: number | null): string => {
        if (colNum === null || colNum >= rowData.length) return '';
        return rowData[colNum] || '';
      };

      const campaignName = getCellValue(mapping.campaignName)?.trim();

      if (!campaignName || campaignName === '' || campaignName === '--' ||
          campaignName.toLowerCase().includes('total')) {
        continue;
      }

      // Usar nombre + índice de fila para garantizar unicidad
      const externalId = `${campaignName}_row${i}`.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 200);

      rows.push({
        externalId,
        name: campaignName,
        date: defaultDate,
        impressions: parseNumber(getCellValue(mapping.impressions)),
        clicks: parseNumber(getCellValue(mapping.clicks)),
        spend: parseNumber(getCellValue(mapping.spend)),
        conversions: parseNumber(getCellValue(mapping.conversions)),
        cpc: parseNumberOrNull(getCellValue(mapping.cpc)),
        cpm: parseNumberOrNull(getCellValue(mapping.cpm)),
        ctr: parseCTR(getCellValue(mapping.ctr)),
      });
    } catch (error) {
      console.log(`⚠️ Error en línea ${i + 1}: ${(error as Error).message}`);
    }
  }

  return rows;
}

async function parseCSVFile(filePath: string, platform: Platform): Promise<ParsedRow[]> {
  const content = readCSVContent(filePath);
  const delimiter = platform === Platform.GOOGLE_ADS ? '\t' : ',';
  const lines = parseCSVManually(content, delimiter);
  
  if (lines.length < 2) {
    throw new Error('El archivo CSV tiene muy pocas filas');
  }

  const headerRow = lines[0];
  const headers = new Map<number, string>();
  headerRow.forEach((header, index) => {
    headers.set(index, normalizeText(header));
  });

  const mapping = detectColumnMapping(headers, platform);
  console.log(`📋 Columnas mapeadas:`, mapping);
  
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

      // Usar nombre + índice de fila para garantizar unicidad
      const externalId = `${campaignName}_row${i}`.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 200);

      let date: Date;
      if (platform === Platform.META_ADS && mapping.dateStart !== null) {
        date = parseDate(getCellValue(mapping.dateStart)) || new Date();
      } else {
        date = new Date();
      }

      let conversions = parseNumber(getCellValue(mapping.conversions));
      if (conversions === 0 && mapping.results !== null) {
        conversions = parseNumber(getCellValue(mapping.results));
      }

      rows.push({
        externalId,
        name: campaignName,
        date,
        impressions: parseNumber(getCellValue(mapping.impressions)),
        clicks: parseNumber(getCellValue(mapping.clicks)),
        spend: parseNumber(getCellValue(mapping.spend)),
        conversions,
        cpc: parseNumberOrNull(getCellValue(mapping.cpc)),
        cpm: parseNumberOrNull(getCellValue(mapping.cpm)),
        ctr: parseCTR(getCellValue(mapping.ctr)),
      });
    } catch (error) {
      console.log(`⚠️ Error en línea ${i + 1}: ${(error as Error).message}`);
    }
  }

  return rows;
}

async function ingestFile(filePath: string, platform: Platform, tenantId: string) {
  const fileName = path.basename(filePath);
  const isCSV = fileName.toLowerCase().endsWith('.csv');
  
  console.log(`\n📊 Procesando: ${fileName} (${platform})`);

  let rows: ParsedRow[];

  if (isCSV && platform === Platform.GOOGLE_ADS) {
    rows = await parseGoogleAdsCSV(filePath);
  } else if (isCSV) {
    rows = await parseCSVFile(filePath, platform);
  } else {
    // Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    
    if (!worksheet) throw new Error('El archivo no tiene hojas');

    let headerRowNum = platform === Platform.GOOGLE_ADS ? 3 : 1;
    let defaultDate = new Date();

    if (platform === Platform.GOOGLE_ADS) {
      const dateRow = worksheet.getRow(2);
      const dateCell = dateRow.getCell(1).value?.toString();
      if (dateCell) defaultDate = extractDateFromRange(dateCell);
    }

    const headers = new Map<number, string>();
    worksheet.getRow(headerRowNum).eachCell((cell, colNumber) => {
      headers.set(colNumber, normalizeText(cell.value?.toString() || ''));
    });

    const mapping = detectColumnMapping(headers, platform);
    rows = [];

    worksheet.eachRow((row, rowIndex) => {
      if (rowIndex <= headerRowNum) return;

      try {
        const getCellValue = (colNum: number | null): any => {
          if (!colNum) return null;
          return row.getCell(colNum).value;
        };

        const campaignName = getCellValue(mapping.campaignName)?.toString()?.trim();
        if (!campaignName || campaignName.toLowerCase().includes('total')) return;

        // Usar nombre + índice de fila para garantizar unicidad
        const externalId = `${campaignName}_row${rowIndex}`.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 200);

        let date = defaultDate;
        if (platform === Platform.META_ADS && mapping.dateStart) {
          date = parseDate(getCellValue(mapping.dateStart)) || new Date();
        }

        let conversions = parseNumber(getCellValue(mapping.conversions));
        if (conversions === 0 && mapping.results) {
          conversions = parseNumber(getCellValue(mapping.results));
        }

        rows.push({
          externalId,
          name: campaignName,
          date,
          impressions: parseNumber(getCellValue(mapping.impressions)),
          clicks: parseNumber(getCellValue(mapping.clicks)),
          spend: parseNumber(getCellValue(mapping.spend)),
          conversions,
          cpc: parseNumberOrNull(getCellValue(mapping.cpc)),
          cpm: parseNumberOrNull(getCellValue(mapping.cpm)),
          ctr: parseCTR(getCellValue(mapping.ctr)),
        });
      } catch (error) {
        console.log(`⚠️ Error en fila ${rowIndex}`);
      }
    });
  }

  console.log(`📝 Filas parseadas: ${rows.length}`);

  // Agrupar e insertar
  const campaignMap = new Map<string, ParsedRow[]>();
  for (const row of rows) {
    if (!campaignMap.has(row.externalId)) campaignMap.set(row.externalId, []);
    campaignMap.get(row.externalId)!.push(row);
  }

  console.log(`📊 Campañas únicas: ${campaignMap.size}`);

  let campaignsCreated = 0, campaignsUpdated = 0, metricsCreated = 0;

  for (const [externalId, campaignRows] of campaignMap) {
    const firstRow = campaignRows[0];
    
    const existing = await prisma.campaign.findUnique({
      where: { externalId_platform: { externalId, platform } },
    });

    const campaign = await prisma.campaign.upsert({
      where: { externalId_platform: { externalId, platform } },
      create: { externalId, name: firstRow.name, platform, status: 'ACTIVE', tenantId },
      update: { name: firstRow.name },
    });

    existing ? campaignsUpdated++ : campaignsCreated++;

    for (const row of campaignRows) {
      await prisma.campaignMetric.upsert({
        where: { campaignId_date: { campaignId: campaign.id, date: row.date } },
        create: {
          campaignId: campaign.id, date: row.date,
          impressions: row.impressions, clicks: row.clicks,
          spend: row.spend, conversions: row.conversions,
          cpc: row.cpc, cpm: row.cpm, ctr: row.ctr,
        },
        update: {
          impressions: row.impressions, clicks: row.clicks,
          spend: row.spend, conversions: row.conversions,
          cpc: row.cpc, cpm: row.cpm, ctr: row.ctr,
        },
      });
      metricsCreated++;
    }
  }

  return { campaignsCreated, campaignsUpdated, metricsCreated };
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log(`
==========================================
📥 INGESTA DE ARCHIVOS EXCEL/CSV
   (Soporta UTF-16 LE de Google Ads)
==========================================
`);

  const args = process.argv.slice(2);
  const dataDir = path.join(process.cwd(), 'data', 'raw');

  const tenant = await prisma.tenant.findUnique({ where: { slug: 'richarq' } });
  if (!tenant) {
    console.error('❌ Tenant "richarq" no encontrado.');
    process.exit(1);
  }

  if (!fs.existsSync(dataDir)) {
    console.error(`❌ La carpeta ${dataDir} no existe.`);
    process.exit(1);
  }

  const platformArg = args.find(a => a.startsWith('--platform='));
  const platform = platformArg ? platformArg.split('=')[1] : null;
  const processAll = args.includes('--all') || !platform;

  if (processAll) {
    const files = fs.readdirSync(dataDir).filter(f => 
      f.endsWith('.xlsx') || f.endsWith('.xls') || f.endsWith('.csv')
    );

    if (files.length === 0) {
      console.error(`❌ No se encontraron archivos en ${dataDir}`);
      process.exit(1);
    }

    console.log(`📂 Encontrados ${files.length} archivos\n`);

    let totalCreated = 0, totalUpdated = 0, totalMetrics = 0;

    for (const file of files) {
      try {
        const filePath = path.join(dataDir, file);
        const detectedPlatform = detectPlatform(file);
        const result = await ingestFile(filePath, detectedPlatform, tenant.id);
        
        totalCreated += result.campaignsCreated;
        totalUpdated += result.campaignsUpdated;
        totalMetrics += result.metricsCreated;
        
        console.log(`✅ ${file}: ${result.campaignsCreated} nuevas, ${result.campaignsUpdated} actualizadas, ${result.metricsCreated} métricas`);
      } catch (error) {
        console.error(`❌ Error en ${file}: ${(error as Error).message}`);
      }
    }

    console.log(`
==========================================
📊 RESUMEN TOTAL
==========================================
   Campañas nuevas:       ${totalCreated}
   Campañas actualizadas: ${totalUpdated}
   Métricas insertadas:   ${totalMetrics}
==========================================
`);
  } else {
    const platformMap: Record<string, Platform> = {
      google: Platform.GOOGLE_ADS,
      meta: Platform.META_ADS,
      tiktok: Platform.TIKTOK_ADS,
    };

    if (!platformMap[platform!]) {
      console.error(`❌ Plataforma no válida: ${platform}`);
      process.exit(1);
    }

    const files = fs.readdirSync(dataDir).filter(f => {
      const lower = f.toLowerCase();
      const isValid = lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv');
      return isValid && (lower.includes(platform!) || (platform === 'meta' && lower.includes('facebook')));
    });

    if (files.length === 0) {
      console.error(`❌ No se encontró archivo para ${platform}`);
      process.exit(1);
    }

    const result = await ingestFile(path.join(dataDir, files[0]), platformMap[platform!], tenant.id);
    
    console.log(`
==========================================
📊 RESUMEN ${platform!.toUpperCase()}
==========================================
   Campañas nuevas:       ${result.campaignsCreated}
   Campañas actualizadas: ${result.campaignsUpdated}
   Métricas insertadas:   ${result.metricsCreated}
==========================================
`);
  }
}

main()
  .catch((e) => { console.error('❌ Error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
