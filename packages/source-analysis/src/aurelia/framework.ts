import { DeclarationWorld, type DeclarationExport } from './declaration-world.js';
import {
  ConfigurationContributions,
  ConfigurationContributionScanner,
  Configurations,
  ConfigurationScanner,
} from './configurations/index.js';
import {
  AppTaskScanner,
  type AppTaskContribution,
} from './app-task.js';
import {
  TypeScriptWorldConstructions,
  TypeScriptWorldConstructionScanner,
} from './world-construction/index.js';
import {
  Exports,
  ExportScanner,
} from './exports/index.js';
import {
  ResourceScanner,
  Resources,
  type ResourceDefinition,
} from './resources/index.js';

export interface FrameworkOptions {
  readonly rootDir: string;
  readonly packageNames?: readonly string[];
  readonly exports?: readonly DeclarationExport[];
  readonly resourceSeeds?: readonly ResourceDefinition[];
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
  private readonly resourcesValue: Resources;
  private readonly worldConstructionsValue: TypeScriptWorldConstructions;
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
    this.resourcesValue = new Resources(
      'framework',
      new ResourceScanner({
        exports: this.exportsValue,
        resourceSeeds: options.resourceSeeds,
      }),
    );
    this.configurationContributionsValue = new ConfigurationContributions(
      'framework',
      new ConfigurationContributionScanner({
        configurations: this.configurationsValue,
        exports: this.exportsValue,
        resources: this.resourcesValue,
      }),
    );
    this.appTasksValue = new AppTaskScanner({
      contributions: this.configurationContributionsValue.readAll(),
    }).scanAll();
    this.worldConstructionsValue = new TypeScriptWorldConstructions(
      'framework',
      new TypeScriptWorldConstructionScanner({
        ownerLabel: 'framework',
        configurationContributions: this.configurationContributionsValue,
        resources: this.resourcesValue,
      }),
    );
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

  worldConstructions(): TypeScriptWorldConstructions {
    return this.worldConstructionsValue;
  }

  readWorldConstructions() {
    return this.worldConstructionsValue.readAll();
  }

  resources(): Resources {
    return this.resourcesValue;
  }

  readResources(): readonly ResourceDefinition[] {
    return this.resourcesValue.readAll();
  }
}
