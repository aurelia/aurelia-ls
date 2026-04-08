import {
  ApiClient,
  Aurelia,
  FeatureConfiguration,
  Registration as ServiceRegistration,
  ServiceContainer
} from "./aurelia.js";

const services = new ServiceContainer();

services.register(
  ServiceRegistration.singleton(ApiClient, ApiClient).aliasTo("api-client")
);

new Aurelia().register(FeatureConfiguration);
