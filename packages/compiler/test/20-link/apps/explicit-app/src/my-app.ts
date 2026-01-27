import { customElement } from "@aurelia/runtime-html";
import template from "./my-app.html";

/**
 * Root application component.
 * Uses globally registered resources.
 */
@customElement({
  name: "my-app",
  template,
})
export class MyApp {
  message = "Hello from explicit-app!";
}
