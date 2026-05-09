import ts from "typescript";

import type { SourceRange } from "../inquiry/locus.js";
import {
  requiredSourceFileIdentity,
  readTypeScriptCallSiteEntry,
  readTypeScriptExpressionFact,
  resolveSourceSelector,
  isAssignmentOperator,
  localFunctionDeclarationForCall,
  propertyNameText,
  returnExpressions,
  sourceRangeFromFileSpan,
  sourceSpanForNode,
  unwrapExpression,
  type ResolvedSourceTarget,
  type SourceFileIdentity,
  type LocalFunctionDeclaration,
  type SourceProject,
  type SourceSelector,
  type SourceSelectorResolution,
  type SourceSpan,
  type TypeScriptCallSiteArgument,
  type TypeScriptCallSiteEntry,
  type TypeScriptExpressionFact,
} from "../source/index.js";
import { EvaluationOpenKind } from "./seam.js";

/** Execution certainty for an effect observed by static source tracing. */
export const enum EvaluationEffectCertainty {
  /** Effect appears in straight-line code for the selected root. */
  Unconditional = "unconditional",
  /** Effect appears behind a branch or callback boundary that this substrate does not execute. */
  Potential = "potential",
  /** Effect appears in loop-like syntax and may happen zero or more times. */
  Repeated = "repeated",
  /** Effect appears inside a callback argument whose invocation is deferred by the callee. */
  Deferred = "deferred",
}

/** Binding origin used when receiver/argument flow can be tracked lexically. */
export const enum EvaluationTraceBindingOrigin {
  /** Function or method parameter. */
  Parameter = "parameter",
  /** Parameter captured from an outer factory call into a returned method body. */
  CapturedParameter = "captured-parameter",
  /** Local alias of another known binding. */
  Alias = "alias",
  /** Local variable with a concrete initializer expression. */
  Variable = "variable",
  /** Loop variable bound to each element of an iterable binding. */
  Iteration = "iteration",
  /** Method receiver state through `this`. */
  This = "this",
}

/** One lexical binding that an invocation receiver or argument can point at. */
export interface EvaluationTraceBinding {
  /** Local binding name used in source. */
  readonly name: string;
  /** How the binding entered the trace scope. */
  readonly origin: EvaluationTraceBindingOrigin;
  /** Source file containing the binding declaration. */
  readonly file: SourceFileIdentity;
  /** Declaration/name span for the binding. */
  readonly span: SourceSpan;
  /** Checker fact for the binding name or initializer expression. */
  readonly expression: TypeScriptExpressionFact;
  /** Parameter index when this binding ultimately comes from a parameter. */
  readonly parameterIndex?: number;
  /** Previous binding name when this is a local alias. */
  readonly aliasOf?: string;
  /** Iterable binding name when this is a loop variable. */
  readonly iterableOf?: string;
  /** Argument expression text that supplied a captured parameter, when available. */
  readonly capturedFromArgument?: string;
}

/** Root function/method whose body was traced for effects. */
export interface EvaluationEffectRoot {
  /** Stable root id within the current source basis. */
  readonly id: string;
  /** Human-readable label for the traced root. */
  readonly label: string;
  /** Method/member name when the root came from a member body. */
  readonly memberName: string | null;
  /** Source file containing the root. */
  readonly file: SourceFileIdentity;
  /** Source span for the root declaration or body owner. */
  readonly span: SourceSpan;
  /** Parameter bindings that seeded the root trace. */
  readonly parameters: readonly EvaluationTraceBinding[];
  /** Closure bindings carried into this root from an outer factory/call shape. */
  readonly captures: readonly EvaluationTraceBinding[];
}

/** Argument flow row attached to one invocation effect. */
export interface EvaluationInvocationArgumentEffect extends TypeScriptCallSiteArgument {
  /** Lexical binding referenced by this argument, when it closes to one. */
  readonly binding: EvaluationTraceBinding | null;
}

/** One call/constructor invocation observed by static effect tracing. */
export interface EvaluationInvocationEffect {
  /** Stable effect id within the current source basis. */
  readonly id: string;
  /** Source-order sequence number within this trace read. */
  readonly sequence: number;
  /** Root body in which this invocation was observed. */
  readonly root: EvaluationEffectRoot;
  /** Static execution certainty for this source path. */
  readonly certainty: EvaluationEffectCertainty;
  /** Control-flow labels that led to this effect. */
  readonly controlPath: readonly string[];
  /** Exact checker-backed call-site row. */
  readonly callSite: TypeScriptCallSiteEntry;
  /** Member name when the callee is a member call such as `x.register(...)`. */
  readonly memberName: string | null;
  /** Receiver expression for member calls. */
  readonly receiver: TypeScriptExpressionFact | null;
  /** Lexical binding referenced by the receiver, when it closes to one. */
  readonly receiverBinding: EvaluationTraceBinding | null;
  /** Argument rows with lexical binding flow when available. */
  readonly arguments: readonly EvaluationInvocationArgumentEffect[];
}

/** Serializable evaluator seam produced by effect tracing. */
export interface EvaluationEffectOpenSeam {
  /** Stable seam id within the current source basis. */
  readonly id: string;
  /** Evaluator-local open kind. */
  readonly openKind: EvaluationOpenKind;
  /** Grounded explanation of the unsupported or unresolved pressure. */
  readonly summary: string;
  /** Source file containing the seam. */
  readonly file: SourceFileIdentity;
  /** Source span that exposed the seam. */
  readonly span: SourceSpan;
  /** TypeScript SyntaxKind display name for the seam node. */
  readonly syntaxKindName: string;
}

/** Options for static invocation/effect tracing. */
export interface EvaluationEffectTraceOptions {
  /** Maximum effect rows returned. */
  readonly limit: number;
  /** Zero-based effect offset. */
  readonly offset?: number;
  /** Optional member root to trace, such as `register`. */
  readonly memberName?: string;
  /** Optional callee/member filter for returned effects. */
  readonly calleeName?: string;
  /** Optional receiver binding/name filter for returned effects. */
  readonly receiverName?: string;
  /** Maximum nested syntax traversal depth. */
  readonly maxDepth?: number;
}

/** Bounded static invocation/effect trace over selected source roots. */
export interface EvaluationEffectTraceRead {
  /** Selector resolution used for this trace. */
  readonly resolution: SourceSelectorResolution;
  /** Root bodies selected for tracing before pagination. */
  readonly roots: readonly EvaluationEffectRoot[];
  /** Total effect rows before pagination. */
  readonly totalEffects: number;
  /** Effect rows in the requested page. */
  readonly effects: readonly EvaluationInvocationEffect[];
  /** Open seams produced while tracing selected roots. */
  readonly openSeams: readonly EvaluationEffectOpenSeam[];
  /** Effective offset used for this page. */
  readonly offset: number;
  /** Effective row limit used for this page. */
  readonly limit: number;
  /** Cursor for the next page, when more rows exist. */
  readonly nextOffset?: number;
}

type TraceFunctionLike =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration
  | ts.ConstructorDeclaration
  | ts.GetAccessorDeclaration
  | ts.SetAccessorDeclaration;

interface TraceRootCandidate {
  readonly sourceFile: ts.SourceFile;
  readonly node: TraceFunctionLike;
  readonly label: string;
  readonly memberName: string | null;
  readonly captures?: readonly EvaluationTraceBinding[];
}

interface TraceContext {
  readonly project: SourceProject;
  readonly sourceFile: ts.SourceFile;
  readonly root: EvaluationEffectRoot;
  readonly maxDepth: number;
  readonly effects: EvaluationInvocationEffect[];
  readonly openSeams: EvaluationEffectOpenSeam[];
  readonly callStack: string[];
  nextSequence: number;
}

class EvaluationTraceScope {
  readonly #bindings = new Map<string, EvaluationTraceBinding>();

  constructor(readonly parent: EvaluationTraceScope | null = null) {}

  set(binding: EvaluationTraceBinding): void {
    this.#bindings.set(binding.name, binding);
  }

  get(name: string): EvaluationTraceBinding | null {
    return this.#bindings.get(name) ?? this.parent?.get(name) ?? null;
  }

  fork(): EvaluationTraceScope {
    return new EvaluationTraceScope(this);
  }
}

/** Read static invocation/effect rows for selected source roots. */
export function readEvaluationEffectTrace(
  /** Hot source project that owns the current Program and TypeChecker. */
  project: SourceProject,
  /** Selector that roots effect tracing. */
  selector: SourceSelector,
  /** Trace filters and budgets. */
  options: EvaluationEffectTraceOptions,
): EvaluationEffectTraceRead {
  const resolution = resolveSourceSelector(project, selector);
  const candidates = uniqueRootCandidates(resolution.targets.flatMap((target) => rootCandidatesForTarget(project, target, options.memberName)));
  const roots = candidates.map((candidate) => effectRootForCandidate(project, candidate));
  const effects: EvaluationInvocationEffect[] = [];
  const openSeams: EvaluationEffectOpenSeam[] = [];
  let nextSequence = 0;

  for (const candidate of candidates) {
    const root = effectRootForCandidate(project, candidate);
    const context: TraceContext = {
      project,
      sourceFile: candidate.sourceFile,
      root,
      maxDepth: Math.max(1, Math.trunc(options.maxDepth ?? 80)),
      effects,
      openSeams,
      callStack: [],
      nextSequence,
    };
    const scope = scopeForRoot(project, candidate.sourceFile, root, candidate.node);
    traceFunctionBody(candidate.node, scope, context, EvaluationEffectCertainty.Unconditional, [], 0);
    nextSequence = context.nextSequence;
  }

  const filtered = effects
    .filter((effect) => options.calleeName === undefined || effect.callSite.calleeName === options.calleeName || effect.callSite.callee.symbolName === options.calleeName)
    .filter((effect) => options.receiverName === undefined || effect.receiverBinding?.name === options.receiverName || effect.receiver?.symbolName === options.receiverName || effect.receiver?.text === options.receiverName)
    .sort((left, right) => left.sequence - right.sequence);
  const offset = Math.max(0, Math.trunc(options.offset ?? 0));
  const limit = Math.max(1, Math.trunc(options.limit));
  const page = filtered.slice(offset, offset + limit);
  const nextOffset = offset + page.length < filtered.length ? offset + page.length : undefined;

  return {
    resolution: {
      ...resolution,
      targets: resolution.targets.map((target) => ({
        kind: target.kind,
        id: target.id,
        label: target.label,
        ...(target.file === undefined ? {} : { file: target.file }),
        ...(target.span === undefined ? {} : { span: target.span }),
        ...(target.declarationKind === undefined ? {} : { declarationKind: target.declarationKind }),
        ...(target.symbolKey === undefined ? {} : { symbolKey: target.symbolKey }),
      })),
    },
    roots,
    totalEffects: filtered.length,
    effects: page,
    openSeams,
    offset,
    limit,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

function rootCandidatesForTarget(project: SourceProject, target: ResolvedSourceTarget, memberName: string | undefined): readonly TraceRootCandidate[] {
  const sourceFile = target.sourceFile;
  if (sourceFile === undefined) {
    return [];
  }
  const node = target.node ?? sourceFile;
  const roots = rootsForNode(project, sourceFile, node, memberName);
  if (roots.length > 0) {
    return roots;
  }
  if (memberName !== undefined) {
    return [];
  }
  return isTraceFunctionLike(node)
    ? [{ sourceFile, node, label: labelForFunctionLike(node), memberName: memberNameForFunctionLike(node) }]
    : [];
}

function rootsForNode(project: SourceProject, sourceFile: ts.SourceFile, node: ts.Node, memberName: string | undefined): readonly TraceRootCandidate[] {
  if (isTraceFunctionLike(node)) {
    const ownMemberName = memberNameForFunctionLike(node);
    return memberName === undefined || ownMemberName === memberName
      ? [{ sourceFile, node, label: labelForFunctionLike(node), memberName: ownMemberName }]
      : [];
  }
  if (ts.isVariableDeclaration(node) && node.initializer !== undefined) {
    return rootsForNode(project, sourceFile, node.initializer, memberName)
      .map((root) => ({ ...root, label: `${node.name.getText(sourceFile)}.${root.memberName ?? root.label}` }));
  }
  if (ts.isClassLike(node)) {
    return node.members.flatMap((member) => rootsForMember(sourceFile, member, memberName, node.name?.text ?? "class"));
  }
  if (ts.isObjectLiteralExpression(node)) {
    return node.properties.flatMap((property) => rootsForObjectProperty(project, sourceFile, property, memberName, "object"));
  }
  if (ts.isCallExpression(node)) {
    return rootsForLocalFactoryCall(project, sourceFile, node, memberName);
  }
  if (ts.isExportAssignment(node)) {
    return rootsForNode(project, sourceFile, node.expression, memberName);
  }
  if (ts.isSourceFile(node)) {
    const roots: TraceRootCandidate[] = [];
    for (const statement of node.statements) {
      roots.push(...rootsForNode(project, sourceFile, statement, memberName));
    }
    return roots;
  }
  if (ts.isVariableStatement(node)) {
    return node.declarationList.declarations.flatMap((declaration) => rootsForNode(project, sourceFile, declaration, memberName));
  }
  if (ts.isExpressionStatement(node)) {
    return rootsForNode(project, sourceFile, node.expression, memberName);
  }
  return [];
}

function rootsForMember(sourceFile: ts.SourceFile, member: ts.ClassElement, memberName: string | undefined, ownerName: string): readonly TraceRootCandidate[] {
  if (!isTraceFunctionLike(member) || member.body === undefined) {
    return [];
  }
  const name = memberNameForFunctionLike(member);
  if (memberName !== undefined && name !== memberName) {
    return [];
  }
  return [{ sourceFile, node: member, label: `${ownerName}.${name ?? labelForFunctionLike(member)}`, memberName: name }];
}

function rootsForObjectProperty(project: SourceProject, sourceFile: ts.SourceFile, property: ts.ObjectLiteralElementLike, memberName: string | undefined, ownerName: string): readonly TraceRootCandidate[] {
  if (ts.isMethodDeclaration(property)) {
    const name = propertyNameText(property.name);
    if (memberName !== undefined && name !== memberName) {
      return [];
    }
    return [{ sourceFile, node: property, label: `${ownerName}.${name ?? "method"}`, memberName: name }];
  }
  if (!ts.isPropertyAssignment(property)) {
    return [];
  }
  const name = propertyNameText(property.name);
  if (memberName !== undefined && name !== memberName) {
    return [];
  }
  const initializer = unwrapExpression(property.initializer);
  return isTraceFunctionLike(initializer)
    ? [{ sourceFile, node: initializer, label: `${ownerName}.${name ?? "property"}`, memberName: name }]
    : rootsForNode(project, sourceFile, initializer, memberName);
}

function rootsForLocalFactoryCall(project: SourceProject, sourceFile: ts.SourceFile, call: ts.CallExpression, memberName: string | undefined): readonly TraceRootCandidate[] {
  if (memberName === undefined) {
    return [];
  }
  const factory = localFunctionDeclarationForCall(project, sourceFile, call);
  if (factory?.body === undefined) {
    return [];
  }
  const captures = capturedParameterBindings(project, sourceFile, factory, call);
  return returnExpressions(factory.body)
    .flatMap((expression) => rootsForReturnedExpression(project, sourceFile, expression, memberName, factory.name?.text ?? "factory", captures));
}

function rootsForReturnedExpression(
  project: SourceProject,
  sourceFile: ts.SourceFile,
  expression: ts.Expression,
  memberName: string,
  ownerName: string,
  captures: readonly EvaluationTraceBinding[],
): readonly TraceRootCandidate[] {
  const current = unwrapExpression(expression);
  if (ts.isObjectLiteralExpression(current)) {
    return current.properties
      .flatMap((property) => rootsForObjectProperty(project, sourceFile, property, memberName, ownerName))
      .map((root) => ({ ...root, captures }));
  }
  if (ts.isParenthesizedExpression(current)) {
    return rootsForReturnedExpression(project, sourceFile, current.expression, memberName, ownerName, captures);
  }
  return [];
}

function effectRootForCandidate(project: SourceProject, candidate: TraceRootCandidate): EvaluationEffectRoot {
  const parameters = candidate.node.parameters
    .map((parameter, index) => parameterBinding(project, candidate.sourceFile, parameter, index))
    .filter((binding): binding is EvaluationTraceBinding => binding !== null);
  const file = requiredSourceFileIdentity(project, candidate.sourceFile);
  const span = sourceSpanForNode(candidate.sourceFile, candidate.node);
  return {
    id: `effect-root:${file.repoPath}:${span.start}:${span.end}:${candidate.memberName ?? "body"}`,
    label: candidate.label,
    memberName: candidate.memberName,
    file,
    span,
    parameters,
    captures: candidate.captures ?? [],
  };
}

function scopeForRoot(project: SourceProject, sourceFile: ts.SourceFile, root: EvaluationEffectRoot, node: TraceFunctionLike): EvaluationTraceScope {
  const scope = new EvaluationTraceScope();
  for (const capture of root.captures) {
    scope.set(capture);
  }
  for (const parameter of root.parameters) {
    scope.set(parameter);
  }
  if (ts.isMethodDeclaration(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) {
    const name = node.name ?? node;
    scope.set({
      name: "this",
      origin: EvaluationTraceBindingOrigin.This,
      file: root.file,
      span: sourceSpanForNode(sourceFile, name),
      expression: readTypeScriptExpressionFact(project, sourceFile, name as ts.Expression),
    });
  }
  return scope;
}

function traceFunctionBody(
  node: TraceFunctionLike,
  scope: EvaluationTraceScope,
  context: TraceContext,
  certainty: EvaluationEffectCertainty,
  controlPath: readonly string[],
  depth: number,
): void {
  if (node.body === undefined) {
    open(context, EvaluationOpenKind.DynamicCall, "Function-like root has no body available to static effect tracing.", node, controlPath);
    return;
  }
  if (ts.isBlock(node.body)) {
    traceBlock(node.body, scope, context, certainty, controlPath, depth + 1);
    return;
  }
  traceExpression(node.body, scope, context, certainty, controlPath, depth + 1);
}

function traceBlock(
  block: ts.Block,
  scope: EvaluationTraceScope,
  context: TraceContext,
  certainty: EvaluationEffectCertainty,
  controlPath: readonly string[],
  depth: number,
): void {
  if (depth > context.maxDepth) {
    open(context, EvaluationOpenKind.DepthLimit, "Static effect trace reached the syntax depth limit.", block, controlPath);
    return;
  }
  for (const statement of block.statements) {
    traceStatement(statement, scope, context, certainty, controlPath, depth + 1);
  }
}

function traceStatement(
  statement: ts.Statement,
  scope: EvaluationTraceScope,
  context: TraceContext,
  certainty: EvaluationEffectCertainty,
  controlPath: readonly string[],
  depth: number,
): void {
  if (depth > context.maxDepth) {
    open(context, EvaluationOpenKind.DepthLimit, "Static effect trace reached the syntax depth limit.", statement, controlPath);
    return;
  }
  if (ts.isVariableStatement(statement)) {
    for (const declaration of statement.declarationList.declarations) {
      if (declaration.initializer !== undefined) {
        traceExpression(declaration.initializer, scope, context, certainty, controlPath, depth + 1);
      }
      bindVariableDeclaration(declaration, scope, context);
    }
    return;
  }
  if (ts.isExpressionStatement(statement)) {
    traceExpression(statement.expression, scope, context, certainty, controlPath, depth + 1);
    return;
  }
  if (ts.isReturnStatement(statement)) {
    if (statement.expression !== undefined) {
      traceExpression(statement.expression, scope, context, certainty, controlPath, depth + 1);
    }
    return;
  }
  if (ts.isBlock(statement)) {
    traceBlock(statement, scope.fork(), context, certainty, controlPath, depth + 1);
    return;
  }
  if (ts.isIfStatement(statement)) {
    traceExpression(statement.expression, scope, context, certainty, controlPath, depth + 1);
    open(context, EvaluationOpenKind.DynamicBranch, "If statement effects are reported as potential on both branches.", statement.expression, controlPath);
    traceStatementLike(statement.thenStatement, scope.fork(), context, EvaluationEffectCertainty.Potential, [...controlPath, "if:then"], depth + 1);
    if (statement.elseStatement !== undefined) {
      traceStatementLike(statement.elseStatement, scope.fork(), context, EvaluationEffectCertainty.Potential, [...controlPath, "if:else"], depth + 1);
    }
    return;
  }
  if (ts.isForOfStatement(statement)) {
    traceExpression(statement.expression, scope, context, certainty, controlPath, depth + 1);
    open(context, EvaluationOpenKind.DynamicLoop, "For-of body effects are reported as repeated potential effects.", statement, controlPath);
    const loopScope = scope.fork();
    bindForOfVariable(statement, scope, loopScope, context);
    traceStatementLike(statement.statement, loopScope, context, EvaluationEffectCertainty.Repeated, [...controlPath, "for-of"], depth + 1);
    return;
  }
  if (ts.isForStatement(statement)) {
    if (statement.initializer !== undefined && !ts.isVariableDeclarationList(statement.initializer)) {
      traceExpression(statement.initializer, scope, context, certainty, controlPath, depth + 1);
    }
    if (statement.condition !== undefined) {
      traceExpression(statement.condition, scope, context, certainty, controlPath, depth + 1);
    }
    if (statement.incrementor !== undefined) {
      traceExpression(statement.incrementor, scope, context, certainty, controlPath, depth + 1);
    }
    open(context, EvaluationOpenKind.DynamicLoop, "For-loop body effects are reported as repeated potential effects.", statement, controlPath);
    traceStatementLike(statement.statement, scope.fork(), context, EvaluationEffectCertainty.Repeated, [...controlPath, "for"], depth + 1);
    return;
  }
  if (ts.isWhileStatement(statement) || ts.isDoStatement(statement)) {
    const expression = ts.isWhileStatement(statement) ? statement.expression : statement.expression;
    traceExpression(expression, scope, context, certainty, controlPath, depth + 1);
    open(context, EvaluationOpenKind.DynamicLoop, "Loop body effects are reported as repeated potential effects.", statement, controlPath);
    traceStatementLike(statement.statement, scope.fork(), context, EvaluationEffectCertainty.Repeated, [...controlPath, "loop"], depth + 1);
    return;
  }
  if (
    ts.isFunctionDeclaration(statement)
    || ts.isClassDeclaration(statement)
    || ts.isInterfaceDeclaration(statement)
    || ts.isTypeAliasDeclaration(statement)
    || ts.isImportDeclaration(statement)
    || ts.isExportDeclaration(statement)
    || ts.isEmptyStatement(statement)
  ) {
    return;
  }
  open(context, EvaluationOpenKind.UnsupportedStatement, `Statement kind ${ts.SyntaxKind[statement.kind]} is not in the effect trace statement set.`, statement, controlPath);
}

function traceStatementLike(
  statement: ts.Statement,
  scope: EvaluationTraceScope,
  context: TraceContext,
  certainty: EvaluationEffectCertainty,
  controlPath: readonly string[],
  depth: number,
): void {
  if (ts.isBlock(statement)) {
    traceBlock(statement, scope, context, certainty, controlPath, depth + 1);
  } else {
    traceStatement(statement, scope, context, certainty, controlPath, depth + 1);
  }
}

function traceExpression(
  expression: ts.Expression,
  scope: EvaluationTraceScope,
  context: TraceContext,
  certainty: EvaluationEffectCertainty,
  controlPath: readonly string[],
  depth: number,
): void {
  if (depth > context.maxDepth) {
    open(context, EvaluationOpenKind.DepthLimit, "Static effect trace reached the syntax depth limit.", expression, controlPath);
    return;
  }
  const current = unwrapExpression(expression);
  if (ts.isCallExpression(current)) {
    traceExpression(current.expression, scope, context, certainty, controlPath, depth + 1);
    for (const argument of current.arguments) {
      const argumentExpression = ts.isSpreadElement(argument) ? argument.expression : argument;
      traceExpression(argumentExpression, scope, context, certainty, controlPath, depth + 1);
    }
    recordInvocation(current, scope, context, certainty, controlPath);
    traceLocalFunctionCall(current, scope, context, certainty, controlPath, depth + 1);
    if (!isKnownSynchronousCallbackCall(current)) {
      traceDeferredCallbacks(current, scope, context, controlPath, depth + 1);
    } else {
      traceKnownSynchronousCallback(current, scope, context, certainty, controlPath, depth + 1);
    }
    return;
  }
  if (ts.isNewExpression(current)) {
    traceExpression(current.expression, scope, context, certainty, controlPath, depth + 1);
    for (const argument of current.arguments ?? []) {
      const argumentExpression = ts.isSpreadElement(argument) ? argument.expression : argument;
      traceExpression(argumentExpression, scope, context, certainty, controlPath, depth + 1);
    }
    recordInvocation(current, scope, context, certainty, controlPath);
    return;
  }
  if (ts.isBinaryExpression(current)) {
    traceExpression(current.left, scope, context, certainty, controlPath, depth + 1);
    traceExpression(current.right, scope, context, certainty, controlPath, depth + 1);
    bindAssignment(current, scope, context);
    return;
  }
  if (ts.isConditionalExpression(current)) {
    traceExpression(current.condition, scope, context, certainty, controlPath, depth + 1);
    open(context, EvaluationOpenKind.DynamicBranch, "Conditional expression effects are reported as potential on both branches.", current.condition, controlPath);
    traceExpression(current.whenTrue, scope.fork(), context, EvaluationEffectCertainty.Potential, [...controlPath, "conditional:true"], depth + 1);
    traceExpression(current.whenFalse, scope.fork(), context, EvaluationEffectCertainty.Potential, [...controlPath, "conditional:false"], depth + 1);
    return;
  }
  if (ts.isPropertyAccessExpression(current)) {
    traceExpression(current.expression, scope, context, certainty, controlPath, depth + 1);
    return;
  }
  if (ts.isElementAccessExpression(current)) {
    traceExpression(current.expression, scope, context, certainty, controlPath, depth + 1);
    if (current.argumentExpression !== undefined) {
      traceExpression(current.argumentExpression, scope, context, certainty, controlPath, depth + 1);
    }
    return;
  }
  if (ts.isArrayLiteralExpression(current)) {
    for (const element of current.elements) {
      if (!ts.isOmittedExpression(element)) {
        traceExpression(ts.isSpreadElement(element) ? element.expression : element, scope, context, certainty, controlPath, depth + 1);
      }
    }
    return;
  }
  if (ts.isObjectLiteralExpression(current)) {
    for (const property of current.properties) {
      if (ts.isPropertyAssignment(property)) {
        traceExpression(property.initializer, scope, context, certainty, controlPath, depth + 1);
      } else if (ts.isSpreadAssignment(property)) {
        traceExpression(property.expression, scope, context, certainty, controlPath, depth + 1);
      }
    }
    return;
  }
  if (ts.isArrowFunction(current) || ts.isFunctionExpression(current) || ts.isClassExpression(current)) {
    return;
  }
  ts.forEachChild(current, (child) => {
    if (ts.isExpression(child)) {
      traceExpression(child, scope, context, certainty, controlPath, depth + 1);
    }
  });
}

function traceLocalFunctionCall(
  call: ts.CallExpression,
  scope: EvaluationTraceScope,
  context: TraceContext,
  certainty: EvaluationEffectCertainty,
  controlPath: readonly string[],
  depth: number,
): void {
  const declaration = localFunctionDeclarationForCall(context.project, context.sourceFile, call);
  if (declaration?.body === undefined) {
    return;
  }
  const declarationSpan = sourceSpanForNode(context.sourceFile, declaration);
  const declarationKey = `${context.sourceFile.fileName}:${declarationSpan.start}:${declarationSpan.end}`;
  if (context.callStack.includes(declarationKey)) {
    open(context, EvaluationOpenKind.DynamicCall, "Recursive local function call was not expanded during static effect tracing.", call, controlPath);
    return;
  }
  if (depth > context.maxDepth) {
    open(context, EvaluationOpenKind.DepthLimit, "Static effect trace reached the local function call depth limit.", call, controlPath);
    return;
  }

  const callScope = scope.fork();
  for (const [index, parameter] of declaration.parameters.entries()) {
    if (!ts.isIdentifier(parameter.name)) {
      open(context, EvaluationOpenKind.UnsupportedBindingPattern, "Local function parameter binding pattern is not represented in effect tracing.", parameter.name, controlPath);
      continue;
    }
    const argument = call.arguments[index];
    const argumentExpression = argument === undefined
      ? null
      : ts.isSpreadElement(argument)
        ? argument.expression
        : argument;
    const argumentAlias = argumentExpression === null ? null : bindingForExpression(argumentExpression, scope);
    callScope.set(bindingFromName(
      context.project,
      context.sourceFile,
      parameter.name,
      argumentAlias === null ? EvaluationTraceBindingOrigin.CapturedParameter : EvaluationTraceBindingOrigin.Alias,
      {
        parameterIndex: argumentAlias?.parameterIndex ?? index,
        ...(argumentAlias === null ? {} : { aliasOf: argumentAlias.name }),
        ...(argumentExpression === null ? {} : {
          expression: readTypeScriptExpressionFact(context.project, context.sourceFile, argumentExpression),
          capturedFromArgument: argumentExpression.getText(context.sourceFile),
        }),
      },
    ));
  }

  context.callStack.push(declarationKey);
  traceFunctionBody(
    declaration,
    callScope,
    context,
    certainty,
    [...controlPath, `call:${declaration.name?.text ?? "function"}`],
    depth + 1,
  );
  context.callStack.pop();
}

function traceKnownSynchronousCallback(
  call: ts.CallExpression,
  scope: EvaluationTraceScope,
  context: TraceContext,
  certainty: EvaluationEffectCertainty,
  controlPath: readonly string[],
  depth: number,
): void {
  const callee = unwrapExpression(call.expression);
  if (!isKnownSynchronousCallbackCall(call) || !ts.isPropertyAccessExpression(callee)) {
    return;
  }
  const callback = call.arguments.find((argument): argument is ts.Expression => !ts.isSpreadElement(argument) && isTraceFunctionLike(unwrapExpression(argument)));
  if (callback === undefined) {
    return;
  }
  const callbackFunction = unwrapExpression(callback) as TraceFunctionLike;
  const callbackScope = scope.fork();
  const iterable = bindingForExpression(callee.expression, scope);
  const firstParameter = callbackFunction.parameters[0];
  if (firstParameter !== undefined && ts.isIdentifier(firstParameter.name) && iterable !== null) {
    callbackScope.set(bindingFromName(
      context.project,
      context.sourceFile,
      firstParameter.name,
      EvaluationTraceBindingOrigin.Iteration,
      {
        iterableOf: iterable.name,
        parameterIndex: iterable.parameterIndex,
      },
    ));
  }
  traceFunctionBody(callbackFunction, callbackScope, context, certainty === EvaluationEffectCertainty.Repeated ? certainty : EvaluationEffectCertainty.Potential, [...controlPath, `callback:${callee.name.text}`], depth + 1);
}

function traceDeferredCallbacks(
  call: ts.CallExpression,
  scope: EvaluationTraceScope,
  context: TraceContext,
  controlPath: readonly string[],
  depth: number,
): void {
  for (const [index, argument] of call.arguments.entries()) {
    if (ts.isSpreadElement(argument)) {
      continue;
    }
    const current = unwrapExpression(argument);
    if (!isTraceFunctionLike(current)) {
      continue;
    }
    const callbackScope = scope.fork();
    for (const [parameterIndex, parameter] of current.parameters.entries()) {
      if (!ts.isIdentifier(parameter.name)) {
        open(context, EvaluationOpenKind.UnsupportedBindingPattern, "Deferred callback parameter binding pattern is not represented in effect tracing.", parameter.name, controlPath);
        continue;
      }
      callbackScope.set(bindingFromName(context.project, context.sourceFile, parameter.name, EvaluationTraceBindingOrigin.Parameter, { parameterIndex }));
    }
    traceFunctionBody(current, callbackScope, context, EvaluationEffectCertainty.Deferred, [...controlPath, `callback:${callName(call)}:${index}`], depth + 1);
  }
}

function isKnownSynchronousCallbackCall(call: ts.CallExpression): boolean {
  const callee = unwrapExpression(call.expression);
  return ts.isPropertyAccessExpression(callee) && ["forEach", "map", "flatMap"].includes(callee.name.text);
}

function recordInvocation(
  node: ts.CallExpression | ts.NewExpression,
  scope: EvaluationTraceScope,
  context: TraceContext,
  certainty: EvaluationEffectCertainty,
  controlPath: readonly string[],
): void {
  const callSite = readTypeScriptCallSiteEntry(context.project, context.sourceFile, node);
  if (callSite === null) {
    open(context, EvaluationOpenKind.UnsupportedExpression, "Call-like expression could not be projected as a TypeScript call site.", node, controlPath);
    return;
  }
  const callee = unwrapExpression(node.expression);
  const receiverExpression = ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee)
    ? callee.expression
    : null;
  const receiver = receiverExpression === null
    ? null
    : readTypeScriptExpressionFact(context.project, context.sourceFile, receiverExpression);
  const memberName = ts.isPropertyAccessExpression(callee)
    ? callee.name.text
    : ts.isElementAccessExpression(callee)
      ? callee.argumentExpression?.getText(context.sourceFile) ?? null
      : null;
  const args = [...node.arguments ?? []];
  const effect: EvaluationInvocationEffect = {
    id: `effect:${callSite.id}:${context.nextSequence}`,
    sequence: context.nextSequence++,
    root: context.root,
    certainty,
    controlPath,
    callSite,
    memberName,
    receiver,
    receiverBinding: receiverExpression === null ? null : bindingForExpression(receiverExpression, scope),
    arguments: callSite.arguments.map((argument, index) => ({
      ...argument,
      binding: argumentBinding(args[index], scope),
    })),
  };
  context.effects.push(effect);
}

function callName(call: ts.CallExpression): string {
  const expression = unwrapExpression(call.expression);
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  return expression.getText(call.getSourceFile());
}

function bindVariableDeclaration(declaration: ts.VariableDeclaration, scope: EvaluationTraceScope, context: TraceContext): void {
  if (!ts.isIdentifier(declaration.name)) {
    if (declaration.initializer !== undefined) {
      open(context, EvaluationOpenKind.UnsupportedBindingPattern, "Variable binding pattern is not represented in effect tracing.", declaration.name, []);
    }
    return;
  }
  const initializer = declaration.initializer === undefined ? null : bindingForExpression(declaration.initializer, scope);
  scope.set(bindingFromName(
    context.project,
    context.sourceFile,
    declaration.name,
    initializer === null ? EvaluationTraceBindingOrigin.Variable : EvaluationTraceBindingOrigin.Alias,
    initializer === null
      ? {}
      : {
        aliasOf: initializer.name,
        parameterIndex: initializer.parameterIndex,
      },
  ));
}

function bindAssignment(expression: ts.BinaryExpression, scope: EvaluationTraceScope, context: TraceContext): void {
  if (!isAssignmentOperator(expression.operatorToken.kind) || !ts.isIdentifier(expression.left)) {
    return;
  }
  const right = bindingForExpression(expression.right, scope);
  scope.set(bindingFromName(
    context.project,
    context.sourceFile,
    expression.left,
    right === null ? EvaluationTraceBindingOrigin.Variable : EvaluationTraceBindingOrigin.Alias,
    right === null
      ? {}
      : {
        aliasOf: right.name,
        parameterIndex: right.parameterIndex,
      },
  ));
}

function bindForOfVariable(
  statement: ts.ForOfStatement,
  outerScope: EvaluationTraceScope,
  loopScope: EvaluationTraceScope,
  context: TraceContext,
): void {
  if (!ts.isVariableDeclarationList(statement.initializer)) {
    return;
  }
  const declaration = statement.initializer.declarations[0];
  if (declaration === undefined || !ts.isIdentifier(declaration.name)) {
    return;
  }
  const iterable = bindingForExpression(statement.expression, outerScope);
  loopScope.set(bindingFromName(
    context.project,
    context.sourceFile,
    declaration.name,
    EvaluationTraceBindingOrigin.Iteration,
    iterable === null
      ? {}
      : {
        iterableOf: iterable.name,
        parameterIndex: iterable.parameterIndex,
      },
  ));
}

function parameterBinding(project: SourceProject, sourceFile: ts.SourceFile, parameter: ts.ParameterDeclaration, index: number): EvaluationTraceBinding | null {
  if (!ts.isIdentifier(parameter.name)) {
    return null;
  }
  return bindingFromName(project, sourceFile, parameter.name, EvaluationTraceBindingOrigin.Parameter, { parameterIndex: index });
}

function capturedParameterBindings(
  project: SourceProject,
  sourceFile: ts.SourceFile,
  declaration: LocalFunctionDeclaration,
  call: ts.CallExpression,
): readonly EvaluationTraceBinding[] {
  return declaration.parameters
    .map((parameter, index) => {
      if (!ts.isIdentifier(parameter.name)) {
        return null;
      }
      const argument = call.arguments[index];
      return bindingFromName(
        project,
        sourceFile,
        parameter.name,
        EvaluationTraceBindingOrigin.CapturedParameter,
        {
          parameterIndex: index,
          ...(argument === undefined ? {} : {
            expression: readTypeScriptExpressionFact(project, sourceFile, ts.isSpreadElement(argument) ? argument.expression : argument),
            capturedFromArgument: argument.getText(sourceFile),
          }),
        },
      );
    })
    .filter((binding): binding is EvaluationTraceBinding => binding !== null);
}

function bindingFromName(
  project: SourceProject,
  sourceFile: ts.SourceFile,
  name: ts.Identifier,
  origin: EvaluationTraceBindingOrigin,
  extra: {
    readonly parameterIndex?: number;
    readonly aliasOf?: string;
    readonly iterableOf?: string;
    readonly expression?: TypeScriptExpressionFact;
    readonly capturedFromArgument?: string;
  } = {},
): EvaluationTraceBinding {
  return {
    name: name.text,
    origin,
    file: requiredSourceFileIdentity(project, sourceFile),
    span: sourceSpanForNode(sourceFile, name),
    expression: extra.expression ?? readTypeScriptExpressionFact(project, sourceFile, name),
    ...extra,
  };
}

function argumentBinding(argument: ts.Expression | undefined, scope: EvaluationTraceScope): EvaluationTraceBinding | null {
  if (argument === undefined) {
    return null;
  }
  return bindingForExpression(ts.isSpreadElement(argument) ? argument.expression : argument, scope);
}

function bindingForExpression(expression: ts.Expression, scope: EvaluationTraceScope): EvaluationTraceBinding | null {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return scope.get(current.text);
  }
  if (current.kind === ts.SyntaxKind.ThisKeyword) {
    return scope.get("this");
  }
  return null;
}

function open(
  context: TraceContext,
  openKind: EvaluationOpenKind,
  summary: string,
  node: ts.Node,
  _controlPath: readonly string[],
): void {
  const file = requiredSourceFileIdentity(context.project, context.sourceFile);
  const span = sourceSpanForNode(context.sourceFile, node);
  context.openSeams.push({
    id: `effect-open:${file.repoPath}:${span.start}:${span.end}:${openKind}:${context.openSeams.length}`,
    openKind,
    summary,
    file,
    span,
    syntaxKindName: ts.SyntaxKind[node.kind] ?? String(node.kind),
  });
}

function uniqueRootCandidates(candidates: readonly TraceRootCandidate[]): readonly TraceRootCandidate[] {
  const byKey = new Map<string, TraceRootCandidate>();
  for (const candidate of candidates) {
    const span = sourceSpanForNode(candidate.sourceFile, candidate.node);
    byKey.set(`${candidate.sourceFile.fileName}:${span.start}:${span.end}:${candidate.memberName ?? ""}`, candidate);
  }
  return [...byKey.values()].sort((left, right) =>
    left.sourceFile.fileName.localeCompare(right.sourceFile.fileName)
    || sourceSpanForNode(left.sourceFile, left.node).start - sourceSpanForNode(right.sourceFile, right.node).start
  );
}

function isTraceFunctionLike(node: ts.Node): node is TraceFunctionLike {
  return ts.isFunctionDeclaration(node)
    || ts.isFunctionExpression(node)
    || ts.isArrowFunction(node)
    || ts.isMethodDeclaration(node)
    || ts.isConstructorDeclaration(node)
    || ts.isGetAccessorDeclaration(node)
    || ts.isSetAccessorDeclaration(node);
}

function labelForFunctionLike(node: TraceFunctionLike): string {
  const name = memberNameForFunctionLike(node);
  if (name !== null) {
    return name;
  }
  if (ts.isConstructorDeclaration(node)) {
    return "constructor";
  }
  return ts.SyntaxKind[node.kind] ?? "function";
}

function memberNameForFunctionLike(node: TraceFunctionLike): string | null {
  if ("name" in node && node.name !== undefined) {
    return propertyNameText(node.name);
  }
  return null;
}

/** Convert an effect row source span to an inquiry source range. */
export function sourceRangeForEvaluationEffect(effect: EvaluationInvocationEffect): SourceRange {
  return sourceRangeFromFileSpan(effect.callSite.file.repoPath, effect.callSite.span);
}

/** Convert an effect seam source span to an inquiry source range. */
export function sourceRangeForEvaluationOpenSeam(seam: EvaluationEffectOpenSeam): SourceRange {
  return sourceRangeFromFileSpan(seam.file.repoPath, seam.span);
}
