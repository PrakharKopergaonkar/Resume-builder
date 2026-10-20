const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2023-07" → "Jul 2023"; anything else is shown as typed. */
export function formatMonth(value: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (!m) return value;
  return `${MONTHS[Number(m[2]) - 1] ?? ""} ${m[1]}`.trim();
}

/** (3, "2024") → "Mar 2024"; (0, "2024") → "2024"; no year → "". */
export function formatMonthYear(month: number, year: string): string {
  if (!year) return "";
  return month >= 1 && month <= 12 ? `${MONTHS[month - 1]} ${year}` : year;
}

export function formatRange(start: string, end: string, current: boolean): string {
  const from = formatMonth(start);
  const to = current ? "Present" : formatMonth(end);
  if (from && to) return `${from} – ${to}`;
  return from || to;
}

export const joinParts = (...parts: (string | undefined)[]) => parts.map((p) => p?.trim()).filter(Boolean).join(", ");

/** True when a rich-text field has visible text (TipTap leaves "<p></p>" behind when cleared). */
export const hasText = (html: string) => html.replace(/<[^>]*>/g, "").trim().length > 0;

/** Keeps http(s) URLs, adds https:// to bare domains, and drops any other scheme (e.g. javascript:). */
export function normalizeUrl(raw: string): string {
  const url = raw.trim();
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return "";
  return `https://${url.replace(/^\/+/, "")}`;
}
