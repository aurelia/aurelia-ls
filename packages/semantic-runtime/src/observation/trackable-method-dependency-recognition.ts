import ts from 'typescript';

import {
  readImportedExportName,
  readSourceImportBindings,
  type SourceImportBindings,
} from '../evaluation/import-bindings.js';
import {
  readPropertyName,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import { ExpressionParser } from '../expression/expression-parser.js';
import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import type { SourceSpan } from '../expression/source-span.js';
import type { RuntimeExpressionAccessDraft } from '../runtime-expression/runtime-expression-access-draft.js';
import { collectRuntimeTemplateAccessUseDrafts } from '../runtime-expression/template-access-use-collector.js';
import type { RuntimeSourceObservedAccessSeedEffectDraft } from '../runtime-expression/source-observed-access-effect.js';
import type { RuntimeSourceAccessUseDraft } from '../runtime-expression/source-access-use-publication.js';
import {
  RuntimeExpressionAccessCoverage,
  RuntimeExpressionAccessRole,
  RuntimeExpressionAccessTargetLink,
  RuntimeExpressionAccessTargetResolution,
  RuntimeExpressionAccessTracking,
  RuntimeExpressionExecutionMaximum,
  RuntimeExpressionExecutionMinimum,
  RuntimeExpressionExecutionQualifierKind,
} from '../runtime-expression/runtime-expression-access-use.js';
import type { RuntimeObservedDependencyDraft } from './runtime-observed-dependency-draft.js';
import {
  ComputedObservationDependencyMode,
  ComputedObservationMemberKind,
} from './computed-observation.js';
import {
  AURELIA_COMPUTED_DECORATOR_EXPORTS,
  AURELIA_COMPUTED_DECORATOR_MODULES,
  readComputedDecorator,
  readComputedDependency,
} from './computed-observation-recognition.js';
import {
  computedDependencyRead,
  isNullishDependencyConfigValue,
  propertyKeyRead,
  type ComputedDependencyKeyRead,
  type ComputedDependencyRead,
} from './computed-dependency-config.js';
import {
  runtimeConnectableObservedAccessUseDrafts,
  type RuntimeConnectableObservedAccessUseDraft,
} from './connectable-observed-dependency.js';

const trackableExpressionParser = new ExpressionParser();

const AURELIA_AST_TRACK_DECORATOR_MODULES = new Set([
  'aurelia',
  '@aurelia/runtime',
]);

const AURELIA_AST_TRACK_DECORATOR_EXPORTS = new Set([
  'astTrack',
]);

/**
 * Reads method-level @computed/@astTrack metadata that Aurelia stores under astTrackableMethodMarker.
 *
 * This is the common recognition layer for both template astEvaluate calls and ProxyObservable method calls.
 * Getter-owned @computed stays in computed-observation-recognition because it feeds ObserverLocator instead.
 */
export function readTrackableMethodDependency(
  method: ts.MethodDeclaration,
): ComputedDependencyRead | null {
  if (!ts.canHaveDecorators(method)) {
    return null;
  }
  const computedBindings = readSourceImportBindings(
    method.getSourceFile(),
    AURELIA_COMPUTED_DECORATOR_MODULES,
    AURELIA_COMPUTED_DECORATOR_EXPORTS,
  );
  const astTrackBindings = readSourceImportBindings(
    method.getSourceFile(),
    AURELIA_AST_TRACK_DECORATOR_MODULES,
    AURELIA_AST_TRACK_DECORATOR_EXPORTS,
  );
  let dependency: ComputedDependencyRead | null = null;
  for (const decorator of ts.getDecorators(method) ?? []) {
    dependency = readComputedTrackableDecorator(decorator, computedBindings)
      ?? readAstTrackDecoratorDependency(decorator, astTrackBindings)
      ?? dependency;
  }
  return dependency;
}

interface TrackableDependencyKeyAccessEffects {
  readonly accessUses: readonly RuntimeExpressionAccessDraft[];
  readonly observedEffects: readonly RuntimeConnectableObservedAccessUseDraft[];
}

/** Parse one explicit trackable dependency in its authored source domain and retain exact access/effect pairs. */
function connectableAccessEffectsForTrackableDependencyKey(
  dependency: ComputedDependencyKeyRead,
  baseSpan: SourceSpan,
): TrackableDependencyKeyAccessEffects {
  const parse = trackableExpressionParser.parse(dependency.key, 'IsProperty', { baseSpan });
  if (
    parse.kind !== ExpressionParseResultKind.ExpressionSuccess
    && parse.kind !== ExpressionParseResultKind.EmptyExpressionSuccess
  ) {
    return { accessUses: [], observedEffects: [] };
  }
  const accessUses = collectRuntimeTemplateAccessUseDrafts({ expression: parse.ast });
  return {
    accessUses,
    observedEffects: runtimeConnectableObservedAccessUseDrafts(accessUses, null, parse.ast),
  };
}

export interface TrackableDependencyKeySourceEffectRequest {
  readonly dependency: ComputedDependencyKeyRead;
  readonly baseSpan: SourceSpan;
  readonly projectDependency: (draft: RuntimeConnectableObservedAccessUseDraft['dependency']) => RuntimeObservedDependencyDraft;
  readonly handoff?: {
    readonly sourceSpan: SourceSpan;
    readonly operationName: string;
    readonly coverageReason: string;
  };
}

/** Build exact declarative access/effect pairs for a trackable dependency key. */
export function sourceObservedAccessEffectsForTrackableDependencyKey(
  request: TrackableDependencyKeySourceEffectRequest,
): readonly RuntimeSourceObservedAccessSeedEffectDraft[] {
  const parsed = connectableAccessEffectsForTrackableDependencyKey(request.dependency, request.baseSpan);
  const projectedEffects = parsed.observedEffects.map((effect) => ({
    accessUse: effect.accessUse,
    dependency: request.projectDependency(effect.dependency),
  }));
  const dependenciesByAccess = new Map(parsed.accessUses.map((access) => [access, [] as RuntimeObservedDependencyDraft[]]));
  for (const effect of projectedEffects) {
    dependenciesByAccess.get(effect.accessUse)?.push(effect.dependency);
  }
  const draftByAccess = new Map(parsed.accessUses.map((access): [typeof access, RuntimeSourceAccessUseDraft] => {
    const projected = dependenciesByAccess.get(access)?.[0] ?? null;
    const targetSource = projected?.observedMemberSourceAddressHandle ?? null;
    const handoff = request.handoff;
    return [access, {
      ...access,
      role: RuntimeExpressionAccessRole.DeclarativeDependency,
      executionQualifiers: handoff == null
        ? access.executionQualifiers
        : [
            ...access.executionQualifiers,
            {
              kind: RuntimeExpressionExecutionQualifierKind.MethodBodyHandoff,
              sourceSpan: handoff.sourceSpan,
              operationName: handoff.operationName,
            },
          ],
      minimumExecutions: handoff == null
        ? access.minimumExecutions
        : RuntimeExpressionExecutionMinimum.Zero,
      maximumExecutions: handoff == null
        ? access.maximumExecutions
        : RuntimeExpressionExecutionMaximum.One,
      coverage: handoff == null
        ? access.coverage
        : RuntimeExpressionAccessCoverage.Open,
      coverageReason: handoff?.coverageReason ?? access.coverageReason,
      tracking: RuntimeExpressionAccessTracking.Connectable,
      targetResolution: targetSource == null
        ? RuntimeExpressionAccessTargetResolution.Open
        : RuntimeExpressionAccessTargetResolution.Exact,
      targetLinks: targetSource == null
        ? []
        : [new RuntimeExpressionAccessTargetLink(null, null, null, null, targetSource)],
    }];
  }));
  const seedByAccess = new Map([...draftByAccess].map(([access, draft]) => [access, {
    kind: 'source-draft' as const,
    draft,
  }] as const));
  return projectedEffects.map((effect) => ({
    accessUse: seedByAccess.get(effect.accessUse)!,
    dependency: effect.dependency,
  }));
}

function readComputedTrackableDecorator(
  decorator: ts.Decorator,
  bindings: SourceImportBindings,
): ComputedDependencyRead | null {
  const computed = readComputedDecorator(decorator, bindings);
  return computed == null
    ? null
    : readComputedDependency(computed, ComputedObservationMemberKind.Method);
}

function readAstTrackDecoratorDependency(
  decorator: ts.Decorator,
  bindings: SourceImportBindings,
): ComputedDependencyRead | null {
  const expression = unwrapExpression(decorator.expression);
  if (ts.isCallExpression(expression)) {
    const decoratorName = readImportedExportName(expression.expression, bindings, AURELIA_AST_TRACK_DECORATOR_EXPORTS);
    return decoratorName == null ? null : readAstTrackCallArguments(expression.arguments);
  }
  const decoratorName = readImportedExportName(expression, bindings, AURELIA_AST_TRACK_DECORATOR_EXPORTS);
  return decoratorName == null
    ? null
    : computedDependencyRead(ComputedObservationDependencyMode.ProxyAutoTrack);
}

function readAstTrackCallArguments(
  args: ts.NodeArray<ts.Expression>,
): ComputedDependencyRead {
  if (args.length === 0) {
    return computedDependencyRead(ComputedObservationDependencyMode.ProxyAutoTrack);
  }
  const first = unwrapExpression(args[0]!);
  if (isNullishDependencyConfigValue(first)) {
    return computedDependencyRead(ComputedObservationDependencyMode.ProxyAutoTrack);
  }
  if (ts.isObjectLiteralExpression(first)) {
    const deps = readObjectPropertyInitializer(first, 'deps');
    return deps == null || isNullishDependencyConfigValue(unwrapExpression(deps))
      ? computedDependencyRead(ComputedObservationDependencyMode.ProxyAutoTrack)
      : readTrackableDependencyExpression(unwrapExpression(deps));
  }
  return readTrackableDependencyExpressions(args.map((arg) => unwrapExpression(arg)));
}

function readTrackableDependencyExpression(
  expression: ts.Expression,
): ComputedDependencyRead {
  if (isNullishDependencyConfigValue(expression)) {
    return computedDependencyRead(ComputedObservationDependencyMode.ProxyAutoTrack);
  }
  if (ts.isArrayLiteralExpression(expression)) {
    return expression.elements.length === 0
      ? computedDependencyRead(ComputedObservationDependencyMode.Disabled)
      : readTrackableDependencyExpressions(expression.elements.map((element) => unwrapExpression(element)));
  }
  if (ts.isFunctionExpression(expression) || ts.isArrowFunction(expression)) {
    return computedDependencyRead(ComputedObservationDependencyMode.DependencyFunction, [], 'async', null, [expression]);
  }
  const keyRead = propertyKeyRead(expression);
  if (keyRead != null) {
    return computedDependencyRead(ComputedObservationDependencyMode.ExplicitPropertyKeys, [keyRead]);
  }
  return computedDependencyRead(ComputedObservationDependencyMode.Open);
}

function readTrackableDependencyExpressions(
  expressions: readonly ts.Expression[],
): ComputedDependencyRead {
  const keyReads: ComputedDependencyKeyRead[] = [];
  const dependencyFunctions: ts.FunctionLikeDeclaration[] = [];
  let sawOpen = false;
  for (const expression of expressions) {
    if (isNullishDependencyConfigValue(expression)) {
      sawOpen = true;
      continue;
    }
    const keyRead = propertyKeyRead(expression);
    if (keyRead != null) {
      keyReads.push(keyRead);
      continue;
    }
    if (ts.isFunctionExpression(expression) || ts.isArrowFunction(expression)) {
      dependencyFunctions.push(expression);
      continue;
    }
    sawOpen = true;
  }
  if (sawOpen) {
    return computedDependencyRead(ComputedObservationDependencyMode.Open, keyReads, 'async', null, dependencyFunctions);
  }
  if (keyReads.length === 0 && dependencyFunctions.length === 0) {
    return computedDependencyRead(ComputedObservationDependencyMode.Disabled);
  }
  return computedDependencyRead(
    dependencyFunctions.length > 0
      ? ComputedObservationDependencyMode.DependencyFunction
      : ComputedObservationDependencyMode.ExplicitPropertyKeys,
    keyReads,
    'async',
    null,
    dependencyFunctions,
  );
}

function readObjectPropertyInitializer(
  expression: ts.ObjectLiteralExpression,
  name: string,
): ts.Expression | null {
  for (const property of expression.properties) {
    if (ts.isPropertyAssignment(property) && readPropertyName(property.name) === name) {
      return property.initializer;
    }
  }
  return null;
}
