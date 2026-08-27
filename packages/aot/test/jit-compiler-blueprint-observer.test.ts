import { describe, expect, it } from "vitest";
import { CustomElement } from "@aurelia/runtime-html";
import type { ProcessContentHook } from "@aurelia/template-compiler";
import type {
  CompilerCase,
  CompilerCaseData,
  CompilerSetupFactory,
} from "../src/testing/compiler-case.js";
import { canonicalCompilerJson } from "../src/testing/compiler-canonical-data.js";
import {
  JitCompilerBlueprintObserver,
  type JitCompilerBlueprintBatch,
  type JitCompilerBlueprintDefinition,
  type JitCompilerBlueprintOutcome,
  sameJitCompilerBlueprintBatch,
} from "../src/testing/jit-compiler-blueprint-observer.js";
import {
  JitCompilerCaseExecutor,
  type JitCompilerSetupMaterializer,
} from "../src/testing/jit-compiler-case-executor.js";
import { createJitCompilerOracle } from "../src/testing/jit-compiler-oracle.js";
import { JIT_ORACLE_CASES } from "../src/testing/jit-oracle-case-registry.js";
import { PROCESS_CONTENT_ELEMENT_SETUP_ID } from "../src/testing/jit-oracle-extension-setups.js";
import {
  CUSTOM_ATTRIBUTE_SETUP_ID,
  CUSTOM_ELEMENT_SETUP_ID,
  JIT_ORACLE_SETUP_FACTORIES,
  JIT_ORACLE_SETUP_MATERIALIZERS,
} from "../src/testing/jit-oracle-setups.js";

const DOM_NODE_SETUP_ID = "test.compiler-blueprint.dom-node";
const OPAQUE_FUNCTIONS_SETUP_ID = "test.compiler-blueprint.opaque-functions";
const RUNTIME_METADATA_SETUP_ID = "test.compiler-blueprint.runtime-metadata";

const domNodeSetupFactory: CompilerSetupFactory = {
  factoryId: DOM_NODE_SETUP_ID,
  version: 1,
  exports: ["template"],
  validate: requireNoSetupArgs,
  describe: () => ({ kind: DOM_NODE_SETUP_ID }),
};

const domNodeSetupMaterializer: JitCompilerSetupMaterializer = {
  factoryId: DOM_NODE_SETUP_ID,
  materialize(args, context) {
    requireNoSetupArgs(args);
    const carrier = context.createTemplate('<section><span title.bind="value"></span></section>');
    const template = carrier.content.firstElementChild;
    if (template == null) throw new Error("DOM-node control did not create its enhance root.");
    return {
      exports: { template },
      witness: domNodeSetupFactory.describe(args),
    };
  },
};

const opaqueFunctionsSetupFactory: CompilerSetupFactory = {
  factoryId: OPAQUE_FUNCTIONS_SETUP_ID,
  version: 1,
  exports: ["values"],
  validate: requireNoSetupArgs,
  describe: () => ({ kind: OPAQUE_FUNCTIONS_SETUP_ID, count: 2 }),
};

const opaqueFunctionsSetupMaterializer: JitCompilerSetupMaterializer = {
  factoryId: OPAQUE_FUNCTIONS_SETUP_ID,
  materialize(args) {
    requireNoSetupArgs(args);
    const first = function collision() {};
    const second = function collision() {};
    return {
      exports: { values: [first, second] },
      witness: opaqueFunctionsSetupFactory.describe(args),
    };
  },
};

const runtimeMetadataSetupFactory: CompilerSetupFactory = {
  factoryId: RUNTIME_METADATA_SETUP_ID,
  version: 1,
  exports: ["resource"],
  validate: requireNoSetupArgs,
  describe: () => ({ kind: RUNTIME_METADATA_SETUP_ID }),
};

const runtimeMetadataSetupMaterializer: JitCompilerSetupMaterializer = {
  factoryId: RUNTIME_METADATA_SETUP_ID,
  materialize(args) {
    requireNoSetupArgs(args);
    const processContent: ProcessContentHook = function (_node, _platform, data): false {
      data.explicitUndefined = undefined;
      data.globalSymbol = Symbol.for("aot-blueprint-global");
      data.localSymbolOne = Symbol("collision");
      data.localSymbolTwo = Symbol("collision");
      return false;
    };
    const Resource = CustomElement.define({
      name: "runtime-metadata-el",
      template: "<template></template>",
      processContent,
    }, class {});
    return {
      exports: { resource: Resource },
      witness: runtimeMetadataSetupFactory.describe(args),
    };
  },
};

describe("JIT compiler transformed-blueprint observer", () => {
  it("observes the complete registry as exact recursive canonical data", async () => {
    const observer = controlObserver();
    const oracle = createJitCompilerOracle();

    try {
      const first = await observer.observeCases(JIT_ORACLE_CASES, oracle);
      const repeated = await observer.observeCases(JIT_ORACLE_CASES, oracle);

      expect(JIT_ORACLE_CASES).toHaveLength(50);
      expect(first.observations).toHaveLength(50);
      expect(first.data.selectedCaseCount).toBe(50);
      expect(new Set(first.observations.map((observation) => observation.data.caseId)).size).toBe(50);
      expect(first.canonicalData).toBe(canonicalCompilerJson(first.data));
      expect(first.digest).toMatch(/^sha256:[a-f0-9]{64}$/u);
      expect(first.data.caseSetDigest).toMatch(/^sha256:[a-f0-9]{64}$/u);
      expect(first.observations.every((observation) =>
        observation.canonicalData === canonicalCompilerJson(observation.data)
        && /^sha256:[a-f0-9]{64}$/u.test(observation.digest)
      )).toBe(true);

      // Generated definition names use a process-global counter in the JIT. Definition indexes and owner paths make
      // two complete observations structurally equal without laundering the comparison through a digest.
      expect(first.canonicalData).not.toContain("anonymous-");
      expect(first.canonicalData).not.toContain("outerHTML");
      expect(repeated.canonicalData).toBe(first.canonicalData);
      expect(repeated.digest).toBe(first.digest);
      expect(sameJitCompilerBlueprintBatch(first, repeated)).toBe(true);

      const outcomes = countOutcomes(first);
      expect(outcomes).toEqual({
        "compiled-definition": 45,
        "compiler-error": 4,
        "spread-instructions": 0,
        "unchanged-definition": 1,
      });

      const compiled = first.observations.flatMap((observation) =>
        observation.data.outcome.kind === "compiled-definition"
          ? [{ caseId: observation.data.caseId, outcome: observation.data.outcome }]
          : []
      );
      expect(compiled.flatMap(({ outcome }) => outcome.definitions)).toHaveLength(74);
      expect(compiled.flatMap(({ outcome }) => outcome.definitions.flatMap((definition) => definition.targetMarkers)))
        .toHaveLength(85);
      for (const { caseId, outcome } of compiled) {
        expect(outcome.definitions[0]?.owner, caseId).toEqual({ kind: "root" });
        expect(outcome.definitions.map((definition) => definition.definitionIndex), caseId)
          .toEqual(outcome.definitions.map((_, index) => index));
        expect(countDefinitionReferences(outcome as unknown as CompilerCaseData), caseId)
          .toBe(outcome.definitions.length - 1);
        for (const definition of outcome.definitions) assertWireTargetAlignment(caseId, definition);
      }

      assertHighSignalBlueprints(first);

      const spread = await observer.observeCase(successfulCompileSpreadCase(), oracle);
      expect(spread.data.entryKind).toBe("compile-spread");
      expect(spread.data.outcome).toEqual({
        kind: "spread-instructions",
        instructions: [{
          kind: "property-binding",
          type: 12,
          from: { $kind: "AccessScope", ancestor: 0, name: "value" },
          mode: 2,
          to: "title",
        }],
      });

      const authoredCollision = await observer.observeCase(authoredMarkerCollisionCase(), oracle);
      if (authoredCollision.data.outcome.kind !== "compiled-definition") {
        throw new Error("Authored marker collision case did not compile.");
      }
      const collisionRoot = authoredCollision.data.outcome.definitions[0]!;
      expect(collisionRoot.rows).toHaveLength(0);
      expect(collisionRoot.targetAlignment).toBe("unresolved");
      expect(collisionRoot.targetMarkers).toEqual([expect.objectContaining({
        kind: "open",
        rowIndex: null,
      })]);

      const resolved = await observer.observeCase(resolveResourcesCase(), oracle);
      const resolvedOutcome = requireCompiledObservation(resolved.data.outcome, "resolve-resources control");
      expect(resolvedOutcome.definitions).toHaveLength(1);
      expect(countDefinitionReferences(resolvedOutcome as unknown as CompilerCaseData)).toBe(0);
      const resolvedResources = recordsWithKind(
        resolvedOutcome as unknown as CompilerCaseData,
        "resource-reference",
      );
      const resolvedElement = resolvedResources.find((record) => record.resourceKind === "custom-element");
      const resolvedProcessContent = resolvedResources.find((record) => record.name === "processed-el");
      const resolvedAttribute = resolvedResources.find((record) => record.resourceKind === "custom-attribute");
      expect(resolvedElement).toMatchObject({
        kind: "resource-reference",
        resourceKey: "au:resource:custom-element:resolved-el",
        enhance: false,
        hasSlots: false,
        needsCompile: true,
        processContent: null,
        strict: null,
        Type: expect.objectContaining({ kind: "opaque-function-reference" }),
      });
      expect(resolvedAttribute).toMatchObject({
        kind: "resource-reference",
        resourceKey: "au:resource:custom-attribute:resolved-attr",
        containerStrategy: "reuse",
        Type: expect.objectContaining({ kind: "opaque-function-reference" }),
      });
      expect(resolvedProcessContent).toMatchObject({
        kind: "resource-reference",
        resourceKind: "custom-element",
        processContent: expect.objectContaining({ kind: "opaque-function-reference" }),
        Type: expect.objectContaining({ kind: "opaque-function-reference" }),
      });

      const enhance = await observer.observeCase(enhanceDomNodeCase(), oracle);
      const enhanceRoot = requireCompiledObservation(enhance.data.outcome, "enhance DOM-node control").definitions[0]!;
      expect(enhanceRoot.template.kind).toBe("node");
      expect(enhanceRoot.targetMarkers).toEqual([expect.objectContaining({
        kind: "marker-target",
        markerPath: ["node", "children", 0],
        targetPath: ["node", "children", 1],
        rowIndex: 0,
      })]);

      const metadata = await observer.observeCase(instructionMetadataCollisionCase(), oracle);
      if (metadata.data.outcome.kind !== "unchanged-definition") {
        throw new Error("Instruction metadata collision control did not bypass compilation.");
      }
      const metadataDefinition = metadata.data.outcome.definitions[0]!;
      const metadataInstruction = asRecord(metadataDefinition.rows[0]![0]);
      expect(metadataInstruction.kind).toBe("hydrate-element");
      expect(asRecord(metadataInstruction.data)).toEqual({ label: "metadata", type: 12 });
      expect(asRecord(metadataInstruction.data).kind).toBeUndefined();

      const precompiled = await observer.observeCase(nestedPrecompiledBypassCase(), oracle);
      if (precompiled.data.outcome.kind !== "unchanged-definition") {
        throw new Error("Nested precompiled control did not bypass compilation.");
      }
      expect(precompiled.data.outcome.definitions.map((definition) => ({
        owner: definition.owner.kind,
        name: definition.name,
        templateKind: definition.template.kind,
        targetAlignment: definition.targetAlignment,
      }))).toEqual([
        {
          owner: "root",
          name: { kind: "declared", value: "precompiled-root" },
          templateKind: "markup",
          targetAlignment: "unresolved",
        },
        {
          owner: "template-controller",
          name: { kind: "declared", value: "wire-tc-child" },
          templateKind: "markup",
          targetAlignment: "unresolved",
        },
        {
          owner: "projection",
          name: { kind: "declared", value: "wire-projection-child" },
          templateKind: "node",
          targetAlignment: "wire-count-aligned",
        },
      ]);
      expect(precompiled.data.outcome.definitions[1]?.targetMarkers).toEqual([]);
      expect(countDefinitionReferences(precompiled.data.outcome as unknown as CompilerCaseData)).toBe(2);

      const runtimeMetadata = await observer.observeCase(runtimeMetadataValuesCase(), oracle);
      const runtimeMetadataRoot = requireCompiledObservation(runtimeMetadata.data.outcome, "runtime metadata control")
        .definitions[0]!;
      const metadataHydration = runtimeMetadataRoot.rows.flat().map(asRecord).find((instruction) => {
        const resource = instruction.res == null ? null : asRecord(instruction.res);
        return resource?.kind === "resource-name-reference" && resource.name === "runtime-metadata-el";
      });
      if (metadataHydration == null) throw new Error("Runtime metadata hydration instruction is absent.");
      const runtimeData = asRecord(metadataHydration.data);
      expect(runtimeData.explicitUndefined).toEqual({ kind: "undefined" });
      expect(runtimeData.globalSymbol).toEqual({
        kind: "global-symbol-reference",
        key: "aot-blueprint-global",
      });
      const firstLocalSymbol = asRecord(runtimeData.localSymbolOne);
      const secondLocalSymbol = asRecord(runtimeData.localSymbolTwo);
      expect(firstLocalSymbol).toMatchObject({ kind: "local-symbol-reference", description: "collision" });
      expect(secondLocalSymbol).toMatchObject({ kind: "local-symbol-reference", description: "collision" });
      expect(firstLocalSymbol.referenceIndex).not.toBe(secondLocalSymbol.referenceIndex);

      const identityCollisions = await observer.observeCase(runtimeIdentityCollisionCase(), oracle);
      const identityOutcome = requireCompiledObservation(identityCollisions.data.outcome, "identity collision control");
      const identityData = identityOutcome as unknown as CompilerCaseData;
      const opaqueFunctions = recordsWithKind(identityData, "opaque-function-reference")
        .filter((record) => record.name === "collision");
      expect(opaqueFunctions).toHaveLength(2);
      expect(new Set(opaqueFunctions.map((record) => record.referenceIndex)).size).toBe(2);
      const collidingResources = recordsWithKind(identityData, "resource-reference")
        .filter((record) => typeof record.name === "string" && record.name.startsWith("collision-"));
      expect(collidingResources).toHaveLength(2);
      expect(new Set(collidingResources.map((record) => record.referenceIndex)).size).toBe(2);
      expect(collidingResources.map((record) =>
        asRecord(asArray(record.bindables)[0]).attribute
      )).toEqual(["first-value", "second-value"]);
      expect(canonicalCompilerJson(collidingResources[0])).not.toBe(canonicalCompilerJson(collidingResources[1]));

      const anonymousFirst = await observer.observeCase(emptyNameCase(), oracle);
      const anonymousRepeated = await observer.observeCase(emptyNameCase(), oracle);
      const anonymousRoot = requireCompiledObservation(anonymousFirst.data.outcome, "empty-name control")
        .definitions[0]!;
      expect(anonymousRoot.name).toEqual({ kind: "compiler-generated" });
      expect(anonymousFirst.canonicalData).not.toContain("anonymous-");
      expect(anonymousRepeated.canonicalData).toBe(anonymousFirst.canonicalData);

      await expect(observer.observeCase(failingFocusedInvariantCase(), oracle))
        .rejects.toThrow("observer-verification");
    } finally {
      oracle.dispose();
    }
  }, 20_000);
});

function assertHighSignalBlueprints(batch: JitCompilerBlueprintBatch): void {
  const tenHole = compiledOutcome(batch, "interpolation.text.ten-hole");
  expect(tenHole.definitions).toHaveLength(1);
  expect(tenHole.definitions[0]?.targetMarkers).toHaveLength(10);
  expect(tenHole.definitions[0]?.targetMarkers.every((target) =>
    target.kind === "marker-target" && target.targetNodeKind === "text"
  )).toBe(true);
  expect(tenHole.definitions[0]?.rows.flat().every((instruction) =>
    asRecord(instruction).kind === "text-binding"
  )).toBe(true);

  const nestedControllers = compiledOutcome(batch, "interaction.generated.nested-if-else-template");
  expect(nestedControllers.definitions).toHaveLength(7);
  expect(nestedControllers.definitions.slice(1).every((definition) =>
    definition.owner.kind === "template-controller"
  )).toBe(true);

  const containerless = compiledOutcome(batch, "interaction.generated.containerless-repeat-controller");
  const containerlessRoot = containerless.definitions[0]!;
  expect(containerlessRoot.targetMarkers).toHaveLength(4);
  expect(containerlessRoot.targetMarkers.every((target) =>
    target.kind === "render-location"
    && target.targetNodeKind === "comment"
    && canonicalCompilerJson(target.targetPath) === canonicalCompilerJson(target.endPath)
  )).toBe(true);

  const projection = compiledOutcome(batch, "resource.projection.default-and-named");
  expect(projection.definitions.map((definition) => definition.owner.kind))
    .toEqual(["root", "projection", "projection"]);
  const projectionInstruction = asRecord(projection.definitions[0]!.rows[0]![0]!);
  expect(asArray(projectionInstruction.projections).map((entry) => asRecord(entry).slotName))
    .toEqual(["default", "header"]);

  const capture = compiledOutcome(batch, "resource.capture.value-bind-syntax");
  expect(canonicalCompilerJson(capture)).toContain('"kind":"attribute-syntax"');

  const errors = new Map(batch.observations.flatMap((observation) =>
    observation.data.outcome.kind === "compiler-error"
      ? [[observation.data.caseId, observation.data.outcome.error.code] as const]
      : []
  ));
  expect(Object.fromEntries(errors)).toEqual({
    "diagnostic.local.duplicate-bindable-attribute": "AUR0712",
    "diagnostic.slot.without-shadow": "AUR0717",
    "diagnostic.surrogate.unique-id": "AUR0702",
    "operation.compile-spread.reject-template-controller": "AUR9998",
  });
  const compileSpreadError = observationOutcome(batch, "operation.compile-spread.reject-template-controller");
  expect(compileSpreadError.kind).toBe("compiler-error");
  expect(batch.observations.find((observation) =>
    observation.data.caseId === "operation.compile-spread.reject-template-controller"
  )?.data.entryKind).toBe("compile-spread");

  expect(observationOutcome(batch, "entry.bypass.needs-compile-false").kind).toBe("unchanged-definition");
}

function assertWireTargetAlignment(caseId: string, definition: JitCompilerBlueprintDefinition): void {
  expect(definition.targetAlignment, `${caseId}/definition-${definition.definitionIndex}`).toBe("wire-count-aligned");
  expect(definition.targetMarkers, `${caseId}/definition-${definition.definitionIndex}`).toHaveLength(
    definition.rows.length,
  );
  expect(definition.targetMarkers.map((target) => target.rowIndex), caseId)
    .toEqual(definition.rows.map((_, index) => index));
}

function countOutcomes(batch: JitCompilerBlueprintBatch): Record<JitCompilerBlueprintOutcome["kind"], number> {
  const counts: Record<JitCompilerBlueprintOutcome["kind"], number> = {
    "compiled-definition": 0,
    "compiler-error": 0,
    "spread-instructions": 0,
    "unchanged-definition": 0,
  };
  for (const observation of batch.observations) ++counts[observation.data.outcome.kind];
  return counts;
}

function compiledOutcome(
  batch: JitCompilerBlueprintBatch,
  caseId: string,
): Extract<JitCompilerBlueprintOutcome, { readonly kind: "compiled-definition" }> {
  const outcome = observationOutcome(batch, caseId);
  if (outcome.kind !== "compiled-definition") {
    throw new Error(`Expected ${caseId} to produce a compiled definition, received ${outcome.kind}.`);
  }
  return outcome;
}

function observationOutcome(batch: JitCompilerBlueprintBatch, caseId: string): JitCompilerBlueprintOutcome {
  const observation = batch.observations.find((candidate) => candidate.data.caseId === caseId);
  if (observation == null) throw new Error(`Missing JIT blueprint observation ${caseId}.`);
  return observation.data.outcome;
}

function requireCompiledObservation(
  outcome: JitCompilerBlueprintOutcome,
  label: string,
): Extract<JitCompilerBlueprintOutcome, { readonly kind: "compiled-definition" }> {
  if (outcome.kind !== "compiled-definition") {
    throw new Error(`${label} expected a compiled definition, received ${outcome.kind}.`);
  }
  return outcome;
}

function recordsWithKind(
  value: CompilerCaseData,
  kind: string,
): readonly Readonly<Record<string, CompilerCaseData>>[] {
  if (value == null || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap((child) => recordsWithKind(child, kind));
  const record = value as Readonly<Record<string, CompilerCaseData>>;
  return [
    ...(record.kind === kind ? [record] : []),
    ...Object.values(record).flatMap((child) => recordsWithKind(child, kind)),
  ];
}

function countDefinitionReferences(value: CompilerCaseData): number {
  if (value == null || typeof value !== "object") return 0;
  if (Array.isArray(value)) {
    let count = 0;
    for (const child of value) count += countDefinitionReferences(child);
    return count;
  }
  const record = value as Readonly<Record<string, CompilerCaseData>>;
  let count = record.kind === "compiled-definition-reference" ? 1 : 0;
  for (const child of Object.values(record)) count += countDefinitionReferences(child);
  return count;
}

function asRecord(value: CompilerCaseData | undefined): Readonly<Record<string, CompilerCaseData>> {
  if (value == null || Array.isArray(value) || typeof value !== "object") {
    throw new Error("Expected compiler case data record.");
  }
  return value as Readonly<Record<string, CompilerCaseData>>;
}

function asArray(value: CompilerCaseData | undefined): readonly CompilerCaseData[] {
  if (!Array.isArray(value)) throw new Error("Expected compiler case data array.");
  return value;
}

function controlObserver(): JitCompilerBlueprintObserver {
  return new JitCompilerBlueprintObserver(new JitCompilerCaseExecutor(
    [
      ...JIT_ORACLE_SETUP_FACTORIES,
      domNodeSetupFactory,
      opaqueFunctionsSetupFactory,
      runtimeMetadataSetupFactory,
    ],
    [
      ...JIT_ORACLE_SETUP_MATERIALIZERS,
      domNodeSetupMaterializer,
      opaqueFunctionsSetupMaterializer,
      runtimeMetadataSetupMaterializer,
    ],
  ));
}

function requireNoSetupArgs(args: CompilerCaseData | undefined): void {
  if (args !== undefined) throw new Error("Compiler blueprint control setup does not accept arguments.");
}

function successfulCompileSpreadCase(): CompilerCase {
  const authority = JIT_ORACLE_CASES.find((candidate) =>
    candidate.id === "operation.compile-spread.reject-template-controller"
  );
  if (authority == null) throw new Error("Missing compileSpread authority case.");
  return {
    ...authority,
    id: "test.compile-spread.property-binding",
    family: "compile-spread",
    tags: ["test", "compile-spread"],
    requirement: "The observer retains a successful compileSpread product as a distinct instruction list.",
    obligations: [],
    effects: [],
    world: {
      configuration: "standard",
      entry: {
        kind: "compile-spread",
        requestor: {
          name: "spread-requestor",
          type: "custom-element",
          template: { kind: "markup", value: "<template></template>" },
        },
        attributes: [{
          rawName: "title.bind",
          rawValue: "value",
          target: "title",
          command: "bind",
          parts: ["title", "bind"],
        }],
        target: { kind: "element", tagName: "div" },
      },
      compiler: { debug: false, resolveResources: false },
      setups: [],
      registrations: [],
    },
    oracles: {
      lanes: [{ id: "framework-jit", expectedProduct: "spread-instructions" }],
      claims: [],
    },
    invariants: [],
    contrasts: [],
  };
}

function authoredMarkerCollisionCase(): CompilerCase {
  const authority = JIT_ORACLE_CASES.find((candidate) => candidate.id === "markup.static.platform-attribute");
  if (authority == null) throw new Error("Missing static compiler authority case.");
  return {
    ...authority,
    id: "test.authored-marker-collision",
    family: "compiler-blueprint",
    tags: ["test", "marker", "collision"],
    requirement: "An authored marker spelling remains an unresolved final-DOM candidate without compiler lineage.",
    obligations: [],
    effects: [],
    world: {
      configuration: "standard",
      entry: {
        kind: "compile",
        definition: {
          name: "authored-marker-collision",
          type: "custom-element",
          template: { kind: "markup", value: "<!--au-->" },
        },
      },
      compiler: { debug: false, resolveResources: false },
      setups: [],
      registrations: [],
    },
    oracles: {
      lanes: [{ id: "framework-jit", expectedProduct: "compiled-definition" }],
      claims: [],
    },
    invariants: [],
    contrasts: [],
  };
}

function resolveResourcesCase(): CompilerCase {
  const authority = JIT_ORACLE_CASES.find((candidate) => candidate.id === "resource.element-bindable.same-name-attribute");
  if (authority == null) throw new Error("Missing resolved-resource authority case.");
  return {
    ...authority,
    id: "test.resolve-resources.references",
    family: "compiler-blueprint",
    tags: ["test", "resolve-resources", "references"],
    requirement: "Resolved CE and CA values remain resource references rather than child compiled definitions.",
    obligations: [],
    effects: [],
    world: {
      configuration: "standard",
      entry: {
        kind: "compile",
        definition: {
          name: "resolved-resource-root",
          type: "custom-element",
          template: {
            kind: "markup",
            value: '<resolved-el resolved-attr="literal" value.bind="value"></resolved-el>'
              + '<processed-el normal="source"></processed-el>',
          },
        },
      },
      compiler: { debug: false, resolveResources: true },
      setups: [
        {
          symbol: "resolved-element",
          factory: CUSTOM_ELEMENT_SETUP_ID,
          args: {
            name: "resolved-el",
            template: "<template></template>",
            bindables: [{ name: "value", attribute: "value-a", mode: 2 }],
            capture: false,
            containerless: false,
            shadowMode: null,
          },
        },
        {
          symbol: "resolved-attribute",
          factory: CUSTOM_ATTRIBUTE_SETUP_ID,
          args: {
            name: "resolved-attr",
            bindables: [{ name: "value", attribute: "resolved-attr", mode: 2 }],
            isTemplateController: false,
            noMultiBindings: false,
            defaultProperty: "value",
            aliases: [],
          },
        },
        {
          symbol: "processed-element",
          factory: PROCESS_CONTENT_ELEMENT_SETUP_ID,
          args: {
            name: "processed-el",
            bindable: "textLength",
            sourceAttribute: "normal",
            bindingAttribute: "text-length.bind",
            bindingExpression: "message.length",
            dataKey: "compilerBlueprint",
          },
        },
      ],
      registrations: [
        {
          site: "definition-dependency",
          value: { setup: "resolved-element", export: "resource" },
          cardinality: "single",
        },
        {
          site: "definition-dependency",
          value: { setup: "resolved-attribute", export: "resource" },
          cardinality: "single",
        },
        {
          site: "definition-dependency",
          value: { setup: "processed-element", export: "resource" },
          cardinality: "single",
        },
      ],
    },
    oracles: {
      lanes: [{ id: "framework-jit", expectedProduct: "compiled-definition" }],
      claims: [],
    },
    invariants: [],
    contrasts: [],
  };
}

function enhanceDomNodeCase(): CompilerCase {
  const authority = JIT_ORACLE_CASES.find((candidate) => candidate.id === "markup.static.platform-attribute");
  if (authority == null) throw new Error("Missing DOM-template compiler authority case.");
  return {
    ...authority,
    id: "test.enhance.dom-node-targets",
    family: "compiler-blueprint",
    tags: ["test", "enhance", "dom-node"],
    requirement: "Enhance compilation collects marker targets from the live root node's descendants.",
    obligations: [],
    effects: [],
    world: {
      configuration: "standard",
      entry: {
        kind: "compile",
        definition: {
          name: "enhance-dom-node-root",
          type: "custom-element",
          template: { kind: "setup-ref", value: { setup: "enhance-node", export: "template" } },
          enhance: true,
        },
      },
      compiler: { debug: false, resolveResources: false },
      setups: [{ symbol: "enhance-node", factory: DOM_NODE_SETUP_ID }],
      registrations: [],
    },
    oracles: {
      lanes: [{ id: "framework-jit", expectedProduct: "compiled-definition" }],
      claims: [],
    },
    invariants: [],
    contrasts: [],
  };
}

function instructionMetadataCollisionCase(): CompilerCase {
  const authority = JIT_ORACLE_CASES.find((candidate) => candidate.id === "entry.bypass.needs-compile-false");
  if (authority == null) throw new Error("Missing compiler bypass authority case.");
  return {
    ...authority,
    id: "test.instruction-metadata.type-collision",
    family: "compiler-blueprint",
    tags: ["test", "instruction", "metadata"],
    requirement: "A numeric type field inside HydrateElement data remains metadata, not a nested instruction.",
    obligations: [],
    effects: [],
    world: {
      configuration: "standard",
      entry: {
        kind: "compile",
        definition: {
          name: "instruction-metadata-root",
          type: "custom-element",
          template: { kind: "markup", value: "<template></template>" },
          needsCompile: false,
          instructions: [[{
            type: 0,
            res: "metadata-el",
            props: [],
            projections: null,
            containerless: false,
            captures: [],
            data: { type: 12, label: "metadata" },
          }]],
        },
      },
      compiler: { debug: false, resolveResources: false },
      setups: [],
      registrations: [],
    },
    oracles: {
      lanes: [{ id: "framework-jit", expectedProduct: "unchanged-definition" }],
      claims: [],
    },
    invariants: [],
    contrasts: [],
  };
}

function nestedPrecompiledBypassCase(): CompilerCase {
  const authority = JIT_ORACLE_CASES.find((candidate) => candidate.id === "entry.bypass.needs-compile-false");
  if (authority == null) throw new Error("Missing compiler bypass authority case.");
  const templateControllerChild = {
    name: "wire-tc-child",
    type: "custom-element",
    template: { kind: "markup", value: "<!--au--><span>controller child</span>" },
    needsCompile: false,
    instructions: [],
    surrogates: [],
  } as const;
  const projectionChild = {
    name: "wire-projection-child",
    type: "custom-element",
    template: { kind: "setup-ref", value: { setup: "precompiled-node", export: "template" } },
    needsCompile: false,
    instructions: [],
    surrogates: [],
  } as const;
  return {
    ...authority,
    id: "test.precompiled.nested-definition-family",
    family: "compiler-blueprint",
    tags: ["test", "precompiled", "nested-definition"],
    requirement: "A precompiled bypass retains TC and projection child definitions as declared wire products.",
    obligations: [],
    effects: [],
    world: {
      configuration: "standard",
      entry: {
        kind: "compile",
        definition: {
          name: "precompiled-root",
          type: "custom-element",
          template: { kind: "markup", value: "<template></template>" },
          needsCompile: false,
          instructions: [
            [{
              type: 2,
              def: templateControllerChild,
              res: "if",
              props: [],
            }],
            [{
              type: 0,
              res: "projection-host",
              props: [],
              projections: { default: projectionChild },
              containerless: false,
              captures: [],
              data: {},
            }],
          ],
        },
      },
      compiler: { debug: false, resolveResources: false },
      setups: [{ symbol: "precompiled-node", factory: DOM_NODE_SETUP_ID }],
      registrations: [],
    },
    oracles: {
      lanes: [{ id: "framework-jit", expectedProduct: "unchanged-definition" }],
      claims: [],
    },
    invariants: [],
    contrasts: [],
  };
}

function runtimeMetadataValuesCase(): CompilerCase {
  const authority = JIT_ORACLE_CASES.find((candidate) => candidate.id === "markup.static.platform-attribute");
  if (authority == null) throw new Error("Missing static compiler authority case.");
  return {
    ...authority,
    id: "test.runtime-metadata.undefined-symbols",
    family: "compiler-blueprint",
    tags: ["test", "metadata", "undefined", "symbol"],
    requirement: "Runtime metadata retains explicit undefined and distinct global/local symbol identities.",
    obligations: [],
    effects: [],
    world: {
      configuration: "standard",
      entry: {
        kind: "compile",
        definition: {
          name: "runtime-metadata-root",
          type: "custom-element",
          template: { kind: "markup", value: "<runtime-metadata-el></runtime-metadata-el>" },
        },
      },
      compiler: { debug: false, resolveResources: false },
      setups: [{ symbol: "runtime-metadata-resource", factory: RUNTIME_METADATA_SETUP_ID }],
      registrations: [{
        site: "definition-dependency",
        value: { setup: "runtime-metadata-resource", export: "resource" },
        cardinality: "single",
      }],
    },
    oracles: {
      lanes: [{ id: "framework-jit", expectedProduct: "compiled-definition" }],
      claims: [],
    },
    invariants: [],
    contrasts: [],
  };
}

function runtimeIdentityCollisionCase(): CompilerCase {
  const authority = JIT_ORACLE_CASES.find((candidate) => candidate.id === "markup.static.platform-attribute");
  if (authority == null) throw new Error("Missing static compiler authority case.");
  return {
    ...authority,
    id: "test.runtime-reference.identity-collisions",
    family: "compiler-blueprint",
    tags: ["test", "identity", "collision"],
    requirement: "Runtime-distinct same-name functions and resources retain distinct reference identities and metadata.",
    obligations: [],
    effects: [],
    world: {
      configuration: "standard",
      entry: {
        kind: "compile",
        definition: {
          name: "runtime-reference-collision-root",
          type: "custom-element",
          template: { kind: "markup", value: "<div></div>" },
        },
      },
      compiler: { debug: false, resolveResources: false },
      setups: [
        {
          symbol: "first-resource",
          factory: CUSTOM_ELEMENT_SETUP_ID,
          args: {
            name: "collision-first-el",
            template: "<template></template>",
            bindables: [{ name: "value", attribute: "first-value", mode: 1 }],
            capture: false,
            containerless: false,
            shadowMode: null,
          },
        },
        {
          symbol: "second-resource",
          factory: CUSTOM_ELEMENT_SETUP_ID,
          args: {
            name: "collision-second-el",
            template: "<template></template>",
            bindables: [{ name: "value", attribute: "second-value", mode: 2 }],
            capture: false,
            containerless: false,
            shadowMode: null,
          },
        },
        { symbol: "same-name-functions", factory: OPAQUE_FUNCTIONS_SETUP_ID },
      ],
      registrations: [
        {
          site: "definition-dependency",
          value: { setup: "first-resource", export: "resource" },
          cardinality: "single",
        },
        {
          site: "definition-dependency",
          value: { setup: "second-resource", export: "resource" },
          cardinality: "single",
        },
        {
          site: "definition-dependency",
          value: { setup: "same-name-functions", export: "values" },
          cardinality: "many",
        },
      ],
    },
    oracles: {
      lanes: [{ id: "framework-jit", expectedProduct: "compiled-definition" }],
      claims: [],
    },
    invariants: [],
    contrasts: [],
  };
}

function emptyNameCase(): CompilerCase {
  const authority = JIT_ORACLE_CASES.find((candidate) => candidate.id === "markup.static.platform-attribute");
  if (authority == null) throw new Error("Missing static compiler authority case.");
  return {
    ...authority,
    id: "test.root-name.compiler-generated",
    family: "compiler-blueprint",
    tags: ["test", "name", "generated"],
    requirement: "A falsy authored root name is represented as compiler-generated without leaking its global counter.",
    obligations: [],
    effects: [],
    world: {
      configuration: "standard",
      entry: {
        kind: "compile",
        definition: {
          name: "",
          type: "custom-element",
          template: { kind: "markup", value: '<div title.bind="value"></div>' },
        },
      },
      compiler: { debug: false, resolveResources: false },
      setups: [],
      registrations: [],
    },
    oracles: {
      lanes: [{ id: "framework-jit", expectedProduct: "compiled-definition" }],
      claims: [],
    },
    invariants: [],
    contrasts: [],
  };
}

function failingFocusedInvariantCase(): CompilerCase {
  const authority = JIT_ORACLE_CASES.find((candidate) => candidate.id === "markup.static.platform-attribute");
  if (authority == null) throw new Error("Missing static compiler authority case.");
  return {
    ...authority,
    id: "test.observer-verifies-focused-invariants",
    invariants: [{
      id: "observer-verification",
      description: "A deliberately false expected definition name proves the observer uses verified capture.",
      lanes: ["framework-jit"],
      selector: { kind: "definition-field", field: "name" },
      assertion: { kind: "equal", expected: "deliberately-wrong-name" },
    }],
  };
}
