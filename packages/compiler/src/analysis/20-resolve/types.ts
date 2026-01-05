// Linked forms produced by the Resolve‑Host phase (IR → LinkedSemantics).
// - Pure data views over IR + registry (no mutation of IR).
// - Nested templates inside controllers remain as raw IR (TemplateIR); the Bind phase
//   walks into those using the surrounding linked context.

import type {
  NodeId,
  SourceSpan,
  TemplateIR,
  TemplateNode,
  TemplateMetaIR,
  BindingMode,
  BindingSourceIR,
  ExprRef,
  ForOfIR,
  LetBindingIR,
  JsonValue,
  ExprTableEntry,
} from "../../model/ir.js";

import type {
  ElementRes,
  AttrRes,
  DomElement,
  DomProp,
  Bindable,
  TypeRef,
  ControllerConfig,
} from "../../language/registry.js";
import type { CompilerDiagnostic } from "../../shared/diagnostics.js";

/* ===========================
 * Diagnostics (Resolve-Host)
 * =========================== */

/**
 * Resolve-host diagnostic codes.
 *
 * Code ranges:
 * - AU01xx: Expression-level resource errors (matches runtime AUR01xx)
 * - AU08xx: Template structure errors (matches runtime AUR08xx)
 * - AU11xx: Host semantics / linker errors (compiler-specific)
 *
 * See docs/errors.md for the full runtime error inventory.
 */
export type SemDiagCode =
  // ─── Expression Resource Errors (AU01xx) ───────────────────────────────────
  // These match runtime error codes for consistency.
  | "AU0101" // Binding behavior not found
  | "AU0102" // Duplicate binding behavior (same behavior applied twice in expression)
  | "AU0103" // Value converter not found
  | "AU0106" // Assignment to $host is not allowed

  // ─── Binding Behavior Usage Errors (AU99xx) ───────────────────────────────
  | "AU9996" // Conflicting rate-limit behaviors (throttle + debounce on same binding)

  // ─── Template Structure Errors (AU08xx) ────────────────────────────────────
  // Branch validation: sibling and parent relationships
  | "AU0810" // [else] without preceding [if]
  | "AU0813" // [then]/[catch]/[pending] without parent [promise]
  | "AU0815" // [case]/[default-case] without parent [switch]
  | "AU0816" // Multiple [default-case] in same switch

  // ─── Host Semantics Errors (AU11xx) ────────────────────────────────────────
  | "AU1101" // Unknown controller
  | "AU1102" // Unknown custom element (root cause for cascade suppression)
  | "AU1103" // Unknown event
  | "AU1104" // Property target not found on host
  | "AU1105" // Repeat missing iterator binding (reserved)
  | "AU1106"; // Repeat tail option not recognized/wrong syntax

export type SemDiagnostic = CompilerDiagnostic<SemDiagCode>;

/* ===========================
 * Linked module / template / row
 * =========================== */

export interface LinkedSemanticsModule {
  version: "aurelia-linked@1";
  templates: LinkedTemplate[];
  exprTable?: ExprTableEntry[];
  diags: SemDiagnostic[];
}

export interface LinkedTemplate {
  dom: TemplateNode;
  rows: LinkedRow[];
  name?: string;
  /**
   * Extracted meta elements (<import>, <bindable>, etc.).
   * Only present on root templates (not nested TC templates).
   * Carried through from TemplateIR for AOT emission.
   */
  templateMeta?: TemplateMetaIR;
}

export interface LinkedRow {
  target: NodeId;
  node: NodeSem;
  instructions: LinkedInstruction[];
}

/* ===========================
 * Node resolution
 * =========================== */

export type NodeSem =
  | { kind: "element"; tag: string; custom?: ElementResRef | null; native?: DomElementRef | null }
  | { kind: "template" | "text" | "comment" };

export interface ElementResRef { def: ElementRes }
export interface DomElementRef   { def: DomElement }
export interface AttrResRef      { def: AttrRes }

/* ===========================
 * Instruction linking
 * =========================== */

export type LinkedInstruction =
  | LinkedPropertyBinding
  | LinkedAttributeBinding
  | LinkedStylePropertyBinding
  | LinkedListenerBinding
  | LinkedRefBinding
  | LinkedTextBinding
  | LinkedTranslationBinding
  | LinkedSetAttribute
  | LinkedSetProperty
  | LinkedSetClassAttribute
  | LinkedSetStyleAttribute
  | LinkedHydrateElement
  | LinkedHydrateAttribute
  | LinkedHydrateTemplateController
  | LinkedHydrateLetElement
  | LinkedIteratorBinding;

export interface BaseLinked {
  loc?: SourceSpan | null;
}

/** Property binding to a concrete target (custom bindable / native prop / controller prop / unknown). */
export interface LinkedPropertyBinding extends BaseLinked {
  kind: "propertyBinding";
  /** Normalized property name (camelCase; already normalized by the linker). */
  to: string;
  from: BindingSourceIR;
  /** Authored binding mode (may be 'default'). */
  mode: BindingMode;
  /** Effective mode after resolution (two‑way defaults etc.). */
  effectiveMode: BindingMode;
  target: TargetSem;
}

/**
 * Attribute interpolation binding.
 * - `attr` is the raw authored attribute name.
 * - `to` is the normalized property name *or* preserved attribute key (for `data-*`/`aria-*`).
 * - `target` is `attribute` for preserved attributes; otherwise the resolved prop target.
 */
export interface LinkedAttributeBinding extends BaseLinked {
  kind: "attributeBinding";
  attr: string;
  to: string;
  from: BindingSourceIR;
  target: TargetSem; // may be 'attribute'
}

/** style.prop bindings target the style object on the element. */
export interface LinkedStylePropertyBinding extends BaseLinked {
  kind: "stylePropertyBinding";
  to: string; // CSS property name
  from: BindingSourceIR;
  target: { kind: "style" };
}

/** Event listener binding (e.g., `click.trigger="..."`). */
export interface LinkedListenerBinding extends BaseLinked {
  kind: "listenerBinding";
  to: string;         // event name
  from: ExprRef;      // handler expression
  eventType: TypeRef; // resolved from Semantics.events
  capture?: boolean;
  modifier?: string | null;
}

/** ref="vmOrElementRef" — refined types are Analysis concerns. */
export interface LinkedRefBinding extends BaseLinked {
  kind: "refBinding";
  to: string;
  from: ExprRef;
}

/** Text interpolation binding on a text node. */
export interface LinkedTextBinding extends BaseLinked {
  kind: "textBinding";
  from: BindingSourceIR;
}

/**
 * Translation binding from i18n `t` attribute.
 * Produced by the `t` and `t.bind` binding commands from @aurelia/i18n.
 *
 * When `isExpression: true` (t.bind), `from` contains the parsed expression.
 * When `isExpression: false` (t), `keyValue` contains the literal translation key.
 */
export interface LinkedTranslationBinding extends BaseLinked {
  kind: "translationBinding";
  /** Target attribute/property to set with translated value (empty string = textContent) */
  to: string;
  /** Expression source (only when isExpression: true) */
  from?: BindingSourceIR;
  /** Literal translation key (only when isExpression: false) */
  keyValue?: string;
  /** Whether value is expression (t.bind) vs literal key (t) */
  isExpression: boolean;
}

/** Raw (literal) attribute set; no semantics resolution. */
export interface LinkedSetAttribute extends BaseLinked {
  kind: "setAttribute";
  to: string;
  value: string | null;
}

/** Raw (literal) property set; target is still resolved for consistency. */
export interface LinkedSetProperty extends BaseLinked {
  kind: "setProperty";
  to: string;
  value: JsonValue;
  target: TargetSem;
}

export interface LinkedSetClassAttribute extends BaseLinked {
  kind: "setClassAttribute";
  value: string;
}

export interface LinkedSetStyleAttribute extends BaseLinked {
  kind: "setStyleAttribute";
  value: string;
}

export interface LinkedHydrateElement extends BaseLinked {
  kind: "hydrateElement";
  res: ElementResRef | null;
  props: LinkedElementBindable[];
  projections?: { slot?: string | null; def: TemplateIR }[] | null;
  containerless?: boolean;
}

export interface LinkedHydrateAttribute extends BaseLinked {
  kind: "hydrateAttribute";
  res: AttrResRef | null;
  alias: string | null;
  props: LinkedElementBindable[];
}

export type LinkedElementBindable =
  | LinkedPropertyBinding
  | LinkedAttributeBinding
  | LinkedStylePropertyBinding
  | LinkedSetProperty;

/**
 * Hydrate a <let> element.
 * - Transparent at host-semantics level; the Bind phase consumes the inner let bindings directly.
 */
export interface LinkedHydrateLetElement extends BaseLinked {
  kind: "hydrateLetElement";
  instructions: LetBindingIR[];
  toBindingContext: boolean;
}

/** Iterator header for `repeat`. Tail options are surfaced in `aux`. */
export interface LinkedIteratorBinding extends BaseLinked {
  kind: "iteratorBinding";
  /** Canonical iterator prop name from Semantics (usually `'items'`). */
  to: string;
  forOf: ForOfIR;
  /** Tail options like `key` (`key: expr` or `key.bind="expr"`). */
  aux: LinkedAuxProp[];
}

export interface LinkedAuxProp {
  name: string;                // option name, e.g., 'key'
  from: BindingSourceIR;
  /** Matched semantics spec (null when unknown). */
  spec: IteratorAuxSpec | null;
}

/** Normalized iterator tail spec with optional mode override. */
export interface IteratorAuxSpec {
  name: string;
  /** Optional mode override for .bind vs literal usage. */
  mode: BindingMode | null;
  /** Optional type hint for downstream analysis. */
  type?: TypeRef | null;
}

/**
 * Linked template controller.
 * - `def` stays as raw TemplateIR; Bind walks into it with the surrounding linked context.
 * - `props` contains either a value binding (with/if/promise/switch/portal) or the iterator binding (repeat).
 * - `branch` carries branch shape for promise/switch when applicable.
 * - `containerless` mirrors IR (useful for emit).
 */
/**
 * Linked bindable types for template controller props.
 * Matches IR ControllerBindableIR after resolution.
 */
export type LinkedControllerBindable =
  | LinkedPropertyBinding
  | LinkedIteratorBinding
  | LinkedSetProperty
  | LinkedAttributeBinding;

export interface LinkedHydrateTemplateController extends BaseLinked {
  kind: "hydrateTemplateController";
  /** Controller name (built-in like "repeat", "if", or custom TC name). */
  res: string;
  def: TemplateIR;
  controller: ControllerSem;
  props: LinkedControllerBindable[];
  containerless?: boolean;
  branch?: ControllerBranch | null;
}

export type ControllerBranch =
  | { kind: "then";    local: string | null }
  | { kind: "catch";   local: string | null }
  | { kind: "pending" }                      // promise pending (no alias - shown while awaiting)
  | { kind: "case";    expr: ExprRef }       // expression on the <template case>
  | { kind: "default" };

/* ===========================
 * Target resolution
 * =========================== */

/**
 * Where a binding lands.
 * - `element.bindable`    → custom element bindable (component prop).
 * - `element.nativeProp`  → native DOM property (from Semantics.dom).
 * - `controller.prop`     → controller value (e.g., `{ value }` on with/if/promise/switch/portal).
 * - `attribute`           → attribute‑only target (e.g., `data-*`, `aria-*`); do not map to a prop.
 * - `unknown`             → unresolved (kept to avoid dropping info; diagnostics carry AU1104).
 */
export type TargetSem =
  | { kind: "element.bindable"; element: ElementResRef; bindable: Bindable }
  | { kind: "attribute.bindable"; attribute: AttrResRef; bindable: Bindable }
  | { kind: "element.nativeProp"; element: DomElementRef; prop: DomProp }
  | { kind: "controller.prop"; controller: ControllerSem; bindable: Bindable }
  | { kind: "attribute"; attr: string }
  | { kind: "unknown"; reason: "no-element" | "no-prop" | "no-bindable" };

/* ===========================
 * Controller resolution
 * =========================== */

/**
 * Resolved controller semantics.
 *
 * Uses the unified ControllerConfig for all controllers (built-in and custom).
 * The config provides:
 * - trigger: what causes rendering (value, iterator, branch, marker)
 * - scope: how scope behaves (reuse, overlay)
 * - props: bindable properties
 * - injects: scope-injected variables (contextuals, alias)
 * - branches: valid child/sibling controllers
 * - linksTo: parent controller for branch controllers
 *
 * When a controller is unknown, the config will be a stub (check with isStub()).
 */
export interface ControllerSem {
  /** Controller name (e.g., "repeat", "if", or custom TC name). */
  res: string;
  /** Unified configuration defining controller behavior. */
  config: ControllerConfig;
}
