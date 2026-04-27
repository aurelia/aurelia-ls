import { ConfigurationRegistrationScanner } from '../registrations/configuration-registration-scanner.js';
import type { ConfigurationRegistrationProduction } from '../registrations/configuration-registration-production.js';
import type { Configurations } from './configurations.js';
import type { RegistryFactoryMethod, RegistryMethod, RegistryObject } from './registry-object.js';
import { BundleExpansionScanner, type BundleExpansionScannerState } from './bundle-expansion-scanner.js';
import { ConfigurationContribution } from './configuration-contribution.js';
import type { BundleExpansion } from './bundle-expansion.js';

export interface ConfigurationContributionScannerOptions {
  readonly configurations: Configurations;
}

export interface ConfigurationContributionScannerState {
  readonly ownerLabel: string;
  readonly registrationScannerState: ReturnType<ConfigurationRegistrationScanner['inspectState']>;
  readonly bundleExpansionScannerState: BundleExpansionScannerState;
}

export class ConfigurationContributionScanner {
  private readonly configurationsValue: Configurations;
  private readonly registrationScanner: ConfigurationRegistrationScanner;
  private readonly bundleExpansionScanner: BundleExpansionScanner;

  constructor(
    options: ConfigurationContributionScannerOptions,
  ) {
    this.configurationsValue = options.configurations;
    this.registrationScanner = new ConfigurationRegistrationScanner({
      configurations: options.configurations,
    });
    this.bundleExpansionScanner = new BundleExpansionScanner({
      configurations: options.configurations,
    });
  }

  scanAll(): readonly ConfigurationContribution[] {
    const productions = this.registrationScanner.scanAll();
    return this.configurationsValue.readRegistryObjects().map((current) => this.scanRegistryObject(current, productions));
  }

  inspectState(): ConfigurationContributionScannerState {
    return {
      ownerLabel: this.configurationsValue.ownerLabel,
      registrationScannerState: this.registrationScanner.inspectState(),
      bundleExpansionScannerState: this.bundleExpansionScanner.inspectState(),
    };
  }

  private scanRegistryObject(
    current: RegistryObject,
    allProductions: readonly ConfigurationRegistrationProduction[],
  ): ConfigurationContribution {
    const methods = collectMethods(current);
    const directRegisterArguments = methods.flatMap((method) => method.directRegisterArguments);
    const bundleExpansions = methods.flatMap((method) => method.bundleSpreads.map((spread) => this.bundleExpansionScanner.expandSpread(method, spread)));
    const openSeams = collectOpenSeams(current, methods, bundleExpansions);

    return new ConfigurationContribution(
      `${current.id}:contribution`,
      current,
      allProductions.filter((production) => production.ownerConfiguration.id === current.id),
      directRegisterArguments,
      bundleExpansions,
      openSeams,
    );
  }
}

function collectMethods(
  current: RegistryObject,
): readonly (RegistryMethod | RegistryFactoryMethod)[] {
  return current.registerMethod == null
    ? current.factoryMethods
    : [current.registerMethod, ...current.factoryMethods];
}

function collectOpenSeams(
  current: RegistryObject,
  methods: readonly (RegistryMethod | RegistryFactoryMethod)[],
  bundleExpansions: readonly BundleExpansion[],
): readonly string[] {
  const seams: string[] = [];

  if (methods.some((method) => 'returnsRegistry' in method && method.returnsRegistry)) {
    seams.push('Returned registry interiors are not yet materialized beyond direct syntax witnesses.');
  }

  if (bundleExpansions.some((currentExpansion) => currentExpansion.bundle == null)) {
    seams.push('Some bundle spreads still do not resolve to a known bundle export.');
  }

  if (current.note != null) {
    seams.push(current.note);
  }

  return seams;
}
