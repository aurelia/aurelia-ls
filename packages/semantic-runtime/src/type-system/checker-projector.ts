import ts from 'typescript';
import {
  SourceFileAddress,
  SourceSpanAddress,
  SourceSpanRole,
} from '../kernel/address.js';
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
  TypeScriptDeclarationIdentity,
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
import { TypeSystemProductDetails } from './product-details.js';
import {
  CheckerTypeCarrier,
  CheckerTypeMember,
  CheckerTypeMemberCarrier,
  CheckerTypeMemberKind,
  CheckerTypeProjectionOrigin,
  CheckerTypeReference,
  CheckerTypeShape,
  CheckerTypeShapeKind,
  classifyCheckerTypeShape,
  type CheckerTypeMemberField,
  type CheckerTypeShapeField,
} from './type-shape.js';

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
    const members = this.membersForType(input, shapeReference, source.provenanceHandle, records);
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
    const members = this.syntheticMembersForType(input, shapeReference, source.provenanceHandle);
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
      input.iteratedValueType,
      input.callReturnType,
      input.constructReturnType,
      input.source.sourceAddressHandle,
      compactFieldProvenance<CheckerTypeShapeField>([
        new FieldProvenance('shapeKind', input.source.provenanceHandle),
        new FieldProvenance('origin', input.source.provenanceHandle),
        new FieldProvenance('display', input.source.provenanceHandle),
        input.members.length === 0 ? null : new FieldProvenance('members', input.source.provenanceHandle),
        input.indexedValueType == null ? null : new FieldProvenance('indexedValueType', input.source.provenanceHandle),
        input.iteratedValueType == null ? null : new FieldProvenance('iteratedValueType', input.source.provenanceHandle),
        input.callReturnType == null ? null : new FieldProvenance('callReturnType', input.source.provenanceHandle),
        input.constructReturnType == null ? null : new FieldProvenance('constructReturnType', input.source.provenanceHandle),
        input.source.sourceAddressHandle == null ? null : new FieldProvenance('source', input.source.provenanceHandle),
        input.carrier == null ? null : new FieldProvenance('carrier', input.source.provenanceHandle),
      ]),
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
      this.store.handles.claim(`type-shape:${input.localKey}:member:${encodeTypeLocalPart(member.name)}`),
      input.shapeProductHandle,
      KernelVocabulary.TypeSystem.TypeShapeHasMember.key,
      member.productHandle,
      input.source.provenanceHandle,
    ));
  }

  private syntheticMembersForType(
    input: CheckerSyntheticTypeProjectionRequest,
    ownerType: CheckerTypeReference,
    provenanceHandle: ProvenanceHandle,
  ): readonly CheckerTypeMember[] {
    return input.members.map((member, index) => {
      const localKey = `${input.localKey}:member:${index}:${encodeTypeLocalPart(member.name)}`;
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
        compactFieldProvenance<CheckerTypeMemberField>([
          new FieldProvenance('name', provenanceHandle),
          new FieldProvenance('memberKind', provenanceHandle),
          new FieldProvenance('ownerType', provenanceHandle),
          member.valueType == null ? null : new FieldProvenance('valueType', provenanceHandle),
          member.sourceAddressHandle == null ? null : new FieldProvenance('source', provenanceHandle),
        ]),
        null,
      );
    });
  }

  private membersForType(
    input: CheckerTypeProjectionRequest,
    ownerType: CheckerTypeReference,
    provenanceHandle: ProvenanceHandle,
    records: KernelStoreRecord[],
  ): readonly CheckerTypeMember[] {
    return input.type.getProperties().map((symbol) =>
      this.memberForType(input, ownerType, provenanceHandle, records, symbol)
    );
  }

  private memberForType(
    input: CheckerTypeProjectionRequest,
    ownerType: CheckerTypeReference,
    provenanceHandle: ProvenanceHandle,
    records: KernelStoreRecord[],
    symbol: ts.Symbol,
  ): CheckerTypeMember {
    const declarations = declarationsForSymbol(symbol);
    const name = symbol.getName();
    const localKey = `${input.localKey}:member:${encodeTypeLocalPart(name)}`;
    const valueType = valueTypeForSymbol(input.checker, symbol, input.sourceNode ?? null, declarations);
    const declarationSource = sourceSpanForDeclaration(this.store, symbol, declarations, SourceSpanRole.Name);
    appendDeclarationSourceRecords(this.store, records, declarationSource);
    const valueTypeReference = valueTypeReferenceForMember(input, valueType);
    return new CheckerTypeMember(
      this.store.handles.product(`type-member:${localKey}`),
      this.store.handles.identity(`type-member:${localKey}`),
      name,
      classifyMember(symbol, declarations),
      ownerType,
      valueTypeReference,
      isOptionalMember(symbol, declarations),
      isReadonlyMember(declarations),
      declarationSource?.identity.handle ?? null,
      declarationSource?.address.handle ?? null,
      memberFieldProvenance(provenanceHandle, valueTypeReference, declarations),
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

function declarationsForSymbol(symbol: ts.Symbol | null): readonly ts.Declaration[] {
  return symbol?.getDeclarations() ?? [];
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
  const declarations = declarationsForSymbol(symbol);
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
  return {
    indexedValueType: null,
    iteratedValueType: null,
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
  const declaration = declarationsForSymbol(symbol)[0] ?? null;
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

function encodeTypeLocalPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_$.-]+/g, '_');
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

function classifyMember(
  symbol: ts.Symbol,
  declarations: readonly ts.Declaration[],
): CheckerTypeMemberKind {
  if ((symbol.flags & ts.SymbolFlags.Method) !== 0) {
    return CheckerTypeMemberKind.Method;
  }
  if ((symbol.flags & (ts.SymbolFlags.GetAccessor | ts.SymbolFlags.SetAccessor)) !== 0) {
    return CheckerTypeMemberKind.Accessor;
  }
  if ((symbol.flags & ts.SymbolFlags.Constructor) !== 0) {
    return CheckerTypeMemberKind.Constructor;
  }
  if ((symbol.flags & ts.SymbolFlags.Property) !== 0) {
    return CheckerTypeMemberKind.Property;
  }
  if (declarations.some((declaration) => ts.isCallSignatureDeclaration(declaration))) {
    return CheckerTypeMemberKind.CallSignature;
  }
  if (declarations.some((declaration) => ts.isIndexSignatureDeclaration(declaration))) {
    return CheckerTypeMemberKind.IndexSignature;
  }
  return CheckerTypeMemberKind.Unknown;
}

function isOptionalMember(
  symbol: ts.Symbol,
  declarations: readonly ts.Declaration[],
): boolean {
  return (symbol.flags & ts.SymbolFlags.Optional) !== 0
    || declarations.some((declaration) => 'questionToken' in declaration && declaration.questionToken != null);
}

function isReadonlyMember(declarations: readonly ts.Declaration[]): boolean {
  return declarations.some((declaration) =>
    ts.canHaveModifiers(declaration)
    && ts.getModifiers(declaration)?.some((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword) === true
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

function memberFieldProvenance(
  provenanceHandle: ProvenanceHandle,
  valueTypeReference: CheckerTypeReference | null,
  declarations: readonly ts.Declaration[],
): readonly FieldProvenance<CheckerTypeMemberField>[] {
  return compactFieldProvenance<CheckerTypeMemberField>([
    new FieldProvenance('name', provenanceHandle),
    new FieldProvenance('memberKind', provenanceHandle),
    new FieldProvenance('ownerType', provenanceHandle),
    valueTypeReference == null ? null : new FieldProvenance('valueType', provenanceHandle),
    declarations.length === 0 ? null : new FieldProvenance('declaration', provenanceHandle),
    new FieldProvenance('carrier', provenanceHandle),
  ]);
}

function appendDeclarationSourceRecords(
  store: KernelStore,
  records: KernelStoreRecord[],
  declarationSource: ReturnType<typeof sourceSpanForDeclaration>,
): void {
  if (declarationSource == null) {
    return;
  }
  appendKernelRecordIfAbsent(store, records, declarationSource.address);
  appendKernelRecordIfAbsent(store, records, declarationSource.identity);
}

interface DeclarationSourcePublication {
  readonly address: SourceSpanAddress;
  readonly identity: TypeScriptDeclarationIdentity;
}

interface DeclarationSourceSpan {
  readonly sourceFileAddress: SourceFileAddress;
  readonly start: number;
  readonly end: number;
}

function sourceSpanForDeclaration(
  store: KernelStore,
  symbol: ts.Symbol,
  declarations: readonly ts.Declaration[],
  role: SourceSpanRole,
): DeclarationSourcePublication | null {
  const span = declarationSourceSpan(store, symbol, declarations);
  if (span == null) {
    return null;
  }
  const local = declarationSourceLocal(span, role);
  const addressHandle = store.handles.address(`${local}:span`);
  return {
    address: new SourceSpanAddress(
      addressHandle,
      span.sourceFileAddress.handle,
      span.start,
      span.end,
      role,
    ),
    identity: new TypeScriptDeclarationIdentity(
      store.handles.identity(`${local}:identity`),
      span.sourceFileAddress.path,
      null,
      symbol.getName(),
      addressHandle,
    ),
  };
}

function declarationSourceSpan(
  store: KernelStore,
  symbol: ts.Symbol,
  declarations: readonly ts.Declaration[],
): DeclarationSourceSpan | null {
  const declaration = declarations[0] ?? symbol.valueDeclaration ?? null;
  if (declaration == null) {
    return null;
  }
  const sourceFileAddress = sourceFileAddressForDeclaration(store, declaration);
  if (sourceFileAddress == null) {
    return null;
  }
  const addressNode = declarationAddressNode(declaration);
  const sourceFile = declaration.getSourceFile();
  return {
    sourceFileAddress,
    start: addressNode.getStart(sourceFile),
    end: addressNode.end,
  };
}

function declarationSourceLocal(
  span: DeclarationSourceSpan,
  role: SourceSpanRole,
): string {
  return [
    'type-system-declaration',
    span.sourceFileAddress.workspaceKey,
    span.sourceFileAddress.path,
    span.start,
    span.end,
    role,
  ].join(':');
}

function sourceFileAddressForDeclaration(
  store: KernelStore,
  declaration: ts.Declaration,
): SourceFileAddress | null {
  return store.readBestSourceFileAddressForFileName(declaration.getSourceFile().fileName);
}

function declarationAddressNode(declaration: ts.Declaration): ts.Node {
  return ts.getNameOfDeclaration(declaration) ?? declaration;
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
