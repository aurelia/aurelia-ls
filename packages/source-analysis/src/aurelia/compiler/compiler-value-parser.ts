import type { TemplateNodeRef } from '../refs.js';
import type { ExpressionType } from '../expression/ast.js';
import { SelectedExpressionEntryFamily } from '../expression/parse-selection.js';
import type { BindingCommandDefinition } from '../resources/index.js';

export const COMPILER_VALUE_PARSE_STATUS_KINDS = [
  'planned',
  'not-applicable',
  'open',
] as const;

export type CompilerValueParseStatusKind =
  typeof COMPILER_VALUE_PARSE_STATUS_KINDS[number];

export class CompilerValueParseRequest {
  constructor(
    readonly id: string,
    readonly rawValue: string,
    readonly entrySeed: string | null,
    readonly parserEntryFamily: ExpressionType | null,
    readonly parserSelection: SelectedExpressionEntryFamily | null,
    readonly command: BindingCommandDefinition | null = null,
    readonly source: TemplateNodeRef | null = null,
    readonly note: string | null = null,
  ) {}
}

export class CompilerValueParseResult {
  constructor(
    readonly status: CompilerValueParseStatusKind,
    readonly request: CompilerValueParseRequest | null,
    readonly note: string | null = null,
  ) {}
}

// This is a deliberate routing seam, not the full expression parser. Its job
// is to make parser-entry choice explicit now so later AST/value parsing lands
// in one stable home instead of leaking through command lowering ad hoc.
//
// TODO: The next honest spend is not "teach the parser about template syntax".
// It is to let compiler-side value routing publish real `ExpressionParseRequest`
// carriers over authored sites:
// - binding-command values
// - text interpolation
// - attribute interpolation
// - multi-binding segment values
//
// Keep text-vs-attribute interpolation provenance above the parser. Both route
// to the parser's interpolation family, but they materialize into different
// compiler products. Likewise, semicolon multi-binding splitting stays
// compiler-owned; the parser should see one value segment at a time, not the
// whole multi-binding string.
export class CompilerValueParser {
  planForBindingCommand(
    command: BindingCommandDefinition,
    rawValue: string,
    source: TemplateNodeRef | null = null,
  ): CompilerValueParseResult {
    const parserEntryFamily = normalizeParserEntrySeed(
      command.buildBasis.valueHandling.parserEntrySeed,
    );
    const parserSelection = parserEntryFamily == null
      ? null
      : new SelectedExpressionEntryFamily(parserEntryFamily);
    const request = new CompilerValueParseRequest(
      `compiler-value-parse-request:${command.id}:${command.buildBasis.valueHandling.kind}:${rawValue}`,
      rawValue,
      command.buildBasis.valueHandling.parserEntrySeed,
      parserEntryFamily,
      parserSelection,
      command,
      source,
      parserSelection == null
        ? 'Value-parse planning closed from binding-command build basis, but parser-entry seed still needs caller-side adjudication.'
        : 'Value-parse planning closed from binding-command build basis onto a canonical parser selection.',
    );

    switch (command.buildBasis.valueHandling.kind) {
      case 'raw-value-carry':
      case 'custom-expression-wrap':
      case 'not-applicable':
        return new CompilerValueParseResult(
          'not-applicable',
          request,
          'This binding-command family does not use builtin compile-time expression parsing on its build path.',
        );
      case 'open':
        return new CompilerValueParseResult(
          'open',
          request,
          'Value parsing stayed open because the binding-command build basis did not close value-handling behavior.',
        );
      default:
        return new CompilerValueParseResult(
          'planned',
          request,
          'Compile-time parse intent is known, but actual AST/value parsing still needs its own carrier layer.',
        );
    }
  }
}

function normalizeParserEntrySeed(
  entrySeed: string | null,
): ExpressionType | null {
  switch (entrySeed) {
    case 'etIsProperty':
    case 'IsProperty':
      return 'IsProperty';
    case 'etIsFunction':
    case 'IsFunction':
      return 'IsFunction';
    case 'etIsIterator':
    case 'IsIterator':
      return 'IsIterator';
    case 'etInterpolation':
    case 'Interpolation':
      return 'Interpolation';
    case 'etIsCustom':
    case 'IsCustom':
      return 'IsCustom';
    default:
      return null;
  }
}
