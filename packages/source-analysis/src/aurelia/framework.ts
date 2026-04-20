import { DeclarationWorld, type DeclarationExport } from './declaration-world.js';
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
  private readonly declarationWorldValue: DeclarationWorld;
  private readonly exportsValue: Exports;
  private readonly packageNamesValue: readonly string[];
  private readonly resourcesValue: Resources;
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
    this.resourcesValue = new Resources(
      'framework',
      new ResourceScanner({
        exports: this.exportsValue,
        resourceSeeds: options.resourceSeeds,
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

  resources(): Resources {
    return this.resourcesValue;
  }

  readResources(): readonly ResourceDefinition[] {
    return this.resourcesValue.readAll();
  }
}
