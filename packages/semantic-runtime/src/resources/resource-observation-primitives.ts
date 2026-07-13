import ts from 'typescript';

/** Class, function, object, or expression that acts as the runtime resource target. */
export class ResourceTargetObservation {
  constructor(
    /** Best local name for the target, when one is visible without checker hydration. */
    readonly localName: string | null,
    /** Exact source node that names or references the target. */
    readonly node: ts.Node,
    /** Full declaration that owns the target, when recognition proved one. */
    readonly declarationNode: ts.Declaration | null,
  ) {}
}

/** One statically known public alias and its directly authored token, when ownership is provable. */
export class ResourceAliasObservation {
  constructor(
    readonly name: string,
    readonly node: ts.Node | null,
  ) {}
}

/** Resolve the class declaration/expression represented by a resource target node when one is statically visible. */
export function resourceTargetClassLikeNode(
  target: { readonly declarationNode: ts.Declaration | null } | null,
): ts.ClassLikeDeclarationBase | null {
  const declaration = target?.declarationNode ?? null;
  return declaration != null && (ts.isClassDeclaration(declaration) || ts.isClassExpression(declaration))
    ? declaration
    : null;
}

/** One concrete AttributePattern.create(...) entry. */
export class AttributePatternObservation {
  constructor(
    /** Pattern string consumed by Aurelia's attribute parser. */
    readonly pattern: string,
    /** Static symbol string supplied with the pattern. */
    readonly symbols: string,
    /** Source node that produced the pattern entry. */
    readonly node: ts.Node,
  ) {}
}
