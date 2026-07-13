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
import {
  CompilerIdentity,
  InterfaceDiKeyIdentity,
} from '../kernel/identity.js';
import { MaterializedProduct } from '../kernel/materialization.js';
import { ProvenanceRecord } from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  type ValueConverterExpression,
} from '../expression/ast.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import { BuiltInValueConverterName } from '../resources/built-in-resources.js';
import type { Container } from '../di/container.js';
import type { TemplateResourceScope } from './compiler-world.js';
import { findVisibleTemplateResource } from './compiler-resource-lookup.js';
import type { TemplateVisibleResource } from './compiler-world-reference.js';
import { bindingExpressionAstForProduct } from './expression-parse-product.js';
import { TemplateProductDetails } from './product-details.js';
import {
  PropertyBinding,
  type RuntimeBinding,
} from './runtime-binding.js';
import { expressionProductHandlesForRuntimeBinding } from './runtime-binding-expression-products.js';
import { appendRuntimeBindingProductValue } from './runtime-binding-product-index.js';
import { sourceAddressForRuntimeExpressionSpan } from './runtime-expression-source-address.js';
import type { RuntimeRenderingEmission } from './runtime-rendering-materializer.js';
import { TemplateBindingMode } from './instruction-ir.js';
import {
  RuntimeValueConverterApplication,
  RuntimeValueConverterApplicationPhase,
  RuntimeValueConverterIssue,
  RuntimeValueConverterIssueKind,
  RuntimeValueConverterIssuePhase,
  SanitizeValueConverter,
  type RuntimeValueConverterIssueDraft,
} from './runtime-value-converter.js';
import { RuntimeHtmlAstFrameworkErrorCode } from '../type-system/framework-error-code.js';
import {
  valueConverterResourceOccurrences,
  type ExpressionResourceOccurrence,
} from './expression-resource-occurrence.js';
import type { RuntimeBindingBehaviorPlan } from './runtime-binding-behavior-plan.js';
import { RuntimeExpressionResourceBindReachability } from './runtime-expression-resource.js';

export class RuntimeValueConverterMaterializationRequest {
  constructor(
    readonly localKey: string,
    readonly runtimeRendering: RuntimeRenderingEmission,
    readonly container: Container,
    readonly resourceScope: TemplateResourceScope | null,
    readonly bindingBehaviorPlan: RuntimeBindingBehaviorPlan,
  ) {}
}

export class RuntimeValueConverterEmission {
  private readonly applicationsByBinding = new Map<string, RuntimeValueConverterApplication[]>();
  private readonly issuesByBinding = new Map<string, RuntimeValueConverterIssue[]>();

  constructor(
    readonly applications: readonly RuntimeValueConverterApplication[],
    readonly issues: readonly RuntimeValueConverterIssue[],
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

  readApplicationsForBinding(productHandle: ProductHandle): readonly RuntimeValueConverterApplication[] {
    return this.applicationsByBinding.get(productHandle) ?? [];
  }

  readIssuesForBinding(productHandle: ProductHandle): readonly RuntimeValueConverterIssue[] {
    return this.issuesByBinding.get(productHandle) ?? [];
  }
}

class RuntimeValueConverterSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly evidenceHandle: EvidenceHandle,
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

class RuntimeValueConverterPublication {
  constructor(
    readonly applications: readonly RuntimeValueConverterApplication[],
    readonly issues: readonly RuntimeValueConverterIssue[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Materializes runtime value-converter applications after renderer dispatch has selected runtime bindings. */
export class RuntimeValueConverterMaterializer {
  private readonly sanitize = new SanitizeValueConverter();

  constructor(
    readonly store: KernelStore,
  ) {}

  materialize(input: RuntimeValueConverterMaterializationRequest): RuntimeValueConverterEmission {
    const emission = this.recordsForValueConverters(input);
    if (emission.records.length > 0) {
      this.store.commit(new KernelStoreBatch(emission.records, `value-converter:${input.localKey}`));
    }
    for (const application of emission.applications) {
      this.store.productDetails.add(TemplateProductDetails.RuntimeValueConverterApplication, application.productHandle, application);
    }
    for (const issue of emission.issues) {
      this.store.productDetails.add(TemplateProductDetails.RuntimeValueConverterIssue, issue.productHandle, issue);
    }
    return emission;
  }

  private recordsForValueConverters(
    input: RuntimeValueConverterMaterializationRequest,
  ): RuntimeValueConverterEmission {
    const source = this.recordsForSource(input.localKey);
    const applications: RuntimeValueConverterApplication[] = [];
    const issues: RuntimeValueConverterIssue[] = [];
    const records: KernelStoreRecord[] = [...source.records];

    input.runtimeRendering.bindings.forEach((binding, bindingIndex) => {
      expressionProductHandlesForRuntimeBinding(binding).forEach((expressionProductHandle, expressionIndex) => {
        const ast = bindingExpressionAstForProduct(this.store, expressionProductHandle);
        if (ast == null) {
          return;
        }
        const converters = valueConverterResourceOccurrences(ast);
        const converterCounts = occurrenceCountsByChain(converters);
        const converterIndexes = new Map<number, number>();
        const blockerDepths = new Map<number, number>();
        for (let converterIndex = 0; converterIndex < converters.length; converterIndex++) {
          const occurrence = converters[converterIndex]!;
          const converter = occurrence.expression;
          const priorBehaviorFailureDepth = input.bindingBehaviorPlan.readFirstFailureDepth(
            expressionProductHandle,
            occurrence.chainIndex,
          );
          if (priorBehaviorFailureDepth != null) {
            blockerDepths.set(
              occurrence.chainIndex,
              Math.min(blockerDepths.get(occurrence.chainIndex) ?? Number.POSITIVE_INFINITY, priorBehaviorFailureDepth),
            );
          }
          const blockerDepth = blockerDepths.get(occurrence.chainIndex) ?? null;
          const reached = blockerDepth == null || occurrence.chainDepth <= blockerDepth;
          const phaseIndex = converterIndexes.get(occurrence.chainIndex) ?? 0;
          converterIndexes.set(occurrence.chainIndex, phaseIndex + 1);
          const publication = this.valueConverterPublication(
            `${input.localKey}:binding:${bindingIndex}:expression:${expressionIndex}:converter:${converterIndex}:${converter.name.name}`,
            input,
            binding,
            expressionProductHandle,
            occurrence,
            reached,
            phaseIndex,
            converterCounts.get(occurrence.chainIndex) ?? 1,
            source,
          );
          applications.push(...publication.applications);
          issues.push(...publication.issues);
          records.push(...publication.records);
          if (reached && publication.applications.some((application) => application.resource == null)) {
            blockerDepths.set(occurrence.chainIndex, occurrence.chainDepth);
          }
        }
      });
    });

    return new RuntimeValueConverterEmission(applications, issues, records);
  }

  private valueConverterPublication(
    local: string,
    input: RuntimeValueConverterMaterializationRequest,
    binding: RuntimeBinding,
    expressionProductHandle: ProductHandle,
    occurrence: ExpressionResourceOccurrence<ValueConverterExpression>,
    reached: boolean,
    phaseIndex: number,
    converterCount: number,
    source: RuntimeValueConverterSourceSet,
  ): RuntimeValueConverterPublication {
    const converter = occurrence.expression;
    const resource = findValueConverterResource(input.resourceScope, converter.name.name);
    const issue = !reached
      ? null
      : resource == null
      ? {
          issueKind: RuntimeValueConverterIssueKind.ResourceNotFound,
          message: `Value converter '${converter.name.name}' was not resolved through the current compiler resource scope.`,
          frameworkErrorCode: RuntimeHtmlAstFrameworkErrorCode.AstConverterNotFound,
        }
      : this.issueForValueConverter(input, converter);
    const expressionSource = sourceAddressForRuntimeExpressionSpan(
      this.store,
      local,
      binding.sourceAddressHandle,
      converter.name.span,
    );
    const applications = valueConverterApplicationPhasesForBinding(binding, input.bindingBehaviorPlan).map((phase) =>
      this.applicationProduct(
        `${local}:phase:${phase}`,
        binding,
        resource,
        expressionProductHandle,
        occurrence,
        phase,
        reached,
        resource == null || !reached
          ? null
          : valueConverterPhaseOrder(phase, phaseIndex, converterCount),
        expressionSource.handle,
      )
    );
    const issueApplication = resource == null
      ? applications[0] ?? null
      : applications.find((application) =>
          application.phase === RuntimeValueConverterApplicationPhase.ToView
        ) ?? null;
    const issueProduct = issue == null || issueApplication == null
      ? null
      : this.issueProduct(
          `${local}:issue:${issue.issueKind}`,
          issueApplication,
          binding,
          resource == null ? RuntimeValueConverterIssuePhase.Bind : RuntimeValueConverterIssuePhase.ToView,
          issue,
          expressionSource.handle,
          source,
        );
    const issueRecords = issueProduct == null || issueApplication == null
      ? []
      : recordsForIssue(issueProduct, issueApplication.identityHandle, source.provenanceHandle);
    return new RuntimeValueConverterPublication(
      applications,
      issueProduct == null ? [] : [issueProduct],
      [
        ...expressionSource.records,
        ...applications.flatMap((application) =>
          recordsForApplication(application, binding.identityHandle, source.provenanceHandle)
        ),
        ...issueRecords,
      ],
    );
  }

  private issueForValueConverter(
    input: RuntimeValueConverterMaterializationRequest,
    converter: ValueConverterExpression,
  ): RuntimeValueConverterIssueDraft | null {
    switch (converter.name.name) {
      case BuiltInValueConverterName.Sanitize:
        return this.sanitize.toView({
          hasCustomSanitizer: hasResolverForInterface(this.store, input.container, 'ISanitizer'),
        });
      default:
        return null;
    }
  }

  private applicationProduct(
    local: string,
    binding: RuntimeBinding,
    resource: TemplateVisibleResource | null,
    expressionProductHandle: ProductHandle,
    occurrence: ExpressionResourceOccurrence<ValueConverterExpression>,
    phase: RuntimeValueConverterApplicationPhase,
    reached: boolean,
    phaseOrder: number | null,
    sourceAddressHandle: AddressHandle | null,
  ): RuntimeValueConverterApplication {
    const converter = occurrence.expression;
    return new RuntimeValueConverterApplication(
      this.store.handles.product(local),
      this.store.handles.identity(local),
      binding.toReference(),
      resource?.toReference() ?? null,
      phase,
      converter.name.name,
      converter.args.length,
      expressionProductHandle,
      occurrence.chainIndex,
      occurrence.chainDepth,
      reached
        ? RuntimeExpressionResourceBindReachability.Reached
        : RuntimeExpressionResourceBindReachability.BlockedByOuterFailure,
      reached ? occurrence.chainDepth : null,
      phaseOrder,
      converter.args.map((argument) => argument.span),
      sourceAddressHandle,
    );
  }

  private issueProduct(
    local: string,
    application: RuntimeValueConverterApplication,
    binding: RuntimeBinding,
    phase: RuntimeValueConverterIssuePhase,
    issue: RuntimeValueConverterIssueDraft,
    sourceAddressHandle: AddressHandle | null,
    source: RuntimeValueConverterSourceSet,
  ): RuntimeValueConverterIssue {
    return new RuntimeValueConverterIssue(
      this.store.handles.product(local),
      this.store.handles.identity(local),
      application.toReference(),
      binding.toReference(),
      phase,
      issue.issueKind,
      issue.message,
      issue.frameworkErrorCode,
      sourceAddressHandle,
    );
  }

  private recordsForSource(local: string): RuntimeValueConverterSourceSet {
    const evidenceHandle = this.store.handles.evidence(`value-converter:${local}`);
    const provenanceHandle = this.store.handles.provenance(`value-converter:${local}`);
    return new RuntimeValueConverterSourceSet(
      [
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
          'Runtime value-converter materialization from rendered bindings, expression ASTs, resource scope, and DI service state.',
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
  application: RuntimeValueConverterApplication,
  ownerIdentityHandle: IdentityHandle,
  provenanceHandle: ProvenanceHandle,
): readonly KernelStoreRecord[] {
  return [
    new CompilerIdentity(
      application.identityHandle,
      KernelVocabulary.Binding.ValueConverterApplication.key,
      ownerIdentityHandle,
      application.sourceAddressHandle,
      application.converterName,
    ),
    new MaterializedProduct(
      application.productHandle,
      KernelVocabulary.Binding.ValueConverterApplication.key,
      application.identityHandle,
      application.sourceAddressHandle,
      provenanceHandle,
    ),
  ];
}

function recordsForIssue(
  issue: RuntimeValueConverterIssue,
  ownerIdentityHandle: IdentityHandle,
  provenanceHandle: ProvenanceHandle,
): readonly KernelStoreRecord[] {
  return [
    new CompilerIdentity(
      issue.identityHandle,
      KernelVocabulary.Binding.ValueConverterIssue.key,
      ownerIdentityHandle,
      issue.sourceAddressHandle,
      issue.issueKind,
    ),
    new MaterializedProduct(
      issue.productHandle,
      KernelVocabulary.Binding.ValueConverterIssue.key,
      issue.identityHandle,
      issue.sourceAddressHandle,
      provenanceHandle,
    ),
  ];
}

function valueConverterApplicationPhasesForBinding(
  binding: RuntimeBinding,
  bindingBehaviorPlan: RuntimeBindingBehaviorPlan,
): readonly RuntimeValueConverterApplicationPhase[] {
  if (!(binding instanceof PropertyBinding)) {
    return [RuntimeValueConverterApplicationPhase.ToView];
  }
  switch (bindingBehaviorPlan.effectivePropertyBindingMode(binding)) {
    case TemplateBindingMode.FromView:
      return [RuntimeValueConverterApplicationPhase.FromView];
    case TemplateBindingMode.TwoWay:
      return [RuntimeValueConverterApplicationPhase.ToView, RuntimeValueConverterApplicationPhase.FromView];
    case TemplateBindingMode.OneTime:
    case TemplateBindingMode.ToView:
    case TemplateBindingMode.Default:
    case TemplateBindingMode.Open:
      return [RuntimeValueConverterApplicationPhase.ToView];
  }
}

function occurrenceCountsByChain(
  occurrences: readonly ExpressionResourceOccurrence<ValueConverterExpression>[],
): ReadonlyMap<number, number> {
  const counts = new Map<number, number>();
  for (const occurrence of occurrences) {
    counts.set(occurrence.chainIndex, (counts.get(occurrence.chainIndex) ?? 0) + 1);
  }
  return counts;
}

function valueConverterPhaseOrder(
  phase: RuntimeValueConverterApplicationPhase,
  outerToInnerIndex: number,
  converterCount: number,
): number {
  return phase === RuntimeValueConverterApplicationPhase.ToView
    ? converterCount - outerToInnerIndex - 1
    : outerToInnerIndex;
}

function findValueConverterResource(
  resourceScope: TemplateResourceScope | null,
  name: string,
): TemplateVisibleResource | null {
  return findVisibleTemplateResource(resourceScope, ResourceDefinitionKind.ValueConverter, name);
}

function hasResolverForInterface(
  store: KernelStore,
  container: Container,
  interfaceName: string,
): boolean {
  let current: Container | null = container;
  while (current != null) {
    if (current.readResolverSlots().some((slot) =>
      isInterfaceIdentity(store.readIdentity(slot.keyIdentityHandle), interfaceName)
    )) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function isInterfaceIdentity(
  identity: ReturnType<KernelStore['readIdentity']>,
  interfaceName: string,
): boolean {
  return identity instanceof InterfaceDiKeyIdentity
    && identity.interfaceName === interfaceName;
}
