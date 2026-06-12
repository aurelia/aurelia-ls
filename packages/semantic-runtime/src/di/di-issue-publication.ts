import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  DiProductIdentity,
} from '../kernel/identity.js';
import {
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  ProvenanceRecord,
} from '../kernel/provenance.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { Container } from './container.js';
import type { ContainerResourceSlot } from './container-slot.js';
import {
  DiIssue,
  type DiDependencyCycleStep,
  DiIssueKind,
  DiIssuePhase,
  DiIssueSubjectKind,
} from './di-issue.js';
import { DiFrameworkErrorCode } from './framework-error-code.js';
import type { DiContainerApiCallSite } from './container-api-recognition.js';
import type { DiInjectDecoratorSite } from './inject-decorator-recognition.js';
import type { DiResolveCallSite } from './resolve-call-recognition.js';

export class DiIssuePublication {
  constructor(
    readonly issue: DiIssue,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

export function withDiIssueSourceAddressRecords(
  publication: DiIssuePublication,
  sourceRecords: readonly KernelStoreRecord[],
): DiIssuePublication {
  return new DiIssuePublication(publication.issue, [
    ...sourceRecords,
    ...publication.records,
  ]);
}

/** Publishes DI/container issue products with exact framework error-code authority where possible. */
export class DiIssuePublisher {
  constructor(
    readonly store: KernelStore,
  ) {}

  publishResourceAlreadyExists(
    local: string,
    container: Container,
    resourceKey: string,
    existingSlot: ContainerResourceSlot,
    incomingResourceProductHandle: ProductHandle | null,
    sourceAddressHandle: AddressHandle | null,
  ): DiIssuePublication {
    const message = `Resource key "${resourceKey}" is already registered in this container.`;
    const source = recordsForDiIssueSource(
      this.store,
      local,
      message,
      sourceAddressHandle,
      [EvidenceRole.Diagnostic, EvidenceRole.Registration],
    );
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const issue = new DiIssue(
      productHandle,
      identityHandle,
      container.identityHandle,
      container.productHandle,
      DiIssuePhase.ResourceSlotPublication,
      DiIssueKind.ResourceAlreadyExists,
      message,
      'warning',
      DiFrameworkErrorCode.ResourceAlreadyExists,
      {
        kind: DiIssueSubjectKind.ResourceSlot,
        resourceKey,
        existingResourceSlotProductHandle: existingSlot.productHandle,
        incomingResourceProductHandle,
      },
      sourceAddressHandle,
    );
    return new DiIssuePublication(issue, [
      ...source.records,
      new DiProductIdentity(
        issue.identityHandle,
        KernelVocabulary.Di.Issue.key,
        issue.containerIdentityHandle,
        existingSlot.resourceIdentityHandle,
        issue.sourceAddressHandle,
      ),
      new MaterializedProduct(
        issue.productHandle,
        KernelVocabulary.Di.Issue.key,
        issue.identityHandle,
        issue.sourceAddressHandle,
        source.provenanceHandle,
      ),
    ]);
  }

  publishNoActiveContainerForResolve(
    local: string,
    site: DiResolveCallSite,
    sourceAddressHandle: AddressHandle | null,
  ): DiIssuePublication {
    const keyText = site.keyExpressionText ?? '(unknown key)';
    const message = `Aurelia resolve(${keyText}) runs where no current DI container is active.`;
    const source = recordsForDiIssueSource(
      this.store,
      local,
      message,
      sourceAddressHandle,
      [EvidenceRole.Diagnostic, EvidenceRole.Usage],
    );
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const issue = new DiIssue(
      productHandle,
      identityHandle,
      null,
      null,
      DiIssuePhase.ResolveCallRecognition,
      DiIssueKind.NoActiveContainerForResolve,
      message,
      'error',
      DiFrameworkErrorCode.NoActiveContainerForResolve,
      {
        kind: DiIssueSubjectKind.ResolveCall,
        keyExpressionText: site.keyExpressionText,
        argumentCount: site.argumentCount,
        nullishKeyArguments: site.nullishKeyArguments,
        enclosingClassName: site.enclosingClassName,
        enclosingMemberName: site.enclosingMemberName,
        enclosingMemberKind: site.enclosingMemberKind,
        enclosingMemberStatic: site.enclosingMemberStatic,
        executionContextKind: site.executionContextKind,
        activeContainerExpectation: site.activeContainerExpectation,
      },
      sourceAddressHandle,
    );
    return new DiIssuePublication(issue, [
      ...source.records,
      new DiProductIdentity(
        issue.identityHandle,
        KernelVocabulary.Di.Issue.key,
        issue.containerIdentityHandle,
        null,
        issue.sourceAddressHandle,
      ),
      new MaterializedProduct(
        issue.productHandle,
        KernelVocabulary.Di.Issue.key,
        issue.identityHandle,
        issue.sourceAddressHandle,
        source.provenanceHandle,
      ),
    ]);
  }

  publishNullUndefinedKeyForResolve(
    local: string,
    site: DiResolveCallSite,
    sourceAddressHandle: AddressHandle | null,
  ): DiIssuePublication {
    const firstNullish = site.nullishKeyArguments[0];
    const keyText = firstNullish?.text ?? site.keyExpressionText ?? '(unknown key)';
    const message = `Aurelia resolve(${keyText}) passes a null or undefined DI key while a current container is active.`;
    const source = recordsForDiIssueSource(
      this.store,
      local,
      message,
      sourceAddressHandle,
      [EvidenceRole.Diagnostic, EvidenceRole.Usage],
    );
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const issue = new DiIssue(
      productHandle,
      identityHandle,
      null,
      null,
      DiIssuePhase.ResolveCallRecognition,
      DiIssueKind.NullUndefinedKey,
      message,
      'error',
      DiFrameworkErrorCode.NullUndefinedKey,
      {
        kind: DiIssueSubjectKind.ResolveCall,
        keyExpressionText: site.keyExpressionText,
        argumentCount: site.argumentCount,
        nullishKeyArguments: site.nullishKeyArguments,
        enclosingClassName: site.enclosingClassName,
        enclosingMemberName: site.enclosingMemberName,
        enclosingMemberKind: site.enclosingMemberKind,
        enclosingMemberStatic: site.enclosingMemberStatic,
        executionContextKind: site.executionContextKind,
        activeContainerExpectation: site.activeContainerExpectation,
      },
      sourceAddressHandle,
    );
    return new DiIssuePublication(issue, [
      ...source.records,
      new DiProductIdentity(
        issue.identityHandle,
        KernelVocabulary.Di.Issue.key,
        issue.containerIdentityHandle,
        null,
        issue.sourceAddressHandle,
      ),
      new MaterializedProduct(
        issue.productHandle,
        KernelVocabulary.Di.Issue.key,
        issue.identityHandle,
        issue.sourceAddressHandle,
        source.provenanceHandle,
      ),
    ]);
  }

  publishInvalidInjectDecoratorUsage(
    local: string,
    site: DiInjectDecoratorSite,
    sourceAddressHandle: AddressHandle | null,
  ): DiIssuePublication {
    const targetName = site.targetName ?? '(anonymous)';
    const message = `Aurelia ${site.decoratorName} injection decorator is not supported on ${site.targetKind} target "${targetName}".`;
    const source = recordsForDiIssueSource(
      this.store,
      local,
      message,
      sourceAddressHandle,
      [EvidenceRole.Diagnostic, EvidenceRole.Usage],
    );
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const issue = new DiIssue(
      productHandle,
      identityHandle,
      null,
      null,
      DiIssuePhase.InjectDecoratorRecognition,
      DiIssueKind.InvalidInjectDecoratorUsage,
      message,
      'error',
      DiFrameworkErrorCode.InvalidInjectDecoratorUsage,
      {
        kind: DiIssueSubjectKind.InjectDecorator,
        decoratorName: site.decoratorName,
        targetKind: site.targetKind,
        targetName: site.targetName,
      },
      sourceAddressHandle,
    );
    return new DiIssuePublication(issue, [
      ...source.records,
      new DiProductIdentity(
        issue.identityHandle,
        KernelVocabulary.Di.Issue.key,
        issue.containerIdentityHandle,
        null,
        issue.sourceAddressHandle,
      ),
      new MaterializedProduct(
        issue.productHandle,
        KernelVocabulary.Di.Issue.key,
        issue.identityHandle,
        issue.sourceAddressHandle,
        source.provenanceHandle,
      ),
    ]);
  }

  publishNoConstructNativeFunctionForContainerCall(
    local: string,
    site: DiContainerApiCallSite,
    sourceAddressHandle: AddressHandle | null,
  ): DiIssuePublication {
    const keyText = site.keyExpressionText ?? '(unknown key)';
    const message = `Aurelia container.${site.methodKind}(${keyText}) cannot construct a native function.`;
    return this.publishContainerApiCallIssue(
      local,
      site,
      sourceAddressHandle,
      DiIssueKind.NoConstructNativeFunction,
      DiFrameworkErrorCode.NoConstructNativeFunction,
      message,
    );
  }

  publishNoneResolverFoundForContainerCall(
    local: string,
    site: DiContainerApiCallSite,
    sourceAddressHandle: AddressHandle | null,
  ): DiIssuePublication {
    const keyText = site.keyExpressionText ?? '(unknown key)';
    const message = `Aurelia container.${site.methodKind}(${keyText}) would enter DefaultResolver.none for a missing DI key.`;
    return this.publishContainerApiCallIssue(
      local,
      site,
      sourceAddressHandle,
      DiIssueKind.NoneResolverFound,
      DiFrameworkErrorCode.NoneResolverFound,
      message,
    );
  }

  publishNullResolverFromRegisterForContainerCall(
    local: string,
    site: DiContainerApiCallSite,
    sourceAddressHandle: AddressHandle | null,
  ): DiIssuePublication {
    const keyText = site.keyExpressionText ?? '(unknown key)';
    const message = `Aurelia container.${site.methodKind}(${keyText}) would call a registry register(...) method that returns no resolver.`;
    return this.publishContainerApiCallIssue(
      local,
      site,
      sourceAddressHandle,
      DiIssueKind.NullResolverFromRegister,
      DiFrameworkErrorCode.NullResolverFromRegister,
      message,
    );
  }

  publishInvalidNewInstanceOnInterfaceForContainerCall(
    local: string,
    site: DiContainerApiCallSite,
    sourceAddressHandle: AddressHandle | null,
  ): DiIssuePublication {
    const keyText = site.keyExpressionText ?? '(unknown key)';
    const message = `Aurelia container.${site.methodKind}(${keyText}) cannot create a new instance for an interface key with no default implementation.`;
    return this.publishContainerApiCallIssue(
      local,
      site,
      sourceAddressHandle,
      DiIssueKind.InvalidNewInstanceOnInterface,
      DiFrameworkErrorCode.InvalidNewInstanceOnInterface,
      message,
    );
  }

  publishNullUndefinedKeyForContainerCall(
    local: string,
    site: DiContainerApiCallSite,
    sourceAddressHandle: AddressHandle | null,
  ): DiIssuePublication {
    const firstNullish = site.nullishKeyArguments[0];
    const keyText = firstNullish?.text ?? site.keyExpressionText ?? '(unknown key)';
    const message = `Aurelia container.${site.methodKind}(${keyText}) passes a null or undefined DI key.`;
    return this.publishContainerApiCallIssue(
      local,
      site,
      sourceAddressHandle,
      DiIssueKind.NullUndefinedKey,
      DiFrameworkErrorCode.NullUndefinedKey,
      message,
    );
  }

  publishUnableJitNonConstructorForContainerCall(
    local: string,
    site: DiContainerApiCallSite,
    sourceAddressHandle: AddressHandle | null,
  ): DiIssuePublication {
    const keyText = site.keyExpressionText ?? '(unknown key)';
    const message = `Aurelia container.${site.methodKind}(${keyText}) would enter JIT or factory lookup with a non-constructable key.`;
    return this.publishContainerApiCallIssue(
      local,
      site,
      sourceAddressHandle,
      DiIssueKind.UnableJitNonConstructor,
      DiFrameworkErrorCode.UnableJitNonConstructor,
      message,
    );
  }

  publishCyclicDependency(
    local: string,
    entryKeyExpressionText: string | null,
    entryKeyName: string,
    cycle: readonly DiDependencyCycleStep[],
    sourceAddressHandle: AddressHandle | null,
  ): DiIssuePublication {
    const cycleText = cycle.map((step) => `${step.keyName}->${step.dependencyKeyName}`).join(', ');
    const message = `Aurelia singleton resolver activation would re-enter "${entryKeyName}" before construction completes (${cycleText}).`;
    const source = recordsForDiIssueSource(
      this.store,
      local,
      message,
      sourceAddressHandle,
      [EvidenceRole.Diagnostic, EvidenceRole.Usage],
    );
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const issue = new DiIssue(
      productHandle,
      identityHandle,
      null,
      null,
      DiIssuePhase.DependencyCycleAnalysis,
      DiIssueKind.CyclicDependency,
      message,
      'error',
      DiFrameworkErrorCode.CyclicDependency,
      {
        kind: DiIssueSubjectKind.DependencyCycle,
        entryKeyExpressionText,
        entryKeyName,
        cycle,
      },
      sourceAddressHandle,
    );
    return new DiIssuePublication(issue, [
      ...source.records,
      new DiProductIdentity(
        issue.identityHandle,
        KernelVocabulary.Di.Issue.key,
        issue.containerIdentityHandle,
        null,
        issue.sourceAddressHandle,
      ),
      new MaterializedProduct(
        issue.productHandle,
        KernelVocabulary.Di.Issue.key,
        issue.identityHandle,
        issue.sourceAddressHandle,
        source.provenanceHandle,
      ),
    ]);
  }

  publishUnableAutoRegister(
    local: string,
    stepKind: string,
    admissionKind: string,
    strategy: string,
    sourceAddressHandle: AddressHandle | null,
  ): DiIssuePublication {
    const message = `Aurelia container.register(...) would recursively re-enter registration for a ${strategy} admission until the auto-registration depth guard throws.`;
    const source = recordsForDiIssueSource(
      this.store,
      local,
      message,
      sourceAddressHandle,
      [EvidenceRole.Diagnostic, EvidenceRole.Registration],
    );
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const issue = new DiIssue(
      productHandle,
      identityHandle,
      null,
      null,
      DiIssuePhase.DependencyCycleAnalysis,
      DiIssueKind.UnableAutoRegister,
      message,
      'error',
      DiFrameworkErrorCode.UnableAutoRegister,
      {
        kind: DiIssueSubjectKind.RegistrationCascade,
        stepKind,
        admissionKind,
        strategy,
      },
      sourceAddressHandle,
    );
    return new DiIssuePublication(issue, [
      ...source.records,
      new DiProductIdentity(
        issue.identityHandle,
        KernelVocabulary.Di.Issue.key,
        issue.containerIdentityHandle,
        null,
        issue.sourceAddressHandle,
      ),
      new MaterializedProduct(
        issue.productHandle,
        KernelVocabulary.Di.Issue.key,
        issue.identityHandle,
        issue.sourceAddressHandle,
        source.provenanceHandle,
      ),
    ]);
  }

  private publishContainerApiCallIssue(
    local: string,
    site: DiContainerApiCallSite,
    sourceAddressHandle: AddressHandle | null,
    issueKind: DiIssueKind,
    frameworkErrorCode: DiFrameworkErrorCode,
    message: string,
  ): DiIssuePublication {
    const source = recordsForDiIssueSource(
      this.store,
      local,
      message,
      sourceAddressHandle,
      [EvidenceRole.Diagnostic, EvidenceRole.Usage],
    );
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const issue = new DiIssue(
      productHandle,
      identityHandle,
      null,
      null,
      DiIssuePhase.ContainerApiRecognition,
      issueKind,
      message,
      'error',
      frameworkErrorCode,
      {
        kind: DiIssueSubjectKind.ContainerApiCall,
        methodKind: site.methodKind,
        keyExpressionText: site.keyExpressionText,
        keyWrapperKind: site.keyWrapperKind,
        wrappedKeyName: site.wrappedKeyName,
        keyKind: site.keyKind,
        keyIdentityKind: site.keyIdentityKind,
        autoRegister: site.autoRegister,
        receiverDefaultResolverPolicy: site.receiverDefaultResolverPolicy,
        receiverFreshCreateContainer: site.receiverFreshCreateContainer,
        nullishKeyArguments: site.nullishKeyArguments,
        receiverText: site.receiverText,
      },
      sourceAddressHandle,
    );
    return new DiIssuePublication(issue, [
      ...source.records,
      new DiProductIdentity(
        issue.identityHandle,
        KernelVocabulary.Di.Issue.key,
        issue.containerIdentityHandle,
        null,
        issue.sourceAddressHandle,
      ),
      new MaterializedProduct(
        issue.productHandle,
        KernelVocabulary.Di.Issue.key,
        issue.identityHandle,
        issue.sourceAddressHandle,
        source.provenanceHandle,
      ),
    ]);
  }
}

function recordsForDiIssueSource(
  store: KernelStore,
  local: string,
  summary: string,
  addressHandle: AddressHandle | null,
  roles: readonly EvidenceRole[],
): {
  readonly records: readonly KernelStoreRecord[];
  readonly provenanceHandle: ProvenanceHandle;
} {
  const evidenceHandle = store.handles.evidence(`${local}:evidence`);
  const provenanceHandle = store.handles.provenance(`${local}:provenance`);
  return {
    records: [
      new EvidenceRecord(
        evidenceHandle,
        EvidenceKind.SemanticObservation,
        roles,
        summary,
        addressHandle,
      ),
      new ProvenanceRecord(
        provenanceHandle,
        [evidenceHandle],
      ),
    ],
    provenanceHandle,
  };
}
