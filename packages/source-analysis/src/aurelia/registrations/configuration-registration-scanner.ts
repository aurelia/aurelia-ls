import type {
  Configurations,
  RegistryFactoryMethod,
  RegistryMethod,
  RegistryObject,
} from '../configurations/index.js';
import {
  FrameworkApiCatalog,
  FrameworkApiIngressScanner,
  type FrameworkApiIngressScannerState,
} from '../framework-api/index.js';
import { RegistrationProduction } from './registration-production.js';
import { ConfigurationRegistrationProduction } from './configuration-registration-production.js';

export interface ConfigurationRegistrationScannerOptions {
  readonly configurations: Configurations;
}

export interface ConfigurationRegistrationScannerState {
  readonly ownerLabel: string;
  readonly configurationCount: number;
  readonly apiIngressScannerState: FrameworkApiIngressScannerState;
}

export class ConfigurationRegistrationScanner {
  private readonly configurationsValue: Configurations;
  private readonly apiCatalog = new FrameworkApiCatalog();
  private readonly apiIngressScanner = new FrameworkApiIngressScanner({
    catalog: this.apiCatalog,
  });

  constructor(
    options: ConfigurationRegistrationScannerOptions,
  ) {
    this.configurationsValue = options.configurations;
  }

  scanAll(): readonly ConfigurationRegistrationProduction[] {
    return this.configurationsValue.readRegistryObjects().flatMap((current) => this.scanRegistryObject(current));
  }

  inspectState(): ConfigurationRegistrationScannerState {
    return {
      ownerLabel: this.configurationsValue.ownerLabel,
      configurationCount: this.configurationsValue.readRegistryObjects().length,
      apiIngressScannerState: this.apiIngressScanner.inspectState(),
    };
  }

  private scanRegistryObject(
    current: RegistryObject,
  ): readonly ConfigurationRegistrationProduction[] {
    const productions: ConfigurationRegistrationProduction[] = [];

    if (current.registerMethod != null) {
      productions.push(
        ...this.scanMethod(current, current.registerMethod),
      );
    }

    for (const method of current.factoryMethods) {
      productions.push(
        ...this.scanMethod(current, method),
      );
    }

    return productions;
  }

  private scanMethod(
    ownerConfiguration: RegistryObject,
    method: RegistryMethod | RegistryFactoryMethod,
  ): readonly ConfigurationRegistrationProduction[] {
    const owner = ownerConfiguration.sourceExport.symbol ?? ownerConfiguration.source;

    // TODO: this is intentionally a narrow bridge over direct, closed helper
    // calls inside the current registry method body. It does not yet:
    // - follow helper indirection such as configure(...)
    // - expand bundle spreads into their member registrations
    // - descend into nested callbacks / returned registry closures
    // - recover keys or payloads from the producer arguments
    //
    // The framework API ingress seam below only closes aliases/import routes to
    // canonical Aurelia APIs. It does not yet model richer helper semantics.
    return method.helperCalls.flatMap((producerCall, index) => {
      const apiIngress = this.apiIngressScanner.readIngress(producerCall);
      const api = apiIngress.api;
      const productionKind = api?.productionKind ?? null;
      if (apiIngress.status !== 'closed' || api == null || productionKind == null) {
        return [];
      }

      const production = new RegistrationProduction(
        `${ownerConfiguration.id}:registration-production:${method.name}:${index}`,
        productionKind,
        owner,
        producerCall.source,
        null,
        null,
        null,
        `Recovered from canonical framework API ${api.id} inside ${ownerConfiguration.sourceExport.name}.${method.name}(...).`,
      );

      return [
        new ConfigurationRegistrationProduction(
          `${ownerConfiguration.id}:configuration-registration-production:${method.name}:${index}`,
          ownerConfiguration,
          method,
          producerCall,
          apiIngress,
          production,
          `Configuration surface ${ownerConfiguration.sourceExport.name} resolves ${producerCall.calleeName} to canonical framework API ${api.id}.`,
        ),
      ];
    });
  }
}
