import {
  ComponentLifecycleHookName,
} from '../template/component-lifecycle-source.js';
import {
  AppBuilderPartApplicationSiteKind,
  AppBuilderPartOperationKind,
  AppBuilderPartSlotKind,
} from './part-application.js';

/** Stable identity of a component lifecycle method exposed as an app-builder part. */
export enum AppBuilderComponentLifecycleId {
  /** `define()` compile-time custom-element hook. */
  DefineHook = 'define-hook',
  /** `hydrating()` custom-element hydration hook. */
  HydratingHook = 'hydrating-hook',
  /** `hydrated()` custom-element hydration hook. */
  HydratedHook = 'hydrated-hook',
  /** `created()` custom-element/custom-attribute creation hook. */
  CreatedHook = 'created-hook',
  /** `binding()` activation hook. */
  BindingHook = 'binding-hook',
  /** `bound()` activation hook. */
  BoundHook = 'bound-hook',
  /** `attaching()` activation hook. */
  AttachingHook = 'attaching-hook',
  /** `attached()` activation hook. */
  AttachedHook = 'attached-hook',
  /** `detaching()` deactivation hook. */
  DetachingHook = 'detaching-hook',
  /** `unbinding()` deactivation hook. */
  UnbindingHook = 'unbinding-hook',
  /** `dispose()` controller disposal hook. */
  DisposeHook = 'dispose-hook',
  /** `accept()` controller traversal hook. */
  AcceptHook = 'accept-hook',
}

/** One component lifecycle method part backed by runtime-html Controller hook discovery. */
export interface AppBuilderComponentLifecycleDescriptor {
  readonly id: AppBuilderComponentLifecycleId;
  readonly title: string;
  readonly summary: string;
  readonly hookName: ComponentLifecycleHookName;
  /** Display-only syntax cue; lowering must use the hook identity and source serializer. */
  readonly syntaxCue: string;
  /** Source locus families where this lifecycle method can be applied. */
  readonly applicationSites: readonly AppBuilderPartApplicationSiteKind[];
  /** Source-operation family for this lifecycle method. */
  readonly operationKind: AppBuilderPartOperationKind;
  /** Slots required before this lifecycle method can lower to source. */
  readonly requiredSlotKinds: readonly AppBuilderPartSlotKind[];
  /** Optional slots this lifecycle method may accept for richer source generation. */
  readonly optionalSlotKinds: readonly AppBuilderPartSlotKind[];
}

export const APP_BUILDER_COMPONENT_LIFECYCLES: readonly AppBuilderComponentLifecycleDescriptor[] = [
  {
    id: AppBuilderComponentLifecycleId.DefineHook,
    title: 'Define Hook',
    summary: 'Customize custom-element definition before hydration continues.',
    hookName: ComponentLifecycleHookName.Define,
    syntaxCue: `${ComponentLifecycleHookName.Define}() { ... }`,
    applicationSites: [AppBuilderPartApplicationSiteKind.TypeScriptClassMember],
    operationKind: AppBuilderPartOperationKind.ApplyComponentLifecycleHook,
    requiredSlotKinds: [],
    optionalSlotKinds: [AppBuilderPartSlotKind.TypeScriptMethodBodyStatements],
  },
  {
    id: AppBuilderComponentLifecycleId.HydratingHook,
    title: 'Hydrating Hook',
    summary: 'Run before a custom element creates or adopts DOM nodes.',
    hookName: ComponentLifecycleHookName.Hydrating,
    syntaxCue: `${ComponentLifecycleHookName.Hydrating}() { ... }`,
    applicationSites: [AppBuilderPartApplicationSiteKind.TypeScriptClassMember],
    operationKind: AppBuilderPartOperationKind.ApplyComponentLifecycleHook,
    requiredSlotKinds: [],
    optionalSlotKinds: [AppBuilderPartSlotKind.TypeScriptMethodBodyStatements],
  },
  {
    id: AppBuilderComponentLifecycleId.HydratedHook,
    title: 'Hydrated Hook',
    summary: 'Run after a custom element creates or adopts DOM nodes.',
    hookName: ComponentLifecycleHookName.Hydrated,
    syntaxCue: `${ComponentLifecycleHookName.Hydrated}() { ... }`,
    applicationSites: [AppBuilderPartApplicationSiteKind.TypeScriptClassMember],
    operationKind: AppBuilderPartOperationKind.ApplyComponentLifecycleHook,
    requiredSlotKinds: [],
    optionalSlotKinds: [AppBuilderPartSlotKind.TypeScriptMethodBodyStatements],
  },
  {
    id: AppBuilderComponentLifecycleId.CreatedHook,
    title: 'Created Hook',
    summary: 'Run after a custom element or custom attribute has rendered its children or hydrated its view-model.',
    hookName: ComponentLifecycleHookName.Created,
    syntaxCue: `${ComponentLifecycleHookName.Created}() { ... }`,
    applicationSites: [AppBuilderPartApplicationSiteKind.TypeScriptClassMember],
    operationKind: AppBuilderPartOperationKind.ApplyComponentLifecycleHook,
    requiredSlotKinds: [],
    optionalSlotKinds: [AppBuilderPartSlotKind.TypeScriptMethodBodyStatements],
  },
  {
    id: AppBuilderComponentLifecycleId.BindingHook,
    title: 'Binding Hook',
    summary: 'Run before component bindings are bound during activation.',
    hookName: ComponentLifecycleHookName.Binding,
    syntaxCue: `${ComponentLifecycleHookName.Binding}() { ... }`,
    applicationSites: [AppBuilderPartApplicationSiteKind.TypeScriptClassMember],
    operationKind: AppBuilderPartOperationKind.ApplyComponentLifecycleHook,
    requiredSlotKinds: [],
    optionalSlotKinds: [AppBuilderPartSlotKind.TypeScriptMethodBodyStatements],
  },
  {
    id: AppBuilderComponentLifecycleId.BoundHook,
    title: 'Bound Hook',
    summary: 'Run after component bindings are bound during activation.',
    hookName: ComponentLifecycleHookName.Bound,
    syntaxCue: `${ComponentLifecycleHookName.Bound}() { ... }`,
    applicationSites: [AppBuilderPartApplicationSiteKind.TypeScriptClassMember],
    operationKind: AppBuilderPartOperationKind.ApplyComponentLifecycleHook,
    requiredSlotKinds: [],
    optionalSlotKinds: [AppBuilderPartSlotKind.TypeScriptMethodBodyStatements],
  },
  {
    id: AppBuilderComponentLifecycleId.AttachingHook,
    title: 'Attaching Hook',
    summary: 'Run before component nodes attach during activation.',
    hookName: ComponentLifecycleHookName.Attaching,
    syntaxCue: `${ComponentLifecycleHookName.Attaching}() { ... }`,
    applicationSites: [AppBuilderPartApplicationSiteKind.TypeScriptClassMember],
    operationKind: AppBuilderPartOperationKind.ApplyComponentLifecycleHook,
    requiredSlotKinds: [],
    optionalSlotKinds: [AppBuilderPartSlotKind.TypeScriptMethodBodyStatements],
  },
  {
    id: AppBuilderComponentLifecycleId.AttachedHook,
    title: 'Attached Hook',
    summary: 'Run after component nodes attach during activation.',
    hookName: ComponentLifecycleHookName.Attached,
    syntaxCue: `${ComponentLifecycleHookName.Attached}() { ... }`,
    applicationSites: [AppBuilderPartApplicationSiteKind.TypeScriptClassMember],
    operationKind: AppBuilderPartOperationKind.ApplyComponentLifecycleHook,
    requiredSlotKinds: [],
    optionalSlotKinds: [AppBuilderPartSlotKind.TypeScriptMethodBodyStatements],
  },
  {
    id: AppBuilderComponentLifecycleId.DetachingHook,
    title: 'Detaching Hook',
    summary: 'Run before component nodes detach during deactivation.',
    hookName: ComponentLifecycleHookName.Detaching,
    syntaxCue: `${ComponentLifecycleHookName.Detaching}() { ... }`,
    applicationSites: [AppBuilderPartApplicationSiteKind.TypeScriptClassMember],
    operationKind: AppBuilderPartOperationKind.ApplyComponentLifecycleHook,
    requiredSlotKinds: [],
    optionalSlotKinds: [AppBuilderPartSlotKind.TypeScriptMethodBodyStatements],
  },
  {
    id: AppBuilderComponentLifecycleId.UnbindingHook,
    title: 'Unbinding Hook',
    summary: 'Run while component bindings are removed during deactivation.',
    hookName: ComponentLifecycleHookName.Unbinding,
    syntaxCue: `${ComponentLifecycleHookName.Unbinding}() { ... }`,
    applicationSites: [AppBuilderPartApplicationSiteKind.TypeScriptClassMember],
    operationKind: AppBuilderPartOperationKind.ApplyComponentLifecycleHook,
    requiredSlotKinds: [],
    optionalSlotKinds: [AppBuilderPartSlotKind.TypeScriptMethodBodyStatements],
  },
  {
    id: AppBuilderComponentLifecycleId.DisposeHook,
    title: 'Dispose Hook',
    summary: 'Run when the component controller is disposed.',
    hookName: ComponentLifecycleHookName.Dispose,
    syntaxCue: `${ComponentLifecycleHookName.Dispose}() { ... }`,
    applicationSites: [AppBuilderPartApplicationSiteKind.TypeScriptClassMember],
    operationKind: AppBuilderPartOperationKind.ApplyComponentLifecycleHook,
    requiredSlotKinds: [],
    optionalSlotKinds: [AppBuilderPartSlotKind.TypeScriptMethodBodyStatements],
  },
  {
    id: AppBuilderComponentLifecycleId.AcceptHook,
    title: 'Accept Hook',
    summary: 'Expose child-controller traversal for plugins such as the router when the component owns extra controllers.',
    hookName: ComponentLifecycleHookName.Accept,
    syntaxCue: `${ComponentLifecycleHookName.Accept}() { ... }`,
    applicationSites: [AppBuilderPartApplicationSiteKind.TypeScriptClassMember],
    operationKind: AppBuilderPartOperationKind.ApplyComponentLifecycleHook,
    requiredSlotKinds: [],
    optionalSlotKinds: [AppBuilderPartSlotKind.TypeScriptMethodBodyStatements],
  },
];
