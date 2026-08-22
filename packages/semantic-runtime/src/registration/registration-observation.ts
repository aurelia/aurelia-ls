import type ts from 'typescript';
import type { EvaluationValue } from '../evaluation/values.js';
import type {
  AddressHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { OpenSeamReasonKind } from '../kernel/open-seam.js';
import type { OpenSeamKindKey } from '../kernel/vocabulary.js';
import type {
  RegistrationAdmissionKind,
  RegistrationKeyRole,
  RegistrationStrategy,
} from './registration-admission.js';
import type {
  FrameworkRegistrationKind,
  RegistryBodyReference,
  RegistrationValueKind,
} from './registration-reference.js';
import type { ResourceDefinitionKind } from '../resources/resource-kind.js';

/** Evaluator-owned constructable declaration source used when no TypeChecker epoch is available. */
export class EvaluatedRegistrationKeyDeclarationSource {
  constructor(
    readonly declaration: ts.ClassLikeDeclaration | ts.FunctionLikeDeclaration,
    readonly moduleKey: string,
    readonly sourceFileAddressHandle: AddressHandle | null,
  ) {}
}

export const enum RegistrationCarrierKind {
  /** Call to `Registration.instance`, `singleton`, `transient`, `callback`, `cachedCallback`, `aliasTo`, or `defer`. */
  RegistrationFactoryCall = 'registration-factory-call',
  /** Call to `container.register(...)`. */
  ContainerRegisterCall = 'container-register-call',
  /** Call to `aurelia.register(...)`. */
  AureliaRegisterCall = 'aurelia-register-call',
  /** Implicit registration performed by the browser `aurelia` facade's default constructor/container. */
  AureliaFacadeDefault = 'aurelia-facade-default',
  /** Body or declaration of an `IRegistry.register(container, ...params)` method. */
  RegistryRegisterMethod = 'registry-register-method',
  /** Runtime resource definition registration path. */
  ResourceDefinitionRegister = 'resource-definition-register',
  /** Static `$au` resource class admitted by container registration. */
  StaticResourceAdmission = 'static-resource-admission',
  /** Plain class fallback admitted by container registration. */
  PlainClassAdmission = 'plain-class-admission',
  /** One member admitted from an array, object, or module-map registration carrier. */
  RecursiveCarrierEntry = 'recursive-carrier-entry',
  /** Object parameter admitted by the fallback branch of a ParameterizedRegistry application. */
  ParameterizedRegistryParameter = 'parameterized-registry-parameter',
}

export const enum RegistrationKeyObservationKind {
  /** Source expression observed without a closed runtime key shape. */
  Expression = 'expression',
  /** Evaluator-proven constructable key accepted by Aurelia's container JIT path. */
  Constructable = 'constructable',
}

/** Source-level key expression observed before kernel identity materialization. */
export class RegistrationKeyObservation {
  constructor(
    /** Best local name, literal preview, or property name for the key. */
    readonly localName: string | null,
    /** Source node that produced the key expression. */
    readonly node: ts.Expression,
    /** Runtime key-shape evidence available before kernel identity materialization. */
    readonly observationKind: RegistrationKeyObservationKind = RegistrationKeyObservationKind.Expression,
    /** Declaration source for evaluator-proven constructable keys. */
    readonly constructableSource: EvaluatedRegistrationKeyDeclarationSource | null = null,
    /** Evaluator value used to recover primitive-value and object identity across import aliases. */
    readonly evaluatedValue: EvaluationValue | null = null,
    /** Source-file address when the key expression belongs to another admitted module. */
    readonly sourceFileAddressHandle: AddressHandle | null = null,
  ) {}
}

/** Source-level value expression observed before kernel identity or product materialization. */
export class RegistrationValueObservation {
  constructor(
    /** Classified value lane when recognition can tell what sort of value was supplied. */
    readonly valueKind: RegistrationValueKind,
    /** Best local name, literal preview, or property name for the value. */
    readonly localName: string | null,
    /** Source node that produced the value expression. */
    readonly node: ts.Node,
    /** Whether the node is an actual declaration/name site rather than only a reference expression. */
    readonly isDeclaration: boolean,
    /** Product handle when another layer already materialized this value. */
    readonly productHandle: ProductHandle | null = null,
    /** Known framework registration effect package, when the source value is recognized. */
    readonly frameworkKind: FrameworkRegistrationKind | null = null,
    /** Source-file address when the value node belongs to another admitted module. */
    readonly sourceFileAddressHandle: AddressHandle | null = null,
    /** Module key that owns the value declaration when it differs from the recognizing module. */
    readonly moduleKey: string | null = null,
    /** Known registry-body semantics, when an IRegistry value was produced by a framework registry factory. */
    readonly registryBody: RegistryBodyReference | null = null,
    /** Key semantics when this value is itself a DI key, such as an alias target. */
    readonly keyObservation: RegistrationKeyObservation | null = null,
    /** Candidate-local evaluator value retained for later execution without entering kernel records. */
    readonly evaluatedValue: EvaluationValue | null = null,
    /** Possible canonical runtime resource keys when a define-call result is resource-only but not fully converged. */
    readonly resourceLookupKeys: readonly string[] = [],
    /** Resource registration kind retained even when a dynamic name prevents exact key materialization. */
    readonly resourceKind: ResourceDefinitionKind | null = null,
  ) {}

  /** Preserve the source/evaluator witness while another layer attaches a materialized product projection. */
  withProductProjection(
    valueKind: RegistrationValueKind,
    localName: string | null,
    productHandle: ProductHandle | null,
    frameworkKind: FrameworkRegistrationKind | null,
    resourceLookupKeys: readonly string[] = this.resourceLookupKeys,
    resourceKind: ResourceDefinitionKind | null = this.resourceKind,
  ): RegistrationValueObservation {
    return new RegistrationValueObservation(
      valueKind,
      localName,
      this.node,
      this.isDeclaration,
      productHandle,
      frameworkKind,
      this.sourceFileAddressHandle,
      this.moduleKey,
      this.registryBody,
      this.keyObservation,
      this.evaluatedValue,
      resourceLookupKeys,
      resourceKind,
    );
  }
}

/** Explicit unresolved pressure from registration recognition. */
export class RegistrationRecognitionOpen {
  constructor(
    /** Kernel seam vocabulary key for the unresolved registration pressure. */
    readonly openKind: OpenSeamKindKey,
    /** Short explanation suitable for IDE/tooling projections. */
    readonly summary: string,
    /** Source node where the unresolved pressure appeared. */
    readonly node: ts.Node,
    /** Lower-level producer reasons that caused this registration seam, when available. */
    readonly reasonKinds: readonly OpenSeamReasonKind[] = [],
  ) {}
}

/** Exact evaluator value together with the authored carrier occurrence that offered it to registration flow. */
export class EvaluatedRegistrationCarrier {
  constructor(
    readonly sourceNode: ts.Node,
    readonly value: EvaluationValue,
  ) {}
}

/** Registration admission observed before kernel materialization or DI world construction. */
export class RegistrationAdmissionObservation {
  constructor(
    /** Source carrier lane that produced this observation. */
    readonly carrierKind: RegistrationCarrierKind,
    /** Normalized admission lane this observation is expected to materialize. */
    readonly admissionKind: RegistrationAdmissionKind,
    /** Strategy recognized from the source shape. */
    readonly strategy: RegistrationStrategy,
    /** Role played by the observed key expression. */
    readonly keyRole: RegistrationKeyRole,
    /** Full carrier node, used for the primary evidence span. */
    readonly sourceNode: ts.Node,
    /** Target key observation, or null when the key stayed open. */
    readonly targetKey: RegistrationKeyObservation | null,
    /** Registered value observation, or null when the value stayed open or is not applicable. */
    readonly registeredValue: RegistrationValueObservation | null,
    /** Registry parameters captured from `Registration.defer(key, ...params)`. */
    readonly registryParameters: readonly RegistrationValueObservation[] = [],
    /** Unresolved points that must stay visible to later consumers. */
    readonly openSeams: readonly RegistrationRecognitionOpen[] = [],
    /** Resource lookup name override passed to `ResourceDefinition.register(container, alias)`. */
    readonly resourceLookupNameOverride: string | null = null,
    /** Exact evaluator carrier offered to registration flow, retained outside durable kernel records. */
    readonly evaluatedCarrierValue: EvaluationValue | null = null,
  ) {}

  withEvaluatedCarrierValue(value: EvaluationValue): RegistrationAdmissionObservation {
    if (this.evaluatedCarrierValue === value) {
      return this;
    }
    return this.withRegisteredValueAndShape(
      this.strategy,
      this.keyRole,
      this.targetKey,
      this.registeredValue,
      this.openSeams,
      value,
    );
  }

  /** Preserve admission-local carrier evidence while enriching the registered value. */
  withRegisteredValue(
    registeredValue: RegistrationValueObservation | null,
  ): RegistrationAdmissionObservation {
    return this.withRegisteredValueAndShape(
      this.strategy,
      this.keyRole,
      this.targetKey,
      registeredValue,
      this.openSeams,
      this.evaluatedCarrierValue,
    );
  }

  /** Preserve carrier evidence while convergence refines the normalized registration lane. */
  withRegisteredValueAndShape(
    strategy: RegistrationStrategy,
    keyRole: RegistrationKeyRole,
    targetKey: RegistrationKeyObservation | null,
    registeredValue: RegistrationValueObservation | null,
    openSeams: readonly RegistrationRecognitionOpen[],
    evaluatedCarrierValue: EvaluationValue | null = this.evaluatedCarrierValue,
  ): RegistrationAdmissionObservation {
    return new RegistrationAdmissionObservation(
      this.carrierKind,
      this.admissionKind,
      strategy,
      keyRole,
      this.sourceNode,
      targetKey,
      registeredValue,
      this.registryParameters,
      openSeams,
      this.resourceLookupNameOverride,
      evaluatedCarrierValue,
    );
  }
}
