import { DeclarationWorld, type DeclarationExport } from './declaration-world.js';
import type { AppRoot } from './app-root.js';
import type { Aurelia } from './aurelia.js';
import {
  ConfigurationContributions,
  ConfigurationContributionScanner,
  Configurations,
  ConfigurationScanner,
} from './configurations/index.js';
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
import {
  ToolingEnvironment,
  ToolingEnvironmentScanner,
} from './tooling/index.js';

export interface ProjectOptions {
  readonly rootDir: string;
  readonly name?: string;
  readonly exports?: readonly DeclarationExport[];
  readonly resourceSeeds?: readonly ResourceDefinition[];
  readonly tooling?: ToolingEnvironment | null;
  readonly aurelia?: Aurelia | null;
  readonly appRoot?: AppRoot | null;
}

// Project is the app-facing ownership surface. It can later grow package
// graphs, app-root discovery, and local template ownership without forcing
// those concerns into the lower-level world/runtime classes.
export class Project {
  private readonly configurationContributionsValue: ConfigurationContributions;
  private readonly configurationsValue: Configurations;
  private readonly declarationWorldValue: DeclarationWorld;
  private readonly exportsValue: Exports;
  private readonly resourcesValue: Resources;
  private readonly toolingValue: ToolingEnvironment;
  private readonly worldConstructionsValue: TypeScriptWorldConstructions;
  private aureliaValue: Aurelia | null;
  private appRootValue: AppRoot | null;
  readonly rootDir: string;
  readonly name: string;

  constructor(
    rootDir: string,
    name: string,
    options: ProjectOptions,
  ) {
    this.rootDir = rootDir;
    this.name = name;
    this.declarationWorldValue = new DeclarationWorld(
      `project:${name}`,
      options.exports ?? [],
    );
    this.exportsValue = new Exports(
      `project:${name}`,
      new ExportScanner({
        declarationWorld: this.declarationWorldValue,
      }),
    );
    this.toolingValue = options.tooling
      ?? new ToolingEnvironmentScanner({
        rootDir,
      }).scan();
    this.configurationsValue = new Configurations(
      `project:${name}`,
      new ConfigurationScanner({
        exports: this.exportsValue,
      }),
    );
    this.resourcesValue = new Resources(
      `project:${name}`,
      new ResourceScanner({
        exports: this.exportsValue,
        resourceSeeds: options.resourceSeeds,
        conventionsActive: this.toolingValue.conventions.isActive(),
      }),
    );
    this.configurationContributionsValue = new ConfigurationContributions(
      `project:${name}`,
      new ConfigurationContributionScanner({
        configurations: this.configurationsValue,
        exports: this.exportsValue,
        resources: this.resourcesValue,
      }),
    );
    this.worldConstructionsValue = new TypeScriptWorldConstructions(
      `project:${name}`,
      new TypeScriptWorldConstructionScanner({
        ownerLabel: `project:${name}`,
        configurationContributions: this.configurationContributionsValue,
        resources: this.resourcesValue,
      }),
    );
    this.aureliaValue = options.aurelia ?? null;
    this.appRootValue = options.appRoot ?? null;
  }

  declarationWorld(): DeclarationWorld {
    return this.declarationWorldValue;
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

  tooling(): ToolingEnvironment {
    return this.toolingValue;
  }

  appRoot(): AppRoot | null {
    return this.appRootValue ?? this.aureliaValue?.root ?? null;
  }

  aurelia(): Aurelia | null {
    return this.aureliaValue;
  }

  setAurelia(
    aurelia: Aurelia | null,
  ): this {
    this.aureliaValue = aurelia;
    return this;
  }

  setAppRoot(
    world: AppRoot | null,
  ): this {
    this.appRootValue = world;
    return this;
  }
}
