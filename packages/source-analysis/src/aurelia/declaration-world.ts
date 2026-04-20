import type { SourceFileRef, SymbolRef } from './refs.js';

export interface DeclarationExport {
  readonly name: string;
  readonly symbol: SymbolRef | null;
  readonly sourceFile: SourceFileRef | null;
}

export interface DeclarationWorldState {
  readonly ownerLabel: string;
  readonly exports: readonly DeclarationExport[];
}

// This is the first high-level read surface for "what exists here?" style
// questions. It intentionally stays small: export ownership and lookup only.
export class DeclarationWorld {
  private readonly exportsByName = new Map<string, DeclarationExport[]>();
  readonly ownerLabel: string;

  constructor(
    ownerLabel: string,
    exports: readonly DeclarationExport[] = [],
  ) {
    this.ownerLabel = ownerLabel;
    for (const current of exports) {
      this.addExport(current);
    }
  }

  addExport(
    current: DeclarationExport,
  ): this {
    const existing = this.exportsByName.get(current.name);
    if (existing == null) {
      this.exportsByName.set(current.name, [current]);
    } else {
      existing.push(current);
    }
    return this;
  }

  readExports(): readonly DeclarationExport[] {
    return [...this.exportsByName.values()].flatMap((current) => current);
  }

  readExportNames(): readonly string[] {
    return [...this.exportsByName.keys()].sort((left, right) => left.localeCompare(right));
  }

  findExports(
    name: string,
  ): readonly DeclarationExport[] {
    return [...(this.exportsByName.get(name) ?? [])];
  }

  hasExport(
    name: string,
  ): boolean {
    return this.exportsByName.has(name);
  }

  inspectState(): DeclarationWorldState {
    return {
      ownerLabel: this.ownerLabel,
      exports: this.readExports(),
    };
  }
}
