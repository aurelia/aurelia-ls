import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, test } from "vitest";

interface WorkflowStep {
  readonly "continue-on-error"?: boolean;
  readonly id?: string;
  readonly name?: string;
  readonly uses?: string;
  readonly if?: string;
  readonly run?: string;
  readonly env?: Readonly<Record<string, string>>;
  readonly with?: Readonly<Record<string, unknown>>;
}

interface WorkflowJob {
  readonly name?: string;
  readonly needs?: unknown;
  readonly "runs-on"?: string;
  readonly "timeout-minutes"?: number;
  readonly steps?: readonly WorkflowStep[];
}

interface GithubWorkflow {
  readonly on?: {
    readonly workflow_dispatch?: {
      readonly inputs?: Readonly<Record<string, {
        readonly type?: string;
        readonly default?: unknown;
        readonly required?: boolean;
      }>>;
    };
  };
  readonly permissions?: Readonly<Record<string, string>>;
  readonly jobs?: Readonly<Record<string, WorkflowJob>>;
}

const workflowPath = new URL("../../../.github/workflows/publish-vscode.yml", import.meta.url);
const ciWorkflowPath = new URL("../../../.github/workflows/ci.yml", import.meta.url);
const extensionPackagePath = new URL("../package.json", import.meta.url);
const rootPackagePath = new URL("../../../package.json", import.meta.url);
const semanticPackagePath = new URL("../../semantic-runtime/package.json", import.meta.url);
const mcpPackagePath = new URL("../../mcp/package.json", import.meta.url);
const lanePackagePath = new URL("../../lane-harness/package.json", import.meta.url);
const workflowText = readFileSync(workflowPath, "utf8");
const ciWorkflowText = readFileSync(ciWorkflowPath, "utf8");
const extensionPackage = JSON.parse(readFileSync(extensionPackagePath, "utf8"));
const rootPackage = JSON.parse(readFileSync(rootPackagePath, "utf8"));
const semanticPackage = JSON.parse(readFileSync(semanticPackagePath, "utf8"));
const mcpPackage = JSON.parse(readFileSync(mcpPackagePath, "utf8"));
const lanePackage = JSON.parse(readFileSync(lanePackagePath, "utf8"));

// Reuse the parser already locked below the pinned VSCE release tool instead of
// adding another release dependency solely for this static workflow contract.
const extensionRequire = createRequire(extensionPackagePath);
const vsceRequire = createRequire(extensionRequire.resolve("@vscode/vsce/package.json"));
const yaml = vsceRequire("js-yaml") as { load(value: string): unknown };
const workflow = yaml.load(workflowText) as GithubWorkflow;
const ciWorkflow = yaml.load(ciWorkflowText) as GithubWorkflow;
const jobs = workflow.jobs ?? {};
const ciJobs = ciWorkflow.jobs ?? {};
const release = jobs["release"];
const steps = release?.steps ?? [];

function namedStep(name: string): WorkflowStep {
  const step = steps.find((candidate) => candidate.name === name);
  if (step == null) throw new Error(`Missing publish workflow step: ${name}`);
  return step;
}

function stepIndex(name: string): number {
  return steps.findIndex((candidate) => candidate.name === name);
}

function namedJobStep(job: WorkflowJob | undefined, name: string): WorkflowStep {
  const step = job?.steps?.find((candidate) => candidate.name === name);
  if (step == null) throw new Error(`Missing workflow step: ${name}`);
  return step;
}

function commandCount(workflowValue: GithubWorkflow, command: string): number {
  return Object.values(workflowValue.jobs ?? {})
    .flatMap((job) => job.steps ?? [])
    .flatMap((step) => step.run?.split(/\r?\n/u) ?? [])
    .filter((line) => line.trim() === command)
    .length;
}

describe("VS Code publish workflow contract", () => {
  test("parses as one Windows release job with immutable action pins", () => {
    expect(Object.keys(jobs)).toEqual(["release"]);
    expect(release).toMatchObject({ "runs-on": "windows-latest" });
    expect(release?.needs).toBeUndefined();
    expect(workflow.permissions).toEqual({
      contents: "read",
      "id-token": "write",
      attestations: "write",
      "artifact-metadata": "write",
    });
    expect(steps.flatMap((step) => step.uses == null ? [] : [step.uses])).toEqual([
      "actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683",
      "pnpm/action-setup@a7487c7e89a18df4991f7f222e4898a00d66ddda",
      "actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020",
      "actions/attest@a1948c3f048ba23858d222213b7c278aabede763",
      "actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02",
    ]);
    expect(namedStep("Set up pnpm 11.5.2").with).toMatchObject({ version: "11.5.2" });
    expect(namedStep("Set up Node.js 22.19.0").with).toMatchObject({ "node-version": "22.19.0" });
    expect(namedStep("Verify pinned release tools").run).toContain("Expected VSCE 3.9.2");
  });

  test("keeps Marketplace publication an immutable-tag opt-in", () => {
    expect(workflow.on?.workflow_dispatch?.inputs).toEqual({
      publish: { description: "Publish the verified VSIX to the VS Code Marketplace", required: true, default: false, type: "boolean" },
    });
    const identity = namedStep("Validate the committed release identity");
    expect(identity.run).toContain("refs/tags/vscode-v$version");
    expect(identity.run).toContain('git rev-parse "$releaseTag^{commit}"');
    expect(identity.run).toContain("if ($tagCommit -ne $head)");
    expect(identity.run).toContain("git status --porcelain=v1 --untracked-files=all --ignore-submodules=none");

    const publish = namedStep("Publish the exact accepted VSIX");
    expect(publish.if).toBe("${{ inputs.publish }}");
    expect(publish.env).toEqual({
      VSCE_PAT: "${{ secrets.VSCE_PAT }}",
      VSIX_PATH: "${{ steps.release.outputs.vsix_path }}",
    });
    expect(publish.run).toContain("pnpm --filter aurelia-2 exec vsce publish --packagePath \"$env:VSIX_PATH\"");
    expect(publish.run).not.toMatch(/--pat|--skip-duplicate|--target|--pre-release/u);
  });

  test("packages once, accepts the same bytes, and verifies around publication", () => {
    const runText = steps.flatMap((step) => step.run == null ? [] : [step.run]).join("\n");
    expect(runText.match(/\bpnpm package:ide:vsix\b/gu)).toHaveLength(1);
    expect(steps.filter((step) => step.run?.trim() === "pnpm verify:ide:vsix")).toHaveLength(3);
    expect(steps.filter((step) => step.run?.trim() === "pnpm verify:ide:vsix:installed")).toHaveLength(1);
    expect(runText).not.toMatch(/\bnpx\b|npm version|vsce package|--skip-duplicate|git (?:commit|tag|push)\b/u);

    expect(stepIndex("Package the extension exactly once"))
      .toBeLessThan(stepIndex("Install and accept the exact VSIX"));
    expect(stepIndex("Install and accept the exact VSIX"))
      .toBeLessThan(stepIndex("Re-verify the installed artifact bytes"));
    expect(stepIndex("Re-verify the installed artifact bytes"))
      .toBeLessThan(stepIndex("Attest the exact VSIX provenance"));
    expect(stepIndex("Attest the exact VSIX provenance"))
      .toBeLessThan(stepIndex("Publish the exact accepted VSIX"));
    expect(stepIndex("Publish the exact accepted VSIX"))
      .toBeLessThan(stepIndex("Final verification of the published-or-ready bytes"));
  });

  test("admits one canonical semantic/lane and Worker-host release gate in CI and publication", () => {
    expect(rootPackage.scripts).toMatchObject({
      "test:semantic-runtime": "pnpm --filter @aurelia-ls/semantic-runtime test",
      "test:semantic-runtime:built": "node scripts/run-vitest.mjs packages/semantic-runtime/test",
      "test:semantic-conformance:built":
        "node packages/semantic-runtime/scripts/contract-semantic-conformance.mjs --strict",
      "test:semantic-contracts:built":
        "pnpm run test:semantic-contracts:product:built && pnpm run test:semantic-contracts:runtime:built",
      "test:semantic-contracts:product:built":
        "node packages/semantic-runtime/scripts/contract-suite.mjs --route diagnostics --route inquiry --route kernel --route type-system --skip-build",
      "test:semantic-contracts:runtime:built":
        "node packages/semantic-runtime/scripts/contract-suite.mjs --route evaluation --route di --domain \"mcp;api;open-seams;reason-kinds\" --skip-build",
      "test:ide:lanes:built": "pnpm --filter @aurelia-ls/lane-harness detect",
      "test:ide:assurance": "pnpm run build:ide:types && pnpm run test:ide:assurance:built",
      "test:ide:assurance:built":
        "pnpm run test:semantic-runtime:built && pnpm run test:semantic-conformance:built && pnpm run test:semantic-contracts:built && pnpm run test:ide:lanes:built",
      "test:vscode:extension-host:release": "pnpm --filter aurelia-2 test:extension-host:release",
    });
    expect(semanticPackage.scripts.test)
      .toBe("pnpm build && pnpm -w run test:semantic-runtime:built");
    expect(lanePackage.scripts.detect).toBe("node scripts/detect-lanes.mjs");
    expect(rootPackage.scripts["test:ide:support"])
      .toBe("pnpm run build:ide && pnpm run test:ide:support:built");
    expect(rootPackage.scripts["bootstrap:aurelia"])
      .toBe("npm --prefix aurelia ci --ignore-scripts && npm --prefix aurelia run build");
    expect(rootPackage.scripts["test:ide:support:built"])
      .toContain("packages/lane-harness/test/detect-lanes.test.ts");
    expect(rootPackage.scripts["test:ide:support:built"])
      .toContain("packages/language-server/test/unit/open-document-source-text-overlay.test.ts");
    expect(rootPackage.scripts["test:ide:support:built"])
      .toContain("packages/language-server/test/unit/rename-transaction-mapping.test.ts");
    const aggregateScriptText = [
      rootPackage.scripts["test:ide:lanes:built"],
      rootPackage.scripts["test:semantic-contracts:built"],
      rootPackage.scripts["test:ide:assurance"],
      rootPackage.scripts["test:ide:assurance:built"],
      lanePackage.scripts.detect,
    ].join("\n");
    expect(aggregateScriptText).not.toContain("--update");

    expect(release).toMatchObject({
      "runs-on": "windows-latest",
      "timeout-minutes": 150,
    });
    expect(namedStep("Check aggregate IDE assurance").run)
      .toBe("pnpm test:ide:assurance");
    expect(namedStep("Test release VS Code Worker hosts").run)
      .toBe("pnpm test:vscode:extension-host:release");
    expect(commandCount(workflow, "pnpm test:ide:assurance")).toBe(1);
    expect(commandCount(workflow, "pnpm test:ide:assurance:built")).toBe(0);
    expect(commandCount(workflow, "pnpm test:vscode:extension-host:release")).toBe(1);
    expect(stepIndex("Test the bounded IDE support contracts"))
      .toBeLessThan(stepIndex("Check aggregate IDE assurance"));
    expect(stepIndex("Check aggregate IDE assurance"))
      .toBeLessThan(stepIndex("Test release VS Code Worker hosts"));
    expect(stepIndex("Test release VS Code Worker hosts"))
      .toBeLessThan(stepIndex("Recheck exact clean release tree"));
    expect(stepIndex("Recheck exact clean release tree") + 1)
      .toBe(stepIndex("Package the extension exactly once"));
    expect(namedStep("Recheck exact clean release tree").run).toContain(
      "git status --porcelain=v1 --untracked-files=all --ignore-submodules=none",
    );
    expect(namedStep("Recheck exact clean release tree").run)
      .toContain("git submodule status --recursive");
    expect(namedStep("Recheck exact clean release tree").run)
      .toContain("steps.release.outputs.head");

    const semanticRuntime = ciJobs["semantic-runtime"];
    expect(semanticRuntime).toMatchObject({
      name: "IDE Semantic Assurance",
      "runs-on": "ubuntu-latest",
      "timeout-minutes": 90,
    });
    expect(namedJobStep(semanticRuntime, "Build semantic runtime").run)
      .toBe("pnpm --filter @aurelia-ls/semantic-runtime build");
    expect(namedJobStep(semanticRuntime, "Test semantic runtime").run)
      .toBe("pnpm test:semantic-runtime:built");
    expect(namedJobStep(semanticRuntime, "Check strict semantic conformance").run)
      .toBe("pnpm test:semantic-conformance:built");
    expect(namedJobStep(semanticRuntime, "Check semantic product contracts").run)
      .toBe("pnpm test:semantic-contracts:product:built");
    expect(namedJobStep(semanticRuntime, "Check semantic runtime contracts").run)
      .toBe("pnpm test:semantic-contracts:runtime:built");
    expect(rootPackage.scripts["test:semantic-contracts:built"])
      .toBe("pnpm run test:semantic-contracts:product:built && pnpm run test:semantic-contracts:runtime:built");
    expect(namedJobStep(semanticRuntime, "Build aggregate IDE lanes").run)
      .toBe("pnpm --filter @aurelia-ls/language-server build");
    expect(namedJobStep(semanticRuntime, "Check aggregate IDE lanes").run)
      .toBe("pnpm test:ide:lanes:built");
    for (const stepName of [
      "Build semantic runtime",
      "Test semantic runtime",
      "Check strict semantic conformance",
      "Check semantic product contracts",
      "Check semantic runtime contracts",
      "Build aggregate IDE lanes",
      "Check aggregate IDE lanes",
    ]) {
      expect(namedJobStep(semanticRuntime, stepName)["continue-on-error"], stepName).toBe(true);
    }
    expect(namedJobStep(semanticRuntime, "Require complete semantic assurance").if)
      .toBe("${{ always() }}");
    expect(commandCount(ciWorkflow, "pnpm test:ide:assurance")).toBe(0);
    expect(commandCount(ciWorkflow, "pnpm test:ide:assurance:built")).toBe(0);
    const semanticRunText = semanticRuntime?.steps?.flatMap((step) => step.run ?? []).join("\n") ?? "";
    expect(semanticRunText).not.toContain("contract-suite.mjs");

    const ideSupport = ciJobs["ide-support"];
    expect(ideSupport).toMatchObject({ "timeout-minutes": 30 });
    expect(ideSupport?.steps?.some((step) => step.name === "Check aggregate IDE assurance"))
      .toBe(false);

    const ideProducts = ciJobs["ide-products"];
    expect(ideProducts).toMatchObject({
      name: "Full Language Server and VS Code Tests",
      "runs-on": "ubuntu-latest",
      "timeout-minutes": 60,
    });
    expect(namedJobStep(ideProducts, "Build language-server types").run)
      .toBe("pnpm --filter @aurelia-ls/language-server build");
    expect(namedJobStep(ideProducts, "Test full language server").run)
      .toBe("node scripts/run-vitest.mjs packages/language-server/test");
    expect(namedJobStep(ideProducts, "Test full VS Code extension").run)
      .toBe("node scripts/run-vitest.mjs packages/vscode/test");
    expect(namedJobStep(ideProducts, "Typecheck language-server tests").run)
      .toBe("pnpm --filter @aurelia-ls/language-server typecheck:test");
    expect(namedJobStep(ideProducts, "Build VS Code types").run)
      .toBe("pnpm exec tsc -b packages/vscode");
    expect(namedJobStep(ideProducts, "Bundle VS Code extension").run)
      .toBe("pnpm --filter aurelia-2 run bundle");
    expect(namedJobStep(ideProducts, "Typecheck VS Code tests").run)
      .toBe("pnpm --filter aurelia-2 typecheck:test");
    for (const stepName of [
      "Build language-server types",
      "Test full language server",
      "Typecheck language-server tests",
      "Lint language server",
      "Build VS Code types",
      "Bundle VS Code extension",
      "Test full VS Code extension",
      "Typecheck VS Code tests",
      "Lint VS Code extension",
    ]) {
      expect(namedJobStep(ideProducts, stepName)["continue-on-error"], stepName).toBe(true);
    }
    expect(namedJobStep(ideProducts, "Require complete IDE product checks").if)
      .toBe("${{ always() }}");

    const mcpRelease = ciJobs["mcp-release"];
    expect(mcpRelease).toMatchObject({ "timeout-minutes": 60 });
    expect(namedJobStep(mcpRelease, "Test MCP").run).toBe("pnpm --filter @aurelia-ls/mcp test");
    expect(namedJobStep(mcpRelease, "Typecheck MCP tests").run)
      .toBe("pnpm --filter @aurelia-ls/mcp typecheck:test");
    expect(namedJobStep(mcpRelease, "Check MCP release-document contracts").run)
      .toBe("pnpm --filter @aurelia-ls/mcp contract:release-docs");
    expect(namedJobStep(mcpRelease, "Check MCP adversarial-surface contracts").run)
      .toBe("pnpm --filter @aurelia-ls/mcp contract:adversarial-surface");
    expect(namedJobStep(mcpRelease, "Check MCP pattern-semantic contracts").run)
      .toBe("pnpm --filter @aurelia-ls/mcp contract:patterns-semantic");
    expect(namedJobStep(mcpRelease, "Check MCP continuation contracts").run)
      .toBe("pnpm --filter @aurelia-ls/mcp contract:continuation-pass-through");
    expect(namedJobStep(mcpRelease, "Pack MCP release tarball").run)
      .toBe("pnpm --filter @aurelia-ls/mcp release:pack");
    expect(namedJobStep(mcpRelease, "Probe release tarball").run)
      .toBe("pnpm --filter @aurelia-ls/mcp probe:release-tarball");
    expect(namedJobStep(mcpRelease, "Probe project-local install").run)
      .toBe("pnpm --filter @aurelia-ls/mcp probe:project-local-install");
    for (const stepName of [
      "Smoke Atlas source maps",
      "Test MCP",
      "Typecheck MCP tests",
      "Probe source stdio MCP",
      "Check MCP release-document contracts",
      "Check MCP adversarial-surface contracts",
      "Check MCP pattern-semantic contracts",
      "Check MCP continuation contracts",
      "Pack MCP release tarball",
      "Probe release tarball",
      "Probe project-local install",
      "Upload MCP release tarball",
    ]) {
      expect(namedJobStep(mcpRelease, stepName)["continue-on-error"], stepName).toBe(true);
    }
    expect(namedJobStep(mcpRelease, "Require complete MCP release checks").if)
      .toBe("${{ always() }}");
    expect(mcpPackage.scripts.test)
      .toBe("pnpm build && node ../../scripts/run-vitest.mjs --root ../.. --config vitest.config.ts packages/mcp/test");

    const automaticRunText = Object.values(ciJobs)
      .flatMap((job) => job.steps ?? [])
      .flatMap((step) => step.run ?? [])
      .join("\n");
    const automaticCommands = automaticRunText.split(/\r?\n/u).map((line) => line.trim());
    expect(automaticCommands).not.toContain("pnpm build");
    expect(automaticCommands).not.toContain("pnpm -w build");
    expect(automaticCommands).not.toContain("pnpm test");
    const hostJob = ciJobs["vscode-extension-host"];
    expect(hostJob).toMatchObject({
      "runs-on": "windows-latest",
      "timeout-minutes": 90,
    });
    expect(hostJob?.needs).toBeUndefined();
    expect(namedJobStep(hostJob, "Test release VS Code Worker hosts").run)
      .toBe("pnpm test:vscode:extension-host:release");
    expect(commandCount(ciWorkflow, "pnpm test:vscode:extension-host:release")).toBe(1);
    const hostRunText = hostJob?.steps?.flatMap((step) => step.run ?? []).join("\n") ?? "";
    expect(hostRunText).not.toContain("pnpm test:vscode:extension-host:current-stable");
    expect(hostRunText).not.toContain("pnpm test:vscode:extension-host:minimum");

    expect(stepIndex("Test release VS Code Worker hosts"))
      .toBeLessThan(stepIndex("Package the extension exactly once"));

    expect(workflowText).not.toContain("--update");
    expect(ciWorkflowText).not.toContain("--update");
    const publicationRunText = steps.flatMap((step) => step.run ?? []).join("\n");
    expect(publicationRunText).not.toContain("pnpm test:vscode:extension-host:current-stable");
    expect(publicationRunText).not.toContain("pnpm test:vscode:extension-host:minimum");
  });

  test("attests and uploads only exact computed release and evidence paths", () => {
    const attest = namedStep("Attest the exact VSIX provenance");
    expect(attest.with).toEqual({ "subject-path": "${{ steps.release.outputs.vsix_path }}" });

    const evidence = namedStep("Resolve retained installed evidence");
    expect(evidence.if).toBe("${{ always() }}");

    const upload = namedStep("Upload the exact release packet and acceptance evidence");
    expect(upload.if).toBe("${{ always() }}");
    expect(upload.with).toMatchObject({
      "if-no-files-found": "warn",
      "include-hidden-files": true,
    });
    const uploadPaths = String(upload.with?.path ?? "").trim().split(/\r?\n/u);
    expect(uploadPaths).toEqual([
      "${{ steps.release.outputs.vsix_path }}",
      "${{ steps.release.outputs.receipt_path }}",
      "${{ steps.release.outputs.checksum_path }}",
      "${{ steps.release.outputs.installed_evidence_path }}",
      "${{ steps.release.outputs.driver_report_path }}",
      "${{ steps.release.outputs.install_stdout_path }}",
      "${{ steps.release.outputs.install_stderr_path }}",
      "${{ steps.release.outputs.host_stdout_path }}",
      "${{ steps.release.outputs.host_stderr_path }}",
      "${{ steps.evidence.outputs.client_log_path }}",
      "${{ steps.evidence.outputs.extension_host_log_path }}",
    ]);
    expect(uploadPaths.join("\n")).not.toMatch(/[*?\[]/u);
    expect(workflowText).toContain("packages/vscode/.release");
    expect(workflowText).toContain(".temp/vscode-vsix-installed/$shortHead");
  });

  test("binds the live 0.5.0 metadata and all three release gates into support CI", () => {
    expect(extensionPackage.version).toBe("0.5.0");
    expect(rootPackage.scripts["package:ide:vsix"]).toBe(
      "tsc -b --force packages/semantic-runtime packages/language-server packages/vscode && pnpm --filter aurelia-2 run release:pack",
    );
    expect(rootPackage.scripts["verify:ide:vsix"]).toBe("pnpm --filter aurelia-2 run release:verify");
    expect(rootPackage.scripts["verify:ide:vsix:installed"])
      .toBe("pnpm --filter aurelia-2 run release:verify-installed");
    expect(rootPackage.scripts["test:ide:support:built"]).toContain("packages/vscode/test/vsix-release-contract.test.ts");
    expect(rootPackage.scripts["test:ide:support:built"]).toContain("packages/vscode/test/vsix-installed-contract.test.ts");
    expect(rootPackage.scripts["test:ide:support:built"]).toContain("packages/vscode/test/publish-workflow-contract.test.ts");
  });
});
