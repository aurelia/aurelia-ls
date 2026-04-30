import ts from 'typescript';
import {
  AddressStability,
  SourceFileAddress,
  SourceSpanAddress,
  SourceSpanRole,
} from '../kernel/address.js';
import { SemanticClaim } from '../kernel/claim.js';
import {
  DerivationPhase,
  OpenSeam,
  OpenSeamSeverity,
} from '../kernel/derivation.js';
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
  IdentityStability,
  TypeSystemIdentity,
  TypeSystemIdentityKind,
  TypeScriptDeclarationIdentity,
} from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializationState,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  compactFieldProvenance,
  FieldProvenance,
  ProvenanceMode,
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
  type CheckerTypeMemberField,
  type CheckerTypeShapeField,
} from './type-shape.js';

export class CheckerTypeProjectionInput {
  constructor(
    /** Store-local key for this type projection. */
    readonly localKey: string,
    /** Checker that owns the type object. */
    readonly checker: ts.TypeChecker,
    /** Type object from the same checker/program epoch. */
    readonly type: ts.Type,
    /** How this projection was requested. */
    readonly origin: CheckerTypeProjectionOrigin = CheckerTypeProjectionOrigin.TypeChecker,
    /** Source node whose type was requested, when the caller has one. */
    readonly sourceNode: ts.Node | null = null,
    /** Source address for navigation/explanation when already materialized. */
    readonly sourceAddressHandle: AddressHandle | null = null,
    /** Semantic identity that owns this type projection, when known. */
    readonly ownerIdentityHandle: IdentityHandle | null = null,
    /** Optional display override when the caller already knows the user-facing name. */
    readonly display: string | null = null,
  ) {}
}

export class CheckerSyntheticTypeMemberInput {
  constructor(
    /** Runtime/authored member name visible on the synthetic shape. */
    readonly name: string,
    /** Type reference for the member value, when expression/type evaluation closed it. */
    readonly valueType: CheckerTypeReference | null,
    /** Broad member lane. */
    readonly memberKind: CheckerTypeMemberKind = CheckerTypeMemberKind.Property,
    /** Whether the member is optional in the synthesized shape. */
    readonly isOptional: boolean = false,
    /** Whether the member is readonly in the synthesized shape. */
    readonly isReadonly: boolean = false,
    /** Source address that caused or owns the member, when already materialized. */
    readonly sourceAddressHandle: AddressHandle | null = null,
  ) {}
}

export class CheckerSyntheticTypeProjectionInput {
  constructor(
    /** Store-local key for this synthetic type projection. */
    readonly localKey: string,
    /** Broad shape lane for the synthesized result. */
    readonly shapeKind: CheckerTypeShapeKind,
    /** Display string for traces and candidate labels. */
    readonly display: string,
    /** Members visible on this synthetic shape. */
    readonly members: readonly CheckerSyntheticTypeMemberInput[],
    /** Value type reached by dynamic keyed access, when expression semantics can prove one. */
    readonly indexedValueType: CheckerTypeReference | null = null,
    /** Value type yielded by runtime iteration, when expression semantics can prove one. */
    readonly iteratedValueType: CheckerTypeReference | null = null,
    /** How this synthetic projection was requested. */
    readonly origin: CheckerTypeProjectionOrigin = CheckerTypeProjectionOrigin.SyntheticExpressionType,
    /** Source address for navigation/explanation when already materialized. */
    readonly sourceAddressHandle: AddressHandle | null = null,
    /** Semantic identity that owns this type projection, when known. */
    readonly ownerIdentityHandle: IdentityHandle | null = null,
    /** Return type reached by calling this synthetic shape, when expression semantics can prove one. */
    readonly callReturnType: CheckerTypeReference | null = null,
    /** Instance type reached by constructing this synthetic shape, when expression semantics can prove one. */
    readonly constructReturnType: CheckerTypeReference | null = null,
  ) {}
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

/** Projects a current TypeChecker type into hot product details plus durable kernel envelopes. */
export class CheckerTypeProjector {
  constructor(
    /** Hot analysis store that receives type-system projection records. */
    readonly store: KernelStore,
  ) {}

  ensureProjection(input: CheckerTypeProjectionInput): CheckerTypeShape {
    const productHandle = this.store.handles.product(`type-shape:${input.localKey}`);
    const existing = this.store.productDetails.read(TypeSystemProductDetails.TypeShape, productHandle);
    if (existing != null) {
      return existing;
    }

    return this.project(input).typeShape;
  }

  ensureSyntheticProjection(input: CheckerSyntheticTypeProjectionInput): CheckerTypeShape {
    const productHandle = this.store.handles.product(`type-shape:${input.localKey}`);
    const existing = this.store.productDetails.read(TypeSystemProductDetails.TypeShape, productHandle);
    if (existing != null) {
      return existing;
    }

    return this.projectSynthetic(input).typeShape;
  }

  project(input: CheckerTypeProjectionInput): CheckerTypeProjectionEmission {
    const emission = this.recordsForType(input);
    this.store.commit(new KernelStoreBatch(emission.records, `type-system:${input.localKey}`));
    this.registerProductDetails(emission.typeShape);
    return emission;
  }

  projectSynthetic(input: CheckerSyntheticTypeProjectionInput): CheckerTypeProjectionEmission {
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

  private recordsForType(input: CheckerTypeProjectionInput): CheckerTypeProjectionEmission {
    const records: KernelStoreRecord[] = [];
    const source = this.recordsForSource(
      input.localKey,
      input.sourceAddressHandle,
      'TypeChecker-backed type projection for template or expression inquiry.',
      'TypeChecker projection.',
    );
    records.push(...source.records);

    const symbol = input.type.aliasSymbol ?? input.type.symbol ?? null;
    const declarations = declarationsForSymbol(symbol);
    const display = input.display ?? displayType(input.checker, input.type, input.sourceNode);
    const checkerKey = checkerKeyForType(input.type, symbol, display);
    const shapeKind = classifyTypeShape(input.type, symbol);
    const shapeProductHandle = this.store.handles.product(`type-shape:${input.localKey}`);
    const shapeIdentityHandle = this.store.handles.identity(`type-shape:${input.localKey}`);

    const carrier = new CheckerTypeCarrier(input.checker, input.type, symbol, declarations);
    const shapeReference = new CheckerTypeReference(
      shapeProductHandle,
      shapeIdentityHandle,
      checkerKey,
      display,
      shapeKind,
      input.origin,
      source.sourceAddressHandle,
    );
    const members = this.membersForType(input, shapeReference, source.provenanceHandle, records);
    const callReturnType = returnTypeReferenceForSignature(input.checker, input.type.getCallSignatures()[0] ?? null, input.sourceNode);
    const constructReturnType = returnTypeReferenceForSignature(input.checker, input.type.getConstructSignatures()[0] ?? null, input.sourceNode);
    const openSeams = shapeKind === CheckerTypeShapeKind.Unknown
      ? [
        new OpenSeam(
          this.store.handles.openSeam(`type-shape:${input.localKey}:unknown-shape`),
          KernelVocabulary.TypeSystem.OpenTypeProjection.key,
          OpenSeamSeverity.Warning,
          `TypeChecker projection could not classify '${display}' into a known type-shape lane.`,
          source.sourceAddressHandle,
          source.evidenceHandle,
        ),
      ]
      : [];
    const claims = members.map((member) => new SemanticClaim(
      this.store.handles.claim(`type-shape:${input.localKey}:member:${encodeTypeLocalPart(member.name)}`),
      shapeProductHandle,
      KernelVocabulary.TypeSystem.TypeShapeHasMember.key,
      member.productHandle,
      source.provenanceHandle,
    ));

    const typeShape = new CheckerTypeShape(
      shapeProductHandle,
      shapeIdentityHandle,
      checkerKey,
      shapeKind,
      input.origin,
      display,
      members,
      null,
      null,
      callReturnType,
      constructReturnType,
      source.sourceAddressHandle,
      compactFieldProvenance<CheckerTypeShapeField>([
        new FieldProvenance('shapeKind', source.provenanceHandle),
        new FieldProvenance('origin', source.provenanceHandle),
        new FieldProvenance('display', source.provenanceHandle),
        members.length === 0 ? null : new FieldProvenance('members', source.provenanceHandle),
        null,
        null,
        callReturnType == null ? null : new FieldProvenance('callReturnType', source.provenanceHandle),
        constructReturnType == null ? null : new FieldProvenance('constructReturnType', source.provenanceHandle),
        source.sourceAddressHandle == null ? null : new FieldProvenance('source', source.provenanceHandle),
        new FieldProvenance('carrier', source.provenanceHandle),
      ]),
      carrier,
    );

    records.push(
      new TypeSystemIdentity(
        shapeIdentityHandle,
        IdentityStability.Session,
        TypeSystemIdentityKind.TypeShape,
        checkerKey,
        input.ownerIdentityHandle,
        source.sourceAddressHandle,
        display,
      ),
      ...members.map((member) => new TypeSystemIdentity(
        member.identityHandle,
        IdentityStability.Session,
        TypeSystemIdentityKind.TypeMember,
        `${checkerKey}.${member.name}`,
        shapeIdentityHandle,
        member.sourceAddressHandle,
        member.name,
      )),
      ...openSeams,
      ...claims,
      new MaterializedProduct(
        shapeProductHandle,
        KernelVocabulary.TypeSystem.TypeShape.key,
        shapeIdentityHandle,
        source.sourceAddressHandle,
        source.provenanceHandle,
        claims.map((claim) => claim.handle),
      ),
      ...members.map((member) => new MaterializedProduct(
        member.productHandle,
        KernelVocabulary.TypeSystem.TypeMember.key,
        member.identityHandle,
        member.sourceAddressHandle ?? source.sourceAddressHandle,
        source.provenanceHandle,
        claimsForProduct(claims, member.productHandle).map((claim) => claim.handle),
      )),
      new MaterializationRecord(
        this.store.handles.materialization(`type-shape:${input.localKey}`),
        DerivationPhase.Projection,
        shapeIdentityHandle,
        shapeKind === CheckerTypeShapeKind.Unknown
          ? MaterializationState.Partial
          : MaterializationState.Complete,
        [shapeProductHandle, ...members.map((member) => member.productHandle)],
        claims.map((claim) => claim.handle),
        [],
        openSeams.map((seam) => seam.handle),
      ),
    );

    return new CheckerTypeProjectionEmission(typeShape, records);
  }

  private recordsForSyntheticType(input: CheckerSyntheticTypeProjectionInput): CheckerTypeProjectionEmission {
    const records: KernelStoreRecord[] = [];
    const source = this.recordsForSource(
      input.localKey,
      input.sourceAddressHandle,
      'Synthetic type-system projection for template or expression inquiry.',
      'Synthetic type-system projection.',
    );
    records.push(...source.records);

    const checkerKey = syntheticCheckerKey(input);
    const shapeProductHandle = this.store.handles.product(`type-shape:${input.localKey}`);
    const shapeIdentityHandle = this.store.handles.identity(`type-shape:${input.localKey}`);
    const shapeReference = new CheckerTypeReference(
      shapeProductHandle,
      shapeIdentityHandle,
      checkerKey,
      input.display,
      input.shapeKind,
      input.origin,
      source.sourceAddressHandle,
    );
    const members = input.members.map((member, index) => {
      const localKey = `${input.localKey}:member:${index}:${encodeTypeLocalPart(member.name)}`;
      return new CheckerTypeMember(
        this.store.handles.product(`type-member:${localKey}`),
        this.store.handles.identity(`type-member:${localKey}`),
        member.name,
        member.memberKind,
        shapeReference,
        member.valueType,
        member.isOptional,
        member.isReadonly,
        null,
        member.sourceAddressHandle,
        compactFieldProvenance<CheckerTypeMemberField>([
          new FieldProvenance('name', source.provenanceHandle),
          new FieldProvenance('memberKind', source.provenanceHandle),
          new FieldProvenance('ownerType', source.provenanceHandle),
          member.valueType == null ? null : new FieldProvenance('valueType', source.provenanceHandle),
          member.sourceAddressHandle == null ? null : new FieldProvenance('source', source.provenanceHandle),
        ]),
        null,
      );
    });
    const claims = members.map((member) => new SemanticClaim(
      this.store.handles.claim(`type-shape:${input.localKey}:member:${encodeTypeLocalPart(member.name)}`),
      shapeProductHandle,
      KernelVocabulary.TypeSystem.TypeShapeHasMember.key,
      member.productHandle,
      source.provenanceHandle,
    ));
    const typeShape = new CheckerTypeShape(
      shapeProductHandle,
      shapeIdentityHandle,
      checkerKey,
      input.shapeKind,
      input.origin,
      input.display,
      members,
      input.indexedValueType,
      input.iteratedValueType,
      input.callReturnType,
      input.constructReturnType,
      source.sourceAddressHandle,
      compactFieldProvenance<CheckerTypeShapeField>([
        new FieldProvenance('shapeKind', source.provenanceHandle),
        new FieldProvenance('origin', source.provenanceHandle),
        new FieldProvenance('display', source.provenanceHandle),
        members.length === 0 ? null : new FieldProvenance('members', source.provenanceHandle),
        input.indexedValueType == null ? null : new FieldProvenance('indexedValueType', source.provenanceHandle),
        input.iteratedValueType == null ? null : new FieldProvenance('iteratedValueType', source.provenanceHandle),
        input.callReturnType == null ? null : new FieldProvenance('callReturnType', source.provenanceHandle),
        input.constructReturnType == null ? null : new FieldProvenance('constructReturnType', source.provenanceHandle),
        source.sourceAddressHandle == null ? null : new FieldProvenance('source', source.provenanceHandle),
      ]),
      null,
    );

    records.push(
      new TypeSystemIdentity(
        shapeIdentityHandle,
        IdentityStability.Session,
        TypeSystemIdentityKind.TypeShape,
        checkerKey,
        input.ownerIdentityHandle,
        source.sourceAddressHandle,
        input.display,
      ),
      ...members.map((member) => new TypeSystemIdentity(
        member.identityHandle,
        IdentityStability.Session,
        TypeSystemIdentityKind.TypeMember,
        `${checkerKey}.${member.name}`,
        shapeIdentityHandle,
        member.sourceAddressHandle,
        member.name,
      )),
      ...claims,
      new MaterializedProduct(
        shapeProductHandle,
        KernelVocabulary.TypeSystem.TypeShape.key,
        shapeIdentityHandle,
        source.sourceAddressHandle,
        source.provenanceHandle,
        claims.map((claim) => claim.handle),
      ),
      ...members.map((member) => new MaterializedProduct(
        member.productHandle,
        KernelVocabulary.TypeSystem.TypeMember.key,
        member.identityHandle,
        source.sourceAddressHandle,
        source.provenanceHandle,
        claimsForProduct(claims, member.productHandle).map((claim) => claim.handle),
      )),
      new MaterializationRecord(
        this.store.handles.materialization(`type-shape:${input.localKey}`),
        DerivationPhase.Projection,
        shapeIdentityHandle,
        MaterializationState.Complete,
        [shapeProductHandle, ...members.map((member) => member.productHandle)],
        claims.map((claim) => claim.handle),
        [],
        [],
      ),
    );

    return new CheckerTypeProjectionEmission(typeShape, records);
  }

  private membersForType(
    input: CheckerTypeProjectionInput,
    ownerType: CheckerTypeReference,
    provenanceHandle: ProvenanceHandle,
    records: KernelStoreRecord[],
  ): readonly CheckerTypeMember[] {
    return input.type.getProperties().map((symbol) => {
      const declarations = declarationsForSymbol(symbol);
      const name = symbol.getName();
      const localKey = `${input.localKey}:member:${encodeTypeLocalPart(name)}`;
      const valueType = valueTypeForSymbol(input.checker, symbol, input.sourceNode, declarations);
      const declarationSource = sourceSpanForDeclaration(this.store, symbol, declarations, SourceSpanRole.Name);
      if (declarationSource != null) {
        appendKernelRecordIfAbsent(this.store, records, declarationSource.address);
        appendKernelRecordIfAbsent(this.store, records, declarationSource.identity);
      }
      const valueTypeReference = valueType == null
        ? null
        : new CheckerTypeReference(
          null,
          null,
          checkerKeyForType(valueType, valueType.aliasSymbol ?? valueType.symbol ?? null, displayType(input.checker, valueType, input.sourceNode)),
          displayType(input.checker, valueType, input.sourceNode),
          classifyTypeShape(valueType, valueType.aliasSymbol ?? valueType.symbol ?? null),
          CheckerTypeProjectionOrigin.TypeChecker,
          null,
        );
      const carrier = new CheckerTypeMemberCarrier(input.checker, symbol, valueType, declarations);
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
        compactFieldProvenance<CheckerTypeMemberField>([
          new FieldProvenance('name', provenanceHandle),
          new FieldProvenance('memberKind', provenanceHandle),
          new FieldProvenance('ownerType', provenanceHandle),
          valueTypeReference == null ? null : new FieldProvenance('valueType', provenanceHandle),
          declarations.length === 0 ? null : new FieldProvenance('declaration', provenanceHandle),
          new FieldProvenance('carrier', provenanceHandle),
        ]),
        carrier,
      );
    });
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
        ProvenanceMode.Derived,
        [evidenceHandle],
        [],
        provenanceSummary,
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

function syntheticCheckerKey(input: CheckerSyntheticTypeProjectionInput): string {
  return `type:synthetic:${input.origin}:${input.localKey}`;
}

function encodeTypeLocalPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_$.-]+/g, '_');
}

function classifyTypeShape(
  type: ts.Type,
  symbol: ts.Symbol | null,
): CheckerTypeShapeKind {
  if ((type.flags & ts.TypeFlags.Union) !== 0) {
    return CheckerTypeShapeKind.Union;
  }
  if ((type.flags & ts.TypeFlags.Intersection) !== 0) {
    return CheckerTypeShapeKind.Intersection;
  }
  if ((type.flags & ts.TypeFlags.TypeParameter) !== 0) {
    return CheckerTypeShapeKind.TypeParameter;
  }
  if ((type.flags & primitiveTypeFlags()) !== 0) {
    return CheckerTypeShapeKind.Primitive;
  }

  const declarations = declarationsForSymbol(symbol);
  if (declarations.some((declaration) => ts.isClassDeclaration(declaration) || ts.isClassExpression(declaration))) {
    return CheckerTypeShapeKind.Class;
  }
  if (declarations.some((declaration) => ts.isInterfaceDeclaration(declaration))) {
    return CheckerTypeShapeKind.Interface;
  }
  if (type.getCallSignatures().length > 0) {
    return CheckerTypeShapeKind.Function;
  }
  if ((type.flags & ts.TypeFlags.Object) !== 0) {
    return CheckerTypeShapeKind.Object;
  }
  return CheckerTypeShapeKind.Unknown;
}

function primitiveTypeFlags(): ts.TypeFlags {
  return ts.TypeFlags.String
    | ts.TypeFlags.Number
    | ts.TypeFlags.Boolean
    | ts.TypeFlags.BigInt
    | ts.TypeFlags.StringLiteral
    | ts.TypeFlags.NumberLiteral
    | ts.TypeFlags.BooleanLiteral
    | ts.TypeFlags.BigIntLiteral
    | ts.TypeFlags.Null
    | ts.TypeFlags.Undefined
    | ts.TypeFlags.Void
    | ts.TypeFlags.ESSymbol
    | ts.TypeFlags.UniqueESSymbol;
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
    classifyTypeShape(returnType, symbol),
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

function claimsForProduct(
  claims: readonly SemanticClaim[],
  productHandle: ProductHandle,
): readonly SemanticClaim[] {
  return claims.filter((claim) =>
    claim.subjectHandle === productHandle
    || claim.objectHandle === productHandle
  );
}

function sourceSpanForDeclaration(
  store: KernelStore,
  symbol: ts.Symbol,
  declarations: readonly ts.Declaration[],
  role: SourceSpanRole,
): {
  readonly address: SourceSpanAddress;
  readonly identity: TypeScriptDeclarationIdentity;
} | null {
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
  const start = addressNode.getStart(sourceFile);
  const end = addressNode.end;
  const local = [
    'type-system-declaration',
    sourceFileAddress.workspaceKey,
    sourceFileAddress.path,
    start,
    end,
    role,
  ].join(':');
  const addressHandle = store.handles.address(`${local}:span`);
  const identityHandle = store.handles.identity(`${local}:identity`);
  return {
    address: new SourceSpanAddress(
      addressHandle,
      AddressStability.SourceStable,
      sourceFileAddress.handle,
      start,
      end,
      role,
    ),
    identity: new TypeScriptDeclarationIdentity(
      identityHandle,
      IdentityStability.SourceStable,
      sourceFileAddress.path,
      null,
      symbol.getName(),
      addressHandle,
    ),
  };
}

function sourceFileAddressForDeclaration(
  store: KernelStore,
  declaration: ts.Declaration,
): SourceFileAddress | null {
  const sourceFileName = normalizeSourcePath(declaration.getSourceFile().fileName);
  const matches = store.readAddresses()
    .filter((address): address is SourceFileAddress => address instanceof SourceFileAddress)
    .filter((address) => sourceFileMatches(sourceFileName, address.path))
    .sort((left, right) => normalizeSourcePath(right.path).length - normalizeSourcePath(left.path).length);
  return matches[0] ?? null;
}

function declarationAddressNode(declaration: ts.Declaration): ts.Node {
  return ts.getNameOfDeclaration(declaration) ?? declaration;
}

function sourceFileMatches(
  normalizedFileName: string,
  storedPath: string,
): boolean {
  const normalizedStoredPath = normalizeSourcePath(storedPath);
  return normalizedFileName === normalizedStoredPath
    || normalizedFileName.endsWith(`/${normalizedStoredPath}`);
}

function normalizeSourcePath(fileName: string): string {
  return fileName.replace(/\\/g, '/');
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
