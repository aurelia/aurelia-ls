import ts from 'typescript';

import type {
  BindingScope,
} from '../configuration/scope.js';
import {
  localKeyPart,
} from '../kernel/local-key.js';
import type { KernelStore } from '../kernel/store.js';
import {
  checkerSymbolMemberSourceProjection,
} from '../type-system/checker-type-member-source.js';
import {
  checkerPropertySymbol,
  checkerSymbolValueType,
} from '../type-system/checker-node-helpers.js';
import type {
  CheckerExpressionTypeEvaluationContext,
} from '../type-system/expression-type-context.js';
import type {
  CheckerExpressionTypeEvaluator,
} from '../type-system/expression-type-evaluator.js';
import {
  type RuntimeBindingObservedDependency,
  RuntimeObservedMemberSourceState,
  RuntimeObservedDependencyKind,
} from './runtime-binding-observation.js';
import type { RuntimeObservedDependencyDraft } from './runtime-observed-dependency-draft.js';

export interface RuntimeObservedMemberSourceProjection {
  readonly observedMemberKind: RuntimeObservedDependencyDraft['observedMemberKind'];
  readonly observedMemberSourceAddressHandle: RuntimeObservedDependencyDraft['observedMemberSourceAddressHandle'];
}

export function observedMemberSourceForCheckerSymbol(
  store: KernelStore,
  symbol: ts.Symbol | null | undefined,
  declarations: readonly ts.Declaration[] | null = null,
): RuntimeObservedMemberSourceProjection | null {
  if (symbol == null) {
    return null;
  }
  const projection = checkerSymbolMemberSourceProjection(store, symbol, declarations ?? undefined);
  return {
    observedMemberKind: projection.memberKind,
    observedMemberSourceAddressHandle: projection.sourceAddressHandle,
  };
}

export function observedMemberSourceFields(
  projection: RuntimeObservedMemberSourceProjection | null,
): Pick<RuntimeObservedDependencyDraft, 'observedMemberKind' | 'observedMemberSourceAddressHandle'> {
  return projection == null
    ? {}
    : {
      observedMemberKind: projection.observedMemberKind,
      observedMemberSourceAddressHandle: projection.observedMemberSourceAddressHandle,
    };
}

export function observedMemberSourceStateForBindingDependency(input: {
  readonly dependency: RuntimeObservedDependencyDraft;
  readonly scope: BindingScope | null;
  readonly projection: RuntimeObservedMemberSourceProjection | null;
}): RuntimeObservedMemberSourceState {
  if (input.projection?.observedMemberSourceAddressHandle != null) {
    return RuntimeObservedMemberSourceState.Source;
  }
  if (isTemporaryObservedCollectionOwner(input.dependency)) {
    return RuntimeObservedMemberSourceState.TemporaryValue;
  }
  if (isRuntimeScopeNameDependency(input.dependency)) {
    return RuntimeObservedMemberSourceState.RuntimeScopeName;
  }
  if (!hasConcreteObservedMemberProjection(input.projection) && isScopeOpenRootDependency(input.dependency, input.scope)) {
    return RuntimeObservedMemberSourceState.ScopeOpen;
  }
  return RuntimeObservedMemberSourceState.Open;
}

export function isRuntimeObservedDependencyScopeOpenRoot(
  dependency: RuntimeBindingObservedDependency,
): boolean {
  return dependency.observedMemberSourceState === RuntimeObservedMemberSourceState.ScopeOpen
    && isDirectScopeRootDependency(dependency);
}

export function observedDependencyWithMemberSourceForCheckerType<TDraft extends RuntimeObservedDependencyDraft>(
  store: KernelStore | null | undefined,
  checker: ts.TypeChecker,
  ownerType: ts.Type | null | undefined,
  draft: TDraft,
): TDraft {
  if (store == null || ownerType == null) {
    return draft;
  }
  const path = simpleObservedDependencyPath(draft);
  if (path.length === 0) {
    return draft;
  }
  const projection = observedMemberSourceForCheckerPath(store, checker, ownerType, path);
  return projection == null
    ? draft
    : {
      ...draft,
      ...projection,
    };
}

/** Projects member source fields for a binding expression dependency through the active runtime BindingScope. */
export function observedMemberSourceForBindingDependency(input: {
  readonly dependency: RuntimeObservedDependencyDraft;
  readonly checkerContext: CheckerExpressionTypeEvaluationContext;
  readonly evaluator: CheckerExpressionTypeEvaluator;
  readonly localKey: string;
}): RuntimeObservedMemberSourceProjection | null {
  const directProjection = directObservedMemberSourceProjection(input.dependency);
  if (directProjection != null) {
    return directProjection;
  }
  const memberNameSpanStart = input.dependency.memberNameSpanStart ?? null;
  if (input.dependency.memberName == null || memberNameSpanStart == null) {
    return input.dependency.keyExpression != null
      ? observedOwnerSourceProjectionForDependency(
        input.dependency,
        input.checkerContext.scope,
        input.evaluator,
        input.localKey,
      )
      : observedScopeNameProjectionForDependency(
        input.dependency,
        input.checkerContext.scope,
        input.evaluator,
        input.localKey,
      );
  }
  const access = input.evaluator.evaluateMemberValueAccessAtOffset(
    input.checkerContext.child(
      input.checkerContext.expression,
      `observed-dependency:member:${input.dependency.spanStart ?? 'open'}:${localKeyPart(input.dependency.memberName)}`,
    ),
    memberNameSpanStart,
    input.dependency.memberName,
  );
  const ownerSource = observedOwnerSourceProjectionForDependency(
    input.dependency,
    input.checkerContext.scope,
    input.evaluator,
    input.localKey,
  );
  if (access == null) {
    return ownerSource;
  }
  return {
    observedMemberKind: access.memberKind,
    observedMemberSourceAddressHandle: access.sourceAddressHandle ?? ownerSource?.observedMemberSourceAddressHandle ?? null,
  };
}

export function observedMemberSourceForCheckerPath(
  store: KernelStore,
  checker: ts.TypeChecker,
  ownerType: ts.Type,
  path: readonly string[],
): RuntimeObservedMemberSourceProjection | null {
  let current: ts.Type | null = ownerType;
  let currentSymbol: ts.Symbol | null = null;
  for (const segment of path) {
    if (current == null) {
      return null;
    }
    currentSymbol = checkerPropertySymbol(checker, current, segment);
    if (currentSymbol == null) {
      return null;
    }
    current = checkerSymbolValueType(checker, currentSymbol);
  }
  return observedMemberSourceForCheckerSymbol(store, currentSymbol);
}

function simpleObservedDependencyPath(
  draft: RuntimeObservedDependencyDraft,
): readonly string[] {
  const sourceName = draft.sourceName ?? draft.sourceRootName;
  if (sourceName == null || !/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/u.test(sourceName)) {
    return [];
  }
  const parts = sourceName.split('.');
  return parts[0] === 'this' ? parts.slice(1) : parts;
}

function directObservedMemberSourceProjection(
  dependency: RuntimeObservedDependencyDraft,
): RuntimeObservedMemberSourceProjection | null {
  if (dependency.observedMemberKind == null && dependency.observedMemberSourceAddressHandle == null) {
    return null;
  }
  return {
    observedMemberKind: dependency.observedMemberKind ?? null,
    observedMemberSourceAddressHandle: dependency.observedMemberSourceAddressHandle ?? null,
  };
}

function observedScopeNameProjectionForDependency(
  dependency: RuntimeObservedDependencyDraft,
  scope: BindingScope,
  evaluator: CheckerExpressionTypeEvaluator,
  localKey: string,
): RuntimeObservedMemberSourceProjection | null {
  const name = dependency.sourceName ?? dependency.sourceRootName;
  if (name == null) {
    return null;
  }
  const isScopeExpression =
    (dependency.expressionKind === 'AccessScope' || dependency.expressionKind === 'CallScope')
    && dependency.scopeLookupAncestor != null;
  const isDirectCollectionOwner =
    dependency.dependencyKind === RuntimeObservedDependencyKind.TemplateCollectionRead
    && dependency.memberName == null
    && dependency.keyExpression == null
    && dependency.sourceName === dependency.sourceRootName
    && dependency.sourceName === name
    && dependency.scopeLookupAncestor != null;
  if (!isScopeExpression && !isDirectCollectionOwner) {
    return null;
  }
  const lookup = scope.locate(name, dependency.scopeLookupAncestor ?? 0);
  if (lookup.slot != null) {
    const access = evaluator.memberValueAccessForReference(
      lookup.context?.contextType ?? null,
      name,
      `${localKey}:observed-dependency:scope-slot:${dependency.spanStart ?? 'open'}:${localKeyPart(name)}`,
    );
    return {
      observedMemberKind: access?.memberKind ?? null,
      observedMemberSourceAddressHandle: lookup.slot.sourceAddressHandle ?? access?.sourceAddressHandle ?? null,
    };
  }
  const access = evaluator.memberValueAccessForReference(
    lookup.context?.contextType ?? null,
    name,
    `${localKey}:observed-dependency:scope-name:${dependency.spanStart ?? 'open'}:${localKeyPart(name)}`,
  );
  return access == null
    ? null
    : {
      observedMemberKind: access.memberKind,
      observedMemberSourceAddressHandle: access.sourceAddressHandle,
    };
}

function observedOwnerSourceProjectionForDependency(
  dependency: RuntimeObservedDependencyDraft,
  scope: BindingScope,
  evaluator: CheckerExpressionTypeEvaluator,
  localKey: string,
): RuntimeObservedMemberSourceProjection | null {
  const rootName = dependency.sourceRootName;
  if (rootName == null || dependency.scopeLookupAncestor == null) {
    return null;
  }
  const lookup = scope.locate(rootName, dependency.scopeLookupAncestor);
  if (lookup.slot != null) {
    return {
      observedMemberKind: null,
      observedMemberSourceAddressHandle: lookup.slot.sourceAddressHandle,
    };
  }
  const access = evaluator.memberValueAccessForReference(
    lookup.context?.contextType ?? null,
    rootName,
    `${localKey}:observed-dependency:owner-source:${dependency.spanStart ?? 'open'}:${localKeyPart(rootName)}`,
  );
  return access == null
    ? null
    : {
      observedMemberKind: null,
      observedMemberSourceAddressHandle: access.sourceAddressHandle,
    };
}

function isScopeOpenRootDependency(
  dependency: RuntimeObservedDependencyDraft,
  scope: BindingScope | null,
): boolean {
  if (!isDirectScopeRootDependency(dependency) || dependency.scopeLookupAncestor == null || scope == null) {
    return false;
  }
  const rootName = dependency.sourceRootName;
  if (rootName == null) {
    return false;
  }
  const lookup = scope.locate(rootName, dependency.scopeLookupAncestor);
  return lookup.slot == null && lookup.context != null && (
    lookup.context.contextType != null
    || lookup.context.slots.length > 0
    || lookup.context.sourceAddressHandle != null
  );
}

function hasConcreteObservedMemberProjection(
  projection: RuntimeObservedMemberSourceProjection | null,
): boolean {
  return projection?.observedMemberKind != null
    || projection?.observedMemberSourceAddressHandle != null;
}

function isDirectScopeRootDependency(
  dependency: Pick<
    RuntimeObservedDependencyDraft,
    'dependencyKind'
    | 'expressionKind'
    | 'sourceName'
    | 'sourceRootName'
    | 'memberName'
    | 'keyExpression'
    | 'methodName'
  >,
): boolean {
  if (
    dependency.dependencyKind !== RuntimeObservedDependencyKind.TemplateExpressionRead
    || dependency.sourceRootName == null
    || dependency.sourceName !== dependency.sourceRootName
    || dependency.memberName != null
    || dependency.keyExpression != null
  ) {
    return false;
  }
  return (
    dependency.expressionKind === 'AccessScope'
    && dependency.methodName == null
  ) || (
    dependency.expressionKind === 'CallScope'
    && dependency.methodName === dependency.sourceRootName
  );
}

function isTemporaryObservedCollectionOwner(
  dependency: RuntimeObservedDependencyDraft,
): boolean {
  return (
    (
      dependency.dependencyKind === RuntimeObservedDependencyKind.TemplateCollectionRead
      || dependency.dependencyKind === RuntimeObservedDependencyKind.ProxyCollectionRead
      || dependency.dependencyKind === RuntimeObservedDependencyKind.DeepCollectionRead
    )
    && dependency.memberName == null
    && dependency.keyExpression == null
    && dependency.methodName != null
    && dependency.sourceName != null
    && dependency.sourceRootName != null
    && dependency.sourceName !== dependency.sourceRootName
  );
}

function isRuntimeScopeNameDependency(
  dependency: RuntimeObservedDependencyDraft,
): boolean {
  return dependency.scopeLookupAncestor === 0
    && dependency.sourceRootName === '$host'
    && dependency.sourceName === '$host';
}
