/**
 * Pattern: Value converter using static $au (no decorator)
 * This is an alternative to @valueConverter decorator
 */
export class CurrencyValueConverter {
  static $au = {
    type: "value-converter" as const,
    name: "currency",
  };

  toView(
    value: number,
    currencyCode: string = "USD",
    locale: string = "en-US",
  ): string {
    if (value == null || isNaN(value)) return "";

    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
    }).format(value);
  }

  fromView(value: string): number {
    // Strip currency symbols and parse
    const cleaned = value.replace(/[^0-9.-]/g, "");
    return parseFloat(cleaned) || 0;
  }
}
