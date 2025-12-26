import Aurelia from "aurelia";
import { MyApp } from "./my-app.js";

// Barrel imports - resolution must trace through these
import * as components from "./components/index.js";
import * as attributes from "./attributes/index.js";
import * as valueConverters from "./value-converters/index.js";
import * as bindingBehaviors from "./binding-behaviors/index.js";
import * as staticAu from "./static-au/index.js";

// Global registration via Aurelia.register()
// All resources registered here are available in every template
Aurelia.register(
  // Spread barrel exports - requires import graph analysis
  ...components,
  ...attributes,
  ...valueConverters,
  ...bindingBehaviors,
  ...staticAu,
).app(MyApp).start();
