import ts from 'typescript';

import {
  isAssignmentOperator,
  isNestedExecutionBoundary,
  TypeScriptAccessMode,
  typescriptAccessModeForExpression,
} from '../evaluation/ts-syntax.js';
import {
  SourceFileRef,
  sourceSpanFromBounds,
  type SourceSpan,
} from '../expression/source-span.js';
import type { KernelStore } from '../kernel/store.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import type {
  RuntimeObservedDependencyAccessDraft,
} from '../observation/runtime-observed-dependency-draft.js';
import {
  runtimeProxyObservedCollectionMethods,
} from '../observation/runtime-collection-method-semantics.js';
import {
  checkerNumberIndexValueType,
  checkerStringIndexValueType,
} from '../type-system/checker-related-types.js';
import {
  CheckerTypeMemberProjectionPolicy,
  CheckerTypeProjector,
} from '../type-system/checker-projector.js';
import { checkerPropertySymbol } from '../type-system/checker-node-helpers.js';
import {
  checkerTypeMemberSourceAddressHandle,
} from '../type-system/checker-type-member-source.js';
import { ensureSourceFileAddressForCheckerNode } from '../type-system/declaration-source.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  CheckerTypeProjectionOrigin,
  checkerTypeMemberReachableIdentityHandle,
} from '../type-system/type-shape.js';
import type { RuntimeSourceAccessUseDraft } from './source-access-use-publication.js';
import type {
  RuntimeSourceObservedAccessSeed,
  RuntimeSourceObservedAccessSeedEffectDraft,
  RuntimeTypeScriptObservedAccessReference,
} from './source-observed-access-effect.js';
import type {
  RuntimeExpressionExecutionContextDraft,
  RuntimeExpressionExecutionQualifierDraft,
} from './runtime-expression-access-draft.js';
import {
  RuntimeExpressionAccessCoverage,
  RuntimeExpressionAccessForm,
  RuntimeExpressionAccessOrigin,
  RuntimeExpressionAccessRole,
  RuntimeExpressionAccessTargetLink,
  RuntimeExpressionAccessTargetResolution,
  RuntimeExpressionAccessTracking,
  RuntimeExpressionExecutionMaximum,
  RuntimeExpressionExecutionMinimum,
  RuntimeExpressionExecutionQualifierKind,
} from './runtime-expression-access-use.js';

export type RuntimeTypeScriptAccessUseDraft = RuntimeSourceAccessUseDraft;

export interface RuntimeTypeScriptAccessUseCollectionRequest {
  readonly declaration: ts.FunctionLikeDeclaration;
  readonly typeSystem: TypeSystemProject;
  readonly store: KernelStore;
  readonly publication: KernelPublicationContext;
  /** Occurrence-level framework reads paired with their inducing source operations. */
  readonly observedEffects?: readonly RuntimeSourceObservedAccessSeedEffectDraft[];
  readonly role?: RuntimeExpressionAccessRole;
  /** Cross-operation invocation that admits this declaration body, such as a template call into an `@astTrack` method. */
  readonly executionHandoff?: RuntimeTypeScriptAccessExecutionHandoff;
}

export interface RuntimeTypeScriptAccessUseCollection {
  readonly accessUses: readonly RuntimeTypeScriptAccessUseDraft[];
  readonly observedEffects: readonly RuntimeObservedDependencyAccessDraft<RuntimeTypeScriptAccessUseDraft>[];
}

export interface RuntimeTypeScriptAccessExecutionHandoff {
  readonly sourceSpan: SourceSpan;
  readonly operationName: string;
  /** Execution facts already proven for the source-language invocation that admits this body. */
  readonly caller: RuntimeExpressionExecutionContextDraft;
  readonly coverageReason: string;
}

interface TypeScriptAccessCollectionContext extends RuntimeExpressionExecutionContextDraft {
  readonly executionQualifiers: readonly RuntimeExpressionExecutionQualifierDraft[];
}

/** Collect authored TypeScript accesses together with the exact framework observation effects they induce. */
export function collectRuntimeTypeScriptAccessUseCollection(
  request: RuntimeTypeScriptAccessUseCollectionRequest,
): RuntimeTypeScriptAccessUseCollection {
  return new RuntimeTypeScriptAccessUseCollector(request).collect();
}

class RuntimeTypeScriptAccessUseCollector {
  private readonly rows: RuntimeTypeScriptAccessUseDraft[] = [];
  private readonly draftBySourceNode = new Map<ts.Node, RuntimeTypeScriptAccessUseDraft>();
  private readonly draftBySeed = new Map<RuntimeSourceObservedAccessSeed, RuntimeTypeScriptAccessUseDraft>();
  private readonly draftBySourceDraft = new Map<RuntimeSourceAccessUseDraft, RuntimeTypeScriptAccessUseDraft>();
  private readonly projector: CheckerTypeProjector;
  private readonly sourceFiles = new Map<ts.SourceFile, SourceFileRef>();
  private readonly rootRole: RuntimeExpressionAccessRole;

  constructor(private readonly request: RuntimeTypeScriptAccessUseCollectionRequest) {
    this.projector = new CheckerTypeProjector(request.store, request.publication);
    this.rootRole = request.role ?? RuntimeExpressionAccessRole.Read;
  }

  collect(): RuntimeTypeScriptAccessUseCollection {
    const handoff = this.request.executionHandoff ?? null;
    this.visit(this.request.declaration.body ?? null, {
      executionQualifiers: handoff == null
        ? []
        : [...handoff.caller.executionQualifiers, {
            kind: RuntimeExpressionExecutionQualifierKind.MethodBodyHandoff,
            sourceSpan: handoff.sourceSpan,
            operationName: handoff.operationName,
          }],
      minimumExecutions: handoff == null
        ? RuntimeExpressionExecutionMinimum.One
        : RuntimeExpressionExecutionMinimum.Zero,
      maximumExecutions: handoff?.caller.maximumExecutions
        ?? RuntimeExpressionExecutionMaximum.One,
      coverage: handoff == null
        ? RuntimeExpressionAccessCoverage.Complete
        : RuntimeExpressionAccessCoverage.Open,
      coverageReason: handoff?.coverageReason ?? null,
    });
    this.addUnvisitedObservedAccesses();
    const accessUses = this.rows.sort((left, right) =>
      `${left.sourceSpan.file?.path ?? ''}:${left.sourceSpan.start}:${left.nameSourceSpan?.start ?? -1}`
        .localeCompare(
          `${right.sourceSpan.file?.path ?? ''}:${right.sourceSpan.start}:${right.nameSourceSpan?.start ?? -1}`,
        )
    );
    return {
      accessUses,
      observedEffects: (this.request.observedEffects ?? []).map((effect) => {
        const accessUse = this.draftBySeed.get(effect.accessUse) ?? null;
        if (accessUse == null) {
          throw new Error(
            `Observed dependency '${effect.dependency.sourceName ?? effect.dependency.expressionKind}' lost its exact TypeScript access draft.`,
          );
        }
        return { accessUse, dependency: effect.dependency };
      }),
    };
  }

  private visit(
    node: ts.Node | null,
    context: TypeScriptAccessCollectionContext,
    role: RuntimeExpressionAccessRole = this.rootRole,
  ): void {
    if (node == null) {
      return;
    }
    if (node !== this.request.declaration && isNestedExecutionBoundary(node)) {
      return;
    }
    if (ts.isBlock(node)) {
      this.visitStatementSequence(node.statements, context);
      return;
    }
    if (ts.isCallExpression(node)) {
      this.visitCall(node, context);
      return;
    }
    if (ts.isPropertyAccessExpression(node)) {
      this.visit(node.expression, context);
      this.addAccess(
        node,
        node.name,
        optionalContext(context, node.questionDotToken != null, this.sourceSpan(node)),
        role,
        RuntimeExpressionAccessForm.Member,
      );
      return;
    }
    if (ts.isElementAccessExpression(node)) {
      this.visit(node.expression, context);
      this.visit(node.argumentExpression, optionalContext(
        context,
        node.questionDotToken != null,
        this.sourceSpan(node),
      ));
      this.addAccess(
        node,
        node.argumentExpression ?? node,
        optionalContext(context, node.questionDotToken != null, this.sourceSpan(node)),
        role,
        RuntimeExpressionAccessForm.Keyed,
      );
      return;
    }
    if (node.kind === ts.SyntaxKind.ThisKeyword) {
      this.addAccess(node, node, context, role, RuntimeExpressionAccessForm.This);
      return;
    }
    if (ts.isConditionalExpression(node)) {
      this.visit(node.condition, context);
      this.visit(
        node.whenTrue,
        qualifiedContext(
          context,
          RuntimeExpressionExecutionQualifierKind.ConditionalTrueArm,
          this.sourceSpan(node.condition),
        ),
      );
      this.visit(
        node.whenFalse,
        qualifiedContext(
          context,
          RuntimeExpressionExecutionQualifierKind.ConditionalFalseArm,
          this.sourceSpan(node.condition),
        ),
      );
      return;
    }
    if (ts.isIfStatement(node)) {
      this.visit(node.expression, context);
      this.visit(
        node.thenStatement,
        qualifiedContext(
          context,
          RuntimeExpressionExecutionQualifierKind.ConditionalTrueArm,
          this.sourceSpan(node.expression),
        ),
      );
      this.visit(
        node.elseStatement ?? null,
        qualifiedContext(
          context,
          RuntimeExpressionExecutionQualifierKind.ConditionalFalseArm,
          this.sourceSpan(node.expression),
        ),
      );
      return;
    }
    if (ts.isBinaryExpression(node)) {
      if (isAssignmentOperator(node.operatorToken.kind)) {
        this.visit(node.left, context);
        this.visit(
          node.right,
          shortCircuitAssignmentOperator(node.operatorToken.kind)
            ? qualifiedContext(
                context,
                RuntimeExpressionExecutionQualifierKind.ShortCircuitRightHandSide,
                this.sourceSpan(node.left),
                node.operatorToken.getText(),
              )
            : context,
        );
        return;
      }
      this.visit(node.left, context);
      this.visit(
        node.right,
        shortCircuitOperator(node.operatorToken.kind)
          ? qualifiedContext(
              context,
              RuntimeExpressionExecutionQualifierKind.ShortCircuitRightHandSide,
              this.sourceSpan(node.left),
              node.operatorToken.getText(),
            )
          : context,
      );
      return;
    }
    if (
      (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node))
      && (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken)
    ) {
      this.visit(node.operand, context);
      return;
    }
    if (ts.isForStatement(node)) {
      this.visit(node.initializer ?? null, context);
      this.visit(
        node.condition ?? null,
        repeatedContext(
          context,
          RuntimeExpressionExecutionQualifierKind.LoopCondition,
          this.sourceSpan(node.condition ?? node),
          true,
        ),
      );
      this.visit(
        node.incrementor ?? null,
        repeatedContext(
          context,
          RuntimeExpressionExecutionQualifierKind.LoopIncrement,
          this.sourceSpan(node.incrementor ?? node),
          false,
        ),
      );
      this.visit(
        node.statement,
        repeatedContext(
          context,
          RuntimeExpressionExecutionQualifierKind.LoopBody,
          this.sourceSpan(node.statement),
          false,
        ),
      );
      return;
    }
    if (ts.isForOfStatement(node) || ts.isForInStatement(node)) {
      this.visit(node.expression, context);
      this.visit(
        node.initializer,
        repeatedContext(
          context,
          RuntimeExpressionExecutionQualifierKind.LoopBody,
          this.sourceSpan(node.initializer),
          false,
        ),
      );
      this.visit(
        node.statement,
        repeatedContext(
          context,
          RuntimeExpressionExecutionQualifierKind.LoopBody,
          this.sourceSpan(node.statement),
          false,
        ),
      );
      return;
    }
    if (ts.isWhileStatement(node)) {
      this.visit(
        node.expression,
        repeatedContext(
          context,
          RuntimeExpressionExecutionQualifierKind.LoopCondition,
          this.sourceSpan(node.expression),
          true,
        ),
      );
      this.visit(
        node.statement,
        repeatedContext(
          context,
          RuntimeExpressionExecutionQualifierKind.LoopBody,
          this.sourceSpan(node.statement),
          false,
        ),
      );
      return;
    }
    if (ts.isDoStatement(node)) {
      this.visit(
        node.statement,
        repeatedContext(
          context,
          RuntimeExpressionExecutionQualifierKind.LoopBody,
          this.sourceSpan(node.statement),
          true,
        ),
      );
      this.visit(
        node.expression,
        repeatedContext(
          context,
          RuntimeExpressionExecutionQualifierKind.LoopCondition,
          this.sourceSpan(node.expression),
          true,
        ),
      );
      return;
    }
    if (ts.isSwitchStatement(node)) {
      this.visitSwitch(node, context);
      return;
    }
    if (ts.isTryStatement(node)) {
      this.visitTry(node, context);
      return;
    }
    if (ts.isExpressionStatement(node)) {
      this.visit(node.expression, context);
      return;
    }
    if (ts.isReturnStatement(node) || ts.isThrowStatement(node)) {
      this.visit(node.expression ?? null, context);
      return;
    }
    if (ts.isVariableStatement(node)) {
      this.visit(node.declarationList, context);
      return;
    }
    if (ts.isLabeledStatement(node)) {
      this.visit(node.statement, context);
      return;
    }
    if (
      ts.isBreakStatement(node)
      || ts.isContinueStatement(node)
      || ts.isEmptyStatement(node)
      || ts.isDebuggerStatement(node)
      || ts.isClassDeclaration(node)
    ) {
      return;
    }
    const childContext = ts.isStatement(node)
      ? qualifiedContext(
          context,
          RuntimeExpressionExecutionQualifierKind.OpenControlFlow,
          this.sourceSpan(node),
          ts.SyntaxKind[node.kind] ?? 'statement',
          false,
          'The statement control-flow shape is not closed by the runtime expression collector.',
        )
      : context;
    ts.forEachChild(node, (child) => this.visit(child, childContext, role));
  }

  private visitStatementSequence(
    statements: readonly ts.Statement[],
    context: TypeScriptAccessCollectionContext,
  ): void {
    let current = context;
    for (const statement of statements) {
      this.visit(statement, current);
      const continuation = statementContinuation(statement);
      if (continuation === TypeScriptStatementContinuation.Never) {
        return;
      }
      if (continuation === TypeScriptStatementContinuation.Conditional) {
        current = qualifiedContext(
          current,
          RuntimeExpressionExecutionQualifierKind.ConditionalContinuation,
          this.sourceSpan(statement),
          ts.SyntaxKind[statement.kind] ?? 'statement',
        );
      }
    }
  }

  private visitSwitch(
    statement: ts.SwitchStatement,
    context: TypeScriptAccessCollectionContext,
  ): void {
    this.visit(statement.expression, context);
    for (const clause of statement.caseBlock.clauses) {
      const source = ts.isCaseClause(clause)
        ? this.sourceSpan(clause.expression)
        : this.sourceSpan(statement.expression);
      if (ts.isCaseClause(clause)) {
        this.visit(
          clause.expression,
          qualifiedContext(
            context,
            RuntimeExpressionExecutionQualifierKind.SwitchClause,
            source,
            'case-test',
          ),
        );
      }
      this.visitStatementSequence(
        clause.statements,
        qualifiedContext(
          context,
          RuntimeExpressionExecutionQualifierKind.SwitchClause,
          source,
          ts.isCaseClause(clause) ? 'case' : 'default',
        ),
      );
    }
  }

  private visitTry(
    statement: ts.TryStatement,
    context: TypeScriptAccessCollectionContext,
  ): void {
    this.visit(statement.tryBlock, context);
    if (statement.catchClause != null) {
      this.visit(
        statement.catchClause.block,
        qualifiedContext(
          context,
          RuntimeExpressionExecutionQualifierKind.ExceptionPath,
          this.sourceSpan(statement.catchClause),
          'catch',
        ),
      );
    }
    this.visit(statement.finallyBlock ?? null, context);
  }

  private visitCall(
    node: ts.CallExpression,
    context: TypeScriptAccessCollectionContext,
  ): void {
    const callee = node.expression;
    const callContext = optionalContext(context, node.questionDotToken != null, this.sourceSpan(node));
    if (ts.isPropertyAccessExpression(callee)) {
      this.visit(callee.expression, context);
      this.addAccess(
        callee,
        callee.name,
        optionalContext(callContext, callee.questionDotToken != null, this.sourceSpan(callee)),
        RuntimeExpressionAccessRole.Call,
        RuntimeExpressionAccessForm.MemberCall,
      );
      node.arguments.forEach((argument) =>
        this.visitCallArgument(argument, callContext, callee.name.text)
      );
      return;
    }
    if (ts.isElementAccessExpression(callee)) {
      this.visit(callee.expression, context);
      this.visit(callee.argumentExpression, callContext);
      this.addAccess(
        callee,
        callee.argumentExpression ?? callee,
        optionalContext(callContext, callee.questionDotToken != null, this.sourceSpan(callee)),
        RuntimeExpressionAccessRole.Call,
        RuntimeExpressionAccessForm.Keyed,
      );
      node.arguments.forEach((argument) => this.visitCallArgument(argument, callContext, null));
      return;
    }
    this.visit(callee, context, RuntimeExpressionAccessRole.Call);
    node.arguments.forEach((argument) => this.visitCallArgument(argument, callContext, null));
  }

  private visitCallArgument(
    argument: ts.Expression,
    context: TypeScriptAccessCollectionContext,
    methodName: string | null,
  ): void {
    if (!(ts.isArrowFunction(argument) || ts.isFunctionExpression(argument))) {
      this.visit(argument, context);
      return;
    }
    const synchronous = methodName != null && runtimeProxyObservedCollectionMethods.has(methodName);
    const callbackContext = qualifiedContext(
      context,
      synchronous
        ? RuntimeExpressionExecutionQualifierKind.SynchronousCallback
        : RuntimeExpressionExecutionQualifierKind.OpenInvocation,
      this.sourceSpan(argument),
      methodName,
      true,
      synchronous ? null : 'The callback invocation timing is not statically closed.',
    );
    this.visitNestedFunctionBody(argument, callbackContext);
  }

  private visitNestedFunctionBody(
    declaration: ts.FunctionLikeDeclaration,
    context: TypeScriptAccessCollectionContext,
  ): void {
    const body = declaration.body ?? null;
    if (body == null) {
      return;
    }
    this.visitNestedNode(body, declaration, context);
  }

  private visitNestedNode(
    node: ts.Node,
    root: ts.FunctionLikeDeclaration,
    context: TypeScriptAccessCollectionContext,
  ): void {
    if (node !== root && isNestedExecutionBoundary(node)) {
      return;
    }
    this.visit(node, context);
  }

  private addAccess(
    expression: ts.Node,
    nameNode: ts.Node,
    context: TypeScriptAccessCollectionContext,
    role: RuntimeExpressionAccessRole,
    accessForm: RuntimeExpressionAccessForm,
  ): void {
    const sourceSpan = this.sourceSpan(expression);
    const nameSourceSpan = this.sourceSpan(nameNode);
    const observedSeeds = this.observedSeedsForNode(expression);
    const target = this.targetForAccess(expression);
    const effectiveRole = runtimeExpressionRoleForTypeScriptAccess(expression, role);
    const draft: RuntimeTypeScriptAccessUseDraft = {
      origin: RuntimeExpressionAccessOrigin.Authored,
      accessForm,
      role: effectiveRole,
      scopeLookupAncestor: null,
      authoredScopeAncestor: null,
      callbackScopeDepth: null,
      lexicalLocal: false,
      executionQualifiers: context.executionQualifiers.map((qualifier) => ({
        kind: qualifier.kind,
        sourceSpan: qualifier.sourceSpan,
        operationName: qualifier.operationName,
      })),
      minimumExecutions: context.minimumExecutions,
      maximumExecutions: context.maximumExecutions,
      coverage: context.coverage,
      coverageReason: context.coverageReason,
      sourceSpan,
      nameSourceSpan,
      tracking: effectiveRole === RuntimeExpressionAccessRole.WriteTarget
        ? RuntimeExpressionAccessTracking.NotApplicable
        : observedSeeds.length === 0
          ? RuntimeExpressionAccessTracking.Untracked
          : RuntimeExpressionAccessTracking.Connectable,
      targetResolution: target.resolution,
      targetLinks: target.links,
    };
    this.rows.push(draft);
    this.draftBySourceNode.set(expression, draft);
    for (const seed of observedSeeds) {
      this.draftBySeed.set(seed, draft);
    }
  }

  private targetForAccess(
    expression: ts.Node,
  ): {
    readonly resolution: RuntimeExpressionAccessTargetResolution;
    readonly links: readonly RuntimeExpressionAccessTargetLink[];
  } {
    const programNode = this.request.typeSystem.readProgramNode(expression);
    if (programNode == null) {
      return openTarget();
    }
    if (programNode.kind === ts.SyntaxKind.ThisKeyword) {
      return this.targetForThis(programNode);
    }
    if (ts.isPropertyAccessExpression(programNode)) {
      return this.targetForNamedMember(programNode.expression, programNode.name.text, programNode.name);
    }
    if (ts.isElementAccessExpression(programNode)) {
      const key = literalElementAccessKey(programNode.argumentExpression);
      if (key != null) {
        return this.targetForNamedMember(programNode.expression, key, programNode.argumentExpression ?? programNode);
      }
      return this.targetForIndex(programNode);
    }
    return openTarget();
  }

  private targetForThis(
    node: ts.Node,
  ): {
    readonly resolution: RuntimeExpressionAccessTargetResolution;
    readonly links: readonly RuntimeExpressionAccessTargetLink[];
  } {
    const type = this.request.typeSystem.readProgramTypeAtLocation(node);
    if (type == null) {
      return openTarget();
    }
    const shape = this.projector.ensureProjection({
      localKey: this.targetLocalKey(node, 'this'),
      checker: this.request.typeSystem.checker,
      type,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceNode: node,
      memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
    });
    return {
      resolution: RuntimeExpressionAccessTargetResolution.Exact,
      links: [new RuntimeExpressionAccessTargetLink(
        shape.productHandle,
        shape.identityHandle,
        null,
        null,
        shape.declarationSourceAddressHandle ?? shape.sourceAddressHandle,
      )],
    };
  }

  private targetForNamedMember(
    owner: ts.Expression,
    memberName: string,
    memberNode: ts.Node,
  ): {
    readonly resolution: RuntimeExpressionAccessTargetResolution;
    readonly links: readonly RuntimeExpressionAccessTargetLink[];
  } {
    const ownerType = this.request.typeSystem.readProgramTypeAtLocation(owner);
    if (ownerType == null) {
      return openTarget();
    }
    const symbol = checkerPropertySymbol(this.request.typeSystem.checker, ownerType, memberName)
      ?? this.request.typeSystem.readProgramSymbolAtLocation(memberNode);
    if (symbol == null) {
      return checkerTypeIsOpen(ownerType)
        ? openTarget()
        : { resolution: RuntimeExpressionAccessTargetResolution.Missing, links: [] };
    }
    const ownerShape = this.projector.ensureProjection({
      localKey: this.targetLocalKey(owner, `owner:${memberName}`),
      checker: this.request.typeSystem.checker,
      type: ownerType,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceNode: owner,
      memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
    });
    const member = this.projector.ensureOwnedMember(ownerShape, symbol);
    return {
      resolution: RuntimeExpressionAccessTargetResolution.Exact,
      links: [new RuntimeExpressionAccessTargetLink(
        member.ownerType.productHandle,
        checkerTypeMemberReachableIdentityHandle(member),
        member.detailHandle,
        member.detailHandle,
        checkerTypeMemberSourceAddressHandle(this.request.publication, member),
      )],
    };
  }

  private targetForIndex(
    expression: ts.ElementAccessExpression,
  ): {
    readonly resolution: RuntimeExpressionAccessTargetResolution;
    readonly links: readonly RuntimeExpressionAccessTargetLink[];
  } {
    const ownerType = this.request.typeSystem.readProgramTypeAtLocation(expression.expression);
    if (ownerType == null || checkerTypeIsOpen(ownerType)) {
      return openTarget();
    }
    const checker = this.request.typeSystem.checker;
    const hasIndex = checkerStringIndexValueType(checker, ownerType) != null
      || checkerNumberIndexValueType(checker, ownerType) != null;
    if (!hasIndex) {
      return { resolution: RuntimeExpressionAccessTargetResolution.Missing, links: [] };
    }
    const shape = this.projector.ensureProjection({
      localKey: this.targetLocalKey(expression.expression, 'indexed-owner'),
      checker,
      type: ownerType,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceNode: expression.expression,
      memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
    });
    return {
      resolution: RuntimeExpressionAccessTargetResolution.IndexSignature,
      links: [new RuntimeExpressionAccessTargetLink(
        shape.productHandle,
        shape.identityHandle,
        null,
        null,
        shape.declarationSourceAddressHandle ?? shape.sourceAddressHandle,
      )],
    };
  }

  private addUnvisitedObservedAccesses(): void {
    for (const effect of this.request.observedEffects ?? []) {
      const seed = effect.accessUse;
      if (this.draftBySeed.has(seed)) {
        continue;
      }
      if (seed.kind === 'source-draft') {
        let draft = this.draftBySourceDraft.get(seed.draft) ?? null;
        if (draft == null) {
          draft = this.sourceDraftWithExecutionHandoff(seed.draft);
          this.rows.push(draft);
          this.draftBySourceDraft.set(seed.draft, draft);
        }
        this.draftBySeed.set(seed, draft);
        continue;
      }
      const existing = this.draftBySourceNode.get(seed.reference.sourceNode) ?? null;
      if (existing != null) {
        this.draftBySeed.set(seed, existing);
        continue;
      }
      const draft = this.unvisitedObservedAccessDraft(seed.reference, effect.dependency);
      this.rows.push(draft);
      this.draftBySourceNode.set(seed.reference.sourceNode, draft);
      this.draftBySeed.set(seed, draft);
    }
  }

  private observedSeedsForNode(node: ts.Node): readonly RuntimeSourceObservedAccessSeed[] {
    return (this.request.observedEffects ?? [])
      .map((effect) => effect.accessUse)
      .filter((seed) => seed.kind === 'typescript-node' && seed.reference.sourceNode === node);
  }

  private unvisitedObservedAccessDraft(
    reference: RuntimeTypeScriptObservedAccessReference,
    dependency: RuntimeSourceObservedAccessSeedEffectDraft['dependency'],
  ): RuntimeTypeScriptAccessUseDraft {
    const sourceSpan = this.sourceSpan(reference.sourceNode);
    const nameSourceSpan = reference.nameNode == null ? null : this.sourceSpan(reference.nameNode);
    const target = this.targetForAccess(reference.sourceNode);
    const handoff = this.request.executionHandoff;
    return {
      origin: RuntimeExpressionAccessOrigin.Authored,
      accessForm: reference.accessForm,
      role: reference.role,
      scopeLookupAncestor: null,
      authoredScopeAncestor: null,
      callbackScopeDepth: null,
      lexicalLocal: false,
      executionQualifiers: [
        ...(handoff?.caller.executionQualifiers ?? []),
        {
          kind: RuntimeExpressionExecutionQualifierKind.MethodBodyHandoff,
          sourceSpan: handoff?.sourceSpan ?? sourceSpan,
          operationName: handoff?.operationName ?? reference.operationName ?? dependency.methodName,
        },
      ],
      minimumExecutions: RuntimeExpressionExecutionMinimum.Zero,
      maximumExecutions: handoff?.caller.maximumExecutions ?? RuntimeExpressionExecutionMaximum.One,
      coverage: RuntimeExpressionAccessCoverage.Open,
      coverageReason: handoff?.coverageReason
        ?? 'A statically reached or implicit operation contributes this access, but runtime dispatch can select another implementation.',
      sourceSpan,
      nameSourceSpan,
      tracking: RuntimeExpressionAccessTracking.Connectable,
      targetResolution: target.resolution,
      targetLinks: target.links,
    };
  }

  private sourceDraftWithExecutionHandoff(
    draft: RuntimeSourceAccessUseDraft,
  ): RuntimeTypeScriptAccessUseDraft {
    const handoff = this.request.executionHandoff;
    if (handoff == null) {
      return draft;
    }
    return {
      ...draft,
      executionQualifiers: [
        ...handoff.caller.executionQualifiers,
        ...draft.executionQualifiers,
        {
          kind: RuntimeExpressionExecutionQualifierKind.MethodBodyHandoff,
          sourceSpan: handoff.sourceSpan,
          operationName: handoff.operationName,
        },
      ],
      minimumExecutions: RuntimeExpressionExecutionMinimum.Zero,
      maximumExecutions: handoff.caller.maximumExecutions,
      coverage: RuntimeExpressionAccessCoverage.Open,
      coverageReason: handoff.coverageReason,
    };
  }

  private sourceSpan(node: ts.Node): SourceSpan {
    const sourceFile = node.getSourceFile();
    let file = this.sourceFiles.get(sourceFile) ?? null;
    if (file == null) {
      const address = ensureSourceFileAddressForCheckerNode(
        this.request.publication,
        this.request.typeSystem.checker,
        sourceFile,
      );
      file = new SourceFileRef(address.handle, address.path);
      this.sourceFiles.set(sourceFile, file);
    }
    return sourceSpanFromBounds(node.getStart(sourceFile), node.end, file);
  }

  private targetLocalKey(node: ts.Node, suffix: string): string {
    const sourceFile = node.getSourceFile();
    return [
      'runtime-typescript-access',
      this.request.typeSystem.project.projectKey,
      sourceFile.fileName,
      node.getStart(sourceFile),
      node.end,
      suffix,
    ].join(':');
  }
}

function optionalContext(
  context: TypeScriptAccessCollectionContext,
  optional: boolean,
  sourceSpan: SourceSpan,
): TypeScriptAccessCollectionContext {
  return optional
    ? qualifiedContext(
        context,
        RuntimeExpressionExecutionQualifierKind.OptionalContinuation,
        sourceSpan,
      )
    : context;
}

function repeatedContext(
  context: TypeScriptAccessCollectionContext,
  kind:
    | RuntimeExpressionExecutionQualifierKind.LoopCondition
    | RuntimeExpressionExecutionQualifierKind.LoopIncrement
    | RuntimeExpressionExecutionQualifierKind.LoopBody,
  sourceSpan: SourceSpan,
  guaranteedOnce: boolean,
): TypeScriptAccessCollectionContext {
  return {
    executionQualifiers: [...context.executionQualifiers, {
      kind,
      sourceSpan,
      operationName: null,
    }],
    minimumExecutions: guaranteedOnce
      ? context.minimumExecutions
      : RuntimeExpressionExecutionMinimum.Zero,
    maximumExecutions: RuntimeExpressionExecutionMaximum.Many,
    coverage: context.coverage,
    coverageReason: context.coverageReason,
  };
}

function qualifiedContext(
  context: TypeScriptAccessCollectionContext,
  kind: RuntimeExpressionExecutionQualifierKind,
  sourceSpan: SourceSpan,
  operationName: string | null = null,
  many: boolean = false,
  openReason: string | null = null,
): TypeScriptAccessCollectionContext {
  return {
    executionQualifiers: [...context.executionQualifiers, { kind, sourceSpan, operationName }],
    minimumExecutions: RuntimeExpressionExecutionMinimum.Zero,
    maximumExecutions: many
      ? RuntimeExpressionExecutionMaximum.Many
      : context.maximumExecutions,
    coverage: openReason == null ? context.coverage : RuntimeExpressionAccessCoverage.Open,
    coverageReason: openReason ?? context.coverageReason,
  };
}

function runtimeExpressionRoleForTypeScriptAccess(
  expression: ts.Node,
  fallback: RuntimeExpressionAccessRole,
): RuntimeExpressionAccessRole {
  if (!ts.isExpression(expression)) {
    return fallback;
  }
  const mode = typescriptAccessModeForExpression(expression);
  return mode === TypeScriptAccessMode.Write
    ? RuntimeExpressionAccessRole.WriteTarget
    : mode === TypeScriptAccessMode.ReadWrite
      ? RuntimeExpressionAccessRole.ReadWriteTarget
      : fallback;
}

function shortCircuitOperator(kind: ts.SyntaxKind): boolean {
  return kind === ts.SyntaxKind.AmpersandAmpersandToken
    || kind === ts.SyntaxKind.BarBarToken
    || kind === ts.SyntaxKind.QuestionQuestionToken;
}

function shortCircuitAssignmentOperator(kind: ts.SyntaxKind): boolean {
  return kind === ts.SyntaxKind.AmpersandAmpersandEqualsToken
    || kind === ts.SyntaxKind.BarBarEqualsToken
    || kind === ts.SyntaxKind.QuestionQuestionEqualsToken;
}

const enum TypeScriptStatementContinuation {
  Always,
  Conditional,
  Never,
}

function statementContinuation(
  statement: ts.Statement,
): TypeScriptStatementContinuation {
  if (
    ts.isReturnStatement(statement)
    || ts.isThrowStatement(statement)
    || ts.isBreakStatement(statement)
    || ts.isContinueStatement(statement)
  ) {
    return TypeScriptStatementContinuation.Never;
  }
  if (ts.isBlock(statement)) {
    return statementSequenceContinuation(statement.statements);
  }
  if (ts.isIfStatement(statement)) {
    return branchContinuation(
      statementContinuation(statement.thenStatement),
      statement.elseStatement == null
        ? TypeScriptStatementContinuation.Always
        : statementContinuation(statement.elseStatement),
    );
  }
  if (ts.isSwitchStatement(statement)) {
    const clauseContinuations = statement.caseBlock.clauses.map((clause) =>
      statementSequenceContinuation(clause.statements)
    );
    return clauseContinuations.some((continuation) =>
      continuation !== TypeScriptStatementContinuation.Always
    )
      ? TypeScriptStatementContinuation.Conditional
      : TypeScriptStatementContinuation.Always;
  }
  if (ts.isTryStatement(statement)) {
    const finallyContinuation = statement.finallyBlock == null
      ? TypeScriptStatementContinuation.Always
      : statementContinuation(statement.finallyBlock);
    if (finallyContinuation !== TypeScriptStatementContinuation.Always) {
      return finallyContinuation;
    }
    const tryContinuation = statementContinuation(statement.tryBlock);
    return statement.catchClause == null
      ? tryContinuation
      : branchContinuation(
          tryContinuation,
          statementContinuation(statement.catchClause.block),
        );
  }
  if (
    ts.isForStatement(statement)
    || ts.isForOfStatement(statement)
    || ts.isForInStatement(statement)
    || ts.isWhileStatement(statement)
    || ts.isDoStatement(statement)
  ) {
    return TypeScriptStatementContinuation.Conditional;
  }
  if (ts.isLabeledStatement(statement)) {
    return statementContinuation(statement.statement);
  }
  return TypeScriptStatementContinuation.Always;
}

function statementSequenceContinuation(
  statements: readonly ts.Statement[],
): TypeScriptStatementContinuation {
  let continuation = TypeScriptStatementContinuation.Always;
  for (const statement of statements) {
    const next = statementContinuation(statement);
    if (next === TypeScriptStatementContinuation.Never) {
      return next;
    }
    if (next === TypeScriptStatementContinuation.Conditional) {
      continuation = next;
    }
  }
  return continuation;
}

function branchContinuation(
  left: TypeScriptStatementContinuation,
  right: TypeScriptStatementContinuation,
): TypeScriptStatementContinuation {
  return left === right
    ? left
    : TypeScriptStatementContinuation.Conditional;
}

function literalElementAccessKey(
  expression: ts.Expression | undefined,
): string | null {
  return expression != null
    && (ts.isStringLiteralLike(expression) || ts.isNumericLiteral(expression))
    ? expression.text
    : null;
}

function checkerTypeIsOpen(type: ts.Type): boolean {
  return (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.TypeParameter)) !== 0
    || type.flags === ts.TypeFlags.Never
    || type.flags === ts.TypeFlags.NonPrimitive
    || (type.flags & ts.TypeFlags.Object) === 0
      && type.flags !== ts.TypeFlags.String
      && type.flags !== ts.TypeFlags.Number
      && type.flags !== ts.TypeFlags.Boolean;
}

function openTarget(): {
  readonly resolution: RuntimeExpressionAccessTargetResolution;
  readonly links: readonly RuntimeExpressionAccessTargetLink[];
} {
  return {
    resolution: RuntimeExpressionAccessTargetResolution.Open,
    links: [],
  };
}
