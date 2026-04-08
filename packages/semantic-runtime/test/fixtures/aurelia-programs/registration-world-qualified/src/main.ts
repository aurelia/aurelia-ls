import {
  AppTask,
  Aurelia,
  FeatureConfiguration,
  RouterConfiguration as RoutingConfiguration
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
  RoutingConfiguration.customize(configureRoutes),
  AppTask.activating((services) => {
    services.register(FeatureConfiguration);
  })
);
