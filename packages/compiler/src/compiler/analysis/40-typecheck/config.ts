/* =============================================================================
 * Typecheck Configuration
 * =============================================================================
 * Configuration types and utilities for the typecheck phase.
 *
 * Design principles:
 * - Sensible defaults (lenient) to avoid false positives out of the box
 * - Presets for common use cases (off/lenient/standard/strict)
 * - Fine-grained overrides for specific behaviors
 * - Configuration-aware from day one so UI can easily plug in later
 *
 * ## Binding Contexts
 *
 * Type checking behavior varies based on where a value is being bound:
 *
 * | Context           | Coercion Behavior                              |
 * |-------------------|------------------------------------------------|
 * | dom.attribute     | Always coerces to string (HTML behavior)       |
 * | dom.property      | Typed but with known DOM coercions             |
 * | component.bindable| Typed per bindable, may have @coerce           |
 * | style.property    | Accepts string or number (for px inference)    |
 * | template.local    | <let> bindings - inferred from expression      |
 *
 * ## Coercion Philosophy
 *
 * We distinguish between:
 * - **Safe coercion**: number→string in DOM (always works at runtime)
 * - **Lossy coercion**: null→string (renders "null" literally - usually a bug)
 * - **Type mismatch**: object→string (likely an error)
 */

/* =============================================================================
 * Configuration Types
 * ============================================================================= */

/**
 * Where a binding value is going - affects which coercion rules apply.
 */
export type BindingContext =
  | "dom.attribute"       // <input value="${x}"> - always coerces to string
  | "dom.property"        // <input value.bind="x"> - typed but with DOM coercion
  | "component.bindable"  // <my-el prop.bind="x"> - typed per bindable
  | "style.property"      // style.width.bind="x" - accepts string | number
  | "template.local"      // <let>, repeat vars - inferred
  | "unknown";            // Fallback when context can't be determined

/**
 * Severity level for type diagnostics.
 */
export type TypecheckSeverity = "error" | "warning" | "info" | "off";

/**
 * Typecheck configuration options.
 *
 * Can be loaded from:
 * - VS Code settings (aurelia.typecheck.*)
 * - .aureliarc.json
 * - tsconfig.json aurelia compiler options
 */
export interface TypecheckConfig {
  /** Master enable/disable for type checking */
  enabled: boolean;

  /**
   * Strictness preset - sets defaults for other options.
   * Individual options can still override.
   */
  preset: TypecheckPreset;

  /**
   * Allow HTML coercion rules (number/boolean → string for DOM bindings).
   * When true, binding a number to a string DOM property won't error.
   * @default true
   */
  domCoercion: boolean;

  /**
   * How to handle null/undefined being bound where string is expected.
   * These render as literal "null"/"undefined" text, which is usually a bug.
   * @default "warn"
   */
  nullToString: TypecheckSeverity;

  /**
   * How to handle binding to properties that don't exist on the target.
   * @default "warn"
   */
  unknownProperties: TypecheckSeverity;

  /**
   * How to handle type mismatches that aren't covered by coercion rules.
   * @default "error"
   */
  typeMismatch: TypecheckSeverity;

  /**
   * Whether to check function/callback signatures for event bindings.
   * @default false (not yet implemented)
   */
  strictEventHandlers: boolean;

  /**
   * Whether to require explicit types on <let> bindings.
   * @default false
   */
  strictLetBindings: boolean;
}

export type TypecheckPreset = "off" | "lenient" | "standard" | "strict";

/* =============================================================================
 * Preset Definitions
 * ============================================================================= */

/**
 * Preset configurations for common use cases.
 */
export const TYPECHECK_PRESETS: Record<TypecheckPreset, Partial<TypecheckConfig>> = {
  /** Disable type checking entirely */
  off: {
    enabled: false,
  },

  /**
   * Lenient mode - only report obvious errors.
   * Good for existing projects migrating to typed templates.
   */
  lenient: {
    enabled: true,
    domCoercion: true,
    nullToString: "off",
    unknownProperties: "off",
    typeMismatch: "warning",
    strictEventHandlers: false,
    strictLetBindings: false,
  },

  /**
   * Standard mode - balanced strictness.
   * Recommended for most projects.
   */
  standard: {
    enabled: true,
    domCoercion: true,
    nullToString: "warning",
    unknownProperties: "warning",
    typeMismatch: "error",
    strictEventHandlers: false,
    strictLetBindings: false,
  },

  /**
   * Strict mode - maximum type safety.
   * For new projects or those wanting full type coverage.
   */
  strict: {
    enabled: true,
    domCoercion: false,  // Even DOM coercion is flagged
    nullToString: "error",
    unknownProperties: "error",
    typeMismatch: "error",
    strictEventHandlers: true,
    strictLetBindings: true,
  },
};

/**
 * Default configuration - uses lenient preset to minimize false positives.
 */
export const DEFAULT_TYPECHECK_CONFIG: TypecheckConfig = {
  enabled: true,
  preset: "lenient",
  domCoercion: true,
  nullToString: "off",
  unknownProperties: "off",
  typeMismatch: "warning",
  strictEventHandlers: false,
  strictLetBindings: false,
};

/* =============================================================================
 * Configuration Resolution
 * ============================================================================= */

/**
 * Resolve a partial config into a full config, applying preset defaults.
 */
export function resolveTypecheckConfig(
  partial?: Partial<TypecheckConfig>,
): TypecheckConfig {
  if (!partial) return { ...DEFAULT_TYPECHECK_CONFIG };

  // Start with defaults
  let config = { ...DEFAULT_TYPECHECK_CONFIG };

  // Apply preset if specified
  if (partial.preset && partial.preset !== config.preset) {
    const presetDefaults = TYPECHECK_PRESETS[partial.preset];
    config = { ...config, ...presetDefaults, preset: partial.preset };
  }

  // Apply explicit overrides (they take precedence over preset)
  const { preset: _, ...overrides } = partial;
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) {
      (config as Record<string, unknown>)[key] = value;
    }
  }

  return config;
}

/* =============================================================================
 * Type Compatibility Checking
 * ============================================================================= */

/**
 * Result of checking type compatibility.
 */
export interface TypeCompatibilityResult {
  /** Whether the types are compatible (possibly with coercion) */
  compatible: boolean;
  /** Severity of the diagnostic if not compatible */
  severity: TypecheckSeverity;
  /** Human-readable reason for the result */
  reason?: string;
  /** Whether coercion was applied to make it compatible */
  coerced?: boolean;
}

/**
 * Check if an actual type is compatible with an expected type,
 * considering the binding context and configuration.
 */
export function checkTypeCompatibility(
  actual: string,
  expected: string,
  context: BindingContext,
  config: TypecheckConfig,
): TypeCompatibilityResult {
  const a = normalizeType(actual);
  const e = normalizeType(expected);

  // Exact match - always compatible
  if (a === e) {
    return { compatible: true, severity: "off" };
  }

  // `any` or `unknown` on either side - allow (explicit opt-out or inference limit)
  if (a === "any" || e === "any" || a === "unknown" || e === "unknown") {
    return { compatible: true, severity: "off" };
  }

  // Function type checking - be lenient for now
  // Note: e is already lowercased by normalizeType
  if (e === "function" && isFunctionType(actual)) {
    return { compatible: true, severity: "off" };
  }

  // === Coercion Rules ===

  // DOM coercion: number/boolean → string
  if (config.domCoercion && isDomContext(context)) {
    if (e === "string" && (a === "number" || a === "boolean")) {
      return { compatible: true, severity: "off", coerced: true };
    }
  }

  // null/undefined → string (lossy, renders literally)
  if (e === "string" && (a === "null" || a === "undefined" || isNullableType(a))) {
    const severity = config.nullToString;
    if (severity === "off") {
      return { compatible: true, severity: "off", coerced: true };
    }
    return {
      compatible: false,
      severity,
      reason: `${a} will render as literal text "${a}" - use nullish coalescing (??) or provide a default`,
    };
  }

  // Style properties accept string | number
  if (context === "style.property") {
    if ((e === "string" && a === "number") || (e === "number" && a === "string")) {
      return { compatible: true, severity: "off", coerced: true };
    }
  }

  // No coercion rule matched - it's a type mismatch
  return {
    compatible: false,
    severity: config.typeMismatch,
    reason: `Type '${actual}' is not assignable to type '${expected}'`,
  };
}

/* =============================================================================
 * Helper Functions
 * ============================================================================= */

function normalizeType(t: string): string {
  // Remove whitespace, parentheses, and normalize common patterns
  return t.replace(/[\s()]/g, "").toLowerCase();
}

function isFunctionType(t: string): boolean {
  const normalized = t.replace(/\s+/g, "").toLowerCase();
  if (/\bfunction\b/i.test(t)) return true;
  if (normalized.includes("=>")) return true;
  if (normalized.includes("returntype<")) return true;
  return false;
}

function isDomContext(context: BindingContext): boolean {
  return context === "dom.attribute" || context === "dom.property";
}

function isNullableType(t: string): boolean {
  const normalized = t.toLowerCase();
  // Use word boundary to avoid matching "nonnullable" as nullable
  return /\bnull\b/.test(normalized) || /\bundefined\b/.test(normalized);
}
