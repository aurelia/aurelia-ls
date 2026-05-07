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

export interface BuiltInTemplateControllerSemantics {
  readonly controllerName: string;
  readonly childScopeKind: BuiltInTemplateControllerChildScopeKind;
  readonly valueProperty: BuiltInTemplateControllerValueProperty;
  readonly childViewCardinality: BuiltInTemplateControllerChildViewCardinality;
  readonly flowKind: BuiltInTemplateControllerFlowKind;
}

export class RuntimeHtmlIfTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = 'if';
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.PassThrough;
  readonly valueProperty = 'value';
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Optional;
  readonly flowKind = BuiltInTemplateControllerFlowKind.Conditional;
}

export class RuntimeHtmlElseTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = 'else';
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.PassThrough;
  readonly valueProperty = null;
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Optional;
  readonly flowKind = BuiltInTemplateControllerFlowKind.ConditionalElse;
}

export class RuntimeHtmlRepeatTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = 'repeat';
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.IteratorBindingContext;
  readonly valueProperty = 'items';
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Many;
  readonly flowKind = BuiltInTemplateControllerFlowKind.Iteration;
}

export class RuntimeHtmlWithTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = 'with';
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.ValueBindingContext;
  readonly valueProperty = 'value';
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Single;
  readonly flowKind = BuiltInTemplateControllerFlowKind.ValueScope;
}

export class RuntimeHtmlSwitchTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = 'switch';
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.PassThrough;
  readonly valueProperty = 'value';
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Single;
  readonly flowKind = BuiltInTemplateControllerFlowKind.Switch;
}

export class RuntimeHtmlCaseTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = 'case';
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.PassThrough;
  readonly valueProperty = 'value';
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Optional;
  readonly flowKind = BuiltInTemplateControllerFlowKind.SwitchCase;
}

export class RuntimeHtmlDefaultCaseTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = 'default-case';
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.PassThrough;
  readonly valueProperty = 'value';
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Optional;
  readonly flowKind = BuiltInTemplateControllerFlowKind.SwitchDefault;
}

export class RuntimeHtmlPromiseTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = 'promise';
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.EmptyObjectBindingContext;
  readonly valueProperty = 'value';
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Single;
  readonly flowKind = BuiltInTemplateControllerFlowKind.Promise;
}

export class RuntimeHtmlPendingTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = 'pending';
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.PassThrough;
  readonly valueProperty = 'value';
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Optional;
  readonly flowKind = BuiltInTemplateControllerFlowKind.PromisePending;
}

export class RuntimeHtmlFulfilledTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = 'then';
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.PassThrough;
  readonly valueProperty = 'value';
  readonly childViewCardinality = BuiltInTemplateControllerChildViewCardinality.Optional;
  readonly flowKind = BuiltInTemplateControllerFlowKind.PromiseFulfilled;
}

export class RuntimeHtmlRejectedTemplateControllerSemantics implements BuiltInTemplateControllerSemantics {
  readonly controllerName = 'catch';
  readonly childScopeKind = BuiltInTemplateControllerChildScopeKind.PassThrough;
  readonly valueProperty = 'value';
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
