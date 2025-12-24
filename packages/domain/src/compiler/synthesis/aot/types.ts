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
} from "../../model/index.js";

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
  | PlanRefBinding;

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
 * ============================================================================= */

export type PlanController =
  | PlanRepeatController
  | PlanIfController
  | PlanElseController
  | PlanWithController
  | PlanSwitchController
  | PlanCaseController
  | PlanDefaultCaseController
  | PlanPromiseController
  | PlanPortalController;

interface PlanControllerBase {
  /** Frame ID for this controller's scope */
  frameId: FrameId;

  /** Hydration target index for controller marker */
  targetIndex?: number;

  /** Source location */
  loc?: SourceSpan;
}

/**
 * Repeat controller (e.g., `repeat.for="item of items"`).
 */
export interface PlanRepeatController extends PlanControllerBase {
  kind: "repeat";

  /** Iterator expression ID (ForOfStatement in expr table) */
  iteratorExprId: ExprId;

  /** Loop variable name(s) - supports destructuring */
  locals: string[];

  /** Contextual variables ($index, $first, $last, etc.) */
  contextuals: string[];

  /** Key expression for efficient diffing (optional) */
  keyExprId?: ExprId;

  /** Inner template (repeated content) */
  template: PlanNode;
}

/**
 * If controller (e.g., `if.bind="condition"`).
 */
export interface PlanIfController extends PlanControllerBase {
  kind: "if";

  /** Condition expression ID */
  conditionExprId: ExprId;

  /** True branch template */
  template: PlanNode;
}

/**
 * Else controller (sibling to if controller).
 * Linked at runtime via Else.link() hook.
 */
export interface PlanElseController extends PlanControllerBase {
  kind: "else";

  /** Else branch template */
  template: PlanNode;
}

/**
 * With controller (e.g., `with.bind="object"`).
 * Creates a new scope with the value as the binding context.
 */
export interface PlanWithController extends PlanControllerBase {
  kind: "with";

  /** Value expression ID */
  valueExprId: ExprId;

  /** Inner template */
  template: PlanNode;
}

/**
 * Switch controller (e.g., `switch.bind="value"`).
 */
export interface PlanSwitchController extends PlanControllerBase {
  kind: "switch";

  /** Switch value expression ID */
  valueExprId: ExprId;

  /** Case and default-case controller children */
  cases: (PlanCaseController | PlanDefaultCaseController)[];
}

/**
 * Case branch within a switch controller.
 * @deprecated Use PlanCaseController instead - case/default-case are standalone controllers
 */
export interface PlanCaseBranch {
  /** Case value expression ID */
  valueExprId: ExprId;

  /** Case template */
  template: PlanNode;

  /** Frame ID if case introduces scope */
  frameId?: FrameId;

  /** Source location */
  loc?: SourceSpan;
}

/**
 * Case controller (child of switch, e.g., `case="value"`).
 * Standalone template controller, similar to else for if.
 */
export interface PlanCaseController extends PlanControllerBase {
  kind: "case";

  /** Case value expression ID */
  valueExprId: ExprId;

  /** Case template (content inside the case) */
  template: PlanNode;
}

/**
 * Default-case controller (child of switch, e.g., `default-case`).
 * Standalone template controller, similar to else for if.
 */
export interface PlanDefaultCaseController extends PlanControllerBase {
  kind: "default-case";

  /** Default case template (content inside the default case) */
  template: PlanNode;
}

/**
 * Promise controller (e.g., `promise.bind="asyncValue"`).
 */
export interface PlanPromiseController extends PlanControllerBase {
  kind: "promise";

  /** Promise expression ID */
  valueExprId: ExprId;

  /** Pending template (shown while promise is pending) */
  pendingTemplate?: PlanNode | undefined;

  /** Frame ID for pending branch */
  pendingFrameId?: FrameId | undefined;

  /** Then template (shown when promise resolves) */
  thenTemplate?: PlanNode | undefined;

  /** Local name for resolved value in then template */
  thenLocal?: string | undefined;

  /** Frame ID for then branch */
  thenFrameId?: FrameId | undefined;

  /** Catch template (shown when promise rejects) */
  catchTemplate?: PlanNode | undefined;

  /** Local name for error in catch template */
  catchLocal?: string | undefined;

  /** Frame ID for catch branch */
  catchFrameId?: FrameId | undefined;
}

/**
 * Portal controller (e.g., `portal="selector"`).
 * Renders content at a different location in the DOM.
 */
export interface PlanPortalController extends PlanControllerBase {
  kind: "portal";

  /** Target expression ID (dynamic target) */
  targetExprId?: ExprId;

  /** Target selector (static target) */
  targetSelector?: string;

  /** Portaled content template */
  template: PlanNode;
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
}

import { INSTRUCTION_TYPE, BINDING_MODE, type BindingModeValue } from "./constants.js";

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
  resource: string;
  instructions: SerializedInstruction[];
  containerless?: boolean;
}

export interface SerializedHydrateAttribute {
  type: typeof INSTRUCTION_TYPE.hydrateAttribute;
  resource: string;
  alias?: string;
  instructions: SerializedInstruction[];
}

export interface SerializedHydrateTemplateController {
  type: typeof INSTRUCTION_TYPE.hydrateTemplateController;
  resource: string;
  templateIndex: number;
  instructions: SerializedInstruction[];
}

export interface SerializedHydrateLetElement {
  type: typeof INSTRUCTION_TYPE.hydrateLetElement;
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

/**
 * Options for AOT plan generation.
 */
export interface AotPlanOptions {
  /** Source file path (for provenance) */
  templateFilePath: string;

  /** Include source locations in plan nodes */
  includeLocations?: boolean;
}
