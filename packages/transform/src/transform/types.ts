/**
 * Transform Package - Transform Types
 *
 * Core types for the transformation pipeline.
 */

import type { AotCodeResult, NestedTemplateHtmlNode } from "@aurelia-ls/compiler";
import type { ResourceDefinition } from "../model/types.js";
import type { TypedSourceEdit } from "../ts/types.js";

/* =============================================================================
 * TRANSFORM OPTIONS
 * ============================================================================= */

/**
 * Options for transforming a source file.
 */
export interface TransformOptions {
  /** Source code to transform */
  source: string;

  /** File path (for error messages) */
  filePath: string;

  /** AOT compilation result from AOT compiler */
  aot: AotCodeResult;

  /** Resource definition */
  resource: ResourceDefinition;

  /** Template HTML (from emitTemplate or provided separately) */
  template: string;

  /** Nested template HTML tree (for template controllers) */
  nestedHtmlTree?: NestedTemplateHtmlNode[];

  /** Indentation string (default: "  ") */
  indent?: string;

  /** Whether to remove decorators (default: true) */
  removeDecorators?: boolean;

  /** Whether to include comments in generated code */
  includeComments?: boolean;

  /** Source map options */
  sourceMap?: SourceMapOptions | boolean;
}

/**
 * Source map generation options.
 */
export interface SourceMapOptions {
  /** Include source content in map */
  includeContent?: boolean;

  /** Source root for relative paths */
  sourceRoot?: string;
}

/* =============================================================================
 * TRANSFORM RESULT
 * ============================================================================= */

/**
 * Result of a transformation.
 */
export interface TransformResult {
  /** Transformed source code */
  code: string;

  /** Source map (if requested) */
  map?: SourceMapResult;

  /** Edits that were applied */
  edits: TypedSourceEdit[];

  /** Warnings from transformation */
  warnings: TransformWarning[];

  /** Metadata about the transformation */
  meta: TransformMeta;
}

/**
 * Source map in standard format.
 */
export interface SourceMapResult {
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

  /** File path */
  file?: string;

  /** Line number (1-based) */
  line?: number;

  /** Column number (0-based) */
  column?: number;
}

/**
 * Metadata about the transformation.
 */
export interface TransformMeta {
  /** Class name that was transformed */
  className: string;

  /** Resource name */
  resourceName: string;

  /** Resource type */
  resourceType: "custom-element" | "custom-attribute" | "value-converter" | "binding-behavior";

  /** Generated variable prefix */
  prefix: string;

  /** Expression table variable name */
  expressionTableVar: string;

  /** Definition variable name */
  definitionVar: string;

  /** Number of expressions in table */
  expressionCount: number;

  /** Number of instruction rows */
  instructionRowCount: number;

  /** Original declaration form */
  originalForm: "decorator" | "decorator-config" | "static-au" | "convention" | "unknown";
}

/* =============================================================================
 * TRANSFORM ERRORS
 * ============================================================================= */

/**
 * Error during transformation.
 */
export class TransformError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly file?: string,
    public readonly line?: number,
    public readonly column?: number
  ) {
    super(message);
    this.name = "TransformError";
  }
}

/** Error codes */
export const TransformErrorCode = {
  CLASS_NOT_FOUND: "TRANSFORM_CLASS_NOT_FOUND",
  MULTIPLE_CLASSES: "TRANSFORM_MULTIPLE_CLASSES",
  INVALID_AOT: "TRANSFORM_INVALID_AOT",
  EDIT_CONFLICT: "TRANSFORM_EDIT_CONFLICT",
  INTERNAL: "TRANSFORM_INTERNAL",
} as const;

export type TransformErrorCodeType = (typeof TransformErrorCode)[keyof typeof TransformErrorCode];
