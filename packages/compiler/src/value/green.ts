/**
 * Green Value Types — Structural Content, No Spans
 *
 * The green layer of the value representation (L1 value-representation §S1).
 * Isomorphic to Roslyn green syntax nodes: immutable, position-independent,
 * internable via hash-consing. Cutoff comparison is pointer equality on
 * interned green values.
 *
 * Invariant: NO type in this file carries TextSpan, SourceSpan, GapLocation,
 * or any positional/provenance data. This is enforced by the type hierarchy,
 * not by convention. A generic deep-hash of any GreenValue is always correct.
 *
 * The discriminated union mirrors AnalyzableValue (12 variants) with all
 * span fields removed.
 */

import type { NormalizedPath } from '../model/identity.js';

// =============================================================================
// GreenValue — the internable structural core
// =============================================================================

export type GreenValue =
  | GreenLiteral
  | GreenArray
  | GreenObject
  | GreenFunction
  | GreenClass
  | GreenReference
  | GreenImport
  | GreenPropertyAccess
  | GreenCall
  | GreenSpread
  | GreenNew
  | GreenUnknown;

// =============================================================================
// Leaf Values
// =============================================================================

export interface GreenLiteral {
  readonly kind: 'literal';
  readonly value: string | number | boolean | null | undefined;
}

export interface GreenArray {
  readonly kind: 'array';
  readonly elements: readonly GreenValue[];
}

export interface GreenObject {
  readonly kind: 'object';
  readonly properties: ReadonlyMap<string, GreenValue>;
  readonly methods: ReadonlyMap<string, GreenMethod>;
}

export interface GreenFunction {
  readonly kind: 'function';
  readonly name: string | null;
  readonly params: readonly GreenParameter[];
  readonly body: readonly GreenStatement[];
}

export interface GreenClass {
  readonly kind: 'class';
  readonly className: string;
  readonly filePath: NormalizedPath;
  readonly decorators: readonly GreenDecorator[];
  readonly staticMembers: ReadonlyMap<string, GreenValue>;
  readonly bindableMembers: readonly GreenBindable[];
  readonly gapKinds: readonly string[];
}

// =============================================================================
// Reference Values
// =============================================================================

export interface GreenReference {
  readonly kind: 'reference';
  readonly name: string;
  readonly resolved?: GreenValue;
}

export interface GreenImport {
  readonly kind: 'import';
  readonly specifier: string;
  readonly exportName: string;
  readonly resolvedPath?: NormalizedPath;
  readonly resolved?: GreenValue;
}

export interface GreenPropertyAccess {
  readonly kind: 'propertyAccess';
  readonly base: GreenValue;
  readonly property: string;
}

// =============================================================================
// Compound Values
// =============================================================================

export interface GreenCall {
  readonly kind: 'call';
  readonly callee: GreenValue;
  readonly args: readonly GreenValue[];
  readonly returnValue?: GreenValue;
}

export interface GreenSpread {
  readonly kind: 'spread';
  readonly target: GreenValue;
  readonly expanded?: readonly GreenValue[];
}

export interface GreenNew {
  readonly kind: 'new';
  readonly callee: GreenValue;
  readonly args: readonly GreenValue[];
}

// =============================================================================
// Analysis Boundary
// =============================================================================

/**
 * Green unknown — analysis stopped here.
 *
 * Carries the gap reason's kind discriminant as structural content.
 * The full gap (location, suggestion text, diagnostic info) is red-layer
 * and lives on the annotated/sourced wrappers.
 *
 * The gap system is provisional and subject to overhaul with the claim model.
 */
export interface GreenUnknown {
  readonly kind: 'unknown';
  readonly reasonKind: string;
}

// =============================================================================
// Green Sub-Types (used within GreenValue variants)
// =============================================================================

export interface GreenMethod {
  readonly kind: 'method';
  readonly name: string;
  readonly params: readonly GreenParameter[];
  readonly body: readonly GreenStatement[];
}

export interface GreenParameter {
  readonly name: string;
  readonly defaultValue?: GreenValue;
  readonly isRest?: boolean;
}

export interface GreenDecorator {
  readonly name: string;
  readonly args: readonly GreenValue[];
}

export interface GreenBindable {
  readonly name: string;
  readonly args: readonly GreenValue[];
  readonly type?: string;
}

export interface GreenVariableDecl {
  readonly name: string;
  readonly init: GreenValue | null;
}

// =============================================================================
// GreenStatement — statement-level green types
// =============================================================================

export type GreenStatement =
  | GreenReturn
  | GreenExpressionStmt
  | GreenVariableStmt
  | GreenIfStmt
  | GreenForOfStmt
  | GreenUnknownStmt;

export interface GreenReturn {
  readonly kind: 'return';
  readonly value: GreenValue | null;
}

export interface GreenExpressionStmt {
  readonly kind: 'expression';
  readonly value: GreenValue;
}

export interface GreenVariableStmt {
  readonly kind: 'variable';
  readonly declarations: readonly GreenVariableDecl[];
}

export interface GreenIfStmt {
  readonly kind: 'if';
  readonly condition: GreenValue;
  readonly thenBranch: readonly GreenStatement[];
  readonly elseBranch?: readonly GreenStatement[];
}

export interface GreenForOfStmt {
  readonly kind: 'forOf';
  readonly variable: string;
  readonly iterable: GreenValue;
  readonly body: readonly GreenStatement[];
}

export interface GreenUnknownStmt {
  readonly kind: 'unknownStatement';
  readonly reasonKind: string;
}
