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
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import { TypeSystemProductDetails } from './product-details.js';
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
  readonly shapeKind: CheckerTypeShapeKind;
}

interface TypeShapeRelatedTypes {
  readonly indexedValueType: CheckerTypeReference | null;
  readonly indexedAccessKeyKind: CheckerIndexedAccessKeyKind | null;
  readonly iteratedValueType: CheckerTypeReference | null;
  readonly callReturnType: CheckerTypeReference | null;
  readonly constructReturnType: CheckerTypeReference | null;
}

class TypeShapePublicationFrame {
  constructor(
    readonly localKey: string,
    readonly source: TypeProjectionSourceSet,
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
    for (const member of typeShape.members) {
      this.store.productDetails.add(TypeSystemProductDetails.TypeMember, member.productHandle, member);
    }
  }

  private recordsForType(input: CheckerTypeProjectionRequest): CheckerTypeProjectionEmission {
    const records: KernelStoreRecord[] = [];
    const source = this.recordsForSource(
      input.localKey,
      typeProjectionSourceAddress(input),
      'TypeChecker-backed type projection for template or expression inquiry.',
      'TypeChecker projection.',
    );
    records.push(...source.records);
    return this.recordsForShapePublication(this.publicationFrameForType(input, source, records));
  }

  private publicationFrameForType(
    input: CheckerTypeProjectionRequest,
    source: TypeProjectionSourceSet,
    records: KernelStoreRecord[],
  ): TypeShapePublicationFrame {
    const descriptor = checkerTypeDescriptor(input);
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
    input.records.push(...this.recordsForShapeAndMembers(input, claims));
    return new CheckerTypeProjectionEmission(typeShape, input.records);
  }

  private typeShapeForPublication(input: TypeShapePublicationFrame): CheckerTypeShape {
    return new CheckerTypeShape(
      input.shapeProductHandle,
      input.shapeIdentityHandle,
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
      input.source.sourceAddressHandle,
      [],
      input.carrier,
    );
  }

  private recordsForShapeAndMembers(
    input: TypeShapePublicationFrame,
    claims: readonly SemanticClaim[],
  ): readonly KernelStoreRecord[] {
    return [
      this.typeShapeIdentity(input),
      ...this.typeMemberIdentities(input),
      ...input.openSeams,
      ...claims,
      this.typeShapeProduct(input),
      ...this.typeMemberProducts(input),
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

  private typeMemberIdentities(input: TypeShapePublicationFrame): readonly TypeSystemIdentity[] {
    return input.members.map((member) => new TypeSystemIdentity(
      member.identityHandle,
      KernelVocabulary.TypeSystem.TypeMember.key,
      `${input.checkerKey}.${member.name}`,
      input.shapeIdentityHandle,
      member.sourceAddressHandle,
      member.name,
    ));
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

  private typeMemberProducts(input: TypeShapePublicationFrame): readonly MaterializedProduct[] {
    return input.members.map((member) => new MaterializedProduct(
      member.productHandle,
      KernelVocabulary.TypeSystem.TypeMember.key,
      member.identityHandle,
      member.sourceAddressHandle ?? input.source.sourceAddressHandle,
      input.source.provenanceHandle,
    ));
  }

  private typeShapeMaterialization(
    input: TypeShapePublicationFrame,
    claims: readonly SemanticClaim[],
  ): MaterializationRecord {
    return new MaterializationRecord(
      this.store.handles.materialization(`type-shape:${input.localKey}`),
      input.shapeIdentityHandle,
      [input.shapeProductHandle, ...input.members.map((member) => member.productHandle)],
      claims.map((claim) => claim.handle),
      input.openSeams.map((seam) => seam.handle),
    );
  }

  private claimsForShapeMembers(input: TypeShapePublicationFrame): readonly SemanticClaim[] {
    return input.members.map((member) => new SemanticClaim(
      this.store.handles.claim(`type-shape:${input.localKey}:member:${localKeyPart(member.name)}`),
      input.shapeProductHandle,
      KernelVocabulary.TypeSystem.TypeShapeHasMember.key,
      member.productHandle,
      input.source.provenanceHandle,
    ));
  }

  private syntheticMembersForType(
    input: CheckerSyntheticTypeProjectionRequest,
    ownerType: CheckerTypeReference,
  ): readonly CheckerTypeMember[] {
    return input.members.map((member, index) => {
      const localKey = `${input.localKey}:member:${index}:${localKeyPart(member.name)}`;
      return new CheckerTypeMember(
        this.store.handles.product(`type-member:${localKey}`),
        this.store.handles.identity(`type-member:${localKey}`),
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
      this.store.handles.identity(`type-member:${localKey}`),
      name,
      checkerSymbolMemberKind(symbol, declarations),
      ownerType,
      valueTypeReference,
      checkerSymbolIsOptional(symbol, declarations),
      checkerDeclarationsAreReadonly(declarations),
      declarationSource?.identity.handle ?? null,
      declarationSource?.address.handle ?? null,
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
): AddressHandle | null {
  return input.sourceAddressHandle ?? null;
}

function checkerTypeDescriptor(input: CheckerTypeProjectionRequest): CheckerTypeDescriptor {
  const symbol = input.type.aliasSymbol ?? input.type.symbol ?? null;
  const declarations = declarationsForCheckerSymbol(symbol);
  const display = input.display ?? displayType(input.checker, input.type, input.sourceNode ?? null);
  return {
    symbol,
    declarations,
    display,
    checkerKey: checkerKeyForType(input.type, symbol, display),
    shapeKind: classifyCheckerTypeShape(input.type, symbol),
  };
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
    callReturnType: returnTypeReferenceForSignature(
      input.checker,
      input.type.getCallSignatures()[0] ?? null,
      input.sourceNode ?? null,
    ),
    constructReturnType: returnTypeReferenceForSignature(
      input.checker,
      input.type.getConstructSignatures()[0] ?? null,
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
  return new CheckerTypeReference(
    null,
    null,
    checkerKeyForType(type, symbol, display),
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
  type: ts.Type,
  symbol: ts.Symbol | null,
  display: string,
): string {
  const declaration = declarationsForCheckerSymbol(symbol)[0] ?? null;
  if (declaration != null) {
    const sourceFile = declaration.getSourceFile();
    return `type:${sourceFile.fileName}:${declaration.pos}:${declaration.end}:${symbol?.getName() ?? display}`;
  }
  if (type.aliasSymbol != null) {
    return `type:alias:${type.aliasSymbol.getName()}:${display}`;
  }
  return `type:display:${display}`;
}

function syntheticCheckerKey(input: CheckerSyntheticTypeProjectionRequest): string {
  return `type:synthetic:${syntheticProjectionOrigin(input)}:${input.localKey}`;
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
    checkerKeyForType(returnType, symbol, display),
    display,
    classifyCheckerTypeShape(returnType, symbol),
    CheckerTypeProjectionOrigin.TypeChecker,
    null,
  );
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
    checkerKeyForType(valueType, symbol, display),
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
