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
let suppressedDiagnostics: readonly WorkspaceDiagnostic[];

beforeAll(async () => {
  harness = await getHarness();
  engine = harness.workspace;
  const app = await getAppTemplate();
  text = app.text;
  uri = app.uri as string;

  const routed = engine.query(uri as any).diagnostics();
  lspDiagnostics = routed.bySurface.get("lsp" as DiagnosticSurface) ?? [];
  suppressedDiagnostics = routed.suppressed;
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
      return diagText.includes("formatDate");
    });
    expect(falseDiags).toHaveLength(0);
  });

  it("known BB does not produce unknown-behavior", () => {
    // rate-limit is registered — no false positive
    const falseDiags = diagsWithCode("aurelia/unknown-behavior").filter((d) => {
      if (!d.span) return false;
      const diagText = text.slice(d.span.start, d.span.end);
      return diagText.includes("rateLimit");
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

// ============================================================================
// 9. False positive prevention — extended construct coverage
//    (Beyond §5: test that well-formed template constructs don't trigger errors)
// ============================================================================

describe("diagnostics: extended false positive prevention", () => {
  it("local template inline-tag does not produce unknown-element", () => {
    const falseDiags = diagsWithCode("aurelia/unknown-element").filter((d) => {
      if (!d.span) return false;
      return text.slice(d.span.start, d.span.end).includes("inline-tag");
    });
    expect(falseDiags).toHaveLength(0);
  });

  it("as-element target does not produce unknown-element for the host div", () => {
    // <div as-element="matrix-badge"> — the div should not be flagged
    const asElementOffset = text.indexOf('as-element="matrix-badge"');
    const falseDiags = diagsWithCode("aurelia/unknown-element").filter((d) => {
      if (!d.span) return false;
      return d.span.start >= asElementOffset - 10 && d.span.start <= asElementOffset + 30;
    });
    expect(falseDiags).toHaveLength(0);
  });

  it("shorthand :value binding does not produce diagnostics", () => {
    const shorthandOffset = text.indexOf(':value="title"');
    const falseDiags = lspDiagnostics.filter((d) => {
      if (!d.span) return false;
      return d.span.start >= shorthandOffset && d.span.start < shorthandOffset + ':value="title"'.length;
    });
    expect(falseDiags).toHaveLength(0);
  });

  it("shorthand @click binding does not produce diagnostics", () => {
    const atClickOffset = text.indexOf('@click="refreshData()"');
    const falseDiags = lspDiagnostics.filter((d) => {
      if (!d.span) return false;
      return d.span.start >= atClickOffset && d.span.start < atClickOffset + '@click="refreshData()"'.length;
    });
    expect(falseDiags).toHaveLength(0);
  });

  it("multi-binding CA does not produce unknown-attribute", () => {
    const tooltipOffset = text.indexOf("matrix-tooltip=");
    const falseDiags = diagsWithCode("aurelia/unknown-attribute").filter((d) => {
      if (!d.span) return false;
      return text.slice(d.span.start, d.span.end).includes("matrix-tooltip");
    });
    expect(falseDiags).toHaveLength(0);
  });

  it("let element does not produce unknown-element", () => {
    const falseDiags = diagsWithCode("aurelia/unknown-element").filter((d) => {
      if (!d.span) return false;
      return text.slice(d.span.start, d.span.end).includes("let");
    });
    expect(falseDiags).toHaveLength(0);
  });

  it("au-compose does not produce unknown-element", () => {
    const falseDiags = diagsWithCode("aurelia/unknown-element").filter((d) => {
      if (!d.span) return false;
      return text.slice(d.span.start, d.span.end).includes("au-compose");
    });
    expect(falseDiags).toHaveLength(0);
  });

  it("au-slot does not produce unknown-element", () => {
    const falseDiags = diagsWithCode("aurelia/unknown-element").filter((d) => {
      if (!d.span) return false;
      return text.slice(d.span.start, d.span.end).includes("au-slot");
    });
    expect(falseDiags).toHaveLength(0);
  });

  it("switch/case/default-case do not produce unknown-attribute", () => {
    for (const tc of ["switch", "case", "default-case"]) {
      const falseDiags = diagsWithCode("aurelia/unknown-attribute").filter((d) => {
        if (!d.span) return false;
        return text.slice(d.span.start, d.span.end).includes(tc);
      });
      expect(falseDiags, `${tc} should not produce unknown-attribute`).toHaveLength(0);
    }
  });

  it("ref binding does not produce unknown-attribute", () => {
    const refOffset = text.indexOf('ref="searchInput"');
    const falseDiags = lspDiagnostics.filter((d) => {
      if (!d.span) return false;
      return d.span.start >= refOffset && d.span.start < refOffset + 'ref="searchInput"'.length;
    });
    expect(falseDiags).toHaveLength(0);
  });

  it("repeat.for does not produce diagnostics", () => {
    const falseDiags = diagsWithCode("aurelia/unknown-attribute").filter((d) => {
      if (!d.span) return false;
      return text.slice(d.span.start, d.span.end).includes("repeat");
    });
    expect(falseDiags).toHaveLength(0);
  });

  it("if.bind does not produce diagnostics", () => {
    const falseDiags = diagsWithCode("aurelia/unknown-attribute").filter((d) => {
      if (!d.span) return false;
      return text.slice(d.span.start, d.span.end).includes("if");
    });
    expect(falseDiags).toHaveLength(0);
  });

  it("with.bind does not produce diagnostics", () => {
    const falseDiags = diagsWithCode("aurelia/unknown-attribute").filter((d) => {
      if (!d.span) return false;
      return text.slice(d.span.start, d.span.end).includes("with");
    });
    expect(falseDiags).toHaveLength(0);
  });

  it("promise data flow (then.from-view, catch.from-view) does not produce diagnostics", () => {
    for (const attr of ["then.from-view", "catch.from-view"]) {
      const attrOffset = text.indexOf(attr);
      const falseDiags = lspDiagnostics.filter((d) => {
        if (!d.span) return false;
        return d.span.start >= attrOffset && d.span.start < attrOffset + attr.length;
      });
      expect(falseDiags, `${attr} should not produce diagnostics`).toHaveLength(0);
    }
  });

  it("destructured repeat does not produce diagnostics", () => {
    const destrOffset = text.indexOf("[idx, entry] of indexedItems");
    const falseDiags = lspDiagnostics.filter((d) => {
      if (!d.span) return false;
      return d.span.start >= destrOffset && d.span.start < destrOffset + "[idx, entry] of indexedItems".length;
    });
    expect(falseDiags).toHaveLength(0);
  });

  it("interpolation in attribute value does not produce spurious diagnostics", () => {
    const interpOffset = text.indexOf('level="${activeSeverity}"');
    const falseDiags = lspDiagnostics.filter((d) => {
      if (!d.span) return false;
      return d.span.start >= interpOffset && d.span.start < interpOffset + 'level="${activeSeverity}"'.length;
    });
    expect(falseDiags).toHaveLength(0);
  });
});

// ============================================================================
// 9b. Aurelia-intent precondition — confidence demotion for web components
//     Dashed elements with no Aurelia binding syntax get low confidence,
//     which the demotion table suppresses. Elements with Aurelia intent fire.
// ============================================================================

describe("diagnostics: Aurelia-intent precondition", () => {
  it("web component with only standard HTML attrs is suppressed", () => {
    // <sl-button class="primary"> — no Aurelia binding syntax
    const suppressed = suppressedDiagnostics.filter((d) => {
      if (d.code !== "aurelia/unknown-element" || !d.span) return false;
      return text.slice(d.span.start, d.span.end).includes("sl-button");
    });
    expect(suppressed.length, "sl-button should be suppressed by confidence demotion").toBeGreaterThanOrEqual(1);
  });

  it("web component suppression includes confidence-demotion reason", () => {
    const suppressed = suppressedDiagnostics.filter((d) => {
      if (d.code !== "aurelia/unknown-element" || !d.span) return false;
      return text.slice(d.span.start, d.span.end).includes("sl-button");
    });
    expect(suppressed.length).toBeGreaterThanOrEqual(1);
    const diag = suppressed[0] as any;
    expect(diag.suppressionReason).toBe("confidence-demotion");
  });

  it("web component does NOT appear on LSP surface", () => {
    const onLsp = diagsWithCode("aurelia/unknown-element").filter((d) => {
      if (!d.span) return false;
      return text.slice(d.span.start, d.span.end).includes("sl-button");
    });
    expect(onLsp).toHaveLength(0);
  });

  it("unknown CE with Aurelia intent fires on LSP surface", () => {
    // <missing-component title.bind="total"> — has Aurelia binding syntax
    const onLsp = diagsWithCode("aurelia/unknown-element").filter((d) => {
      if (!d.span) return false;
      return text.slice(d.span.start, d.span.end).includes("missing-component");
    });
    expect(onLsp.length, "missing-component with .bind should fire").toBe(1);
  });

  it("unknown CE with Aurelia intent has high confidence", async () => {
    const off = await offset("missing-component", 1);
    const diag = findDiag("aurelia/unknown-element", off);
    expect(diag).toBeDefined();
    // High confidence — no confidence demotion in data (absence = high)
    if (diag?.data && typeof diag.data === "object") {
      const data = diag.data as { confidence?: string };
      expect(data.confidence).toBeUndefined();
    }
  });
});

// ============================================================================
// 10. Diagnostic counts — expected number of each diagnostic type
// ============================================================================

describe("diagnostics: expected counts", () => {
  it("exactly one unknown-element diagnostic fires", () => {
    // Only <missing-component> should trigger unknown-element
    const count = diagsWithCode("aurelia/unknown-element").length;
    expect(count).toBe(1);
  });

  it("exactly one unknown-bindable diagnostic fires", () => {
    // Only nonexistent-prop.bind on matrix-panel should trigger
    const count = diagsWithCode("aurelia/unknown-bindable").length;
    expect(count).toBe(1);
  });

  it("exactly one unknown-command diagnostic fires", () => {
    // Only title.badcommand should trigger
    const count = diagsWithCode("aurelia/unknown-command").length;
    expect(count).toBe(1);
  });

  it("exactly one unknown-converter diagnostic fires", () => {
    // Only | nonexistent should trigger
    const count = diagsWithCode("aurelia/unknown-converter").length;
    expect(count).toBe(1);
  });

  it("exactly one unknown-behavior diagnostic fires", () => {
    // Only & nonexistent should trigger
    const count = diagsWithCode("aurelia/unknown-behavior").length;
    expect(count).toBe(1);
  });
});

// ============================================================================
// 11. Ecosystem expression FP prevention
//     Well-formed ecosystem patterns should produce no diagnostics
// ============================================================================

describe("diagnostics: ecosystem expression FP prevention", () => {
  it("deep property chain does not produce diagnostics", () => {
    const chainOffset = text.indexOf("${groups[0].items[0].name}");
    const falseDiags = lspDiagnostics.filter((d) => {
      if (!d.span) return false;
      return d.span.start >= chainOffset && d.span.start < chainOffset + "${groups[0].items[0].name}".length;
    });
    expect(falseDiags).toHaveLength(0);
  });

  it("method call as repeat source does not produce diagnostics", () => {
    const methodRepeatOffset = text.indexOf("getItemsByStatus('active')");
    const falseDiags = lspDiagnostics.filter((d) => {
      if (!d.span) return false;
      return d.span.start >= methodRepeatOffset && d.span.start < methodRepeatOffset + "getItemsByStatus('active')".length;
    });
    expect(falseDiags).toHaveLength(0);
  });

  it("optional chaining does not produce diagnostics", () => {
    const optOffset = text.indexOf("${selectedItem?.name}");
    const falseDiags = lspDiagnostics.filter((d) => {
      if (!d.span) return false;
      return d.span.start >= optOffset && d.span.start < optOffset + "${selectedItem?.name}".length;
    });
    expect(falseDiags).toHaveLength(0);
  });

  it("&& chain in if.bind does not produce diagnostics", () => {
    const andOffset = text.indexOf('if.bind="showDetail && items.length"');
    const falseDiags = lspDiagnostics.filter((d) => {
      if (!d.span) return false;
      return d.span.start >= andOffset && d.span.start < andOffset + 'if.bind="showDetail && items.length"'.length;
    });
    expect(falseDiags).toHaveLength(0);
  });

  it("string concatenation does not produce diagnostics", () => {
    const concatOffset = text.indexOf("${noteMessage + ' (' + total");
    const falseDiags = lspDiagnostics.filter((d) => {
      if (!d.span) return false;
      return d.span.start >= concatOffset && d.span.start < concatOffset + 40;
    });
    expect(falseDiags).toHaveLength(0);
  });

  it("inline array literal in repeat does not produce diagnostics", () => {
    const inlineOffset = text.indexOf("['alpha', 'beta', 'gamma']");
    const falseDiags = lspDiagnostics.filter((d) => {
      if (!d.span) return false;
      return d.span.start >= inlineOffset && d.span.start < inlineOffset + "['alpha', 'beta', 'gamma']".length;
    });
    expect(falseDiags).toHaveLength(0);
  });

  it("nested ternary in class binding does not produce diagnostics", () => {
    const ternaryOffset = text.indexOf("${activeSeverity === 'error'");
    const falseDiags = lspDiagnostics.filter((d) => {
      if (!d.span) return false;
      return d.span.start >= ternaryOffset && d.span.start < ternaryOffset + 80;
    });
    expect(falseDiags).toHaveLength(0);
  });
});

// ============================================================================
// 11. Severity — every diagnostic has a severity and it matches the regime
//
// Regime 1 (grammar-deterministic): always "error" — zero FP risk
// Regime 2 (catalog-dependent): "warning" or "error" depending on confidence
// No diagnostic should lack a severity field.
// ============================================================================

describe("diagnostics: severity", () => {
  it("every LSP diagnostic has a severity field", () => {
    for (const diag of lspDiagnostics) {
      expect(diag.severity, `Diagnostic ${diag.code} at ${diag.span?.start} lacks severity`).toBeDefined();
      expect(["error", "warning", "info"]).toContain(diag.severity);
    }
  });

  it("expression parse error has error severity (regime 1)", async () => {
    const off = await offset("foo(");
    const diag = findDiag("aurelia/expr-parse-error", off);
    expect(diag, "Parse error should exist").toBeDefined();
    expect(diag!.severity).toBe("error");
  });

  it("unknown element has warning or error severity (regime 2)", async () => {
    const off = await offset("missing-component", 1);
    const diag = findDiag("aurelia/unknown-element", off);
    expect(diag, "Unknown element should exist").toBeDefined();
    expect(["error", "warning"]).toContain(diag!.severity);
  });

  it("unknown bindable has warning or error severity (regime 2)", async () => {
    const off = await offset("nonexistent-prop", 1);
    const diag = findDiag("aurelia/unknown-bindable", off);
    expect(diag, "Unknown bindable should exist").toBeDefined();
    expect(["error", "warning"]).toContain(diag!.severity);
  });

  it("unknown command has warning or error severity (regime 2)", async () => {
    const off = await offset("badcommand", 1);
    const diag = findDiag("aurelia/unknown-command", off);
    expect(diag, "Unknown command should exist").toBeDefined();
    expect(["error", "warning"]).toContain(diag!.severity);
  });
});

// ============================================================================
// 12. Carried data — diagnostic data is unconditionally present
//
// The testing thesis warns against conditional guards that skip invariants.
// Diagnostic data fields are carried properties that must survive the pipeline.
// ============================================================================

describe("diagnostics: carried data", () => {
  it("unknown element diagnostic unconditionally has data", async () => {
    const off = await offset("missing-component", 1);
    const diag = findDiag("aurelia/unknown-element", off);
    expect(diag, "Diagnostic should exist").toBeDefined();
    expect(diag!.data, "Data should be present (not behind a conditional guard)").toBeDefined();
    const data = diag!.data as { resourceKind?: string; name?: string };
    expect(data.resourceKind).toBe("custom-element");
    expect(data.name).toBe("missing-component");
  });

  it("expression parse error unconditionally has data with recovery flag", async () => {
    const off = await offset("foo(");
    const diag = findDiag("aurelia/expr-parse-error", off);
    expect(diag, "Diagnostic should exist").toBeDefined();
    expect(diag!.data, "Parse error data should be present").toBeDefined();
    const data = diag!.data as { recovery?: boolean };
    expect(data.recovery).toBe(true);
  });
});

// ============================================================================
// 13. Expression span accuracy with whitespace
//
// When whitespace (newlines, indentation) appears inside interpolation
// brackets, diagnostic spans must point to the actual expression text,
// not to the surrounding whitespace.
// ============================================================================

describe("diagnostics: expression span accuracy with whitespace", () => {
  /**
   * Helper: inject a modified template, query diagnostics, then restore.
   * Returns the diagnostic list from the modified template.
   */
  async function withModifiedTemplate(
    replacements: [string, string][],
    fn: (diags: readonly WorkspaceDiagnostic[], editedText: string) => void,
  ): Promise<void> {
    let editedText = text;
    for (const [from, to] of replacements) {
      editedText = editedText.replace(from, to);
    }
    harness.updateTemplate(uri as any, editedText, Date.now());
    try {
      const routed = engine.query(uri as any).diagnostics();
      const diags = routed.bySurface.get("lsp" as DiagnosticSurface) ?? [];
      fn(diags, editedText);
    } finally {
      harness.updateTemplate(uri as any, text, Date.now());
    }
  }

  it("newline + indent in interpolation: converter span excludes whitespace", async () => {
    await withModifiedTemplate(
      [["${title | nonexistent}", "${\n  title | nonexistent\n}"]],
      (diags, editedText) => {
        const diag = diags.find((d) => d.code === "aurelia/unknown-converter");
        expect(diag, "unknown-converter should still fire").toBeDefined();
        if (diag?.span) {
          const diagText = editedText.slice(diag.span.start, diag.span.end);
          // Span should not start with whitespace
          expect(diagText.startsWith("\n"), "span should not start with newline").toBe(false);
          expect(diagText.startsWith(" "), "span should not start with space").toBe(false);
        }
      },
    );
  });

  it("newline + indent in interpolation: behavior span excludes whitespace", async () => {
    await withModifiedTemplate(
      [["${title & nonexistent}", "${\n  title & nonexistent\n}"]],
      (diags, editedText) => {
        const diag = diags.find((d) => d.code === "aurelia/unknown-behavior");
        expect(diag, "unknown-behavior should still fire").toBeDefined();
        if (diag?.span) {
          const diagText = editedText.slice(diag.span.start, diag.span.end);
          expect(diagText.startsWith("\n"), "span should not start with newline").toBe(false);
          expect(diagText.startsWith(" "), "span should not start with space").toBe(false);
        }
      },
    );
  });

  it("spaces inside interpolation: span is tight around expression", async () => {
    await withModifiedTemplate(
      [["${title | nonexistent}", "${   title | nonexistent   }"]],
      (diags, editedText) => {
        const diag = diags.find((d) => d.code === "aurelia/unknown-converter");
        expect(diag, "unknown-converter should still fire").toBeDefined();
        if (diag?.span) {
          const diagText = editedText.slice(diag.span.start, diag.span.end);
          expect(diagText.startsWith(" "), "span should not start with space").toBe(false);
          expect(diagText.endsWith(" "), "span should not end with space").toBe(false);
        }
      },
    );
  });

  it("tab-indented expression: span excludes tabs", async () => {
    await withModifiedTemplate(
      [["${title | nonexistent}", "${\t\ttitle | nonexistent\t}"]],
      (diags, editedText) => {
        const diag = diags.find((d) => d.code === "aurelia/unknown-converter");
        expect(diag, "unknown-converter should still fire").toBeDefined();
        if (diag?.span) {
          const diagText = editedText.slice(diag.span.start, diag.span.end);
          expect(diagText.startsWith("\t"), "span should not start with tab").toBe(false);
          expect(diagText.endsWith("\t"), "span should not end with tab").toBe(false);
        }
      },
    );
  });

  it("whitespace in binding attribute value: span is tight", async () => {
    // <div title.bind="foo("> — add whitespace around the expression
    await withModifiedTemplate(
      [['title.bind="foo("', 'title.bind="  foo(  "']],
      (diags, editedText) => {
        const diag = diags.find((d) => d.code === "aurelia/expr-parse-error");
        expect(diag, "parse error should still fire").toBeDefined();
        if (diag?.span) {
          const diagText = editedText.slice(diag.span.start, diag.span.end);
          expect(diagText.startsWith(" "), "span should not start with space").toBe(false);
        }
      },
    );
  });

  it("whitespace in earlier expression does not shift later diagnostic span", async () => {
    // Add whitespace to ${title} (line 23) — this is BEFORE ${title | nonexistent} (line 202).
    // The diagnostic for unknown-converter should still point to the right position.
    await withModifiedTemplate(
      [["<h2>${title}</h2>", "<h2>${\n    title\n  }</h2>"]],
      (diags, editedText) => {
        const diag = diags.find((d) => d.code === "aurelia/unknown-converter");
        expect(diag, "unknown-converter should still fire").toBeDefined();
        if (diag?.span) {
          const diagText = editedText.slice(diag.span.start, diag.span.end);
          // The span should cover the converter diagnostic text, not be shifted
          // by the whitespace added to the earlier interpolation.
          expect(
            diagText.includes("nonexistent") || diagText.includes("title"),
            `diagnostic span should cover the expression, got: "${diagText}"`,
          ).toBe(true);
          // Verify span doesn't start with whitespace (shifted to wrong position)
          expect(diagText.startsWith("\n"), "span shifted — starts with newline").toBe(false);
          expect(diagText.startsWith(" "), "span shifted — starts with space").toBe(false);
        }
      },
    );
  });

  it("whitespace in earlier expression does not shift type-mismatch span", async () => {
    // expr-type-mismatch fires for item.status. Add whitespace to ${title} (earlier
    // in the template). The type-mismatch span should still cover "item.status",
    // not be shifted by the added whitespace.
    await withModifiedTemplate(
      [["<h2>${title}</h2>", "<h2>${\n    title\n  }</h2>"]],
      (diags, editedText) => {
        const diag = diags.find((d) => d.code === "aurelia/expr-type-mismatch");
        expect(diag, "expr-type-mismatch should still fire").toBeDefined();
        if (diag?.span) {
          const diagText = editedText.slice(diag.span.start, diag.span.end);
          expect(
            diagText.includes("item.status") || diagText.includes("status"),
            `type-mismatch span should cover expression, got: "${diagText}"`,
          ).toBe(true);
        }
      },
    );
  });

  it("whitespace accumulation: multiple padded expressions don't shift downstream spans", async () => {
    // Pad two earlier expressions with whitespace, verify downstream diagnostic unaffected
    await withModifiedTemplate(
      [
        ["<h2>${title}</h2>", "<h2>${\n    title\n  }</h2>"],
        ["Total: ${total}", "Total: ${\n    total\n  }"],
      ],
      (diags, editedText) => {
        const diag = diags.find((d) => d.code === "aurelia/unknown-converter");
        expect(diag, "unknown-converter should still fire").toBeDefined();
        if (diag?.span) {
          const diagText = editedText.slice(diag.span.start, diag.span.end);
          expect(
            diagText.includes("nonexistent") || diagText.includes("title"),
            `diagnostic span should cover the expression, got: "${diagText}"`,
          ).toBe(true);
        }
      },
    );
  });
});
