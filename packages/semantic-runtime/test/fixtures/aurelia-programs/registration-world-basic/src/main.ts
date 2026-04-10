import {
  ApiClient,
  Aurelia,
  Container,
  FeatureConfiguration,
  Registration as ServiceRegistration
} from "./aurelia.js";

const services = new Container();

services.register(
  ServiceRegistration.singleton(ApiClient, ApiClient).aliasTo("api-client")
);

new Aurelia().register(FeatureConfiguration);
