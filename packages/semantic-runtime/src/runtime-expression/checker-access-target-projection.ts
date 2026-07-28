import ts from 'typescript';

import type { ExpressionAstNode } from '../expression/ast.js';
import type { BindingScope } from '../configuration/scope.js';
import { uncommittedScopeCreate } from '../configuration/uncommitted-binding-scope.js';
import type { KernelStore } from '../kernel/store.js';
import {
  CheckerTypeMemberProjectionPolicy,
} from '../type-system/checker-projector.js';
import {
  readCheckerTypeShape,
} from '../type-system/checker-type-shape-access.js';
import {
  RuntimeExpressionAccessTargetLink,
  RuntimeExpressionAccessTargetResolution,
} from './runtime-expression-access-use.js';
import {
  CheckerExpressionAccessTargetResolutionKind,
  type CheckerExpressionAccessTargetResolution,
} from '../type-system/expression-access-target.js';
import {
  type CheckerExpressionAccessTargetExpression,
  type CheckerExpressionTypeEvaluator,
} from '../type-system/expression-type-evaluator.js';
import {
  astEvaluateOnlyRuntimeContext,
  CheckerExpressionTypeEvaluationContext,
} from '../type-system/expression-type-context.js';
import type { CheckerExpressionTypeWorld } from '../type-system/expression-type-world.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  CheckerTypeProjectionOrigin,
  type CheckerTypeReference,
  type CheckerTypeShape,
} from '../type-system/type-shape.js';

/** Runtime-expression vocabulary projected from the shared checker target authority. */
export class RuntimeCheckerAccessTargetProjection {
  constructor(
    readonly resolution: RuntimeExpressionAccessTargetResolution,
    readonly links: readonly RuntimeExpressionAccessTargetLink[],
  ) {}
}

export function runtimeCheckerAccessTargetProjection(
  target: CheckerExpressionAccessTargetResolution,
): RuntimeCheckerAccessTargetProjection {
  return new RuntimeCheckerAccessTargetProjection(
    runtimeAccessTargetResolution(target.kind),
    target.targets.map((candidate) => new RuntimeExpressionAccessTargetLink(
      candidate.authorityProductHandle,
      candidate.targetIdentityHandle,
      candidate.targetTypeMemberHandle,
      candidate.targetTypeSourceMemberHandle,
      candidate.declarationSourceAddressHandle,
    )),
  );
}

/** Root-object target projection shared by source watcher, effect, and computed string-expression lanes. */
export class RuntimeRootExpressionAccessTargetProjector {
  private readonly evaluator: CheckerExpressionTypeEvaluator;
  private readonly scope: BindingScope;

  private constructor(
    store: KernelStore,
    expressionWorld: CheckerExpressionTypeWorld,
    rootType: CheckerTypeShape,
    private readonly localKey: string,
  ) {
    this.evaluator = expressionWorld.evaluator();
    this.scope = uncommittedScopeCreate(store, {
      localKey,
      bindingContextType: rootType.toReference(),
      sourceAddressHandle: rootType.declarationSourceAddressHandle ?? rootType.sourceAddressHandle,
    });
  }

  static forTypeReference(
    store: KernelStore,
    expressionWorld: CheckerExpressionTypeWorld,
    rootType: CheckerTypeReference | null,
    localKey: string,
  ): RuntimeRootExpressionAccessTargetProjector | null {
    const root = readCheckerTypeShape(expressionWorld.projector.publication, rootType);
    return root == null
      ? null
      : new RuntimeRootExpressionAccessTargetProjector(store, expressionWorld, root, localKey);
  }

  static forCheckerType(input: {
    readonly store: KernelStore;
    readonly expressionWorld: CheckerExpressionTypeWorld;
    readonly typeSystem: TypeSystemProject;
    readonly rootType: ts.Type | null;
    readonly sourceNode: ts.Node | null;
    readonly localKey: string;
  }): RuntimeRootExpressionAccessTargetProjector | null {
    if (input.rootType == null) {
      return null;
    }
    const root = input.expressionWorld.projector.ensureProjection({
      localKey: `${input.localKey}:root`,
      checker: input.typeSystem.checker,
      type: input.rootType,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceNode: input.sourceNode,
      memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
    });
    return new RuntimeRootExpressionAccessTargetProjector(
      input.store,
      input.expressionWorld,
      root,
      input.localKey,
    );
  }

  project(expression: ExpressionAstNode): RuntimeCheckerAccessTargetProjection {
    if (!isRootExpressionAccessTarget(expression)) {
      return new RuntimeCheckerAccessTargetProjection(RuntimeExpressionAccessTargetResolution.Open, []);
    }
    const context = CheckerExpressionTypeEvaluationContext.knownScope(
      expression,
      this.scope,
      this.localKey,
      this.scope.sourceAddressHandle,
      null,
      astEvaluateOnlyRuntimeContext(true, null),
    );
    return runtimeCheckerAccessTargetProjection(this.evaluator.resolveAccessTarget(context, expression));
  }
}

function runtimeAccessTargetResolution(
  kind: CheckerExpressionAccessTargetResolutionKind,
): RuntimeExpressionAccessTargetResolution {
  switch (kind) {
    case CheckerExpressionAccessTargetResolutionKind.Exact:
      return RuntimeExpressionAccessTargetResolution.Exact;
    case CheckerExpressionAccessTargetResolutionKind.Finite:
      return RuntimeExpressionAccessTargetResolution.Finite;
    case CheckerExpressionAccessTargetResolutionKind.IndexSignature:
      return RuntimeExpressionAccessTargetResolution.IndexSignature;
    case CheckerExpressionAccessTargetResolutionKind.Missing:
      return RuntimeExpressionAccessTargetResolution.Missing;
    case CheckerExpressionAccessTargetResolutionKind.Open:
      return RuntimeExpressionAccessTargetResolution.Open;
  }
}

function isRootExpressionAccessTarget(
  expression: ExpressionAstNode,
): expression is CheckerExpressionAccessTargetExpression {
  return expression.$kind === 'AccessThis'
    || expression.$kind === 'AccessScope'
    || expression.$kind === 'CallScope'
    || expression.$kind === 'AccessMember'
    || expression.$kind === 'CallMember'
    || expression.$kind === 'AccessKeyed';
}
