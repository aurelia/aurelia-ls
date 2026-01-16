import { valueConverter } from "@aurelia/runtime-html";

@valueConverter("titlecase")
export class TitleCaseValueConverter {
  toView(value: string | null | undefined): string {
    if (!value) return "";
    return value
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ""))
      .join(" ");
  }
}
