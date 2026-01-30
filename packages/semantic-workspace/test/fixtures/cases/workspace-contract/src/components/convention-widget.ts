import template from "./convention-widget.html";

export class ConventionWidget {
  label = "";
  count = 0;

  increment(): void {
    this.count += 1;
  }
}
