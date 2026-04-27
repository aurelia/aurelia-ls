import { DeclarationWorld, type DeclarationExport } from './declaration-world.js';
import type { AppRoot } from './app-root.js';
import type { Aurelia } from './aurelia.js';
import {
  AppTaskScanner,
  type AppTaskContribution,
} from './app-task.js';
import { ConfigurationContributions } from './configurations/configuration-contributions.js';
import { ConfigurationContributionScanner } from './configurations/configuration-contribution-scanner.js';
import { Configurations } from './configurations/configurations.js';
import { ConfigurationScanner } from './configurations/configuration-scanner.js';
import { Exports } from './exports/exports.js';
import { ExportScanner } from './exports/export-scanner.js';
import { ToolingEnvironment } from './tooling/tooling-environment.js';
import { ToolingEnvironmentScanner } from './tooling/tooling-environment-scanner.js';

export interface ProjectOptions {
  readonly rootDir: string;
  readonly name?: string;
  readonly exports?: readonly DeclarationExport[];
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
  private readonly appTasksValue: readonly AppTaskContribution[];
  private readonly toolingValue: ToolingEnvironment;
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
    this.configurationContributionsValue = new ConfigurationContributions(
      `project:${name}`,
      new ConfigurationContributionScanner({
        configurations: this.configurationsValue,
      }),
    );
    this.appTasksValue = new AppTaskScanner({
      contributions: this.configurationContributionsValue.readAll(),
    }).scanAll();
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

  readAppTasks(): readonly AppTaskContribution[] {
    return [...this.appTasksValue];
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
