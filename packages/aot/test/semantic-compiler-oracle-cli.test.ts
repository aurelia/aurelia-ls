import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = resolve(packageRoot, "../..");
const runnerPath = resolve(packageRoot, "scripts/run-semantic-compiler-oracle.mjs");

describe("AOT semantic compiler oracle CLI", () => {
  test("emits one authority-bound observation ledger without claiming equivalence", () => {
    const result = spawnSync(process.execPath, [runnerPath, "--json", "--build-id=vitest-contract"], {
      cwd: workspaceRoot,
      encoding: "utf8",
      windowsHide: true,
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const receipt = JSON.parse(result.stdout) as SemanticCompilerOracleReceipt;
    expect(receipt.schemaVersion).toBe("aurelia-ls/aot-semantic-compiler-oracle-run/v1");
    expect(receipt.environment.buildId).toBe("vitest-contract");
    expect(receipt.environment.authorityStable).toBe(true);
    expect(receipt.environment.executedArtifacts.aot.digest).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(receipt.environment.executedArtifacts.semanticRuntime.digest).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(receipt.caseRegistry.fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(receipt.gallery).toMatchObject({
      compilerTreeProfile: "semantic-runtime/authored-html-compiler-input/v1",
      selectedCaseCount: 50,
      admittedCaseCount: 33,
      unsupportedCaseCount: 17,
    });
    expect(receipt.run.observationAuthority).toMatchObject({
      kind: "synchronous-app-emission-bracket",
      portableAnalysisBasis: null,
      currentAtEgress: true,
      executableReceiptLifetime: "retired-before-return",
    });
    expect(receipt.run.summaryAnalysisBasis?.revision)
      .toMatch(/^semantic-analysis-basis\/1:[A-Za-z0-9_-]+$/u);
    expect(receipt.run.summaryAnalysisDepth).toBe("runtime-topology");
    expect(receipt.run.observations).toHaveLength(33);
    expect(receipt.run.missingCaseIds).toEqual([]);
    const duplicate = receipt.run.observations.find((observation) =>
      observation.caseId === "interaction.browser.duplicate-binding-elision"
    );
    expect(duplicate?.compiledTemplate.rootRows[0]?.instructionKinds)
      .toEqual(["property-binding", "property-binding"]);
    expect(duplicate?.siteCursor).toMatchObject({
      admissionState: "cursor-transcript",
      frontierKind: "at-live-attribute-relowering",
      currentness: {
        exact: true,
        forestMutationRevisionDelta: 0,
        globalOperationCountDelta: 0,
      },
    });
    expect(receipt).not.toHaveProperty("satisfiedClaimIds");
  }, 15_000);
});

interface SemanticCompilerOracleReceipt {
  readonly schemaVersion: string;
  readonly environment: {
    readonly buildId: string | null;
    readonly authorityStable: boolean;
    readonly executedArtifacts: {
      readonly aot: { readonly digest: string };
      readonly semanticRuntime: { readonly digest: string };
    };
  };
  readonly caseRegistry: { readonly fingerprint: string };
  readonly gallery: {
    readonly compilerTreeProfile: string;
    readonly selectedCaseCount: number;
    readonly admittedCaseCount: number;
    readonly unsupportedCaseCount: number;
  };
  readonly run: {
    readonly observationAuthority: {
      readonly kind: string;
      readonly portableAnalysisBasis: null;
      readonly currentAtEgress: boolean | null;
      readonly executableReceiptLifetime: string;
    };
    readonly summaryAnalysisBasis: { readonly revision: string } | null;
    readonly summaryAnalysisDepth: string | null;
    readonly observations: readonly {
      readonly caseId: string;
      readonly compiledTemplate: {
        readonly rootRows: readonly { readonly instructionKinds: readonly string[] }[];
      };
      readonly siteCursor: {
        readonly admissionState: string;
        readonly frontierKind?: string | null;
        readonly currentness?: {
          readonly exact: boolean;
          readonly forestMutationRevisionDelta: number;
          readonly globalOperationCountDelta: number;
        };
      };
    }[];
    readonly missingCaseIds: readonly string[];
  };
}
