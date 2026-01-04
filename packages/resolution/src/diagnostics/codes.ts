/**
 * Resolution Diagnostic Codes
 *
 * Error codes follow the pattern RESxxxx where:
 * - RES0001-RES0009: Orphan resources (declared but never registered)
 * - RES0010-RES0019: Unanalyzable registration patterns
 * - RES0020-RES0029: Import resolution failures
 * - RES0030-RES0039: Plugin-related diagnostics
 *
 * Severity guidelines:
 * - Orphans: "warning" — may be intentional (dead code, test fixtures)
 * - Unanalyzable: "info" — analysis limitation, not user error
 * - Import failures: "warning" — likely user error but may be intentional
 * - Plugin hints: "info" — suggestions, not errors
 */

// =============================================================================
// Orphan Resources (RES0001-RES0009)
// =============================================================================

/** Custom element defined but never registered */
export const RES0001_ORPHAN_ELEMENT = "RES0001";

/** Custom attribute defined but never registered */
export const RES0002_ORPHAN_ATTRIBUTE = "RES0002";

/** Value converter defined but never registered */
export const RES0003_ORPHAN_VALUE_CONVERTER = "RES0003";

/** Binding behavior defined but never registered */
export const RES0004_ORPHAN_BINDING_BEHAVIOR = "RES0004";

// =============================================================================
// Unanalyzable Registration Patterns (RES0010-RES0019)
// =============================================================================

/** Registration uses a function call that can't be statically analyzed */
export const RES0010_UNANALYZABLE_FUNCTION_CALL = "RES0010";

/** Registration uses a variable that can't be statically traced */
export const RES0011_UNANALYZABLE_VARIABLE = "RES0011";

/** Registration uses a conditional expression */
export const RES0012_UNANALYZABLE_CONDITIONAL = "RES0012";

/** Registration spreads a variable (not a namespace import) */
export const RES0013_UNANALYZABLE_SPREAD = "RES0013";

/** Registration uses a property access that can't be resolved */
export const RES0014_UNANALYZABLE_PROPERTY_ACCESS = "RES0014";

/** Other unanalyzable registration pattern */
export const RES0019_UNANALYZABLE_OTHER = "RES0019";

// =============================================================================
// Import/Resolution Failures (RES0020-RES0029)
// =============================================================================

/** Could not resolve import for registered identifier */
export const RES0020_UNRESOLVED_IMPORT = "RES0020";

/** Identifier resolves to a file but not to a known resource */
export const RES0021_NOT_A_RESOURCE = "RES0021";

// =============================================================================
// Plugin Hints (RES0030-RES0039)
// =============================================================================

/** Resource requires a plugin that isn't registered */
export const RES0030_PLUGIN_REQUIRED = "RES0030";

// =============================================================================
// Code to Kind Mapping (for programmatic use)
// =============================================================================

/**
 * Get the orphan error code for a resource kind.
 */
export function getOrphanCode(kind: "element" | "attribute" | "valueConverter" | "bindingBehavior"): string {
  switch (kind) {
    case "element": return RES0001_ORPHAN_ELEMENT;
    case "attribute": return RES0002_ORPHAN_ATTRIBUTE;
    case "valueConverter": return RES0003_ORPHAN_VALUE_CONVERTER;
    case "bindingBehavior": return RES0004_ORPHAN_BINDING_BEHAVIOR;
  }
}

/**
 * Get the unanalyzable error code for a pattern kind.
 */
export function getUnanalyzableCode(
  patternKind: "function-call" | "variable-reference" | "conditional" | "spread-variable" | "property-access" | "other"
): string {
  switch (patternKind) {
    case "function-call": return RES0010_UNANALYZABLE_FUNCTION_CALL;
    case "variable-reference": return RES0011_UNANALYZABLE_VARIABLE;
    case "conditional": return RES0012_UNANALYZABLE_CONDITIONAL;
    case "spread-variable": return RES0013_UNANALYZABLE_SPREAD;
    case "property-access": return RES0014_UNANALYZABLE_PROPERTY_ACCESS;
    case "other": return RES0019_UNANALYZABLE_OTHER;
  }
}
