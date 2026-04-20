import { DeclarationWorld, type DeclarationExport } from './declaration-world.js';
import type { AppRoot } from './app-root.js';
import type { Aurelia } from './aurelia.js';

export interface ProjectOptions {
  readonly rootDir: string;
  readonly name?: string;
  readonly exports?: readonly DeclarationExport[];
  readonly aurelia?: Aurelia | null;
  readonly appRoot?: AppRoot | null;
}

// Project is the app-facing ownership surface. It can later grow package
// graphs, app-root discovery, and local template ownership without forcing
// those concerns into the lower-level world/runtime classes.
export class Project {
  private readonly declarationWorldValue: DeclarationWorld;
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
    this.aureliaValue = options.aurelia ?? null;
    this.appRootValue = options.appRoot ?? null;
  }

  declarationWorld(): DeclarationWorld {
    return this.declarationWorldValue;
  }

  readExports(): readonly DeclarationExport[] {
    return this.declarationWorldValue.readExports();
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
