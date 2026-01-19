/* =======================================================================================
 * IR & AST MODEL (editor-agnostic)
 * ---------------------------------------------------------------------------------------
 * - Brands & spans
 * - Static DOM tree
 * - Binding sources (ExprRef / InterpIR)
 * - Instruction IR (bindings, setters, controllers, <let>, rows)
 * - Module/template containers
 * - Expression AST (for analysis/planning)
 * - Expression table entry (dev/LSP lane)
 * ======================================================================================= */

/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ExprId, Namespace, NodeId, TemplateId, SourceFileId, NormalizedPath, UriString } from "./identity.js";
import type { Origin, Provenance } from "./origin.js";
import type { SourceSpan, TextSpan } from "./span.js";
import type { CompilerDiagnostic } from "./diagnostics.js";

export type { ExprId, Namespace, NodeId, TemplateId, SourceFileId, NormalizedPath, UriString } from "./identity.js";
export type { SourceSpan, TextSpan } from "./span.js";

export type JsonValue =
  | null | boolean | number | string
  | JsonValue[] | { [k: string]: JsonValue };

/* ===========================
 * DOM tree (static markup)
 * =========================== */

export type NodeKind = 'element' | 'text' | 'comment' | 'template';

export interface BaseNode {
  kind: NodeKind;
  id: NodeId;
  ns: Namespace;
  loc?: SourceSpan | null;
}

export interface Attr {
  name: string;         // authored (case preserved)
  value: string | null; // null for boolean attrs
  // NOTE: For HTML, authoring case is preserved here; normalization happens later.
  caseSensitive?: boolean;
  /** Full attribute span (name + optional value). */
  loc?: SourceSpan | null;
  /** Attribute name-only span. */
  nameLoc?: SourceSpan | null;
  /** Attribute value-only span (inside quotes). */
  valueLoc?: SourceSpan | null;
}

export interface ElementNode extends BaseNode {
  kind: 'element';
  tag: string;           // lower-case for HTML; preserved for SVG/MathML
  attrs: Attr[];         // static attrs only
  children: DOMNode[];
  selfClosed?: boolean;
  /** Tag name span for the opening tag. */
  tagLoc?: SourceSpan | null;
  /** Tag name span for the closing tag, if present. */
  closeTagLoc?: SourceSpan | null;
  /** End of opening tag (`>`). */
  openTagEnd?: SourceSpan | null;
}

// NOTE: Each TemplateIR has a synthetic fragment root (this node) with id '0'.
export interface TemplateNode extends BaseNode {
  kind: 'template';
  attrs: Attr[];
  children: DOMNode[];
  /** Tag name span for the opening tag (always "template" when present). */
  tagLoc?: SourceSpan | null;
  /** Tag name span for the closing tag, if present. */
  closeTagLoc?: SourceSpan | null;
  /** End of opening tag (`>`). */
  openTagEnd?: SourceSpan | null;
}

export interface TextNode extends BaseNode {
  kind: 'text';
  text: string;
}

export interface CommentNode extends BaseNode {
  kind: 'comment';
  text: string;
}

export type DOMNode = ElementNode | TemplateNode | TextNode | CommentNode;

/* =========================================
 * Expressions (IR references to AST entries)
 * ========================================= */

export interface ExprRef {
  id: ExprId;
  code: string; // exact authored text
  loc?: SourceSpan | null;
}

export interface InterpIR {
  kind: 'interp';
  parts: string[];   // parts.length = exprs.length + 1
  exprs: ExprRef[];
  loc?: SourceSpan | null;
}

export type BindingSourceIR = ExprRef | InterpIR;

/* ===========================
 * Binding modes (runtime)
 * =========================== */

// NOTE: 'default' is resolved to an effective mode during Semantics linking.
export type BindingMode = 'default' | 'oneTime' | 'toView' | 'fromView' | 'twoWay';

/* ====================================
 * repeat.for declaration convenience
 * ==================================== */

// Analysis uses ForOfStatement via expr table; IR also carries a lighter ForOfIR.
export interface ForOfIR {
  /**
   * ExprId of the parsed repeat header (`lhs of rhs`) in the module expr table.
   * Normally this points at a ForOfStatement; if parsing the header fails,
   * the corresponding entry will be a BadExpression instead.
   */
  astId: ExprId;
  /** Authored expression text for human-readable output (e.g., "item of items"). */
  code: string;
  loc?: SourceSpan | null;
}



/* ===========================
 * Instruction IR (slim set)
 * =========================== */

/** Bindables attach to elements/attributes/controllers via `props`. */
export interface PropertyBindingIR {
  type: 'propertyBinding';
  to: string;
  from: BindingSourceIR;
  mode: BindingMode;
  loc?: SourceSpan | null;
}

export interface SetPropertyIR {
  type: 'setProperty';
  to: string;
  value: JsonValue;
  loc?: SourceSpan | null;
}

export interface AttributeBindingIR {
  type: 'attributeBinding';
  attr: string; // raw attr
  to: string;   // normalized target
  from: BindingSourceIR;
  loc?: SourceSpan | null;
}

export interface StylePropertyBindingIR {
  type: 'stylePropertyBinding';
  to: string; // CSS prop
  from: BindingSourceIR;
  loc?: SourceSpan | null;
}

// TODO: Only used for grouped aux. Not fully parsed yet.
/** Multi-attribute group container (e.g., repeat key.bind or iterator tail `; name: value`). */
export interface MultiAttrIR {
  type: 'multiAttr';
  to: string;
  command?: string | null;              // 'bind', 'from-view', ...
  from?: BindingSourceIR | null;        // parsed expression or interpolation
  value?: string | null;                // raw group text if helpful
  loc?: SourceSpan | null;
}

// NOTE: Semantics.repeat.iteratorProp defines the canonical name (typically 'items').
/** Iterator binding used by the repeat template controller. */
export interface IteratorBindingIR {
  type: 'iteratorBinding';
  to: string;           // usually 'items'
  forOf: ForOfIR;
  /** Optional tail props parsed from `repeat.for="lhs of rhs; name: value"`. */
  props?: MultiAttrIR[] | null;
  loc?: SourceSpan | null;
}

/** <let foo.bind='...'> */
export interface LetBindingIR {
  type: 'letBinding';
  to: string;
  from: BindingSourceIR;
  loc?: SourceSpan | null;
}

/** Text interpolation binding for a text node. */
export interface TextBindingIR {
  type: 'textBinding';
  from: BindingSourceIR;
  loc?: SourceSpan | null;
}

// TODO: capture/modifier are not normalized (e.g., passive/once); Event options left to runtime for MVP.
/** Event listener binding (click.trigger etc.). */
export interface ListenerBindingIR {
  type: 'listenerBinding';
  to: string;        // event name
  from: ExprRef;     // handler
  capture?: boolean;
  modifier?: string | null; // single modifier for MVP
  loc?: SourceSpan | null;
}

// TODO: Distinguish element vs view-model refs once ElementRes gains instance type info.
/** ref='eltOrVmRef' */
export interface RefBindingIR {
  type: 'refBinding';
  to: string;
  from: ExprRef; // often just an identifier
  loc?: SourceSpan | null;
}

/**
 * Translation binding for i18n (t="key" or t.bind="expr").
 * Produced by the `t` and `t.bind` binding commands from @aurelia/i18n.
 *
 * When `isExpression: true` (t.bind), `from` contains the parsed expression.
 * When `isExpression: false` (t), `keyValue` contains the literal translation key.
 */
export interface TranslationBindingIR {
  type: 'translationBinding';
  /** Target attribute/property to set with translated value (empty string = textContent) */
  to: string;
  /** Expression source (only when isExpression: true) */
  from?: BindingSourceIR;
  /** Literal translation key (only when isExpression: false) */
  keyValue?: string;
  /** Whether value is expression (t.bind) vs literal key (t) */
  isExpression: boolean;
  loc?: SourceSpan | null;
}

/** Static attributes (no binding). */
export interface SetAttributeIR {
  type: 'setAttribute';
  to: string;
  value: string | null;
  loc?: SourceSpan | null;
}
export interface SetClassAttributeIR {
  type: 'setClassAttribute';
  value: string;
  loc?: SourceSpan | null;
}
export interface SetStyleAttributeIR {
  type: 'setStyleAttribute';
  value: string;
  loc?: SourceSpan | null;
}

/* ---- Context-constrained bindable subsets ---- */

export type ElementBindableIR =
  | PropertyBindingIR
  | SetPropertyIR
  | AttributeBindingIR
  | StylePropertyBindingIR
  | MultiAttrIR;

/**
 * Bindable types that can appear in custom attribute props.
 * Narrower than ElementBindableIR because lowering only produces these three
 * types for custom attributes (via lowerBindable/parseMultiBindings).
 * StylePropertyBindingIR goes on element tail, MultiAttrIR is for repeat tail.
 */
export type AttributeBindableIR =
  | PropertyBindingIR
  | SetPropertyIR
  | AttributeBindingIR;

export type ControllerBindableIR =
  | PropertyBindingIR
  | SetPropertyIR
  | AttributeBindingIR
  | StylePropertyBindingIR
  | MultiAttrIR
  | IteratorBindingIR; // only valid on repeat template controller

/* ---- Hydration instructions ---- */

// NOTE: Not emitted by the current builder (kept for parity with runtime compiler). Linker may ignore for MVP.
export interface HydrateElementIR {
  type: 'hydrateElement';
  res: string;
  props: ElementBindableIR[];
  projections?: { slot?: string | null; def: TemplateIR }[];
  containerless?: boolean;
  /** Optional hoisted static data for CE bindables; if present, remove from ElementNode.attrs to avoid duplication. */
  data?: Record<string, string | null>;
  loc?: SourceSpan | null;
}

// NOTE: Not emitted by the current builder (placeholder for future custom attributes).
export interface HydrateAttributeIR {
  type: 'hydrateAttribute';
  res: string;
  props: AttributeBindableIR[];
  alias?: string | null;
  data?: Record<string, string | null>;
  loc?: SourceSpan | null;
}

/* ---- Template controllers & branches ---- */

/**
 * Built-in template controller resource names.
 * Custom template controllers can use any string name.
 */
export type BuiltinTemplateControllerRes = 'repeat' | 'with' | 'if' | 'else' | 'switch' | 'promise' | 'portal' | 'case' | 'default-case';

/**
 * Template controller resource name.
 * Includes built-in controllers plus any custom TC name (string).
 */
export type TemplateControllerRes = BuiltinTemplateControllerRes | (string & {});

export type TemplateControllerAlias = 'then' | 'catch' | 'case' | 'default';

export type ControllerBranchInfo =
  | { kind: 'then';    local?: string | null } // promise then (receives resolved value)
  | { kind: 'catch';   local?: string | null } // promise catch (receives error)
  | { kind: 'pending' }                        // promise pending (no alias - shown while awaiting)
  | { kind: 'case';    expr: ExprRef }         // switch case with expression
  | { kind: 'default' };                       // switch default

// For promise/switch, branch alias/local is represented structurally via `branch`.
export interface HydrateTemplateControllerIR {
  type: 'hydrateTemplateController';
  res: TemplateControllerRes; // e.g., 'repeat', 'if', 'with', or custom TC name
  def: TemplateIR;            // nested template/view
  props: ControllerBindableIR[];
  alias?: TemplateControllerAlias | null; // branch alias when applicable (informational)
  branch?: ControllerBranchInfo | null;   // structural branch payload (then/catch/case/default)
  containerless?: boolean;
  loc?: SourceSpan | null;
}

/** Hydrate a <let> element; instructions are strictly LetBindingIR. */
export interface HydrateLetElementIR {
  type: 'hydrateLetElement';
  instructions: LetBindingIR[];
  toBindingContext: boolean;
  loc?: SourceSpan | null;
}

/* ---- Per-node instruction rows ---- */

export type InstructionIR =
  | HydrateTemplateControllerIR
  | HydrateElementIR
  | HydrateAttributeIR
  | HydrateLetElementIR
  | PropertyBindingIR
  | SetPropertyIR
  | IteratorBindingIR
  | RefBindingIR
  | LetBindingIR
  | TextBindingIR
  | ListenerBindingIR
  | AttributeBindingIR
  | StylePropertyBindingIR
  | TranslationBindingIR
  | SetAttributeIR
  | SetClassAttributeIR
  | SetStyleAttributeIR;

// NOTE: target NodeId is template-local; rows belong to their owning TemplateIR.
export interface InstructionRow {
  target: NodeId;                 // DOM node that receives/hosts these instructions
  instructions: InstructionIR[];  // deterministic order
}

/* ===========================
 * Module & Template
 * =========================== */

/* ===========================
 * IR Diagnostics
 * =========================== */

/**
 * IR-level diagnostic codes (lowering phase).
 *
 * Code ranges:
 * - AU07xx: Template compilation errors (matches runtime template-compiler)
 */
export type IrDiagCode =
  | "AU0704"  // Invalid <let> command (must be property-kind command from config)
  | "AU0705"; // Unknown binding command

export type IrDiagnostic = CompilerDiagnostic<IrDiagCode>;

/* ===========================
 * Module container
 * =========================== */

/** Root-level compiled unit: templates + shared expression table. */
export interface IrModule {
  version: 'aurelia-ir@1';
  templates: TemplateIR[];
  /** Optional shared sidecar for dev/LSP; can be stripped for shipping. */
  exprTable?: ExprTableEntry[];
  /** Optional diagnostics from lowering phase. */
  diags?: IrDiagnostic[];
  name?: string;
  meta?: Record<string, unknown>;
}

export interface TemplateHostRef {
  templateId: TemplateId;
  nodeId: NodeId;
}

export type TemplateOrigin =
  | { kind: "controller"; host: TemplateHostRef };

// NOTE: Nested TemplateIR instances appear under controllers; their NodeIds start at '0' independently.
/** Each template has a synthetic fragment root (<template>-like) as `dom`. */
export interface TemplateIR {
  /** Stable identifier for this template within the module. */
  id?: TemplateId;
  dom: TemplateNode; // root with children = top-level nodes
  rows: InstructionRow[];
  name?: string;
  /**
   * Extracted meta elements (<import>, <bindable>, etc.).
   * Only present on root templates (not nested TC templates).
   * These elements are stripped from `dom` but preserved here for:
   * - AOT code generation
   * - LSP features
   * - Refactoring
   */
  templateMeta?: TemplateMetaIR;
  /** Provenance for nested templates (e.g., template controllers). */
  origin?: TemplateOrigin;
}

/* ===========================
 * Expression AST
 * =========================== */

export type UnaryOperator = 'void' | 'typeof' | '!' | '-' | '+' | '++' | '--';
export type BinaryOperator =
  | '??' | '&&' | '||'
  | '==' | '===' | '!=' | '!=='
  | 'instanceof' | 'in'
  | '+' | '-' | '*' | '/' | '%' | '**'
  | '<' | '>' | '<=' | '>=' ;
export type AssignmentOperator = '=' | '/=' | '*=' | '+=' | '-=';

export type IsPrimary =
  | AccessThisExpression
  | AccessBoundaryExpression
  | AccessScopeExpression
  | AccessGlobalExpression
  | ArrayLiteralExpression
  | ObjectLiteralExpression
  | ParenExpression
  | PrimitiveLiteralExpression
  | TemplateExpression
  | NewExpression
  | CustomExpression
  | BadExpression;

export type IsLeftHandSide =
  | IsPrimary
  | CallGlobalExpression
  | CallFunctionExpression
  | CallMemberExpression
  | CallScopeExpression
  | AccessMemberExpression
  | AccessKeyedExpression
  | TaggedTemplateExpression
  | BadExpression;

export type IsUnary = IsLeftHandSide | UnaryExpression | BadExpression;
export type IsBinary = IsUnary | BinaryExpression | BadExpression;
export type IsConditional = IsBinary | ConditionalExpression | BadExpression;
export type IsAssign = IsConditional | AssignExpression | ArrowFunction | DestructuringAssignmentExpression | BadExpression;
export type IsValueConverter = IsAssign | ValueConverterExpression;
export type IsBindingBehavior = IsValueConverter | BindingBehaviorExpression;
export type IsAssignable = AccessScopeExpression | AccessKeyedExpression | AccessMemberExpression | AssignExpression;
export type BindingPattern =
  | BindingIdentifier
  | BindingPatternDefault
  | BindingPatternHole
  | ArrayBindingPattern
  | ObjectBindingPattern
  | BadExpression;
export type BindingIdentifierOrPattern = BindingPattern;
export type IsExpression = IsBindingBehavior | Interpolation;
export type AnyBindingExpression =
  | Interpolation
  | ForOfStatement
  | CustomExpression
  | IsBindingBehavior
  | BadExpression;

/* ---- AST nodes ---- */

export interface Identifier {
  $kind: 'Identifier';
  span: SourceSpan;
  name: string;
}

export interface BindingBehaviorExpression {
  $kind: 'BindingBehavior';
  span: SourceSpan;
  expression: IsBindingBehavior;
  name: Identifier;
  args: IsAssign[];
}

export interface ValueConverterExpression {
  $kind: 'ValueConverter';
  span: SourceSpan;
  expression: IsValueConverter;
  name: Identifier;
  args: IsAssign[];
}

export interface AssignExpression {
  $kind: 'Assign';
  span: SourceSpan;
  target: IsAssignable;
  value: IsAssign;
  op: AssignmentOperator;
}

export interface ConditionalExpression {
  $kind: 'Conditional';
  span: SourceSpan;
  condition: IsBinary;
  yes: IsAssign;
  no: IsAssign;
}

export interface AccessGlobalExpression {
  $kind: 'AccessGlobal';
  span: SourceSpan;
  name: Identifier;
}

export interface AccessThisExpression {
  $kind: 'AccessThis';
  span: SourceSpan;
  ancestor: number;
}

export interface AccessBoundaryExpression {
  $kind: 'AccessBoundary';
  span: SourceSpan;
}

export interface AccessScopeExpression {
  $kind: 'AccessScope';
  span: SourceSpan;
  name: Identifier;
  ancestor: number;
}

export interface AccessMemberExpression {
  $kind: 'AccessMember';
  span: SourceSpan;
  object: IsLeftHandSide;
  name: Identifier;
  optional: boolean;
}

export interface AccessKeyedExpression {
  $kind: 'AccessKeyed';
  span: SourceSpan;
  object: IsLeftHandSide;
  key: IsAssign;
  optional: boolean;
}

export interface ParenExpression {
  $kind: 'Paren';
  span: SourceSpan;
  expression: IsAssign;
}

export interface NewExpression {
  $kind: 'New';
  span: SourceSpan;
  func: IsLeftHandSide;
  args: IsAssign[];
}

export interface CallScopeExpression {
  $kind: 'CallScope';
  span: SourceSpan;
  name: Identifier;
  args: IsAssign[];
  ancestor: number;
  optional: boolean;
}

export interface CallMemberExpression {
  $kind: 'CallMember';
  span: SourceSpan;
  object: IsLeftHandSide;
  name: Identifier;
  args: IsAssign[];
  optionalMember: boolean;
  optionalCall: boolean;
}

export interface CallFunctionExpression {
  $kind: 'CallFunction';
  span: SourceSpan;
  func: IsLeftHandSide;
  args: IsAssign[];
  optional: boolean;
}

export interface CallGlobalExpression {
  $kind: 'CallGlobal';
  span: SourceSpan;
  name: Identifier;
  args: IsAssign[];
}

export interface BinaryExpression {
  $kind: 'Binary';
  span: SourceSpan;
  operation: BinaryOperator;
  left: IsBinary;
  right: IsBinary;
}

export interface UnaryExpression {
  $kind: 'Unary';
  span: SourceSpan;
  operation: UnaryOperator;
  expression: IsUnary;
  pos: 0 | 1; // 0: prefix, 1: suffix
}

export interface PrimitiveLiteralExpression {
  $kind: 'PrimitiveLiteral';
  span: SourceSpan;
  value: null | undefined | number | boolean | string;
}

export interface ArrayLiteralExpression {
  $kind: 'ArrayLiteral';
  span: SourceSpan;
  elements: IsAssign[];
}

export interface ObjectLiteralExpression {
  $kind: 'ObjectLiteral';
  span: SourceSpan;
  keys: (number | string)[];
  values: IsAssign[];
}

export interface TemplateExpression {
  $kind: 'Template';
  span: SourceSpan;
  cooked: string[];
  expressions: IsAssign[];
}

export interface TaggedTemplateExpression {
  $kind: 'TaggedTemplate';
  span: SourceSpan;
  cooked: (string[] & { raw?: string[] });
  func: IsLeftHandSide;
  expressions: IsAssign[];
}

export interface BindingIdentifier {
  $kind: 'BindingIdentifier';
  span: SourceSpan;
  name: Identifier;
}

// Kept in expr table for precise scoping of repeat; IR also carries a lighter ForOfIR.
export interface ForOfStatement {
  $kind: 'ForOfStatement';
  span: SourceSpan;
  declaration: BindingIdentifierOrPattern;
  iterable: IsBindingBehavior;
  semiIdx: number;
}

// Text interpolation is lowered to TextBindingIR with InterpIR (parts + expr refs).
export interface Interpolation {
  $kind: 'Interpolation';
  span: SourceSpan;
  parts: string[];
  expressions: IsBindingBehavior[];
}

export interface BindingPatternDefault {
  $kind: 'BindingPatternDefault';
  span: SourceSpan;
  target: BindingPattern;
  default: IsAssign;
}

export interface BindingPatternHole {
  $kind: 'BindingPatternHole';
  span: SourceSpan;
}

export interface ArrayBindingPattern {
  $kind: 'ArrayBindingPattern';
  span: SourceSpan;
  elements: BindingPattern[];
  rest?: BindingPattern | null;
}

export interface ObjectBindingPatternProperty {
  key: string | number;
  value: BindingPattern;
}

export interface ObjectBindingPattern {
  $kind: 'ObjectBindingPattern';
  span: SourceSpan;
  properties: ObjectBindingPatternProperty[];
  rest?: BindingPattern | null;
}

export interface DestructuringAssignmentExpression {
  $kind: 'DestructuringAssignment';
  span: SourceSpan;
  pattern: BindingPattern;
  source: IsAssign;
}

export interface ArrowFunction {
  $kind: 'ArrowFunction';
  span: SourceSpan;
  args: BindingIdentifier[];
  body: IsAssign;
  rest: boolean;
}

export interface BadExpression {
  $kind: 'BadExpression';
  span: SourceSpan;
  /** Raw text of the segment that failed to parse (optional). */
  text?: string;
  /** Human-readable parser message (optional). */
  message?: string;
  /** Optional provenance for diagnostics (parse failures, etc.). */
  origin?: Origin | Provenance | null;
  /**
   * Tooling note: LSP/overlay emitters may recover by emitting a TS-safe placeholder
   * mapped to this span (and surfacing a parser diagnostic) to keep overlays valid
   * while still pointing squiggles at the template location.
   */
}

/**
 * Plugin-owned expression (e.g. i18n, custom binding commands).
 * In the future, lowerer may wrap a binding in CustomExpression instead of parsing it.
 * Tooling / analyzers should treat `value` as opaque and not descend into it.
 */
export interface CustomExpression {
  $kind: 'Custom';
  span: SourceSpan;
  value: unknown;
}

export type ExpressionType =
  | 'IsProperty'
  | 'IsFunction'
  | 'IsIterator'
  | 'Interpolation'
  | 'IsCustom';


/* ===========================================
 * Expression Table (module-level, dev/LSP)
 * =========================================== */

type ExprTableEntry_T<TType extends ExpressionType, TAst> = {
  id: ExprId;
  expressionType: TType;
  ast: TAst;
};

export type ExprTableEntry =
  | ExprTableEntry_T<'IsProperty' | 'IsFunction', IsBindingBehavior>
  | ExprTableEntry_T<'Interpolation', Interpolation>
  | ExprTableEntry_T<'IsIterator', ForOfStatement | BadExpression>
  | ExprTableEntry_T<'IsCustom', CustomExpression>;

/* ===========================================
 * Template Meta Elements
 * -------------------------------------------
 * HTML-based component configuration:
 * <import>, <require>, <bindable>, <use-shadow-dom>,
 * <containerless>, <capture>, <alias>
 *
 * These elements are stripped from output but need
 * full provenance for LSP features and refactoring.
 * =========================================== */

/**
 * Source-located value — the fundamental provenance unit.
 * Every piece of syntax that could be navigated to, hovered,
 * diagnosed, renamed, or refactored needs its own span.
 */
export interface Located<T> {
  value: T;
  loc: SourceSpan;
  /** Attribute name span for attribute-backed values. */
  nameLoc?: SourceSpan | null;
}

/**
 * Base interface for all meta elements.
 * Every meta element needs element-level and tag-level provenance
 * for refactoring actions like "move to TypeScript definition".
 */
export interface MetaElementBase {
  /** Full element span (start tag through end tag, or self-closing tag) */
  elementLoc: SourceSpan;
  /** Just the tag name span (e.g., "import" within <import>) */
  tagLoc: SourceSpan;
}

/**
 * <import from="./path"> or <require from="./path">
 *
 * Declares a local dependency for the component.
 * Maps to `dependencies[]` in CustomElementDefinition.
 *
 * Forms:
 * - `<import from="./foo">` — import all exports
 * - `<import from="./foo" as="bar">` — alias default export
 * - `<import from="./foo" Baz.as="qux">` — alias named export
 */
export interface ImportMetaIR extends MetaElementBase {
  /** 'import' or 'require' (require is legacy alias) */
  kind: 'import' | 'require';
  /** Module specifier from `from="..."` attribute */
  from: Located<string>;
  /** Default export alias from `as="..."` attribute */
  defaultAlias: Located<string> | null;
  /** Named export aliases from `X.as="Y"` attributes */
  namedAliases: Array<{
    /** The export name (X in X.as="Y") */
    exportName: Located<string>;
    /** The ".as" span inside the attribute name. */
    asLoc?: SourceSpan | null;
    /** The alias (Y in X.as="Y") */
    alias: Located<string>;
  }>;
}

/**
 * <bindable name="value" mode="two-way" attribute="value">
 *
 * Declares a bindable property for the component.
 * Maps to `bindables[]` in CustomElementDefinition.
 */
export interface BindableMetaIR extends MetaElementBase {
  /** Property name (required) */
  name: Located<string>;
  /** Binding mode: one-time, one-way, to-view, from-view, two-way */
  mode: Located<string> | null;
  /** HTML attribute name if different from property name */
  attribute: Located<string> | null;
}

/**
 * <use-shadow-dom> or <use-shadow-dom mode="open|closed">
 *
 * Enables shadow DOM for the component.
 * Maps to `shadowOptions` in CustomElementDefinition.
 */
export interface ShadowDomMetaIR extends MetaElementBase {
  /** Shadow DOM mode: 'open' (default) or 'closed' */
  mode: Located<'open' | 'closed'>;
}

/**
 * <alias name="foo"> or <alias name="foo, bar">
 *
 * Declares alternative names for the component.
 * Maps to `aliases[]` in CustomElementDefinition.
 */
export interface AliasMetaIR extends MetaElementBase {
  /** Alias names (may be comma-separated in source, stored individually) */
  names: Located<string>[];
}

/**
 * <containerless>
 *
 * Makes the component containerless (no wrapper element in DOM).
 * Maps to `containerless: true` in CustomElementDefinition.
 */
export type ContainerlessMetaIR = MetaElementBase;

/**
 * <capture>
 *
 * Enables capture mode for custom attributes.
 * Maps to `capture: true` in CustomAttributeDefinition.
 */
export type CaptureMetaIR = MetaElementBase;

/**
 * All meta elements extracted from a template.
 * Stripped from output HTML but preserved in IR for:
 * - AOT code generation (dependencies, definition properties)
 * - LSP features (semantic tokens, navigation, hover, diagnostics)
 * - Refactoring (move to TypeScript, project-wide transforms)
 */
export interface TemplateMetaIR {
  /** <import> and <require> elements */
  imports: ImportMetaIR[];
  /** <bindable> elements */
  bindables: BindableMetaIR[];
  /** <use-shadow-dom> element (at most one) */
  shadowDom: ShadowDomMetaIR | null;
  /** <alias> elements */
  aliases: AliasMetaIR[];
  /** <containerless> element (at most one) */
  containerless: ContainerlessMetaIR | null;
  /** <capture> element (at most one) */
  capture: CaptureMetaIR | null;
  /** Whether a <slot> element was found (affects hasSlot in definition) */
  hasSlot: boolean;
}
