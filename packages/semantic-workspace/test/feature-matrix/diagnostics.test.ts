/**
 * Feature Matrix: Diagnostics
 *
 * Systematic diagnostic verification across evidence regimes, rule
 * categories, and the confidence-gated severity mechanism. Derived from
 * diagnostics-spec.md and f8-validation-rules.md.
 *
 * The fixture includes deliberate error triggers for each major rule
 * category. Tests verify that:
 * - The correct diagnostic code fires at the correct position
 * - Severity reflects the evidence regime
 * - No false positives fire on well-formed constructs
 * - Diagnostic data carries structured metadata (aurCode, resourceKind)
 *
 * Test structure:
 * 1. Regime 1 (grammar-deterministic) — expression parse errors
 * 2. Regime 2 (catalog-dependent) — unknown resource diagnostics
 * 3. Diagnostic position accuracy — diagnostics fire at the right offset
 * 4. Diagnostic metadata — structured data in diagnostic entries
 * 5. False positive prevention — well-formed constructs produce no errors
 * 6. Normalization — no normalization issues in the pipeline
 * 7. Ordering — diagnostics ordered by span position
 * 8. Deduplication — no duplicate diagnostics at the same span
 */

import { beforeAll, describe, expect, it } from "vitest";
import type { DiagnosticSurface } from "@aurelia-ls/compiler";
import {
  getHarness,
  getAppTemplate,
  offset,
} from "./_harness.js";
import { spanCoversOffset } from "../test-utils.js";
import type { WorkspaceHarness } from "../harness/types.js";
import type { SemanticWorkspaceEngine } from "../../out/engine.js";
import type { WorkspaceDiagnostic, WorkspaceDiagnostics } from "../../out/types.js";

let harness: WorkspaceHarness;
let engine: SemanticWorkspaceEngine;
let text: string;
let uri: string;

// Collect diagnostics once — they cover the entire template.
let allDiagnostics: readonly WorkspaceDiagnostic[];
let lspDiagnostics: readonly WorkspaceDiagnostic[];

beforeAll(async () => {
  harness = await getHarness();
  engine = harness.workspace;
  const app = await getAppTemplate();
  text = app.text;
  uri = app.uri as string;

  const routed = engine.query(uri as any).diagnostics();
  lspDiagnostics = routed.bySurface.get("lsp" as DiagnosticSurface) ?? [];
  allDiagnostics = collectAllDiagnostics(routed);
});

// ============================================================================
// Helpers
// ============================================================================

function collectAllDiagnostics(routed: WorkspaceDiagnostics): readonly WorkspaceDiagnostic[] {
  const combined: WorkspaceDiagnostic[] = [];
  for (const entries of routed.bySurface.values()) {
    combined.push(...entries);
  }
  combined.push(...routed.suppressed);
  return combined;
}

function findDiag(code: string, atOffset?: number): WorkspaceDiagnostic | undefined {
  return lspDiagnostics.find((diag) => {
    if (diag.code !== code) return false;
    if (atOffset !== undefined && diag.span) {
      return spanCoversOffset(diag.span, atOffset);
    }
    return true;
  });
}

function diagsWithCode(code: string): readonly WorkspaceDiagnostic[] {
  return lspDiagnostics.filter((d) => d.code === code);
}

// ============================================================================
// 1. Regime 1: Grammar-deterministic — expression parse errors
//    Zero FP risk. Always fires at full severity.
// ============================================================================

describe("diagnostics: regime 1 (grammar-deterministic)", () => {
  it("expression parse error fires for malformed expression", async () => {
    // Fixture: <div title.bind="foo("> — unterminated function call
    const off = await offset('foo(');
    const diag = findDiag("aurelia/expr-parse-error", off);
    expect(diag, "Parse error diagnostic should fire for 'foo('").toBeDefined();
  });

  it("expression parse error has recovery flag in data", async () => {
    const off = await offset('foo(');
    const diag = findDiag("aurelia/expr-parse-error", off);
    if (diag?.data && typeof diag.data === "object") {
      const data = diag.data as { recovery?: boolean };
      expect(data.recovery).toBe(true);
    }
  });
});

// ============================================================================
// 2. Regime 2: Catalog-dependent — unknown resource diagnostics
//    Medium FP risk. Severity subject to confidence demotion.
// ============================================================================

describe("diagnostics: regime 2 (catalog-dependent) — unknown resources", () => {
  it("unknown CE fires aurelia/unknown-element", async () => {
    // Fixture: <missing-component></missing-component>
    const off = await offset("missing-component", 1);
    const diag = findDiag("aurelia/unknown-element", off);
    expect(diag, "Unknown element diagnostic should fire").toBeDefined();
  });

  it("unknown element diagnostic includes resource metadata", async () => {
    const off = await offset("missing-component", 1);
    const diag = findDiag("aurelia/unknown-element", off);
    if (diag?.data && typeof diag.data === "object") {
      const data = diag.data as { resourceKind?: string; name?: string };
      expect(data.resourceKind).toBe("custom-element");
      expect(data.name).toBe("missing-component");
    }
  });

  it("unknown bindable fires aurelia/unknown-bindable", async () => {
    // Fixture: <matrix-panel nonexistent-prop.bind="total">
    const off = await offset("nonexistent-prop", 1);
    const diag = findDiag("aurelia/unknown-bindable", off);
    expect(diag, "Unknown bindable diagnostic should fire").toBeDefined();
  });

  it("unknown binding command fires aurelia/unknown-command", async () => {
    // Fixture: <div title.badcommand="test">
    const off = await offset("badcommand", 1);
    const diag = findDiag("aurelia/unknown-command", off);
    expect(diag, "Unknown command diagnostic should fire").toBeDefined();
  });

  it("unknown VC fires aurelia/unknown-converter", async () => {
    // Fixture: ${title | nonexistent}
    const off = await offset("| nonexistent}", 2);
    const diag = findDiag("aurelia/unknown-converter", off);
    expect(diag, "Unknown converter diagnostic should fire").toBeDefined();
  });

  it("unknown BB fires aurelia/unknown-behavior", async () => {
    // Fixture: ${title & nonexistent}
    const off = await offset("& nonexistent}", 2);
    const diag = findDiag("aurelia/unknown-behavior", off);
    expect(diag, "Unknown behavior diagnostic should fire").toBeDefined();
  });

  it("unknown CA fires aurelia/unknown-attribute", async () => {
    // Fixture: <div missing-attr="${title}">
    const off = await offset("missing-attr", 1);
    const diag = findDiag("aurelia/unknown-attribute", off);
    expect(diag, "Unknown attribute diagnostic should fire").toBeDefined();
  });
});

// ============================================================================
// 3. Diagnostic position accuracy — span covers the construct
// ============================================================================

describe("diagnostics: position accuracy", () => {
  it("unknown element span covers the tag name", async () => {
    const off = await offset("missing-component", 1);
    const diag = findDiag("aurelia/unknown-element", off);
    if (diag?.span) {
      const diagText = text.slice(diag.span.start, diag.span.end);
      expect(diagText).toContain("missing-component");
    }
  });

  it("unknown bindable span covers the attribute name", async () => {
    const off = await offset("nonexistent-prop", 1);
    const diag = findDiag("aurelia/unknown-bindable", off);
    if (diag?.span) {
      const diagText = text.slice(diag.span.start, diag.span.end);
      expect(diagText).toContain("nonexistent-prop");
    }
  });
});

// ============================================================================
// 4. Diagnostic metadata — aurCode and structured data
// ============================================================================

describe("diagnostics: structured metadata", () => {
  it("unknown element carries aurCode", async () => {
    const off = await offset("missing-component", 1);
    const diag = findDiag("aurelia/unknown-element", off);
    if (diag?.data && typeof diag.data === "object") {
      const aurCode = (diag.data as { aurCode?: string }).aurCode;
      // F8 §Missing Resource: CE → AUR0752
      expect(aurCode).toBeDefined();
    }
  });

  it("unknown converter carries aurCode", async () => {
    const off = await offset("| nonexistent}", 2);
    const diag = findDiag("aurelia/unknown-converter", off);
    if (diag?.data && typeof diag.data === "object") {
      const aurCode = (diag.data as { aurCode?: string }).aurCode;
      // F8 §Missing Resource: VC → AUR0103
      expect(aurCode).toBe("AUR0103");
    }
  });

  it("unknown behavior carries aurCode", async () => {
    const off = await offset("& nonexistent}", 2);
    const diag = findDiag("aurelia/unknown-behavior", off);
    if (diag?.data && typeof diag.data === "object") {
      const aurCode = (diag.data as { aurCode?: string }).aurCode;
      // F8 §Missing Resource: BB → AUR0101
      expect(aurCode).toBe("AUR0101");
    }
  });
});

// ============================================================================
// 5. False positive prevention — well-formed constructs produce no errors
//    (Diagnostics spec: "the system will miss real errors before it will
//    assert false ones")
// ============================================================================

describe("diagnostics: false positive prevention", () => {
  it("known CE does not produce unknown-element", () => {
    // matrix-panel is registered — no false positive
    const falseDiags = diagsWithCode("aurelia/unknown-element").filter((d) => {
      if (!d.span) return false;
      const diagText = text.slice(d.span.start, d.span.end);
      return diagText.includes("matrix-panel");
    });
    // The only matrix-panel diagnostic should be for the nonexistent-prop
    // trigger, not for the element itself being unknown
    for (const d of falseDiags) {
      const diagText = text.slice(d.span!.start, d.span!.end);
      // If it fires on matrix-panel, it should be near the diagnostic
      // trigger area, not the main usage
      expect(diagText).not.toBe("matrix-panel");
    }
  });

  it("known bindable does not produce unknown-bindable", () => {
    // count.bind="total" targets a real bindable — no false positive
    const falseDiags = diagsWithCode("aurelia/unknown-bindable").filter((d) => {
      if (!d.span) return false;
      return spanCoversOffset(d.span, text.indexOf("count.bind"));
    });
    expect(falseDiags).toHaveLength(0);
  });

  it("known VC does not produce unknown-converter", () => {
    // format-date is registered — no false positive
    const falseDiags = diagsWithCode("aurelia/unknown-converter").filter((d) => {
      if (!d.span) return false;
      const diagText = text.slice(d.span.start, d.span.end);
      return diagText.includes("format-date");
    });
    expect(falseDiags).toHaveLength(0);
  });

  it("known BB does not produce unknown-behavior", () => {
    // rate-limit is registered — no false positive
    const falseDiags = diagsWithCode("aurelia/unknown-behavior").filter((d) => {
      if (!d.span) return false;
      const diagText = text.slice(d.span.start, d.span.end);
      return diagText.includes("rate-limit");
    });
    expect(falseDiags).toHaveLength(0);
  });
});

// ============================================================================
// 6. Normalization — pipeline produces no normalization issues
// ============================================================================

describe("diagnostics: normalization health", () => {
  it("diagnostic pipeline has no normalization issues", () => {
    const pipeline = engine.debugDiagnosticsPipeline(uri as any);
    const issues = pipeline.normalization.issues;
    expect(issues.length, `Normalization issues:\n${JSON.stringify(issues, null, 2)}`).toBe(0);
  });
});

// ============================================================================
// 7. Ordering — diagnostics ordered by span position
// ============================================================================

describe("diagnostics: ordering", () => {
  it("diagnostics are ordered by span start", () => {
    const withSpans = lspDiagnostics.filter((d) => d.span);
    for (let i = 1; i < withSpans.length; i++) {
      const prev = withSpans[i - 1];
      const curr = withSpans[i];
      expect(
        prev.span!.start <= curr.span!.start,
        `Diagnostic at ${prev.span!.start} should come before ${curr.span!.start}`,
      ).toBe(true);
    }
  });
});

// ============================================================================
// 8. Deduplication — no duplicate diagnostics at same span
// ============================================================================

describe("diagnostics: deduplication", () => {
  it("no duplicate code+span combinations exist", () => {
    const seen = new Set<string>();
    for (const diag of lspDiagnostics) {
      if (!diag.span) continue;
      const key = `${diag.code}:${diag.span.start}:${diag.span.end}`;
      expect(seen.has(key), `Duplicate diagnostic: ${key}`).toBe(false);
      seen.add(key);
    }
  });
});
