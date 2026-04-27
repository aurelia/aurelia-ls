import { ConfigurationRegistrationScanner } from '../registrations/configuration-registration-scanner.js';
import type { ConfigurationRegistrationProduction } from '../registrations/configuration-registration-production.js';
import { SubjectAdmissionScanner, type SubjectAdmissionScannerState } from '../admissions/subject-admission-scanner.js';
import type { AdmittedSubject } from '../admissions/admitted-subject.js';
import type { Exports } from '../exports/exports.js';
import type { Resources } from '../resources/resources.js';
import type { Configurations } from './configurations.js';
import type { RegisterArgument } from './configuration-function-analysis.js';
import type { RegistryFactoryMethod, RegistryMethod, RegistryObject } from './registry-object.js';
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
  readonly subjectAdmissionScannerState: SubjectAdmissionScannerState;
}

export class ConfigurationContributionScanner {
  private readonly configurationsValue: Configurations;
  private readonly registrationScanner: ConfigurationRegistrationScanner;
  private readonly bundleExpansionScanner: BundleExpansionScanner;
  private readonly subjectAdmissionScanner: SubjectAdmissionScanner;

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
    this.subjectAdmissionScanner = new SubjectAdmissionScanner({
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
      subjectAdmissionScannerState: this.subjectAdmissionScanner.inspectState(),
    };
  }

  private scanRegistryObject(
    current: RegistryObject,
    allProductions: readonly ConfigurationRegistrationProduction[],
  ): ConfigurationContribution {
    const methods = collectMethods(current);
    const directRegisterArguments = methods.flatMap((method) => method.directRegisterArguments);
    const bundleExpansions = methods.flatMap((method) => method.bundleSpreads.map((spread) => this.bundleExpansionScanner.expandSpread(method, spread)));
    const admittedSubjects = [
      ...directRegisterArguments.map((argument, index) =>
          this.subjectAdmissionScanner.readAdmission(
            `${current.id}:direct-register-subject:${argument.referenceName}:${index}`,
            argument.source,
            argument.referenceName,
          )),
      ...bundleExpansions.flatMap((expansion, expansionIndex) =>
        expansion.members.map((member, memberIndex) =>
          this.subjectAdmissionScanner.readAdmission(
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
  admittedSubjects: readonly AdmittedSubject[],
): readonly string[] {
  const seams: string[] = [];

  if (methods.some((method) => 'returnsRegistry' in method && method.returnsRegistry)) {
    seams.push('Returned registry interiors are not yet materialized beyond direct syntax witnesses.');
  }

  if (bundleExpansions.some((currentExpansion) => currentExpansion.bundle == null)) {
    seams.push('Some bundle spreads still do not resolve to a known bundle export.');
  }

  if (admittedSubjects.some((subject) => subject.carrier === 'open' || subject.policy === 'open')) {
    seams.push('Some direct references still do not resolve to a closed admitted subject.');
  }

  if (admittedSubjects.some((subject) => subject.policy === 'compiler-root-only')) {
    seams.push('Some compiler-root admissions are present, but compiler capability materialization is intentionally offline while the compiler substrate is being rebuilt.');
  }

  if (current.note != null) {
    seams.push(current.note);
  }

  return seams;
}
