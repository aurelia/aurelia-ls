import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { ProductKindKey } from '../kernel/vocabulary.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { DiFrameworkErrorCode } from './framework-error-code.js';
import type {
  DiResolveActiveContainerExpectation,
  DiResolveEnclosingMemberKind,
  DiResolveExecutionContextKind,
  DiResolveNullishKeyArgument,
} from './resolve-call-recognition.js';
import type { ContainerLookupKeyKind } from './container-key.js';
import type { DiContainerApiMethodKind } from './container-api-recognition.js';
import type { DiContainerKeyExpressionIdentityKind } from './source-key-expression.js';
import type { DiAureliaResolverWrapperKind } from './resolver-wrapper-recognition.js';

export const enum DiIssuePhase {
  /** A resource registration is being lowered into the container resource lookup table. */
  ResourceSlotPublication = 'resource-slot-publication',
  /** An authored call to Aurelia's ambient `resolve(...)` is being checked against current-container semantics. */
  ResolveCallRecognition = 'resolve-call-recognition',
  /** A source decorator that delegates to Aurelia's `inject(...)` helper is being checked against decorator context. */
  InjectDecoratorRecognition = 'inject-decorator-recognition',
  /** A source call to Aurelia's container API is being checked against method-local container semantics. */
  ContainerApiRecognition = 'container-api-recognition',
  /** Source-visible singleton activation graph is being checked for resolver re-entry. */
  DependencyCycleAnalysis = 'dependency-cycle-analysis',
}

export const enum DiIssueKind {
  /** A container API lookup entered DefaultResolver.none for a missing key. */
  NoneResolverFound = 'none-resolver-found',
  /** The local container already has a resource row for the same runtime resource key. */
  ResourceAlreadyExists = 'resource-already-exists',
  /** The ambient `resolve(...)` helper is called where Aurelia cannot have a current container. */
  NoActiveContainerForResolve = 'no-active-container-for-resolve',
  /** The ambient `resolve(...)` helper is given a null or undefined DI key while a container is active. */
  NullUndefinedKey = 'null-undefined-key',
  /** An Aurelia injection decorator is used on a target kind that the runtime decorator rejects. */
  InvalidInjectDecoratorUsage = 'invalid-inject-decorator-usage',
  /** A container API receives a native function where the framework refuses construction. */
  NoConstructNativeFunction = 'no-construct-native-function',
  /** A container API JIT/factory path cannot derive a constructable runtime type. */
  UnableJitNonConstructor = 'unable-jit-non-constructor',
  /** Singleton resolver activation would re-enter the same resolver before construction completes. */
  CyclicDependency = 'cyclic-dependency',
  /** Container.register recursion reached Aurelia's auto-registration depth guard. */
  UnableAutoRegister = 'unable-auto-register',
  /** A registry key's static register method returned no resolver during JIT registration. */
  NullResolverFromRegister = 'null-resolver-from-register',
  /** A newInstance resolver targets an Aurelia interface key with no registration/default implementation. */
  InvalidNewInstanceOnInterface = 'invalid-new-instance-on-interface',
}

export type DiIssueSeverity =
  | 'information'
  | 'warning'
  | 'error';

export const enum DiIssueSubjectKind {
  /** Issue is about the container's runtime resource-key table. */
  ResourceSlot = 'resource-slot',
  /** Issue is about a source call to Aurelia's ambient `resolve(...)` helper. */
  ResolveCall = 'resolve-call',
  /** Issue is about a source decorator that delegates to Aurelia's `inject(...)` helper. */
  InjectDecorator = 'inject-decorator',
  /** Issue is about a source call to an Aurelia container API. */
  ContainerApiCall = 'container-api-call',
  /** Issue is about a closed dependency cycle in singleton resolver activation. */
  DependencyCycle = 'dependency-cycle',
  /** Issue is about recursive registry/register spending. */
  RegistrationCascade = 'registration-cascade',
}

export interface DiResourceSlotIssueSubject {
  readonly kind: DiIssueSubjectKind.ResourceSlot;
  readonly resourceKey: string;
  readonly existingResourceSlotProductHandle: ProductHandle | null;
  readonly incomingResourceProductHandle: ProductHandle | null;
}

export interface DiResolveCallIssueSubject {
  readonly kind: DiIssueSubjectKind.ResolveCall;
  readonly keyExpressionText: string | null;
  readonly argumentCount: number;
  readonly nullishKeyArguments: readonly DiResolveNullishKeyArgument[];
  readonly enclosingClassName: string | null;
  readonly enclosingMemberName: string | null;
  readonly enclosingMemberKind: DiResolveEnclosingMemberKind;
  readonly enclosingMemberStatic: boolean;
  readonly executionContextKind: DiResolveExecutionContextKind;
  readonly activeContainerExpectation: DiResolveActiveContainerExpectation;
}

export interface DiInjectDecoratorIssueSubject {
  readonly kind: DiIssueSubjectKind.InjectDecorator;
  readonly decoratorName: string;
  readonly targetKind: string;
  readonly targetName: string | null;
}

export interface DiContainerApiCallIssueSubject {
  readonly kind: DiIssueSubjectKind.ContainerApiCall;
  readonly methodKind: DiContainerApiMethodKind;
  readonly keyExpressionText: string | null;
  readonly keyWrapperKind: DiAureliaResolverWrapperKind | null;
  readonly wrappedKeyName: string | null;
  readonly keyKind: ContainerLookupKeyKind;
  readonly keyIdentityKind: DiContainerKeyExpressionIdentityKind;
  readonly autoRegister: boolean | null;
  readonly receiverDefaultResolverPolicy: string | null;
  readonly receiverFreshCreateContainer: boolean;
  readonly nullishKeyArguments: readonly DiResolveNullishKeyArgument[];
  readonly receiverText: string;
}

export interface DiDependencyCycleStep {
  readonly keyName: string;
  readonly implementationName: string;
  readonly dependencyKeyName: string;
  readonly sourcePath: string | null;
}

export interface DiDependencyCycleIssueSubject {
  readonly kind: DiIssueSubjectKind.DependencyCycle;
  readonly entryKeyExpressionText: string | null;
  readonly entryKeyName: string;
  readonly cycle: readonly DiDependencyCycleStep[];
}

export interface DiRegistrationCascadeIssueSubject {
  readonly kind: DiIssueSubjectKind.RegistrationCascade;
  readonly stepKind: string;
  readonly admissionKind: string;
  readonly strategy: string;
}

export type DiIssueSubject =
  | DiResourceSlotIssueSubject
  | DiResolveCallIssueSubject
  | DiInjectDecoratorIssueSubject
  | DiContainerApiCallIssueSubject
  | DiDependencyCycleIssueSubject
  | DiRegistrationCascadeIssueSubject;

/** Source-backed DI/container issue corresponding to an Aurelia kernel boundary. */
export class DiIssue {
  readonly productKindKey: ProductKindKey = KernelVocabulary.Di.Issue.key;

  constructor(
    /** Product handle for the materialized issue product. */
    readonly productHandle: ProductHandle,
    /** Identity for this DI issue product. */
    readonly identityHandle: IdentityHandle,
    /** Container identity that owns the conflict or failure. */
    readonly containerIdentityHandle: IdentityHandle | null,
    /** Container product that owns the conflict or failure. */
    readonly containerProductHandle: ProductHandle | null,
    /** DI world construction phase that detected the issue. */
    readonly phase: DiIssuePhase,
    /** Stable semantic issue kind used by diagnostics and repair planning. */
    readonly issueKind: DiIssueKind,
    /** Human-readable message from the modeled framework boundary. */
    readonly message: string,
    /** Diagnostic severity implied by the modeled framework path. */
    readonly severity: DiIssueSeverity,
    /** Exact Aurelia framework error code when this issue models a framework ErrorNames path. */
    readonly frameworkErrorCode: DiFrameworkErrorCode | null,
    /** Domain subject that carries issue-specific details without bloating the common issue shape. */
    readonly subject: DiIssueSubject,
    /** Source address for the authored registration or framework admission that triggered the issue. */
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}
