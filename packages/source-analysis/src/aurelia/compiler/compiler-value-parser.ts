import type { TemplateNodeRef } from '../refs.js';
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

// This is a deliberate stub seam, not the full expression parser. Its job is
// to make parser-entry choice explicit now so later AST/value parsing lands in
// one stable home instead of leaking through command lowering ad hoc.
export class CompilerValueParser {
  planForBindingCommand(
    command: BindingCommandDefinition,
    rawValue: string,
    source: TemplateNodeRef | null = null,
  ): CompilerValueParseResult {
    const request = new CompilerValueParseRequest(
      `compiler-value-parse-request:${command.id}:${command.buildBasis.valueHandling.kind}:${rawValue}`,
      rawValue,
      command.buildBasis.valueHandling.parserEntrySeed,
      command,
      source,
      'Value-parse planning closed from binding-command build basis.',
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
