// Convert an ISO-8601 string to a MySQL DATETIME string ('YYYY-MM-DD HH:MM:SS', UTC).
// Falls back to "now" if the input is missing or invalid.
export function toMysqlDate(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const valid = isNaN(d.getTime()) ? new Date() : d;
  return valid.toISOString().slice(0, 19).replace("T", " ");
}
