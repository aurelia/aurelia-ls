import type { NormalizedPath } from "@aurelia-ls/compiler";
import type { ExportBindingMap } from "../binding/types.js";
import type { FileFacts } from "../file-facts.js";
import type { AnalysisGap } from "./types.js";
import type {
  AnalyzableValue,
  BindableMember,
  ClassValue,
  DecoratorApplication,
  LexicalScope,
  ResolutionContext,
} from "../npm/value/types.js";
import { buildResolutionContext, fullyResolve } from "../npm/value/resolve.js";

export interface PartialEvaluationOptions {
  readonly packagePath?: string;
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
  const fileScopes = new Map<NormalizedPath, LexicalScope>();
  for (const [path, fileFacts] of facts) {
    fileScopes.set(path, fileFacts.scope);
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
    const gapStart = ctx.gaps.length;
    const resolved = evaluateFile(fileFacts, ctx);
    const newGaps = ctx.gaps.slice(gapStart);
    files.set(path, { facts: resolved, gaps: newGaps });
    resolvedFacts.set(path, resolved);
  }

  return { facts: resolvedFacts, gaps: [...ctx.gaps], files };
}

function evaluateFile(fileFacts: FileFacts, ctx: ResolutionContext): FileFacts {
  const scope = fileFacts.scope;

  const classes = fileFacts.classes.map((cls) => evaluateClass(cls, scope, ctx));
  const variables = fileFacts.variables.map((variable) => ({
    ...variable,
    initializer: resolveOptionalValue(variable.initializer, scope, ctx),
  }));
  const registrationCalls = fileFacts.registrationCalls.map((call) => ({
    ...call,
    arguments: call.arguments.map((arg) => resolveValue(arg, scope, ctx)),
  }));
  const defineCalls = fileFacts.defineCalls.map((call) => ({
    ...call,
    definition: resolveValue(call.definition, scope, ctx),
    classRef: resolveValue(call.classRef, scope, ctx),
  }));

  return {
    ...fileFacts,
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

function resolveOptionalValue(
  value: AnalyzableValue | null,
  scope: LexicalScope,
  ctx: ResolutionContext,
): AnalyzableValue | null {
  if (value === null) return null;
  return fullyResolve(value, scope, ctx);
}
