/**
 * Melayu DJPb Riau Date Formatting Utilities
 * Standardizes display format to DD-MM-YYYY (e.g. 12-08-2026)
 */

export function formatDisplayDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  const str = String(dateStr).trim();

  // If already in DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  if (/^\d{2}[-/.]\d{2}[-/.]\d{4}$/.test(str)) {
    return str.replace(/[/.]/g, '-');
  }

  // If in YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD (e.g. 2026-08-12)
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
  }

  // Try parsing ISO date string
  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime()) && str.includes('-')) {
      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      if (year > 1970) {
        return `${day}-${month}-${year}`;
      }
    }
  } catch {
    // Return original if parsing fails
  }

  return str;
}
