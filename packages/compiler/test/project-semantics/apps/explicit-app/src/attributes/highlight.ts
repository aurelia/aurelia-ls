import { customAttribute } from "@aurelia/runtime-html";
import type { INode } from "@aurelia/runtime-html";

/**
 * Pattern: Custom attribute with primary bindable (implicit value)
 * Usage: <div highlight="yellow"> - color is the primary bindable
 */
@customAttribute({
  name: "highlight",
  bindables: [
    { name: "color", primary: true },
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
