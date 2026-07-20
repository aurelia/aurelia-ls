import ts from 'typescript';
import { OpenSeamReasonKind } from '../kernel/open-seam.js';
import {
  bindStaticBindingName,
  staticBindingNames,
  type StaticBindingPatternHost,
} from './binding-patterns.js';
import {
  evaluateStaticClassInstantiation,
  readStaticClassProperties,
  type StaticClassEvaluationHost,
} from './class-values.js';
import {
  BreakEvaluationCompletion,
  ContinueEvaluationCompletion,
  EvaluationAbruptCompletionSignal,
  EvaluationCompletionKind,
  NormalEvaluationCompletion,
  OpenEvaluationCompletion,
  ReturnEvaluationCompletion,
  ThrowEvaluationCompletion,
  type EvaluationAbruptCompletion,
  type EvaluationCompletion,
  type EvaluationExpressionAbruptCompletion,
  type EvaluationExpressionCompletion,
} from './completion.js';
import {
  evaluateStaticFunctionWithArguments,
  type StaticFunctionEvaluationHost,
} from './function-values.js';
import {
  EvaluationArgumentList,
  EvaluationArgumentListOutcome,
  evaluateStaticArgumentList,
} from './argument-list.js';
import {
  ensureStaticCommonJsExports,
  ensureStaticCommonJsModule,
} from './commonjs.js';
import {
  instantiateStaticBlockFunctionDeclarations,
  instantiateStaticModuleDeclarations,
  type StaticDeclarationInstantiationHost,
} from './declaration-instantiation.js';
import {
  EvaluationBindingKind,
  EvaluationBindingState,
  ModuleEnvironmentRecord,
} from './environment.js';
import {
  type StaticEvaluationValueGraph,
} from './evaluation-graph.js';
import {
  evaluateKnownConstructor,
  evaluateKnownIntrinsic,
  type StaticIntrinsicEvaluationCheckpoint,
  type StaticIntrinsicEvaluationHost,
} from './intrinsics.js';
import {
  StaticInvocationDispatchKind,
  isStaticInvocationOccurrence,
  StaticInvocationFrame,
  StaticInvocationKind,
  StaticInvocationOccurrence,
  StaticInvocationPreparationBoundary,
  StaticInvocationPreparationBoundaryKind,
  StaticInvocationReference,
  type StaticInvocationDispatch,
  type StaticInvocationEvaluation,
} from './invocation.js';
import { evaluateAureliaExpressionGlobalAccess } from './global-intrinsics.js';
import {
  compactEvaluationOpenSeams,
  EvaluationOpenSeam,
  EvaluationOpenSeamKind,
  evaluationOpenSeamDefaultReasonKinds,
} from './seams.js';
import {
  DefaultStaticEvaluationPolicy,
  StaticEvaluationBranchMode,
  StaticEvaluationExpressionStatementDisposition,
  type StaticEvaluationPolicy,
} from './policy.js';
import {
  hasQuestionDotToken,
  isNullishEvaluationValue,
} from './nullish-expression.js';
import {
  evaluateStaticBinaryOperator,
  evaluationPropertyKeyString,
  evaluateStaticUnaryOperation,
  staticUnaryOperationForToken,
  staticTokenName,
} from './operators.js';
import { representativeEvaluationValues } from './representative-values.js';
import {
  EvaluationBigIntValue,
  EvaluationBoundaryKind,
  EvaluationBoundaryObjectValue,
  EvaluationBooleanValue,
  EvaluationClassValue,
  EvaluationFunctionValue,
  EvaluationBoundaryValue,
  EvaluationNullValue,
  EvaluationNumberValue,
  EvaluationObjectProperty,
  EvaluationObjectPropertyState,
  EvaluationObjectValue,
  EvaluationRegularExpressionValue,
  EvaluationStringPatternBuilder,
  EvaluationStringValue,
  EvaluationUndefined,
  EvaluationUndefinedValue,
  EvaluationUnknownValue,
  EvaluationValueKind,
  appendEvaluationStringLikePart,
  evaluationStringPatternFromConcatenation,
  evaluationValuesStrictlyEqual,
  openEvaluationObjectProperties,
  readEvaluationTruthiness,
  type EvaluationValue,
} from './values.js';
import { hasModifier, isAssignmentOperator } from './ts-syntax.js';
import { openSeamReasonKindForEvaluationBoundary } from './boundary-open-reason.js';
import {
  evaluateStaticArrayLiteral,
  evaluateStaticObjectLiteral,
  type StaticLiteralEvaluationHost,
} from './literals.js';
import {
  evaluateStaticElementAccessFromValues,
  evaluateStaticElementValue,
  evaluateStaticPropertyAccessFromReceiver,
  evaluateStaticPropertyValue,
  readStaticOwnProperty,
  type StaticPropertyAccessEvaluationHost,
  writeStaticOwnProperty,
} from './property-access.js';
import {
  EvaluationValueEvidence,
  evaluationValueEvidence,
  evaluationValueOwnOpenSeams,
} from './value-pressure.js';

const emptyEvaluationLabels: ReadonlySet<string> = new Set();

const enum StaticExpressionFlowKind {
  Value = 'value',
  OptionalShortCircuit = 'optional-short-circuit',
  OptionalIndeterminate = 'optional-indeterminate',
}

interface StaticExpressionValueFlow {
  readonly kind: StaticExpressionFlowKind.Value;
  readonly value: EvaluationValue;
}

interface StaticExpressionOptionalShortCircuit {
  readonly kind: StaticExpressionFlowKind.OptionalShortCircuit;
  readonly openSeams: readonly EvaluationOpenSeam[];
}

interface StaticExpressionOptionalIndeterminate {
  readonly kind: StaticExpressionFlowKind.OptionalIndeterminate;
  readonly openSeams: readonly EvaluationOpenSeam[];
}

type StaticExpressionFlow =
  | StaticExpressionValueFlow
  | StaticExpressionOptionalShortCircuit
  | StaticExpressionOptionalIndeterminate;

type StaticExpressionOptionalFlow =
  | StaticExpressionOptionalShortCircuit
  | StaticExpressionOptionalIndeterminate;

interface StaticInvocationTarget {
  readonly kind: StaticExpressionFlowKind.Value;
  readonly callee: EvaluationValueEvidence;
  readonly receiverNode: ts.Expression | null;
  readonly thisValue: EvaluationValueEvidence | null;
  readonly propertyKeyNode: ts.Node | null;
  readonly propertyKey: string | null;
  readonly propertyKeyEvidence: EvaluationValueEvidence | null;
}

/** Linked import evidence keyed by local import binding name before module-body evaluation. */
export type StaticEvaluationImportValues = ReadonlyMap<string, EvaluationValueEvidence>;

export interface StaticEvaluationValueMetadataTransfer {
  forkValue<TValue extends EvaluationValue>(value: TValue): TValue;
}

/** Completion-aware value returned by a runtime-host operation that executes synchronously in expression flow. */
export class StaticEvaluationRuntimeValueResult {
  readonly openSeams: readonly EvaluationOpenSeam[];

  constructor(
    readonly value: EvaluationValue | null,
    readonly abruptCompletion: EvaluationExpressionAbruptCompletion | null,
    openSeams: readonly EvaluationOpenSeam[] = [],
  ) {
    this.openSeams = compactEvaluationOpenSeams(openSeams);
  }
}

export interface StaticEvaluationRuntimeHost {
  /** Mutable value-graph boundary shared by evaluators executing inside one speculative session. */
  readonly evaluationValueGraph?: StaticEvaluationValueGraph;

  /** Transfer host-owned semantic identity when a speculative session clones an evaluator value. */
  transferValueMetadata?(
    source: EvaluationValue,
    target: EvaluationValue,
    transfer: StaticEvaluationValueMetadataTransfer,
  ): void;

  resolveIdentifier?(
    identifier: ts.Identifier,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
  ): EvaluationValue | null;

  resolveCommonJsRequire?(
    moduleKey: string,
    moduleSpecifier: string,
    node: ts.CallExpression,
  ): StaticEvaluationRuntimeValueResult | null;

  resolveDynamicImport?(
    moduleKey: string,
    moduleSpecifier: string,
    node: ts.CallExpression,
  ): EvaluationValue | null;

  evaluateInvocation?(
    frame: StaticInvocationFrame,
    host: StaticIntrinsicEvaluationHost,
  ): StaticInvocationDispatch;
}

/** Result of evaluating one source module. */
export class StaticModuleEvaluationResult {
  /** Calls and constructions that reached the modeled invocation operation. */
  readonly invocations: readonly StaticInvocationOccurrence[];

  constructor(
    /** Module key whose source file was evaluated. */
    readonly moduleKey: string,
    /** Environment record after the evaluator's module-body pass. */
    readonly environment: ModuleEnvironmentRecord,
    /** Final module-body completion. */
    readonly completion: EvaluationCompletion,
    /** Explicit open seams produced while evaluating this module. */
    readonly openSeams: readonly EvaluationOpenSeam[],
    /** Reached invocations and pre-invocation boundaries, in ECMAScript evaluation order. */
    readonly invocationEvaluations: readonly StaticInvocationEvaluation[],
    /** Policy used by follow-up expression reads against this module environment. */
    readonly policy: StaticEvaluationPolicy = DefaultStaticEvaluationPolicy,
    /** Runtime host used by follow-up expression reads against this module environment. */
    readonly runtimeHost: StaticEvaluationRuntimeHost = {},
  ) {
    this.invocations = invocationEvaluations.filter(isStaticInvocationOccurrence);
  }
}

/** Result of evaluating one expression against an existing module environment. */
export class StaticExpressionEvaluationResult {
  readonly openSeams: readonly EvaluationOpenSeam[];
  /** Calls and constructions that reached the modeled invocation operation. */
  readonly invocations: readonly StaticInvocationOccurrence[];

  constructor(
    /** Completion produced by the expression evaluator. */
    readonly completion: EvaluationExpressionCompletion,
    /** Open seams observed during this expression read. */
    openSeams: readonly EvaluationOpenSeam[],
    /** Reached invocations and pre-invocation boundaries, in ECMAScript evaluation order. */
    readonly invocationEvaluations: readonly StaticInvocationEvaluation[],
  ) {
    this.openSeams = compactEvaluationOpenSeams(openSeams);
    this.invocations = invocationEvaluations.filter(isStaticInvocationOccurrence);
  }

  /** Value produced by a normal expression completion. */
  get value(): EvaluationValue | null {
    return this.completion.kind === EvaluationCompletionKind.Normal
      ? this.completion.value
      : null;
  }

  /** Abrupt completion, retained instead of being flattened into an unknown value. */
  get abruptCompletion(): EvaluationExpressionAbruptCompletion | null {
    return this.completion.kind === EvaluationCompletionKind.Normal
      ? null
      : this.completion;
  }
}

/** ECMAScript-shaped evaluator for module-level analysis. */
export class StaticEvaluator {
  /** Every seam encountered on the modeled execution path, irrespective of later value projection. */
  private readonly auditOpenSeams: EvaluationOpenSeam[] = [];
  private readonly auditedOpenSeams = new Set<EvaluationOpenSeam>();
  /** Seams still causal to the value currently flowing outward through evaluator calls. */
  private readonly causalOpenSeams: EvaluationOpenSeam[] = [];
  private readonly literalHost: StaticLiteralEvaluationHost = {
    maxArrayIterations: () => this.policy.guardrails.maxLoopIterations,
    evaluateExpression: (expression, environment, moduleKey, depth) =>
      this.evaluateExpression(expression, environment, moduleKey, depth),
    readPropertyName: (name, environment, moduleKey, depth) =>
      this.readPropertyName(name, environment, moduleKey, depth),
    open: (seamKind, summary, node, moduleKey) =>
      this.open(seamKind, summary, node, moduleKey),
    unknown: (reason, node, moduleKey, seamKind) =>
      this.unknown(reason, node, moduleKey, seamKind),
    openSeamCheckpoint: () => this.causalOpenSeams.length,
    openSeamsSince: (checkpoint) => this.openSeamsSince(checkpoint),
    consumeOpenSeamsSince: (checkpoint) => this.consumeOpenSeamsSince(checkpoint),
    replayOpenSeams: (openSeams) => this.replayOpenSeams(openSeams),
    syntaxKindName: (node) => this.syntaxKindName(node),
  };
  private readonly bindingHost: StaticBindingPatternHost = {
    maxArrayIterations: () => this.policy.guardrails.maxLoopIterations,
    evaluateExpression: (expression, environment, moduleKey, depth) =>
      this.evaluateExpression(expression, environment, moduleKey, depth),
    readOwnProperty: (receiver, name) => readStaticOwnProperty(receiver, name),
    readPropertyName: (name, environment, moduleKey, depth) =>
      this.readPropertyName(name, environment, moduleKey, depth),
    unknown: (reason, node, moduleKey, seamKind) =>
      this.unknown(reason, node, moduleKey, seamKind),
    materializeUnknownUse: (value, node, moduleKey, summary, seamKind) =>
      this.materializeUnknownUse(value, node, moduleKey, summary, seamKind),
    openSeamCheckpoint: () => this.causalOpenSeams.length,
    consumeOpenSeamsSince: (checkpoint) => this.consumeOpenSeamsSince(checkpoint),
  };
  private readonly propertyAccessHost: StaticPropertyAccessEvaluationHost = {
    evaluateExpression: (expression, environment, moduleKey, depth) =>
      this.evaluateExpression(expression, environment, moduleKey, depth),
    evaluateFunctionWithArguments: (callee, call, argumentValues, moduleKey, depth, thisValue) =>
      this.evaluateFunctionWithArguments(callee, call, argumentValues, moduleKey, depth, thisValue),
    unknown: (reason, node, moduleKey, seamKind, reasonKinds) =>
      this.unknown(reason, node, moduleKey, seamKind, reasonKinds),
    materializeUnknownUse: (value, node, moduleKey, summary, seamKind) =>
      this.materializeUnknownUse(value, node, moduleKey, summary, seamKind),
    replayOpenSeams: (openSeams) => this.replayOpenSeams(openSeams),
    openSeamCheckpoint: () => this.causalOpenSeams.length,
    consumeOpenSeamsSince: (checkpoint) => this.consumeOpenSeamsSince(checkpoint),
  };
  private readonly classHost: StaticClassEvaluationHost = {
    bindingHost: this.bindingHost,
    retainProduced: (value) => this.ownProducedValue(value),
    raise: (completion) => this.raise(completion),
    evaluateExpression: (expression, environment, moduleKey, depth) =>
      this.evaluateExpression(expression, environment, moduleKey, depth),
    evaluateBlock: (block, environment, moduleKey, depth) =>
      this.evaluateBlock(block, environment, moduleKey, depth),
    readPropertyName: (name, environment, moduleKey, depth) =>
      this.readPropertyName(name, environment, moduleKey, depth),
    unknown: (reason, node, moduleKey, seamKind) =>
      this.unknown(reason, node, moduleKey, seamKind),
    openSeamCheckpoint: () => this.causalOpenSeams.length,
    openSeamsSince: (checkpoint) => this.openSeamsSince(checkpoint),
    consumeOpenSeamsSince: (checkpoint) => this.consumeOpenSeamsSince(checkpoint),
    replayOpenSeams: (openSeams) => this.replayOpenSeams(openSeams),
  };
  private readonly functionHost: StaticFunctionEvaluationHost = {
    bindingHost: this.bindingHost,
    raise: (completion) => this.raise(completion),
    evaluateExpression: (expression, environment, moduleKey, depth) =>
      this.evaluateExpression(expression, environment, moduleKey, depth),
    evaluateBlock: (block, environment, moduleKey, depth) =>
      this.evaluateBlock(block, environment, moduleKey, depth),
    unknown: (reason, node, moduleKey, seamKind) =>
      this.unknown(reason, node, moduleKey, seamKind),
    replayOpenSeams: (openSeams) => this.replayOpenSeams(openSeams),
  };
  private readonly declarationInstantiationHost: StaticDeclarationInstantiationHost = {
    open: (seamKind, summary, node, moduleKey) =>
      this.open(seamKind, summary, node, moduleKey),
  };
  private readonly invocationEvaluations: StaticInvocationEvaluation[] = [];
  private nextInvocationOrdinal = 0;
  private statementCount = 0;

  constructor(
    readonly policy: StaticEvaluationPolicy = DefaultStaticEvaluationPolicy,
    readonly runtimeHost: StaticEvaluationRuntimeHost = {},
  ) {}

  /** Evaluate one TypeScript source file as an ECMAScript module body. */
  evaluateSourceFile(
    sourceFile: ts.SourceFile,
    moduleKey: string = sourceFile.fileName,
    imports: StaticEvaluationImportValues = new Map<string, EvaluationValueEvidence>(),
  ): StaticModuleEvaluationResult {
    return this.evaluateSourceFileCore(sourceFile, moduleKey, imports, null);
  }

  /** Instantiate a linked module without executing its body after a dependency stopped evaluation. */
  evaluateSourceFileAfterDependencyCompletion(
    sourceFile: ts.SourceFile,
    moduleKey: string,
    imports: StaticEvaluationImportValues,
    dependencyCompletion: EvaluationAbruptCompletion,
  ): StaticModuleEvaluationResult {
    return this.evaluateSourceFileCore(sourceFile, moduleKey, imports, dependencyCompletion);
  }

  private evaluateSourceFileCore(
    sourceFile: ts.SourceFile,
    moduleKey: string,
    imports: StaticEvaluationImportValues,
    dependencyCompletion: EvaluationAbruptCompletion | null,
  ): StaticModuleEvaluationResult {
    this.auditOpenSeams.length = 0;
    this.auditedOpenSeams.clear();
    this.causalOpenSeams.length = 0;
    this.invocationEvaluations.length = 0;
    this.nextInvocationOrdinal = 0;
    this.statementCount = 0;
    const environment = new ModuleEnvironmentRecord(moduleKey, null);
    const graph = this.runtimeHost.evaluationValueGraph;
    graph?.retainEnvironment(environment);
    const evaluationImports = graph == null
      ? imports
      : new Map([...imports].map(([name, evidence]) => [
          name,
          new EvaluationValueEvidence(graph.adoptExternal(evidence.value), evidence.openSeams),
        ]));
    instantiateStaticModuleDeclarations(
      sourceFile,
      environment,
      moduleKey,
      evaluationImports,
      this.declarationInstantiationHost,
    );
    graph?.retainEnvironment(environment);

    let completion: EvaluationCompletion = dependencyCompletion ?? new NormalEvaluationCompletion();
    if (dependencyCompletion == null) {
      for (const statement of sourceFile.statements) {
        completion = this.evaluateStatement(statement, environment, moduleKey, 0);
        if (completion.kind !== EvaluationCompletionKind.Normal) {
          break;
        }
      }
    }

    return new StaticModuleEvaluationResult(
      moduleKey,
      environment,
      completion,
      [...this.auditOpenSeams],
      this.orderedInvocationEvaluationsSince(0),
      this.policy,
      this.runtimeHost,
    );
  }

  /** Evaluate one expression with a supplied environment record. */
  evaluateExpressionInEnvironment(
    expression: ts.Expression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
  ): StaticExpressionEvaluationResult {
    this.runtimeHost.evaluationValueGraph?.retainEnvironment(environment);
    const checkpoint = this.pressureCheckpoint();
    return this.expressionResult(
      () => this.evaluateExpression(expression, environment, moduleKey, 0),
      checkpoint,
    );
  }

  /** Instantiate an evaluator-known class value without requiring a synthetic `new` expression. */
  evaluateClassValueInstantiation(
    callee: EvaluationClassValue,
    moduleKey: string,
    node: ts.Node,
    argumentValues: readonly EvaluationValue[] = [],
  ): StaticExpressionEvaluationResult {
    const graph = this.runtimeHost.evaluationValueGraph;
    const evaluationCallee = graph?.adoptExternal(callee) ?? callee;
    const evaluationArguments = graph == null
      ? argumentValues
      : argumentValues.map((value) => graph.adoptExternal(value));
    const checkpoint = this.pressureCheckpoint();
    return this.expressionResult(
      () => this.evaluateClassInstantiation(
        evaluationCallee,
        node,
        evaluationArguments.map((value) => new EvaluationValueEvidence(value, [])),
        moduleKey,
        0,
      ),
      checkpoint,
    );
  }

  /** Read one property from an evaluator value, including guarded accessor invocation for local getters. */
  evaluatePropertyValue(
    receiver: EvaluationValue,
    propertyName: string,
    moduleKey: string,
    node: ts.Node,
  ): StaticExpressionEvaluationResult {
    const evaluationReceiver = this.adoptExternalValue(receiver);
    const checkpoint = this.pressureCheckpoint();
    return this.expressionResult(
      () => evaluateStaticPropertyValue(evaluationReceiver, propertyName, node, moduleKey, 0, this.propertyAccessHost),
      checkpoint,
    );
  }

  /** Read one keyed member from an evaluator value, including guarded accessor invocation for local getters. */
  evaluateElementValue(
    receiver: EvaluationValue,
    argument: EvaluationValue,
    moduleKey: string,
    node: ts.Node,
  ): StaticExpressionEvaluationResult {
    const evaluationReceiver = this.adoptExternalValue(receiver);
    const evaluationArgument = this.adoptExternalValue(argument);
    const checkpoint = this.pressureCheckpoint();
    return this.expressionResult(
      () => evaluateStaticElementValue(
        evaluationReceiver,
        evaluationArgument,
        node,
        moduleKey,
        0,
        this.propertyAccessHost,
      ),
      checkpoint,
    );
  }

  /** Evaluate an evaluator-local function with precomputed argument values. */
  evaluateFunctionValue(
    callee: EvaluationFunctionValue,
    call: ts.Node,
    moduleKey: string,
    argumentValues: readonly EvaluationValue[],
    thisValue: EvaluationValue | null = null,
  ): StaticExpressionEvaluationResult {
    const graph = this.runtimeHost.evaluationValueGraph;
    const evaluationCallee = graph?.adoptExternal(callee) ?? callee;
    const evaluationArguments = graph == null
      ? argumentValues
      : argumentValues.map((value) => graph.adoptExternal(value));
    const evaluationThis = thisValue == null
      ? null
      : graph?.adoptExternal(thisValue) ?? thisValue;
    const checkpoint = this.pressureCheckpoint();
    return this.expressionResult(
      () => this.evaluateFunctionWithArguments(
        evaluationCallee,
        call,
        evaluationArguments.map((value) => new EvaluationValueEvidence(value, [])),
        moduleKey,
        0,
        evaluationThis == null ? null : new EvaluationValueEvidence(evaluationThis, []),
      ),
      checkpoint,
    );
  }

  private expressionResult(
    evaluate: () => EvaluationValue,
    checkpoint: StaticIntrinsicEvaluationCheckpoint,
  ): StaticExpressionEvaluationResult {
    try {
      const value = this.ownProducedValue(evaluate());
      return new StaticExpressionEvaluationResult(
        new NormalEvaluationCompletion(value),
        this.causalOpenSeams.slice(checkpoint.openSeamCount),
        this.orderedInvocationEvaluationsSince(checkpoint.invocationCount),
      );
    } catch (error) {
      if (!(error instanceof EvaluationAbruptCompletionSignal)) {
        throw error;
      }
      return new StaticExpressionEvaluationResult(
        error.completion,
        this.causalOpenSeams.slice(checkpoint.openSeamCount),
        this.orderedInvocationEvaluationsSince(checkpoint.invocationCount),
      );
    } finally {
      this.restoreEvaluationCheckpoint(checkpoint);
    }
  }

  private evaluateStatement(
    statement: ts.Statement,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    try {
      return this.evaluateStatementWithoutAbruptBridge(statement, environment, moduleKey, depth);
    } catch (error) {
      if (!(error instanceof EvaluationAbruptCompletionSignal)) {
        throw error;
      }
      return error.completion;
    }
  }

  private evaluateStatementWithoutAbruptBridge(
    statement: ts.Statement,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    if (this.exceededStatementCount(statement, moduleKey)) {
      return new OpenEvaluationCompletion('Statement count limit reached.');
    }

    switch (statement.kind) {
      case ts.SyntaxKind.VariableStatement:
        return this.evaluateVariableStatement(statement as ts.VariableStatement, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.ExpressionStatement:
        return this.evaluateExpressionStatement(statement as ts.ExpressionStatement, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.Block:
        return this.evaluateBlock(statement as ts.Block, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.EmptyStatement:
      case ts.SyntaxKind.ImportDeclaration:
      case ts.SyntaxKind.ImportEqualsDeclaration:
      case ts.SyntaxKind.ExportDeclaration:
      case ts.SyntaxKind.InterfaceDeclaration:
      case ts.SyntaxKind.TypeAliasDeclaration:
        return new NormalEvaluationCompletion();
      case ts.SyntaxKind.ExportAssignment:
        return this.evaluateExportAssignment(statement as ts.ExportAssignment, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.FunctionDeclaration:
        return new NormalEvaluationCompletion();
      case ts.SyntaxKind.ClassDeclaration:
        return this.evaluateClassDeclaration(statement as ts.ClassDeclaration, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.EnumDeclaration:
        return this.evaluateEnumDeclaration(statement as ts.EnumDeclaration, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.ModuleDeclaration:
        return this.unsupportedStatement(statement, moduleKey, 'Module declarations are not evaluated as runtime namespaces in this slice.');
      case ts.SyntaxKind.IfStatement:
        return this.evaluateIfStatement(statement as ts.IfStatement, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.DoStatement:
      case ts.SyntaxKind.WhileStatement:
        return this.unsupportedStatement(
          statement,
          moduleKey,
          'Loop statement is not reduced unless it has a supported bounded iteration shape.',
          [OpenSeamReasonKind.StaticEvaluationUnsupportedLoopStatement],
        );
      case ts.SyntaxKind.ForStatement:
        return this.evaluateForStatement(statement as ts.ForStatement, environment, moduleKey, depth + 1, emptyEvaluationLabels);
      case ts.SyntaxKind.ForInStatement:
        return this.evaluateForInStatement(statement as ts.ForInStatement, environment, moduleKey, depth + 1, emptyEvaluationLabels);
      case ts.SyntaxKind.ForOfStatement:
        return this.evaluateForOfStatement(statement as ts.ForOfStatement, environment, moduleKey, depth + 1, emptyEvaluationLabels);
      case ts.SyntaxKind.ContinueStatement:
        return new ContinueEvaluationCompletion((statement as ts.ContinueStatement).label?.text ?? null);
      case ts.SyntaxKind.BreakStatement:
        return new BreakEvaluationCompletion((statement as ts.BreakStatement).label?.text ?? null);
      case ts.SyntaxKind.ReturnStatement:
        return this.evaluateReturnStatement(statement as ts.ReturnStatement, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.WithStatement:
        return this.unsupportedStatement(statement, moduleKey, '`with` changes lexical lookup dynamically.');
      case ts.SyntaxKind.SwitchStatement:
        return this.evaluateSwitchStatement(statement as ts.SwitchStatement, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.LabeledStatement:
        return this.evaluateLabeledStatement(statement as ts.LabeledStatement, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.ThrowStatement:
        return this.evaluateThrowStatement(statement as ts.ThrowStatement, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.TryStatement:
        return this.evaluateTryStatement(statement as ts.TryStatement, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.DebuggerStatement:
        return new NormalEvaluationCompletion();
      case ts.SyntaxKind.NotEmittedStatement:
        return new NormalEvaluationCompletion();
      default:
        return this.unsupportedStatement(statement, moduleKey, `Statement kind ${this.syntaxKindName(statement)} is not in the evaluator statement set.`);
    }
  }

  private evaluateSwitchStatement(
    statement: ts.SwitchStatement,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    const expressionValue = this.evaluateExpression(statement.expression, environment, moduleKey, depth + 1);
    if (expressionValue.kind === EvaluationValueKind.BoundaryValue) {
      this.openPathBoundary(
        'Switch statement depended on a boundary expression.',
        statement.expression,
        moduleKey,
        expressionValue,
      );
      return new NormalEvaluationCompletion();
    }
    if (expressionValue.kind === EvaluationValueKind.Unknown) {
      this.materializeUnknownUse(expressionValue, statement.expression, moduleKey, 'Switch statement depended on an open expression.', EvaluationOpenSeamKind.DynamicBranch);
      return new NormalEvaluationCompletion();
    }

    const selectedClauseIndex = this.selectedSwitchClauseIndex(statement, expressionValue, environment, moduleKey, depth + 1);
    if (selectedClauseIndex == null) {
      return new NormalEvaluationCompletion();
    }

    for (const clause of statement.caseBlock.clauses.slice(selectedClauseIndex)) {
      for (const clauseStatement of clause.statements) {
        const completion = this.evaluateStatement(clauseStatement, environment, moduleKey, depth + 1);
        if (completion.kind === EvaluationCompletionKind.Break && completion.label == null) {
          return new NormalEvaluationCompletion();
        }
        if (completion.kind !== EvaluationCompletionKind.Normal) {
          return completion;
        }
      }
    }
    return new NormalEvaluationCompletion();
  }

  private evaluateLabeledStatement(
    statement: ts.LabeledStatement,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    const labels = new Set<string>();
    let target: ts.Statement = statement;
    while (ts.isLabeledStatement(target)) {
      labels.add(target.label.text);
      target = target.statement;
    }

    let completion: EvaluationCompletion;
    if (ts.isForStatement(target)) {
      completion = this.evaluateForStatement(target, environment, moduleKey, depth + 1, labels);
    } else if (ts.isForInStatement(target)) {
      completion = this.evaluateForInStatement(target, environment, moduleKey, depth + 1, labels);
    } else if (ts.isForOfStatement(target)) {
      completion = this.evaluateForOfStatement(target, environment, moduleKey, depth + 1, labels);
    } else {
      completion = this.evaluateStatement(target, environment, moduleKey, depth + 1);
    }
    return completion.kind === EvaluationCompletionKind.Break
      && completion.label != null
      && labels.has(completion.label)
      ? new NormalEvaluationCompletion()
      : completion;
  }

  private selectedSwitchClauseIndex(
    statement: ts.SwitchStatement,
    expressionValue: EvaluationValue,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): number | null {
    let defaultClauseIndex: number | null = null;
    for (let index = 0; index < statement.caseBlock.clauses.length; index += 1) {
      const clause = statement.caseBlock.clauses[index];
      if (clause == null) {
        continue;
      }
      if (ts.isDefaultClause(clause)) {
        defaultClauseIndex = index;
        continue;
      }
      const caseValue = this.evaluateExpression(clause.expression, environment, moduleKey, depth + 1);
      if (caseValue.kind === EvaluationValueKind.BoundaryValue) {
        this.open(
          EvaluationOpenSeamKind.DynamicBranch,
          'Switch case expression is a boundary value.',
          clause.expression,
          moduleKey,
          [openSeamReasonKindForEvaluationBoundary(caseValue.boundaryKind)],
        );
        return null;
      }
      if (caseValue.kind === EvaluationValueKind.Unknown) {
        this.materializeUnknownUse(caseValue, clause.expression, moduleKey, 'Switch case expression depended on an open value.', EvaluationOpenSeamKind.DynamicBranch);
        return null;
      }
      if (evaluationValuesStrictlyEqual(expressionValue, caseValue)) {
        return index;
      }
    }
    return defaultClauseIndex;
  }

  private evaluateTryStatement(
    statement: ts.TryStatement,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    const tryCompletion = this.evaluateBlock(statement.tryBlock, environment, moduleKey, depth + 1);
    const caughtCompletion = tryCompletion.kind === EvaluationCompletionKind.Throw && statement.catchClause != null
      ? this.evaluateCatchClause(
          statement.catchClause,
          new EvaluationValueEvidence(tryCompletion.value, tryCompletion.openSeams),
          environment,
          moduleKey,
          depth + 1,
        )
      : tryCompletion;

    if (statement.finallyBlock == null) {
      return caughtCompletion;
    }

    const finallyCompletion = this.evaluateBlock(statement.finallyBlock, environment, moduleKey, depth + 1);
    return finallyCompletion.kind === EvaluationCompletionKind.Normal
      ? caughtCompletion
      : finallyCompletion;
  }

  private evaluateCatchClause(
    catchClause: ts.CatchClause,
    thrownValue: EvaluationValueEvidence,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    const declaration = catchClause.variableDeclaration;
    if (declaration == null) {
      return this.evaluateBlock(catchClause.block, environment, moduleKey, depth + 1);
    }

    const bindingNames = staticBindingNames(declaration.name);
    const conflictingBinding = bindingNames.find((name) => environment.readBinding(name) != null);
    if (conflictingBinding != null) {
      this.open(
        EvaluationOpenSeamKind.UnsupportedBindingPattern,
        `Catch binding '${conflictingBinding}' shadows an existing evaluator binding; isolated catch environments are not modeled yet.`,
        declaration.name,
        moduleKey,
      );
      return new NormalEvaluationCompletion();
    }

    bindStaticBindingName(
      declaration.name,
      thrownValue,
      EvaluationBindingKind.Let,
      true,
      environment,
      moduleKey,
      depth + 1,
      declaration,
      this.bindingHost,
    );
    try {
      return this.evaluateBlock(catchClause.block, environment, moduleKey, depth + 1);
    } finally {
      for (const bindingName of bindingNames) {
        environment.deleteBinding(bindingName);
      }
    }
  }

  private evaluateBlock(
    block: ts.Block,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    instantiateStaticBlockFunctionDeclarations(block, environment);
    for (const statement of block.statements) {
      const completion = this.evaluateStatement(statement, environment, moduleKey, depth + 1);
      if (completion.kind !== EvaluationCompletionKind.Normal) {
        return completion;
      }
    }
    return new NormalEvaluationCompletion();
  }

  private evaluateVariableStatement(
    statement: ts.VariableStatement,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    const declarationKind = declarationListBindingKind(statement.declarationList);
    const mutable = declarationKind !== EvaluationBindingKind.Const;
    if (hasModifier(statement, ts.SyntaxKind.DeclareKeyword)) {
      for (const declaration of statement.declarationList.declarations) {
        this.evaluateAmbientVariableDeclaration(
          declaration,
          declarationKind,
          mutable,
          environment,
          moduleKey,
          depth + 1,
        );
      }
      return new NormalEvaluationCompletion();
    }
    for (const declaration of statement.declarationList.declarations) {
      this.evaluateVariableDeclaration(declaration, declarationKind, mutable, environment, moduleKey, depth + 1);
    }
    return new NormalEvaluationCompletion();
  }

  private evaluateAmbientVariableDeclaration(
    declaration: ts.VariableDeclaration,
    bindingKind: EvaluationBindingKind,
    mutable: boolean,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): void {
    bindStaticBindingName(
      declaration.name,
      new EvaluationValueEvidence(
        new EvaluationBoundaryValue(
          EvaluationBoundaryKind.HostEnvironment,
          declaration.name.getText(declaration.getSourceFile()),
          declaration,
        ),
        [],
      ),
      bindingKind,
      mutable,
      environment,
      moduleKey,
      depth + 1,
      declaration,
      this.bindingHost,
    );
  }

  private evaluateVariableDeclaration(
    declaration: ts.VariableDeclaration,
    bindingKind: EvaluationBindingKind,
    mutable: boolean,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): void {
    const checkpoint = this.causalOpenSeams.length;
    const value = declaration.initializer == null
      ? new EvaluationUndefinedValue(declaration)
      : this.evaluateExpression(declaration.initializer, environment, moduleKey, depth + 1);

    bindStaticBindingName(
      declaration.name,
      evaluationValueEvidence(value, this.consumeOpenSeamsSince(checkpoint)),
      bindingKind,
      mutable,
      environment,
      moduleKey,
      depth + 1,
      declaration,
      this.bindingHost,
    );
  }

  private evaluateExpressionStatement(
    statement: ts.ExpressionStatement,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    if (
      this.policy.dispositionForExpressionStatement(statement.expression, environment, moduleKey)
      === StaticEvaluationExpressionStatementDisposition.ExternallyOwned
    ) {
      this.evaluateExternallyOwnedInputs(statement.expression, environment, moduleKey, depth + 1);
      return new NormalEvaluationCompletion();
    }
    return new NormalEvaluationCompletion(this.evaluateExpression(statement.expression, environment, moduleKey, depth + 1));
  }

  private evaluateClassDeclaration(
    declaration: ts.ClassDeclaration,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    const localName = declaration.name?.text
      ?? (hasModifier(declaration, ts.SyntaxKind.DefaultKeyword) ? 'default' : null);
    if (localName == null) {
      this.open(EvaluationOpenSeamKind.UnsupportedBindingPattern, 'Class declaration did not expose a local binding name.', declaration, moduleKey);
      return new NormalEvaluationCompletion();
    }
    environment.initializeBinding(
      localName,
      hasModifier(declaration, ts.SyntaxKind.DeclareKeyword)
        ? new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, localName, declaration)
        : new EvaluationClassValue(
            declaration,
            environment,
            declaration,
            readStaticClassProperties(declaration, environment, moduleKey, depth + 1, this.classHost),
          ),
      EvaluationBindingKind.Class,
      false,
      declaration,
      [],
    );
    return new NormalEvaluationCompletion();
  }

  private evaluateEnumDeclaration(
    declaration: ts.EnumDeclaration,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    if (hasModifier(declaration, ts.SyntaxKind.DeclareKeyword)) {
      environment.initializeBinding(
        declaration.name.text,
        new EvaluationBoundaryValue(
          EvaluationBoundaryKind.HostEnvironment,
          declaration.name.text,
          declaration,
        ),
        EvaluationBindingKind.Const,
        false,
        declaration,
        [],
      );
      return new NormalEvaluationCompletion();
    }
    const properties = new Map<string, EvaluationObjectProperty>();
    let nextNumber = 0;
    for (const member of declaration.members) {
      const name = this.readPropertyName(member.name, environment, moduleKey, depth + 1);
      if (name == null) {
        this.open(EvaluationOpenSeamKind.UnsupportedExpression, 'Enum member name did not close to a string key.', member.name, moduleKey);
        continue;
      }
      const value = member.initializer == null
        ? new EvaluationNumberValue(nextNumber, member)
        : this.evaluateExpression(member.initializer, environment, moduleKey, depth + 1);
      if (value.kind === EvaluationValueKind.Number) {
        nextNumber = value.value + 1;
      }
      properties.set(name, new EvaluationObjectProperty(name, value, member, EvaluationObjectPropertyState.Closed));
    }
    environment.initializeBinding(
      declaration.name.text,
      new EvaluationObjectValue(properties, false, declaration),
      EvaluationBindingKind.Const,
      false,
      declaration,
      [],
    );
    return new NormalEvaluationCompletion();
  }

  private evaluateIfStatement(
    statement: ts.IfStatement,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    const condition = this.evaluateExpression(statement.expression, environment, moduleKey, depth + 1);
    if (condition.kind === EvaluationValueKind.BoundaryValue) {
      this.openPathBoundary(
        'If statement depended on a boundary condition.',
        statement.expression,
        moduleKey,
        condition,
      );
      return new NormalEvaluationCompletion();
    }
    if (condition.kind === EvaluationValueKind.Unknown) {
      this.materializeUnknownUse(condition, statement.expression, moduleKey, 'If statement depended on an open condition.', EvaluationOpenSeamKind.DynamicBranch);
      return new NormalEvaluationCompletion();
    }
    const truthy = readEvaluationTruthiness(condition);
    if (truthy == null) {
      this.open(EvaluationOpenSeamKind.DynamicBranch, 'If statement condition did not reduce to known truthiness.', statement.expression, moduleKey);
      return new NormalEvaluationCompletion();
    }
    return truthy
      ? this.evaluateStatementLike(statement.thenStatement, environment, moduleKey, depth + 1)
      : statement.elseStatement == null
        ? new NormalEvaluationCompletion()
        : this.evaluateStatementLike(statement.elseStatement, environment, moduleKey, depth + 1);
  }

  private evaluateForStatement(
    statement: ts.ForStatement,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
    labels: ReadonlySet<string>,
  ): EvaluationCompletion {
    if (statement.initializer != null) {
      this.evaluateForInitializer(statement.initializer, environment, moduleKey, depth + 1);
    }

    for (let iteration = 0; ; iteration++) {
      if (iteration >= this.policy.guardrails.maxLoopIterations) {
        this.open(
          EvaluationOpenSeamKind.DynamicLoop,
          `For loop exceeded maxLoopIterations=${this.policy.guardrails.maxLoopIterations}.`,
          statement,
          moduleKey,
          [OpenSeamReasonKind.StaticEvaluationGuardrailLimit],
        );
        return new NormalEvaluationCompletion();
      }

      if (statement.condition != null) {
        const condition = this.evaluateExpression(statement.condition, environment, moduleKey, depth + 1);
        if (condition.kind === EvaluationValueKind.BoundaryValue) {
          this.openPathBoundary(
            'For loop depended on a boundary condition.',
            statement.condition,
            moduleKey,
            condition,
          );
          return new NormalEvaluationCompletion();
        }
        if (condition.kind === EvaluationValueKind.Unknown) {
          this.materializeUnknownUse(condition, statement.condition, moduleKey, 'For loop depended on an open condition.', EvaluationOpenSeamKind.DynamicLoop);
          return new NormalEvaluationCompletion();
        }
        const truthy = readEvaluationTruthiness(condition);
        if (truthy == null) {
          this.open(EvaluationOpenSeamKind.DynamicLoop, 'For loop condition did not reduce to known truthiness.', statement.condition, moduleKey);
          return new NormalEvaluationCompletion();
        }
        if (!truthy) {
          return new NormalEvaluationCompletion();
        }
      }

      const completion = this.evaluateStatementLike(statement.statement, environment, moduleKey, depth + 1);
      if (completion.kind === EvaluationCompletionKind.Break) {
        return completion.label == null || labels.has(completion.label)
          ? new NormalEvaluationCompletion()
          : completion;
      }
      if (completion.kind === EvaluationCompletionKind.Continue) {
        if (completion.label != null && !labels.has(completion.label)) {
          return completion;
        }
      } else if (completion.kind !== EvaluationCompletionKind.Normal) {
        return completion;
      }
      if (statement.incrementor != null) {
        this.evaluateExpression(statement.incrementor, environment, moduleKey, depth + 1);
      }
    }
  }

  private evaluateForInitializer(
    initializer: ts.ForInitializer,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): void {
    if (ts.isVariableDeclarationList(initializer)) {
      const bindingKind = declarationListBindingKind(initializer);
      const mutable = bindingKind !== EvaluationBindingKind.Const;
      for (const declaration of initializer.declarations) {
        this.evaluateVariableDeclaration(declaration, bindingKind, mutable, environment, moduleKey, depth + 1);
      }
      return;
    }
    this.evaluateExpression(initializer, environment, moduleKey, depth + 1);
  }

  private evaluateForOfStatement(
    statement: ts.ForOfStatement,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
    labels: ReadonlySet<string>,
  ): EvaluationCompletion {
    const iterable = this.evaluateExpression(statement.expression, environment, moduleKey, depth + 1);
    if (iterable.kind === EvaluationValueKind.BoundaryValue) {
      this.openPathBoundary(
        'For-of statement depended on a boundary iterable.',
        statement.expression,
        moduleKey,
        iterable,
      );
      return new NormalEvaluationCompletion();
    }
    if (iterable.kind === EvaluationValueKind.Unknown) {
      this.materializeUnknownUse(iterable, statement.expression, moduleKey, 'For-of statement depended on an open iterable.', EvaluationOpenSeamKind.DynamicLoop);
      return new NormalEvaluationCompletion();
    }
    if (iterable.kind !== EvaluationValueKind.Array) {
      this.open(EvaluationOpenSeamKind.DynamicLoop, 'For-of iterable did not reduce to a known array value.', statement.expression, moduleKey);
      return new NormalEvaluationCompletion();
    }
    if (
      iterable.exactLength == null
      || iterable.exactLength > this.policy.guardrails.maxLoopIterations
      || iterable.mayHaveUnknownElements
      || iterable.mayHaveUnknownOrder
    ) {
      this.open(EvaluationOpenSeamKind.DynamicLoop, 'For-of iterable has unknown or excessive iteration shape.', statement.expression, moduleKey);
      return new NormalEvaluationCompletion();
    }

    for (let index = 0; index < iterable.exactLength; index += 1) {
      if (index >= this.policy.guardrails.maxLoopIterations) {
        this.open(
          EvaluationOpenSeamKind.DynamicLoop,
          'For-of iterable grew beyond the static iteration guardrail.',
          statement.expression,
          moduleKey,
        );
        return new NormalEvaluationCompletion();
      }
      const element = iterable.elementAtRuntimeIndex(index);
      this.bindLoopInitializer(
        statement.initializer,
        new EvaluationValueEvidence(
          element?.value ?? EvaluationUndefined,
          element?.openSeams ?? [],
        ),
        environment,
        moduleKey,
      );
      const completion = this.evaluateStatementLike(statement.statement, environment, moduleKey, depth + 1);
      if (completion.kind === EvaluationCompletionKind.Continue) {
        if (completion.label == null || labels.has(completion.label)) {
          continue;
        }
        return completion;
      }
      if (completion.kind === EvaluationCompletionKind.Break) {
        return completion.label == null || labels.has(completion.label)
          ? new NormalEvaluationCompletion()
          : completion;
      }
      if (completion.kind !== EvaluationCompletionKind.Normal) {
        return completion;
      }
    }
    return new NormalEvaluationCompletion();
  }

  private evaluateForInStatement(
    statement: ts.ForInStatement,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
    labels: ReadonlySet<string>,
  ): EvaluationCompletion {
    const source = this.evaluateExpression(statement.expression, environment, moduleKey, depth + 1);
    if (source.kind === EvaluationValueKind.BoundaryValue || source.kind === EvaluationValueKind.BoundaryObject) {
      if (source.kind === EvaluationValueKind.BoundaryValue) {
        this.openPathBoundary(
          'For-in statement depended on a boundary object.',
          statement.expression,
          moduleKey,
          source,
        );
      } else if (this.policy.branchMode === StaticEvaluationBranchMode.PathProvenEffects) {
        this.open(
          EvaluationOpenSeamKind.DynamicLoop,
          'For-in statement depended on a boundary object.',
          statement.expression,
          moduleKey,
        );
      }
      return new NormalEvaluationCompletion();
    }
    if (source.kind === EvaluationValueKind.Unknown) {
      this.materializeUnknownUse(source, statement.expression, moduleKey, 'For-in statement depended on an open object.', EvaluationOpenSeamKind.DynamicLoop);
      return new NormalEvaluationCompletion();
    }
    if (source.kind !== EvaluationValueKind.Object) {
      this.open(EvaluationOpenSeamKind.DynamicLoop, 'For-in source did not reduce to a known object value.', statement.expression, moduleKey);
      return new NormalEvaluationCompletion();
    }
    if (source.properties.size > this.policy.guardrails.maxLoopIterations || source.mayHaveUnknownProperties) {
      this.open(EvaluationOpenSeamKind.DynamicLoop, 'For-in source has unknown or excessive property shape.', statement.expression, moduleKey);
      return new NormalEvaluationCompletion();
    }

    for (const name of source.properties.keys()) {
      this.bindLoopInitializer(
        statement.initializer,
        new EvaluationValueEvidence(new EvaluationStringValue(name, statement.expression), []),
        environment,
        moduleKey,
      );
      const completion = this.evaluateStatementLike(statement.statement, environment, moduleKey, depth + 1);
      if (completion.kind === EvaluationCompletionKind.Continue) {
        if (completion.label == null || labels.has(completion.label)) {
          continue;
        }
        return completion;
      }
      if (completion.kind === EvaluationCompletionKind.Break) {
        return completion.label == null || labels.has(completion.label)
          ? new NormalEvaluationCompletion()
          : completion;
      }
      if (completion.kind !== EvaluationCompletionKind.Normal) {
        return completion;
      }
    }
    return new NormalEvaluationCompletion();
  }

  private bindLoopInitializer(
    initializer: ts.ForInitializer,
    evidence: EvaluationValueEvidence,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
  ): void {
    if (ts.isVariableDeclarationList(initializer)) {
      const declaration = initializer.declarations[0];
      if (declaration != null) {
        const bindingKind = declarationListBindingKind(initializer);
        bindStaticBindingName(
          declaration.name,
          evidence,
          bindingKind,
          bindingKind !== EvaluationBindingKind.Const,
          environment,
          moduleKey,
          0,
          declaration,
          this.bindingHost,
        );
        return;
      }
    }
    if (ts.isIdentifier(initializer)) {
      if (!environment.setBinding(initializer.text, evidence.value, evidence.openSeams)) {
        environment.initializeBinding(
          initializer.text,
          evidence.value,
          EvaluationBindingKind.Let,
          true,
          initializer,
          evidence.openSeams,
        );
      }
      return;
    }
    this.open(EvaluationOpenSeamKind.UnsupportedBindingPattern, 'Loop initializer is not a supported binding target.', initializer, moduleKey);
  }

  private evaluateReturnStatement(
    statement: ts.ReturnStatement,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    if (statement.expression == null) {
      return new ReturnEvaluationCompletion();
    }
    const checkpoint = this.causalOpenSeams.length;
    const value = this.evaluateExpression(statement.expression, environment, moduleKey, depth + 1);
    const evidence = evaluationValueEvidence(value, this.consumeOpenSeamsSince(checkpoint));
    return new ReturnEvaluationCompletion(evidence.value, evidence.openSeams);
  }

  private evaluateThrowStatement(
    statement: ts.ThrowStatement,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    if (statement.expression == null) {
      return new ThrowEvaluationCompletion();
    }
    const checkpoint = this.causalOpenSeams.length;
    const value = this.evaluateExpression(statement.expression, environment, moduleKey, depth + 1);
    const evidence = evaluationValueEvidence(value, this.consumeOpenSeamsSince(checkpoint));
    return new ThrowEvaluationCompletion(evidence.value, evidence.openSeams);
  }

  private evaluateExportAssignment(
    statement: ts.ExportAssignment,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    if (statement.isExportEquals === true) {
      return this.unsupportedStatement(statement, moduleKey, 'TypeScript export assignment is CommonJS-shaped and is not treated as an ES default export.');
    }
    const checkpoint = this.causalOpenSeams.length;
    const value = this.evaluateExpression(statement.expression, environment, moduleKey, depth + 1);
    const evidence = evaluationValueEvidence(value, this.consumeOpenSeamsSince(checkpoint));
    environment.initializeBinding(
      'default',
      evidence.value,
      EvaluationBindingKind.Const,
      false,
      statement,
      evidence.openSeams,
    );
    return new NormalEvaluationCompletion();
  }

  private evaluateStatementLike(
    statement: ts.Statement,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationCompletion {
    return ts.isBlock(statement)
      ? this.evaluateBlock(statement, environment, moduleKey, depth + 1)
      : this.evaluateStatement(statement, environment, moduleKey, depth + 1);
  }

  private evaluateExpression(
    expression: ts.Expression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const flow = this.evaluateExpressionFlow(expression, environment, moduleKey, depth);
    return this.ownProducedValue(this.materializeOptionalExpressionFlow(flow, expression).value);
  }

  private ownProducedValue<TValue extends EvaluationValue>(value: TValue): TValue {
    return this.runtimeHost.evaluationValueGraph?.retainProduced(value) ?? value;
  }

  private adoptExternalValue<TValue extends EvaluationValue>(value: TValue): TValue {
    return this.runtimeHost.evaluationValueGraph?.adoptExternal(value) ?? value;
  }

  private adoptExternalEvidence(evidence: EvaluationValueEvidence): EvaluationValueEvidence {
    return new EvaluationValueEvidence(this.adoptExternalValue(evidence.value), evidence.openSeams);
  }

  private evaluateExpressionFlow(
    expression: ts.Expression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): StaticExpressionFlow {
    if (depth > this.policy.guardrails.maxExpressionDepth) {
      return staticExpressionValue(
        this.unknown('Expression depth limit reached.', expression, moduleKey, EvaluationOpenSeamKind.DepthLimit),
      );
    }

    if (
      ts.isParenthesizedExpression(expression)
      || ts.isAsExpression(expression)
      || ts.isTypeAssertionExpression(expression)
      || ts.isSatisfiesExpression(expression)
    ) {
      return this.materializeOptionalExpressionFlow(
        this.evaluateExpressionFlow(expression.expression, environment, moduleKey, depth + 1),
        expression,
      );
    }
    if (ts.isNonNullExpression(expression)) {
      const inner = this.evaluateExpressionFlow(expression.expression, environment, moduleKey, depth + 1);
      return isOptionalChainNode(expression)
        ? inner
        : this.materializeOptionalExpressionFlow(inner, expression);
    }
    if (ts.isPropertyAccessExpression(expression)) {
      return this.evaluatePropertyAccessFlow(expression, environment, moduleKey, depth + 1);
    }
    if (ts.isElementAccessExpression(expression)) {
      return this.evaluateElementAccessFlow(expression, environment, moduleKey, depth + 1);
    }
    if (ts.isCallExpression(expression)) {
      return this.evaluateCallExpressionFlow(expression, environment, moduleKey, depth + 1);
    }
    return staticExpressionValue(this.evaluateExpressionValue(expression, environment, moduleKey, depth));
  }

  private evaluateExpressionValue(
    expression: ts.Expression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const current = expression;
    switch (current.kind) {
      case ts.SyntaxKind.StringLiteral:
      case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
        return new EvaluationStringValue((current as ts.StringLiteralLike).text, current);
      case ts.SyntaxKind.NumericLiteral:
        return new EvaluationNumberValue(Number((current as ts.NumericLiteral).text), current);
      case ts.SyntaxKind.BigIntLiteral:
        return new EvaluationBigIntValue((current as ts.BigIntLiteral).text, current);
      case ts.SyntaxKind.RegularExpressionLiteral:
        return this.evaluateRegularExpressionLiteral(current as ts.RegularExpressionLiteral);
      case ts.SyntaxKind.TrueKeyword:
        return new EvaluationBooleanValue(true, current);
      case ts.SyntaxKind.FalseKeyword:
        return new EvaluationBooleanValue(false, current);
      case ts.SyntaxKind.NullKeyword:
        return new EvaluationNullValue(current);
      case ts.SyntaxKind.ThisKeyword:
        return environment.readValue('this')
          ?? this.unknown('`this` is not available in the current static evaluation environment.', current, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier);
      case ts.SyntaxKind.MetaProperty:
        return this.evaluateMetaProperty(current as ts.MetaProperty, moduleKey);
      case ts.SyntaxKind.Identifier:
        return this.evaluateIdentifier(current as ts.Identifier, environment, moduleKey);
      case ts.SyntaxKind.ArrayLiteralExpression:
        return evaluateStaticArrayLiteral(current as ts.ArrayLiteralExpression, environment, moduleKey, depth + 1, this.literalHost);
      case ts.SyntaxKind.ObjectLiteralExpression:
        return evaluateStaticObjectLiteral(current as ts.ObjectLiteralExpression, environment, moduleKey, depth + 1, this.literalHost);
      case ts.SyntaxKind.NewExpression:
        return this.evaluateNewExpression(current as ts.NewExpression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.ArrowFunction:
      case ts.SyntaxKind.FunctionExpression:
        return new EvaluationFunctionValue(current as ts.FunctionLikeDeclaration, environment, current);
      case ts.SyntaxKind.ClassExpression:
        return new EvaluationClassValue(
          current as ts.ClassExpression,
          environment,
          current,
          readStaticClassProperties(current as ts.ClassExpression, environment, moduleKey, depth + 1, this.classHost),
        );
      case ts.SyntaxKind.TemplateExpression:
        return this.evaluateTemplateExpression(current as ts.TemplateExpression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.BinaryExpression:
        return this.evaluateBinaryExpression(current as ts.BinaryExpression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.PrefixUnaryExpression:
        return this.evaluatePrefixUnaryExpression(current as ts.PrefixUnaryExpression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.PostfixUnaryExpression:
        return this.evaluatePostfixUnaryExpression(current as ts.PostfixUnaryExpression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.TypeOfExpression:
        return this.evaluateTypeOfExpression(current as ts.TypeOfExpression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.VoidExpression:
        return this.evaluateVoidExpression(current as ts.VoidExpression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.ConditionalExpression:
        return this.evaluateConditionalExpression(current as ts.ConditionalExpression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.SpreadElement:
        return this.evaluateExpression((current as ts.SpreadElement).expression, environment, moduleKey, depth + 1);
      case ts.SyntaxKind.AwaitExpression:
      case ts.SyntaxKind.YieldExpression:
        return this.unknown('Async and generator evaluation are outside this substrate.', current, moduleKey, EvaluationOpenSeamKind.UnsupportedExpression);
      default:
        return this.unknown(`Expression kind ${this.syntaxKindName(current)} is not in the evaluator expression set.`, current, moduleKey, EvaluationOpenSeamKind.UnsupportedExpression);
    }
  }

  private evaluateIdentifier(
    identifier: ts.Identifier,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
  ): EvaluationValue {
    if (identifier.text === 'undefined') {
      return new EvaluationUndefinedValue(identifier);
    }
    const binding = environment.readBinding(identifier.text);
    if (binding == null) {
      const commonJsCarrier = this.evaluateCommonJsCarrierIdentifier(identifier, environment);
      if (commonJsCarrier != null) {
        return commonJsCarrier;
      }
      const hostValue = this.runtimeHost.resolveIdentifier?.(identifier, environment, moduleKey) ?? null;
      if (hostValue != null) {
        this.runtimeHost.evaluationValueGraph?.reconcileEnvironmentAfterExternal(environment);
        return this.adoptExternalValue(hostValue);
      }
      const globalValue = evaluateAureliaExpressionGlobalAccess(identifier.text, identifier);
      if (globalValue != null) {
        return globalValue;
      }
      return this.unknown(`Identifier '${identifier.text}' is not available in the current environment.`, identifier, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier);
    }
    if (binding.state === EvaluationBindingState.Uninitialized) {
      return this.unknown(`Identifier '${identifier.text}' is declared but not initialized in the current environment.`, identifier, moduleKey, EvaluationOpenSeamKind.UnresolvedIdentifier);
    }
    if (binding.openSeams.length > 0) {
      this.replayOpenSeams(binding.openSeams);
      return new EvaluationUnknownValue(
        `Identifier '${identifier.text}' retains a best-known value qualified by open evaluation pressure.`,
        identifier,
        true,
        binding.value.kind === EvaluationValueKind.Unknown
          ? binding.value.retainedCandidate
          : binding.value,
      );
    }
    const value = binding.value;
    if (value.kind === EvaluationValueKind.Unknown && !value.hasOpenSeam) {
      return this.materializeUnknownUse(value, identifier, moduleKey, `Identifier '${identifier.text}' is open in the current environment.`, EvaluationOpenSeamKind.UnresolvedIdentifier);
    }
    this.replayOpenSeams(evaluationValueOwnOpenSeams(value));
    return value;
  }

  private evaluateMetaProperty(
    expression: ts.MetaProperty,
    moduleKey: string,
  ): EvaluationValue {
    if (
      expression.keywordToken === ts.SyntaxKind.ImportKeyword
      && expression.name.text === 'meta'
    ) {
      return new EvaluationBoundaryObjectValue(EvaluationBoundaryKind.HostEnvironment, 'import.meta', new Map(), expression);
    }
    return this.unknown(
      `Meta property ${expression.getText(expression.getSourceFile())} is not in the evaluator expression set.`,
      expression,
      moduleKey,
      EvaluationOpenSeamKind.UnsupportedExpression,
    );
  }

  private evaluateRegularExpressionLiteral(
    literal: ts.RegularExpressionLiteral,
  ): EvaluationValue {
    const text = literal.getText(literal.getSourceFile());
    const closingSlash = text.lastIndexOf('/');
    if (!text.startsWith('/') || closingSlash <= 0) {
      return new EvaluationRegularExpressionValue(text, '', literal);
    }
    return new EvaluationRegularExpressionValue(
      text.slice(1, closingSlash),
      text.slice(closingSlash + 1),
      literal,
    );
  }

  private evaluateCommonJsCarrierIdentifier(
    identifier: ts.Identifier,
    environment: ModuleEnvironmentRecord,
  ): EvaluationValue | null {
    switch (identifier.text) {
      case 'exports':
        return ensureStaticCommonJsExports(environment, identifier);
      case 'module':
        return ensureStaticCommonJsModule(environment, identifier);
      default:
        return null;
    }
  }

  private evaluatePropertyAccessFlow(
    expression: ts.PropertyAccessExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): StaticExpressionFlow {
    const receiverCheckpoint = this.causalOpenSeams.length;
    const receiverFlow = this.evaluateExpressionFlow(expression.expression, environment, moduleKey, depth + 1);
    if (receiverFlow.kind !== StaticExpressionFlowKind.Value) {
      return receiverFlow;
    }
    const receiverPressure = this.consumeOpenSeamsSince(receiverCheckpoint);
    if (hasQuestionDotToken(expression)) {
      const optional = optionalChainSelection(receiverFlow.value, receiverPressure);
      if (optional != null) {
        return optional;
      }
    }
    return staticExpressionValue(evaluateStaticPropertyAccessFromReceiver(
      expression,
      receiverFlow.value,
      receiverPressure,
      moduleKey,
      depth,
      this.propertyAccessHost,
    ));
  }

  private evaluateElementAccessFlow(
    expression: ts.ElementAccessExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): StaticExpressionFlow {
    const receiverCheckpoint = this.causalOpenSeams.length;
    const receiverFlow = this.evaluateExpressionFlow(expression.expression, environment, moduleKey, depth + 1);
    if (receiverFlow.kind !== StaticExpressionFlowKind.Value) {
      return receiverFlow;
    }
    const receiverPressure = this.consumeOpenSeamsSince(receiverCheckpoint);
    if (hasQuestionDotToken(expression)) {
      const optional = optionalChainSelection(receiverFlow.value, receiverPressure);
      if (optional != null) {
        return optional;
      }
    }
    const argumentCheckpoint = this.causalOpenSeams.length;
    const argument = expression.argumentExpression == null
      ? null
      : this.evaluateExpression(expression.argumentExpression, environment, moduleKey, depth + 1);
    const argumentPressure = this.consumeOpenSeamsSince(argumentCheckpoint);
    return staticExpressionValue(evaluateStaticElementAccessFromValues(
      expression,
      receiverFlow.value,
      receiverPressure,
      argument,
      argumentPressure,
      moduleKey,
      depth,
      this.propertyAccessHost,
    ));
  }

  private prepareInvocationTarget(
    expression: ts.Expression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): StaticInvocationTarget | StaticExpressionOptionalFlow {
    if (
      ts.isParenthesizedExpression(expression)
      || ts.isAsExpression(expression)
      || ts.isTypeAssertionExpression(expression)
      || ts.isSatisfiesExpression(expression)
      || ts.isNonNullExpression(expression)
    ) {
      const target = this.prepareInvocationTarget(expression.expression, environment, moduleKey, depth + 1);
      if (
        target.kind !== StaticExpressionFlowKind.Value
        && !(ts.isNonNullExpression(expression) && isOptionalChainNode(expression))
      ) {
        return staticInvocationTarget(
          new EvaluationValueEvidence(
            target.kind === StaticExpressionFlowKind.OptionalShortCircuit
              ? new EvaluationUndefinedValue(expression)
              : new EvaluationUnknownValue(
                  'Optional chain nullish selection retained open evaluation pressure.',
                  expression,
                  true,
                ),
            target.openSeams,
          ),
          null,
          null,
        );
      }
      return target;
    }

    if (ts.isPropertyAccessExpression(expression)) {
      const receiverCheckpoint = this.causalOpenSeams.length;
      const receiverFlow = this.evaluateExpressionFlow(expression.expression, environment, moduleKey, depth + 1);
      if (receiverFlow.kind !== StaticExpressionFlowKind.Value) {
        return receiverFlow;
      }
      const receiverPressure = this.consumeOpenSeamsSince(receiverCheckpoint);
      if (hasQuestionDotToken(expression)) {
        const optional = optionalChainSelection(receiverFlow.value, receiverPressure);
        if (optional != null) {
          return optional;
        }
      }
      const receiver = evaluationValueEvidence(receiverFlow.value, receiverPressure);
      const calleeCheckpoint = this.causalOpenSeams.length;
      const callee = evaluateStaticPropertyAccessFromReceiver(
        expression,
        receiverFlow.value,
        receiverPressure,
        moduleKey,
        depth,
        this.propertyAccessHost,
      );
      return staticInvocationTarget(
        evaluationValueEvidence(callee, [
          ...receiver.openSeams,
          ...this.consumeOpenSeamsSince(calleeCheckpoint),
        ]),
        receiver,
        expression.name.text,
        expression.expression,
        expression.name,
        new EvaluationValueEvidence(new EvaluationStringValue(expression.name.text, expression.name), []),
      );
    }

    if (ts.isElementAccessExpression(expression)) {
      const receiverCheckpoint = this.causalOpenSeams.length;
      const receiverFlow = this.evaluateExpressionFlow(expression.expression, environment, moduleKey, depth + 1);
      if (receiverFlow.kind !== StaticExpressionFlowKind.Value) {
        return receiverFlow;
      }
      const receiverPressure = this.consumeOpenSeamsSince(receiverCheckpoint);
      if (hasQuestionDotToken(expression)) {
        const optional = optionalChainSelection(receiverFlow.value, receiverPressure);
        if (optional != null) {
          return optional;
        }
      }
      const receiver = evaluationValueEvidence(receiverFlow.value, receiverPressure);
      const argumentCheckpoint = this.causalOpenSeams.length;
      const argument = expression.argumentExpression == null
        ? null
        : this.evaluateExpression(expression.argumentExpression, environment, moduleKey, depth + 1);
      const argumentPressure = this.consumeOpenSeamsSince(argumentCheckpoint);
      const calleeCheckpoint = this.causalOpenSeams.length;
      const callee = evaluateStaticElementAccessFromValues(
        expression,
        receiverFlow.value,
        receiverPressure,
        argument,
        argumentPressure,
        moduleKey,
        depth,
        this.propertyAccessHost,
      );
      return staticInvocationTarget(
        evaluationValueEvidence(callee, [
          ...receiver.openSeams,
          ...argumentPressure,
          ...this.consumeOpenSeamsSince(calleeCheckpoint),
        ]),
        receiver,
        argument == null ? null : evaluationPropertyKeyString(argument),
        expression.expression,
        expression.argumentExpression,
        argument == null ? null : evaluationValueEvidence(argument, argumentPressure),
      );
    }

    if (expression.kind === ts.SyntaxKind.ImportKeyword) {
      return staticInvocationTarget(
        new EvaluationValueEvidence(
          new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, 'import', expression),
          [],
        ),
        null,
        null,
      );
    }
    if (ts.isIdentifier(expression) && expression.text === 'require' && environment.readBinding('require') == null) {
      return staticInvocationTarget(
        new EvaluationValueEvidence(
          new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, 'require', expression),
          [],
        ),
        null,
        null,
      );
    }

    const calleeCheckpoint = this.causalOpenSeams.length;
    const calleeFlow = this.evaluateExpressionFlow(expression, environment, moduleKey, depth + 1);
    if (calleeFlow.kind !== StaticExpressionFlowKind.Value) {
      return calleeFlow;
    }
    return staticInvocationTarget(
      evaluationValueEvidence(calleeFlow.value, this.consumeOpenSeamsSince(calleeCheckpoint)),
      null,
      null,
    );
  }

  private evaluateCallExpressionFlow(
    call: ts.CallExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): StaticExpressionFlow {
    const target = this.prepareInvocationTarget(call.expression, environment, moduleKey, depth + 1);
    if (target.kind !== StaticExpressionFlowKind.Value) {
      return target;
    }
    if (hasQuestionDotToken(call)) {
      const optional = optionalChainSelection(target.callee.value, invocationTargetOpenSeams(target));
      if (optional != null) {
        return optional;
      }
    }

    const reference = new StaticInvocationReference(
      call.expression,
      target.callee,
      target.receiverNode,
      target.thisValue,
      target.propertyKeyNode,
      target.propertyKey,
      target.propertyKeyEvidence,
    );
    const argumentList = this.evaluateArgumentList(call.arguments, environment, moduleKey, depth + 1);
    this.restoreConsumedOpenSeams([
      ...invocationTargetOpenSeams(target),
      ...argumentList.shape.aggregateOpenSeams,
    ]);
    if (argumentList.outcome === EvaluationArgumentListOutcome.OpenBeforeInvocation) {
      this.retainInvocationPreparationBoundary(
        StaticInvocationKind.Call,
        call,
        moduleKey,
        reference,
        argumentList,
      );
      return staticExpressionValue(new EvaluationUnknownValue(
        'Call argument evaluation did not prove that control reaches invocation.',
        call,
        true,
      ));
    }
    const frame = new StaticInvocationFrame(
      StaticInvocationKind.Call,
      call,
      environment,
      moduleKey,
      depth,
      reference,
      argumentList,
    );
    return staticExpressionValue(this.evaluateInvocationOccurrence(frame, () =>
      frame.callee.openSeams.length > 0
        ? new EvaluationUnknownValue(
            'Call target identity retained open evaluation pressure.',
            call,
            true,
          )
        : this.dispatchCall(frame)
    ));
  }

  private evaluateInvocationOccurrence<
    TNode extends ts.CallExpression | ts.NewExpression,
  >(
    frame: StaticInvocationFrame<TNode>,
    evaluate: () => EvaluationValue,
  ): EvaluationValue {
    const ordinal = this.nextInvocationOrdinal++;
    const pressureCheckpoint = this.causalOpenSeams.length;
    try {
      const value = evaluate();
      this.retainInvocationOccurrence(
        frame,
        ordinal,
        new NormalEvaluationCompletion(value),
        pressureCheckpoint,
      );
      return value;
    } catch (error) {
      if (error instanceof EvaluationAbruptCompletionSignal) {
        this.retainInvocationOccurrence(frame, ordinal, error.completion, pressureCheckpoint);
      }
      throw error;
    }
  }

  private retainInvocationOccurrence<
    TNode extends ts.CallExpression | ts.NewExpression,
  >(
    frame: StaticInvocationFrame<TNode>,
    ordinal: number,
    completion: EvaluationExpressionCompletion,
    pressureCheckpoint: number,
  ): void {
    this.invocationEvaluations.push(new StaticInvocationOccurrence(
      ordinal,
      frame.kind,
      frame.node,
      frame.moduleKey,
      frame.reference,
      frame.argumentList,
      completion,
      [
        ...frame.callee.openSeams,
        ...(frame.thisValue?.openSeams ?? []),
        ...(frame.reference.propertyKeyEvidence?.openSeams ?? []),
        ...frame.argumentList.aggregateOpenSeams,
        ...(completion.kind === EvaluationCompletionKind.Throw ? completion.openSeams : []),
        ...this.openSeamsSince(pressureCheckpoint),
      ],
    ));
  }

  private retainInvocationPreparationBoundary<
    TNode extends ts.CallExpression | ts.NewExpression,
  >(
    kind: StaticInvocationKind,
    node: TNode,
    moduleKey: string,
    reference: StaticInvocationReference,
    argumentList: EvaluationArgumentList,
  ): void {
    this.invocationEvaluations.push(new StaticInvocationPreparationBoundary(
      this.nextInvocationOrdinal++,
      StaticInvocationPreparationBoundaryKind.ArgumentListOpen,
      kind,
      node,
      moduleKey,
      reference,
      argumentList,
      [
        ...reference.callee.openSeams,
        ...(reference.thisValue?.openSeams ?? []),
        ...(reference.propertyKeyEvidence?.openSeams ?? []),
        ...argumentList.aggregateOpenSeams,
      ],
    ));
  }

  private dispatchCall(
    frame: StaticInvocationFrame<ts.CallExpression>,
  ): EvaluationValue {
    const host = this.intrinsicHost();
    const hosted = this.runtimeHost.evaluateInvocation?.(frame, host);
    if (hosted?.kind === StaticInvocationDispatchKind.Handled) {
      this.runtimeHost.evaluationValueGraph?.reconcileEnvironmentAfterExternal(frame.environment);
      this.replayOpenSeams(hosted.openSeams);
      return hosted.completion.kind === EvaluationCompletionKind.Normal
        ? this.adoptExternalValue(hosted.completion.value)
        : this.raise(new ThrowEvaluationCompletion(
            this.adoptExternalValue(hosted.completion.value),
            hosted.completion.openSeams,
          ));
    }

    const intrinsic = evaluateKnownIntrinsic(frame, host);
    if (intrinsic != null) {
      return intrinsic;
    }

    const functionPrototypeCall = this.evaluateFunctionPrototypeCall(frame);
    if (functionPrototypeCall != null) {
      return functionPrototypeCall;
    }

    const callee = frame.callee.value;
    if (callee.kind === EvaluationValueKind.Unknown) {
      return this.materializeUnknownUse(callee, frame.node, frame.moduleKey, 'Call expression depended on an open callee.', EvaluationOpenSeamKind.DynamicCall);
    }
    if (callee.kind === EvaluationValueKind.BoundaryValue || callee.kind === EvaluationValueKind.BoundaryObject) {
      return boundaryDependencyValue(
        frame.node,
        callee,
        ...frame.argumentList.elements.map((element) => element.value),
      );
    }
    if (callee.kind === EvaluationValueKind.Function) {
      const argumentRead = this.exactInvocationArguments(frame, 'Function argument list did not close.');
      return argumentRead.kind === 'open'
        ? argumentRead.value
        : this.evaluateFunctionWithArguments(
            callee,
            frame.node,
            argumentRead.values,
            frame.moduleKey,
            frame.depth + 1,
            frame.thisValue,
          );
    }
    return this.unknown('Call expression did not reduce to a callable value.', frame.node, frame.moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }

  private evaluateFunctionPrototypeCall(
    frame: StaticInvocationFrame<ts.CallExpression>,
  ): EvaluationValue | null {
    if (
      invocationBoundaryPath(frame.callee.value) !== 'Function.prototype.call'
      || frame.thisValue?.value.kind !== EvaluationValueKind.Function
    ) {
      return null;
    }
    const argumentRead = this.exactInvocationArguments(frame, 'Function.prototype.call argument list did not close.');
    if (argumentRead.kind === 'open') {
      return argumentRead.value;
    }
    return this.evaluateFunctionWithArguments(
      frame.thisValue.value,
      frame.node,
      argumentRead.values.slice(1),
      frame.moduleKey,
      frame.depth + 1,
      argumentRead.values[0] ?? new EvaluationValueEvidence(EvaluationUndefined, []),
    );
  }

  private evaluateNewExpression(
    expression: ts.NewExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const preparedTarget = this.prepareInvocationTarget(expression.expression, environment, moduleKey, depth + 1);
    const target = preparedTarget.kind !== StaticExpressionFlowKind.Value
      ? staticInvocationTarget(
          new EvaluationValueEvidence(
            preparedTarget.kind === StaticExpressionFlowKind.OptionalShortCircuit
              ? new EvaluationUndefinedValue(expression.expression)
              : new EvaluationUnknownValue(
                  'Constructor target retained indeterminate optional-chain pressure.',
                  expression.expression,
                  true,
                ),
            preparedTarget.openSeams,
          ),
          null,
          null,
        )
      : preparedTarget;
    const reference = new StaticInvocationReference(
      expression.expression,
      target.callee,
      target.receiverNode,
      null,
      target.propertyKeyNode,
      target.propertyKey,
      target.propertyKeyEvidence,
    );
    const argumentList = this.evaluateArgumentList(expression.arguments ?? [], environment, moduleKey, depth + 1);
    this.restoreConsumedOpenSeams([
      ...invocationTargetOpenSeams(target),
      ...argumentList.shape.aggregateOpenSeams,
    ]);
    if (argumentList.outcome === EvaluationArgumentListOutcome.OpenBeforeInvocation) {
      this.retainInvocationPreparationBoundary(
        StaticInvocationKind.Construct,
        expression,
        moduleKey,
        reference,
        argumentList,
      );
      return new EvaluationUnknownValue(
        'Constructor argument evaluation did not prove that control reaches invocation.',
        expression,
        true,
      );
    }
    const frame = new StaticInvocationFrame(
      StaticInvocationKind.Construct,
      expression,
      environment,
      moduleKey,
      depth,
      reference,
      argumentList,
    );
    return this.evaluateInvocationOccurrence(frame, () => this.dispatchConstruct(frame));
  }

  private dispatchConstruct(
    frame: StaticInvocationFrame<ts.NewExpression>,
  ): EvaluationValue {
    if (frame.callee.openSeams.length > 0) {
      return new EvaluationUnknownValue(
        'Constructor target identity retained open evaluation pressure.',
        frame.node,
        true,
      );
    }
    const host = this.intrinsicHost();
    const hosted = this.runtimeHost.evaluateInvocation?.(frame, host);
    if (hosted?.kind === StaticInvocationDispatchKind.Handled) {
      this.runtimeHost.evaluationValueGraph?.reconcileEnvironmentAfterExternal(frame.environment);
      this.replayOpenSeams(hosted.openSeams);
      return hosted.completion.kind === EvaluationCompletionKind.Normal
        ? this.adoptExternalValue(hosted.completion.value)
        : this.raise(new ThrowEvaluationCompletion(
            this.adoptExternalValue(hosted.completion.value),
            hosted.completion.openSeams,
          ));
    }
    const intrinsic = evaluateKnownConstructor(frame, host);
    if (intrinsic != null) {
      return intrinsic;
    }

    const callee = frame.callee.value;
    if (callee.kind === EvaluationValueKind.Unknown) {
      return this.materializeUnknownUse(callee, frame.node, frame.moduleKey, 'New expression depended on an open constructor.', EvaluationOpenSeamKind.DynamicCall);
    }
    if (callee.kind === EvaluationValueKind.BoundaryValue || callee.kind === EvaluationValueKind.BoundaryObject) {
      return boundaryDependencyValue(
        frame.node,
        callee,
        ...frame.argumentList.elements.map((element) => element.value),
      );
    }
    if (callee.kind === EvaluationValueKind.Class) {
      const argumentRead = this.exactInvocationArguments(frame, 'Constructor argument list did not close.');
      return argumentRead.kind === 'open'
        ? argumentRead.value
        : this.evaluateClassInstantiation(callee, frame.node, argumentRead.values, frame.moduleKey, frame.depth + 1);
    }
    return this.unknown('New expression did not reduce to a constructable value.', frame.node, frame.moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }

  private evaluateClassInstantiation(
    callee: EvaluationClassValue,
    expression: ts.Node,
    argumentValues: readonly EvaluationValueEvidence[],
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    return evaluateStaticClassInstantiation(callee, expression, argumentValues, moduleKey, depth, this.classHost);
  }

  private evaluateArguments(
    expressions: readonly ts.Expression[],
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): readonly EvaluationValue[] {
    const argumentList = this.evaluateArgumentList(expressions, environment, moduleKey, depth + 1);
    this.restoreConsumedOpenSeams(argumentList.aggregateOpenSeams);
    return argumentList.elements.map((element) => element.value);
  }

  private evaluateArgumentList(
    expressions: readonly ts.Expression[],
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationArgumentList {
    return evaluateStaticArgumentList(expressions, environment, moduleKey, depth, {
      maxSpreadIterations: this.policy.guardrails.maxLoopIterations,
      evaluateExpressionEvidence: (expression, currentEnvironment, currentModuleKey, currentDepth) =>
        this.evaluateExpressionEvidence(expression, currentEnvironment, currentModuleKey, currentDepth),
      openSpread: (reason, node, currentModuleKey) => {
        const checkpoint = this.causalOpenSeams.length;
        this.open(
          EvaluationOpenSeamKind.DynamicCall,
          reason,
          node,
          currentModuleKey,
          [OpenSeamReasonKind.StaticEvaluationDynamicCall],
        );
        return this.consumeOpenSeamsSince(checkpoint);
      },
    });
  }

  private exactInvocationArguments(
    frame: StaticInvocationFrame,
    openReason: string,
  ): { readonly kind: 'known'; readonly values: readonly EvaluationValueEvidence[] }
    | { readonly kind: 'open'; readonly value: EvaluationUnknownValue } {
    const values = frame.argumentList.exactEvidence();
    if (values != null) {
      return { kind: 'known', values };
    }
    const openSeams = frame.argumentList.shape.aggregateOpenSeams;
    if (openSeams.length > 0) {
      return { kind: 'open', value: new EvaluationUnknownValue(openReason, frame.node, true) };
    }
    return {
      kind: 'open',
      value: this.unknown(openReason, frame.node, frame.moduleKey, EvaluationOpenSeamKind.DynamicCall),
    };
  }

  private evaluateExpressionEvidence(
    expression: ts.Expression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValueEvidence {
    const checkpoint = this.causalOpenSeams.length;
    const value = this.evaluateExpression(expression, environment, moduleKey, depth);
    return evaluationValueEvidence(value, this.consumeOpenSeamsSince(checkpoint));
  }

  private evaluateExternallyOwnedInputs(
    expression: ts.Expression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): void {
    const current = skipStaticOuterExpression(expression);
    if (ts.isCallExpression(current)) {
      this.evaluateExternallyOwnedCalleeInputs(current.expression, environment, moduleKey, depth + 1);
      this.evaluateArguments(current.arguments, environment, moduleKey, depth + 1);
      return;
    }
    if (ts.isNewExpression(current)) {
      this.evaluateArguments(current.arguments ?? [], environment, moduleKey, depth + 1);
      return;
    }
    if (ts.isBinaryExpression(current) && current.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      this.evaluateExpression(current.right, environment, moduleKey, depth + 1);
    }
  }

  private evaluateExternallyOwnedCalleeInputs(
    expression: ts.Expression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): void {
    const current = skipStaticOuterExpression(expression);
    if (ts.isCallExpression(current)) {
      this.evaluateExternallyOwnedCalleeInputs(current.expression, environment, moduleKey, depth + 1);
      this.evaluateArguments(current.arguments, environment, moduleKey, depth + 1);
      return;
    }
    if (ts.isNewExpression(current)) {
      this.evaluateArguments(current.arguments ?? [], environment, moduleKey, depth + 1);
      return;
    }
    if (ts.isPropertyAccessExpression(current)) {
      this.evaluateExternallyOwnedCalleeInputs(current.expression, environment, moduleKey, depth + 1);
      return;
    }
    if (ts.isElementAccessExpression(current)) {
      this.evaluateExternallyOwnedCalleeInputs(current.expression, environment, moduleKey, depth + 1);
      if (current.argumentExpression != null) {
        this.evaluateExpression(current.argumentExpression, environment, moduleKey, depth + 1);
      }
    }
  }

  private intrinsicHost(): StaticIntrinsicEvaluationHost {
    return {
      guardrails: this.policy.guardrails,
      raise: (completion) => this.raise(new ThrowEvaluationCompletion(
        this.adoptExternalValue(completion.value),
        completion.openSeams,
      )),
      evaluateExpression: (expression, currentEnvironment, currentModuleKey, currentDepth) => {
        this.runtimeHost.evaluationValueGraph?.retainEnvironment(currentEnvironment);
        return this.evaluateExpression(expression, currentEnvironment, currentModuleKey, currentDepth);
      },
      evaluateExpressionEvidence: (expression, currentEnvironment, currentModuleKey, currentDepth) => {
        this.runtimeHost.evaluationValueGraph?.retainEnvironment(currentEnvironment);
        return this.evaluateExpressionEvidence(expression, currentEnvironment, currentModuleKey, currentDepth);
      },
      evaluateFunctionWithArguments: (callee, currentCall, argumentValues, currentModuleKey, currentDepth, thisValue) =>
        this.ownProducedValue(this.evaluateFunctionWithArguments(
          this.adoptExternalValue(callee),
          currentCall,
          argumentValues.map((evidence) => this.adoptExternalEvidence(evidence)),
          currentModuleKey,
          currentDepth,
          thisValue == null ? null : this.adoptExternalEvidence(thisValue),
        )),
      evaluateClassInstantiation: (callee, expression, argumentValues, currentModuleKey, currentDepth) =>
        this.ownProducedValue(this.evaluateClassInstantiation(
          this.adoptExternalValue(callee),
          expression,
          argumentValues.map((evidence) => this.adoptExternalEvidence(evidence)),
          currentModuleKey,
          currentDepth,
        )),
      open: (seamKind, summary, node, currentModuleKey, reasonKinds) =>
        this.open(seamKind, summary, node, currentModuleKey, reasonKinds),
      unknown: (reason, node, currentModuleKey, seamKind) =>
        this.unknown(reason, node, currentModuleKey, seamKind),
      checkpoint: () => ({
        auditOpenSeamCount: this.auditOpenSeams.length,
        openSeamCount: this.causalOpenSeams.length,
        invocationCount: this.invocationEvaluations.length,
        nextInvocationOrdinal: this.nextInvocationOrdinal,
        statementCount: this.statementCount,
      }),
      restore: (checkpoint) => {
        this.restoreEvaluationCheckpoint(checkpoint);
      },
      openSeamsSince: (checkpoint) => this.openSeamsSince(checkpoint.openSeamCount),
      consumeOpenSeamsSince: (checkpoint) => this.consumeOpenSeamsSince(checkpoint.openSeamCount),
      replayOpenSeams: (openSeams) => this.replayOpenSeams(openSeams),
      resolveCommonJsRequire: (currentModuleKey, moduleSpecifier, node) => {
        const result = this.runtimeHost.resolveCommonJsRequire?.(currentModuleKey, moduleSpecifier, node) ?? null;
        if (result != null) {
          this.replayOpenSeams(result.openSeams);
        }
        return result?.abruptCompletion == null
          ? result?.value == null ? null : this.adoptExternalValue(result.value)
          : this.raise(new ThrowEvaluationCompletion(
              this.adoptExternalValue(result.abruptCompletion.value),
              result.abruptCompletion.openSeams,
            ));
      },
      resolveDynamicImport: (currentModuleKey, moduleSpecifier, node) =>
        this.adoptNullableExternalValue(
          this.runtimeHost.resolveDynamicImport?.(currentModuleKey, moduleSpecifier, node) ?? null,
        ),
    };
  }

  private adoptNullableExternalValue<TValue extends EvaluationValue>(value: TValue | null): TValue | null {
    return value == null ? null : this.adoptExternalValue(value);
  }

  private raise(completion: EvaluationExpressionAbruptCompletion): never {
    throw new EvaluationAbruptCompletionSignal(completion);
  }

  private evaluateFunctionWithArguments(
    callee: EvaluationFunctionValue,
    call: ts.Node,
    argumentValues: readonly EvaluationValueEvidence[],
    moduleKey: string,
    depth: number,
    thisValue: EvaluationValueEvidence | null,
  ): EvaluationValue {
    return evaluateStaticFunctionWithArguments(
      callee,
      call,
      argumentValues,
      moduleKey,
      depth,
      this.functionHost,
      thisValue,
    );
  }

  private evaluateTemplateExpression(
    expression: ts.TemplateExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const builder = new EvaluationStringPatternBuilder(expression.head.text);
    for (const span of expression.templateSpans) {
      const value = this.evaluateExpression(span.expression, environment, moduleKey, depth + 1);
      if (value.kind === EvaluationValueKind.Unknown) {
        return this.materializeUnknownUse(value, span.expression, moduleKey, 'Template expression span depended on an open value.', EvaluationOpenSeamKind.UnsupportedExpression);
      }
      if (!appendEvaluationStringLikePart(builder, value, span.literal.text)) {
        return this.unknown('Template expression span did not reduce to a primitive value.', span.expression, moduleKey, EvaluationOpenSeamKind.UnsupportedExpression);
      }
    }
    return builder.build(expression);
  }

  private evaluateBinaryExpression(
    expression: ts.BinaryExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    if (isAssignmentOperator(expression.operatorToken.kind)) {
      return this.applyAssignment(expression, environment, moduleKey, depth + 1);
    }
    if (expression.operatorToken.kind === ts.SyntaxKind.CommaToken) {
      this.evaluateExpression(expression.left, environment, moduleKey, depth + 1);
      return this.evaluateExpression(expression.right, environment, moduleKey, depth + 1);
    }
    if (
      expression.operatorToken.kind === ts.SyntaxKind.BarBarToken
      || expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
      || expression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
    ) {
      return this.evaluateChoiceExpression(expression, environment, moduleKey, depth + 1);
    }

    const left = this.evaluateExpression(expression.left, environment, moduleKey, depth + 1);
    const right = this.evaluateExpression(expression.right, environment, moduleKey, depth + 1);
    if (left.kind === EvaluationValueKind.Unknown) {
      return this.materializeUnknownUse(left, expression, moduleKey, 'Binary expression depended on an open left operand.', EvaluationOpenSeamKind.UnsupportedExpression);
    }
    if (right.kind === EvaluationValueKind.Unknown) {
      return this.materializeUnknownUse(right, expression, moduleKey, 'Binary expression depended on an open right operand.', EvaluationOpenSeamKind.UnsupportedExpression);
    }
    if (expression.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const pattern = evaluationStringPatternFromConcatenation(left, right, expression);
      if (pattern != null) {
        return pattern;
      }
    }
    if (left.kind === EvaluationValueKind.BoundaryValue || right.kind === EvaluationValueKind.BoundaryValue) {
      return boundaryDependencyValue(expression, left, right);
    }
    return evaluateStaticBinaryOperator(expression.operatorToken.kind, left, right, expression)
      ?? this.unknown(`Binary operator ${staticTokenName(expression.operatorToken.kind)} did not close over known operands.`, expression, moduleKey, EvaluationOpenSeamKind.UnsupportedExpression);
  }

  private evaluateChoiceExpression(
    expression: ts.BinaryExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const left = this.evaluateExpression(expression.left, environment, moduleKey, depth + 1);
    if (left.kind === EvaluationValueKind.Unknown) {
      return this.materializeUnknownUse(left, expression, moduleKey, 'Short-circuit expression depended on an open left operand.', EvaluationOpenSeamKind.DynamicBranch);
    }
    if (left.kind === EvaluationValueKind.BoundaryValue) {
      this.openPathBoundary(
        'Short-circuit expression depended on a boundary left operand.',
        expression.left,
        moduleKey,
        left,
      );
      return boundaryDependencyValue(expression, left);
    }
    if (expression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
      if (left.kind === EvaluationValueKind.Null || left.kind === EvaluationValueKind.Undefined) {
        return this.evaluateExpression(expression.right, environment, moduleKey, depth + 1);
      }
      return left;
    } else {
      const truthy = readEvaluationTruthiness(left);
      if (truthy != null) {
        return expression.operatorToken.kind === ts.SyntaxKind.BarBarToken
          ? truthy ? left : this.evaluateExpression(expression.right, environment, moduleKey, depth + 1)
          : truthy ? this.evaluateExpression(expression.right, environment, moduleKey, depth + 1) : left;
      }
    }
    return this.unknown('Short-circuit expression did not reduce to a known branch.', expression, moduleKey, EvaluationOpenSeamKind.DynamicBranch);
  }

  private evaluatePrefixUnaryExpression(
    expression: ts.PrefixUnaryExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    if (
      expression.operator === ts.SyntaxKind.PlusPlusToken
      || expression.operator === ts.SyntaxKind.MinusMinusToken
    ) {
      return this.applyUpdateExpression(expression.operand, expression, environment, moduleKey, depth + 1, expression.operator, true);
    }
    const operand = this.evaluateExpression(expression.operand, environment, moduleKey, depth + 1);
    if (operand.kind === EvaluationValueKind.Unknown) {
      return this.materializeUnknownUse(operand, expression, moduleKey, 'Unary expression depended on an open operand.', EvaluationOpenSeamKind.UnsupportedExpression);
    }
    if (operand.kind === EvaluationValueKind.BoundaryValue) {
      return boundaryDependencyValue(expression, operand);
    }
    const operation = staticUnaryOperationForToken(expression.operator);
    if (operation == null) {
      return this.unknown(`Unary operator ${staticTokenName(expression.operator)} is not evaluated.`, expression, moduleKey, EvaluationOpenSeamKind.UnsupportedExpression);
    }
    return evaluateStaticUnaryOperation(operation, operand, expression)
      ?? this.unknown(`Unary operator ${staticTokenName(expression.operator)} did not reduce over a known operand.`, expression, moduleKey, EvaluationOpenSeamKind.UnsupportedExpression);
  }

  private evaluatePostfixUnaryExpression(
    expression: ts.PostfixUnaryExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    return this.applyUpdateExpression(expression.operand, expression, environment, moduleKey, depth + 1, expression.operator, false);
  }

  private evaluateTypeOfExpression(
    expression: ts.TypeOfExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const operandExpression = skipStaticOuterExpression(expression.expression);
    const operand = ts.isIdentifier(operandExpression)
      ? this.evaluateTypeOfIdentifier(operandExpression, environment, moduleKey)
      : this.evaluateExpression(operandExpression, environment, moduleKey, depth + 1);
    if (operand.kind === EvaluationValueKind.Unknown) {
      return this.materializeUnknownUse(
        operand,
        expression,
        moduleKey,
        'typeof depended on an open value.',
        EvaluationOpenSeamKind.UnsupportedExpression,
      );
    }
    const value = evaluateStaticUnaryOperation('typeof', operand, expression);
    if (value != null) {
      return value;
    }
    if (operand.kind === EvaluationValueKind.BoundaryValue) {
      return new EvaluationUnknownValue(`typeof ${operand.path} depends on host environment state.`, expression, true);
    }
    return this.unknown('typeof operand did not reduce to a modeled value.', expression, moduleKey, EvaluationOpenSeamKind.UnsupportedExpression);
  }

  private evaluateTypeOfIdentifier(
    identifier: ts.Identifier,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
  ): EvaluationValue {
    if (identifier.text === 'undefined') {
      return EvaluationUndefined;
    }
    const value = environment.readValue(identifier.text)
      ?? this.runtimeHost.resolveIdentifier?.(identifier, environment, moduleKey)
      ?? evaluateAureliaExpressionGlobalAccess(identifier.text, identifier)
      ?? null;
    return value ?? EvaluationUndefined;
  }

  private evaluateVoidExpression(
    expression: ts.VoidExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const operand = this.evaluateExpression(expression.expression, environment, moduleKey, depth + 1);
    if (operand.kind === EvaluationValueKind.Unknown && !operand.hasOpenSeam) {
      this.materializeUnknownUse(
        operand,
        expression,
        moduleKey,
        'void expression depended on an open operand.',
        EvaluationOpenSeamKind.UnsupportedExpression,
      );
    }
    return evaluateStaticUnaryOperation('void', operand, expression) ?? new EvaluationUndefinedValue(expression);
  }

  private evaluateConditionalExpression(
    expression: ts.ConditionalExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const condition = this.evaluateExpression(expression.condition, environment, moduleKey, depth + 1);
    if (condition.kind === EvaluationValueKind.Unknown) {
      return this.materializeUnknownUse(condition, expression.condition, moduleKey, 'Conditional expression depended on an open condition.', EvaluationOpenSeamKind.DynamicBranch);
    }
    if (condition.kind === EvaluationValueKind.BoundaryValue) {
      if (this.policy.branchMode === StaticEvaluationBranchMode.PathProvenEffects) {
        this.openPathBoundary(
          'Conditional expression depended on a boundary condition.',
          expression.condition,
          moduleKey,
          condition,
        );
        return boundaryDependencyValue(expression, condition);
      }
      return this.evaluateConditionalBranchRepresentative(expression, condition, environment, moduleKey, depth + 1)
        ?? boundaryDependencyValue(expression, condition);
    }
    const truthy = readEvaluationTruthiness(condition);
    if (truthy == null) {
      if (this.policy.branchMode === StaticEvaluationBranchMode.PathProvenEffects) {
        return this.unknown(
          'Conditional expression condition did not reduce to one effect-safe branch.',
          expression.condition,
          moduleKey,
          EvaluationOpenSeamKind.DynamicBranch,
        );
      }
      return this.evaluateConditionalBranchRepresentative(expression, condition, environment, moduleKey, depth + 1)
        ?? this.unknown('Conditional expression condition did not reduce to known truthiness.', expression.condition, moduleKey, EvaluationOpenSeamKind.DynamicBranch);
    }
    return this.evaluateExpression(truthy ? expression.whenTrue : expression.whenFalse, environment, moduleKey, depth + 1);
  }

  private openPathBoundary(
    summary: string,
    node: ts.Node,
    moduleKey: string,
    boundary: EvaluationBoundaryValue,
  ): void {
    if (this.policy.branchMode !== StaticEvaluationBranchMode.PathProvenEffects) {
      return;
    }
    this.open(
      EvaluationOpenSeamKind.DynamicBranch,
      summary,
      node,
      moduleKey,
      [openSeamReasonKindForEvaluationBoundary(boundary.boundaryKind)],
    );
  }

  private evaluateConditionalBranchRepresentative(
    expression: ts.ConditionalExpression,
    condition: EvaluationValue,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue | null {
    const checkpoint = this.pressureCheckpoint();
    const invocationStart = this.invocationEvaluations.length;
    const statementStart = this.statementCount;
    const whenTrue = this.evaluateExpression(expression.whenTrue, environment, moduleKey, depth + 1);
    const whenFalse = this.evaluateExpression(expression.whenFalse, environment, moduleKey, depth + 1);
    const representative = whenTrue.kind === EvaluationValueKind.Unknown || whenFalse.kind === EvaluationValueKind.Unknown
      ? null
      : representativeEvaluationValues(
          [whenTrue, whenFalse],
          `conditional.${expression.getStart(expression.getSourceFile())}`,
          condition.kind === EvaluationValueKind.BoundaryValue ? condition.path : null,
          condition.kind === EvaluationValueKind.BoundaryValue ? condition.boundaryKind : null,
        );
    if (representative == null) {
      this.restorePressureCheckpoint(checkpoint);
      this.invocationEvaluations.splice(invocationStart);
      this.nextInvocationOrdinal = checkpoint.nextInvocationOrdinal;
      this.statementCount = statementStart;
      return null;
    }
    this.restorePressureCheckpoint(checkpoint);
    this.invocationEvaluations.splice(invocationStart);
    this.nextInvocationOrdinal = checkpoint.nextInvocationOrdinal;
    return representative;
  }

  private applyAssignment(
    expression: ts.BinaryExpression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const checkpoint = this.causalOpenSeams.length;
    const left = skipStaticOuterExpression(expression.left);
    const value = expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
      ? this.evaluateExpression(expression.right, environment, moduleKey, depth + 1)
      : this.evaluateCompoundAssignmentValue(expression, left, environment, moduleKey, depth + 1);
    const evidence = evaluationValueEvidence(value, this.consumeOpenSeamsSince(checkpoint));
    this.writeAssignmentTarget(left, evidence, environment, moduleKey, depth + 1, expression);
    this.replayOpenSeams(evidence.openSeams);
    return value;
  }

  private evaluateCompoundAssignmentValue(
    expression: ts.BinaryExpression,
    left: ts.Expression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): EvaluationValue {
    const operator = compoundAssignmentBinaryOperator(expression.operatorToken.kind);
    if (operator == null) {
      return this.unknown(
        `Compound assignment ${staticTokenName(expression.operatorToken.kind)} is not reduced by this evaluator slice.`,
        expression,
        moduleKey,
        EvaluationOpenSeamKind.DynamicMutation,
        [OpenSeamReasonKind.StaticEvaluationUnsupportedCompoundAssignment],
      );
    }
    const current = this.readAssignmentTarget(left, environment, moduleKey, depth + 1, expression);
    const right = this.evaluateExpression(expression.right, environment, moduleKey, depth + 1);
    if (current.kind === EvaluationValueKind.Unknown) {
      return this.materializeUnknownUse(current, left, moduleKey, 'Compound assignment depended on an open target value.', EvaluationOpenSeamKind.DynamicMutation);
    }
    if (right.kind === EvaluationValueKind.Unknown) {
      return this.materializeUnknownUse(right, expression.right, moduleKey, 'Compound assignment depended on an open right value.', EvaluationOpenSeamKind.DynamicMutation);
    }
    if (current.kind === EvaluationValueKind.BoundaryValue || right.kind === EvaluationValueKind.BoundaryValue) {
      return boundaryDependencyValue(expression, current, right);
    }
    return evaluateStaticBinaryOperator(operator, current, right, expression)
      ?? this.unknown(
        `Compound assignment ${staticTokenName(expression.operatorToken.kind)} did not reduce over known operands.`,
        expression,
        moduleKey,
        EvaluationOpenSeamKind.DynamicMutation,
      );
  }

  private applyUpdateExpression(
    target: ts.Expression,
    expression: ts.Expression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
    operator: ts.PostfixUnaryOperator | ts.PrefixUnaryOperator,
    prefix: boolean,
  ): EvaluationValue {
    const left = skipStaticOuterExpression(target);
    const current = this.readAssignmentTarget(left, environment, moduleKey, depth + 1, expression);
    if (current.kind === EvaluationValueKind.Unknown) {
      return this.materializeUnknownUse(current, target, moduleKey, 'Update expression depended on an open target value.', EvaluationOpenSeamKind.DynamicMutation);
    }
    if (current.kind === EvaluationValueKind.BoundaryValue) {
      return boundaryDependencyValue(expression, current);
    }
    if (current.kind !== EvaluationValueKind.Number) {
      return this.unknown(
        `Update expression ${staticTokenName(operator)} did not reduce over a known number.`,
        expression,
        moduleKey,
        EvaluationOpenSeamKind.DynamicMutation,
      );
    }
    const delta = operator === ts.SyntaxKind.PlusPlusToken ? 1 : -1;
    const next = new EvaluationNumberValue(current.value + delta, expression);
    this.writeAssignmentTarget(
      left,
      new EvaluationValueEvidence(next, []),
      environment,
      moduleKey,
      depth + 1,
      expression,
    );
    return prefix ? next : current;
  }

  private readAssignmentTarget(
    target: ts.Expression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
    node: ts.Node,
  ): EvaluationValue {
    if (ts.isIdentifier(target)) {
      return this.evaluateIdentifier(target, environment, moduleKey);
    }
    if (ts.isPropertyAccessExpression(target)) {
      const receiver = this.evaluateExpression(target.expression, environment, moduleKey, depth + 1);
      if (receiver.kind === EvaluationValueKind.Unknown) {
        return this.materializeUnknownUse(receiver, target.expression, moduleKey, 'Assignment target property depended on an open receiver.', EvaluationOpenSeamKind.DynamicMutation);
      }
      if (receiver.kind === EvaluationValueKind.BoundaryValue) {
        return boundaryDependencyValue(node, receiver);
      }
      return evaluateStaticPropertyValue(receiver, target.name.text, target, moduleKey, depth + 1, this.propertyAccessHost);
    }
    if (ts.isElementAccessExpression(target)) {
      const receiver = this.evaluateExpression(target.expression, environment, moduleKey, depth + 1);
      const argument = target.argumentExpression == null
        ? null
        : this.evaluateExpression(target.argumentExpression, environment, moduleKey, depth + 1);
      if (receiver.kind === EvaluationValueKind.Unknown) {
        return this.materializeUnknownUse(receiver, target.expression, moduleKey, 'Assignment target element depended on an open receiver.', EvaluationOpenSeamKind.DynamicMutation);
      }
      if (argument?.kind === EvaluationValueKind.Unknown) {
        return this.materializeUnknownUse(argument, target.argumentExpression ?? target, moduleKey, 'Assignment target element depended on an open key.', EvaluationOpenSeamKind.DynamicMutation);
      }
      if (receiver.kind === EvaluationValueKind.BoundaryValue || argument?.kind === EvaluationValueKind.BoundaryValue) {
        return boundaryDependencyValue(node, receiver, argument ?? EvaluationUndefined);
      }
      if (argument == null) {
        return this.unknown('Assignment target element had no argument expression.', target, moduleKey, EvaluationOpenSeamKind.DynamicMutation);
      }
      return evaluateStaticElementValue(receiver, argument, target, moduleKey, depth + 1, this.propertyAccessHost);
    }
    return this.unknown('Assignment target is not a supported identifier or object property.', target, moduleKey, EvaluationOpenSeamKind.DynamicMutation);
  }

  private writeAssignmentTarget(
    target: ts.Expression,
    evidence: EvaluationValueEvidence,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
    node: ts.Node,
  ): void {
    const value = evidence.value;
    if (ts.isIdentifier(target)) {
      if (!environment.setBinding(target.text, value, evidence.openSeams)) {
        this.open(EvaluationOpenSeamKind.DynamicMutation, `Assignment target '${target.text}' is not a known mutable binding.`, target, moduleKey);
      }
      return;
    }
    if (ts.isPropertyAccessExpression(target)) {
      const receiver = this.evaluateExpression(target.expression, environment, moduleKey, depth + 1);
      if (writeStaticOwnProperty(receiver, target.name.text, value, node, evidence.openSeams) || receiver.kind === EvaluationValueKind.BoundaryValue) {
        return;
      }
      if (receiver.kind === EvaluationValueKind.Unknown) {
        this.materializeUnknownUse(receiver, target.expression, moduleKey, 'Property assignment depended on an open receiver.', EvaluationOpenSeamKind.DynamicMutation);
        return;
      }
      this.open(EvaluationOpenSeamKind.DynamicMutation, 'Assignment target is not a supported object property.', target, moduleKey);
      return;
    }
    if (ts.isElementAccessExpression(target)) {
      const receiver = this.evaluateExpression(target.expression, environment, moduleKey, depth + 1);
      const argument = target.argumentExpression == null
        ? null
        : this.evaluateExpression(target.argumentExpression, environment, moduleKey, depth + 1);
      if (receiver.kind === EvaluationValueKind.BoundaryValue || argument?.kind === EvaluationValueKind.BoundaryValue) {
        return;
      }
      const name = argument == null ? null : evaluationPropertyKeyString(argument);
      if (name != null) {
        if (writeStaticOwnProperty(receiver, name, value, node, evidence.openSeams)) {
          return;
        }
      }
      if (receiver.kind === EvaluationValueKind.Object || receiver.kind === EvaluationValueKind.Instance) {
        const checkpoint = this.causalOpenSeams.length;
        this.open(
          EvaluationOpenSeamKind.DynamicMutation,
          'Element assignment key did not close to a known property name.',
          target,
          moduleKey,
        );
        const pressure = this.consumeOpenSeamsSince(checkpoint);
        receiver.mayHaveUnknownProperties = true;
        receiver.retainShapeOpenSeams(pressure);
        openEvaluationObjectProperties(receiver.properties, pressure);
        this.replayOpenSeams(pressure);
        return;
      }
      this.open(EvaluationOpenSeamKind.DynamicMutation, 'Element assignment target is not a supported object property.', target, moduleKey);
      return;
    }
    this.open(EvaluationOpenSeamKind.DynamicMutation, 'Assignment target is not a supported identifier or object property.', target, moduleKey);
  }

  private unsupportedStatement(
    statement: ts.Statement,
    moduleKey: string,
    summary: string,
    reasonKinds: readonly OpenSeamReasonKind[] = [],
  ): EvaluationCompletion {
    this.open(EvaluationOpenSeamKind.UnsupportedStatement, summary, statement, moduleKey, reasonKinds);
    return new NormalEvaluationCompletion();
  }

  private unknown(
    reason: string,
    node: ts.Node,
    moduleKey: string,
    seamKind: EvaluationOpenSeamKind,
    reasonKinds: readonly OpenSeamReasonKind[] = [],
  ): EvaluationUnknownValue {
    this.open(seamKind, reason, node, moduleKey, reasonKinds);
    return new EvaluationUnknownValue(reason, node, true);
  }

  private materializeUnknownUse(
    value: EvaluationUnknownValue,
    node: ts.Node,
    moduleKey: string,
    summary: string,
    seamKind: EvaluationOpenSeamKind,
    reasonKinds: readonly OpenSeamReasonKind[] = [],
  ): EvaluationUnknownValue {
    if (!value.hasOpenSeam) {
      return this.unknown(summary, node, moduleKey, seamKind, reasonKinds);
    }
    return value.retainedCandidate == null
      ? value
      : new EvaluationUnknownValue(value.reason, value.node, true);
  }

  private open(
    seamKind: EvaluationOpenSeamKind,
    summary: string,
    node: ts.Node,
    moduleKey: string,
    reasonKinds: readonly OpenSeamReasonKind[] = [],
  ): void {
    const seam = new EvaluationOpenSeam(
      seamKind,
      summary,
      node,
      moduleKey,
      compactEvaluationOpenSeamReasonKinds([
        ...evaluationOpenSeamDefaultReasonKinds(seamKind),
        ...reasonKinds,
      ]),
    );
    this.auditOpenSeams.push(seam);
    this.auditedOpenSeams.add(seam);
    this.causalOpenSeams.push(seam);
  }

  private openSeamsSince(checkpoint: number): readonly EvaluationOpenSeam[] {
    return compactEvaluationOpenSeams(this.causalOpenSeams.slice(checkpoint));
  }

  private consumeOpenSeamsSince(checkpoint: number): readonly EvaluationOpenSeam[] {
    const openSeams = this.openSeamsSince(checkpoint);
    this.causalOpenSeams.splice(checkpoint);
    return openSeams;
  }

  private replayOpenSeams(openSeams: readonly EvaluationOpenSeam[]): void {
    for (const seam of openSeams) {
      if (!this.auditedOpenSeams.has(seam)) {
        this.auditOpenSeams.push(seam);
        this.auditedOpenSeams.add(seam);
      }
    }
    this.causalOpenSeams.push(...openSeams);
  }

  /** Rejoin evidence consumed from this evaluator without publishing the same observation twice. */
  private restoreConsumedOpenSeams(openSeams: readonly EvaluationOpenSeam[]): void {
    this.causalOpenSeams.push(...compactEvaluationOpenSeams(openSeams));
  }

  private materializeOptionalExpressionFlow(
    flow: StaticExpressionFlow,
    node: ts.Node,
  ): StaticExpressionValueFlow {
    if (flow.kind === StaticExpressionFlowKind.Value) {
      return flow;
    }
    this.restoreConsumedOpenSeams(flow.openSeams);
    return staticExpressionValue(
      flow.kind === StaticExpressionFlowKind.OptionalShortCircuit
        ? new EvaluationUndefinedValue(node)
        : new EvaluationUnknownValue(
            'Optional chain nullish selection retained open evaluation pressure.',
            node,
            true,
          ),
    );
  }

  private pressureCheckpoint(): StaticIntrinsicEvaluationCheckpoint {
    return {
      auditOpenSeamCount: this.auditOpenSeams.length,
      openSeamCount: this.causalOpenSeams.length,
      invocationCount: this.invocationEvaluations.length,
      nextInvocationOrdinal: this.nextInvocationOrdinal,
      statementCount: this.statementCount,
    };
  }

  private restoreEvaluationCheckpoint(checkpoint: StaticIntrinsicEvaluationCheckpoint): void {
    this.restorePressureCheckpoint(checkpoint);
    this.invocationEvaluations.splice(checkpoint.invocationCount);
    this.nextInvocationOrdinal = checkpoint.nextInvocationOrdinal;
    this.statementCount = checkpoint.statementCount;
  }

  private orderedInvocationEvaluationsSince(index: number): readonly StaticInvocationEvaluation[] {
    return this.invocationEvaluations.slice(index).sort((left, right) => left.ordinal - right.ordinal);
  }

  private restorePressureCheckpoint(checkpoint: StaticIntrinsicEvaluationCheckpoint): void {
    for (const seam of this.auditOpenSeams.splice(checkpoint.auditOpenSeamCount)) {
      this.auditedOpenSeams.delete(seam);
    }
    this.causalOpenSeams.splice(checkpoint.openSeamCount);
  }

  private exceededStatementCount(statement: ts.Statement, moduleKey: string): boolean {
    this.statementCount++;
    if (this.statementCount <= this.policy.guardrails.maxStatements) {
      return false;
    }
    this.open(EvaluationOpenSeamKind.StatementLimit, 'Statement evaluation limit reached.', statement, moduleKey);
    return true;
  }

  private syntaxKindName(node: ts.Node): string {
    return ts.SyntaxKind[node.kind] ?? String(node.kind);
  }

  private readPropertyName(
    name: ts.PropertyName,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    depth: number,
  ): string | null {
    if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) {
      return name.text;
    }
    if (ts.isNumericLiteral(name)) {
      return name.text;
    }
    if (ts.isComputedPropertyName(name)) {
      const evidence = this.evaluateExpressionEvidence(name.expression, environment, moduleKey, depth + 1);
      if (evidence.openSeams.length > 0) {
        this.replayOpenSeams(evidence.openSeams);
        return null;
      }
      const propertyKey = evaluationPropertyKeyString(evidence.value);
      if (propertyKey != null) {
        return propertyKey;
      }
      this.open(EvaluationOpenSeamKind.UnsupportedExpression, 'Computed property name did not reduce to a primitive property key.', name, moduleKey);
    }
    return null;
  }
}

function staticExpressionValue(
  value: EvaluationValue,
): StaticExpressionValueFlow {
  return { kind: StaticExpressionFlowKind.Value, value };
}

function staticOptionalShortCircuit(
  openSeams: readonly EvaluationOpenSeam[],
): StaticExpressionOptionalShortCircuit {
  return {
    kind: StaticExpressionFlowKind.OptionalShortCircuit,
    openSeams: compactEvaluationOpenSeams(openSeams),
  };
}

function staticOptionalIndeterminate(
  openSeams: readonly EvaluationOpenSeam[],
): StaticExpressionOptionalIndeterminate {
  return {
    kind: StaticExpressionFlowKind.OptionalIndeterminate,
    openSeams: compactEvaluationOpenSeams(openSeams),
  };
}

function optionalChainSelection(
  value: EvaluationValue,
  openSeams: readonly EvaluationOpenSeam[],
): StaticExpressionOptionalFlow | null {
  if (openSeams.length > 0) {
    return staticOptionalIndeterminate(openSeams);
  }
  return isNullishEvaluationValue(value)
    ? staticOptionalShortCircuit([])
    : null;
}

function staticInvocationTarget(
  callee: EvaluationValueEvidence,
  thisValue: EvaluationValueEvidence | null,
  propertyKey: string | null,
  receiverNode: ts.Expression | null = null,
  propertyKeyNode: ts.Node | null = null,
  propertyKeyEvidence: EvaluationValueEvidence | null = null,
): StaticInvocationTarget {
  return {
    kind: StaticExpressionFlowKind.Value,
    callee,
    receiverNode,
    thisValue,
    propertyKeyNode,
    propertyKey,
    propertyKeyEvidence,
  };
}

function invocationTargetOpenSeams(
  target: StaticInvocationTarget,
): readonly EvaluationOpenSeam[] {
  return compactEvaluationOpenSeams([
    ...target.callee.openSeams,
    ...(target.thisValue?.openSeams ?? []),
  ]);
}

function isOptionalChainNode(node: ts.Node): boolean {
  return (node.flags & ts.NodeFlags.OptionalChain) !== 0;
}

function invocationBoundaryPath(
  value: EvaluationValue,
): string | null {
  return value.kind === EvaluationValueKind.BoundaryValue
    || value.kind === EvaluationValueKind.BoundaryObject
    ? value.path
    : null;
}

function compactEvaluationOpenSeamReasonKinds(
  values: readonly OpenSeamReasonKind[],
): readonly OpenSeamReasonKind[] {
  return [...new Set(values)];
}

/** Remove syntactic wrappers that do not affect static value interpretation. */
export function skipStaticOuterExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isAsExpression(current)
    || ts.isTypeAssertionExpression(current)
    || ts.isParenthesizedExpression(current)
    || ts.isNonNullExpression(current)
    || ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function declarationListBindingKind(list: ts.VariableDeclarationList): EvaluationBindingKind {
  if ((list.flags & ts.NodeFlags.Const) !== 0) {
    return EvaluationBindingKind.Const;
  }
  if ((list.flags & ts.NodeFlags.Let) !== 0) {
    return EvaluationBindingKind.Let;
  }
  return EvaluationBindingKind.Var;
}

function boundaryDependencyValue(
  node: ts.Node,
  ...values: readonly EvaluationValue[]
): EvaluationBoundaryValue {
  const paths = values
    .filter((value): value is EvaluationBoundaryValue | EvaluationBoundaryObjectValue =>
      value.kind === EvaluationValueKind.BoundaryValue
      || value.kind === EvaluationValueKind.BoundaryObject
    )
    .map((value) => value.path);
  const boundaryKind = values.find((value): value is EvaluationBoundaryValue | EvaluationBoundaryObjectValue =>
    value.kind === EvaluationValueKind.BoundaryValue
    || value.kind === EvaluationValueKind.BoundaryObject
  )?.boundaryKind;
  const path = paths.length === 0
    ? 'boundary expression'
    : paths.length === 1
      ? paths[0]!
      : `boundary expression depending on ${paths.join(', ')}`;
  return new EvaluationBoundaryValue(boundaryKind ?? EvaluationBoundaryKind.ExternalModule, path, node);
}

function compoundAssignmentBinaryOperator(
  operator: ts.SyntaxKind,
): ts.SyntaxKind | null {
  switch (operator) {
    case ts.SyntaxKind.PlusEqualsToken:
      return ts.SyntaxKind.PlusToken;
    case ts.SyntaxKind.MinusEqualsToken:
      return ts.SyntaxKind.MinusToken;
    case ts.SyntaxKind.AsteriskEqualsToken:
      return ts.SyntaxKind.AsteriskToken;
    case ts.SyntaxKind.SlashEqualsToken:
      return ts.SyntaxKind.SlashToken;
    case ts.SyntaxKind.PercentEqualsToken:
      return ts.SyntaxKind.PercentToken;
    case ts.SyntaxKind.AsteriskAsteriskEqualsToken:
      return ts.SyntaxKind.AsteriskAsteriskToken;
    default:
      return null;
  }
}
