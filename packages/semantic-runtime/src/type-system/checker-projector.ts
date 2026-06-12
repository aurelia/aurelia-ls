import ts from 'typescript';
import { SourceSpanRole } from '../kernel/address.js';
import { SemanticClaim, claimsForProduct } from '../kernel/claim.js';
import {
  OpenSeam,
} from '../kernel/open-seam.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  EvidenceHandle,
  IdentityHandle,
  KernelRecordHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  TypeSystemIdentity,
} from '../kernel/identity.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  bindProductDetailEnvelope,
  requireProductDetailEnvelope,
} from '../kernel/product-details.js';
import {
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import { TypeSystemHotDetails, TypeSystemProductDetails } from './product-details.js';
import {
  CheckerIndexedAccessKeyKind,
  CheckerTypeCarrier,
  CheckerTypeMember,
  CheckerTypeMemberCarrier,
  CheckerTypeMemberKind,
  CheckerTypeProjectionOrigin,
  CheckerTypeReference,
  CheckerTypeShape,
  CheckerTypeShapeKind,
  classifyCheckerTypeShape,
} from './type-shape.js';
import {
  checkerIndexedValueTypeInfo,
  checkerIterableElementType,
} from './checker-related-types.js';
import {
  checkerDeclarationsAreReadonly,
  checkerSymbolIsOptional,
  checkerSymbolMemberKind,
  declarationsForCheckerSymbol,
} from './checker-member-surface.js';
import {
  sourceSpanForCheckerDeclaration,
  type DeclarationSourcePublication,
} from './declaration-source.js';

export interface CheckerTypeProjectionRequest {
  /** Store-local key for this type projection. */
  readonly localKey: string;
  /** Checker that owns the type object. */
  readonly checker: ts.TypeChecker;
  /** Type object from the same checker/program epoch. */
  readonly type: ts.Type;
  /** How this projection was requested. */
  readonly origin?: CheckerTypeProjectionOrigin;
  /** Source node whose type was requested, when the caller has one. */
  readonly sourceNode?: ts.Node | null;
  /** Source address for navigation/explanation when already materialized. */
  readonly sourceAddressHandle?: AddressHandle | null;
  /** Semantic identity that owns this type projection, when known. */
  readonly ownerIdentityHandle?: IdentityHandle | null;
  /** Optional display override when the caller already knows the user-facing name. */
  readonly display?: string | null;
  /**
   * Controls whether direct members are published eagerly or left to CheckerTypeShapeAccess.
   *
   * Use `lazy` for framework/runtime carrier references that mainly seed scopes or resource targets. Cursor
   * completions and shape catalog answers should keep the default eager surface so member rows are immediately
   * enumerable.
   */
  readonly memberProjection?: CheckerTypeMemberProjectionPolicy;
}

export const enum CheckerTypeMemberProjectionPolicy {
  Eager = 'eager',
  Lazy = 'lazy',
}

export interface CheckerSyntheticTypeMemberRequest {
  /** Runtime/authored member name visible on the synthetic shape. */
  readonly name: string;
  /** Type reference for the member value, when expression/type evaluation closed it. */
  readonly valueType: CheckerTypeReference | null;
  /** Broad member lane. */
  readonly memberKind?: CheckerTypeMemberKind;
  /** Whether the member is optional in the synthesized shape. */
  readonly isOptional?: boolean;
  /** Whether the member is readonly in the synthesized shape. */
  readonly isReadonly?: boolean;
  /** Source address that caused or owns the member, when already materialized. */
  readonly sourceAddressHandle?: AddressHandle | null;
}

export interface CheckerSyntheticTypeProjectionRequest {
  /** Store-local key for this synthetic type projection. */
  readonly localKey: string;
  /** Broad shape lane for the synthesized result. */
  readonly shapeKind: CheckerTypeShapeKind;
  /** Display string for traces and candidate labels. */
  readonly display: string;
  /** Members visible on this synthetic shape. */
  readonly members: readonly CheckerSyntheticTypeMemberRequest[];
  /** Value type reached by dynamic keyed access, when expression semantics can prove one. */
  readonly indexedValueType?: CheckerTypeReference | null;
  /** Key kind that can reach `indexedValueType`; omitted only when no indexed value type is projected. */
  readonly indexedAccessKeyKind?: CheckerIndexedAccessKeyKind | null;
  /** Value type yielded by runtime iteration, when expression semantics can prove one. */
  readonly iteratedValueType?: CheckerTypeReference | null;
  /** How this synthetic projection was requested. */
  readonly origin?: CheckerTypeProjectionOrigin;
  /** Source address for navigation/explanation when already materialized. */
  readonly sourceAddressHandle?: AddressHandle | null;
  /** Semantic identity that owns this type projection, when known. */
  readonly ownerIdentityHandle?: IdentityHandle | null;
  /** Return type reached by calling this synthetic shape, when expression semantics can prove one. */
  readonly callReturnType?: CheckerTypeReference | null;
  /** Instance type reached by constructing this synthetic shape, when expression semantics can prove one. */
  readonly constructReturnType?: CheckerTypeReference | null;
}

export class CheckerTypeProjectionEmission {
  constructor(
    /** Type shape product detail emitted by this projection. */
    readonly typeShape: CheckerTypeShape,
    /** Kernel records committed for the type shape and its direct members. */
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

class TypeProjectionSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly evidenceHandle: EvidenceHandle,
    readonly provenanceHandle: ProvenanceHandle,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

interface TypeShapeHandles {
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle;
}

interface CheckerTypeDescriptor {
  readonly symbol: ts.Symbol | null;
  readonly declarations: readonly ts.Declaration[];
  readonly display: string;
  readonly checkerKey: string;
  readonly sourceIndependent: boolean;
  readonly shapeKind: CheckerTypeShapeKind;
}

interface CheckerTypeIdentityDescriptor {
  readonly checkerKey: string;
  readonly sourceIndependent: boolean;
}

interface TypeShapeRelatedTypes {
  readonly indexedValueType: CheckerTypeReference | null;
  readonly indexedAccessKeyKind: CheckerIndexedAccessKeyKind | null;
  readonly iteratedValueType: CheckerTypeReference | null;
  readonly callReturnType: CheckerTypeReference | null;
  readonly constructReturnType: CheckerTypeReference | null;
}

interface TypeShapeIndex {
  readonly shapesByKey: Map<string, CheckerTypeShape>;
  readonly key: string;
  readonly summary: string;
  readEntryCount(): number;
  dispose(context: { readonly summary: { readonly productDetails: number } }): void;
}

const typeShapeIndexByStore = new WeakMap<KernelStore, TypeShapeIndex>();

class TypeShapePublicationFrame {
  constructor(
    readonly localKey: string,
    readonly source: TypeProjectionSourceSet,
    readonly declarationSource: DeclarationSourcePublication | null,
    readonly records: KernelStoreRecord[],
    readonly handles: TypeShapeHandles,
    readonly checkerKey: string,
    readonly shapeKind: CheckerTypeShapeKind,
    readonly origin: CheckerTypeProjectionOrigin,
    readonly display: string,
    readonly members: readonly CheckerTypeMember[],
    readonly relatedTypes: TypeShapeRelatedTypes,
    readonly ownerIdentityHandle: IdentityHandle | null,
    readonly carrier: CheckerTypeCarrier | null,
    readonly openSeams: readonly OpenSeam[],
  ) {}

  get shapeProductHandle(): ProductHandle {
    return this.handles.productHandle;
  }

  get shapeIdentityHandle(): IdentityHandle {
    return this.handles.identityHandle;
  }

  get indexedValueType(): CheckerTypeReference | null {
    return this.relatedTypes.indexedValueType;
  }

  get indexedAccessKeyKind(): CheckerIndexedAccessKeyKind | null {
    return this.relatedTypes.indexedAccessKeyKind;
  }

  get iteratedValueType(): CheckerTypeReference | null {
    return this.relatedTypes.iteratedValueType;
  }

  get callReturnType(): CheckerTypeReference | null {
    return this.relatedTypes.callReturnType;
  }

  get constructReturnType(): CheckerTypeReference | null {
    return this.relatedTypes.constructReturnType;
  }
}

/** Projects a current TypeChecker type into hot product details plus durable kernel envelopes. */
export class CheckerTypeProjector {
  constructor(
    /** Hot analysis store that receives type-system projection records. */
    readonly store: KernelStore,
  ) {}

  ensureProjection(input: CheckerTypeProjectionRequest): CheckerTypeShape {
    const productHandle = this.store.handles.product(`type-shape:${input.localKey}`);
    const existing = this.store.productDetails.read(TypeSystemProductDetails.TypeShape, productHandle);
    if (existing != null) {
      return existing;
    }

    // `localKey` names the projection site. The durable shape is allowed to converge when the checker key, origin, and
    // the shape-owned source lane are identical; caller-owned expression/binding/diagnostic products carry their own
    // source loci, so declaration-backed and structurally checker-owned shapes do not need per-site products.
    const descriptor = checkerTypeDescriptor(input);
    const indexed = this.readIndexedTypeShape(
      typeProjectionOrigin(input),
      descriptor.checkerKey,
      typeProjectionSourceAddress(input, descriptor),
    );
    if (indexed != null) {
      return indexed;
    }

    return this.project(input).typeShape;
  }

  ensureSyntheticProjection(input: CheckerSyntheticTypeProjectionRequest): CheckerTypeShape {
    const productHandle = this.store.handles.product(`type-shape:${input.localKey}`);
    const existing = this.store.productDetails.read(TypeSystemProductDetails.TypeShape, productHandle);
    if (existing != null) {
      return existing;
    }

    return this.projectSynthetic(input).typeShape;
  }

  project(input: CheckerTypeProjectionRequest): CheckerTypeProjectionEmission {
    const emission = this.recordsForType(input);
    this.store.commit(new KernelStoreBatch(emission.records, `type-system:${input.localKey}`));
    this.registerProductDetails(emission.typeShape);
    return emission;
  }

  projectSynthetic(input: CheckerSyntheticTypeProjectionRequest): CheckerTypeProjectionEmission {
    const emission = this.recordsForSyntheticType(input);
    this.store.commit(new KernelStoreBatch(emission.records, `type-system:${input.localKey}`));
    this.registerProductDetails(emission.typeShape);
    return emission;
  }

  private registerProductDetails(typeShape: CheckerTypeShape): void {
    this.store.productDetails.add(TypeSystemProductDetails.TypeShape, typeShape.productHandle, typeShape);
    // Type members are hot children of the owning shape, not durable kernel products by default. Keeping their detail
    // handles addressable lets binding scopes and completions follow up in-process without retaining one
    // MaterializedProduct/Identity/Claim trio per framework or DOM member.
    for (const member of typeShape.members) {
      this.store.hotDetails.add(TypeSystemHotDetails.TypeMember, member.productHandle, member);
    }
    this.writeIndexedTypeShape(typeShape);
  }

  private readIndexedTypeShape(
    origin: CheckerTypeProjectionOrigin,
    checkerKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeShape | null {
    const index = typeShapeIndexForStore(this.store);
    const key = typeShapeIndexKey(origin, checkerKey, sourceAddressHandle);
    const typeShape = index.shapesByKey.get(key) ?? null;
    if (typeShape == null) {
      return null;
    }
    if (this.store.productDetails.read(TypeSystemProductDetails.TypeShape, typeShape.productHandle) != null) {
      return typeShape;
    }
    index.shapesByKey.delete(key);
    return null;
  }

  private writeIndexedTypeShape(typeShape: CheckerTypeShape): void {
    const index = typeShapeIndexForStore(this.store);
    const key = typeShapeIndexKey(typeShape.origin, typeShape.checkerKey, typeShape.sourceAddressHandle);
    if (!index.shapesByKey.has(key)) {
      index.shapesByKey.set(key, typeShape);
    }
  }

  private recordsForType(input: CheckerTypeProjectionRequest): CheckerTypeProjectionEmission {
    const records: KernelStoreRecord[] = [];
    const descriptor = checkerTypeDescriptor(input);
    const source = this.recordsForSource(
      input.localKey,
      typeProjectionSourceAddress(input, descriptor),
      'TypeChecker-backed type projection for template or expression inquiry.',
      'TypeChecker projection.',
    );
    records.push(...source.records);
    return this.recordsForShapePublication(this.publicationFrameForType(input, descriptor, source, records));
  }

  private publicationFrameForType(
    input: CheckerTypeProjectionRequest,
    descriptor: CheckerTypeDescriptor,
    source: TypeProjectionSourceSet,
    records: KernelStoreRecord[],
  ): TypeShapePublicationFrame {
    const declarationSource = typeShapeDeclarationSource(this.store, descriptor);
    appendDeclarationSourceRecords(this.store, records, declarationSource);
    const handles = this.typeShapeHandles(input.localKey);
    const shapeReference = typeShapeReferenceFor(
      handles,
      descriptor.checkerKey,
      descriptor.display,
      descriptor.shapeKind,
      typeProjectionOrigin(input),
      source.sourceAddressHandle,
    );
    const members = this.membersForType(input, shapeReference, records);
    return new TypeShapePublicationFrame(
      input.localKey,
      source,
      declarationSource,
      records,
      handles,
      descriptor.checkerKey,
      descriptor.shapeKind,
      typeProjectionOrigin(input),
      descriptor.display,
      members,
      checkerTypeRelatedTypes(input),
      input.ownerIdentityHandle ?? null,
      new CheckerTypeCarrier(input.checker, input.type, descriptor.symbol, descriptor.declarations),
      this.openSeamsForTypeShape(input.localKey, descriptor, source),
    );
  }

  private typeShapeHandles(localKey: string): TypeShapeHandles {
    const local = `type-shape:${localKey}`;
    return {
      productHandle: this.store.handles.product(local),
      identityHandle: this.store.handles.identity(local),
    };
  }

  private openSeamsForTypeShape(
    localKey: string,
    descriptor: CheckerTypeDescriptor,
    source: TypeProjectionSourceSet,
  ): readonly OpenSeam[] {
    return descriptor.shapeKind === CheckerTypeShapeKind.Unclassified
      ? [
        new OpenSeam(
          this.store.handles.openSeam(`type-shape:${localKey}:unknown-shape`),
          KernelVocabulary.TypeSystem.OpenTypeProjection.key,
          `TypeChecker projection could not classify '${descriptor.display}' into a known type-shape lane.`,
          source.sourceAddressHandle,
          source.evidenceHandle,
        ),
      ]
      : [];
  }

  private recordsForSyntheticType(input: CheckerSyntheticTypeProjectionRequest): CheckerTypeProjectionEmission {
    const records: KernelStoreRecord[] = [];
    const source = this.recordsForSource(
      input.localKey,
      typeProjectionSourceAddress(input),
      'Synthetic type-system projection for template or expression inquiry.',
      'Synthetic type-system projection.',
    );
    records.push(...source.records);

    const checkerKey = syntheticCheckerKey(input);
    const handles = this.typeShapeHandles(input.localKey);
    const shapeReference = typeShapeReferenceFor(
      handles,
      checkerKey,
      input.display,
      input.shapeKind,
      syntheticProjectionOrigin(input),
      source.sourceAddressHandle,
    );
    const members = this.syntheticMembersForType(input, shapeReference);
    return this.recordsForShapePublication(new TypeShapePublicationFrame(
      input.localKey,
      source,
      null,
      records,
      handles,
      checkerKey,
      input.shapeKind,
      syntheticProjectionOrigin(input),
      input.display,
      members,
      {
        indexedValueType: input.indexedValueType ?? null,
        indexedAccessKeyKind: input.indexedAccessKeyKind ?? null,
        iteratedValueType: input.iteratedValueType ?? null,
        callReturnType: input.callReturnType ?? null,
        constructReturnType: input.constructReturnType ?? null,
      },
      input.ownerIdentityHandle ?? null,
      null,
      [],
    ));
  }

  private recordsForShapePublication(input: TypeShapePublicationFrame): CheckerTypeProjectionEmission {
    const claims = this.claimsForShapeMembers(input);
    const typeShape = this.typeShapeForPublication(input);
    input.records.push(...this.recordsForShapeAndMembers(input, typeShape, claims));
    return new CheckerTypeProjectionEmission(typeShape, input.records);
  }

  private typeShapeForPublication(input: TypeShapePublicationFrame): CheckerTypeShape {
    return bindProductDetailEnvelope(new CheckerTypeShape(
      input.checkerKey,
      input.shapeKind,
      input.origin,
      input.display,
      input.members,
      input.indexedValueType,
      input.indexedAccessKeyKind,
      input.iteratedValueType,
      input.callReturnType,
      input.constructReturnType,
      input.declarationSource?.address.handle ?? null,
      [],
      input.carrier,
    ), this.typeShapeProduct(input));
  }

  private recordsForShapeAndMembers(
    input: TypeShapePublicationFrame,
    typeShape: CheckerTypeShape,
    claims: readonly SemanticClaim[],
  ): readonly KernelStoreRecord[] {
    return [
      this.typeShapeIdentity(input),
      ...input.openSeams,
      ...claims,
      requireProductDetailEnvelope(typeShape, 'type-system.type-shape'),
      this.typeShapeMaterialization(input, claims),
    ];
  }

  private typeShapeIdentity(input: TypeShapePublicationFrame): TypeSystemIdentity {
    return new TypeSystemIdentity(
      input.shapeIdentityHandle,
      KernelVocabulary.TypeSystem.TypeShape.key,
      input.checkerKey,
      input.ownerIdentityHandle,
      input.source.sourceAddressHandle,
      input.display,
    );
  }

  private typeShapeProduct(input: TypeShapePublicationFrame): MaterializedProduct {
    return new MaterializedProduct(
      input.shapeProductHandle,
      KernelVocabulary.TypeSystem.TypeShape.key,
      input.shapeIdentityHandle,
      input.source.sourceAddressHandle,
      input.source.provenanceHandle,
    );
  }

  private typeShapeMaterialization(
    input: TypeShapePublicationFrame,
    claims: readonly SemanticClaim[],
  ): MaterializationRecord {
    return new MaterializationRecord(
      this.store.handles.materialization(`type-shape:${input.localKey}`),
      input.shapeIdentityHandle,
      [input.shapeProductHandle],
      claims.map((claim) => claim.handle),
      input.openSeams.map((seam) => seam.handle),
    );
  }

  private claimsForShapeMembers(input: TypeShapePublicationFrame): readonly SemanticClaim[] {
    return [];
  }

  private syntheticMembersForType(
    input: CheckerSyntheticTypeProjectionRequest,
    ownerType: CheckerTypeReference,
  ): readonly CheckerTypeMember[] {
    return input.members.map((member, index) => {
      const localKey = `${input.localKey}:member:${index}:${localKeyPart(member.name)}`;
      return new CheckerTypeMember(
        this.store.handles.product(`type-member:${localKey}`),
        member.name,
        member.memberKind ?? CheckerTypeMemberKind.Property,
        ownerType,
        member.valueType,
        member.isOptional ?? false,
        member.isReadonly ?? false,
        null,
        member.sourceAddressHandle ?? null,
        [],
        null,
      );
    });
  }

  private membersForType(
    input: CheckerTypeProjectionRequest,
    ownerType: CheckerTypeReference,
    records: KernelStoreRecord[],
  ): readonly CheckerTypeMember[] {
    if ((input.memberProjection ?? CheckerTypeMemberProjectionPolicy.Eager) === CheckerTypeMemberProjectionPolicy.Lazy) {
      return [];
    }
    return input.type.getProperties().map((symbol) =>
      this.memberForType(input, ownerType, records, symbol)
    );
  }

  private memberForType(
    input: CheckerTypeProjectionRequest,
    ownerType: CheckerTypeReference,
    records: KernelStoreRecord[],
    symbol: ts.Symbol,
  ): CheckerTypeMember {
    const declarations = declarationsForCheckerSymbol(symbol);
    const name = symbol.getName();
    const localKey = `${input.localKey}:member:${localKeyPart(name)}`;
    const valueType = valueTypeForSymbol(input.checker, symbol, input.sourceNode ?? null, declarations);
    const declarationSource = sourceSpanForCheckerDeclaration(this.store, symbol, declarations, SourceSpanRole.Name);
    appendDeclarationSourceRecords(this.store, records, declarationSource);
    const valueTypeReference = valueTypeReferenceForMember(input, valueType);
    return new CheckerTypeMember(
      this.store.handles.product(`type-member:${localKey}`),
      name,
      checkerSymbolMemberKind(symbol, declarations),
      ownerType,
      valueTypeReference,
      checkerSymbolIsOptional(symbol, declarations),
      checkerDeclarationsAreReadonly(declarations),
      declarationSource?.identity.handle ?? null,
      declarationSource?.identity.handle == null ? declarationSource?.address.handle ?? null : null,
      [],
      new CheckerTypeMemberCarrier(input.checker, symbol, valueType, declarations),
    );
  }

  private recordsForSource(
    localKey: string,
    addressHandle: AddressHandle | null,
    evidenceSummary: string,
    provenanceSummary: string,
  ): TypeProjectionSourceSet {
    const evidenceHandle = this.store.handles.evidence(`type-system:${localKey}`);
    const provenanceHandle = this.store.handles.provenance(`type-system:${localKey}`);
    const records: KernelStoreRecord[] = [
      new EvidenceRecord(
        evidenceHandle,
        EvidenceKind.SemanticObservation,
        [EvidenceRole.Scope, EvidenceRole.TransformInput],
        evidenceSummary,
        addressHandle,
      ),
      new ProvenanceRecord(
        provenanceHandle,
        [evidenceHandle],
      ),
    ];
    return new TypeProjectionSourceSet(records, evidenceHandle, provenanceHandle, addressHandle);
  }
}

function displayType(
  checker: ts.TypeChecker,
  type: ts.Type,
  sourceNode: ts.Node | null,
): string {
  return sourceNode == null ? checker.typeToString(type) : checker.typeToString(type, sourceNode);
}

function typeProjectionOrigin(input: CheckerTypeProjectionRequest): CheckerTypeProjectionOrigin {
  return input.origin ?? CheckerTypeProjectionOrigin.TypeChecker;
}

function syntheticProjectionOrigin(input: CheckerSyntheticTypeProjectionRequest): CheckerTypeProjectionOrigin {
  return input.origin ?? CheckerTypeProjectionOrigin.SyntheticExpressionType;
}

function typeProjectionSourceAddress(
  input: CheckerTypeProjectionRequest | CheckerSyntheticTypeProjectionRequest,
  descriptor?: CheckerTypeDescriptor,
): AddressHandle | null {
  if (descriptor != null && checkerTypeProjectionUsesDeclarationIdentity(input, descriptor)) {
    return null;
  }
  return input.sourceAddressHandle ?? null;
}

function checkerTypeDescriptor(input: CheckerTypeProjectionRequest): CheckerTypeDescriptor {
  const symbol = input.type.aliasSymbol ?? input.type.symbol ?? null;
  const declarations = declarationsForCheckerSymbol(symbol);
  const display = input.display ?? displayType(input.checker, input.type, input.sourceNode ?? null);
  const identity = checkerTypeIdentityForType(
    input.checker,
    input.type,
    symbol,
    display,
    input.sourceNode ?? null,
  );
  return {
    symbol,
    declarations,
    display,
    checkerKey: identity.checkerKey,
    sourceIndependent: identity.sourceIndependent,
    shapeKind: classifyCheckerTypeShape(input.type, symbol),
  };
}

function checkerTypeProjectionUsesDeclarationIdentity(
  input: CheckerTypeProjectionRequest | CheckerSyntheticTypeProjectionRequest,
  descriptor: CheckerTypeDescriptor,
): boolean {
  const origin = input.origin ?? CheckerTypeProjectionOrigin.TypeChecker;
  return origin !== CheckerTypeProjectionOrigin.SyntheticExpressionType && descriptor.sourceIndependent;
}

const sourceIndependentCheckerTypeDisplays = new Set([
  'any',
  'unknown',
  'never',
  'string',
  'number',
  'boolean',
  'bigint',
  'symbol',
  'null',
  'undefined',
  'void',
]);

function typeShapeDeclarationSource(
  store: KernelStore,
  descriptor: CheckerTypeDescriptor,
): DeclarationSourcePublication | null {
  return descriptor.symbol == null
    ? null
    : sourceSpanForCheckerDeclaration(store, descriptor.symbol, descriptor.declarations, SourceSpanRole.Name);
}

function checkerTypeRelatedTypes(input: CheckerTypeProjectionRequest): TypeShapeRelatedTypes {
  const indexedValueType = checkerIndexedValueTypeInfo(input.checker, input.type);
  return {
    indexedValueType: typeReferenceForRelatedCheckerType(
      input.checker,
      indexedValueType?.type ?? null,
      input.sourceNode ?? null,
    ),
    indexedAccessKeyKind: indexedValueType?.keyKind ?? null,
    iteratedValueType: typeReferenceForRelatedCheckerType(
      input.checker,
      checkerIterableElementType(input.checker, input.type),
      input.sourceNode ?? null,
    ),
    callReturnType: compactRepresentativeReturnTypeForSignatures(
      input.checker,
      input.type.getCallSignatures(),
      input.sourceNode ?? null,
    ),
    constructReturnType: compactRepresentativeReturnTypeForSignatures(
      input.checker,
      input.type.getConstructSignatures(),
      input.sourceNode ?? null,
    ),
  };
}

function typeReferenceForRelatedCheckerType(
  checker: ts.TypeChecker,
  type: ts.Type | null,
  sourceNode: ts.Node | null,
): CheckerTypeReference | null {
  if (type == null) {
    return null;
  }
  const symbol = type.aliasSymbol ?? type.symbol ?? null;
  const display = displayType(checker, type, sourceNode);
  const identity = checkerTypeIdentityForType(checker, type, symbol, display, sourceNode);
  return new CheckerTypeReference(
    null,
    null,
    identity.checkerKey,
    display,
    classifyCheckerTypeShape(type, symbol),
    CheckerTypeProjectionOrigin.TypeChecker,
    null,
  );
}

function typeShapeReferenceFor(
  handles: TypeShapeHandles,
  checkerKey: string,
  display: string,
  shapeKind: CheckerTypeShapeKind,
  origin: CheckerTypeProjectionOrigin,
  sourceAddressHandle: AddressHandle | null,
): CheckerTypeReference {
  return new CheckerTypeReference(
    handles.productHandle,
    handles.identityHandle,
    checkerKey,
    display,
    shapeKind,
    origin,
    sourceAddressHandle,
  );
}

function checkerKeyForType(
  checker: ts.TypeChecker,
  type: ts.Type,
  symbol: ts.Symbol | null,
  display: string,
  sourceNode: ts.Node | null,
): string {
  return checkerTypeIdentityForType(checker, type, symbol, display, sourceNode).checkerKey;
}

function checkerTypeIdentityForType(
  checker: ts.TypeChecker,
  type: ts.Type,
  symbol: ts.Symbol | null,
  display: string,
  sourceNode: ts.Node | null,
  seen: Set<ts.Type> = new Set(),
): CheckerTypeIdentityDescriptor {
  const declaration = declarationsForCheckerSymbol(symbol)[0] ?? null;
  if (declaration != null) {
    const sourceFile = declaration.getSourceFile();
    return {
      checkerKey: `type:${sourceFile.fileName}:${declaration.pos}:${declaration.end}:${symbol?.getName() ?? display}:${localKeyPart(display)}`,
      sourceIndependent: true,
    };
  }

  if (!seen.has(type) && type.isUnion()) {
    return checkerCompoundTypeIdentity(checker, 'union', type.types, sourceNode, seen);
  }

  if (!seen.has(type) && type.isIntersection()) {
    return checkerCompoundTypeIdentity(checker, 'intersection', type.types, sourceNode, seen);
  }

  if (type.aliasSymbol != null) {
    return {
      checkerKey: `type:alias:${type.aliasSymbol.getName()}:${localKeyPart(display)}`,
      sourceIndependent: sourceIndependentCheckerTypeDisplays.has(display) || checkerTypeIsLiteralLike(type),
    };
  }

  return {
    checkerKey: `type:display:${display}`,
    sourceIndependent: sourceIndependentCheckerTypeDisplays.has(display) || checkerTypeIsLiteralLike(type),
  };
}

function checkerCompoundTypeIdentity(
  checker: ts.TypeChecker,
  kind: 'union' | 'intersection',
  parts: readonly ts.Type[],
  sourceNode: ts.Node | null,
  seen: Set<ts.Type>,
): CheckerTypeIdentityDescriptor {
  const nextSeen = new Set(seen);
  const partIdentities = parts.map((part) => {
    nextSeen.add(part);
    const partSymbol = part.aliasSymbol ?? part.symbol ?? null;
    const partDisplay = displayType(checker, part, sourceNode);
    return checkerTypeIdentityForType(checker, part, partSymbol, partDisplay, sourceNode, nextSeen);
  });
  return {
    checkerKey: `type:${kind}:${partIdentities.map((identity) => identity.checkerKey).sort().join('|')}`,
    sourceIndependent: partIdentities.every((identity) => identity.sourceIndependent),
  };
}

function checkerTypeIsLiteralLike(type: ts.Type): boolean {
  return (type.flags & (
    ts.TypeFlags.StringLiteral
    | ts.TypeFlags.NumberLiteral
    | ts.TypeFlags.BooleanLiteral
    | ts.TypeFlags.BigIntLiteral
    | ts.TypeFlags.EnumLiteral
  )) !== 0;
}

function syntheticCheckerKey(input: CheckerSyntheticTypeProjectionRequest): string {
  return `type:synthetic:${syntheticProjectionOrigin(input)}:${input.localKey}`;
}

function typeShapeIndexForStore(store: KernelStore): TypeShapeIndex {
  let index = typeShapeIndexByStore.get(store);
  if (index != null) {
    return index;
  }
  const shapesByKey = new Map<string, CheckerTypeShape>();
  for (const entry of store.productDetails.readEntries()) {
    if (entry.slot.detailKind !== TypeSystemProductDetails.TypeShape.detailKind) {
      continue;
    }
    const typeShape = entry.detail as CheckerTypeShape;
    shapesByKey.set(
      typeShapeIndexKey(typeShape.origin, typeShape.checkerKey, typeShape.sourceAddressHandle),
      typeShape,
    );
  }
  index = {
    key: 'type-system.checker-type-shape-index',
    summary: 'Store-local reusable TypeChecker projection index; pruned when kernel product details are disposed.',
    shapesByKey,
    readEntryCount() {
      return this.shapesByKey.size;
    },
    dispose(context) {
      if (context.summary.productDetails === 0) {
        return;
      }
      pruneTypeShapeIndex(store, this);
    },
  };
  store.registerSidecarIndex(index);
  typeShapeIndexByStore.set(store, index);
  return index;
}

function pruneTypeShapeIndex(
  store: KernelStore,
  index: TypeShapeIndex,
): void {
  for (const [key, typeShape] of index.shapesByKey) {
    if (store.productDetails.read(TypeSystemProductDetails.TypeShape, typeShape.productHandle) == null) {
      index.shapesByKey.delete(key);
    }
  }
}

function typeShapeIndexKey(
  origin: CheckerTypeProjectionOrigin,
  checkerKey: string,
  sourceAddressHandle: AddressHandle | null,
): string {
  return `${origin}\0${checkerKey}\0${sourceAddressHandle ?? 'no-source'}`;
}

function valueTypeForSymbol(
  checker: ts.TypeChecker,
  symbol: ts.Symbol,
  sourceNode: ts.Node | null,
  declarations: readonly ts.Declaration[],
): ts.Type | null {
  const location = sourceNode ?? declarations[0] ?? symbol.valueDeclaration ?? null;
  return location == null ? null : checker.getTypeOfSymbolAtLocation(symbol, location);
}

function returnTypeReferenceForSignature(
  checker: ts.TypeChecker,
  signature: ts.Signature | null,
  sourceNode: ts.Node | null,
): CheckerTypeReference | null {
  if (signature == null) {
    return null;
  }
  const returnType = checker.getReturnTypeOfSignature(signature);
  const symbol = returnType.aliasSymbol ?? returnType.symbol ?? null;
  const display = displayType(checker, returnType, sourceNode);
  return new CheckerTypeReference(
    null,
    null,
    checkerKeyForType(checker, returnType, symbol, display, sourceNode),
    display,
    classifyCheckerTypeShape(returnType, symbol),
    CheckerTypeProjectionOrigin.TypeChecker,
    null,
  );
}

/** Records compact fallback metadata for carrierless shape reads; checker-backed calls must use the call projector. */
function compactRepresentativeReturnTypeForSignatures(
  checker: ts.TypeChecker,
  signatures: readonly ts.Signature[],
  sourceNode: ts.Node | null,
): CheckerTypeReference | null {
  return returnTypeReferenceForSignature(checker, signatures[0] ?? null, sourceNode);
}

function valueTypeReferenceForMember(
  input: CheckerTypeProjectionRequest,
  valueType: ts.Type | null,
): CheckerTypeReference | null {
  if (valueType == null) {
    return null;
  }
  const symbol = valueType.aliasSymbol ?? valueType.symbol ?? null;
  const display = displayType(input.checker, valueType, input.sourceNode ?? null);
  return new CheckerTypeReference(
    null,
    null,
    checkerKeyForType(input.checker, valueType, symbol, display, input.sourceNode ?? null),
    display,
    classifyCheckerTypeShape(valueType, symbol),
    CheckerTypeProjectionOrigin.TypeChecker,
    null,
  );
}

function appendDeclarationSourceRecords(
  store: KernelStore,
  records: KernelStoreRecord[],
  declarationSource: DeclarationSourcePublication | null,
): void {
  if (declarationSource == null) {
    return;
  }
  for (const record of declarationSource.records) {
    appendKernelRecordIfAbsent(store, records, record);
  }
}

function appendKernelRecordIfAbsent(
  store: KernelStore,
  records: KernelStoreRecord[],
  record: KernelStoreRecord,
): void {
  if (
    store.read(record.handle as KernelRecordHandle) == null
    && !records.some((existing) => existing.handle === record.handle)
  ) {
    records.push(record);
  }
}
