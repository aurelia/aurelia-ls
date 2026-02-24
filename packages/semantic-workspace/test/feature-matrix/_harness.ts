/**
 * Shared test harness for the feature-matrix fixture.
 *
 * Creates a single workspace harness from the feature-matrix fixture and
 * exposes position helpers for declarative test authoring. All feature
 * matrix tests import from here.
 *
 * The fixture exercises every resource kind, declaration form, template
 * position type, scope construct, and diagnostic trigger — designed from
 * the domain specs (F1-F8) for systematic cross-feature verification.
 */

import { createWorkspaceHarness } from "../harness/index.js";
import { asFixtureId } from "../fixtures/index.js";
import { findPosition, findOffset, positionAt, spanCoversOffset } from "../test-utils.js";
import type { WorkspaceHarness } from "../harness/types.js";
import type { SemanticQuery, WorkspaceHover, WorkspaceLocation, WorkspaceCompletionItem } from "../../out/types.js";
import type { SemanticWorkspaceEngine } from "../../out/engine.js";
import type { DocumentUri } from "@aurelia-ls/compiler";

// ============================================================================
// Harness singleton (shared across all feature-matrix test files)
// ============================================================================

let _harness: WorkspaceHarness | null = null;
let _appUri: DocumentUri | null = null;
let _appText: string | null = null;

/**
 * Get or create the feature-matrix harness. Cached across test files
 * within the same vitest worker.
 */
export async function getHarness(): Promise<WorkspaceHarness> {
  if (_harness) return _harness;
  _harness = await createWorkspaceHarness({
    fixtureId: asFixtureId("feature-matrix"),
    openTemplates: "none",
  });
  return _harness;
}

/**
 * Open the main app template and return its URI and text.
 */
export async function getAppTemplate(): Promise<{ uri: DocumentUri; text: string }> {
  const harness = await getHarness();
  if (_appUri && _appText) return { uri: _appUri, text: _appText };
  _appUri = harness.openTemplate("src/app.html");
  const text = harness.readText(_appUri);
  if (!text) throw new Error("Expected template text for feature-matrix app.html");
  _appText = text;
  return { uri: _appUri, text: _appText };
}

/**
 * Get the SemanticQuery for the app template.
 */
export async function getAppQuery(): Promise<SemanticQuery> {
  const harness = await getHarness();
  const { uri } = await getAppTemplate();
  return harness.workspace.query(uri);
}

/**
 * Get the workspace engine (for testing engine-level APIs).
 */
export async function getEngine(): Promise<SemanticWorkspaceEngine> {
  const harness = await getHarness();
  return harness.workspace;
}

// ============================================================================
// Position helpers — find cursor positions in the app template
// ============================================================================

/**
 * Find the position of a needle in the app template text.
 * Delta offsets into the matched string (default 1 = just inside the match).
 */
export async function pos(needle: string, delta = 1): Promise<{ line: number; character: number }> {
  const { text } = await getAppTemplate();
  return findPosition(text, needle, delta);
}

/**
 * Find the offset of a needle in the app template text.
 */
export async function offset(needle: string, delta = 0): Promise<number> {
  const { text } = await getAppTemplate();
  return findOffset(text, needle, delta);
}

/**
 * Convert an offset to a position in the app template text.
 */
export async function offsetToPos(off: number): Promise<{ line: number; character: number }> {
  const { text } = await getAppTemplate();
  return positionAt(text, off);
}

// ============================================================================
// Assertion helpers — property-coupled, not output-coupled
// ============================================================================

/**
 * Assert that hover at a position produces content matching a pattern.
 * Returns the hover for further assertions.
 */
export function assertHoverContains(
  hover: WorkspaceHover | null,
  pattern: string | RegExp,
  label?: string,
): asserts hover is WorkspaceHover {
  if (!hover) throw new Error(`Expected hover to be non-null${label ? ` (${label})` : ""}`);
  const contents = hover.contents;
  if (typeof pattern === "string") {
    if (!contents.includes(pattern)) {
      throw new Error(`Hover content does not contain "${pattern}"${label ? ` (${label})` : ""}\nGot: ${contents.slice(0, 200)}`);
    }
  } else {
    if (!pattern.test(contents)) {
      throw new Error(`Hover content does not match ${pattern}${label ? ` (${label})` : ""}\nGot: ${contents.slice(0, 200)}`);
    }
  }
}

/**
 * Assert hover has a span that covers the given offset.
 */
export async function assertHoverSpanCovers(
  hover: WorkspaceHover,
  needle: string,
): Promise<void> {
  const off = await offset(needle);
  if (!hover.location?.span) throw new Error(`Hover has no span`);
  if (!spanCoversOffset(hover.location.span, off)) {
    throw new Error(
      `Hover span [${hover.location.span.start}, ${hover.location.span.end}) does not cover offset ${off} (needle: "${needle}")`,
    );
  }
}

/**
 * Assert hover is null (non-semantic position).
 */
export function assertNoHover(
  hover: WorkspaceHover | null,
  label?: string,
): void {
  if (hover !== null) {
    throw new Error(`Expected no hover${label ? ` (${label})` : ""}, got: ${hover.contents.slice(0, 100)}`);
  }
}
