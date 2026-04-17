import type {
  SnapshotFrontierEvidence,
  SnapshotProfileProvenance,
} from '../snapshots.js';

/**
 * Schema for the type-reference graph JSON produced by `pnpm typerefs`.
 *
 * ## What this captures
 *
 * Every interface, type alias, class, and enum declaration in the analyzed repo,
 * along with the project-defined types each one references. This builds a
 * "type contains type" graph: if `BindableDef` has a field `mode: Sourced<BindingMode>`,
 * the graph records edges from `BindableDef` to both `Sourced` and `BindingMode`.
 *
 * For each declaration:
 * - **Members**: field names, optionality, readonly markers, method signatures
 *   (interfaces, classes, type literal aliases, enums).
 * - **Alias bodies**: raw source text of the type alias body (`alias_body`),
 *   revealing generic wrapper structure, mapped types, conditional types, and
 *   discriminated unions. Truncated at ~800 chars.
 * - **Literal values**: for pure literal union type aliases, the enumerated
 *   string/number/boolean values (`literal_values`). E.g. `BindingMode` →
 *   `["default", "oneTime", "toView", "fromView", "twoWay"]`.
 * - **Enum values**: initializer text for enum members (`Member.value`).
 *
 * ## Relationship to the import graph
 *
 * The import graph (`pnpm deps`) shows file-to-file edges: which files import which.
 * The type-reference graph shows type-to-type edges: which types structurally depend
 * on which other types. A single import edge may carry N type references, or a type
 * reference may cross files without an explicit import (via re-exports, type inference).
 *
 * ## What it does NOT capture
 *
 * - Runtime value flow (function calls, variable assignments)
 * - Generic instantiation sites (where `Sourced<string>` is used, not just declared)
 * - Function/method body logic (field schemas visible, behavior invisible)
 * - Types from external packages (only project-internal references)
 * - Alias bodies longer than ~800 chars are truncated (indicated by trailing `…`)
 *
 * ## Query tool (`pnpm typerefs:query <command> [args]`)
 *
 *   stale                         Check if typerefs JSON needs regeneration
 *   summary                       High-level stats
 *   search <regex>                Search names, members, values, and alias bodies
 *   vocab [subsystem]             All literal union types with enumerated values
 *   type <name>                   Show a type's references and consumers
 *   who-refs <name>               All types that reference a given type
 *   refs-of <name>                All types referenced by a given type
 *   cone <name>                   Transitive "what breaks if this type changes"
 *   roots                         Types with no inbound references (root definers)
 *   leaves                        Types with no outbound references (terminal)
 *   hubs                          Types ranked by total reference count (in + out)
 *   cluster <name>                Connected component containing a type
 *   file <path>                   All types declared in a file
 *   cross-subsystem [scope]       Type references crossing subsystem boundaries
 *   members <name>                All members of a type with optionality
 *   path <from> <to>             Shortest type-reference path between types
 *   bridging <sub1> <sub2>       Types referencing both subsystems
 */

// ── Core types ──────────────────────────────────────────────────────────

/** How a type reference is used in the referencing declaration. */
export type RefKind =
  | "field"           // Field/property type: `foo: ReferencedType`
  | "extends"         // Interface/class extends: `extends Base`
  | "implements"      // Class implements: `implements IFoo`
  | "type-arg"        // Generic type argument: `Sourced<ReferencedType>`
  | "union-member"    // Union constituent: `A | B`
  | "intersection"    // Intersection constituent: `A & B`
  | "return"          // Method/function return type
  | "param"           // Method/function parameter type
  | "index-type"      // Index signature type: `[key: string]: ReferencedType`
  | "alias-body"      // Direct type alias body: `type Foo = ReferencedType`
  | "array-element"   // Array element: `ReferencedType[]`
  | "tuple-element"   // Tuple element: `[A, B]`
  | "mapped-value"    // Mapped type value: `{ [K in ...]: ReferencedType }`
  | "conditional"     // Conditional type branch: `T extends U ? A : B`
  | "constraint"      // Type parameter constraint: `<T extends Bound>`
  | "keyof-target"    // Keyof operand: `keyof ReferencedType`
  | "indexed-access"  // Indexed access: `ReferencedType[K]`
  | "typeof-target";  // Typeof operand: `typeof ReferencedValue`

/** A single type-to-type reference edge. */
export interface TypeRef {
  /** Name of the referenced type. */
  target: string;
  /** File where the referenced type is declared (repo-relative). */
  target_file: string;
  /** How the reference is used. */
  kind: RefKind;
  /** Field/property/parameter name, when applicable. */
  context?: string;
}

/** What kind of member this is within a type declaration. */
export type MemberKind =
  | "field"          // Property/field: `foo: string`
  | "method"         // Method signature/declaration: `bar(): void`
  | "getter"         // Get accessor: `get x(): T`
  | "setter"         // Set accessor: `set x(v: T)`
  | "index-sig"      // Index signature: `[key: string]: T`
  | "call-sig"       // Call signature: `(arg: T): R`
  | "construct-sig"  // Construct signature: `new (arg: T): R`
  | "enum-member";   // Enum member: `A = 0`

/** A member declared directly on a type (not inherited). */
export interface Member {
  /** Member name. "(index)" for index sigs, "(call)" for call sigs. */
  name: string;
  /** True if the member has a `?` token. */
  optional: boolean;
  /** True if the member has a `readonly` modifier. */
  readonly: boolean;
  /** What kind of member this is. */
  member_kind: MemberKind;
  /** Initializer value text for enum members. */
  value?: string;
}

/** What kind of TypeScript declaration this is. */
export type DeclKind = "interface" | "type" | "class" | "enum";

/** A type declaration and all project-internal types it references. */
export interface TypeDecl {
  /** The declared type name. */
  name: string;
  /** File where declared (repo-relative). */
  file: string;
  /** Declaration kind. */
  kind: DeclKind;
  /** Line number of the declaration (1-based). */
  line: number;
  /** True if the type is exported. */
  exported: boolean;
  /** Generic type parameters, if any (e.g. ["T", "TBrand"]). */
  type_params?: string[];
  /** Members declared directly on this type (fields, methods, etc). */
  members?: Member[];
  /**
   * Raw source text of a type alias body (type aliases only), truncated at ~800 chars.
   * For interfaces, classes, and enums this is absent — use `members` instead.
   * Reveals structure of generic wrappers (`T & { source: ... }`),
   * mapped types, conditional types, and literal unions.
   */
  alias_body?: string;
  /**
   * Enumerated literal values for pure literal union type aliases.
   * Only populated when EVERY union member is a string, number, boolean, or null literal.
   * E.g. `type GapReason = "missing" | "ambiguous"` → `["missing", "ambiguous"]`.
   */
  literal_values?: string[];
  /** Project-internal types referenced by this declaration. */
  refs: TypeRef[];
}

// ── Root output ─────────────────────────────────────────────────────────

export interface TypeRefsOutput {
  root: string;
  generated_at: string;
  source_commit: string;
  analyzer_commit: string;
  /** Profile and exclusion regime used to derive this snapshot. */
  profile: SnapshotProfileProvenance;
  /** Explicit frontier evidence named during snapshot generation. */
  frontiers: SnapshotFrontierEvidence;
  summary: {
    files_analyzed: number;
    type_declarations: number;
    type_references: number;
    /** Types with no inbound references. */
    root_types: number;
    /** Types with no outbound references. */
    leaf_types: number;
  };
  declarations: TypeDecl[];
}
