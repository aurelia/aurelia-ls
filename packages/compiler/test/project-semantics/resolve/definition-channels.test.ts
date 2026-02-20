import { describe, expect, it } from "vitest";
import { discoverProjectSemantics, DiagnosticsRuntime, unwrapSourced } from "@aurelia-ls/compiler";
import { createProgramFromMemory } from "../_helpers/index.js";

function discoverWithRoots(rootNames: string[]) {
  const { program } = createProgramFromMemory(
    {
      "/workspace/src/local-debounce.ts": `
        declare function bindingBehavior(name: string): ClassDecorator;
        @bindingBehavior("debounce")
        export class LocalDebounceBindingBehavior {}
      `,
      "/external/runtime-debounce.ts": `
        declare function bindingBehavior(name: string): ClassDecorator;
        @bindingBehavior("debounce")
        export class RuntimeDebounceBindingBehavior {}
      `,
    },
    rootNames,
  );

  const diagnostics = new DiagnosticsRuntime();
  return discoverProjectSemantics(program, {
    packagePath: "/workspace",
    diagnostics: diagnostics.forSource("project"),
  });
}

function convergenceFingerprint(result: ReturnType<typeof discoverWithRoots>): string[] {
  return result.definition.convergence
    .filter((record) => record.resourceKind === "binding-behavior" && record.resourceName === "debounce")
    .map((record) => {
      const reasons = record.reasons
        .map((reason) => `${reason.code}:${reason.field}:${reason.detail ?? ""}`)
        .sort()
        .join("|");
      const candidates = record.candidates
        .map((candidate) => `${candidate.candidateId}:${candidate.sourceKind}:${candidate.file ?? ""}`)
        .sort()
        .join("|");
      return `${record.resourceKind}:${record.resourceName}:${reasons}:${candidates}`;
    })
    .sort();
}

describe("Project semantics definition channels", () => {
  it("exposes explicit authority/evidence/convergence channels and no legacy top-level aliases", () => {
    const result = discoverWithRoots([
      "/workspace/src/local-debounce.ts",
      "/external/runtime-debounce.ts",
    ]);

    expect((result as unknown as { resources?: unknown }).resources).toBeUndefined();
    expect((result as unknown as { definitionConvergence?: unknown }).definitionConvergence).toBeUndefined();

    const evidenceCandidates = result.definition.evidence
      .filter((resource) => resource.kind === "binding-behavior" && unwrapSourced(resource.name) === "debounce")
      .map((resource) => resource.file)
      .sort();
    expect(evidenceCandidates).toEqual([
      "/external/runtime-debounce.ts",
      "/workspace/src/local-debounce.ts",
    ]);

    const authorityCandidates = result.definition.authority
      .filter((resource) => resource.kind === "binding-behavior" && unwrapSourced(resource.name) === "debounce");
    expect(authorityCandidates).toHaveLength(1);
    expect(authorityCandidates[0]!.file).toBe("/workspace/src/local-debounce.ts");

    const convergence = result.definition.convergence.find(
      (record) => record.resourceKind === "binding-behavior" && record.resourceName === "debounce",
    );
    expect(convergence).toBeDefined();
    const convergenceFiles = convergence!.candidates.map((candidate) => candidate.file).sort();
    expect(convergenceFiles).toEqual([
      "/external/runtime-debounce.ts",
      "/workspace/src/local-debounce.ts",
      undefined,
    ]);
    expect(convergence!.candidates.some((candidate) => candidate.sourceKind === "builtin")).toBe(true);
    expect(
      result.diagnostics.some((diagnostic) => diagnostic.code === "aurelia/project/definition-convergence"),
    ).toBe(true);
  });

  it("keeps authority and convergence deterministic under root input reordering", () => {
    const forward = discoverWithRoots([
      "/workspace/src/local-debounce.ts",
      "/external/runtime-debounce.ts",
    ]);
    const reverse = discoverWithRoots([
      "/external/runtime-debounce.ts",
      "/workspace/src/local-debounce.ts",
    ]);

    const forwardAuthority = forward.definition.authority
      .filter((resource) => resource.kind === "binding-behavior" && unwrapSourced(resource.name) === "debounce")
      .map((resource) => resource.file);
    const reverseAuthority = reverse.definition.authority
      .filter((resource) => resource.kind === "binding-behavior" && unwrapSourced(resource.name) === "debounce")
      .map((resource) => resource.file);
    expect(reverseAuthority).toEqual(forwardAuthority);
    expect(reverseAuthority).toEqual(["/workspace/src/local-debounce.ts"]);

    expect(convergenceFingerprint(reverse)).toEqual(convergenceFingerprint(forward));
  });
});
