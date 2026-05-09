import type ts from 'typescript';
import type {
  AddressHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { OpenSeamKindKey } from '../kernel/vocabulary.js';
import type {
  RegistrationAdmissionKind,
  RegistrationKeyRole,
  RegistrationStrategy,
} from './registration-admission.js';
import type {
  FrameworkRegistrationKind,
  RegistrationValueKind,
} from './registration-reference.js';

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
  /** Object-map value admitted by container registration. */
  ObjectMapEntry = 'object-map-entry',
}

/** Source-level key expression observed before kernel identity materialization. */
export class RegistrationKeyObservation {
  constructor(
    /** Best local name, literal preview, or property name for the key. */
    readonly localName: string | null,
    /** Source node that produced the key expression. */
    readonly node: ts.Node,
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
  ) {}
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
  ) {}
}
