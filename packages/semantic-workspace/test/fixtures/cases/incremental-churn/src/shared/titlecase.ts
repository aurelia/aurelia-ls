import { valueConverter } from "@aurelia/runtime-html";

@valueConverter("titlecase")
export class TitlecaseValueConverter {
  toView(value: string): string {
    return value;
  }
}
