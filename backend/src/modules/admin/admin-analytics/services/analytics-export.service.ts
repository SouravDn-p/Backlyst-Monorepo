import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import PDFDocument = require('pdfkit');
import { analyticsToCsv } from '../utils/analytics-csv-flattener.util';
import {
  analyticsFilename,
  sanitizeFilenamePart,
} from '../utils/analytics-filename.util';

@Injectable()
export class AnalyticsExportService {
  async toPdf(reports: any[], title: string) {
    const doc = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true });
    const chunks: Buffer[] = [];

    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    doc.fontSize(20).text(title, { align: 'center' });
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .text(`Generated at: ${new Date().toISOString()}`, { align: 'center' });
    doc
      .fontSize(9)
      .fillColor('gray')
      .text('Read-only analytics snapshot', { align: 'center' });
    doc.fillColor('black').moveDown(2);

    for (const [index, report] of reports.entries()) {
      if (index > 0) doc.addPage();
      this.writeReport(doc, report);
    }

    const pageCount = doc.bufferedPageRange().count;
    for (let index = 0; index < pageCount; index += 1) {
      doc.switchToPage(index);
      doc.fontSize(8).fillColor('gray');
      doc.text(`Page ${index + 1} of ${pageCount}`, 48, doc.page.height - 40, {
        align: 'center',
      });
      doc.text('Read-only analytics snapshot', 48, doc.page.height - 28, {
        align: 'center',
      });
      doc.fillColor('black');
    }

    doc.end();
    return done;
  }

  toCsv(reports: any[]) {
    return Buffer.from(analyticsToCsv(reports), 'utf8');
  }

  liveFilename(reportName: string, extension: 'pdf' | 'csv') {
    return analyticsFilename(`backlyst-${reportName}`, extension);
  }

  savedFilename(report: any, extension: 'pdf' | 'csv') {
    return `${sanitizeFilenamePart(report.reportCode)}-${sanitizeFilenamePart(report.reportType)}.${extension}`;
  }

  private writeReport(doc: PDFKit.PDFDocument, report: any) {
    const metadata = report.metadata ?? {};
    doc
      .fontSize(16)
      .text(metadata.reportName ?? metadata.reportType ?? 'Analytics Report');
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor('gray');
    doc.text(`Report type: ${metadata.reportType ?? 'UNKNOWN'}`);
    doc.text(`Period: ${metadata.from ?? ''} - ${metadata.to ?? ''}`);
    doc.text(`Participant filter: ${metadata.participant ?? 'ALL'}`);
    doc.text(`Total records: ${metadata.totalRecords ?? 0}`);
    doc.fillColor('black').moveDown();

    doc.fontSize(12).text('Summary', { underline: true });
    doc.fontSize(9).text(this.stringifyForExport(report.summary ?? {}), {
      width: 500,
    });
    doc.moveDown();
    doc.fontSize(12).text('Data', { underline: true });
    doc.fontSize(8).text(this.stringifyForExport(report.data ?? {}), {
      width: 500,
    });
  }

  private stringifyForExport(value: unknown) {
    return JSON.stringify(
      value,
      (_key, item) => {
        if (typeof item === 'bigint') return Number(item);
        return item;
      },
      2,
    );
  }
}
