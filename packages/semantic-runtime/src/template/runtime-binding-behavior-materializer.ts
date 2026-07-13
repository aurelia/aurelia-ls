import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  EvidenceHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import { CompilerIdentity } from '../kernel/identity.js';
import { MaterializedProduct } from '../kernel/materialization.js';
import { ProvenanceRecord } from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { IsAssign } from '../expression/ast.js';
import { TemplateProductDetails } from './product-details.js';
import {
  type RuntimeBinding,
  type RuntimeBindingTargetAccess,
} from './runtime-binding.js';
import type { RuntimeControllerBindEmission } from './runtime-controller-bind-materializer.js';
import {
  RuntimeBindingBehaviorApplication,
  RuntimeBindingBehaviorApplicationPhase,
  RuntimeBindingBehaviorIssue,
  RuntimeBindingBehaviorIssuePhase,
  type BuiltInBindingBehaviorBindIssue,
} from './runtime-binding-behavior.js';
import { sourceAddressForRuntimeExpressionSpan } from './runtime-expression-source-address.js';
import { appendRuntimeBindingProductValue } from './runtime-binding-product-index.js';
import type {
  RuntimeBindingBehaviorPlan,
  RuntimeBindingBehaviorPlanEntry,
} from './runtime-binding-behavior-plan.js';

export class RuntimeBindingBehaviorMaterializationRequest {
  constructor(
    readonly localKey: string,
    readonly bindingBehaviorPlan: RuntimeBindingBehaviorPlan,
    readonly controllerBind: RuntimeControllerBindEmission,
  ) {}
}

export class RuntimeBindingBehaviorEmission {
  private readonly applicationsByBinding = new Map<string, RuntimeBindingBehaviorApplication[]>();
  private readonly issuesByBinding = new Map<string, RuntimeBindingBehaviorIssue[]>();

  constructor(
    readonly applications: readonly RuntimeBindingBehaviorApplication[],
    readonly issues: readonly RuntimeBindingBehaviorIssue[],
    readonly records: readonly KernelStoreRecord[],
  ) {
    for (const application of applications) {
      if (application.binding.productHandle == null) {
        continue;
      }
      appendRuntimeBindingProductValue(this.applicationsByBinding, application.binding.productHandle, application);
    }
    for (const issue of issues) {
      if (issue.binding.productHandle == null) {
        continue;
      }
      appendRuntimeBindingProductValue(this.issuesByBinding, issue.binding.productHandle, issue);
    }
  }

  readApplicationsForBinding(productHandle: ProductHandle): readonly RuntimeBindingBehaviorApplication[] {
    return this.applicationsByBinding.get(productHandle) ?? [];
  }

  readIssuesForBinding(productHandle: ProductHandle): readonly RuntimeBindingBehaviorIssue[] {
    return this.issuesByBinding.get(productHandle) ?? [];
  }
}

class RuntimeBindingBehaviorSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly evidenceHandle: EvidenceHandle,
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

class RuntimeBindingBehaviorPublication {
  constructor(
    readonly application: RuntimeBindingBehaviorApplication,
    readonly issues: readonly RuntimeBindingBehaviorIssue[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Publishes runtime binding-behavior applications from the pre-bind plan after target facts exist. */
export class RuntimeBindingBehaviorMaterializer {
  constructor(
    readonly store: KernelStore,
  ) {}

  materialize(input: RuntimeBindingBehaviorMaterializationRequest): RuntimeBindingBehaviorEmission {
    const emission = this.recordsForBindingBehaviors(input);
    if (emission.records.length > 0) {
      this.store.commit(new KernelStoreBatch(emission.records, `binding-behavior:${input.localKey}`));
    }
    for (const application of emission.applications) {
      this.store.productDetails.add(TemplateProductDetails.RuntimeBindingBehaviorApplication, application.productHandle, application);
    }
    for (const issue of emission.issues) {
      this.store.productDetails.add(TemplateProductDetails.RuntimeBindingBehaviorIssue, issue.productHandle, issue);
    }
    return emission;
  }

  private recordsForBindingBehaviors(
    input: RuntimeBindingBehaviorMaterializationRequest,
  ): RuntimeBindingBehaviorEmission {
    const source = this.recordsForSource(input.localKey);
    const applications: RuntimeBindingBehaviorApplication[] = [];
    const issues: RuntimeBindingBehaviorIssue[] = [];
    const records: KernelStoreRecord[] = [...source.records];

    for (const entry of input.bindingBehaviorPlan.entries) {
      const targetAccess = firstTargetAccess(input.controllerBind, entry.binding);
      const publication = this.bindingBehaviorPublication(
        `${input.localKey}:binding:${entry.bindingIndex}:expression:${entry.expressionIndex}:behavior:${entry.behaviorIndex}:${entry.occurrence.expression.name.name}`,
        entry,
        targetAccess,
        source,
      );
      applications.push(publication.application);
      issues.push(...publication.issues);
      records.push(...publication.records);
    }

    return new RuntimeBindingBehaviorEmission(applications, issues, records);
  }

  private bindingBehaviorPublication(
    local: string,
    entry: RuntimeBindingBehaviorPlanEntry,
    targetAccess: RuntimeBindingTargetAccess | null,
    source: RuntimeBindingBehaviorSourceSet,
  ): RuntimeBindingBehaviorPublication {
    const behavior = entry.occurrence.expression;
    const expressionSource = sourceAddressForRuntimeExpressionSpan(
      this.store,
      local,
      entry.binding.sourceAddressHandle,
      behavior.name.span,
    );
    const application = this.applicationProduct(
      local,
      entry,
      targetAccess,
      expressionSource.handle,
    );
    const issueProduct = entry.issue == null
      ? null
      : this.issueProduct(
          `${local}:issue:${entry.issue.issueKind}`,
          application,
          entry.binding,
          targetAccess,
          entry.issue,
          expressionSource.handle,
          source,
        );
    return new RuntimeBindingBehaviorPublication(
      application,
      issueProduct == null ? [] : [issueProduct],
      [
        ...expressionSource.records,
        ...recordsForApplication(application, entry.binding.identityHandle, source.provenanceHandle),
        ...(issueProduct == null
          ? []
          : recordsForIssue(issueProduct, application.identityHandle, source.provenanceHandle)),
      ],
    );
  }

  private applicationProduct(
    local: string,
    entry: RuntimeBindingBehaviorPlanEntry,
    targetAccess: RuntimeBindingTargetAccess | null,
    sourceAddressHandle: AddressHandle | null,
  ): RuntimeBindingBehaviorApplication {
    const behavior = entry.occurrence.expression;
    return new RuntimeBindingBehaviorApplication(
      this.store.handles.product(local),
      this.store.handles.identity(local),
      entry.binding.toReference(),
      entry.resource?.toReference() ?? null,
      targetAccess?.toReference() ?? null,
      RuntimeBindingBehaviorApplicationPhase.Bind,
      behavior.name.name,
      behavior.args.length,
      behavior.args.flatMap(staticArgumentValueForArg),
      entry.expressionProductHandle,
      entry.occurrence.chainIndex,
      entry.occurrence.chainDepth,
      entry.bindReachability,
      entry.bindOrder,
      entry.phaseOrder,
      behavior.args.map((argument) => argument.span),
      sourceAddressHandle,
    );
  }

  private issueProduct(
    local: string,
    application: RuntimeBindingBehaviorApplication,
    binding: RuntimeBinding,
    targetAccess: RuntimeBindingTargetAccess | null,
    issue: BuiltInBindingBehaviorBindIssue,
    sourceAddressHandle: AddressHandle | null,
    source: RuntimeBindingBehaviorSourceSet,
  ): RuntimeBindingBehaviorIssue {
    return new RuntimeBindingBehaviorIssue(
      this.store.handles.product(local),
      this.store.handles.identity(local),
      application.toReference(),
      binding.toReference(),
      targetAccess?.toReference() ?? null,
      RuntimeBindingBehaviorIssuePhase.Bind,
      issue.issueKind,
      issue.message,
      issue.frameworkErrorCode,
      sourceAddressHandle,
    );
  }

  private recordsForSource(local: string): RuntimeBindingBehaviorSourceSet {
    const evidenceHandle = this.store.handles.evidence(`binding-behavior:${local}`);
    const provenanceHandle = this.store.handles.provenance(`binding-behavior:${local}`);
    return new RuntimeBindingBehaviorSourceSet(
      [
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
          'Runtime binding-behavior publication from the pre-bind plan and Controller.bind target facts.',
          null,
        ),
        new ProvenanceRecord(
          provenanceHandle,
          [evidenceHandle],
        ),
      ],
      evidenceHandle,
      provenanceHandle,
    );
  }
}

function recordsForApplication(
  application: RuntimeBindingBehaviorApplication,
  ownerIdentityHandle: IdentityHandle,
  provenanceHandle: ProvenanceHandle,
): readonly KernelStoreRecord[] {
  return [
    new CompilerIdentity(
      application.identityHandle,
      KernelVocabulary.Binding.BehaviorApplication.key,
      ownerIdentityHandle,
      application.sourceAddressHandle,
      application.behaviorName,
    ),
    new MaterializedProduct(
      application.productHandle,
      KernelVocabulary.Binding.BehaviorApplication.key,
      application.identityHandle,
      application.sourceAddressHandle,
      provenanceHandle,
    ),
  ];
}

function recordsForIssue(
  issue: RuntimeBindingBehaviorIssue,
  ownerIdentityHandle: IdentityHandle,
  provenanceHandle: ProvenanceHandle,
): readonly KernelStoreRecord[] {
  return [
    new CompilerIdentity(
      issue.identityHandle,
      KernelVocabulary.Binding.BehaviorIssue.key,
      ownerIdentityHandle,
      issue.sourceAddressHandle,
      issue.issueKind,
    ),
    new MaterializedProduct(
      issue.productHandle,
      KernelVocabulary.Binding.BehaviorIssue.key,
      issue.identityHandle,
      issue.sourceAddressHandle,
      provenanceHandle,
    ),
  ];
}

function firstTargetAccess(
  controllerBind: RuntimeControllerBindEmission,
  binding: RuntimeBinding,
): RuntimeBindingTargetAccess | null {
  return controllerBind.readTargetAccessesForBinding(binding.productHandle)[0] ?? null;
}

function staticArgumentValueForArg(arg: IsAssign): readonly string[] {
  if (arg.$kind === 'PrimitiveLiteral') {
    return [String(arg.value)];
  }
  if (arg.$kind === 'Template' && arg.expressions.length === 0 && arg.cooked.length === 1) {
    const cooked = arg.cooked[0];
    return cooked == null ? [] : [cooked];
  }
  return [];
}
