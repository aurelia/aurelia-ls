/**
 * File Facts - Unified File-Level Extraction
 *
 * Uses enriched ClassValue (AnalyzableValue-based) throughout.
 *
 * Design:
 * - FileFacts: What we extract from a single TypeScript file
 * - FileContext: Project-level context (siblings, templates) — assembled separately
 */

import type {
  NormalizedPath,
  TextSpan,
  SourceSpan,
  BindingMode,
  Located,
  TemplateMetaIR,
} from '../compiler.js';
import type { AnalysisGap } from '../evaluate/types.js';
import type { ClassValue, LexicalScope, AnalyzableValue, ValueResolutionContext } from '../evaluate/value/types.js';
import type { SiblingFile } from '../project/types.js';

// =============================================================================
// File Facts (Single File Extraction)
// =============================================================================

/**
 * Facts extracted from a single TypeScript source file.
 *
 * All class metadata uses the enriched ClassValue with AnalyzableValue.
 */
export interface FileFacts {
  /** Canonical path to this file */
  readonly path: NormalizedPath;

  /**
   * Classes declared in this file.
   * Each ClassValue contains decorators, static members, bindable members
   * as AnalyzableValue (no separate ClassFacts/PropertyValueFact).
   */
  readonly classes: readonly ClassValue[];

  /**
   * Lexical scope for this file.
   * Contains all bindings (imports, variables, classes) for resolution.
   */
  readonly scope: LexicalScope;

  /**
   * Import declarations.
   * Used for cross-file resolution and dependency tracking.
   */
  readonly imports: readonly ImportDeclaration[];

  /**
   * Export declarations.
   * Used for export binding resolution.
   */
  readonly exports: readonly ExportDeclaration[];

  /**
   * Top-level variable declarations with initializers.
   * Includes exported and non-exported variables.
   */
  readonly variables: readonly VariableDeclaration[];

  /**
   * Top-level function declarations.
   * Includes exported and non-exported functions.
   */
  readonly functions: readonly FunctionDeclaration[];

  /**
   * Registration calls found in this file.
   * `container.register(...)`, `new Aurelia().register(...)`, etc.
   */
  readonly registrationCalls: readonly RegistrationCall[];

  /**
   * Imperative `.define()` calls.
   * `CustomElement.define({...}, Class)`, etc.
   */
  readonly defineCalls: readonly DefineCall[];

  /**
   * Gaps encountered during extraction.
   * Patterns we couldn't analyze (dynamic values, spreads, etc.)
   */
  readonly gaps: readonly AnalysisGap[];
}

// =============================================================================
// Import/Export Declarations
// =============================================================================

/**
 * Import declaration.
 */
export type ImportDeclaration =
  | NamespaceImport
  | NamedImport
  | DefaultImport
  | SideEffectImport;

export interface NamespaceImport {
  readonly kind: 'namespace';
  readonly alias: string;
  readonly moduleSpecifier: string;
  readonly resolvedPath: NormalizedPath | null;
  readonly span: TextSpan;
}

export interface NamedImport {
  readonly kind: 'named';
  readonly bindings: readonly ImportBinding[];
  readonly moduleSpecifier: string;
  readonly resolvedPath: NormalizedPath | null;
  readonly span: TextSpan;
}

export interface DefaultImport {
  readonly kind: 'default';
  readonly alias: string;
  readonly moduleSpecifier: string;
  readonly resolvedPath: NormalizedPath | null;
  readonly span: TextSpan;
}

export interface SideEffectImport {
  readonly kind: 'side-effect';
  readonly moduleSpecifier: string;
  readonly resolvedPath: NormalizedPath | null;
  readonly span: TextSpan;
}

export interface ImportBinding {
  readonly name: string;
  readonly alias: string | null;
}

/**
 * Export declaration.
 */
export type ExportDeclaration =
  | ReexportAll
  | ReexportNamed
  | ExportNamed
  | ExportDefault;

export interface ReexportAll {
  readonly kind: 'reexport-all';
  readonly moduleSpecifier: string;
  readonly resolvedPath: NormalizedPath | null;
  readonly span: TextSpan;
}

export interface ReexportNamed {
  readonly kind: 'reexport-named';
  readonly bindings: readonly ExportBinding[];
  readonly moduleSpecifier: string;
  readonly resolvedPath: NormalizedPath | null;
  readonly span: TextSpan;
}

export interface ExportNamed {
  readonly kind: 'named';
  readonly names: readonly string[];
  readonly span: TextSpan;
}

export interface ExportDefault {
  readonly kind: 'default';
  readonly name: string | null;
  readonly span: TextSpan;
}

export interface ExportBinding {
  readonly name: string;
  readonly alias: string | null;
}

// =============================================================================
// Variable and Function Declarations
// =============================================================================

/**
 * Variable declaration (const, let, var).
 */
export interface VariableDeclaration {
  readonly name: string;
  readonly kind: 'const' | 'let' | 'var';
  readonly initializer: AnalyzableValue | null;
  readonly isExported: boolean;
  readonly span: TextSpan;
}

/**
 * Function declaration.
 */
export interface FunctionDeclaration {
  readonly name: string;
  readonly isAsync: boolean;
  readonly isGenerator: boolean;
  readonly isExported: boolean;
  readonly span: TextSpan;
}

// =============================================================================
// Registration Calls (Registration Axis)
// =============================================================================

/**
 * A .register() call site.
 */
export interface RegistrationCall {
  /**
   * What's being called on.
   * 'aurelia' = new Aurelia().register(...)
   * 'container' = container.register(...) or DI.createContainer().register(...)
   */
  readonly receiver: 'aurelia' | 'container' | 'unknown';

  /** Arguments to register() as AnalyzableValue */
  readonly arguments: readonly AnalyzableValue[];

  /**
   * Guard conditions that must hold for this registration to execute.
   * Populated for control-flow like if/else (e.g., SSR bootstraps).
   */
  readonly guards: readonly RegistrationGuard[];

  /** Source span for diagnostics */
  readonly span: TextSpan;
}

/**
 * Guard condition for a registration call (control-flow context).
 */
export interface RegistrationGuard {
  /** Guard kind (currently only if/else). */
  readonly kind: 'if';
  /** Condition expression as AnalyzableValue. */
  readonly condition: AnalyzableValue;
  /** True when guard is for an else branch. */
  readonly negated: boolean;
  /** Source span of the condition. */
  readonly span: TextSpan;
  /** Original condition text for diagnostics. */
  readonly conditionText: string;
}

/**
 * An imperative .define() call.
 */
export interface DefineCall {
  /** Resource type: CustomElement, CustomAttribute, etc. */
  readonly resourceType: 'CustomElement' | 'CustomAttribute' | 'ValueConverter' | 'BindingBehavior';

  /** The definition object (first arg) */
  readonly definition: AnalyzableValue;

  /** The class being defined (second arg) */
  readonly classRef: AnalyzableValue;

  /** Source span for diagnostics */
  readonly span: TextSpan;
}

// =============================================================================
// File Context (Project-Level, Assembled Separately)
// =============================================================================

/**
 * Context for a file within a project.
 *
 * This is separate from FileFacts because it requires project-level
 * information (file system access, sibling detection).
 * Assembled by the resolution pipeline, not during extraction.
 */
export interface FileContext {
  /** Sibling files adjacent to this file */
  readonly siblings: readonly SiblingFile[];

  /** Parsed sibling template (if .html exists) */
  readonly template: TemplateContent | null;

  /** Template imports from sibling .html */
  readonly templateImports: readonly TemplateImport[];

  /**
   * Imports nested inside <template as-custom-element> blocks.
   *
   * These are tracked separately because local-template import scope behavior
   * is owned by local-template scope policy in registration analysis.
   */
  readonly localTemplateImports?: readonly LocalTemplateImport[];

  /**
   * Local-template declaration metadata from
   * `<template as-custom-element="...">` blocks.
   */
  readonly localTemplateDefinitions?: readonly LocalTemplateDefinition[];
}

// SiblingFile is imported from project/types.ts (canonical definition)
// Re-export for convenience
export type { SiblingFile } from '../project/types.js';

/**
 * Parsed template content.
 */
export interface TemplateContent {
  readonly path: NormalizedPath;
  readonly content: string;
  // Add parsed template data as needed
}

/**
 * Template import from <import from="..."> in HTML.
 */
export interface TemplateImport {
  readonly moduleSpecifier: string;
  readonly resolvedPath: NormalizedPath | null;
  readonly defaultAlias: Located<string> | null;
  readonly namedAliases: readonly {
    exportName: Located<string>;
    alias: Located<string>;
    asLoc?: SourceSpan | null;
  }[];
  readonly span: SourceSpan;
  readonly moduleSpecifierSpan: SourceSpan;
}

/**
 * Template import from inside <template as-custom-element="...">.
 *
 * Carries the local template owner name to support lexical scope ownership.
 */
export interface LocalTemplateImport {
  readonly localTemplateName: Located<string>;
  readonly import: TemplateImport;
}

/**
 * Local-template declaration metadata extracted from
 * `<template as-custom-element="...">` blocks.
 */
export interface LocalTemplateDefinition {
  readonly localTemplateName: Located<string>;
  readonly span: SourceSpan;
  readonly templateMeta: TemplateMetaIR;
}

// =============================================================================
// Pattern Matching Context
// =============================================================================

/**
 * Context provided to pattern matchers.
 *
 * Pattern matchers receive a ClassValue and this context to determine
 * if the class is an Aurelia resource and extract its metadata.
 */
export interface MatchContext {
  /** File path where the class is defined */
  readonly filePath: NormalizedPath;

  /** File context (siblings, template) */
  readonly fileContext: FileContext;

  /** For cross-file resolution (optional) */
  readonly valueResolutionContext?: ValueResolutionContext;
}

/**
 * Context for cross-file value resolution.
 * (Re-exported from analysis/value/types.ts for convenience)
 */
export type { ValueResolutionContext } from '../evaluate/value/types.js';

// =============================================================================
// Constructors
// =============================================================================

/**
 * Create empty FileFacts for a path.
 */
export function emptyFileFacts(path: NormalizedPath, scope: LexicalScope): FileFacts {
  return {
    path,
    classes: [],
    scope,
    imports: [],
    exports: [],
    variables: [],
    functions: [],
    registrationCalls: [],
    defineCalls: [],
    gaps: [],
  };
}

/**
 * Create empty FileContext.
 */
export function emptyFileContext(): FileContext {
  return {
    siblings: [],
    template: null,
    templateImports: [],
    localTemplateImports: [],
    localTemplateDefinitions: [],
  };
}


