import {
  BindingScope,
  BindingScopeCreatorKind,
  BindingScopeOwnerKind,
  bindingScopeCreatorKey,
  type BindingContextSlot,
  type BindingContextSlotMemberType,
  type BindingScopeCreator,
} from '../configuration/scope.js';
import { isJavaScriptIdentifierName } from '../javascript/identifier.js';
import { sameCheckerTypeReference } from '../type-system/type-shape.js';

/** Binding-context alias reachability produced by replaying Aurelia Scope ancestry in generated analysis code. */
export interface TemplateScopeAliasSupport {
  /** Whether the current replay point has a generated `$this` binding-context alias. */
  readonly currentBindingContext: boolean;
  /** Number of `$parent` binding-context hops that replay has made reachable from the current point. */
  readonly parentBindingContextDepth: number;
}

export interface TemplateScopeSourceReplayRelation {
  /** Source-scope replay layers that must be synthesized around an expression at the ambient analysis site. */
  readonly tail: readonly BindingScope[];
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

/** Whether an ambient same-level overlay scope has replayed the source scope's creator and slot facts. */
export function templateScopeCanReplaySourceScope(
  ambientScope: BindingScope,
  sourceScope: BindingScope,
): boolean {
  if (ambientScope.productHandle === sourceScope.productHandle) {
    return true;
  }
  if (ambientScope.ownerKind !== BindingScopeOwnerKind.SyntheticView) {
    return false;
  }
  if (ambientScope.parent?.productHandle !== sourceScope.parent?.productHandle) {
    return false;
  }
  return scopeCreatorsInclude(ambientScope.scopeCreators, sourceScope.scopeCreators)
    && visibleSlotsInclude(templateScopeVisibleSlots(ambientScope), templateScopeVisibleSlots(sourceScope));
}

/** Whether source-scope bindings can be evaluated at an ambient generated analysis point. */
export function templateScopeCanEvaluateSourceScope(
  ambientScope: BindingScope,
  sourceScope: BindingScope,
): boolean {
  return templateScopeIsAncestorOrSelf(sourceScope, ambientScope)
    || templateScopeCanReplaySourceScope(ambientScope, sourceScope);
}

/**
 * Relationship needed when generated analyses must copy a source expression under an ambient scope.
 *
 * A non-empty tail means the source expression belongs to a deeper source scope that can be synthesized around the
 * copied expression. This is deliberately broader than `templateScopeCanEvaluateSourceScope(...)`, which answers
 * whether the ambient scope can evaluate the source expression without introducing any extra scope layers.
 */
export function templateScopeSourceReplayRelation(
  ambientScope: BindingScope,
  sourceScope: BindingScope,
): TemplateScopeSourceReplayRelation | null {
  const ambient = templateScopeChain(ambientScope);
  const source = templateScopeChain(sourceScope);
  if (templateScopeCanReplaySourceScope(ambientScope, sourceScope)) {
    return { tail: [] };
  }
  if (scopeChainStartsWith(ambient, source)) {
    return { tail: [] };
  }
  if (scopeChainStartsWith(source, ambient)) {
    return { tail: source.slice(ambient.length) };
  }
  return null;
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

function templateScopeIsAncestorOrSelf(
  ancestor: BindingScope,
  scope: BindingScope,
): boolean {
  let current: BindingScope | null = scope;
  while (current != null) {
    if (current.productHandle === ancestor.productHandle) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function scopeCreatorsInclude(
  ambient: readonly BindingScopeCreator[],
  source: readonly BindingScopeCreator[],
): boolean {
  const ambientKeys = new Set(ambient.map(bindingScopeCreatorKey));
  return source.every((creator) => ambientKeys.has(bindingScopeCreatorKey(creator)));
}

function visibleSlotsInclude(
  ambient: readonly BindingContextSlot[],
  source: readonly BindingContextSlot[],
): boolean {
  return source.every((sourceSlot) =>
    ambient.some((ambientSlot) => bindingContextSlotsMatch(ambientSlot, sourceSlot))
  );
}

function bindingContextSlotsMatch(
  left: BindingContextSlot,
  right: BindingContextSlot,
): boolean {
  return left.name === right.name
    && left.targetIdentityHandle === right.targetIdentityHandle
    && left.targetProductHandle === right.targetProductHandle
    && left.sourceAddressHandle === right.sourceAddressHandle
    && slotTypeReferencesMatch(left, right)
    && slotMemberTypesInclude(left.memberTypes, right.memberTypes);
}

function slotTypeReferencesMatch(
  left: BindingContextSlot,
  right: BindingContextSlot,
): boolean {
  if (
    left.targetIdentityHandle != null
    || left.targetProductHandle != null
    || left.sourceAddressHandle != null
  ) {
    return true;
  }
  return left.targetType == null || right.targetType == null
    ? left.targetType === right.targetType
    : sameCheckerTypeReference(left.targetType, right.targetType);
}

function slotMemberTypesInclude(
  ambient: readonly BindingContextSlotMemberType[],
  source: readonly BindingContextSlotMemberType[],
): boolean {
  return source.every((sourceMember) =>
    ambient.some((ambientMember) => slotMemberTypeMatches(ambientMember, sourceMember))
  );
}

function slotMemberTypeMatches(
  left: BindingContextSlotMemberType,
  right: BindingContextSlotMemberType,
): boolean {
  if (left.name !== right.name || left.sourceAddressHandle !== right.sourceAddressHandle) {
    return false;
  }
  if (left.sourceAddressHandle != null) {
    return true;
  }
  return left.name === right.name
    && sameCheckerTypeReference(left.targetType, right.targetType);
}

function scopeChainStartsWith(
  chain: readonly BindingScope[],
  prefix: readonly BindingScope[],
): boolean {
  if (prefix.length > chain.length) {
    return false;
  }
  for (let index = 0; index < prefix.length; index += 1) {
    if (chain[index]?.productHandle !== prefix[index]?.productHandle) {
      return false;
    }
  }
  return true;
}
