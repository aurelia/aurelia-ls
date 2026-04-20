export const EXPORT_VALUE_SURFACE_KINDS = [
  'class-declaration',
  'function-declaration',
  'variable-declaration',
  'unknown',
] as const;

export type ExportValueSurfaceKind =
  typeof EXPORT_VALUE_SURFACE_KINDS[number];

export const EXPORT_VALUE_CHECK_KINDS = [
  'decorator',
  'static-$au',
  'registrable-metadata',
  'register-method',
  'convention',
] as const;

export type ExportValueCheckKind =
  typeof EXPORT_VALUE_CHECK_KINDS[number];

// This is the first intermediate layer above raw export identity. It does not
// classify Aurelia meaning yet; it only records the syntactic declaration
// surface we closed on and which deeper checks are directly justified from that
// surface. It is intentionally not a recovered runtime value shape.
export class ExportValueSurface {
  constructor(
    readonly kind: ExportValueSurfaceKind,
    readonly declarationKind: string | null,
    readonly requiredChecks: readonly ExportValueCheckKind[] = [],
  ) {}
}
