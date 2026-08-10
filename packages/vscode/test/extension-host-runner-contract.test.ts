import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

interface PackageManifest {
  readonly engines?: Readonly<Record<string, string>>;
  readonly scripts?: Readonly<Record<string, string>>;
}

interface RunnerPlan {
  readonly transport: "worker" | "ipc";
  readonly version: "stable" | "1.91.0";
  readonly versionLane: "current-stable" | "minimum";
  readonly minimumVSCodeVersion: "1.91.0";
  readonly shards: readonly string[];
  readonly launchCount: number;
}

interface ExecutionProbe {
  readonly downloadCount: number;
  readonly launches: readonly {
    readonly shard: string;
    readonly expectedActualVersion: string;
    readonly expectedTransport: string;
    readonly tailObservation: string | null;
    readonly testWorkspace: string;
    readonly userDataArgument: string;
  }[];
  readonly maxConcurrentLaunches: number;
  readonly preparedShards: readonly string[];
}

const runnerPath = fileURLToPath(
  new URL("../scripts/run-extension-host-tests.mjs", import.meta.url),
);
const extensionManifest = readManifest(new URL("../package.json", import.meta.url));
const rootManifest = readManifest(new URL("../../../package.json", import.meta.url));

describe("Extension Host support runner", () => {
  test("plans three fresh Worker processes on current stable by default", () => {
    expect(readPlan()).toEqual({
      transport: "worker",
      version: "stable",
      versionLane: "current-stable",
      minimumVSCodeVersion: "1.91.0",
      shards: [
        "worker-lifecycle",
        "rename-reliability",
        "product-support",
      ],
      launchCount: 3,
    });
  });

  test("keeps forced IPC as a focused product/support control", () => {
    expect(readPlan("--ipc")).toEqual(expect.objectContaining({
      transport: "ipc",
      version: "stable",
      shards: ["product-support"],
      launchCount: 1,
    }));
  });

  test("selects the exact minimum and individual Worker shards explicitly", () => {
    expect(readPlan("--worker", "--minimum", "--shard=rename-reliability"))
      .toEqual(expect.objectContaining({
        transport: "worker",
        version: "1.91.0",
        versionLane: "minimum",
        shards: ["rename-reliability"],
        launchCount: 1,
      }));
  });

  test("rejects ambiguous, unknown, and over-broad IPC requests", () => {
    expect(readFailure("--worker", "--ipc")).toContain("transport may only be selected once");
    expect(readFailure("--shard=unknown")).toContain("Unknown Extension Host shard");
    expect(readFailure("--ipc", "--minimum")).toContain("current-stable control lane");
    expect(readFailure("--ipc", "--shard=rename-reliability"))
      .toContain("may only run the product-support shard");
  });

  test("resolves once and serially launches three isolated authenticated processes", () => {
    const probe = readExecutionProbe();

    expect(probe.downloadCount).toBe(1);
    expect(probe.maxConcurrentLaunches).toBe(1);
    expect(probe.preparedShards).toEqual([
      "worker-lifecycle",
      "rename-reliability",
      "product-support",
    ]);
    expect(probe.launches.map((launch) => launch.shard)).toEqual(probe.preparedShards);
    expect(new Set(probe.launches.map((launch) => launch.testWorkspace)).size).toBe(3);
    expect(new Set(probe.launches.map((launch) => launch.userDataArgument)).size).toBe(3);
    expect(probe.launches.every((launch) => (
      launch.expectedActualVersion === "1.123.4"
        && launch.expectedTransport === "worker"
    ))).toBe(true);
    expect(probe.launches.map((launch) => [launch.shard, launch.tailObservation])).toEqual([
      ["worker-lifecycle", null],
      ["rename-reliability", null],
      ["product-support", "1"],
    ]);
  });

  test("exposes default, Worker, IPC, current-stable, and exact-minimum package entry points", () => {
    const minimumPlan = readPlan("--minimum");

    expect(extensionManifest.engines?.vscode)
      .toBe(`^${minimumPlan.minimumVSCodeVersion}`);
    expect(extensionManifest.scripts?.["test:extension-host"])
      .toContain("--worker --current-stable");
    expect(extensionManifest.scripts?.["test:extension-host:worker"])
      .toBe("pnpm run test:extension-host");
    expect(extensionManifest.scripts?.["test:extension-host:ipc"])
      .toContain("--ipc --current-stable");
    expect(extensionManifest.scripts?.["test:extension-host:current-stable"])
      .toBe("pnpm run test:extension-host");
    expect(extensionManifest.scripts?.["test:extension-host:minimum"])
      .toContain("--worker --minimum");
    expect(rootManifest.scripts).toMatchObject({
      "test:vscode:extension-host": "pnpm --filter aurelia-2 test:extension-host",
      "test:vscode:extension-host:worker": "pnpm --filter aurelia-2 test:extension-host:worker",
      "test:vscode:extension-host:ipc": "pnpm --filter aurelia-2 test:extension-host:ipc",
      "test:vscode:extension-host:current-stable": "pnpm --filter aurelia-2 test:extension-host:current-stable",
      "test:vscode:extension-host:minimum": "pnpm --filter aurelia-2 test:extension-host:minimum",
    });
  });
});

function readManifest(url: URL): PackageManifest {
  return JSON.parse(readFileSync(url, "utf8")) as PackageManifest;
}

function readPlan(...args: string[]): RunnerPlan {
  const result = runRunner(...args, "--plan");
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout.trim()) as RunnerPlan;
}

function readFailure(...args: string[]): string {
  const result = runRunner(...args, "--plan");
  expect(result.status).not.toBe(0);
  return `${result.stdout}\n${result.stderr}`;
}

function runRunner(...args: string[]) {
  return spawnSync(process.execPath, [runnerPath, ...args], {
    encoding: "utf8",
    windowsHide: true,
  });
}

function readExecutionProbe(): ExecutionProbe {
  const runnerUrl = new URL("../scripts/run-extension-host-tests.mjs", import.meta.url).href;
  const probeSource = `
    const runner = await import(${JSON.stringify(runnerUrl)});
    const preparedShards = [];
    const launches = [];
    let downloadCount = 0;
    let activeLaunches = 0;
    let maxConcurrentLaunches = 0;
    const plan = runner.parseRunnerArguments(["--worker", "--current-stable"]);
    await runner.runExtensionHostTests(plan, {
      electron: {
        ProgressReportStage: { ResolvedVersion: "resolvedVersion" },
        makeConsoleReporter: async () => ({ error() {}, report() {} }),
        downloadAndUnzipVSCode: async ({ reporter }) => {
          downloadCount += 1;
          reporter.report({ stage: "resolvedVersion", version: "1.123.4" });
          return "mock-vscode";
        },
        runTests: async (options) => {
          activeLaunches += 1;
          maxConcurrentLaunches = Math.max(maxConcurrentLaunches, activeLaunches);
          launches.push({
            shard: options.extensionTestsEnv.AURELIA_LS_EXTENSION_HOST_SHARD,
            expectedActualVersion:
              options.extensionTestsEnv.AURELIA_LS_EXTENSION_HOST_EXPECTED_ACTUAL_VERSION,
            expectedTransport:
              options.extensionTestsEnv.AURELIA_LS_EXTENSION_HOST_EXPECTED_TRANSPORT,
            tailObservation:
              options.extensionTestsEnv.AURELIA_LS_EXTENSION_HOST_TAIL_OBSERVATION ?? null,
            testWorkspace: options.launchArgs[0],
            userDataArgument: options.launchArgs.find((argument) =>
              argument.startsWith("--user-data-dir=")),
          });
          await new Promise((resolve) => setImmediate(resolve));
          activeLaunches -= 1;
        },
      },
      prepareWorkspace: (shard) => {
        preparedShards.push(shard);
        const root = "/mock/" + shard;
        return {
          aureliaWorkspace: root + "/aurelia",
          secondaryAureliaWorkspace: root + "/secondary",
          excludedAureliaWorkspace: root + "/excluded",
          plainTypeScriptWorkspace: root + "/plain",
          testWorkspace: root + "/workspace.code-workspace",
          userDataDirectory: root + "/profile/user-data",
          extensionsDirectory: root + "/profile/extensions",
        };
      },
    });
    console.log(JSON.stringify({
      downloadCount,
      launches,
      maxConcurrentLaunches,
      preparedShards,
    }));
  `;
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", probeSource], {
    encoding: "utf8",
    windowsHide: true,
  });
  expect(result.status).toBe(0);
  const outputLines = result.stdout.trim().split(/\r?\n/u);
  return JSON.parse(outputLines.at(-1) ?? "") as ExecutionProbe;
}
