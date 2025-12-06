import { customAttribute, bindable } from "@aurelia/runtime-html";
import type { INode } from "@aurelia/runtime-html";

/**
 * Pattern: Simple custom attribute with string name
 */
@customAttribute("tooltip")
export class TooltipCustomAttribute {
  @bindable text: string = "";

  constructor(private readonly element: INode<HTMLElement>) {}

  bound(): void {
    this.element.title = this.text;
  }

  textChanged(newValue: string): void {
    this.element.title = newValue;
  }
}
