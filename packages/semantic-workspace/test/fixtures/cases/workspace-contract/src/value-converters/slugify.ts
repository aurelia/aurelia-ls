import { valueConverter } from "@aurelia/runtime-html";

@valueConverter("slugify")
export class SlugifyValueConverter {
  toView(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");
  }
}
