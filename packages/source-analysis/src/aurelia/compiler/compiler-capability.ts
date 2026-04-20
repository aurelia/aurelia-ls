import type { AdmittedSubject } from '../admissions/index.js';

export const COMPILER_CAPABILITY_KINDS = [
  'binding-command',
  'attribute-pattern',
  'template-compiler-hook',
] as const;

export type CompilerCapabilityKind =
  typeof COMPILER_CAPABILITY_KINDS[number];

// This layer is intentionally shallow. It answers:
// - which compiler-root entries are admitted in the current configuration world
// without pretending to close command semantics, pattern semantics, or
// instruction-to-renderer hydration behavior.
export class BindingCommandCapability {
  readonly kind = 'binding-command' as const;

  constructor(
    readonly id: string,
    readonly sourceSubject: AdmittedSubject,
    readonly name: string | null,
    readonly aliases: readonly string[] = [],
    readonly note: string | null = null,
  ) {}
}

export class AttributePatternCapability {
  readonly kind = 'attribute-pattern' as const;

  constructor(
    readonly id: string,
    readonly sourceSubject: AdmittedSubject,
    readonly pattern: string | null,
    readonly symbols: readonly string[] = [],
    readonly note: string | null = null,
  ) {}
}

export class TemplateCompilerHookCapability {
  readonly kind = 'template-compiler-hook' as const;

  constructor(
    readonly id: string,
    readonly sourceSubject: AdmittedSubject,
    readonly hookName: string | null,
    readonly note: string | null = null,
  ) {}
}

export type CompilerCapability =
  | BindingCommandCapability
  | AttributePatternCapability
  | TemplateCompilerHookCapability;
