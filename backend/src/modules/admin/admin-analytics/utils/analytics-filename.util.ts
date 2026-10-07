export function sanitizeFilenamePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export function timestampForFilename(date = new Date()): string {
  return date
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')
    .replace(/[:]/g, '-');
}

export function analyticsFilename(name: string, extension: 'pdf' | 'csv') {
  return `${sanitizeFilenamePart(name)}-${timestampForFilename()}.${extension}`;
}
