import ts from 'typescript';
import { splitWhitespace } from '../strings.js';
import {
  arrayElementTypeFor,
  collectionElementTypeFor,
  isBooleanLike,
  mapKeyTypeFor,
  stringLiteralValuesForType,
} from './checker-type-helpers.js';
import { SemanticClaim } from '../kernel/claim.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  EvidenceHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  CompilerIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  OpenSeam,
} from '../kernel/open-seam.js';
import {
  compactFieldProvenance,
  FieldProvenance,
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelVocabulary,
  type OpenSeamKindKey,
} from '../kernel/vocabulary.js';
import type { ExpressionAstNode } from '../expression/ast.js';
import type { BindingScope } from '../configuration/scope.js';
import {
  CheckerExpressionTypeEvaluationResultKind,
  CheckerExpressionTypeEvaluator,
} from '../type-system/expression-type-evaluator.js';
import {
  CheckerTypeProjector,
  type CheckerSyntheticTypeProjectionRequest,
} from '../type-system/checker-projector.js';
import { TypeSystemProductDetails } from '../type-system/product-details.js';
import {
  CheckerTypeProjectionOrigin,
  CheckerTypeShapeKind,
  type CheckerTypeShape,
  type CheckerTypeReference,
} from '../type-system/type-shape.js';
import {
  HtmlElement,
  HtmlIrNodeKind,
  HtmlText,
  type HtmlAttribute,
  type HtmlNodeReference,
} from '../template/html-ir.js';
import { TemplateProductDetails } from '../template/product-details.js';
import { ObservationProductDetails } from './product-details.js';
import {
  AttributeBinding,
  ContentBinding,
  InterpolationBinding,
  PropertyBinding,
  RefBinding,
  SpreadValueBinding,
  type RuntimeBinding,
  type RuntimeBindingSourceOperation,
  RuntimeBindingTargetAccessStrategy,
  type RuntimeBindingTargetAccess,
  RuntimeBindingTargetOperationKind,
  type RuntimeBindingTargetOperation,
} from '../template/runtime-binding.js';
import {
  RuntimeBindingValueChannel,
  RuntimeBindingValueChannelAuthority,
  type RuntimeBindingValueChannelField,
  RuntimeBindingValueChannelKind,
} from './runtime-binding-observation.js';
import type { RuntimeRenderingEmission } from '../template/runtime-rendering-materializer.js';
import type { RuntimeControllerBindEmission } from '../template/runtime-controller-bind-materializer.js';
import type { TemplateResourceScope } from '../template/compiler-world.js';
import type { TemplateExpressionParse } from '../template/value-site.js';
import {
  runtimeAcceptedBindingExpressionAstForParse,
} from '../template/expression-parse-projection.js';
import type {
  TemplateInstructionScopeApplication,
  TemplateScopeConstructionEmission,
} from '../template/template-controller-scope-materializer.js';

export class RuntimeBindingValueChannelMaterializationRequest {
  constructor(
    /** Store-local key shared with the template compilation pass. */
    readonly localKey: string,
    /** Runtime binding products produced by renderer dispatch. */
    readonly runtimeBindings: RuntimeRenderingEmission,
    /** Controller.bind target-side products produced by binding-owned target setup. */
    readonly controllerBind: RuntimeControllerBindEmission,
    /** Runtime Scope applications visible to instruction-owned expressions. */
    readonly scopes: TemplateScopeConstructionEmission,
    /** Compiler resource scope visible to expression semantics such as value converters. */
    readonly resourceScope: TemplateResourceScope | null = null,
  ) {}
}

export class RuntimeBindingValueChannelEmission {
  private readonly valueChannelsByBinding = new Map<ProductHandle, RuntimeBindingValueChannel[]>();

  constructor(
    /** Runtime binding value-channel products materialized for property, attribute, and interpolation bindings. */
    readonly valueChannels: readonly RuntimeBindingValueChannel[],
    /** Open observer/value-shape pressures encountered while creating channel products. */
    readonly openSeams: readonly OpenSeam[],
    /** Kernel records emitted for value-channel products, claims, provenance, and seams. */
    readonly records: readonly KernelStoreRecord[],
  ) {
    for (const valueChannel of valueChannels) {
      if (valueChannel.binding.productHandle == null) {
        continue;
      }
      let rows = this.valueChannelsByBinding.get(valueChannel.binding.productHandle);
      if (rows === undefined) {
        rows = [];
        this.valueChannelsByBinding.set(valueChannel.binding.productHandle, rows);
      }
      rows.push(valueChannel);
    }
  }

  readValueChannelsForBinding(productHandle: ProductHandle): readonly RuntimeBindingValueChannel[] {
    return this.valueChannelsByBinding.get(productHandle) ?? [];
  }
}

class BindingValueChannelSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly evidenceHandle: EvidenceHandle,
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

class BindingValueChannelRecordEmission {
  constructor(
    readonly valueChannel: RuntimeBindingValueChannel,
    readonly openSeams: readonly OpenSeam[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

type ValueChannelDraft = {
  readonly channelKind: RuntimeBindingValueChannelKind;
  readonly authority: RuntimeBindingValueChannelAuthority;
  readonly runtimeValueType: CheckerTypeReference | null;
  readonly valueDomain: readonly string[];
  readonly isCollection: boolean | null;
  readonly openReason: string | null;
};

type CheckedSourceShape = {
  readonly kind: 'boolean' | 'collection' | 'map' | 'other' | 'open';
};

type SelectMultipleMode =
  | {
    readonly kind: 'single' | 'multiple';
  }
  | {
    readonly kind: 'open';
    readonly openReason: string;
  };

type BindingValueExpression = {
  readonly valueType: CheckerTypeReference | null;
  readonly valueDomain: readonly string[];
};

type BindingSourceTypeReader = () => CheckerTypeReference | null;

type BindingValueChannelContext = {
  readonly input: RuntimeBindingValueChannelMaterializationRequest;
  readonly instructionScopes: ReadonlyMap<ProductHandle, BindingScope>;
  readonly evaluator: CheckerExpressionTypeEvaluator;
};

type ValueChannelTarget = {
  readonly localSuffix: string;
  readonly targetAccess: RuntimeBindingTargetAccess | null;
  readonly targetOperation: RuntimeBindingTargetOperation | null;
  readonly sourceOperation: RuntimeBindingSourceOperation | null;
};

type RuntimeValueChannelBinding =
  | PropertyBinding
  | AttributeBinding
  | InterpolationBinding
  | ContentBinding
  | RefBinding
  | SpreadValueBinding;

/** Materializes the value shape that sits between target-side runtime behavior and binding data flow. */
export class RuntimeBindingValueChannelMaterializer {
  private readonly typeProjector: CheckerTypeProjector;

  constructor(
    /** Hot analysis store that receives binding value-channel products. */
    readonly store: KernelStore,
  ) {
    this.typeProjector = new CheckerTypeProjector(store);
  }

  materialize(input: RuntimeBindingValueChannelMaterializationRequest): RuntimeBindingValueChannelEmission {
    const emission = this.recordsForValueChannels(input);
    if (emission.records.length > 0) {
      this.store.commit(new KernelStoreBatch(emission.records, `binding-value-channel:${input.localKey}`));
    }
    this.registerProductDetails(emission);
    return emission;
  }

  private registerProductDetails(emission: RuntimeBindingValueChannelEmission): void {
    for (const valueChannel of emission.valueChannels) {
      this.store.productDetails.add(ObservationProductDetails.RuntimeBindingValueChannel, valueChannel.productHandle, valueChannel);
    }
  }

  private recordsForValueChannels(input: RuntimeBindingValueChannelMaterializationRequest): RuntimeBindingValueChannelEmission {
    const records: KernelStoreRecord[] = [];
    const valueChannels: RuntimeBindingValueChannel[] = [];
    const openSeams: OpenSeam[] = [];
    const source = this.recordsForSource(input.localKey);
    records.push(...source.records);
    const instructionScopes = instructionScopeMap(input.scopes.instructionScopes);
    const evaluator = new CheckerExpressionTypeEvaluator(this.store, this.typeProjector, input.resourceScope);

    input.runtimeBindings.bindings.forEach((binding, index) => {
      if (!isRuntimeValueChannelBinding(binding)) {
        return;
      }
      const targetAccesses = input.controllerBind.readTargetAccessesForBinding(binding.productHandle);
      const targetOperations = input.controllerBind.readTargetOperationsForBinding(binding.productHandle);
      const sourceOperations = input.controllerBind.readSourceOperationsForBinding(binding.productHandle);
      const scope = instructionScopes.get(binding.instructionProductHandle) ?? null;
      const targets = valueChannelTargetsForBinding(binding, targetAccesses, targetOperations, sourceOperations);
      targets.forEach((target) => {
        const emission = this.recordsForValueChannel(input, source, {
          input,
          instructionScopes,
          evaluator,
        }, binding, index, target, scope);
        records.push(...emission.records);
        openSeams.push(...emission.openSeams);
        valueChannels.push(emission.valueChannel);
      });
    });

    return new RuntimeBindingValueChannelEmission(valueChannels, openSeams, records);
  }

  private recordsForValueChannel(
    input: RuntimeBindingValueChannelMaterializationRequest,
    source: BindingValueChannelSourceSet,
    context: BindingValueChannelContext,
    binding: RuntimeValueChannelBinding,
    bindingIndex: number,
    target: ValueChannelTarget,
    scope: BindingScope | null,
  ): BindingValueChannelRecordEmission {
    const records: KernelStoreRecord[] = [];
    const openSeams: OpenSeam[] = [];
    const local = `${input.localKey}:binding:${bindingIndex}:${binding.productHandle}:value-channel${target.localSuffix}`;
    const readSourceType = this.sourceTypeReaderForBinding(
      binding,
      scope,
      context.evaluator,
      target.targetAccess?.targetProperty ?? null,
    );
    const draft = this.valueChannelDraftForBinding(
      local,
      binding,
      target.targetAccess,
      target.targetOperation,
      target.sourceOperation,
      readSourceType,
      context,
    );
    const valueChannel = this.valueChannelForTarget(local, binding, target, draft, source);
    const claim = new SemanticClaim(
      this.store.handles.claim(`${local}:runtime-binding-uses-value-channel`),
      binding.productHandle,
      KernelVocabulary.Binding.RuntimeBindingUsesValueChannel.key,
      valueChannel.productHandle,
      source.provenanceHandle,
    );
    if (valueChannel.openReason != null) {
      this.recordOpenSeam(
        `${local}:open-value-channel`,
        valueChannel.openReason,
        binding.sourceAddressHandle,
        source,
        records,
        openSeams,
        KernelVocabulary.Binding.OpenValueChannel.key,
      );
    }
    records.push(...this.valueChannelRecords(local, binding, target, valueChannel, claim, openSeams, source));
    return new BindingValueChannelRecordEmission(valueChannel, openSeams, records);
  }

  private valueChannelForTarget(
    local: string,
    binding: RuntimeValueChannelBinding,
    target: ValueChannelTarget,
    draft: ValueChannelDraft,
    source: BindingValueChannelSourceSet,
  ): RuntimeBindingValueChannel {
    return new RuntimeBindingValueChannel(
      this.store.handles.product(local),
      this.store.handles.identity(local),
      binding.toReference(),
      target.targetAccess?.toReference() ?? null,
      target.targetOperation?.toReference() ?? null,
      target.sourceOperation?.toReference() ?? null,
      draft.channelKind,
      draft.authority,
      target.targetAccess?.propertyType ?? null,
      draft.runtimeValueType,
      draft.valueDomain,
      draft.isCollection,
      draft.openReason,
      binding.sourceAddressHandle,
      this.valueChannelFieldProvenance(target, draft, source),
    );
  }

  private valueChannelFieldProvenance(
    target: ValueChannelTarget,
    draft: ValueChannelDraft,
    source: BindingValueChannelSourceSet,
  ): readonly FieldProvenance<RuntimeBindingValueChannelField>[] {
    return compactFieldProvenance<RuntimeBindingValueChannelField>([
      new FieldProvenance('binding', source.provenanceHandle),
      target.targetAccess == null ? null : new FieldProvenance('targetAccess', source.provenanceHandle),
      target.targetOperation == null ? null : new FieldProvenance('targetOperation', source.provenanceHandle),
      target.sourceOperation == null ? null : new FieldProvenance('sourceOperation', source.provenanceHandle),
      new FieldProvenance('channelKind', source.provenanceHandle),
      new FieldProvenance('authority', source.provenanceHandle),
      target.targetAccess?.propertyType == null ? null : new FieldProvenance('rawTargetPropertyType', source.provenanceHandle),
      draft.runtimeValueType == null ? null : new FieldProvenance('runtimeValueType', source.provenanceHandle),
      draft.valueDomain.length === 0 ? null : new FieldProvenance('valueDomain', source.provenanceHandle),
      draft.isCollection == null ? null : new FieldProvenance('isCollection', source.provenanceHandle),
      draft.openReason == null ? null : new FieldProvenance('openReason', source.provenanceHandle),
      new FieldProvenance('source', source.provenanceHandle),
    ]);
  }

  private valueChannelRecords(
    local: string,
    binding: RuntimeValueChannelBinding,
    target: ValueChannelTarget,
    valueChannel: RuntimeBindingValueChannel,
    claim: SemanticClaim,
    openSeams: readonly OpenSeam[],
    source: BindingValueChannelSourceSet,
  ): readonly KernelStoreRecord[] {
    return [
      new CompilerIdentity(
        valueChannel.identityHandle,
        KernelVocabulary.Binding.ValueChannel.key,
        binding.identityHandle,
        binding.sourceAddressHandle,
        `${valueChannel.channelKind}:${target.targetAccess?.targetProperty ?? binding.target}`,
      ),
      new MaterializedProduct(
        valueChannel.productHandle,
        KernelVocabulary.Binding.ValueChannel.key,
        valueChannel.identityHandle,
        binding.sourceAddressHandle,
        source.provenanceHandle,
      ),
      claim,
      new MaterializationRecord(
        this.store.handles.materialization(`${local}:binding-value-channel`),
        valueChannel.identityHandle,
        [valueChannel.productHandle],
        [claim.handle],
        openSeams.map((seam) => seam.handle),
      ),
    ];
  }

  private valueChannelDraftForBinding(
    local: string,
    binding: RuntimeValueChannelBinding,
    targetAccess: RuntimeBindingTargetAccess | null,
    targetOperation: RuntimeBindingTargetOperation | null,
    sourceOperation: RuntimeBindingSourceOperation | null,
    readSourceType: BindingSourceTypeReader,
    context: BindingValueChannelContext,
  ): ValueChannelDraft {
    if (binding instanceof RefBinding) {
      return this.valueChannelDraftForSourceOperation(sourceOperation);
    }
    if (binding instanceof SpreadValueBinding && targetAccess == null) {
      const sourceType = readSourceType();
      return {
        channelKind: RuntimeBindingValueChannelKind.Open,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: sourceType,
        valueDomain: [],
        isCollection: null,
        openReason: 'SpreadValueBinding could not close its target bindable keys for per-bindable inner PropertyBinding materialization.',
      };
    }
    if (binding instanceof AttributeBinding || binding instanceof ContentBinding) {
      return this.valueChannelDraftForTargetOperation(targetOperation, readSourceType);
    }
    if (targetAccess == null) {
      return {
        channelKind: RuntimeBindingValueChannelKind.Open,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: null,
        valueDomain: [],
        isCollection: null,
        openReason: 'Runtime binding did not carry a target accessor or observer product for value-channel materialization.',
      };
    }
    if (targetAccess.openReason != null) {
      return {
        channelKind: RuntimeBindingValueChannelKind.Open,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        isCollection: null,
        openReason: targetAccess.openReason,
      };
    }

    switch (targetAccess.strategy) {
      case RuntimeBindingTargetAccessStrategy.ClassAttributeAccessor:
        return this.classValueChannelDraft(binding, targetAccess, readSourceType);
      case RuntimeBindingTargetAccessStrategy.StyleAttributeAccessor:
        return this.styleValueChannelDraft(binding, targetAccess, readSourceType);
      case RuntimeBindingTargetAccessStrategy.AttributeAccessor:
      case RuntimeBindingTargetAccessStrategy.DataAttributeAccessor:
        return this.attributeValueChannelDraft(readSourceType, targetAccess);
      case RuntimeBindingTargetAccessStrategy.SelectValueObserver:
        if (!(binding instanceof PropertyBinding)) {
          return {
            channelKind: RuntimeBindingValueChannelKind.Open,
            authority: RuntimeBindingValueChannelAuthority.Open,
            runtimeValueType: targetAccess.propertyType,
            valueDomain: [],
            isCollection: null,
            openReason: 'SelectValueObserver value-channel materialization expected a runtime PropertyBinding product.',
          };
        }
        return this.selectValueChannelDraft(local, binding, targetAccess, readSourceType, context);
      case RuntimeBindingTargetAccessStrategy.CheckedObserver:
        if (!(binding instanceof PropertyBinding)) {
          return {
            channelKind: RuntimeBindingValueChannelKind.Open,
            authority: RuntimeBindingValueChannelAuthority.Open,
            runtimeValueType: targetAccess.propertyType,
            valueDomain: [],
            isCollection: null,
            openReason: 'CheckedObserver value-channel materialization expected a runtime PropertyBinding product.',
          };
        }
        return this.checkedValueChannelDraft(local, binding, targetAccess, readSourceType, context);
      default:
        return {
          channelKind: RuntimeBindingValueChannelKind.RawProperty,
          authority: RuntimeBindingValueChannelAuthority.TargetAccess,
          runtimeValueType: targetAccess.propertyType,
          valueDomain: [],
          isCollection: null,
          openReason: null,
      };
    }
  }

  private valueChannelDraftForTargetOperation(
    targetOperation: RuntimeBindingTargetOperation | null,
    readSourceType: BindingSourceTypeReader,
  ): ValueChannelDraft {
    if (targetOperation == null) {
      return {
        channelKind: RuntimeBindingValueChannelKind.Open,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: null,
        valueDomain: [],
        isCollection: null,
        openReason: 'Runtime binding did not carry a direct target-operation product for value-channel materialization.',
      };
    }
    const sourceType = readSourceType();
    if (targetOperation.openReason != null) {
      return {
        channelKind: RuntimeBindingValueChannelKind.Open,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: sourceType,
        valueDomain: [],
        isCollection: null,
        openReason: targetOperation.openReason,
      };
    }

    switch (targetOperation.operationKind) {
      case RuntimeBindingTargetOperationKind.PropertySet:
      case RuntimeBindingTargetOperationKind.AttributeSet:
      case RuntimeBindingTargetOperationKind.ClassListAdd:
      case RuntimeBindingTargetOperationKind.StyleCssTextAppend:
      case RuntimeBindingTargetOperationKind.EventListenerAdd:
        return {
          channelKind: RuntimeBindingValueChannelKind.Open,
          authority: RuntimeBindingValueChannelAuthority.Open,
          runtimeValueType: sourceType,
          valueDomain: targetOperation.affectedNames,
          isCollection: null,
          openReason: 'Renderer-owned static target operation reached AttributeBinding value-channel materialization.',
        };
      case RuntimeBindingTargetOperationKind.TextContentSet:
        return {
          channelKind: RuntimeBindingValueChannelKind.TextContent,
          authority: sourceType == null
            ? RuntimeBindingValueChannelAuthority.TargetOperation
            : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
          runtimeValueType: sourceType,
          valueDomain: [],
          isCollection: false,
          openReason: null,
        };
      case RuntimeBindingTargetOperationKind.ClassListToggle:
        return this.classToggleValueChannelDraft(targetOperation, readSourceType);
      case RuntimeBindingTargetOperationKind.StyleSetProperty:
        return this.stylePropertyValueChannelDraft(targetOperation, readSourceType);
      case RuntimeBindingTargetOperationKind.AttributeSetOrRemove:
        return {
          channelKind: RuntimeBindingValueChannelKind.AttributeValue,
          authority: sourceType == null
            ? RuntimeBindingValueChannelAuthority.TargetOperation
            : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
          runtimeValueType: sourceType,
          valueDomain: targetOperation.affectedNames,
          isCollection: null,
          openReason: null,
        };
      case RuntimeBindingTargetOperationKind.Open:
        return {
          channelKind: RuntimeBindingValueChannelKind.Open,
          authority: RuntimeBindingValueChannelAuthority.Open,
          runtimeValueType: sourceType,
          valueDomain: [],
          isCollection: null,
          openReason: targetOperation.openReason ?? 'AttributeBinding target operation stayed open.',
        };
    }
  }

  private valueChannelDraftForSourceOperation(
    sourceOperation: RuntimeBindingSourceOperation | null,
  ): ValueChannelDraft {
    if (sourceOperation == null) {
      return {
        channelKind: RuntimeBindingValueChannelKind.Open,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: null,
        valueDomain: [],
        isCollection: null,
        openReason: 'Runtime binding did not carry a source-operation product for value-channel materialization.',
      };
    }
    if (sourceOperation.openReason != null) {
      return {
        channelKind: RuntimeBindingValueChannelKind.Open,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: sourceOperation.targetType,
        valueDomain: [],
        isCollection: null,
        openReason: sourceOperation.openReason,
      };
    }
    return {
      channelKind: RuntimeBindingValueChannelKind.RefTarget,
      authority: RuntimeBindingValueChannelAuthority.SourceOperation,
      runtimeValueType: sourceOperation.targetType,
      valueDomain: [],
      isCollection: false,
      openReason: null,
    };
  }

  private classToggleValueChannelDraft(
    targetOperation: RuntimeBindingTargetOperation,
    readSourceType: BindingSourceTypeReader,
  ): ValueChannelDraft {
    const sourceType = readSourceType();
    if (targetOperation.affectedNames.length === 0) {
      return {
        channelKind: RuntimeBindingValueChannelKind.ClassToggle,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: sourceType,
        valueDomain: [],
        isCollection: false,
        openReason: 'Class attribute binding did not expose any class token to toggle.',
      };
    }
    return {
      channelKind: RuntimeBindingValueChannelKind.ClassToggle,
      authority: sourceType == null
        ? RuntimeBindingValueChannelAuthority.TargetOperation
        : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
      runtimeValueType: sourceType,
      valueDomain: targetOperation.affectedNames,
      isCollection: targetOperation.affectedNames.length > 1,
      openReason: null,
    };
  }

  private stylePropertyValueChannelDraft(
    targetOperation: RuntimeBindingTargetOperation,
    readSourceType: BindingSourceTypeReader,
  ): ValueChannelDraft {
    const sourceType = readSourceType();
    return {
      channelKind: RuntimeBindingValueChannelKind.StylePropertyValue,
      authority: sourceType == null
        ? RuntimeBindingValueChannelAuthority.TargetOperation
        : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
      runtimeValueType: sourceType,
      valueDomain: targetOperation.affectedNames,
      isCollection: false,
      openReason: null,
    };
  }

  private classValueChannelDraft(
    binding: RuntimeValueChannelBinding,
    targetAccess: RuntimeBindingTargetAccess,
    readSourceType: BindingSourceTypeReader,
  ): ValueChannelDraft {
    const sourceType = readSourceType();
    if (binding instanceof AttributeBinding && binding.attr === 'class') {
      const classTokens = splitWhitespace(binding.target);
      if (classTokens.length === 0) {
        return {
          channelKind: RuntimeBindingValueChannelKind.ClassToggle,
          authority: RuntimeBindingValueChannelAuthority.Open,
          runtimeValueType: sourceType,
          valueDomain: [],
          isCollection: false,
          openReason: 'Class attribute binding did not expose any class token to toggle.',
        };
      }
      return {
        channelKind: RuntimeBindingValueChannelKind.ClassToggle,
        authority: sourceType == null
          ? RuntimeBindingValueChannelAuthority.BindingExpression
          : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
        runtimeValueType: sourceType,
        valueDomain: classTokens,
        isCollection: classTokens.length > 1,
        openReason: null,
      };
    }
    return {
      channelKind: RuntimeBindingValueChannelKind.ClassAttributeTokens,
      authority: sourceType == null
        ? RuntimeBindingValueChannelAuthority.TargetAccess
        : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
      runtimeValueType: sourceType ?? targetAccess.propertyType,
      valueDomain: [],
      isCollection: null,
      openReason: null,
    };
  }

  private styleValueChannelDraft(
    binding: RuntimeValueChannelBinding,
    targetAccess: RuntimeBindingTargetAccess,
    readSourceType: BindingSourceTypeReader,
  ): ValueChannelDraft {
    const sourceType = readSourceType();
    if (binding instanceof AttributeBinding && binding.attr === 'style') {
      const styleTarget = binding.target.trim();
      if (styleTarget.length > 0 && styleTarget !== 'style') {
        return {
          channelKind: RuntimeBindingValueChannelKind.StylePropertyValue,
          authority: sourceType == null
            ? RuntimeBindingValueChannelAuthority.BindingExpression
            : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
          runtimeValueType: sourceType,
          valueDomain: [styleTarget],
          isCollection: false,
          openReason: null,
        };
      }
      return {
        channelKind: RuntimeBindingValueChannelKind.StyleAttributeRules,
        authority: sourceType == null
          ? RuntimeBindingValueChannelAuthority.BindingExpression
          : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
        runtimeValueType: sourceType ?? targetAccess.propertyType,
        valueDomain: [],
        isCollection: null,
        openReason: null,
      };
    }
    return {
      channelKind: RuntimeBindingValueChannelKind.StyleAttributeRules,
      authority: sourceType == null
        ? RuntimeBindingValueChannelAuthority.TargetAccess
        : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
      runtimeValueType: sourceType ?? targetAccess.propertyType,
      valueDomain: [],
      isCollection: null,
      openReason: null,
    };
  }

  private attributeValueChannelDraft(
    readSourceType: BindingSourceTypeReader,
    targetAccess: RuntimeBindingTargetAccess,
  ): ValueChannelDraft {
    const sourceType = readSourceType();
    return {
      channelKind: RuntimeBindingValueChannelKind.AttributeValue,
      authority: sourceType == null
        ? RuntimeBindingValueChannelAuthority.TargetAccess
        : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
      runtimeValueType: sourceType ?? targetAccess.propertyType,
      valueDomain: [],
      isCollection: null,
      openReason: null,
    };
  }

  private selectValueChannelDraft(
    local: string,
    binding: PropertyBinding,
    targetAccess: RuntimeBindingTargetAccess,
    readSourceType: BindingSourceTypeReader,
    context: BindingValueChannelContext,
  ): ValueChannelDraft {
    const select = this.htmlElementFor(targetAccess.targetNode);
    if (select == null || normalizeTagName(select.tagName) !== 'SELECT') {
      return {
        channelKind: RuntimeBindingValueChannelKind.Open,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        isCollection: null,
        openReason: 'SelectValueObserver value channel did not carry a closed authored <select> node.',
      };
    }

    const multiple = this.selectMultipleMode(`${local}:multiple`, select, context);
    const options = this.optionElementsFor(select);
    if (multiple.kind === 'open') {
      return {
        channelKind: RuntimeBindingValueChannelKind.SelectMultipleOptionValues,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        isCollection: true,
        openReason: multiple.openReason,
      };
    }
    if (multiple.kind === 'multiple') {
      return this.selectMultipleValueChannelDraft(local, binding, targetAccess, readSourceType, context, options);
    }

    return this.selectSingleValueChannelDraft(local, binding, targetAccess, context, options);
  }

  private selectMultipleValueChannelDraft(
    local: string,
    binding: PropertyBinding,
    targetAccess: RuntimeBindingTargetAccess,
    readSourceType: BindingSourceTypeReader,
    context: BindingValueChannelContext,
    options: readonly HtmlElement[],
  ): ValueChannelDraft {
    const optionValues = options.map((option, index) =>
      this.optionRuntimeValue(`${local}:option:${index}`, option, context)
    );
    const openOption = optionValues.find((option) => option.valueType == null && option.valueDomain.length === 0);
    if (openOption != null) {
      return {
        channelKind: RuntimeBindingValueChannelKind.SelectMultipleOptionValues,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        isCollection: true,
        openReason: 'SelectValueObserver multiple option value channel could not close every option value through static value or expression-backed model/value binding.',
      };
    }
    const valueDomain = uniqueStrings(optionValues.flatMap((option) => option.valueDomain));
    const runtimeValueType = valueDomain.length === 0
      ? targetAccess.propertyType
      : this.stringLiteralDomainType(`${local}:select-multiple-option-domain`, valueDomain, binding.sourceAddressHandle);
    if (valueDomain.length === 0) {
      return {
        channelKind: RuntimeBindingValueChannelKind.SelectMultipleOptionValues,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType,
        valueDomain: [],
        isCollection: true,
        openReason: 'SelectValueObserver did not expose any option value domain for the multi-select value channel.',
      };
    }
    const sourceShape = this.selectMultipleSourceShape(readSourceType());
    if (sourceShape.kind === 'open') {
      return {
        channelKind: RuntimeBindingValueChannelKind.SelectMultipleOptionValues,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType,
        valueDomain,
        isCollection: true,
        openReason: 'SelectValueObserver multiple mode requires a TypeChecker-visible array source before collection element mutation can close.',
      };
    }
    if (sourceShape.kind !== 'collection') {
      return {
        channelKind: RuntimeBindingValueChannelKind.SelectMultipleOptionValues,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType,
        valueDomain,
        isCollection: true,
        openReason: 'SelectValueObserver multiple mode mutates an array source; the binding source did not close as an array.',
      };
    }

    return {
      channelKind: RuntimeBindingValueChannelKind.SelectMultipleOptionValues,
      authority: optionValues.some((option) => option.valueType != null)
        ? RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker
        : RuntimeBindingValueChannelAuthority.StaticTemplateAndTypeChecker,
      runtimeValueType,
      valueDomain,
      isCollection: true,
      openReason: null,
    };
  }

  private selectMultipleMode(
    local: string,
    select: HtmlElement,
    context: BindingValueChannelContext,
  ): SelectMultipleMode {
    const binding = this.propertyBindingForNodeTarget(select, context.input, ['multiple']);
    if (binding != null) {
      const literal = this.bindingBooleanLiteral(local, binding);
      if (literal != null) {
        return {
          kind: literal ? 'multiple' : 'single',
        };
      }
      return {
        kind: 'open',
        openReason: 'SelectValueObserver multiple mode depends on a dynamic lowered multiple binding that is not value-closed yet.',
      };
    }
    return {
      kind: this.hasAttribute(select, 'multiple') ? 'multiple' : 'single',
    };
  }

  private bindingBooleanLiteral(
    _local: string,
    binding: PropertyBinding,
  ): boolean | null {
    const parse = this.readParse(binding.expressionProductHandle);
    const ast = parse == null ? null : runtimeAcceptedBindingExpressionAstForParse(parse);
    return ast == null ? null : booleanLiteralForExpression(ast);
  }

  private selectMultipleSourceShape(
    sourceType: CheckerTypeReference | null,
  ): CheckedSourceShape {
    const shape = this.readTypeShape(sourceType);
    const carrier = shape?.carrier ?? null;
    if (carrier == null) {
      return {
        kind: 'open',
      };
    }
    return arrayElementTypeFor(carrier.checker, carrier.type) == null
      ? {
        kind: 'other',
      }
      : {
        kind: 'collection',
      };
  }

  private selectSingleValueChannelDraft(
    local: string,
    binding: PropertyBinding,
    targetAccess: RuntimeBindingTargetAccess,
    context: BindingValueChannelContext,
    options: readonly HtmlElement[],
  ): ValueChannelDraft {
    const optionValues = options.map((option, index) =>
      this.optionRuntimeValue(`${local}:option:${index}`, option, context)
    );
    const openOption = optionValues.find((option) => option.valueType == null && option.valueDomain.length === 0);
    if (openOption != null) {
      return {
        channelKind: RuntimeBindingValueChannelKind.SelectSingleOptionValue,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        isCollection: false,
        openReason: 'SelectValueObserver option value channel could not close every option value through static value or expression-backed model/value binding.',
      };
    }
    const valueDomain = uniqueStrings(optionValues.flatMap((option) => option.valueDomain));
    if (valueDomain.length === 0) {
      return {
        channelKind: RuntimeBindingValueChannelKind.SelectSingleOptionValue,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        isCollection: false,
        openReason: 'SelectValueObserver did not expose any static <option> value domain for the single-select value channel.',
      };
    }

    return {
      channelKind: RuntimeBindingValueChannelKind.SelectSingleOptionValue,
      authority: optionValues.some((option) => option.valueType != null)
        ? RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker
        : RuntimeBindingValueChannelAuthority.StaticTemplate,
      runtimeValueType: this.stringLiteralDomainType(`${local}:select-option-domain`, valueDomain, binding.sourceAddressHandle),
      valueDomain,
      isCollection: false,
      openReason: null,
    };
  }

  private checkedValueChannelDraft(
    local: string,
    binding: PropertyBinding,
    targetAccess: RuntimeBindingTargetAccess,
    readSourceType: BindingSourceTypeReader,
    context: BindingValueChannelContext,
  ): ValueChannelDraft {
    const input = this.htmlElementFor(targetAccess.targetNode);
    if (input == null || normalizeTagName(input.tagName) !== 'INPUT') {
      return {
        channelKind: RuntimeBindingValueChannelKind.Open,
        authority: RuntimeBindingValueChannelAuthority.Open,
        runtimeValueType: targetAccess.propertyType,
        valueDomain: [],
        isCollection: null,
        openReason: 'CheckedObserver value channel did not carry a closed authored <input> node.',
      };
    }

    const type = (this.attributeValue(input, 'type') ?? 'text').toLowerCase();
    if (type === 'radio') {
      const elementValue = this.inputRuntimeValue(local, input, context);
      if (elementValue.valueType == null && elementValue.valueDomain.length === 0) {
        return {
          channelKind: RuntimeBindingValueChannelKind.CheckedModel,
          authority: RuntimeBindingValueChannelAuthority.Open,
          runtimeValueType: targetAccess.propertyType,
          valueDomain: [],
          isCollection: false,
          openReason: 'CheckedObserver radio value channel could not close the input model/value through static value or expression-backed binding.',
        };
      }
      return {
        channelKind: RuntimeBindingValueChannelKind.CheckedRadioValue,
        authority: elementValue.valueType == null
          ? RuntimeBindingValueChannelAuthority.StaticTemplate
          : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
        runtimeValueType: elementValue.valueType
          ?? this.stringLiteralDomainType(
            `${binding.productHandle}:checked-radio-domain`,
            elementValue.valueDomain,
            binding.sourceAddressHandle,
          ),
        valueDomain: elementValue.valueDomain,
        isCollection: false,
        openReason: null,
      };
    }

    if (type === 'checkbox') {
      const sourceShape = this.checkedSourceShape(readSourceType());
      if (sourceShape.kind === 'boolean' || sourceShape.kind === 'other') {
        return {
          channelKind: RuntimeBindingValueChannelKind.CheckedBoolean,
          authority: RuntimeBindingValueChannelAuthority.ObserverSemantics,
          runtimeValueType: targetAccess.propertyType,
          valueDomain: [],
          isCollection: false,
          openReason: null,
        };
      }
      if (sourceShape.kind === 'open') {
        return {
          channelKind: RuntimeBindingValueChannelKind.CheckedModel,
          authority: RuntimeBindingValueChannelAuthority.Open,
          runtimeValueType: targetAccess.propertyType,
          valueDomain: [],
          isCollection: null,
          openReason: 'CheckedObserver checkbox mode depends on the bound source value shape; static evaluation did not close boolean, collection, or map mode.',
        };
      }
      const elementValue = this.inputRuntimeValue(local, input, context);
      const valueDomain = elementValue.valueDomain;
      if (elementValue.valueType == null && valueDomain.length === 0) {
        return {
          channelKind: RuntimeBindingValueChannelKind.CheckedModel,
          authority: RuntimeBindingValueChannelAuthority.Open,
          runtimeValueType: targetAccess.propertyType,
          valueDomain: [],
          isCollection: sourceShape.kind === 'collection' || sourceShape.kind === 'map' ? true : null,
          openReason: 'CheckedObserver checkbox value channel could not close the input model/value through static value or expression-backed binding.',
        };
      }
      if (sourceShape.kind === 'collection') {
        return {
          channelKind: RuntimeBindingValueChannelKind.CheckedCollectionMembership,
          authority: elementValue.valueType == null
            ? RuntimeBindingValueChannelAuthority.StaticTemplateAndTypeChecker
            : RuntimeBindingValueChannelAuthority.BindingExpressionAndTypeChecker,
          runtimeValueType: elementValue.valueType
            ?? this.stringLiteralDomainType(
              `${local}:checked-collection-domain`,
              valueDomain,
              binding.sourceAddressHandle,
            ),
          valueDomain,
          isCollection: true,
          openReason: null,
        };
      }
      if (sourceShape.kind === 'map') {
        return {
          channelKind: RuntimeBindingValueChannelKind.CheckedCollectionMembership,
          authority: RuntimeBindingValueChannelAuthority.Open,
          runtimeValueType: targetAccess.propertyType,
          valueDomain,
          isCollection: true,
          openReason: 'CheckedObserver map mode writes checked state by element-value key; map entry value flow is not closed yet.',
        };
      }
    }

    return {
      channelKind: RuntimeBindingValueChannelKind.CheckedModel,
      authority: RuntimeBindingValueChannelAuthority.Open,
      runtimeValueType: targetAccess.propertyType,
      valueDomain: [],
      isCollection: null,
      openReason: `CheckedObserver '${type}' mode can write booleans, radio/model values, arrays, sets, or maps depending on source value shape; this branch is not closed yet.`,
    };
  }

  private stringLiteralDomainType(
    local: string,
    values: readonly string[],
    sourceAddressHandle: RuntimeBindingValueChannel['sourceAddressHandle'],
  ): CheckerTypeReference {
    const shape = this.typeProjector.ensureSyntheticProjection({
      localKey: local,
      shapeKind: values.length > 1 ? CheckerTypeShapeKind.Union : CheckerTypeShapeKind.Primitive,
      display: values.map((value) => quoteStringLiteral(value)).join(' | '),
      members: [],
      origin: CheckerTypeProjectionOrigin.SyntheticTemplateType,
      sourceAddressHandle,
    } satisfies CheckerSyntheticTypeProjectionRequest);
    return shape.toReference();
  }

  private inputRuntimeValue(
    local: string,
    input: HtmlElement,
    context: BindingValueChannelContext,
  ): BindingValueExpression {
    const binding = this.propertyBindingForNodeTarget(input, context.input, ['model', 'value']);
    if (binding != null) {
      return this.bindingValueExpression(`${local}:element-value`, binding, context);
    }
    const model = this.attributeValue(input, 'model');
    if (model != null) {
      return staticStringValue(model);
    }
    return staticStringValue(this.attributeValue(input, 'value') ?? 'on');
  }

  private optionRuntimeValue(
    local: string,
    option: HtmlElement,
    context: BindingValueChannelContext,
  ): BindingValueExpression {
    const binding = this.propertyBindingForNodeTarget(option, context.input, ['model', 'value']);
    if (binding != null) {
      return this.bindingValueExpression(`${local}:element-value`, binding, context);
    }
    const model = this.attributeValue(option, 'model');
    if (model != null) {
      return staticStringValue(model);
    }
    return staticStringValue(this.optionStaticValue(option));
  }

  private bindingValueExpression(
    local: string,
    binding: PropertyBinding,
    context: BindingValueChannelContext,
  ): BindingValueExpression {
    const scope = context.instructionScopes.get(binding.instructionProductHandle) ?? null;
    const parse = this.readParse(binding.expressionProductHandle);
    const ast = parse == null ? null : runtimeAcceptedBindingExpressionAstForParse(parse);
    if (scope == null || ast == null) {
      return {
        valueType: null,
        valueDomain: [],
      };
    }
    const literalDomain = stringDomainForExpression(ast);
    if (literalDomain.length > 0) {
      return {
        valueType: this.stringLiteralDomainType(`${local}:literal-domain`, literalDomain, binding.sourceAddressHandle),
        valueDomain: literalDomain,
      };
    }
    const evaluation = context.evaluator.evaluateWithScope(
      ast,
      scope,
      checkerExpressionTypeLocalKey(scope, binding.productHandle, binding.expressionProductHandle, 'value'),
      binding.sourceAddressHandle,
    );
    if (evaluation.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return {
        valueType: null,
        valueDomain: [],
      };
    }
    return {
      valueType: evaluation.typeReference,
      valueDomain: this.stringLiteralDomainForType(evaluation.typeReference),
    };
  }

  private stringLiteralDomainForType(reference: CheckerTypeReference | null): readonly string[] {
    const shape = this.readTypeShape(reference);
    const carrier = shape?.carrier ?? null;
    return carrier == null ? [] : stringLiteralValuesForType(carrier.type) ?? [];
  }

  private propertyBindingForNodeTarget(
    node: HtmlElement,
    input: RuntimeBindingValueChannelMaterializationRequest,
    targets: readonly string[],
  ): PropertyBinding | null {
    return input.runtimeBindings.bindings.find((binding): binding is PropertyBinding =>
      binding instanceof PropertyBinding
      && binding.node.productHandle === node.productHandle
      && targets.includes(binding.target)
    ) ?? null;
  }

  private sourceTypeForBinding(
    binding: RuntimeValueChannelBinding,
    scope: BindingScope | null,
    evaluator: CheckerExpressionTypeEvaluator,
    targetProperty: string | null = null,
  ): CheckerTypeReference | null {
    if (scope == null) {
      return null;
    }
    const parse = this.readParse(expressionProductHandleForBinding(binding));
    const ast = parse == null ? null : runtimeAcceptedBindingExpressionAstForParse(parse);
    if (ast == null) {
      return null;
    }
    const evaluation = evaluator.evaluateWithScope(
      ast,
      scope,
      checkerExpressionTypeLocalKey(scope, binding.productHandle, expressionProductHandleForBinding(binding), 'source'),
      binding.sourceAddressHandle,
    );
    if (evaluation.kind !== CheckerExpressionTypeEvaluationResultKind.Type) {
      return null;
    }
    if (binding instanceof SpreadValueBinding && targetProperty != null) {
      return this.memberType(evaluation.typeReference, targetProperty);
    }
    return evaluation.typeReference;
  }

  private sourceTypeReaderForBinding(
    binding: RuntimeValueChannelBinding,
    scope: BindingScope | null,
    evaluator: CheckerExpressionTypeEvaluator,
    targetProperty: string | null = null,
  ): BindingSourceTypeReader {
    let evaluated = false;
    let sourceType: CheckerTypeReference | null = null;
    return () => {
      if (!evaluated) {
        sourceType = this.sourceTypeForBinding(binding, scope, evaluator, targetProperty);
        evaluated = true;
      }
      return sourceType;
    };
  }

  private memberType(
    reference: CheckerTypeReference | null,
    propertyName: string,
  ): CheckerTypeReference | null {
    const shape = this.readTypeShape(reference);
    const member = shape?.members.find((candidate) => candidate.name === propertyName) ?? null;
    return member?.valueType ?? null;
  }

  private checkedSourceShape(
    sourceType: CheckerTypeReference | null,
  ): CheckedSourceShape {
    const shape = this.readTypeShape(sourceType);
    const carrier = shape?.carrier ?? null;
    if (carrier == null) {
      return {
        kind: 'open',
      };
    }
    const collectionElementType = collectionElementTypeFor(carrier.checker, carrier.type);
    if (collectionElementType != null) {
      return {
        kind: 'collection',
      };
    }
    const mapKeyType = mapKeyTypeFor(carrier.checker, carrier.type);
    if (mapKeyType != null) {
      return {
        kind: 'map',
      };
    }
    if (isBooleanLike(carrier.type)) {
      return {
        kind: 'boolean',
      };
    }
    return {
      kind: 'other',
    };
  }

  private readTypeShape(reference: CheckerTypeReference | null): CheckerTypeShape | null {
    return reference?.productHandle == null
      ? null
      : this.store.productDetails.read(TypeSystemProductDetails.TypeShape, reference.productHandle);
  }

  private readParse(productHandle: ProductHandle | null): TemplateExpressionParse | null {
    return productHandle == null
      ? null
      : this.store.productDetails.read(TemplateProductDetails.ExpressionParse, productHandle);
  }

  private optionElementsFor(select: HtmlElement): readonly HtmlElement[] {
    const result: HtmlElement[] = [];
    const visit = (reference: HtmlNodeReference): void => {
      const element = this.htmlElementFor(reference);
      if (element == null) {
        return;
      }
      const tagName = normalizeTagName(element.tagName);
      if (tagName === 'OPTION') {
        result.push(element);
        return;
      }
      if (tagName === 'OPTGROUP') {
        for (const child of element.children) {
          visit(child);
        }
      }
    };
    for (const child of select.children) {
      visit(child);
    }
    return result;
  }

  private optionStaticValue(option: HtmlElement): string {
    return this.attributeValue(option, 'value') ?? this.textContent(option).trim();
  }

  private textContent(element: HtmlElement): string {
    return element.children.map((child) => {
      if (child.nodeKind === HtmlIrNodeKind.Text && child.productHandle != null) {
        const text = this.store.productDetails.read(TemplateProductDetails.HtmlNode, child.productHandle);
        return text instanceof HtmlText ? text.text : '';
      }
      const childElement = this.htmlElementFor(child);
      return childElement == null ? '' : this.textContent(childElement);
    }).join('');
  }

  private htmlElementFor(reference: HtmlNodeReference | null): HtmlElement | null {
    if (reference?.productHandle == null) {
      return null;
    }
    const node = this.store.productDetails.read(TemplateProductDetails.HtmlNode, reference.productHandle);
    return node instanceof HtmlElement ? node : null;
  }

  private attributesFor(element: HtmlElement): readonly HtmlAttribute[] {
    return element.attributes
      .map((attribute) => attribute.productHandle == null
        ? null
        : this.store.productDetails.read(TemplateProductDetails.HtmlAttribute, attribute.productHandle))
      .filter((attribute): attribute is HtmlAttribute => attribute != null);
  }

  private attributeValue(element: HtmlElement, rawName: string): string | null {
    const attribute = this.attributesFor(element).find((candidate) =>
      candidate.rawName.toLowerCase() === rawName.toLowerCase()
    );
    return attribute?.rawValue ?? null;
  }

  private hasAttribute(element: HtmlElement, rawName: string): boolean {
    return this.attributesFor(element).some((candidate) =>
      candidate.rawName.toLowerCase() === rawName.toLowerCase()
    );
  }

  private recordOpenSeam(
    local: string,
    summary: string,
    addressHandle: RuntimeBindingValueChannel['sourceAddressHandle'],
    source: BindingValueChannelSourceSet,
    records: KernelStoreRecord[],
    openSeams: OpenSeam[],
    seamKindKey: OpenSeamKindKey = KernelVocabulary.Binding.OpenValueChannel.key,
  ): OpenSeam {
    const seam = new OpenSeam(
      this.store.handles.openSeam(local),
      seamKindKey,
      summary,
      addressHandle,
      source.evidenceHandle,
    );
    openSeams.push(seam);
    records.push(seam);
    return seam;
  }

  private recordsForSource(local: string): BindingValueChannelSourceSet {
    const evidenceHandle = this.store.handles.evidence(`binding-value-channel:${local}`);
    const provenanceHandle = this.store.handles.provenance(`binding-value-channel:${local}`);
    return new BindingValueChannelSourceSet(
      [
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
          'Binding value-channel emulation from target-side products and observer-specific runtime value semantics.',
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

function expressionProductHandleForBinding(binding: RuntimeValueChannelBinding): ProductHandle | null {
  if (binding instanceof InterpolationBinding) {
    return binding.expressionProductHandles[0] ?? null;
  }
  return binding.expressionProductHandle;
}

function checkerExpressionTypeLocalKey(
  scope: BindingScope,
  bindingProductHandle: ProductHandle,
  expressionProductHandle: ProductHandle | null,
  role: string,
): string {
  return [
    'checker-expression-type',
    scope.productHandle,
    expressionProductHandle ?? `binding:${bindingProductHandle}`,
    role,
  ].join(':');
}

function isRuntimeValueChannelBinding(binding: RuntimeBinding): binding is RuntimeValueChannelBinding {
  return binding instanceof PropertyBinding
    || binding instanceof AttributeBinding
    || binding instanceof InterpolationBinding
    || binding instanceof ContentBinding
    || binding instanceof RefBinding
    || binding instanceof SpreadValueBinding;
}

function valueChannelTargetsForBinding(
  binding: RuntimeValueChannelBinding,
  targetAccesses: readonly RuntimeBindingTargetAccess[],
  targetOperations: readonly RuntimeBindingTargetOperation[],
  sourceOperations: readonly RuntimeBindingSourceOperation[],
): readonly ValueChannelTarget[] {
  if (binding instanceof SpreadValueBinding && targetAccesses.length > 0) {
    return targetAccesses.map((targetAccess, index) => ({
      localSuffix: `:${index}:${targetAccess.targetProperty}`,
      targetAccess,
      targetOperation: null,
      sourceOperation: null,
    }));
  }
  return [{
    localSuffix: '',
    targetAccess: targetAccesses[0] ?? null,
    targetOperation: targetOperations[0] ?? null,
    sourceOperation: sourceOperations[0] ?? null,
  }];
}

function instructionScopeMap(
  applications: readonly TemplateInstructionScopeApplication[],
): ReadonlyMap<ProductHandle, BindingScope> {
  const result = new Map<ProductHandle, BindingScope>();
  for (const application of applications) {
    if (!result.has(application.instructionProductHandle)) {
      result.set(application.instructionProductHandle, application.scope);
    }
  }
  return result;
}

function stringDomainForExpression(expression: ExpressionAstNode): readonly string[] {
  switch (expression.$kind) {
    case 'PrimitiveLiteral':
      return typeof expression.value === 'string' ? [expression.value] : [];
    case 'ArrayLiteral':
      return uniqueStrings(expression.elements.flatMap((element) => stringDomainForExpression(element)));
    case 'Paren':
      return stringDomainForExpression(expression.expression);
    default:
      return [];
  }
}

function booleanLiteralForExpression(expression: ExpressionAstNode): boolean | null {
  switch (expression.$kind) {
    case 'PrimitiveLiteral':
      return typeof expression.value === 'boolean' ? expression.value : null;
    case 'Paren':
      return booleanLiteralForExpression(expression.expression);
    default:
      return null;
  }
}

function staticStringValue(value: string): BindingValueExpression {
  return {
    valueType: null,
    valueDomain: [value],
  };
}

function hasOptionModelSyntax(attributes: readonly HtmlAttribute[]): boolean {
  return attributes.some((attribute) => {
    const rawName = attribute.rawName.toLowerCase();
    return rawName === 'model'
      || rawName.startsWith('model.')
      || rawName === 'model.bind';
  });
}

function normalizeTagName(tagName: string): string {
  return tagName.toUpperCase();
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function quoteStringLiteral(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}
