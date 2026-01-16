import { customElement } from "@aurelia/runtime-html";
import template from "./app.html";

@customElement({
  name: "app-root",
  template,
})
export class AppRoot {
  firstName = "Ada";
  lastName = "Lovelace";
  heading = "Profile";
  extra = "extra";
}
