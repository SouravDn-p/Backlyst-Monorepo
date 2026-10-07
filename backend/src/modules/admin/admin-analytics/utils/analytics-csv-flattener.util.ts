type CsvRow = {
  reportType: string;
  reportName: string;
  section: string;
  periodStart: string;
  periodEnd: string;
  metric: string;
  value: string;
  unit: string;
  generatedAt: string;
};

function toScalar(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return String(value);
  if (typeof value === 'object') {
    return JSON.stringify(value, (_key, item) =>
      typeof item === 'bigint' ? String(item) : item,
    );
  }
  return String(value as any);
}

function walk(
  rows: CsvRow[],
  context: Omit<CsvRow, 'section' | 'metric' | 'value' | 'unit'>,
  section: string,
  value: unknown,
  path: string[] = [],
) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      walk(rows, context, section, item, [...path, String(index)]),
    );
    return;
  }

  if (value && typeof value === 'object' && !(value instanceof Date)) {
    Object.entries(value as Record<string, unknown>).forEach(([key, child]) =>
      walk(rows, context, section, child, [...path, key]),
    );
    return;
  }

  rows.push({
    ...context,
    section,
    metric: path.join('.') || section,
    value: toScalar(value),
    unit: '',
  });
}

function escapeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export function analyticsToCsv(reports: any[]): string {
  const rows: CsvRow[] = [];

  for (const report of reports) {
    const metadata = report.metadata ?? {};
    const context = {
      reportType: metadata.reportType ?? 'UNKNOWN',
      reportName:
        metadata.reportName ?? metadata.reportType ?? 'Unknown report',
      periodStart: metadata.from ?? '',
      periodEnd: metadata.to ?? '',
      generatedAt: metadata.generatedAt ?? new Date().toISOString(),
    };

    for (const [section, value] of Object.entries(report)) {
      if (section === 'metadata') continue;
      walk(rows, context, section, value);
    }
  }

  const headers = [
    'reportType',
    'reportName',
    'section',
    'periodStart',
    'periodEnd',
    'metric',
    'value',
    'unit',
    'generatedAt',
  ];

  return `\uFEFF${[
    headers.join(','),
    ...rows.map((row) =>
      headers.map((header) => escapeCsv((row as any)[header] ?? '')).join(','),
    ),
  ].join('\n')}`;
}
