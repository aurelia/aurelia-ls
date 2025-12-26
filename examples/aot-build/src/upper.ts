import { valueConverter } from "aurelia";

@valueConverter("upper")
export class UpperValueConverter {
  toView(value: string): string {
    return value?.toUpperCase() ?? "";
  }
}
