import type { AddressHandle, EvidenceHandle, IdentityHandle } from './handles.js';

/**
 * Evidence is a high-leverage unstable surface: it sits close to source reality, so it will evolve as materializers
 * learn more shapes. Keep it as witness data. Derived relationships belong in derivation/claims, unresolved
 * pressure belongs in open seams, and confidence or actionability belongs in inquiry answers.
 */

export const enum EvidenceRecordKind {
  /** A single witness that explains a semantic claim, derivation, product, or open seam. */
  EvidenceRecord = 'evidence-record',
  /** A compact grouping of witnesses that should travel together. */
  EvidenceSet = 'evidence-set',
}

export const enum EvidenceKind {
  /** Use when the witness type is not known yet. */
  Unknown = 'unknown',
  /** Syntax observed directly from TypeScript, JavaScript, HTML, CSS, or JSON source. */
  SourceObservation = 'source-observation',
  /** Semantic information observed through the checker, a scanner, or a prior analysis pass. */
  SemanticObservation = 'semantic-observation',
  /** Evidence flowing through Aurelia configuration or registration APIs. */
  ConfigurationFlow = 'configuration-flow',
  /** Evidence inferred from a convention rule rather than explicit source syntax. */
  Convention = 'convention',
  /** Evidence produced while recovering from incomplete or invalid template/expression input. */
  ParserRecovery = 'parser-recovery',
  /** Evidence produced by compiler or tooling generation policy. */
  Generated = 'generated',
  /** Evidence supplied by a package, host, runtime catalog, or external index. */
  External = 'external',
  /** Evidence based on meaningful absence, such as a missing explicit registration. */
  Absence = 'absence',
  /** Evidence that marks an unresolved question the analysis could not close. */
  Open = 'open',
}

export const enum EvidenceRole {
  /** The witness admits a source, package, project, or host input into the analysis world. */
  Admission = 'admission',
  /** The witness declares the thing, such as a class, decorator, or static definition. */
  Declaration = 'declaration',
  /** The witness uses or references the thing, such as markup using a custom element. */
  Usage = 'usage',
  /** The witness registers a resource, resolver, or service into a container/configuration. */
  Registration = 'registration',
  /** The witness participates in configuration flow such as app tasks or plugin setup. */
  Configuration = 'configuration',
  /** The witness contributes lexical, binding, or DI scope. */
  Scope = 'scope',
  /** The witness is an input to a compiler or analysis transformation. */
  TransformInput = 'transform-input',
  /** The witness is an output of a compiler or analysis transformation. */
  TransformOutput = 'transform-output',
  /** The witness explains a diagnostic or open seam. */
  Diagnostic = 'diagnostic',
}

/** Direct witness for a claim, derivation, materialized product, or open seam; not a confidence record. */
export class EvidenceRecord {
  /** String discriminator for serialized evidence records. */
  readonly kind = EvidenceRecordKind.EvidenceRecord;

  constructor(
    /** Store-local handle for this evidence record. */
    readonly handle: EvidenceHandle,
    /** Source of the witness, such as source syntax, convention, recovery, or generated output. */
    readonly evidenceKind: EvidenceKind,
    /** Roles this witness plays for the supported fact. */
    readonly roles: readonly EvidenceRole[],
    /** Short explanation suitable for AI app maps and diagnostic traces. */
    readonly summary: string,
    /** Optional concrete address handle where the witness can be inspected or navigated to. */
    readonly addressHandle: AddressHandle | null = null,
    /** Optional semantic identity handle directly witnessed by this record. */
    readonly identityHandle: IdentityHandle | null = null,
  ) {}
}

/** Group of evidence records that together explain one observation or derivation. */
export class EvidenceSet {
  /** String discriminator for serialized evidence-set records. */
  readonly kind = EvidenceRecordKind.EvidenceSet;

  constructor(
    /** Store-local handle for this evidence set. */
    readonly handle: EvidenceHandle,
    /** Evidence handles that should be considered together. */
    readonly evidenceHandles: readonly EvidenceHandle[] = [],
    /** Optional short explanation for the group as a whole. */
    readonly summary: string | null = null,
  ) {}
}
