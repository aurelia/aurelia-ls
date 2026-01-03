import Aurelia from "aurelia";
import { RouterConfiguration } from "@aurelia/router";
import { StressApp } from "./stress-app.js";

// Component imports
import * as components from "./components/index.js";

// Global registration
Aurelia.register(
  RouterConfiguration, // Enables router's href attribute
  ...components,
).app(StressApp).start();
