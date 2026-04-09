import {
  AppTask,
  Aurelia,
  FeatureBundle,
  FeatureConfiguration,
  RouterConfiguration
} from "./aurelia.js";
import { FeatureShell } from "./feature-shell.js";

function configureRoutes(options: { routes?: readonly unknown[] }): void {
  options.routes = [
    {
      path: "",
      component: FeatureShell
    }
  ];
}

new Aurelia()
  .register(
    FeatureBundle,
    FeatureConfiguration
      .customize((options) => {
        options.root = "feature-shell";
      })
      .customize((options) => {
        options.aliases = ["feature"];
      }),
    RouterConfiguration.customize(configureRoutes),
    AppTask.activating((services) => {
      services.register(FeatureBundle);
    })
  )
  .app(FeatureShell);
