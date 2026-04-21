import type { AttributePatternDefinition } from '../resources/index.js';
import type { SourceNodeRef } from '../refs.js';

export const COMPILER_ATTRIBUTE_SYNTAX_PROVENANCE_KINDS = [
  'pattern-handler-return',
  'fallback-no-pattern',
  'ambiguous-candidate',
  'open-handler',
] as const;

export type CompilerAttributeSyntaxProvenanceKind =
  typeof COMPILER_ATTRIBUTE_SYNTAX_PROVENANCE_KINDS[number];

export class CompilerAttributeSyntaxProvenance {
  constructor(
    readonly kind: CompilerAttributeSyntaxProvenanceKind,
    readonly patternDefinition: AttributePatternDefinition | null = null,
    readonly handlerSource: SourceNodeRef | null = null,
    readonly returnSource: SourceNodeRef | null = null,
    readonly note: string | null = null,
  ) {}
}

export class CompilerAttributeSyntax {
  constructor(
    readonly rawName: string,
    readonly rawValue: string,
    readonly target: string,
    readonly command: string | null,
    readonly parts: readonly string[] | null = null,
    readonly provenance: CompilerAttributeSyntaxProvenance | null = null,
    readonly note: string | null = null,
  ) {}
}
