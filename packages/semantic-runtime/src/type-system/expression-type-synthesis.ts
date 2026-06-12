import type { ArrowFunction } from '../expression/ast.js';
import type { AddressHandle } from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  type CheckerSyntheticTypeMemberRequest,
  type CheckerTypeProjector,
} from './checker-projector.js';
import { TypeSystemProductDetails } from './product-details.js';
import {
  CheckerIndexedAccessKeyKind,
  CheckerTypeMember,
  CheckerTypeMemberKind,
  CheckerTypeProjectionOrigin,
  CheckerTypeReference,
  CheckerTypeShape,
  CheckerTypeShapeKind,
} from './type-shape.js';

export interface CheckerTupleElementRequest {
  readonly name?: string | null;
  readonly valueType: CheckerTypeReference;
  readonly isRest?: boolean;
}

/** Synthesizes product-owned type shapes for Aurelia expression and template-runtime semantics. */
export class CheckerExpressionTypeSynthesizer {
  constructor(
    readonly projector: CheckerTypeProjector,
  ) {}

  arrowFunctionType(
    expression: ArrowFunction,
    returnType: CheckerTypeReference | null,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeShape {
    return this.projector.ensureSyntheticProjection({
      localKey: `${localKey}:arrow-function`,
      shapeKind: CheckerTypeShapeKind.Function,
      display: displayArrowFunctionType(expression, returnType),
      members: [],
      origin: CheckerTypeProjectionOrigin.SyntheticExpressionType,
      sourceAddressHandle,
      callReturnType: returnType,
    });
  }

  arrayLiteralType(
    members: readonly CheckerSyntheticTypeMemberRequest[],
    elementTypes: readonly CheckerTypeShape[],
    elementCount: number,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeShape {
    const commonElementType = this.commonOrUnionTypeReferenceForShapes(
      elementTypes,
      elementCount,
      `${localKey}:array-element`,
      sourceAddressHandle,
    );
    return this.projector.ensureSyntheticProjection({
      localKey: `${localKey}:array-literal`,
      shapeKind: CheckerTypeShapeKind.Object,
      display: displayArrayLiteralType(commonElementType, elementCount),
      members,
      indexedValueType: commonElementType,
      indexedAccessKeyKind: commonElementType == null ? null : CheckerIndexedAccessKeyKind.Number,
      iteratedValueType: commonElementType,
      origin: CheckerTypeProjectionOrigin.SyntheticExpressionType,
      sourceAddressHandle,
    });
  }

  objectLiteralType(
    members: readonly CheckerSyntheticTypeMemberRequest[],
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeShape {
    return this.projector.ensureSyntheticProjection({
      localKey: `${localKey}:object-literal`,
      shapeKind: CheckerTypeShapeKind.Object,
      display: displayObjectLiteralType(members),
      members,
      origin: CheckerTypeProjectionOrigin.SyntheticExpressionType,
      sourceAddressHandle,
    });
  }

  unionType(
    shapes: readonly CheckerTypeShape[],
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeShape {
    return this.projector.ensureSyntheticProjection({
      localKey: `${localKey}:union`,
      shapeKind: CheckerTypeShapeKind.Union,
      display: displayUnionType(shapes),
      members: this.commonMembersForUnion(shapes, `${localKey}:member`, sourceAddressHandle),
      indexedValueType: this.commonOrUnionNullableTypeReference(
        shapes.map((shape) => shape.indexedValueType),
        `${localKey}:indexed`,
        sourceAddressHandle,
      ),
      indexedAccessKeyKind: commonNullableIndexedAccessKeyKind(shapes),
      iteratedValueType: this.commonOrUnionNullableTypeReference(
        shapes.map((shape) => shape.iteratedValueType),
        `${localKey}:iterated`,
        sourceAddressHandle,
      ),
      origin: CheckerTypeProjectionOrigin.SyntheticExpressionType,
      sourceAddressHandle,
      callReturnType: this.commonOrUnionNullableTypeReference(
        shapes.map((shape) => shape.callReturnType),
        `${localKey}:call-return`,
        sourceAddressHandle,
      ),
      constructReturnType: this.commonOrUnionNullableTypeReference(
        shapes.map((shape) => shape.constructReturnType),
        `${localKey}:construct-return`,
        sourceAddressHandle,
      ),
    });
  }

  unknownTypeReference(
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference {
    return this.projector.ensureSyntheticProjection({
      localKey: `${localKey}:unknown`,
      shapeKind: CheckerTypeShapeKind.Unknown,
      display: 'unknown',
      members: [],
      origin: CheckerTypeProjectionOrigin.SyntheticExpressionType,
      sourceAddressHandle,
    }).toReference();
  }

  arrayType(
    elementType: CheckerTypeReference,
    lengthReference: CheckerTypeReference | null,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeShape {
    return this.projector.ensureSyntheticProjection({
      localKey: `${localKey}:array`,
      shapeKind: CheckerTypeShapeKind.Object,
      display: `Array<${elementType.display ?? 'unknown'}>`,
      members: [
        { name: 'length', valueType: lengthReference, memberKind: CheckerTypeMemberKind.Property },
      ],
      indexedValueType: elementType,
      indexedAccessKeyKind: CheckerIndexedAccessKeyKind.Number,
      iteratedValueType: elementType,
      origin: CheckerTypeProjectionOrigin.SyntheticExpressionType,
      sourceAddressHandle,
    });
  }

  templateStringsArrayType(
    elementType: CheckerTypeReference,
    lengthReference: CheckerTypeReference | null,
    rawArrayType: CheckerTypeReference,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeShape {
    return this.projector.ensureSyntheticProjection({
      localKey: `${localKey}:template-strings-array`,
      shapeKind: CheckerTypeShapeKind.Object,
      display: 'TemplateStringsArray',
      members: [
        { name: 'length', valueType: lengthReference, memberKind: CheckerTypeMemberKind.Property },
        { name: 'raw', valueType: rawArrayType, memberKind: CheckerTypeMemberKind.Property, isReadonly: true },
      ],
      indexedValueType: elementType,
      indexedAccessKeyKind: CheckerIndexedAccessKeyKind.Number,
      iteratedValueType: elementType,
      origin: CheckerTypeProjectionOrigin.SyntheticExpressionType,
      sourceAddressHandle,
    });
  }

  mapEntryType(
    keyReference: CheckerTypeReference,
    valueReference: CheckerTypeReference,
    lengthReference: CheckerTypeReference,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeShape {
    return this.tupleType(
      [
        { valueType: keyReference },
        { valueType: valueReference },
      ],
      lengthReference,
      localKey,
      sourceAddressHandle,
      CheckerTypeProjectionOrigin.SyntheticTemplateType,
    );
  }

  tupleType(
    elements: readonly CheckerTupleElementRequest[],
    lengthReference: CheckerTypeReference | null,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    origin: CheckerTypeProjectionOrigin = CheckerTypeProjectionOrigin.SyntheticExpressionType,
  ): CheckerTypeShape {
    const fixedElements = elements.filter((element) => !element.isRest);
    const indexedValueType = this.commonOrUnionNullableTypeReference(
      fixedElements.map((element) => element.valueType),
      `${localKey}:indexed`,
      sourceAddressHandle,
    );
    const members: CheckerSyntheticTypeMemberRequest[] = fixedElements.map((element, index) => ({
      name: String(index),
      valueType: element.valueType,
      memberKind: CheckerTypeMemberKind.Property,
    }));
    if (lengthReference != null) {
      members.push({ name: 'length', valueType: lengthReference, memberKind: CheckerTypeMemberKind.Property });
    }

    return this.projector.ensureSyntheticProjection({
      localKey: `${localKey}:tuple`,
      shapeKind: CheckerTypeShapeKind.Object,
      display: displayTupleType(elements),
      members,
      indexedValueType,
      indexedAccessKeyKind: indexedValueType == null ? null : CheckerIndexedAccessKeyKind.Number,
      iteratedValueType: indexedValueType,
      origin,
      sourceAddressHandle,
    });
  }

  private commonMembersForUnion(
    shapes: readonly CheckerTypeShape[],
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): readonly CheckerSyntheticTypeMemberRequest[] {
    const [first, ...rest] = shapes;
    if (first == null) {
      return [];
    }

    const members: CheckerSyntheticTypeMemberRequest[] = [];
    for (const member of first.members) {
      const matches = rest.map((shape) => shape.members.find((candidate) => candidate.name === member.name) ?? null);
      if (matches.some((candidate) => candidate == null)) {
        continue;
      }
      const allMembers = [member, ...(matches as CheckerTypeMember[])];
      const memberLocalKey = `${localKey}:${localKeyPart(member.name)}`;
      members.push({
        name: member.name,
        valueType: this.commonOrUnionNullableTypeReference(
          allMembers.map((candidate) => candidate.valueType),
          memberLocalKey,
          sourceAddressHandle,
        ),
        memberKind: allMembers.every((candidate) => candidate.memberKind === member.memberKind)
          ? member.memberKind
          : CheckerTypeMemberKind.Unknown,
        isOptional: allMembers.some((candidate) => candidate.isOptional),
        isReadonly: allMembers.every((candidate) => candidate.isReadonly),
        sourceAddressHandle: commonAddressHandle(allMembers.map((candidate) => candidate.sourceAddressHandle)),
      });
    }
    return members;
  }

  private commonOrUnionNullableTypeReference(
    references: readonly (CheckerTypeReference | null)[],
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    if (references.some((reference) => reference == null)) {
      return null;
    }
    return this.commonOrUnionTypeReference(
      references as readonly CheckerTypeReference[],
      references.length,
      localKey,
      sourceAddressHandle,
    );
  }

  private commonOrUnionTypeReference(
    references: readonly CheckerTypeReference[],
    expectedCount: number,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    const common = commonTypeReference(references, expectedCount);
    if (common != null) {
      return common;
    }
    const shapes = references
      .map((reference) => this.readTypeShape(reference))
      .filter((shape): shape is CheckerTypeShape => shape != null);
    return this.commonOrUnionTypeReferenceForShapes(shapes, expectedCount, localKey, sourceAddressHandle);
  }

  private commonOrUnionTypeReferenceForShapes(
    shapes: readonly CheckerTypeShape[],
    expectedCount: number,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    if (shapes.length !== expectedCount || shapes.length === 0) {
      return null;
    }
    const common = commonTypeReference(shapes.map((shape) => shape.toReference()), expectedCount);
    return common ?? this.unionType(shapes, localKey, sourceAddressHandle).toReference();
  }

  private readTypeShape(reference: CheckerTypeReference): CheckerTypeShape | null {
    return reference.productHandle == null
      ? null
      : this.projector.store.productDetails.read(TypeSystemProductDetails.TypeShape, reference.productHandle);
  }
}

export function commonTypeReference(
  references: readonly CheckerTypeReference[],
  expectedCount: number,
): CheckerTypeReference | null {
  if (references.length !== expectedCount || references.length === 0) {
    return null;
  }
  const first = references[0] ?? null;
  if (first == null) {
    return null;
  }
  return references.every((reference) => reference.checkerKey === first.checkerKey && reference.display === first.display)
    ? first
    : null;
}

function commonNullableIndexedAccessKeyKind(
  shapes: readonly CheckerTypeShape[],
): CheckerIndexedAccessKeyKind | null {
  const [first, ...rest] = shapes.map((shape) => shape.indexedAccessKeyKind);
  return first != null && rest.every((kind) => kind === first) ? first : null;
}

function commonAddressHandle(
  handles: readonly (AddressHandle | null)[],
): AddressHandle | null {
  const [first, ...rest] = handles;
  if (first == null) {
    return null;
  }
  return rest.every((handle) => handle === first)
    ? first
    : null;
}

function displayArrayLiteralType(
  elementType: CheckerTypeReference | null,
  elementCount: number,
): string {
  if (elementType != null) {
    return `Array<${elementType.display ?? elementType.checkerKey ?? 'unknown'}>`;
  }
  return elementCount === 0 ? 'Array<unknown>' : 'Array<mixed>';
}

function displayObjectLiteralType(members: readonly CheckerSyntheticTypeMemberRequest[]): string {
  if (members.length === 0) {
    return '{}';
  }
  return `{ ${members.map((member) => `${member.name}: ${member.valueType?.display ?? 'unknown'}`).join('; ')} }`;
}

function displayUnionType(shapes: readonly CheckerTypeShape[]): string {
  const displays = [...new Set(shapes.map((shape) => shape.display))];
  return displays.join(' | ');
}

function displayTupleType(elements: readonly CheckerTupleElementRequest[]): string {
  return `[${elements.map((element) => {
    const value = element.valueType.display ?? element.valueType.checkerKey ?? 'unknown';
    const label = element.name == null ? '' : `${element.name}: `;
    return element.isRest ? `...${label}${value}` : `${label}${value}`;
  }).join(', ')}]`;
}

function displayArrowFunctionType(
  expression: ArrowFunction,
  returnType: CheckerTypeReference | null,
): string {
  const parameters = expression.args.map((arg, index) => {
    const isRest = expression.rest && index === expression.args.length - 1;
    return `${isRest ? '...' : ''}${arg.name.name}: unknown`;
  }).join(', ');
  return `(${parameters}) => ${returnType?.display ?? 'unknown'}`;
}
