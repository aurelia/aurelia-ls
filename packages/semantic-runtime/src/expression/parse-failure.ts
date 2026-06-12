import type { SourceSpan } from './source-span.js';
import {
  ParseCompanionState,
  type ParseCompanionStateInit,
} from './parse-companion-state.js';

interface ParseFailureInit extends ParseCompanionStateInit {
  readonly span: SourceSpan;
  readonly message: string;
  readonly text: string | null;
  readonly frameworkErrorCode?: string | null;
}

/**
 * Internal strict-parser hard failure.
 *
 * Hard failures mean the grammar core could not honestly preserve enough local
 * structure to publish companion truth.
 */
export class ParseHardFailure {
  constructor(
    readonly span: SourceSpan,
    readonly message: string,
    readonly text: string | null,
    readonly frameworkErrorCode: string | null = null,
  ) {}

  static create(
    span: SourceSpan,
    message: string,
    text: string | null,
    frameworkErrorCode: string | null = null,
  ): ParseHardFailure {
    return new ParseHardFailure(span, message, text, frameworkErrorCode);
  }
}

/**
 * Internal strict-parser failure that still carries honest companion truth.
 *
 * The strict grammar core unwinds through this class, then the public parser
 * boundary re-publishes the companion state through result-algebra carriers.
 *
 * TODO: If later parser work needs more than one retained candidate failure
 * (for example "best publication" plus sibling diagnostics), keep that as a
 * parser-local ranking/diagnostic structure beside this class instead of
 * turning `ParseCompanionFailure` into a bag of competing outcomes.
 */
export class ParseCompanionFailure {
  constructor(
    readonly span: SourceSpan,
    readonly message: string,
    readonly text: string | null,
    readonly companion: ParseCompanionState,
    readonly frameworkErrorCode: string | null = null,
  ) {}

  static degraded(init: ParseFailureInit): ParseCompanionFailure {
    return new ParseCompanionFailure(
      init.span,
      init.message,
      init.text,
      ParseCompanionState.degraded(init),
      init.frameworkErrorCode ?? null,
    );
  }

  static frontierOnly(init: ParseFailureInit): ParseCompanionFailure {
    return new ParseCompanionFailure(
      init.span,
      init.message,
      init.text,
      ParseCompanionState.frontierOnly(init),
      init.frameworkErrorCode ?? null,
    );
  }

  withCompanion(companion: ParseCompanionState): ParseCompanionFailure {
    return new ParseCompanionFailure(
      this.span,
      this.message,
      this.text,
      companion,
      this.frameworkErrorCode,
    );
  }
}

export type ParseFailure = ParseHardFailure | ParseCompanionFailure;
export type ParseOutcome<T> = T | ParseFailure;

export function isParseFailure(value: unknown): value is ParseFailure {
  return value instanceof ParseHardFailure || value instanceof ParseCompanionFailure;
}

export function isParseHardFailure(value: unknown): value is ParseHardFailure {
  return value instanceof ParseHardFailure;
}

export function isParseCompanionFailure(value: unknown): value is ParseCompanionFailure {
  return value instanceof ParseCompanionFailure;
}
