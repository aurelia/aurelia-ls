import {
  BindingScope,
  BindingScopeCreatorKind,
  BindingScopeOwnerKind,
  type BindingContextSlot,
} from '../configuration/scope.js';
import { isJavaScriptIdentifierName } from '../javascript/identifier.js';

/** Binding-context alias reachability produced by replaying Aurelia Scope ancestry in generated analysis code. */
export interface TemplateScopeAliasSupport {
  /** Whether the current replay point has a generated `$this` binding-context alias. */
  readonly currentBindingContext: boolean;
  /** Number of `$parent` binding-context hops that replay has made reachable from the current point. */
  readonly parentBindingContextDepth: number;
}

/** Runtime Scope ancestry from root to leaf, including controller roots. */
export function templateScopeChain(scope: BindingScope): readonly BindingScope[] {
  const chain: BindingScope[] = [];
  let current: BindingScope | null = scope;
  while (current != null) {
    chain.unshift(current);
    current = current.parent;
  }
  return chain;
}

/** Scope ancestry that generated template analyses must replay after the root controller binding context already exists. */
export function templateScopeReplayChain(scope: BindingScope): readonly BindingScope[] {
  const chain = templateScopeChain(scope);
  const first = chain[0] ?? null;
  const start = first?.ownerKind === BindingScopeOwnerKind.CustomElementController
    || first?.ownerKind === BindingScopeOwnerKind.CustomAttributeController
    ? 1
    : 0;
  return chain.slice(start);
}

/** Whether replaying a scope replaces the current binding context visible through `$this`. */
export function templateScopeCreatesCurrentBindingContextAlias(scope: BindingScope): boolean {
  if (scope.ownerKind === BindingScopeOwnerKind.RepeatedItem) {
    return templateRepeatScopeCurrentAliasExpression(scope) != null;
  }
  if (scope.ownerKind === BindingScopeOwnerKind.SyntheticView) {
    return scope.scopeCreators.some((creator) =>
      creator.creatorKind === BindingScopeCreatorKind.TemplateControllerValueScope
    ) && !scope.scopeCreators.some((creator) =>
      creator.creatorKind === BindingScopeCreatorKind.TemplateControllerPromiseResult
    );
  }
  return scope.ownerKind === BindingScopeOwnerKind.StateBinding;
}

/** Generated object-literal expression that represents the repeated item binding context when locals are identifier-safe. */
export function templateRepeatScopeCurrentAliasExpression(scope: BindingScope): string | null {
  const names = templateScopeBindingContextLocalNames(scope);
  return names.length === 0 ? null : `{ ${names.join(', ')} }`;
}

/** Identifier-safe names introduced into the normal binding context at a replayed scope. */
export function templateScopeBindingContextLocalNames(scope: BindingScope): readonly string[] {
  return scope.bindingContext.slots
    .map((slot) => slot.name)
    .filter(isJavaScriptIdentifierName);
}

/** Slots visible at a replay point when analysis needs to reuse existing locals instead of synthesizing type text. */
export function templateScopeVisibleSlots(scope: BindingScope): readonly BindingContextSlot[] {
  return [
    ...scope.bindingContext.slots,
    ...scope.overrideContext.slots,
  ];
}

/** Alias reachability for copying authored `$this` and `$parent` expressions into generated TypeScript overlays. */
export function templateScopeAliasSupport(scope: BindingScope): TemplateScopeAliasSupport {
  let currentBindingContext = true;
  let parentBindingContextDepth = 0;
  for (const current of templateScopeReplayChain(scope)) {
    if (!templateScopeCreatesCurrentBindingContextAlias(current)) {
      continue;
    }
    parentBindingContextDepth = currentBindingContext ? parentBindingContextDepth + 1 : 0;
    currentBindingContext = true;
  }
  return {
    currentBindingContext,
    parentBindingContextDepth,
  };
}
