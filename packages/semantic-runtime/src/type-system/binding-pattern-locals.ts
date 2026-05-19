import ts from 'typescript';
import type {
  ArrayBindingPattern,
  BindingIdentifierOrPattern,
  BindingPattern,
  BindingPatternDefault,
  ObjectBindingPattern,
} from '../expression/ast.js';
import type { SourceSpan } from '../expression/source-span.js';
import type { AddressHandle } from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  checkerTypeReferenceWithSource,
  CheckerTypeShapeKind,
  type CheckerTypeReference,
  type CheckerTypeShape,
} from './type-shape.js';
import { checkerNullishType } from './checker-related-types.js';
import type { CheckerTypeShapeAccess } from './checker-type-shape-access.js';

export class CheckerBindingPatternLocalType {
  constructor(
    /** Runtime binding-context name introduced by the pattern. */
    readonly name: string,
    /** Type reached by the pattern path, when checker projection could close it. */
    readonly typeReference: CheckerTypeReference | null,
  ) {}
}

export const enum CheckerBindingPatternRuntimeIssueKind {
  DestructuringNonObject = 'destructuring-non-object',
  ArrayRestNonArray = 'array-rest-non-array',
}

export const enum CheckerBindingPatternRuntimeIssueCertainty {
  Definite = 'definite',
  Possible = 'possible',
}

export class CheckerBindingPatternRuntimeIssue {
  constructor(
    /** Runtime astAssign failure modeled from Aurelia's destructuring assignment path. */
    readonly issueKind: CheckerBindingPatternRuntimeIssueKind,
    /** Whether all known runtime values fail, or only some union constituents fail. */
    readonly certainty: CheckerBindingPatternRuntimeIssueCertainty,
    /** Pattern node whose source value is incompatible with framework destructuring semantics. */
    readonly patternKind: BindingPattern['$kind'],
    /** Type reached for the pattern source, if the checker projection could name it. */
    readonly sourceType: CheckerTypeReference | null,
    /** Parser-owned span for the problematic pattern node. */
    readonly patternSpan: SourceSpan | null,
    /** Compact framework-grounded explanation for diagnostics and inquiry rows. */
    readonly summary: string,
  ) {}
}

export class CheckerBindingPatternLocalProjection {
  constructor(
    /** Locals introduced by the pattern, even when issue rows are also present. */
    readonly locals: readonly CheckerBindingPatternLocalType[],
    /** Framework-runtime issue rows reached while projecting the same pattern. */
    readonly runtimeIssues: readonly CheckerBindingPatternRuntimeIssue[],
  ) {}
}

/**
 * Projects `repeat.for` binding-pattern declarations into named template locals.
 *
 * This follows the runtime destructuring path from the iterable element type to each declared local. Unknown rest
 * payloads stay explicit by yielding an untyped local instead of synthesizing a misleading rest object or array.
 */
export class CheckerBindingPatternLocalTypeProjector {
  constructor(
    readonly typeAccess: CheckerTypeShapeAccess,
  ) {}

  localTypesForBindingPattern(
    pattern: BindingIdentifierOrPattern,
    sourceType: CheckerTypeShape | null,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): readonly CheckerBindingPatternLocalType[] {
    return this.projectBindingPattern(pattern, sourceType, localKey, sourceAddressHandle).locals;
  }

  projectBindingPattern(
    pattern: BindingIdentifierOrPattern,
    sourceType: CheckerTypeShape | null,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerBindingPatternLocalProjection {
    return this.projectPattern(pattern, sourceType, localKey, sourceAddressHandle);
  }

  private projectPattern(
    pattern: BindingPattern,
    sourceType: CheckerTypeShape | null,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerBindingPatternLocalProjection {
    switch (pattern.$kind) {
      case 'BindingIdentifier':
        return new CheckerBindingPatternLocalProjection(
          [new CheckerBindingPatternLocalType(
            pattern.name.name,
            sourceType == null
              ? null
              : checkerTypeReferenceWithSource(
                  sourceType.toReference(),
                  sourceType.sourceAddressHandle ?? sourceAddressHandle,
                ),
          )],
          [],
        );
      case 'BindingPatternDefault':
        return this.projectDefaultPattern(pattern, sourceType, localKey, sourceAddressHandle);
      case 'BindingPatternHole':
        return new CheckerBindingPatternLocalProjection([], []);
      case 'ArrayBindingPattern':
        return this.projectArrayPattern(pattern, sourceType, localKey, sourceAddressHandle);
      case 'ObjectBindingPattern':
        return this.projectObjectPattern(pattern, sourceType, localKey, sourceAddressHandle);
    }
  }

  private projectDefaultPattern(
    pattern: BindingPatternDefault,
    sourceType: CheckerTypeShape | null,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerBindingPatternLocalProjection {
    return this.projectPattern(pattern.target, sourceType, `${localKey}:default`, sourceAddressHandle);
  }

  private projectArrayPattern(
    pattern: ArrayBindingPattern,
    sourceType: CheckerTypeShape | null,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerBindingPatternLocalProjection {
    const locals: CheckerBindingPatternLocalType[] = [];
    const runtimeIssues: CheckerBindingPatternRuntimeIssue[] = [
      ...destructuringSourceIssuesForPattern(pattern, sourceType),
    ];
    pattern.elements.forEach((element, index) => {
      const elementType = sourceType == null
        ? null
        : this.typeForArrayPatternElement(sourceType, index, `${localKey}:array:${index}`, sourceAddressHandle);
      const projection = this.projectPattern(element, elementType, `${localKey}:array:${index}`, sourceAddressHandle);
      locals.push(...projection.locals);
      runtimeIssues.push(...projection.runtimeIssues);
    });
    if (pattern.rest != null) {
      runtimeIssues.push(...arrayRestSourceIssues(pattern, sourceType));
      const projection = this.projectPattern(pattern.rest, null, `${localKey}:array:rest`, sourceAddressHandle);
      locals.push(...projection.locals);
      runtimeIssues.push(...projection.runtimeIssues);
    }
    return new CheckerBindingPatternLocalProjection(locals, runtimeIssues);
  }

  private typeForArrayPatternElement(
    sourceType: CheckerTypeShape,
    index: number,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeShape | null {
    return this.typeAccess.numericIndexValueType(sourceType, index, localKey, sourceAddressHandle);
  }

  private projectObjectPattern(
    pattern: ObjectBindingPattern,
    sourceType: CheckerTypeShape | null,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerBindingPatternLocalProjection {
    const locals: CheckerBindingPatternLocalType[] = [];
    const runtimeIssues: CheckerBindingPatternRuntimeIssue[] = [
      ...destructuringSourceIssuesForPattern(pattern, sourceType),
    ];
    pattern.properties.forEach((property, index) => {
      const propertyKey = String(property.key);
      const propertyLocalKey = `${localKey}:object:${localKeyPart(propertyKey)}:${index}`;
      const propertyType = sourceType == null
        ? null
        : this.typeForObjectPatternProperty(sourceType, propertyKey, propertyLocalKey);
      const projection = this.projectPattern(property.value, propertyType, propertyLocalKey, sourceAddressHandle);
      locals.push(...projection.locals);
      runtimeIssues.push(...projection.runtimeIssues);
    });
    if (pattern.rest != null) {
      const projection = this.projectPattern(pattern.rest, null, `${localKey}:object:rest`, sourceAddressHandle);
      locals.push(...projection.locals);
      runtimeIssues.push(...projection.runtimeIssues);
    }
    return new CheckerBindingPatternLocalProjection(locals, runtimeIssues);
  }

  private typeForObjectPatternProperty(
    sourceType: CheckerTypeShape,
    propertyName: string,
    localKey: string,
  ): CheckerTypeShape | null {
    return this.typeAccess.memberValueType(sourceType, propertyName, `${localKey}:member`);
  }
}

function destructuringSourceIssuesForPattern(
  pattern: ArrayBindingPattern | ObjectBindingPattern,
  sourceType: CheckerTypeShape | null,
): readonly CheckerBindingPatternRuntimeIssue[] {
  const certainty = nonObjectDestructuringCertainty(sourceType);
  if (certainty == null) {
    return [];
  }
  return [
    new CheckerBindingPatternRuntimeIssue(
      CheckerBindingPatternRuntimeIssueKind.DestructuringNonObject,
      certainty,
      pattern.$kind,
      sourceType?.toReference() ?? null,
      pattern.span,
      certainty === CheckerBindingPatternRuntimeIssueCertainty.Definite
        ? `Aurelia astAssign will reject ${sourceType?.display ?? 'this value'} as a destructuring source.`
        : `Aurelia astAssign can reject ${sourceType?.display ?? 'this value'} when a non-object constituent reaches this destructuring source.`,
    ),
  ];
}

function arrayRestSourceIssues(
  pattern: ArrayBindingPattern,
  sourceType: CheckerTypeShape | null,
): readonly CheckerBindingPatternRuntimeIssue[] {
  const certainty = nonArrayRestCertainty(sourceType);
  if (certainty == null) {
    return [];
  }
  return [
    new CheckerBindingPatternRuntimeIssue(
      CheckerBindingPatternRuntimeIssueKind.ArrayRestNonArray,
      certainty,
      pattern.$kind,
      sourceType?.toReference() ?? null,
      pattern.rest?.span ?? pattern.span,
      certainty === CheckerBindingPatternRuntimeIssueCertainty.Definite
        ? `Aurelia astAssign will reject ${sourceType?.display ?? 'this value'} for array rest destructuring because it is not an Array.`
        : `Aurelia astAssign can reject ${sourceType?.display ?? 'this value'} for array rest destructuring when a non-array constituent reaches the rest element.`,
    ),
  ];
}

function nonObjectDestructuringCertainty(
  sourceType: CheckerTypeShape | null,
): CheckerBindingPatternRuntimeIssueCertainty | null {
  return sourceType == null
    ? null
    : compatibilityCertainty(sourceType, isDestructuringObjectCompatibleType);
}

function nonArrayRestCertainty(
  sourceType: CheckerTypeShape | null,
): CheckerBindingPatternRuntimeIssueCertainty | null {
  return sourceType == null
    ? null
    : compatibilityCertainty(sourceType, isRuntimeArrayType);
}

function compatibilityCertainty(
  sourceType: CheckerTypeShape,
  isCompatible: (type: ts.Type, checker: ts.TypeChecker) => boolean,
): CheckerBindingPatternRuntimeIssueCertainty | null {
  const checker = sourceType.carrier?.checker ?? null;
  const carrierType = sourceType.carrier?.type ?? null;
  if (checker == null || carrierType == null) {
    return broadShapeCompatibilityCertainty(sourceType);
  }

  const parts = carrierType.isUnion() ? carrierType.types : [carrierType];
  let incompatible = 0;
  let compatible = 0;
  let open = 0;
  for (const part of parts) {
    if (checkerNullishType(checker, part) || isWeakCheckerType(part)) {
      open += 1;
      continue;
    }
    if (isCompatible(part, checker)) {
      compatible += 1;
      continue;
    }
    incompatible += 1;
  }

  if (incompatible === 0) {
    return null;
  }
  return compatible === 0 && open === 0
    ? CheckerBindingPatternRuntimeIssueCertainty.Definite
    : CheckerBindingPatternRuntimeIssueCertainty.Possible;
}

function broadShapeCompatibilityCertainty(
  sourceType: CheckerTypeShape,
): CheckerBindingPatternRuntimeIssueCertainty | null {
  switch (sourceType.shapeKind) {
    case CheckerTypeShapeKind.Primitive:
    case CheckerTypeShapeKind.Function:
      return CheckerBindingPatternRuntimeIssueCertainty.Definite;
    case CheckerTypeShapeKind.Union:
      return null;
    case CheckerTypeShapeKind.Any:
    case CheckerTypeShapeKind.Unknown:
    case CheckerTypeShapeKind.Never:
    case CheckerTypeShapeKind.TypeParameter:
    case CheckerTypeShapeKind.Unclassified:
      return null;
    case CheckerTypeShapeKind.Object:
    case CheckerTypeShapeKind.Class:
    case CheckerTypeShapeKind.Interface:
    case CheckerTypeShapeKind.Intersection:
      return null;
  }
}

function isWeakCheckerType(type: ts.Type): boolean {
  const flags = type.flags;
  return (flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.Never | ts.TypeFlags.TypeParameter)) !== 0;
}

function isDestructuringObjectCompatibleType(type: ts.Type, _checker: ts.TypeChecker): boolean {
  return (type.flags & ts.TypeFlags.Object) !== 0;
}

function isRuntimeArrayType(type: ts.Type, checker: ts.TypeChecker): boolean {
  return checker.isArrayType(type) || checker.isTupleType(type);
}
