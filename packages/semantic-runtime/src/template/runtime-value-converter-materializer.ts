import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import { SourceSpanRole } from '../kernel/address.js';
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
import ts from 'typescript';
import {
  EvaluationArrayValue,
  EvaluationValueKind,
  isEvaluationPrimitiveValue,
  readEvaluationPrimitive,
} from '../evaluation/values.js';
import { BuiltInValueConverterName } from '../resources/built-in-resources.js';
import type { Container } from '../di/container.js';
import {
  RuntimeBindingSourceValueEvaluator,
  RuntimeValueConverterInstancePropertyReadState,
} from '../observation/binding-source-value-evaluator.js';
import type { TemplateVisibleResource } from './compiler-world-reference.js';
import { TemplateProductDetails } from './product-details.js';
import {
  PropertyBinding,
  RefBinding,
  type RuntimeBinding,
} from './runtime-binding.js';
import { appendRuntimeBindingProductValue } from './runtime-binding-product-index.js';
import { sourceAddressForRuntimeExpressionSpan } from './runtime-expression-source-address.js';
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
import { sourceSpanEvidenceForSite } from '../kernel/source-address.js';
import { sourceSpanRangeForNode } from '../resources/resource-source-address.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import type {
  RuntimeExpressionResourcePlan,
  RuntimeValueConverterPlanEntry,
} from './runtime-expression-resource-plan.js';
import {
  RuntimeExpressionResourceBindReachability,
  RuntimeExpressionResourceLifecycleEffectKind,
  RuntimeExpressionResourceLifecycleEffects,
  RuntimeExpressionResourcePhaseReachability,
  RuntimeExpressionResourceSignal,
  RuntimeExpressionResourceValueState,
} from './runtime-expression-resource.js';

export class RuntimeValueConverterMaterializationRequest {
  constructor(
    readonly localKey: string,
    readonly container: Container,
    readonly expressionResourcePlan: RuntimeExpressionResourcePlan,
    readonly sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null,
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

class RuntimeValueConverterLifecyclePublication {
  constructor(
    readonly effects: RuntimeExpressionResourceLifecycleEffects,
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

    for (const entry of input.expressionResourcePlan.converterEntries) {
      const converter = entry.expression;
      const publication = this.valueConverterPublication(
        `${input.localKey}:binding:${entry.bindingIndex}:expression:${entry.expressionIndex}:converter:${entry.converterIndex}:${converter.name.name}`,
        input,
        entry,
        source,
      );
      applications.push(...publication.applications);
      issues.push(...publication.issues);
      records.push(...publication.records);
    }

    return new RuntimeValueConverterEmission(applications, issues, records);
  }

  private valueConverterPublication(
    local: string,
    input: RuntimeValueConverterMaterializationRequest,
    entry: RuntimeValueConverterPlanEntry,
    source: RuntimeValueConverterSourceSet,
  ): RuntimeValueConverterPublication {
    const converter = entry.expression;
    const expressionSource = sourceAddressForRuntimeExpressionSpan(
      this.store,
      local,
      entry.binding.sourceAddressHandle,
      converter.name.span,
    );
    const phaseOrder = input.expressionResourcePlan.readValueConverterPhaseOrder(entry);
    const lifecycle = this.lifecyclePublication(`${local}:lifecycle`, input, entry);
    const applications = valueConverterApplicationPhasesForBinding(entry.binding, input.expressionResourcePlan).map((phase) => {
      const phaseReachability = valueConverterPhaseReachability(input.expressionResourcePlan, entry, phase);
      return this.applicationProduct(
        `${local}:phase:${phase}`,
        entry,
        phase,
        phaseReachability,
        valueConverterPhaseOrder(entry, phase, phaseReachability, phaseOrder),
        lifecycleEffectsForValueConverter(entry, phase, phaseReachability, lifecycle.effects),
        expressionSource.handle,
      );
    });
    const issueApplication = entry.resource == null
      ? applications.find((application) =>
          application.phase === RuntimeValueConverterApplicationPhase.Bind
          && application.phaseReachability === RuntimeExpressionResourcePhaseReachability.Reached
        ) ?? null
      : applications.find((application) =>
          application.phase === RuntimeValueConverterApplicationPhase.ToView
          && application.phaseReachability === RuntimeExpressionResourcePhaseReachability.Reached
        ) ?? null;
    const issue = issueApplication == null
      ? null
      : entry.resource == null
      ? {
          issueKind: RuntimeValueConverterIssueKind.ResourceNotFound,
          message: `Value converter '${converter.name.name}' was not resolved through the current compiler resource scope.`,
          frameworkErrorCode: RuntimeHtmlAstFrameworkErrorCode.AstConverterNotFound,
        }
      : this.issueForValueConverter(input, entry);
    const issueProduct = issue == null || issueApplication == null
      ? null
      : this.issueProduct(
          `${local}:issue:${issue.issueKind}`,
          issueApplication,
          entry.binding,
          entry.resource == null ? RuntimeValueConverterIssuePhase.Bind : RuntimeValueConverterIssuePhase.ToView,
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
        ...lifecycle.records,
        ...applications.flatMap((application) =>
          recordsForApplication(application, entry.binding.identityHandle, source.provenanceHandle)
        ),
        ...issueRecords,
      ],
    );
  }

  private lifecyclePublication(
    local: string,
    input: RuntimeValueConverterMaterializationRequest,
    entry: RuntimeValueConverterPlanEntry,
  ): RuntimeValueConverterLifecyclePublication {
    if (entry.builtInResource != null) {
      const signals = entry.builtInResource.signalNames.map((name) =>
        new RuntimeExpressionResourceSignal(name, null)
      );
      return new RuntimeValueConverterLifecyclePublication(
        signals.length === 0
          ? RuntimeExpressionResourceLifecycleEffects.none
          : new RuntimeExpressionResourceLifecycleEffects(
              [RuntimeExpressionResourceLifecycleEffectKind.SignalSubscription],
              RuntimeExpressionResourceValueState.Closed,
              signals,
              null,
              null,
              null,
              null,
            ),
        [],
      );
    }

    const definition = entry.resource?.definition ?? null;
    if (definition == null || definition.type !== ResourceDefinitionKind.ValueConverter) {
      return openValueConverterLifecycle(
        `Value converter '${entry.expression.name.name}' has no app-owned definition for instance lifecycle analysis.`,
      );
    }
    if (input.sourceValueEvaluator == null) {
      return openValueConverterLifecycle(
        `Value converter '${entry.expression.name.name}' instance signals require static project evaluation.`,
      );
    }

    const propertyRead = input.sourceValueEvaluator.readValueConverterInstanceProperty(
      definition,
      'signals',
      input.container,
    );
    const propertySource = this.sourceEvidenceForNode(
      `${local}:property`,
      input.sourceValueEvaluator,
      propertyRead.property?.node ?? null,
      `Value converter '${definition.name}' signals property source.`,
    );
    if (propertyRead.state === RuntimeValueConverterInstancePropertyReadState.Absent) {
      return new RuntimeValueConverterLifecyclePublication(
        RuntimeExpressionResourceLifecycleEffects.none,
        propertySource?.records ?? [],
      );
    }

    const value = propertyRead.value;
    if (!(value instanceof EvaluationArrayValue)) {
      return new RuntimeValueConverterLifecyclePublication(
        new RuntimeExpressionResourceLifecycleEffects(
          [],
          RuntimeExpressionResourceValueState.Open,
          [],
          null,
          null,
          propertySource?.addressHandle ?? null,
          [
            ...propertyRead.openReasons,
            value == null
              ? `Value converter '${definition.name}' signals value was not retained.`
              : `Value converter '${definition.name}' signals value is not a statically closed string array.`,
          ].join(' '),
        ),
        propertySource?.records ?? [],
      );
    }

    const records: KernelStoreRecord[] = [...(propertySource?.records ?? [])];
    const signals: RuntimeExpressionResourceSignal[] = [];
    let hasNonStringElement = false;
    for (const [index, element] of value.elements.entries()) {
      const primitive = isEvaluationPrimitiveValue(element.value)
        ? readEvaluationPrimitive(element.value)
        : null;
      if (typeof primitive !== 'string') {
        hasNonStringElement = true;
        continue;
      }
      const elementSource = this.sourceEvidenceForNode(
        `${local}:signal:${index}`,
        input.sourceValueEvaluator,
        element.expression ?? element.value.node,
        `Value converter '${definition.name}' signal '${primitive}' source.`,
      );
      records.push(...(elementSource?.records ?? []));
      signals.push(new RuntimeExpressionResourceSignal(
        primitive,
        elementSource?.addressHandle ?? null,
      ));
    }
    const state = propertyRead.state === RuntimeValueConverterInstancePropertyReadState.Open
      || value.mayHaveUnknownElements
      || hasNonStringElement
      ? RuntimeExpressionResourceValueState.Open
      : signals.length === 0
      ? RuntimeExpressionResourceValueState.Absent
      : RuntimeExpressionResourceValueState.Closed;
    const openReasons = [
      ...propertyRead.openReasons,
      ...(value.mayHaveUnknownElements ? ['The signals array may contain additional runtime elements.'] : []),
      ...(hasNonStringElement ? ['The signals array contains values that are not statically known strings.'] : []),
    ];
    return new RuntimeValueConverterLifecyclePublication(
      new RuntimeExpressionResourceLifecycleEffects(
        state === RuntimeExpressionResourceValueState.Absent
          ? []
          : [RuntimeExpressionResourceLifecycleEffectKind.SignalSubscription],
        state,
        signals,
        null,
        null,
        propertySource?.addressHandle ?? null,
        openReasons.length === 0 ? null : openReasons.join(' '),
      ),
      records,
    );
  }

  private sourceEvidenceForNode(
    local: string,
    evaluator: RuntimeBindingSourceValueEvaluator,
    node: ts.Node | null,
    summary: string,
  ): ReturnType<typeof sourceSpanEvidenceForSite> | null {
    if (node == null) {
      return null;
    }
    const source = evaluator.readEvaluatedSourceForNode(node);
    if (source == null) {
      return null;
    }
    const span = sourceSpanRangeForNode(source.sourceFile, node);
    if (span == null) {
      return null;
    }
    return sourceSpanEvidenceForSite(
      this.store,
      local,
      {
        sourceFileAddressHandle: source.admission.addressHandle,
        start: span.start,
        end: span.end,
      },
      SourceSpanRole.Value,
      [EvidenceRole.TransformInput],
      summary,
    );
  }

  private issueForValueConverter(
    input: RuntimeValueConverterMaterializationRequest,
    entry: RuntimeValueConverterPlanEntry,
  ): RuntimeValueConverterIssueDraft | null {
    switch (entry.builtInResource?.name) {
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
    entry: RuntimeValueConverterPlanEntry,
    phase: RuntimeValueConverterApplicationPhase,
    phaseReachability: RuntimeExpressionResourcePhaseReachability,
    phaseOrder: number | null,
    lifecycleEffects: RuntimeExpressionResourceLifecycleEffects,
    sourceAddressHandle: AddressHandle | null,
  ): RuntimeValueConverterApplication {
    const converter = entry.expression;
    return new RuntimeValueConverterApplication(
      this.store.handles.product(local),
      this.store.handles.identity(local),
      entry.binding.toReference(),
      entry.resource?.toReference() ?? null,
      phase,
      entry.origin,
      converter.name.name,
      converter.args.length,
      entry.expressionProductHandle,
      entry.chainIndex,
      entry.authoredChainDepth,
      entry.runtimeChainDepth,
      entry.bindReachability,
      phaseReachability,
      entry.bindOrder,
      phaseOrder,
      lifecycleEffects,
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
  expressionResourcePlan: RuntimeExpressionResourcePlan,
): readonly RuntimeValueConverterApplicationPhase[] {
  const conversionPhases = valueConverterConversionPhasesForBinding(binding, expressionResourcePlan);
  return [
    RuntimeValueConverterApplicationPhase.Bind,
    ...conversionPhases,
    RuntimeValueConverterApplicationPhase.Unbind,
  ];
}

function valueConverterConversionPhasesForBinding(
  binding: RuntimeBinding,
  expressionResourcePlan: RuntimeExpressionResourcePlan,
): readonly RuntimeValueConverterApplicationPhase[] {
  if (binding instanceof RefBinding) {
    return [
      RuntimeValueConverterApplicationPhase.FromView,
      RuntimeValueConverterApplicationPhase.ToView,
    ];
  }
  if (!(binding instanceof PropertyBinding)) {
    return [RuntimeValueConverterApplicationPhase.ToView];
  }
  switch (expressionResourcePlan.effectivePropertyBindingMode(binding)) {
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

function valueConverterPhaseReachability(
  plan: RuntimeExpressionResourcePlan,
  entry: RuntimeValueConverterPlanEntry,
  phase: RuntimeValueConverterApplicationPhase,
): RuntimeExpressionResourcePhaseReachability {
  if (entry.bindReachability !== RuntimeExpressionResourceBindReachability.Reached) {
    return RuntimeExpressionResourcePhaseReachability.BlockedByOuterFailure;
  }
  if (phase === RuntimeValueConverterApplicationPhase.Bind) {
    return RuntimeExpressionResourcePhaseReachability.Reached;
  }
  return plan.readPostBindPhaseReachability(entry);
}

function valueConverterPhaseOrder(
  entry: RuntimeValueConverterPlanEntry,
  phase: RuntimeValueConverterApplicationPhase,
  reachability: RuntimeExpressionResourcePhaseReachability,
  conversionOrder: ReturnType<RuntimeExpressionResourcePlan['readValueConverterPhaseOrder']>,
): number | null {
  if (reachability !== RuntimeExpressionResourcePhaseReachability.Reached) {
    return null;
  }
  switch (phase) {
    case RuntimeValueConverterApplicationPhase.Bind:
    case RuntimeValueConverterApplicationPhase.Unbind:
      return entry.bindOrder;
    case RuntimeValueConverterApplicationPhase.ToView:
      return conversionOrder?.toView ?? null;
    case RuntimeValueConverterApplicationPhase.FromView:
      return conversionOrder?.fromView ?? null;
  }
}

function lifecycleEffectsForValueConverter(
  _entry: RuntimeValueConverterPlanEntry,
  phase: RuntimeValueConverterApplicationPhase,
  reachability: RuntimeExpressionResourcePhaseReachability,
  configuredEffects: RuntimeExpressionResourceLifecycleEffects,
): RuntimeExpressionResourceLifecycleEffects {
  if (reachability !== RuntimeExpressionResourcePhaseReachability.Reached
    || (phase !== RuntimeValueConverterApplicationPhase.Bind
      && phase !== RuntimeValueConverterApplicationPhase.Unbind)) {
    return RuntimeExpressionResourceLifecycleEffects.none;
  }
  return configuredEffects;
}

function openValueConverterLifecycle(reason: string): RuntimeValueConverterLifecyclePublication {
  return new RuntimeValueConverterLifecyclePublication(
    new RuntimeExpressionResourceLifecycleEffects(
    [],
    RuntimeExpressionResourceValueState.Open,
    [],
    null,
    null,
    null,
      reason,
    ),
    [],
  );
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
