export const enum KernelNoteRecordKind {
  /** Non-authoritative explanatory note for diagnostics, logs, or AI projections. */
  KernelNote = 'kernel-note',
}

/** Small explanatory note that must not carry semantic data or replace a named record. */
export class KernelNote {
  /** String discriminator for serialized note records. */
  readonly kind = KernelNoteRecordKind.KernelNote;

  constructor(
    /** Stable local note code for grouping; not a semantic predicate or rule kind. */
    readonly code: string,
    /** Short human-readable message for diagnostics, logs, or MCP output. */
    readonly message: string,
  ) {}
}
