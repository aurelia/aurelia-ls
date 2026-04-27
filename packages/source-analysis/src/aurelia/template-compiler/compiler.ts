import type { TemplateInstruction } from './instructions.js';

export const TEMPLATE_COMPILER_PHASE_KINDS = [
  'resource-resolution',
  'attribute-mapping',
  'command-lowering',
  'instruction-emission',
  'recursive-compilation',
] as const;

export type TemplateCompilerPhaseKind =
  typeof TEMPLATE_COMPILER_PHASE_KINDS[number];

export const ATTRIBUTE_MAPPING_SCOPE_KINDS = [
  'global',
  'element',
  'two-way-predicate',
] as const;

export type AttributeMappingScopeKind =
  typeof ATTRIBUTE_MAPPING_SCOPE_KINDS[number];

export class AttributeMappingRule {
  readonly kind = 'attribute-mapping-rule' as const;

  constructor(
    readonly scope: AttributeMappingScopeKind,
    readonly elementName: string | null,
    readonly attributeName: string,
    readonly propertyKey: PropertyKey,
  ) {}
}
export class AttributeMapper {
  readonly kind = 'attribute-mapper' as const;

  constructor(
    readonly mappings: readonly AttributeMappingRule[] = [],
    readonly twoWayPredicates: readonly string[] = [],
  ) {}
}

export class TemplateCompilationResult {
  readonly kind = 'template-compilation-result' as const;

  constructor(
    readonly instructions: readonly (readonly TemplateInstruction[])[] = [],
    readonly surrogates: readonly TemplateInstruction[] = [],
    readonly dependencies: readonly object[] = [],
    readonly diagnostics: readonly object[] = [],
  ) {}
}
export class TemplateCompiler {
  readonly kind = 'template-compiler' as const;

  constructor(
    readonly phases: readonly TemplateCompilerPhaseKind[] = TEMPLATE_COMPILER_PHASE_KINDS,
    readonly attributeMapper: AttributeMapper = new AttributeMapper(),
  ) {}

  createResult(
    instructions: readonly (readonly TemplateInstruction[])[] = [],
    surrogates: readonly TemplateInstruction[] = [],
    dependencies: readonly object[] = [],
    diagnostics: readonly object[] = [],
  ): TemplateCompilationResult {
    return new TemplateCompilationResult(
      instructions,
      surrogates,
      dependencies,
      diagnostics,
    );
  }
}
