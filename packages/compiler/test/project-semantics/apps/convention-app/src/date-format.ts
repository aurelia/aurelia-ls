/**
 * Convention-based value converter (uses class name suffix).
 *
 * The "ValueConverter" suffix tells the convention resolver
 * that this is a value converter named "dateFormat".
 */
export class DateFormatValueConverter {
  toView(value: Date, format?: string): string {
    if (!value) return "";
    const fmt = format ?? "YYYY-MM-DD";
    // Simplified formatting for test
    return value.toISOString().slice(0, 10);
  }
}
