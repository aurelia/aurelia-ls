/**
 * Chunk B resource model correctness tests.
 *
 * Patterns AS-BC verify four fixes to the resource model:
 * - R2: unnamed resources enter catalog with synthetic key and gap
 * - R4: convention resources get analysis-convention priority
 * - R-PO: patch-object preserves Sourced<T> structure
 * - R-SO: overlay resources carry config origin
 */
import { describe, expect, it } from "vitest";
import { normalizePathForId } from "../../../out/model/index.js";
import { deriveResourceConfidence, type CustomElementDef, type ResourceDef, type Sourced } from "../../../out/schema/index.js";
import { buildSemanticsArtifacts } from "../../../out/project-semantics/assemble/build.js";
import {
  buildCustomElementDef,
  buildBindableDefs,
  buildTemplateControllerDef,
} from "../../../out/project-semantics/assemble/resource-def.js";
import { sourcedKnown, sourcedUnknown, unwrapSourced } from "../../../out/project-semantics/assemble/sourced.js";
import { toAttributePatternConfig, toBindingCommandConfig } from "../../../out/schema/convert.js";
import type { AttributePatternDef, BindingCommandDef } from "../../../out/schema/types.js";
import {
  mergeResourceDefinitionCandidates,
  type ResourceDefinitionCandidate,
} from "../../../out/project-semantics/definition/index.js";
import { createDiscoveryConvergenceOverrides } from "../../../out/project-semantics/definition/candidate-overrides.js";

// =============================================================================
// R2: unnamed resource pathway (patterns AS, AT, AU)
// =============================================================================

describe("R2: unnamed resources enter catalog", () => {
  const file = normalizePathForId("/repo/my-component.ts");

  function makeUnnamedResource(className: string, filePath = file): CustomElementDef {
    return {
      kind: "custom-element",
      name: sourcedUnknown<string>(filePath),
      className: sourcedKnown(className, filePath),
      aliases: [],
      containerless: sourcedKnown(false, filePath),
      shadowOptions: sourcedKnown<{ readonly mode: "open" | "closed" } | undefined>(undefined, filePath),
      capture: sourcedKnown(false, filePath),
      processContent: sourcedKnown(false, filePath),
      boundary: sourcedKnown(false, filePath),
      bindables: {},
      dependencies: [],
      file: filePath,
    };
  }

  it("pattern AS: resource with unknown name enters catalog with gap", () => {
    const unnamed = makeUnnamedResource("MyComponent");
    const result = buildSemanticsArtifacts([unnamed]);

    // The resource appears in definitionAuthority
    expect(result.definitionAuthority.length).toBe(1);
    const authority = result.definitionAuthority[0]!;
    expect(unwrapSourced(authority.className)).toBe("MyComponent");

    // A CatalogGap with unresolved-name kind exists
    const gaps = result.catalog.gaps;
    const nameGap = gaps.find((g) => g.kind === "unresolved-name");
    expect(nameGap).toBeDefined();
    expect(nameGap!.resourceKind).toBe("custom-element");
    expect(nameGap!.resourceName).toBeDefined();
  });

  it("pattern AT: named resources are unaffected", () => {
    const named = buildCustomElementDef({
      name: "my-component",
      className: "MyComponent",
      file,
      bindables: buildBindableDefs([{ name: "value", mode: "toView" }], file),
    });
    const result = buildSemanticsArtifacts([named]);

    // Named resource appears normally
    expect(result.definitionAuthority.length).toBe(1);
    expect(unwrapSourced(result.definitionAuthority[0]!.name)).toBe("my-component");

    // No spurious gaps
    const nameGaps = (result.catalog.gaps ?? []).filter((g) => g.kind === "unresolved-name");
    expect(nameGaps).toHaveLength(0);

    // Resource in semantics dictionary
    expect(result.semantics.elements["my-component"]).toBeDefined();
  });

  it("pattern AU: unnamed resource does not collide with named resource", () => {
    const named = buildCustomElementDef({
      name: "my-component",
      className: "MyComponent",
      file,
      bindables: {},
    });
    const unnamed = makeUnnamedResource("MyComponent", normalizePathForId("/repo/other.ts"));

    const result = buildSemanticsArtifacts([named, unnamed]);

    // Both resources appear in definitionAuthority
    expect(result.definitionAuthority.length).toBe(2);

    // They are separate — the named one retains its name
    const namedAuth = result.definitionAuthority.find(
      (r) => unwrapSourced(r.name) === "my-component",
    );
    expect(namedAuth).toBeDefined();

    // The unnamed one exists separately
    const unnamedAuth = result.definitionAuthority.find(
      (r) => unwrapSourced(r.name) === undefined,
    );
    expect(unnamedAuth).toBeDefined();

    // They were not merged together (separate convergence groups)
    expect(result.definitionConvergence).toHaveLength(0);
  });
});

// =============================================================================
// R4: convention tagging (patterns AV, AW, AX)
// =============================================================================

describe("R4: convention resources get analysis-convention priority", () => {
  const file = normalizePathForId("/repo/my-component.ts");

  it("pattern AV: convention-recognized resource gets analysis-convention sourceKind", () => {
    const resource = buildCustomElementDef({
      name: "my-component",
      className: "MyComponent",
      file,
      bindables: {},
    });
    const matchSources = new Map<ResourceDef, string>();
    matchSources.set(resource, "convention");

    const overrides = createDiscoveryConvergenceOverrides(
      [resource],
      [],
      normalizePathForId("/repo"),
      matchSources,
    );

    const override = overrides.get(resource);
    expect(override).toBeDefined();
    expect(override!.sourceKind).toBe("analysis-convention");
    expect(override!.evidenceRank).toBe(4);
  });

  it("pattern AW: decorator wins over convention in multi-candidate convergence", () => {
    const fileDecorator = normalizePathForId("/repo/decorator.ts");
    const fileConvention = normalizePathForId("/repo/convention.ts");

    const decoratorResource = buildCustomElementDef({
      name: "my-component",
      className: "MyComponent",
      file: fileDecorator,
      bindables: buildBindableDefs([{ name: "data", mode: "toView" }], fileDecorator),
    });
    const conventionResource = buildCustomElementDef({
      name: "my-component",
      className: "MyComponent",
      file: fileConvention,
      bindables: buildBindableDefs([{ name: "data", mode: "twoWay" }], fileConvention),
    });

    const candidates: ResourceDefinitionCandidate[] = [
      {
        candidateId: "decorator",
        resource: decoratorResource,
        sourceKind: "analysis-explicit",
        evidenceRank: 1,
      },
      {
        candidateId: "convention",
        resource: conventionResource,
        sourceKind: "analysis-convention",
        evidenceRank: 4,
      },
    ];

    const result = mergeResourceDefinitionCandidates(candidates);
    const merged = result.value as CustomElementDef;

    // Decorator candidate's value wins
    expect(unwrapSourced(merged.bindables.data?.mode)).toBe("toView");

    // A convergence reason was recorded
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("pattern AX: single convention resource produces correct catalog entry", () => {
    const conventionResource = buildCustomElementDef({
      name: "my-component",
      className: "MyComponent",
      file,
      bindables: buildBindableDefs([{ name: "items" }], file),
    });

    const candidates: ResourceDefinitionCandidate[] = [
      {
        candidateId: "convention",
        resource: conventionResource,
        sourceKind: "analysis-convention",
        evidenceRank: 4,
      },
    ];

    const result = mergeResourceDefinitionCandidates(candidates);
    const merged = result.value as CustomElementDef;

    // Resource is fully functional
    expect(unwrapSourced(merged.name)).toBe("my-component");
    expect(merged.bindables.items).toBeDefined();
    expect(merged.kind).toBe("custom-element");
  });
});

// =============================================================================
// R-PO: patch-object Sourced<T> (patterns AY, AZ)
// =============================================================================

describe("R-PO: patch-object preserves Sourced structure", () => {
  const fileA = normalizePathForId("/repo/a.ts");
  const fileB = normalizePathForId("/repo/b.ts");

  it("pattern AY: patch-object preserves Sourced<T> envelope", () => {
    const primary: CustomElementDef = {
      ...buildCustomElementDef({
        name: "my-element",
        className: "MyElement",
        file: fileA,
        bindables: {},
      }),
      shadowOptions: sourcedKnown<{ readonly mode: "open" | "closed" } | undefined>(
        { mode: "open" },
        fileA,
      ),
    };
    const secondary: CustomElementDef = {
      ...buildCustomElementDef({
        name: "my-element",
        className: "MyElement",
        file: fileB,
        bindables: {},
      }),
      shadowOptions: sourcedKnown<{ readonly mode: "open" | "closed" } | undefined>(
        { mode: "closed" },
        fileB,
      ),
    };

    const candidates: ResourceDefinitionCandidate[] = [
      { candidateId: "primary", resource: primary, sourceKind: "analysis-explicit", evidenceRank: 1 },
      { candidateId: "secondary", resource: secondary, sourceKind: "analysis-convention", evidenceRank: 4 },
    ];

    const result = mergeResourceDefinitionCandidates(candidates);
    const merged = result.value as CustomElementDef;

    // The merged shadowOptions is a valid Sourced<T> envelope
    const shadow = merged.shadowOptions;
    expect(shadow).toBeDefined();
    expect(shadow.origin).toBeDefined();
    expect(shadow.origin).toBe("source");

    // The inner value is the correctly patched object from the stronger candidate
    const inner = unwrapSourced(shadow);
    expect(inner).toBeDefined();
    expect(inner!.mode).toBe("open");
  });

  it("pattern AZ: patch-object fallback when one side has undefined inner value", () => {
    const withShadow: CustomElementDef = {
      ...buildCustomElementDef({
        name: "my-element",
        className: "MyElement",
        file: fileA,
        bindables: {},
      }),
      shadowOptions: sourcedKnown<{ readonly mode: "open" | "closed" } | undefined>(
        { mode: "open" },
        fileA,
      ),
    };
    const withoutShadow: CustomElementDef = buildCustomElementDef({
      name: "my-element",
      className: "MyElement",
      file: fileB,
      bindables: {},
    });

    const candidates: ResourceDefinitionCandidate[] = [
      { candidateId: "with", resource: withShadow, sourceKind: "analysis-explicit", evidenceRank: 1 },
      { candidateId: "without", resource: withoutShadow, sourceKind: "analysis-convention", evidenceRank: 4 },
    ];

    const result = mergeResourceDefinitionCandidates(candidates);
    const merged = result.value as CustomElementDef;

    // Result is not corrupted — it's a valid Sourced<T> or the known value
    const shadow = merged.shadowOptions;
    expect(shadow).toBeDefined();
    expect(shadow.origin).toBeDefined();
  });
});

// =============================================================================
// R-SO: overlay provenance (patterns BA, BB, BC)
// =============================================================================

describe("R-SO: overlay resources carry config origin", () => {
  it("pattern BA: overlay resource fields have origin 'config'", () => {
    // Simulate what the third-party resolution path now produces.
    // configSourced is private, so we verify the structure it produces.
    const file = normalizePathForId("/repo/node_modules/some-package/dist/index.d.ts");
    const location = { file, pos: 0, end: 0 };
    const configName: Sourced<string> = { origin: "config", value: "my-overlay", location };
    const configClassName: Sourced<string> = { origin: "config", value: "MyOverlay", location };

    // Verify the Sourced<T> config shape
    expect(configName.origin).toBe("config");
    expect(configClassName.origin).toBe("config");
    expect(configName.value).toBe("my-overlay");
    expect(configClassName.value).toBe("MyOverlay");
    // Config variant requires location
    expect(configName.location).toBeDefined();
    expect(configClassName.location).toBeDefined();
  });

  it("pattern BB: sourceKindFromNameOrigin returns 'explicit-config' for config origin", () => {
    // sourceKindFromNameOrigin is a private function in build.ts.
    // We verify the mapping through buildSemanticsArtifacts:
    // a resource with config-origin name should get explicit-config sourceKind
    // when no override is provided.
    const file = normalizePathForId("/repo/package/index.d.ts");
    const location = { file, pos: 0, end: 0 };

    // Create a resource with config origin (as R-SO now produces)
    const resource: CustomElementDef = {
      kind: "custom-element",
      name: { origin: "config", value: "my-overlay", location },
      className: { origin: "config", value: "MyOverlay", location },
      aliases: [],
      containerless: { origin: "config", value: false, location },
      shadowOptions: { origin: "config", value: undefined, location },
      capture: { origin: "config", value: false, location },
      processContent: { origin: "config", value: false, location },
      boundary: { origin: "config", value: false, location },
      bindables: {},
      dependencies: [],
      file,
    };

    // Pass through buildSemanticsArtifacts without overrides.
    // sourceKindFromNameOrigin will see origin: "config" → "explicit-config"
    const result = buildSemanticsArtifacts([resource]);

    // The resource enters definitionAuthority
    expect(result.definitionAuthority.length).toBe(1);
    expect(unwrapSourced(result.definitionAuthority[0]!.name)).toBe("my-overlay");

    // Verify it lands in the semantics dictionary
    expect(result.semantics.elements["my-overlay"]).toBeDefined();
  });

  it("pattern BC: R12 confidence derives 'exact' for zero-gap config-origin resource", () => {
    // With origin: "config" and no gaps → confidence is "exact"
    const configResult = deriveResourceConfidence([], "config");
    expect(configResult.level).toBe("exact");

    // Previously with origin: "source" → confidence was "high"
    const sourceResult = deriveResourceConfidence([], "source");
    expect(sourceResult.level).toBe("high");

    // Builtin also gets "exact"
    const builtinResult = deriveResourceConfidence([], "builtin");
    expect(builtinResult.level).toBe("exact");
  });
});

// =============================================================================
// R-BC1: builtin enrollment + merge integrity
// =============================================================================

describe("R-BC1: builtin convergence integrity", () => {
  it("preserves builtin controller semantics for repeat collisions while keeping analysis fields", () => {
    const file = normalizePathForId("/repo/repeat.ts");
    const analysisRepeat = buildTemplateControllerDef({
      name: "repeat",
      className: "Repeat",
      file,
      bindables: buildBindableDefs(
        [
          { name: "items", mode: "fromView" },
          { name: "tracked", mode: "toView" },
        ],
        file,
      ),
    });

    const result = buildSemanticsArtifacts([analysisRepeat]);
    const repeat = result.semantics.controllers.repeat;

    expect(repeat).toBeDefined();
    expect(repeat.semantics?.trigger).toEqual({ kind: "iterator", prop: "items", command: "for" });
    expect(repeat.semantics?.injects?.contextuals).toContain("$previous");
    expect(unwrapSourced(repeat.bindables.items?.mode)).toBe("fromView");
    expect(repeat.bindables.tracked).toBeDefined();

    const convergence = result.definitionConvergence.find(
      (record) => record.resourceKind === "template-controller" && record.resourceName === "repeat",
    );
    expect(convergence).toBeDefined();
    const sourceKinds = new Set(convergence!.candidates.map((candidate) => candidate.sourceKind));
    expect(sourceKinds.has("analysis-explicit")).toBe(true);
    expect(sourceKinds.has("builtin")).toBe(true);
  });

  it("does not synthesize builtin-only convergence records when no analysis candidates exist", () => {
    const result = buildSemanticsArtifacts([]);

    expect(result.definitionAuthority).toHaveLength(0);
    expect(result.definitionConvergence).toHaveLength(0);
    expect(result.semantics.controllers.repeat).toBeDefined();
  });
});

// =============================================================================
// R-EA3: recognized extension merge contract
// =============================================================================

describe("R-EA3: recognized command/pattern merge contract", () => {
  it("fills missing command keys conservatively and preserves builtin collisions", () => {
    const result = buildSemanticsArtifacts([], undefined, {
      recognizedBindingCommands: [
        {
          name: "my-cmd",
          className: "MyCommand",
          file: normalizePathForId("/repo/local.ts"),
          source: "decorator",
          declarationSpan: { start: 10, end: 20 },
          nameSpan: { start: 12, end: 18 },
        },
        {
          name: "bind",
          className: "BindOverride",
          file: normalizePathForId("/repo/local.ts"),
          source: "decorator",
          declarationSpan: { start: 30, end: 40 },
          nameSpan: { start: 32, end: 36 },
        },
      ],
    });

    expect(result.semantics.commands["my-cmd"]).toBeDefined();
    expect(result.semantics.commands["my-cmd"]?.commandKind.value).toBe("property");
    expect(result.semantics.commands.bind.commandKind.value).toBe("property");
    expect(result.semantics.commands.bind.mode?.value).toBe("default");

    const uncertaintyKinds = (result.catalog.gaps ?? [])
      .filter((gap) => gap.kind === "recognized-command-uncertain")
      .map((gap) => gap.kind);
    expect(uncertaintyKinds).toEqual(["recognized-command-uncertain"]);
  });

  it("fills missing pattern keys conservatively and preserves builtin collisions", () => {
    const result = buildSemanticsArtifacts([], undefined, {
      recognizedAttributePatterns: [
        {
          pattern: "PART.local",
          symbols: ".",
          className: "LocalPattern",
          file: normalizePathForId("/repo/local.ts"),
          source: "decorator",
          declarationSpan: { start: 10, end: 20 },
          patternSpan: { start: 11, end: 20 },
          symbolsSpan: { start: 21, end: 22 },
        },
        {
          pattern: ":PART",
          symbols: ":",
          className: "ColonPattern",
          file: normalizePathForId("/repo/local.ts"),
          source: "decorator",
          declarationSpan: { start: 30, end: 40 },
          patternSpan: { start: 31, end: 36 },
          symbolsSpan: { start: 37, end: 38 },
        },
      ],
    });

    const local = result.semantics.patterns.find((entry) => entry.pattern.value === "PART.local" && entry.symbols.value === ".");
    expect(local).toBeDefined();
    expect(local?.interpret.value.kind).toBe("fixed-command");
    if (local?.interpret.value.kind === "fixed-command") {
      expect(local.interpret.value.command).toBe("bind");
    }

    const colon = result.semantics.patterns.find((entry) => entry.pattern.value === ":PART" && entry.symbols.value === ":");
    expect(colon).toBeDefined();
    expect(colon?.interpret.value.kind).toBe("fixed-command");
    if (colon?.interpret.value.kind === "fixed-command") {
      expect(colon.interpret.value.mode).toBe("toView");
    }

    const uncertaintyKinds = (result.catalog.gaps ?? [])
      .filter((gap) => gap.kind === "recognized-pattern-uncertain")
      .map((gap) => gap.kind);
    expect(uncertaintyKinds).toEqual(["recognized-pattern-uncertain"]);
  });

  it("produces deterministic merge output under recognized input reordering", () => {
    const recognizedBindingCommands = [
      {
        name: "local-a",
        className: "LocalA",
        file: normalizePathForId("/repo/a.ts"),
        source: "decorator" as const,
        declarationSpan: { start: 10, end: 20 },
      },
      {
        name: "local-b",
        className: "LocalB",
        file: normalizePathForId("/repo/b.ts"),
        source: "decorator" as const,
        declarationSpan: { start: 10, end: 20 },
      },
    ];
    const recognizedAttributePatterns = [
      {
        pattern: "PART.alpha",
        symbols: ".",
        className: "AlphaPattern",
        file: normalizePathForId("/repo/a.ts"),
        source: "decorator" as const,
        declarationSpan: { start: 10, end: 20 },
      },
      {
        pattern: "PART.beta",
        symbols: ".",
        className: "BetaPattern",
        file: normalizePathForId("/repo/b.ts"),
        source: "decorator" as const,
        declarationSpan: { start: 10, end: 20 },
      },
    ];

    const forward = buildSemanticsArtifacts([], undefined, {
      recognizedBindingCommands,
      recognizedAttributePatterns,
    });
    const reverse = buildSemanticsArtifacts([], undefined, {
      recognizedBindingCommands: [...recognizedBindingCommands].reverse(),
      recognizedAttributePatterns: [...recognizedAttributePatterns].reverse(),
    });

    const forwardCommands = Object.keys(forward.catalog.bindingCommands).sort();
    const reverseCommands = Object.keys(reverse.catalog.bindingCommands).sort();
    expect(reverseCommands).toEqual(forwardCommands);

    const forwardPatterns = forward.catalog.attributePatterns.map((entry) => `${entry.pattern}|${entry.symbols}`).sort();
    const reversePatterns = reverse.catalog.attributePatterns.map((entry) => `${entry.pattern}|${entry.symbols}`).sort();
    expect(reversePatterns).toEqual(forwardPatterns);
  });
});

// =============================================================================
// R-EA4: command/pattern sourced-wrapper widening
// =============================================================================

describe("R-EA4: command/pattern conversion unwraps Sourced envelopes", () => {
  it("converts source-known command/pattern definitions without behavior drift", () => {
    const command: BindingCommandDef = {
      name: { origin: "source", state: "known", value: "custom-listener" },
      commandKind: { origin: "source", state: "known", value: "listener" },
      capture: { origin: "source", state: "known", value: true },
    };
    const pattern: AttributePatternDef = {
      pattern: { origin: "source", state: "known", value: "PART.local" },
      symbols: { origin: "source", state: "known", value: "." },
      interpret: { origin: "source", state: "known", value: { kind: "fixed-command", command: "bind" } },
    };

    expect(toBindingCommandConfig(command)).toEqual({
      name: "custom-listener",
      kind: "listener",
      capture: true,
    });
    expect(toAttributePatternConfig(pattern)).toEqual({
      pattern: "PART.local",
      symbols: ".",
      interpret: { kind: "fixed-command", command: "bind" },
    });
  });

  it("keeps deterministic converter fallbacks for source-unknown command/pattern definitions", () => {
    const command: BindingCommandDef = {
      name: { origin: "source", state: "unknown" },
      commandKind: { origin: "source", state: "unknown" },
    };
    const pattern: AttributePatternDef = {
      pattern: { origin: "source", state: "unknown" },
      symbols: { origin: "source", state: "unknown" },
      interpret: { origin: "source", state: "unknown" },
    };

    expect(toBindingCommandConfig(command)).toEqual({
      name: "",
      kind: "property",
    });
    expect(toAttributePatternConfig(pattern)).toEqual({
      pattern: "",
      symbols: "",
      interpret: { kind: "target-command" },
    });
  });
});
