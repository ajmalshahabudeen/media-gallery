/**
 * Formats bytes into human readable KB, MB, GB, TB strings.
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes < 0) {
    return "0 B";
  }

  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  if (i === 0) return `${bytes} B`;

  const formatted = (bytes / Math.pow(k, i)).toFixed(i >= 2 ? 2 : 1);
  return `${formatted} ${sizes[i]}`;
}
