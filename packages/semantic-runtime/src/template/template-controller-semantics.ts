import { auLink } from '../kernel/au-link.js';

/** Authored names of built-in template-controller resources modeled by semantic-runtime. */
export enum BuiltInTemplateControllerName {
  /** `if` conditional template controller. */
  If = 'if',
  /** `else` conditional companion template controller. */
  Else = 'else',
  /** `repeat` iterator template controller. */
  Repeat = 'repeat',
  /** `virtual-repeat` virtualized iterator template controller. */
  VirtualRepeat = 'virtual-repeat',
  /** `with` value-scope template controller. */
  With = 'with',
  /** `portal` DOM relocation template controller. */
  Portal = 'portal',
  /** `switch` discriminant template controller. */
  Switch = 'switch',
  /** `case` switch branch template controller. */
  Case = 'case',
  /** `default-case` fallback switch branch template controller. */
  DefaultCase = 'default-case',
  /** `promise` async-state owner template controller. */
  Promise = 'promise',
  /** `pending` promise-pending branch template controller. */
  Pending = 'pending',
  /** `then` promise-fulfilled branch template controller. */
  Then = 'then',
  /** `catch` promise-rejected branch template controller. */
  Catch = 'catch',
}

export const enum BuiltInTemplateControllerChildScopeKind {
  PassThrough = 'pass-through',
  IteratorBindingContext = 'iterator-binding-context',
  ValueBindingContext = 'value-binding-context',
  EmptyObjectBindingContext = 'empty-object-binding-context',
}

export const enum BuiltInTemplateControllerChildViewCardinality {
  Single = 'single',
  Optional = 'optional',
  Many = 'many',
  Open = 'open',
}

export const enum BuiltInTemplateControllerFlowKind {
  PassThrough = 'pass-through',
  Conditional = 'conditional',
  ConditionalElse = 'conditional-else',
  Iteration = 'iteration',
  ValueScope = 'value-scope',
  Switch = 'switch',
  SwitchCase = 'switch-case',
  SwitchDefault = 'switch-default',
  Promise = 'promise',
  PromisePending = 'promise-pending',
  PromiseFulfilled = 'promise-fulfilled',
  PromiseRejected = 'promise-rejected',
}

export type BuiltInTemplateControllerValueProperty =
  | 'value'
  | 'items'
  | 'target'
  | null;

export const enum BuiltInTemplateControllerValueDomainKind {
  None = 'none',
  OpenEnded = 'open-ended',
  Iterator = 'iterator',
}

export interface BuiltInTemplateControllerSemantics {
  readonly controllerName: BuiltInTemplateControllerName;
  readonly childScopeKind: BuiltInTemplateControllerChildScopeKind;
  readonly valueProperty: BuiltInTemplateControllerValueProperty;
  readonly valueDomainKind: BuiltInTemplateControllerValueDomainKind;
  readonly childViewCardinality: BuiltInTemplateControllerChildViewCardinality;
  readonly flowKind: BuiltInTemplateControllerFlowKind;
}

@auLink('runtime-html:If', { facet: 'template-controller-semantics' })
export class RuntimeHtmlIfTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = BuiltInTemplateControllerName.If;
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.PassThrough;
  readonly valueProperty = 'value';
  readonly valueDomainKind = BuiltInTemplateControllerValueDomainKind.OpenEnded;
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Optional;
  readonly flowKind = BuiltInTemplateControllerFlowKind.Conditional;
}

@auLink('runtime-html:Else', { facet: 'template-controller-semantics' })
export class RuntimeHtmlElseTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = BuiltInTemplateControllerName.Else;
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.PassThrough;
  readonly valueProperty = null;
  readonly valueDomainKind = BuiltInTemplateControllerValueDomainKind.None;
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Optional;
  readonly flowKind = BuiltInTemplateControllerFlowKind.ConditionalElse;
}

@auLink('runtime-html:Repeat', { facet: 'template-controller-semantics' })
export class RuntimeHtmlRepeatTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = BuiltInTemplateControllerName.Repeat;
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.IteratorBindingContext;
  readonly valueProperty = 'items';
  readonly valueDomainKind = BuiltInTemplateControllerValueDomainKind.Iterator;
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Many;
  readonly flowKind = BuiltInTemplateControllerFlowKind.Iteration;
}

@auLink('ui-virtualization:VirtualRepeat', { facet: 'template-controller-semantics' })
export class UiVirtualizationVirtualRepeatTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = BuiltInTemplateControllerName.VirtualRepeat;
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.IteratorBindingContext;
  readonly valueProperty = 'items';
  readonly valueDomainKind = BuiltInTemplateControllerValueDomainKind.Iterator;
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Many;
  readonly flowKind = BuiltInTemplateControllerFlowKind.Iteration;
}

@auLink('runtime-html:With', { facet: 'template-controller-semantics' })
export class RuntimeHtmlWithTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = BuiltInTemplateControllerName.With;
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.ValueBindingContext;
  readonly valueProperty = 'value';
  readonly valueDomainKind = BuiltInTemplateControllerValueDomainKind.OpenEnded;
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Single;
  readonly flowKind = BuiltInTemplateControllerFlowKind.ValueScope;
}

@auLink('runtime-html:Portal', { facet: 'template-controller-semantics' })
export class RuntimeHtmlPortalTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = BuiltInTemplateControllerName.Portal;
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.PassThrough;
  readonly valueProperty = 'target';
  readonly valueDomainKind = BuiltInTemplateControllerValueDomainKind.OpenEnded;
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Single;
  readonly flowKind = BuiltInTemplateControllerFlowKind.PassThrough;
}

@auLink('runtime-html:Switch', { facet: 'template-controller-semantics' })
export class RuntimeHtmlSwitchTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = BuiltInTemplateControllerName.Switch;
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.PassThrough;
  readonly valueProperty = 'value';
  readonly valueDomainKind = BuiltInTemplateControllerValueDomainKind.OpenEnded;
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Single;
  readonly flowKind = BuiltInTemplateControllerFlowKind.Switch;
}

@auLink('runtime-html:Case', { facet: 'template-controller-semantics' })
export class RuntimeHtmlCaseTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = BuiltInTemplateControllerName.Case;
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.PassThrough;
  readonly valueProperty = 'value';
  readonly valueDomainKind = BuiltInTemplateControllerValueDomainKind.OpenEnded;
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Optional;
  readonly flowKind = BuiltInTemplateControllerFlowKind.SwitchCase;
}

@auLink('runtime-html:DefaultCase', { facet: 'template-controller-semantics' })
export class RuntimeHtmlDefaultCaseTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = BuiltInTemplateControllerName.DefaultCase;
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.PassThrough;
  readonly valueProperty = 'value';
  readonly valueDomainKind = BuiltInTemplateControllerValueDomainKind.OpenEnded;
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Optional;
  readonly flowKind = BuiltInTemplateControllerFlowKind.SwitchDefault;
}

@auLink('runtime-html:PromiseTemplateController', { facet: 'template-controller-semantics' })
export class RuntimeHtmlPromiseTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = BuiltInTemplateControllerName.Promise;
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.EmptyObjectBindingContext;
  readonly valueProperty = 'value';
  readonly valueDomainKind = BuiltInTemplateControllerValueDomainKind.OpenEnded;
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Single;
  readonly flowKind = BuiltInTemplateControllerFlowKind.Promise;
}

@auLink('runtime-html:PendingTemplateController', { facet: 'template-controller-semantics' })
export class RuntimeHtmlPendingTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = BuiltInTemplateControllerName.Pending;
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.PassThrough;
  readonly valueProperty = 'value';
  readonly valueDomainKind = BuiltInTemplateControllerValueDomainKind.OpenEnded;
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Optional;
  readonly flowKind = BuiltInTemplateControllerFlowKind.PromisePending;
}

@auLink('runtime-html:FulfilledTemplateController', { facet: 'template-controller-semantics' })
export class RuntimeHtmlFulfilledTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = BuiltInTemplateControllerName.Then;
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.PassThrough;
  readonly valueProperty = 'value';
  readonly valueDomainKind = BuiltInTemplateControllerValueDomainKind.OpenEnded;
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Optional;
  readonly flowKind = BuiltInTemplateControllerFlowKind.PromiseFulfilled;
}

@auLink('runtime-html:RejectedTemplateController', { facet: 'template-controller-semantics' })
export class RuntimeHtmlRejectedTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = BuiltInTemplateControllerName.Catch;
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.PassThrough;
  readonly valueProperty = 'value';
  readonly valueDomainKind = BuiltInTemplateControllerValueDomainKind.OpenEnded;
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Optional;
  readonly flowKind = BuiltInTemplateControllerFlowKind.PromiseRejected;
}

export const runtimeHtmlTemplateControllerSemantics: readonly BuiltInTemplateControllerSemantics[] = [
  new RuntimeHtmlIfTemplateControllerSemantics(),
  new RuntimeHtmlElseTemplateControllerSemantics(),
  new RuntimeHtmlRepeatTemplateControllerSemantics(),
  new RuntimeHtmlWithTemplateControllerSemantics(),
  new RuntimeHtmlPortalTemplateControllerSemantics(),
  new RuntimeHtmlSwitchTemplateControllerSemantics(),
  new RuntimeHtmlCaseTemplateControllerSemantics(),
  new RuntimeHtmlDefaultCaseTemplateControllerSemantics(),
  new RuntimeHtmlPromiseTemplateControllerSemantics(),
  new RuntimeHtmlPendingTemplateControllerSemantics(),
  new RuntimeHtmlFulfilledTemplateControllerSemantics(),
  new RuntimeHtmlRejectedTemplateControllerSemantics(),
];

export const frameworkTemplateControllerSemantics: readonly BuiltInTemplateControllerSemantics[] = [
  ...runtimeHtmlTemplateControllerSemantics,
  new UiVirtualizationVirtualRepeatTemplateControllerSemantics(),
];

export function frameworkTemplateControllerSemanticsForName(
  controllerName: string,
): BuiltInTemplateControllerSemantics | null {
  const key = controllerName.toLowerCase();
  return frameworkTemplateControllerSemantics.find((semantics) => semantics.controllerName === key) ?? null;
}
