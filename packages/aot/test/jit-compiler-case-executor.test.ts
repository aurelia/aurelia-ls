import { describe, expect, it } from "vitest";
import { BatchRunner } from "../src/testing/batch-runner.js";
import type { CompilerCase, CompilerSetupFactory } from "../src/testing/compiler-case.js";
import {
  JitCompilerCaseExecutor,
  type JitCompilerSetupMaterializer,
  validateJitCharacterizationCases,
} from "../src/testing/jit-compiler-case-executor.js";
import {
  createJitCompilerOracle,
  JitCompilerInvocationError,
  type JitCompilerOracle,
} from "../src/testing/jit-compiler-oracle.js";
import { JIT_ORACLE_CASES } from "../src/testing/jit-oracle-cases.js";

describe("JIT compiler case executor", () => {
  it("materializes setups fresh for every repeat and disposes them in reverse order", async () => {
    const events: string[] = [];
    const factories = [setupFactory("fixture.one", "one"), setupFactory("fixture.two", "two")];
    const materializers = [
      setupMaterializer("fixture.one", "one", events),
      setupMaterializer("fixture.two", "two", events),
    ];
    const candidate = withRegistrationSetups(staticCase(), factories);
    const executor = new JitCompilerCaseExecutor(factories, materializers);
    const oracle = createJitCompilerOracle();
    try {
      const result = await new BatchRunner([candidate], (row, context: JitCompilerOracle) =>
        executor.execute(row, context)
      ).run(oracle, { repeat: 2 });

      expect(result.failedCount).toBe(0);
      expect(events).toEqual([
        "materialize:one", "materialize:two", "dispose:two", "dispose:one",
        "materialize:one", "materialize:two", "dispose:two", "dispose:one",
      ]);
    } finally {
      oracle.dispose();
    }
  });

  it("cleans earlier setups when a later materializer fails", async () => {
    const events: string[] = [];
    const factories = [setupFactory("fixture.one", "one"), setupFactory("fixture.two", "two")];
    const materializers: readonly JitCompilerSetupMaterializer[] = [
      setupMaterializer("fixture.one", "one", events),
      {
        factoryId: "fixture.two",
        materialize: () => {
          events.push("materialize:two");
          throw new Error("second setup failed");
        },
      },
    ];
    const executor = new JitCompilerCaseExecutor(factories, materializers);
    const oracle = createJitCompilerOracle();
    try {
      await expect(executor.execute(withRegistrationSetups(staticCase(), factories), oracle))
        .rejects.toThrow("second setup failed");
      expect(events).toEqual(["materialize:one", "materialize:two", "dispose:one"]);
    } finally {
      oracle.dispose();
    }
  });

  it("disposes a just-created setup after witness failure", async () => {
    const disposed: string[] = [];
    const factory = setupFactory("fixture.one", "declared");
    const materializer: JitCompilerSetupMaterializer = {
      factoryId: factory.factoryId,
      materialize: () => ({
        exports: { registrations: [] },
        witness: { id: "different" },
        dispose: () => { disposed.push("one"); },
      }),
    };
    const oracle = createJitCompilerOracle();
    try {
      await expect(new JitCompilerCaseExecutor([factory], [materializer]).execute(
        withRegistrationSetups(staticCase(), [factory]),
        oracle,
      )).rejects.toThrow("JIT setup witness");
      expect(disposed).toEqual(["one"]);
    } finally {
      oracle.dispose();
    }
  });

  it("disposes setups after focused invariant failure and expected compiler rejection", async () => {
    const events: string[] = [];
    const factory = setupFactory("fixture.one", "one");
    const materializer = setupMaterializer(factory.factoryId, "one", events);
    const badInvariantCase = withRegistrationSetups(staticCase(), [factory]);
    const firstInvariant = badInvariantCase.invariants[0]!;
    const failingCase: CompilerCase = {
      ...badInvariantCase,
      invariants: [{
        ...firstInvariant,
        assertion: { kind: "equal", expected: "wrong-name" },
      }],
    };
    const errorCase = withRegistrationSetups(
      JIT_ORACLE_CASES.find((candidate) => candidate.id === "diagnostic.surrogate.unique-id")!,
      [factory],
    );
    const executor = new JitCompilerCaseExecutor([factory], [materializer]);
    const oracle = createJitCompilerOracle();
    try {
      await expect(executor.execute(failingCase, oracle)).rejects.toThrow(firstInvariant.id);
      await expect(executor.execute(errorCase, oracle)).resolves.toBeUndefined();
      expect(events).toEqual([
        "materialize:one", "dispose:one",
        "materialize:one", "dispose:one",
      ]);
    } finally {
      oracle.dispose();
    }
  });

  it("disposes setup materialization after an export-contract failure", async () => {
    const disposed: string[] = [];
    const factory = setupFactory("fixture.one", "one");
    const materializer: JitCompilerSetupMaterializer = {
      factoryId: factory.factoryId,
      materialize: () => ({
        exports: {},
        witness: { id: "one" },
        dispose: () => { disposed.push("one"); },
      }),
    };
    const oracle = createJitCompilerOracle();
    try {
      await expect(new JitCompilerCaseExecutor([factory], [materializer]).execute(
        withRegistrationSetups(staticCase(), [factory]),
        oracle,
      )).rejects.toThrow("export names");
      expect(disposed).toEqual(["one"]);
    } finally {
      oracle.dispose();
    }
  });

  it("attempts every disposer and preserves cleanup failures", async () => {
    const events: string[] = [];
    const factories = [setupFactory("fixture.one", "one"), setupFactory("fixture.two", "two")];
    const materializers: readonly JitCompilerSetupMaterializer[] = [
      setupMaterializer("fixture.one", "one", events),
      setupMaterializer("fixture.two", "two", events, true),
    ];
    const oracle = createJitCompilerOracle();
    try {
      await expect(new JitCompilerCaseExecutor(factories, materializers).execute(
        withRegistrationSetups(staticCase(), factories),
        oracle,
      )).rejects.toBeInstanceOf(AggregateError);
      expect(events).toEqual(["materialize:one", "materialize:two", "dispose:two", "dispose:one"]);
    } finally {
      oracle.dispose();
    }
  });

  it("does not treat infrastructure errors or throw undefined as expected compiler diagnostics", async () => {
    const candidate = expectedCompilerErrorCase();
    const infrastructureOracle = {
      compile: () => { throw new Error("AUR9998 from setup infrastructure"); },
    } as unknown as JitCompilerOracle;
    const undefinedOracle = {
      compile: () => { throw new JitCompilerInvocationError(undefined); },
    } as unknown as JitCompilerOracle;
    const executor = new JitCompilerCaseExecutor();

    await expect(executor.execute(candidate, infrastructureOracle)).rejects.toThrow("setup infrastructure");
    await expect(executor.execute(candidate, undefinedOracle)).rejects.toThrow("error.code");
  });

  it("rejects non-JIT lanes, equivalence claims, and closed conservation claims", () => {
    const candidate = staticCase();
    expect(() => validateJitCharacterizationCases([{
      ...candidate,
      oracles: {
        ...candidate.oracles,
        lanes: [
          ...candidate.oracles.lanes,
          { id: "semantic-runtime", expectedProduct: "compiled-definition" },
        ],
      },
    }])).toThrow("non-JIT oracle lanes");
    expect(() => validateJitCharacterizationCases([{
      ...candidate,
      oracles: {
        ...candidate.oracles,
        claims: [{
          id: "claim.definition",
          description: "Not executable in the JIT-only runner.",
          kind: "equivalent",
          left: { lane: "framework-jit", product: "compiled-definition" },
          right: { lane: "semantic-runtime", product: "compiled-definition" },
          comparator: "definition.v1",
        }],
      },
    }])).toThrow("equivalence claims");
    expect(() => validateJitCharacterizationCases([{
      ...candidate,
      closure: [{
        dimension: "compiled-output",
        state: "closed",
        reason: "The JIT-only lane cannot prove this.",
        evidenceClaimIds: ["claim.definition"],
      }],
    }])).toThrow("closed conservation claims");
  });
});

function staticCase(): CompilerCase {
  return JIT_ORACLE_CASES.find((candidate) => candidate.id === "markup.static.platform-attribute")!;
}

function setupFactory(factoryId: string, witnessId: string): CompilerSetupFactory {
  return {
    factoryId,
    version: 1,
    exports: ["registrations"],
    validate: () => {},
    describe: () => ({ id: witnessId }),
  };
}

function setupMaterializer(
  factoryId: string,
  witnessId: string,
  events: string[],
  failDispose = false,
): JitCompilerSetupMaterializer {
  return {
    factoryId,
    materialize: () => {
      events.push(`materialize:${witnessId}`);
      return {
        exports: { registrations: [] },
        witness: { id: witnessId },
        dispose: () => {
          events.push(`dispose:${witnessId}`);
          if (failDispose) {
            throw new Error(`dispose ${witnessId} failed`);
          }
        },
      };
    },
  };
}

function withRegistrationSetups(
  candidate: CompilerCase,
  factories: readonly CompilerSetupFactory[],
): CompilerCase {
  return {
    ...candidate,
    world: {
      ...candidate.world,
      setups: factories.map((factory, index) => ({
        symbol: `setup-${index + 1}`,
        factory: factory.factoryId,
      })),
      registrations: factories.map((_factory, index) => ({
        site: "compilation-local" as const,
        value: { setup: `setup-${index + 1}`, export: "registrations" },
        cardinality: "many" as const,
      })),
    },
    contrasts: [],
  };
}

function expectedCompilerErrorCase(): CompilerCase {
  const candidate = staticCase();
  return {
    ...candidate,
    id: "error.compiler-origin",
    oracles: {
      lanes: [{ id: "framework-jit", expectedProduct: "compiler-error" }],
      claims: [],
    },
    invariants: [{
      id: "error.code",
      description: "The compiler must throw the exact expected framework error.",
      lanes: ["framework-jit"],
      selector: { kind: "compiler-error-code" },
      assertion: { kind: "equal", expected: "AUR9998" },
    }],
    contrasts: [],
  };
}
