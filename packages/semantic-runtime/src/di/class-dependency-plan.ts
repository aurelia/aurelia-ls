import ts from 'typescript';

import {
  evaluationAbruptCompletionSummary,
  type EvaluationExpressionAbruptCompletion,
} from '../evaluation/completion.js';
import type {
  StaticExpressionEvaluationResult,
} from '../evaluation/evaluator.js';
import {
  StaticEvaluator,
} from '../evaluation/evaluator.js';
import {
  type EvaluatedProjectSource,
  type StaticProjectEvaluationResult,
} from '../evaluation/project-evaluation.js';
import {
  StaticProjectEvaluationSourceIndex,
} from '../evaluation/project-source-index.js';
import {
  readStaticOwnProperty,
} from '../evaluation/property-access.js';
import {
  compactEvaluationOpenSeams,
  EvaluationOpenSeam,
  EvaluationOpenSeamKind,
} from '../evaluation/seams.js';
import {
  EvaluationValueKind,
  type EvaluationClassValue,
} from '../evaluation/values.js';
import {
  EvaluationValueEvidence,
} from '../evaluation/value-pressure.js';
import { OpenSeamReasonKind } from '../kernel/open-seam.js';
import {
  aureliaClassInjectionEvaluationForValue,
  aureliaResolverEvaluationForValue,
} from '../configuration/aurelia-evaluation-runtime.js';
import type {
  TypeSystemProject,
} from '../type-system/project.js';
import {
  DiClassDecoratorMode,
  DiDesignParamTypesMetadataState,
  DiEvaluatedInjectionDecoratorKind,
  designParamTypesMetadataState,
  diClassDecoratorModeForTypeSystem,
  readClassInjectionMetadata,
  type DiClassInjectionEvaluation,
  type DiClassInjectionMetadata,
  type DiEvaluatedInjectionDecorator,
  type DiEvaluatedNamedInjectionDecorator,
} from './injection-metadata.js';

/** Runtime authority that supplied one class's effective positional dependency list. */
export const enum DiClassDependencyAuthority {
  /** JavaScript static-property lookup found a non-undefined `inject` value. */
  StaticInject,
  /** TypeScript emitted an own legacy `design:paramtypes` dependency array. */
  TypeScriptDesignMetadata,
  /** Class-local Aurelia `di:paramtypes` annotation metadata owns the dependency list. */
  AureliaAnnotation,
  /** Neither local authority existed, so Aurelia cloned the superclass dependency list. */
  Inherited,
  /** The class and its superclass chain prove that no dependency metadata exists. */
  None,
  /** The effective authority itself could not be proven. */
  Open,
}

/** Closure of the ordered constructor positions independently of each key's value precision. */
export const enum DiClassDependencyPositionState {
  /** Runtime length, every present slot, every hole, and slot order are exact. */
  Exact,
  /** A dynamic property, spread, or conditional annotation write prevents exact positions. */
  Open,
  /** The selected metadata is definitely invalid under Aurelia's `getDependencies` contract. */
  Failed,
}

/** Closure of named metadata copied beside positional dependencies but ignored by `Factory.construct`. */
export const enum DiClassDependencyNamedState {
  /** Every named annotation write and its final value are exact. */
  Exact,
  /** A computed name or conditional decorator write prevents exact named metadata. */
  Open,
}

/** Presence of one exact runtime constructor position. */
export const enum DiClassDependencySlotState {
  /** Array iteration skips this position and constructor spread supplies `undefined` without a DI lookup. */
  Hole,
  /** Array iteration calls `container.get(...)`, including when the key value itself is `undefined`. */
  Present,
}

/** One exact constructor position after Aurelia dependency-authority precedence has been spent. */
export class DiClassDependencySlot {
  constructor(
    readonly index: number,
    readonly state: DiClassDependencySlotState,
    /** Exact authored value expression when it survived evaluation and spread projection. */
    readonly sourceExpression: ts.Expression | null,
    /** Exact authored key consulted by a resolver dependency, or the direct dependency expression. */
    readonly lookupKeyExpression: ts.Expression | null,
    /** Nearest authored expression that can carry diagnostics when no leaf expression survived. */
    readonly carrierExpression: ts.Expression,
    /** Present-slot key evidence; holes deliberately carry no synthetic `undefined` key. */
    readonly evidence: EvaluationValueEvidence | null,
  ) {}
}

/** One named `di:paramtypes` entry retained for provenance, not constructor activation. */
export class DiNamedClassDependency {
  constructor(
    readonly name: string,
    readonly sourceExpression: ts.Expression | null,
    readonly carrierExpression: ts.Expression,
    readonly evidence: EvaluationValueEvidence,
  ) {}
}

/**
 * Candidate-local equivalent of Aurelia `getDependencies(Type)`.
 *
 * Positional closure and named-metadata closure are independent because only positional entries drive
 * constructor resolution. Values remain evaluator evidence rather than durable kernel products.
 */
export class DiClassDependencyPlan {
  readonly positionalOpenSeams: readonly EvaluationOpenSeam[];
  readonly namedOpenSeams: readonly EvaluationOpenSeam[];

  constructor(
    readonly classValue: EvaluationClassValue,
    readonly authority: DiClassDependencyAuthority,
    readonly positionState: DiClassDependencyPositionState,
    readonly namedState: DiClassDependencyNamedState,
    readonly slots: readonly DiClassDependencySlot[],
    readonly namedDependencies: readonly DiNamedClassDependency[],
    /** Superclass plan cloned by Aurelia when this class has no local authority. */
    readonly inheritedPlan: DiClassDependencyPlan | null,
    readonly positionalReason: string | null,
    positionalOpenSeams: readonly EvaluationOpenSeam[],
    namedOpenSeams: readonly EvaluationOpenSeam[],
    readonly abruptCompletion: EvaluationExpressionAbruptCompletion | null = null,
  ) {
    this.positionalOpenSeams = compactEvaluationOpenSeams(positionalOpenSeams);
    this.namedOpenSeams = compactEvaluationOpenSeams(namedOpenSeams);
  }
}

/** Evaluation boundary required by DI dependency planning without importing container semantics. */
export interface DiClassDependencyPlanHost<TContext> {
  sourceForClass(value: EvaluationClassValue): EvaluatedProjectSource | null;

  readInjectionMetadata(value: EvaluationClassValue): DiClassInjectionMetadata;

  readInjectionEvaluation(value: EvaluationClassValue): DiClassInjectionEvaluation | null;

  readDecoratorMode(value: EvaluationClassValue): DiClassDecoratorMode;

  readDesignParamTypesMetadataState(
    value: EvaluationClassValue,
  ): DiDesignParamTypesMetadataState;

  evaluateStaticInject(
    receiver: EvaluationClassValue,
    source: EvaluatedProjectSource,
    node: ts.Node,
    context: TContext,
  ): StaticExpressionEvaluationResult;
}

const exactDependencyPlansByClassValue = new WeakMap<EvaluationClassValue, DiClassDependencyPlan>();

/**
 * Session-local Aurelia dependency planner.
 *
 * Exact successful plans are shared by evaluator class identity, matching the framework's
 * `di:dependencies` cache across consumers without making failed or open getter executions stable.
 */
export class DiClassDependencyPlanner<TContext> {
  private readonly active = new WeakSet<EvaluationClassValue>();

  constructor(private readonly host: DiClassDependencyPlanHost<TContext>) {}

  planFor(
    value: EvaluationClassValue,
    context: TContext,
  ): DiClassDependencyPlan {
    const cached = exactDependencyPlansByClassValue.get(value);
    if (cached != null) {
      return cached;
    }
    if (this.active.has(value)) {
      return openDependencyPlan(
        value,
        DiClassDependencyAuthority.Open,
        'Aurelia dependency metadata recursively re-entered getDependencies before producing a cacheable result.',
        [],
        value.declaration,
        value.environment.moduleKey,
      );
    }
    this.active.add(value);
    try {
      const plan = this.readPlan(value, context);
      if (
        plan.positionState === DiClassDependencyPositionState.Exact
        && plan.namedState === DiClassDependencyNamedState.Exact
        && plan.abruptCompletion == null
      ) {
        exactDependencyPlansByClassValue.set(value, plan);
      }
      return plan;
    } finally {
      this.active.delete(value);
    }
  }

  private readPlan(
    value: EvaluationClassValue,
    context: TContext,
  ): DiClassDependencyPlan {
    const source = this.host.sourceForClass(value);
    if (source == null) {
      return openDependencyPlan(
        value,
        DiClassDependencyAuthority.Open,
        'Aurelia provider class is outside the admitted static-evaluation graph.',
        [],
        value.declaration,
        value.environment.moduleKey,
      );
    }

    const staticInject = this.readStaticInjectPlan(value, source, context);
    if (staticInject != null) {
      return staticInject;
    }

    const metadata = this.host.readInjectionMetadata(value);
    const decoratorMode = this.host.readDecoratorMode(value);
    const designMetadataState = this.host.readDesignParamTypesMetadataState(value);
    if (
      decoratorMode === DiClassDecoratorMode.Legacy
      && metadata.ownsAnnotationMetadata
    ) {
      return openDependencyPlan(
        value,
        DiClassDependencyAuthority.AureliaAnnotation,
        'Legacy TypeScript Aurelia injection decorators require legacy decorator-call metadata that static evaluation does not currently project.',
        [],
        metadata.classDecorators[0]?.decorator
          ?? metadata.fieldDecorators[0]?.metadata.decorator
          ?? value.declaration,
        source.moduleKey,
      );
    }
    if (designMetadataState === DiDesignParamTypesMetadataState.Present) {
      return openDependencyPlan(
        value,
        DiClassDependencyAuthority.TypeScriptDesignMetadata,
        'TypeScript emits legacy design:paramtypes values for this class, but their runtime serialization is not yet projected into the DI dependency plan.',
        [],
        constructorCarrier(value.declaration),
        source.moduleKey,
      );
    }

    const evaluation = this.host.readInjectionEvaluation(value);
    if (evaluation?.ownsAnnotationMetadata === true) {
      return this.readAnnotationPlan(value, source, evaluation);
    }

    if (metadata.ownsAnnotationMetadata) {
      return openDependencyPlan(
        value,
        DiClassDependencyAuthority.AureliaAnnotation,
        'Aurelia injection metadata was recognized in source but its class-definition-time values were not retained.',
        [],
        metadata.classDecorators[0]?.decorator
          ?? metadata.fieldDecorators[0]?.metadata.decorator
          ?? value.declaration,
        source.moduleKey,
      );
    }

    if (designMetadataState === DiDesignParamTypesMetadataState.Empty) {
      return exactDependencyPlan(
        value,
        DiClassDependencyAuthority.TypeScriptDesignMetadata,
        [],
        [],
        null,
      );
    }

    if (value.baseClass == null) {
      return exactDependencyPlan(
        value,
        DiClassDependencyAuthority.None,
        [],
        [],
        null,
      );
    }
    const inherited = this.planFor(value.baseClass, context);
    return new DiClassDependencyPlan(
      value,
      DiClassDependencyAuthority.Inherited,
      inherited.positionState,
      inherited.namedState,
      inherited.slots,
      inherited.namedDependencies,
      inherited,
      inherited.positionalReason,
      inherited.positionalOpenSeams,
      inherited.namedOpenSeams,
      inherited.abruptCompletion,
    );
  }

  /**
   * Read normal JavaScript static-property lookup, including inherited getters invoked with the
   * originally requested derived class as receiver.
   */
  private readStaticInjectPlan(
    value: EvaluationClassValue,
    source: EvaluatedProjectSource,
    context: TContext,
  ): DiClassDependencyPlan | null {
    let owner: EvaluationClassValue | null = value;
    while (owner != null) {
      const own = readStaticOwnProperty(owner, 'inject');
      if (own != null) {
        const node = own.node ?? owner.declaration;
        const result = this.host.evaluateStaticInject(value, source, node, context);
        if (result.abruptCompletion != null) {
          return openDependencyPlan(
            value,
            DiClassDependencyAuthority.StaticInject,
            evaluationAbruptCompletionSummary(result.abruptCompletion),
            result.openSeams,
            node,
            source.moduleKey,
            result.abruptCompletion,
          );
        }
        const inject = result.value;
        if (inject == null) {
          return openDependencyPlan(
            value,
            DiClassDependencyAuthority.StaticInject,
            'Aurelia static inject metadata did not produce a value.',
            result.openSeams,
            node,
            source.moduleKey,
          );
        }
        if (inject.kind === EvaluationValueKind.Undefined) {
          return null;
        }
        if (
          inject.kind === EvaluationValueKind.Unknown
          || inject.kind === EvaluationValueKind.BoundaryObject
          || inject.kind === EvaluationValueKind.BoundaryValue
        ) {
          return openDependencyPlan(
            value,
            DiClassDependencyAuthority.StaticInject,
            inject.kind === EvaluationValueKind.Unknown
              ? inject.reason
              : 'Aurelia static inject metadata is owned by a runtime boundary.',
            result.openSeams,
            node,
            source.moduleKey,
          );
        }
        if (inject.kind !== EvaluationValueKind.Array) {
          return new DiClassDependencyPlan(
            value,
            DiClassDependencyAuthority.StaticInject,
            DiClassDependencyPositionState.Failed,
            DiClassDependencyNamedState.Exact,
            [],
            [],
            null,
            'Aurelia static inject metadata is not an array, so getDependencies(Type) would fail while cloning it.',
            result.openSeams,
            [],
          );
        }
        if (!inject.shape.hasExactPositions || inject.exactLength == null) {
          return openDependencyPlan(
            value,
            DiClassDependencyAuthority.StaticInject,
            'Aurelia static inject array positions did not close.',
            [...result.openSeams, ...inject.shape.aggregateOpenSeams],
            node,
            source.moduleKey,
          );
        }
        const carrier = staticInjectCarrierExpression(node, value);
        if (carrier == null) {
          return openDependencyPlan(
            value,
            DiClassDependencyAuthority.StaticInject,
            'Aurelia static inject values did not retain an authored carrier expression.',
            result.openSeams,
            node,
            source.moduleKey,
          );
        }
        const slots: DiClassDependencySlot[] = [];
        for (let index = 0; index < inject.exactLength; ++index) {
          const element = inject.elementAtRuntimeIndex(index);
          slots.push(element == null
            ? new DiClassDependencySlot(
                index,
                DiClassDependencySlotState.Hole,
                null,
                null,
                carrier,
                null,
              )
            : new DiClassDependencySlot(
                index,
                DiClassDependencySlotState.Present,
                element.expression,
                dependencyLookupKeyExpression(
                  new EvaluationValueEvidence(element.value, element.openSeams),
                  element.expression,
                ),
                element.expression ?? carrier,
                new EvaluationValueEvidence(element.value, element.openSeams),
              ));
        }
        return exactDependencyPlan(
          value,
          DiClassDependencyAuthority.StaticInject,
          slots,
          [],
          null,
          result.openSeams,
        );
      }
      if (owner.mayHaveUnknownProperties) {
        return openDependencyPlan(
          value,
          DiClassDependencyAuthority.Open,
          'Aurelia class static property membership is open, so inherited static inject precedence cannot be proven.',
          owner.shapeOpenSeams,
          owner.declaration,
          source.moduleKey,
        );
      }
      owner = owner.baseClass;
    }
    return null;
  }

  private readAnnotationPlan(
    value: EvaluationClassValue,
    source: EvaluatedProjectSource,
    evaluation: DiClassInjectionEvaluation,
  ): DiClassDependencyPlan {
    const evaluatedClassDecorators: EvaluatedInjectionDecorator[] = [];
    const positionalOpenSeams: EvaluationOpenSeam[] = [];
    for (const decorator of evaluation.classDecorators) {
      const evaluated = evaluatedInjectionDecorator(decorator);
      positionalOpenSeams.push(...evaluated.openSeams);
      if (evaluated.arguments == null) {
        return openDependencyPlan(
          value,
          DiClassDependencyAuthority.AureliaAnnotation,
          evaluated.reason
            ?? 'Aurelia injection decorator argument positions did not close at class-definition time.',
          positionalOpenSeams,
          decorator.decorator,
          source.moduleKey,
        );
      }
      evaluatedClassDecorators.push(evaluated);
    }

    const positionalWrites: (DiClassDependencySlot | null)[] = [];
    for (const decorator of [...evaluatedClassDecorators].reverse()) {
      if (decorator.arguments == null) {
        throw new Error('Closed Aurelia injection decorator lost its evaluated arguments.');
      }
      if (decorator.evaluation.kind === DiEvaluatedInjectionDecoratorKind.Resolver) {
        const argument = decorator.arguments[0] ?? null;
        if (argument == null) {
          return openDependencyPlan(
            value,
            DiClassDependencyAuthority.AureliaAnnotation,
            'Aurelia resolver decorator did not produce one metadata value.',
            positionalOpenSeams,
            decorator.evaluation.decorator,
            source.moduleKey,
          );
        }
        positionalWrites[0] = dependencySlot(0, argument);
        continue;
      }
      for (const [index, argument] of decorator.arguments.entries()) {
        if (!evidenceHasExactUndefinedDecision(argument.evidence)) {
          return openDependencyPlan(
            value,
            DiClassDependencyAuthority.AureliaAnnotation,
            'Aurelia @inject(...) metadata conditionally writes a positional dependency whose undefined state stayed open.',
            [...positionalOpenSeams, ...argument.evidence.openSeams],
            argument.carrierExpression,
            source.moduleKey,
          );
        }
        if (argument.evidence.value.kind !== EvaluationValueKind.Undefined) {
          positionalWrites[index] = dependencySlot(index, argument);
        }
      }
    }
    const positionalLength = lastPresentIndex(positionalWrites) + 1;
    const fallbackCarrier = evaluation.classDecorators[0]?.decorator.expression
      ?? classCarrierExpression(value.declaration);
    if (positionalLength > 0 && fallbackCarrier == null) {
      return openDependencyPlan(
        value,
        DiClassDependencyAuthority.AureliaAnnotation,
        'Aurelia injection metadata did not retain an authored carrier for a sparse dependency position.',
        positionalOpenSeams,
        value.declaration,
        source.moduleKey,
      );
    }
    const slots = Array.from({ length: positionalLength }, (_, index) =>
      positionalWrites[index]
      ?? new DiClassDependencySlot(
        index,
        DiClassDependencySlotState.Hole,
        null,
        null,
        fallbackCarrier!,
        null,
      )
    );

    const named = this.readNamedAnnotationPlan(source, evaluation.fieldDecorators);
    return new DiClassDependencyPlan(
      value,
      DiClassDependencyAuthority.AureliaAnnotation,
      DiClassDependencyPositionState.Exact,
      named.state,
      slots,
      named.dependencies,
      null,
      null,
      positionalOpenSeams,
      named.openSeams,
      null,
    );
  }

  private readNamedAnnotationPlan(
    source: EvaluatedProjectSource,
    decorators: readonly DiEvaluatedNamedInjectionDecorator[],
  ): NamedAnnotationPlan {
    const writes = new Map<string, DiNamedClassDependency>();
    const openSeams: EvaluationOpenSeam[] = [];
    for (const field of decorators) {
      if (field.fieldName == null) {
        return {
          state: DiClassDependencyNamedState.Open,
          dependencies: [...writes.values()],
          openSeams: [
            ...openSeams,
            dependencyOpenSeam(
              'Aurelia field injection metadata uses a computed name that did not close.',
              field.evaluation.decorator,
              source.moduleKey,
            ),
          ],
        };
      }
      const evaluated = evaluatedInjectionDecorator(field.evaluation);
      openSeams.push(...evaluated.openSeams);
      if (evaluated.arguments == null) {
        return {
          state: DiClassDependencyNamedState.Open,
          dependencies: [...writes.values()],
          openSeams: openSeams.length === 0
            ? [
                dependencyOpenSeam(
                  evaluated.reason
                    ?? 'Aurelia field injection decorator did not close at class-definition time.',
                  field.evaluation.decorator,
                  source.moduleKey,
                ),
              ]
            : openSeams,
        };
      }
      const argument = evaluated.arguments[0] ?? null;
      if (argument == null) {
        continue;
      }
      if (
        field.evaluation.kind === DiEvaluatedInjectionDecoratorKind.Inject
        && !evidenceHasExactUndefinedDecision(argument.evidence)
      ) {
        return {
          state: DiClassDependencyNamedState.Open,
          dependencies: [...writes.values()],
          openSeams: [...openSeams, ...argument.evidence.openSeams],
        };
      }
      if (
        field.evaluation.kind === DiEvaluatedInjectionDecoratorKind.Resolver
        || argument.evidence.value.kind !== EvaluationValueKind.Undefined
      ) {
        writes.set(field.fieldName, new DiNamedClassDependency(
          field.fieldName,
          argument.sourceExpression,
          argument.carrierExpression,
          argument.evidence,
        ));
      }
    }
    return {
      state: DiClassDependencyNamedState.Exact,
      dependencies: [...writes.values()],
      openSeams,
    };
  }
}

/**
 * Project-generation view over the canonical DI dependency planner.
 *
 * Source-oriented materializers use this bridge instead of reconstructing `static inject` and
 * decorator arrays from syntax. Provider activation uses the same planner with its container-aware
 * runtime host when dependency evaluation itself needs active DI context.
 */
export class DiClassDependencyProjectView {
  private readonly sourceIndex: StaticProjectEvaluationSourceIndex;
  private readonly valuesByDeclaration = new WeakMap<ts.ClassLikeDeclaration, EvaluationClassValue>();
  private readonly valuesByLocus = new Map<string, EvaluationClassValue>();
  private readonly evaluatorsBySource = new WeakMap<EvaluatedProjectSource, StaticEvaluator>();
  private readonly planner: DiClassDependencyPlanner<void>;

  constructor(
    evaluation: StaticProjectEvaluationResult,
    private readonly typeSystem: TypeSystemProject,
  ) {
    this.sourceIndex = new StaticProjectEvaluationSourceIndex(evaluation);
    for (const source of evaluation.readEvaluatedSources()) {
      for (const binding of source.evaluation.environment.readBindings()) {
        if (binding.value.kind !== EvaluationValueKind.Class) {
          continue;
        }
        this.valuesByDeclaration.set(binding.value.declaration, binding.value);
        this.valuesByLocus.set(classDeclarationLocus(binding.value.declaration), binding.value);
      }
    }
    this.planner = new DiClassDependencyPlanner({
      sourceForClass: (value) =>
        this.sourceIndex.readEvaluated(value.environment.moduleKey)
        ?? this.sourceIndex.readEvaluatedForNode(value.declaration),
      readInjectionMetadata: (value) =>
        readClassInjectionMetadata(value.declaration, this.typeSystem),
      readInjectionEvaluation: (value) =>
        aureliaClassInjectionEvaluationForValue(value),
      readDecoratorMode: () =>
        diClassDecoratorModeForTypeSystem(this.typeSystem),
      readDesignParamTypesMetadataState: (value) =>
        designParamTypesMetadataState(value.declaration, this.typeSystem),
      evaluateStaticInject: (receiver, source, node) =>
        this.evaluatorForSource(source).evaluatePropertyValue(
          receiver,
          'inject',
          source.moduleKey,
          node,
        ),
    });
  }

  readForDeclaration(
    declaration: ts.ClassLikeDeclaration,
  ): DiClassDependencyPlan | null {
    const value = this.valuesByDeclaration.get(declaration)
      ?? this.valuesByLocus.get(classDeclarationLocus(declaration))
      ?? null;
    return value == null ? null : this.planner.planFor(value, undefined);
  }

  private evaluatorForSource(source: EvaluatedProjectSource): StaticEvaluator {
    let evaluator = this.evaluatorsBySource.get(source);
    if (evaluator == null) {
      evaluator = new StaticEvaluator(
        source.evaluation.policy,
        source.evaluation.runtimeHost,
      );
      this.evaluatorsBySource.set(source, evaluator);
    }
    return evaluator;
  }
}

interface EvaluatedDependencyArgument {
  readonly sourceExpression: ts.Expression | null;
  readonly carrierExpression: ts.Expression;
  readonly evidence: EvaluationValueEvidence;
}

interface EvaluatedInjectionDecorator {
  readonly evaluation: DiEvaluatedInjectionDecorator;
  readonly arguments: readonly EvaluatedDependencyArgument[] | null;
  readonly openSeams: readonly EvaluationOpenSeam[];
  readonly reason: string | null;
}

interface NamedAnnotationPlan {
  readonly state: DiClassDependencyNamedState;
  readonly dependencies: readonly DiNamedClassDependency[];
  readonly openSeams: readonly EvaluationOpenSeam[];
}

function dependencySlot(
  index: number,
  argument: EvaluatedDependencyArgument,
): DiClassDependencySlot {
  return new DiClassDependencySlot(
    index,
    DiClassDependencySlotState.Present,
    argument.sourceExpression,
    dependencyLookupKeyExpression(argument.evidence, argument.sourceExpression),
    argument.sourceExpression ?? argument.carrierExpression,
    argument.evidence,
  );
}

function dependencyLookupKeyExpression(
  evidence: EvaluationValueEvidence,
  directExpression: ts.Expression | null,
): ts.Expression | null {
  const resolver = aureliaResolverEvaluationForValue(evidence.value);
  if (resolver == null) {
    return directExpression;
  }
  return resolver.argumentList?.exactEvidence() == null
    ? null
    : resolver.argumentList.elements[0]?.expression ?? null;
}

function evaluatedInjectionDecorator(
  evaluation: DiEvaluatedInjectionDecorator,
): EvaluatedInjectionDecorator {
  switch (evaluation.kind) {
    case DiEvaluatedInjectionDecoratorKind.Inject: {
      const evidence = evaluation.argumentList.exactEvidence();
      return {
        evaluation,
        arguments: evidence == null
          ? null
          : evidence.map((entry, index): EvaluatedDependencyArgument => {
              const expression = evaluation.argumentList.elements[index]?.expression
                ?? evaluation.decorator.expression;
              return {
                sourceExpression: evaluation.argumentList.elements[index]?.expression ?? null,
                carrierExpression: expression,
                evidence: entry,
              };
            }),
        openSeams: evaluation.argumentList.aggregateOpenSeams,
        reason: evidence == null
          ? 'Aurelia injection decorator argument positions did not close at class-definition time.'
          : null,
      };
    }
    case DiEvaluatedInjectionDecoratorKind.Resolver:
      return {
        evaluation,
        arguments: [{
          sourceExpression: evaluation.decorator.expression,
          carrierExpression: evaluation.decorator.expression,
          evidence: evaluation.resolver,
        }],
        openSeams: evaluation.resolver.openSeams,
        reason: null,
      };
    case DiEvaluatedInjectionDecoratorKind.Open:
      return {
        evaluation,
        arguments: null,
        openSeams: evaluation.evidence.openSeams,
        reason: evaluation.reason,
      };
  }
}

function evidenceHasExactUndefinedDecision(
  evidence: EvaluationValueEvidence,
): boolean {
  return evidence.openSeams.length === 0
    && evidence.value.kind !== EvaluationValueKind.Unknown;
}

function lastPresentIndex(
  slots: readonly (DiClassDependencySlot | null)[],
): number {
  for (let index = slots.length - 1; index >= 0; --index) {
    if (slots[index] != null) {
      return index;
    }
  }
  return -1;
}

function exactDependencyPlan(
  value: EvaluationClassValue,
  authority: DiClassDependencyAuthority,
  slots: readonly DiClassDependencySlot[],
  namedDependencies: readonly DiNamedClassDependency[],
  inheritedPlan: DiClassDependencyPlan | null,
  positionalOpenSeams: readonly EvaluationOpenSeam[] = [],
  namedOpenSeams: readonly EvaluationOpenSeam[] = [],
): DiClassDependencyPlan {
  return new DiClassDependencyPlan(
    value,
    authority,
    DiClassDependencyPositionState.Exact,
    DiClassDependencyNamedState.Exact,
    slots,
    namedDependencies,
    inheritedPlan,
    null,
    positionalOpenSeams,
    namedOpenSeams,
  );
}

function openDependencyPlan(
  value: EvaluationClassValue,
  authority: DiClassDependencyAuthority,
  reason: string,
  openSeams: readonly EvaluationOpenSeam[],
  node: ts.Node,
  moduleKey: string,
  abruptCompletion: EvaluationExpressionAbruptCompletion | null = null,
): DiClassDependencyPlan {
  return new DiClassDependencyPlan(
    value,
    authority,
    DiClassDependencyPositionState.Open,
    DiClassDependencyNamedState.Exact,
    [],
    [],
    null,
    reason,
    openSeams.length === 0
      ? [dependencyOpenSeam(reason, node, moduleKey)]
      : openSeams,
    [],
    abruptCompletion,
  );
}

function dependencyOpenSeam(
  reason: string,
  node: ts.Node,
  moduleKey: string,
): EvaluationOpenSeam {
  return new EvaluationOpenSeam(
    EvaluationOpenSeamKind.DynamicCall,
    reason,
    node,
    moduleKey,
    [OpenSeamReasonKind.StaticEvaluationDynamicCall],
  );
}

function staticInjectCarrierExpression(
  node: ts.Node,
  value: EvaluationClassValue,
): ts.Expression | null {
  if (ts.isPropertyDeclaration(node) && node.initializer != null) {
    return node.initializer;
  }
  if (
    (ts.isPropertyDeclaration(node) || ts.isGetAccessorDeclaration(node))
    && !ts.isPrivateIdentifier(node.name)
  ) {
    return ts.isComputedPropertyName(node.name) ? node.name.expression : node.name;
  }
  if (ts.isExpression(node)) {
    return node;
  }
  return classCarrierExpression(value.declaration);
}

function classCarrierExpression(
  declaration: ts.ClassLikeDeclaration,
): ts.Expression | null {
  return declaration.name ?? (ts.isClassExpression(declaration) ? declaration : null);
}

function constructorCarrier(
  declaration: ts.ClassLikeDeclaration,
): ts.Node {
  return declaration.members.find((member) =>
    ts.isConstructorDeclaration(member) && member.body != null
  ) ?? declaration;
}

function classDeclarationLocus(
  declaration: ts.ClassLikeDeclaration,
): string {
  const sourceFile = declaration.getSourceFile();
  return [
    sourceFile.fileName.replace(/\\/g, '/'),
    declaration.getStart(sourceFile),
    declaration.end,
  ].join(':');
}
