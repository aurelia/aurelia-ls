import { describe, it, expect } from "vitest";
import type { IntegrationScenario } from "@aurelia-ls/integration-harness";
import { runIntegrationScenario } from "@aurelia-ls/integration-harness";

const CONDITIONAL_SOURCE = {
  kind: "memory" as const,
  files: {
    "/src/entry.ts": [
      "function customElement(name: string) {",
      "  return function(_target: unknown) {};",
      "}",
      "",
      "const Aurelia = { register: (..._args: unknown[]) => {} };",
      "",
      "@customElement(\"guarded-el\")",
      "export class GuardedElement {}",
      "",
      "if (__SSR__) {",
      "  Aurelia.register(GuardedElement);",
      "}",
      "",
    ].join("\n"),
  },
};

const CONDITIONAL_COMPILE = [
  {
    id: "guarded",
    templatePath: "/src/guarded.html",
    markup: "<guarded-el></guarded-el>",
    aot: true,
  },
];

describe("policy diagnostics (integration harness)", () => {
  it("adds policy diagnostics and promotes gap severity when enabled", async () => {
    const scenario: IntegrationScenario = {
      id: "policy-conditional-unknown",
      source: CONDITIONAL_SOURCE,
      compile: CONDITIONAL_COMPILE,
      resolution: {
        policy: {
          gaps: "error",
          confidence: { min: "high", severity: "warning" },
        },
      },
    };

    const run = await runIntegrationScenario(scenario);
    const codes = run.diagnostics.map((diag) => diag.code);

    expect(codes).toContain("policy:gaps");
    expect(codes).toContain("policy:confidence");

    const gapDiag = run.diagnostics.find((diag) => diag.code.startsWith("gap:"));
    expect(gapDiag?.severity).toBe("error");

    const confidenceDiag = run.diagnostics.find((diag) => diag.code === "policy:confidence");
    expect(confidenceDiag?.severity).toBe("warning");
  });

  it("does not add policy diagnostics when policy is undefined", async () => {
    const scenario: IntegrationScenario = {
      id: "policy-disabled",
      source: CONDITIONAL_SOURCE,
      compile: CONDITIONAL_COMPILE,
    };

    const run = await runIntegrationScenario(scenario);
    const hasPolicyDiagnostics = run.diagnostics.some((diag) => diag.code.startsWith("policy:"));
    expect(hasPolicyDiagnostics).toBe(false);
  });
});
