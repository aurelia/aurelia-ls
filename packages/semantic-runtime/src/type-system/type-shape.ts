import ts from 'typescript';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';

export const enum CheckerTypeProjectionOrigin {
  /** Type came directly from the TypeChecker at a source or expression site. */
  TypeChecker = 'type-checker',
  /** Type came from a statically evaluated value whose declaration/type can be checked. */
  EvaluatedValueDeclaredType = 'evaluated-value-declared-type',
  /** Type was synthesized by template/compiler semantics, such as repeat locals. */
  SyntheticTemplateType = 'synthetic-template-type',
  /** Type was synthesized by Aurelia expression semantics, such as object and array literals. */
  SyntheticExpressionType = 'synthetic-expression-type',
  /** Type could not be projected without leaving a visible seam. */
  Open = 'open',
}

export const enum CheckerTypeShapeKind {
  Any = 'any',
  Unknown = 'unknown',
  Never = 'never',
  Primitive = 'primitive',
  Object = 'object',
  Class = 'class',
  Interface = 'interface',
  Function = 'function',
  Union = 'union',
  Intersection = 'intersection',
  TypeParameter = 'type-parameter',
  Unclassified = 'unclassified',
}

export const enum CheckerTypeMemberKind {
  Unknown = 'unknown',
  Property = 'property',
  Method = 'method',
  Accessor = 'accessor',
  Constructor = 'constructor',
  CallSignature = 'call-signature',
  IndexSignature = 'index-signature',
}

export const enum CheckerIndexedAccessKeyKind {
  String = 'string',
  Number = 'number',
  StringAndNumber = 'string-and-number',
}

export function checkerIndexedAccessSupportsString(
  kind: CheckerIndexedAccessKeyKind | null,
): boolean {
  return kind === CheckerIndexedAccessKeyKind.String
    || kind === CheckerIndexedAccessKeyKind.StringAndNumber;
}

export function checkerIndexedAccessSupportsNumber(
  kind: CheckerIndexedAccessKeyKind | null,
): boolean {
  return kind === CheckerIndexedAccessKeyKind.Number
    || kind === CheckerIndexedAccessKeyKind.StringAndNumber;
}

export function checkerTypeShapeIsPrimitiveDisplay(
  typeShape: CheckerTypeShape,
  primitive: 'string' | 'number' | 'boolean' | 'undefined',
): boolean {
  return typeShape.shapeKind === CheckerTypeShapeKind.Primitive && typeShape.display === primitive;
}

export function classifyCheckerTypeShape(
  type: ts.Type,
  symbol: ts.Symbol | null = type.symbol ?? null,
): CheckerTypeShapeKind {
  if ((type.flags & ts.TypeFlags.Any) !== 0) {
    return CheckerTypeShapeKind.Any;
  }
  if ((type.flags & ts.TypeFlags.Unknown) !== 0) {
    return CheckerTypeShapeKind.Unknown;
  }
  if ((type.flags & ts.TypeFlags.Never) !== 0) {
    return CheckerTypeShapeKind.Never;
  }
  if (type.isUnion()) {
    return CheckerTypeShapeKind.Union;
  }
  if (type.isIntersection()) {
    return CheckerTypeShapeKind.Intersection;
  }
  if ((type.flags & ts.TypeFlags.TypeParameter) !== 0) {
    return CheckerTypeShapeKind.TypeParameter;
  }
  if ((type.flags & primitiveCheckerTypeFlags()) !== 0) {
    return CheckerTypeShapeKind.Primitive;
  }

  const declarations = declarationsForTypeShapeSymbol(symbol);
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
  return CheckerTypeShapeKind.Unclassified;
}

function primitiveCheckerTypeFlags(): ts.TypeFlags {
  return ts.TypeFlags.StringLike
    | ts.TypeFlags.NumberLike
    | ts.TypeFlags.BooleanLike
    | ts.TypeFlags.BigIntLike
    | ts.TypeFlags.Null
    | ts.TypeFlags.Undefined
    | ts.TypeFlags.Void
    | ts.TypeFlags.ESSymbolLike;
}

function declarationsForTypeShapeSymbol(symbol: ts.Symbol | null): readonly ts.Declaration[] {
  return symbol?.declarations ?? [];
}

export type CheckerTypeShapeField =
  | 'shapeKind'
  | 'origin'
  | 'display'
  | 'members'
  | 'indexedValueType'
  | 'indexedAccessKeyKind'
  | 'iteratedValueType'
  | 'callReturnType'
  | 'constructReturnType'
  | 'source'
  | 'declarationSource'
  | 'carrier';

export type CheckerTypeMemberField =
  | 'name'
  | 'memberKind'
  | 'ownerType'
  | 'valueType'
  | 'declaration'
  | 'source'
  | 'carrier';

/**
 * Current TypeChecker carrier for a projected type.
 *
 * This is intentionally not a kernel record. TypeChecker objects are tied to one Program/language-service epoch and
 * are retained only in hot product details so inquiry can ask follow-up questions without re-resolving the checker
 * surface.
 */
export class CheckerTypeCarrier {
  constructor(
    /** Checker that owns the retained type object. */
    readonly checker: ts.TypeChecker,
    /** Type object from the same checker/program epoch. */
    readonly type: ts.Type,
    /** Preferred symbol for display and declaration lookup, when one exists. */
    readonly symbol: ts.Symbol | null,
    /** Current declarations for the symbol/type, if the checker exposed them. */
    readonly declarations: readonly ts.Declaration[] = [],
  ) {}
}

/**
 * Current TypeChecker carrier for a projected member.
 *
 * Like `CheckerTypeCarrier`, this is hot current-run state. Durable relationships live in product handles, identity
 * handles, claims, and provenance.
 */
export class CheckerTypeMemberCarrier {
  constructor(
    /** Checker that owns the retained symbol/type objects. */
    readonly checker: ts.TypeChecker,
    /** Member symbol from the same checker/program epoch. */
    readonly symbol: ts.Symbol,
    /** Value type for the member, when the checker could compute it cheaply. */
    readonly valueType: ts.Type | null,
    /** Current declarations for the member symbol. */
    readonly declarations: readonly ts.Declaration[] = [],
  ) {}
}

/** Handle-sized reference to a projected type without recursively expanding its detail. */
export class CheckerTypeReference {
  constructor(
    /** Product handle for this type projection, when it has been materialized. */
    readonly productHandle: ProductHandle | null,
    /** Identity handle for this type projection, when one exists. */
    readonly identityHandle: IdentityHandle | null,
    /** Type-system key used to reconnect to hot details in the current analysis epoch. */
    readonly checkerKey: string | null,
    /** Display string for traces and candidate labels. */
    readonly display: string | null,
    /** Broad shape kind, when known. */
    readonly shapeKind: CheckerTypeShapeKind,
    /** How this reference was produced. */
    readonly origin: CheckerTypeProjectionOrigin,
    /** Source address that caused or owns the projection. */
    readonly sourceAddressHandle: AddressHandle | null = null,
  ) {}
}

export function sameCheckerTypeReference(
  left: CheckerTypeReference,
  right: CheckerTypeReference,
): boolean {
  return left.productHandle === right.productHandle
    || (left.checkerKey === right.checkerKey && left.display === right.display);
}

/** Type-system member detail visible to template/expression inquiry. */
export class CheckerTypeMember {
  constructor(
    /** Product handle for this member projection. */
    readonly productHandle: ProductHandle,
    /** Identity handle for this member projection. */
    readonly identityHandle: IdentityHandle,
    /** Runtime/authored member name. */
    readonly name: string,
    /** Broad member lane from checker declarations and symbol flags. */
    readonly memberKind: CheckerTypeMemberKind,
    /** Type projection that owns this member. */
    readonly ownerType: CheckerTypeReference,
    /** Type reference for the member value, if known. */
    readonly valueType: CheckerTypeReference | null,
    /** Whether the member is optional according to the checker surface. */
    readonly isOptional: boolean,
    /** Whether the member appears readonly from the available declarations. */
    readonly isReadonly: boolean,
    /** Declaration identity for the member, when source identity has been materialized. */
    readonly declarationIdentityHandle: IdentityHandle | null,
    /** Best source address for navigation or explanation. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for mixed checker/source projections. */
    readonly fieldProvenance: readonly FieldProvenance<CheckerTypeMemberField>[] = [],
    /** Hot checker carrier for follow-up member/type reads. */
    readonly carrier: CheckerTypeMemberCarrier | null = null,
  ) {}
}

/** Type-system type detail visible to template/expression inquiry. */
export class CheckerTypeShape {
  constructor(
    /** Product handle for this type projection. */
    readonly productHandle: ProductHandle,
    /** Identity handle for this type projection. */
    readonly identityHandle: IdentityHandle,
    /** Type-system key for this projection in the current analysis epoch. */
    readonly checkerKey: string,
    /** Broad shape lane. */
    readonly shapeKind: CheckerTypeShapeKind,
    /** How this projection was produced. */
    readonly origin: CheckerTypeProjectionOrigin,
    /** Display string for traces and candidate labels. */
    readonly display: string,
    /** Members visible on this type projection. */
    readonly members: readonly CheckerTypeMember[],
    /** Value type reached by dynamic keyed access, when the projection can prove one. */
    readonly indexedValueType: CheckerTypeReference | null,
    /** Key kind that can reach `indexedValueType`; dot-member fallback is valid only for string-capable indexes. */
    readonly indexedAccessKeyKind: CheckerIndexedAccessKeyKind | null,
    /** Value type yielded by runtime iteration, when the projection can prove one. */
    readonly iteratedValueType: CheckerTypeReference | null,
    /** Return type reached by calling this shape, when the projection can prove one. */
    readonly callReturnType: CheckerTypeReference | null,
    /** Instance type reached by constructing this shape, when the projection can prove one. */
    readonly constructReturnType: CheckerTypeReference | null,
    /** Source address that caused or owns this projection. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Best TypeScript declaration source for the projected type, when checker declarations can name one. */
    readonly declarationSourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for checker/source projections. */
    readonly fieldProvenance: readonly FieldProvenance<CheckerTypeShapeField>[] = [],
    /** Hot checker carrier for follow-up member/type reads. */
    readonly carrier: CheckerTypeCarrier | null = null,
  ) {}

  toReference(): CheckerTypeReference {
    return new CheckerTypeReference(
      this.productHandle,
      this.identityHandle,
      this.checkerKey,
      this.display,
      this.shapeKind,
      this.origin,
      this.sourceAddressHandle,
    );
  }
}
