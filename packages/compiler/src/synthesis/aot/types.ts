/* =============================================================================
 * AOT SYNTHESIS TYPES
 * -----------------------------------------------------------------------------
 * Abstract intermediate representation for AOT compilation.
 *
 * The AotPlanModule is target-agnostic: it captures everything needed to
 * generate Aurelia instructions without being coupled to the runtime's
 * serialization format. The emit stage adapts the plan to the concrete
 * instruction format.
 *
 * Key design principles:
 * - Expressions referenced by ExprId, stored in separate table
 * - Node-centric organization (vs instruction rows)
 * - Hydration target indices assigned during planning
 * - Scopes captured from analysis, enriched with runtime metadata
 * ============================================================================= */

import type {
  ExprId,
  NodeId,
  FrameId,
  SourceFileId,
  SourceSpan,
  TextSpan,
  BindingMode,
  JsonValue,
  AnyBindingExpression,
  TemplateMetaIR,
} from "../../model/index.js";
import type { ControllerConfig } from "../../language/registry.js";

/* =============================================================================
 * AOT PLAN MODULE - Top-level container
 * ============================================================================= */

export interface AotPlanModule {
  version: "aurelia-aot-plan@1";

  /** Root template node (synthetic fragment containing top-level nodes) */
  root: PlanNode;

  /** All expressions used in bindings, keyed by ExprId */
  expressions: PlanExpression[];

  /** Scope hierarchy (frames from 30-bind, enriched for runtime) */
  scopes: PlanScope[];

  /** Total hydration target count (for manifest generation) */
  targetCount: number;

  /** Source file identifier for provenance */
  sourceFile?: SourceFileId;

  /** Template name (from source) */
  name?: string;

  /**
   * Extracted meta elements (<import>, <bindable>, etc.).
   * Carried through from analysis for AOT emission.
   */
  templateMeta?: TemplateMetaIR;
}

/* =============================================================================
 * PLAN NODES - DOM structure with bindings attached
 * ============================================================================= */

export type PlanNode =
  | PlanElementNode
  | PlanTextNode
  | PlanCommentNode
  | PlanFragmentNode;

interface PlanNodeBase {
  /** Node ID from IR (stable identifier) */
  nodeId: NodeId;

  /** Hydration target index (assigned during planning; undefined if not a target) */
  targetIndex?: number;

  /** Source location in template */
  loc?: SourceSpan;
}

export interface PlanElementNode extends PlanNodeBase {
  kind: "element";

  /** Element tag name (lowercase for HTML) */
  tag: string;

  /** Namespace (defaults to HTML) */
  namespace?: "html" | "svg" | "mathml";

  /** Static attributes (no bindings, emitted as-is) */
  staticAttrs: PlanStaticAttr[];

  /** Dynamic bindings on this element */
  bindings: PlanBinding[];

  /** Custom element hydration info (if this is a custom element) */
  customElement?: PlanCustomElement;

  /** Custom attributes applied to this element */
  customAttrs: PlanCustomAttr[];

  /** Let element info (if this is a <let> element) */
  letElement?: PlanLetElement;

  /** Template controllers wrapping this element (inside-out order) */
  controllers: PlanController[];

  /** Child nodes */
  children: PlanNode[];

  /** Self-closing element (no children in source) */
  selfClosing?: boolean;
}

export interface PlanTextNode extends PlanNodeBase {
  kind: "text";

  /** Static text content (when no interpolation) */
  content?: string;

  /** Text interpolation (when dynamic) */
  interpolation?: PlanTextInterpolation;
}

export interface PlanCommentNode extends PlanNodeBase {
  kind: "comment";

  /** Comment content */
  content: string;

  /** Template controllers anchored on this comment */
  controllers: PlanController[];
}

export interface PlanFragmentNode extends PlanNodeBase {
  kind: "fragment";

  /** Child nodes */
  children: PlanNode[];
}

/* =============================================================================
 * STATIC ATTRIBUTES
 * ============================================================================= */

export interface PlanStaticAttr {
  /** Attribute name (preserved case) */
  name: string;

  /** Attribute value (null for boolean attributes like `disabled`) */
  value: string | null;
}

/* =============================================================================
 * BINDINGS - Dynamic property/attribute/event bindings
 * ============================================================================= */

export type PlanBinding =
  | PlanPropertyBinding
  | PlanAttributeBinding
  | PlanAttributeInterpolation
  | PlanStyleBinding
  | PlanListenerBinding
  | PlanRefBinding
  | PlanTranslationBinding;

interface PlanBindingBase {
  /** Source location */
  loc?: SourceSpan;
}

/**
 * Property binding (e.g., `value.bind="expr"`, `value.two-way="expr"`).
 * Targets a JavaScript property on the element or component.
 */
export interface PlanPropertyBinding extends PlanBindingBase {
  type: "propertyBinding";

  /** Target property name (camelCase) */
  to: string;

  /** Expression ID (lookup in expressions table) */
  exprId: ExprId;

  /** Effective binding mode */
  mode: BindingMode;
}

/**
 * Attribute binding (e.g., `data-id.attr="expr"`).
 * Targets an HTML attribute, not a property.
 */
export interface PlanAttributeBinding extends PlanBindingBase {
  type: "attributeBinding";

  /** Target attribute name */
  to: string;

  /** Expression ID */
  exprId: ExprId;
}

/**
 * Attribute interpolation (e.g., `title="Hello ${name}"`).
 * Combines static parts with expression values.
 */
export interface PlanAttributeInterpolation extends PlanBindingBase {
  type: "attributeInterpolation";

  /** Target attribute/property name */
  to: string;

  /** Static parts between expressions (length = exprIds.length + 1) */
  parts: string[];

  /** Expression IDs for interpolated segments */
  exprIds: ExprId[];
}

/**
 * Style property binding (e.g., `style.color="expr"`).
 */
export interface PlanStyleBinding extends PlanBindingBase {
  type: "styleBinding";

  /** CSS property name */
  property: string;

  /** Expression ID */
  exprId: ExprId;
}

/**
 * Event listener binding (e.g., `click.trigger="handler()"`).
 */
export interface PlanListenerBinding extends PlanBindingBase {
  type: "listenerBinding";

  /** Event name */
  event: string;

  /** Handler expression ID */
  exprId: ExprId;

  /** Use capture phase */
  capture: boolean;

  /** Event modifier (e.g., 'prevent', 'stop') */
  modifier?: string;
}

/**
 * Ref binding (e.g., `ref="myElement"`).
 * Assigns the element/component to a view-model property.
 */
export interface PlanRefBinding extends PlanBindingBase {
  type: "refBinding";

  /** Target property name on view-model */
  to: string;

  /** Expression ID (usually just an identifier) */
  exprId: ExprId;
}

/**
 * Translation binding (i18n `t` attribute).
 * Sets translated content on an element or attribute.
 *
 * Three variants:
 * 1. `t="static.key"` - literal key, uses `keyValue`
 * 2. `t.bind="expr"` - single expression, uses `exprId`
 * 3. `t="key.${expr}"` - interpolated key, uses `parts` + `exprIds`
 */
export interface PlanTranslationBinding extends PlanBindingBase {
  type: "translationBinding";

  /** Target attribute/property (empty string = textContent) */
  to: string;

  /** Whether the value is a dynamic expression (t.bind or interpolation) vs literal key (t) */
  isExpression: boolean;

  /** Expression ID (only for t.bind="expr" - single expression) */
  exprId?: ExprId;

  /** Static parts between expressions (only for interpolated keys like t="key.${expr}") */
  parts?: string[];

  /** Expression IDs for each interpolation (only for interpolated keys) */
  exprIds?: ExprId[];

  /** Literal translation key (only when isExpression: false) */
  keyValue?: string;
}

/**
 * Text interpolation (e.g., `Hello ${name}!` in a text node).
 */
export interface PlanTextInterpolation {
  /** Static parts between expressions */
  parts: string[];

  /** Expression IDs for interpolated segments */
  exprIds: ExprId[];

  /** Source location */
  loc?: SourceSpan | undefined;
}

/* =============================================================================
 * CUSTOM ELEMENTS & ATTRIBUTES
 * ============================================================================= */

/**
 * Custom element hydration info.
 * Attached to PlanElementNode when the element is a custom element.
 */
export interface PlanCustomElement {
  /** Resource identifier (registered name) */
  resource: string;

  /** Bindable property bindings */
  bindings: PlanPropertyBinding[];

  /** Static property values (non-binding) */
  staticProps: PlanStaticProp[];

  /** Content projections (au-slot) */
  projections: PlanProjection[];

  /** Render containerless (no wrapper element) */
  containerless: boolean;
}

/**
 * Static property value (not a binding).
 */
export interface PlanStaticProp {
  /** Property name */
  name: string;

  /** Static value */
  value: JsonValue;
}

/**
 * Content projection into a slot.
 */
export interface PlanProjection {
  /** Slot name (undefined for default slot) */
  slotName?: string;

  /** Projected content template */
  template: PlanNode;
}

/**
 * Custom attribute applied to an element.
 */
export interface PlanCustomAttr {
  /** Resource identifier */
  resource: string;

  /** Alias if used with different name */
  alias?: string | undefined;

  /** Bindable property bindings */
  bindings: PlanPropertyBinding[];

  /** Static property values */
  staticProps: PlanStaticProp[];

  /** Target index for this attribute */
  targetIndex?: number | undefined;
}

/* =============================================================================
 * LET ELEMENTS
 * ============================================================================= */

/**
 * Let element info (e.g., `<let foo.bind="bar"></let>`).
 * Attached to PlanElementNode when the element is a <let> element.
 */
export interface PlanLetElement {
  /** Let bindings within this element */
  bindings: PlanLetBinding[];

  /** Whether bindings go to bindingContext (vs. overrideContext) */
  toBindingContext: boolean;
}

/**
 * Individual let binding (e.g., `foo.bind="bar"`).
 */
export interface PlanLetBinding {
  /** Target variable name */
  to: string;

  /** Value expression ID */
  exprId: ExprId;
}

/* =============================================================================
 * TEMPLATE CONTROLLERS
 * -----------------------------------------------------------------------------
 * Unified representation for ALL template controllers (built-in and custom).
 *
 * Key design: Controllers are defined by their ControllerConfig, not by
 * hardcoded type variants. This enables custom TCs (virtual-repeat, async-if,
 * user-defined) to receive identical treatment to built-ins.
 *
 * All behavior is derived from the config's 6 orthogonal axes:
 * - trigger: value | iterator | branch | marker
 * - scope: reuse | overlay
 * - cardinality: zero-one | zero-many | one-of-n | one
 * - branches: child branch controllers (switch cases, promise branches)
 * - injects: contextuals ($index, etc.) and aliases (with, then, catch)
 * - placement: in-place | teleported
 * ============================================================================= */

/**
 * Unified template controller in the AOT plan.
 *
 * All controller variations are expressed through:
 * - `resource`: The controller name (e.g., "repeat", "virtual-repeat")
 * - `config`: The ControllerConfig defining all semantics
 * - Trigger-derived data: exprId, auxExprs
 * - Injects-derived data: locals, contextuals
 * - Branches-derived data: branches array for child controllers
 */
export interface PlanController {
  /** Controller resource name (e.g., "repeat", "if", "virtual-repeat") */
  resource: string;

  /** Controller config (defines ALL semantics via 6 axes) */
  config: ControllerConfig;

  /** Frame ID for this controller's scope */
  frameId: FrameId;

  /** Hydration target index for controller marker */
  targetIndex?: number;

  /** Source location */
  loc?: SourceSpan;

  /** Inner template (the wrapped content) */
  template: PlanNode;

  // ===== Expression data (varies by config.trigger.kind) =====

  /**
   * Primary expression ID.
   * - iterator trigger: ForOfStatement expression
   * - value trigger: value/condition expression
   * - branch trigger: may have value (case) or not (else, default-case, pending)
   * - marker trigger: none
   */
  exprId?: ExprId;

  /**
   * Auxiliary expressions (tail props like key for repeat).
   */
  auxExprs?: PlanAuxExpr[];

  // ===== Local variables (varies by config.trigger.kind and config.injects) =====

  /**
   * Local variables introduced into scope.
   * - iterator: destructured loop variables from ForOfStatement
   * - alias: the aliased name (with, then, catch)
   */
  locals?: string[];

  /**
   * Contextual variables ($index, $first, $last, etc.).
   * From config.injects.contextuals.
   */
  contextuals?: string[];

  // ===== Child branches (only for config.branches.relationship === "child") =====

  /**
   * Child branch controllers (switch cases, promise branches).
   * Only populated when config.branches?.relationship === "child".
   */
  branches?: PlanController[];
}

/**
 * Auxiliary expression binding (e.g., key for repeat).
 */
export interface PlanAuxExpr {
  /** Auxiliary property name (e.g., "key") */
  name: string;

  /** Expression ID for this aux binding */
  exprId: ExprId;
}

/* =============================================================================
 * EXPRESSIONS
 * ============================================================================= */

/**
 * Expression entry in the plan's expression table.
 * Expressions are stored separately and referenced by ID.
 */
export interface PlanExpression {
  /** Expression ID (matches ExprId from IR) */
  id: ExprId;

  /** Parsed AST (for runtime interpretation) */
  ast: AnyBindingExpression;

  /** Frame where this expression is evaluated */
  frameId: FrameId;

  /** Source span in template */
  span?: SourceSpan | undefined;
}

/* =============================================================================
 * SCOPES
 * ============================================================================= */

/**
 * Scope entry representing a frame in the scope hierarchy.
 */
export interface PlanScope {
  /** Frame ID */
  frameId: FrameId;

  /** Parent frame ID (null for root) */
  parentFrameId: FrameId | null;

  /** Scope kind (what introduced this scope) */
  kind: PlanScopeKind;

  /** Local variables introduced in this scope */
  locals: PlanLocal[];

  /** Override context properties (repeat's $index, $first, etc.) */
  overrideContext: string[];
}

export type PlanScopeKind =
  | "root"
  | "repeat"
  | "with"
  | "if"
  | "switch"
  | "promise"
  | "portal";

/**
 * Local variable introduced in a scope.
 */
export interface PlanLocal {
  /** Variable name */
  name: string;

  /** How the local was introduced */
  source: PlanLocalSource;

  /** Expression ID (for let bindings - the value expression) */
  exprId?: ExprId;
}

export type PlanLocalSource =
  | "let"        // <let name.bind="expr">
  | "iterator"   // repeat.for="item of items"
  | "contextual" // $index, $first, etc.
  | "alias";     // promise then="result", catch="error"

/* =============================================================================
 * EMIT RESULTS
 * ============================================================================= */

/**
 * Result of AOT code emission.
 * Contains serialized instructions in a JSON-friendly format.
 */
export interface AotCodeResult {
  /** Serialized template definition */
  definition: SerializedDefinition;

  /** Expression table (ASTs for runtime interpretation) */
  expressions: SerializedExpression[];

  /** Provenance mapping (generated → source) */
  mapping: AotMappingEntry[];
}

/**
 * Serialized template definition.
 * This is our abstract format; an adapter translates to Aurelia's format.
 */
export interface SerializedDefinition {
  /** Template name */
  name: string;

  /** Instruction rows indexed by target */
  instructions: SerializedInstruction[][];

  /** Nested template definitions (for controllers) */
  nestedTemplates: SerializedDefinition[];

  /** Total target count */
  targetCount: number;

  // === Meta element properties (from <import>, <bindable>, etc.) ===

  /** Shadow DOM options from <use-shadow-dom> */
  shadowOptions?: { mode: 'open' | 'closed' };

  /** Containerless mode from <containerless> */
  containerless?: boolean;

  /** Capture mode from <capture> (custom attributes only) */
  capture?: boolean;

  /** Element aliases from <alias> */
  aliases?: string[];

  /** Bindable property declarations from <bindable> */
  bindables?: SerializedBindable[];

  /** Whether template contains a <slot> element */
  hasSlot?: boolean;
}

/**
 * Serialized bindable property from <bindable> meta element.
 */
export interface SerializedBindable {
  /** Property name */
  name: string;
  /** Binding mode override */
  mode?: string;
  /** HTML attribute name if different from property */
  attribute?: string;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- INSTRUCTION_TYPE used in typeof
import { INSTRUCTION_TYPE, type BindingModeValue } from "./constants.js";

/**
 * Serialized instruction using numeric type codes.
 * These match Aurelia's runtime instruction types (itXxx constants).
 */
export type SerializedInstruction =
  | SerializedPropertyBinding
  | SerializedInterpolation
  | SerializedTextBinding
  | SerializedListenerBinding
  | SerializedIteratorBinding
  | SerializedRefBinding
  | SerializedTranslationBinding
  | SerializedSetProperty
  | SerializedSetAttribute
  | SerializedHydrateElement
  | SerializedHydrateAttribute
  | SerializedHydrateTemplateController
  | SerializedHydrateLetElement;

export interface SerializedPropertyBinding {
  type: typeof INSTRUCTION_TYPE.propertyBinding;
  to: string;
  exprId: ExprId;
  mode: BindingModeValue;
}

export interface SerializedInterpolation {
  type: typeof INSTRUCTION_TYPE.interpolation;
  to: string;
  parts: string[];
  exprIds: ExprId[];
}

export interface SerializedTextBinding {
  type: typeof INSTRUCTION_TYPE.textBinding;
  parts: string[];
  exprIds: ExprId[];
}

export interface SerializedListenerBinding {
  type: typeof INSTRUCTION_TYPE.listenerBinding;
  to: string;
  exprId: ExprId;
  capture: boolean;
  modifier?: string;
}

export interface SerializedIteratorBinding {
  type: typeof INSTRUCTION_TYPE.iteratorBinding;
  to: string;
  exprId: ExprId;
  aux?: SerializedAuxBinding[];
}

export interface SerializedAuxBinding {
  name: string;
  exprId: ExprId;
}

export interface SerializedRefBinding {
  type: typeof INSTRUCTION_TYPE.refBinding;
  to: string;
  exprId: ExprId;
}

export interface SerializedTranslationBinding {
  type: typeof INSTRUCTION_TYPE.translation | typeof INSTRUCTION_TYPE.translationBind;
  /**
   * Expression source (mutually exclusive variants):
   * - PrimitiveLiteral AST for t="static.key"
   * - ExprId for t.bind="expr" (single expression)
   * - undefined when using parts/exprIds for interpolation
   */
  from?: ExprId | { $kind: "PrimitiveLiteral"; value: string };
  to: string;
  /**
   * Static parts between expressions (for interpolated keys like t="key.${expr}").
   * When present, `exprIds` must also be set.
   */
  parts?: string[];
  /**
   * Expression IDs for interpolated key (for t="key.${expr}").
   * When present, `parts` must also be set.
   */
  exprIds?: ExprId[];
}

export interface SerializedSetProperty {
  type: typeof INSTRUCTION_TYPE.setProperty;
  to: string;
  value: JsonValue;
}

export interface SerializedSetAttribute {
  type: typeof INSTRUCTION_TYPE.setAttribute;
  to: string;
  value: string | null;
}

export interface SerializedHydrateElement {
  type: typeof INSTRUCTION_TYPE.hydrateElement;
  res: string;
  instructions: SerializedInstruction[];
  containerless?: boolean;
}

export interface SerializedHydrateAttribute {
  type: typeof INSTRUCTION_TYPE.hydrateAttribute;
  res: string;
  alias?: string;
  instructions: SerializedInstruction[];
}

export interface SerializedHydrateTemplateController {
  type: typeof INSTRUCTION_TYPE.hydrateTemplateController;
  res: string;
  templateIndex: number;
  instructions: SerializedInstruction[];
}

export interface SerializedHydrateLetElement {
  type: typeof INSTRUCTION_TYPE.hydrateLetElement;
  /** Let bindings - wire format uses 'bindings', runtime translateInstruction converts to 'instructions' */
  bindings: SerializedLetBinding[];
  toBindingContext: boolean;
}

export interface SerializedLetBinding {
  to: string;
  exprId: ExprId;
}

/**
 * Serialized expression for the expression table.
 */
export interface SerializedExpression {
  id: ExprId;
  ast: AnyBindingExpression;
}

/* =============================================================================
 * PROVENANCE MAPPING
 * ============================================================================= */

/**
 * Mapping entry for provenance tracking.
 * Maps positions in generated output back to source template.
 */
export interface AotMappingEntry {
  /** Kind of mapped element */
  kind: "expr" | "node" | "binding" | "controller";

  /** Span in generated output (JSON position or similar) */
  outputSpan: TextSpan;

  /** Span in source template */
  sourceSpan: SourceSpan;

  /** Expression ID (for expr entries) */
  exprId?: ExprId;

  /** Node ID (for node entries) */
  nodeId?: NodeId;
}

/* =============================================================================
 * PLANNING OPTIONS
 * ============================================================================= */

import type { CompileTrace } from "../../shared/index.js";

/**
 * Options for AOT plan generation.
 */
export interface AotPlanOptions {
  /** Source file path (for provenance) */
  templateFilePath: string;

  /** Include source locations in plan nodes */
  includeLocations?: boolean;

  /** Optional trace for instrumentation */
  trace?: CompileTrace;
}
