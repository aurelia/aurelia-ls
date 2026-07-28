import ts from 'typescript';

import type {
  BindingScope,
} from '../configuration/scope.js';
import {
  RuntimeExpressionAccessTargetResolution,
  type RuntimeExpressionAccessUse,
} from '../runtime-expression/runtime-expression-access-use.js';
import { TypeSystemHotDetails } from '../type-system/product-details.js';
import {
  localKeyPart,
} from '../kernel/local-key.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
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
  CheckerTypeMember,
} from '../type-system/type-shape.js';
import {
  type RuntimeBindingObservedDependency,
  RuntimeObservedMemberSourceState,
  RuntimeObservedMemberSourceRoute,
  RuntimeObservedDependencyKind,
} from './runtime-binding-observation.js';
import type { RuntimeObservedDependencyDraft } from './runtime-observed-dependency-draft.js';

export interface RuntimeObservedMemberSourceProjection {
  readonly observedMemberKind: RuntimeObservedDependencyDraft['observedMemberKind'];
  readonly observedMemberSourceAddressHandle: RuntimeObservedDependencyDraft['observedMemberSourceAddressHandle'];
  /** Whose declaration the address is; owner-value routes are navigation aids, never member proof. */
  readonly observedMemberSourceRoute: RuntimeObservedMemberSourceRoute | null;
}

export function observedMemberSourceForCheckerSymbol(
  publication: KernelPublicationContext,
  checker: ts.TypeChecker,
  symbol: ts.Symbol | null | undefined,
  declarations: readonly ts.Declaration[] | null = null,
): RuntimeObservedMemberSourceProjection | null {
  if (symbol == null) {
    return null;
  }
  const projection = checkerSymbolMemberSourceProjection(
    publication,
    checker,
    symbol,
    declarations ?? undefined,
  );
  return {
    observedMemberKind: projection.memberKind,
    observedMemberSourceAddressHandle: projection.sourceAddressHandle,
    observedMemberSourceRoute: projection.sourceAddressHandle == null
      ? null
      : RuntimeObservedMemberSourceRoute.MemberDeclaration,
  };
}

export function observedMemberSourceFields(
  projection: RuntimeObservedMemberSourceProjection | null,
): Pick<RuntimeObservedDependencyDraft, 'observedMemberKind' | 'observedMemberSourceAddressHandle' | 'observedMemberSourceRoute'> {
  return projection == null
    ? {}
    : {
      observedMemberKind: projection.observedMemberKind,
      observedMemberSourceAddressHandle: projection.observedMemberSourceAddressHandle,
      observedMemberSourceRoute: projection.observedMemberSourceRoute,
    };
}

/** Reuses the target already closed for an access occurrence instead of re-projecting its spelling. */
export function observedMemberSourceForRuntimeExpressionAccessUse(
  publication: KernelPublicationContext,
  accessUse: RuntimeExpressionAccessUse,
): RuntimeObservedMemberSourceProjection | null {
  if (
    accessUse.targetResolution !== RuntimeExpressionAccessTargetResolution.Exact
    || accessUse.targetLinks.length !== 1
  ) {
    return null;
  }
  const target = accessUse.targetLinks[0]!;
  const member = target.targetTypeMemberHandle == null
    ? null
    : publication.readHotDetail(TypeSystemHotDetails.TypeMember, target.targetTypeMemberHandle);
  if (!(member instanceof CheckerTypeMember) && target.declarationSourceAddressHandle == null) {
    return null;
  }
  return {
    observedMemberKind: member instanceof CheckerTypeMember ? member.memberKind : null,
    observedMemberSourceAddressHandle: target.declarationSourceAddressHandle,
    observedMemberSourceRoute: target.declarationSourceAddressHandle == null
      ? null
      : RuntimeObservedMemberSourceRoute.MemberDeclaration,
  };
}

export function observedMemberSourceStateForBindingDependency(input: {
  readonly dependency: RuntimeObservedDependencyDraft;
  readonly scope: BindingScope | null;
  readonly projection: RuntimeObservedMemberSourceProjection | null;
}): RuntimeObservedMemberSourceState {
  // Source means "a source route is closed", including honest owner-value routes for weak/dynamic
  // owners; consumers that need member-declaration proof must additionally check the route field.
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
  publication: KernelPublicationContext,
  checker: ts.TypeChecker,
  ownerType: ts.Type | null | undefined,
  draft: TDraft,
): TDraft {
  if (ownerType == null) {
    return draft;
  }
  const path = simpleObservedDependencyPath(draft);
  if (path.length === 0) {
    return draft;
  }
  const projection = observedMemberSourceForCheckerPath(publication, checker, ownerType, path);
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
  // When checker member lookup fails (unknown element type, missing member on a primitive), the
  // owner's projection is returned as an owner-value route so navigation keeps its best source
  // without masquerading as a member declaration.
  if (access == null) {
    return ownerSource;
  }
  if (access.memberSourceAddressHandle != null) {
    return {
      observedMemberKind: access.memberKind,
      observedMemberSourceAddressHandle: access.memberSourceAddressHandle,
      observedMemberSourceRoute: RuntimeObservedMemberSourceRoute.MemberDeclaration,
    };
  }
  return {
    observedMemberKind: access.memberKind,
    observedMemberSourceAddressHandle: ownerSource?.observedMemberSourceAddressHandle ?? null,
    observedMemberSourceRoute: ownerSource?.observedMemberSourceAddressHandle == null
      ? null
      : RuntimeObservedMemberSourceRoute.OwnerValue,
  };
}

export function observedMemberSourceForCheckerPath(
  publication: KernelPublicationContext,
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
  return observedMemberSourceForCheckerSymbol(publication, checker, currentSymbol);
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
    // Preset draft addresses come from checker member-source projections (proxy, trackable-method,
    // checker-path walks), so an unrouted preset address is the member's own declaration.
    observedMemberSourceRoute: dependency.observedMemberSourceRoute
      ?? (dependency.observedMemberSourceAddressHandle == null
        ? null
        : RuntimeObservedMemberSourceRoute.MemberDeclaration),
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
    const sourceAddressHandle = access?.memberSourceAddressHandle ?? lookup.slot.sourceAddressHandle ?? null;
    return {
      observedMemberKind: access?.memberKind ?? null,
      observedMemberSourceAddressHandle: sourceAddressHandle,
      // A resolved checker member is the identity the expression observes. Slot provenance can be
      // a distinct declaration surface (for example static bindable metadata), so use it only when
      // the member substrate cannot name the reached declaration.
      observedMemberSourceRoute: sourceAddressHandle == null
        ? null
        : RuntimeObservedMemberSourceRoute.MemberDeclaration,
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
      observedMemberSourceAddressHandle: access.memberSourceAddressHandle,
      observedMemberSourceRoute: access.memberSourceAddressHandle == null
        ? null
        : RuntimeObservedMemberSourceRoute.MemberDeclaration,
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
      observedMemberSourceRoute: lookup.slot.sourceAddressHandle == null
        ? null
        : RuntimeObservedMemberSourceRoute.OwnerValue,
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
      observedMemberSourceAddressHandle: access.memberSourceAddressHandle ?? access.sourceAddressHandle,
      observedMemberSourceRoute: (access.memberSourceAddressHandle ?? access.sourceAddressHandle) == null
        ? null
        : RuntimeObservedMemberSourceRoute.OwnerValue,
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
