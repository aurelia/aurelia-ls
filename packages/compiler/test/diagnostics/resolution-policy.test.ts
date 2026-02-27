import { describe, expect, test } from "vitest";
import type { AuDiagnosticMapping } from "../../out/diagnostics/mappings/au.js";
import { resolveConditionalAuMappingWithPolicy } from "../../out/diagnostics/engine/resolution-policy.js";
import type { RawDiagnostic } from "../../out/diagnostics/engine/types.js";

const conditionalMapping: AuDiagnosticMapping = {
  auCode: "AU1104",
  canonical: ["aurelia/unknown-bindable", "aurelia/unknown-attribute"],
  aurCode: ["AUR0707", "AUR0753"],
  status: "conditional",
};

describe("diagnostic resolution policy", () => {
  test("uses discriminator data when available", () => {
    const raw: RawDiagnostic = {
      code: "AU1104",
      message: "demo",
      data: { resourceKind: "custom-attribute" },
    };
    const decision = resolveConditionalAuMappingWithPolicy(conditionalMapping, raw);
    expect(decision.code).toBe("aurelia/unknown-attribute");
    expect(decision.aurCode).toBe("AUR0753");
    expect(decision.issue).toBeUndefined();
  });

  test("returns explicit ambiguous mapping code by default when discriminator is missing", () => {
    const raw: RawDiagnostic = {
      code: "AU1104",
      message: "demo",
      data: {},
    };
    const decision = resolveConditionalAuMappingWithPolicy(conditionalMapping, raw);
    expect(decision.code).toBe("aurelia/policy/diagnostic-mapping-ambiguous");
    expect(decision.data?.rawCode).toBe("AU1104");
    expect(decision.data?.reason).toBe("missing-discriminator");
    expect(decision.data?.candidates).toEqual(["aurelia/unknown-bindable", "aurelia/unknown-attribute"]);
    expect(decision.issue?.kind).toBe("conditional-code");
    expect(decision.issue?.message).not.toContain("Defaulted to");
  });

  test("can preserve legacy first-candidate fallback when explicitly requested", () => {
    const raw: RawDiagnostic = {
      code: "AU1104",
      message: "demo",
      data: {},
    };
    const decision = resolveConditionalAuMappingWithPolicy(conditionalMapping, raw, {
      conditionalAu: { onMissingDiscriminator: "legacy-first-candidate" },
    });
    expect(decision.code).toBe("aurelia/unknown-bindable");
    expect(decision.issue?.kind).toBe("conditional-code");
    expect(decision.issue?.message).toContain("Defaulted to 'aurelia/unknown-bindable'");
  });
});
