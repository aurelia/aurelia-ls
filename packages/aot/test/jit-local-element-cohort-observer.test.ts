import { describe, expect, test } from "vitest";

import { JitCompilerCaseExecutor } from "../src/testing/jit-compiler-case-executor.js";
import { createJitCompilerOracle } from "../src/testing/jit-compiler-oracle.js";
import {
  JIT_LOCAL_ELEMENT_COHORT_OBSERVER_VERSION,
  JitLocalElementCohortObserver,
  type JitLocalElementCohortObservationData,
  type JitLocalElementDependencyReference,
} from "../src/testing/jit-local-element-cohort-observer.js";
import { JIT_ORACLE_LOCAL_ELEMENT_CASES } from "../src/testing/jit-oracle-local-element-cases.js";
import {
  JIT_ORACLE_SETUP_FACTORIES,
  JIT_ORACLE_SETUP_MATERIALIZERS,
} from "../src/testing/jit-oracle-setups.js";

describe("JIT local-element cohort observer", () => {
  test("recursively characterizes raw local Types, compiled definitions, and cyclic dependency roles", async () => {
    const executor = new JitCompilerCaseExecutor(
      JIT_ORACLE_SETUP_FACTORIES,
      JIT_ORACLE_SETUP_MATERIALIZERS,
    );
    const observer = new JitLocalElementCohortObserver(executor);
    const oracle = createJitCompilerOracle();
    try {
      const observeAll = async () => {
        const observations = [];
        for (const candidate of JIT_ORACLE_LOCAL_ELEMENT_CASES) {
          observations.push(await observer.observeCase(candidate, oracle));
        }
        return observations;
      };
      const first = await observeAll();
      const repeated = await observeAll();
      expect(repeated.map((observation) => observation.canonicalData))
        .toEqual(first.map((observation) => observation.canonicalData));
      expect(repeated.map((observation) => observation.digest))
        .toEqual(first.map((observation) => observation.digest));

      const observations = new Map(first.map((observation) => [observation.data.caseId, observation.data]));
      expect(first.every((observation) =>
        observation.data.schemaVersion === JIT_LOCAL_ELEMENT_COHORT_OBSERVER_VERSION
        && /^sha256:[0-9a-f]{64}$/u.test(observation.digest)
        && JSON.parse(JSON.stringify(observation.data)) != null
      )).toBe(true);
      const allLocalDefinitions = first.flatMap((observation) => observation.data.localDefinitions);
      expect(allLocalDefinitions).toHaveLength(9);
      expect(allLocalDefinitions.reduce(
        (count, definition) => count + definition.initialDependencies.length,
        0,
      )).toBe(26);
      expect(allLocalDefinitions.reduce(
        (count, definition) => count + definition.compiledDefinitions.length,
        0,
      )).toBe(10);

      const hoisted = requireObservation(observations, "local.hoisted-bindables");
      expect(hoisted.rootDependencies).toEqual([local(0)]);
      expect(hoisted.localDefinitions).toHaveLength(1);
      expect(hoisted.localDefinitions[0]).toMatchObject({
        localIndex: 0,
        parentLocalIndex: null,
        declarationOrdinal: 0,
        name: "local-card",
        generatedTypeName: "LocalCard",
        initialNeedsCompile: true,
        initialDependencies: [entryOwner()],
        rawBindables: [
          { property: "value", attribute: null, mode: "default" },
          { property: "camelValue", attribute: null, mode: "default" },
          { property: "twoWayValue", attribute: "explicit-name", mode: "twoWay" },
          { property: "oneTimeValue", attribute: null, mode: "oneTime" },
          { property: "toViewValue", attribute: null, mode: "toView" },
          { property: "fromViewValue", attribute: null, mode: "fromView" },
        ],
        normalizedBindables: [
          { property: "value", attribute: "value", mode: 0 },
          { property: "camelValue", attribute: "camel-value", mode: 0 },
          { property: "twoWayValue", attribute: "explicit-name", mode: 6 },
          { property: "oneTimeValue", attribute: "one-time-value", mode: 1 },
          { property: "toViewValue", attribute: "to-view-value", mode: 2 },
          { property: "fromViewValue", attribute: "from-view-value", mode: 4 },
        ],
        compiledDefinitions: [{ needsCompile: false, rows: expect.any(Array) }],
      });
      expect(hoisted.localDefinitions[0]?.rawTemplate).toBe(
        "<template>${value}${camelValue}${twoWayValue}${oneTimeValue}${toViewValue}${fromViewValue}</template>",
      );
      expect(hoisted.localDefinitions[0]?.compiledDefinitions[0]?.rows).toHaveLength(6);

      const peers = requireObservation(observations, "local.peer-owner-closure");
      expect(peers.sourceDependencyCount).toBe(1);
      expect(peers.rootDependencies).toEqual([source(0), local(0), local(1), local(2)]);
      expect(peers.localDefinitions.map((definition) => definition.name))
        .toEqual(["local-a", "local-b", "local-c"]);
      expect(peers.localDefinitions.map((definition) => definition.initialDependencies)).toEqual([
        [source(0), entryOwner(), local(1), local(2)],
        [source(0), entryOwner(), local(0), local(2)],
        [source(0), entryOwner(), local(0), local(1)],
      ]);
      expect(peers.localDefinitions.map((definition) => definition.compiledDefinitions[0]?.rows.length))
        .toEqual([3, 1, 0]);
      expect(peers.localDefinitions[0]?.compiledDefinitions).toMatchObject([
        { rows: [
          [{ kind: "hydrate-element", res: { kind: "resource-name-reference", name: "local-b" } }],
          [{ kind: "hydrate-element", res: { kind: "resource-name-reference", name: "owned-dep" } }],
          [{ kind: "hydrate-template-controller", res: { kind: "resource-name-reference", name: "if" } }],
        ] },
        { rows: [[{
          kind: "hydrate-element",
          res: { kind: "resource-name-reference", name: "aot-local-peer-owner" },
        }]] },
      ]);
      expect(peers.localDefinitions[1]?.compiledDefinitions[0]?.rows).toMatchObject([
        [{ kind: "hydrate-element", res: { kind: "resource-name-reference", name: "local-c" } }],
      ]);

      const recursive = requireObservation(observations, "local.recursive-nesting");
      expect(recursive.rootDependencies).toEqual([local(0), local(1)]);
      expect(recursive.localDefinitions.map((definition) => ({
        name: definition.name,
        parent: definition.parentLocalIndex,
        ordinal: definition.declarationOrdinal,
        dependencies: definition.initialDependencies,
      }))).toEqual([
        { name: "outer-local", parent: null, ordinal: 0, dependencies: [entryOwner(), local(1)] },
        { name: "peer-local", parent: null, ordinal: 1, dependencies: [entryOwner(), local(0)] },
        { name: "inner-local", parent: 0, ordinal: 0, dependencies: [entryOwner(), local(1), local(0)] },
        { name: "leaf-local", parent: 2, ordinal: 0, dependencies: [entryOwner(), local(1), local(0), local(2)] },
      ]);
      expect(recursive.localDefinitions[0]?.rawTemplate).toContain('as-custom-element="inner-local"');
      expect(recursive.localDefinitions[2]?.rawTemplate).toContain('as-custom-element="leaf-local"');
      expect(recursive.localDefinitions.every((definition) =>
        definition.compiledDefinitions[0]?.needsCompile === false
      )).toBe(true);

      const controller = requireObservation(observations, "local.use-site-controller-chain");
      expect(controller.rootDependencies).toEqual([source(0), local(0)]);
      expect(controller.localDefinitions[0]).toMatchObject({
        name: "local-row",
        initialDependencies: [source(0), entryOwner()],
        rawBindables: [{ property: "prop", mode: "default" }],
        normalizedBindables: [{ property: "prop", attribute: "prop", mode: 0 }],
        compiledDefinitions: [{ needsCompile: false, rows: expect.any(Array) }],
      });
      expect(controller.localDefinitions[0]?.compiledDefinitions[0]?.rows).toHaveLength(2);
      expect(controller.localDefinitions[0]?.compiledDefinitions[0]?.rows[1]).toMatchObject([
        { kind: "hydrate-element", res: { kind: "resource-name-reference", name: "owned-dep" } },
      ]);

      const scopedWorld = JIT_ORACLE_LOCAL_ELEMENT_CASES.find((candidate) =>
        candidate.id === "local.peer-owner-closure"
      );
      if (scopedWorld == null) throw new Error("Expected a scoped local-element control case.");
      await expect(observer.observeCase({
        ...scopedWorld,
        id: "local.non-dependency-world-control",
        world: {
          ...scopedWorld.world,
          registrations: scopedWorld.world.registrations.map((registration) => ({
            ...registration,
            site: "compilation-local" as const,
          })),
        },
      }, oracle)).rejects.toThrow(/dependency-only world inputs/u);
    } finally {
      oracle.dispose();
    }
  });
});

function requireObservation(
  observations: ReadonlyMap<string, JitLocalElementCohortObservationData>,
  caseId: string,
) {
  const observation = observations.get(caseId);
  if (observation == null) throw new Error(`Expected local-element observation '${caseId}'.`);
  return observation;
}

function source(sourceIndex: number): JitLocalElementDependencyReference {
  return { kind: "source-dependency", sourceIndex };
}

function entryOwner(): JitLocalElementDependencyReference {
  return { kind: "entry-owner-type" };
}

function local(localIndex: number): JitLocalElementDependencyReference {
  return { kind: "local-type", localIndex };
}
