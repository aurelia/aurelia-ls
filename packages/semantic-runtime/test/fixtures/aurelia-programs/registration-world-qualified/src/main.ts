import {
  AppTask,
  Aurelia,
  FeatureConfiguration,
  RouterConfiguration
} from "./aurelia.js";

function readRoutes(): readonly unknown[] {
  return JSON.parse(process.env.APP_ROUTES ?? "[]") as readonly unknown[];
}

function configureRoutes(options: { routes?: readonly unknown[] }): void {
  options.routes = readRoutes();
}

new Aurelia().register(
  FeatureConfiguration
    .customize((options) => {
      options.root = "feature-shell";
    })
    .customize((options) => {
      options.aliases = ["feature"];
    }),
  RouterConfiguration.customize(configureRoutes),
  AppTask.activating((container) => {
    container.register(FeatureConfiguration);
  })
);
