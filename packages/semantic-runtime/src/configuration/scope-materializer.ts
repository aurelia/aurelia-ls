import { SemanticClaim } from '../kernel/claim.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
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
  BindingContextSlotInput,
  BindingScope,
  BindingScopeConstructionInput,
  OverrideContext,
  type BindingContextSlotField,
  type BindingContextField,
  type BindingScopeField,
} from './scope.js';
import { TypeSystemProductDetails } from '../type-system/product-details.js';

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

/** Materializes runtime Scope, BindingContext, and OverrideContext products for controller/expression lookup. */
export class BindingScopeMaterializer {
  constructor(
    /** Hot analysis store that receives scope records. */
    readonly store: KernelStore,
  ) {}

  construct(input: BindingScopeConstructionInput): BindingScopeConstructionEmission {
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

  private recordsForScope(input: BindingScopeConstructionInput): BindingScopeConstructionEmission {
    const records: KernelStoreRecord[] = [];
    const local = input.localKey;
    const source = this.recordsForSource(local, input.sourceAddressHandle);
    records.push(...source.records);

    const bindingContextProductHandle = this.store.handles.product(`binding-context:${local}`);
    const bindingContextIdentityHandle = this.store.handles.identity(`binding-context:${local}`);
    const overrideContextProductHandle = this.store.handles.product(`override-context:${local}`);
    const overrideContextIdentityHandle = this.store.handles.identity(`override-context:${local}`);
    const scopeProductHandle = this.store.handles.product(`binding-scope:${local}`);
    const scopeIdentityHandle = this.store.handles.identity(`binding-scope:${local}`);

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

    const bindingContext = new BindingContext(
      bindingContextProductHandle,
      bindingContextIdentityHandle,
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
    const overrideContext = new OverrideContext(
      overrideContextProductHandle,
      overrideContextIdentityHandle,
      scopeProductHandle,
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
    const scope = new BindingScope(
      scopeProductHandle,
      scopeIdentityHandle,
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

    const claims = this.recordsForClaims(local, input, bindingContext, overrideContext, scope, source.provenanceHandle);
    records.push(...claims);
    records.push(
      new ConfigurationIdentity(
        bindingContextIdentityHandle,
        KernelVocabulary.Configuration.BindingContext.key,
        input.ownerIdentityHandle,
        source.sourceAddressHandle,
        `binding-context:${local}`,
      ),
      new ConfigurationIdentity(
        overrideContextIdentityHandle,
        KernelVocabulary.Configuration.OverrideContext.key,
        scopeIdentityHandle,
        source.sourceAddressHandle,
        `override-context:${local}`,
      ),
      new ConfigurationIdentity(
        scopeIdentityHandle,
        KernelVocabulary.Configuration.BindingScope.key,
        input.ownerIdentityHandle,
        source.sourceAddressHandle,
        `binding-scope:${local}`,
      ),
      new MaterializedProduct(
        bindingContextProductHandle,
        KernelVocabulary.Configuration.BindingContext.key,
        bindingContextIdentityHandle,
        source.sourceAddressHandle,
        source.provenanceHandle,
      ),
      new MaterializedProduct(
        overrideContextProductHandle,
        KernelVocabulary.Configuration.OverrideContext.key,
        overrideContextIdentityHandle,
        source.sourceAddressHandle,
        source.provenanceHandle,
      ),
      new MaterializedProduct(
        scopeProductHandle,
        KernelVocabulary.Configuration.BindingScope.key,
        scopeIdentityHandle,
        source.sourceAddressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(`binding-scope:${local}`),
        scopeIdentityHandle,
        [
          bindingContextProductHandle,
          overrideContextProductHandle,
          scopeProductHandle,
        ],
        claims.map((claim) => claim.handle),
      ),
    );

    return new BindingScopeConstructionEmission(bindingContext, overrideContext, scope, records);
  }

  private contextSlotsFor(
    explicitSlots: readonly BindingContextSlotInput[],
    contextType: BindingScopeConstructionInput['bindingContextType'],
    scopeProvenanceHandle: ProvenanceHandle,
  ): readonly BindingContextSlotInput[] {
    const slotsByName = new Map<string, BindingContextSlotInput>();
    for (const slot of explicitSlots) {
      slotsByName.set(slot.name, slot);
    }

    if (contextType?.productHandle == null) {
      return [...slotsByName.values()];
    }

    const typeShape = this.store.productDetails.read(TypeSystemProductDetails.TypeShape, contextType.productHandle);
    if (typeShape == null) {
      return [...slotsByName.values()];
    }

    for (const member of typeShape.members) {
      if (slotsByName.has(member.name)) {
        continue;
      }
      const product = this.store.readProduct(member.productHandle);
      const provenanceHandle = product?.provenanceHandle ?? scopeProvenanceHandle;
      slotsByName.set(member.name, new BindingContextSlotInput(
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
      ));
    }

    return [...slotsByName.values()];
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
    input: BindingScopeConstructionInput,
    bindingContext: BindingContext,
    overrideContext: OverrideContext,
    scope: BindingScope,
    provenanceHandle: ProvenanceHandle,
  ): readonly SemanticClaim[] {
    const claims: SemanticClaim[] = [
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

    if (input.parent != null) {
      claims.push(new SemanticClaim(
        this.store.handles.claim(`binding-scope:${local}:parent`),
        scope.productHandle,
        KernelVocabulary.Configuration.BindingScopeHasParent.key,
        input.parent.productHandle,
        provenanceHandle,
      ));
    }

    if (input.ownerProductHandle != null && this.isControllerProduct(input.ownerProductHandle)) {
      claims.push(new SemanticClaim(
        this.store.handles.claim(`binding-scope:${local}:controller-owner`),
        input.ownerProductHandle,
        KernelVocabulary.Configuration.ControllerUsesBindingScope.key,
        scope.productHandle,
        provenanceHandle,
      ));
    }

    input.scopeEffectOwnerProductHandles.forEach((ownerProductHandle, index) => {
      if (!this.isScopeEffectProduct(ownerProductHandle)) {
        return;
      }
      claims.push(new SemanticClaim(
        this.store.handles.claim(`binding-scope:${local}:scope-effect-owner:${index}`),
        ownerProductHandle,
        KernelVocabulary.Binding.ScopeEffectCreatesBindingScope.key,
        scope.productHandle,
        provenanceHandle,
      ));
    });

    return claims;
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
