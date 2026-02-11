import { describe, expect, test } from "vitest";

import { buildVectorContractCoverageReport } from "./vector-contract-coverage.js";

describe("vector contract coverage report", () => {
  test("gate passes for stage vectors and required canaries", () => {
    const report = buildVectorContractCoverageReport();
    expect(report.gate.passed, report.gate.failures.join("\n")).toBe(true);
  });

  test("each stage has at least one asserted vector for each declared category", () => {
    const report = buildVectorContractCoverageReport();
    for (const stage of report.stages) {
      expect(stage.totalVectors).toBeGreaterThan(0);
      for (const category of stage.categories) {
        expect(
          category.assertedVectors,
          `${stage.stage} category "${category.category}" should be asserted by at least one vector.`
        ).toBeGreaterThan(0);
      }
    }
  });
});
