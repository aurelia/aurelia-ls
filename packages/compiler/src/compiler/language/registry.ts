import type { BindingMode } from "../model/ir.js";
import type { ResourceCollections, ResourceGraph, ResourceScopeId, ScopedResources } from "./resource-graph.js";
import { materializeResourcesForScope } from "./resource-graph.js";

/** Schema version for Semantics. Keep stable across linker/analysis. */
export type SemVersion = "aurelia-semantics@1";

export interface Semantics {
  version: SemVersion;
  /**
   * Optional scoped resource graph to allow per-scope resolution of resources.
   * If provided, callers may supply a scope id; otherwise the graph's root is used.
   */
  resourceGraph?: ResourceGraph | null;
  defaultScope?: ResourceScopeId | null;

  /**
   * Project/resource registry:
   * - `elements`: custom elements (components) by kebab tag (e.g., 'au-compose').
   * - `attributes`: custom attributes (non-controller) by kebab name.
   * - `controllers`: built-in template controllers (repeat/with/promise/if/switch/portal).
   * - `valueConverters` & `bindingBehaviors`: analysis hints; no structural effect.
   */
  resources: {
    elements: Record<string, ElementRes>;
    attributes: Record<string, AttrRes>;
    controllers: Controllers;
    valueConverters: Record<string, ValueConverterSig>;
    bindingBehaviors: Record<string, BindingBehaviorSig>;
  };

  /**
   * DOM schema (HTML only for now).
   * - Guides attribute→property normalization and native prop default modes.
   * - Per-element overrides mirror runtime **AttrMapper** behavior.
   */
  dom: DomSchema;

  /**
   * Naming rules:
   * - Global + per-tag `attr→prop` mapping (priority: perTag > element.attrToProp > global > camelCase).
   * - Preserve `data-*` / `aria-*` authored forms (never camelCase).
   */
  naming: Naming;

  /** Event name → event type (global with optional per-element overrides). */
  events: EventSchema;

  /**
   * Static **two-way** defaults approximating runtime `AttrMapper.isTwoWay()`.
   * - Linker may use this to resolve `mode: 'default'` into an `effectiveMode`.
   * - Analysis can refine based on IR evidence (e.g., `<input type="checkbox">` → `checked`).
   */
  twoWayDefaults: TwoWayDefaults;
}

/* =======================
 * Resource declarations
 * ======================= */

/** Component/attribute bindable (a *real* prop; not used for repeat header options). */
export interface Bindable {
  name: string;           // canonical property name (camelCase)
  mode?: BindingMode;     // default binding mode (if defined by the resource)
  type?: TypeRef;         // static type hint for analysis/emit
  primary?: boolean;      // true if this is the primary bindable (for single-value attribute syntax)
  doc?: string;           // human note; no runtime effect
}

/** Custom element resource (component boundary). */
export interface ElementRes {
  kind: "element";
  name: string;                                   // canonical name (kebab)
  bindables: Record<string, Bindable>;            // by prop name (camelCase)
  aliases?: string[];                             // additional names resolving to this resource
  containerless?: boolean;                        // element can be used containerless
  /**
   * Capture non-bindable attributes for passthrough (e.g., au-compose).
   * - When true, non-bindable attrs are captured and available to the component.
   */
  capture?: boolean;
  /**
   * Component boundary: instances start a new binding-context boundary.
   * - Differs from template-controller 'overlay' (which is *not* a boundary).
   * - ScopeGraph should treat element VMs as a new `$this` root; `$parent` escapes upward.
   */
  boundary?: boolean;
  /**
   * Source package for optional resources (enables targeted diagnostics).
   * - Omitted for core runtime resources.
   * - Present for optional packages: "@aurelia/router", "@aurelia/i18n", etc.
   */
  package?: string;
}

/** Custom attribute resource (optionally a template controller). */
export interface AttrRes {
  kind: "attribute";
  name: string;                                   // canonical name (kebab)
  isTemplateController?: boolean;                 // true for TC-type attributes
  bindables: Record<string, Bindable>;            // include 'value' for single-value CA
  primary?: string | null;                        // primary bindable for single-value usage
  aliases?: string[];                             // name aliases
  noMultiBindings?: boolean;                      // disallow 'p1: a; p2.bind: b' when true
  /**
   * Source package for optional resources (enables targeted diagnostics).
   * - Omitted for core runtime resources.
   * - Present for optional packages: "@aurelia/router", "@aurelia/i18n", etc.
   */
  package?: string;
}

/** Scope behavior for template controllers. */
export type ScopeBehavior =
  | "reuse"    // evaluate in parent scope (no overlay, no boundary) — e.g., if/switch/portal
  | "overlay"; // Scope.fromParent(parent, overlayValue) — repeat/with/promise (NOT a boundary)
// NOTE: Custom *elements* are boundaries (see ElementRes.boundary).

/** Built-in controllers with Aurelia scope semantics captured. */
export interface Controllers {
  repeat: RepeatController;
  with: SimpleController<"with">;
  promise: PromiseController;
  if: SimpleController<"if">;
  switch: SwitchController;
  portal: PortalController; // evaluates in parent scope; content teleported
  else: LinkingController<"else", "if">; // links to preceding if controller
  case: CaseController; // switch branch with value
  "default-case": DefaultCaseController; // switch default branch
}

/* ---- Case controller ----
 * Branch of switch; matches against switch value.
 * - Can have single value or array of values (fall-through).
 */
export interface CaseController {
  kind: "controller";
  res: "case";
  scope: "reuse"; // evaluates in same scope as switch
  props: Record<string, Bindable>; // { value, fallThrough }
  linksTo: "switch";
}

/* ---- Default-case controller ----
 * Default branch of switch; activates when no case matches.
 */
export interface DefaultCaseController {
  kind: "controller";
  res: "default-case";
  scope: "reuse"; // evaluates in same scope as switch
  props: Record<string, Bindable>; // { fallThrough }
  linksTo: "switch";
}

/* ---- repeat (iterator) ----
 * Header:  repeat.for="LHS of RHS[; tailOptions]"
 * - Contextuals: $index, $first, $last, $even, $odd, $length, $middle
 * - Tail options (e.g., `key`) are **not bindables**: they belong to the header (mode-less).
 *   Treat them as `header options` so the linker/analysis never conflates them with component props.
 */
export interface IteratorTailPropSpec {
  name: string;                                   // option name (e.g., 'key')
  type?: TypeRef;                                 // analysis hint
  /** Supported header syntaxes: 'key: expr' (null) and/or 'key.bind="expr"' ('bind'). */
  accepts?: readonly ("bind" | null)[];
  doc?: string;
}

export interface RepeatController {
  kind: "controller";
  res: "repeat";
  scope: ScopeBehavior;                           // 'overlay' (new override context; not a boundary)
  /** Canonical iterator prop; IR `IteratorBindingIR.to` is normalized to this. */
  iteratorProp: string;                           // usually 'items'
  /** Header options (NOT bindables). */
  tailProps?: Record<string, IteratorTailPropSpec>;
  /** Contextual vars added to override context. */
  contextuals: readonly [
    "$index", "$first", "$last", "$even", "$odd", "$length", "$middle"
  ];
}

/* ---- Simple value controllers (with/if) ----
 * - with: overlay scope (expressions see overlay object as `$this`).
 * - if:   reuse parent scope (no overlay/boundary).
 */
export interface SimpleController<R extends "with" | "if"> {
  kind: "controller";
  res: R;
  scope: ScopeBehavior;                           // 'overlay' for with, 'reuse' for if
  props: Record<string, Bindable>;                // typically { value }
}

/* ---- Promise controller ----
 * - overlay scope; branch templates (then/catch) may introduce a *local* alias.
 * - Alias is surfaced via IR meta; ScopeGraph materializes it.
 */
export interface PromiseController {
  kind: "controller";
  res: "promise";
  scope: ScopeBehavior;                           // 'overlay'
  props: Record<string, Bindable>;                // { value }
  branches: readonly ("then" | "catch" | "pending")[];
  branchAllowsAlias: boolean;                     // applies to then/catch (pending has no alias)
}

/* ---- Switch controller ----
 * - reuse scope; branches ('case'/'default') evaluate in same scope.
 */
export interface SwitchController {
  kind: "controller";
  res: "switch";
  scope: ScopeBehavior;                           // 'reuse'
  props: Record<string, Bindable>;                // { value }
  branches: readonly ("case" | "default")[];
}

/* ---- Portal controller ----
 * - Moves content to a different host; *expressions evaluate in parent scope*.
 * - No overlay, no boundary: pure 'reuse'. `$parent` keeps working from the portal site.
 */
export interface PortalController {
  kind: "controller";
  res: "portal";
  scope: ScopeBehavior;                           // 'reuse'
  props: Record<string, Bindable>;                // { value } carries target/flag if authored
}

/* ---- Linking controller (else) ----
 * - A linking controller attaches to a preceding controller (e.g., else → if).
 * - Processed as a normal controller during lowering, then linked in a post-pass.
 * - After linking, standalone `else` controllers are absorbed into their parent's `elseDef`.
 */
export interface LinkingController<R extends string, L extends string> {
  kind: "linking-controller";
  res: R;
  linksTo: L;                                     // controller this links to
  scope: ScopeBehavior;                           // inherits from parent controller
}

/* =======================
 * Unified Controller Configuration
 * =======================
 *
 * Config-driven system for template controllers. All controllers (built-in and custom)
 * are described by configuration primitives across 6 orthogonal axes:
 *
 * 1. Trigger Kind - what causes rendering (value, iterator, branch, marker)
 * 2. Scope Behavior - how scope is affected (reuse, overlay)
 * 3. Cardinality - how many times content renders (zero-one, zero-many, one-of-n, one)
 * 4. Relationship - relation to other controllers (standalone, sibling, child)
 * 5. DOM Placement - where content goes (in-place, teleported)
 * 6. Injection Pattern - what variables are introduced (none, contextuals, alias)
 *
 * See `.claude/docs/controller-config-design.md` for full design rationale.
 */

/** What causes the controller to render its content. */
export type ControllerTrigger =
  | { kind: "value"; prop: string }                // Single expression: if, with, switch, promise, portal
  | { kind: "iterator"; prop: string; command?: string }  // Collection iteration: repeat
  | { kind: "branch"; parent: string }             // Linked to parent: else, case, then, catch, pending
  | { kind: "marker" };                            // Presence-based: default-case

/** How many times the controller's content can render. */
export type ControllerCardinality =
  | "zero-one"    // Conditional (0 or 1): if, else, case, pending
  | "zero-many"   // Collection (0 to N): repeat
  | "one-of-n"    // Exactly one branch: switch
  | "one";        // Always once: with, portal

/** Where the rendered content is placed. */
export type ControllerPlacement =
  | "in-place"    // Render at declaration site (all except portal)
  | "teleported"; // Render at different location (portal)

/** Valid child/sibling branch controllers. */
export interface ControllerBranches {
  /** Valid branch names for this controller. */
  names: readonly string[];
  /** Where to look for branches. */
  relationship: "sibling" | "child";
}

/** Variables injected into scope by the controller. */
export interface ControllerInjects {
  /** Fixed variable names derived from iteration state (repeat contextuals). */
  contextuals?: readonly string[];
  /** User-named variable bound to a value (with, then, catch). */
  alias?: {
    /** Property name the alias binds to. */
    prop: string;
    /** Default name if user doesn't specify. */
    defaultName: string;
  };
}

/**
 * Unified configuration for template controllers.
 * Captures all semantic variations through orthogonal primitives.
 *
 * This interface supports both built-in controllers (if, repeat, etc.)
 * and custom template controllers discovered via @templateController decorator.
 */
export interface ControllerConfig {
  /** Canonical name (kebab-case). */
  name: string;

  // ===== Core Axes =====

  /** What causes rendering. */
  trigger: ControllerTrigger;

  /** How scope behaves: 'reuse' (parent scope) or 'overlay' (new context). */
  scope: ScopeBehavior;

  /** How many times content renders (for type inference). */
  cardinality?: ControllerCardinality;

  /** Where content is placed. */
  placement?: ControllerPlacement;

  // ===== Relationships =====

  /** Valid child/sibling branch controllers (for parent controllers like if, switch, promise). */
  branches?: ControllerBranches;

  /** Parent controller this links to (for branch controllers like else, case, then). */
  linksTo?: string;

  // ===== Scope Injection =====

  /** Variables injected into scope. */
  injects?: ControllerInjects;

  // ===== Properties =====

  /** Bindable properties. */
  props?: Record<string, Bindable>;

  /** Iterator tail props (repeat-specific: key, contextual). */
  tailProps?: Record<string, IteratorTailPropSpec>;
}

/**
 * Built-in controller configurations.
 * These define the complete semantics for all Aurelia template controllers.
 */
export const BUILTIN_CONTROLLER_CONFIGS: Record<string, ControllerConfig> = {
  // ===== Standalone Controllers =====

  if: {
    name: "if",
    trigger: { kind: "value", prop: "value" },
    scope: "reuse",
    cardinality: "zero-one",
    branches: { names: ["else"], relationship: "sibling" },
    props: {
      value: { name: "value", mode: "default", type: { kind: "ts", name: "boolean" } },
      cache: { name: "cache", mode: "default", type: { kind: "ts", name: "boolean" } },
    },
  },

  repeat: {
    name: "repeat",
    trigger: { kind: "iterator", prop: "items", command: "for" },
    scope: "overlay",
    cardinality: "zero-many",
    injects: {
      contextuals: ["$index", "$first", "$last", "$even", "$odd", "$length", "$middle"],
    },
    tailProps: {
      key: { name: "key", accepts: ["bind", null] },
      contextual: { name: "contextual", accepts: ["bind", null] },
    },
  },

  with: {
    name: "with",
    trigger: { kind: "value", prop: "value" },
    scope: "overlay",
    cardinality: "one",
    injects: {
      alias: { prop: "value", defaultName: "$this" },
    },
    props: {
      value: { name: "value", mode: "default", type: { kind: "unknown" } },
    },
  },

  switch: {
    name: "switch",
    trigger: { kind: "value", prop: "value" },
    scope: "reuse",
    cardinality: "one-of-n",
    branches: { names: ["case", "default-case"], relationship: "child" },
    props: {
      value: { name: "value", mode: "default", type: { kind: "unknown" } },
    },
  },

  promise: {
    name: "promise",
    trigger: { kind: "value", prop: "value" },
    scope: "overlay",
    cardinality: "one",
    branches: { names: ["then", "catch", "pending"], relationship: "child" },
    props: {
      value: { name: "value", mode: "default", type: { kind: "ts", name: "Promise<unknown>" } },
    },
  },

  portal: {
    name: "portal",
    trigger: { kind: "value", prop: "target" },
    scope: "reuse",
    cardinality: "one",
    placement: "teleported",
    props: {
      target: { name: "target", mode: "default", type: { kind: "ts", name: "string | Element | null" } },
      strict: { name: "strict", mode: "default", type: { kind: "ts", name: "boolean" } },
      renderContext: { name: "renderContext", mode: "default", type: { kind: "ts", name: "Document | ShadowRoot" } },
    },
  },

  // ===== Branch Controllers =====

  else: {
    name: "else",
    trigger: { kind: "branch", parent: "if" },
    scope: "reuse",
    cardinality: "zero-one",
    linksTo: "if",
  },

  case: {
    name: "case",
    trigger: { kind: "branch", parent: "switch" },
    scope: "reuse",
    cardinality: "zero-one",
    linksTo: "switch",
    props: {
      value: { name: "value", mode: "default", type: { kind: "unknown" } },
      fallThrough: { name: "fallThrough", mode: "default", type: { kind: "ts", name: "boolean" } },
    },
  },

  "default-case": {
    name: "default-case",
    trigger: { kind: "marker" },
    scope: "reuse",
    cardinality: "zero-one",
    linksTo: "switch",
    props: {
      fallThrough: { name: "fallThrough", mode: "default", type: { kind: "ts", name: "boolean" } },
    },
  },

  pending: {
    name: "pending",
    trigger: { kind: "branch", parent: "promise" },
    scope: "reuse",
    cardinality: "zero-one",
    linksTo: "promise",
  },

  then: {
    name: "then",
    trigger: { kind: "branch", parent: "promise" },
    scope: "overlay",
    cardinality: "zero-one",
    linksTo: "promise",
    injects: {
      alias: { prop: "value", defaultName: "data" },
    },
  },

  catch: {
    name: "catch",
    trigger: { kind: "branch", parent: "promise" },
    scope: "overlay",
    cardinality: "zero-one",
    linksTo: "promise",
    injects: {
      alias: { prop: "value", defaultName: "error" },
    },
  },
};

/**
 * Stub controller config for degraded/unknown controllers.
 * Used when a template controller is referenced but not found.
 *
 * - Uses 'overlay' scope to be maximally permissive for binding analysis
 * - Named "__stub__" to clearly indicate it's not a real controller
 * - Downstream code can check isStub() to detect degraded values
 */
export const STUB_CONTROLLER_CONFIG: ControllerConfig = {
  name: "__stub__",
  trigger: { kind: "value", prop: "value" },
  scope: "overlay",
  cardinality: "zero-one",
};

/**
 * Look up a controller config by name.
 * Returns the built-in config, or undefined if not found.
 */
export function getControllerConfig(name: string): ControllerConfig | undefined {
  return BUILTIN_CONTROLLER_CONFIGS[name];
}

/**
 * Check if a controller config represents a branch controller.
 * Branch controllers link to a parent (else→if, case→switch, then→promise).
 */
export function isBranchController(config: ControllerConfig): boolean {
  return config.trigger.kind === "branch" || config.trigger.kind === "marker";
}

/**
 * Check if a controller config creates an overlay scope.
 * Overlay scopes inject new variables or change the binding context.
 */
export function isOverlayController(config: ControllerConfig): boolean {
  return config.scope === "overlay";
}

/**
 * Get the primary trigger property name for a controller.
 * Returns the prop name for value/iterator triggers, undefined for branch/marker.
 */
export function getTriggerProp(config: ControllerConfig): string | undefined {
  if (config.trigger.kind === "value" || config.trigger.kind === "iterator") {
    return config.trigger.prop;
  }
  return undefined;
}

/**
 * Convert a legacy controller from the Controllers interface to ControllerConfig.
 * Used for backward compatibility during migration.
 *
 * @param name - The controller name (e.g., "repeat", "if")
 * @param controller - The legacy controller definition from Controllers interface
 * @returns ControllerConfig equivalent
 */
export function toControllerConfig(
  name: string,
  controller: Controllers[keyof Controllers]
): ControllerConfig {
  // First check if we have a built-in config (preferred)
  const builtin = BUILTIN_CONTROLLER_CONFIGS[name];
  if (builtin) return builtin;

  // Fall back to converting from legacy format
  // This handles custom TCs that might be added to Controllers dynamically
  if (controller.kind === "linking-controller") {
    // Branch controller (else)
    return {
      name,
      trigger: { kind: "branch", parent: controller.linksTo },
      scope: controller.scope,
      linksTo: controller.linksTo,
    };
  }

  // For standard controllers, infer from res field
  const res = controller.res;

  // Repeat controller
  if (res === "repeat" && "iteratorProp" in controller) {
    const repeat = controller as RepeatController;
    return {
      name,
      trigger: { kind: "iterator", prop: repeat.iteratorProp, command: "for" },
      scope: repeat.scope,
      cardinality: "zero-many",
      injects: { contextuals: [...repeat.contextuals] },
      tailProps: repeat.tailProps,
    };
  }

  // Switch controller
  if (res === "switch" && "branches" in controller) {
    const sw = controller as SwitchController;
    return {
      name,
      trigger: { kind: "value", prop: "value" },
      scope: sw.scope,
      cardinality: "one-of-n",
      branches: { names: [...sw.branches], relationship: "child" },
      props: sw.props,
    };
  }

  // Promise controller
  if (res === "promise" && "branches" in controller) {
    const prom = controller as PromiseController;
    return {
      name,
      trigger: { kind: "value", prop: "value" },
      scope: prom.scope,
      cardinality: "one",
      branches: { names: [...prom.branches], relationship: "child" },
      props: prom.props,
    };
  }

  // Portal controller
  if (res === "portal") {
    const portal = controller as PortalController;
    return {
      name,
      trigger: { kind: "value", prop: "target" },
      scope: portal.scope,
      cardinality: "one",
      placement: "teleported",
      props: portal.props,
    };
  }

  // Case controller
  if (res === "case" && "linksTo" in controller) {
    const caseCtrl = controller as CaseController;
    return {
      name,
      trigger: { kind: "branch", parent: caseCtrl.linksTo },
      scope: caseCtrl.scope,
      cardinality: "zero-one",
      linksTo: caseCtrl.linksTo,
      props: caseCtrl.props,
    };
  }

  // Default-case controller
  if (res === "default-case" && "linksTo" in controller) {
    const dc = controller as DefaultCaseController;
    return {
      name,
      trigger: { kind: "marker" },
      scope: dc.scope,
      cardinality: "zero-one",
      linksTo: dc.linksTo,
      props: dc.props,
    };
  }

  // Simple controllers (if, with)
  if ("props" in controller) {
    const simple = controller as SimpleController<"if" | "with">;
    const isOverlay = simple.scope === "overlay";
    return {
      name,
      trigger: { kind: "value", prop: "value" },
      scope: simple.scope,
      cardinality: isOverlay ? "one" : "zero-one",
      injects: isOverlay ? { alias: { prop: "value", defaultName: "$this" } } : undefined,
      props: simple.props,
    };
  }

  // Fallback: minimal config
  return {
    name,
    trigger: { kind: "value", prop: "value" },
    scope: "reuse",
  };
}

/**
 * Create a default ControllerConfig for a custom template controller.
 * Used when resolution discovers a custom TC via @templateController decorator.
 *
 * @param name - Controller name (kebab-case)
 * @param primaryBindable - Optional primary bindable property name
 * @returns Default ControllerConfig for custom TC
 */
export function createCustomControllerConfig(
  name: string,
  primaryBindable?: string | null,
  bindables?: Record<string, Bindable>
): ControllerConfig {
  return {
    name,
    trigger: { kind: "value", prop: primaryBindable ?? "value" },
    scope: "overlay", // Standard TC behavior: creates overlay scope
    cardinality: "zero-one",
    props: bindables,
  };
}

/* =======================
 * DOM & Events
 * ======================= */

/** DOM schema mirrors runtime AttrMapper & common props for attr→prop & default modes. */
export interface DomSchema {
  ns: "html";                                     // html only (for now)
  elements: Record<string, DomElement>;           // key: tag name (lowercase)
}

export interface DomElement {
  tag: string;                                    // lowercase HTML tag
  props: Record<string, DomProp>;                 // by prop name (camelCase)
  /**
   * Per-element attribute normalization overrides.
   * - Mirrors parts of runtime AttrMapper.useMapping.
   * - Priority: naming.perTag > element.attrToProp > naming.global > fallback camelCase.
   */
  attrToProp?: Record<string, string>;
}

export interface DomProp {
  type: TypeRef;                                  // e.g., string, boolean, FileList, Date|null
  mode?: BindingMode;                             // default binding mode for this native prop
}

/** Event schema (grows over time). */
export interface EventSchema {
  byName: Record<string, TypeRef>;                // global defaults (e.g., click → MouseEvent)
  byElement?: Record<string, Record<string, TypeRef>>; // optional per-tag overrides
}

/* =======================
 * Types (analysis-only)
 * ======================= */

export interface ValueConverterSig {
  name: string;
  /** For now, treat converters as identity unless configured. */
  in?: TypeRef;
  out?: TypeRef;
}

export interface BindingBehaviorSig {
  name: string;
  // behaviors don't affect static shapes here; reserved for future extensions.
}

export type TypeRef =
  | { kind: "ts"; name: string }                  // e.g., 'string', 'boolean', 'MouseEvent', 'Promise<unknown>'
  | { kind: "any" }
  | { kind: "unknown" };

/* =======================
 * Naming rules
 * ======================= */

export interface Naming {
  /** Global attribute→property normalization (fallback). */
  attrToPropGlobal: Record<string, string>;
  /** Per-tag overrides (highest normalization priority). */
  perTag?: Record<string, Record<string, string>>;
  /**
   * Prefixes that **must not** be camelCased (preserve authored form).
   * - Runtime AttrMapper preserves `data-*`/`aria-*`.
   * - Linker: check this **before** any camelCase fallback.
   */
  preserveAttrPrefixes?: readonly string[];
}

/* =======================
 * Two-way defaults (runtime parity hints)
 * ======================= */

export interface TwoWayDefaults {
  /**
   * Tag-level default two-way props, independent of instance state.
   * (Analysis can refine with additional evidence, e.g., input[type].)
   */
  byTag: Record<string, readonly string[]>;
  /**
   * Props that default to two-way across *all* elements.
   * Runtime: scrollTop/scrollLeft are broadly two-way.
   */
  globalProps: readonly string[];
  /**
   * Conditional two-way hints needing analysis of static attributes:
   * e.g., { prop:'textContent', requiresAttr:'contenteditable' }.
   */
  conditional?: readonly { prop: string; requiresAttr: string }[];
}

/**
 * Single place to describe controller keys.
 * Useful for cross-module helpers and lookups.
 */
export type ControllerName = keyof Controllers;

/* =======================
 * Default registry
 * ======================= */

export const DEFAULT: Semantics = {
  version: "aurelia-semantics@1",

  resources: {
    /* ---- Custom elements ----
     * - A *component* element forms a binding boundary (boundary: true).
     * - Bindables are actual component props; linker resolves to these before native DOM props.
     */
    elements: {
      // au-compose: loads/hydrates a component dynamically. Treat as a boundary.
      "au-compose": {
        kind: "element",
        name: "au-compose",
        boundary: true,                            // component boundary (new $this root)
        containerless: true,                       // runtime: containerless: true
        capture: true,                             // captures non-bindable attrs for passthrough
        bindables: {
          template:      { name: "template",      type: { kind: "ts", name: "string | Promise<string>" }, mode: "toView",   doc: "Template string or URL to compose" },
          component:     { name: "component",     type: { kind: "ts", name: "string | Constructable | object | Promise<string | Constructable | object>" }, mode: "toView", doc: "Component name, constructor, or instance" },
          model:         { name: "model",         type: { kind: "unknown" },                              mode: "toView",   doc: "Model passed to component's activate() lifecycle" },
          scopeBehavior: { name: "scopeBehavior", type: { kind: "ts", name: "'auto' | 'scoped'" },        mode: "toView",   doc: "Scope inheritance: 'auto' inherits parent, 'scoped' isolates" },
          composing:     { name: "composing",     type: { kind: "ts", name: "Promise<void> | void" },     mode: "fromView", doc: "Promise resolving when composition completes" },
          composition:   { name: "composition",   type: { kind: "ts", name: "ICompositionController | undefined" }, mode: "fromView", doc: "Active composition controller" },
          tag:           { name: "tag",           type: { kind: "ts", name: "string | null | undefined" }, mode: "toView",   doc: "Host element tag name (null for containerless)" },
        },
      },

      // au-slot: projection target when shadow DOM isn't used (or as explicit slot point).
      // Not a boundary; expressions within projected content evaluate where authored.
      // NOTE: `name` attribute is processed via processContent, NOT a bindable.
      "au-slot": {
        kind: "element",
        name: "au-slot",
        boundary: false,
        containerless: true,                       // runtime: containerless: true
        bindables: {
          expose:     { name: "expose",     type: { kind: "ts", name: "object | null" }, mode: "toView", doc: "Binding context exposed to slotted content via $host" },
          slotchange: { name: "slotchange", type: { kind: "ts", name: "((name: string, nodes: readonly Node[]) => void) | null" }, mode: "toView", doc: "Callback when slot content changes" },
        },
      },

      /* ---- Router resources (@aurelia/router) ----
       * Static definitions for LSP intelligence before package is imported.
       */
      "au-viewport": {
        kind: "element",
        name: "au-viewport",
        boundary: true,                            // viewport hosts routed components (boundary)
        package: "@aurelia/router",
        bindables: {
          name:     { name: "name",     type: { kind: "ts", name: "string" }, mode: "toView", doc: "Viewport name for targeted routing (default: 'default')" },
          usedBy:   { name: "usedBy",   type: { kind: "ts", name: "string" }, mode: "toView", doc: "Comma-separated list of components that can be loaded" },
          default:  { name: "default",  type: { kind: "ts", name: "string" }, mode: "toView", doc: "Default component to load when no route matches" },
          fallback: { name: "fallback", type: { kind: "ts", name: "string | Constructable | ((instruction: IViewportInstruction, node: RouteNode, context: IRouteContext) => Routeable | null)" }, mode: "toView", doc: "Component or function for unrecognized routes" },
        },
      },
    },

    /* ---- Custom attributes ----
     * (Built-in template controllers are modeled under `controllers`.)
     */
    attributes: {
      focus: {
        kind: "attribute",
        name: "focus",
        isTemplateController: false,
        bindables: {
          value: { name: "value", mode: "twoWay", type: { kind: "ts", name: "boolean" } }
        }
      },
      show: {
        kind: "attribute",
        name: "show",
        isTemplateController: false,
        bindables: {
          value: { name: "value", mode: "toView", type: { kind: "ts", name: "boolean" } }
        },
        aliases: ["hide"]
      },

      /* ---- Router attributes (@aurelia/router) ----
       * Static definitions for LSP intelligence before package is imported.
       */

      // load: Declarative navigation instruction (alternative to href for router-aware links).
      load: {
        kind: "attribute",
        name: "load",
        isTemplateController: false,
        package: "@aurelia/router",
        primary: "route",
        bindables: {
          route:     { name: "route",     type: { kind: "unknown" },                  mode: "toView",   primary: true, doc: "Route path, component name, or navigation instruction" },
          params:    { name: "params",    type: { kind: "ts", name: "Params" },       mode: "toView",   doc: "Route parameters object" },
          attribute: { name: "attribute", type: { kind: "ts", name: "string" },       mode: "toView",   doc: "Target attribute to set (default: 'href')" },
          active:    { name: "active",    type: { kind: "ts", name: "boolean" },      mode: "fromView", doc: "Reflects whether the route is currently active" },
          context:   { name: "context",   type: { kind: "ts", name: "IRouteContext" }, mode: "toView",   doc: "Route context for relative navigation" },
        },
      },

      // href: Router-aware href handling for anchor elements.
      // IMPORTANT: noMultiBindings prevents URLs like "https://..." from being parsed as multi-binding syntax.
      href: {
        kind: "attribute",
        name: "href",
        isTemplateController: false,
        package: "@aurelia/router",
        noMultiBindings: true,
        bindables: {
          value: { name: "value", type: { kind: "unknown" }, mode: "toView", primary: true, doc: "Route path or URL" },
        },
      },
    },

    /* ---- Built-in template controllers ----
     * - 'repeat'/'with'/'promise' create an *overlay* scope (not a boundary).
     * - 'if'/'switch'/'portal' *reuse* the parent scope.
     * - 'repeat' tail options (e.g., 'key') are *not bindables*; they live on the header.
     * - Promise branches may declare a local alias (ScopeGraph binds it from IR meta).
     */
    controllers: {
      repeat: {
        kind: "controller",
        res: "repeat",
        scope: "overlay",
        iteratorProp: "items",
        tailProps: {
          // Supports "key: expr" and "key.bind='expr'".
          key: { name: "key", type: { kind: "unknown" }, accepts: ["bind", null], doc: "Stable key for keyed repeat" },
        },
        contextuals: ["$index", "$first", "$last", "$even", "$odd", "$length", "$middle"],
      },

      with: {
        kind: "controller",
        res: "with",
        scope: "overlay",
        props: { value: { name: "value", type: { kind: "unknown" }, mode: "default", doc: "Overlay object" } },
      },

      promise: {
        kind: "controller",
        res: "promise",
        scope: "overlay",
        props: { value: { name: "value", type: { kind: "ts", name: "Promise<unknown>" }, mode: "default", doc: "Promise to await" } },
        branches: ["then", "catch", "pending"],
        branchAllowsAlias: true, // applies to then/catch (pending has no alias)
      },

      if: {
        kind: "controller",
        res: "if",
        scope: "reuse",
        props: { value: { name: "value", type: { kind: "ts", name: "boolean" }, mode: "default", doc: "Condition" } },
      },

      switch: {
        kind: "controller",
        res: "switch",
        scope: "reuse",
        props: { value: { name: "value", type: { kind: "ts", name: "unknown" }, mode: "default", doc: "Discriminant value" } },
        branches: ["case", "default"],
      },

      portal: {
        kind: "controller",
        res: "portal",
        scope: "reuse", // expressions inside portal evaluate in the *parent* scope
        props: {
          target:          { name: "target",          type: { kind: "ts", name: "string | Element | null | undefined" }, mode: "default", primary: true, doc: "Target element or CSS selector" },
          position:        { name: "position",        type: { kind: "ts", name: "InsertPosition" },         mode: "toView",  doc: "Insert position: beforeend, afterbegin, beforebegin, afterend" },
          renderContext:   { name: "renderContext",   type: { kind: "ts", name: "string | Element | null | undefined" }, mode: "toView",  doc: "Context element/selector for target query" },
          strict:          { name: "strict",          type: { kind: "ts", name: "boolean" },                mode: "toView",  doc: "Throw error if target not found" },
          activating:      { name: "activating",      type: { kind: "ts", name: "PortalLifecycleCallback" }, mode: "toView",  doc: "Callback invoked before activation" },
          activated:       { name: "activated",       type: { kind: "ts", name: "PortalLifecycleCallback" }, mode: "toView",  doc: "Callback invoked after activation" },
          deactivating:    { name: "deactivating",    type: { kind: "ts", name: "PortalLifecycleCallback" }, mode: "toView",  doc: "Callback invoked before deactivation" },
          deactivated:     { name: "deactivated",     type: { kind: "ts", name: "PortalLifecycleCallback" }, mode: "toView",  doc: "Callback invoked after deactivation" },
          callbackContext: { name: "callbackContext", type: { kind: "unknown" },                            mode: "toView",  doc: "Context object passed to lifecycle callbacks" },
        },
      },

      else: {
        kind: "linking-controller",
        res: "else",
        linksTo: "if",
        scope: "reuse", // inherits from parent if controller
      },

      case: {
        kind: "controller",
        res: "case",
        scope: "reuse", // evaluates in same scope as switch
        props: {
          value: { name: "value", type: { kind: "unknown" }, mode: "default", primary: true, doc: "Case value to match" },
          fallThrough: { name: "fallThrough", type: { kind: "ts", name: "boolean" }, mode: "toView", doc: "Continue to next case" },
        },
        linksTo: "switch",
      },

      "default-case": {
        kind: "controller",
        res: "default-case",
        scope: "reuse", // evaluates in same scope as switch
        props: {
          fallThrough: { name: "fallThrough", type: { kind: "ts", name: "boolean" }, mode: "toView", doc: "Continue to next case" },
        },
        linksTo: "switch",
      },
    },

    /* ---- Value converters & binding behaviors ----
     * Analysis treats VCs as identity unless configured; BBs don't change static shapes in MVP.
     */
    valueConverters: {
      identity: { name: "identity", in: { kind: "unknown" }, out: { kind: "unknown" } },
    },
    bindingBehaviors: {
      // Rate limiting behaviors
      debounce:      { name: "debounce" },      // Delays updates until pause in changes
      throttle:      { name: "throttle" },      // Limits update frequency

      // Signal behavior
      signal:        { name: "signal" },        // Re-evaluate binding when signal(s) fired

      // Binding mode override behaviors
      oneTime:       { name: "oneTime" },       // Override to one-time binding
      toView:        { name: "toView" },        // Override to to-view binding
      fromView:      { name: "fromView" },      // Override to from-view binding
      twoWay:        { name: "twoWay" },        // Override to two-way binding

      // Specialized behaviors
      attr:          { name: "attr" },          // Force attribute binding (vs property)
      self:          { name: "self" },          // Event only triggers if target === element
      updateTrigger: { name: "updateTrigger" }, // Custom events to trigger updates
    },
  },

  /* ---- DOM schema (HTML-only) ----
   * Mirrors runtime AttrMapper and common props to guide attr→prop + default modes.
   * - `attrToProp` entries reflect AttrMapper.useMapping per tag.
   * - Global mappings live under `naming.attrToPropGlobal`.
   */
  dom: {
    ns: "html",
    elements: {
      // Form controls
      input: {
        tag: "input",
        props: {
          value:         { type: { kind: "ts", name: "string"          }, mode: "twoWay" },
          checked:       { type: { kind: "ts", name: "boolean"         }, mode: "twoWay" }, // refined by type=checkbox|radio
          files:         { type: { kind: "ts", name: "FileList | null" }, mode: "twoWay" },
          valueAsNumber: { type: { kind: "ts", name: "number"          }, mode: "twoWay" },
          valueAsDate:   { type: { kind: "ts", name: "Date | null"     }, mode: "twoWay" },
          type:          { type: { kind: "ts", name: "string"          } },
          disabled:      { type: { kind: "ts", name: "boolean"         }, mode: "toView" },
        },
        // Per-element overrides (mirrors AttrMapper.useMapping for INPUT)
        attrToProp: {
          maxlength: "maxLength",
          minlength: "minLength",
          formaction: "formAction",
          formenctype: "formEncType",
          formmethod: "formMethod",
          formnovalidate: "formNoValidate",
          formtarget: "formTarget",
          inputmode: "inputMode",
        },
      },
      textarea: {
        tag: "textarea",
        props: {
          value:    { type: { kind: "ts", name: "string"  }, mode: "twoWay" },
          disabled: { type: { kind: "ts", name: "boolean" }, mode: "toView"  },
        },
        attrToProp: { maxlength: "maxLength" },     // AttrMapper.useMapping for TEXTAREA
      },
      select: {
        tag: "select",
        props: {
          value:    { type: { kind: "ts", name: "string | string[]" }, mode: "twoWay" },
          multiple: { type: { kind: "ts", name: "boolean"           }, mode: "toView" },
          disabled: { type: { kind: "ts", name: "boolean"           }, mode: "toView" },
        },
      },
      option: {
        tag: "option",
        props: {
          value:    { type: { kind: "ts", name: "string"  }, mode: "toView" },
          selected: { type: { kind: "ts", name: "boolean" }, mode: "twoWay" },
          disabled: { type: { kind: "ts", name: "boolean" }, mode: "toView" },
        },
      },

      // Label/Img mapping (mirrors AttrMapper.useMapping)
      label: {
        tag: "label",
        props: { htmlFor: { type: { kind: "ts", name: "string" }, mode: "toView" } },
        attrToProp: { for: "htmlFor" },
      },
      img: {
        tag: "img",
        props: { useMap: { type: { kind: "ts", name: "string" }, mode: "toView" } },
        attrToProp: { usemap: "useMap" },
      },

      // Table cells (mirrors AttrMapper.useMapping for TD/TH)
      td: {
        tag: "td",
        props: { rowSpan: { type: { kind: "ts", name: "number" } }, colSpan: { type: { kind: "ts", name: "number" } } },
        attrToProp: { rowspan: "rowSpan", colspan: "colSpan" },
      },
      th: {
        tag: "th",
        props: { rowSpan: { type: { kind: "ts", name: "number" } }, colSpan: { type: { kind: "ts", name: "number" } } },
        attrToProp: { rowspan: "rowSpan", colspan: "colSpan" },
      },

      // Generic elements (common props; not exhaustive)
      div: {
        tag: "div",
        props: {
          class:        { type: { kind: "ts", name: "string" } },  // runtime uses ClassAttributeAccessor
          className:    { type: { kind: "ts", name: "string" } },  // DOM property alias
          // NOTE: `style` as a *property* is CSSStyleDeclaration; attribute is string → we bind both ways:
          // - `style="..."` → SetStyleAttribute / AttributeBinding (string)
          // - `style.prop="..."` → property binding (object); keep TS type for awareness
          style:        { type: { kind: "ts", name: "CSSStyleDeclaration" } },
          textContent:  { type: { kind: "ts", name: "string" } },  // two-way when [contenteditable]
          innerHTML:    { type: { kind: "ts", name: "string" } },  // two-way when [contenteditable]
          scrollTop:    { type: { kind: "ts", name: "number" } },  // twoWayDefaults.globalProps
          scrollLeft:   { type: { kind: "ts", name: "number" } },  // twoWayDefaults.globalProps
        },
      },
      span:     { tag: "span",     props: { class: { type: { kind: "ts", name: "string" } }, textContent: { type: { kind: "ts", name: "string" } } } },
      form:     { tag: "form",     props: {} },
      button:   { tag: "button",   props: { disabled: { type: { kind: "ts", name: "boolean" }, mode: "toView" } } },
      template: { tag: "template", props: {} },
      // (extend with more tags as needed)
    },
  },

  /* ---- Naming rules ----
   * Priority: perTag > element.attrToProp > global > fallback camelCase.
   * Non-DOM correction: never camelCase preserved prefixes (data-/aria-).
   */
  naming: {
    attrToPropGlobal: {
      // Mirrors AttrMapper.useGlobalMapping - these are the runtime's actual mappings
      accesskey: "accessKey",
      contenteditable: "contentEditable",
      tabindex: "tabIndex",
      textcontent: "textContent",
      innerhtml: "innerHTML",
      scrolltop: "scrollTop",
      scrollleft: "scrollLeft",
      readonly: "readOnly",
      // Additional case-normalization for developer convenience
      // Note: 'class' is NOT mapped here - runtime uses ClassAttributeAccessor
      outerhtml: "outerHTML",
    },
    perTag: {
      // Mirrors AttrMapper.useMapping
      label:   { for: "htmlFor" },
      img:     { usemap: "useMap" },
      input:   {
        maxlength: "maxLength",
        minlength: "minLength",
        formaction: "formAction",
        formenctype: "formEncType",
        formmethod: "formMethod",
        formnovalidate: "formNoValidate",
        formtarget: "formTarget",
        inputmode: "inputMode",
      },
      textarea: { maxlength: "maxLength" },
      td:       { rowspan: "rowSpan", colspan: "colSpan" },
      th:       { rowspan: "rowSpan", colspan: "colSpan" },
    },
    preserveAttrPrefixes: ["data-", "aria-"],
  },

  /* ---- Events ----
   * Global defaults with optional per-element refinements.
   */
  events: {
    byName: {
      click:   { kind: "ts", name: "MouseEvent" },
      input:   { kind: "ts", name: "InputEvent" },
      change:  { kind: "ts", name: "Event" },
      submit:  { kind: "ts", name: "SubmitEvent" },
      keydown: { kind: "ts", name: "KeyboardEvent" },
      keyup:   { kind: "ts", name: "KeyboardEvent" },
      focus:   { kind: "ts", name: "FocusEvent" },
      blur:    { kind: "ts", name: "FocusEvent" },
    },
    byElement: {
      // Customize per tag if needed (example only)
      // input: { change: { kind: 'ts', name: 'Event' } }
    },
  },

  /* ---- Two-way defaults ----
   * Mirrors runtime AttrMapper.isTwoWay behavior at a *static* level.
   * - Linker can use `byTag`/`globalProps` for `effectiveMode` when authored mode === 'default'.
   * - Analysis should refine conditionals (e.g., contenteditable) and `<input type=...>` cases.
   */
  twoWayDefaults: {
    byTag: {
      // Runtime: <input> two-way for value/files/valueAsNumber/valueAsDate, and for checked (checkbox/radio).
      // Here we list all; analysis refines by `type` when available in IR (SetAttribute('type', ...)).
      input:   ["value", "files", "valueAsNumber", "valueAsDate", "checked"],
      textarea:["value"],
      select:  ["value"],
    },
    // Runtime: scrollTop/scrollLeft are two-way broadly.
    globalProps: ["scrollTop", "scrollLeft"],
    // Runtime: textContent/innerHTML become two-way when [contenteditable] present.
    conditional: [
      { prop: "textContent", requiresAttr: "contenteditable" },
      { prop: "innerHTML",   requiresAttr: "contenteditable" },
    ],
  },
};

/* -------------------------------------------------------------------------
 * Semantics lookup helpers
 * - Builds case-insensitive/alias-aware indices for resources.
 * - Keeps resolution logic reusable for the linker and future project-aware
 *   discovery/enrichment layers.
 * ------------------------------------------------------------------------- */

export interface EventResolution {
  type: TypeRef;
  source: "byElement" | "global" | "unknown";
}

export interface SemanticsLookup {
  /** Underlying semantics (for callers that need raw data). */
  readonly sem: Semantics;
  /** Scope id (if derived from a ResourceGraph). */
  readonly scope: ResourceScopeId | null;

  /** Resolve a custom element by name or alias (case-insensitive). */
  element(name: string): ElementRes | null;

  /** Resolve a custom attribute by name or alias (case-insensitive). */
  attribute(name: string): AttrRes | null;

  /** Resolve a template controller by canonical name. */
  controller<TName extends ControllerName>(name: TName): Controllers[TName] | null;

  /** Resolve a native DOM element entry (tag is normalized to lowercase). */
  domElement(tag: string): DomElement | null;

  /** Resolve an event type with per-element override and global fallback. */
  event(eventName: string, tag?: string | null): EventResolution;

  /** Whether the attribute should preserve authored casing (data-/aria-). */
  hasPreservedPrefix(attr: string): boolean;

  // TODO: Add lookup methods for expression resources (AU0101/AU0103 diagnostics)
  // bindingBehavior(name: string): BindingBehaviorSig | null;
  // valueConverter(name: string): ValueConverterSig | null;
  // These should check both built-in (sem.resources) and userland (ResourceGraph).
}

export interface SemanticsLookupOptions {
  resources?: ResourceCollections;
  graph?: ResourceGraph | null;
  scope?: ResourceScopeId | null;
}

export function createSemanticsLookup(sem: Semantics, opts?: SemanticsLookupOptions): SemanticsLookup {
  const scoped: ScopedResources = opts?.resources
    ? { scope: opts.scope ?? null, resources: opts.resources }
    : materializeResourcesForScope(sem, opts?.graph, opts?.scope ?? null);

  const elementIndex = buildResourceIndex(scoped.resources.elements);
  const attributeIndex = buildResourceIndex(scoped.resources.attributes);
  const domIndex = buildDomIndex(sem.dom.elements);

  return {
    sem,
    scope: scoped.scope,
    element: (name) => lookupResource(elementIndex, name),
    attribute: (name) => lookupResource(attributeIndex, name),
    controller: (name) => scoped.resources.controllers[name] ?? null,
    domElement: (tag) => lookupDom(domIndex, tag),
    event: (eventName, tag) => resolveEvent(sem, eventName, tag),
    hasPreservedPrefix: (attr) => hasPreservedPrefix(sem, attr),
  };
}

type ResourceWithAliases<T> = T & { aliases?: readonly string[] };
type ResourceIndex<T> = Map<string, ResourceWithAliases<T>>;

function buildResourceIndex<T extends { name: string }>(
  entries: Record<string, ResourceWithAliases<T>>,
): ResourceIndex<T> {
  const index: ResourceIndex<T> = new Map();
  for (const res of Object.values(entries)) {
    const canonical = res.name.toLowerCase();
    index.set(canonical, res);
    if (res.aliases) {
      for (const alias of res.aliases) index.set(alias.toLowerCase(), res);
    }
  }
  return index;
}

function lookupResource<T>(index: ResourceIndex<T>, name: string): T | null {
  const entry = index.get(name.toLowerCase());
  return entry ?? null;
}

type DomIndex = Map<string, DomElement>;

function buildDomIndex(entries: Record<string, DomElement>): DomIndex {
  const index: DomIndex = new Map();
  for (const res of Object.values(entries)) index.set(res.tag.toLowerCase(), res);
  return index;
}

function lookupDom(index: DomIndex, tag: string): DomElement | null {
  const entry = index.get(tag.toLowerCase());
  return entry ?? null;
}

function resolveEvent(sem: Semantics, eventName: string, tag?: string | null): EventResolution {
  const name = eventName.toLowerCase();
  if (tag) {
    const byElement = lookupCaseInsensitive(sem.events.byElement?.[tag] ?? {}, name);
    if (byElement) return { type: byElement, source: "byElement" };
  }
  const global = lookupCaseInsensitive(sem.events.byName, name);
  if (global) return { type: global, source: "global" };
  return { type: { kind: "unknown" }, source: "unknown" };
}

function hasPreservedPrefix(sem: Semantics, attr: string): boolean {
  const prefixes = sem.naming.preserveAttrPrefixes ?? ["data-", "aria-"];
  const lower = attr.toLowerCase();
  return prefixes.some((p) => lower.startsWith(p));
}

function lookupCaseInsensitive<T>(record: Record<string, T>, name: string): T | null {
  const direct = record[name];
  if (direct) return direct;
  const lowered = name.toLowerCase();
  for (const [key, value] of Object.entries(record)) {
    if (key.toLowerCase() === lowered) return value;
  }
  return null;
}
