// VC: decorator-string form with typed toView signature.
// Exercises: VC hover with signature, VC pipe completions,
// VC definition navigation, VC semantic tokens.
import { valueConverter } from "@aurelia/runtime-html";

@valueConverter("format-date")
export class FormatDateValueConverter {
  toView(value: Date | string | null, format?: string): string {
    if (!value) return "";
    const date = typeof value === "string" ? new Date(value) : value;
    return format === "short"
      ? date.toLocaleDateString()
      : date.toISOString().slice(0, 10);
  }
}
