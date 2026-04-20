import type {
  HelperCall,
  RegistryFactoryMethod,
  RegistryMethod,
  RegistryObject,
} from '../configurations/index.js';
import type { FrameworkApiIngress } from '../framework-api/index.js';
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
