import { BuiltInResourcePackage } from '../resources/built-in-resources.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import {
  BuiltInTemplateControllerFlowKind,
  BuiltInTemplateControllerName,
} from '../template/template-controller-semantics.js';
import {
  AppBuilderPartApplicationSiteKind,
  AppBuilderPartOperationKind,
  AppBuilderPartSlotKind,
} from './part-application.js';
import {
  appBuilderBuiltInResourceRef,
  type AppBuilderBuiltInResourceRef,
} from './part-resource.js';

/** Structural parts backed by Aurelia template-controller resources. */

/** Stable identity of a structural (control-flow) part. */
export enum AppBuilderStructuralPartId {
  /** `if` — render a view when a condition is truthy. */
  Conditional = 'conditional',
  /** `else` — alternative branch of a conditional. */
  ConditionalElse = 'conditional-else',
  /** `repeat` — render a view per item of an iterable. */
  Repeat = 'repeat',
  /** `virtual-repeat` — virtualized iteration for large collections (ui-virtualization plugin). */
  VirtualRepeat = 'virtual-repeat',
  /** `switch` — select one branch by matching a value. */
  Switch = 'switch',
  /** `case` — a candidate branch of a switch. */
  SwitchCase = 'switch-case',
  /** `default-case` — the fallback branch of a switch. */
  SwitchDefault = 'switch-default',
  /** `promise` — render branches by a promise's state. */
  Promise = 'promise',
  /** `pending` — the view while a promise is pending. */
  PromisePending = 'promise-pending',
  /** `then` — the view when a promise resolves. */
  PromiseFulfilled = 'promise-fulfilled',
  /** `catch` — the view when a promise rejects. */
  PromiseRejected = 'promise-rejected',
  /** `with` — bind a child view to an explicit value scope. */
  ValueScope = 'value-scope',
  /** `portal` — render a view elsewhere in the DOM. */
  Portal = 'portal',
}

/** One neutral structural part: the built-in template controller it is and its control-flow semantics. */
export interface AppBuilderStructuralPartDescriptor {
  readonly id: AppBuilderStructuralPartId;
  readonly title: string;
  readonly summary: string;
  /** Built-in resource catalog entry that owns the template-controller name. */
  readonly resource: AppBuilderBuiltInResourceRef;
  /** Display-only syntax cue; lowering must use operation/slot metadata instead. */
  readonly syntaxCue: string;
  /** Source locus families where this structural part can be applied. */
  readonly applicationSites: readonly AppBuilderPartApplicationSiteKind[];
  /** Source-lowering operation family for this structural part. */
  readonly operationKind: AppBuilderPartOperationKind;
  /** Slots required before this part can lower to template source. */
  readonly requiredSlotKinds: readonly AppBuilderPartSlotKind[];
  /** Optional slots this part may accept for richer source generation. */
  readonly optionalSlotKinds: readonly AppBuilderPartSlotKind[];
  /** Control-flow classification (template read-model grounding). */
  readonly flowKind: BuiltInTemplateControllerFlowKind;
  /** The primary part this one must accompany (e.g. else accompanies if), or null if it stands alone. */
  readonly companionOf: AppBuilderStructuralPartId | null;
}

export const APP_BUILDER_STRUCTURAL_PARTS: readonly AppBuilderStructuralPartDescriptor[] = [
  {
    id: AppBuilderStructuralPartId.Conditional,
    title: 'Conditional (if)',
    summary: 'Render a view only when a condition is truthy.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.RuntimeHtml, ResourceDefinitionKind.TemplateController, BuiltInTemplateControllerName.If),
    syntaxCue: 'if.bind',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateController],
    operationKind: AppBuilderPartOperationKind.ApplyTemplateController,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [],
    flowKind: BuiltInTemplateControllerFlowKind.Conditional,
    companionOf: null,
  },
  {
    id: AppBuilderStructuralPartId.ConditionalElse,
    title: 'Conditional Else (else)',
    summary: 'Render an alternative view when the paired if condition is falsy.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.RuntimeHtml, ResourceDefinitionKind.TemplateController, BuiltInTemplateControllerName.Else),
    syntaxCue: 'else',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateControllerBranch],
    operationKind: AppBuilderPartOperationKind.ApplyTemplateControllerBranch,
    requiredSlotKinds: [],
    optionalSlotKinds: [],
    flowKind: BuiltInTemplateControllerFlowKind.ConditionalElse,
    companionOf: AppBuilderStructuralPartId.Conditional,
  },
  {
    id: AppBuilderStructuralPartId.Repeat,
    title: 'Repeat (list)',
    summary: 'Render a view per item of an iterable, creating a per-item scope.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.RuntimeHtml, ResourceDefinitionKind.TemplateController, BuiltInTemplateControllerName.Repeat),
    syntaxCue: 'repeat.for',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateController],
    operationKind: AppBuilderPartOperationKind.ApplyTemplateController,
    requiredSlotKinds: [
      AppBuilderPartSlotKind.LocalName,
      AppBuilderPartSlotKind.IterableExpression,
    ],
    optionalSlotKinds: [],
    flowKind: BuiltInTemplateControllerFlowKind.Iteration,
    companionOf: null,
  },
  {
    id: AppBuilderStructuralPartId.VirtualRepeat,
    title: 'Virtual Repeat (virtualized list)',
    summary: 'Virtualized iteration that renders only the visible items of a large collection.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.UiVirtualization, ResourceDefinitionKind.TemplateController, BuiltInTemplateControllerName.VirtualRepeat),
    syntaxCue: 'virtual-repeat.for',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateController],
    operationKind: AppBuilderPartOperationKind.ApplyTemplateController,
    requiredSlotKinds: [
      AppBuilderPartSlotKind.LocalName,
      AppBuilderPartSlotKind.IterableExpression,
    ],
    optionalSlotKinds: [],
    flowKind: BuiltInTemplateControllerFlowKind.Iteration,
    companionOf: null,
  },
  {
    id: AppBuilderStructuralPartId.Switch,
    title: 'Switch',
    summary: 'Select one branch view by matching a value against cases.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.RuntimeHtml, ResourceDefinitionKind.TemplateController, BuiltInTemplateControllerName.Switch),
    syntaxCue: 'switch.bind',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateController],
    operationKind: AppBuilderPartOperationKind.ApplyTemplateController,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [],
    flowKind: BuiltInTemplateControllerFlowKind.Switch,
    companionOf: null,
  },
  {
    id: AppBuilderStructuralPartId.SwitchCase,
    title: 'Switch Case (case)',
    summary: 'A candidate branch of a switch, selected when its expression value matches.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.RuntimeHtml, ResourceDefinitionKind.TemplateController, BuiltInTemplateControllerName.Case),
    syntaxCue: 'case.bind',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateControllerBranch],
    operationKind: AppBuilderPartOperationKind.ApplyTemplateControllerBranch,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [],
    flowKind: BuiltInTemplateControllerFlowKind.SwitchCase,
    companionOf: AppBuilderStructuralPartId.Switch,
  },
  {
    id: AppBuilderStructuralPartId.SwitchDefault,
    title: 'Switch Default (default-case)',
    summary: 'The fallback branch of a switch when no case matches.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.RuntimeHtml, ResourceDefinitionKind.TemplateController, BuiltInTemplateControllerName.DefaultCase),
    syntaxCue: 'default-case',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateControllerBranch],
    operationKind: AppBuilderPartOperationKind.ApplyTemplateControllerBranch,
    requiredSlotKinds: [],
    optionalSlotKinds: [],
    flowKind: BuiltInTemplateControllerFlowKind.SwitchDefault,
    companionOf: AppBuilderStructuralPartId.Switch,
  },
  {
    id: AppBuilderStructuralPartId.Promise,
    title: 'Promise',
    summary: 'Render branch views driven by the state of a bound promise.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.RuntimeHtml, ResourceDefinitionKind.TemplateController, BuiltInTemplateControllerName.Promise),
    syntaxCue: 'promise.bind',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateController],
    operationKind: AppBuilderPartOperationKind.ApplyTemplateController,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [],
    flowKind: BuiltInTemplateControllerFlowKind.Promise,
    companionOf: null,
  },
  {
    id: AppBuilderStructuralPartId.PromisePending,
    title: 'Promise Pending (pending)',
    summary: 'The view shown while a promise is pending.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.RuntimeHtml, ResourceDefinitionKind.TemplateController, BuiltInTemplateControllerName.Pending),
    syntaxCue: 'pending',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateControllerBranch],
    operationKind: AppBuilderPartOperationKind.ApplyTemplateControllerBranch,
    requiredSlotKinds: [],
    optionalSlotKinds: [],
    flowKind: BuiltInTemplateControllerFlowKind.PromisePending,
    companionOf: AppBuilderStructuralPartId.Promise,
  },
  {
    id: AppBuilderStructuralPartId.PromiseFulfilled,
    title: 'Promise Fulfilled (then)',
    summary: 'The view shown when a promise resolves, capturing the resolved value.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.RuntimeHtml, ResourceDefinitionKind.TemplateController, BuiltInTemplateControllerName.Then),
    syntaxCue: 'then',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateControllerBranch],
    operationKind: AppBuilderPartOperationKind.ApplyTemplateControllerBranch,
    requiredSlotKinds: [],
    optionalSlotKinds: [AppBuilderPartSlotKind.LocalName],
    flowKind: BuiltInTemplateControllerFlowKind.PromiseFulfilled,
    companionOf: AppBuilderStructuralPartId.Promise,
  },
  {
    id: AppBuilderStructuralPartId.PromiseRejected,
    title: 'Promise Rejected (catch)',
    summary: 'The view shown when a promise rejects, capturing the error.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.RuntimeHtml, ResourceDefinitionKind.TemplateController, BuiltInTemplateControllerName.Catch),
    syntaxCue: 'catch',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateControllerBranch],
    operationKind: AppBuilderPartOperationKind.ApplyTemplateControllerBranch,
    requiredSlotKinds: [],
    optionalSlotKinds: [AppBuilderPartSlotKind.LocalName],
    flowKind: BuiltInTemplateControllerFlowKind.PromiseRejected,
    companionOf: AppBuilderStructuralPartId.Promise,
  },
  {
    id: AppBuilderStructuralPartId.ValueScope,
    title: 'Value Scope (with)',
    summary: 'Bind a child view to an explicit value as its binding context.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.RuntimeHtml, ResourceDefinitionKind.TemplateController, BuiltInTemplateControllerName.With),
    syntaxCue: 'with.bind',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateController],
    operationKind: AppBuilderPartOperationKind.ApplyTemplateController,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [],
    flowKind: BuiltInTemplateControllerFlowKind.ValueScope,
    companionOf: null,
  },
  {
    id: AppBuilderStructuralPartId.Portal,
    title: 'Portal',
    summary: 'Render a view at a different location in the DOM than its declaration.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.RuntimeHtml, ResourceDefinitionKind.TemplateController, BuiltInTemplateControllerName.Portal),
    syntaxCue: 'portal',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateController],
    operationKind: AppBuilderPartOperationKind.ApplyTemplateController,
    requiredSlotKinds: [],
    optionalSlotKinds: [
      AppBuilderPartSlotKind.PortalTarget,
      AppBuilderPartSlotKind.PortalPosition,
      AppBuilderPartSlotKind.PortalRenderContext,
      AppBuilderPartSlotKind.PortalStrict,
    ],
    flowKind: BuiltInTemplateControllerFlowKind.PassThrough,
    companionOf: null,
  },
];

/** Look up a structural-part descriptor by id. */
export function appBuilderStructuralPartDescriptor(id: AppBuilderStructuralPartId): AppBuilderStructuralPartDescriptor {
  const part = APP_BUILDER_STRUCTURAL_PARTS.find((candidate) => candidate.id === id);
  if (part == null) {
    throw new Error(`Unknown app-builder structural part '${id}'.`);
  }
  return part;
}
