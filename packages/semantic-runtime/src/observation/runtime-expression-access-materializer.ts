import type { BindingScope } from '../configuration/scope.js';
import {
  expressionSourceName,
  expressionSourceRootName,
} from '../expression/expression-source-name.js';
import {
  checkerTypeMayBeRuntimeArrayInstance,
} from '../type-system/checker-collection-types.js';
import type { ExpressionAstNode } from '../expression/ast.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  EvidenceHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import { ProvenanceRecord } from '../kernel/provenance.js';
import {
  KernelPublicationPlan,
  publishHotDetail,
  publishProductDetails,
  type KernelPublicationContext,
} from '../kernel/publication.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  RuntimeExpressionAccessCoverage,
  RuntimeExpressionAccessForm,
  RuntimeExpressionAccessOwnerKind,
  RuntimeExpressionAccessOrigin,
  RuntimeExpressionAccessPhase,
  RuntimeExpressionAccessRole,
  RuntimeExpressionAccessTargetLink,
  RuntimeExpressionAccessTargetResolution,
  RuntimeExpressionAccessTracking,
  RuntimeExpressionExecutionMaximum,
  RuntimeExpressionExecutionMinimum,
  RuntimeExpressionExecutionQualifierKind,
  RuntimeExpressionOperationKind,
  type RuntimeExpressionAccessUse,
} from '../runtime-expression/runtime-expression-access-use.js';
import type { RuntimeExpressionAccessDraft } from '../runtime-expression/runtime-expression-access-draft.js';
import {
  type RuntimeExpressionAccessPublication,
  type TemplateExpressionAccessOccurrencePublication,
  publishRuntimeBindingExpressionAccessResolution,
  publishRuntimeExpressionAccessUse,
  publishTemplateExpressionAccessOccurrence,
} from '../runtime-expression/runtime-expression-access-publication.js';
import {
  RuntimeExpressionHotDetails,
  RuntimeExpressionProductDetails,
} from '../runtime-expression/product-details.js';
import {
  RuntimeBindingExpressionAccessContextKind,
  type RuntimeBindingExpressionAccessResolution,
} from '../runtime-expression/runtime-binding-expression-access-resolution.js';
import type {
  TemplateExpressionAccessOccurrence,
} from '../runtime-expression/template-expression-access-occurrence.js';
import {
  collectRuntimeTemplateAccessUseDrafts,
} from '../runtime-expression/template-access-use-collector.js';
import {
  collectRuntimeTypeScriptAccessUseDrafts,
} from '../runtime-expression/typescript-access-use-collector.js';
import {
  runtimeCheckerAccessTargetProjection,
} from '../runtime-expression/checker-access-target-projection.js';
import {
  RuntimeOperationRealization,
  RuntimeOperationReachability,
} from '../runtime-expression/runtime-operation.js';
import {
  IteratorBindingInstruction,
  MultiAttrInstruction,
} from '../template/instruction-ir.js';
import {
  RefBinding,
  SpreadValueBinding,
  type RuntimeBinding,
} from '../template/runtime-binding.js';
import {
  RuntimeBindingBehaviorApplicationPhase,
} from '../template/runtime-binding-behavior.js';
import type { RuntimeBindingBehaviorEmission } from '../template/runtime-binding-behavior-materializer.js';
import type { RuntimeControllerBindEmission } from '../template/runtime-controller-bind-materializer.js';
import type {
  RuntimeBindingBehaviorPlanEntry,
  RuntimeExpressionResourcePlan,
  RuntimeValueConverterPlanEntry,
} from '../template/runtime-expression-resource-plan.js';
import type { RuntimeRenderingEmission } from '../template/runtime-rendering-materializer.js';
import {
  RuntimeValueConverterApplicationPhase,
} from '../template/runtime-value-converter.js';
import type { RuntimeValueConverterEmission } from '../template/runtime-value-converter-materializer.js';
import {
  bindingExpressionAstForProduct,
} from '../template/expression-parse-product.js';
import { TemplateProductDetails } from '../template/product-details.js';
import type {
  TemplateScopeConstructionEmission,
} from '../template/template-controller-scope-materializer.js';
import type {
  CheckerExpressionAccessTargetExpression,
  CheckerExpressionTypeEvaluator,
} from '../type-system/expression-type-evaluator.js';
import {
  CheckerExpressionTypeEvaluationResultKind,
} from '../type-system/expression-type-evaluation.js';
import { TypeSystemHotDetails } from '../type-system/product-details.js';
import {
  CheckerTypeMember,
  CheckerTypeMemberKind,
  checkerTypeMemberReachableIdentityHandle,
} from '../type-system/type-shape.js';
import type {
  CheckerExpressionTypeEvaluationContext,
} from '../type-system/expression-type-context.js';
import {
  CheckerExpressionTypeBindingBehaviorEvaluation,
} from '../type-system/expression-type-context.js';
import type { CheckerExpressionTypeWorld } from '../type-system/expression-type-world.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  readCheckerTypeShape,
} from '../type-system/checker-type-shape-access.js';
import {
  runtimeAssignmentTargetAstForExpression,
} from '../expression/runtime-assignment.js';
import type { RuntimeBindingValueChannelEmission } from './binding-value-channel-materializer.js';
import type { RuntimeBindingValueChannel } from './runtime-binding-observation.js';
import {
  RuntimeObservedDependencyKind,
  RuntimeObservedMemberSourceRoute,
} from './runtime-binding-observation.js';
import {
  RuntimeBindingSourceEvaluationKind,
} from './runtime-binding-observation.js';
import {
  runtimeConnectableObservedAccessUseDrafts,
  type RuntimeTemplateArrayMethodPolicy,
} from './connectable-observed-dependency.js';
import type {
  RuntimeObservedDependencyAccessUseDraft,
} from './runtime-observed-dependency-draft.js';
import {
  observedDependencyAccessUseDrafts,
} from './runtime-observed-dependency-access-use.js';
import {
  observedMemberSourceForBindingDependency,
  observedMemberSourceForRuntimeExpressionAccessUse,
  type RuntimeObservedMemberSourceProjection,
} from './observed-dependency-member-source.js';
import {
  expressionProductHandleForBinding,
  instructionScopeLookup,
  isRuntimeExpressionBinding,
  runtimeBindingSourceExpression,
  type RuntimeExpressionBinding,
  type RuntimeInstructionScopeLookup,
} from './runtime-binding-expression.js';
import {
  sourceAddressForRuntimeExpressionSpan,
  type RuntimeExpressionSourceAddress,
} from '../template/runtime-expression-source-address.js';
import {
  aggregateRuntimeBindingSourceExpressionChainIndex,
  checkerContextForRuntimeBindingBehaviorArguments,
  checkerContextForRuntimeBindingSourceExpressionProjection,
  RuntimeBindingSourceExpressionContextProjector,
  RuntimeBindingSourceExpressionProjectionKind,
  runtimeBindingSourceExpressionParts,
  type RuntimeBindingSourceExpressionContextProjection,
} from './runtime-binding-source-expression-context.js';
import {
  runtimeBindingSourceChainLifecycle,
  runtimeBindingSourceEvaluationKindIncludesRead,
  runtimeBindingSourceLifecycle,
} from './runtime-binding-source-lifecycle.js';
import {
  runtimeAssignmentInputScopeForAccessScope,
} from './binding-source-write-capability.js';
import {
  collectRuntimeTrackableMethodObservedDependencyDrafts,
} from './trackable-method-observed-dependency.js';

export class RuntimeExpressionAccessMaterializationRequest {
  constructor(
    readonly localKey: string,
    readonly runtimeRendering: RuntimeRenderingEmission,
    readonly expressionResourcePlan: RuntimeExpressionResourcePlan,
    readonly controllerBind: RuntimeControllerBindEmission,
    readonly bindingBehavior: RuntimeBindingBehaviorEmission,
    readonly valueConverter: RuntimeValueConverterEmission,
    readonly valueChannels: RuntimeBindingValueChannelEmission,
    readonly scopes: TemplateScopeConstructionEmission,
    readonly typeSystem: TypeSystemProject | null,
    readonly expressionWorld: CheckerExpressionTypeWorld,
  ) {}
}

export class RuntimeExpressionAccessEmission {
  private readonly usesByBinding = new Map<ProductHandle, RuntimeExpressionAccessUse[]>();
  private readonly usesByExpressionProduct = new Map<ProductHandle, RuntimeExpressionAccessUse[]>();
  private readonly resolutionsByBinding = new Map<ProductHandle, RuntimeBindingExpressionAccessResolution[]>();
  private readonly resolutionsByExpressionProduct = new Map<ProductHandle, RuntimeBindingExpressionAccessResolution[]>();
  private readonly observationEffectsByBinding = new Map<ProductHandle, RuntimeBindingObservationEffectDraft[]>();

  constructor(
    readonly accessOccurrences: readonly TemplateExpressionAccessOccurrence[],
    readonly accessResolutions: readonly RuntimeBindingExpressionAccessResolution[],
    readonly accessUses: readonly RuntimeExpressionAccessUse[],
    readonly observationEffects: readonly RuntimeBindingObservationEffectDraft[],
    readonly records: readonly KernelStoreRecord[],
  ) {
    for (const resolution of accessResolutions) {
      const bindingRows = this.resolutionsByBinding.get(resolution.bindingProductHandle) ?? [];
      bindingRows.push(resolution);
      this.resolutionsByBinding.set(resolution.bindingProductHandle, bindingRows);
      const expressionRows = this.resolutionsByExpressionProduct.get(resolution.expressionProductHandle) ?? [];
      expressionRows.push(resolution);
      this.resolutionsByExpressionProduct.set(resolution.expressionProductHandle, expressionRows);
    }
    for (const accessUse of accessUses) {
      if (accessUse.ownerKind !== RuntimeExpressionAccessOwnerKind.Binding) {
        continue;
      }
      const rows = this.usesByBinding.get(accessUse.ownerProductHandle) ?? [];
      rows.push(accessUse);
      this.usesByBinding.set(accessUse.ownerProductHandle, rows);
      if (accessUse.expressionProductHandle != null) {
        const expressionRows = this.usesByExpressionProduct.get(accessUse.expressionProductHandle) ?? [];
        expressionRows.push(accessUse);
        this.usesByExpressionProduct.set(accessUse.expressionProductHandle, expressionRows);
      }
    }
    for (const effect of observationEffects) {
      const rows = this.observationEffectsByBinding.get(effect.accessUse.ownerProductHandle) ?? [];
      rows.push(effect);
      this.observationEffectsByBinding.set(effect.accessUse.ownerProductHandle, rows);
    }
  }

  readAccessUsesForBinding(productHandle: ProductHandle): readonly RuntimeExpressionAccessUse[] {
    return this.usesByBinding.get(productHandle) ?? [];
  }

  readAccessUsesForExpressionProduct(productHandle: ProductHandle): readonly RuntimeExpressionAccessUse[] {
    return this.usesByExpressionProduct.get(productHandle) ?? [];
  }

  readAccessResolutionsForBinding(
    productHandle: ProductHandle,
  ): readonly RuntimeBindingExpressionAccessResolution[] {
    return this.resolutionsByBinding.get(productHandle) ?? [];
  }

  readAccessResolutionsForExpressionProduct(
    productHandle: ProductHandle,
  ): readonly RuntimeBindingExpressionAccessResolution[] {
    return this.resolutionsByExpressionProduct.get(productHandle) ?? [];
  }

  readObservationEffectsForBinding(productHandle: ProductHandle): readonly RuntimeBindingObservationEffectDraft[] {
    return this.observationEffectsByBinding.get(productHandle) ?? [];
  }
}

/** Transient observation effect derived from one durable binding access use before its data-flow owner is published. */
export class RuntimeBindingObservationEffectDraft {
  constructor(
    readonly accessUse: RuntimeExpressionAccessUse,
    readonly dependency: RuntimeObservedDependencyAccessUseDraft,
    readonly scope: BindingScope | null,
    readonly memberProjection: RuntimeObservedMemberSourceProjection | null,
  ) {}
}

interface RuntimeExpressionAccessUseSourceSet {
  readonly records: readonly KernelStoreRecord[];
  readonly evidenceHandle: EvidenceHandle;
  readonly provenanceHandle: ProvenanceHandle;
}

interface RuntimeExpressionAccessOperation {
  readonly operationProductHandle: ProductHandle | null;
  readonly operationKind: RuntimeExpressionOperationKind;
  readonly operationIndex: number | null;
  readonly phase: RuntimeExpressionAccessPhase;
  readonly tracking: RuntimeExpressionAccessTracking;
  readonly reachability: RuntimeOperationReachability;
}

interface RuntimeBindingExpressionAccessContext {
  readonly binding: RuntimeExpressionBinding;
  readonly expressionProductHandle: ProductHandle | null;
  readonly expression: ExpressionAstNode;
  readonly checkerContext: CheckerExpressionTypeEvaluationContext | null;
  readonly scope: BindingScope | null;
  readonly contextKind: RuntimeBindingExpressionAccessContextKind;
  readonly rootRole: RuntimeExpressionAccessRole;
  readonly runtimeOperations: readonly RuntimeExpressionAccessOperation[];
}

interface RuntimeExpressionAccessMaterializationContext {
  readonly instructionScopes: RuntimeInstructionScopeLookup;
  readonly sourceContexts: RuntimeBindingSourceExpressionContextProjector;
}

function runtimeBindingAccessLocalKey(
  materializationLocalKey: string,
  binding: RuntimeExpressionBinding,
): string {
  return `${materializationLocalKey}:runtime-expression-access:${localKeyPart(binding.productHandle)}`;
}

/** Pairs authored expression occurrences with the exact runtime operation and scope that spend them. */
export class RuntimeExpressionAccessMaterializer {
  constructor(
    readonly store: KernelStore,
    readonly publication: KernelPublicationContext,
  ) {}

  materialize(
    input: RuntimeExpressionAccessMaterializationRequest,
  ): RuntimeExpressionAccessEmission {
    const source = this.recordsForSource(input.localKey);
    const accessOccurrencePublications: TemplateExpressionAccessOccurrencePublication[] = [];
    const accessResolutions: RuntimeBindingExpressionAccessResolution[] = [];
    const accessUses: RuntimeExpressionAccessUse[] = [];
    const observationEffects: RuntimeBindingObservationEffectDraft[] = [];
    const records: KernelStoreRecord[] = [...source.records];
    const instructionScopes = instructionScopeLookup(input.scopes.instructionScopes);
    const sourceContexts = new RuntimeBindingSourceExpressionContextProjector(
      input.runtimeRendering,
      instructionScopes,
      input.scopes.bindingExpressionScopes,
      input.expressionResourcePlan,
    );
    const context: RuntimeExpressionAccessMaterializationContext = {
      instructionScopes,
      sourceContexts,
    };
    const lexicalTargetSources = new Map<string, RuntimeExpressionSourceAddress>();
    const occurrencesByExpressionProduct = new Map<
      ProductHandle,
      Map<ExpressionAstNode, TemplateExpressionAccessOccurrencePublication>
    >();

    input.runtimeRendering.bindings
      .filter(isRuntimeExpressionBinding)
      .forEach((binding) => {
        const bindingLocal = runtimeBindingAccessLocalKey(input.localKey, binding);
        const evaluator = input.expressionWorld.evaluator(
          input.runtimeRendering.requireRenderContextForBinding(binding.productHandle).resourceScope,
        );
        const bindingContexts = this.accessContextsForBinding(input, context, binding, bindingLocal);
        bindingContexts.forEach((accessContext, contextIndex) => {
          const canUseRuntimeArrayMethod = accessContext.checkerContext == null
            ? null
            : this.templateArrayMethodPolicy(evaluator, accessContext.checkerContext);
          const drafts = collectRuntimeTemplateAccessUseDrafts({
            expression: accessContext.expression,
            rootRole: accessContext.rootRole,
            canUseRuntimeArrayMethod,
          });
          if (drafts.length > 0 && accessContext.expressionProductHandle == null) {
            throw new Error(
              `Authored binding access context '${binding.productHandle}:${accessContext.contextKind}' `
              + 'did not retain its owning expression-parse product.',
            );
          }
          const resolutions = drafts.map((draft, accessIndex) => {
            const expressionProductHandle = accessContext.expressionProductHandle!;
            let occurrences = occurrencesByExpressionProduct.get(expressionProductHandle);
            if (occurrences == null) {
              occurrences = new Map();
              occurrencesByExpressionProduct.set(expressionProductHandle, occurrences);
            }
            let occurrence = occurrences.get(draft.expression) ?? null;
            if (occurrence == null) {
              occurrence = publishTemplateExpressionAccessOccurrence({
                store: this.store,
                publication: this.publication,
                local: `${input.localKey}:template-expression-access:${localKeyPart(expressionProductHandle)}`
                  + `:${draft.sourceSpan.start}:${draft.nameSourceSpan?.start ?? 'range'}`,
                expressionProductHandle,
                draft,
                carrierSourceAddressHandle: binding.sourceAddressHandle,
              });
              occurrences.set(draft.expression, occurrence);
              accessOccurrencePublications.push(occurrence);
              records.push(...occurrence.records);
            }
            const lexicalTargetSource = this.lexicalTargetSourceForDraft(
              input.localKey,
              accessContext,
              draft,
              lexicalTargetSources,
            );
            if (lexicalTargetSource != null) {
              records.push(...lexicalTargetSource.records);
            }
            const target = this.targetForDraft(
              evaluator,
              accessContext,
              draft,
              lexicalTargetSource?.handle ?? null,
            );
            const resolution = publishRuntimeBindingExpressionAccessResolution({
              store: this.store,
              publication: this.publication,
              local: `${bindingLocal}:resolution:${contextIndex}:${accessIndex}`,
              bindingProductHandle: binding.productHandle,
              bindingIdentityHandle: binding.identityHandle,
              occurrence: occurrence.detail,
              contextKind: accessContext.contextKind,
              scopeProductHandle: accessContext.scope?.productHandle ?? null,
              draft,
              targetResolution: target.resolution,
              targetLinks: target.links,
            });
            accessResolutions.push(resolution);
            return resolution;
          });

          accessContext.runtimeOperations.forEach((operation, operationIndex) => {
            const publications = drafts.map((draft, accessIndex) => {
              const resolution = resolutions[accessIndex]!;
              const publication = publishRuntimeExpressionAccessUse({
                store: this.store,
                publication: this.publication,
                local: `${bindingLocal}:use:${contextIndex}:${operationIndex}:${accessIndex}`,
                index: accessIndex,
                operationProductHandle: operation.operationProductHandle,
                operationKind: operation.operationKind,
                operationIndex: operation.operationIndex,
                phase: operation.phase,
                tracking: this.trackingForDraft(operation, draft),
                realization: RuntimeOperationRealization.Direct,
                reachability: operation.reachability,
                draft,
                resolution,
                carrierSourceAddressHandle: binding.sourceAddressHandle,
                provenanceHandle: source.provenanceHandle,
              });
              accessUses.push(publication.detail);
              records.push(...publication.records);
              return publication;
            });
            observationEffects.push(...this.observationEffectsForOperation(
              evaluator,
              accessContext,
              operation,
              drafts,
              publications,
              canUseRuntimeArrayMethod,
            ));
            if (
              input.typeSystem != null
              && accessContext.checkerContext != null
              && operation.tracking === RuntimeExpressionAccessTracking.Connectable
              && operation.reachability === RuntimeOperationReachability.Reached
            ) {
              const trackable = this.trackableMethodEffectsForOperation(
                input,
                evaluator,
                accessContext,
                operation,
                drafts,
                canUseRuntimeArrayMethod,
                bindingLocal,
                contextIndex,
                operationIndex,
                drafts.length,
                source,
              );
              accessUses.push(...trackable.publications.map((publication) => publication.detail));
              records.push(...trackable.publications.flatMap((publication) => publication.records));
              observationEffects.push(...trackable.effects);
            }
          });
        });
        if (binding instanceof SpreadValueBinding) {
          const spreadMembers = this.spreadMemberAccessUsesForBinding(
            input,
            binding,
            bindingLocal,
            source,
          );
          accessUses.push(...spreadMembers.publications.map((publication) => publication.detail));
          records.push(...spreadMembers.publications.flatMap((publication) => publication.records));
          observationEffects.push(...spreadMembers.effects);
        }
      });

    const accessOccurrences = accessOccurrencePublications.map((row) => row.detail);
    const emission = new RuntimeExpressionAccessEmission(
      accessOccurrences,
      accessResolutions,
      accessUses,
      observationEffects,
      records,
    );
    this.publication.publish(new KernelPublicationPlan(
      new KernelStoreBatch(records, `runtime-expression-access-use:${input.localKey}`),
      publishProductDetails(RuntimeExpressionProductDetails.AccessUse, accessUses),
      [
        ...accessOccurrences.map((occurrence) => publishHotDetail(
          RuntimeExpressionHotDetails.TemplateAccessOccurrence,
          occurrence.expressionProductHandle,
          occurrence.detailHandle,
          occurrence,
        )),
        ...accessResolutions.map((resolution) => publishHotDetail(
          RuntimeExpressionHotDetails.BindingAccessResolution,
          resolution.bindingProductHandle,
          resolution.detailHandle,
          resolution,
        )),
      ],
    ));
    return emission;
  }

  private spreadMemberAccessUsesForBinding(
    input: RuntimeExpressionAccessMaterializationRequest,
    binding: SpreadValueBinding,
    bindingLocal: string,
    source: RuntimeExpressionAccessUseSourceSet,
  ): {
    readonly publications: readonly RuntimeExpressionAccessPublication[];
    readonly effects: readonly RuntimeBindingObservationEffectDraft[];
  } {
    const expression = runtimeBindingSourceExpression(this.publication, binding);
    if (expression == null) {
      return { publications: [], effects: [] };
    }
    const sourceExpression = runtimeAssignmentTargetAstForExpression(expression);
    const sourceName = expressionSourceName(sourceExpression);
    const sourceRootName = expressionSourceRootName(sourceExpression);
    const lifecycle = runtimeBindingSourceLifecycle(binding, input.expressionResourcePlan);
    const targetAccesses = input.controllerBind.readTargetAccessesForBinding(binding.productHandle);
    const publications: RuntimeExpressionAccessPublication[] = [];
    const effects: RuntimeBindingObservationEffectDraft[] = [];

    for (const valueChannel of input.valueChannels.readValueChannelsForBinding(binding.productHandle)) {
      const targetIndex = targetAccesses.findIndex(
        (targetAccess) => targetAccess.productHandle === valueChannel.targetAccess?.productHandle,
      );
      const targetProperty = valueChannel.targetAccess?.targetProperty ?? null;
      if (targetIndex < 0 || targetProperty == null) {
        throw new Error(
          `Spread value channel '${valueChannel.productHandle}' did not retain its generated member operation.`,
        );
      }
      const target = this.spreadMemberTarget(valueChannel);
      const publication = publishRuntimeExpressionAccessUse({
        store: this.store,
        publication: this.publication,
        local: `${bindingLocal}:spread-member:${targetIndex}`,
        index: targetIndex,
        ownerKind: RuntimeExpressionAccessOwnerKind.Binding,
        ownerProductHandle: binding.productHandle,
        ownerIdentityHandle: binding.identityHandle,
        operationProductHandle: null,
        expressionProductHandle: null,
        scopeProductHandle: null,
        operationKind: RuntimeExpressionOperationKind.SpreadMemberSource,
        operationIndex: targetIndex,
        phase: RuntimeExpressionAccessPhase.SourceEvaluation,
        tracking: RuntimeExpressionAccessTracking.Connectable,
        realization: valueChannel.realization,
        reachability: lifecycle.evaluationReachability,
        draft: {
          origin: RuntimeExpressionAccessOrigin.Generated,
          accessForm: RuntimeExpressionAccessForm.Scope,
          role: RuntimeExpressionAccessRole.Read,
          scopeLookupAncestor: 0,
          authoredScopeAncestor: null,
          callbackScopeDepth: null,
          lexicalLocal: false,
          executionQualifiers: [{
            kind: RuntimeExpressionExecutionQualifierKind.RuntimeObjectMemberGuard,
            sourceSpan: expression.span,
            operationName: targetProperty,
          }],
          minimumExecutions: RuntimeExpressionExecutionMinimum.Zero,
          maximumExecutions: RuntimeExpressionExecutionMaximum.One,
          coverage: RuntimeExpressionAccessCoverage.Complete,
          coverageReason: null,
          sourceSpan: expression.span,
          nameSourceSpan: null,
        },
        resolution: null,
        targetResolution: target.resolution,
        targetLinks: target.links,
        carrierSourceAddressHandle: binding.sourceAddressHandle,
        provenanceHandle: source.provenanceHandle,
        claims: [{
          localName: 'owner',
          subjectProductHandle: binding.productHandle,
          predicateKey: KernelVocabulary.RuntimeExpression.RuntimeBindingUsesAccessUse.key,
        }],
      });
      const projection = observedMemberSourceForRuntimeExpressionAccessUse(
        this.publication,
        publication.detail,
      ) ?? {
        observedMemberKind: valueChannel.admittedSourceMemberKind,
        observedMemberSourceAddressHandle: valueChannel.admittedSourceMemberSourceAddressHandle,
        observedMemberSourceRoute: valueChannel.admittedSourceMemberSourceAddressHandle == null
          ? null
          : RuntimeObservedMemberSourceRoute.MemberDeclaration,
      };
      const dependency: RuntimeObservedDependencyAccessUseDraft = {
        accessUseProductHandle: publication.detail.productHandle,
        accessUseSourceAddressHandle: publication.detail.sourceAddressHandle,
        dependencyKind: RuntimeObservedDependencyKind.TemplateExpressionRead,
        expressionKind: 'AccessMember',
        sourceName: sourceName == null ? targetProperty : `${sourceName}.${targetProperty}`,
        sourceRootName,
        memberName: targetProperty,
        keyExpression: null,
        methodName: null,
        observedMemberKind: projection.observedMemberKind,
        observedMemberSourceAddressHandle: projection.observedMemberSourceAddressHandle,
        observedMemberSourceRoute: projection.observedMemberSourceRoute,
        memberNameSpanStart: null,
        memberNameSpanEnd: null,
        scopeLookupAncestor: 0,
        spanStart: expression.span.start,
        spanEnd: expression.span.end,
      };
      publications.push(publication);
      effects.push(new RuntimeBindingObservationEffectDraft(
        publication.detail,
        dependency,
        null,
        projection,
      ));
    }
    return { publications, effects };
  }

  private spreadMemberTarget(
    valueChannel: RuntimeBindingValueChannel,
  ): {
    readonly resolution: RuntimeExpressionAccessTargetResolution;
    readonly links: readonly RuntimeExpressionAccessTargetLink[];
  } {
    const member = valueChannel.admittedSourceMemberHandle == null
      ? null
      : this.publication.readHotDetail(
          TypeSystemHotDetails.TypeMember,
          valueChannel.admittedSourceMemberHandle,
        );
    if (member instanceof CheckerTypeMember) {
      return {
        resolution: RuntimeExpressionAccessTargetResolution.Exact,
        links: [new RuntimeExpressionAccessTargetLink(
          member.ownerType.productHandle,
          checkerTypeMemberReachableIdentityHandle(member),
          member.detailHandle,
          member.detailHandle,
          valueChannel.admittedSourceMemberSourceAddressHandle,
        )],
      };
    }
    const owner = valueChannel.admittedSourceOwnerType;
    if (valueChannel.admittedSourceMemberKind === CheckerTypeMemberKind.IndexSignature) {
      return {
        resolution: RuntimeExpressionAccessTargetResolution.IndexSignature,
        links: [new RuntimeExpressionAccessTargetLink(
          owner?.productHandle ?? null,
          owner?.identityHandle ?? null,
          null,
          null,
          owner?.sourceAddressHandle ?? null,
        )],
      };
    }
    if (valueChannel.admittedSourceMemberSourceAddressHandle != null) {
      return {
        resolution: RuntimeExpressionAccessTargetResolution.Exact,
        links: [new RuntimeExpressionAccessTargetLink(
          owner?.productHandle ?? null,
          owner?.identityHandle ?? null,
          null,
          null,
          valueChannel.admittedSourceMemberSourceAddressHandle,
        )],
      };
    }
    return {
      resolution: RuntimeExpressionAccessTargetResolution.Open,
      links: [],
    };
  }

  private trackableMethodEffectsForOperation(
    input: RuntimeExpressionAccessMaterializationRequest,
    evaluator: CheckerExpressionTypeEvaluator,
    accessContext: RuntimeBindingExpressionAccessContext,
    operation: RuntimeExpressionAccessOperation,
    invocationAccesses: readonly RuntimeExpressionAccessDraft[],
    canUseRuntimeArrayMethod: RuntimeTemplateArrayMethodPolicy | null,
    bindingLocal: string,
    contextIndex: number,
    operationIndex: number,
    firstAccessIndex: number,
    source: RuntimeExpressionAccessUseSourceSet,
  ): {
    readonly publications: readonly RuntimeExpressionAccessPublication[];
    readonly effects: readonly RuntimeBindingObservationEffectDraft[];
  } {
    if (input.typeSystem == null || accessContext.checkerContext == null) {
      return { publications: [], effects: [] };
    }
    const publications: RuntimeExpressionAccessPublication[] = [];
    const effects: RuntimeBindingObservationEffectDraft[] = [];
    const methods = collectRuntimeTrackableMethodObservedDependencyDrafts({
      checkerContext: accessContext.checkerContext,
      store: this.store,
      publication: this.publication,
      evaluator,
      canUseRuntimeArrayMethod,
    });
    for (const [methodIndex, method] of methods.entries()) {
      const invocationAccess = invocationAccesses.find((access) =>
        access.role === RuntimeExpressionAccessRole.Call
        && access.sourceSpan.file?.id === method.invocationSourceSpan.file?.id
        && access.sourceSpan.start === method.invocationSourceSpan.start
        && access.sourceSpan.end === method.invocationSourceSpan.end
      ) ?? null;
      if (invocationAccess == null) {
        throw new Error(
          `Trackable method '${method.methodName}' did not retain its template invocation access.`,
        );
      }
      const drafts = collectRuntimeTypeScriptAccessUseDrafts({
        declaration: method.declaration,
        typeSystem: input.typeSystem,
        store: this.store,
        publication: this.publication,
        trackedDependencies: method.dependencies,
        executionHandoff: {
          sourceSpan: method.invocationSourceSpan,
          operationName: method.methodName,
          caller: invocationAccess,
          coverageReason: 'A statically selected trackable method contributes these reads, but runtime dispatch can select another implementation.',
        },
      });
      const methodPublications = drafts.map((draft, methodAccessIndex) =>
        publishRuntimeExpressionAccessUse({
          store: this.store,
          publication: this.publication,
          local: `${bindingLocal}:use:${contextIndex}:${operationIndex}`
            + `:method:${methodIndex}:${methodAccessIndex}`,
          index: firstAccessIndex + publications.length + methodAccessIndex,
          ownerKind: RuntimeExpressionAccessOwnerKind.Binding,
          ownerProductHandle: accessContext.binding.productHandle,
          ownerIdentityHandle: accessContext.binding.identityHandle,
          operationProductHandle: operation.operationProductHandle,
          expressionProductHandle: null,
          scopeProductHandle: null,
          operationKind: operation.operationKind,
          operationIndex: operation.operationIndex,
          phase: operation.phase,
          tracking: draft.tracking,
          realization: RuntimeOperationRealization.Direct,
          reachability: operation.reachability,
          draft,
          resolution: null,
          targetResolution: draft.targetResolution,
          targetLinks: draft.targetLinks,
          carrierSourceAddressHandle: accessContext.binding.sourceAddressHandle,
          provenanceHandle: source.provenanceHandle,
          claims: [{
            localName: 'owner',
            subjectProductHandle: accessContext.binding.productHandle,
            predicateKey: KernelVocabulary.RuntimeExpression.RuntimeBindingUsesAccessUse.key,
          }],
        })
      );
      const dependencies = observedDependencyAccessUseDrafts(
        this.publication,
        method.dependencies,
        methodPublications,
      );
      const accessUsesByHandle = new Map(
        methodPublications.map((publication) => [publication.detail.productHandle, publication.detail] as const),
      );
      effects.push(...dependencies.map((dependency) => {
        const accessUse = accessUsesByHandle.get(dependency.accessUseProductHandle);
        if (accessUse == null) {
          throw new Error(
            `Trackable method '${method.methodName}' lost access-use '${dependency.accessUseProductHandle}'.`,
          );
        }
        return new RuntimeBindingObservationEffectDraft(
          accessUse,
          dependency,
          accessContext.scope,
          null,
        );
      }));
      publications.push(...methodPublications);
    }
    return { publications, effects };
  }

  private observationEffectsForOperation(
    evaluator: CheckerExpressionTypeEvaluator,
    accessContext: RuntimeBindingExpressionAccessContext,
    operation: RuntimeExpressionAccessOperation,
    drafts: readonly RuntimeExpressionAccessDraft[],
    publications: readonly RuntimeExpressionAccessPublication[],
    canUseRuntimeArrayMethod: RuntimeTemplateArrayMethodPolicy | null,
  ): readonly RuntimeBindingObservationEffectDraft[] {
    const publicationByDraft = new Map(
      publications.map((publication) => [publication.draft, publication]),
    );
    return runtimeConnectableObservedAccessUseDrafts(
      drafts,
      canUseRuntimeArrayMethod,
      accessContext.expression,
    ).flatMap(({ accessUse, dependency }) => {
      const publication = publicationByDraft.get(accessUse) ?? null;
      if (publication?.detail.tracking !== RuntimeExpressionAccessTracking.Connectable) {
        return [];
      }
      const accessUseDependency: RuntimeObservedDependencyAccessUseDraft = {
        ...dependency,
        accessUseProductHandle: publication.detail.productHandle,
        accessUseSourceAddressHandle: publication.detail.sourceAddressHandle,
      };
      const memberProjection = accessContext.checkerContext == null
        ? null
        : accessUseDependency.dependencyKind === RuntimeObservedDependencyKind.TemplateCollectionRead
          ? observedMemberSourceForBindingDependency({
              dependency: accessUseDependency,
              checkerContext: accessContext.checkerContext,
              evaluator,
              localKey: `${accessContext.checkerContext.localKey}:collection-observation`,
            })
          : observedMemberSourceForRuntimeExpressionAccessUse(
              this.publication,
              publication.detail,
            ) ?? observedMemberSourceForBindingDependency({
              dependency: accessUseDependency,
              checkerContext: accessContext.checkerContext,
              evaluator,
              localKey: `${accessContext.checkerContext.localKey}:access-observation`,
            });
      return [new RuntimeBindingObservationEffectDraft(
        publication.detail,
        accessUseDependency,
        accessContext.scope,
        memberProjection,
      )];
    });
  }

  private trackingForDraft(
    operation: RuntimeExpressionAccessOperation,
    draft: RuntimeExpressionAccessDraft,
  ): RuntimeExpressionAccessTracking {
    if (
      draft.role === RuntimeExpressionAccessRole.WriteTarget
    ) {
      return RuntimeExpressionAccessTracking.NotApplicable;
    }
    if (
      operation.tracking === RuntimeExpressionAccessTracking.Connectable
      && draft.executionQualifiers.some(
        (qualifier) => qualifier.kind === RuntimeExpressionExecutionQualifierKind.OpenInvocation,
      )
    ) {
      return RuntimeExpressionAccessTracking.Open;
    }
    return operation.tracking;
  }

  private templateArrayMethodPolicy(
    evaluator: CheckerExpressionTypeEvaluator,
    checkerContext: CheckerExpressionTypeEvaluationContext,
  ): RuntimeTemplateArrayMethodPolicy {
    return (expression, rootExpression) => {
      const ownerType = evaluator.evaluateMemberOwnerAtOffset(
        checkerContext.child(
          rootExpression,
          `access-use:collection-owner:${expression.span.start}:${expression.name.span.start}:${localKeyPart(expression.name.name)}`,
        ),
        expression.name.span.start,
      );
      const typeReference = ownerType.kind === CheckerExpressionTypeEvaluationResultKind.Type
        ? ownerType.typeReference
        : ownerType.partialTypeReference;
      if (typeReference == null) {
        return true;
      }
      const carrier = readCheckerTypeShape(this.publication, typeReference)?.carrier ?? null;
      return carrier == null
        ? true
        : checkerTypeMayBeRuntimeArrayInstance(carrier.checker, carrier.type);
    };
  }

  private accessContextsForBinding(
    input: RuntimeExpressionAccessMaterializationRequest,
    context: RuntimeExpressionAccessMaterializationContext,
    binding: RuntimeExpressionBinding,
    bindingLocal: string,
  ): readonly RuntimeBindingExpressionAccessContext[] {
    const accessContexts: RuntimeBindingExpressionAccessContext[] = [];
    const expression = runtimeBindingSourceExpression(this.publication, binding);
    if (expression == null) {
      return accessContexts;
    }
    const expressionProductHandle = expressionProductHandleForBinding(binding);
    const lifecycle = runtimeBindingSourceLifecycle(binding, input.expressionResourcePlan);
    const sourceScope = context.instructionScopes.scopeForBinding(input.runtimeRendering, binding);
    const projections = context.sourceContexts.projectSourceExpressions({
      binding,
      expressionProductHandle,
      expressionChainIndex: aggregateRuntimeBindingSourceExpressionChainIndex(expression),
      expression,
      localKey: `${bindingLocal}:source`,
    });
    const authoredParts = runtimeBindingSourceExpressionParts(expression);
    const interpolation = expression.$kind === 'Interpolation';

    projections.forEach((projection, index) => {
      const authoredPart = authoredParts[index] ?? expression;
      const chainLifecycle = runtimeBindingSourceChainLifecycle(
        binding,
        input.expressionResourcePlan,
        expressionProductHandle,
        index,
      );
      accessContexts.push(this.sourceValueAccessContext(
        binding,
        expressionProductHandle,
        authoredPart,
        projection,
        index,
        interpolation,
        chainLifecycle.evaluationKind,
        chainLifecycle.evaluationReachability,
      ));
    });

    if (lifecycle.includesSourceAssignment) {
      const target = runtimeAssignmentTargetAstForExpression(expression);
      if (target != null) {
        const assignmentScope = sourceScope != null && target.$kind === 'AccessScope'
          ? runtimeAssignmentInputScopeForAccessScope(
              target,
              binding.instructionProductHandle,
              sourceScope,
            )
          : sourceScope;
        const projection = assignmentScope == null
          ? null
          : context.sourceContexts.projectSource({
              binding,
              expressionProductHandle,
              expressionChainIndex: 0,
              expression: target,
              localKey: `${bindingLocal}:source-assignment`,
              sourceScope: assignmentScope,
            });
        const sourceOperation = binding instanceof RefBinding
          ? input.controllerBind.readSourceOperationsForBinding(binding.productHandle)[0] ?? null
          : null;
        accessContexts.push({
          binding,
          expressionProductHandle,
          expression: target,
          checkerContext: projection?.kind === RuntimeBindingSourceExpressionProjectionKind.Context
            ? checkerContextForRuntimeBindingSourceExpressionProjection(projection, false)
            : null,
          scope: projection?.kind === RuntimeBindingSourceExpressionProjectionKind.Context
            ? projection.scope
            : assignmentScope,
          contextKind: RuntimeBindingExpressionAccessContextKind.SourceAssignment,
          rootRole: RuntimeExpressionAccessRole.WriteTarget,
          runtimeOperations: [{
            operationProductHandle: sourceOperation?.productHandle ?? null,
            operationKind: RuntimeExpressionOperationKind.BindingSource,
            operationIndex: null,
            phase: RuntimeExpressionAccessPhase.SourceAssignment,
            tracking: RuntimeExpressionAccessTracking.NotApplicable,
            reachability: lifecycle.evaluationReachability,
          }],
        });
      }
    }

    accessContexts.push(
      ...this.bindingBehaviorArgumentAccessContexts(input, projections, binding, expressionProductHandle),
      ...this.valueConverterArgumentAccessContexts(
        input,
        projections,
        binding,
        expressionProductHandle,
      ),
      ...this.repeatAuxiliaryAccessContexts(input, context, binding),
    );
    return accessContexts;
  }

  private sourceValueAccessContext(
    binding: RuntimeExpressionBinding,
    expressionProductHandle: ProductHandle | null,
    authoredPart: ExpressionAstNode,
    projection: ReturnType<RuntimeBindingSourceExpressionContextProjector['projectSourceExpressions']>[number],
    partIndex: number,
    interpolation: boolean,
    evaluationKind: RuntimeBindingSourceEvaluationKind,
    reachability: RuntimeOperationReachability,
  ): RuntimeBindingExpressionAccessContext {
    const known = projection.kind === RuntimeBindingSourceExpressionProjectionKind.Context
      ? projection
      : null;
    const tracking = trackingForSourceEvaluationKind(evaluationKind);
    return {
      binding,
      expressionProductHandle,
      expression: known?.expression ?? authoredPart,
      checkerContext: known == null
        ? null
        : checkerContextForRuntimeBindingSourceExpressionProjection(
            known,
            tracking === RuntimeExpressionAccessTracking.Connectable,
          ),
      scope: known?.scope ?? null,
      contextKind: RuntimeBindingExpressionAccessContextKind.SourceValue,
      rootRole: RuntimeExpressionAccessRole.Read,
      runtimeOperations: runtimeBindingSourceEvaluationKindIncludesRead(evaluationKind)
        ? [{
            operationProductHandle: null,
            operationKind: interpolation
              ? RuntimeExpressionOperationKind.InterpolationPart
              : RuntimeExpressionOperationKind.BindingSource,
            operationIndex: interpolation ? partIndex : null,
            phase: RuntimeExpressionAccessPhase.SourceEvaluation,
            tracking,
            reachability: known?.sourceEvaluationReachability ?? reachability,
          }]
        : [],
    };
  }

  private bindingBehaviorArgumentAccessContexts(
    input: RuntimeExpressionAccessMaterializationRequest,
    projections: readonly ReturnType<RuntimeBindingSourceExpressionContextProjector['projectSourceExpressions']>[number][],
    binding: RuntimeExpressionBinding,
    expressionProductHandle: ProductHandle | null,
  ): readonly RuntimeBindingExpressionAccessContext[] {
    const accessContexts: RuntimeBindingExpressionAccessContext[] = [];
    for (const entry of input.expressionResourcePlan.behaviorEntries) {
      if (entry.binding.productHandle !== binding.productHandle) {
        continue;
      }
      const application = input.bindingBehavior.readApplicationsForPlanEntry(entry)
        .find((candidate) => candidate.phase === RuntimeBindingBehaviorApplicationPhase.Bind) ?? null;
      const projection = projectionForBehaviorEntry(projections, entry);
      entry.occurrence.expression.args.forEach((argument, index) => {
        accessContexts.push({
          binding,
          expressionProductHandle: entry.expressionProductHandle ?? expressionProductHandle,
          expression: argument,
          checkerContext: projection == null
            ? null
            : checkerContextForRuntimeBindingBehaviorArguments(
                projection,
                null,
                `binding-behavior-argument:${entry.behaviorIndex}:${index}`,
              ).child(argument, `argument:${index}`),
          scope: projection?.bindScope ?? null,
          contextKind: RuntimeBindingExpressionAccessContextKind.BindingBehaviorArgument,
          rootRole: RuntimeExpressionAccessRole.Read,
          runtimeOperations: [{
            operationProductHandle: application?.productHandle ?? null,
            operationKind: RuntimeExpressionOperationKind.BindingBehaviorArgument,
            operationIndex: index,
            phase: RuntimeExpressionAccessPhase.Bind,
            tracking: RuntimeExpressionAccessTracking.Untracked,
            reachability: application?.phaseReachability ?? RuntimeOperationReachability.Open,
          }],
        });
      });
    }
    return accessContexts;
  }

  private valueConverterArgumentAccessContexts(
    input: RuntimeExpressionAccessMaterializationRequest,
    projections: readonly ReturnType<RuntimeBindingSourceExpressionContextProjector['projectSourceExpressions']>[number][],
    binding: RuntimeExpressionBinding,
    expressionProductHandle: ProductHandle | null,
  ): readonly RuntimeBindingExpressionAccessContext[] {
    const accessContexts: RuntimeBindingExpressionAccessContext[] = [];
    for (const entry of input.expressionResourcePlan.converterEntries) {
      if (entry.binding.productHandle !== binding.productHandle) {
        continue;
      }
      const projection = projectionForConverterEntry(projections, entry);
      const lifecycle = runtimeBindingSourceChainLifecycle(
        binding,
        input.expressionResourcePlan,
        entry.expressionProductHandle,
        entry.chainIndex,
      );
      const applications = input.valueConverter.readApplicationsForPlanEntry(entry)
        .filter((application) =>
          application.phase === RuntimeValueConverterApplicationPhase.ToView
          || application.phase === RuntimeValueConverterApplicationPhase.FromView
        );
      entry.expression.args.forEach((argument, index) => {
        accessContexts.push({
            binding,
            expressionProductHandle: entry.expressionProductHandle ?? expressionProductHandle,
            expression: argument,
            checkerContext: projection == null
              ? null
              : checkerContextForRuntimeBindingSourceExpressionProjection(
                  projection,
                  applications.some((application) =>
                    application.phase === RuntimeValueConverterApplicationPhase.ToView
                    && trackingForSourceEvaluationKind(lifecycle.evaluationKind)
                      === RuntimeExpressionAccessTracking.Connectable
                  ),
                  null,
                  `value-converter-argument:${entry.converterIndex}:${index}`,
                ).child(argument, `argument:${index}`),
            scope: projection?.scope ?? null,
            contextKind: RuntimeBindingExpressionAccessContextKind.ValueConverterArgument,
            rootRole: RuntimeExpressionAccessRole.Read,
            runtimeOperations: applications.map((application) => {
              const fromView = application.phase === RuntimeValueConverterApplicationPhase.FromView;
              return {
                operationProductHandle: application.productHandle,
                operationKind: RuntimeExpressionOperationKind.ValueConverterArgument,
                operationIndex: index,
                phase: fromView
                  ? RuntimeExpressionAccessPhase.SourceAssignment
                  : RuntimeExpressionAccessPhase.SourceEvaluation,
                tracking: fromView
                  ? RuntimeExpressionAccessTracking.Untracked
                  : trackingForSourceEvaluationKind(lifecycle.evaluationKind),
                reachability: application.phaseReachability,
              };
            }),
          });
      });
    }
    return accessContexts;
  }

  private repeatAuxiliaryAccessContexts(
    input: RuntimeExpressionAccessMaterializationRequest,
    context: RuntimeExpressionAccessMaterializationContext,
    binding: RuntimeExpressionBinding,
  ): readonly RuntimeBindingExpressionAccessContext[] {
    const instruction = this.publication.readProductDetail(
      TemplateProductDetails.Instruction,
      binding.instructionProductHandle,
    );
    if (!(instruction instanceof IteratorBindingInstruction)) {
      return [];
    }
    const controllerProductHandle = input.runtimeRendering
      .requireRenderContextForBinding(binding.productHandle)
      .sourceController.productHandle;
    const accessContexts: RuntimeBindingExpressionAccessContext[] = [];
    for (const handle of instruction.tailInstructionProductHandles) {
      const tail = this.publication.readProductDetail(TemplateProductDetails.Instruction, handle);
      if (!(tail instanceof MultiAttrInstruction)
        || tail.command !== 'bind'
        || tail.expressionProductHandle == null
        || (tail.target !== 'key' && tail.target !== 'contextual')) {
        continue;
      }
      const expression = bindingExpressionAstForProduct(this.publication, tail.expressionProductHandle);
      if (expression == null) {
        continue;
      }
      const scope = context.instructionScopes.scopeForInstruction(tail.productHandle, controllerProductHandle);
      const projection = scope == null
        ? null
        : context.sourceContexts.projectSourceWithBindingBehavior({
            binding,
            expressionProductHandle: tail.expressionProductHandle,
            expressionChainIndex: aggregateRuntimeBindingSourceExpressionChainIndex(expression),
            expression,
            localKey: `${input.localKey}:runtime-expression-access:${binding.productHandle}:repeat:${tail.target}`,
            sourceScope: scope,
          }, CheckerExpressionTypeBindingBehaviorEvaluation.AstEvaluateOnly);
      const known = projection?.kind === RuntimeBindingSourceExpressionProjectionKind.Context
        ? projection
        : null;
      accessContexts.push({
        binding,
        expressionProductHandle: tail.expressionProductHandle,
        expression: known?.expression ?? expression,
        checkerContext: known == null
          ? null
          : checkerContextForRuntimeBindingSourceExpressionProjection(known, false),
        scope: known?.scope ?? scope,
        contextKind: tail.target === 'key'
          ? RuntimeBindingExpressionAccessContextKind.RepeatKey
          : RuntimeBindingExpressionAccessContextKind.RepeatContextual,
        rootRole: RuntimeExpressionAccessRole.Read,
        runtimeOperations: [{
          operationProductHandle: tail.productHandle,
          operationKind: tail.target === 'key'
            ? RuntimeExpressionOperationKind.RepeatKey
            : RuntimeExpressionOperationKind.RepeatContextual,
          operationIndex: null,
          phase: tail.target === 'key'
            ? RuntimeExpressionAccessPhase.CollectionReconciliation
            : RuntimeExpressionAccessPhase.Bind,
          tracking: RuntimeExpressionAccessTracking.Untracked,
          reachability: projection?.sourceEvaluationReachability
            ?? RuntimeOperationReachability.Open,
        }],
      });
    }
    return accessContexts;
  }

  private targetForDraft(
    evaluator: CheckerExpressionTypeEvaluator,
    accessContext: RuntimeBindingExpressionAccessContext,
    draft: RuntimeExpressionAccessDraft,
    lexicalTargetSourceAddressHandle: AddressHandle | null,
  ): {
    readonly resolution: RuntimeExpressionAccessTargetResolution;
    readonly links: readonly RuntimeExpressionAccessTargetLink[];
  } {
    if (lexicalTargetSourceAddressHandle != null) {
      return {
        resolution: RuntimeExpressionAccessTargetResolution.Exact,
        links: [new RuntimeExpressionAccessTargetLink(
          accessContext.expressionProductHandle,
          null,
          null,
          null,
          lexicalTargetSourceAddressHandle,
        )],
      };
    }
    const expression = accessTargetExpression(draft);
    if (accessContext.checkerContext == null || expression == null) {
      return {
        resolution: RuntimeExpressionAccessTargetResolution.Open,
        links: [],
      };
    }
    return runtimeCheckerAccessTargetProjection(
      evaluator.resolveAccessTarget(accessContext.checkerContext, expression),
    );
  }

  private lexicalTargetSourceForDraft(
    localKey: string,
    accessContext: RuntimeBindingExpressionAccessContext,
    draft: RuntimeExpressionAccessDraft,
    sources: Map<string, RuntimeExpressionSourceAddress>,
  ): RuntimeExpressionSourceAddress | null {
    const span = draft.lexicalDeclarationSpan;
    if (span == null) {
      return null;
    }
    const key = `${span.file?.id ?? 'no-file'}:${span.start}:${span.end}`;
    const existing = sources.get(key);
    if (existing != null) {
      return { handle: existing.handle, records: [] };
    }
    const source = sourceAddressForRuntimeExpressionSpan(
      this.publication,
      `${localKey}:runtime-expression-lexical-target:${localKeyPart(key)}`,
      accessContext.binding.sourceAddressHandle,
      span,
    );
    sources.set(key, source);
    return source;
  }

  private recordsForSource(localKey: string): RuntimeExpressionAccessUseSourceSet {
    const evidenceHandle = this.store.handles.evidence(`runtime-expression-access-use:${localKey}`);
    const provenanceHandle = this.store.handles.provenance(`runtime-expression-access-use:${localKey}`);
    return {
      records: [
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
          'Authored expression accesses paired with exact Aurelia runtime owners, operation slots, scopes, and checker targets.',
          null,
        ),
        new ProvenanceRecord(provenanceHandle, [evidenceHandle]),
      ],
      evidenceHandle,
      provenanceHandle,
    };
  }
}

function trackingForSourceEvaluationKind(
  kind: RuntimeBindingSourceEvaluationKind,
): RuntimeExpressionAccessTracking {
  switch (kind) {
    case RuntimeBindingSourceEvaluationKind.ConnectableRead:
      return RuntimeExpressionAccessTracking.Connectable;
    case RuntimeBindingSourceEvaluationKind.UntrackedRead:
      return RuntimeExpressionAccessTracking.Untracked;
    case RuntimeBindingSourceEvaluationKind.AssignmentOnly:
    case RuntimeBindingSourceEvaluationKind.NotEvaluated:
      return RuntimeExpressionAccessTracking.NotApplicable;
    case RuntimeBindingSourceEvaluationKind.Open:
      return RuntimeExpressionAccessTracking.Open;
  }
}

function projectionForBehaviorEntry(
  projections: readonly ReturnType<RuntimeBindingSourceExpressionContextProjector['projectSourceExpressions']>[number][],
  entry: RuntimeBindingBehaviorPlanEntry,
): RuntimeBindingSourceExpressionContextProjection | null {
  return projectionContainingSpan(projections, entry.occurrence.expression.span);
}

function projectionForConverterEntry(
  projections: readonly ReturnType<RuntimeBindingSourceExpressionContextProjector['projectSourceExpressions']>[number][],
  entry: RuntimeValueConverterPlanEntry,
): RuntimeBindingSourceExpressionContextProjection | null {
  return projectionContainingSpan(projections, entry.expression.span);
}

function projectionContainingSpan(
  projections: readonly ReturnType<RuntimeBindingSourceExpressionContextProjector['projectSourceExpressions']>[number][],
  span: ExpressionAstNode['span'],
): RuntimeBindingSourceExpressionContextProjection | null {
  return projections.find((projection) =>
    projection.kind === RuntimeBindingSourceExpressionProjectionKind.Context
    && projection.authoredExpression.span.start <= span.start
    && projection.authoredExpression.span.end >= span.end
  ) as RuntimeBindingSourceExpressionContextProjection | undefined ?? null;
}

function accessTargetExpression(
  draft: RuntimeExpressionAccessDraft,
): CheckerExpressionAccessTargetExpression | null {
  switch (draft.expression.$kind) {
    case 'AccessThis':
      return draft.expression;
    case 'AccessScope':
    case 'CallScope':
      return draft.lexicalLocal ? null : draft.expression;
    case 'AccessMember':
    case 'CallMember':
    case 'AccessKeyed':
      return draft.expression;
    default:
      return null;
  }
}
