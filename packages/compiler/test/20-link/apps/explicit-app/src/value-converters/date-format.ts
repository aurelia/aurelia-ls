import { valueConverter } from "@aurelia/runtime-html";

/**
 * Pattern: Value converter with decorator
 * Usage: ${value | date} or ${value | date:'short'}
 */
@valueConverter("date")
export class DateFormatValueConverter {
  toView(value: Date | string | number, format: string = "medium"): string {
    if (value == null) return "";

    const date = value instanceof Date ? value : new Date(value);

    switch (format) {
      case "short":
        return date.toLocaleDateString();
      case "long":
        return date.toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      case "medium":
      default:
        return date.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
    }
  }
}
