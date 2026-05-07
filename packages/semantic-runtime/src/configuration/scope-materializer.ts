import { SemanticClaim } from '../kernel/claim.js';
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
  ConfigurationIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
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
import { KernelVocabulary } from '../kernel/vocabulary.js';
import { ConfigurationProductDetails } from './product-details.js';
import {
  BindingContext,
  BindingContextSlotDraft,
  BindingScope,
  BindingScopeConstructionRequest,
  OverrideContext,
  type BindingContextSlotField,
  type BindingContextField,
  type BindingScopeField,
} from './scope.js';
import { TypeSystemProductDetails } from '../type-system/product-details.js';
import type {
  CheckerTypeMember,
  CheckerTypeShape,
} from '../type-system/type-shape.js';

export class BindingScopeConstructionEmission {
  constructor(
    readonly bindingContext: BindingContext,
    readonly overrideContext: OverrideContext,
    readonly scope: BindingScope,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

class BindingScopeSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly provenanceHandle: ProvenanceHandle,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

class BindingScopeHandleSet {
  constructor(
    readonly bindingContextProductHandle: ProductHandle,
    readonly bindingContextIdentityHandle: IdentityHandle,
    readonly overrideContextProductHandle: ProductHandle,
    readonly overrideContextIdentityHandle: IdentityHandle,
    readonly scopeProductHandle: ProductHandle,
    readonly scopeIdentityHandle: IdentityHandle,
  ) {}

  get materializedProductHandles(): readonly ProductHandle[] {
    return [
      this.bindingContextProductHandle,
      this.overrideContextProductHandle,
      this.scopeProductHandle,
    ];
  }
}

class BindingScopeProducts {
  constructor(
    readonly bindingContext: BindingContext,
    readonly overrideContext: OverrideContext,
    readonly scope: BindingScope,
  ) {}

  toEmission(records: readonly KernelStoreRecord[]): BindingScopeConstructionEmission {
    return new BindingScopeConstructionEmission(
      this.bindingContext,
      this.overrideContext,
      this.scope,
      records,
    );
  }
}

/** Materializes runtime Scope, BindingContext, and OverrideContext products for controller/expression lookup. */
export class BindingScopeMaterializer {
  constructor(
    /** Hot analysis store that receives scope records. */
    readonly store: KernelStore,
  ) {}

  construct(input: BindingScopeConstructionRequest): BindingScopeConstructionEmission {
    const emission = this.recordsForScope(input);
    if (emission.records.length > 0) {
      this.store.commit(new KernelStoreBatch(emission.records, `binding-scope:${input.localKey}`));
    }
    this.registerProductDetails(emission);
    return emission;
  }

  private registerProductDetails(emission: BindingScopeConstructionEmission): void {
    this.store.productDetails.add(ConfigurationProductDetails.BindingContext, emission.bindingContext.productHandle, emission.bindingContext);
    this.store.productDetails.add(ConfigurationProductDetails.OverrideContext, emission.overrideContext.productHandle, emission.overrideContext);
    this.store.productDetails.add(ConfigurationProductDetails.BindingScope, emission.scope.productHandle, emission.scope);
  }

  private recordsForScope(input: BindingScopeConstructionRequest): BindingScopeConstructionEmission {
    const records: KernelStoreRecord[] = [];
    const local = input.localKey;
    const source = this.recordsForSource(local, input.sourceAddressHandle);
    records.push(...source.records);

    const handles = this.handlesForScope(local);
    const products = this.productsForScope(input, handles, source);
    const claims = this.recordsForClaims(
      local,
      input,
      products.bindingContext,
      products.overrideContext,
      products.scope,
      source.provenanceHandle,
    );
    records.push(...claims);
    records.push(
      ...this.identityRecordsForScope(local, input, handles, source),
      ...this.materializedProductRecordsForScope(handles, source),
      new MaterializationRecord(
        this.store.handles.materialization(`binding-scope:${local}`),
        handles.scopeIdentityHandle,
        handles.materializedProductHandles,
        claims.map((claim) => claim.handle),
      ),
    );

    return products.toEmission(records);
  }

  private handlesForScope(local: string): BindingScopeHandleSet {
    return new BindingScopeHandleSet(
      this.store.handles.product(`binding-context:${local}`),
      this.store.handles.identity(`binding-context:${local}`),
      this.store.handles.product(`override-context:${local}`),
      this.store.handles.identity(`override-context:${local}`),
      this.store.handles.product(`binding-scope:${local}`),
      this.store.handles.identity(`binding-scope:${local}`),
    );
  }

  private productsForScope(
    input: BindingScopeConstructionRequest,
    handles: BindingScopeHandleSet,
    source: BindingScopeSourceSet,
  ): BindingScopeProducts {
    const bindingContextSlots = this.contextSlotsFor(
      input.bindingContextSlots,
      input.bindingContextType,
      source.provenanceHandle,
    );
    const overrideContextSlots = this.contextSlotsFor(
      input.overrideContextSlots,
      input.overrideContextType,
      source.provenanceHandle,
    );
    const bindingContext = this.bindingContextForScope(
      input,
      handles,
      source,
      bindingContextSlots,
    );
    const overrideContext = this.overrideContextForScope(
      input,
      handles,
      source,
      overrideContextSlots,
    );
    const scope = this.bindingScopeForContexts(
      input,
      handles,
      source,
      bindingContext,
      overrideContext,
    );
    return new BindingScopeProducts(bindingContext, overrideContext, scope);
  }

  private bindingContextForScope(
    input: BindingScopeConstructionRequest,
    handles: BindingScopeHandleSet,
    source: BindingScopeSourceSet,
    bindingContextSlots: readonly BindingContextSlotDraft[],
  ): BindingContext {
    return new BindingContext(
      handles.bindingContextProductHandle,
      handles.bindingContextIdentityHandle,
      input.bindingContextKind,
      input.ownerProductHandle,
      input.bindingContextType,
      bindingContextSlots.map((slot) => slot.toSlot()),
      source.sourceAddressHandle,
      compactFieldProvenance<BindingContextField>([
        new FieldProvenance('contextKind', source.provenanceHandle),
        input.ownerProductHandle == null ? null : new FieldProvenance('owner', source.provenanceHandle),
        input.bindingContextType == null ? null : new FieldProvenance('contextType', source.provenanceHandle),
        bindingContextSlots.length === 0 ? null : new FieldProvenance('slots', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
  }

  private overrideContextForScope(
    input: BindingScopeConstructionRequest,
    handles: BindingScopeHandleSet,
    source: BindingScopeSourceSet,
    overrideContextSlots: readonly BindingContextSlotDraft[],
  ): OverrideContext {
    return new OverrideContext(
      handles.overrideContextProductHandle,
      handles.overrideContextIdentityHandle,
      handles.scopeProductHandle,
      input.overrideContextType,
      overrideContextSlots.map((slot) => slot.toSlot()),
      source.sourceAddressHandle,
      compactFieldProvenance<BindingContextField>([
        new FieldProvenance('contextKind', source.provenanceHandle),
        new FieldProvenance('owner', source.provenanceHandle),
        input.overrideContextType == null ? null : new FieldProvenance('contextType', source.provenanceHandle),
        overrideContextSlots.length === 0 ? null : new FieldProvenance('slots', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
  }

  private bindingScopeForContexts(
    input: BindingScopeConstructionRequest,
    handles: BindingScopeHandleSet,
    source: BindingScopeSourceSet,
    bindingContext: BindingContext,
    overrideContext: OverrideContext,
  ): BindingScope {
    return new BindingScope(
      handles.scopeProductHandle,
      handles.scopeIdentityHandle,
      input.parent,
      bindingContext,
      overrideContext,
      input.isBoundary,
      input.ownerKind,
      source.sourceAddressHandle,
      compactFieldProvenance<BindingScopeField>([
        input.parent == null ? null : new FieldProvenance('parent', source.provenanceHandle),
        new FieldProvenance('bindingContext', source.provenanceHandle),
        new FieldProvenance('overrideContext', source.provenanceHandle),
        new FieldProvenance('isBoundary', source.provenanceHandle),
        new FieldProvenance('source', source.provenanceHandle),
      ]),
    );
  }

  private identityRecordsForScope(
    local: string,
    input: BindingScopeConstructionRequest,
    handles: BindingScopeHandleSet,
    source: BindingScopeSourceSet,
  ): readonly ConfigurationIdentity[] {
    return [
      new ConfigurationIdentity(
        handles.bindingContextIdentityHandle,
        KernelVocabulary.Configuration.BindingContext.key,
        input.ownerIdentityHandle,
        source.sourceAddressHandle,
        `binding-context:${local}`,
      ),
      new ConfigurationIdentity(
        handles.overrideContextIdentityHandle,
        KernelVocabulary.Configuration.OverrideContext.key,
        handles.scopeIdentityHandle,
        source.sourceAddressHandle,
        `override-context:${local}`,
      ),
      new ConfigurationIdentity(
        handles.scopeIdentityHandle,
        KernelVocabulary.Configuration.BindingScope.key,
        input.ownerIdentityHandle,
        source.sourceAddressHandle,
        `binding-scope:${local}`,
      ),
    ];
  }

  private materializedProductRecordsForScope(
    handles: BindingScopeHandleSet,
    source: BindingScopeSourceSet,
  ): readonly MaterializedProduct[] {
    return [
      new MaterializedProduct(
        handles.bindingContextProductHandle,
        KernelVocabulary.Configuration.BindingContext.key,
        handles.bindingContextIdentityHandle,
        source.sourceAddressHandle,
        source.provenanceHandle,
      ),
      new MaterializedProduct(
        handles.overrideContextProductHandle,
        KernelVocabulary.Configuration.OverrideContext.key,
        handles.overrideContextIdentityHandle,
        source.sourceAddressHandle,
        source.provenanceHandle,
      ),
      new MaterializedProduct(
        handles.scopeProductHandle,
        KernelVocabulary.Configuration.BindingScope.key,
        handles.scopeIdentityHandle,
        source.sourceAddressHandle,
        source.provenanceHandle,
      ),
    ];
  }

  private contextSlotsFor(
    explicitSlots: readonly BindingContextSlotDraft[],
    contextType: BindingScopeConstructionRequest['bindingContextType'],
    scopeProvenanceHandle: ProvenanceHandle,
  ): readonly BindingContextSlotDraft[] {
    const slotsByName = this.explicitContextSlotsByName(explicitSlots);
    const typeShape = this.typeShapeForContext(contextType);
    if (typeShape != null) {
      this.addTypeShapeSlots(slotsByName, typeShape, scopeProvenanceHandle);
    }
    return [...slotsByName.values()];
  }

  private explicitContextSlotsByName(
    explicitSlots: readonly BindingContextSlotDraft[],
  ): Map<string, BindingContextSlotDraft> {
    const slotsByName = new Map<string, BindingContextSlotDraft>();
    for (const slot of explicitSlots) {
      slotsByName.set(slot.name, slot);
    }
    return slotsByName;
  }

  private typeShapeForContext(
    contextType: BindingScopeConstructionRequest['bindingContextType'],
  ): CheckerTypeShape | null {
    return contextType?.productHandle == null
      ? null
      : this.store.productDetails.read(TypeSystemProductDetails.TypeShape, contextType.productHandle);
  }

  private addTypeShapeSlots(
    slotsByName: Map<string, BindingContextSlotDraft>,
    typeShape: CheckerTypeShape,
    scopeProvenanceHandle: ProvenanceHandle,
  ): void {
    for (const member of typeShape.members) {
      if (slotsByName.has(member.name)) {
        continue;
      }
      slotsByName.set(member.name, this.slotDraftForTypeMember(member, scopeProvenanceHandle));
    }
  }

  private slotDraftForTypeMember(
    member: CheckerTypeMember,
    scopeProvenanceHandle: ProvenanceHandle,
  ): BindingContextSlotDraft {
    const product = this.store.readProduct(member.productHandle);
    const provenanceHandle = product?.provenanceHandle ?? scopeProvenanceHandle;
    return new BindingContextSlotDraft(
      member.name,
      member.identityHandle,
      member.productHandle,
      member.valueType,
      member.sourceAddressHandle,
      compactFieldProvenance<BindingContextSlotField>([
        new FieldProvenance('name', provenanceHandle),
        new FieldProvenance('target', provenanceHandle),
        member.valueType == null ? null : new FieldProvenance('targetType', provenanceHandle),
        member.sourceAddressHandle == null ? null : new FieldProvenance('source', provenanceHandle),
      ]),
    );
  }

  private recordsForSource(local: string, addressHandle: AddressHandle | null): BindingScopeSourceSet {
    const evidenceHandle = this.store.handles.evidence(`binding-scope:${local}`);
    const provenanceHandle = this.store.handles.provenance(`binding-scope:${local}`);
    const records: KernelStoreRecord[] = [
      new EvidenceRecord(
        evidenceHandle,
        EvidenceKind.SemanticObservation,
        [EvidenceRole.Scope, EvidenceRole.TransformInput],
        'Binding scope constructed from controller, view-model, template-local, or synthetic context facts.',
        addressHandle,
      ),
      new ProvenanceRecord(
        provenanceHandle,
        [evidenceHandle],
      ),
    ];
    return new BindingScopeSourceSet(records, provenanceHandle, addressHandle);
  }

  private recordsForClaims(
    local: string,
    input: BindingScopeConstructionRequest,
    bindingContext: BindingContext,
    overrideContext: OverrideContext,
    scope: BindingScope,
    provenanceHandle: ProvenanceHandle,
  ): readonly SemanticClaim[] {
    return [
      ...this.contextClaimsForScope(local, bindingContext, overrideContext, scope, provenanceHandle),
      ...nullableClaim(this.parentClaimForScope(local, input, scope, provenanceHandle)),
      ...nullableClaim(this.controllerOwnerClaimForScope(local, input, scope, provenanceHandle)),
      ...this.scopeEffectOwnerClaimsForScope(local, input, scope, provenanceHandle),
    ];
  }

  private contextClaimsForScope(
    local: string,
    bindingContext: BindingContext,
    overrideContext: OverrideContext,
    scope: BindingScope,
    provenanceHandle: ProvenanceHandle,
  ): readonly SemanticClaim[] {
    return [
      new SemanticClaim(
        this.store.handles.claim(`binding-scope:${local}:uses-binding-context`),
        scope.productHandle,
        KernelVocabulary.Configuration.BindingScopeUsesBindingContext.key,
        bindingContext.productHandle,
        provenanceHandle,
      ),
      new SemanticClaim(
        this.store.handles.claim(`binding-scope:${local}:uses-override-context`),
        scope.productHandle,
        KernelVocabulary.Configuration.BindingScopeUsesOverrideContext.key,
        overrideContext.productHandle,
        provenanceHandle,
      ),
    ];
  }

  private parentClaimForScope(
    local: string,
    input: BindingScopeConstructionRequest,
    scope: BindingScope,
    provenanceHandle: ProvenanceHandle,
  ): SemanticClaim | null {
    return input.parent == null
      ? null
      : new SemanticClaim(
        this.store.handles.claim(`binding-scope:${local}:parent`),
        scope.productHandle,
        KernelVocabulary.Configuration.BindingScopeHasParent.key,
        input.parent.productHandle,
        provenanceHandle,
      );
  }

  private controllerOwnerClaimForScope(
    local: string,
    input: BindingScopeConstructionRequest,
    scope: BindingScope,
    provenanceHandle: ProvenanceHandle,
  ): SemanticClaim | null {
    return input.ownerProductHandle != null && this.isControllerProduct(input.ownerProductHandle)
      ? new SemanticClaim(
        this.store.handles.claim(`binding-scope:${local}:controller-owner`),
        input.ownerProductHandle,
        KernelVocabulary.Configuration.ControllerUsesBindingScope.key,
        scope.productHandle,
        provenanceHandle,
      )
      : null;
  }

  private scopeEffectOwnerClaimsForScope(
    local: string,
    input: BindingScopeConstructionRequest,
    scope: BindingScope,
    provenanceHandle: ProvenanceHandle,
  ): readonly SemanticClaim[] {
    return input.scopeEffectOwnerProductHandles.flatMap((ownerProductHandle, index) =>
      this.isScopeEffectProduct(ownerProductHandle)
        ? [
          new SemanticClaim(
            this.store.handles.claim(`binding-scope:${local}:scope-effect-owner:${index}`),
            ownerProductHandle,
            KernelVocabulary.Binding.ScopeEffectCreatesBindingScope.key,
            scope.productHandle,
            provenanceHandle,
          ),
        ]
        : []
    );
  }

  private isControllerProduct(productHandle: ProductHandle): boolean {
    return this.store.readProduct(productHandle)?.productKindKey === KernelVocabulary.Configuration.Controller.key;
  }

  private isScopeEffectProduct(productHandle: ProductHandle): boolean {
    return this.store.readProduct(productHandle)?.productKindKey === KernelVocabulary.Binding.ScopeEffect.key;
  }
}

function claimsForProduct(
  claims: readonly SemanticClaim[],
  productHandle: ProductHandle,
): readonly SemanticClaim[] {
  return claims.filter((claim) =>
    claim.subjectHandle === productHandle
    || claim.objectHandle === productHandle
  );
}

function nullableClaim(claim: SemanticClaim | null): readonly SemanticClaim[] {
  return claim == null ? [] : [claim];
}
