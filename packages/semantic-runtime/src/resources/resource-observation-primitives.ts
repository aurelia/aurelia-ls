import ts from 'typescript';

/** Class, function, object, or expression that acts as the runtime resource target. */
export class ResourceTargetObservation {
  constructor(
    /** Best local name for the target, when one is visible without checker hydration. */
    readonly localName: string | null,
    /** Source node that names or declares the target. */
    readonly node: ts.Node,
    /** Whether the node is an actual declaration/name site rather than a reference expression. */
    readonly isDeclaration: boolean,
  ) {}
}

/** Resolve the class declaration/expression represented by a resource target node when one is statically visible. */
export function resourceTargetClassLikeNode(
  target: { readonly node: ts.Node } | null,
): ts.ClassLikeDeclarationBase | null {
  if (target == null) {
    return null;
  }
  if (ts.isClassDeclaration(target.node) || ts.isClassExpression(target.node)) {
    return target.node;
  }
  const parent = target.node.parent;
  return ts.isClassDeclaration(parent) || ts.isClassExpression(parent) ? parent : null;
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
