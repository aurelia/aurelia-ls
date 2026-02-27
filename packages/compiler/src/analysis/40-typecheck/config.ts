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
 * Check if an actual (TS-resolved) type is compatible with an expected type,
 * considering the binding context and configuration.
 *
 * The actual type comes from the TypeScript language service (fully resolved).
 * The expected type comes from binding contract extraction (semantic model).
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

  // Function type checking — accept any function-like for Function target
  if (e === "function" && isFunctionType(actual)) {
    return { compatible: true, severity: "off" };
  }

  // === Coercion Rules ===

  // Truthy coercion: boolean targets in component context accept any
  // truthy-evaluable type. This handles `if.bind="items.length"` (number),
  // `show.bind="name"` (string), etc. At runtime, Aurelia coerces to boolean
  // via truthiness evaluation.
  if (e === "boolean" && context === "component.bindable") {
    if (isTruthyEvaluable(a)) {
      return { compatible: true, severity: "off", coerced: true };
    }
  }

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
      reason: `${actual} will render as literal text "${actual}" - use nullish coalescing (??) or provide a default`,
    };
  }

  // Style properties accept string | number
  if (context === "style.property") {
    if ((e === "string" && a === "number") || (e === "number" && a === "string")) {
      return { compatible: true, severity: "off", coerced: true };
    }
  }

  // Union type handling: if actual is a union, check if all members are compatible
  if (a.includes("|")) {
    const members = splitUnionType(a);
    const allCompatible = members.every((member) => {
      const memberResult = checkTypeCompatibility(member.trim(), expected, context, config);
      return memberResult.compatible;
    });
    if (allCompatible) {
      return { compatible: true, severity: "off" };
    }
  }

  // Safety valve: complex TS types that string comparison can't handle.
  // Rather than risk a false alarm, treat as compatible.
  if (isUnevaluatedTypeExpr(a)) {
    return { compatible: true, severity: "off" };
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
  return t.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Detect complex TypeScript type expressions that string comparison can't handle.
 *
 * When the TS language service returns a type like `Omit<MyVm, 'key'> & { key: string }`,
 * simple string comparison against `string` would incorrectly flag a mismatch.
 * Rather than risk a false alarm, treat unresolvable types as compatible.
 */
function isUnevaluatedTypeExpr(normalized: string): boolean {
  // Any type with generic brackets is too complex for string comparison
  if (normalized.includes("<")) return true;
  // Type queries
  if (normalized.includes("typeof ")) return true;
  // Intersection/mapped types from overlay frame type expressions
  if (normalized.includes(" & ")) return true;
  return false;
}

function isFunctionType(t: string): boolean {
  const normalized = t.replace(/\s+/g, "").toLowerCase();
  if (/\bfunction\b/i.test(t)) return true;
  if (normalized.includes("=>")) return true;
  return false;
}

function isDomContext(context: BindingContext): boolean {
  return context === "dom.attribute" || context === "dom.property";
}

/**
 * Check if a type is truthy-evaluable at runtime.
 * These types have meaningful boolean coercion in JavaScript:
 * number (0 = false, non-zero = true), string (empty = false),
 * object (always truthy), arrays, etc.
 */
function isTruthyEvaluable(normalized: string): boolean {
  // Primitive types that have truthy/falsy semantics
  if (normalized === "number" || normalized === "string") return true;
  // Arrays and objects are always truthy
  if (normalized.endsWith("[]")) return true;
  // Any non-primitive type (class instances, objects) — truthy
  if (!isPrimitiveKeyword(normalized)) return true;
  return false;
}

function isPrimitiveKeyword(t: string): boolean {
  return t === "string" || t === "number" || t === "boolean"
    || t === "null" || t === "undefined" || t === "void"
    || t === "never" || t === "symbol" || t === "bigint";
}

function isNullableType(t: string): boolean {
  const normalized = t.toLowerCase();
  return /\bnull\b/.test(normalized) || /\bundefined\b/.test(normalized);
}

/**
 * Split a union type string into its members, handling nested generics.
 * "string | number" → ["string", "number"]
 * "Map<string, number> | null" → ["Map<string, number>", "null"]
 */
function splitUnionType(t: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of t) {
    if (ch === "<" || ch === "(") depth++;
    else if (ch === ">" || ch === ")") depth--;
    else if (ch === "|" && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current) parts.push(current);
  return parts;
}
