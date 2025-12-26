/**
 * Transform Package - Model Types
 *
 * Canonical resource model that normalizes all Aurelia declaration forms
 * into a unified representation for transformation.
 */

import type { AotCodeResult, SerializedDefinition, SerializedExpression } from "@aurelia-ls/compiler";

/* =============================================================================
 * RESOURCE TYPES
 * ============================================================================= */

/**
 * Base resource definition shared by all resource types.
 */
export interface ResourceDefinitionBase {
  /** Resource kind */
  kind: ResourceKind;

  /** Resource name (kebab-case for elements/attributes) */
  name: string;

  /** Original class name */
  className: string;

  /** Declaration form used to define this resource */
  declarationForm: DeclarationForm;
}

export type ResourceKind =
  | "custom-element"
  | "custom-attribute"
  | "value-converter"
  | "binding-behavior"
  | "template-controller";

export type DeclarationForm =
  | "decorator"           // @customElement(), @customAttribute(), etc.
  | "decorator-config"    // @customElement({ name, template, ... })
  | "static-au"           // static $au = { ... }
  | "convention";         // *CustomElement, *ValueConverter suffix

/* =============================================================================
 * CUSTOM ELEMENT
 * ============================================================================= */

/**
 * Custom element definition.
 */
export interface CustomElementDefinition extends ResourceDefinitionBase {
  kind: "custom-element";

  /** Bindable properties */
  bindables: BindableDefinition[];

  /** Template source (inline, imported, or external file path) */
  template?: TemplateSource;

  /** Whether element renders containerless */
  containerless?: boolean;

  /** Shadow DOM options */
  shadowOptions?: ShadowDOMOptions;

  /** Static dependencies */
  dependencies?: string[];
}

export interface BindableDefinition {
  /** Property name */
  name: string;

  /** Attribute name (if different from property) */
  attribute?: string;

  /** Binding mode */
  mode?: BindingMode;

  /** Whether this is the primary bindable */
  primary?: boolean;

  /** Default value */
  default?: unknown;
}

export type BindingMode =
  | "default"
  | "oneTime"
  | "toView"
  | "fromView"
  | "twoWay";

export interface TemplateSource {
  /** Template source type */
  type: "inline" | "imported" | "external";

  /** Inline template string */
  content?: string;

  /** Import identifier (for imported templates) */
  importName?: string;

  /** External file path (for convention-based) */
  filePath?: string;
}

export interface ShadowDOMOptions {
  mode: "open" | "closed";
}

/* =============================================================================
 * CUSTOM ATTRIBUTE
 * ============================================================================= */

/**
 * Custom attribute definition.
 */
export interface CustomAttributeDefinition extends ResourceDefinitionBase {
  kind: "custom-attribute" | "template-controller";

  /** Bindable properties */
  bindables: BindableDefinition[];

  /** Whether this is a template controller */
  isTemplateController: boolean;

  /** Aliases for the attribute */
  aliases?: string[];
}

/* =============================================================================
 * VALUE CONVERTER & BINDING BEHAVIOR
 * ============================================================================= */

/**
 * Value converter definition.
 */
export interface ValueConverterDefinition extends ResourceDefinitionBase {
  kind: "value-converter";
}

/**
 * Binding behavior definition.
 */
export interface BindingBehaviorDefinition extends ResourceDefinitionBase {
  kind: "binding-behavior";
}

/* =============================================================================
 * UNION TYPE
 * ============================================================================= */

export type ResourceDefinition =
  | CustomElementDefinition
  | CustomAttributeDefinition
  | ValueConverterDefinition
  | BindingBehaviorDefinition;

/* =============================================================================
 * TRANSFORM INPUT/OUTPUT
 * ============================================================================= */

/**
 * Input to the transform process.
 */
export interface TransformInput {
  /** Original TypeScript/JavaScript source code */
  source: string;

  /** File path (for error messages and source maps) */
  filePath: string;

  /** AOT compilation result from AOT compiler */
  aot: AotCodeResult;

  /** Resource definition (from resolution or inferred) */
  resource: ResourceDefinition;
}

/**
 * Result of a transformation.
 */
export interface TransformResult {
  /** Transformed source code */
  code: string;

  /** Source map (if requested) */
  map?: SourceMap;

  /** Warnings encountered during transformation */
  warnings: TransformWarning[];
}

/**
 * Source map in standard format.
 */
export interface SourceMap {
  version: 3;
  file: string;
  sourceRoot?: string;
  sources: string[];
  sourcesContent?: (string | null)[];
  names: string[];
  mappings: string;
}

/**
 * Warning from transformation.
 */
export interface TransformWarning {
  /** Warning code */
  code: string;

  /** Human-readable message */
  message: string;

  /** Line number (1-based) */
  line?: number;

  /** Column number (0-based) */
  column?: number;
}

/* =============================================================================
 * EMIT OPTIONS
 * ============================================================================= */

/**
 * Options for emitting JavaScript source.
 */
export interface EmitOptions {
  /** Component/resource name */
  name: string;

  /** Class name (for variable prefixes) */
  className: string;

  /** Indentation string (default: "  ") */
  indent?: string;

  /** Include expression table as separate const */
  includeExpressionTable?: boolean;

  /** Format for expression references */
  expressionFormat?: "inline" | "table-reference";
}

/**
 * Result of emitting JavaScript source.
 */
export interface EmitResult {
  /** Expression table source (if separate) */
  expressionTable?: string;

  /** Nested definition sources (for template controllers) */
  nestedDefinitions: string[];

  /** Main $au definition source */
  definition: string;

  /** Combined source (all parts) */
  combined: string;
}
