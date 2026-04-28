import type ts from 'typescript';
import type {
  RegistrationAdmissionKind,
  RegistrationStrategy,
} from './registration-admission.js';
import type { RegistrationValueKind } from './registration-reference.js';

export const enum RegistrationCarrierKind {
  /** Call to `Registration.instance`, `singleton`, `transient`, `callback`, `cachedCallback`, `aliasTo`, or `defer`. */
  RegistrationFactoryCall = 'registration-factory-call',
  /** Call to `container.register(...)`. */
  ContainerRegisterCall = 'container-register-call',
  /** Call to `aurelia.register(...)`. */
  AureliaRegisterCall = 'aurelia-register-call',
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

export const enum RegistrationOpenKind {
  /** The observed registration could not close its target key. */
  Key = 'open-key-expression',
  /** The observed registration could not close its registered value. */
  Value = 'open-value-expression',
  /** The observed registration could not close its strategy. */
  Strategy = 'open-strategy',
  /** The observed registration could not close the receiving container or app boundary. */
  Container = 'open-container',
  /** A callback body exists but is intentionally not evaluated by registration recognition. */
  CallbackBody = 'open-callback-body',
  /** An object-map registration could not close all recursive entries. */
  ObjectMap = 'open-object-map',
  /** A spread argument or spread property could not close. */
  Spread = 'open-spread',
  /** An IRegistry-like value could not expose a closed register shape. */
  RegistryShape = 'open-registry-shape',
  /** An alias registration could not close the original target key. */
  AliasTarget = 'open-alias-target',
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
  ) {}
}

/** Explicit unresolved pressure from registration recognition. */
export class RegistrationRecognitionOpen {
  constructor(
    /** Machine-readable open registration-recognition category. */
    readonly openKind: RegistrationOpenKind,
    /** Short explanation suitable for IDE/MCP projections. */
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
    /** Full carrier node, used for the primary evidence span. */
    readonly sourceNode: ts.Node,
    /** Target key observation, or null when the key stayed open. */
    readonly targetKey: RegistrationKeyObservation | null,
    /** Registered value observation, or null when the value stayed open or is not applicable. */
    readonly registeredValue: RegistrationValueObservation | null,
    /** Unresolved points that must stay visible to later consumers. */
    readonly openSeams: readonly RegistrationRecognitionOpen[] = [],
  ) {}
}
