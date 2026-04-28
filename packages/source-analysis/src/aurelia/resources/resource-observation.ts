import type ts from 'typescript';
import type { ResourceDefinitionHeader } from './resource-definition.js';

export const enum ResourceCarrierKind {
  /** Class decorator such as @customElement(...) or @valueConverter(...). */
  Decorator = 'decorator',
  /** Static class-side `$au` definition metadata. */
  StaticAu = 'static-$au',
  /** Imperative definition call such as CustomElement.define(...). */
  DefineCall = 'define-call',
  /** Syntax-resource factory call such as AttributePattern.create(...). */
  AttributePatternCreate = 'attribute-pattern-create',
  /** Name derived from a conventions layer known to be active. */
  Convention = 'convention',
}

export const enum ResourceOpenKind {
  /** The carrier looked like a resource but the resource kind did not close. */
  Kind = 'open-kind-expression',
  /** The carrier looked like a resource but the resource name did not close. */
  Name = 'open-name-expression',
  /** The carrier may contain aliases that did not close. */
  Alias = 'open-alias-expression',
  /** The carrier did not expose a class/function/object target that could be named. */
  Target = 'open-target-expression',
  /** An AttributePattern.create(...) carrier had patterns that did not all close. */
  Pattern = 'open-pattern-expression',
}

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

/** Explicit unresolved pressure from a resource carrier. */
export class ResourceRecognitionOpen {
  constructor(
    /** Machine-readable open resource-recognition category. */
    readonly openKind: ResourceOpenKind,
    /** Short explanation suitable for IDE/MCP projections. */
    readonly summary: string,
    /** Source node where the unresolved pressure appeared. */
    readonly node: ts.Node,
  ) {}
}

/** Resource carrier observed before definition materialization or scope admission. */
export class ResourceRecognitionObservation {
  constructor(
    /** Source carrier lane that produced this observation. */
    readonly carrierKind: ResourceCarrierKind,
    /** Full carrier node, used for the primary evidence span. */
    readonly sourceNode: ts.Node,
    /** Definition expression when the carrier has one separate from the call/decorator. */
    readonly definitionNode: ts.Node | null,
    /** Definition header, or null when the carrier stayed kind-open. */
    readonly definition: ResourceDefinitionHeader | null,
    /** Unresolved points that must stay visible to later consumers. */
    readonly openSeams: readonly ResourceRecognitionOpen[] = [],
  ) {}
}
