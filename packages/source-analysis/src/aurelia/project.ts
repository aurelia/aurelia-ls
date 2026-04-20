import { DeclarationWorld, type DeclarationExport } from './declaration-world.js';
import type { AppRoot } from './app-root.js';
import type { Aurelia } from './aurelia.js';
import {
  Exports,
  ExportScanner,
} from './exports/index.js';
import {
  ResourceScanner,
  Resources,
  type ResourceDefinition,
} from './resources/index.js';

export interface ProjectOptions {
  readonly rootDir: string;
  readonly name?: string;
  readonly exports?: readonly DeclarationExport[];
  readonly resourceSeeds?: readonly ResourceDefinition[];
  readonly aurelia?: Aurelia | null;
  readonly appRoot?: AppRoot | null;
}

// Project is the app-facing ownership surface. It can later grow package
// graphs, app-root discovery, and local template ownership without forcing
// those concerns into the lower-level world/runtime classes.
export class Project {
  private readonly declarationWorldValue: DeclarationWorld;
  private readonly exportsValue: Exports;
  private readonly resourcesValue: Resources;
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
    this.resourcesValue = new Resources(
      `project:${name}`,
      new ResourceScanner({
        exports: this.exportsValue,
        resourceSeeds: options.resourceSeeds,
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

  resources(): Resources {
    return this.resourcesValue;
  }

  readResources(): readonly ResourceDefinition[] {
    return this.resourcesValue.readAll();
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
