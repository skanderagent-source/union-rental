export function sanitizeSearchTerm(value: string): string {
  return value.replace(/[,()%]/g, ' ').trim();
}
