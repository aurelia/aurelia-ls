import type ts from 'typescript';

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
