import { describe, test, expect } from "vitest";
import {
  AURELIA_DIAGNOSTIC_SUMMARY_PREFIX,
  AURELIA_LSP_DIAGNOSTIC_NAMESPACE_KEY,
  AURELIA_LSP_DIAGNOSTIC_TAXONOMY_SCHEMA,
  applyDiagnosticsUxAugmentation,
  formatLspDiagnosticTaxonomySummary,
  readLspDiagnosticTaxonomy,
} from "../../../out/features/diagnostics/taxonomy.js";

describe("diagnostics taxonomy bridge", () => {
  test("reads taxonomy payload from namespaced LSP diagnostic data", () => {
    const payload = readLspDiagnosticTaxonomy({
      confidence: "high",
      [AURELIA_LSP_DIAGNOSTIC_NAMESPACE_KEY]: {
        diagnostics: {
          schema: AURELIA_LSP_DIAGNOSTIC_TAXONOMY_SCHEMA,
          impact: "degraded",
          actionability: "manual",
          category: "toolchain",
        },
      },
    });

    expect(payload).toEqual({
      schema: AURELIA_LSP_DIAGNOSTIC_TAXONOMY_SCHEMA,
      impact: "degraded",
      actionability: "manual",
      category: "toolchain",
    });
  });

  test("formats taxonomy summary line deterministically", () => {
    const summary = formatLspDiagnosticTaxonomySummary({
      schema: AURELIA_LSP_DIAGNOSTIC_TAXONOMY_SCHEMA,
      impact: "blocking",
      actionability: "guided",
      category: "resource-resolution",
    });

    expect(summary).toBe(
      `${AURELIA_DIAGNOSTIC_SUMMARY_PREFIX} impact=blocking | actionability=guided | category=resource-resolution`,
    );
  });

  test("augments only Aurelia diagnostics with valid taxonomy payloads", () => {
    const diagnostics = [
      {
        source: "aurelia",
        message: "Unknown element",
        data: {
          [AURELIA_LSP_DIAGNOSTIC_NAMESPACE_KEY]: {
            diagnostics: {
              schema: AURELIA_LSP_DIAGNOSTIC_TAXONOMY_SCHEMA,
              impact: "degraded",
              actionability: "manual",
              category: "resource-resolution",
            },
          },
        },
      },
      {
        source: "typescript",
        message: "Cannot find name 'x'",
        data: {
          [AURELIA_LSP_DIAGNOSTIC_NAMESPACE_KEY]: {
            diagnostics: {
              schema: AURELIA_LSP_DIAGNOSTIC_TAXONOMY_SCHEMA,
              impact: "blocking",
              actionability: "guided",
              category: "toolchain",
            },
          },
        },
      },
      {
        source: "aurelia",
        message: "No taxonomy payload",
        data: {},
      },
    ];

    applyDiagnosticsUxAugmentation(diagnostics);
    applyDiagnosticsUxAugmentation(diagnostics);

    expect(diagnostics[0]?.message).toBe(
      "Unknown element\nAurelia diagnostics: impact=degraded | actionability=manual | category=resource-resolution",
    );
    expect(diagnostics[1]?.message).toBe("Cannot find name 'x'");
    expect(diagnostics[2]?.message).toBe("No taxonomy payload");
  });
});
