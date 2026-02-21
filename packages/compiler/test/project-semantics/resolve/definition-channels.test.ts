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

function discoverExtensionsWithRoots(rootNames: string[]) {
  const { program } = createProgramFromMemory(
    {
      "/workspace/src/local-extensions.ts": `
        declare function bindingCommand(input: string | { name: string }): ClassDecorator;
        declare function attributePattern(...defs: Array<{ pattern: string; symbols: string }>): ClassDecorator;
        declare const dynamicName: string;

        @bindingCommand("local-cmd")
        export class LocalBindingCommand {}

        @bindingCommand(dynamicName)
        export class DynamicBindingCommand {}

        @attributePattern(
          { pattern: "PART.local", symbols: "." },
          { pattern: ":PART", symbols: ":" },
        )
        export class LocalPattern {}

        @attributePattern({ pattern: dynamicName, symbols: "." })
        export class DynamicPattern {}
      `,
      "/external/runtime-extensions.ts": `
        declare function bindingCommand(input: string | { name: string }): ClassDecorator;
        declare function attributePattern(...defs: Array<{ pattern: string; symbols: string }>): ClassDecorator;

        @bindingCommand({ name: "runtime-cmd" })
        export class RuntimeBindingCommand {}

        @attributePattern({ pattern: "@PART", symbols: "@" })
        export class RuntimePattern {}
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

  it("surfaces recognized command/pattern identities without pre-merge semantics changes", () => {
    const result = discoverExtensionsWithRoots([
      "/workspace/src/local-extensions.ts",
      "/external/runtime-extensions.ts",
    ]);

    expect(result.recognizedBindingCommands.map((entry) => `${entry.name}@${entry.file}`)).toEqual([
      "local-cmd@/workspace/src/local-extensions.ts",
      "runtime-cmd@/external/runtime-extensions.ts",
    ]);
    const recognizedPatterns = result.recognizedAttributePatterns
      .map((entry) => `${entry.pattern}|${entry.symbols}@${entry.file}`)
      .sort();
    expect(recognizedPatterns).toEqual([
      ":PART|:@/workspace/src/local-extensions.ts",
      "@PART|@@/external/runtime-extensions.ts",
      "PART.local|.@/workspace/src/local-extensions.ts",
    ]);

    expect(result.semantics.commands["local-cmd"]).toBeUndefined();
    expect(result.syntax.bindingCommands["local-cmd"]).toBeUndefined();
    expect(result.catalog.bindingCommands["local-cmd"]).toBeUndefined();

    expect(
      result.semantics.patterns.some((entry) => entry.pattern.value === "PART.local"),
    ).toBe(false);
    expect(
      result.syntax.attributePatterns.some((entry) => entry.pattern === "PART.local"),
    ).toBe(false);
    expect(
      result.catalog.attributePatterns.some((entry) => entry.pattern === "PART.local"),
    ).toBe(false);
  });

  it("keeps recognized command/pattern streams deterministic under root input reordering", () => {
    const forward = discoverExtensionsWithRoots([
      "/workspace/src/local-extensions.ts",
      "/external/runtime-extensions.ts",
    ]);
    const reverse = discoverExtensionsWithRoots([
      "/external/runtime-extensions.ts",
      "/workspace/src/local-extensions.ts",
    ]);

    const forwardCommands = forward.recognizedBindingCommands.map((entry) => `${entry.name}@${entry.file}`);
    const reverseCommands = reverse.recognizedBindingCommands.map((entry) => `${entry.name}@${entry.file}`);
    expect(reverseCommands).toEqual(forwardCommands);

    const forwardPatterns = forward.recognizedAttributePatterns.map((entry) => `${entry.pattern}|${entry.symbols}@${entry.file}`);
    const reversePatterns = reverse.recognizedAttributePatterns.map((entry) => `${entry.pattern}|${entry.symbols}@${entry.file}`);
    expect(reversePatterns).toEqual(forwardPatterns);
  });

  it("emits diagnostics for dynamic command/pattern declarations", () => {
    const result = discoverExtensionsWithRoots([
      "/workspace/src/local-extensions.ts",
      "/external/runtime-extensions.ts",
    ]);

    const unknownRegistrationDiagnostics = result.diagnostics
      .filter((diagnostic) => diagnostic.code === "aurelia/gap/unknown-registration");
    expect(unknownRegistrationDiagnostics.length).toBeGreaterThan(0);
    expect(
      unknownRegistrationDiagnostics.some((diagnostic) => diagnostic.message.includes("binding command name for DynamicBindingCommand")),
    ).toBe(true);
    expect(
      unknownRegistrationDiagnostics.some((diagnostic) => diagnostic.message.includes("attribute pattern for DynamicPattern")),
    ).toBe(true);
  });
});
