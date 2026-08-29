import ts from 'typescript';

import {
  EvaluationBindingState,
} from '../evaluation/environment.js';
import {
  StaticConditionalExecution,
  StaticEvaluationExecutionTopology,
} from '../evaluation/execution-topology.js';
import { executeStaticFunctionEffects } from '../evaluation/function-execution.js';
import {
  isStaticInvocationOccurrence,
  StaticInvocationOccurrence,
} from '../evaluation/invocation.js';
import { StaticModuleEvaluationResult } from '../evaluation/module-evaluation-result.js';
import {
  type EvaluatedProjectSource,
  StaticProjectEvaluationSourceResult,
  type StaticProjectEvaluationResult,
} from '../evaluation/project-evaluation.js';
import { StaticProjectEvaluationSourceIndex } from '../evaluation/project-source-index.js';
import {
  EvaluationArrayElement,
  EvaluationArrayValue,
  EvaluationBooleanValue,
  EvaluationBoundaryKind,
  EvaluationBoundaryObjectValue,
  EvaluationNullValue,
  EvaluationNumberValue,
  EvaluationStringValue,
  EvaluationUndefined,
  EvaluationValueKind,
  type EvaluationValue,
} from '../evaluation/values.js';

export type SemanticAppEntryCallableSelector =
  | { readonly kind: 'local'; readonly name: string }
  | { readonly kind: 'export'; readonly name: string };

export type SemanticAppEntryArgument =
  | {
      readonly kind: 'primitive';
      readonly value: string | number | boolean | null;
    }
  | {
      readonly kind: 'undefined';
    }
  | {
      readonly kind: 'host-environment';
      /** Stable boundary path, such as `document.querySelector('#app')`. */
      readonly path: string;
    }
  | {
      readonly kind: 'array';
      /** Exact dense array elements, recursively described without host-owned collection behavior. */
      readonly elements: readonly SemanticAppEntryArgument[];
    };

/** Explicit synchronous function invocation used to activate an otherwise dormant app entry. */
export interface SemanticAppNominatedEntry {
  /** Exact source path owned by the selected semantic project. */
  readonly sourceFilePath: string;
  /** Exact local binding or exported name selected from that module. Exports are never invoked implicitly. */
  readonly callable: SemanticAppEntryCallableSelector;
  /** Explicit evaluator values supplied positionally to the callable. */
  readonly arguments?: readonly SemanticAppEntryArgument[];
}

/** Canonical app-analysis descriptor; its identity is part of cache and incumbent compatibility. */
export class NormalizedSemanticAppNominatedEntry {
  readonly identityKey: string;

  constructor(
    readonly sourceFilePath: string,
    readonly callable: SemanticAppEntryCallableSelector,
    readonly arguments_: readonly SemanticAppEntryArgument[],
  ) {
    this.identityKey = JSON.stringify([
      sourceFilePath,
      callable.kind,
      callable.name,
      arguments_.map(nominatedEntryArgumentIdentity),
    ]);
  }
}

export const SEMANTIC_APP_ENTRY_ACTIVATION_ERROR_CODE = 'SEMANTIC_APP_ENTRY_ACTIVATION_REFUSED';

/** Causal refusal at the explicit app-entry boundary; no partial activation product is returned. */
export class SemanticAppEntryActivationError extends Error {
  readonly code = SEMANTIC_APP_ENTRY_ACTIVATION_ERROR_CODE;

  constructor(readonly reason: string) {
    super(`Nominated app entry activation was refused: ${reason}`);
    this.name = 'SemanticAppEntryActivationError';
  }
}

export function normalizeSemanticAppNominatedEntry(
  sourceFilePath: string,
  descriptor: SemanticAppNominatedEntry,
): NormalizedSemanticAppNominatedEntry {
  const callableName = descriptor.callable.name.trim();
  if (callableName.length === 0) {
    throw new SemanticAppEntryActivationError('the callable selector name is empty.');
  }
  const arguments_ = (descriptor.arguments ?? []).map((argument, index) =>
    normalizeNominatedEntryArgument(argument, `argument ${index}`)
  );
  return new NormalizedSemanticAppNominatedEntry(
    sourceFilePath,
    { kind: descriptor.callable.kind, name: callableName },
    arguments_,
  );
}

/**
 * Execute one explicit synchronous app entry on a session fork and overlay only its definitely reached evidence.
 *
 * The overlay preserves the original module pass, routes nested helper calls to their owning source, and appends one
 * project-wide activation order after ordinary module evaluation. Conditional or otherwise open execution is refused
 * instead of publishing a deceptively partial app world.
 */
export function activateNominatedSemanticAppEntry(
  evaluation: StaticProjectEvaluationResult,
  descriptor: NormalizedSemanticAppNominatedEntry,
): StaticProjectEvaluationResult {
  const sourceIndex = new StaticProjectEvaluationSourceIndex(evaluation);
  const entrySource = sourceIndex.readEvaluated(descriptor.sourceFilePath);
  if (entrySource == null) {
    throw new SemanticAppEntryActivationError(
      `source '${descriptor.sourceFilePath}' is not an evaluated source in project '${evaluation.project.projectKey}'.`,
    );
  }
  const localName = descriptor.callable.kind === 'local'
    ? descriptor.callable.name
    : localNameForExport(entrySource.sourceFile, descriptor.callable.name);
  if (localName == null) {
    throw new SemanticAppEntryActivationError(
      `export '${descriptor.callable.name}' does not resolve to a local binding in '${descriptor.sourceFilePath}'. `
      + 'Re-exported and anonymous default callable entries are not admitted by this synchronous entry contract.',
    );
  }
  const binding = entrySource.evaluation.environment.readOwnBinding(localName);
  if (binding == null) {
    throw new SemanticAppEntryActivationError(
      `${descriptor.callable.kind} callable '${descriptor.callable.name}' has no binding in '${descriptor.sourceFilePath}'.`,
    );
  }
  if (binding.state !== EvaluationBindingState.Initialized || binding.openSeams.length > 0) {
    throw new SemanticAppEntryActivationError(
      `${descriptor.callable.kind} callable '${descriptor.callable.name}' retained open or uninitialized binding evidence.`,
    );
  }
  if (binding.value.kind !== EvaluationValueKind.Function) {
    throw new SemanticAppEntryActivationError(
      `${descriptor.callable.kind} callable '${descriptor.callable.name}' is not a statically executable function.`,
    );
  }
  if (binding.value.declaration.asteriskToken != null) {
    throw new SemanticAppEntryActivationError(
      `${descriptor.callable.kind} callable '${descriptor.callable.name}' is a generator function.`,
    );
  }
  if (hasModifier(binding.value.declaration, ts.SyntaxKind.AsyncKeyword)) {
    throw new SemanticAppEntryActivationError(
      `${descriptor.callable.kind} callable '${descriptor.callable.name}' is async; nominated entry activation is synchronous.`,
    );
  }

  const execution = executeStaticFunctionEffects(
    binding.value,
    binding.value.declaration,
    entrySource.evaluation.policy,
    entrySource.evaluation.runtimeHost,
    descriptor.arguments_.map(nominatedEntryArgumentValue),
  );
  if (execution.abruptCompletion != null) {
    throw new SemanticAppEntryActivationError(
      `${descriptor.callable.kind} callable '${descriptor.callable.name}' completed abruptly (${execution.abruptCompletion.kind}).`,
    );
  }
  if (execution.auditOpenSeams.length > 0) {
    throw new SemanticAppEntryActivationError(
      `${descriptor.callable.kind} callable '${descriptor.callable.name}' retained unsupported execution pressure: `
      + execution.auditOpenSeams.map((seam) => seam.summary).join(' | '),
    );
  }
  const activationInvocations: StaticInvocationOccurrence[] = [];
  for (const event of execution.executionTopology.events) {
    if (event instanceof StaticConditionalExecution) {
      throw new SemanticAppEntryActivationError(
        `${descriptor.callable.kind} callable '${descriptor.callable.name}' produced conditional execution topology.`,
      );
    }
    if (!isStaticInvocationOccurrence(event)) {
      throw new SemanticAppEntryActivationError(
        `${descriptor.callable.kind} callable '${descriptor.callable.name}' did not definitely reach every prepared invocation.`,
      );
    }
    activationInvocations.push(event);
  }
  const routed = routeActivationInvocations(evaluation, sourceIndex, activationInvocations);
  return evaluation.withExecutionOverlay(
    routed.sources,
    [...evaluation.executionOrderInvocations, ...routed.activationOrder],
  );
}

function routeActivationInvocations(
  evaluation: StaticProjectEvaluationResult,
  sourceIndex: StaticProjectEvaluationSourceIndex,
  invocations: readonly StaticInvocationOccurrence[],
): {
  readonly sources: readonly StaticProjectEvaluationSourceResult[];
  readonly activationOrder: readonly StaticInvocationOccurrence[];
} {
  const invocationsBySource = new Map<EvaluatedProjectSource, StaticInvocationOccurrence[]>();
  const ownerByInvocation = new Map<StaticInvocationOccurrence, EvaluatedProjectSource>();
  for (const invocation of invocations) {
    const owner = sourceIndex.readEvaluatedForNode(invocation.node);
    if (owner == null) {
      throw new SemanticAppEntryActivationError(
        `invocation at '${invocation.node.getSourceFile().fileName}' has no evaluated owning source.`,
      );
    }
    ownerByInvocation.set(invocation, owner);
    const sourceInvocations = invocationsBySource.get(owner);
    if (sourceInvocations == null) {
      invocationsBySource.set(owner, [invocation]);
    } else {
      sourceInvocations.push(invocation);
    }
  }

  const routedByOriginal = new Map<StaticInvocationOccurrence, StaticInvocationOccurrence>();
  const sources = evaluation.sources.map((source) => {
    if (!isEvaluatedSource(source)) {
      return source;
    }
    const activation = invocationsBySource.get(source);
    if (activation == null || activation.length === 0) {
      return source;
    }
    let ordinal = source.evaluation.executionTopology.events.reduce(
      (max, event) => Math.max(max, event.ordinal + 1),
      0,
    );
    const routedInvocations = activation.map((invocation) => {
      const routed = new StaticInvocationOccurrence(
        invocation.identity,
        ordinal++,
        invocation.kind,
        invocation.node,
        source.moduleKey,
        invocation.reference,
        invocation.argumentList,
        invocation.completion,
        invocation.openSeams,
      );
      routedByOriginal.set(invocation, routed);
      return routed;
    });
    return new StaticProjectEvaluationSourceResult(
      source.admission,
      source.moduleKey,
      source.sourceFile,
      new StaticModuleEvaluationResult(
        source.evaluation.moduleKey,
        source.evaluation.environment,
        source.evaluation.completion,
        source.evaluation.openSeams,
        new StaticEvaluationExecutionTopology([
          ...source.evaluation.executionTopology.events,
          ...routedInvocations,
        ]),
        source.evaluation.policy,
        source.evaluation.runtimeHost,
      ),
      source.unresolvedModules,
      source.origins,
      source.packageOrigin,
    );
  });
  return {
    sources,
    activationOrder: invocations.map((invocation) => {
      const routed = routedByOriginal.get(invocation);
      if (routed == null || ownerByInvocation.get(invocation) == null) {
        throw new SemanticAppEntryActivationError('activation routing lost a definitely reached invocation.');
      }
      return routed;
    }),
  };
}

function localNameForExport(sourceFile: ts.SourceFile, exportName: string): string | null {
  for (const statement of sourceFile.statements) {
    if (ts.isExportDeclaration(statement)) {
      if (statement.moduleSpecifier != null || statement.exportClause == null || !ts.isNamedExports(statement.exportClause)) {
        continue;
      }
      for (const element of statement.exportClause.elements) {
        if (element.name.text === exportName) {
          return (element.propertyName ?? element.name).text;
        }
      }
      continue;
    }
    if (ts.isExportAssignment(statement) && exportName === 'default' && ts.isIdentifier(statement.expression)) {
      return statement.expression.text;
    }
    if (!hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
      continue;
    }
    const isDefault = hasModifier(statement, ts.SyntaxKind.DefaultKeyword);
    if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name != null) {
      if ((isDefault ? 'default' : statement.name.text) === exportName) {
        return statement.name.text;
      }
      continue;
    }
    if (ts.isVariableStatement(statement) && !isDefault) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.name.text === exportName) {
          return declaration.name.text;
        }
      }
    }
  }
  return null;
}

function nominatedEntryArgumentValue(argument: SemanticAppEntryArgument): EvaluationValue {
  switch (argument.kind) {
    case 'undefined':
      return EvaluationUndefined;
    case 'host-environment':
      return new EvaluationBoundaryObjectValue(EvaluationBoundaryKind.HostEnvironment, argument.path);
    case 'array':
      return new EvaluationArrayValue(argument.elements.map((element) =>
        new EvaluationArrayElement(nominatedEntryArgumentValue(element), null)
      ));
    case 'primitive':
      return argument.value == null
        ? new EvaluationNullValue()
        : typeof argument.value === 'string'
          ? new EvaluationStringValue(argument.value)
          : typeof argument.value === 'number'
            ? new EvaluationNumberValue(argument.value)
            : new EvaluationBooleanValue(argument.value);
  }
}

function nominatedEntryArgumentIdentity(argument: SemanticAppEntryArgument): readonly unknown[] {
  switch (argument.kind) {
    case 'undefined':
      return ['undefined'];
    case 'host-environment':
      return ['host-environment', argument.path];
    case 'array':
      return ['array', argument.elements.map(nominatedEntryArgumentIdentity)];
    case 'primitive':
      return argument.value == null
        ? ['null']
        : typeof argument.value === 'number'
          ? ['number', Object.is(argument.value, -0) ? '-0' : String(argument.value)]
          : [typeof argument.value, argument.value];
  }
}

function normalizeNominatedEntryArgument(
  argument: SemanticAppEntryArgument,
  locus: string,
): SemanticAppEntryArgument {
  switch (argument.kind) {
    case 'primitive':
    case 'undefined':
      return argument;
    case 'host-environment': {
      const boundaryPath = argument.path.trim();
      if (boundaryPath.length === 0) {
        throw new SemanticAppEntryActivationError(`${locus} has an empty host-environment path.`);
      }
      return { kind: 'host-environment', path: boundaryPath };
    }
    case 'array':
      return {
        kind: 'array',
        elements: argument.elements.map((element, index) =>
          normalizeNominatedEntryArgument(element, `${locus} array element ${index}`)
        ),
      };
  }
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((modifier) => modifier.kind === kind) === true;
}

function isEvaluatedSource(source: StaticProjectEvaluationSourceResult): source is EvaluatedProjectSource {
  return source.sourceFile != null && source.evaluation != null;
}
