import { RuntimeBindingValueChannelKind } from '../observation/runtime-binding-observation.js';
import {
  BuiltInResourcePackage,
} from '../resources/built-in-resources.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import {
  type AppBuilderPartApplicationSiteKind,
  type AppBuilderPartOperationKind,
  type AppBuilderPartSlotKind,
  AppBuilderPartValueChannelResolutionKind,
} from './part-application.js';
import {
  appBuilderBuiltInResource,
  appBuilderBuiltInResourceDependency,
  type AppBuilderBuiltInResourceRef,
} from './part-resource.js';
import {
  appBuilderBuiltInBindingCommand,
  appBuilderBuiltInSyntaxDependency,
  type AppBuilderBuiltInBindingCommandRef,
} from './part-syntax.js';
import {
  APP_BUILDER_BINDING_BEHAVIORS,
  AppBuilderBindingBehaviorId,
  type AppBuilderBindingBehaviorDescriptor,
} from './binding-behavior-catalog.js';
import {
  APP_BUILDER_BINDING_PARTS,
  AppBuilderBindingPartId,
  type AppBuilderBindingPartDescriptor,
} from './binding-part-catalog.js';
import {
  APP_BUILDER_CONTROLS,
  AppBuilderControlId,
  type AppBuilderControlDescriptor,
} from './control-catalog.js';
import {
  APP_BUILDER_COMPONENT_LIFECYCLES,
  AppBuilderComponentLifecycleId,
  type AppBuilderComponentLifecycleDescriptor,
} from './component-lifecycle-catalog.js';
import {
  APP_BUILDER_FRAMEWORK_COMPONENTS,
  AppBuilderFrameworkComponentId,
  type AppBuilderFrameworkComponentDescriptor,
} from './framework-component-catalog.js';
import {
  APP_BUILDER_FRAMEWORK_SYNTAX,
  AppBuilderFrameworkSyntaxId,
  type AppBuilderFrameworkSyntaxDescriptor,
} from './framework-syntax-catalog.js';
import {
  APP_BUILDER_FRAMEWORK_APIS,
  AppBuilderFrameworkApiId,
  appBuilderFrameworkApiDependency,
  type AppBuilderFrameworkApiDescriptor,
} from './framework-api-catalog.js';
import {
  APP_BUILDER_RESOURCE_METADATA,
  AppBuilderResourceMetadataId,
  type AppBuilderResourceMetadataDescriptor,
} from './resource-metadata-catalog.js';
import {
  APP_BUILDER_STRUCTURAL_PARTS,
  AppBuilderStructuralPartId,
  type AppBuilderStructuralPartDescriptor,
} from './structural-part-catalog.js';
import {
  APP_BUILDER_VALUE_CONVERTERS,
  AppBuilderValueConverterId,
  type AppBuilderValueConverterDescriptor,
} from './value-converter-catalog.js';

/** Category of app-builder part exposed to callers before pattern composition. */
export enum AppBuilderPartKind {
  /** Native form-control part backed by element observers/value channels. */
  Control = 'control',
  /** Non-control binding surface such as text, event, ref, class, style, or attr binding. */
  BindingPart = 'binding-part',
  /** Template-controller control-flow part such as if, repeat, switch, promise, with, or portal. */
  StructuralPart = 'structural-part',
  /** Binding behavior resource applied with `& name`. */
  BindingBehavior = 'binding-behavior',
  /** Value converter resource applied with `| name`. */
  ValueConverter = 'value-converter',
  /** Framework-provided custom element or custom attribute. */
  FrameworkComponent = 'framework-component',
  /** Framework-owned template syntax that is not a resource or binding command. */
  FrameworkSyntax = 'framework-syntax',
  /** Framework TypeScript API such as a decorator or source helper. */
  FrameworkApi = 'framework-api',
  /** Resource-definition metadata such as local resource dependencies. */
  ResourceMetadata = 'resource-metadata',
  /** Component view-model lifecycle method such as attached or detaching. */
  ComponentLifecycle = 'component-lifecycle',
}

/** AI-facing posture for whether app-builder should proactively offer a part in source-starting menus. */
export enum AppBuilderPartAuthoringTier {
  /** Preferred default for generated app code because it is compact, common, and durable in large apps. */
  Preferred = 'preferred',
  /** Available when caller intent, package selection, or existing app context asks for this capability. */
  IntentScoped = 'intent-scoped',
  /** Supported as a framework capability or pressure surface, but not a default app-builder recommendation. */
  Advanced = 'advanced',
}

/** Stable value list for public app-builder authoring-tier input schemas. */
export const APP_BUILDER_PART_AUTHORING_TIERS = [
  AppBuilderPartAuthoringTier.Preferred,
  AppBuilderPartAuthoringTier.IntentScoped,
  AppBuilderPartAuthoringTier.Advanced,
] as const;

/** Stable value list for public app-builder part-kind input schemas. */
export const APP_BUILDER_PART_KINDS = [
  AppBuilderPartKind.Control,
  AppBuilderPartKind.BindingPart,
  AppBuilderPartKind.StructuralPart,
  AppBuilderPartKind.BindingBehavior,
  AppBuilderPartKind.ValueConverter,
  AppBuilderPartKind.FrameworkComponent,
  AppBuilderPartKind.FrameworkSyntax,
  AppBuilderPartKind.FrameworkApi,
  AppBuilderPartKind.ResourceMetadata,
  AppBuilderPartKind.ComponentLifecycle,
] as const;

/** Stable app-builder part detail carried by the category-specific catalogs. */
export type AppBuilderPartDetail =
  | AppBuilderControlDescriptor
  | AppBuilderBindingPartDescriptor
  | AppBuilderStructuralPartDescriptor
  | AppBuilderBindingBehaviorDescriptor
  | AppBuilderValueConverterDescriptor
  | AppBuilderFrameworkComponentDescriptor
  | AppBuilderFrameworkSyntaxDescriptor
  | AppBuilderFrameworkApiDescriptor
  | AppBuilderResourceMetadataDescriptor
  | AppBuilderComponentLifecycleDescriptor;

/** Stable app-builder part identity value across all category-specific catalogs. */
export type AppBuilderPartId =
  | `${AppBuilderControlId}`
  | `${AppBuilderBindingPartId}`
  | `${AppBuilderStructuralPartId}`
  | `${AppBuilderBindingBehaviorId}`
  | `${AppBuilderValueConverterId}`
  | `${AppBuilderFrameworkComponentId}`
  | `${AppBuilderFrameworkSyntaxId}`
  | `${AppBuilderFrameworkApiId}`
  | `${AppBuilderResourceMetadataId}`
  | `${AppBuilderComponentLifecycleId}`;

/** Shared part row fields before the category-specific detail is threaded in. */
interface AppBuilderPartDescriptorBase<
  TKind extends AppBuilderPartKind,
  TId extends AppBuilderPartId,
  TDetail extends AppBuilderPartDetail,
> {
  readonly kind: TKind;
  readonly id: TId;
  readonly title: string;
  readonly summary: string;
  /** Whether app-builder should surface this part by default, by matching intent, or only for advanced requests. */
  readonly authoringTier: AppBuilderPartAuthoringTier;
  /** Display-only syntax cues; source lowering must use operation/site/slot metadata instead. */
  readonly syntaxCues: readonly string[];
  /** Source locus families where this part can be applied. */
  readonly applicationSites: readonly AppBuilderPartApplicationSiteKind[];
  /** Source-lowering operation family for this part. */
  readonly operationKind: AppBuilderPartOperationKind;
  /** Slots required before this part can lower to source. */
  readonly requiredSlotKinds: readonly AppBuilderPartSlotKind[];
  /** Optional slots accepted by this part for richer source generation. */
  readonly optionalSlotKinds: readonly AppBuilderPartSlotKind[];
  /** How the listed value channels become concrete runtime binding channels. */
  readonly valueChannelResolution: AppBuilderPartValueChannelResolutionKind;
  /** Aurelia value-channel kinds realized by the part or selected later by target/observer resolution. */
  readonly valueChannels: readonly RuntimeBindingValueChannelKind[];
  /** Built-in resource name, when the part is backed by the resource registry. */
  readonly resourceName: string | null;
  /** Built-in resource kind, when the part is backed by the resource registry. */
  readonly resourceKind: ResourceDefinitionKind | null;
  /** Built-in resource package, when the part is backed by the resource registry. */
  readonly resourcePackageId: BuiltInResourcePackage | null;
  /** Built-in resource target class name, when the catalog entry resolves. */
  readonly resourceTargetName: string | null;
  /** Built-in resource aliases, when the catalog entry resolves. */
  readonly resourceAliases: readonly string[];
  /** Built-in binding-command name, when the part lowers through command syntax. */
  readonly syntaxCommandName: AppBuilderBuiltInBindingCommandRef['name'] | null;
  /** Built-in syntax package, when the part lowers through command syntax. */
  readonly syntaxCommandPackageId: string | null;
  /** Built-in binding-command target class name, when the catalog entry resolves. */
  readonly syntaxCommandTargetName: string | null;
  /** Compiler-special template attribute name, when the part is framework syntax. */
  readonly frameworkSyntaxName: string | null;
  /** Exported framework API name, when the part is backed by a TypeScript API. */
  readonly frameworkApiName: string | null;
  /** Module specifier for a framework API import, when applicable. */
  readonly frameworkApiModuleSpecifier: string | null;
  /** Resource definition metadata property name, when the part writes metadata. */
  readonly resourceMetadataName: string | null;
  /** Component lifecycle hook method name, when the part writes a view-model hook. */
  readonly componentLifecycleHookName: string | null;
  /** Package/module specifier that must be admitted before the part can be used. */
  readonly requiredPackageSpecifier: string | null;
  /** Category-specific descriptor for callers that need the finer detail. */
  readonly detail: TDetail;
}

/** Native form-control part backed by element observers/value channels. */
export type AppBuilderControlPartDescriptor = AppBuilderPartDescriptorBase<
  AppBuilderPartKind.Control,
  `${AppBuilderControlId}`,
  AppBuilderControlDescriptor
>;

/** Non-control binding surface such as text, event, ref, class, style, or attr binding. */
export type AppBuilderBindingPartPartDescriptor = AppBuilderPartDescriptorBase<
  AppBuilderPartKind.BindingPart,
  `${AppBuilderBindingPartId}`,
  AppBuilderBindingPartDescriptor
>;

/** Template-controller control-flow part such as if, repeat, switch, promise, with, or portal. */
export type AppBuilderStructuralPartPartDescriptor = AppBuilderPartDescriptorBase<
  AppBuilderPartKind.StructuralPart,
  `${AppBuilderStructuralPartId}`,
  AppBuilderStructuralPartDescriptor
>;

/** Binding behavior resource applied with `& name`. */
export type AppBuilderBindingBehaviorPartDescriptor = AppBuilderPartDescriptorBase<
  AppBuilderPartKind.BindingBehavior,
  `${AppBuilderBindingBehaviorId}`,
  AppBuilderBindingBehaviorDescriptor
>;

/** Value converter resource applied with `| name`. */
export type AppBuilderValueConverterPartDescriptor = AppBuilderPartDescriptorBase<
  AppBuilderPartKind.ValueConverter,
  `${AppBuilderValueConverterId}`,
  AppBuilderValueConverterDescriptor
>;

/** Framework-provided custom element or custom attribute. */
export type AppBuilderFrameworkComponentPartDescriptor = AppBuilderPartDescriptorBase<
  AppBuilderPartKind.FrameworkComponent,
  `${AppBuilderFrameworkComponentId}`,
  AppBuilderFrameworkComponentDescriptor
>;

/** Framework-owned template syntax that is not a resource or binding command. */
export type AppBuilderFrameworkSyntaxPartDescriptor = AppBuilderPartDescriptorBase<
  AppBuilderPartKind.FrameworkSyntax,
  `${AppBuilderFrameworkSyntaxId}`,
  AppBuilderFrameworkSyntaxDescriptor
>;

/** Framework TypeScript API such as a decorator or source helper. */
export type AppBuilderFrameworkApiPartDescriptor = AppBuilderPartDescriptorBase<
  AppBuilderPartKind.FrameworkApi,
  `${AppBuilderFrameworkApiId}`,
  AppBuilderFrameworkApiDescriptor
>;

/** Resource-definition metadata such as local resource dependencies. */
export type AppBuilderResourceMetadataPartDescriptor = AppBuilderPartDescriptorBase<
  AppBuilderPartKind.ResourceMetadata,
  `${AppBuilderResourceMetadataId}`,
  AppBuilderResourceMetadataDescriptor
>;

/** Component view-model lifecycle method such as attached or detaching. */
export type AppBuilderComponentLifecyclePartDescriptor = AppBuilderPartDescriptorBase<
  AppBuilderPartKind.ComponentLifecycle,
  `${AppBuilderComponentLifecycleId}`,
  AppBuilderComponentLifecycleDescriptor
>;

/** One app-builder part projected into the common query shape. */
export type AppBuilderPartDescriptor =
  | AppBuilderControlPartDescriptor
  | AppBuilderBindingPartPartDescriptor
  | AppBuilderStructuralPartPartDescriptor
  | AppBuilderBindingBehaviorPartDescriptor
  | AppBuilderValueConverterPartDescriptor
  | AppBuilderFrameworkComponentPartDescriptor
  | AppBuilderFrameworkSyntaxPartDescriptor
  | AppBuilderFrameworkApiPartDescriptor
  | AppBuilderResourceMetadataPartDescriptor
  | AppBuilderComponentLifecyclePartDescriptor;

/** Common app-builder part rows assembled from the category catalogs. */
export const APP_BUILDER_PARTS: readonly AppBuilderPartDescriptor[] = [
  ...APP_BUILDER_CONTROLS.map((control): AppBuilderPartDescriptor => syntaxBackedPartDescriptor({
    kind: AppBuilderPartKind.Control,
    id: control.id,
    title: control.title,
    summary: control.summary,
    syntaxCues: [control.syntaxCue],
    applicationSites: control.applicationSites,
    operationKind: control.operationKind,
    requiredSlotKinds: control.requiredSlotKinds,
    optionalSlotKinds: control.optionalSlotKinds,
    valueChannelResolution: control.valueChannelResolution,
    valueChannels: control.valueChannels,
    syntax: control.syntax,
    detail: control,
  })),
  ...APP_BUILDER_BINDING_PARTS.map((part): AppBuilderPartDescriptor => syntaxBackedPartDescriptor({
    kind: AppBuilderPartKind.BindingPart,
    id: part.id,
    title: part.title,
    summary: part.summary,
    syntaxCues: [part.syntaxCue],
    applicationSites: part.applicationSites,
    operationKind: part.operationKind,
    requiredSlotKinds: part.requiredSlotKinds,
    optionalSlotKinds: part.optionalSlotKinds,
    valueChannelResolution: part.valueChannelResolution,
    valueChannels: part.valueChannels,
    syntax: part.syntax ?? null,
    detail: part,
  })),
  ...APP_BUILDER_STRUCTURAL_PARTS.map((part): AppBuilderPartDescriptor => resourceBackedPartDescriptor({
    kind: AppBuilderPartKind.StructuralPart,
    id: part.id,
    title: part.title,
    summary: part.summary,
    syntaxCues: [part.syntaxCue],
    applicationSites: part.applicationSites,
    operationKind: part.operationKind,
    requiredSlotKinds: part.requiredSlotKinds,
    optionalSlotKinds: part.optionalSlotKinds,
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.NotApplicable,
    valueChannels: [],
    resource: part.resource,
    detail: part,
  })),
  ...APP_BUILDER_BINDING_BEHAVIORS.map((behavior): AppBuilderPartDescriptor => resourceBackedPartDescriptor({
    kind: AppBuilderPartKind.BindingBehavior,
    id: behavior.id,
    title: behavior.title,
    summary: behavior.summary,
    syntaxCues: [behavior.syntaxCue],
    applicationSites: behavior.applicationSites,
    operationKind: behavior.operationKind,
    requiredSlotKinds: behavior.requiredSlotKinds,
    optionalSlotKinds: behavior.optionalSlotKinds,
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.NotApplicable,
    valueChannels: [],
    resource: behavior.resource,
    detail: behavior,
  })),
  ...APP_BUILDER_VALUE_CONVERTERS.map((converter): AppBuilderPartDescriptor => resourceBackedPartDescriptor({
    kind: AppBuilderPartKind.ValueConverter,
    id: converter.id,
    title: converter.title,
    summary: converter.summary,
    syntaxCues: [converter.syntaxCue],
    applicationSites: converter.applicationSites,
    operationKind: converter.operationKind,
    requiredSlotKinds: converter.requiredSlotKinds,
    optionalSlotKinds: converter.optionalSlotKinds,
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.NotApplicable,
    valueChannels: [],
    resource: converter.resource,
    detail: converter,
  })),
  ...APP_BUILDER_FRAMEWORK_COMPONENTS.map((component): AppBuilderPartDescriptor => resourceBackedPartDescriptor({
    kind: AppBuilderPartKind.FrameworkComponent,
    id: component.id,
    title: component.title,
    summary: component.summary,
    syntaxCues: [component.syntaxCue],
    applicationSites: component.applicationSites,
    operationKind: component.operationKind,
    requiredSlotKinds: component.requiredSlotKinds,
    optionalSlotKinds: component.optionalSlotKinds,
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.NotApplicable,
    valueChannels: [],
    resource: component.resource,
    detail: component,
  })),
  ...APP_BUILDER_FRAMEWORK_SYNTAX.map((syntax): AppBuilderPartDescriptor => frameworkSyntaxPartDescriptor({
    kind: AppBuilderPartKind.FrameworkSyntax,
    id: syntax.id,
    title: syntax.title,
    summary: syntax.summary,
    syntaxCues: [syntax.syntaxCue],
    applicationSites: syntax.applicationSites,
    operationKind: syntax.operationKind,
    requiredSlotKinds: syntax.requiredSlotKinds,
    optionalSlotKinds: syntax.optionalSlotKinds,
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.NotApplicable,
    detail: syntax,
  })),
  ...APP_BUILDER_FRAMEWORK_APIS.map((api): AppBuilderPartDescriptor => frameworkApiPartDescriptor({
    kind: AppBuilderPartKind.FrameworkApi,
    id: api.id,
    title: api.title,
    summary: api.summary,
    syntaxCues: [api.syntaxCue],
    applicationSites: api.applicationSites,
    operationKind: api.operationKind,
    requiredSlotKinds: api.requiredSlotKinds,
    optionalSlotKinds: api.optionalSlotKinds,
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.NotApplicable,
    detail: api,
  })),
  ...APP_BUILDER_RESOURCE_METADATA.map((metadata): AppBuilderPartDescriptor => resourceMetadataPartDescriptor({
    kind: AppBuilderPartKind.ResourceMetadata,
    id: metadata.id,
    title: metadata.title,
    summary: metadata.summary,
    syntaxCues: [metadata.syntaxCue],
    applicationSites: metadata.applicationSites,
    operationKind: metadata.operationKind,
    requiredSlotKinds: metadata.requiredSlotKinds,
    optionalSlotKinds: metadata.optionalSlotKinds,
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.NotApplicable,
    detail: metadata,
  })),
  ...APP_BUILDER_COMPONENT_LIFECYCLES.map((lifecycle): AppBuilderPartDescriptor => componentLifecyclePartDescriptor({
    kind: AppBuilderPartKind.ComponentLifecycle,
    id: lifecycle.id,
    title: lifecycle.title,
    summary: lifecycle.summary,
    syntaxCues: [lifecycle.syntaxCue],
    applicationSites: lifecycle.applicationSites,
    operationKind: lifecycle.operationKind,
    requiredSlotKinds: lifecycle.requiredSlotKinds,
    optionalSlotKinds: lifecycle.optionalSlotKinds,
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.NotApplicable,
    detail: lifecycle,
  })),
];

/** Stable value list for public app-builder part-id schemas. */
export const APP_BUILDER_PART_IDS = APP_BUILDER_PARTS.map((part) => part.id);

/** Classify one part for AI-facing recommendation without limiting semantic-runtime framework understanding. */
export function appBuilderPartAuthoringTier(
  kind: AppBuilderPartKind,
  id: AppBuilderPartId,
): AppBuilderPartAuthoringTier {
  switch (kind) {
    case AppBuilderPartKind.Control:
      return AppBuilderPartAuthoringTier.Preferred;
    case AppBuilderPartKind.BindingPart:
      return bindingPartAuthoringTier(id);
    case AppBuilderPartKind.StructuralPart:
      return structuralPartAuthoringTier(id);
    case AppBuilderPartKind.FrameworkComponent:
      return frameworkComponentAuthoringTier(id);
    case AppBuilderPartKind.BindingBehavior:
    case AppBuilderPartKind.ValueConverter:
    case AppBuilderPartKind.FrameworkApi:
    case AppBuilderPartKind.ResourceMetadata:
    case AppBuilderPartKind.ComponentLifecycle:
      return AppBuilderPartAuthoringTier.IntentScoped;
    case AppBuilderPartKind.FrameworkSyntax:
      return AppBuilderPartAuthoringTier.Advanced;
  }
}

function bindingPartAuthoringTier(
  id: AppBuilderPartId,
): AppBuilderPartAuthoringTier {
  switch (id) {
    case AppBuilderBindingPartId.TextInterpolation:
    case AppBuilderBindingPartId.EventListener:
    case AppBuilderBindingPartId.ClassListBinding:
    case AppBuilderBindingPartId.ClassTokenToggle:
    case AppBuilderBindingPartId.StyleRulesBinding:
    case AppBuilderBindingPartId.StylePropertyBinding:
    case AppBuilderBindingPartId.AttributeBinding:
    case AppBuilderBindingPartId.AttributeToViewBinding:
    case AppBuilderBindingPartId.LetBinding:
      return AppBuilderPartAuthoringTier.Preferred;
    case AppBuilderBindingPartId.StateBinding:
    case AppBuilderBindingPartId.StateDispatch:
    case AppBuilderBindingPartId.Translation:
    case AppBuilderBindingPartId.DynamicTranslation:
    case AppBuilderBindingPartId.TranslationParameters:
      return AppBuilderPartAuthoringTier.IntentScoped;
    case AppBuilderBindingPartId.EventCaptureListener:
    case AppBuilderBindingPartId.ElementRef:
    case AppBuilderBindingPartId.ElementModelValue:
    case AppBuilderBindingPartId.CustomMatcher:
      return AppBuilderPartAuthoringTier.Advanced;
  }
  return AppBuilderPartAuthoringTier.IntentScoped;
}

function structuralPartAuthoringTier(
  id: AppBuilderPartId,
): AppBuilderPartAuthoringTier {
  switch (id) {
    case AppBuilderStructuralPartId.Conditional:
    case AppBuilderStructuralPartId.ConditionalElse:
    case AppBuilderStructuralPartId.Repeat:
    case AppBuilderStructuralPartId.ValueScope:
      return AppBuilderPartAuthoringTier.Preferred;
    case AppBuilderStructuralPartId.Switch:
    case AppBuilderStructuralPartId.SwitchCase:
    case AppBuilderStructuralPartId.SwitchDefault:
    case AppBuilderStructuralPartId.Promise:
    case AppBuilderStructuralPartId.PromisePending:
    case AppBuilderStructuralPartId.PromiseFulfilled:
    case AppBuilderStructuralPartId.PromiseRejected:
      return AppBuilderPartAuthoringTier.IntentScoped;
    case AppBuilderStructuralPartId.VirtualRepeat:
    case AppBuilderStructuralPartId.Portal:
      return AppBuilderPartAuthoringTier.Advanced;
  }
  return AppBuilderPartAuthoringTier.IntentScoped;
}

function frameworkComponentAuthoringTier(
  id: AppBuilderPartId,
): AppBuilderPartAuthoringTier {
  switch (id) {
    case AppBuilderFrameworkComponentId.Focus:
    case AppBuilderFrameworkComponentId.Show:
      return AppBuilderPartAuthoringTier.Preferred;
    case AppBuilderFrameworkComponentId.Viewport:
    case AppBuilderFrameworkComponentId.Load:
    case AppBuilderFrameworkComponentId.Href:
    case AppBuilderFrameworkComponentId.ValidationErrors:
    case AppBuilderFrameworkComponentId.ValidationContainer:
      return AppBuilderPartAuthoringTier.IntentScoped;
    case AppBuilderFrameworkComponentId.AuCompose:
    case AppBuilderFrameworkComponentId.AuSlot:
      return AppBuilderPartAuthoringTier.Advanced;
  }
  return AppBuilderPartAuthoringTier.IntentScoped;
}

/** App-builder part catalog issue categories. */
export enum AppBuilderPartCatalogIssueKind {
  /** A resource-backed part does not match the built-in resource registry. */
  MissingBuiltInResource = 'missing-built-in-resource',
  /** A syntax-backed part does not match the built-in syntax registry. */
  MissingBuiltInBindingCommand = 'missing-built-in-binding-command',
  /** A value-channel-producing part does not declare any realized or candidate value channels. */
  MissingValueChannelCandidates = 'missing-value-channel-candidates',
  /** A part marked not-applicable declares value channels anyway. */
  UnexpectedValueChannelCandidates = 'unexpected-value-channel-candidates',
}

/** Conformance issue for the app-builder part catalog. */
export interface AppBuilderPartCatalogIssue {
  readonly issueKind: AppBuilderPartCatalogIssueKind;
  readonly partKind: AppBuilderPartKind;
  readonly partId: AppBuilderPartId;
  readonly resourcePackageId: BuiltInResourcePackage | null;
  readonly resourceName: string | null;
  readonly resourceKind: ResourceDefinitionKind | null;
  readonly syntaxPackageId: string | null;
  readonly syntaxCommandName: AppBuilderBuiltInBindingCommandRef['name'] | null;
  readonly valueChannelResolution: AppBuilderPartValueChannelResolutionKind;
  readonly valueChannelCount: number;
}

/** Read part rows, optionally restricted by part kind. */
export function appBuilderPartDescriptors(kind?: AppBuilderPartKind): readonly AppBuilderPartDescriptor[] {
  return kind === undefined
    ? APP_BUILDER_PARTS
    : APP_BUILDER_PARTS.filter((part) => part.kind === kind);
}

/** Look up a part by its common category and id. */
export function appBuilderPartDescriptor(
  kind: AppBuilderPartKind,
  id: AppBuilderPartId,
): AppBuilderPartDescriptor {
  const part = tryAppBuilderPartDescriptor(kind, id);
  if (part == null) {
    throw new Error(`Unknown app-builder part '${kind}:${id}'.`);
  }
  return part;
}

/** Try to look up a part by its common category and id without throwing for caller-supplied input. */
export function tryAppBuilderPartDescriptor(
  kind: AppBuilderPartKind,
  id: AppBuilderPartId,
): AppBuilderPartDescriptor | null {
  return APP_BUILDER_PARTS.find((candidate) => candidate.kind === kind && candidate.id === id) ?? null;
}

/** Check resource-backed part rows against the built-in resource registry. */
export function appBuilderPartCatalogIssues(): readonly AppBuilderPartCatalogIssue[] {
  const issues: AppBuilderPartCatalogIssue[] = [];
  for (const part of APP_BUILDER_PARTS) {
    const hasResourceRef = part.resourceName != null && part.resourceKind != null && part.resourcePackageId != null;
    if (hasResourceRef && part.resourceTargetName == null) {
      issues.push({
        issueKind: AppBuilderPartCatalogIssueKind.MissingBuiltInResource,
        partKind: part.kind,
        partId: part.id,
        resourcePackageId: part.resourcePackageId,
        resourceName: part.resourceName,
        resourceKind: part.resourceKind,
        syntaxPackageId: null,
        syntaxCommandName: null,
        valueChannelResolution: part.valueChannelResolution,
        valueChannelCount: part.valueChannels.length,
      });
    }
    if (part.syntaxCommandName != null && part.syntaxCommandTargetName == null) {
      issues.push({
        issueKind: AppBuilderPartCatalogIssueKind.MissingBuiltInBindingCommand,
        partKind: part.kind,
        partId: part.id,
        resourcePackageId: null,
        resourceName: null,
        resourceKind: null,
        syntaxPackageId: part.syntaxCommandPackageId,
        syntaxCommandName: part.syntaxCommandName,
        valueChannelResolution: part.valueChannelResolution,
        valueChannelCount: part.valueChannels.length,
      });
    }
    if (
      part.valueChannelResolution !== AppBuilderPartValueChannelResolutionKind.NotApplicable
      && part.valueChannels.length === 0
    ) {
      issues.push({
        issueKind: AppBuilderPartCatalogIssueKind.MissingValueChannelCandidates,
        partKind: part.kind,
        partId: part.id,
        resourcePackageId: part.resourcePackageId,
        resourceName: part.resourceName,
        resourceKind: part.resourceKind,
        syntaxPackageId: part.syntaxCommandPackageId,
        syntaxCommandName: part.syntaxCommandName,
        valueChannelResolution: part.valueChannelResolution,
        valueChannelCount: part.valueChannels.length,
      });
    }
    if (
      part.valueChannelResolution === AppBuilderPartValueChannelResolutionKind.NotApplicable
      && part.valueChannels.length > 0
    ) {
      issues.push({
        issueKind: AppBuilderPartCatalogIssueKind.UnexpectedValueChannelCandidates,
        partKind: part.kind,
        partId: part.id,
        resourcePackageId: part.resourcePackageId,
        resourceName: part.resourceName,
        resourceKind: part.resourceKind,
        syntaxPackageId: part.syntaxCommandPackageId,
        syntaxCommandName: part.syntaxCommandName,
        valueChannelResolution: part.valueChannelResolution,
        valueChannelCount: part.valueChannels.length,
      });
    }
  }
  return issues;
}

/** Throw when the common part catalog drifts from the built-in resource registry. */
export function assertAppBuilderPartCatalogIntegrity(): void {
  const issues = appBuilderPartCatalogIssues();
  if (issues.length === 0) {
    return;
  }
  throw new Error(
    `App-builder part catalog has ${issues.length} resource issue(s): ${issues
      .map((issue) => issue.issueKind === AppBuilderPartCatalogIssueKind.MissingBuiltInResource
        ? `${issue.partKind}:${issue.partId}->${issue.resourcePackageId}:${issue.resourceKind}:${issue.resourceName}`
        : issue.issueKind === AppBuilderPartCatalogIssueKind.MissingBuiltInBindingCommand
          ? `${issue.partKind}:${issue.partId}->syntax:${issue.syntaxPackageId}:${issue.syntaxCommandName}`
          : `${issue.partKind}:${issue.partId}->value-channel:${issue.valueChannelResolution}:${issue.valueChannelCount}`)
      .join(', ')}`,
  );
}

interface ResourceBackedPartDescriptorInput<
  TKind extends AppBuilderPartKind,
  TId extends AppBuilderPartId,
  TDetail extends AppBuilderPartDetail,
> {
  readonly kind: TKind;
  readonly id: TId;
  readonly title: string;
  readonly summary: string;
  readonly syntaxCues: readonly string[];
  readonly applicationSites: readonly AppBuilderPartApplicationSiteKind[];
  readonly operationKind: AppBuilderPartOperationKind;
  readonly requiredSlotKinds: readonly AppBuilderPartSlotKind[];
  readonly optionalSlotKinds: readonly AppBuilderPartSlotKind[];
  readonly valueChannelResolution: AppBuilderPartValueChannelResolutionKind;
  readonly valueChannels: readonly RuntimeBindingValueChannelKind[];
  readonly resource: AppBuilderBuiltInResourceRef;
  readonly detail: TDetail;
}

function resourceBackedPartDescriptor<
  TKind extends AppBuilderPartKind,
  TId extends AppBuilderPartId,
  TDetail extends AppBuilderPartDetail,
>(
  input: ResourceBackedPartDescriptorInput<TKind, TId, TDetail>,
): AppBuilderPartDescriptorBase<TKind, TId, TDetail> {
  const resource = appBuilderBuiltInResource(input.resource);
  return {
    kind: input.kind,
    id: input.id,
    title: input.title,
    summary: input.summary,
    authoringTier: appBuilderPartAuthoringTier(input.kind, input.id),
    syntaxCues: input.syntaxCues,
    applicationSites: input.applicationSites,
    operationKind: input.operationKind,
    requiredSlotKinds: input.requiredSlotKinds,
    optionalSlotKinds: input.optionalSlotKinds,
    valueChannelResolution: input.valueChannelResolution,
    valueChannels: input.valueChannels,
    resourceName: input.resource.name,
    resourceKind: input.resource.resourceKind,
    resourcePackageId: input.resource.packageId,
    resourceTargetName: resource?.targetName ?? null,
    resourceAliases: resource?.aliases ?? [],
    syntaxCommandName: null,
    syntaxCommandPackageId: null,
    syntaxCommandTargetName: null,
    frameworkSyntaxName: null,
    frameworkApiName: null,
    frameworkApiModuleSpecifier: null,
    resourceMetadataName: null,
    componentLifecycleHookName: null,
    requiredPackageSpecifier: appBuilderBuiltInResourceDependency(input.resource),
    detail: input.detail,
  };
}

interface SyntaxBackedPartDescriptorInput<
  TKind extends AppBuilderPartKind,
  TId extends AppBuilderPartId,
  TDetail extends AppBuilderPartDetail,
> {
  readonly kind: TKind;
  readonly id: TId;
  readonly title: string;
  readonly summary: string;
  readonly syntaxCues: readonly string[];
  readonly applicationSites: readonly AppBuilderPartApplicationSiteKind[];
  readonly operationKind: AppBuilderPartOperationKind;
  readonly requiredSlotKinds: readonly AppBuilderPartSlotKind[];
  readonly optionalSlotKinds: readonly AppBuilderPartSlotKind[];
  readonly valueChannelResolution: AppBuilderPartValueChannelResolutionKind;
  readonly valueChannels: readonly RuntimeBindingValueChannelKind[];
  readonly syntax: AppBuilderBuiltInBindingCommandRef | null;
  readonly detail: TDetail;
}

function syntaxBackedPartDescriptor<
  TKind extends AppBuilderPartKind,
  TId extends AppBuilderPartId,
  TDetail extends AppBuilderPartDetail,
>(
  input: SyntaxBackedPartDescriptorInput<TKind, TId, TDetail>,
): AppBuilderPartDescriptorBase<TKind, TId, TDetail> {
  const command = input.syntax == null ? null : appBuilderBuiltInBindingCommand(input.syntax);
  return {
    kind: input.kind,
    id: input.id,
    title: input.title,
    summary: input.summary,
    authoringTier: appBuilderPartAuthoringTier(input.kind, input.id),
    syntaxCues: input.syntaxCues,
    applicationSites: input.applicationSites,
    operationKind: input.operationKind,
    requiredSlotKinds: input.requiredSlotKinds,
    optionalSlotKinds: input.optionalSlotKinds,
    valueChannelResolution: input.valueChannelResolution,
    valueChannels: input.valueChannels,
    resourceName: null,
    resourceKind: null,
    resourcePackageId: null,
    resourceTargetName: null,
    resourceAliases: [],
    syntaxCommandName: input.syntax?.name ?? null,
    syntaxCommandPackageId: input.syntax?.packageId ?? null,
    syntaxCommandTargetName: command?.targetName ?? null,
    frameworkSyntaxName: null,
    frameworkApiName: null,
    frameworkApiModuleSpecifier: null,
    resourceMetadataName: null,
    componentLifecycleHookName: null,
    requiredPackageSpecifier: input.syntax == null ? null : appBuilderBuiltInSyntaxDependency(input.syntax),
    detail: input.detail,
  };
}

interface FrameworkSyntaxPartDescriptorInput {
  readonly kind: AppBuilderPartKind.FrameworkSyntax;
  readonly id: `${AppBuilderFrameworkSyntaxId}`;
  readonly title: string;
  readonly summary: string;
  readonly syntaxCues: readonly string[];
  readonly applicationSites: readonly AppBuilderPartApplicationSiteKind[];
  readonly operationKind: AppBuilderPartOperationKind;
  readonly requiredSlotKinds: readonly AppBuilderPartSlotKind[];
  readonly optionalSlotKinds: readonly AppBuilderPartSlotKind[];
  readonly valueChannelResolution: AppBuilderPartValueChannelResolutionKind;
  readonly detail: AppBuilderFrameworkSyntaxDescriptor;
}

function frameworkSyntaxPartDescriptor(
  input: FrameworkSyntaxPartDescriptorInput,
): AppBuilderFrameworkSyntaxPartDescriptor {
  return {
    kind: input.kind,
    id: input.id,
    title: input.title,
    summary: input.summary,
    authoringTier: appBuilderPartAuthoringTier(input.kind, input.id),
    syntaxCues: input.syntaxCues,
    applicationSites: input.applicationSites,
    operationKind: input.operationKind,
    requiredSlotKinds: input.requiredSlotKinds,
    optionalSlotKinds: input.optionalSlotKinds,
    valueChannelResolution: input.valueChannelResolution,
    valueChannels: [],
    resourceName: null,
    resourceKind: null,
    resourcePackageId: null,
    resourceTargetName: null,
    resourceAliases: [],
    syntaxCommandName: null,
    syntaxCommandPackageId: null,
    syntaxCommandTargetName: null,
    frameworkSyntaxName: input.detail.specialAttributeName,
    frameworkApiName: null,
    frameworkApiModuleSpecifier: null,
    resourceMetadataName: null,
    componentLifecycleHookName: null,
    requiredPackageSpecifier: null,
    detail: input.detail,
  };
}

interface FrameworkApiPartDescriptorInput {
  readonly kind: AppBuilderPartKind.FrameworkApi;
  readonly id: `${AppBuilderFrameworkApiId}`;
  readonly title: string;
  readonly summary: string;
  readonly syntaxCues: readonly string[];
  readonly applicationSites: readonly AppBuilderPartApplicationSiteKind[];
  readonly operationKind: AppBuilderPartOperationKind;
  readonly requiredSlotKinds: readonly AppBuilderPartSlotKind[];
  readonly optionalSlotKinds: readonly AppBuilderPartSlotKind[];
  readonly valueChannelResolution: AppBuilderPartValueChannelResolutionKind;
  readonly detail: AppBuilderFrameworkApiDescriptor;
}

function frameworkApiPartDescriptor(
  input: FrameworkApiPartDescriptorInput,
): AppBuilderFrameworkApiPartDescriptor {
  const moduleSpecifier = appBuilderFrameworkApiDependency(input.detail);
  return {
    kind: input.kind,
    id: input.id,
    title: input.title,
    summary: input.summary,
    authoringTier: appBuilderPartAuthoringTier(input.kind, input.id),
    syntaxCues: input.syntaxCues,
    applicationSites: input.applicationSites,
    operationKind: input.operationKind,
    requiredSlotKinds: input.requiredSlotKinds,
    optionalSlotKinds: input.optionalSlotKinds,
    valueChannelResolution: input.valueChannelResolution,
    valueChannels: [],
    resourceName: null,
    resourceKind: null,
    resourcePackageId: null,
    resourceTargetName: null,
    resourceAliases: [],
    syntaxCommandName: null,
    syntaxCommandPackageId: null,
    syntaxCommandTargetName: null,
    frameworkSyntaxName: null,
    frameworkApiName: input.detail.exportName,
    frameworkApiModuleSpecifier: moduleSpecifier,
    resourceMetadataName: null,
    componentLifecycleHookName: null,
    requiredPackageSpecifier: moduleSpecifier,
    detail: input.detail,
  };
}

interface ResourceMetadataPartDescriptorInput {
  readonly kind: AppBuilderPartKind.ResourceMetadata;
  readonly id: `${AppBuilderResourceMetadataId}`;
  readonly title: string;
  readonly summary: string;
  readonly syntaxCues: readonly string[];
  readonly applicationSites: readonly AppBuilderPartApplicationSiteKind[];
  readonly operationKind: AppBuilderPartOperationKind;
  readonly requiredSlotKinds: readonly AppBuilderPartSlotKind[];
  readonly optionalSlotKinds: readonly AppBuilderPartSlotKind[];
  readonly valueChannelResolution: AppBuilderPartValueChannelResolutionKind;
  readonly detail: AppBuilderResourceMetadataDescriptor;
}

function resourceMetadataPartDescriptor(
  input: ResourceMetadataPartDescriptorInput,
): AppBuilderResourceMetadataPartDescriptor {
  return {
    kind: input.kind,
    id: input.id,
    title: input.title,
    summary: input.summary,
    authoringTier: appBuilderPartAuthoringTier(input.kind, input.id),
    syntaxCues: input.syntaxCues,
    applicationSites: input.applicationSites,
    operationKind: input.operationKind,
    requiredSlotKinds: input.requiredSlotKinds,
    optionalSlotKinds: input.optionalSlotKinds,
    valueChannelResolution: input.valueChannelResolution,
    valueChannels: [],
    resourceName: null,
    resourceKind: null,
    resourcePackageId: null,
    resourceTargetName: null,
    resourceAliases: [],
    syntaxCommandName: null,
    syntaxCommandPackageId: null,
    syntaxCommandTargetName: null,
    frameworkSyntaxName: null,
    frameworkApiName: null,
    frameworkApiModuleSpecifier: null,
    resourceMetadataName: input.detail.metadataPropertyName,
    componentLifecycleHookName: null,
    requiredPackageSpecifier: null,
    detail: input.detail,
  };
}

interface ComponentLifecyclePartDescriptorInput {
  readonly kind: AppBuilderPartKind.ComponentLifecycle;
  readonly id: `${AppBuilderComponentLifecycleId}`;
  readonly title: string;
  readonly summary: string;
  readonly syntaxCues: readonly string[];
  readonly applicationSites: readonly AppBuilderPartApplicationSiteKind[];
  readonly operationKind: AppBuilderPartOperationKind;
  readonly requiredSlotKinds: readonly AppBuilderPartSlotKind[];
  readonly optionalSlotKinds: readonly AppBuilderPartSlotKind[];
  readonly valueChannelResolution: AppBuilderPartValueChannelResolutionKind;
  readonly detail: AppBuilderComponentLifecycleDescriptor;
}

function componentLifecyclePartDescriptor(
  input: ComponentLifecyclePartDescriptorInput,
): AppBuilderComponentLifecyclePartDescriptor {
  return {
    kind: input.kind,
    id: input.id,
    title: input.title,
    summary: input.summary,
    authoringTier: appBuilderPartAuthoringTier(input.kind, input.id),
    syntaxCues: input.syntaxCues,
    applicationSites: input.applicationSites,
    operationKind: input.operationKind,
    requiredSlotKinds: input.requiredSlotKinds,
    optionalSlotKinds: input.optionalSlotKinds,
    valueChannelResolution: input.valueChannelResolution,
    valueChannels: [],
    resourceName: null,
    resourceKind: null,
    resourcePackageId: null,
    resourceTargetName: null,
    resourceAliases: [],
    syntaxCommandName: null,
    syntaxCommandPackageId: null,
    syntaxCommandTargetName: null,
    frameworkSyntaxName: null,
    frameworkApiName: null,
    frameworkApiModuleSpecifier: null,
    resourceMetadataName: null,
    componentLifecycleHookName: input.detail.hookName,
    requiredPackageSpecifier: null,
    detail: input.detail,
  };
}
