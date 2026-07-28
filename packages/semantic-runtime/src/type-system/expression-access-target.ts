import type {
  AddressHandle,
  HotDetailHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type {
  IsAssign,
} from '../expression/ast.js';
import {
  CheckerTypeShapeAccess,
  CheckerTypeShapeMemberValueAccessKind,
  type CheckerTypeShapeMemberValueAccess,
} from './checker-type-shape-access.js';
import {
  checkerTypeMemberSourceAddressHandle,
} from './checker-type-member-source.js';
import type {
  CheckerTypeShape,
} from './type-shape.js';
import {
  CheckerTypeMemberKind,
  CheckerTypeShapeKind,
  checkerTypeMemberReachableIdentityHandle,
} from './type-shape.js';

/** Closure of one expression access against the active Scope and TypeChecker world. */
export const enum CheckerExpressionAccessTargetResolutionKind {
  /** One declaration, scope slot, or context target is proven. */
  Exact = 'exact',
  /** A finite dynamic key closes to several proven targets. */
  Finite = 'finite',
  /** A governing index signature is proven without one runtime property identity. */
  IndexSignature = 'index-signature',
  /** The closed owner proves the requested target does not exist. */
  Missing = 'missing',
  /** Available scope/type facts cannot close the target. */
  Open = 'open',
}

/** One declaration, scope slot, context, or governing type reached by expression access. */
export class CheckerExpressionAccessTarget {
  constructor(
    readonly authorityProductHandle: ProductHandle | null,
    readonly targetIdentityHandle: IdentityHandle | null,
    readonly targetTypeMemberHandle: HotDetailHandle | null,
    readonly targetTypeSourceMemberHandle: HotDetailHandle | null,
    readonly declarationSourceAddressHandle: AddressHandle | null,
  ) {}
}

/** Scope/type-system answer for one authored access occurrence. */
export class CheckerExpressionAccessTargetResolution {
  constructor(
    readonly kind: CheckerExpressionAccessTargetResolutionKind,
    readonly targets: readonly CheckerExpressionAccessTarget[],
  ) {}

  static exact(target: CheckerExpressionAccessTarget): CheckerExpressionAccessTargetResolution {
    return new CheckerExpressionAccessTargetResolution(
      CheckerExpressionAccessTargetResolutionKind.Exact,
      [target],
    );
  }

  static finite(targets: readonly CheckerExpressionAccessTarget[]): CheckerExpressionAccessTargetResolution {
    return new CheckerExpressionAccessTargetResolution(
      CheckerExpressionAccessTargetResolutionKind.Finite,
      targets,
    );
  }

  static indexed(target: CheckerExpressionAccessTarget): CheckerExpressionAccessTargetResolution {
    return new CheckerExpressionAccessTargetResolution(
      CheckerExpressionAccessTargetResolutionKind.IndexSignature,
      [target],
    );
  }

  static missing(): CheckerExpressionAccessTargetResolution {
    return new CheckerExpressionAccessTargetResolution(
      CheckerExpressionAccessTargetResolutionKind.Missing,
      [],
    );
  }

  static open(): CheckerExpressionAccessTargetResolution {
    return new CheckerExpressionAccessTargetResolution(
      CheckerExpressionAccessTargetResolutionKind.Open,
      [],
    );
  }
}

/** Convert one shared member-value result into exact/missing/index/open target authority. */
export function checkerExpressionAccessTargetResolutionForMemberAccess(
  access: CheckerTypeShapeAccess,
  ownerType: CheckerTypeShape,
  memberAccess: CheckerTypeShapeMemberValueAccess,
): CheckerExpressionAccessTargetResolution {
  if (memberAccess.member != null) {
    return CheckerExpressionAccessTargetResolution.exact(new CheckerExpressionAccessTarget(
      memberAccess.member.ownerType.productHandle,
      checkerTypeMemberReachableIdentityHandle(memberAccess.member),
      memberAccess.member.detailHandle,
      memberAccess.member.detailHandle,
      checkerTypeMemberSourceAddressHandle(access.projector.publication, memberAccess.member),
    ));
  }
  if (memberAccess.accessKind === CheckerTypeShapeMemberValueAccessKind.Missing) {
    return checkerTypeShapeCanProveMissingMember(ownerType)
      ? CheckerExpressionAccessTargetResolution.missing()
      : CheckerExpressionAccessTargetResolution.open();
  }
  if (memberAccess.memberKind === CheckerTypeMemberKind.IndexSignature) {
    return CheckerExpressionAccessTargetResolution.indexed(new CheckerExpressionAccessTarget(
      ownerType.productHandle,
      ownerType.identityHandle,
      null,
      null,
      ownerType.declarationSourceAddressHandle ?? ownerType.sourceAddressHandle,
    ));
  }
  return CheckerExpressionAccessTargetResolution.open();
}

function checkerTypeShapeCanProveMissingMember(ownerType: CheckerTypeShape): boolean {
  switch (ownerType.shapeKind) {
    case CheckerTypeShapeKind.Any:
    case CheckerTypeShapeKind.Unknown:
    case CheckerTypeShapeKind.TypeParameter:
    case CheckerTypeShapeKind.Unclassified:
      return false;
    case CheckerTypeShapeKind.Never:
    case CheckerTypeShapeKind.Primitive:
    case CheckerTypeShapeKind.Object:
    case CheckerTypeShapeKind.Class:
    case CheckerTypeShapeKind.Interface:
    case CheckerTypeShapeKind.Function:
    case CheckerTypeShapeKind.Union:
    case CheckerTypeShapeKind.Intersection:
      return true;
  }
}

export function literalPropertyKeyForExpression(expression: IsAssign): string | null {
  if (expression.$kind !== 'PrimitiveLiteral') {
    return null;
  }
  if (typeof expression.value === 'string' || typeof expression.value === 'number') {
    return String(expression.value);
  }
  return null;
}
