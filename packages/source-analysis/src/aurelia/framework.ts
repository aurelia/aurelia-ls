import { DeclarationWorld, type DeclarationExport } from './declaration-world.js';
import { ConfigurationContributions } from './configurations/configuration-contributions.js';
import { ConfigurationContributionScanner } from './configurations/configuration-contribution-scanner.js';
import { Configurations } from './configurations/configurations.js';
import { ConfigurationScanner } from './configurations/configuration-scanner.js';
import {
  AppTaskScanner,
  type AppTaskContribution,
} from './app-task.js';
import { Exports } from './exports/exports.js';
import { ExportScanner } from './exports/export-scanner.js';

export interface FrameworkOptions {
  readonly rootDir: string;
  readonly packageNames?: readonly string[];
  readonly exports?: readonly DeclarationExport[];
}

// Framework is the ergonomic ingress for "the Aurelia framework as a whole".
// It owns package-level discovery and a declaration world over the framework
// surface, without pretending to answer runtime or current-world questions yet.
export class Framework {
  private readonly configurationContributionsValue: ConfigurationContributions;
  private readonly configurationsValue: Configurations;
  private readonly declarationWorldValue: DeclarationWorld;
  private readonly exportsValue: Exports;
  private readonly packageNamesValue: readonly string[];
  private readonly appTasksValue: readonly AppTaskContribution[];
  readonly rootDir: string;

  constructor(
    rootDir: string,
    options: FrameworkOptions,
  ) {
    this.rootDir = rootDir;
    this.packageNamesValue = [...(options.packageNames ?? [])];
    this.declarationWorldValue = new DeclarationWorld(
      'framework',
      options.exports ?? [],
    );
    this.exportsValue = new Exports(
      'framework',
      new ExportScanner({
        declarationWorld: this.declarationWorldValue,
      }),
    );
    this.configurationsValue = new Configurations(
      'framework',
      new ConfigurationScanner({
        exports: this.exportsValue,
      }),
    );
    this.configurationContributionsValue = new ConfigurationContributions(
      'framework',
      new ConfigurationContributionScanner({
        configurations: this.configurationsValue,
      }),
    );
    this.appTasksValue = new AppTaskScanner({
      contributions: this.configurationContributionsValue.readAll(),
    }).scanAll();
  }

  declarationWorld(): DeclarationWorld {
    return this.declarationWorldValue;
  }

  readPackageNames(): readonly string[] {
    return [...this.packageNamesValue];
  }

  exports(): Exports {
    return this.exportsValue;
  }

  readExports() {
    return this.exportsValue.readAll();
  }

  configurations(): Configurations {
    return this.configurationsValue;
  }

  readConfigurations() {
    return this.configurationsValue.readAll();
  }

  configurationContributions(): ConfigurationContributions {
    return this.configurationContributionsValue;
  }

  readConfigurationContributions() {
    return this.configurationContributionsValue.readAll();
  }

  readAppTasks(): readonly AppTaskContribution[] {
    return [...this.appTasksValue];
  }
}
