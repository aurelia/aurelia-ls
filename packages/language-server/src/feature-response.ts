/**
 * FeatureResponse infrastructure for the LSP adapter boundary (L2 Boundary 5).
 *
 * Implements the L2 FeatureResponse<T> = T | Degradation | NotApplicable pattern.
 *
 * The workspace is converging toward returning FeatureResponse<T> from all
 * feature methods. During the transition (workspace returns T | null), this
 * adapter treats null as NotApplicable and caught exceptions as Degradation
 * rung 3. When the workspace migrates to FeatureResponse<T>, the adapter
 * handles all three variants natively — no handler changes required.
 *
 * Invariant: Never catch-and-return-null. Always produce structured output.
 */

// ============================================================================
// Types — matching L2 types.ts FeatureResponse definitions
// ============================================================================

/**
 * Degradation ladder:
 * - Rung 1 = success (the result type T)
 * - Rung 2 = partial knowledge (honest partial output — e.g., "3 of 5 resources analyzed")
 * - Rung 3 = no knowledge (explicit explanation — e.g., "template not compiled")
 * - Rung 4 = not applicable (cursor on whitespace — legitimate silence)
 */
export interface Degradation {
  readonly __degraded: true;
  readonly rung: 2 | 3;
  readonly what: string;
  readonly why: string;
  readonly howToClose: string | null;
}

/** Rung 4: cursor on whitespace, comment, or non-semantic position. Not an error. */
export interface NotApplicable {
  readonly __notApplicable: true;
}

export type FeatureResponse<T> = T | Degradation | NotApplicable;

// ============================================================================
// Type Guards
// ============================================================================

export function isDegradation(value: unknown): value is Degradation {
  if (value === null || value === undefined || typeof value !== "object") return false;
  return (value as Record<string, unknown>).__degraded === true;
}

export function isNotApplicable(value: unknown): value is NotApplicable {
  if (value === null || value === undefined || typeof value !== "object") return false;
  return (value as Record<string, unknown>).__notApplicable === true;
}

export function isSuccess<T>(response: FeatureResponse<T>): response is T {
  return !isDegradation(response) && !isNotApplicable(response);
}

// ============================================================================
// Factory Functions
// ============================================================================

export function degradation(
  rung: 2 | 3,
  what: string,
  why: string,
  howToClose?: string | null,
): Degradation {
  return { __degraded: true, rung, what, why, howToClose: howToClose ?? null };
}

export const NOT_APPLICABLE: NotApplicable = Object.freeze({ __notApplicable: true });

/** Wrap a caught exception as a rung 3 degradation. */
export function degradationFromError(featureName: string, error: unknown): Degradation {
  const why = error instanceof Error
    ? error.message
    : String(error);
  return degradation(3, featureName, why, null);
}

// ============================================================================
// Adapter — eliminates catch-and-return-null at Boundary 5
// ============================================================================

/**
 * Wraps a workspace feature call and produces a FeatureResponse<T>.
 *
 * Handles three eras of the workspace API:
 * 1. Current: workspace returns T | null → null becomes NotApplicable
 * 2. Transition: workspace may throw → caught exceptions become Degradation rung 3
 * 3. Future: workspace returns FeatureResponse<T> → passed through natively
 *
 * @param featureName Human-readable feature name for degradation messages.
 * @param call The workspace call to wrap.
 */
export function adaptWorkspaceCall<T>(
  featureName: string,
  call: () => T | FeatureResponse<T> | null,
): FeatureResponse<T> {
  try {
    const result = call();

    // Future: workspace returns FeatureResponse natively
    if (isDegradation(result)) return result;
    if (isNotApplicable(result)) return result;

    // Current: workspace returns null for "not applicable"
    if (result === null || result === undefined) return NOT_APPLICABLE;

    return result as T;
  } catch (error) {
    return degradationFromError(featureName, error);
  }
}

// ============================================================================
// LSP Degradation Rendering — per-feature conversion at Boundary 5
// ============================================================================

/**
 * Render a Degradation as a markdown hover card.
 * Boot doc: "Degradation rung 2/3 → hover with explanation text (NOT null)."
 */
export function renderDegradationAsHoverMarkdown(d: Degradation): string {
  const icon = d.rung === 2 ? "$(warning)" : "$(error)";
  const lines = [`${icon} **Aurelia: ${d.what}**`, "", d.why];
  if (d.howToClose) {
    lines.push("", `**To resolve:** ${d.howToClose}`);
  }
  return lines.join("\n");
}

/**
 * Render a Degradation as a user-facing error message string.
 * Used for rename errors and window/showMessage.
 */
export function renderDegradationAsMessage(d: Degradation): string {
  const prefix = d.rung === 2 ? "Partial analysis" : "Analysis unavailable";
  const parts = [`${prefix}: ${d.what} — ${d.why}`];
  if (d.howToClose) {
    parts.push(` (${d.howToClose})`);
  }
  return parts.join("");
}
