import { DeclarationWorld, type DeclarationExport } from './declaration-world.js';

export interface FrameworkOptions {
  readonly rootDir: string;
  readonly packageNames?: readonly string[];
  readonly exports?: readonly DeclarationExport[];
}

// Framework is the ergonomic ingress for "the Aurelia framework as a whole".
// It owns package-level discovery and a declaration world over the framework
// surface, without pretending to answer runtime or current-world questions yet.
export class Framework {
  private readonly declarationWorldValue: DeclarationWorld;
  private readonly packageNamesValue: readonly string[];
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
  }

  declarationWorld(): DeclarationWorld {
    return this.declarationWorldValue;
  }

  readPackageNames(): readonly string[] {
    return [...this.packageNamesValue];
  }

  readExports(): readonly DeclarationExport[] {
    return this.declarationWorldValue.readExports();
  }
}
