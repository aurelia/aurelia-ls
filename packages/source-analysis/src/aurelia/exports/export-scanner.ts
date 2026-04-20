import type { DeclarationWorld, DeclarationExport } from '../declaration-world.js';
import { ExportClassification } from './contracts.js';
import type { Export } from './export.js';
import {
  ExportValueSurface,
  type ExportValueCheckKind,
} from './export-value-surface.js';

export interface ExportScannerOptions {
  readonly declarationWorld: DeclarationWorld;
}

export interface ExportScannerState {
  readonly declarationOwnerLabel: string;
}

// This seam owns the expensive cold path for export reads. Right now it only
// exposes declaration-world rows plus a stub classification hook so the
// higher-level export/query shape can harden before real export classification
// lands.
export class ExportScanner {
  private readonly declarationWorldValue: DeclarationWorld;

  constructor(
    options: ExportScannerOptions,
  ) {
    this.declarationWorldValue = options.declarationWorld;
  }

  scanAll(): readonly DeclarationExport[] {
    return this.declarationWorldValue.readExports();
  }

  readValueSurface(
    current: Export,
  ): ExportValueSurface {
    const declarationKind = current.symbol?.declaration?.nodeKind ?? null;

    if (declarationKind === 'ClassDeclaration') {
      return new ExportValueSurface(
        'class-declaration',
        declarationKind,
        [
          'decorator',
          'static-$au',
          'registrable-metadata',
          'convention',
        ] satisfies readonly ExportValueCheckKind[],
      );
    }

    if (declarationKind === 'FunctionDeclaration') {
      // TODO: exported function declarations in Aurelia often act as decorator
      // factories or helpers. Resource/configuration meaning only emerges after
      // body or returned-value recovery, so this syntax surface does not yet
      // justify deeper Aurelia checks on its own.
      return new ExportValueSurface(
        'function-declaration',
        declarationKind,
        [] satisfies readonly ExportValueCheckKind[],
      );
    }

    if (declarationKind === 'VariableDeclaration') {
      // TODO: exported variable declarations need initializer value-shape
      // recovery before we can honestly ask Aurelia-specific questions such as
      // "does this expose a register(container) surface?" or "does this hide a
      // class-backed resource definition?" Keeping this empty prevents syntax
      // shape from masquerading as semantic closure.
      return new ExportValueSurface(
        'variable-declaration',
        declarationKind,
        [] satisfies readonly ExportValueCheckKind[],
      );
    }

    return new ExportValueSurface('unknown', declarationKind, []);
  }

  classify(
    current: Export,
  ): ExportClassification {
    // TODO: a real export classifier should recover export route shape,
    // type/value/namespace posture, registry/configuration surfaces, and
    // resource candidacy. Returning unknown here is intentional until that
    // larger convergence algebra exists.
    const reasons = current.symbol == null
      ? ['Export has no closed symbol yet.']
      : ['Export classification has not been implemented yet.'];

    return new ExportClassification('unknown', reasons);
  }

  inspectState(): ExportScannerState {
    return {
      declarationOwnerLabel: this.declarationWorldValue.ownerLabel,
    };
  }
}
