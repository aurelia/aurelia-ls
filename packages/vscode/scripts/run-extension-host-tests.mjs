import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const minimumVSCodeVersion = "1.91.0";
export const extensionHostShards = Object.freeze([
  "worker-lifecycle",
  "rename-reliability",
  "product-support",
]);

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");
const extensionDevelopmentPath = resolve(__dirname, "..");
const extensionTestsPath = join(extensionDevelopmentPath, "test", "extension-host", "suite", "index.cjs");
const sourceWorkspace = join(repoRoot, "fixtures", "hello-world");
const tempRoot = join(repoRoot, ".temp", "vscode-extension-host");
const usage = [
  "Usage: node scripts/run-extension-host-tests.mjs",
  "[--worker|--ipc]",
  "[--current-stable|--minimum]",
  "[--shard=all|worker-lifecycle|rename-reliability|product-support]",
  "[--plan]",
].join(" ");

export function parseRunnerArguments(args) {
  let transport;
  let version;
  let shard;
  let planOnly = false;

  for (const argument of args) {
    if (argument === "--worker" || argument === "--ipc") {
      transport = setOnce("transport", transport, argument.slice(2));
      continue;
    }
    if (argument === "--current-stable") {
      version = setOnce("VS Code version", version, "stable");
      continue;
    }
    if (argument === "--minimum") {
      version = setOnce("VS Code version", version, minimumVSCodeVersion);
      continue;
    }
    if (argument.startsWith("--shard=")) {
      shard = setOnce("shard", shard, argument.slice("--shard=".length));
      continue;
    }
    if (argument === "--plan") {
      if (planOnly) fail("--plan may only be provided once.");
      planOnly = true;
      continue;
    }
    fail(`Unknown argument: ${argument}`);
  }

  transport ??= "worker";
  version ??= "stable";
  shard ??= transport === "ipc" ? "product-support" : "all";

  if (transport === "ipc" && version !== "stable") {
    fail("Forced IPC is a current-stable control lane.");
  }
  const shards = shard === "all" ? [...extensionHostShards] : [shard];
  for (const selectedShard of shards) {
    if (!extensionHostShards.includes(selectedShard)) {
      fail(`Unknown Extension Host shard: ${selectedShard}`);
    }
  }
  if (transport === "ipc" && (shards.length !== 1 || shards[0] !== "product-support")) {
    fail("Forced IPC is a focused control lane and may only run the product-support shard.");
  }

  return Object.freeze({
    transport,
    version,
    versionLane: version === "stable" ? "current-stable" : "minimum",
    minimumVSCodeVersion,
    shards: Object.freeze(shards),
    launchCount: shards.length,
    planOnly,
  });
}

export async function runExtensionHostTests(plan, dependencies = {}) {
  const electron = dependencies.electron ?? await import("@vscode/test-electron");
  const prepareWorkspace = dependencies.prepareWorkspace ?? prepareTestWorkspace;
  const {
    downloadAndUnzipVSCode,
    makeConsoleReporter,
    ProgressReportStage,
    runTests,
  } = electron;
  console.log(
    `[aurelia-extension-host] resolving vscode=${plan.versionLane} `
      + `transport=${plan.transport} shards=${plan.shards.join(",")}`,
  );
  const consoleReporter = await makeConsoleReporter();
  let resolvedVersion;
  const vscodeExecutablePath = await downloadAndUnzipVSCode({
    version: plan.version,
    extensionDevelopmentPath,
    reporter: {
      error: (error) => consoleReporter.error(error),
      report: (report) => {
        consoleReporter.report(report);
        if (report.stage === ProgressReportStage.ResolvedVersion) {
          resolvedVersion = report.version;
        }
      },
    },
  });
  if (resolvedVersion === undefined) {
    throw new Error("VS Code download resolution did not report an exact version.");
  }

  for (const shard of plan.shards) {
    const workspace = prepareWorkspace(shard);
    console.log(
      `[aurelia-extension-host] launching shard=${shard} `
        + `requestedVersion=${plan.versionLane} transport=${plan.transport}`,
    );
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        workspace.testWorkspace,
        `--user-data-dir=${workspace.userDataDirectory}`,
        `--extensions-dir=${workspace.extensionsDirectory}`,
        "--disable-extensions",
        "--disable-workspace-trust",
        "--skip-welcome",
        "--skip-release-notes",
      ],
      extensionTestsEnv: {
        AURELIA_LS_EXTENSION_HOST_WORKSPACE: workspace.aureliaWorkspace,
        AURELIA_LS_EXTENSION_HOST_SECONDARY_WORKSPACE: workspace.secondaryAureliaWorkspace,
        AURELIA_LS_EXTENSION_HOST_EXCLUDED_WORKSPACE: workspace.excludedAureliaWorkspace,
        AURELIA_LS_EXTENSION_HOST_PLAIN_WORKSPACE: workspace.plainTypeScriptWorkspace,
        AURELIA_LS_EXTENSION_HOST_SHARD: shard,
        AURELIA_LS_EXTENSION_HOST_EXPECTED_ACTUAL_VERSION: resolvedVersion,
        AURELIA_LS_EXTENSION_HOST_EXPECTED_VERSION: plan.version,
        AURELIA_LS_EXTENSION_HOST_EXPECTED_TRANSPORT: plan.transport,
        AURELIA_LS_EXTENSION_HOST_OBSERVATION: "1",
        ...(shard === "product-support"
          ? { AURELIA_LS_EXTENSION_HOST_TAIL_OBSERVATION: "1" }
          : {}),
        AURELIA_LS_FORCE_IPC_TRANSPORT: plan.transport === "worker" ? "0" : "1",
        ...(process.env.AURELIA_LS_EXTENSION_HOST_GREP
          ? { AURELIA_LS_EXTENSION_HOST_GREP: process.env.AURELIA_LS_EXTENSION_HOST_GREP }
          : {}),
      },
    });
  }
}

function setOnce(name, current, next) {
  if (current !== undefined) fail(`${name} may only be selected once.`);
  return next;
}

function fail(message) {
  throw new Error(`${message}\n${usage}`);
}

function prepareTestWorkspace(shard) {
  const shardRoot = join(tempRoot, shard);
  const aureliaWorkspace = join(shardRoot, "hello-world");
  const secondaryAureliaWorkspace = join(shardRoot, "hello-world-secondary");
  const excludedAureliaWorkspace = join(aureliaWorkspace, "excluded-project");
  const plainTypeScriptWorkspace = join(shardRoot, "plain-typescript");
  const testWorkspace = join(shardRoot, "extension-host.code-workspace");
  const userDataDirectory = join(shardRoot, "profile", "user-data");
  const extensionsDirectory = join(shardRoot, "profile", "extensions");

  assertInside(join(repoRoot, ".temp"), tempRoot);
  assertInside(tempRoot, shardRoot);
  assertInside(shardRoot, aureliaWorkspace);
  assertInside(shardRoot, secondaryAureliaWorkspace);
  assertInside(aureliaWorkspace, excludedAureliaWorkspace);
  assertInside(shardRoot, plainTypeScriptWorkspace);
  assertInside(shardRoot, testWorkspace);
  assertInside(shardRoot, userDataDirectory);
  assertInside(shardRoot, extensionsDirectory);

  if (existsSync(shardRoot)) {
    rmSync(shardRoot, { recursive: true, force: true });
  }
  mkdirSync(join(plainTypeScriptWorkspace, "src"), { recursive: true });
  mkdirSync(userDataDirectory, { recursive: true });
  mkdirSync(extensionsDirectory, { recursive: true });
  cpSync(sourceWorkspace, aureliaWorkspace, { recursive: true });
  cpSync(sourceWorkspace, secondaryAureliaWorkspace, { recursive: true });
  writeFileSync(
    join(aureliaWorkspace, "aurelia.project.json"),
    "{\n  // JSONC syntax is intentional.\n  \"version\": 1,\n}\n",
  );
  mkdirSync(join(excludedAureliaWorkspace, ".vscode"), { recursive: true });
  mkdirSync(join(excludedAureliaWorkspace, "src"), { recursive: true });
  writeFileSync(join(excludedAureliaWorkspace, ".vscode", "settings.json"), JSON.stringify({
    "aurelia.activationMode": "off",
  }, null, 2));
  writeFileSync(join(excludedAureliaWorkspace, "package.json"), JSON.stringify({
    name: "excluded-aurelia-extension-host-fixture",
    private: true,
    dependencies: { aurelia: "workspace:*" },
  }, null, 2));
  writeFileSync(join(excludedAureliaWorkspace, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      strict: true,
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
    },
    include: ["src/**/*.ts"],
  }, null, 2));
  writeFileSync(
    join(excludedAureliaWorkspace, "src", "excluded-view.ts"),
    "export class ExcludedView { excludedMessage = 'not owned'; }\n",
  );
  writeFileSync(
    join(excludedAureliaWorkspace, "src", "excluded-view.html"),
    "<p>${excludedMessage}</p>\n",
  );
  writeFileSync(join(plainTypeScriptWorkspace, "package.json"), JSON.stringify({
    name: "plain-typescript-extension-host-fixture",
    private: true,
  }, null, 2));
  writeFileSync(join(plainTypeScriptWorkspace, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      strict: true,
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
    },
    include: ["src/**/*.ts"],
  }, null, 2));
  writeFileSync(
    join(plainTypeScriptWorkspace, "src", "plain.ts"),
    "export const standaloneName = 1;\nconsole.log(standaloneName);\n",
  );
  writeFileSync(testWorkspace, JSON.stringify({
    folders: [
      { name: "hello-world", path: "hello-world" },
      { name: "excluded-project", path: "hello-world/excluded-project" },
      { name: "plain-typescript", path: "plain-typescript" },
    ],
  }, null, 2));

  return {
    aureliaWorkspace,
    secondaryAureliaWorkspace,
    excludedAureliaWorkspace,
    plainTypeScriptWorkspace,
    testWorkspace,
    userDataDirectory,
    extensionsDirectory,
  };
}

function assertInside(parent, child) {
  const parentPath = resolve(parent);
  const childPath = resolve(child);
  if (childPath !== parentPath && !childPath.startsWith(`${parentPath}\\`) && !childPath.startsWith(`${parentPath}/`)) {
    throw new Error(`Refusing to touch path outside ${parentPath}: ${childPath}`);
  }
}

async function main() {
  const plan = parseRunnerArguments(process.argv.slice(2));
  if (plan.planOnly) {
    console.log(JSON.stringify({ ...plan, planOnly: undefined }));
    return;
  }
  await runExtensionHostTests(plan);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (invokedPath === fileURLToPath(import.meta.url)) {
  await main();
}
