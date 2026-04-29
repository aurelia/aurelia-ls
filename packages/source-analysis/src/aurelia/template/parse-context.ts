import type { AddressHandle, ProductHandle } from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { InquiryLocus } from '../inquiry/locus.js';

export const enum TemplateParseConsumer {
  /** Produce compiler products and instructions for a closed template. */
  Compilation = 'compilation',
  /** Produce diagnostics and recovery facts. */
  Diagnostics = 'diagnostics',
  /** Produce completion candidates at a cursor/frontier. */
  Completion = 'completion',
  /** Produce hover/explanation facts for a source locus. */
  Hover = 'hover',
  /** Produce navigation or rename substrate facts. */
  Navigation = 'navigation',
  /** Produce AI/MCP app-map and architecture projections. */
  AppMap = 'app-map',
}

export const enum TemplateRecoveryPolicy {
  /** Treat malformed input as an error and avoid recovery-only products. */
  Strict = 'strict',
  /** Recover malformed input enough to continue semantic analysis. */
  Recover = 'recover',
  /** Recover around the active inquiry locus and preserve frontier candidates. */
  Frontier = 'frontier',
}

export const enum TemplateFrontierKind {
  /** No active frontier. */
  None = 'none',
  /** A zero-width source cursor controls partial parsing and candidates. */
  Cursor = 'cursor',
  /** A source range controls partial parsing, rename, or selection explanation. */
  Range = 'range',
}

export type TemplateParseContextField =
  | 'consumer'
  | 'recoveryPolicy'
  | 'frontier'
  | 'locus'
  | 'source';

/** Inquiry-controlled frontier for HTML, attribute, and expression parsing. */
export class TemplateParseFrontier {
  constructor(
    /** Frontier lane requested by the caller. */
    readonly frontierKind: TemplateFrontierKind,
    /** Inquiry locus that anchors the frontier, when one exists. */
    readonly locus: InquiryLocus | null,
    /** Source address for the frontier span or cursor, when already materialized. */
    readonly addressHandle: AddressHandle | null,
  ) {}
}

/** Reference to parser/lowering inquiry pressure without expanding the full product. */
export class TemplateParseContextReference {
  constructor(
    /** Product handle for the parse context. */
    readonly productHandle: ProductHandle,
    /** Consumer lane carried by the referenced context. */
    readonly consumer: TemplateParseConsumer,
    /** Recovery behavior carried by the referenced context. */
    readonly recoveryPolicy: TemplateRecoveryPolicy,
    /** Active frontier carried by the referenced context. */
    readonly frontier: TemplateParseFrontier,
    /** Source address for the template, expression, or fragment being parsed. */
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

/**
 * Parse context shared by the HTML parser, attribute classifier, expression parser, and lowering passes.
 *
 * This is not consumer policy. It carries the inquiry pressure that changes how much recovery/frontier state parser
 * substrates should preserve.
 */
export class TemplateParseContext {
  constructor(
    /** Product handle for the materialized-product envelope that represents this parse context. */
    readonly productHandle: ProductHandle,
    /** Consumer lane that requested parsing or lowering. */
    readonly consumer: TemplateParseConsumer,
    /** Recovery behavior requested for this parse/lowering pass. */
    readonly recoveryPolicy: TemplateRecoveryPolicy,
    /** Active cursor/range frontier, if any. */
    readonly frontier: TemplateParseFrontier,
    /** Source address for the template, expression, or fragment being parsed. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<TemplateParseContextField>[] = [],
  ) {}

  toReference(): TemplateParseContextReference {
    return new TemplateParseContextReference(
      this.productHandle,
      this.consumer,
      this.recoveryPolicy,
      this.frontier,
      this.sourceAddressHandle,
    );
  }
}
