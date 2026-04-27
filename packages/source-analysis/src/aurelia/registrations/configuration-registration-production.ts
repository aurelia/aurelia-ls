import type { HelperCall } from '../configurations/configuration-function-analysis.js';
import type { RegistryFactoryMethod, RegistryMethod, RegistryObject } from '../configurations/registry-object.js';
import type { FrameworkApiIngress } from '../framework-api/framework-api-ingress.js';
import { RegistrationProduction } from './registration-production.js';

export class ConfigurationRegistrationProduction {
  constructor(
    readonly id: string,
    readonly ownerConfiguration: RegistryObject,
    readonly originMethod: RegistryMethod | RegistryFactoryMethod,
    readonly producerCall: HelperCall,
    readonly apiIngress: FrameworkApiIngress,
    readonly production: RegistrationProduction,
    readonly note: string | null = null,
  ) {}
}
