import fs from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { createWorkspaceHarness } from "./harness/index.js";
import { asFixtureId, getFixture, resolveFixtureRoot } from "./fixtures/index.js";

test("isolated fixture mode keeps canonical fixture files unchanged", async () => {
  const fixture = getFixture(asFixtureId("incremental-churn"));
  const sourceRoot = resolveFixtureRoot(fixture);
  if (!sourceRoot) {
    throw new Error("Expected incremental-churn fixture root to exist.");
  }

  const canonicalFile = path.join(sourceRoot, "src", "alpha.ts");
  const canonicalBefore = fs.readFileSync(canonicalFile, "utf8");

  const harness = await createWorkspaceHarness({
    fixtureId: asFixtureId("incremental-churn"),
    isolateFixture: true,
    openTemplates: "none",
  });

  const isolatedFile = harness.resolvePath("src/alpha.ts");
  expect(path.resolve(isolatedFile)).not.toBe(path.resolve(canonicalFile));

  const isolatedBefore = fs.readFileSync(isolatedFile, "utf8");
  fs.writeFileSync(isolatedFile, `${isolatedBefore}\n// isolated mutation\n`, "utf8");

  const canonicalAfter = fs.readFileSync(canonicalFile, "utf8");
  expect(canonicalAfter).toBe(canonicalBefore);
});
