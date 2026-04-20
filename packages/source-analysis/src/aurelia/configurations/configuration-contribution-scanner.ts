import { ConfigurationRegistrationScanner, type ConfigurationRegistrationProduction } from '../registrations/index.js';
import { RegistrableSubjectScanner, type RegistrableSubject, type RegistrableSubjectScannerState } from '../registrables/index.js';
import type { Exports } from '../exports/index.js';
import type { Resources } from '../resources/index.js';
import type { Configurations } from './configurations.js';
import type { RegistryFactoryMethod, RegistryMethod, RegistryObject, RegisterArgument } from './registry-object.js';
import { BundleExpansionScanner, type BundleExpansionScannerState } from './bundle-expansion-scanner.js';
import { ConfigurationContribution } from './configuration-contribution.js';
import type { BundleExpansion } from './bundle-expansion.js';

export interface ConfigurationContributionScannerOptions {
  readonly configurations: Configurations;
  readonly exports: Exports;
  readonly resources: Resources;
}

export interface ConfigurationContributionScannerState {
  readonly ownerLabel: string;
  readonly registrationScannerState: ReturnType<ConfigurationRegistrationScanner['inspectState']>;
  readonly bundleExpansionScannerState: BundleExpansionScannerState;
  readonly registrableSubjectScannerState: RegistrableSubjectScannerState;
}

export class ConfigurationContributionScanner {
  private readonly configurationsValue: Configurations;
  private readonly registrationScanner: ConfigurationRegistrationScanner;
  private readonly bundleExpansionScanner: BundleExpansionScanner;
  private readonly registrableSubjectScanner: RegistrableSubjectScanner;

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
    this.registrableSubjectScanner = new RegistrableSubjectScanner({
      configurations: options.configurations,
      exports: options.exports,
      resources: options.resources,
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
      registrableSubjectScannerState: this.registrableSubjectScanner.inspectState(),
    };
  }

  private scanRegistryObject(
    current: RegistryObject,
    allProductions: readonly ConfigurationRegistrationProduction[],
  ): ConfigurationContribution {
    const methods = collectMethods(current);
    const directRegisterArguments = methods.flatMap((method) => method.directRegisterArguments);
    const bundleExpansions = methods.flatMap((method) => method.bundleSpreads.map((spread) => this.bundleExpansionScanner.expandSpread(method, spread)));
    // TODO: admittedSubjects is currently a coarse pre-admission layer. It is
    // useful for concrete contribution serialization, but it is not yet the
    // final container-state or resource-definition convergence result.
    const admittedSubjects = [
      ...directRegisterArguments.map((argument, index) =>
        this.registrableSubjectScanner.readSubject(
          `${current.id}:direct-register-subject:${argument.referenceName}:${index}`,
          argument.source,
          argument.referenceName,
        )),
      ...bundleExpansions.flatMap((expansion, expansionIndex) =>
        expansion.members.map((member, memberIndex) =>
          this.registrableSubjectScanner.readSubject(
            `${current.id}:bundle-subject:${expansionIndex}:${member.referenceName}:${memberIndex}`,
            member.source ?? expansion.spread.source,
            member.referenceName,
          ))),
    ];

    const openSeams = collectOpenSeams(current, methods, bundleExpansions, admittedSubjects);

    return new ConfigurationContribution(
      `${current.id}:contribution`,
      current,
      allProductions.filter((production) => production.ownerConfiguration.id === current.id),
      directRegisterArguments,
      bundleExpansions,
      admittedSubjects,
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
  admittedSubjects: readonly RegistrableSubject[],
): readonly string[] {
  const seams: string[] = [];

  if (methods.some((method) => 'returnsRegistry' in method && method.returnsRegistry)) {
    seams.push('Returned registry interiors are not yet materialized beyond direct syntax witnesses.');
  }

  if (bundleExpansions.some((currentExpansion) => currentExpansion.bundle == null)) {
    seams.push('Some bundle spreads still do not resolve to a known bundle export.');
  }

  if (admittedSubjects.some((subject) => subject.kind === 'open')) {
    seams.push('Some direct references still do not resolve to a closed registrable subject.');
  }

  if (current.note != null) {
    seams.push(current.note);
  }

  return seams;
}
