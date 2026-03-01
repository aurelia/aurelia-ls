import { customAttribute } from "@aurelia/runtime-html";
import type { INode } from "@aurelia/runtime-html";

/**
 * Pattern: Custom attribute with defaultProperty designating primary bindable
 * Usage: <div highlight="yellow"> - color is the default (primary) bindable
 */
@customAttribute({
  name: "highlight",
  defaultProperty: "color",
  bindables: [
    { name: "color" },
    { name: "intensity" },
  ],
})
export class HighlightCustomAttribute {
  color: string = "yellow";
  intensity: number = 1;

  constructor(private readonly element: INode<HTMLElement>) {}

  bound(): void {
    this.updateStyle();
  }

  colorChanged(): void {
    this.updateStyle();
  }

  intensityChanged(): void {
    this.updateStyle();
  }

  private updateStyle(): void {
    this.element.style.backgroundColor = this.color;
    this.element.style.opacity = String(this.intensity);
  }
}
