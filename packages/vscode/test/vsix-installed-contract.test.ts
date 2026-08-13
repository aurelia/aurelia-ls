import { afterEach, describe, expect, test } from "vitest";
import {
  existsSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const moduleUrl = new URL("../scripts/verify-installed-vsix.mjs", import.meta.url);
const driverSuitePath = new URL("./installed-driver/suite/index.cjs", import.meta.url);
const driverExtensionPath = new URL("./installed-driver/extension.cjs", import.meta.url);
const rootPackagePath = new URL("../../../package.json", import.meta.url);
const vscodePackagePath = new URL("../package.json", import.meta.url);
const testReadmePath = new URL("./README.md", import.meta.url);
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    const normalized = path.resolve(root);
    expect(normalized).toContain(`${path.sep}.temp${path.sep}`);
    if (existsSync(normalized)) rmSync(normalized, { recursive: true, force: true });
  }
});

describe("installed VSIX release gate", () => {
  test("exposes verification-only root and package scripts", () => {
    const rootPackage = JSON.parse(readFileSync(rootPackagePath, "utf8"));
    const vscodePackage = JSON.parse(readFileSync(vscodePackagePath, "utf8"));
    expect(rootPackage.scripts["verify:ide:vsix:installed"])
      .toBe("pnpm --filter aurelia-2 run release:verify-installed");
    expect(vscodePackage.scripts["release:verify-installed"])
      .toBe("node scripts/verify-installed-vsix.mjs");
    expect(rootPackage.scripts["verify:ide:vsix:installed"]).not.toMatch(/build|package|vsce/u);
    expect(vscodePackage.scripts["release:verify-installed"]).not.toMatch(/build|package|vsce/u);
  });

  test("plans one exact artifact install and one inert-driver host launch without packaging", async () => {
    const gate = await loadGate();
    const head = "0123456789abcdef0123456789abcdef01234567";
    const plan = gate.publicInstalledPlan({
      repositoryHead: head,
      packageJson: { name: "aurelia-2", version: "0.5.0" },
    });

    expect(plan).toMatchObject({
      schemaVersion: "aurelia-ls/installed-vsix-plan/v2",
      repositoryHead: head,
      requestedVSCodeVersion: "stable",
      packageCount: 0,
      downloadResolutionCount: 1,
      installCount: 1,
      hostLaunchCount: 1,
      retryCount: 0,
      replacementCount: 0,
      productExtensionDevelopmentPathCount: 0,
      installedInventoryPolicy: {
        payload: expect.stringContaining("except package.json installed byte-for-byte"),
        packageManifest: expect.stringContaining("exact VS Code __metadata transform"),
        installerMetadataPath: ".vsixmanifest",
        installerMetadataArchivePath: "extension.vsixmanifest",
        installerMetadataAuthority: "exact byte equality with the generated VSIX control entry",
      },
    });
    expect(plan.artifact).toBe("packages/vscode/.release/aurelia-2-0.5.0-0123456789ab.vsix");
    expect(plan.driverExtensionDevelopmentPath).toBe("packages/vscode/test/installed-driver");
    expect(() => gate.installedLayout("0123456789ab")).toThrow(/full lowercase hexadecimal/u);
  });

  test("constructs exact shared-profile install and driver-only host invocations", async () => {
    const gate = await loadGate();
    const root = contractRoot(gate, "invocation-");
    const layout = gate.installedLayout("0123456789abcdef0123456789abcdef01234567", root);
    let resolverOptions: unknown;
    const install = gate.buildInstallInvocation({
      electron: {
        resolveCliArgsFromVSCodeExecutablePath: (_executable: string, options: unknown) => {
          resolverOptions = options;
          return [process.execPath];
        },
        resolveCliPathFromVSCodeExecutablePath: () => process.execPath,
      },
      vscodeExecutablePath: process.execPath,
      artifactPath: path.join(root, "artifact.vsix"),
      layout,
    });
    expect(resolverOptions).toEqual({ reuseMachineInstall: true });
    expect(install.args).toEqual([
      `--user-data-dir=${layout.userDataDirectory}`,
      `--extensions-dir=${layout.extensionsDirectory}`,
      "--install-extension",
      path.join(root, "artifact.vsix"),
    ]);
    expect(install.args.join(" ")).not.toMatch(/--force|--disable-extensions|--inspect/u);

    const productPath = path.join(layout.extensionsDirectory, "aureliaeffect.aurelia-2-0.5.0");
    const host = gate.buildHostInvocation({
      vscodeExecutablePath: process.execPath,
      resolvedVersion: "1.132.0",
      product: { extensionPath: productPath },
      identity: identity("0.5.0"),
      layout,
    });
    expect(host.extensionDevelopmentPath).toBe(gate.driverRoot);
    expect(host.extensionDevelopmentPath).not.toBe(productPath);
    expect(host.launchArgs).toContain(`--user-data-dir=${layout.userDataDirectory}`);
    expect(host.launchArgs).toContain(`--extensions-dir=${layout.extensionsDirectory}`);
    expect(host.launchArgs).toContain("--log=trace");
    expect(host.launchArgs.join(" ")).not.toMatch(/--disable-extensions|--inspect/u);
    expect(host.extensionTestsEnv).not.toHaveProperty("AURELIA_LS_FORCE_IPC_TRANSPORT");
    expect(host.extensionTestsEnv).toMatchObject({
      AURELIA_LS_INSTALLED_PRODUCT_PATH: productPath,
      AURELIA_LS_INSTALLED_RELATED_PATH: path.join(layout.workspaceRoot, gate.relatedRelativePath),
      AURELIA_LS_EXTENSION_HOST_OBSERVATION: "1",
      AURELIA_LS_EXTENSION_HOST_TAIL_OBSERVATION: "1",
    });

    expect(() => gate.buildInstallInvocation({
      electron: {
        resolveCliArgsFromVSCodeExecutablePath: () => [process.execPath, "--install-extension", "evil.vsix"],
      },
      vscodeExecutablePath: process.execPath,
      artifactPath: path.join(root, "artifact.vsix"),
      layout,
    })).toThrow(/exactly one executable/u);
  });

  test("requires one error-free current-stable resolution report", async () => {
    const gate = await loadGate();
    const resolveWith = (events: Array<{ kind: "report" | "error"; value: any }>) => gate.resolveVSCodeCurrentStable({
      consoleReporter: { report: () => {}, error: () => {} },
      electron: {
        ProgressReportStage: { ResolvedVersion: "resolved-version", Retrying: "retrying" },
        runTests: async () => 0,
        downloadAndUnzipVSCode: async ({ reporter }: any) => {
          for (const event of events) reporter[event.kind](event.value);
          return process.execPath;
        },
      },
    });

    const accepted = await resolveWith([
      { kind: "report", value: { stage: "resolved-version", version: "1.132.0" } },
    ]);
    expect(accepted).toMatchObject({ resolvedVersion: "1.132.0", vscodeExecutablePath: process.execPath });
    expect(() => gate.validateResolution(accepted)).not.toThrow();
    const missing = await resolveWith([]);
    expect(() => gate.validateResolution(missing)).toThrow(/reported 0 exact versions/u);
    const duplicate = await resolveWith([
      { kind: "report", value: { stage: "resolved-version", version: "1.132.0" } },
      { kind: "report", value: { stage: "resolved-version", version: "1.132.0" } },
    ]);
    expect(() => gate.validateResolution(duplicate)).toThrow(/reported 2 exact versions/u);
    const reporterError = await resolveWith([
      { kind: "report", value: { stage: "resolved-version", version: "1.132.0" } },
      { kind: "error", value: new Error("download reporter fault") },
    ]);
    expect(() => gate.validateResolution(reporterError)).toThrow(/reported errors.*download reporter fault/u);
    const retry = await resolveWith([
      { kind: "report", value: { stage: "resolved-version", version: "1.132.0" } },
      { kind: "report", value: { stage: "retrying", attempt: 1, totalAttempts: 3 } },
    ]);
    expect(() => gate.validateResolution(retry)).toThrow(/retried 1 time/u);
  });

  test("executes one injected verify-install-host-verify sequence and binds retained evidence", async () => {
    const gate = await loadGate();
    const harness = installedHarness(gate, "success-");

    const evidence = await gate.verifyInstalledVsix(harness.dependencies);

    expect(evidence.status).toBe("passed");
    expect(evidence.method).toMatchObject({
      packageCount: 0,
      verifyCount: 2,
      downloadResolutionCount: 1,
      installCount: 1,
      hostLaunchCount: 1,
      retryCount: 0,
      replacementCount: 0,
    });
    expect(harness.calls()).toEqual({ verify: 2, resolve: 1, install: 1, host: 1, dependency: 1 });
    expect(evidence.product.inventoryBeforeHost).toEqual(evidence.product.inventoryAfterHost);
    expect(evidence.schemaVersion).toBe("aurelia-ls/installed-vsix-evidence/v2");
    expect(evidence.product.inventoryBeforeHost.installerMetadata).toMatchObject({
      path: ".vsixmanifest",
      archivePath: "extension.vsixmanifest",
      classification: "vscode-installer-metadata",
      equal: true,
    });
    expect(evidence.product.inventoryBeforeHost.installerMetadata.bytes).toBeGreaterThan(0);
    expect(evidence.product.inventoryBeforeHost.installerMetadata.sha256)
      .toBe(evidence.product.inventoryBeforeHost.installerMetadata.receiptSha256);
    expect(evidence.product.inventoryBeforeHost.packageManifest).toMatchObject({
      path: "package.json",
      archivePath: "extension/package.json",
      classification: "vscode-installer-transformed-manifest",
      exactTransform: true,
    });
    expect(evidence.product.inventoryBeforeHost.packageManifest.metadata.installedTimestamp)
      .toBeGreaterThanOrEqual(evidence.install.startedEpochMilliseconds);
    expect(evidence.product.inventoryBeforeHost.packageManifest.metadata.installedTimestamp)
      .toBeLessThanOrEqual(evidence.install.completedEpochMilliseconds);
    expect(evidence.driverReport.value.status).toBe("passed");
    expect(evidence.logs.client.evidence.workerFaults).toEqual([]);
    expect(evidence.logs.client.evidence.workerOnlineCount).toBe(1);
    expect(readFileSync(harness.layout.evidencePath, "utf8")).toBe(`${JSON.stringify(evidence, null, 2)}\n`);
  });

  test("rejects an unpinned test-electron tool before download, install, or evidence allocation", async () => {
    const gate = await loadGate();
    const harness = installedHarness(gate, "tool-pin-");
    harness.dependencies.testElectronEvidence = () => {
      throw new Error("@vscode/test-electron must be declared and resolved exactly at 3.0.0.");
    };

    await expect(gate.verifyInstalledVsix(harness.dependencies)).rejects.toThrow(/test-electron.*3\.0\.0/iu);
    expect(harness.calls()).toEqual({ verify: 1, resolve: 0, install: 0, host: 0, dependency: 0 });
    expect(existsSync(harness.layout.evidenceRoot)).toBe(false);

    writeFileSync(harness.testElectronPackagePath, "{\"version\":\"3.0.1\"}\n");
    expect(() => gate.testElectronEvidence({
      extensionPackageJson: { devDependencies: { "@vscode/test-electron": "3.0.0" } },
      testElectronPackageJsonPath: harness.testElectronPackagePath,
    })).toThrow(/declared and resolved exactly at 3\.0\.0/u);
  });

  test("refuses retained evidence before download, installation, or host launch", async () => {
    const gate = await loadGate();
    const harness = installedHarness(gate, "preexisting-");
    mkdirSync(harness.layout.evidenceRoot);
    const sentinel = path.join(harness.layout.evidenceRoot, "sentinel.txt");
    writeFileSync(sentinel, "preserve me\n");

    await expect(gate.verifyInstalledVsix(harness.dependencies)).rejects.toThrow(/Refusing to overwrite/u);
    expect(harness.calls()).toEqual({ verify: 1, resolve: 0, install: 0, host: 0, dependency: 0 });
    expect(readFileSync(sentinel, "utf8")).toBe("preserve me\n");
    expect(existsSync(harness.layout.evidencePath)).toBe(false);

    const linkedHarness = installedHarness(gate, "preexisting-link-");
    const linkTarget = path.join(path.dirname(linkedHarness.layout.evidenceRoot), "linked-target");
    mkdirSync(linkTarget);
    const linkedSentinel = path.join(linkTarget, "sentinel.txt");
    writeFileSync(linkedSentinel, "preserve linked target\n");
    symlinkSync(
      linkTarget,
      linkedHarness.layout.evidenceRoot,
      process.platform === "win32" ? "junction" : "dir",
    );
    try {
      await expect(gate.verifyInstalledVsix(linkedHarness.dependencies)).rejects.toThrow(/Refusing to overwrite/u);
      expect(linkedHarness.calls()).toEqual({ verify: 1, resolve: 0, install: 0, host: 0, dependency: 0 });
      expect(readFileSync(linkedSentinel, "utf8")).toBe("preserve linked target\n");
      expect(existsSync(path.join(linkTarget, "installed.evidence.json"))).toBe(false);
    } finally {
      unlinkSync(linkedHarness.layout.evidenceRoot);
    }
  });

  test("retains a failed evidence receipt when a captured file disappears before publication", async () => {
    const gate = await loadGate();
    const harness = installedHarness(gate, "deleted-report-");
    harness.dependencies.beforeEvidence = ({ layout }: any) => unlinkSync(layout.driverReportPath);

    await expect(gate.verifyInstalledVsix(harness.dependencies)).rejects.toThrow(/ENOENT|driver report/iu);
    const retained = JSON.parse(readFileSync(harness.layout.evidencePath, "utf8"));
    expect(retained.status).toBe("failed");
    expect(retained.error).toMatchObject({ name: "Error" });
    expect(harness.calls()).toEqual({ verify: 2, resolve: 1, install: 1, host: 1, dependency: 1 });
  });

  test("revalidates installed payload, topology, and workspace after the final evidence hook", async () => {
    const gate = await loadGate();
    for (const mutation of [
      "payload",
      "package-manifest",
      "installer-metadata",
      "extra-extension",
      "empty-directory",
      "workspace",
      "tool-input",
    ] as const) {
      const harness = installedHarness(gate, `final-${mutation}-`);
      harness.dependencies.beforeEvidence = ({ state, layout }: any) => {
        if (mutation === "payload") {
          writeFileSync(path.join(state.product.extensionPath, "dist", "extension.cjs"), "late payload drift\n");
        } else if (mutation === "package-manifest") {
          writeFileSync(path.join(state.product.extensionPath, "package.json"), "{\"late\":true}\n");
        } else if (mutation === "installer-metadata") {
          writeFileSync(path.join(state.product.extensionPath, ".vsixmanifest"), "late installer metadata drift\n");
        } else if (mutation === "extra-extension") {
          const extra = path.join(layout.extensionsDirectory, "other.publisher-1.0.0");
          mkdirSync(extra);
          writeFileSync(path.join(extra, "package.json"), "{\"publisher\":\"other\",\"name\":\"publisher\"}\n");
        } else if (mutation === "empty-directory") {
          mkdirSync(path.join(state.product.extensionPath, "stale-empty"));
        } else if (mutation === "tool-input") {
          writeFileSync(harness.testElectronPackagePath, "late tool drift\n");
        } else {
          writeFileSync(path.join(layout.workspaceRoot, "tsconfig.json"), "late workspace drift\n");
        }
      };

      await expect(gate.verifyInstalledVsix(harness.dependencies)).rejects.toThrow(/changed|drifted|inventory|exactly one|package\.json/iu);
      const retained = JSON.parse(readFileSync(harness.layout.evidencePath, "utf8"));
      expect(retained.status).toBe("failed");
      expect(retained.finalizationErrors).toEqual([
        expect.objectContaining({ phase: "final-audit", name: expect.any(String) }),
      ]);
      expect(harness.calls()).toEqual({ verify: 2, resolve: 1, install: 1, host: 1, dependency: 1 });
    }
  });

  test("retains failed install streams and never launches the host", async () => {
    const gate = await loadGate();
    const harness = installedHarness(gate, "install-failure-");
    const install = harness.dependencies.installVsix;
    harness.dependencies.installVsix = async (invocation: any) => ({
      ...await install(invocation),
      exitCode: 7,
      stdout: "install failed stdout\n",
      stderr: "install failed stderr\n",
    });

    await expect(gate.verifyInstalledVsix(harness.dependencies)).rejects.toThrow(/installation failed/u);
    const retained = JSON.parse(readFileSync(harness.layout.evidencePath, "utf8"));
    expect(retained.status).toBe("failed");
    expect(readFileSync(harness.layout.installStdoutPath, "utf8")).toBe("install failed stdout\n");
    expect(readFileSync(harness.layout.installStderrPath, "utf8")).toBe("install failed stderr\n");
    expect(harness.calls()).toEqual({ verify: 1, resolve: 1, install: 1, host: 0, dependency: 1 });
  });

  test("retains independent report and log evidence when the host exits nonzero", async () => {
    const gate = await loadGate();
    const harness = installedHarness(gate, "host-failure-");
    const runHost = harness.dependencies.runHost;
    harness.dependencies.runHost = async (invocation: any) => ({
      ...await runHost(invocation),
      exitCode: 9,
      stderr: "host failed stderr\n",
      error: { name: "TestRunFailedError", message: "host failed", stack: null },
    });

    await expect(gate.verifyInstalledVsix(harness.dependencies)).rejects.toThrow(/host acceptance failed/u);
    const retained = JSON.parse(readFileSync(harness.layout.evidencePath, "utf8"));
    expect(retained.status).toBe("failed");
    expect(retained.driverReport.sha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(retained.logs.client.evidence.sha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(retained.logs.extensionHost.evidence.sha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(readFileSync(harness.layout.hostStderrPath, "utf8")).toBe("host failed stderr\n");
    expect(harness.calls()).toEqual({ verify: 1, resolve: 1, install: 1, host: 1, dependency: 1 });
  });

  test("retains malformed driver bytes and parse failure when the host exits nonzero", async () => {
    const gate = await loadGate();
    const harness = installedHarness(gate, "malformed-report-");
    const runHost = harness.dependencies.runHost;
    const malformed = "{not-json\n";
    harness.dependencies.runHost = async (invocation: any) => {
      const result = await runHost(invocation);
      writeFileSync(invocation.extensionTestsEnv.AURELIA_LS_INSTALLED_REPORT_PATH, malformed);
      return { ...result, exitCode: 11, error: { name: "TestRunFailedError", message: "malformed", stack: null } };
    };

    await expect(gate.verifyInstalledVsix(harness.dependencies)).rejects.toThrow(/host acceptance failed/u);
    const retained = JSON.parse(readFileSync(harness.layout.evidencePath, "utf8"));
    expect(retained.driverReport).toMatchObject({
      bytes: Buffer.byteLength(malformed),
      sha256: gate.sha256(malformed),
      value: null,
      parseError: { name: "SyntaxError" },
    });
    expect(retained.status).toBe("failed");
    expect(harness.calls().host).toBe(1);
  });

  test("rejects installed payload and installer-metadata drift before launching the host", async () => {
    const gate = await loadGate();
    for (const mutation of [
      "payload",
      "installer-metadata",
      "missing-installer-metadata",
      "linked-installer-metadata",
      "extra-installed-file",
    ] as const) {
      const harness = installedHarness(gate, `prehost-${mutation}-`);
      const install = harness.dependencies.installVsix;
      harness.dependencies.installVsix = async (invocation: any) => {
        const result = await install(invocation);
        const productPath = path.join(harness.layout.extensionsDirectory, "aureliaeffect.aurelia-2-0.5.0");
        const target = mutation === "payload"
          ? path.join(productPath, "dist", "extension.cjs")
          : path.join(productPath, ".vsixmanifest");
        if (mutation === "missing-installer-metadata") {
          unlinkSync(target);
        } else if (mutation === "linked-installer-metadata") {
          unlinkSync(target);
          const linkTarget = path.join(harness.layout.evidenceRoot, "installer-metadata-target");
          mkdirSync(linkTarget);
          symlinkSync(linkTarget, target, process.platform === "win32" ? "junction" : "dir");
        } else if (mutation === "extra-installed-file") {
          writeFileSync(path.join(productPath, "installer-extra.txt"), "unexpected\n");
        } else {
          writeFileSync(target, `wrong ${mutation} bytes\n`);
        }
        return result;
      };

      await expect(gate.verifyInstalledVsix(harness.dependencies)).rejects.toThrow(/payload bytes drifted|inventory mismatch|symbolic link/iu);
      expect(harness.calls()).toEqual({ verify: 1, resolve: 1, install: 1, host: 0, dependency: 1 });
      expect(JSON.parse(readFileSync(harness.layout.evidencePath, "utf8")).status).toBe("failed");
    }
  });

  test("rejects copied-fixture drift before dependency preparation or host work", async () => {
    const gate = await loadGate();
    for (const mutation of ["changed", "missing"] as const) {
      const harness = installedHarness(gate, `copy-${mutation}-`);
      harness.dependencies.copyWorkspace = (source: string, target: string) => {
        cpSync(source, target, { recursive: true });
        const configPath = path.join(target, "tsconfig.json");
        if (mutation === "changed") writeFileSync(configPath, "drifted\n");
        else unlinkSync(configPath);
      };

      await expect(gate.verifyInstalledVsix(harness.dependencies)).rejects.toThrow(/complete source fixture tree/u);
      const retained = JSON.parse(readFileSync(harness.layout.evidencePath, "utf8"));
      expect(retained.status).toBe("failed");
      expect(harness.calls()).toEqual({ verify: 1, resolve: 0, install: 0, host: 0, dependency: 0 });
    }
  });

  test("rejects workspace, installed-extension, and payload mutation after the host", async () => {
    const gate = await loadGate();
    for (const mutation of ["workspace", "extra-extension", "payload", "package-manifest", "installer-metadata"] as const) {
      const harness = installedHarness(gate, `host-${mutation}-`);
      const runHost = harness.dependencies.runHost;
      harness.dependencies.runHost = async (invocation: any) => {
        const result = await runHost(invocation);
        if (mutation === "workspace") {
          writeFileSync(invocation.extensionTestsEnv.AURELIA_LS_INSTALLED_TARGET_PATH, "mutated after report\n");
        } else if (mutation === "extra-extension") {
          const extra = path.join(harness.layout.extensionsDirectory, "other.publisher-1.0.0");
          mkdirSync(extra);
          writeFileSync(path.join(extra, "package.json"), "{\"publisher\":\"other\",\"name\":\"publisher\"}\n");
        } else if (mutation === "payload") {
          writeFileSync(
            path.join(invocation.extensionTestsEnv.AURELIA_LS_INSTALLED_PRODUCT_PATH, "dist", "extension.cjs"),
            "mutated bundle\n",
          );
        } else if (mutation === "package-manifest") {
          writeFileSync(
            path.join(invocation.extensionTestsEnv.AURELIA_LS_INSTALLED_PRODUCT_PATH, "package.json"),
            "{\"mutated\":true}\n",
          );
        } else {
          writeFileSync(
            path.join(invocation.extensionTestsEnv.AURELIA_LS_INSTALLED_PRODUCT_PATH, ".vsixmanifest"),
            "mutated installer metadata\n",
          );
        }
        return result;
      };

      await expect(gate.verifyInstalledVsix(harness.dependencies)).rejects.toThrow(/changed|drifted|inventory|exactly one|package\.json/iu);
      const retained = JSON.parse(readFileSync(harness.layout.evidencePath, "utf8"));
      expect(retained.status).toBe("failed");
      expect(harness.calls().host).toBe(1);
    }
  });

  test("rejects forged log paths while retaining the independent report and peer log", async () => {
    const gate = await loadGate();
    const harness = installedHarness(gate, "forged-log-");
    harness.dependencies.readClientLogEvidence = () => {
      const filePath = path.join(harness.layout.evidenceRoot, "outside-client.log");
      writeFileSync(filePath, "forged\n");
      return {
        path: filePath,
        bytes: 7,
        sha256: gate.sha256("forged\n"),
        startedWorkspaceUris: [],
        stoppedCount: 1,
        workerFaults: [],
        validationIssues: [],
      };
    };

    await expect(gate.verifyInstalledVsix(harness.dependencies)).rejects.toThrow(/client capture failed|must stay strictly inside/iu);
    const retained = JSON.parse(readFileSync(harness.layout.evidencePath, "utf8"));
    expect(retained.driverReport.sha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(retained.logs.client.captureError).not.toBeNull();
    expect(retained.logs.extensionHost.evidence.sha256).toMatch(/^[0-9a-f]{64}$/u);
  });

  test("requires an exact own Worker-online event and installed server-module log", async () => {
    const gate = await loadGate();
    for (const mutation of ["echoed-online", "source-server"] as const) {
      const harness = installedHarness(gate, `client-log-${mutation}-`);
      harness.dependencies.readClientLogEvidence = () => {
        const filePath = path.join(
          harness.layout.userDataDirectory,
          "logs",
          "session",
          "window1",
          "exthost",
          "AureliaEffect.aurelia-2",
          "Aurelia LS (Client).log",
        );
        mkdirSync(path.dirname(filePath), { recursive: true });
        const expectedServer = path.join(
          harness.layout.extensionsDirectory,
          "aureliaeffect.aurelia-2-0.5.0",
          "dist",
          "server",
          "main.cjs",
        );
        const resolvedServer = mutation === "source-server"
          ? path.join(gate.repoRoot, "packages", "language-server", "out", "main.js")
          : expectedServer;
        const online = mutation === "echoed-online"
          ? "2026-08-09 18:00:00.001 [debug] [worker-transport.client] Worker stdout text=\"[worker-transport.client] Worker transport is online\""
          : "2026-08-09 18:00:00.001 [debug] [worker-transport.client] Worker transport is online";
        const raw = [
          `2026-08-09 18:00:00.000 [info] [client] resolved server module: ${resolvedServer}`,
          online,
          `2026-08-09 18:00:00.002 [info] [client] started ${pathToFileURL(harness.layout.workspaceRoot).href} from package-manifest`,
          "2026-08-09 18:00:00.003 [info] [client] stopped",
          "",
        ].join("\n");
        writeFileSync(filePath, raw);
        return {
          path: filePath,
          bytes: Buffer.byteLength(raw),
          sha256: gate.sha256(raw),
          startedWorkspaceUris: [pathToFileURL(harness.layout.workspaceRoot).href],
          stoppedCount: 1,
          workerFaults: [],
          validationIssues: [],
        };
      };

      await expect(gate.verifyInstalledVsix(harness.dependencies)).rejects.toThrow(/Worker-online|installed VSIX server module/iu);
      expect(JSON.parse(readFileSync(harness.layout.evidencePath, "utf8")).status).toBe("failed");
      expect(harness.calls().host).toBe(1);
    }
  });

  test("independently rejects Worker faults and non-shipping activation hidden by helper fields", async () => {
    const gate = await loadGate();
    const workerHarness = installedHarness(gate, "client-worker-fault-");
    const readClient = workerHarness.dependencies.readClientLogEvidence;
    workerHarness.dependencies.readClientLogEvidence = () => {
      const helper = readClient();
      const raw = `${readFileSync(helper.path, "utf8")}2026-08-09 18:00:00.004 [warning] [worker-transport.client] Worker stderr text=boom\n`;
      writeFileSync(helper.path, raw);
      return { ...helper, bytes: Buffer.byteLength(raw), sha256: gate.sha256(raw), workerFaults: [] };
    };
    await expect(gate.verifyInstalledVsix(workerHarness.dependencies)).rejects.toThrow(/Worker fault/iu);

    const activationHarness = installedHarness(gate, "activation-forgery-");
    activationHarness.dependencies.readExtensionHostLogEvidence = () => {
      const filePath = path.join(
        activationHarness.layout.userDataDirectory,
        "logs",
        "session",
        "window1",
        "exthost",
        "exthost.log",
      );
      mkdirSync(path.dirname(filePath), { recursive: true });
      const raw = "2026-08-09 18:00:00.000 [info] ExtensionService#_doActivateExtension AureliaEffect.aurelia-2, startup: false, activationEvent: 'api'\n";
      writeFileSync(filePath, raw);
      return {
        path: filePath,
        bytes: Buffer.byteLength(raw),
        sha256: gate.sha256(raw),
        rawActivationLine: raw.trimEnd(),
        startup: true,
        activationEvent: "workspaceContains:node_modules/aurelia/package.json",
        validationIssues: [],
      };
    };
    await expect(gate.verifyInstalledVsix(activationHarness.dependencies)).rejects.toThrow(/startup:true|shipping workspaceContains/iu);
  });

  test("rejects ambient source-server, transport, and debugger overrides before archive or host work", async () => {
    const gate = await loadGate();
    const cases: Array<{ environment: Record<string, string>; execArgv: string[] }> = [
      { environment: { AURELIA_LS_SERVER_PATH: "C:/source/server.cjs" }, execArgv: [] },
      { environment: { AURELIA_LS_FORCE_IPC_TRANSPORT: "1" }, execArgv: [] },
      { environment: { NODE_OPTIONS: "--inspect=0" }, execArgv: [] },
      { environment: { NODE_OPTIONS: "--debug-brk=5858" }, execArgv: [] },
      { environment: {}, execArgv: ["--debug=5858"] },
      { environment: {}, execArgv: ["--inspect-brk"] },
    ];
    for (const { environment, execArgv } of cases) {
      const harness = installedHarness(gate, `ambient-${Object.keys(environment)[0] ?? execArgv[0]}-`);
      harness.dependencies.environment = environment;
      harness.dependencies.execArgv = execArgv;
      await expect(gate.verifyInstalledVsix(harness.dependencies)).rejects.toThrow(/shipping defaults|inspector/iu);
      expect(harness.calls()).toEqual({ verify: 0, resolve: 0, install: 0, host: 0, dependency: 0 });
      expect(existsSync(harness.layout.evidenceRoot)).toBe(false);
    }
  });

  test("rejects final archive or repository drift after the host without retry", async () => {
    const gate = await loadGate();
    const archiveHarness = installedHarness(gate, "archive-drift-");
    const verify = archiveHarness.dependencies.verifyVsix;
    let verification = 0;
    archiveHarness.dependencies.verifyVsix = async () => {
      const receipt = await verify();
      verification += 1;
      if (verification === 1) return receipt;
      const drifted = structuredClone(receipt);
      drifted.artifact.sha256 = "f".repeat(64);
      return drifted;
    };
    await expect(gate.verifyInstalledVsix(archiveHarness.dependencies)).rejects.toThrow(/receipt changed/u);
    expect(archiveHarness.calls().host).toBe(1);

    const repositoryHarness = installedHarness(gate, "repository-drift-");
    const readState = repositoryHarness.dependencies.gitState;
    let reads = 0;
    repositoryHarness.dependencies.gitState = () => {
      const state = readState();
      reads += 1;
      return reads === 1 ? state : { ...state, status: "?? drifted-file\n" };
    };
    await expect(gate.verifyInstalledVsix(repositoryHarness.dependencies)).rejects.toThrow(/Repository state changed/u);
    expect(repositoryHarness.calls().host).toBe(1);

    const finalRepositoryHarness = installedHarness(gate, "final-repository-drift-");
    const readFinalState = finalRepositoryHarness.dependencies.gitState;
    let finalReads = 0;
    finalRepositoryHarness.dependencies.gitState = () => {
      const state = readFinalState();
      finalReads += 1;
      return finalReads < 3 ? state : { ...state, submodules: "-deadbeef aurelia\n deadbeef aurelia2-plugins\n" };
    };
    await expect(gate.verifyInstalledVsix(finalRepositoryHarness.dependencies)).rejects.toThrow(/Repository state changed/u);
    const retained = JSON.parse(readFileSync(finalRepositoryHarness.layout.evidencePath, "utf8"));
    expect(retained.finalizationErrors).toEqual([
      expect.objectContaining({ phase: "final-repository" }),
    ]);
    expect(finalRepositoryHarness.calls().host).toBe(1);
  });

  test("rejects malformed driver evidence and installed payload drift", async () => {
    const gate = await loadGate();
    const root = contractRoot(gate, "validation-");
    const targetPath = path.join(root, "target.html");
    const relatedPath = path.join(root, "target.ts");
    writeFileSync(targetPath, "${state.servicePlans.searchText}\n");
    writeFileSync(relatedPath, "export class Target {}\n");
    const productPath = path.join(root, "product");
    mkdirSync(productPath);
    const report = validDriverReport({ gate, productPath, targetPath, relatedPath, version: "0.5.0" });
    expect(() => gate.validateInstalledDriverReport(report, {
      resolvedVersion: "1.132.0",
      product: { extensionPath: productPath },
      identity: identity("0.5.0"),
      targetPath,
      relatedPath,
    })).not.toThrow();

    const noItems = structuredClone(report);
    noItems.observation.itemCount = 0;
    expect(() => gate.validateInstalledDriverReport(noItems, {
      resolvedVersion: "1.132.0",
      product: { extensionPath: productPath },
      identity: identity("0.5.0"),
      targetPath,
      relatedPath,
    })).toThrow(/no completion items/u);

    const reportMutations: Array<(value: any) => void> = [
      (value) => { value.product.extensionPath = gate.extensionRoot; },
      (value) => { value.product.version = "9.9.9"; },
      (value) => { value.product.productionClassification = "Development"; },
      (value) => { value.driver.mode = "Development"; value.driver.modeValue = 2; },
      (value) => { value.preconditions.productActiveAtEntry = false; },
      (value) => { value.observation.observationId = ""; value.observation.request.observationId = ""; value.observation.response.observationId = ""; },
      (value) => { value.observation.request.documentVersion = 2; },
      (value) => { value.completion.range.start.character += 1; },
      (value) => { value.customJourney.command = "aurelia.inspectAtCursor"; },
      (value) => { value.customJourney.commandRegistered = false; },
      (value) => { value.customJourney.activeEditorUri = pathToFileURL(targetPath).href; },
      (value) => { value.customJourney.targetUnopenedBefore = false; },
      (value) => { value.customJourney.sourceBytesUnchanged = false; },
    ];
    for (const mutate of reportMutations) {
      const drifted = structuredClone(report);
      mutate(drifted);
      expect(() => gate.validateInstalledDriverReport(drifted, {
        resolvedVersion: "1.132.0",
        product: { extensionPath: productPath },
        identity: identity("0.5.0"),
        targetPath,
        relatedPath,
      })).toThrow(/failed validation/u);
    }

    const payloadRoot = path.join(root, "payload");
    mkdirSync(payloadRoot);
    const sourcePackageBytes = Buffer.from("{}\n");
    const packageAuthorityPath = path.join(root, "package-authority.json");
    writeFileSync(packageAuthorityPath, sourcePackageBytes);
    const manifestBytes = Buffer.from("<PackageManifest />\n");
    writeFileSync(path.join(payloadRoot, ".vsixmanifest"), manifestBytes);
    const installedTimestamp = Date.now();
    const receipt = {
      entries: [
        { path: "extension.vsixmanifest", bytes: manifestBytes.length, sha256: gate.sha256(manifestBytes), source: { kind: "generated-control" } },
        {
          path: "extension/package.json",
          bytes: sourcePackageBytes.length,
          sha256: gate.sha256(sourcePackageBytes),
          source: {
            kind: "local",
            path: path.relative(gate.repoRoot, packageAuthorityPath).split(path.sep).join("/"),
            bytes: sourcePackageBytes.length,
            sha256: gate.sha256(sourcePackageBytes),
            equal: true,
          },
        },
      ],
    };
    const packagedBytes = receipt.entries.reduce((total, entry) => total + entry.bytes, 0);
    const installWindow = {
      startedEpochMilliseconds: installedTimestamp - 1,
      completedEpochMilliseconds: installedTimestamp + 1,
    };
    const installedPackage = {
      __metadata: { installedTimestamp, targetPlatform: "undefined", size: packagedBytes },
    };
    writeFileSync(path.join(payloadRoot, "package.json"), JSON.stringify(installedPackage, null, "\t"));
    expect(gate.verifyInstalledInventory(receipt, payloadRoot, installWindow)).toMatchObject({
      payload: [],
      packageManifest: {
        path: "package.json",
        classification: "vscode-installer-transformed-manifest",
        exactTransform: true,
      },
      installerMetadata: {
        path: ".vsixmanifest",
        archivePath: "extension.vsixmanifest",
        classification: "vscode-installer-metadata",
        equal: true,
      },
    });
    writeFileSync(path.join(payloadRoot, "stale.js"), "stale\n");
    expect(() => gate.verifyInstalledInventory(receipt, payloadRoot, installWindow)).toThrow(/inventory mismatch/u);
    unlinkSync(path.join(payloadRoot, "stale.js"));
    writeFileSync(path.join(payloadRoot, ".vsixmanifest"), "wrong control\n");
    expect(() => gate.verifyInstalledInventory(receipt, payloadRoot, installWindow)).toThrow(/payload bytes drifted/u);
    writeFileSync(path.join(payloadRoot, ".vsixmanifest"), manifestBytes);
    expect(() => gate.verifyInstalledInventory({ entries: receipt.entries.slice(1) }, payloadRoot, installWindow)).toThrow(/exactly one extension\.vsixmanifest/u);
    expect(() => gate.verifyInstalledInventory(
      { entries: [receipt.entries[0], ...receipt.entries] },
      payloadRoot,
      installWindow,
    )).toThrow(/received 2/u);
    expect(() => gate.verifyInstalledInventory({
      entries: receipt.entries.map((entry) => entry.path === "extension.vsixmanifest"
        ? { ...entry, source: { kind: "local" } }
        : entry),
    }, payloadRoot, installWindow)).toThrow(/generated control/u);
    expect(() => gate.verifyInstalledInventory({
      entries: [
        ...receipt.entries,
        { path: "extension/.vsixmanifest", bytes: 1, sha256: gate.sha256("x") },
      ],
    }, payloadRoot, installWindow)).toThrow(/same installed path/u);
    expect(() => gate.verifyInstalledInventory(receipt, payloadRoot)).toThrow(/sole-install timestamp window/u);
    expect(() => gate.verifyInstalledInventory(receipt, payloadRoot, {
      startedEpochMilliseconds: installedTimestamp + 1,
      completedEpochMilliseconds: installedTimestamp,
    })).toThrow(/sole-install timestamp window/u);
    expect(() => gate.verifyInstalledInventory({
      entries: receipt.entries.filter((entry) => entry.path !== "extension/package.json"),
    }, payloadRoot, installWindow)).toThrow(/exactly one extension\/package\.json/u);
    expect(() => gate.verifyInstalledInventory({
      entries: receipt.entries.map((entry) => entry.path === "extension/package.json"
        ? { ...entry, source: { ...entry.source, sha256: "0".repeat(64) } }
        : entry),
    }, payloadRoot, installWindow)).toThrow(/archive authority bytes drifted/u);
    writeFileSync(packageAuthorityPath, "source authority drift\n");
    expect(() => gate.verifyInstalledInventory(receipt, payloadRoot, installWindow)).toThrow(/archive authority bytes drifted/u);
    writeFileSync(packageAuthorityPath, sourcePackageBytes);

    for (const mutation of [
      "timestamp",
      "upper-timestamp",
      "target",
      "size",
      "missing-key",
      "extra-key",
      "key-order",
      "authored",
      "serialization",
      "newline",
    ] as const) {
      const drifted = structuredClone(installedPackage);
      if (mutation === "timestamp") drifted.__metadata.installedTimestamp = installWindow.startedEpochMilliseconds - 1;
      else if (mutation === "upper-timestamp") drifted.__metadata.installedTimestamp = installWindow.completedEpochMilliseconds + 1;
      else if (mutation === "target") drifted.__metadata.targetPlatform = "win32-x64";
      else if (mutation === "size") drifted.__metadata.size += 1;
      else if (mutation === "missing-key") delete (drifted.__metadata as any).size;
      else if (mutation === "extra-key") (drifted.__metadata as any).extra = true;
      else if (mutation === "key-order") drifted.__metadata = {
        targetPlatform: drifted.__metadata.targetPlatform,
        installedTimestamp: drifted.__metadata.installedTimestamp,
        size: drifted.__metadata.size,
      } as any;
      else if (mutation === "authored") (drifted as any).name = "forged";
      const serialized = `${JSON.stringify(drifted, null, mutation === "serialization" ? 2 : "\t")}${mutation === "newline" ? "\n" : ""}`;
      writeFileSync(path.join(payloadRoot, "package.json"), serialized);
      expect(() => gate.verifyInstalledInventory(receipt, payloadRoot, installWindow)).toThrow(/package\.json/iu);
    }
  });

  test("revalidates the copied workspace dependency link against the exact semantic-runtime root", async () => {
    const gate = await loadGate();
    const root = contractRoot(gate, "dependency-link-");
    const workspace = path.join(root, "w");
    mkdirSync(workspace);
    writeFileSync(path.join(workspace, "package.json"), "{\"private\":true}\n");
    const linkPath = path.join(workspace, "node_modules");
    symlinkSync(gate.dependencyRoot, linkPath, process.platform === "win32" ? "junction" : "dir");
    try {
      expect(gate.validateWorkspaceDependenciesAfterHost(workspace)).toMatchObject({ status: "passed" });
    } finally {
      unlinkSync(linkPath);
    }

    const wrongTarget = path.join(root, "wrong-node-modules");
    mkdirSync(wrongTarget);
    symlinkSync(wrongTarget, linkPath, process.platform === "win32" ? "junction" : "dir");
    try {
      expect(() => gate.validateWorkspaceDependenciesAfterHost(workspace)).toThrow(/target changed/u);
    } finally {
      unlinkSync(linkPath);
    }
  });

  test("uses real driver-context Test evidence and never reads a nonexistent Extension mode", () => {
    const suite = readFileSync(driverSuitePath, "utf8");
    const extension = readFileSync(driverExtensionPath, "utf8");
    const readme = readFileSync(testReadmePath, "utf8");
    expect(extension).toContain("context.extensionMode");
    expect(suite).toContain("vscode.ExtensionMode.Test");
    expect(suite).not.toMatch(/\bproduct\.extensionMode\b|\bdriver\.extensionMode\b/u);
    expect(suite).toContain("productionClassification: \"inferred-installed-production\"");
    expect(suite).toContain("linkSync(temporaryPath, reportPath)");
    expect(suite).toContain('const openRelatedFileCommand = "aurelia.openRelatedFile"');
    const focusSourceIndex = suite.indexOf('vscode.commands.executeCommand("workbench.action.focusActiveEditorGroup")');
    const reproveSourceIndex = suite.indexOf("activeSourceEditor.document.uri.toString()");
    const invokeCustomJourneyIndex = suite.indexOf("vscode.commands.executeCommand(openRelatedFileCommand)");
    expect(focusSourceIndex).toBeGreaterThanOrEqual(0);
    expect(reproveSourceIndex).toBeGreaterThan(focusSourceIndex);
    expect(invokeCustomJourneyIndex).toBeGreaterThan(reproveSourceIndex);
    expect(readme).toContain("VS Code 1.91 and current test");
    expect(readme).toContain("using only the inert driver keeps the installed");
    expect(readme).toContain("Open Related File");
    expect(readme).toContain("neither document nor either file's bytes were changed");
  });

  test("retains split UTF-8 host output without chunk-boundary corruption", async () => {
    const gate = await loadGate();
    const capture = gate.captureWritable();
    const encoded = Buffer.from("before € after", "utf8");
    const split = encoded.indexOf(0xe2) + 1;
    capture.stream.write(encoded.subarray(0, split));
    capture.stream.write(encoded.subarray(split));
    capture.stream.end();
    expect(capture.buffer()).toEqual(encoded);
    expect(capture.text()).toBe("before € after");
  });

  test("retains injected install and host streams as exact arbitrary bytes", async () => {
    const gate = await loadGate();
    const harness = installedHarness(gate, "raw-streams-");
    const install = harness.dependencies.installVsix;
    const host = harness.dependencies.runHost;
    const installStdout = Buffer.from([0x42, 0x80, 0x43]);
    const installStderr = Buffer.from([0xff, 0x00]);
    const hostStdout = Buffer.from([0xe2, 0x82, 0xac, 0xfe]);
    const hostStderr = Buffer.from([0x00, 0x81]);
    harness.dependencies.installVsix = async (invocation: any) => ({
      ...await install(invocation),
      stdout: installStdout,
      stderr: installStderr,
    });
    harness.dependencies.runHost = async (invocation: any) => ({
      ...await host(invocation),
      stdout: hostStdout,
      stderr: hostStderr,
    });

    const evidence = await gate.verifyInstalledVsix(harness.dependencies);
    expect(readFileSync(harness.layout.installStdoutPath)).toEqual(installStdout);
    expect(readFileSync(harness.layout.installStderrPath)).toEqual(installStderr);
    expect(readFileSync(harness.layout.hostStdoutPath)).toEqual(hostStdout);
    expect(readFileSync(harness.layout.hostStderrPath)).toEqual(hostStderr);
    expect(evidence.install.result.stdoutSha256).toBe(gate.sha256(installStdout));
    expect(evidence.host.result.stderrSha256).toBe(gate.sha256(hostStderr));
  });
});

async function loadGate(): Promise<any> {
  return import(`${moduleUrl.href}?contract=${Date.now()}-${Math.random()}`);
}

function contractRoot(gate: any, prefix: string): string {
  const tempParent = path.join(gate.repoRoot, ".temp");
  mkdirSync(tempParent, { recursive: true });
  const root = mkdtempSync(path.join(tempParent, `installed-vsix-${prefix}`));
  temporaryRoots.push(root);
  return root;
}

function identity(version: string) {
  return {
    id: "AureliaEffect.aurelia-2",
    publisher: "AureliaEffect",
    name: "aurelia-2",
    version,
    main: "./dist/extension.cjs",
    vscodeEngine: "^1.91.0",
  };
}

function installedHarness(gate: any, prefix: string) {
  const root = contractRoot(gate, prefix);
  const head = "0123456789abcdef0123456789abcdef01234567";
  const layout = gate.installedLayout(head, root);
  const archiveRoot = path.join(root, "archive");
  mkdirSync(archiveRoot);
  const packageBytes = `${JSON.stringify({
    publisher: "AureliaEffect",
    name: "aurelia-2",
    version: "0.5.0",
    main: "./dist/extension.cjs",
    engines: { vscode: "^1.91.0" },
  }, null, 2)}\n`;
  const bundleBytes = "module.exports = {};\n";
  const serverBytes = "module.exports = { server: true };\n";
  const installerManifestBytes = "<PackageManifest Version=\"2.0.0\" />\n";
  const archiveBytes = Buffer.from("synthetic-vsix");
  const artifactPath = path.join(archiveRoot, "aurelia-2-0.5.0-0123456789ab.vsix");
  const receiptPath = path.join(archiveRoot, "aurelia-2-0.5.0-0123456789ab.manifest.json");
  const checksumPath = path.join(archiveRoot, "aurelia-2-0.5.0-0123456789ab.sha256");
  writeFileSync(artifactPath, archiveBytes);
  writeFileSync(receiptPath, "synthetic receipt\n");
  writeFileSync(checksumPath, "synthetic checksum\n");
  const packageAuthorityPath = path.join(archiveRoot, "package.authority.json");
  writeFileSync(packageAuthorityPath, packageBytes);
  const receipt = {
    schemaVersion: "aurelia-ls/vscode-vsix-artifact/v1",
    artifact: {
      path: path.relative(gate.repoRoot, artifactPath).split(path.sep).join("/"),
      bytes: archiveBytes.length,
      sha256: gate.sha256(archiveBytes),
    },
    repository: {
      before: { head, status: "", submodules: " deadbeef aurelia\n deadbeef aurelia2-plugins\n" },
      after: { head, status: "", submodules: " deadbeef aurelia\n deadbeef aurelia2-plugins\n" },
    },
    identity: identity("0.5.0"),
    entries: [
      {
        path: "extension.vsixmanifest",
        bytes: Buffer.byteLength(installerManifestBytes),
        sha256: gate.sha256(installerManifestBytes),
        source: { kind: "generated-control" },
      },
      {
        path: "extension/package.json",
        bytes: Buffer.byteLength(packageBytes),
        sha256: gate.sha256(packageBytes),
        source: {
          kind: "local",
          path: path.relative(gate.repoRoot, packageAuthorityPath).split(path.sep).join("/"),
          bytes: Buffer.byteLength(packageBytes),
          sha256: gate.sha256(packageBytes),
          equal: true,
        },
      },
      { path: "extension/dist/extension.cjs", bytes: Buffer.byteLength(bundleBytes), sha256: gate.sha256(bundleBytes) },
      { path: "extension/dist/server/main.cjs", bytes: Buffer.byteLength(serverBytes), sha256: gate.sha256(serverBytes) },
    ],
  };
  const repository = receipt.repository.before;
  const counts = { verify: 0, resolve: 0, install: 0, host: 0, dependency: 0 };
  const paths = { releaseRoot: archiveRoot, vsix: artifactPath, receipt: receiptPath, checksum: checksumPath };
  const testElectronPackagePath = path.join(root, "test-electron.package.json");
  const testElectronPackageBytes = "{\"name\":\"@vscode/test-electron\",\"version\":\"3.0.0\"}\n";
  writeFileSync(testElectronPackagePath, testElectronPackageBytes);

  const dependencies: Record<string, any> = {
    environment: {},
    execArgv: [],
    evidenceParent: root,
    packageJson: { name: "aurelia-2", version: "0.5.0" },
    artifactPaths: () => paths,
    testElectronEvidence: () => ({
      version: "3.0.0",
      packageJsonPath: path.relative(gate.repoRoot, testElectronPackagePath).split(path.sep).join("/"),
      packageJsonBytes: Buffer.byteLength(testElectronPackageBytes),
      packageJsonSha256: gate.sha256(testElectronPackageBytes),
    }),
    gitState: () => repository,
    verifyVsix: async () => { counts.verify += 1; return receipt; },
    copyWorkspace: (source: string, target: string) => cpSync(source, target, { recursive: true }),
    prepareWorkspaceDependencies: () => {
      counts.dependency += 1;
      return { status: "passed", strategy: "synthetic" };
    },
    validateWorkspaceDependenciesAfterHost: () => ({ status: "passed", strategy: "synthetic" }),
    resolveVSCode: async () => {
      counts.resolve += 1;
      return {
        resolvedVersion: "1.132.0",
        vscodeExecutablePath: process.execPath,
        electron: {
          resolveCliArgsFromVSCodeExecutablePath: () => [process.execPath],
          resolveCliPathFromVSCodeExecutablePath: () => process.execPath,
          runTests: async () => 0,
        },
      };
    },
    installVsix: async (invocation: any) => {
      counts.install += 1;
      expect(invocation.args).toContain(artifactPath);
      const productPath = path.join(layout.extensionsDirectory, "aureliaeffect.aurelia-2-0.5.0");
      mkdirSync(path.join(productPath, "dist", "server"), { recursive: true });
      const installedTimestamp = Date.now();
      const packagedBytes = receipt.entries.reduce((total, entry) => total + entry.bytes, 0);
      writeFileSync(path.join(productPath, "package.json"), JSON.stringify({
        ...JSON.parse(packageBytes),
        __metadata: { installedTimestamp, targetPlatform: "undefined", size: packagedBytes },
      }, null, "\t"));
      writeFileSync(path.join(productPath, ".vsixmanifest"), installerManifestBytes);
      writeFileSync(path.join(productPath, "dist", "extension.cjs"), bundleBytes);
      writeFileSync(path.join(productPath, "dist", "server", "main.cjs"), serverBytes);
      return { exitCode: 0, signal: null, stdout: "installed\n", stderr: "" };
    },
    runHost: async (invocation: any) => {
      counts.host += 1;
      const productPath = invocation.extensionTestsEnv.AURELIA_LS_INSTALLED_PRODUCT_PATH;
      const targetPath = invocation.extensionTestsEnv.AURELIA_LS_INSTALLED_TARGET_PATH;
      const relatedPath = invocation.extensionTestsEnv.AURELIA_LS_INSTALLED_RELATED_PATH;
      writeFileSync(
        invocation.extensionTestsEnv.AURELIA_LS_INSTALLED_REPORT_PATH,
        `${JSON.stringify(validDriverReport({ gate, productPath, targetPath, relatedPath, version: "0.5.0" }), null, 2)}\n`,
      );
      return { exitCode: 0, signal: null, stdout: "host\n", stderr: "ambient host text\n", error: null };
    },
    readClientLogEvidence: () => {
      const filePath = path.join(layout.userDataDirectory, "logs", "session", "window1", "exthost", "AureliaEffect.aurelia-2", "Aurelia LS (Client).log");
      mkdirSync(path.dirname(filePath), { recursive: true });
      const installedServer = path.join(
        layout.extensionsDirectory,
        "aureliaeffect.aurelia-2-0.5.0",
        "dist",
        "server",
        "main.cjs",
      );
      const raw = [
        `2026-08-09 18:00:00.000 [info] [client] resolved server module: ${installedServer}`,
        "2026-08-09 18:00:00.001 [debug] [worker-transport.client] Worker transport is online id=aurelia-ls name=Aurelia",
        `2026-08-09 18:00:00.002 [info] [client] started ${pathToFileURL(layout.workspaceRoot).href} from package-manifest`,
        "2026-08-09 18:00:00.003 [info] [client] stopped",
        "",
      ].join("\n");
      writeFileSync(filePath, raw);
      return {
        path: filePath,
        bytes: Buffer.byteLength(raw),
        sha256: gate.sha256(raw),
        startedWorkspaceUris: [pathToFileURL(layout.workspaceRoot).href],
        stoppedCount: 1,
        workerFaults: [],
        validationIssues: [],
      };
    },
    readExtensionHostLogEvidence: () => {
      const filePath = path.join(layout.userDataDirectory, "logs", "session", "window1", "exthost", "exthost.log");
      mkdirSync(path.dirname(filePath), { recursive: true });
      const raw = "2026-08-09 18:00:00.000 [info] ExtensionService#_doActivateExtension AureliaEffect.aurelia-2, startup: true, activationEvent: 'workspaceContains:node_modules/aurelia/package.json'\n";
      writeFileSync(filePath, raw);
      return {
        path: filePath,
        bytes: Buffer.byteLength(raw),
        sha256: gate.sha256(raw),
        rawActivationLine: raw.trimEnd(),
        startup: true,
        activationEvent: "workspaceContains:node_modules/aurelia/package.json",
        validationIssues: [],
      };
    },
  };
  return { dependencies, layout, testElectronPackagePath, calls: () => ({ ...counts }) };
}

function validDriverReport({ gate, productPath, targetPath, relatedPath, version }: any) {
  const uri = pathToFileURL(targetPath).href;
  const observationId = "installed-completion:1";
  const text = readFileSync(targetPath, "utf8");
  const anchor = "state.servicePlans.searchText";
  const startOffset = text.indexOf(anchor) + "state.servicePlans.".length;
  const endOffset = startOffset + "searchText".length;
  const position = positionAt(text, startOffset);
  const range = { start: position, end: positionAt(text, endOffset) };
  const request = {
    source: "language-client-provider",
    operation: "completion",
    phase: "request",
    observationId,
    uri,
    documentVersion: 1,
    line: position.line,
    character: position.character,
    itemCount: null,
    cancellationRequested: null,
  };
  const response = {
    source: "language-client-provider",
    operation: "completion",
    phase: "response",
    observationId,
    uri,
    documentVersion: 1,
    line: null,
    character: null,
    itemCount: 5,
    cancellationRequested: false,
  };
  return {
    schemaVersion: gate.installedDriverReportSchemaVersion,
    status: "passed",
    errors: [],
    error: null,
    vscodeVersion: "1.132.0",
    product: {
      matchCount: 1,
      id: "AureliaEffect.aurelia-2",
      extensionPath: productPath,
      version,
      main: "./dist/extension.cjs",
      vscodeEngine: "^1.91.0",
      productionClassification: "inferred-installed-production",
      productionInference: "exact installed root under isolated extensions directory; sole extensionDevelopmentPath is the inert driver",
      activeAtTestEntry: true,
    },
    driver: {
      matchCount: 1,
      id: "aurelia-ls-tests.installed-vsix-driver",
      extensionPath: gate.driverRoot,
      version: "0.0.0",
      mode: "Test",
      modeValue: 3,
      contextExtensionPath: gate.driverRoot,
    },
    preconditions: {
      targetUnopenedAtEntry: true,
      targetUnshownAtEntry: true,
      productActiveAtEntry: true,
      activationMode: "auto",
      zeroProviderObservationsBeforeTrigger: true,
    },
    completion: {
      command: "vscode.executeCompletionItemProvider",
      anchor: "state.servicePlans.searchText",
      label: "searchText",
      kind: "Property",
      kindValue: 9,
      detail: "type-member searchText",
      detailIncludesTypeMember: true,
      newText: "searchText",
      rangeText: "searchText",
      range,
      targetUri: uri,
      position,
    },
    observation: {
      observationId,
      requestCount: 1,
      responseCount: 1,
      failureCount: 0,
      itemCount: 5,
      documentVersion: 1,
      request,
      response,
    },
    customJourney: {
      command: "aurelia.openRelatedFile",
      commandRegistered: true,
      resultOk: true,
      sourceUri: uri,
      expectedTargetUri: pathToFileURL(relatedPath).href,
      activeEditorUri: pathToFileURL(relatedPath).href,
      targetLanguageId: "typescript",
      targetUnopenedBefore: true,
      sourceDirtyBefore: false,
      sourceDirtyAfter: false,
      targetDirtyAfter: false,
      sourceBytesUnchanged: true,
      targetBytesUnchanged: true,
    },
  };
}

function positionAt(text: string, offset: number) {
  const lines = text.slice(0, offset).split(/\r\n|\r|\n/u);
  return { line: lines.length - 1, character: lines[lines.length - 1]!.length };
}
