import { customElement } from "aurelia";
import template from "./app.html";
import { Greeting } from "./greeting";
import { UpperValueConverter } from "./upper";

@customElement({
  name: "app",
  template,
  dependencies: [Greeting, UpperValueConverter],
})
export class App {
  title = "AOT Demo";
  framework = "aurelia";
}
