import { describe, expect, it } from "vitest";
import { CompilerCaseCatalog } from "../src/testing/compiler-case-catalog.js";
import {
  BROWSER_TREE_ORACLE_CASES,
  BROWSER_TREE_ORACLE_COMPARATOR_ID,
  validateBrowserTreeOracleCases,
} from "../src/testing/browser-tree-oracle-cases.js";
import { assertCompilerCaseData } from "../src/testing/compiler-canonical-data.js";
import { compilerCaseSearchTerms } from "../src/testing/compiler-case-search.js";
import { compilerCaseRegistryFingerprint } from "../src/testing/compiler-case-fingerprint.js";
import { BatchRunner } from "../src/testing/batch-runner.js";
import type { CompilerCase, CompilerSetupFactory } from "../src/testing/compiler-case.js";
import { COMPILER_OBLIGATION_CATALOG } from "../src/testing/compiler-obligation-catalog.js";
import { auditCompilerObligationCoverage } from "../src/testing/compiler-obligation-coverage.js";
import { JIT_ORACLE_CASES } from "../src/testing/jit-oracle-case-registry.js";
import { JIT_ORACLE_SETUP_FACTORIES } from "../src/testing/jit-oracle-setups.js";

describe("compiler case contract", () => {
  it("admits JIT characterizations without equivalence or false closed claims", () => {
    const catalog = caseCatalog(JIT_ORACLE_CASES);

    expect(catalog.cases).toHaveLength(46);
    expect(catalog.cases.every((candidate) => candidate.oracles.claims.length === 0)).toBe(true);
    expect(catalog.cases.every((candidate) => candidate.closure.every((claim) => claim.state !== "closed")))
      .toBe(true);
    expect(catalog.cases.some((candidate) => candidate.closure.some((claim) => claim.state === "open"))).toBe(true);
    expect(catalog.cases.every((candidate) => candidate.provenance.length > 0)).toBe(true);
  });

  it("keeps unwitnessed and open obligations visible instead of deriving a coverage score", () => {
    const audit = caseCatalog(JIT_ORACLE_CASES).obligationAudit;

    expect(audit.obligationCount).toBe(COMPILER_OBLIGATION_CATALOG.length);
    expect(audit.witnessedCount).toBeGreaterThan(0);
    expect(audit.unwitnessedCount).toBeGreaterThan(0);
    expect(audit.closedCount).toBe(0);
    const propertyBinding = audit.rows.find((row) => row.id === "compiler.instruction.property-binding");
    expect(propertyBinding?.state).toBe("witnessed-not-claimed");
    expect(propertyBinding?.witnesses).toContainEqual(expect.objectContaining({
      caseId: "binding.property.input-value",
      role: "primary",
    }));
    expect(audit.rows.find((row) => row.id === "compiler.browser-tree.authored-lineage")).toMatchObject({
      state: "unwitnessed",
      witnesses: [],
    });
  });

  it("admits validated browser evidence into obligation coverage without making it a JIT world", () => {
    validateBrowserTreeOracleCases(BROWSER_TREE_ORACLE_CASES);
    const catalog = new CompilerCaseCatalog(
      JIT_ORACLE_CASES,
      JIT_ORACLE_SETUP_FACTORIES,
      COMPILER_OBLIGATION_CATALOG,
      [BROWSER_TREE_ORACLE_COMPARATOR_ID],
      BROWSER_TREE_ORACLE_CASES,
    );

    expect(catalog.cases).toHaveLength(JIT_ORACLE_CASES.length);
    expect(catalog.evidenceCases).toHaveLength(17);
    expect(catalog.conservationCases).toHaveLength(JIT_ORACLE_CASES.length + BROWSER_TREE_ORACLE_CASES.length);
    expect(catalog.cases.every((candidate) => candidate.caseKind === "compiler-world")).toBe(true);
    expect(catalog.evidenceCases.every((candidate) => candidate.caseKind === "browser-tree")).toBe(true);
    expect(catalog.evidenceCases.every((candidate) => !("world" in candidate))).toBe(true);
    const browserFragmentContext = catalog.obligationAudit.rows.find((row) =>
      row.id === "compiler.browser-tree.fragment-context"
    );
    expect(browserFragmentContext?.state).toBe("witnessed-not-claimed");
    expect(browserFragmentContext?.witnesses).toHaveLength(17);
    expect(catalog.obligationAudit.rows.find((row) =>
      row.id === "compiler.browser-tree.fragment-context"
    )?.witnesses.every((witness) => witness.evidenceKind === "validated-evidence")).toBe(true);
    expect(catalog.obligationAudit.rows.find((row) =>
      row.id === "compiler.browser-tree.root-wrapper"
    )?.witnesses.some((witness) => witness.evidenceKind === "validated-evidence")).toBe(false);
    expect(catalog.obligationAudit.rows.find((row) =>
      row.id === "compiler.browser-tree.authored-lineage"
    )?.witnesses.some((witness) => witness.evidenceKind === "validated-evidence")).toBe(false);
    expect(catalog.obligationAudit.rows.find((row) =>
      row.id === "compiler.browser-tree.compiler-lineage"
    )?.witnesses.some((witness) => witness.evidenceKind === "validated-evidence")).toBe(false);

    const evaluatedCase = BROWSER_TREE_ORACLE_CASES.find((candidate) =>
      candidate.oracles.claims.some((claim) => claim.kind === "equivalent")
    )!;
    const claim = evaluatedCase.oracles.claims.find((candidate) => candidate.kind === "equivalent")!;
    const evaluatedAudit = auditCompilerObligationCoverage(
      COMPILER_OBLIGATION_CATALOG,
      catalog.conservationCases,
      [{ caseId: evaluatedCase.id, satisfiedClaimIds: [claim.id] }],
    );
    expect(evaluatedAudit.rows.find((row) =>
      row.id === "compiler.browser-tree.fragment-context"
    )?.state).toBe("witnessed-closed");
  });

  it("fingerprints canonical descriptors independent of registry order", () => {
    const forward = compilerCaseRegistryFingerprint(JIT_ORACLE_CASES, JIT_ORACLE_SETUP_FACTORIES);
    const reversed = compilerCaseRegistryFingerprint([...JIT_ORACLE_CASES].reverse(), JIT_ORACLE_SETUP_FACTORIES);
    const changed = compilerCaseRegistryFingerprint([
      withCase(JIT_ORACLE_CASES[0]!, { requirement: "Changed semantic requirement." }),
      ...JIT_ORACLE_CASES.slice(1),
    ], JIT_ORACLE_SETUP_FACTORIES);

    expect(reversed).toBe(forward);
    expect(changed).not.toBe(forward);
  });

  it("keeps setup-backed fingerprints independent of registry order", () => {
    const factory: CompilerSetupFactory = {
      factoryId: "fixture.fingerprint",
      version: 1,
      exports: ["registration"],
      validate: () => {},
      describe: (args) => ({ kind: "fixture.fingerprint", args: args ?? null }),
    };
    const cases = JIT_ORACLE_CASES.slice(0, 2).map((candidate, index) => withCase(candidate, {
      world: {
        ...candidate.world,
        setups: [{ symbol: `fingerprint-${index}`, factory: factory.factoryId, args: { index } }],
        registrations: [{
          site: "compilation-local",
          value: { setup: `fingerprint-${index}`, export: "registration" },
          cardinality: "single",
        }],
      },
    }));

    expect(compilerCaseRegistryFingerprint(cases, [factory]))
      .toBe(compilerCaseRegistryFingerprint([...cases].reverse(), [factory]));
  });

  it("selects cases by obligation and pinned provenance without coupling the generic batch registry", () => {
    const runner = new BatchRunner(JIT_ORACLE_CASES, () => {}, compilerCaseSearchTerms);

    expect(runner.plan({ query: "compiler.entry.bypass" }).selected.map((candidate) => candidate.id))
      .toEqual(["entry.bypass.needs-compile-false"]);
    expect(runner.plan({ query: "template-compiler.convention.spec.ts" }).selected.map((candidate) => candidate.id))
      .toContain("binding.property.input-value");
  });

  it("rejects setup references that are absent from the versioned manifest", () => {
    const candidate = JIT_ORACLE_CASES[0]!;
    const withUnknownFactory = withCase(candidate, {
      world: {
        ...candidate.world,
        setups: [{ symbol: "child", factory: "missing.factory" }],
      },
    });

    expect(() => caseCatalog([withUnknownFactory])).toThrow("unknown setup factory");
  });

  it("rejects undeclared setup exports before executing an oracle", () => {
    const manifest: CompilerSetupFactory = {
      factoryId: "fixture.element",
      version: 1,
      exports: ["known"],
      validate: () => {},
      describe: () => ({ kind: "fixture.element" }),
    };
    const candidate = JIT_ORACLE_CASES[0]!;
    const withUnknownExport = withCase(candidate, {
      world: {
        ...candidate.world,
        setups: [{ symbol: "child", factory: manifest.factoryId }],
        registrations: [{
          site: "definition-dependency",
          value: { setup: "child", export: "missing" },
          cardinality: "single",
        }],
      },
    });

    expect(() => caseCatalog([withUnknownExport], [manifest])).toThrow("no declared export missing");
  });

  it("does not allow a closed dimension without an equivalence claim", () => {
    const candidate = JIT_ORACLE_CASES[0]!;
    const falselyClosed = withCase(candidate, {
      closure: [{
        dimension: "compiled-output",
        state: "closed",
        reason: "JIT output alone is insufficient.",
      }],
    });

    expect(() => caseCatalog([falselyClosed])).toThrow("without an oracle claim");
  });

  it("rejects live executable values in focused invariant data", () => {
    const candidate = JIT_ORACLE_CASES[0]!;
    const first = candidate.invariants[0]!;
    const nonCanonical = withCase(candidate, {
      invariants: [{
        ...first,
        assertion: { kind: "equal", expected: (() => undefined) as never },
      }],
    });

    expect(() => caseCatalog([nonCanonical])).toThrow("non-canonical function");
  });

  it("rejects opaque, accessor, cyclic, and JSON-colliding case data", () => {
    let getterRuns = 0;
    const accessor = {} as { value?: string };
    Object.defineProperty(accessor, "value", {
      enumerable: true,
      get: () => {
        ++getterRuns;
        return "hidden";
      },
    });
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    const nonEnumerable = {};
    Object.defineProperty(nonEnumerable, "hidden", { value: 1, enumerable: false });
    const symbolArray: unknown[] = [];
    Object.defineProperty(symbolArray, Symbol("hidden"), { value: 1, enumerable: true });

    expect(() => assertCompilerCaseData(new Date(), "date")).toThrow("plain object");
    expect(() => assertCompilerCaseData(accessor, "accessor")).toThrow("must not use an accessor");
    expect(getterRuns).toBe(0);
    expect(() => assertCompilerCaseData(cyclic, "cycle")).toThrow("contains a cycle");
    expect(() => assertCompilerCaseData(nonEnumerable, "non-enumerable")).toThrow("must be enumerable");
    expect(() => assertCompilerCaseData(symbolArray, "symbol-array")).toThrow("symbol array key");
    expect(() => assertCompilerCaseData(-0, "negative-zero")).toThrow("non-canonical number");
  });
});

function withCase(candidate: CompilerCase, changes: Partial<CompilerCase>): CompilerCase {
  return { ...candidate, ...changes };
}

function caseCatalog(
  cases: readonly CompilerCase[],
  manifests: readonly CompilerSetupFactory[] = JIT_ORACLE_SETUP_FACTORIES,
): CompilerCaseCatalog {
  return new CompilerCaseCatalog(cases, manifests, COMPILER_OBLIGATION_CATALOG);
}
