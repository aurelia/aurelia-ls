import {
  BuiltInBindingBehaviorName,
  BuiltInResourcePackage,
} from '../resources/built-in-resources.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import {
  AppBuilderPartApplicationSiteKind,
  AppBuilderPartOperationKind,
  AppBuilderPartSlotKind,
} from './part-application.js';
import {
  appBuilderBuiltInResourceRef,
  type AppBuilderBuiltInResourceRef,
} from './part-resource.js';

/** Binding behavior parts grounded in the built-in resource registry. */

/** Stable identity of a binding behavior. */
export enum AppBuilderBindingBehaviorId {
  /** `& oneTime` — bind once, no further updates. */
  OneTime = 'one-time',
  /** `& toView` — force source-to-target only. */
  ToView = 'to-view',
  /** `& fromView` — force target-to-source only. */
  FromView = 'from-view',
  /** `& twoWay` — force two-way binding. */
  TwoWay = 'two-way',
  /** `& debounce` — delay updates until input settles. */
  Debounce = 'debounce',
  /** `& throttle` — rate-limit update frequency. */
  Throttle = 'throttle',
  /** `& signal` — re-evaluate when a named signal is dispatched. */
  Signal = 'signal',
  /** `& updateTrigger` — change which DOM events flush the binding. */
  UpdateTrigger = 'update-trigger',
  /** `& self` — only handle events whose target is the element itself. */
  Self = 'self',
  /** `& attr` — force attribute binding over property binding. */
  Attr = 'attr',
  /** `& validate` — attach validation to the binding (validation-html plugin). */
  Validate = 'validate',
  /** `& t` — re-translate the binding on locale change (i18n plugin). */
  Translate = 'translate',
  /** `& nf` — re-format the bound number on locale change (i18n plugin). */
  NumberFormat = 'number-format',
  /** `& df` — re-format the bound date on locale change (i18n plugin). */
  DateFormat = 'date-format',
  /** `& rt` — re-format the bound relative time on locale change (i18n plugin). */
  RelativeTime = 'relative-time',
  /** `& state` — bind against the state store (state plugin). */
  State = 'state',
}

/** One neutral binding behavior: the `& name` modifier and what it changes. */
export interface AppBuilderBindingBehaviorDescriptor {
  readonly id: AppBuilderBindingBehaviorId;
  readonly title: string;
  readonly summary: string;
  /** Built-in resource catalog entry that owns the registered behavior name. */
  readonly resource: AppBuilderBuiltInResourceRef;
  /** Display-only syntax cue; lowering must use operation/slot metadata instead. */
  readonly syntaxCue: string;
  /** Source locus family where the behavior can be applied. */
  readonly applicationSites: readonly AppBuilderPartApplicationSiteKind[];
  /** Source-lowering operation family for this binding-behavior part. */
  readonly operationKind: AppBuilderPartOperationKind;
  /** Slots required before this behavior can lower into a binding expression. */
  readonly requiredSlotKinds: readonly AppBuilderPartSlotKind[];
  /** Optional slots this behavior may accept when the caller supplies arguments. */
  readonly optionalSlotKinds: readonly AppBuilderPartSlotKind[];
}

export const APP_BUILDER_BINDING_BEHAVIORS: readonly AppBuilderBindingBehaviorDescriptor[] = [
  {
    id: AppBuilderBindingBehaviorId.OneTime,
    title: 'One Time',
    summary: 'Evaluate the binding once and never update it again.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.RuntimeHtml, ResourceDefinitionKind.BindingBehavior, BuiltInBindingBehaviorName.OneTime),
    syntaxCue: '& oneTime',
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingExpressionModifier],
    operationKind: AppBuilderPartOperationKind.ApplyBindingBehavior,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [],
  },
  {
    id: AppBuilderBindingBehaviorId.ToView,
    title: 'To View',
    summary: 'Force source-to-target flow only.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.RuntimeHtml, ResourceDefinitionKind.BindingBehavior, BuiltInBindingBehaviorName.ToView),
    syntaxCue: '& toView',
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingExpressionModifier],
    operationKind: AppBuilderPartOperationKind.ApplyBindingBehavior,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [],
  },
  {
    id: AppBuilderBindingBehaviorId.FromView,
    title: 'From View',
    summary: 'Force target-to-source flow only.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.RuntimeHtml, ResourceDefinitionKind.BindingBehavior, BuiltInBindingBehaviorName.FromView),
    syntaxCue: '& fromView',
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingExpressionModifier],
    operationKind: AppBuilderPartOperationKind.ApplyBindingBehavior,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [],
  },
  {
    id: AppBuilderBindingBehaviorId.TwoWay,
    title: 'Two Way',
    summary: 'Force two-way flow between source and target.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.RuntimeHtml, ResourceDefinitionKind.BindingBehavior, BuiltInBindingBehaviorName.TwoWay),
    syntaxCue: '& twoWay',
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingExpressionModifier],
    operationKind: AppBuilderPartOperationKind.ApplyBindingBehavior,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [],
  },
  {
    id: AppBuilderBindingBehaviorId.Debounce,
    title: 'Debounce',
    summary: 'Delay propagating updates until input activity settles.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.RuntimeHtml, ResourceDefinitionKind.BindingBehavior, BuiltInBindingBehaviorName.Debounce),
    syntaxCue: '& debounce',
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingExpressionModifier],
    operationKind: AppBuilderPartOperationKind.ApplyBindingBehavior,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [AppBuilderPartSlotKind.BindingBehaviorArguments],
  },
  {
    id: AppBuilderBindingBehaviorId.Throttle,
    title: 'Throttle',
    summary: 'Limit how frequently the binding propagates updates.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.RuntimeHtml, ResourceDefinitionKind.BindingBehavior, BuiltInBindingBehaviorName.Throttle),
    syntaxCue: '& throttle',
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingExpressionModifier],
    operationKind: AppBuilderPartOperationKind.ApplyBindingBehavior,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [AppBuilderPartSlotKind.BindingBehaviorArguments],
  },
  {
    id: AppBuilderBindingBehaviorId.Signal,
    title: 'Signal',
    summary: 'Re-evaluate the binding when a named signal is dispatched.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.RuntimeHtml, ResourceDefinitionKind.BindingBehavior, BuiltInBindingBehaviorName.Signal),
    syntaxCue: '& signal',
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingExpressionModifier],
    operationKind: AppBuilderPartOperationKind.ApplyBindingBehavior,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression, AppBuilderPartSlotKind.BindingBehaviorArguments],
    optionalSlotKinds: [],
  },
  {
    id: AppBuilderBindingBehaviorId.UpdateTrigger,
    title: 'Update Trigger',
    summary: 'Override which DOM events flush a two-way/from-view binding.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.RuntimeHtml, ResourceDefinitionKind.BindingBehavior, BuiltInBindingBehaviorName.UpdateTrigger),
    syntaxCue: '& updateTrigger',
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingExpressionModifier],
    operationKind: AppBuilderPartOperationKind.ApplyBindingBehavior,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression, AppBuilderPartSlotKind.BindingBehaviorArguments],
    optionalSlotKinds: [],
  },
  {
    id: AppBuilderBindingBehaviorId.Self,
    title: 'Self',
    summary: 'Only handle an event when its target is the bound element itself.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.RuntimeHtml, ResourceDefinitionKind.BindingBehavior, BuiltInBindingBehaviorName.Self),
    syntaxCue: '& self',
    applicationSites: [AppBuilderPartApplicationSiteKind.EventBindingExpressionModifier],
    operationKind: AppBuilderPartOperationKind.ApplyBindingBehavior,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [],
  },
  {
    id: AppBuilderBindingBehaviorId.Attr,
    title: 'Attr',
    summary: 'Force attribute binding instead of element-property binding.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.RuntimeHtml, ResourceDefinitionKind.BindingBehavior, BuiltInBindingBehaviorName.Attr),
    syntaxCue: '& attr',
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingExpressionModifier],
    operationKind: AppBuilderPartOperationKind.ApplyBindingBehavior,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [],
  },
  {
    id: AppBuilderBindingBehaviorId.Validate,
    title: 'Validate',
    summary: 'Attach validation rules/triggers to the binding.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.ValidationHtml, ResourceDefinitionKind.BindingBehavior, BuiltInBindingBehaviorName.Validate),
    syntaxCue: '& validate',
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingExpressionModifier],
    operationKind: AppBuilderPartOperationKind.ApplyBindingBehavior,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [AppBuilderPartSlotKind.BindingBehaviorArguments],
  },
  {
    id: AppBuilderBindingBehaviorId.Translate,
    title: 'Translate',
    summary: 'Re-translate the bound value when the active locale changes.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.I18n, ResourceDefinitionKind.BindingBehavior, BuiltInBindingBehaviorName.Translation),
    syntaxCue: '& t',
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingExpressionModifier],
    operationKind: AppBuilderPartOperationKind.ApplyBindingBehavior,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [AppBuilderPartSlotKind.BindingBehaviorArguments],
  },
  {
    id: AppBuilderBindingBehaviorId.NumberFormat,
    title: 'Number Format',
    summary: 'Re-format the bound number when the active locale changes.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.I18n, ResourceDefinitionKind.BindingBehavior, BuiltInBindingBehaviorName.NumberFormat),
    syntaxCue: '& nf',
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingExpressionModifier],
    operationKind: AppBuilderPartOperationKind.ApplyBindingBehavior,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [AppBuilderPartSlotKind.BindingBehaviorArguments],
  },
  {
    id: AppBuilderBindingBehaviorId.DateFormat,
    title: 'Date Format',
    summary: 'Re-format the bound date when the active locale changes.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.I18n, ResourceDefinitionKind.BindingBehavior, BuiltInBindingBehaviorName.DateFormat),
    syntaxCue: '& df',
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingExpressionModifier],
    operationKind: AppBuilderPartOperationKind.ApplyBindingBehavior,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [AppBuilderPartSlotKind.BindingBehaviorArguments],
  },
  {
    id: AppBuilderBindingBehaviorId.RelativeTime,
    title: 'Relative Time',
    summary: 'Re-format the bound relative time when the active locale changes.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.I18n, ResourceDefinitionKind.BindingBehavior, BuiltInBindingBehaviorName.RelativeTime),
    syntaxCue: '& rt',
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingExpressionModifier],
    operationKind: AppBuilderPartOperationKind.ApplyBindingBehavior,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [AppBuilderPartSlotKind.BindingBehaviorArguments],
  },
  {
    id: AppBuilderBindingBehaviorId.State,
    title: 'State',
    summary: 'Bind the expression against the application state store.',
    resource: appBuilderBuiltInResourceRef(BuiltInResourcePackage.State, ResourceDefinitionKind.BindingBehavior, BuiltInBindingBehaviorName.State),
    syntaxCue: '& state',
    applicationSites: [AppBuilderPartApplicationSiteKind.BindingExpressionModifier],
    operationKind: AppBuilderPartOperationKind.ApplyBindingBehavior,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [AppBuilderPartSlotKind.BindingBehaviorArguments],
  },
];

/** Look up a binding-behavior descriptor by id. */
export function appBuilderBindingBehaviorDescriptor(id: AppBuilderBindingBehaviorId): AppBuilderBindingBehaviorDescriptor {
  const behavior = APP_BUILDER_BINDING_BEHAVIORS.find((candidate) => candidate.id === id);
  if (behavior == null) {
    throw new Error(`Unknown app-builder binding behavior '${id}'.`);
  }
  return behavior;
}
