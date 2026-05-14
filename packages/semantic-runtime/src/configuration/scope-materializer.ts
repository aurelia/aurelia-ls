import { SemanticClaim, claimsForProduct, nullableClaim } from '../kernel/claim.js';
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
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import { ConfigurationProductDetails } from './product-details.js';
import { BindingScopeSlotProjector } from './binding-scope-slot-projector.js';
import {
  BindingContext,
  BindingContextSlotDraft,
  BindingScope,
  BindingScopeConstructionRequest,
  OverrideContext,
} from './scope.js';

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
    readonly slotProjector = new BindingScopeSlotProjector(store),
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
    const bindingContextSlots = this.slotProjector.contextSlotsFor(
      input.bindingContextSlots,
      input.bindingContextType,
    );
    const overrideContextSlots = this.slotProjector.contextSlotsFor(
      input.overrideContextSlots,
      input.overrideContextType,
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
      [],
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
      [],
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
      [],
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
