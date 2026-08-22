import ts from 'typescript';

import type { ConfigurationKernelEmission } from '../configuration/configuration-kernel-emitter.js';
import {
  AureliaInterfaceDefaultRegistrationState,
  aureliaClassInjectionEvaluationForValue,
  aureliaContainerEvaluationForValue,
  aureliaInterfaceEvaluationForValue,
  aureliaResolverEvaluationForValue,
  isAureliaResolveEvaluationFunction,
  type AureliaResolverEvaluation,
  type AureliaInterfaceDefaultRegistrationEffect,
} from '../configuration/aurelia-evaluation-runtime.js';
import type { ModuleEnvironmentRecord } from '../evaluation/environment.js';
import {
  evaluationAbruptCompletionSummary,
  type EvaluationExpressionAbruptCompletion,
} from '../evaluation/completion.js';
import {
  StaticEvaluator,
  type StaticEvaluationRuntimeHost,
} from '../evaluation/evaluator.js';
import { EvaluationRead } from '../evaluation/expression-reader.js';
import type { StaticIntrinsicEvaluationHost } from '../evaluation/intrinsics.js';
import {
  isStaticCallInvocationOccurrence,
  staticInvocationEvidenceForExpression,
  StaticInvocationKind,
  StaticInvocationNotApplicable,
  staticInvocationValue,
  type StaticInvocationOccurrence,
} from '../evaluation/invocation.js';
import { normalizeModuleKey } from '../evaluation/module-graph.js';
import {
  isEvaluatedProjectSource,
  type EvaluatedProjectSource,
  type StaticProjectEvaluationResult,
} from '../evaluation/project-evaluation.js';
import { StaticProjectEvaluationSourceIndex } from '../evaluation/project-source-index.js';
import {
  compactEvaluationOpenSeams,
  type EvaluationOpenSeam,
  EvaluationOpenSeamKind,
} from '../evaluation/seams.js';
import { DefaultStaticEvaluationPolicy } from '../evaluation/policy.js';
import { readStaticOwnProperty } from '../evaluation/property-access.js';
import { readReferenceName } from '../evaluation/ts-syntax.js';
import {
  EvaluationArrayElement,
  EvaluationArrayShape,
  EvaluationArrayValue,
  EvaluationBoundaryKind,
  EvaluationBoundaryObjectValue,
  EvaluationObjectValue,
  type EvaluationFunctionValue,
  EvaluationObjectPropertyState,
  type EvaluationClassValue,
  EvaluationUndefined,
  EvaluationValueKind,
  type EvaluationValue,
} from '../evaluation/values.js';
import type { AddressHandle, IdentityHandle } from '../kernel/handles.js';
import {
  SourceFileAddress,
  SourceSpanAddress,
  SourceSpanRole,
} from '../kernel/address.js';
import {
  ConstructableDiKeyIdentity,
  DiResolverKeyKind,
  TypeScriptDeclarationIdentity,
} from '../kernel/identity.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import { KernelPublicationPlan } from '../kernel/publication.js';
import { KernelStoreBatch, type KernelStoreRecord } from '../kernel/store.js';
import {
  RegistrationStrategy,
} from '../registration/registration-admission.js';
import {
  RegistrationValueKind,
  type RegistrationValueReference,
} from '../registration/registration-reference.js';
import { sourceExpressionForSourceAddress } from '../type-system/source-address-expression.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  DiContainerApiMethodKind,
  type DiContainerApiCallSite,
} from './container-api-recognition.js';
import type { Container } from './container.js';
import { ContainerDefaultResolverPolicy } from './container-configuration.js';
import {
  ContainerResolutionFailureKind,
  containerFactoryFailureKind,
  containerInvocationFailureKind,
  containerJitRegistrationFailureKind,
} from './container-lookup.js';
import {
  ContainerLookupKey,
  ContainerLookupKeyKind,
  containerLookupKeyForRegistrationKey,
  containerLookupKeyForRegistrationValue,
} from './container-key.js';
import {
  type ContainerFactorySlot,
  type ContainerResolverLikeSlot,
  ContainerResolverSlot,
  ContainerSelfResolverSlot,
} from './container-slot.js';
import {
  DiKeyExpressionIdentityRequest,
  DiKeyIdentityEmitter,
} from './di-key-identity-emitter.js';
import { EvaluatedRegistrationKeyDeclarationSource } from '../registration/registration-observation.js';
import {
  evaluatedRegistryRegisterFunction,
} from '../registration/evaluated-registration-value.js';
import type { DiDependencyCycleStep } from './di-issue.js';
import { InstanceProvider, InstanceProviderResolutionKind } from './instance-provider.js';
import {
  Resolver,
  ResolverResolutionKind,
} from './resolver.js';
import { DiContainerKeyExpressionIdentityKind } from './source-key-expression.js';
import {
  executeDiRegistryFunction,
  type DiRegistryExecutionResult,
} from './registry-execution.js';
import type { ParameterizedRegistry } from './registry.js';
import { delegateStaticEvaluationRuntimeHost } from '../evaluation/runtime-host.js';
import { EvaluationValueEvidence } from '../evaluation/value-pressure.js';
import {
  designParamTypesMetadataState,
  diClassDecoratorModeForTypeSystem,
  readClassInjectionMetadata,
  type DiClassInjectionEvaluation,
  type DiClassDecoratorMode,
  type DiClassInjectionMetadata,
  type DiDesignParamTypesMetadataState,
} from './injection-metadata.js';
import {
  DiClassDependencyPlanner,
  DiClassDependencyPositionState,
  DiClassDependencySlotState,
} from './class-dependency-plan.js';

export const enum DiProviderActivationState {
  /** A source-visible value was produced. */
  Value = 'value',
  /** Wrapper semantics intentionally produced undefined. */
  Undefined = 'undefined',
  /** Resolution is deferred until a returned callback is invoked. */
  Deferred = 'deferred',
  /** More than one runtime value is possible. */
  Multiple = 'multiple',
  /** Available facts do not close the runtime branch. */
  Open = 'open',
  /** Modeled container semantics prove a runtime failure. */
  Failed = 'failed',
  /** Singleton resolver activation re-entered an active resolver. */
  Cycle = 'cycle',
}

/** Candidate-local answer from spending one DI key through modeled container state. */
export class DiProviderActivationResult {
  readonly openSeams: readonly EvaluationOpenSeam[];

  constructor(
    readonly state: DiProviderActivationState,
    readonly value: EvaluationValue | null,
    readonly reason: string | null,
    readonly failureKind: ContainerResolutionFailureKind | null,
    readonly cycle: readonly DiDependencyCycleStep[] | null,
    /** Evaluator pressure retained beside a usable activation value. */
    openSeams: readonly EvaluationOpenSeam[],
    /** Exact evaluator completion when activation opened because modeled user code completed abruptly. */
    readonly abruptCompletion: EvaluationExpressionAbruptCompletion | null,
  ) {
    this.openSeams = compactEvaluationOpenSeams(openSeams);
  }
}

/** Exact failure and receiver policy proven by one ordered container API activation. */
export class DiContainerApiFailure {
  constructor(
    readonly failureKind: ContainerResolutionFailureKind,
    readonly receiverDefaultResolverPolicy: ContainerDefaultResolverPolicy | null,
  ) {}
}

interface DiProviderActivationKey {
  readonly key: ContainerLookupKey;
  readonly classValue: EvaluationClassValue | null;
  readonly sourceValue: EvaluationValue | null;
}

interface DiProviderActivationFrame {
  readonly cycleIdentity: object | null;
  readonly keyName: string;
  readonly implementationName: string;
  readonly entryNode: ts.Node;
}

interface DiProviderActivationLookup {
  readonly handler: Container;
  readonly slots: readonly DiProviderActivationSlot[];
}

const enum DiProviderActivationLookupClosure {
  Closed,
  Open,
}

interface DiProviderActivationLookupAnswer {
  readonly lookup: DiProviderActivationLookup | null;
  readonly closure: DiProviderActivationLookupClosure;
}

interface DiProviderActivationLookupSet {
  readonly lookups: readonly DiProviderActivationLookup[];
  readonly closure: DiProviderActivationLookupClosure;
}

interface DiProviderActivationFactoryAnswer {
  readonly present: boolean;
  readonly closure: DiProviderActivationLookupClosure;
}

interface DiProviderActivationFunctionAnswer {
  readonly value: EvaluationFunctionValue | null;
  readonly closure: DiProviderActivationLookupClosure;
}

interface DiProviderActivationExecutionEvent {
  readonly invocation: StaticInvocationOccurrence<ts.CallExpression>;
  readonly sourceFile: ts.SourceFile;
  readonly start: number;
  readonly end: number;
  readonly ordinal: number;
}

interface DiContainerApiActivationContext {
  readonly requestor: Container;
  readonly invocation: StaticInvocationOccurrence<ts.CallExpression>;
  /** Evaluator-owned call carrier matched to `invocation`. */
  readonly sourceNode: ts.CallExpression;
  /** Evaluator-owned first argument, when the recognized Program call authored one. */
  readonly keyExpression: ts.Expression | null;
  readonly openSeams: readonly EvaluationOpenSeam[];
}

type DiProviderActivationSlot =
  | ContainerResolverLikeSlot
  | DiJitProvider
  | DiInterfaceDefaultProvider
  | DiScopedInstanceProvider;

class DiJitProvider {
  constructor(
    readonly key: DiProviderActivationKey,
    readonly classValue: EvaluationClassValue,
    readonly strategy: ContainerDefaultResolverPolicy.Singleton | ContainerDefaultResolverPolicy.Transient,
  ) {}
}

class DiInterfaceDefaultProvider {
  constructor(
    readonly key: DiProviderActivationKey,
    readonly effect: AureliaInterfaceDefaultRegistrationEffect,
  ) {}
}

class DiScopedInstanceProvider {
  constructor(readonly result: DiProviderActivationResult) {}
}

const enum DiRegistryResolverReturnState {
  Valid,
  Invalid,
  Open,
}

/** Container products required by provider activation, independently of a completed world emission. */
export interface DiProviderActivationTopology {
  readonly containers: readonly Container[];
  readonly resolverSlots: readonly ContainerResolverSlot[];
  readonly selfResolverSlots: readonly ContainerSelfResolverSlot[];
  readonly factorySlots: readonly ContainerFactorySlot[];
}

/** Exact evaluator values retained outside durable resolver records for candidate-local activation. */
export interface DiProviderActivationValueSource {
  evaluatedResolverState(resolver: Resolver): EvaluationValue | null;
  parameterizedRegistrySource(registry: ParameterizedRegistry): ts.Node | null;
}

export const noDiProviderActivationValues: DiProviderActivationValueSource = {
  evaluatedResolverState(): EvaluationValue | null {
    return null;
  },
  parameterizedRegistrySource(): ts.Node | null {
    return null;
  },
};

/**
 * DI-owned bridge between authored key expressions, runtime-shaped container state, and evaluator class activation.
 *
 * This is a candidate-local query view. It deliberately does not publish another provider graph: container slots,
 * resolvers, canonical key identities, and evaluator class values remain the authorities.
 */
export class DiProviderActivationView {
  private readonly sourceIndex: StaticProjectEvaluationSourceIndex;
  private readonly containersByProductHandle = new Map<string, Container>();
  private readonly invocationsByExpression = new Map<ts.CallExpression, StaticInvocationOccurrence<ts.CallExpression>[]>();
  private readonly executionEventsBySourceKey = new Map<string, DiProviderActivationExecutionEvent[]>();
  private readonly resolverSlotExecutionOrdinals = new WeakMap<ContainerResolverLikeSlot, number | null>();
  private readonly factorySlotExecutionOrdinals = new WeakMap<ContainerFactorySlot, number | null>();
  private readonly evaluationValuesByContainer = new WeakMap<Container, EvaluationValue>();
  private readonly keyIdentities: DiKeyIdentityEmitter;

  constructor(
    private readonly publication: KernelPublicationContext,
    private readonly evaluation: StaticProjectEvaluationResult,
    private readonly typeSystem: TypeSystemProject,
    private readonly configuration: ConfigurationKernelEmission,
    topology: DiProviderActivationTopology,
    private readonly exactValues: DiProviderActivationValueSource,
  ) {
    this.sourceIndex = new StaticProjectEvaluationSourceIndex(evaluation);
    this.keyIdentities = new DiKeyIdentityEmitter(publication);
    for (const container of topology.containers) {
      this.containersByProductHandle.set(container.productHandle, container);
    }
    for (const source of evaluation.sources) {
      if (!isEvaluatedProjectSource(source)) {
        continue;
      }
      for (const invocation of source.evaluation.invocations) {
        if (!isStaticCallInvocationOccurrence(invocation)) {
          continue;
        }
        const invocations = this.invocationsByExpression.get(invocation.node);
        if (invocations == null) {
          this.invocationsByExpression.set(invocation.node, [invocation]);
        } else {
          invocations.push(invocation);
        }
      }
    }
    this.indexExecutionOrder();
    for (const slot of [...topology.resolverSlots, ...topology.selfResolverSlots]) {
      this.resolverSlotExecutionOrdinals.set(
        slot,
        this.executionOrdinalForSourceAddress(slot.sourceAddressHandle),
      );
    }
    for (const slot of topology.factorySlots) {
      this.factorySlotExecutionOrdinals.set(
        slot,
        this.executionOrdinalForSourceAddress(slot.sourceAddressHandle),
      );
    }
  }

  createSession(): DiProviderActivationSession {
    return new DiProviderActivationSession(this);
  }

  executionOrdinalForInvocation(invocation: StaticInvocationOccurrence<ts.CallExpression>): number | null {
    return this.sourceIndex.executionOrdinalForInvocation(invocation);
  }

  executionOrdinalForResolverSlot(slot: ContainerResolverLikeSlot): number | null | undefined {
    return this.resolverSlotExecutionOrdinals.get(slot);
  }

  executionOrdinalForFactorySlot(slot: ContainerFactorySlot): number | null | undefined {
    return this.factorySlotExecutionOrdinals.get(slot);
  }

  dependencyCycleForContainerGet(
    site: DiContainerApiCallSite,
  ): readonly DiDependencyCycleStep[] | null {
    return this.activateContainerGet(site)?.cycle ?? null;
  }

  containerApiFailure(
    site: DiContainerApiCallSite,
  ): DiContainerApiFailure | null {
    const context = this.containerApiActivationContext(site);
    if (context == null) {
      const failureKind = this.receiverIndependentResolutionFailure(site);
      return failureKind == null ? null : new DiContainerApiFailure(failureKind, null);
    }
    const failureKind = this.createSession().resolutionFailureForContainerApiInvocation(
      context.requestor,
      site,
      context.invocation,
    );
    return failureKind == null
      ? null
      : new DiContainerApiFailure(
          failureKind,
          context.requestor.readConfiguration().defaultResolverPolicy,
        );
  }

  private receiverIndependentResolutionFailure(
    site: DiContainerApiCallSite,
  ): ContainerResolutionFailureKind | null {
    const expression = site.keyExpression;
    if (expression == null) {
      return null;
    }
    if (containerApiMethodValidatesKey(site.methodKind) && site.nullishKeyArguments.length > 0) {
      return ContainerResolutionFailureKind.NullUndefinedKey;
    }
    const key = this.keyForExpression(expression, null).key;
    switch (site.methodKind) {
      case DiContainerApiMethodKind.Get:
      case DiContainerApiMethodKind.GetResolver:
        return site.keyIdentityKind === DiContainerKeyExpressionIdentityKind.EphemeralObject
          && (site.methodKind === DiContainerApiMethodKind.Get || site.autoRegister === true)
          ? containerJitRegistrationFailureKind(key)
          : null;
      case DiContainerApiMethodKind.GetFactory:
        return site.keyIdentityKind === DiContainerKeyExpressionIdentityKind.EphemeralObject
          ? containerFactoryFailureKind(key)
          : null;
      case DiContainerApiMethodKind.Invoke:
        return containerInvocationFailureKind(key);
      case DiContainerApiMethodKind.GetAll:
      case DiContainerApiMethodKind.Has:
        return null;
    }
  }

  activateContainerGet(
    site: DiContainerApiCallSite,
  ): DiProviderActivationResult | null {
    if (site.methodKind !== DiContainerApiMethodKind.Get || site.keyExpression == null) {
      return null;
    }
    const context = this.containerApiActivationContext(site);
    if (context == null || context.keyExpression == null) {
      return null;
    }
    return activationWithAdditionalPressure(
      this.createSession().activateInvocationArgument(
        context.requestor,
        context.keyExpression,
        context.invocation,
        context.sourceNode,
      ),
      context.openSeams,
    );
  }

  private containerApiActivationContext(
    site: DiContainerApiCallSite,
  ): DiContainerApiActivationContext | null {
    const evaluatedCall = this.typeSystem.readEvaluatedNode(site.sourceNode);
    if (evaluatedCall == null) {
      return null;
    }
    const invocations = this.invocationsByExpression.get(evaluatedCall) ?? [];
    const invocation = invocations.length === 1 ? invocations[0]! : null;
    const receiverEvidence = invocation?.thisValue ?? null;
    if (invocation == null || receiverEvidence == null) {
      return null;
    }
    const receiverValue = receiverEvidence.value;
    const containerEvaluation = aureliaContainerEvaluationForValue(receiverValue);
    const requestor = containerEvaluation == null
      ? null
      : this.configuration.evaluationBindings.containersByEvaluation.get(containerEvaluation) ?? null;
    if (requestor == null) {
      return null;
    }
    this.evaluationValuesByContainer.set(requestor, receiverValue);
    return {
      requestor,
      invocation,
      sourceNode: invocation.node,
      keyExpression: site.keyExpression == null ? null : invocation.node.arguments[0] ?? null,
      openSeams: receiverEvidence.openSeams,
    };
  }

  keyForExpression(
    expression: ts.Expression,
    evaluatedValue: EvaluationValue | null,
  ): DiProviderActivationKey {
    const sourceAddressHandle = this.sourceIndex.addressHandleForNode(expression);
    const local = [
      'di-provider-activation-key',
      sourceAddressHandle ?? normalizeModuleKey(expression.getSourceFile().fileName),
      expression.getStart(expression.getSourceFile()),
      expression.end,
    ].join(':');
    const occurrenceAddressHandle = sourceAddressHandle == null
      ? null
      : this.publication.handles.address(`${local}:occurrence`);
    const evaluatedDeclaration = evaluatedValue?.kind === EvaluationValueKind.Class
      || evaluatedValue?.kind === EvaluationValueKind.Function
      ? new EvaluatedRegistrationKeyDeclarationSource(
          evaluatedValue.declaration,
          evaluatedValue.environment.moduleKey,
          this.sourceIndex.addressHandleForNode(evaluatedValue.declaration),
        )
      : null;
    const records: KernelStoreRecord[] = occurrenceAddressHandle == null
      || sourceAddressHandle == null
      || this.publication.read(occurrenceAddressHandle) != null
      ? []
      : [new SourceSpanAddress(
          occurrenceAddressHandle,
          sourceAddressHandle,
          expression.getStart(expression.getSourceFile()),
          expression.end,
          SourceSpanRole.Value,
        )];
    const emission = this.keyIdentities.emitExpressionKeyIdentity(
      records,
      this.publication,
      new DiKeyExpressionIdentityRequest(
        this.evaluation.project.projectKey,
        expression,
        readReferenceName(expression),
        evaluatedValue,
        evaluatedDeclaration,
        this.typeSystem,
        this.publication.handles.identity(`${local}:fallback`),
        occurrenceAddressHandle,
      ),
    );
    if (records.length > 0) {
      this.publication.publish(new KernelPublicationPlan(
        new KernelStoreBatch(records, `di-provider-activation-key:${local}`),
      ));
    }
    return {
      key: new ContainerLookupKey(
        emission.identityHandle,
        emission.lookupKeyKind,
        readReferenceName(expression),
        occurrenceAddressHandle,
      ),
      classValue: evaluatedValue?.kind === EvaluationValueKind.Class ? evaluatedValue : null,
      sourceValue: evaluatedValue,
    };
  }

  classValueForReference(reference: RegistrationValueReference | null): EvaluationClassValue | null {
    const identity = reference?.identityHandle == null
      ? null
      : this.publication.read(reference.identityHandle);
    if (!(identity instanceof TypeScriptDeclarationIdentity) || identity.moduleKey == null || identity.localName == null) {
      return null;
    }
    const source = this.sourceIndex.readEvaluated(identity.moduleKey);
    const value = source?.evaluation.environment.readValue(identity.localName) ?? null;
    return value?.kind === EvaluationValueKind.Class ? value : null;
  }

  classValueForKey(key: ContainerLookupKey): EvaluationClassValue | null {
    const identity = this.publication.read(key.identityHandle);
    if (!(identity instanceof ConstructableDiKeyIdentity)) {
      return null;
    }
    const declaration = this.publication.read(identity.declarationHandle);
    if (!(declaration instanceof TypeScriptDeclarationIdentity) || declaration.moduleKey == null || declaration.localName == null) {
      return null;
    }
    const source = this.sourceIndex.readEvaluated(declaration.moduleKey);
    const value = source?.evaluation.environment.readValue(declaration.localName) ?? null;
    return value?.kind === EvaluationValueKind.Class ? value : null;
  }

  sourceForClass(value: EvaluationClassValue): EvaluatedProjectSource | null {
    return this.sourceIndex.readEvaluated(value.environment.moduleKey)
      ?? this.sourceIndex.readEvaluatedForNode(value.declaration);
  }

  classInjectionMetadata(value: EvaluationClassValue): DiClassInjectionMetadata {
    return readClassInjectionMetadata(value.declaration, this.typeSystem);
  }

  classInjectionEvaluation(value: EvaluationClassValue): DiClassInjectionEvaluation | null {
    return aureliaClassInjectionEvaluationForValue(value);
  }

  classDecoratorMode(): DiClassDecoratorMode {
    return diClassDecoratorModeForTypeSystem(this.typeSystem);
  }

  classDesignParamTypesMetadataState(
    value: EvaluationClassValue,
  ): DiDesignParamTypesMetadataState {
    return designParamTypesMetadataState(value.declaration, this.typeSystem);
  }

  sourceForClassEnvironment(moduleKey: string): EvaluatedProjectSource | null {
    return this.sourceIndex.readEvaluated(moduleKey);
  }

  sourcePathForNode(node: ts.Node): string | null {
    return this.sourceIndex.readForNode(node)?.admission.path ?? null;
  }

  sourceForNode(node: ts.Node): EvaluatedProjectSource | null {
    return this.sourceIndex.readEvaluatedForNode(node);
  }

  containerForProductHandle(productHandle: string | null): Container | null {
    return productHandle == null ? null : this.containersByProductHandle.get(productHandle) ?? null;
  }

  evaluationValueForContainer(container: Container): EvaluationValue | null {
    return this.evaluationValuesByContainer.get(container) ?? null;
  }

  evaluatedResolverState(resolver: Resolver): EvaluationValue | null {
    return this.exactValues.evaluatedResolverState(resolver);
  }

  parameterizedRegistrySource(registry: ParameterizedRegistry): ts.Node | null {
    return this.exactValues.parameterizedRegistrySource(registry);
  }

  valueExpressionForReference(reference: RegistrationValueReference | null): ts.Expression | null {
    return reference?.addressHandle == null ? null : this.sourceExpressionForAddress(reference.addressHandle);
  }

  sourceExpressionForAddress(addressHandle: AddressHandle): ts.Expression | null {
    return sourceExpressionForSourceAddress(
      this.publication,
      addressHandle,
      (path) => this.sourceIndex.readEvaluated(path)?.sourceFile ?? null,
    );
  }

  invocationForNode(node: ts.Node): StaticInvocationOccurrence<ts.CallExpression> | null {
    let current: ts.Node | undefined = node;
    while (current != null && !ts.isSourceFile(current)) {
      if (ts.isCallExpression(current)) {
        const invocations = this.invocationsByExpression.get(current) ?? [];
        if (invocations.length === 1) {
          return invocations[0]!;
        }
      }
      current = current.parent;
    }
    return null;
  }

  private indexExecutionOrder(): void {
    const indexedSources = new Set<EvaluatedProjectSource>();
    for (const moduleKey of this.evaluation.evaluationOrderModuleKeys) {
      const source = this.sourceIndex.readEvaluated(moduleKey);
      if (source == null || indexedSources.has(source)) {
        continue;
      }
      indexedSources.add(source);
      for (const invocation of source.evaluation.invocations) {
        if (!isStaticCallInvocationOccurrence(invocation)) {
          continue;
        }
        const ordinal = this.sourceIndex.executionOrdinalForInvocation(invocation);
        if (ordinal == null) {
          continue;
        }
        const event: DiProviderActivationExecutionEvent = {
          invocation,
          sourceFile: source.sourceFile,
          start: invocation.node.getStart(source.sourceFile),
          end: invocation.node.end,
          ordinal,
        };
        this.appendExecutionEvent(source.admission.path, event);
        this.appendExecutionEvent(source.moduleKey, event);
        this.appendExecutionEvent(source.sourceFile.fileName, event);
      }
    }
  }

  private appendExecutionEvent(sourceKey: string, event: DiProviderActivationExecutionEvent): void {
    const key = normalizeModuleKey(sourceKey);
    const events = this.executionEventsBySourceKey.get(key);
    if (events == null) {
      this.executionEventsBySourceKey.set(key, [event]);
    } else if (!events.includes(event)) {
      events.push(event);
    }
  }

  private executionOrdinalForSourceAddress(addressHandle: AddressHandle | null): number | null {
    if (addressHandle == null) {
      return null;
    }
    const span = this.publication.read(addressHandle);
    if (!(span instanceof SourceSpanAddress)) {
      return null;
    }
    const sourceFile = this.publication.read(span.fileHandle);
    if (!(sourceFile instanceof SourceFileAddress)) {
      return null;
    }
    const events = this.executionEventsBySourceKey.get(normalizeModuleKey(sourceFile.path)) ?? [];
    let best: DiProviderActivationExecutionEvent | null = null;
    for (const event of events) {
      if (event.start > span.start || span.end > event.end) {
        continue;
      }
      if (best == null || event.end - event.start < best.end - best.start) {
        best = event;
      }
    }
    return best?.ordinal ?? null;
  }
}

export class DiProviderActivationSession {
  private readonly frames: DiProviderActivationFrame[] = [];
  private readonly internalRuntimeHosts = new WeakMap<StaticEvaluationRuntimeHost, StaticEvaluationRuntimeHost>();
  private readonly evaluatorsByModuleKey = new Map<string, StaticEvaluator>();
  private readonly overlaySlots = new Map<Container, Map<IdentityHandle, DiProviderActivationSlot[]>>();
  private readonly singletonValues = new Map<object, DiProviderActivationResult>();
  private readonly activeSingletons = new Set<object>();
  private readonly activeAliases = new Set<Resolver>();
  private readonly classDependencies: DiClassDependencyPlanner<Container>;
  private activeRequestor: Container | null = null;
  private activeExecutionOrdinal: number | null = null;
  private activationDepth = 0;
  private detectedCycle: DiProviderActivationResult | null = null;

  constructor(
    private readonly view: DiProviderActivationView,
  ) {
    this.classDependencies = new DiClassDependencyPlanner({
      sourceForClass: (value) => this.view.sourceForClass(value),
      readInjectionMetadata: (value) => this.view.classInjectionMetadata(value),
      readInjectionEvaluation: (value) => this.view.classInjectionEvaluation(value),
      readDecoratorMode: () => this.view.classDecoratorMode(),
      readDesignParamTypesMetadataState: (value) =>
        this.view.classDesignParamTypesMetadataState(value),
      evaluateStaticInject: (receiver, source, node, requestor) =>
        this.withActiveRequestor(requestor, () =>
          this.evaluatorForSource(source).evaluatePropertyValue(
            receiver,
            'inject',
            source.moduleKey,
            node,
          )
        ),
    });
  }

  runtimeHostFor(
    baseHost: StaticEvaluationRuntimeHost,
    readActiveContainer: () => Container | null,
  ): StaticEvaluationRuntimeHost {
    return this.runtimeHost(baseHost, readActiveContainer);
  }

  activateEntryExpression(
    requestor: Container,
    expression: ts.Expression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    entryNode: ts.Node,
  ): DiProviderActivationResult {
    return this.withActivation(() => this.activateEntryExpressionCore(
      requestor,
      expression,
      environment,
      moduleKey,
      entryNode,
    ));
  }

  activateInvocationArgument(
    requestor: Container,
    expression: ts.Expression,
    invocation: StaticInvocationOccurrence<ts.CallExpression>,
    entryNode: ts.Node,
  ): DiProviderActivationResult {
    const ordinal = this.view.executionOrdinalForInvocation(invocation);
    if (ordinal == null) {
      return activationOpen('Aurelia DI lookup execution order was not retained for this authored call.');
    }
    const evidence = staticInvocationEvidenceForExpression(invocation, expression);
    return evidence == null
      ? activationOpen('Aurelia DI lookup argument evidence was not retained for this authored call.')
      : this.withExecutionOrdinal(ordinal, () => this.withActivation(() =>
          this.activatePreparedExpression(requestor, expression, evidence, entryNode, null, 0)
        ));
  }

  /** Resolve one exact parameterized registry's delegated handler against the current live container topology. */
  activateParameterizedRegistryHandler(
    requestor: Container,
    registry: ParameterizedRegistry,
  ): DiProviderActivationResult {
    const lookupKey = containerLookupKeyForRegistrationKey(registry.key);
    if (lookupKey == null) {
      return activationOpen('Parameterized registry lookup key did not retain a closed runtime key shape.');
    }
    const entryNode = this.view.parameterizedRegistrySource(registry);
    if (entryNode == null) {
      return activationOpen('Parameterized registry did not retain its exact evaluator source.');
    }
    return this.withActivation(() => {
      const answer = this.lookup(requestor, lookupKey);
      return answer.closure === DiProviderActivationLookupClosure.Open
        ? activationLookupOrderOpen()
        : answer.lookup == null
          ? activationOpen('Parameterized registry selected delegated registration, but the live container lookup had no matching handler.')
          : this.activateLookup(
              requestor,
              answer.lookup,
              { key: lookupKey, classValue: null, sourceValue: null },
              entryNode,
              null,
              0,
            );
    });
  }

  /** Execute one exact registry against the same mutable evaluator graph used for provider activation. */
  executeRegistrationRegistry(
    requestor: Container,
    registryValue: EvaluationValue,
    parameterValues: readonly EvaluationValue[],
  ): DiRegistryExecutionResult | null {
    const registerFunction = evaluatedRegistryRegisterFunction(registryValue);
    const source = registerFunction == null ? null : this.view.sourceForNode(registerFunction.declaration);
    if (registerFunction == null || source == null) {
      return null;
    }
    const invocationNode = registerFunction.declaration;
    const containerValue = new EvaluationObjectValue(new Map(), false, invocationNode);
    return this.withActiveRequestor(requestor, () => executeDiRegistryFunction(
      registerFunction,
      registryValue,
      containerValue,
      parameterValues,
      invocationNode,
      source.evaluation.policy,
      this.internalRuntimeHost(source.evaluation.runtimeHost),
      (frame, host) => frame.propertyKey === 'register'
        ? containerValue
        : host.unknown(
            `Registry execution reached unsupported container.${frame.propertyKey ?? '<computed>'}(...).`,
            frame.node,
            frame.moduleKey,
            EvaluationOpenSeamKind.DynamicCall,
          ),
    ));
  }

  resolutionFailureForContainerApiInvocation(
    requestor: Container,
    site: DiContainerApiCallSite,
    invocation: StaticInvocationOccurrence<ts.CallExpression>,
  ): ContainerResolutionFailureKind | null {
    const sourceNode = invocation.node;
    const expression = site.keyExpression == null ? null : sourceNode.arguments[0] ?? null;
    const ordinal = this.view.executionOrdinalForInvocation(invocation);
    if (expression == null || ordinal == null) {
      return null;
    }
    return this.withExecutionOrdinal(ordinal, () => {
      const evidence = staticInvocationEvidenceForExpression(invocation, expression);
      if (evidence == null) {
        return null;
      }
      const value = evidence.value;
      const resolver = aureliaResolverEvaluationForValue(value);
      if (containerApiMethodValidatesKey(site.methodKind)
        && (value.kind === EvaluationValueKind.Null || value.kind === EvaluationValueKind.Undefined)) {
        return ContainerResolutionFailureKind.NullUndefinedKey;
      }

      const key = this.view.keyForExpression(expression, value);
      switch (site.methodKind) {
        case DiContainerApiMethodKind.Get:
          return this.activatePreparedExpression(requestor, expression, evidence, sourceNode, null, 0).failureKind;
        case DiContainerApiMethodKind.GetResolver:
          if (site.autoRegister !== true || resolver != null) {
            return null;
          }
          return this.activateExpressionWithValue(
            requestor,
            expression,
            value,
            sourceNode,
            null,
            0,
          ).failureKind;
        case DiContainerApiMethodKind.GetAll:
        case DiContainerApiMethodKind.Has:
          return null;
        case DiContainerApiMethodKind.GetFactory:
          return this.factoryFailure(requestor, key.key);
        case DiContainerApiMethodKind.Invoke:
          return containerInvocationFailureKind(key.key);
      }
    });
  }

  valueForRuntimeHost(
    result: DiProviderActivationResult,
    node: ts.Node,
    moduleKey: string,
    host: StaticIntrinsicEvaluationHost,
  ): EvaluationValue {
    if (result.cycle != null && this.detectedCycle == null) {
      this.detectedCycle = result;
    }
    for (const seam of result.openSeams) {
      host.open(seam.seamKind, seam.summary, seam.node, seam.moduleKey, seam.reasonKinds);
    }
    if (result.value != null) {
      return result.value;
    }
    if (result.abruptCompletion != null) {
      return host.raise(result.abruptCompletion);
    }
    return host.unknown(
      result.reason ?? `Aurelia DI activation remained ${result.state}.`,
      node,
      moduleKey,
      EvaluationOpenSeamKind.DynamicCall,
    );
  }

  private activateEntryExpressionCore(
    requestor: Container,
    expression: ts.Expression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    entryNode: ts.Node,
  ): DiProviderActivationResult {
    const read = this.evaluateExpressionRead(requestor, expression, environment, moduleKey, null, 0);
    return read.value == null
      ? activationOpenForExpressionRead(read)
      : this.activatePreparedExpression(
          requestor,
          expression,
          new EvaluationValueEvidence(read.value, read.openSeams),
          entryNode,
          null,
          0,
        );
  }

  private activatePreparedExpression(
    requestor: Container,
    expression: ts.Expression,
    evidence: EvaluationValueEvidence,
    dependencyNode: ts.Node,
    host: StaticIntrinsicEvaluationHost | null,
    depth: number,
  ): DiProviderActivationResult {
    const resolver = aureliaResolverEvaluationForValue(evidence.value);
    const result = resolver == null
      ? this.activateExpressionWithValue(requestor, expression, evidence.value, dependencyNode, host, depth)
      : this.activateResolver(requestor, resolver, dependencyNode, host, depth);
    return activationWithAdditionalPressure(result, evidence.openSeams);
  }

  private activateExpressionWithValue(
    requestor: Container,
    expression: ts.Expression,
    value: EvaluationValue | null,
    dependencyNode: ts.Node,
    host: StaticIntrinsicEvaluationHost | null,
    depth: number,
  ): DiProviderActivationResult {
    return this.activateKey(requestor, this.view.keyForExpression(expression, value), dependencyNode, host, depth);
  }

  private activateResolver(
    requestor: Container,
    resolver: AureliaResolverEvaluation,
    dependencyNode: ts.Node,
    host: StaticIntrinsicEvaluationHost | null,
    depth: number,
  ): DiProviderActivationResult {
    if (resolver.resolverKind === DiResolverKeyKind.Ignore) {
      return activationUndefined();
    }
    const argumentList = resolver.argumentList;
    const arguments_ = argumentList?.exactEvidence() ?? null;
    const innerExpression = argumentList?.elements[0]?.expression ?? null;
    const inner = arguments_?.[0] ?? null;
    if (argumentList == null || arguments_ == null) {
      return activationWithAdditionalPressure(
        activationOpen(`Aurelia ${resolver.resolverKind}(...) argument positions did not close.`),
        argumentList?.shape.aggregateOpenSeams ?? [],
      );
    }
    const openSeams = arguments_.flatMap((argument) => argument.openSeams);
    if (innerExpression == null || inner == null) {
      return activationWithAdditionalPressure(
        activationOpen(`Aurelia ${resolver.resolverKind}(...) did not expose an inner DI key.`),
        openSeams,
      );
    }

    let searchAncestors = false;
    if (resolver.resolverKind === DiResolverKeyKind.All && arguments_[1] != null) {
      const searchValue = arguments_[1].value;
      if (searchValue.kind !== EvaluationValueKind.Boolean) {
        return activationWithAdditionalPressure(
          activationOpen('Aurelia all(...) searchAncestors did not reduce to one boolean value.'),
          openSeams,
        );
      }
      searchAncestors = searchValue.value;
    }
    return activationWithAdditionalPressure(
      this.activateKnownResolver(
        requestor,
        resolver.resolverKind,
        this.view.keyForExpression(innerExpression, inner.value),
        searchAncestors,
        dependencyNode,
        host,
        depth,
      ),
      openSeams,
    );
  }

  private activateKnownResolver(
    requestor: Container,
    resolverKind: DiResolverKeyKind,
    inner: DiProviderActivationKey,
    searchAncestors: boolean,
    dependencyNode: ts.Node,
    host: StaticIntrinsicEvaluationHost | null,
    depth: number,
  ): DiProviderActivationResult {
    switch (resolverKind) {
      case DiResolverKeyKind.Optional: {
        const answer = this.lookup(requestor, inner.key);
        return answer.closure === DiProviderActivationLookupClosure.Open
          ? activationLookupOrderOpen()
          : answer.lookup == null
          ? activationUndefined()
          : this.activateLookup(requestor, answer.lookup, inner, dependencyNode, host, depth);
      }
      case DiResolverKeyKind.Own: {
        const answer = this.lookupLocal(requestor, inner.key);
        return answer.closure === DiProviderActivationLookupClosure.Open
          ? activationLookupOrderOpen()
          : answer.lookup == null
          ? activationUndefined()
          : this.activateLookup(requestor, answer.lookup, inner, dependencyNode, host, depth);
      }
      case DiResolverKeyKind.Resource: {
        const local = this.lookupLocal(requestor, inner.key);
        return local.closure === DiProviderActivationLookupClosure.Open
          ? activationLookupOrderOpen()
          : local.lookup == null
          ? this.activateKey(requestor.root, inner, dependencyNode, host, depth)
          : this.activateLookup(requestor, local.lookup, inner, dependencyNode, host, depth);
      }
      case DiResolverKeyKind.OptionalResource: {
        const local = this.lookupLocal(requestor, inner.key);
        if (local.closure === DiProviderActivationLookupClosure.Open) {
          return activationLookupOrderOpen();
        }
        const root = local.lookup == null ? this.lookupLocal(requestor.root, inner.key) : null;
        return local.lookup != null
          ? this.activateLookup(requestor, local.lookup, inner, dependencyNode, host, depth)
          : root?.closure === DiProviderActivationLookupClosure.Open
            ? activationLookupOrderOpen()
            : root?.lookup != null
              ? this.activateLookup(requestor, root.lookup, inner, dependencyNode, host, depth)
            : activationUndefined();
      }
      case DiResolverKeyKind.All:
        return this.activateAll(
          requestor,
          this.lookupAll(requestor, inner.key, searchAncestors),
          inner,
          dependencyNode,
          host,
          depth,
        );
      case DiResolverKeyKind.Last: {
        const answer = this.lookup(requestor, inner.key);
        const slot = answer.lookup?.slots[answer.lookup.slots.length - 1] ?? null;
        return answer.closure === DiProviderActivationLookupClosure.Open
          ? activationLookupOrderOpen()
          : answer.lookup == null || slot == null
          ? activationUndefined()
          : this.activateSlot(requestor, slot, answer.lookup.handler, inner, dependencyNode, host, depth);
      }
      case DiResolverKeyKind.AllResources:
        return this.activateAll(
          requestor,
          this.lookupAllResources(requestor, inner.key),
          inner,
          dependencyNode,
          host,
          depth,
        );
      case DiResolverKeyKind.Lazy:
      case DiResolverKeyKind.Factory:
        return new DiProviderActivationResult(
          DiProviderActivationState.Deferred,
          null,
          `Aurelia ${resolverKind}(...) defers the inner DI lookup until a returned function is invoked.`,
          null,
          null,
          [],
          null,
        );
      case DiResolverKeyKind.NewInstanceForScope: {
        const result = this.activateFresh(requestor, inner, dependencyNode, host, depth);
        if (result.state === DiProviderActivationState.Value && result.value != null) {
          this.appendOverlaySlot(requestor, inner.key.identityHandle, new DiScopedInstanceProvider(result));
        }
        return result;
      }
      case DiResolverKeyKind.NewInstanceOf:
        return this.activateFresh(requestor, inner, dependencyNode, host, depth);
      case DiResolverKeyKind.Ignore:
        return activationUndefined();
      case DiResolverKeyKind.FromHydrationContext:
      case DiResolverKeyKind.Custom:
        return activationOpen(`DI resolver '${resolverKind}' does not expose a built-in static activation rule.`);
    }
  }

  private activateAll(
    requestor: Container,
    lookupSet: DiProviderActivationLookupSet,
    key: DiProviderActivationKey,
    dependencyNode: ts.Node,
    host: StaticIntrinsicEvaluationHost | null,
    depth: number,
  ): DiProviderActivationResult {
    const values: EvaluationArrayElement[] = [];
    const openSeams: EvaluationOpenSeam[] = [];
    let openReason = lookupSet.closure === DiProviderActivationLookupClosure.Open
      ? 'Aurelia DI resolver availability could not be ordered relative to this authored lookup.'
      : null;
    for (const lookup of lookupSet.lookups) {
      for (const slot of lookup.slots) {
        const result = this.activateSlot(requestor, slot, lookup.handler, key, dependencyNode, host, depth);
        if (result.cycle != null) {
          return activationWithAdditionalPressure(result, openSeams);
        }
        openSeams.push(...result.openSeams);
        if (result.value == null) {
          if (result.abruptCompletion != null) {
            return activationWithAdditionalPressure(result, openSeams);
          }
          openReason ??= result.reason ?? 'Aurelia all(...) included a resolver whose value remained open.';
          continue;
        }
        values.push(new EvaluationArrayElement(
          result.value,
          ts.isExpression(dependencyNode) ? dependencyNode : null,
        ));
      }
    }
    const value = new EvaluationArrayValue(
      values,
      dependencyNode,
      openReason == null
        ? EvaluationArrayShape.exact(values.length)
        : EvaluationArrayShape.from({
            exactLength: null,
            hasExactElements: false,
            hasExactOrder: true,
            uncertainties: [],
            extentOpenSeams: openSeams,
            elementOpenSeams: openSeams,
            orderOpenSeams: [],
          }),
    );
    return openReason == null
      ? activationValueWithPressure(value, openSeams)
      : new DiProviderActivationResult(
          DiProviderActivationState.Multiple,
          value,
          openReason,
          null,
          null,
          openSeams,
          null,
        );
  }

  private activateKey(
    requestor: Container,
    key: DiProviderActivationKey,
    dependencyNode: ts.Node,
    host: StaticIntrinsicEvaluationHost | null,
    depth: number,
  ): DiProviderActivationResult {
    const answer = this.lookup(requestor, key.key);
    return answer.closure === DiProviderActivationLookupClosure.Open
      ? activationLookupOrderOpen()
      : answer.lookup == null
      ? this.activateJit(requestor, key, dependencyNode, host, depth)
      : this.activateLookup(requestor, answer.lookup, key, dependencyNode, host, depth);
  }

  private activateLookup(
    requestor: Container,
    lookup: DiProviderActivationLookup,
    key: DiProviderActivationKey,
    dependencyNode: ts.Node,
    host: StaticIntrinsicEvaluationHost | null,
    depth: number,
  ): DiProviderActivationResult {
    const slot = lookup.slots[0] ?? null;
    return slot == null
      ? activationOpen('Aurelia container lookup reported a hit without a modeled resolver slot.')
      : this.activateSlot(requestor, slot, lookup.handler, key, dependencyNode, host, depth);
  }

  private activateSlot(
    requestor: Container,
    slot: DiProviderActivationSlot,
    handler: Container,
    key: DiProviderActivationKey,
    dependencyNode: ts.Node,
    host: StaticIntrinsicEvaluationHost | null,
    depth: number,
  ): DiProviderActivationResult {
    if (slot instanceof DiScopedInstanceProvider) {
      return slot.result;
    }
    if (slot instanceof DiInterfaceDefaultProvider) {
      return this.activateInterfaceDefault(requestor, slot, dependencyNode, host, depth);
    }
    if (slot instanceof DiJitProvider) {
      return slot.strategy === ContainerDefaultResolverPolicy.Singleton
        ? this.activateSingleton(requestor, slot, slot.classValue, key.key, dependencyNode)
        : this.activateClass(requestor, slot.classValue, key.key, dependencyNode, null);
    }
    if (slot instanceof ContainerSelfResolverSlot) {
      return activationOpen('Aurelia resolve(...) reached the built-in IContainer self resolver.');
    }
    const resolver = slot instanceof ContainerResolverSlot ? slot.resolver : null;
    if (resolver instanceof InstanceProvider) {
      const resolution = resolver.resolve();
      return resolution.resolutionKind === InstanceProviderResolutionKind.Instance
        ? this.directValueForReference(requestor, resolution.value, dependencyNode, host, depth)
        : activationOpen('Aurelia InstanceProvider has not received a prepared source-visible instance.');
    }
    if (!(resolver instanceof Resolver)) {
      return activationOpen('Aurelia resolver slot does not retain a modeled resolver value.');
    }
    const resolution = resolver.resolve(handler, requestor);
    switch (resolution.resolutionKind) {
      case ResolverResolutionKind.Instance:
        {
          const exactState = this.view.evaluatedResolverState(resolver);
          return exactState == null
            ? this.directValueForReference(requestor, resolution.value, dependencyNode, host, depth)
            : activationValue(exactState);
        }
      case ResolverResolutionKind.SingletonFactory:
        return this.activateSingletonReference(requestor, resolver, resolution.value, key.key, dependencyNode);
      case ResolverResolutionKind.TransientFactory:
        return this.activateConstructableReference(requestor, resolver, resolution.value, key.key, dependencyNode, null);
      case ResolverResolutionKind.Alias: {
        const aliasKey = containerLookupKeyForRegistrationValue(resolution.value);
        if (aliasKey == null) {
          return activationOpen('Aurelia alias resolver did not retain a canonical target key.');
        }
        if (this.activeAliases.has(resolver)) {
          return activationOpen(`Aurelia alias resolver for '${key.key.localName ?? key.key.identityHandle}' recursively re-entered alias lookup.`);
        }
        this.activeAliases.add(resolver);
        try {
          return this.activateKey(requestor, { key: aliasKey, classValue: null, sourceValue: null }, dependencyNode, host, depth + 1);
        } finally {
          this.activeAliases.delete(resolver);
        }
      }
      case ResolverResolutionKind.Callback:
      case ResolverResolutionKind.CachedCallback:
        return activationOpen(`Aurelia ${resolution.resolutionKind} execution remains a runtime callback boundary.`);
      case ResolverResolutionKind.Array:
        return activationOpen('Aurelia array resolver state is not represented as one executable resolver value.');
      case ResolverResolutionKind.Open:
      case ResolverResolutionKind.InvalidStrategy:
        return activationOpen(`Aurelia resolver branch remained ${resolution.resolutionKind}.`);
    }
  }

  private activateInterfaceDefault(
    requestor: Container,
    provider: DiInterfaceDefaultProvider,
    dependencyNode: ts.Node,
    host: StaticIntrinsicEvaluationHost | null,
    depth: number,
  ): DiProviderActivationResult {
    const { effect } = provider;
    switch (effect.strategy) {
      case RegistrationStrategy.Instance:
        return effect.value.kind === EvaluationValueKind.Unknown
          ? activationOpen(effect.value.reason)
          : activationValue(effect.value);
      case RegistrationStrategy.Singleton:
      case RegistrationStrategy.Transient: {
        const value = effect.value.kind === EvaluationValueKind.Class ? effect.value : null;
        if (value == null) {
          return activationOpen(`Aurelia interface default ${effect.strategy} provider did not reduce to a class value.`);
        }
        return effect.strategy === RegistrationStrategy.Singleton
          ? this.activateSingleton(requestor, provider, value, provider.key.key, dependencyNode)
          : this.activateClass(requestor, value, provider.key.key, dependencyNode, null);
      }
      case RegistrationStrategy.AliasTo:
        return effect.valueExpression == null
          ? activationOpen('Aurelia interface default alias did not retain its target key expression.')
          : this.activateKey(
              requestor,
              this.view.keyForExpression(effect.valueExpression, effect.value),
              dependencyNode,
              host,
              depth + 1,
            );
      case RegistrationStrategy.Callback:
      case RegistrationStrategy.CachedCallback:
        return activationOpen(`Aurelia interface default ${effect.strategy} execution remains a runtime callback boundary.`);
      case RegistrationStrategy.Unknown:
      case RegistrationStrategy.Defer:
      case RegistrationStrategy.Registry:
      case RegistrationStrategy.Resource:
      case RegistrationStrategy.PlainClassSelf:
      case RegistrationStrategy.RecursiveCarrier:
      case RegistrationStrategy.Resolver:
      case RegistrationStrategy.Array:
      case RegistrationStrategy.Factory:
      case RegistrationStrategy.FrameworkGroup:
        return activationOpen(`Aurelia interface default strategy '${effect.strategy}' is not a direct provider strategy.`);
    }
  }

  private activateJit(
    requestor: Container,
    key: DiProviderActivationKey,
    dependencyNode: ts.Node,
    host: StaticIntrinsicEvaluationHost | null,
    depth: number,
  ): DiProviderActivationResult {
    if (key.key.keyKind === ContainerLookupKeyKind.Interface) {
      return this.activateInterfaceJit(requestor, key, dependencyNode, host, depth);
    }
    if (key.key.keyKind === ContainerLookupKeyKind.Registry) {
      return this.activateRegistryJit(requestor, key, dependencyNode, host, depth);
    }
    const keyFailure = containerJitRegistrationFailureKind(key.key);
    if (keyFailure != null) {
      return activationFailed(
        keyFailure,
        `Aurelia cannot JIT-register DI key kind '${key.key.keyKind}'.`,
      );
    }
    if (key.key.keyKind !== ContainerLookupKeyKind.Constructable) {
      return activationOpen(`Aurelia JIT registration for key kind '${key.key.keyKind}' is not modeled yet.`);
    }
    const value = key.classValue ?? this.view.classValueForKey(key.key);
    if (value == null) {
      return activationOpen('Aurelia JIT constructable key did not map to an evaluator class value.');
    }
    const registerInRequestor = this.readRegisterInRequestor(value);
    if (registerInRequestor == null) {
      return activationOpen('Aurelia JIT handler selection depends on an open registerInRequestor class property.');
    }
    const handler = registerInRequestor ? requestor : requestor.root;
    switch (requestor.readConfiguration().defaultResolverPolicy) {
      case ContainerDefaultResolverPolicy.Singleton: {
        const provider = new DiJitProvider(key, value, ContainerDefaultResolverPolicy.Singleton);
        this.appendOverlaySlot(handler, key.key.identityHandle, provider);
        return this.activateSlot(requestor, provider, handler, key, dependencyNode, host, depth);
      }
      case ContainerDefaultResolverPolicy.Transient: {
        const provider = new DiJitProvider(key, value, ContainerDefaultResolverPolicy.Transient);
        this.appendOverlaySlot(handler, key.key.identityHandle, provider);
        return this.activateSlot(requestor, provider, handler, key, dependencyNode, host, depth);
      }
      case ContainerDefaultResolverPolicy.None:
        return activationFailed(
          ContainerResolutionFailureKind.NoneResolverFound,
          'Aurelia DefaultResolver.none rejected the missing constructable key.',
        );
      case ContainerDefaultResolverPolicy.Custom:
        return activationOpen('A custom Aurelia default resolver owns this JIT registration branch.');
      case ContainerDefaultResolverPolicy.Open:
        return activationOpen('The Aurelia container default resolver policy did not close during static evaluation.');
    }
  }

  private activateInterfaceJit(
    requestor: Container,
    key: DiProviderActivationKey,
    dependencyNode: ts.Node,
    host: StaticIntrinsicEvaluationHost | null,
    depth: number,
  ): DiProviderActivationResult {
    const evaluation = aureliaInterfaceEvaluationForValue(key.sourceValue);
    if (evaluation == null) {
      return activationOpen('Aurelia interface key identity was proven, but its createInterface evaluation metadata was unavailable.');
    }
    switch (evaluation.defaultRegistrationState) {
      case AureliaInterfaceDefaultRegistrationState.None:
        return activationFailed(
          ContainerResolutionFailureKind.NoJitInterface,
          `Aurelia interface '${evaluation.friendlyName}' has no default registration.`,
        );
      case AureliaInterfaceDefaultRegistrationState.Open:
        return activationOpen(`Aurelia interface '${evaluation.friendlyName}' has a default registration whose resolver-builder effect stayed open.`);
      case AureliaInterfaceDefaultRegistrationState.Closed: {
        const provider = new DiInterfaceDefaultProvider(key, evaluation.defaultRegistration!);
        const handler = requestor.root;
        this.appendOverlaySlot(handler, key.key.identityHandle, provider);
        return this.activateSlot(requestor, provider, handler, key, dependencyNode, host, depth);
      }
    }
  }

  private activateRegistryJit(
    requestor: Container,
    key: DiProviderActivationKey,
    dependencyNode: ts.Node,
    host: StaticIntrinsicEvaluationHost | null,
    depth: number,
  ): DiProviderActivationResult {
    if (key.sourceValue == null) {
      return activationOpen('Aurelia registry key did not retain its evaluator value.');
    }
    const register = this.functionProperty(key.sourceValue, 'register');
    if (register.closure === DiProviderActivationLookupClosure.Open) {
      return activationOpen('Aurelia registry register(...) function remained open.');
    }
    if (register.value == null) {
      return activationFailed(
        ContainerResolutionFailureKind.UnableJitNonConstructor,
        'Aurelia registry-shaped key did not expose a callable register(...) function.',
      );
    }
    const registerFunction = register.value;
    const registerInRequestor = this.readRegisterInRequestor(key.sourceValue);
    if (registerInRequestor == null) {
      return activationOpen('Aurelia registry handler selection depends on an open registerInRequestor property.');
    }
    const handler = registerInRequestor ? requestor : requestor.root;
    const containerValue = this.view.evaluationValueForContainer(handler);
    if (containerValue == null) {
      return activationOpen('Aurelia registry execution could not recover the evaluator value for its handler container.');
    }
    const source = this.view.sourceForNode(registerFunction.declaration);
    const evaluated = executeDiRegistryFunction(
      registerFunction,
      key.sourceValue,
      containerValue,
      [],
      dependencyNode,
      source?.evaluation.policy ?? DefaultStaticEvaluationPolicy,
      this.internalRuntimeHost(source?.evaluation.runtimeHost ?? {}),
      (frame, runtimeHost) => runtimeHost.unknown(
        `Aurelia registry body called container.${frame.propertyKey ?? '<computed>'}(...); provider activation does not own ordered registration spending.`,
        frame.node,
        frame.moduleKey,
        EvaluationOpenSeamKind.DynamicCall,
      ),
    );
    if (evaluated.value == null) {
      return activationOpenWithPressure(
        evaluated.abruptCompletion == null
          ? 'Aurelia registry execution did not produce a value.'
          : evaluationAbruptCompletionSummary(evaluated.abruptCompletion),
        evaluated.openSeams,
        evaluated.abruptCompletion,
      );
    }
    if (evaluated.openSeams.length > 0) {
      return activationOpenWithPressure(
        evaluated.openSeams.map((seam) => seam.summary).join(' '),
        evaluated.openSeams,
        null,
      );
    }
    switch (registryResolverReturnState(evaluated.value)) {
      case DiRegistryResolverReturnState.Valid:
        return activationOpen('Aurelia registry returned a resolver whose custom resolve(...) body is not interpreted by provider activation.');
      case DiRegistryResolverReturnState.Open:
        return activationOpen('Aurelia registry return value did not close to a valid or invalid resolver.');
      case DiRegistryResolverReturnState.Invalid: {
        const installed = this.lookupLocal(handler, key.key);
        if (installed.closure === DiProviderActivationLookupClosure.Open) {
          return activationLookupOrderOpen();
        }
        if (installed.lookup != null) {
          return this.activateLookup(requestor, installed.lookup, key, dependencyNode, host, depth);
        }
        return activationFailed(
          ContainerResolutionFailureKind.NullResolverFromRegister,
          'Aurelia registry register(...) returned no resolver and did not install one for its key.',
        );
      }
    }
  }

  private directValueForReference(
    requestor: Container,
    reference: RegistrationValueReference | null,
    dependencyNode: ts.Node,
    host: StaticIntrinsicEvaluationHost | null,
    depth: number,
  ): DiProviderActivationResult {
    if (reference == null) {
      return activationOpen('Aurelia resolver did not retain a source-visible value reference.');
    }
    const expression = this.view.valueExpressionForReference(reference);
    if (expression == null) {
      const declarationValue = this.view.classValueForReference(reference);
      return declarationValue == null
        ? activationOpen('Aurelia instance resolver value did not retain an evaluable source expression.')
        : activationValue(declarationValue);
    }
    const invocation = this.view.invocationForNode(expression);
    const source = this.view.sourceForNode(expression);
    if (source == null) {
      return activationOpen('Aurelia resolver value expression is outside the admitted static-evaluation graph.');
    }
    const invocationEvidence = invocation == null
      ? null
      : staticInvocationEvidenceForExpression(invocation, expression);
    if (invocation != null && invocationEvidence == null) {
      return activationOpen('Aurelia resolver value expression did not retain immutable evidence at its invocation edge.');
    }
    const read = invocationEvidence == null
      ? this.evaluateExpressionRead(
          requestor,
          expression,
          source.evaluation.environment,
          source.moduleKey,
          host,
          depth + 1,
        )
      : new EvaluationRead(invocationEvidence.value, expression, invocationEvidence.openSeams);
    if (read.value == null) {
      return activationOpenForExpressionRead(read);
    }
    return read.value.kind === EvaluationValueKind.Unknown
      ? activationOpenWithPressure(read.value.reason, read.openSeams, null)
      : activationValueWithPressure(read.value, read.openSeams);
  }

  private activateSingletonReference(
    requestor: Container,
    resolver: Resolver,
    reference: RegistrationValueReference | null,
    key: ContainerLookupKey,
    dependencyNode: ts.Node,
  ): DiProviderActivationResult {
    const exact = this.view.evaluatedResolverState(resolver);
    const value = exact?.kind === EvaluationValueKind.Class
      ? exact
      : this.view.classValueForReference(reference);
    return value == null
      ? activationOpen('Aurelia singleton resolver value did not map to an evaluator class declaration.')
      : this.activateSingleton(requestor, resolver, value, key, dependencyNode);
  }

  private activateConstructableReference(
    requestor: Container,
    resolver: Resolver,
    reference: RegistrationValueReference | null,
    key: ContainerLookupKey,
    dependencyNode: ts.Node,
    cycleIdentity: object | null,
  ): DiProviderActivationResult {
    if (reference == null || !registrationValueKindCanConstruct(reference.valueKind)) {
      return activationOpen('Aurelia factory resolver did not retain a constructable source value.');
    }
    const exact = this.view.evaluatedResolverState(resolver);
    const value = exact?.kind === EvaluationValueKind.Class
      ? exact
      : this.view.classValueForReference(reference);
    return value == null
      ? activationOpen('Aurelia factory resolver value did not map to an evaluator class declaration.')
      : this.activateClass(requestor, value, key, dependencyNode, cycleIdentity);
  }

  private activateSingleton(
    requestor: Container,
    cycleIdentity: object,
    value: EvaluationClassValue,
    key: ContainerLookupKey,
    dependencyNode: ts.Node,
  ): DiProviderActivationResult {
    const cached = this.singletonValues.get(cycleIdentity);
    if (cached != null) {
      return cached;
    }
    if (this.activeSingletons.has(cycleIdentity)) {
      const repeatedIndex = this.frames.findIndex((frame) => frame.cycleIdentity === cycleIdentity);
      return new DiProviderActivationResult(
        DiProviderActivationState.Cycle,
        null,
        `Aurelia singleton resolver '${key.localName ?? key.identityHandle}' recursively re-entered activation.`,
        null,
        dependencyCycle(
          this.view,
          this.frames.slice(Math.max(0, repeatedIndex)),
          key,
          dependencyNode,
        ),
        [],
        null,
      );
    }
    this.activeSingletons.add(cycleIdentity);
    try {
      const result = this.activateClass(requestor, value, key, dependencyNode, cycleIdentity);
      if (result.state === DiProviderActivationState.Value && result.value != null) {
        this.singletonValues.set(cycleIdentity, result);
      }
      return result;
    } finally {
      this.activeSingletons.delete(cycleIdentity);
    }
  }

  private activateClass(
    requestor: Container,
    value: EvaluationClassValue,
    key: ContainerLookupKey,
    dependencyNode: ts.Node,
    cycleIdentity: object | null,
  ): DiProviderActivationResult {
    const frame: DiProviderActivationFrame = {
      cycleIdentity,
      keyName: key.localName ?? key.identityHandle,
      implementationName: value.declaration.name?.text ?? key.localName ?? key.identityHandle,
      entryNode: dependencyNode,
    };
    this.frames.push(frame);
    try {
      const source = this.view.sourceForClass(value);
      if (source == null) {
        return activationOpen('Aurelia provider class is outside the admitted static-evaluation graph.');
      }
      const dependencyPlan = this.classDependencies.planFor(value, requestor);
      if (dependencyPlan.abruptCompletion != null) {
        return activationOpenWithPressure(
          dependencyPlan.positionalReason
            ?? evaluationAbruptCompletionSummary(dependencyPlan.abruptCompletion),
          dependencyPlan.positionalOpenSeams,
          dependencyPlan.abruptCompletion,
        );
      }
      if (dependencyPlan.positionState === DiClassDependencyPositionState.Failed) {
        return activationFailedWithoutFrameworkCode(
          dependencyPlan.positionalReason
            ?? 'Aurelia provider class dependency metadata is not a runtime array.',
        );
      }
      if (dependencyPlan.positionState === DiClassDependencyPositionState.Open) {
        return activationOpenWithPressure(
          dependencyPlan.positionalReason
            ?? 'Aurelia provider class dependency metadata did not close.',
          dependencyPlan.positionalOpenSeams,
          null,
        );
      }

      const dependencyValues: EvaluationValue[] = [];
      const dependencyOpenSeams: EvaluationOpenSeam[] = [...dependencyPlan.positionalOpenSeams];
      for (const dependency of dependencyPlan.slots) {
        if (dependency.state === DiClassDependencySlotState.Hole) {
          dependencyValues.push(EvaluationUndefined);
          continue;
        }
        const evidence = dependency.evidence;
        if (evidence == null) {
          return activationOpenWithPressure(
            'Aurelia dependency planning retained a present position without runtime key evidence.',
            dependencyOpenSeams,
            null,
          );
        }
        if (
          evidence.openSeams.length > 0
          || evidence.value.kind === EvaluationValueKind.Unknown
        ) {
          return activationOpenWithPressure(
            evidence.value.kind === EvaluationValueKind.Unknown
              ? evidence.value.reason
              : 'Aurelia dependency key remained qualified by open evaluation pressure.',
            [...dependencyOpenSeams, ...evidence.openSeams],
            null,
          );
        }
        const expression = dependency.sourceExpression ?? dependency.carrierExpression;
        const activation = this.activatePreparedExpression(
          requestor,
          expression,
          evidence,
          expression,
          null,
          0,
        );
        dependencyOpenSeams.push(...activation.openSeams);
        if (
          activation.state === DiProviderActivationState.Cycle
          || activation.state === DiProviderActivationState.Failed
          || activation.abruptCompletion != null
        ) {
          return activationWithAdditionalPressure(activation, dependencyOpenSeams);
        }
        if (activation.state === DiProviderActivationState.Undefined) {
          dependencyValues.push(EvaluationUndefined);
          continue;
        }
        if (activation.state === DiProviderActivationState.Deferred) {
          dependencyValues.push(new EvaluationBoundaryObjectValue(
            EvaluationBoundaryKind.HostEnvironment,
            activation.reason ?? 'Aurelia deferred DI resolver result',
            new Map(),
            expression,
            true,
          ));
          continue;
        }
        if (activation.value != null) {
          dependencyValues.push(activation.value);
          continue;
        }
        return activationWithAdditionalPressure(
          activation.state === DiProviderActivationState.Open
            ? activation
            : activationOpen(
                activation.reason
                  ?? 'Aurelia dependency activation did not close to one runtime value.',
              ),
          dependencyOpenSeams,
        );
      }
      const read = this.withActiveRequestor(requestor, (): EvaluationRead<EvaluationValue> => {
        const result = this.evaluatorForSource(source).evaluateClassValueInstantiation(
          value,
          source.moduleKey,
          dependencyNode,
          dependencyValues,
        );
        return new EvaluationRead(
          result.value,
          dependencyNode,
          result.openSeams,
          result.abruptCompletion,
        );
      });
      if (this.detectedCycle != null) {
        return this.detectedCycle;
      }
      if (read.value == null) {
        return activationWithAdditionalPressure(
          activationOpenForExpressionRead(read),
          dependencyOpenSeams,
        );
      }
      return read.value.kind === EvaluationValueKind.Unknown
        ? activationOpenWithPressure(
            read.value.reason,
            [...dependencyOpenSeams, ...read.openSeams],
            null,
          )
        : activationValueWithPressure(
            read.value,
            [...dependencyOpenSeams, ...read.openSeams],
          );
    } finally {
      this.frames.pop();
    }
  }

  private activateFresh(
    requestor: Container,
    key: DiProviderActivationKey,
    dependencyNode: ts.Node,
    host: StaticIntrinsicEvaluationHost | null,
    depth: number,
  ): DiProviderActivationResult {
    const factory = this.factoryAvailable(requestor, key.key);
    if (factory.closure === DiProviderActivationLookupClosure.Open) {
      return activationOpen('Aurelia factory availability could not be ordered relative to this authored lookup.');
    }
    if (factory.present) {
      const value = key.classValue ?? this.view.classValueForKey(key.key);
      return value == null
        ? activationOpen('Aurelia found an explicit factory for the fresh-instance key, but the factory target remains opaque.')
        : this.activateClass(requestor, value, key.key, dependencyNode, null);
    }
    const answer = this.lookup(requestor, key.key);
    if (answer.closure === DiProviderActivationLookupClosure.Open) {
      return activationLookupOrderOpen();
    }
    if (answer.lookup != null) {
      const slot = answer.lookup.slots[0] ?? null;
      return slot == null
        ? activationOpen('Aurelia fresh-instance lookup found no resolver slot.')
        : this.activateFreshSlot(requestor, slot, answer.lookup.handler, key, dependencyNode, host, depth);
    }
    if (key.key.keyKind === ContainerLookupKeyKind.Interface) {
      return this.activateFreshInterfaceDefault(requestor, key, dependencyNode, host, depth);
    }
    const value = key.classValue ?? this.view.classValueForKey(key.key);
    return value == null
      ? activationFailed(
          ContainerResolutionFailureKind.UnableJitNonConstructor,
          `Aurelia key '${key.key.localName ?? key.key.identityHandle}' has no constructable factory for a fresh instance.`,
        )
      : this.activateClass(requestor, value, key.key, dependencyNode, null);
  }

  private activateFreshInterfaceDefault(
    requestor: Container,
    key: DiProviderActivationKey,
    dependencyNode: ts.Node,
    host: StaticIntrinsicEvaluationHost | null,
    depth: number,
  ): DiProviderActivationResult {
    const evaluation = aureliaInterfaceEvaluationForValue(key.sourceValue);
    if (evaluation == null) {
      return activationOpen('Aurelia fresh-instance interface identity was proven, but its createInterface evaluation metadata was unavailable.');
    }
    switch (evaluation.defaultRegistrationState) {
      case AureliaInterfaceDefaultRegistrationState.None:
        return activationFailed(
          ContainerResolutionFailureKind.InvalidNewInstanceOnInterface,
          `Aurelia interface '${evaluation.friendlyName}' has no registration or default implementation for fresh activation.`,
        );
      case AureliaInterfaceDefaultRegistrationState.Open:
        return activationOpen(`Aurelia interface '${evaluation.friendlyName}' has an open default registration, so fresh factory availability is not closed.`);
      case AureliaInterfaceDefaultRegistrationState.Closed:
        return this.activateFreshInterfaceEffect(
          requestor,
          key,
          evaluation.defaultRegistration!,
          dependencyNode,
          host,
          depth,
        );
    }
  }

  private activateFreshInterfaceEffect(
    requestor: Container,
    key: DiProviderActivationKey,
    effect: AureliaInterfaceDefaultRegistrationEffect,
    dependencyNode: ts.Node,
    host: StaticIntrinsicEvaluationHost | null,
    depth: number,
  ): DiProviderActivationResult {
    switch (effect.strategy) {
      case RegistrationStrategy.Singleton:
      case RegistrationStrategy.Transient:
        return effect.value.kind === EvaluationValueKind.Class
          ? this.activateClass(requestor, effect.value, key.key, dependencyNode, null)
          : activationOpen(`Aurelia interface default ${effect.strategy} factory target did not reduce to a class value.`);
      case RegistrationStrategy.AliasTo:
        return effect.valueExpression == null
          ? activationOpen('Aurelia interface default alias did not retain its target key expression for fresh activation.')
          : this.activateFresh(
              requestor,
              this.view.keyForExpression(effect.valueExpression, effect.value),
              dependencyNode,
              host,
              depth + 1,
            );
      case RegistrationStrategy.Instance:
      case RegistrationStrategy.Callback:
      case RegistrationStrategy.CachedCallback:
        return activationFailed(
          ContainerResolutionFailureKind.InvalidNewInstanceOnInterface,
          `Aurelia interface default ${effect.strategy} resolver does not expose a constructable factory.`,
        );
      case RegistrationStrategy.Unknown:
      case RegistrationStrategy.Defer:
      case RegistrationStrategy.Registry:
      case RegistrationStrategy.Resource:
      case RegistrationStrategy.PlainClassSelf:
      case RegistrationStrategy.RecursiveCarrier:
      case RegistrationStrategy.Resolver:
      case RegistrationStrategy.Array:
      case RegistrationStrategy.Factory:
      case RegistrationStrategy.FrameworkGroup:
        return activationOpen(`Aurelia interface default strategy '${effect.strategy}' does not close fresh factory availability.`);
    }
  }

  private activateFreshSlot(
    requestor: Container,
    slot: DiProviderActivationSlot,
    handler: Container,
    key: DiProviderActivationKey,
    dependencyNode: ts.Node,
    host: StaticIntrinsicEvaluationHost | null,
    depth: number,
  ): DiProviderActivationResult {
    if (slot instanceof DiInterfaceDefaultProvider) {
      return this.activateFreshInterfaceEffect(requestor, key, slot.effect, dependencyNode, host, depth);
    }
    if (slot instanceof DiJitProvider) {
      return this.activateClass(requestor, slot.classValue, key.key, dependencyNode, null);
    }
    if (slot instanceof DiScopedInstanceProvider || slot instanceof ContainerSelfResolverSlot) {
      return key.key.keyKind === ContainerLookupKeyKind.Interface
        ? activationFailed(
            ContainerResolutionFailureKind.InvalidNewInstanceOnInterface,
            'Aurelia fresh-instance interface resolution reached an instance provider without a constructable factory.',
          )
        : activationOpen('Aurelia fresh-instance resolution reached a provider without a modeled constructable factory.');
    }
    const resolver = slot instanceof ContainerResolverSlot ? slot.resolver : null;
    if (!(resolver instanceof Resolver)) {
      return activationOpen('Aurelia fresh-instance resolution reached a provider without a modeled constructable factory.');
    }
    const resolution = resolver.resolve(handler, requestor);
    switch (resolution.resolutionKind) {
      case ResolverResolutionKind.SingletonFactory:
      case ResolverResolutionKind.TransientFactory:
        return this.activateConstructableReference(requestor, resolver, resolution.value, key.key, dependencyNode, null);
      case ResolverResolutionKind.Alias: {
        const aliasKey = containerLookupKeyForRegistrationValue(resolution.value);
        if (aliasKey == null || this.activeAliases.has(resolver)) {
          return activationOpen('Aurelia fresh-instance alias lookup remained open or recursive.');
        }
        this.activeAliases.add(resolver);
        try {
          return this.activateFresh(requestor, { key: aliasKey, classValue: null, sourceValue: null }, dependencyNode, host, depth + 1);
        } finally {
          this.activeAliases.delete(resolver);
        }
      }
      case ResolverResolutionKind.Instance:
      case ResolverResolutionKind.Callback:
      case ResolverResolutionKind.CachedCallback:
        return key.key.keyKind === ContainerLookupKeyKind.Interface
          ? activationFailed(
              ContainerResolutionFailureKind.InvalidNewInstanceOnInterface,
              `Aurelia fresh-instance interface resolution reached a ${resolution.resolutionKind} provider without a constructable factory.`,
            )
          : activationOpen(`Aurelia fresh-instance resolution reached a ${resolution.resolutionKind} provider without a modeled constructable factory.`);
      case ResolverResolutionKind.Array:
      case ResolverResolutionKind.Open:
      case ResolverResolutionKind.InvalidStrategy:
        return activationOpen(`Aurelia fresh-instance resolution reached a ${resolution.resolutionKind} provider without a modeled constructable factory.`);
    }
  }

  private lookup(
    requestor: Container,
    key: ContainerLookupKey,
  ): DiProviderActivationLookupAnswer {
    let current: Container | null = requestor;
    while (current != null) {
      const local = this.lookupLocal(current, key);
      if (local.closure === DiProviderActivationLookupClosure.Open || local.lookup != null) {
        return local;
      }
      current = current.parent;
    }
    return closedLookup(null);
  }

  private factoryAvailable(
    requestor: Container,
    key: ContainerLookupKey,
  ): DiProviderActivationFactoryAnswer {
    let closure = DiProviderActivationLookupClosure.Closed;
    for (const slot of requestor.root.readFactorySlots()) {
      if (slot.keyIdentityHandle !== key.identityHandle) {
        continue;
      }
      const ordinal = this.view.executionOrdinalForFactorySlot(slot);
      if (this.activeExecutionOrdinal == null || ordinal === undefined || ordinal != null && ordinal <= this.activeExecutionOrdinal) {
        return { present: true, closure: DiProviderActivationLookupClosure.Closed };
      }
      if (ordinal == null) {
        closure = DiProviderActivationLookupClosure.Open;
      }
    }
    return { present: false, closure };
  }

  private factoryFailure(
    requestor: Container,
    key: ContainerLookupKey,
  ): ContainerResolutionFailureKind | null {
    const factory = this.factoryAvailable(requestor, key);
    if (factory.closure === DiProviderActivationLookupClosure.Open || factory.present) {
      return null;
    }
    const resolver = this.lookup(requestor, key);
    if (resolver.closure === DiProviderActivationLookupClosure.Open || resolver.lookup != null) {
      return null;
    }
    return key.keyKind === ContainerLookupKeyKind.Nullish
      ? null
      : containerFactoryFailureKind(key);
  }

  private lookupLocal(
    container: Container,
    key: ContainerLookupKey,
  ): DiProviderActivationLookupAnswer {
    const slots: DiProviderActivationSlot[] = [];
    let closure = DiProviderActivationLookupClosure.Closed;
    for (const slot of container.readResolverSlots(key.identityHandle)) {
      const ordinal = this.view.executionOrdinalForResolverSlot(slot);
      if (this.activeExecutionOrdinal == null || ordinal === undefined) {
        slots.push(slot);
      } else if (ordinal == null) {
        closure = DiProviderActivationLookupClosure.Open;
      } else if (ordinal <= this.activeExecutionOrdinal) {
        slots.push(slot);
      }
    }
    slots.push(...(this.overlaySlots.get(container)?.get(key.identityHandle) ?? []));
    const lookup = slots.length === 0 ? null : { handler: container, slots };
    return closure === DiProviderActivationLookupClosure.Open
      ? openLookup(lookup)
      : closedLookup(lookup);
  }

  private lookupAll(
    requestor: Container,
    key: ContainerLookupKey,
    searchAncestors: boolean,
  ): DiProviderActivationLookupSet {
    if (!searchAncestors) {
      const answer = this.lookup(requestor, key);
      return answer.closure === DiProviderActivationLookupClosure.Open
        ? openLookupSet(answer.lookup == null ? [] : [answer.lookup])
        : closedLookupSet(answer.lookup == null ? [] : [answer.lookup]);
    }
    const lookups: DiProviderActivationLookup[] = [];
    let closure = DiProviderActivationLookupClosure.Closed;
    let current: Container | null = requestor;
    while (current != null) {
      const local = this.lookupLocal(current, key);
      if (local.closure === DiProviderActivationLookupClosure.Open) {
        closure = DiProviderActivationLookupClosure.Open;
      }
      if (local.lookup != null) {
        lookups.push(local.lookup);
      }
      current = current.parent;
    }
    return closure === DiProviderActivationLookupClosure.Open
      ? openLookupSet(lookups)
      : closedLookupSet(lookups);
  }

  private lookupAllResources(
    requestor: Container,
    key: ContainerLookupKey,
  ): DiProviderActivationLookupSet {
    const local = this.lookupLocal(requestor, key);
    if (requestor === requestor.root) {
      return local.closure === DiProviderActivationLookupClosure.Open
        ? openLookupSet(local.lookup == null ? [] : [local.lookup])
        : closedLookupSet(local.lookup == null ? [] : [local.lookup]);
    }
    const root = this.lookupLocal(requestor.root, key);
    const lookups = local.lookup == null
      ? root.lookup == null ? [] : [root.lookup]
      : root.lookup == null ? [local.lookup] : [local.lookup, root.lookup];
    return local.closure === DiProviderActivationLookupClosure.Open
      || root.closure === DiProviderActivationLookupClosure.Open
      ? openLookupSet(lookups)
      : closedLookupSet(lookups);
  }

  private appendOverlaySlot(
    container: Container,
    keyIdentityHandle: IdentityHandle,
    slot: DiProviderActivationSlot,
  ): void {
    let byKey = this.overlaySlots.get(container);
    if (byKey == null) {
      byKey = new Map();
      this.overlaySlots.set(container, byKey);
    }
    const slots = byKey.get(keyIdentityHandle);
    if (slots == null) {
      byKey.set(keyIdentityHandle, [slot]);
    } else {
      slots.push(slot);
    }
  }

  private functionProperty(
    value: EvaluationValue,
    name: string,
  ): DiProviderActivationFunctionAnswer {
    const property = readStaticOwnProperty(value, name);
    if (property == null) {
      return {
        value: null,
        closure: DiProviderActivationLookupClosure.Closed,
      };
    }
    if (property.state === EvaluationObjectPropertyState.Open
      || property.value.kind === EvaluationValueKind.Unknown) {
      return {
        value: null,
        closure: DiProviderActivationLookupClosure.Open,
      };
    }
    return {
      value: property.value.kind === EvaluationValueKind.Function ? property.value : null,
      closure: DiProviderActivationLookupClosure.Closed,
    };
  }

  private readRegisterInRequestor(value: EvaluationValue): boolean | null {
    const registerInRequestor = readStaticOwnProperty(value, 'registerInRequestor');
    if (registerInRequestor == null) {
      return false;
    }
    if (registerInRequestor.state === EvaluationObjectPropertyState.Open
      || registerInRequestor.value.kind === EvaluationValueKind.Unknown) {
      return null;
    }
    if (registerInRequestor.value.kind !== EvaluationValueKind.Boolean || !registerInRequestor.value.value) {
      return false;
    }
    return true;
  }

  private evaluateExpressionRead(
    requestor: Container,
    expression: ts.Expression,
    environment: ModuleEnvironmentRecord,
    moduleKey: string,
    host: StaticIntrinsicEvaluationHost | null,
    depth: number,
  ): EvaluationRead<EvaluationValue> {
    return this.withActiveRequestor(requestor, () => {
      if (host != null) {
        return new EvaluationRead(
          host.evaluateExpression(expression, environment, moduleKey, depth + 1),
          expression,
        );
      }
      const result = this.evaluatorForModule(moduleKey).evaluateExpressionInEnvironment(
        expression,
        environment,
        moduleKey,
      );
      return new EvaluationRead(
        result.value,
        expression,
        result.openSeams,
        result.abruptCompletion,
      );
    });
  }

  private evaluatorForModule(moduleKey: string): StaticEvaluator {
    const source = this.view.sourceForClassEnvironment(moduleKey);
    return source == null
      ? new StaticEvaluator(undefined, this.internalRuntimeHost({}))
      : this.evaluatorForSource(source);
  }

  private evaluatorForSource(source: EvaluatedProjectSource): StaticEvaluator {
    const moduleKey = normalizeModuleKey(source.moduleKey);
    let evaluator = this.evaluatorsByModuleKey.get(moduleKey);
    if (evaluator == null) {
      evaluator = new StaticEvaluator(
        source.evaluation.policy,
        this.internalRuntimeHost(source.evaluation.runtimeHost),
      );
      this.evaluatorsByModuleKey.set(moduleKey, evaluator);
    }
    return evaluator;
  }

  private internalRuntimeHost(baseHost: StaticEvaluationRuntimeHost): StaticEvaluationRuntimeHost {
    let runtimeHost = this.internalRuntimeHosts.get(baseHost);
    if (runtimeHost != null) {
      return runtimeHost;
    }
    runtimeHost = this.runtimeHost(baseHost, () => this.activeRequestor);
    this.internalRuntimeHosts.set(baseHost, runtimeHost);
    return runtimeHost;
  }

  private runtimeHost(
    baseHost: StaticEvaluationRuntimeHost,
    readActiveContainer: () => Container | null,
  ): StaticEvaluationRuntimeHost {
    return delegateStaticEvaluationRuntimeHost(baseHost, (frame, host) => {
      if (
        frame.kind !== StaticInvocationKind.Call
        || !isAureliaResolveEvaluationFunction(frame.callee.value)
      ) {
        return StaticInvocationNotApplicable;
      }
      return staticInvocationValue(this.withActivation(() => {
        const requestor = readActiveContainer();
        if (requestor == null) {
          return host.unknown(
            'Aurelia resolve(...) has no active DI container (AUR0016).',
            frame.node,
            frame.moduleKey,
            EvaluationOpenSeamKind.DynamicCall,
          );
        }
        const arguments_ = frame.argumentList.exactEvidence();
        if (arguments_ == null) {
          return host.unknown(
            'Aurelia resolve(...) argument positions did not close.',
            frame.node,
            frame.moduleKey,
            EvaluationOpenSeamKind.DynamicCall,
          );
        }
        const values = arguments_.map((evidence, index) => {
          const keyExpression = frame.argumentList.elements[index]?.expression ?? frame.node;
          return this.valueForRuntimeHost(
            this.activatePreparedExpression(requestor, keyExpression, evidence, frame.node, host, frame.depth),
            keyExpression,
            frame.moduleKey,
            host,
          );
        });
        return values.length === 1
          ? values[0]!
          : new EvaluationArrayValue(
              values.map((value, index) => new EvaluationArrayElement(
                value,
                frame.argumentList.elements[index]?.expression ?? frame.node,
                [],
                index,
              )),
              frame.node,
              EvaluationArrayShape.exact(values.length),
            );
      }));
    });
  }

  private withActivation<TValue>(read: () => TValue): TValue {
    if (this.activationDepth === 0) {
      this.detectedCycle = null;
    }
    ++this.activationDepth;
    try {
      return read();
    } finally {
      --this.activationDepth;
    }
  }

  private withActiveRequestor<TValue>(requestor: Container | null, read: () => TValue): TValue {
    const previous = this.activeRequestor;
    this.activeRequestor = requestor;
    try {
      return read();
    } finally {
      this.activeRequestor = previous;
    }
  }

  private withExecutionOrdinal<TValue>(ordinal: number, read: () => TValue): TValue {
    const previous = this.activeExecutionOrdinal;
    this.activeExecutionOrdinal = ordinal;
    try {
      return read();
    } finally {
      this.activeExecutionOrdinal = previous;
    }
  }
}

function registryResolverReturnState(
  value: EvaluationValue,
): DiRegistryResolverReturnState {
  switch (value.kind) {
    case EvaluationValueKind.Unknown:
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.BoundaryValue:
      return DiRegistryResolverReturnState.Open;
    case EvaluationValueKind.Undefined:
    case EvaluationValueKind.Null:
    case EvaluationValueKind.Boolean:
    case EvaluationValueKind.Number:
    case EvaluationValueKind.BigInt:
    case EvaluationValueKind.String:
    case EvaluationValueKind.StringPattern:
      return DiRegistryResolverReturnState.Invalid;
    case EvaluationValueKind.Object:
    case EvaluationValueKind.Function:
    case EvaluationValueKind.Class:
    case EvaluationValueKind.Instance: {
      const resolve = readStaticOwnProperty(value, 'resolve');
      if (resolve == null) {
        if (value.kind === EvaluationValueKind.Object && value.mayHaveUnknownProperties) {
          return DiRegistryResolverReturnState.Open;
        }
        if (value.kind === EvaluationValueKind.Instance && value.mayHaveUnknownProperties) {
          return DiRegistryResolverReturnState.Open;
        }
        return value.kind === EvaluationValueKind.Function || value.kind === EvaluationValueKind.Class
          ? DiRegistryResolverReturnState.Open
          : DiRegistryResolverReturnState.Invalid;
      }
      if (resolve.state === EvaluationObjectPropertyState.Open
        || resolve.value.kind === EvaluationValueKind.Unknown) {
        return DiRegistryResolverReturnState.Open;
      }
      if (resolve.value.kind === EvaluationValueKind.Undefined
        || resolve.value.kind === EvaluationValueKind.Null) {
        return DiRegistryResolverReturnState.Invalid;
      }
      return resolve.value.kind === EvaluationValueKind.Function
        ? DiRegistryResolverReturnState.Valid
        : DiRegistryResolverReturnState.Open;
    }
    case EvaluationValueKind.Array:
    case EvaluationValueKind.Set:
    case EvaluationValueKind.Map:
    case EvaluationValueKind.RegularExpression:
    case EvaluationValueKind.Date:
    case EvaluationValueKind.ModuleNamespace:
    case EvaluationValueKind.Promise:
      return DiRegistryResolverReturnState.Invalid;
  }
}

function containerApiMethodValidatesKey(
  methodKind: DiContainerApiMethodKind,
): boolean {
  switch (methodKind) {
    case DiContainerApiMethodKind.Get:
    case DiContainerApiMethodKind.GetResolver:
    case DiContainerApiMethodKind.GetAll:
      return true;
    case DiContainerApiMethodKind.Has:
    case DiContainerApiMethodKind.GetFactory:
    case DiContainerApiMethodKind.Invoke:
      return false;
  }
}

function activationValue(value: EvaluationValue): DiProviderActivationResult {
  return activationValueWithPressure(value, []);
}

function activationValueWithPressure(
  value: EvaluationValue,
  openSeams: readonly EvaluationOpenSeam[],
): DiProviderActivationResult {
  return new DiProviderActivationResult(
    DiProviderActivationState.Value,
    value,
    null,
    null,
    null,
    openSeams,
    null,
  );
}

function activationWithAdditionalPressure(
  result: DiProviderActivationResult,
  openSeams: readonly EvaluationOpenSeam[],
): DiProviderActivationResult {
  if (openSeams.length === 0) {
    return result;
  }
  return new DiProviderActivationResult(
    result.state,
    result.value,
    result.reason,
    result.failureKind,
    result.cycle,
    [...openSeams, ...result.openSeams],
    result.abruptCompletion,
  );
}

function activationUndefined(): DiProviderActivationResult {
  return new DiProviderActivationResult(
    DiProviderActivationState.Undefined,
    EvaluationUndefined,
    null,
    null,
    null,
    [],
    null,
  );
}

function activationOpen(
  reason: string,
): DiProviderActivationResult {
  return activationOpenWithPressure(reason, [], null);
}

function activationOpenWithPressure(
  reason: string,
  openSeams: readonly EvaluationOpenSeam[],
  abruptCompletion: EvaluationExpressionAbruptCompletion | null,
): DiProviderActivationResult {
  return new DiProviderActivationResult(
    DiProviderActivationState.Open,
    null,
    reason,
    null,
    null,
    openSeams,
    abruptCompletion,
  );
}

function activationOpenForExpressionRead(
  read: EvaluationRead<EvaluationValue>,
): DiProviderActivationResult {
  return activationOpenWithPressure(
    read.abruptCompletion == null
      ? read.openSeams.map((seam) => seam.summary).join(' ') || 'Static expression evaluation did not produce a value.'
      : evaluationAbruptCompletionSummary(read.abruptCompletion),
    read.openSeams,
    read.abruptCompletion,
  );
}

function activationFailed(
  failureKind: ContainerResolutionFailureKind,
  reason: string,
): DiProviderActivationResult {
  return new DiProviderActivationResult(
    DiProviderActivationState.Failed,
    null,
    reason,
    failureKind,
    null,
    [],
    null,
  );
}

function activationFailedWithoutFrameworkCode(
  reason: string,
): DiProviderActivationResult {
  return new DiProviderActivationResult(
    DiProviderActivationState.Failed,
    null,
    reason,
    null,
    null,
    [],
    null,
  );
}

function activationLookupOrderOpen(): DiProviderActivationResult {
  return activationOpen('Aurelia DI resolver availability could not be ordered relative to this authored lookup.');
}

function closedLookup(lookup: DiProviderActivationLookup | null): DiProviderActivationLookupAnswer {
  return { lookup, closure: DiProviderActivationLookupClosure.Closed };
}

function openLookup(
  lookup: DiProviderActivationLookup | null = null,
): DiProviderActivationLookupAnswer {
  return { lookup, closure: DiProviderActivationLookupClosure.Open };
}

function closedLookupSet(lookups: readonly DiProviderActivationLookup[]): DiProviderActivationLookupSet {
  return { lookups, closure: DiProviderActivationLookupClosure.Closed };
}

function openLookupSet(
  lookups: readonly DiProviderActivationLookup[] = [],
): DiProviderActivationLookupSet {
  return { lookups, closure: DiProviderActivationLookupClosure.Open };
}

function registrationValueKindCanConstruct(valueKind: RegistrationValueKind): boolean {
  switch (valueKind) {
    case RegistrationValueKind.Constructable:
    case RegistrationValueKind.PlainClass:
    case RegistrationValueKind.StaticResourceType:
      return true;
    case RegistrationValueKind.Unknown:
    case RegistrationValueKind.Instance:
    case RegistrationValueKind.Callback:
    case RegistrationValueKind.CachedCallback:
    case RegistrationValueKind.AliasTarget:
    case RegistrationValueKind.Resolver:
    case RegistrationValueKind.Factory:
    case RegistrationValueKind.ResourceDefinition:
    case RegistrationValueKind.ResourceDefinitionConstraint:
    case RegistrationValueKind.Registry:
    case RegistrationValueKind.RecursiveCarrier:
    case RegistrationValueKind.FrameworkRegistration:
      return false;
  }
}

function dependencyCycle(
  view: DiProviderActivationView,
  frames: readonly DiProviderActivationFrame[],
  repeatedKey: ContainerLookupKey,
  repeatedEntryNode: ts.Node,
): readonly DiDependencyCycleStep[] {
  return frames.map((frame, index) => {
    const next = frames[index + 1] ?? null;
    const dependencyNode = next?.entryNode ?? repeatedEntryNode;
    return {
      keyName: frame.keyName,
      implementationName: frame.implementationName,
      dependencyKeyName: next?.keyName ?? repeatedKey.localName ?? repeatedKey.identityHandle,
      sourcePath: view.sourcePathForNode(dependencyNode),
    };
  });
}
