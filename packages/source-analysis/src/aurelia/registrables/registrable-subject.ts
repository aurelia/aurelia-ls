import type { Export } from '../exports/index.js';
import type { SourceNodeRef } from '../refs.js';
import type { ResourceDefinitionKind } from '../resources/index.js';

export const REGISTRABLE_SUBJECT_KINDS = [
  // A DI service or implementation admitted directly into the container.
  // Examples: ExpressionParser, DirtyChecker, NodeObserverLocator.
  'service',
  // A renderer-like implementation export. Kept separate because renderers are
  // a recurring built-in family in Aurelia configuration bundles and they sit
  // on the instruction/render pipeline rather than the ordinary resource
  // lookup path.
  'renderer',
  // An export that already exposes a registry/register(container) surface.
  'registry',
  // A template-facing resource resolved through the local-or-root resource
  // policy. Examples: custom elements, custom attributes, template
  // controllers, value converters, binding behaviors.
  'template-resource',
  // A compiler-facing syntax or compile-pipeline resource. Examples:
  // attribute patterns and binding commands. These participate in template
  // syntax classification/lowering rather than ordinary template resource
  // lookup.
  'compiler-resource',
  // A bounded-but-unclosed admission result. This means the reference is real,
  // but the clean room cannot yet close what kind of registrable subject it is
  // without a deeper seam.
  'open',
] as const;

export type RegistrableSubjectKind =
  typeof REGISTRABLE_SUBJECT_KINDS[number];

// Pre-admission subject layer between raw configuration references and final
// family-specific convergence. This is intentionally coarser than final
// resource/registration meaning: it answers "what sort of registrable thing is
// this reference pointing at?" before later container-state or definition
// materialization, while still preserving the important split between
// container services, template resources, and compiler-facing syntax
// resources.
export class RegistrableSubject {
  constructor(
    readonly id: string,
    readonly source: SourceNodeRef,
    readonly referenceName: string,
    readonly kind: RegistrableSubjectKind,
    readonly resolvedExport: Export | null,
    readonly resourceKind: ResourceDefinitionKind | null = null,
    readonly note: string | null = null,
  ) {}
}
