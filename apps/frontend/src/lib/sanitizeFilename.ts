/** Strip path segments and control characters from server-provided filenames shown in UI. */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? name;
  return base.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '').trim().slice(0, 200) || 'media';
}
