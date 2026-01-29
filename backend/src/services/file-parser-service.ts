import { parse } from 'csv-parse/sync';
import mammoth from 'mammoth';
import { logger } from '../utils/logger';

export interface ParsedData {
  records: any[];
  summary: {
    totalRecords: number;
    columns?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
    metrics?: {
      totalRevenue?: number;
      totalSessions?: number;
      avgAmount?: number;
      plans?: Record<string, number>;
    };
  };
  rawText?: string;
}

export class FileParserService {
  /**
   * Parse CSV file
   */
  async parseCSV(buffer: Buffer): Promise<ParsedData> {
    try {
      const records = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as any[];

      const columns = records.length > 0 ? Object.keys(records[0]) : [];
      const metrics = this.extractMetricsFromCSV(records);

      return {
        records,
        summary: {
          totalRecords: records.length,
          columns,
          metrics,
        },
      };
    } catch (error) {
      logger.error('Error parsing CSV:', error);
      throw new Error('Failed to parse CSV file');
    }
  }

  /**
   * Parse PDF file
   */
  async parsePDF(buffer: Buffer): Promise<ParsedData> {
    try {
      // Lazy-load pdf-parse to avoid DOM globals issues in some environments
      const pdfModule: any = await import('pdf-parse').catch((err: any) => {
        logger.warn('pdf-parse failed to load, falling back', {
          error: err instanceof Error ? err.message : String(err),
        });
        return null;
      });

      if (!pdfModule) {
        throw new Error('pdf-parse module not available');
      }

      // pdf-parse may export default or the function itself
      const pdfParseFn = (pdfModule.default || pdfModule) as (b: Buffer) => Promise<any>;
      const data = await pdfParseFn(buffer);
      const text = data.text;

      // Try to find sessions count
      const sessionsMatch = text.match(/(\d+)\s+sessions?/i);
      const totalSessions = sessionsMatch ? parseInt(sessionsMatch[1]) : undefined;

      // Try to find revenue
      const revenueMatch = text.match(/\$?([\d,]+\.?\d+).*revenue/i);
      const totalRevenue = revenueMatch ? parseFloat(revenueMatch[1].replace(/,/g, '')) : undefined;

      return {
        records: [],
        summary: {
          totalRecords: 0,
          metrics: {
            totalSessions,
            totalRevenue,
          },
        },
        rawText: text,
      };
    } catch (error) {
      // If PDF parsing fails, fall back to minimal summary instead of breaking the flow
      logger.warn('PDF parsing failed, returning fallback summary', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        records: [],
        summary: {
          totalRecords: 0,
          metrics: {},
        },
        rawText: '',
      };
    }
  }

  /**
   * Parse DOCX file
   */
  async parseDOCX(buffer: Buffer): Promise<ParsedData> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value;

      // Extract numeric values
      const sessionsMatch = text.match(/(\d+)\s+sessions?/i);
      const totalSessions = sessionsMatch ? parseInt(sessionsMatch[1]) : undefined;

      const revenueMatch = text.match(/\$?([\d,]+\.?\d+).*revenue/i);
      const totalRevenue = revenueMatch ? parseFloat(revenueMatch[1].replace(/,/g, '')) : undefined;

      return {
        records: [],
        summary: {
          totalRecords: 0,
          metrics: {
            totalSessions,
            totalRevenue,
          },
        },
        rawText: text,
      };
    } catch (error) {
      logger.warn('DOCX parsing failed, returning fallback summary', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        records: [],
        summary: {
          totalRecords: 0,
          metrics: {},
        },
        rawText: '',
      };
    }
  }

  /**
   * Extract metrics from CSV records
   */
  private extractMetricsFromCSV(records: any[]): ParsedData['summary']['metrics'] {
    if (records.length === 0) return {};

    const metrics: ParsedData['summary']['metrics'] = {
      totalSessions: records.length,
      totalRevenue: 0,
      avgAmount: 0,
      plans: {},
    };

    // Try to find amount column (case insensitive)
    const amountKey = Object.keys(records[0]).find(
      key => key.toLowerCase().includes('amount') || key.toLowerCase().includes('price')
    );

    // Try to find plan column
    const planKey = Object.keys(records[0]).find(
      key => key.toLowerCase().includes('plan') || key.toLowerCase().includes('tariff')
    );

    // Try to find date columns
    const dateKeys = Object.keys(records[0]).filter(
      key => key.toLowerCase().includes('date') || key.toLowerCase().includes('created')
    );

    // Calculate revenue
    if (amountKey) {
      const amounts = records.map(r => {
        const value = r[amountKey];
        if (typeof value === 'string') {
          return parseFloat(value.replace(/[$,]/g, '')) || 0;
        }
        return parseFloat(value) || 0;
      });

      metrics.totalRevenue = amounts.reduce((sum, val) => sum + val, 0);
      metrics.avgAmount = metrics.totalRevenue / records.length;
    }

    // Count by plan
    if (planKey) {
      records.forEach(r => {
        const plan = r[planKey];
        if (plan) {
          metrics.plans![plan] = (metrics.plans![plan] || 0) + 1;
        }
      });
    }

    // Extract date range
    if (dateKeys.length > 0) {
      const dates = records
        .map(r => r[dateKeys[0]])
        .filter(Boolean)
        .map(d => new Date(d))
        .filter(d => !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());

      if (dates.length > 0) {
        (metrics as any).dateRange = {
          start: dates[0].toISOString().split('T')[0],
          end: dates[dates.length - 1].toISOString().split('T')[0],
        };
      }
    }

    return metrics;
  }

  /**
   * Parse file based on type
   */
  async parseFile(buffer: Buffer, fileType: string): Promise<ParsedData> {
    const lowerType = fileType.toLowerCase();

    if (lowerType.includes('csv')) {
      return this.parseCSV(buffer);
    } else if (lowerType.includes('pdf')) {
      return this.parsePDF(buffer);
    } else if (
      lowerType.includes('word') ||
      lowerType.includes('docx') ||
      lowerType.includes('document')
    ) {
      return this.parseDOCX(buffer);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  }
}

export const fileParserService = new FileParserService();
