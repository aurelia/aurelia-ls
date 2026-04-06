import {
  ApiClient,
  Aurelia,
  DI,
  FeatureConfiguration,
  ServiceContainer
} from "./aurelia.js";

const container = new ServiceContainer();

container.register(
  DI.singleton(ApiClient, ApiClient).aliasTo("api-client")
);

new Aurelia().register(FeatureConfiguration);
