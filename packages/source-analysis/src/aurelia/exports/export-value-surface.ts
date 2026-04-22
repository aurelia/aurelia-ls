import type { SourceNodeRef, SymbolRef } from '../refs.js';

export const EXPORT_VALUE_SURFACE_KINDS = [
  'class-declaration',
  'function-declaration',
  'variable-declaration',
  'export-assignment',
  'unknown',
] as const;

export type ExportValueSurfaceKind =
  typeof EXPORT_VALUE_SURFACE_KINDS[number];

export const EXPORT_VALUE_CHECK_KINDS = [
  'decorator',
  'static-$au',
  'registrable-metadata',
  'register-method',
  'define-call',
  'convention',
] as const;

export type ExportValueCheckKind =
  typeof EXPORT_VALUE_CHECK_KINDS[number];

export const EXPORT_VALUE_SHAPE_KINDS = [
  'class-declaration',
  'class-expression',
  'resource-define-call',
  'open',
] as const;

export type ExportValueShapeKind =
  typeof EXPORT_VALUE_SHAPE_KINDS[number];

export const EXPORT_VALUE_DEFINE_CALL_RESOURCE_KINDS = [
  'custom-element',
  'custom-attribute',
  'template-controller',
  'value-converter',
  'binding-behavior',
  'binding-command',
] as const;

export type ExportValueDefineCallResourceKind =
  typeof EXPORT_VALUE_DEFINE_CALL_RESOURCE_KINDS[number];

export const EXPORT_VALUE_DEFINE_ARGUMENT_KINDS = [
  'string-literal',
  'object-literal',
  'missing',
  'open',
] as const;

export type ExportValueDefineArgumentKind =
  typeof EXPORT_VALUE_DEFINE_ARGUMENT_KINDS[number];

export const EXPORT_VALUE_DEFINE_TYPE_KINDS = [
  'inline-class',
  'local-class-reference',
  'generated-type',
  'export-result-reference',
  'open',
] as const;

export type ExportValueDefineTypeKind =
  typeof EXPORT_VALUE_DEFINE_TYPE_KINDS[number];

export class ExportValueDefineArgument {
  constructor(
    readonly kind: ExportValueDefineArgumentKind,
    readonly source: SourceNodeRef | null,
    readonly name: string | null = null,
    readonly note: string | null = null,
  ) {}
}

export class ExportValueDefineType {
  constructor(
    readonly kind: ExportValueDefineTypeKind,
    readonly source: SymbolRef | SourceNodeRef | null,
    readonly referenceName: string | null = null,
    readonly note: string | null = null,
  ) {}
}

export class ExportValueDefineCall {
  constructor(
    readonly resourceKind: ExportValueDefineCallResourceKind,
    readonly source: SourceNodeRef | null,
    readonly definitionArgument: ExportValueDefineArgument,
    readonly typeArgument: ExportValueDefineType,
    readonly note: string | null = null,
  ) {}
}

// This is the first intermediate layer above raw export identity. It does not
// classify Aurelia meaning yet; it only records the syntactic declaration
// surface we closed on and which deeper checks are directly justified from that
// surface. It is intentionally not a recovered runtime value shape.
export class ExportValueSurface {
  constructor(
    readonly kind: ExportValueSurfaceKind,
    readonly declarationKind: string | null,
    readonly requiredChecks: readonly ExportValueCheckKind[] = [],
    readonly resolvedShapeKind: ExportValueShapeKind = 'open',
    readonly defineCall: ExportValueDefineCall | null = null,
  ) {}
}
