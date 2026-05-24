import ts from 'typescript';

import {
  BindingScope,
} from '../configuration/scope.js';
import type {
  CallMemberExpression,
  CallScopeExpression,
  ExpressionAstNode,
} from '../expression/ast.js';
import type { AddressHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import {
  CheckerExpressionTypeEvaluationResultKind,
} from '../type-system/expression-type-evaluation.js';
import type { CheckerExpressionTypeEvaluator } from '../type-system/expression-type-evaluator.js';
import {
  readCheckerTypeShape,
} from '../type-system/checker-type-shape-access.js';
import { readOrProjectCheckerTypeMembers } from '../type-system/checker-type-member-surface.js';
import { TypeSystemHotDetails } from '../type-system/product-details.js';
import type {
  CheckerTypeMember,
  CheckerTypeShape,
} from '../type-system/type-shape.js';
import {
  ComputedObservationDependencyMode,
} from './computed-observation.js';
import {
  ProxyObservable,
} from './proxy-observable-dependency.js';
import {
  observedDependencyWithMemberSourceForCheckerType,
} from './observed-dependency-member-source.js';
import {
  runtimeObservedDependencySemanticKey,
  type RuntimeObservedDependencyDraft,
} from './runtime-observed-dependency-draft.js';
import {
  connectableDraftsForTrackableDependencyKey,
  readTrackableMethodDependency,
} from './trackable-method-dependency-recognition.js';

export interface RuntimeTrackableMethodObservedDependencyRequest {
  readonly expression: ExpressionAstNode;
  readonly scope: BindingScope;
  readonly store: KernelStore;
  readonly evaluator: CheckerExpressionTypeEvaluator;
  readonly localKey: string;
  readonly sourceAddressHandle: AddressHandle | null;
}

/**
 * Collect dependencies that Aurelia adds when an observed template expression invokes a trackable source method.
 *
 * Ordinary expression reads stay in `connectable-observed-dependency.ts`; this pass adds method-declaration execution
 * dependencies for `@computed`/`@astTrack` methods only. Undecorated source-method bodies are not proxy-observed by
 * `astEvaluate`; model them as ordinary method calls plus their argument/receiver reads, not hidden body subscriptions.
 */
export function collectRuntimeTrackableMethodObservedDependencyDrafts(
  request: RuntimeTrackableMethodObservedDependencyRequest,
): readonly RuntimeObservedDependencyDraft[] {
  const collector = new RuntimeTrackableMethodObservedDependencyCollector(request);
  collector.visit(request.expression);
  return collector.read();
}

class RuntimeTrackableMethodObservedDependencyCollector {
  private readonly rows = new Map<string, RuntimeObservedDependencyDraft>();

  constructor(private readonly request: RuntimeTrackableMethodObservedDependencyRequest) {}

  read(): readonly RuntimeObservedDependencyDraft[] {
    return [...this.rows.values()].sort((left, right) =>
      `${left.dependencyKind}:${left.sourceName ?? ''}:${left.methodName ?? ''}:${left.expressionKind}`
        .localeCompare(`${right.dependencyKind}:${right.sourceName ?? ''}:${right.methodName ?? ''}:${right.expressionKind}`)
    );
  }

  visit(expression: ExpressionAstNode | null): void {
    if (expression == null) {
      return;
    }
    switch (expression.$kind) {
      case 'CallScope':
        this.recordCallScope(expression);
        expression.args.forEach((arg) => this.visit(arg));
        return;
      case 'CallMember':
        this.recordCallMember(expression);
        this.visit(expression.object);
        expression.args.forEach((arg) => this.visit(arg));
        return;
      case 'CallFunction':
        this.visit(expression.func);
        expression.args.forEach((arg) => this.visit(arg));
        return;
      case 'AccessMember':
      case 'AccessKeyed':
        this.visit(expression.object);
        if (expression.$kind === 'AccessKeyed') {
          this.visit(expression.key);
        }
        return;
      case 'Paren':
      case 'Unary':
        this.visit(expression.expression);
        return;
      case 'BindingBehavior':
        this.visit(expression.expression);
        return;
      case 'ValueConverter':
        this.visit(expression.expression);
        expression.args.forEach((arg) => this.visit(arg));
        return;
      case 'Assign':
        this.visit(expression.target);
        this.visit(expression.value);
        return;
      case 'Conditional':
        this.visit(expression.condition);
        this.visit(expression.yes);
        this.visit(expression.no);
        return;
      case 'Binary':
        this.visit(expression.left);
        this.visit(expression.right);
        return;
      case 'ArrayLiteral':
        expression.elements.forEach((element) => this.visit(element));
        return;
      case 'ObjectLiteral':
        expression.values.forEach((value) => this.visit(value));
        return;
      case 'Template':
      case 'Interpolation':
        expression.expressions.forEach((part) => this.visit(part));
        return;
      case 'TaggedTemplate':
        this.visit(expression.func);
        expression.expressions.forEach((part) => this.visit(part));
        return;
      case 'New':
        this.visit(expression.func);
        expression.args.forEach((arg) => this.visit(arg));
        return;
      case 'ForOfStatement':
        this.visit(expression.iterable);
        return;
      case 'DestructuringAssignment':
        this.visit(expression.source);
        return;
      case 'BindingPatternDefault':
        this.visit(expression.default);
        return;
      case 'AccessScope':
      case 'AccessGlobal':
      case 'AccessThis':
      case 'AccessBoundary':
      case 'ArrowFunction':
      case 'BindingIdentifier':
      case 'BindingPatternHole':
      case 'CallGlobal':
      case 'Custom':
      case 'Identifier':
      case 'PrimitiveLiteral':
      case 'ArrayBindingPattern':
      case 'ObjectBindingPattern':
        return;
    }
    const exhaustive: never = expression;
    return exhaustive;
  }

  private recordCallScope(expression: CallScopeExpression): void {
    const lookup = this.request.scope.locate(expression.name.name, expression.ancestor);
    const slotMember = checkerTypeMemberForSlot(this.request.store, lookup.slot);
    if (slotMember != null) {
      this.recordTrackableTypeMember(slotMember);
    }
    const ownerType = readCheckerTypeShape(this.request.store, lookup.context?.contextType ?? null);
    this.recordTrackableMember(ownerType, expression.name.name);
  }

  private recordCallMember(expression: CallMemberExpression): void {
    const ownerEvaluation = this.request.evaluator.evaluateWithScope(
      expression.object,
      this.request.scope,
      `${this.request.localKey}:trackable-owner:${expression.span.start}`,
      this.request.sourceAddressHandle,
      null,
      { connectable: true, strict: null },
    );
    const ownerType = ownerEvaluation.kind === CheckerExpressionTypeEvaluationResultKind.Type
      ? ownerEvaluation.typeShape
      : null;
    this.recordCallableMember(ownerType, expression);
  }

  private recordCallableMember(
    ownerType: CheckerTypeShape | null,
    expression: CallMemberExpression,
  ): void {
    const member = ownerType == null
      ? null
      : readOrProjectCheckerTypeMembers(
        this.request.store,
        ownerType,
        ownerType.productHandle ?? `${this.request.localKey}:trackable-method-owner`,
      ).find((candidate) => candidate.name === expression.name.name) ?? null;
    if (member == null) {
      return;
    }
    const trackableDependencies = trackableDependenciesForMember(this.request.store, member);
    if (trackableDependencies.length > 0) {
      for (const dependency of trackableDependencies) {
        this.add(dependency);
      }
    }
  }

  private recordTrackableMember(
    ownerType: CheckerTypeShape | null,
    methodName: string,
  ): void {
    const member = ownerType == null
      ? null
      : readOrProjectCheckerTypeMembers(
        this.request.store,
        ownerType,
        ownerType.productHandle ?? `${this.request.localKey}:trackable-method-owner`,
      ).find((candidate) => candidate.name === methodName) ?? null;
    if (member != null) {
      this.recordTrackableTypeMember(member);
    }
  }

  private recordTrackableTypeMember(member: CheckerTypeMember): void {
    for (const dependency of trackableDependenciesForMember(this.request.store, member)) {
      this.add(dependency);
    }
  }

  private add(row: RuntimeObservedDependencyDraft): void {
    const key = runtimeObservedDependencySemanticKey(row);
    if (!this.rows.has(key)) {
      this.rows.set(key, row);
    }
  }
}

function checkerTypeMemberForSlot(
  store: KernelStore,
  slot: BindingScope['bindingContext']['slots'][number] | null,
): CheckerTypeMember | null {
  if (slot?.targetProductHandle == null) {
    return null;
  }
  return store.hotDetails.read(TypeSystemHotDetails.TypeMember, slot.targetProductHandle) ?? null;
}

function trackableDependenciesForMember(
  store: KernelStore,
  member: CheckerTypeMember,
): readonly RuntimeObservedDependencyDraft[] {
  const carrier = member.carrier
    ?? (member.productHandle == null ? null : store.hotDetails.read(TypeSystemHotDetails.TypeMember, member.productHandle)?.carrier)
    ?? null;
  if (carrier == null) {
    return [];
  }
  const method = carrier.declarations.find(ts.isMethodDeclaration) ?? null;
  if (method == null) {
    return [];
  }
  const dependency = readTrackableMethodDependency(method);
  if (dependency == null || dependency.dependencyMode === ComputedObservationDependencyMode.Disabled) {
    return [];
  }
  if (dependency.dependencyMode === ComputedObservationDependencyMode.ProxyAutoTrack) {
    return methodBodyProxyDependencies(store, method, carrier.checker);
  }
  const receiverType = member.ownerType.productHandle == null
    ? null
    : readCheckerTypeShape(store, member.ownerType)?.carrier?.type ?? null;
  return [
    ...dependency.dependencyKeyReads.flatMap((key) =>
      connectableDraftsForTrackableDependencyKey(key)
        .map((draft) => trackableReceiverDependencyDraft(store, carrier.checker, receiverType, draft))
    ),
    ...dependency.dependencyFunctions.flatMap((fn) =>
      ProxyObservable.collectObservedDependencyDrafts(
        fn,
        ProxyObservable.typeContextForChecker(carrier.checker, store),
      )
    ),
  ].map(withoutSourceSpan);
}

function methodBodyProxyDependencies(
  store: KernelStore,
  method: ts.MethodDeclaration,
  checker: ts.TypeChecker,
): readonly RuntimeObservedDependencyDraft[] {
  return ProxyObservable.collectObservedDependencyDrafts(
    method,
    ProxyObservable.typeContextForChecker(checker, store),
    {
      rootNames: ['this'],
      parameterRootNames: true,
    },
  ).map(withoutSourceSpan);
}

function trackableReceiverDependencyDraft<TDraft extends RuntimeObservedDependencyDraft>(
  store: KernelStore,
  checker: ts.TypeChecker,
  receiverType: ts.Type | null,
  draft: TDraft,
): TDraft {
  return observedDependencyWithMemberSourceForCheckerType(store, checker, receiverType, draft);
}

function withoutSourceSpan<TDraft extends RuntimeObservedDependencyDraft>(
  draft: TDraft,
): TDraft {
  return {
    ...draft,
    memberNameSpanStart: null,
    scopeLookupAncestor: null,
    spanStart: null,
    spanEnd: null,
  };
}
