import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, test } from "vitest";

interface Step {
  readonly name?: string;
  readonly id?: string;
  readonly uses?: string;
  readonly if?: string;
  readonly run?: string;
  readonly env?: Record<string, string>;
  readonly with?: Record<string, unknown>;
  readonly "continue-on-error"?: boolean;
}

interface Job {
  readonly name?: string;
  readonly needs?: string | string[];
  readonly permissions?: Record<string, string>;
  readonly outputs?: Record<string, string>;
  readonly "runs-on"?: string;
  readonly "timeout-minutes"?: number;
  readonly strategy?: {
    readonly "fail-fast"?: boolean;
    readonly matrix?: { readonly include?: readonly Record<string, string>[] };
  };
  readonly steps?: readonly Step[];
}

interface Workflow {
  readonly on?: {
    readonly workflow_dispatch?: {
      readonly inputs?: Record<string, {
        readonly description?: string;
        readonly type?: string;
        readonly default?: unknown;
        readonly required?: boolean;
      }>;
    };
  };
  readonly permissions?: Record<string, string>;
  readonly jobs?: Record<string, Job>;
}

const workflowPath = new URL("../../../.github/workflows/publish-vscode.yml", import.meta.url);
const ciPath = new URL("../../../.github/workflows/ci.yml", import.meta.url);
const extensionPath = new URL("../package.json", import.meta.url);
const workflowText = readFileSync(workflowPath, "utf8");
const ciText = readFileSync(ciPath, "utf8");
const extensionPackage = JSON.parse(readFileSync(extensionPath, "utf8"));
const rootPackage = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8"));
const semanticPackage = JSON.parse(readFileSync(new URL("../../semantic-runtime/package.json", import.meta.url), "utf8"));
const mcpPackage = JSON.parse(readFileSync(new URL("../../mcp/package.json", import.meta.url), "utf8"));
const lanePackage = JSON.parse(readFileSync(new URL("../../lane-harness/package.json", import.meta.url), "utf8"));
const extensionRequire = createRequire(extensionPath);
const vsceRequire = createRequire(extensionRequire.resolve("@vscode/vsce/package.json"));
const yaml = vsceRequire("js-yaml") as { load(value: string): unknown };
const workflow = yaml.load(workflowText) as Workflow;
const ci = yaml.load(ciText) as Workflow;
const jobs = workflow.jobs ?? {};
const ciJobs = ci.jobs ?? {};
const candidate = jobs.candidate;
const host = jobs.host;
const release = jobs.release;

function step(job: Job | undefined, name: string): Step {
  const value = job?.steps?.find((candidateStep) => candidateStep.name === name);
  if (value == null) throw new Error(`Missing workflow step: ${name}`);
  return value;
}
function index(job: Job | undefined, name: string): number {
  return job?.steps?.findIndex((value) => value.name === name) ?? -1;
}

function text(value: Workflow): string {
  return Object.values(value.jobs ?? {})
    .flatMap((job) => job.steps ?? [])
    .flatMap((value) => value.run ?? [])
    .join("\n");
}

function count(value: Workflow, command: string): number {
  return Object.values(value.jobs ?? {})
    .flatMap((job) => job.steps ?? [])
    .flatMap((value) => value.run?.split(/\r?\n/u) ?? [])
    .filter((line) => line.trim() === command)
    .length;
}

const hostMatrix = {
  "fail-fast": false,
  matrix: { include: [
    { lane: "current-stable", label: "current stable" },
    { lane: "minimum", label: "minimum 1.91" },
  ] },
};

describe("VS Code publish workflow contract", () => {
  test("uses least-privilege candidate, parallel host, and release jobs", () => {
    expect(Object.keys(jobs).sort()).toEqual(["candidate", "host", "release"]);
    expect(workflow.permissions).toEqual({});
    expect(candidate).toMatchObject({ name: "Package the exact VSIX candidate", "runs-on": "windows-latest", "timeout-minutes": 30, permissions: { actions: "read", contents: "read" } });
    expect(candidate?.needs).toBeUndefined();
    expect(host).toMatchObject({ name: "Accept exact VSIX (Windows, ${{ matrix.label }})", needs: "candidate", "runs-on": "windows-latest", "timeout-minutes": 75, permissions: { actions: "read", contents: "read" }, strategy: hostMatrix });
    expect(release).toMatchObject({ name: "Attest and publish the accepted VSIX", needs: ["candidate", "host"], "runs-on": "windows-latest", "timeout-minutes": 45, permissions: { actions: "read", contents: "read", "id-token": "write", attestations: "write", "artifact-metadata": "write" } });
  });

  test("pins actions and requires successful full CI for the exact main push SHA", () => {
    const allowed = new Set([
      "actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683",
      "pnpm/action-setup@a7487c7e89a18df4991f7f222e4898a00d66ddda",
      "actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020",
      "actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02",
      "actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093",
      "actions/attest@a1948c3f048ba23858d222213b7c278aabede763",
    ]);
    const actions = Object.values(jobs).flatMap((job) => job.steps ?? []).flatMap((value) => value.uses == null ? [] : [value.uses]);
    expect(actions.every((action) => allowed.has(action))).toBe(true);
    expect(actions.filter((action) => action.includes("download-artifact"))).toHaveLength(2);
    const gate = step(candidate, "Require successful full CI for the release commit");
    expect(gate.env).toEqual({ GH_TOKEN: "${{ github.token }}" });
    for (const witness of ["--workflow ci.yml", "--commit $env:GITHUB_SHA", "--event push", "--status success", "$_.headBranch -eq 'main'", "$_.headSha -eq $env:GITHUB_SHA", "$_.conclusion -eq 'success'"]) expect(gate.run).toContain(witness);
    expect(candidate?.outputs).toMatchObject({ ci_run_id: "${{ steps.ci.outputs.ci_run_id }}", ci_run_url: "${{ steps.ci.outputs.ci_run_url }}" });
  });

  test("keeps Marketplace publication an immutable-tag opt-in", () => {
    expect(workflow.on?.workflow_dispatch?.inputs).toEqual({ publish: { description: "Publish the verified VSIX to the VS Code Marketplace", required: true, default: false, type: "boolean" } });
    const identity = step(candidate, "Validate the committed release identity");
    expect(identity.run).toContain("refs/tags/vscode-v$version");
    expect(identity.run).toContain('git rev-parse "$releaseTag^{commit}"');
    expect(identity.run).toContain("if ($tagCommit -ne $head)");
    expect(identity.run).toContain("git status --porcelain=v1 --untracked-files=all --ignore-submodules=none");
    const publish = step(release, "Publish the exact accepted VSIX");
    expect(publish.if).toBe("${{ inputs.publish }}");
    expect(publish.env).toEqual({ VSCE_PAT: "${{ secrets.VSCE_PAT }}", VSIX_PATH: "${{ github.workspace }}/packages/vscode/.release/${{ needs.candidate.outputs.vsix_name }}" });
    expect(publish.run).toContain('vsce publish --packagePath "$env:VSIX_PATH"');
    expect(publish.run).not.toMatch(/--pat|--skip-duplicate|--target|--pre-release/u);
  });

  test("packages once without duplicating the CI assurance campaign", () => {
    const all = text(workflow);
    expect(all.match(/\bpnpm package:ide:vsix\b/gu)).toHaveLength(1);
    expect(step(candidate, "Package the extension exactly once").run).toBe("pnpm package:ide:vsix");
    expect(index(candidate, "Recheck exact clean release tree") + 1)
      .toBe(index(candidate, "Package the extension exactly once"));
    expect(step(candidate, "Recheck exact clean release tree").run)
      .toContain("git status --porcelain=v1 --untracked-files=all --ignore-submodules=none");
    expect(step(candidate, "Recheck exact clean release tree").run)
      .toContain("git submodule status --recursive");
    expect(count(workflow, "pnpm test:ide:assurance")).toBe(0);
    expect(count(workflow, "pnpm test:ide:support")).toBe(0);
    expect(all).not.toContain("node scripts/run-vitest.mjs packages/language-server/test packages/vscode/test");
    expect(all).not.toMatch(/\bpnpm test:vscode:extension-host:release\b/u);
  });

  test("hands the exact candidate artifact id to both downstream stages", () => {
    const upload = step(candidate, "Upload the exact candidate packet");
    expect(upload.id).toBe("candidate_packet");
    expect(upload["continue-on-error"]).not.toBe(true);
    expect(upload.with).toMatchObject({ "if-no-files-found": "error", "include-hidden-files": true, "compression-level": 0, "retention-days": 30 });
    expect(String(upload.with?.path ?? "").trim().split(/\r?\n/u)).toEqual(["${{ steps.release.outputs.vsix_path }}", "${{ steps.release.outputs.receipt_path }}", "${{ steps.release.outputs.checksum_path }}"]);
    expect(candidate?.outputs).toMatchObject({ candidate_artifact_id: "${{ steps.candidate_packet.outputs.artifact-id }}", candidate_artifact_digest: "${{ steps.candidate_packet.outputs.artifact-digest }}" });
    for (const [job, name] of [[host, "Download the exact candidate packet"], [release, "Download the accepted candidate packet"]] as const) {
      const download = step(job, name);
      expect(download.uses).toBe("actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093");
      expect(download.with).toEqual({
        "artifact-ids": "${{ needs.candidate.outputs.candidate_artifact_id }}",
        path: "packages/vscode/.release",
        "merge-multiple": true,
      });
    }
  });

  test("verifies only the expected downloaded packet before acceptance", () => {
    for (const [job, name] of [[host, "Require only the exact downloaded packet"], [release, "Require only the exact accepted packet"]] as const) {
      const packet = step(job, name);
      expect(packet.env).toMatchObject({ VSIX_NAME: "${{ needs.candidate.outputs.vsix_name }}", RECEIPT_NAME: "${{ needs.candidate.outputs.receipt_name }}", CHECKSUM_NAME: "${{ needs.candidate.outputs.checksum_name }}" });
      expect(packet.run).toContain("Compare-Object -ReferenceObject $expected -DifferenceObject $actual");
      expect(packet.run).toContain("Attributes.HasFlag([IO.FileAttributes]::ReparsePoint)");
      expect(packet.run).toContain("contains a directory or reparse point");
    }
    expect(step(host, "Verify the downloaded VSIX").run).toBe("pnpm verify:ide:vsix");
    expect(step(host, "Re-verify the accepted VSIX").run).toBe("pnpm verify:ide:vsix");
    expect(step(release, "Verify the accepted VSIX").run).toBe("pnpm verify:ide:vsix");
  });

  test("accepts both installed host lanes and retains final installed acceptance", () => {
    expect(extensionPackage.scripts).toMatchObject({
      "test:extension-host:current-stable:built": "node scripts/run-extension-host-tests.mjs --worker --current-stable",
      "test:extension-host:minimum:built": "node scripts/run-extension-host-tests.mjs --worker --minimum",
      "test:extension-host:installed:current-stable:built": "node scripts/run-extension-host-tests.mjs --worker --current-stable --installed-vsix",
      "test:extension-host:installed:minimum:built": "node scripts/run-extension-host-tests.mjs --worker --minimum --installed-vsix",
    });
    expect(step(host, "Test the exact installed VSIX on ${{ matrix.label }}").run).toBe("pnpm --filter aurelia-2 run test:extension-host:installed:${{ matrix.lane }}:built");
    expect(count(workflow, "pnpm verify:ide:vsix:installed")).toBe(1);
    expect(step(release, "Install and accept the exact VSIX").run).toBe("pnpm verify:ide:vsix:installed");
    expect(index(release, "Install and accept the exact VSIX")).toBeLessThan(index(release, "Re-verify the installed artifact bytes"));
    expect(index(release, "Re-verify the installed artifact bytes")).toBeLessThan(index(release, "Attest the exact VSIX provenance"));
    expect(index(release, "Attest the exact VSIX provenance")).toBeLessThan(index(release, "Publish the exact accepted VSIX"));
    expect(index(release, "Publish the exact accepted VSIX")).toBeLessThan(index(release, "Final verification of the published-or-ready bytes"));
  });

  test("attests, publishes, and retains the accepted bytes and evidence", () => {
    expect(step(release, "Attest the exact VSIX provenance").with).toEqual({ "subject-path": "packages/vscode/.release/${{ needs.candidate.outputs.vsix_name }}" });
    expect(step(release, "Resolve retained installed evidence").if).toBe("${{ always() }}");
    expect(step(release, "Final verification of the published-or-ready bytes").run).toBe("pnpm verify:ide:vsix");
    const evidence = step(release, "Upload the exact release packet and acceptance evidence");
    expect(evidence.if).toBe("${{ always() }}");
    expect(evidence.with).toMatchObject({ name: "${{ needs.candidate.outputs.evidence_artifact_name }}", "if-no-files-found": "warn", "include-hidden-files": true, "compression-level": 0, "retention-days": 90 });
    const paths = String(evidence.with?.path ?? "").trim().split(/\r?\n/u);
    expect(paths.slice(0, 3)).toEqual(["packages/vscode/.release/${{ needs.candidate.outputs.vsix_name }}", "packages/vscode/.release/${{ needs.candidate.outputs.receipt_name }}", "packages/vscode/.release/${{ needs.candidate.outputs.checksum_name }}"]);
    expect(paths.join("\n")).not.toMatch(/[*?\[]/u);
    expect(paths).toContain("${{ steps.evidence.outputs.client_log_path }}");
    expect(paths).toContain("${{ steps.evidence.outputs.extension_host_log_path }}");
  });

  test("keeps semantic, IDE, MCP, support, and parallel host gates in CI", () => {
    expect(rootPackage.scripts).toMatchObject({
      "test:semantic-runtime:built": "node scripts/run-vitest.mjs packages/semantic-runtime/test",
      "test:semantic-conformance:built": "node packages/semantic-runtime/scripts/contract-semantic-conformance.mjs --strict",
      "test:semantic-contracts:product:built": "node packages/semantic-runtime/scripts/contract-suite.mjs --route diagnostics --route inquiry --route kernel --route type-system --skip-build",
      "test:semantic-contracts:runtime:built": "node packages/semantic-runtime/scripts/contract-suite.mjs --route evaluation --route di --domain \"mcp;api;open-seams;reason-kinds\" --skip-build",
      "test:ide:lanes:built": "pnpm --filter @aurelia-ls/lane-harness detect",
      "bootstrap:aurelia": "npm --prefix aurelia ci --ignore-scripts && npm --prefix aurelia run build",
    });
    expect(semanticPackage.scripts.test).toBe("pnpm build && pnpm -w run test:semantic-runtime:built");
    expect(lanePackage.scripts.detect).toBe("node scripts/detect-lanes.mjs");
    expect(mcpPackage.scripts.test).toBe("pnpm build && node ../../scripts/run-vitest.mjs --root ../.. --config vitest.config.ts packages/mcp/test");
    const semantic = ciJobs["semantic-runtime"];
    expect(step(semantic, "Test semantic runtime").run).toBe("pnpm test:semantic-runtime:built");
    expect(step(semantic, "Check strict semantic conformance").run).toBe("pnpm test:semantic-conformance:built");
    expect(step(semantic, "Check semantic product contracts").run).toBe("pnpm test:semantic-contracts:product:built");
    expect(step(semantic, "Check semantic runtime contracts").run).toBe("pnpm test:semantic-contracts:runtime:built");
    expect(step(semantic, "Check aggregate IDE lanes").run).toBe("pnpm test:ide:lanes:built");
    for (const name of [
      "Build semantic runtime",
      "Test semantic runtime",
      "Check strict semantic conformance",
      "Check semantic product contracts",
      "Check semantic runtime contracts",
      "Build aggregate IDE lanes",
      "Check aggregate IDE lanes",
    ]) {
      expect(step(semantic, name)["continue-on-error"], name).toBe(true);
    }
    expect(step(semantic, "Require complete semantic assurance").if).toBe("${{ always() }}");

    const products = ciJobs["ide-products"];
    expect(step(products, "Test full language server").run).toBe("node scripts/run-vitest.mjs packages/language-server/test");
    expect(step(products, "Test full VS Code extension").run).toBe("node scripts/run-vitest.mjs packages/vscode/test");
    for (const name of [
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
      expect(step(products, name)["continue-on-error"], name).toBe(true);
    }
    expect(step(products, "Require complete IDE product checks").if).toBe("${{ always() }}");
    expect(step(ciJobs["ide-support"], "Check bounded IDE support contracts").run).toBe("pnpm test:ide:support");
    const mcp = ciJobs["mcp-release"];
    for (const [name, command] of [
      ["Test MCP", "pnpm --filter @aurelia-ls/mcp test"],
      ["Typecheck MCP tests", "pnpm --filter @aurelia-ls/mcp typecheck:test"],
      ["Check MCP release-document contracts", "pnpm --filter @aurelia-ls/mcp contract:release-docs"],
      ["Check MCP adversarial-surface contracts", "pnpm --filter @aurelia-ls/mcp contract:adversarial-surface"],
      ["Check MCP pattern-semantic contracts", "pnpm --filter @aurelia-ls/mcp contract:patterns-semantic"],
      ["Check MCP continuation contracts", "pnpm --filter @aurelia-ls/mcp contract:continuation-pass-through"],
      ["Pack MCP release tarball", "pnpm --filter @aurelia-ls/mcp release:pack"],
      ["Probe release tarball", "pnpm --filter @aurelia-ls/mcp probe:release-tarball"],
      ["Probe project-local install", "pnpm --filter @aurelia-ls/mcp probe:project-local-install"],
    ] as const) {
      expect(step(mcp, name).run).toBe(command);
    }
    for (const name of [
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
      expect(step(mcp, name)["continue-on-error"], name).toBe(true);
    }
    expect(step(mcp, "Require complete MCP release checks").if).toBe("${{ always() }}");
    const ciHost = ciJobs["vscode-extension-host"];
    expect(ciHost).toMatchObject({ "runs-on": "windows-latest", "timeout-minutes": 60, strategy: hostMatrix });
    expect(ciHost?.needs).toBeUndefined();
    expect(step(ciHost, "Build VS Code Worker host inputs").run).toBe("pnpm build:ide");
    expect(step(ciHost, "Test ${{ matrix.label }} VS Code Worker host").run).toBe("pnpm --filter aurelia-2 run test:extension-host:${{ matrix.lane }}:built");
    expect(count(ci, "pnpm test:vscode:extension-host:release")).toBe(0);
  });

  test("excludes update modes, legacy suites, and duplicated release QA", () => {
    expect(workflowText).not.toContain("--update");
    expect(ciText).not.toContain("--update");
    const automatic = text(ci);
    const commands = automatic.split(/\r?\n/u).map((line) => line.trim());
    expect(commands).not.toContain("pnpm build");
    expect(commands).not.toContain("pnpm -w build");
    expect(commands).not.toContain("pnpm test");
    expect(automatic).not.toContain("test:compiler");
    expect(automatic).not.toContain("packages/compiler/test");
    expect(automatic).not.toContain("test:sem-");
    expect(automatic).not.toContain("packages/semantic-workspace/test");
    expect(text(workflow)).not.toMatch(/test:semantic-runtime|test:semantic-conformance|test:semantic-contracts|test:ide:lanes/u);
    expect(text(workflow)).not.toMatch(/\bnpx\b|(?:^|\s)npm version|vsce package|--skip-duplicate|git (?:commit|tag|push)\b/u);
  });

  test("binds live 0.5.1 artifact commands and release contracts", () => {
    expect(extensionPackage.version).toBe("0.5.1");
    expect(rootPackage.scripts["package:ide:vsix"]).toBe("tsc -b --force packages/semantic-runtime packages/language-server packages/vscode && pnpm --filter aurelia-2 run release:pack");
    expect(rootPackage.scripts["verify:ide:vsix"]).toBe("pnpm --filter aurelia-2 run release:verify");
    expect(rootPackage.scripts["verify:ide:vsix:installed"]).toBe("pnpm --filter aurelia-2 run release:verify-installed");
    expect(rootPackage.scripts["test:ide:support:built"]).toContain("packages/vscode/test/vsix-release-contract.test.ts");
    expect(rootPackage.scripts["test:ide:support:built"]).toContain("packages/vscode/test/vsix-installed-contract.test.ts");
    expect(rootPackage.scripts["test:ide:support:built"]).toContain("packages/vscode/test/publish-workflow-contract.test.ts");
  });
});
