import Aurelia from "aurelia";
import { StressApp } from "./stress-app.js";

// Component imports
import * as components from "./components/index.js";

// Global registration
Aurelia.register(
  ...components,
).app(StressApp).start();
