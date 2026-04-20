import type { Export, Exports } from '../exports/index.js';
import type { ResourceCandidate } from './resource-candidate.js';

export interface ResourceRecognizerOptions {
  readonly exports: Exports;
}

export interface ResourceRecognizerState {
  readonly exportOwnerLabel: string;
}

// This seam sits between export value surfaces and final resource
// materialization. Once deeper value recovery exists, it should answer "which
// Aurelia recognition lanes are now in play?" before any convergence algebra
// tries to build a real definition.
export class ResourceRecognizer {
  private readonly exportsValue: Exports;

  constructor(
    options: ResourceRecognizerOptions,
  ) {
    this.exportsValue = options.exports;
  }

  recognizeAll(): readonly ResourceCandidate[] {
    return this.exportsValue.readAll().flatMap((current) => this.recognizeExport(current));
  }

  recognizeExport(
    current: Export,
  ): readonly ResourceCandidate[] {
    const surface = current.readValueSurface();

    // TODO: export-surface syntax alone is not enough to admit a resource
    // candidate honestly. We still need at least one deeper recovery layer for:
    // - class decorators / static $au / registrable metadata
    // - variable initializer value shape and returned registry/configuration
    // - definition-vs-type-vs-helper disambiguation
    //
    // Until that exists, returning no candidates is more truthful than
    // classifying declaration syntax as if it were Aurelia resource meaning.
    if (
      surface.kind === 'class-declaration'
      || surface.kind === 'function-declaration'
      || surface.kind === 'variable-declaration'
    ) {
      return [];
    }

    return [];
  }

  inspectState(): ResourceRecognizerState {
    return {
      exportOwnerLabel: this.exportsValue.ownerLabel,
    };
  }
}
