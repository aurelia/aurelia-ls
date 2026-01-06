import type { NormalizedPath, BindingMode, SourceSpan, TextSpan } from "@aurelia-ls/compiler";

// Re-export BindingMode for consumers of this module
export type { BindingMode };

/** Raw facts extracted from a single source file */
export interface SourceFacts {
  readonly path: NormalizedPath;
  readonly classes: ClassFacts[];
  readonly registrationCalls: RegistrationCallFact[];
  readonly imports: ImportFact[];
  readonly exports: ExportFact[];

  /**
   * Sibling files discovered adjacent to this source file.
   *
   * Populated when FileSystemContext is provided during extraction.
   * Used for sibling file convention: `foo.ts` + `foo.html`
   */
  readonly siblingFiles: SiblingFileFact[];

  /**
   * Template imports from sibling HTML template.
   *
   * Extracted from <import> and <require> elements in the sibling template.
   * Used to create local scope registrations with `template-import` evidence.
   *
   * Populated when FileSystemContext is provided and a sibling .html exists.
   */
  readonly templateImports: readonly TemplateImportFact[];
}

/**
 * Sibling file discovered adjacent to a source file.
 * Used for template-pairing convention.
 */
export interface SiblingFileFact {
  /** Normalized path to the sibling file */
  readonly path: NormalizedPath;

  /** File extension including dot (e.g., '.html') */
  readonly extension: string;

  /** Base name without extension, matches source file */
  readonly baseName: string;
}

/** Import declaration fact */
export type ImportFact =
  | { readonly kind: "namespace"; readonly alias: string; readonly moduleSpecifier: string; readonly resolvedPath: NormalizedPath | null }
  | { readonly kind: "named"; readonly names: readonly ImportedName[]; readonly moduleSpecifier: string; readonly resolvedPath: NormalizedPath | null }
  | { readonly kind: "default"; readonly alias: string; readonly moduleSpecifier: string; readonly resolvedPath: NormalizedPath | null };

/** Imported name with optional alias */
export interface ImportedName {
  readonly name: string;
  readonly alias: string | null;
}

/** Export declaration fact */
export type ExportFact =
  | { readonly kind: "reexport-all"; readonly moduleSpecifier: string; readonly resolvedPath: NormalizedPath | null }
  | { readonly kind: "reexport-named"; readonly names: readonly ExportedName[]; readonly moduleSpecifier: string; readonly resolvedPath: NormalizedPath | null }
  | { readonly kind: "named"; readonly names: readonly string[] }
  | { readonly kind: "default"; readonly name: string | null };

/** Exported name with optional alias */
export interface ExportedName {
  readonly name: string;
  readonly alias: string | null;
}

/** Facts about a class declaration */
export interface ClassFacts {
  readonly name: string;
  readonly decorators: DecoratorFact[];
  readonly staticAu: StaticAuFact | null;
  readonly staticDependencies: StaticDependenciesFact | null;
  readonly bindableMembers: BindableMemberFact[];
  /**
   * Gaps encountered during extraction of this class.
   * These represent patterns we couldn't fully analyze (spreads, computed props, etc.)
   */
  readonly extractionGaps?: AnalysisGap[];
}

/** Raw decorator occurrence */
export interface DecoratorFact {
  readonly name: string; // "customElement", "customAttribute", etc.
  readonly args: DecoratorArgFact | null;
}

/** Decorator argument (string or object) */
export type DecoratorArgFact =
  | { readonly kind: "string"; readonly value: string }
  | { readonly kind: "object"; readonly properties: Readonly<Record<string, PropertyValueFact>> };

/** Property value in object literal */
export type PropertyValueFact =
  | { readonly kind: "string"; readonly value: string }
  | { readonly kind: "boolean"; readonly value: boolean }
  | { readonly kind: "stringArray"; readonly values: readonly string[] }
  | { readonly kind: "bindableArray"; readonly bindables: readonly BindableDefFact[] }
  | { readonly kind: "dependencyArray"; readonly refs: readonly DependencyRef[] }
  | { readonly kind: "identifier"; readonly name: string }
  | { readonly kind: "propertyAccess"; readonly name: string }
  | { readonly kind: "unknown" };

/** Static $au property */
export interface StaticAuFact {
  readonly type?: string; // 'custom-element', 'custom-attribute', etc.
  readonly name?: string;
  readonly aliases?: readonly string[];
  readonly bindables?: readonly BindableDefFact[];
  readonly dependencies?: readonly DependencyRef[];
  readonly template?: string;
  readonly containerless?: boolean;
  readonly isTemplateController?: boolean;
  readonly noMultiBindings?: boolean;
}

/** Static dependencies array */
export interface StaticDependenciesFact {
  readonly references: readonly DependencyRef[];
}

/**
 * Reference in a dependencies array.
 *
 * Includes provenance (span) for diagnostics, refactoring, and ordering.
 * The resolvedPath is populated by import resolution (WP2); null until then.
 */
export type DependencyRef =
  | {
      readonly kind: "identifier";
      readonly name: string;
      /** Source location of this identifier in the dependencies array */
      readonly span: TextSpan;
      /** File path where this class is defined (null until import resolution) */
      readonly resolvedPath: NormalizedPath | null;
    }
  | {
      readonly kind: "import";
      readonly moduleSpecifier: string;
      readonly exportName?: string;
      /** Source location of this import reference */
      readonly span: TextSpan;
    }
  | {
      readonly kind: "property-access";
      /** The object being accessed (e.g., "MyModule" in MyModule.Component) */
      readonly object: string;
      /** The property being accessed (e.g., "Component" in MyModule.Component) */
      readonly property: string;
      /** Source location of this property access in the dependencies array */
      readonly span: TextSpan;
      /** File path where this class is defined (null until import resolution) */
      readonly resolvedPath: NormalizedPath | null;
    };

/** Bindable member on class (from @bindable decorator) */
export interface BindableMemberFact {
  readonly name: string;
  readonly mode?: BindingMode;
  readonly primary?: boolean;
  readonly inferredType?: string;
}

/** Bindable definition in decorator/static $au */
export interface BindableDefFact {
  readonly name: string;
  readonly mode?: BindingMode;
  readonly primary?: boolean;
  readonly attribute?: string;
}

/** .register() call site */
export interface RegistrationCallFact {
  readonly receiver: "Aurelia" | "container" | "unknown";
  readonly methodChain?: string; // e.g., "new Aurelia().register" or "container.register"
  readonly arguments: readonly RegistrationArgFact[];
  readonly position: Position;
}

/** Argument to a .register() call */
export type RegistrationArgFact =
  | { readonly kind: "identifier"; readonly name: string; readonly span: TextSpan }
  | { readonly kind: "spread"; readonly name: string; readonly span: TextSpan }
  | { readonly kind: "memberAccess"; readonly namespace: string; readonly member: string; readonly span: TextSpan }
  | { readonly kind: "arrayLiteral"; readonly elements: readonly RegistrationArgFact[]; readonly span: TextSpan }
  | { readonly kind: "callExpression"; readonly receiver: string; readonly method: string; readonly span: TextSpan }
  | { readonly kind: "unknown"; readonly span: TextSpan };

/** Source position */
export interface Position {
  readonly line: number;
  readonly character: number;
}

// =============================================================================
// Template Import Facts
// =============================================================================

/**
 * Facts extracted from template <import> elements.
 *
 * These come from parsing the HTML template, not TypeScript.
 * Used to create local registration sites with `template-import` evidence.
 */
export interface TemplateImportFact {
  /**
   * Module specifier from the `from` attribute.
   * E.g., "./foo", "@aurelia/router"
   */
  readonly moduleSpecifier: string;

  /**
   * Resolved file path for the module specifier.
   * Null if resolution failed.
   */
  readonly resolvedPath: NormalizedPath | null;

  /**
   * Default alias from `as` attribute.
   * E.g., <import from="./foo" as="bar"> → "bar"
   */
  readonly defaultAlias: string | null;

  /**
   * Named aliases from `Export.as` attributes.
   * E.g., <import from="./x" Foo.as="f"> → [{ exportName: "Foo", alias: "f" }]
   */
  readonly namedAliases: readonly NamedAlias[];

  /**
   * Source span of the import element in the template.
   * For provenance - diagnostics, navigation.
   */
  readonly span: SourceSpan;

  /**
   * Source span of the `from` attribute value.
   * For go-to-definition on the module specifier.
   */
  readonly moduleSpecifierSpan: SourceSpan;
}

/**
 * Named alias in a template import.
 * E.g., <import from="./x" Foo.as="bar"> → { exportName: "Foo", alias: "bar" }
 */
export interface NamedAlias {
  readonly exportName: string;
  readonly alias: string;
}

// =============================================================================
// Analysis Result Types (Shared)
// =============================================================================

/**
 * Universal wrapper for analysis operations.
 * Carries both value and accumulated context (gaps).
 *
 * Inspired by the Writer monad — never throws on "can't analyze",
 * instead reports gaps with actionable suggestions.
 */
export interface AnalysisResult<T> {
  /** The extracted value, possibly partial if gaps exist */
  value: T;
  /** Confidence level of the extraction */
  confidence: Confidence;
  /** What we couldn't analyze and why */
  gaps: AnalysisGap[];
}

/**
 * Confidence in extracted semantics.
 * Higher confidence = safer to trust for compilation decisions.
 */
export type Confidence =
  | 'exact'    // Manifest or explicit config — authoritative
  | 'high'     // Source analysis with decorators — very reliable
  | 'partial'  // Got some info, missing other parts
  | 'low'      // Convention inference only — best guess
  | 'manual';  // Couldn't analyze — user must provide

/**
 * Describes something we couldn't fully analyze.
 * Designed for Elm-style error messages with actionable suggestions.
 */
export interface AnalysisGap {
  /** What we couldn't determine (e.g., "bindables for tooltip") */
  what: string;
  /** Structured reason for the gap */
  why: GapReason;
  /** Where in source the problem originates */
  where?: GapLocation;
  /** Actionable suggestion for the user */
  suggestion: string;
}

/**
 * Location of a gap — could be in source, compiled output, or package.json.
 */
export interface GapLocation {
  file: string;
  line?: number;
  column?: number;
  /** Code snippet showing the problematic pattern */
  snippet?: string;
}

/**
 * Structured reasons why analysis failed.
 * Each kind enables targeted diagnostic messages.
 *
 * Categories:
 * - Package structure: Issues with the npm package itself
 * - Import/resolution: Issues resolving imports within code
 * - Dynamic patterns: Code that can't be statically analyzed
 * - Control flow: Complex control flow in registration code
 * - Package format: Limitations of the compiled output format
 */
export type GapReason =
  // Package structure issues (npm scanner domain)
  | { kind: 'package-not-found'; packagePath: string }
  | { kind: 'invalid-package-json'; path: string; parseError: string }
  | { kind: 'missing-package-field'; field: 'name' | 'version' | 'main' | 'exports' | string }
  | { kind: 'entry-point-not-found'; specifier: string; resolvedPath: string }
  | { kind: 'no-entry-points' }
  | { kind: 'complex-exports'; reason: string }

  // Import/resolution issues (within code)
  | { kind: 'unresolved-import'; path: string; reason: string }
  | { kind: 'circular-import'; cycle: string[] }
  | { kind: 'external-package'; packageName: string }

  // Dynamic patterns that can't be statically analyzed
  | { kind: 'dynamic-value'; expression: string }
  | { kind: 'function-return'; functionName: string }
  | { kind: 'computed-property'; expression: string }
  | { kind: 'spread-unknown'; spreadOf: string }

  // Control flow in register() bodies
  | { kind: 'conditional-registration'; condition: string }
  | { kind: 'loop-variable'; variable: string }

  // Package format limitations
  | { kind: 'legacy-decorators' }
  | { kind: 'no-source'; hasTypes: boolean }
  | { kind: 'minified-code' }
  | { kind: 'unsupported-format'; format: string }

  // Resource inference issues
  | { kind: 'invalid-resource-name'; className: string; reason: string }

  // General parsing/processing errors
  | { kind: 'parse-error'; message: string };

// =============================================================================
// Analysis Result Utilities
// =============================================================================

/**
 * Create a successful result with full confidence.
 */
export function success<T>(value: T): AnalysisResult<T> {
  return { value, confidence: 'exact', gaps: [] };
}

/**
 * Create a high-confidence result (e.g., from decorators).
 */
export function highConfidence<T>(value: T): AnalysisResult<T> {
  return { value, confidence: 'high', gaps: [] };
}

/**
 * Create a partial result with gaps.
 */
export function partial<T>(
  value: T,
  confidence: Confidence,
  gaps: AnalysisGap[]
): AnalysisResult<T> {
  return { value, confidence, gaps };
}

/**
 * Combine multiple results, merging gaps and taking lowest confidence.
 */
export function combine<T>(
  results: AnalysisResult<T>[],
  combiner: (values: T[]) => T
): AnalysisResult<T> {
  const values = results.map(r => r.value);
  const allGaps = results.flatMap(r => r.gaps);
  const lowestConfidence = results.reduce(
    (lowest, r) => compareConfidence(r.confidence, lowest) < 0 ? r.confidence : lowest,
    'exact' as Confidence
  );

  return {
    value: combiner(values),
    confidence: lowestConfidence,
    gaps: allGaps,
  };
}

/**
 * Compare confidence levels. Returns negative if a < b.
 */
export function compareConfidence(a: Confidence, b: Confidence): number {
  const order: Confidence[] = ['manual', 'low', 'partial', 'high', 'exact'];
  return order.indexOf(a) - order.indexOf(b);
}

/**
 * Create a gap with a suggestion.
 */
export function gap(
  what: string,
  why: GapReason,
  suggestion: string,
  where?: GapLocation
): AnalysisGap {
  return { what, why, suggestion, where };
}
