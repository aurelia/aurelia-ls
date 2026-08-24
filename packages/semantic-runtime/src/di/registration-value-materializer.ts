import ts from 'typescript';

import type { StaticInvocationIdentity } from '../evaluation/invocation.js';
import { evaluateStaticUnaryOperation } from '../evaluation/operators.js';
import type { StaticProjectEvaluationResult } from '../evaluation/project-evaluation.js';
import { StaticProjectEvaluationSourceIndex } from '../evaluation/project-source-index.js';
import { readReferenceName } from '../evaluation/ts-syntax.js';
import {
  EvaluationRuntimeIdentityIndex,
  evaluationValueHasRuntimeIdentity,
} from '../evaluation/value-relation.js';
import type {
  EvaluationArrayElement,
  EvaluationValue,
} from '../evaluation/values.js';
import { EvaluationValueKind } from '../evaluation/values.js';
import type { AddressHandle, ProductHandle, ProvenanceHandle } from '../kernel/handles.js';
import { MaterializedProduct } from '../kernel/materialization.js';
import type { OpenSeam } from '../kernel/open-seam.js';
import {
  compactFieldProvenance,
  FieldProvenance,
} from '../kernel/provenance.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import type { KernelStore, KernelStoreRecord } from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  frameworkRegistrationKindForAdmission,
  OpenRegistrationAdmission,
  ParameterizedRegistryAdmission,
  RegistrationAdmissionKind,
  RegistryRegistrationAdmission,
  RegistrationKeyRole,
  ResolverRegistrationAdmission,
  RegistrationStrategy,
  isResolverRegistrationStrategy,
  type RegistrationAdmissionField,
  type RegistrationAdmissionProduct,
} from '../registration/registration-admission.js';
import {
  registrationFactoryValueObservation,
  registrationKeyObservationForEvaluatedValue,
  evaluatedRegistrationFactoryArgument,
  type EvaluatedRegistrationFactory,
  type EvaluatedRegistrationFactoryContext,
} from '../registration/evaluated-registration-factory.js';
import {
  RegistrationEmissionContext,
  RegistrationEmissionScope,
  RegistrationKernelEmission,
  RegistrationKernelEmitter,
  type RegistrationValueSupportEmission,
} from '../registration/registration-kernel-emitter.js';
import {
  RegistrationAdmissionObservation,
  RegistrationCarrierKind,
  RegistrationRecognitionOpen,
  RegistrationValueObservation,
  type EvaluatedRegistrationCarrier,
} from '../registration/registration-observation.js';
import {
  evaluatedRegistryValueObservation,
  evaluatedValueLocalName,
  type EvaluatedRegistryValue,
} from '../registration/evaluated-registration-value.js';
import {
  RegistrationValueKind,
  type FrameworkRegistrationKind,
  type RegistrationKeyReference,
  type RegistrationValueReference,
} from '../registration/registration-reference.js';
import { projectEvaluatedRegistrationValue } from '../registration/evaluated-registration-projector.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import { enrichResourceRegistration } from '../resources/resource-registration-refinement.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  aureliaFrameworkRegistrationKindForEvaluationValue,
  aureliaRegistryBodyForEvaluationValue,
} from '../configuration/aurelia-evaluation-runtime.js';
import type { ConfigurationKernelEmission } from '../configuration/configuration-kernel-emitter.js';
import {
  classifyEvaluatedRegistrationValue,
  EvaluatedRegistrationClassificationKind,
  frameworkRegistrationKindForRegistrationEvidence,
} from '../registration/evaluated-registration-classifier.js';
import {
  resolverFieldProvenanceForRegistration,
  type DiRegistryPublicationMaterializer,
  type DiResolverPublicationMaterializer,
  type DiResolverPublication,
} from './world-publication.js';
import {
  ParameterizedRegistry,
  type RegistryField,
} from './registry.js';
import {
  Resolver,
  resolverStrategyForRegistrationStrategy,
} from './resolver.js';
import {
  DiRegistrationEvidenceAuthority,
  type DiRegistrationValueProduct,
} from './registration-value.js';

/** One canonical runtime registration value and the records newly published while reaching it. */
export class DiRegistrationValueMaterialization {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly product: DiRegistrationValueProduct | null,
    readonly openSeams: readonly OpenSeam[],
    readonly authority: DiRegistrationEvidenceAuthority,
    readonly frameworkRegistrationKind: FrameworkRegistrationKind | null,
    /** Stronger candidate-local dispatch shape, kept separate from the durable source admission product. */
    readonly dispatchAdmission: RegistrationAdmissionProduct | null = null,
  ) {}

  /** Exact dispatch evidence makes generic source-recognition pressure irrelevant to this application. */
  get closesAdmissionRecognition(): boolean {
    return this.authority === DiRegistrationEvidenceAuthority.Evaluation;
  }
}

class CanonicalDiRegistrationValue {
  constructor(
    readonly product: DiRegistrationValueProduct | null,
    readonly openSeams: readonly OpenSeam[],
    readonly authority: DiRegistrationEvidenceAuthority,
    readonly frameworkRegistrationKind: FrameworkRegistrationKind | null,
  ) {}

  reuse(): DiRegistrationValueMaterialization {
    return new DiRegistrationValueMaterialization(
      [],
      this.product,
      this.openSeams,
      this.authority,
      this.frameworkRegistrationKind,
    );
  }
}

interface RegistrationValueFacts {
  readonly sourceAddressHandle: AddressHandle | null;
  readonly provenanceHandle: ProvenanceHandle;
  readonly key: RegistrationKeyReference | null;
  readonly value: RegistrationValueReference | null;
  readonly registryParameters: readonly RegistrationValueReference[];
  readonly fieldProvenance: readonly FieldProvenance<RegistrationAdmissionField>[];
}

/**
 * Candidate-local bridge from source admissions and evaluator identity to reusable runtime registration values.
 *
 * Source admissions describe where a value entered registration flow. This materializer preserves the separate
 * ECMAScript object identity that Aurelia reuses across one or more container applications.
 */
export class DiRegistrationValueMaterializer {
  private readonly sourceIndex: StaticProjectEvaluationSourceIndex;
  private readonly registrationEmitter: RegistrationKernelEmitter;
  private readonly admissionProvenanceByProduct = new Map<ProductHandle, ProvenanceHandle>();
  private readonly factoryValues = new WeakMap<StaticInvocationIdentity, CanonicalDiRegistrationValue>();
  private readonly evaluatedValues = new EvaluationRuntimeIdentityIndex<CanonicalDiRegistrationValue>();
  private readonly resolverStatesByProduct = new Map<ProductHandle, EvaluationValue>();
  private readonly parameterElementsByProduct = new Map<ProductHandle, readonly EvaluationArrayElement[]>();
  private readonly parameterFactoriesByProduct = new Map<ProductHandle, EvaluatedRegistrationFactory>();
  private nextFactoryValueOrdinal = 0;
  private nextRegistryValueOrdinal = 0;
  private nextAdmissionValueOrdinal = 0;

  constructor(
    private readonly store: KernelStore,
    publication: KernelPublicationContext,
    configuration: ConfigurationKernelEmission,
    evaluation: StaticProjectEvaluationResult,
    private readonly typeSystem: TypeSystemProject,
    private readonly resourceDefinitions: ResourceDefinitionIndex | null,
    private readonly projectKey: string | null,
    private readonly resolverPublication: DiResolverPublicationMaterializer,
    private readonly registryPublication: DiRegistryPublicationMaterializer,
  ) {
    this.sourceIndex = new StaticProjectEvaluationSourceIndex(evaluation);
    this.registrationEmitter = new RegistrationKernelEmitter(store, publication);
    for (const record of configuration.records) {
      if (record instanceof MaterializedProduct) {
        this.admissionProvenanceByProduct.set(record.handle, record.provenanceHandle);
      }
    }
  }

  materialize(
    admission: RegistrationAdmissionProduct,
    carrier: EvaluatedRegistrationCarrier | null,
  ): DiRegistrationValueMaterialization {
    const runtimeValue = carrier?.value ?? null;
    const classification = classifyEvaluatedRegistrationValue(runtimeValue);
    if (classification?.kind === EvaluatedRegistrationClassificationKind.RegistrationFactory) {
      return this.materializeEvaluatedFactory(
        admission,
        classification.value,
        classification.evaluation,
      );
    }
    if (
      classification?.kind === EvaluatedRegistrationClassificationKind.Registry
      && evaluationValueHasRuntimeIdentity(classification.value)
    ) {
      const existing = this.evaluatedValues.read(classification.value);
      if (existing != null) {
        return existing.reuse();
      }
      const materialized = this.materializeEvaluatedRegistry(
        admission,
        carrier!.sourceNode,
        classification.value,
      );
      const retained = new CanonicalDiRegistrationValue(
        materialized.product,
        materialized.openSeams,
        materialized.authority,
        materialized.frameworkRegistrationKind,
      );
      this.evaluatedValues.retain(classification.value, retained);
      return materialized;
    }
    if (
      classification?.kind === EvaluatedRegistrationClassificationKind.Interface
      || classification?.kind === EvaluatedRegistrationClassificationKind.PlainClass
    ) {
      if (admission instanceof OpenRegistrationAdmission && carrier != null) {
        const refined = this.materializeEvaluatedAdmissionRefinement(admission, carrier);
        if (refined != null) {
          return refined;
        }
      }
      // Direct source carriers have already been lowered into resolver admission facts.
      return this.materializeAdmissionValue(
        admission,
        DiRegistrationEvidenceAuthority.Evaluation,
        frameworkRegistrationKindForRegistrationEvidence(admission, carrier),
      );
    }

    if (carrier != null) {
      return new DiRegistrationValueMaterialization(
        [],
        null,
        [],
        DiRegistrationEvidenceAuthority.Evaluation,
        frameworkRegistrationKindForRegistrationEvidence(admission, carrier),
      );
    }
    return this.materializeAdmissionValue(admission);
  }

  evaluatedResolverState(resolver: Resolver): EvaluationValue | null {
    return this.resolverStatesByProduct.get(resolver.productHandle) ?? null;
  }

  private materializeEvaluatedAdmissionRefinement(
    admission: OpenRegistrationAdmission,
    carrier: EvaluatedRegistrationCarrier,
  ): DiRegistrationValueMaterialization | null {
    if (!ts.isExpression(carrier.sourceNode)) {
      return null;
    }
    const source = this.sourceIndex.readEvaluatedForNode(carrier.sourceNode);
    if (source == null) {
      return null;
    }
    const projectionContext: EvaluatedRegistrationFactoryContext = {
      sourceFileAddressHandleForNode: (node) => this.sourceIndex.addressHandleForNode(node),
      registrationKeyObservationForValue: (expression, value) =>
        registrationKeyObservationForEvaluatedValue(
          expression,
          value,
          (node) => this.sourceIndex.addressHandleForNode(node),
        ),
    };
    const projected = projectEvaluatedRegistrationValue(
      projectionContext,
      carrier.sourceNode,
      carrier.value,
      [],
      admission.admissionKind,
      admission.carrierKind,
    );
    if (projected?.length !== 1) {
      return null;
    }
    const observation = enrichResourceRegistration(
      projected[0]!,
      { typeSystem: this.typeSystem },
      this.resourceDefinitions,
    );
    const local = [
      'di-registration-refinement',
      this.nextAdmissionValueOrdinal++,
      admission.productHandle,
    ].join(':');
    const refinement = this.registrationEmitter.materializeAdmissionRefinement(
      new RegistrationEmissionContext(
        source.sourceFile,
        source.moduleKey,
        source.admission.addressHandle,
        (node) => this.sourceIndex.addressHandleForNode(node),
        this.projectKey,
        this.typeSystem,
        RegistrationEmissionScope.DiRegistrationOperation,
        local,
      ),
      admission,
      observation,
      local,
    );
    return this.materializeFacts(
      refinement.admission,
      observation.strategy,
      factsForSupport(refinement.support),
      local,
      refinement.records,
      refinement.openSeams,
      DiRegistrationEvidenceAuthority.Evaluation,
      frameworkRegistrationKindForRegistrationEvidence(refinement.admission, carrier),
      refinement.admission,
    );
  }

  evaluatedRegistryParameterElements(registry: ParameterizedRegistry): readonly EvaluationArrayElement[] {
    return this.parameterElementsByProduct.get(registry.productHandle) ?? [];
  }

  parameterizedRegistrySource(registry: ParameterizedRegistry): ts.Node | null {
    return this.parameterFactoriesByProduct.get(registry.productHandle)?.sourceNode ?? null;
  }

  materializeParameterizedRegistryParameterAdmissions(
    registry: ParameterizedRegistry,
    ownerKey: string,
  ): RegistrationKernelEmission {
    const factory = this.parameterFactoriesByProduct.get(registry.productHandle) ?? null;
    if (factory == null) {
      return new RegistrationKernelEmission([], [], new Map(), new Map(), new Map(), new Map());
    }
    const context: EvaluatedRegistrationFactoryContext = {
      sourceFileAddressHandleForNode: (node) => this.sourceIndex.addressHandleForNode(node),
      registrationKeyObservationForValue: (expression, value) =>
        registrationKeyObservationForEvaluatedValue(
          expression,
          value,
          (node) => this.sourceIndex.addressHandleForNode(node),
        ),
    };
    const observations: RegistrationAdmissionObservation[] = [];
    for (const element of this.evaluatedRegistryParameterElements(registry)) {
      const carrier = element.expression ?? factory.sourceNode;
      if (element.openSeams.length > 0) {
        observations.push(openParameterizedRegistryParameter(
          carrier,
          element.value,
          element.openSeams.map((seam) => new RegistrationRecognitionOpen(
            KernelVocabulary.Registration.OpenValueExpression.key,
            seam.summary,
            seam.node ?? carrier,
            seam.reasonKinds,
          )),
        ));
        continue;
      }

      const typeOf = evaluateStaticUnaryOperation('typeof', element.value, carrier);
      if (typeOf?.kind !== EvaluationValueKind.String) {
        observations.push(openParameterizedRegistryParameter(
          carrier,
          element.value,
          [new RegistrationRecognitionOpen(
            KernelVocabulary.Registration.OpenValueExpression.key,
            'ParameterizedRegistry fallback could not determine whether this parameter passes the runtime object filter.',
            carrier,
          )],
        ));
        continue;
      }
      if (typeOf.value !== 'object' || element.value.kind === EvaluationValueKind.Null) {
        continue;
      }

      const projected = projectEvaluatedRegistrationValue(
        context,
        carrier,
        element.value,
        [],
        RegistrationAdmissionKind.ParameterizedRegistryParameter,
        RegistrationCarrierKind.ParameterizedRegistryParameter,
      );
      observations.push(...(projected ?? [openParameterizedRegistryParameter(
        carrier,
        element.value,
        [new RegistrationRecognitionOpen(
          KernelVocabulary.Registration.OpenStrategy.key,
          'Object parameter reached ParameterizedRegistry fallback but did not close to Aurelia registration dispatch.',
          carrier,
        )],
      )]));
    }

    const records: KernelStoreRecord[] = [];
    const admissions: RegistrationAdmissionProduct[] = [];
    const evaluatedCarriersByAdmissionProduct = new Map<ProductHandle, EvaluatedRegistrationCarrier>();
    const sourceNodesByAdmissionProduct = new Map<ProductHandle, ts.Node>();
    const runtimeValueSourceNodesByAdmissionProduct = new Map<ProductHandle, ts.Node>();
    const openSeamsByAdmissionProduct = new Map<ProductHandle, readonly OpenSeam[]>();
    observations.forEach((observation, index) => {
      const source = this.sourceIndex.readEvaluatedForNode(observation.sourceNode)
        ?? this.sourceIndex.readEvaluatedForNode(factory.sourceNode);
      if (source == null) {
        throw new Error('Reached ParameterizedRegistry parameter must belong to an admitted project source.');
      }
      const emission = this.registrationEmitter.materialize(
        new RegistrationEmissionContext(
          source.sourceFile,
          source.moduleKey,
          source.admission.addressHandle,
          (node) => this.sourceIndex.addressHandleForNode(node),
          this.projectKey,
          this.typeSystem,
          RegistrationEmissionScope.DiRegistrationOperation,
          `${ownerKey}:parameter:${index}`,
        ),
        [observation],
      );
      records.push(...emission.records);
      admissions.push(...emission.admissions);
      for (const [productHandle, value] of emission.evaluatedCarriersByAdmissionProduct) {
        evaluatedCarriersByAdmissionProduct.set(productHandle, value);
      }
      for (const [productHandle, node] of emission.sourceNodesByAdmissionProduct) {
        sourceNodesByAdmissionProduct.set(productHandle, node);
      }
      for (const [productHandle, node] of emission.runtimeValueSourceNodesByAdmissionProduct) {
        runtimeValueSourceNodesByAdmissionProduct.set(productHandle, node);
      }
      for (const [productHandle, seams] of emission.openSeamsByAdmissionProduct) {
        openSeamsByAdmissionProduct.set(productHandle, seams);
      }
    });
    return new RegistrationKernelEmission(
      admissions,
      records,
      evaluatedCarriersByAdmissionProduct,
      sourceNodesByAdmissionProduct,
      runtimeValueSourceNodesByAdmissionProduct,
      openSeamsByAdmissionProduct,
    );
  }

  private materializeEvaluatedFactory(
    admission: RegistrationAdmissionProduct,
    runtimeValue: EvaluationValue,
    factory: EvaluatedRegistrationFactory,
  ): DiRegistrationValueMaterialization {
    const existing = this.factoryValues.get(factory.invocationIdentity);
    if (existing != null) {
      return existing.reuse();
    }

    const local = [
      'di-registration-value',
      'factory',
      this.nextFactoryValueOrdinal++,
      admission.productHandle,
    ].join(':');
    const facts = this.materializeEvaluatedFactoryFacts(runtimeValue, factory, local);
    const materialized = this.materializeFacts(
      admission,
      factory.shape.strategy,
      facts,
      local,
      facts.records,
      facts.openSeams,
      DiRegistrationEvidenceAuthority.Evaluation,
      null,
    );
    const retained = new CanonicalDiRegistrationValue(
      materialized.product,
      materialized.openSeams,
      materialized.authority,
      materialized.frameworkRegistrationKind,
    );
    this.factoryValues.set(factory.invocationIdentity, retained);
    if (materialized.product != null) {
      const valueArgumentIndex = factory.shape.value?.argumentIndex ?? null;
      if (materialized.product instanceof Resolver && valueArgumentIndex != null) {
        const state = evaluatedRegistrationFactoryArgument(factory, valueArgumentIndex);
        if (state != null) {
          this.resolverStatesByProduct.set(materialized.product.productHandle, state);
        }
      }
      if (materialized.product instanceof ParameterizedRegistry) {
        this.parameterFactoriesByProduct.set(materialized.product.productHandle, factory);
        this.parameterElementsByProduct.set(
          materialized.product.productHandle,
          factory.argumentList.elements
            .filter((element) => element.runtimeIndex != null && element.runtimeIndex >= 1)
            .sort((left, right) => left.runtimeIndex! - right.runtimeIndex!),
        );
      }
    }
    return materialized;
  }

  private materializeEvaluatedRegistry(
    admission: RegistrationAdmissionProduct,
    carrier: ts.Node,
    runtimeValue: EvaluatedRegistryValue,
  ): DiRegistrationValueMaterialization {
    const context = {
      sourceFileAddressHandleForNode: (node: ts.Node) =>
        this.sourceIndex.addressHandleForNode(node),
    };
    const frameworkKind = aureliaFrameworkRegistrationKindForEvaluationValue(runtimeValue);
    const evaluatedObservation = evaluatedRegistryValueObservation(
      context,
      carrier,
      runtimeValue,
      frameworkKind,
      aureliaRegistryBodyForEvaluationValue(runtimeValue),
      evaluatedValueLocalName(runtimeValue),
    );
    const valueObservation = retainSourceProductProjection(
      evaluatedObservation,
      admission,
      frameworkKind,
    );
    const source = this.sourceIndex.readEvaluatedForNode(valueObservation.node)
      ?? this.sourceIndex.readEvaluatedForNode(carrier);
    if (source == null) {
      return new DiRegistrationValueMaterialization(
        [],
        null,
        [],
        DiRegistrationEvidenceAuthority.Evaluation,
        frameworkKind,
      );
    }
    const local = [
      'di-registration-value',
      'registry',
      this.nextRegistryValueOrdinal++,
      admission.productHandle,
    ].join(':');
    const support = this.registrationEmitter.materializeValueSupport(
      new RegistrationEmissionContext(
        source.sourceFile,
        source.moduleKey,
        source.admission.addressHandle,
        (node) => this.sourceIndex.addressHandleForNode(node),
        this.projectKey,
        this.typeSystem,
      ),
      new RegistrationAdmissionObservation(
        RegistrationCarrierKind.RegistryRegisterMethod,
        admission.admissionKind,
        RegistrationStrategy.Registry,
        RegistrationKeyRole.Unknown,
        carrier,
        null,
        valueObservation,
      ),
      local,
    );
    const materialized = this.materializeFacts(
      admission,
      RegistrationStrategy.Registry,
      factsForSupport(support),
      local,
      support.records,
      support.openSeams,
      DiRegistrationEvidenceAuthority.Evaluation,
      frameworkKind,
    );
    return materialized;
  }

  private materializeFacts(
    admission: RegistrationAdmissionProduct,
    strategy: RegistrationStrategy,
    facts: RegistrationValueFacts,
    local: string,
    supportRecords: readonly KernelStoreRecord[] = [],
    supportOpenSeams: readonly OpenSeam[] = [],
    authority: DiRegistrationEvidenceAuthority,
    frameworkKind: FrameworkRegistrationKind | null,
    dispatchAdmission: RegistrationAdmissionProduct | null = null,
  ): DiRegistrationValueMaterialization {
    if (isResolverRegistrationStrategy(strategy)) {
      const resolverStrategy = resolverStrategyForRegistrationStrategy(strategy);
      if (facts.key?.identityHandle == null || resolverStrategy == null) {
        return new DiRegistrationValueMaterialization(
          supportRecords,
          null,
          supportOpenSeams,
          authority,
          frameworkKind,
          dispatchAdmission,
        );
      }
      const publication: DiResolverPublication = {
        ownerIdentityHandle: admission.identityHandle,
        key: facts.key,
        keyIdentityHandle: facts.key.identityHandle,
        strategy: resolverStrategy,
        state: facts.value,
        sourceAddressHandle: facts.sourceAddressHandle,
        fieldProvenance: resolverFieldProvenanceForRegistration(facts.fieldProvenance),
      };
      const emitted = this.resolverPublication.recordsForCanonicalResolver(
        publication,
        local,
        facts.provenanceHandle,
      );
      return new DiRegistrationValueMaterialization(
        [...supportRecords, ...emitted.records],
        emitted.resolver,
        supportOpenSeams,
        authority,
        frameworkKind,
        dispatchAdmission,
      );
    }

    if (strategy === RegistrationStrategy.Defer) {
      if (facts.key == null) {
        return new DiRegistrationValueMaterialization(
          supportRecords,
          null,
          supportOpenSeams,
          authority,
          frameworkKind,
          dispatchAdmission,
        );
      }
      const emitted = this.registryPublication.recordsForCanonicalParameterizedRegistry(
        facts.key,
        facts.registryParameters,
        facts.sourceAddressHandle,
        registryFieldProvenanceForRegistration(facts.fieldProvenance),
        admission.identityHandle,
        local,
        facts.provenanceHandle,
      );
      return new DiRegistrationValueMaterialization(
        [...supportRecords, ...emitted.records],
        emitted.registry,
        supportOpenSeams,
        authority,
        frameworkKind,
        dispatchAdmission,
      );
    }

    if (strategy === RegistrationStrategy.Registry) {
      const emitted = this.registryPublication.recordsForCanonicalRegistry(
        facts.value,
        facts.sourceAddressHandle,
        registryFieldProvenanceForRegistration(facts.fieldProvenance),
        admission.identityHandle,
        local,
        facts.provenanceHandle,
      );
      return new DiRegistrationValueMaterialization(
        [...supportRecords, ...emitted.records],
        emitted.registry,
        supportOpenSeams,
        authority,
        frameworkKind,
        dispatchAdmission,
      );
    }

    return new DiRegistrationValueMaterialization(
      supportRecords,
      null,
      supportOpenSeams,
      authority,
      frameworkKind,
      dispatchAdmission,
    );
  }

  private materializeAdmissionValue(
    admission: RegistrationAdmissionProduct,
    authority: DiRegistrationEvidenceAuthority = DiRegistrationEvidenceAuthority.Admission,
    frameworkKind: FrameworkRegistrationKind | null = frameworkRegistrationKindForAdmission(admission),
  ): DiRegistrationValueMaterialization {
    let strategy: RegistrationStrategy;
    if (admission instanceof ResolverRegistrationAdmission) {
      strategy = admission.strategy;
    } else if (admission instanceof ParameterizedRegistryAdmission) {
      strategy = RegistrationStrategy.Defer;
    } else if (admission instanceof RegistryRegistrationAdmission) {
      strategy = RegistrationStrategy.Registry;
    } else {
      return new DiRegistrationValueMaterialization(
        [],
        null,
        [],
        authority,
        frameworkKind,
      );
    }
    const local = [
      'di-registration-value',
      'admission',
      this.nextAdmissionValueOrdinal++,
      admission.productHandle,
    ].join(':');
    return this.materializeFacts(
      admission,
      strategy,
      this.factsForAdmission(admission),
      local,
      [],
      [],
      authority,
      frameworkKind,
    );
  }

  private materializeEvaluatedFactoryFacts(
    runtimeValue: EvaluationValue,
    factory: EvaluatedRegistrationFactory,
    local: string,
  ): RegistrationValueFacts & {
    readonly records: readonly KernelStoreRecord[];
    readonly openSeams: readonly OpenSeam[];
  } {
    const source = this.sourceIndex.readEvaluatedForNode(factory.sourceNode);
    if (source == null) {
      throw new Error('Reached Registration.* evaluator metadata must belong to an admitted project source.');
    }
    const context: EvaluatedRegistrationFactoryContext = {
      sourceFileAddressHandleForNode: (node) => this.sourceIndex.addressHandleForNode(node),
      registrationKeyObservationForValue: (expression, value) =>
        registrationKeyObservationForEvaluatedValue(
          expression,
          value,
          (node) => this.sourceIndex.addressHandleForNode(node),
        ),
    };
    const support = this.registrationEmitter.materializeValueSupport(
      new RegistrationEmissionContext(
        source.sourceFile,
        source.moduleKey,
        source.admission.addressHandle,
        (node) => this.sourceIndex.addressHandleForNode(node),
        this.projectKey,
        this.typeSystem,
      ),
      registrationFactoryValueObservation(context, runtimeValue, factory),
      local,
    );
    return factsForSupport(support);
  }

  private factsForAdmission(admission: RegistrationAdmissionProduct): RegistrationValueFacts {
    const provenanceHandle = this.admissionProvenanceByProduct.get(admission.productHandle);
    if (provenanceHandle == null) {
      throw new Error(`Registration admission ${admission.productHandle} has no materialized-product provenance.`);
    }
    if (admission instanceof ResolverRegistrationAdmission) {
      return {
        sourceAddressHandle: admission.sourceAddressHandle,
        provenanceHandle,
        key: admission.targetKey,
        value: admission.registeredValue,
        registryParameters: [],
        fieldProvenance: admission.fieldProvenance,
      };
    }
    if (admission instanceof ParameterizedRegistryAdmission) {
      return {
        sourceAddressHandle: admission.sourceAddressHandle,
        provenanceHandle,
        key: admission.registryLookupKey,
        value: null,
        registryParameters: admission.registryParameters,
        fieldProvenance: admission.fieldProvenance,
      };
    }
    if (admission instanceof RegistryRegistrationAdmission) {
      return {
        sourceAddressHandle: admission.sourceAddressHandle,
        provenanceHandle,
        key: null,
        value: admission.registryValue,
        registryParameters: [],
        fieldProvenance: admission.fieldProvenance,
      };
    }
    throw new Error('Only resolver and registry admissions can materialize reusable DI registration values.');
  }
}

function retainSourceProductProjection(
  evaluated: RegistrationValueObservation,
  admission: RegistrationAdmissionProduct,
  frameworkKind: FrameworkRegistrationKind | null,
): RegistrationValueObservation {
  if (!(admission instanceof RegistryRegistrationAdmission)) {
    return evaluated;
  }
  const sourceValue = admission.registryValue;
  if (
    sourceValue?.productHandle == null
    || sourceValue.frameworkKind !== frameworkKind
  ) {
    return evaluated;
  }
  return evaluated.withProductProjection(
    evaluated.valueKind,
    evaluated.localName,
    sourceValue.productHandle,
    frameworkKind,
  );
}

function factsForSupport(
  support: RegistrationValueSupportEmission,
): RegistrationValueFacts & {
  readonly records: readonly KernelStoreRecord[];
  readonly openSeams: readonly OpenSeam[];
} {
  return {
    records: support.records,
    sourceAddressHandle: support.sourceAddressHandle,
    provenanceHandle: support.sourceProvenanceHandle,
    key: support.key,
    value: support.value,
    registryParameters: support.registryParameters,
    fieldProvenance: support.fieldProvenance,
    openSeams: support.openSeams,
  };
}

function registryFieldProvenanceForRegistration(
  provenance: readonly FieldProvenance<RegistrationAdmissionField>[],
): readonly FieldProvenance<RegistryField>[] {
  return compactFieldProvenance<RegistryField>(provenance.map((entry) => {
    switch (entry.field) {
      case 'targetKey':
        return new FieldProvenance('key', entry.provenanceHandle);
      case 'registeredValue':
        return new FieldProvenance('registryValue', entry.provenanceHandle);
      case 'registryParameters':
        return new FieldProvenance('params', entry.provenanceHandle);
      case 'source':
        return new FieldProvenance('source', entry.provenanceHandle);
      case 'admissionKind':
      case 'strategy':
      case 'keyRole':
      case 'resourceLookupNameOverride':
        return null;
    }
  }));
}

function openParameterizedRegistryParameter(
  carrier: ts.Expression,
  value: EvaluationValue,
  openSeams: readonly RegistrationRecognitionOpen[],
): RegistrationAdmissionObservation {
  return new RegistrationAdmissionObservation(
    RegistrationCarrierKind.ParameterizedRegistryParameter,
    RegistrationAdmissionKind.ParameterizedRegistryParameter,
    RegistrationStrategy.Unknown,
    RegistrationKeyRole.Unknown,
    carrier,
    null,
    new RegistrationValueObservation(
      RegistrationValueKind.Unknown,
      readReferenceName(carrier),
      carrier,
      false,
      null,
      null,
      null,
      null,
      null,
      null,
      value,
    ),
    [],
    openSeams,
    null,
    value,
  );
}
