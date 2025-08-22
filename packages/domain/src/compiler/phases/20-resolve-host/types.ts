// Linked forms produced by the Resolve‑Host phase (IR → LinkedSemantics).
// - Pure data views over IR + registry (no mutation of IR).
// - Nested templates inside controllers remain as raw IR (TemplateIR); the Bind phase
//   walks into those using the surrounding linked context.

import type {
  NodeId,
  SourceSpan,
  TemplateIR,
  TemplateNode,
  BindingMode,
  BindingSourceIR,
  ExprRef,
  ForOfIR,
  LetBindingIR,
  JsonValue,
} from "../../model/ir.js";

import type {
  ElementRes,
  DomElement,
  DomProp,
  RepeatController,
  SimpleController,
  PromiseController,
  SwitchController,
  PortalController,
  Bindable,
  TypeRef,
  IteratorTailPropSpec,
} from "../../language/registry.js";

/* ===========================
 * Diagnostics (Resolve‑Host)
 * =========================== */

/** AU11xx = Semantics/host-linker diagnostics. */
export type SemDiagCode =
  | "AU1101" // Unknown controller
  | "AU1102" // Unknown element/attribute resource (reserved; currently unused)
  | "AU1103" // Unknown event
  | "AU1104" // Property target not found on host
  | "AU1105" // Repeat missing iterator binding (reserved)
  | "AU1106"; // Repeat tail option not recognized/wrong syntax

export interface SemDiagnostic {
  code: SemDiagCode;
  message: string;
  span?: SourceSpan | null;
}

/* ===========================
 * Linked module / template / row
 * =========================== */

export interface LinkedSemanticsModule {
  version: "aurelia-linked@1";
  templates: LinkedTemplate[];
  /** Passthrough for Analysis tooling; opaque to this phase. */
  exprTable?: unknown;
  diags: SemDiagnostic[];
}

export interface LinkedTemplate {
  dom: TemplateNode;
  rows: LinkedRow[];
  name?: string;
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
  | LinkedSetAttribute
  | LinkedSetProperty
  | LinkedSetClassAttribute
  | LinkedSetStyleAttribute
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

/**
 * Hydrate a <let> element.
 * - Transparent at host‑semantics level; the Bind phase consumes the inner let bindings directly.
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

/** `repeat` tail option item. Unknown options keep `spec` undefined and trigger AU1106. */
export interface LinkedAuxProp {
  name: string;                // option name, e.g., 'key'
  from: BindingSourceIR;
  spec?: IteratorTailPropSpec; // linked spec when recognized
}

/**
 * Linked template controller.
 * - `def` stays as raw TemplateIR; Bind walks into it with the surrounding linked context.
 * - `props` contains either a value binding (with/if/promise/switch/portal) or the iterator binding (repeat).
 * - `branch` carries branch shape for promise/switch when applicable.
 * - `containerless` mirrors IR (useful for emit).
 */
export interface LinkedHydrateTemplateController extends BaseLinked {
  kind: "hydrateTemplateController";
  res: "repeat" | "with" | "promise" | "if" | "switch" | "portal";
  def: TemplateIR;
  controller: ControllerSem;
  props: (LinkedPropertyBinding | LinkedIteratorBinding)[];
  containerless?: boolean;
  branch?: ControllerBranch | null;
}

export type ControllerBranch =
  | { kind: "then";    local: string | null }
  | { kind: "catch";   local: string | null }
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
  | { kind: "element.nativeProp"; element: DomElementRef; prop: DomProp }
  | { kind: "controller.prop"; controller: ControllerSem; bindable: Bindable }
  | { kind: "attribute"; attr: string }
  | { kind: "unknown"; reason: "no-element" | "no-prop" | "no-bindable" };

/* ===========================
 * Controller resolution
 * =========================== */

export type ControllerSem =
  | { res: "repeat";  spec: RepeatController }
  | { res: "with";    spec: SimpleController<"with"> }
  | { res: "promise"; spec: PromiseController }
  | { res: "if";      spec: SimpleController<"if"> }
  | { res: "switch";  spec: SwitchController }
  | { res: "portal";  spec: PortalController };
