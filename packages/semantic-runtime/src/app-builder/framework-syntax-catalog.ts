import {
  TemplateSpecialAttributeName,
} from '../template/special-attribute-source.js';
import {
  AppBuilderPartApplicationSiteKind,
  AppBuilderPartOperationKind,
  AppBuilderPartSlotKind,
} from './part-application.js';

/** Framework-owned template syntax that is neither a resource, binding command, nor TypeScript API. */

/** Stable identity of one compiler-special template syntax part. */
export enum AppBuilderFrameworkSyntaxId {
  /** `as-element="name"` custom-element lookup alias. */
  AsElement = 'as-element',
  /** `containerless` usage-site custom-element hydration request. */
  Containerless = 'containerless',
}

/** One neutral framework syntax part backed by compiler control-flow semantics. */
export interface AppBuilderFrameworkSyntaxDescriptor {
  readonly id: AppBuilderFrameworkSyntaxId;
  readonly title: string;
  readonly summary: string;
  /** Compiler-special attribute name consumed before ordinary binding/resource lowering. */
  readonly specialAttributeName: TemplateSpecialAttributeName;
  /** Display-only syntax cue; lowering must use operation/slot metadata instead. */
  readonly syntaxCue: string;
  /** Source locus families where this syntax can be applied. */
  readonly applicationSites: readonly AppBuilderPartApplicationSiteKind[];
  /** Source-operation family for this compiler-owned syntax. */
  readonly operationKind: AppBuilderPartOperationKind;
  /** Slots required before this syntax can lower to source. */
  readonly requiredSlotKinds: readonly AppBuilderPartSlotKind[];
  /** Optional slots this syntax may accept for richer source generation. */
  readonly optionalSlotKinds: readonly AppBuilderPartSlotKind[];
}

export const APP_BUILDER_FRAMEWORK_SYNTAX: readonly AppBuilderFrameworkSyntaxDescriptor[] = [
  {
    id: AppBuilderFrameworkSyntaxId.AsElement,
    title: 'As Element',
    summary: 'Apply a custom-element resource to a different host tag through compiler element-definition aliasing.',
    specialAttributeName: TemplateSpecialAttributeName.AsElement,
    syntaxCue: 'as-element="RESOURCE"',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateAttribute],
    operationKind: AppBuilderPartOperationKind.ApplyFrameworkSyntax,
    requiredSlotKinds: [AppBuilderPartSlotKind.CustomElementResourceName],
    optionalSlotKinds: [],
  },
  {
    id: AppBuilderFrameworkSyntaxId.Containerless,
    title: 'Containerless Host',
    summary: 'Request containerless hydration for a custom element at its usage site.',
    specialAttributeName: TemplateSpecialAttributeName.Containerless,
    syntaxCue: 'containerless',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateAttribute],
    operationKind: AppBuilderPartOperationKind.ApplyFrameworkSyntax,
    requiredSlotKinds: [],
    optionalSlotKinds: [],
  },
];

/** Look up a compiler-special framework syntax descriptor by id. */
export function appBuilderFrameworkSyntaxDescriptor(id: AppBuilderFrameworkSyntaxId): AppBuilderFrameworkSyntaxDescriptor {
  const syntax = APP_BUILDER_FRAMEWORK_SYNTAX.find((candidate) => candidate.id === id);
  if (syntax == null) {
    throw new Error(`Unknown app-builder framework syntax '${id}'.`);
  }
  return syntax;
}
