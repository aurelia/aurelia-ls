import { auLink } from '../kernel/au-link.js';

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
  | null;

export const enum BuiltInTemplateControllerValueDomainKind {
  None = 'none',
  OpenEnded = 'open-ended',
  Iterator = 'iterator',
}

export interface BuiltInTemplateControllerSemantics {
  readonly controllerName: string;
  readonly childScopeKind: BuiltInTemplateControllerChildScopeKind;
  readonly valueProperty: BuiltInTemplateControllerValueProperty;
  readonly valueDomainKind: BuiltInTemplateControllerValueDomainKind;
  readonly childViewCardinality: BuiltInTemplateControllerChildViewCardinality;
  readonly flowKind: BuiltInTemplateControllerFlowKind;
}

@auLink('runtime-html:If', { facet: 'template-controller-semantics' })
export class RuntimeHtmlIfTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = 'if';
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.PassThrough;
  readonly valueProperty = 'value';
  readonly valueDomainKind = BuiltInTemplateControllerValueDomainKind.OpenEnded;
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Optional;
  readonly flowKind = BuiltInTemplateControllerFlowKind.Conditional;
}

@auLink('runtime-html:Else', { facet: 'template-controller-semantics' })
export class RuntimeHtmlElseTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = 'else';
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.PassThrough;
  readonly valueProperty = null;
  readonly valueDomainKind = BuiltInTemplateControllerValueDomainKind.None;
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Optional;
  readonly flowKind = BuiltInTemplateControllerFlowKind.ConditionalElse;
}

@auLink('runtime-html:Repeat', { facet: 'template-controller-semantics' })
export class RuntimeHtmlRepeatTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = 'repeat';
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.IteratorBindingContext;
  readonly valueProperty = 'items';
  readonly valueDomainKind = BuiltInTemplateControllerValueDomainKind.Iterator;
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Many;
  readonly flowKind = BuiltInTemplateControllerFlowKind.Iteration;
}

@auLink('runtime-html:With', { facet: 'template-controller-semantics' })
export class RuntimeHtmlWithTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = 'with';
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.ValueBindingContext;
  readonly valueProperty = 'value';
  readonly valueDomainKind = BuiltInTemplateControllerValueDomainKind.OpenEnded;
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Single;
  readonly flowKind = BuiltInTemplateControllerFlowKind.ValueScope;
}

@auLink('runtime-html:Switch', { facet: 'template-controller-semantics' })
export class RuntimeHtmlSwitchTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = 'switch';
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.PassThrough;
  readonly valueProperty = 'value';
  readonly valueDomainKind = BuiltInTemplateControllerValueDomainKind.OpenEnded;
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Single;
  readonly flowKind = BuiltInTemplateControllerFlowKind.Switch;
}

@auLink('runtime-html:Case', { facet: 'template-controller-semantics' })
export class RuntimeHtmlCaseTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = 'case';
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.PassThrough;
  readonly valueProperty = 'value';
  readonly valueDomainKind = BuiltInTemplateControllerValueDomainKind.OpenEnded;
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Optional;
  readonly flowKind = BuiltInTemplateControllerFlowKind.SwitchCase;
}

@auLink('runtime-html:DefaultCase', { facet: 'template-controller-semantics' })
export class RuntimeHtmlDefaultCaseTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = 'default-case';
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.PassThrough;
  readonly valueProperty = 'value';
  readonly valueDomainKind = BuiltInTemplateControllerValueDomainKind.OpenEnded;
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Optional;
  readonly flowKind = BuiltInTemplateControllerFlowKind.SwitchDefault;
}

@auLink('runtime-html:PromiseTemplateController', { facet: 'template-controller-semantics' })
export class RuntimeHtmlPromiseTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = 'promise';
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.EmptyObjectBindingContext;
  readonly valueProperty = 'value';
  readonly valueDomainKind = BuiltInTemplateControllerValueDomainKind.OpenEnded;
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Single;
  readonly flowKind = BuiltInTemplateControllerFlowKind.Promise;
}

@auLink('runtime-html:PendingTemplateController', { facet: 'template-controller-semantics' })
export class RuntimeHtmlPendingTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = 'pending';
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.PassThrough;
  readonly valueProperty = 'value';
  readonly valueDomainKind = BuiltInTemplateControllerValueDomainKind.OpenEnded;
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Optional;
  readonly flowKind = BuiltInTemplateControllerFlowKind.PromisePending;
}

@auLink('runtime-html:FulfilledTemplateController', { facet: 'template-controller-semantics' })
export class RuntimeHtmlFulfilledTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = 'then';
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.PassThrough;
  readonly valueProperty = 'value';
  readonly valueDomainKind = BuiltInTemplateControllerValueDomainKind.OpenEnded;
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Optional;
  readonly flowKind = BuiltInTemplateControllerFlowKind.PromiseFulfilled;
}

@auLink('runtime-html:RejectedTemplateController', { facet: 'template-controller-semantics' })
export class RuntimeHtmlRejectedTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = 'catch';
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
  new RuntimeHtmlSwitchTemplateControllerSemantics(),
  new RuntimeHtmlCaseTemplateControllerSemantics(),
  new RuntimeHtmlDefaultCaseTemplateControllerSemantics(),
  new RuntimeHtmlPromiseTemplateControllerSemantics(),
  new RuntimeHtmlPendingTemplateControllerSemantics(),
  new RuntimeHtmlFulfilledTemplateControllerSemantics(),
  new RuntimeHtmlRejectedTemplateControllerSemantics(),
];

export function runtimeHtmlTemplateControllerSemanticsForName(
  controllerName: string,
): BuiltInTemplateControllerSemantics | null {
  const key = controllerName.toLowerCase();
  return runtimeHtmlTemplateControllerSemantics.find((semantics) => semantics.controllerName === key) ?? null;
}
