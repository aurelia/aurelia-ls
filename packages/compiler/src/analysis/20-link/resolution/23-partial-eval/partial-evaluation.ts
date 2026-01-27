import type { NormalizedPath } from '../compiler.js';
import type { ExportBindingMap } from "../22-export-bind/types.js";
import type { FileFacts, RegistrationCall, RegistrationGuard } from "../21-extract/file-facts.js";
import type { DefineMap, DefineValue } from "../defines.js";
import type { AnalysisGap } from "./types.js";
import { gap } from "./types.js";
import type {
  AnalyzableValue,
  BindableMember,
  ClassValue,
  DecoratorApplication,
  LexicalScope,
  ResolutionContext,
} from "./value/types.js";
import { extractBoolean, literal, object } from "./value/types.js";
import { buildResolutionContext, fullyResolve } from "./value/resolve.js";
import { resolveInScope } from "./value/scope.js";

export interface PartialEvaluationOptions {
  readonly packagePath?: string;
  readonly defines?: DefineMap;
  /**
   * Test hook: force evaluation to throw for specific files.
   * Used to assert analysis-failed gap handling in integration tests.
   */
  readonly failOnFiles?: ReadonlySet<NormalizedPath> | readonly NormalizedPath[];
}

export interface PartialEvaluationFileResult {
  readonly facts: FileFacts;
  readonly gaps: AnalysisGap[];
}

export interface PartialEvaluationResult {
  readonly facts: Map<NormalizedPath, FileFacts>;
  readonly gaps: AnalysisGap[];
  readonly files: ReadonlyMap<NormalizedPath, PartialEvaluationFileResult>;
}

/**
 * Partially evaluate AnalyzableValue trees within FileFacts.
 *
 * Resolves local references (Layer 2) and imports (Layer 3) without mutating
 * the original facts. Gaps collected during resolution are returned.
 */
export function evaluateFileFacts(
  facts: ReadonlyMap<NormalizedPath, FileFacts>,
  exportBindings: ExportBindingMap,
  options?: PartialEvaluationOptions,
): PartialEvaluationResult {
  const globalBindings = buildGlobalBindings(options?.defines);
  const failOnFiles = normalizeFailOnFiles(options?.failOnFiles);
  const fileScopes = new Map<NormalizedPath, LexicalScope>();
  for (const [path, fileFacts] of facts) {
    const scoped = applyGlobalBindings(fileFacts.scope, globalBindings);
    fileScopes.set(path, scoped);
  }

  const ctx = buildResolutionContext({
    fileScopes,
    exportBindings,
    fileFacts: facts,
    packagePath: options?.packagePath ?? "",
  });

  const files = new Map<NormalizedPath, PartialEvaluationFileResult>();
  const resolvedFacts = new Map<NormalizedPath, FileFacts>();

  for (const [path, fileFacts] of facts) {
    const scope = fileScopes.get(path) ?? fileFacts.scope;
    const gapStart = ctx.gaps.length;
    let resolved: FileFacts;
    try {
      if (failOnFiles?.has(path)) {
        throw new Error(`Forced partial evaluation failure for ${path}`);
      }
      resolved = evaluateFile(fileFacts, scope, ctx);
    } catch (error) {
      ctx.gaps.push(createEvaluationFailureGap(path, error));
      resolved = { ...fileFacts, scope };
    }
    const newGaps = ctx.gaps.slice(gapStart);
    files.set(path, { facts: resolved, gaps: newGaps });
    resolvedFacts.set(path, resolved);
  }

  return { facts: resolvedFacts, gaps: [...ctx.gaps], files };
}

function normalizeFailOnFiles(
  input: ReadonlySet<NormalizedPath> | readonly NormalizedPath[] | undefined,
): ReadonlySet<NormalizedPath> | null {
  if (!input) return null;
  return input instanceof Set ? input : new Set(input);
}

function evaluateFile(
  fileFacts: FileFacts,
  scope: LexicalScope,
  ctx: ResolutionContext,
): FileFacts {
  const classes = fileFacts.classes.map((cls) => evaluateClass(cls, scope, ctx));
  const variables = fileFacts.variables.map((variable) => ({
    ...variable,
    initializer: resolveOptionalValue(variable.initializer, scope, ctx),
  }));
  const registrationCalls = evaluateRegistrationCalls(
    fileFacts.registrationCalls,
    scope,
    ctx,
    fileFacts.path,
  );
  const defineCalls = fileFacts.defineCalls.map((call) => ({
    ...call,
    definition: resolveValue(call.definition, scope, ctx),
    classRef: resolveValue(call.classRef, scope, ctx),
  }));

  return {
    ...fileFacts,
    scope,
    classes,
    variables,
    registrationCalls,
    defineCalls,
  };
}

function evaluateClass(cls: ClassValue, scope: LexicalScope, ctx: ResolutionContext): ClassValue {
  const decorators = cls.decorators.map((dec) => evaluateDecorator(dec, scope, ctx));

  const staticMembers = new Map<string, AnalyzableValue>();
  for (const [name, value] of cls.staticMembers) {
    staticMembers.set(name, resolveValue(value, scope, ctx));
  }

  const bindableMembers = cls.bindableMembers.map((member) =>
    evaluateBindableMember(member, scope, ctx),
  );

  return {
    ...cls,
    decorators,
    staticMembers,
    bindableMembers,
  };
}

function evaluateDecorator(
  dec: DecoratorApplication,
  scope: LexicalScope,
  ctx: ResolutionContext,
): DecoratorApplication {
  return {
    ...dec,
    args: dec.args.map((arg) => resolveValue(arg, scope, ctx)),
  };
}

function evaluateBindableMember(
  member: BindableMember,
  scope: LexicalScope,
  ctx: ResolutionContext,
): BindableMember {
  return {
    ...member,
    args: member.args.map((arg) => resolveValue(arg, scope, ctx)),
  };
}

function resolveValue(
  value: AnalyzableValue,
  scope: LexicalScope,
  ctx: ResolutionContext,
): AnalyzableValue {
  return fullyResolve(value, scope, ctx);
}

function resolveValueInScope(
  value: AnalyzableValue,
  scope: LexicalScope,
): AnalyzableValue {
  return resolveInScope(value, scope);
}

interface GlobalNode {
  value?: DefineValue;
  properties: Map<string, GlobalNode>;
}

function buildGlobalBindings(
  defines: DefineMap | undefined,
): ReadonlyMap<string, AnalyzableValue> {
  if (!defines || Object.keys(defines).length === 0) {
    return new Map();
  }

  const roots = new Map<string, GlobalNode>();

  for (const [rawPath, value] of Object.entries(defines)) {
    const trimmed = rawPath.trim();
    if (!trimmed) continue;
    const segments = trimmed.split(".").filter(Boolean);
    if (segments.length === 0) continue;

    const rootName = segments[0]!;
    let rootNode = roots.get(rootName);
    if (!rootNode) {
      rootNode = { properties: new Map() };
      roots.set(rootName, rootNode);
    }

    let current: GlobalNode = rootNode;
    for (const segment of segments.slice(1)) {
      let child: GlobalNode | undefined = current.properties.get(segment);
      if (!child) {
        child = { properties: new Map() };
        current.properties.set(segment, child);
      }
      current = child;
    }

    current.value = value;
  }

  const bindings = new Map<string, AnalyzableValue>();
  for (const [name, node] of roots) {
    bindings.set(name, globalNodeToValue(node));
  }
  return bindings;
}

function globalNodeToValue(node: GlobalNode): AnalyzableValue {
  if (node.properties.size === 0) {
    return literal(node.value);
  }

  const properties = new Map<string, AnalyzableValue>();
  for (const [key, child] of node.properties) {
    properties.set(key, globalNodeToValue(child));
  }

  return object(properties);
}

function applyGlobalBindings(
  scope: LexicalScope,
  globals: ReadonlyMap<string, AnalyzableValue>,
): LexicalScope {
  if (globals.size === 0) return scope;

  const bindings = new Map<string, AnalyzableValue>();
  for (const [name, value] of globals) {
    bindings.set(name, value);
  }
  for (const [name, value] of scope.bindings) {
    bindings.set(name, value);
  }

  return {
    ...scope,
    bindings,
  };
}

function resolveOptionalValue(
  value: AnalyzableValue | null,
  scope: LexicalScope,
  ctx: ResolutionContext,
): AnalyzableValue | null {
  if (value === null) return null;
  return fullyResolve(value, scope, ctx);
}

type GuardStatus = "true" | "false" | "unknown";

function evaluateRegistrationCalls(
  calls: readonly RegistrationCall[],
  scope: LexicalScope,
  ctx: ResolutionContext,
  filePath: NormalizedPath,
): RegistrationCall[] {
  const evaluated: RegistrationCall[] = [];

  for (const call of calls) {
    const resolvedArgs = call.arguments.map((arg) => resolveValueInScope(arg, scope));
    const resolvedGuards = call.guards.map((guard) => ({
      ...guard,
      condition: resolveValue(guard.condition, scope, ctx),
    }));

    const guardStatus = evaluateGuardStatus(resolvedGuards);

    if (guardStatus.status === "unknown") {
      for (const guard of guardStatus.unknownGuards) {
        ctx.gaps.push(createConditionalRegistrationGap(filePath, guard));
      }
    }

    if (guardStatus.status === "false") {
      continue;
    }

    evaluated.push({
      ...call,
      arguments: resolvedArgs,
      guards: resolvedGuards,
    });
  }

  return evaluated;
}

function evaluateGuardStatus(
  guards: readonly RegistrationGuard[],
): { status: GuardStatus; unknownGuards: RegistrationGuard[] } {
  let status: GuardStatus = "true";
  const unknownGuards: RegistrationGuard[] = [];

  for (const guard of guards) {
    const guardValue = resolveGuardBoolean(guard.condition);
    if (guardValue === undefined) {
      unknownGuards.push(guard);
      status = status === "false" ? "false" : "unknown";
      continue;
    }

    const effective = guard.negated ? !guardValue : guardValue;
    if (!effective) {
      return { status: "false", unknownGuards };
    }
  }

  return { status, unknownGuards };
}

function resolveGuardBoolean(value: AnalyzableValue): boolean | undefined {
  return extractBoolean(value);
}

function createConditionalRegistrationGap(
  filePath: NormalizedPath,
  guard: RegistrationGuard,
): AnalysisGap {
  const condition = guard.negated ? `!(${guard.conditionText})` : guard.conditionText;
  return gap(
    `registration guarded by "${condition}"`,
    { kind: "conditional-registration", condition },
    "Cannot statically determine whether this registration executes. Consider hoisting register() or providing explicit AOT/SSR configuration.",
    { file: filePath, snippet: condition },
  );
}

function createEvaluationFailureGap(filePath: NormalizedPath, error: unknown): AnalysisGap {
  const message = error instanceof Error ? error.message : String(error);
  return gap(
    `partial evaluation for "${filePath}"`,
    { kind: "analysis-failed", stage: "partial-evaluation", message },
    "Partial evaluation failed; using unresolved facts. Consider simplifying the registration flow or providing explicit configuration.",
    { file: filePath },
  );
}

