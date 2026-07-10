export function sanitizeSearchTerm(value: string): string {
  return value.replace(/[,()%]/g, ' ').trim();
}

export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim();
}
