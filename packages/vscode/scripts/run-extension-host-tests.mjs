import {
  closeSync,
  cpSync,
  existsSync,
  fstatSync,
  openSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { createServer } from "node:net";
import {
  dirname,
  isAbsolute,
  join,
  normalize,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";
import { extensionHostStaticContractSha256 } from "./extension-host-static-contract.mjs";
import { minimumVSCodeVersion } from "./extension-host-version-contract.mjs";
import {
  artifactPaths,
  gitState,
  verifyVsix,
} from "./vsix-artifact.mjs";

export { minimumVSCodeVersion };
export const resourceDiscoveryObservationLedgerMaxBytes = 192 * 1024 * 1024;
export const extensionHostShards = Object.freeze([
  "worker-lifecycle",
  "rename-reliability",
  "product-support",
]);

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");
const extensionDevelopmentPath = resolve(__dirname, "..");
const extensionTestsPath = join(extensionDevelopmentPath, "test", "extension-host", "suite", "index.cjs");
const installedDriverRoot = join(extensionDevelopmentPath, "test", "installed-driver");
const sourceWorkspace = join(repoRoot, "fixtures", "hello-world");
const semanticRuntimeDependencies = join(repoRoot, "packages", "semantic-runtime", "node_modules");
const rootWorkspaceDependencySpecifiers = Object.freeze(["aurelia", "@aurelia/router"]);
const disposableTempBoundary = join(repoRoot, ".temp");
const tempRoot = join(repoRoot, ".temp", "vscode-extension-host");
const resourceDiscoveryFixtureManifest = join(
  extensionDevelopmentPath,
  "test",
  "fixtures",
  "resource-discovery-host.json",
);
const resourceDiscoveryPressureFixtures = join(
  repoRoot,
  "packages",
  "semantic-runtime",
  "fixtures",
  "pressure",
);
const productSupportEvidenceNames = Object.freeze({
  descriptor: "semantic-workspace.json",
  fixtureManifest: "fixture-manifest.json",
  ledger: "resource-discovery.observations.jsonl",
  report: "resource-discovery.acceptance.json",
});
const sha256Pattern = /^[a-f0-9]{64}$/u;
const semanticRuntimeFingerprintPattern = new RegExp([
  "^semantic-runtime:",
  "(?<sessionIdentity>[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})",
  ":workspace-(?<workspaceGeneration>0|[1-9]\\d*)",
  ":source-world-(?<sourceWorldRevision>semantic-source-world/2:",
  "[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048])",
  ":request-(?<requestEpoch>0|[1-9]\\d*)(?![\\s\\S])",
].join(""), "u");
const resourceDiscoveryFixtureWitnessIds = Object.freeze([
  "projectTemplateAmbiguity",
  "longSuffixDuplicates",
  "localTemplateAndBindables",
  "aliasAndCrossKindCollisions",
  "headerOnlyMetadata",
  "packageOrigins",
  "pathlessFramework",
  "guardrail",
  "openCoverage",
  "pageDrain",
  "shiftedAndRemovedNavigation",
]);
const ambiguityExcludedAppRootIdentity =
  "typescript-resource:v1:5EsohJa8ZPz7ZfvI5o74H5";
export const openCoverageSelectableResourceCount = 0;
const ambiguityScopeContracts = Object.freeze({
  "host-alpha": Object.freeze([
    Object.freeze({
      scopeIdentityKey: "template-resource-scope:v1:kQWeKrSZ95gLvmXbZfgHGV",
      rowCount: 35,
      mustExcludeCount: 0,
    }),
    Object.freeze({
      scopeIdentityKey: "template-resource-scope:v1:sYGd8lgb0DmojJtGcGvScL",
      rowCount: 27,
      mustExcludeCount: 8,
    }),
  ]),
  "host-beta": Object.freeze([
    Object.freeze({
      scopeIdentityKey: "template-resource-scope:v1:DyenXVI3F4LdZsCEbczI_4",
      rowCount: 27,
      mustExcludeCount: 8,
    }),
    Object.freeze({
      scopeIdentityKey: "template-resource-scope:v1:yNEIWOdR2n--gCE9MlTL-T",
      rowCount: 35,
      mustExcludeCount: 0,
    }),
  ]),
});
export const resourceDiscoveryRequiredJourneyIds = Object.freeze({
  minimum: Object.freeze([
    "authentication",
    "quiet-admitted-lifecycle",
    "hierarchy",
    "resource-breadth",
    "long-scent-duplicates",
    "ambiguity",
    "partial-failure",
    "recovery-currentness",
    "navigation",
    "cancellation",
    "distinct-states",
  ]),
  "current-stable": Object.freeze([
    "authentication",
    "quiet-admitted-lifecycle",
    "hierarchy",
    "resource-breadth",
    "long-scent-duplicates",
    "ambiguity",
    "partial-failure",
    "recovery-currentness",
    "navigation",
    "cancellation",
    "distinct-states",
    "provenance",
    "page-drain",
    "guardrail",
    "total-failure",
  ]),
});
const usage = [
  "Usage: node scripts/run-extension-host-tests.mjs",
  "[--worker|--ipc]",
  "[--current-stable|--minimum]",
  "[--shard=all|worker-lifecycle|rename-reliability|product-support]",
  "[--installed-vsix]",
  "[--plan]",
].join(" ");

export function parseRunnerArguments(args) {
  let transport;
  let version;
  let shard;
  let planOnly = false;
  let productMode = "development";

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
    if (argument === "--installed-vsix") {
      if (productMode === "installed-vsix") fail("--installed-vsix may only be provided once.");
      productMode = "installed-vsix";
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
  if (productMode === "installed-vsix" && transport !== "worker") {
    fail("Installed VSIX Extension Host acceptance is a worker-only lane.");
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
    productMode,
  });
}

export async function runExtensionHostTests(plan, dependencies = {}) {
  if (plan.productMode === "installed-vsix") {
    return runInstalledVsixExtensionHostTests(plan, dependencies);
  }
  const electron = dependencies.electron ?? await import("@vscode/test-electron");
  const prepareWorkspace = dependencies.prepareWorkspace ?? prepareTestWorkspace;
  const authenticateReport = dependencies.authenticateReport
    ?? authenticateProductSupportReport;
  const staticContractHasher = dependencies.staticContractHasher
    ?? (dependencies.staticContractSha256 == null
      ? () => extensionHostStaticContractSha256(extensionDevelopmentPath)
      : () => dependencies.staticContractSha256);
  const allocateRenameUiPort = dependencies.allocateRenameUiPort ?? allocateLoopbackPort;
  const staticContractSha256 = plan.shards.includes("product-support")
    ? staticContractHasher()
    : null;
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
  if (!/^\d+\.\d+\.\d+$/u.test(resolvedVersion)) {
    throw new Error(`VS Code download resolution reported a non-stable version: ${resolvedVersion}`);
  }
  if (plan.versionLane === "minimum" && resolvedVersion !== minimumVSCodeVersion) {
    throw new Error(
      `The minimum Extension Host lane resolved ${resolvedVersion}; expected exactly ${minimumVSCodeVersion}.`,
    );
  }

  for (const shard of plan.shards) {
    const workspace = prepareWorkspace(shard, {
      transport: plan.transport,
      version: plan.version,
      versionLane: plan.versionLane,
      resolvedVersion,
    });
    console.log(
      `[aurelia-extension-host] launching shard=${shard} `
        + `requestedVersion=${plan.versionLane} transport=${plan.transport}`,
    );
    const renameUiPort = shard === "rename-reliability"
      ? await allocateRenameUiPort()
      : null;
    const extensionTestsEnv = extensionHostEnvironment(
      plan,
      shard,
      workspace,
      resolvedVersion,
      renameUiPort,
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
        ...(renameUiPort == null
          ? []
          : [
              "--remote-debugging-address=127.0.0.1",
              `--remote-debugging-port=${renameUiPort}`,
            ]),
      ],
      extensionTestsEnv,
    });
    if (shard === "product-support") {
      const postRunStaticContractSha256 = staticContractHasher();
      if (postRunStaticContractSha256 !== staticContractSha256) {
        throw new Error("The Extension Host static contract changed during launch.");
      }
      authenticateReport({
        plan,
        resolvedVersion,
        staticContractSha256,
        workspace,
      });
    }
  }
}

/** Install and exercise the current-HEAD VSIX while the inert driver remains the sole development extension. */
export async function runInstalledVsixExtensionHostTests(plan, dependencies = {}) {
  const installedVerifier = dependencies.installedVerifier
    ?? await import("./verify-installed-vsix.mjs");
  const {
    buildInstallInvocation,
    discoverInstalledProduct,
    requireArtifactReceipt,
    requireSameRepositoryState,
    requireSuccessfulProcess,
    runChildProcess,
    testElectronEvidence,
    verifyInstalledInventory,
  } = installedVerifier;
  const electron = dependencies.electron ?? await import("@vscode/test-electron");
  (dependencies.testElectronEvidence ?? testElectronEvidence)();
  const readGitState = dependencies.gitState ?? gitState;
  const before = readGitState(dependencies.gitDependencies ?? {}, { repoRoot });
  const verifyArtifact = dependencies.verifyVsix ?? verifyVsix;
  const receipt = await verifyArtifact(dependencies.archiveDependencies ?? {});
  requireArtifactReceipt(receipt, before);
  const packageJson = dependencies.packageJson
    ?? JSON.parse(readFileSync(join(extensionDevelopmentPath, "package.json"), "utf8"));
  const paths = (dependencies.artifactPaths ?? artifactPaths)(packageJson, join(extensionDevelopmentPath, ".release"), before.head);
  const artifactPath = resolve(repoRoot, receipt.artifact.path);
  if (!sameHostPath(artifactPath, paths.vsix)) {
    throw new Error("VSIX receipt artifact path does not match the current-HEAD Extension Host artifact.");
  }
  if (sha256(readFileSync(artifactPath)) !== receipt.artifact.sha256) {
    throw new Error("Verified VSIX bytes changed before Extension Host acceptance.");
  }

  const consoleReporter = await electron.makeConsoleReporter();
  let resolvedVersion;
  const vscodeExecutablePath = await electron.downloadAndUnzipVSCode({
    version: plan.version,
    extensionDevelopmentPath: installedDriverRoot,
    reporter: {
      error: (error) => consoleReporter.error(error),
      report: (report) => {
        consoleReporter.report(report);
        if (report.stage === electron.ProgressReportStage.ResolvedVersion) resolvedVersion = report.version;
      },
    },
  });
  if (resolvedVersion == null) throw new Error("VS Code download resolution did not report an exact version.");
  if (!/^\d+\.\d+\.\d+$/u.test(resolvedVersion)) {
    throw new Error(`Installed Extension Host resolution reported a non-stable version: ${resolvedVersion}.`);
  }
  if (plan.versionLane === "minimum" && resolvedVersion !== minimumVSCodeVersion) {
    throw new Error(`The minimum installed Extension Host lane resolved ${resolvedVersion}; expected ${minimumVSCodeVersion}.`);
  }

  const installedRoot = join(tempRoot, "installed", before.head.slice(0, 12), plan.versionLane);
  const extensionsDirectory = join(installedRoot, "extensions");
  assertInside(tempRoot, installedRoot);
  if (existsSync(installedRoot)) removeDisposableTreeSafely(installedRoot);
  mkdirSync(extensionsDirectory, { recursive: true });
  const installStarted = Date.now();
  const installProfile = join(installedRoot, "install-profile");
  mkdirSync(installProfile, { recursive: true });
  const installInvocation = buildInstallInvocation({
    electron,
    vscodeExecutablePath,
    artifactPath,
    layout: { extensionsDirectory, userDataDirectory: installProfile },
  });
  const installResult = await (dependencies.installVsix ?? runChildProcess)(installInvocation);
  const installCompleted = Date.now();
  requireSuccessfulProcess(installResult, "Installed VSIX Extension Host installation");
  let product = discoverInstalledProduct(extensionsDirectory, receipt.identity);
  verifyInstalledInventory(receipt, product.extensionPath, {
    startedEpochMilliseconds: installStarted,
    completedEpochMilliseconds: installCompleted,
  });

  const staticContractSha256 = extensionHostStaticContractSha256(product.extensionPath);
  const installedProductPath = product.extensionPath;
  for (const shard of plan.shards) {
    const workspace = (dependencies.prepareWorkspace ?? prepareTestWorkspace)(shard, {
      transport: plan.transport,
      version: plan.version,
      versionLane: plan.versionLane,
      resolvedVersion,
    });
    const renameUiPort = shard === "rename-reliability"
      ? await (dependencies.allocateRenameUiPort ?? allocateLoopbackPort)()
      : null;
    const env = extensionHostEnvironment(plan, shard, workspace, resolvedVersion, renameUiPort, {
      product,
      identity: receipt.identity,
      extensionsDirectory,
    });
    await electron.runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath: installedDriverRoot,
      extensionTestsPath,
      launchArgs: [
        workspace.testWorkspace,
        `--user-data-dir=${workspace.userDataDirectory}`,
        `--extensions-dir=${extensionsDirectory}`,
        "--disable-workspace-trust",
        "--skip-welcome",
        "--skip-release-notes",
        ...(renameUiPort == null ? [] : ["--remote-debugging-address=127.0.0.1", `--remote-debugging-port=${renameUiPort}`]),
      ],
      extensionTestsEnv: env,
    });
    if (shard === "product-support") {
      (dependencies.authenticateReport ?? authenticateProductSupportReport)({
        plan, resolvedVersion, staticContractSha256, workspace,
      });
    }
    product = discoverInstalledProduct(extensionsDirectory, receipt.identity);
    if (!sameHostPath(product.extensionPath, installedProductPath)) {
      throw new Error("Installed VSIX product path changed during full host acceptance.");
    }
    verifyInstalledInventory(receipt, product.extensionPath, {
      startedEpochMilliseconds: installStarted,
      completedEpochMilliseconds: installCompleted,
    });
    if (extensionHostStaticContractSha256(product.extensionPath) !== staticContractSha256) {
      throw new Error("Installed VSIX static contract changed during full host acceptance.");
    }
  }
  const finalReceipt = await verifyArtifact(dependencies.archiveDependencies ?? {});
  requireArtifactReceipt(finalReceipt, before);
  if (JSON.stringify(finalReceipt) !== JSON.stringify(receipt)) throw new Error("VSIX receipt changed during full host acceptance.");
  if (sha256(readFileSync(artifactPath)) !== receipt.artifact.sha256) {
    throw new Error("Installed Extension Host acceptance changed the verified VSIX bytes.");
  }
  requireSameRepositoryState(before, readGitState(dependencies.gitDependencies ?? {}, { repoRoot }));
  return Object.freeze({
    artifactPath,
    artifactSha256: receipt.artifact.sha256,
    installedProductPath,
    productMode: plan.productMode,
    resolvedVersion,
    versionLane: plan.versionLane,
  });
}

function extensionHostEnvironment(plan, shard, workspace, resolvedVersion, renameUiPort, installed = null) {
  return {
    AURELIA_LS_EXTENSION_HOST_WORKSPACE: workspace.aureliaWorkspace,
    AURELIA_LS_EXTENSION_HOST_SECONDARY_WORKSPACE: workspace.secondaryAureliaWorkspace,
    AURELIA_LS_EXTENSION_HOST_EXCLUDED_WORKSPACE: workspace.excludedAureliaWorkspace,
    AURELIA_LS_EXTENSION_HOST_PLAIN_WORKSPACE: workspace.plainTypeScriptWorkspace,
    ...(shard === "product-support"
      ? {
          AURELIA_LS_EXTENSION_HOST_ROUTED_WORKSPACE: workspace.routedAureliaWorkspace,
          AURELIA_LS_EXTENSION_HOST_TAIL_OBSERVATION: "1",
          AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE: "1",
          AURELIA_LS_RESOURCE_DISCOVERY_HOST_DESCRIPTOR: workspace.resourceDiscoveryDescriptor,
          AURELIA_LS_RESOURCE_DISCOVERY_HOST_FIXTURE_MANIFEST:
            workspace.resourceDiscoveryFixtureManifest,
          AURELIA_LS_RESOURCE_DISCOVERY_HOST_LEDGER: workspace.resourceDiscoveryLedger,
          AURELIA_LS_RESOURCE_DISCOVERY_HOST_REPORT: workspace.resourceDiscoveryReport,
          AURELIA_LS_RESOURCE_DISCOVERY_HOST_SOURCE_MANIFEST: resourceDiscoveryFixtureManifest,
        }
      : {}),
    ...(shard === "worker-lifecycle" && plan.transport === "worker"
      ? {
          AURELIA_LS_WORKER_RESTART_HOST_ACCEPTANCE: "1",
        }
      : {}),
    AURELIA_LS_EXTENSION_HOST_SHARD: shard,
    AURELIA_LS_EXTENSION_HOST_EXPECTED_ACTUAL_VERSION: resolvedVersion,
    AURELIA_LS_EXTENSION_HOST_EXPECTED_VERSION: plan.version,
    AURELIA_LS_EXTENSION_HOST_EXPECTED_TRANSPORT: plan.transport,
    AURELIA_LS_EXTENSION_HOST_OBSERVATION: "1",
    AURELIA_LS_FORCE_IPC_TRANSPORT: plan.transport === "worker" ? "0" : "1",
    AURELIA_LS_EXTENSION_HOST_PRODUCT_MODE: installed == null ? "development" : "installed-vsix",
    AURELIA_LS_EXTENSION_HOST_HARNESS_ROOT: extensionDevelopmentPath,
    ...(installed == null ? {} : {
      AURELIA_LS_INSTALLED_PRODUCT_PATH: installed.product.extensionPath,
      AURELIA_LS_INSTALLED_EXTENSIONS_ROOT: installed.extensionsDirectory,
      AURELIA_LS_INSTALLED_SOURCE_EXTENSION_ROOT: extensionDevelopmentPath,
      AURELIA_LS_INSTALLED_DRIVER_ROOT: installedDriverRoot,
      AURELIA_LS_INSTALLED_PRODUCT_VERSION: installed.identity.version,
      AURELIA_LS_INSTALLED_PRODUCT_PUBLISHER: installed.identity.publisher,
      AURELIA_LS_INSTALLED_PRODUCT_NAME: installed.identity.name,
      AURELIA_LS_INSTALLED_PRODUCT_MAIN: installed.identity.main,
      AURELIA_LS_INSTALLED_PRODUCT_ENGINE: installed.identity.vscodeEngine,
    }),
    ...(renameUiPort == null
      ? {}
      : { AURELIA_LS_RENAME_UI_CDP_PORT: String(renameUiPort) }),
    ...(process.env.AURELIA_LS_EXTENSION_HOST_GREP
      ? { AURELIA_LS_EXTENSION_HOST_GREP: process.env.AURELIA_LS_EXTENSION_HOST_GREP }
      : {}),
  };
}

/** Reserve and release one loopback port immediately before Electron launch. */
export async function allocateLoopbackPort() {
  return new Promise((resolvePort, rejectPort) => {
    const server = createServer();
    const fail = (error) => {
      rejectPort(error);
    };
    server.once("error", fail);
    server.listen({ host: "127.0.0.1", port: 0, exclusive: true }, () => {
      server.off("error", fail);
      const address = server.address();
      if (address == null || typeof address === "string") {
        server.close();
        rejectPort(new Error("Could not allocate a TCP loopback port for rename UI automation."));
        return;
      }
      server.close((error) => {
        if (error) {
          rejectPort(error);
        } else {
          resolvePort(address.port);
        }
      });
    });
  });
}

function setOnce(name, current, next) {
  if (current !== undefined) fail(`${name} may only be selected once.`);
  return next;
}

function fail(message) {
  throw new Error(`${message}\n${usage}`);
}

function prepareTestWorkspace(shard, lane) {
  const shardRoot = disposableShardRoot(lane.versionLane, lane.transport, shard);
  const aureliaWorkspace = join(shardRoot, "hello-world");
  const secondaryAureliaWorkspace = join(shardRoot, "hello-world-secondary");
  const excludedAureliaWorkspace = join(aureliaWorkspace, "excluded-project");
  const plainTypeScriptWorkspace = join(shardRoot, "plain-typescript");
  const routedAureliaWorkspace = shard === "product-support"
    ? join(shardRoot, "routed-catalog-storefront")
    : null;
  const testWorkspace = join(shardRoot, "extension-host.code-workspace");
  const userDataDirectory = join(shardRoot, "profile", "user-data");
  const extensionsDirectory = join(shardRoot, "profile", "extensions");

  assertInside(join(repoRoot, ".temp"), tempRoot);
  assertInside(tempRoot, shardRoot);
  assertInside(shardRoot, aureliaWorkspace);
  assertInside(shardRoot, secondaryAureliaWorkspace);
  assertInside(aureliaWorkspace, excludedAureliaWorkspace);
  assertInside(shardRoot, plainTypeScriptWorkspace);
  if (routedAureliaWorkspace != null) assertInside(shardRoot, routedAureliaWorkspace);
  assertInside(shardRoot, testWorkspace);
  assertInside(shardRoot, userDataDirectory);
  assertInside(shardRoot, extensionsDirectory);

  assertDisposablePathBoundary(shardRoot, "Extension Host shard root");
  for (const [label, target] of [
    ["primary Aurelia workspace", aureliaWorkspace],
    ["secondary Aurelia workspace", secondaryAureliaWorkspace],
    ["excluded Aurelia workspace", excludedAureliaWorkspace],
    ["plain TypeScript workspace", plainTypeScriptWorkspace],
    ["routed Aurelia workspace", routedAureliaWorkspace],
    ["user data directory", userDataDirectory],
    ["extensions directory", extensionsDirectory],
  ]) {
    if (target != null) assertDisposablePathBoundary(target, label);
  }
  if (existsSync(shardRoot)) {
    removeDisposableTreeSafely(shardRoot, {
      allowedSymbolicLeaves: approvedMaterializationLinkLeaves(
        shardRoot,
        routedAureliaWorkspace,
        lane.versionLane,
      ),
    });
  }
  assertDisposablePathBoundary(shardRoot, "Extension Host shard root");
  mkdirSync(join(plainTypeScriptWorkspace, "src"), { recursive: true });
  mkdirSync(userDataDirectory, { recursive: true });
  mkdirSync(extensionsDirectory, { recursive: true });
  cpSync(sourceWorkspace, aureliaWorkspace, { recursive: true });
  cpSync(sourceWorkspace, secondaryAureliaWorkspace, { recursive: true });
  let resourceDiscoveryDescriptor = null;
  let resourceDiscoverySourceManifest = null;
  let resourceDiscoveryFixtureManifest = null;
  let resourceDiscoveryLedger = null;
  let resourceDiscoveryReport = null;
  let resourceDiscoverySourceManifestSha256 = null;
  let resourceDiscoveryFixtureSha256 = null;
  let resourceDiscoveryDescriptorSha256 = null;
  if (routedAureliaWorkspace != null) {
    const evidence = materializeResourceDiscoveryHostWorkspace({
      lane,
      shardRoot,
      workspaceRoot: routedAureliaWorkspace,
    });
    resourceDiscoveryDescriptor = evidence.descriptor;
    resourceDiscoverySourceManifest = evidence.sourceManifest;
    resourceDiscoveryFixtureManifest = evidence.fixtureManifest;
    resourceDiscoveryLedger = evidence.ledger;
    resourceDiscoveryReport = evidence.report;
    resourceDiscoverySourceManifestSha256 = evidence.sourceManifestSha256;
    resourceDiscoveryFixtureSha256 = evidence.fixtureSha256;
    resourceDiscoveryDescriptorSha256 = evidence.descriptorSha256;
  }
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
      ...(routedAureliaWorkspace == null
        ? []
        : [{ name: "routed-catalog-storefront", path: "routed-catalog-storefront" }]),
      { name: "excluded-project", path: "hello-world/excluded-project" },
      { name: "plain-typescript", path: "plain-typescript" },
    ],
  }, null, 2));

  return {
    aureliaWorkspace,
    secondaryAureliaWorkspace,
    excludedAureliaWorkspace,
    plainTypeScriptWorkspace,
    routedAureliaWorkspace,
    resourceDiscoveryDescriptor,
    resourceDiscoverySourceManifest,
    resourceDiscoveryFixtureManifest,
    resourceDiscoveryLedger,
    resourceDiscoveryReport,
    resourceDiscoverySourceManifestSha256,
    resourceDiscoveryFixtureSha256,
    resourceDiscoveryDescriptorSha256,
    testWorkspace,
    userDataDirectory,
    extensionsDirectory,
  };
}

function disposableShardRoot(versionLane, transport, shard) {
  if (versionLane !== "current-stable" && versionLane !== "minimum") {
    throw new Error(`Unknown Extension Host version lane: ${versionLane}`);
  }
  if (transport !== "worker" && transport !== "ipc") {
    throw new Error(`Unknown Extension Host transport: ${transport}`);
  }
  if (!extensionHostShards.includes(shard)) {
    throw new Error(`Unknown Extension Host shard: ${shard}`);
  }
  const root = join(tempRoot, versionLane, transport, shard);
  const pathSegments = relative(tempRoot, root).split(sep);
  if (
    pathSegments.length !== 3
    || pathSegments[0] !== versionLane
    || pathSegments[1] !== transport
    || pathSegments[2] !== shard
  ) {
    throw new Error(`Refusing to use malformed Extension Host shard root: ${root}`);
  }
  assertInside(tempRoot, root);
  assertDisposablePathBoundary(root, "Extension Host shard root");
  return root;
}

export function materializeResourceDiscoveryHostWorkspace({
  lane,
  shardRoot,
  workspaceRoot,
  sourceManifestPath = resourceDiscoveryFixtureManifest,
  sourceFixturesRoot = resourceDiscoveryPressureFixtures,
  generators = resourceDiscoveryGeneratedInputWriters,
  manifestValidator = validateSourceFixtureManifest,
  witnessAuthenticator = authenticateMaterializedWitnessSources,
}) {
  assertInside(tempRoot, shardRoot);
  assertInside(shardRoot, workspaceRoot);
  assertDisposablePathBoundary(shardRoot, "Resource Discovery shard root");
  assertDisposablePathBoundary(workspaceRoot, "Resource Discovery workspace root");
  if (existsSync(workspaceRoot)) {
    throw new Error(`Resource Discovery workspace must start absent: ${workspaceRoot}`);
  }
  mkdirSync(workspaceRoot, { recursive: true });

  const sourceManifestBytes = readBoundedRegularFile(
    sourceManifestPath,
    8 * 1024 * 1024,
    "committed Resource Discovery fixture manifest",
  );
  const sourceManifest = parseJsonObject(
    sourceManifestBytes,
    "committed Resource Discovery fixture manifest",
  );
  manifestValidator(sourceManifest);
  validateRequestedLane(sourceManifest.lanePolicy, lane);

  const materializedFiles = new Map();
  const materializedLinks = [];
  for (const input of sourceManifest.copyInputs) {
    materializeCopyInput({
      input,
      materializedFiles,
      sourceFixturesRoot,
      workspaceRoot,
    });
  }
  for (const input of sourceManifest.generatedInputs) {
    if (!input.lanes.includes(lane.versionLane)) continue;
    const writer = generators[input.id];
    if (typeof writer !== "function") {
      throw new Error(
        `No Resource Discovery generator is registered for '${input.id}' ${input.generatorVersion}.`,
      );
    }
    writer({
      input: Object.freeze({ ...input }),
      lane: Object.freeze({ ...lane }),
      workspaceRoot,
      write(relativePath, content) {
        writeGeneratedFile({
          content,
          destination: input.destination,
          materializedFiles,
          relativePath,
          workspaceRoot,
        });
      },
      writeWorkspace(relativePath, content) {
        writeGeneratedFile({
          content,
          destination: ".",
          materializedFiles,
          relativePath,
          workspaceRoot,
        });
      },
      link(relativePath, target) {
        materializedLinks.push(materializePackageLink({
          destination: input.destination,
          relativePath,
          target,
          workspaceRoot,
        }));
      },
      linkWorkspace(relativePath, target) {
        materializedLinks.push(materializePackageLink({
          destination: ".",
          relativePath,
          target,
          workspaceRoot,
        }));
      },
    });
  }
  witnessAuthenticator(
    sourceManifest,
    workspaceRoot,
    materializedFiles,
    lane.versionLane,
  );
  for (const specifier of rootWorkspaceDependencySpecifiers) {
    const target = realpathSync(join(semanticRuntimeDependencies, ...specifier.split("/")));
    materializedLinks.push(materializePackageLink({
      destination: ".",
      relativePath: `node_modules/${specifier}`,
      target,
      workspaceRoot,
    }));
  }

  const descriptor = semanticWorkspaceDescriptor(sourceManifest, workspaceRoot, lane.versionLane);
  const descriptorPath = join(workspaceRoot, productSupportEvidenceNames.descriptor);
  writeFileSync(descriptorPath, `${JSON.stringify(descriptor, null, 2)}\n`, { flag: "wx" });
  const descriptorBytes = readFileSync(descriptorPath);
  const descriptorSha256 = sha256(descriptorBytes);
  const files = [...materializedFiles.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([relativePath, absolutePath]) => {
      const bytes = readFileSync(absolutePath);
      return { relativePath, size: bytes.length, sha256: sha256(bytes) };
    });
  const links = materializedLinks
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  const renderedManifest = {
    ...sourceManifest,
    schemaVersion: "aurelia-resource-discovery-host-fixture-rendered/1",
    sourceManifestSha256: sha256(sourceManifestBytes),
    lane: lane.versionLane,
    transport: lane.transport,
    workspaceRoot: normalize(resolve(workspaceRoot)),
    files,
    links,
    descriptorRelativePath: productSupportEvidenceNames.descriptor,
    descriptorSha256,
  };
  validateRenderedManifestPreservation(sourceManifest, renderedManifest);
  const fixtureManifestPath = join(workspaceRoot, productSupportEvidenceNames.fixtureManifest);
  writeFileSync(fixtureManifestPath, `${JSON.stringify(renderedManifest, null, 2)}\n`, { flag: "wx" });
  const fixtureBytes = readFileSync(fixtureManifestPath);

  return Object.freeze({
    sourceManifest: normalize(resolve(sourceManifestPath)),
    descriptor: descriptorPath,
    fixtureManifest: fixtureManifestPath,
    ledger: join(workspaceRoot, productSupportEvidenceNames.ledger),
    report: join(workspaceRoot, productSupportEvidenceNames.report),
    sourceManifestSha256: sha256(sourceManifestBytes),
    fixtureSha256: sha256(fixtureBytes),
    descriptorSha256,
  });
}

export function validateResourceDiscoveryPlanInputs({
  sourceManifestPath = resourceDiscoveryFixtureManifest,
  sourceFixturesRoot = resourceDiscoveryPressureFixtures,
  generators = resourceDiscoveryGeneratedInputWriters,
  lane = null,
} = {}) {
  const sourceManifestBytes = readBoundedRegularFile(
    sourceManifestPath,
    8 * 1024 * 1024,
    "committed Resource Discovery fixture manifest",
  );
  const sourceManifest = parseJsonObject(
    sourceManifestBytes,
    "committed Resource Discovery fixture manifest",
  );
  validateSourceFixtureManifest(sourceManifest);
  for (const input of sourceManifest.copyInputs) {
    validateCopyInputSource(input, sourceFixturesRoot);
  }
  for (const input of sourceManifest.generatedInputs) {
    const writer = generators[input.id];
    if (typeof writer !== "function") {
      throw new Error(
        `No Resource Discovery generator is registered for '${input.id}' ${input.generatorVersion}.`,
      );
    }
    writer({
      input: Object.freeze({ ...input }),
      lane: Object.freeze({
        transport: "worker",
        version: input.lanes[0] === "minimum" ? minimumVSCodeVersion : "stable",
        versionLane: input.lanes[0],
        resolvedVersion: input.lanes[0] === "minimum" ? minimumVSCodeVersion : "0.0.0",
      }),
      workspaceRoot: join(tempRoot, "plan-validation"),
      write() {},
      writeWorkspace() {},
      link() {},
      linkWorkspace() {},
    });
  }
  const materialized = lane == null
    ? null
    : validatePlannedResourceDiscoveryLane({
        generators,
        lane,
        sourceFixturesRoot,
        sourceManifestPath,
      });
  return Object.freeze({
    sourceManifestSha256: sha256(sourceManifestBytes),
    copyInputCount: sourceManifest.copyInputs.length,
    generatedInputCount: sourceManifest.generatedInputs.length,
    materializedLane: materialized?.versionLane ?? null,
    materializedFileCount: materialized?.fileCount ?? null,
    materializedLinkCount: materialized?.linkCount ?? null,
  });
}

function validatePlannedResourceDiscoveryLane({
  generators,
  lane,
  sourceFixturesRoot,
  sourceManifestPath,
}) {
  const validationRoot = join(tempRoot, "plan-validation", randomUUID());
  const shardRoot = join(validationRoot, lane.versionLane, lane.transport, "product-support");
  const workspaceRoot = join(shardRoot, "routed-catalog-storefront");
  assertDisposablePathBoundary(validationRoot, "Resource Discovery plan validation root");
  try {
    const evidence = materializeResourceDiscoveryHostWorkspace({
      generators,
      lane,
      shardRoot,
      sourceFixturesRoot,
      sourceManifestPath,
      workspaceRoot,
    });
    writeFileSync(evidence.ledger, "{}\n", { flag: "wx" });
    writeFileSync(evidence.report, "{}\n", { flag: "wx" });
    const sourceBytes = readBoundedRegularFile(
      sourceManifestPath,
      8 * 1024 * 1024,
      "planned Resource Discovery source manifest",
    );
    const sourceFixture = parseJsonObject(sourceBytes, "planned Resource Discovery source manifest");
    const fixtureBytes = readBoundedRegularFile(
      evidence.fixtureManifest,
      8 * 1024 * 1024,
      "planned rendered Resource Discovery fixture",
      workspaceRoot,
    );
    const fixture = parseJsonObject(fixtureBytes, "planned rendered Resource Discovery fixture");
    const descriptorBytes = readBoundedRegularFile(
      evidence.descriptor,
      4 * 1024 * 1024,
      "planned Resource Discovery descriptor",
      workspaceRoot,
    );
    const descriptor = parseJsonObject(descriptorBytes, "planned Resource Discovery descriptor");
    validateSourceFixtureManifest(sourceFixture);
    validateRenderedManifestPreservation(sourceFixture, fixture);
    requireHash(
      fixture.sourceManifestSha256,
      sha256(sourceBytes),
      "planned rendered fixture sourceManifestSha256",
    );
    requireEqual(fixture.lane, lane.versionLane, "planned rendered fixture lane");
    requireEqual(fixture.transport, lane.transport, "planned rendered fixture transport");
    requireSamePath(fixture.workspaceRoot, workspaceRoot, "planned rendered fixture workspaceRoot");
    requireHash(fixture.descriptorSha256, sha256(descriptorBytes), "planned descriptorSha256");
    requireEqual(
      JSON.stringify(descriptor),
      JSON.stringify(semanticWorkspaceDescriptor(sourceFixture, workspaceRoot, lane.versionLane)),
      "planned semantic workspace descriptor",
    );
    authenticateRenderedCorpus(fixture, workspaceRoot);
    return Object.freeze({
      versionLane: lane.versionLane,
      fileCount: fixture.files.length,
      linkCount: fixture.links.length,
    });
  } finally {
    if (optionalLstat(validationRoot) != null) {
      removeDisposableTreeSafely(validationRoot, {
        allowedSymbolicLeaves: approvedMaterializationLinkLeaves(
          validationRoot,
          workspaceRoot,
          lane.versionLane,
        ),
      });
    }
  }
}

export const resourceDiscoveryGeneratedInputWriters = Object.freeze({
  "long-suffix-duplicates": generateLongSuffixDuplicateInputs,
  "open-coverage": generateOpenCoverageInputs,
  "package-origins": generatePackageOriginInputs,
  "page-drain": generatePageDrainInput,
  guardrail: generateGuardrailInput,
});

function generateLongSuffixDuplicateInputs(context) {
  requireGeneratedInputContract(
    context.input,
    "resource-discovery-long-suffix/1",
    "host-corpus/long-scent",
    ["current-stable", "minimum"],
  );
  const duplicateSource = (className, marker) => [
    "import { customElement } from 'aurelia';",
    "",
    "@customElement({",
    "  name: 'duplicate-card',",
    `  template: '<template>${marker}</template>',`,
    "})",
    `export class ${className} {}`,
    "",
  ].join("\n");
  context.write(
    "left/shared/duplicate-card.ts",
    duplicateSource("LeftLongSuffixDuplicateCard", "left-long-suffix"),
  );
  context.write(
    "right/shared/duplicate-card.ts",
    duplicateSource("RightLongSuffixDuplicateCard", "right-long-suffix"),
  );
  context.write("src/main.ts", [
    "import Aurelia, { customElement } from 'aurelia';",
    "import { LeftLongSuffixDuplicateCard } from '../left/shared/duplicate-card';",
    "import { RightLongSuffixDuplicateCard } from '../right/shared/duplicate-card';",
    "",
    "@customElement({",
    "  name: 'long-suffix-app',",
    "  template: '<duplicate-card></duplicate-card>',",
    "  dependencies: [LeftLongSuffixDuplicateCard, RightLongSuffixDuplicateCard],",
    "})",
    "export class LongSuffixApp {}",
    "",
    "Aurelia",
    "  .register(LeftLongSuffixDuplicateCard, RightLongSuffixDuplicateCard)",
    "  .app(LongSuffixApp)",
    "  .start();",
    "",
  ].join("\n"));
}

function generatePackageOriginInputs(context) {
  requireGeneratedInputContract(
    context.input,
    "resource-discovery-package-origins/1",
    "host-corpus/package-origin",
    ["current-stable"],
  );
  context.write("app/package.json", `${JSON.stringify({
    name: "host-package-origin-app",
    private: true,
    dependencies: {
      "@acme/installed-resource-kit": "0.0.0",
      "@acme/linked-resource-kit": "0.0.0",
      "@aurelia/runtime-html": "2.0.0",
    },
  }, null, 2)}\n`);
  context.write("app/tsconfig.json", `${JSON.stringify({
    compilerOptions: {
      experimentalDecorators: true,
      module: "ESNext",
      moduleResolution: "Bundler",
      strict: true,
      target: "ES2022",
    },
    files: ["src/main.ts"],
  }, null, 2)}\n`);
  context.write("app/src/main.ts", [
    "import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';",
    "import { InstalledPackageCard } from '@acme/installed-resource-kit';",
    "import { LinkedPackageCard } from '@acme/linked-resource-kit';",
    "",
    "@customElement({",
    "  name: 'package-origin-app',",
    "  template: '<installed-package-card></installed-package-card><linked-package-card></linked-package-card>',",
    "  dependencies: [InstalledPackageCard, LinkedPackageCard],",
    "})",
    "export class PackageOriginApp {}",
    "",
    "new Aurelia()",
    "  .register(StandardConfiguration)",
    "  .app({ host: document.body, component: PackageOriginApp })",
    "  .start();",
    "",
  ].join("\n"));
  generateResourcePackage(context.write, "app/node_modules/@acme/installed-resource-kit", {
    packageName: "@acme/installed-resource-kit",
    resourceName: "installed-package-card",
    className: "InstalledPackageCard",
  });
  generateResourcePackage(context.writeWorkspace, ".host-packages/linked-resource-kit", {
    packageName: "@acme/linked-resource-kit",
    resourceName: "linked-package-card",
    className: "LinkedPackageCard",
  });
  context.link(
    "app/node_modules/@acme/linked-resource-kit",
    resolve(contextWorkspaceRoot(context), ".host-packages", "linked-resource-kit"),
  );
  for (const packageName of resourceDiscoveryFrameworkPackageLinks) {
    context.link(
      `app/node_modules/@aurelia/${packageName}`,
      join(semanticRuntimeDependencies, "@aurelia", packageName),
    );
  }
}

function generatePageDrainInput(context) {
  requireGeneratedInputContract(
    context.input,
    "resource-discovery-page-drain/1",
    "host-corpus/page-drain",
    ["current-stable"],
  );
  const lines = [
    "import Aurelia, { customElement } from 'aurelia';",
    "",
  ];
  for (let index = 0; index <= 500; index += 1) {
    const suffix = index.toString().padStart(3, "0");
    lines.push(
      `@customElement({ name: 'page-drain-${suffix}', template: '<template>page-drain-${suffix}</template>' })`,
      `export class PageDrainResource${suffix} {}`,
      "",
    );
  }
  lines.push(
    "@customElement({ name: 'page-drain-app', template: '<template>page drain</template>' })",
    "export class PageDrainApp {}",
    "",
    "Aurelia",
    "  .register(",
  );
  for (let index = 0; index <= 500; index += 1) {
    lines.push(`    PageDrainResource${index.toString().padStart(3, "0")},`);
  }
  lines.push(
    "  )",
    "  .app(PageDrainApp)",
    "  .start();",
    "",
  );
  context.write("src/main.ts", lines.join("\n"));
}

function generateGuardrailInput(context) {
  requireGeneratedInputContract(
    context.input,
    "resource-discovery-guardrail/1",
    "host-corpus/guardrail",
    ["current-stable", "minimum"],
  );
  context.write("package.json", "{\"name\":\"host-guardrail\"}\n");
  context.write("tsconfig.json", `${JSON.stringify({
    compilerOptions: {
      experimentalDecorators: true,
      module: "ESNext",
      moduleResolution: "Bundler",
      strict: true,
      target: "ES2022",
    },
    include: ["src/**/*.ts"],
  }, null, 2)}\n`);
  context.write("src/a-main.ts", [
    "import Aurelia, { customElement } from 'aurelia';",
    "",
    "@customElement({ name: 'guardrail-app', template: '<template>guardrail</template>' })",
    "export class GuardrailApp {}",
    "",
    "Aurelia.app(GuardrailApp).start();",
    "",
  ].join("\n"));
  context.write("src/z-over-limit.ts", [
    "import { customElement } from 'aurelia';",
    "",
    "@customElement({ name: 'over-limit', template: '<template>over limit</template>' })",
    "export class OverLimit {}",
    "",
  ].join("\n"));
}

function generateOpenCoverageInputs(context) {
  requireGeneratedInputContract(
    context.input,
    "resource-discovery-open-coverage/1",
    "host-corpus/open",
    ["current-stable", "minimum"],
  );
  context.write("package.json", "{\"name\":\"host-open\"}\n");
  context.write("tsconfig.json", `${JSON.stringify({
    compilerOptions: {
      experimentalDecorators: true,
      module: "ESNext",
      moduleResolution: "Bundler",
      strict: true,
      target: "ES2022",
    },
    files: ["src/a-main.ts"],
  }, null, 2)}\n`);
  context.write("src/a-main.ts", [
    "import Aurelia, { customElement } from 'aurelia';",
    "import './missing-resource';",
    "",
    "@customElement({ name: 'open-coverage-app', template: '<template>open</template>' })",
    "export class OpenCoverageApp {}",
    "",
    "Aurelia.app(OpenCoverageApp).start();",
    "",
  ].join("\n"));
}

const resourceDiscoveryFrameworkPackageLinks = Object.freeze([
  "runtime-html",
]);

function generateResourcePackage(write, root, { packageName, resourceName, className }) {
  write(`${root}/package.json`, `${JSON.stringify({
    name: packageName,
    version: "0.0.0",
    type: "module",
    exports: {
      ".": {
        types: "./src/index.ts",
        import: "./src/index.ts",
      },
    },
  }, null, 2)}\n`);
  write(`${root}/src/index.ts`, [
    "import { customElement } from '@aurelia/runtime-html';",
    "",
    `@customElement({ name: '${resourceName}', template: '<span>${resourceName}</span>' })`,
    `export class ${className} {}`,
    "",
  ].join("\n"));
}

function requireGeneratedInputContract(input, generatorVersion, destination, lanes) {
  requireEqual(input.generatorVersion, generatorVersion, `generated input '${input.id}' version`);
  requireEqual(input.destination, destination, `generated input '${input.id}' destination`);
  requireArrayEqual(input.lanes, lanes, `generated input '${input.id}' lanes`);
}

function contextWorkspaceRoot(context) {
  const root = context.workspaceRoot;
  if (typeof root !== "string") {
    throw new Error("Resource Discovery generator context has no workspace root.");
  }
  return root;
}

function validateRequestedLane(lanePolicy, lane) {
  const policy = validateLanePolicy(lanePolicy);
  if (lane.transport === "worker") {
    if (!policy.requiredWorkerLanes.includes(lane.versionLane)) {
      throw new Error(`Resource Discovery does not admit Worker lane '${lane.versionLane}'.`);
    }
  } else if (!policy.optionalTransports.includes(lane.transport)) {
    throw new Error(`Resource Discovery does not admit transport '${lane.transport}'.`);
  }
  if (lane.versionLane === "minimum" && lane.version !== policy.minimumVersion) {
    throw new Error(
      `The minimum Resource Discovery lane must request exactly ${policy.minimumVersion}.`,
    );
  }
  if (lane.versionLane === "current-stable" && lane.version !== "stable") {
    throw new Error("The current-stable Resource Discovery lane must request stable.");
  }
}

function materializeCopyInput({ input, materializedFiles, sourceFixturesRoot, workspaceRoot }) {
  const fixtureRoot = resolve(sourceFixturesRoot, ...input.sourceFixture.split("/"));
  assertInside(sourceFixturesRoot, fixtureRoot);
  const fixtureRecord = lstatSync(fixtureRoot);
  if (!fixtureRecord.isDirectory() || fixtureRecord.isSymbolicLink()) {
    throw new Error(`Copy input source must be a non-symbolic directory: ${input.sourceFixture}`);
  }
  assertRealPathInside(sourceFixturesRoot, fixtureRoot);

  const relativeFiles = new Set();
  for (const include of input.include) {
    if (include.endsWith("/**")) {
      const includedRoot = resolve(fixtureRoot, ...include.slice(0, -3).split("/"));
      assertInside(fixtureRoot, includedRoot);
      collectRegularSourceFiles(fixtureRoot, includedRoot, relativeFiles);
    } else {
      const sourcePath = resolve(fixtureRoot, ...include.split("/"));
      requireRegularSourceFile(fixtureRoot, sourcePath, include);
      relativeFiles.add(include);
    }
  }
  for (const relativePath of [...relativeFiles].sort((left, right) => left.localeCompare(right))) {
    const sourcePath = resolve(fixtureRoot, ...relativePath.split("/"));
    const destinationRoot = input.destination === "."
      ? workspaceRoot
      : resolve(workspaceRoot, ...input.destination.split("/"));
    const destinationPath = resolve(destinationRoot, ...relativePath.split("/"));
    assertInside(workspaceRoot, destinationPath);
    registerMaterializedFile(workspaceRoot, destinationPath, materializedFiles);
    mkdirSync(dirname(destinationPath), { recursive: true });
    cpSync(sourcePath, destinationPath, {
      dereference: false,
      errorOnExist: true,
      force: false,
    });
  }
}

function validateCopyInputSource(input, sourceFixturesRoot) {
  const fixtureRoot = resolve(sourceFixturesRoot, ...input.sourceFixture.split("/"));
  assertInside(sourceFixturesRoot, fixtureRoot);
  const fixtureRecord = lstatSync(fixtureRoot);
  if (!fixtureRecord.isDirectory() || fixtureRecord.isSymbolicLink()) {
    throw new Error(`Copy input source must be a non-symbolic directory: ${input.sourceFixture}`);
  }
  assertRealPathInside(sourceFixturesRoot, fixtureRoot);
  for (const include of input.include) {
    if (include.endsWith("/**")) {
      const includedRoot = resolve(fixtureRoot, ...include.slice(0, -3).split("/"));
      assertInside(fixtureRoot, includedRoot);
      collectRegularSourceFiles(fixtureRoot, includedRoot, new Set());
    } else {
      const sourcePath = resolve(fixtureRoot, ...include.split("/"));
      requireRegularSourceFile(fixtureRoot, sourcePath, include);
    }
  }
}

function collectRegularSourceFiles(fixtureRoot, directory, files) {
  const directoryRecord = lstatSync(directory);
  if (!directoryRecord.isDirectory() || directoryRecord.isSymbolicLink()) {
    throw new Error(`Copy input subtree must be a non-symbolic directory: ${directory}`);
  }
  assertRealPathInside(fixtureRoot, directory);
  for (const entry of readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))) {
    const absolutePath = join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Copy input must not traverse a symbolic link: ${absolutePath}`);
    }
    if (entry.isDirectory()) {
      collectRegularSourceFiles(fixtureRoot, absolutePath, files);
    } else if (entry.isFile()) {
      const relativePath = relative(fixtureRoot, absolutePath).split(sep).join("/");
      requireSafeRelativePath(relativePath, "copy input source file", false);
      files.add(relativePath);
    } else {
      throw new Error(`Copy input contains an unsupported filesystem entry: ${absolutePath}`);
    }
  }
}

function requireRegularSourceFile(fixtureRoot, sourcePath, relativePath) {
  const sourceRecord = lstatSync(sourcePath);
  if (!sourceRecord.isFile() || sourceRecord.isSymbolicLink()) {
    throw new Error(`Copy input must name a non-symbolic regular file: ${relativePath}`);
  }
  assertRealPathInside(fixtureRoot, sourcePath);
}

function writeGeneratedFile({ content, destination, materializedFiles, relativePath, workspaceRoot }) {
  requireSafeRelativePath(relativePath, "generated input relative path", false);
  if (typeof content !== "string" && !Buffer.isBuffer(content)) {
    throw new Error(`Generated input '${relativePath}' must be a string or Buffer.`);
  }
  const destinationRoot = resolve(workspaceRoot, ...destination.split("/"));
  const filePath = resolve(destinationRoot, ...relativePath.split("/"));
  assertInside(workspaceRoot, filePath);
  registerMaterializedFile(workspaceRoot, filePath, materializedFiles);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, { flag: "wx" });
}

function registerMaterializedFile(workspaceRoot, filePath, materializedFiles) {
  const relativePath = relative(workspaceRoot, filePath).split(sep).join("/");
  requireSafeRelativePath(relativePath, "materialized fixture file", false);
  if (materializedFiles.has(relativePath)) {
    throw new Error(`Resource Discovery fixture writes '${relativePath}' more than once.`);
  }
  materializedFiles.set(relativePath, filePath);
}

function materializePackageLink({ destination, relativePath, target, workspaceRoot }) {
  requireSafeRelativePath(relativePath, "generated package link", false);
  if (!isAbsolute(target)) throw new Error(`Generated package link target must be absolute: ${target}`);
  const destinationRoot = resolve(workspaceRoot, ...destination.split("/"));
  const linkPath = resolve(destinationRoot, ...relativePath.split("/"));
  assertInside(workspaceRoot, linkPath);
  mkdirSync(dirname(linkPath), { recursive: true });
  linkDirectoryExactly(target, linkPath);
  const packageManifest = join(realpathSync(target), "package.json");
  const packageManifestBytes = readBoundedRegularFile(
    packageManifest,
    2 * 1024 * 1024,
    `linked package manifest for ${relativePath}`,
  );
  return {
    relativePath: relative(workspaceRoot, linkPath).split(sep).join("/"),
    target: normalize(resolve(target)),
    realPath: normalize(realpathSync(linkPath)),
    kind: process.platform === "win32" ? "junction" : "directory-symbolic-link",
    packageManifestSha256: sha256(packageManifestBytes),
  };
}

function semanticWorkspaceDescriptor(manifest, workspaceRoot, versionLane) {
  const normalizedWorkspaceRoot = normalize(resolve(workspaceRoot));
  const inactiveGeneratedRoots = manifest.generatedInputs
    .filter((input) => !input.lanes.includes(versionLane))
    .map((input) => normalize(resolve(workspaceRoot, ...input.destination.split("/"))));
  return {
    schemaVersion: "semantic-workspace/1",
    workspaceRoot: normalizedWorkspaceRoot,
    excludedWorkspaceRoots: [],
    projectTopology: {
      kind: "explicit",
      projects: manifest.projects.map((project) => {
        const rootDir = project.relativeRoot === "."
          ? normalizedWorkspaceRoot
          : normalize(resolve(workspaceRoot, ...project.relativeRoot.split("/")));
        assertInside(normalizedWorkspaceRoot, rootDir);
        const rootRecord = lstatSync(rootDir);
        if (!rootRecord.isDirectory() || rootRecord.isSymbolicLink()) {
          throw new Error(`Project '${project.projectKey}' root is not a materialized directory.`);
        }
        assertRealPathInside(normalizedWorkspaceRoot, rootDir);
        const sourceInput = project.sourceInput === "supplied"
          ? {
              kind: "supplied",
              files: project.relativeFiles
                .filter((relativePath) => {
                  const sourcePath = normalize(resolve(rootDir, ...relativePath.split("/")));
                  return !inactiveGeneratedRoots.some((generatedRoot) => (
                    pathIsInsideOrEqual(generatedRoot, sourcePath)
                  ));
                })
                .map((relativePath) => {
                  const sourcePath = normalize(resolve(rootDir, ...relativePath.split("/")));
                  assertInside(rootDir, sourcePath);
                  const source = lstatSync(sourcePath);
                  if (!source.isFile() || source.isSymbolicLink()) {
                    throw new Error(
                      `Project '${project.projectKey}' source is not a materialized regular file: ${relativePath}`,
                    );
                  }
                  assertRealPathInside(normalizedWorkspaceRoot, sourcePath);
                  return { path: sourcePath, language: null, role: null, note: null };
                }),
            }
          : {
              kind: "discover",
              options: {
                extensions: project.sourceDiscoveryOptions.extensions,
                excludedDirectories: null,
                maxFiles: project.sourceDiscoveryOptions.maxFiles,
              },
            };
        const excludedSourceRoots = project.excludedRelativeRoots.map((relativePath) => {
          const excludedRoot = normalize(resolve(rootDir, ...relativePath.split("/")));
          assertInside(rootDir, excludedRoot);
          return excludedRoot;
        });
        return {
          rootDir,
          projectKey: project.projectKey,
          sourceInput,
          excludedSourceRoots,
        };
      }),
    },
  };
}

function authenticateMaterializedWitnessSources(
  manifest,
  workspaceRoot,
  materializedFiles,
  versionLane,
) {
  const witnesses = manifest.witnesses;
  const readText = (relativePath, label) => {
    requireSafeRelativePath(relativePath, `${label}.relativePath`, false);
    if (!materializedFiles.has(relativePath)) {
      throw new Error(`${label} names a source that was not materialized: ${relativePath}`);
    }
    const filePath = resolve(workspaceRoot, ...relativePath.split("/"));
    assertInside(workspaceRoot, filePath);
    const bytes = readBoundedRegularFile(
      filePath,
      32 * 1024 * 1024,
      `${label} source`,
      workspaceRoot,
    );
    return { bytes, text: bytes.toString("utf8") };
  };
  const requireNameRange = (row, label, field = "publicName", expected = row.name) => {
    const { text } = readText(row.relativePath, label);
    requireTextRange(text, row[field], expected, `${label}.${field}`);
  };

  const ambiguity = witnesses.projectTemplateAmbiguity;
  const ambiguitySource = readText(ambiguity.relativePath, "projectTemplateAmbiguity");
  requireEqual(
    ambiguitySource.bytes.length,
    ambiguity.source.size,
    "projectTemplateAmbiguity source size",
  );
  requireHash(
    ambiguity.source.sha256,
    sha256(ambiguitySource.bytes),
    "projectTemplateAmbiguity source sha256",
  );
  requireEqual(
    ambiguitySource.text.slice(
      ambiguity.source.anchorOffset,
      ambiguity.source.anchorOffset + ambiguity.source.anchor.length,
    ),
    ambiguity.source.anchor,
    "projectTemplateAmbiguity source anchor",
  );
  const cursor = sourcePositionAt(
    ambiguitySource.text,
    ambiguity.source.anchorOffset + ambiguity.source.anchor.length,
    "projectTemplateAmbiguity source cursor",
  );
  requireEqual(cursor.line, ambiguity.source.cursor.line, "projectTemplateAmbiguity cursor.line");
  requireEqual(
    cursor.character,
    ambiguity.source.cursor.character,
    "projectTemplateAmbiguity cursor.character",
  );
  for (const [projectIndex, project] of ambiguity.projects.entries()) {
    for (const [scopeIndex, scope] of project.scopes.entries()) {
      requireRangeWithinText(
        ambiguitySource.text,
        scope.source,
        `projectTemplateAmbiguity.projects[${projectIndex}].scopes[${scopeIndex}].source`,
      );
    }
  }

  for (const [index, row] of witnesses.longSuffixDuplicates.rows.entries()) {
    requireNameRange(row, `longSuffixDuplicates.rows[${index}]`, "publicName", witnesses.longSuffixDuplicates.name);
  }
  for (const [index, row] of witnesses.localTemplateAndBindables.rows.entries()) {
    requireNameRange(row, `localTemplateAndBindables.rows[${index}]`);
  }
  for (const [collection, rows] of [
    ["sameKindRows", witnesses.aliasAndCrossKindCollisions.sameKindRows],
    ["crossKindRows", witnesses.aliasAndCrossKindCollisions.crossKindRows],
  ]) {
    for (const [index, row] of rows.entries()) {
      requireNameRange(row, `aliasAndCrossKindCollisions.${collection}[${index}]`);
    }
  }
  for (const [index, row] of witnesses.aliasAndCrossKindCollisions.aliases.entries()) {
    const { text } = readText(row.relativePath, `aliasAndCrossKindCollisions.aliases[${index}]`);
    requireTextRange(
      text,
      row.source,
      row.aliasName,
      `aliasAndCrossKindCollisions.aliases[${index}].source`,
    );
  }
  for (const [index, row] of witnesses.headerOnlyMetadata.rows.entries()) {
    const { text } = readText(row.relativePath, `headerOnlyMetadata.rows[${index}]`);
    requireRangeWithinText(text, row.declaration, `headerOnlyMetadata.rows[${index}].declaration`);
    requireRangeWithinText(text, row.implementation, `headerOnlyMetadata.rows[${index}].implementation`);
    if (text.slice(row.implementation.start, row.implementation.end).trim().length === 0) {
      throw new Error(`headerOnlyMetadata.rows[${index}].implementation must name authored text.`);
    }
  }

  requireEqual(
    witnesses.shiftedAndRemovedNavigation.shifted.identityKey,
    witnesses.longSuffixDuplicates.rows[0].identityKey,
    "shifted identity correlation",
  );
  requireEqual(
    witnesses.shiftedAndRemovedNavigation.removed.identityKey,
    witnesses.longSuffixDuplicates.rows[1].identityKey,
    "removed identity correlation",
  );
  const shifted = witnesses.shiftedAndRemovedNavigation.shifted;
  const shiftedSource = readText(shifted.relativePath, "shiftedAndRemovedNavigation.shifted");
  requireTextRange(
    shiftedSource.text,
    shifted.initialPublicName,
    witnesses.longSuffixDuplicates.name,
    "shiftedAndRemovedNavigation.shifted.initialPublicName",
  );
  const removedSource = readText(
    witnesses.shiftedAndRemovedNavigation.removed.relativePath,
    "shiftedAndRemovedNavigation.removed",
  );
  if (
    !removedSource.text.includes("@customElement({")
    || !removedSource.text.includes("name: 'duplicate-card'")
    || !removedSource.text.includes("export class RightLongSuffixDuplicateCard")
  ) {
    throw new Error("shiftedAndRemovedNavigation removed source omits its resource definition.");
  }
  if (witnesses.shiftedAndRemovedNavigation.removed.replacement.includes("@customElement")) {
    throw new Error("shiftedAndRemovedNavigation replacement must remove the resource definition.");
  }
  const availabilityRace = witnesses.shiftedAndRemovedNavigation.availabilityRace;
  const raceTemplate = readText(
    availabilityRace.template.relativePath,
    "shiftedAndRemovedNavigation.availabilityRace.template",
  );
  requireEqual(
    raceTemplate.bytes.length,
    availabilityRace.template.size,
    "shiftedAndRemovedNavigation.availabilityRace.template.size",
  );
  requireHash(
    availabilityRace.template.sha256,
    sha256(raceTemplate.bytes),
    "shiftedAndRemovedNavigation.availabilityRace.template.sha256",
  );
  requireEqual(
    raceTemplate.text.slice(
      availabilityRace.template.anchorOffset,
      availabilityRace.template.anchorOffset + availabilityRace.template.anchor.length,
    ),
    availabilityRace.template.anchor,
    "shiftedAndRemovedNavigation.availabilityRace.template.anchor",
  );
  const raceCursor = sourcePositionAt(
    raceTemplate.text,
    availabilityRace.template.anchorOffset + availabilityRace.template.anchor.length,
    "shiftedAndRemovedNavigation.availabilityRace.template.cursor",
  );
  requireEqual(
    raceCursor.line,
    availabilityRace.template.cursor.line,
    "shiftedAndRemovedNavigation.availabilityRace.template.cursor.line",
  );
  requireEqual(
    raceCursor.character,
    availabilityRace.template.cursor.character,
    "shiftedAndRemovedNavigation.availabilityRace.template.cursor.character",
  );
  requireRangeWithinText(
    raceTemplate.text,
    availabilityRace.baseline.templateSource,
    "shiftedAndRemovedNavigation.availabilityRace.baseline.templateSource",
  );
  const scopeEdit = availabilityRace.scopeEdit;
  const editOccurrences = raceTemplate.text.split(scopeEdit.before).length - 1;
  requireEqual(
    editOccurrences,
    1,
    "shiftedAndRemovedNavigation.availabilityRace.scopeEdit.before occurrence count",
  );
  const editedText = raceTemplate.text.replace(scopeEdit.before, scopeEdit.after);
  const editedBytes = Buffer.from(editedText, "utf8");
  requireEqual(
    editedBytes.length,
    scopeEdit.editedSize,
    "shiftedAndRemovedNavigation.availabilityRace.scopeEdit.editedSize",
  );
  requireHash(
    scopeEdit.editedSha256,
    sha256(editedBytes),
    "shiftedAndRemovedNavigation.availabilityRace.scopeEdit.editedSha256",
  );
  if (!editedText.includes(scopeEdit.keptGlobalRegistration)) {
    throw new Error("shiftedAndRemovedNavigation availability edit removes the pinned global registration.");
  }
  requireRangeWithinText(
    editedText,
    scopeEdit.expectedAvailability.templateSource,
    "shiftedAndRemovedNavigation.availabilityRace.scopeEdit.expectedAvailability.templateSource",
  );
  for (const [requestName, request, sourceText] of [
    ["scopeEdit.retiredBaselineScopeReproof", scopeEdit.retiredBaselineScopeReproof, editedText],
    ["scopeEdit.restartWithoutSelection", scopeEdit.restartWithoutSelection, editedText],
    [
      "afterRemoval.retiredRightOnlyScopeReproof",
      availabilityRace.afterRemoval.retiredRightOnlyScopeReproof,
      editedText,
    ],
    ["afterRemoval.restartWithoutSelection", availabilityRace.afterRemoval.restartWithoutSelection, editedText],
  ]) {
    for (const [candidateIndex, candidate] of request.response.candidates.entries()) {
      requireRangeWithinText(
        sourceText,
        candidate.source,
        `shiftedAndRemovedNavigation.availabilityRace.${requestName}.response.candidates[${candidateIndex}].source`,
      );
    }
    if (request.response.selectedTemplate != null) {
      requireRangeWithinText(
        sourceText,
        request.response.selectedTemplate.source,
        `shiftedAndRemovedNavigation.availabilityRace.${requestName}.response.selectedTemplate.source`,
      );
    }
  }

  const guardrail = witnesses.guardrail;
  requireNameRange(guardrail.appRow, "guardrail.appRow");
  readText(guardrail.excludedDefinitionRelativePath, "guardrail.excludedDefinitionRelativePath");
  const guardrailExcluded = readText(
    guardrail.excludedDefinitionRelativePath,
    "guardrail.excludedDefinitionRelativePath",
  ).text;
  if (!guardrailExcluded.includes(`name: '${guardrail.excludedDefinitionName}'`)) {
    throw new Error("guardrail excluded source omits its authenticated sentinel definition.");
  }
  const openCoverage = witnesses.openCoverage;
  requireNameRange(openCoverage.appRow, "openCoverage.appRow");
  const openSource = readText(openCoverage.appRow.relativePath, "openCoverage.appRow").text;
  if (!openSource.includes(`import '${openCoverage.unresolvedModuleSpecifier}';`)) {
    throw new Error("openCoverage source does not preserve its unresolved module witness.");
  }

  if (versionLane === "current-stable") {
    for (const [index, row] of witnesses.packageOrigins.rows.entries()) {
      requireNameRange(row, `packageOrigins.rows[${index}]`);
      const { text } = readText(row.relativePath, `packageOrigins.rows[${index}]`);
      requireRangeWithinText(text, row.implementation, `packageOrigins.rows[${index}].implementation`);
    }
    for (const field of ["first", "last"]) {
      const row = witnesses.pageDrain[field];
      requireNameRange(row, `pageDrain.${field}`);
    }
  }
}

function requireRangeWithinText(text, range, label) {
  if (range.start < 0 || range.end <= range.start || range.end > text.length) {
    throw new Error(`${label} is outside the authenticated source bytes.`);
  }
}

function requireTextRange(text, range, expected, label) {
  requireRangeWithinText(text, range, label);
  requireEqual(text.slice(range.start, range.end), expected, label);
}

function sourcePositionAt(text, offset, label) {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > text.length) {
    throw new Error(`${label} offset is outside the authenticated source.`);
  }
  const prefix = text.slice(0, offset);
  const lines = prefix.split("\n");
  return { line: lines.length - 1, character: lines.at(-1).replace(/\r$/u, "").length };
}

export function authenticateProductSupportReport({
  plan,
  resolvedVersion,
  staticContractSha256,
  workspace,
  manifestValidator = validateSourceFixtureManifest,
  factsValidator = validateFactsReceipt,
}) {
  if (!sha256Pattern.test(staticContractSha256 ?? "")) {
    throw new Error("The Extension Host static contract hash is missing or malformed.");
  }
  const fixtureManifestPath = requiredWorkspaceEvidencePath(
    workspace,
    "resourceDiscoveryFixtureManifest",
  );
  const sourceManifestPath = requiredWorkspaceEvidencePath(
    workspace,
    "resourceDiscoverySourceManifest",
  );
  const descriptorPath = requiredWorkspaceEvidencePath(
    workspace,
    "resourceDiscoveryDescriptor",
  );
  const ledgerPath = requiredWorkspaceEvidencePath(workspace, "resourceDiscoveryLedger");
  const reportPath = requiredWorkspaceEvidencePath(workspace, "resourceDiscoveryReport");
  const workspaceRoot = requiredWorkspaceEvidencePath(workspace, "routedAureliaWorkspace");
  const workspaceFile = lstatSync(workspaceRoot);
  if (!workspaceFile.isDirectory() || workspaceFile.isSymbolicLink()) {
    throw new Error("Product-support workspace root must be a non-symbolic directory.");
  }
  for (const evidencePath of [fixtureManifestPath, descriptorPath, ledgerPath, reportPath]) {
    assertInside(workspaceRoot, evidencePath);
    assertRealPathInside(workspaceRoot, evidencePath);
  }

  const fixtureBytes = readBoundedRegularFile(
    fixtureManifestPath,
    16 * 1024 * 1024,
    "rendered Resource Discovery fixture manifest",
    workspaceRoot,
  );
  const sourceManifestBytes = readBoundedRegularFile(
    sourceManifestPath,
    8 * 1024 * 1024,
    "committed Resource Discovery fixture manifest",
  );
  const descriptorBytes = readBoundedRegularFile(
    descriptorPath,
    4 * 1024 * 1024,
    "Resource Discovery semantic workspace descriptor",
    workspaceRoot,
  );
  const ledgerBytes = readBoundedRegularFile(
    ledgerPath,
    resourceDiscoveryObservationLedgerMaxBytes,
    "Resource Discovery observation ledger",
    workspaceRoot,
  );
  const reportBytes = readBoundedRegularFile(
    reportPath,
    4 * 1024 * 1024,
    "Resource Discovery acceptance report",
    workspaceRoot,
  );
  const fixture = parseJsonObject(fixtureBytes, "rendered Resource Discovery fixture manifest");
  const sourceFixture = parseJsonObject(
    sourceManifestBytes,
    "committed Resource Discovery fixture manifest",
  );
  const report = parseJsonObject(reportBytes, "Resource Discovery acceptance report");
  requireHash(
    sha256(sourceManifestBytes),
    requiredWorkspaceHash(workspace, "resourceDiscoverySourceManifestSha256"),
    "pre-launch source manifest sha256",
  );
  requireHash(
    sha256(fixtureBytes),
    requiredWorkspaceHash(workspace, "resourceDiscoveryFixtureSha256"),
    "pre-launch rendered fixture sha256",
  );
  requireHash(
    sha256(descriptorBytes),
    requiredWorkspaceHash(workspace, "resourceDiscoveryDescriptorSha256"),
    "pre-launch descriptor sha256",
  );

  exactKeys(report, [
    "schemaVersion",
    "requestedVersion",
    "versionLane",
    "resolvedVersion",
    "actualVersion",
    "transport",
    "authoritative",
    "platform",
    "arch",
    "staticContractSha256",
    "fixture",
    "ledger",
    "journeys",
    "facts",
    "result",
  ], "Resource Discovery acceptance report");
  requireEqual(
    report.schemaVersion,
    "aurelia-resource-discovery-host-acceptance/1",
    "acceptance report schemaVersion",
  );
  requireEqual(report.requestedVersion, plan.version, "acceptance report requestedVersion");
  requireEqual(report.versionLane, plan.versionLane, "acceptance report versionLane");
  requireEqual(report.resolvedVersion, resolvedVersion, "acceptance report resolvedVersion");
  requireEqual(report.actualVersion, resolvedVersion, "acceptance report actualVersion");
  requireEqual(report.transport, plan.transport, "acceptance report transport");
  requireEqual(
    report.authoritative,
    plan.transport === "worker",
    "acceptance report authoritative",
  );
  requireEqual(report.platform, process.platform, "acceptance report platform");
  requireEqual(report.arch, process.arch, "acceptance report arch");
  requireEqual(
    report.staticContractSha256,
    staticContractSha256,
    "acceptance report staticContractSha256",
  );
  requireEqual(report.result, "passed", "acceptance report result");

  const fixtureReceipt = exactObject(report.fixture, [
    "path",
    "sha256",
    "descriptorSha256",
  ], "acceptance report fixture receipt");
  requireSamePath(fixtureReceipt.path, fixtureManifestPath, "fixture receipt path");
  requireHash(fixtureReceipt.sha256, sha256(fixtureBytes), "fixture receipt sha256");
  const descriptorSha256 = sha256(descriptorBytes);
  requireHash(
    fixtureReceipt.descriptorSha256,
    descriptorSha256,
    "fixture receipt descriptorSha256",
  );
  requireEqual(
    fixture.schemaVersion,
    "aurelia-resource-discovery-host-fixture-rendered/1",
    "rendered fixture schemaVersion",
  );
  manifestValidator(sourceFixture);
  requireHash(
    fixture.sourceManifestSha256,
    sha256(sourceManifestBytes),
    "rendered fixture sourceManifestSha256",
  );
  validateRenderedManifestPreservation(sourceFixture, fixture);
  authenticateRenderedCorpus(fixture, workspaceRoot);
  requireEqual(fixture.lane, plan.versionLane, "rendered fixture lane");
  requireEqual(fixture.transport, plan.transport, "rendered fixture transport");
  requireSamePath(fixture.workspaceRoot, workspaceRoot, "rendered fixture workspaceRoot");
  requireEqual(
    fixture.descriptorRelativePath,
    productSupportEvidenceNames.descriptor,
    "rendered fixture descriptorRelativePath",
  );
  requireHash(fixture.descriptorSha256, descriptorSha256, "rendered fixture descriptorSha256");

  const ledgerReceipt = exactObject(report.ledger, [
    "path",
    "sha256",
    "eventCount",
  ], "acceptance report ledger receipt");
  requireSamePath(ledgerReceipt.path, ledgerPath, "ledger receipt path");
  requireHash(ledgerReceipt.sha256, sha256(ledgerBytes), "ledger receipt sha256");
  const ledgerRecords = validateObservationLedger(ledgerBytes);
  const ledgerEventCount = ledgerRecords.length;
  requireEqual(ledgerReceipt.eventCount, ledgerEventCount, "ledger receipt eventCount");

  validateJourneyReceipts(report.journeys, fixture, plan.versionLane);
  factsValidator(report.facts, ledgerRecords, fixture, plan.versionLane, workspaceRoot);

  return Object.freeze({
    reportPath,
    ledgerEventCount,
    fixtureSha256: fixtureReceipt.sha256,
    descriptorSha256,
    staticContractSha256,
  });
}

function requiredWorkspaceEvidencePath(workspace, property) {
  const value = workspace[property];
  if (typeof value !== "string" || value.length === 0 || !isAbsolute(value)) {
    throw new Error(`Product-support workspace ${property} must be an absolute path.`);
  }
  return normalize(value);
}

function requiredWorkspaceHash(workspace, property) {
  const value = workspace[property];
  if (typeof value !== "string" || !sha256Pattern.test(value)) {
    throw new Error(`Product-support workspace ${property} must be a lowercase SHA-256 hash.`);
  }
  return value;
}

export function readBoundedRegularFile(filePath, maxBytes, label, containmentRoot = null) {
  let pathRecord;
  try {
    pathRecord = lstatSync(filePath);
  } catch (error) {
    throw new Error(`${label} is missing or unreadable: ${filePath}`, { cause: error });
  }
  if (!pathRecord.isFile() || pathRecord.isSymbolicLink()) {
    throw new Error(`${label} must be a non-symbolic regular file.`);
  }
  if (containmentRoot != null) {
    assertNoSymbolicPathComponents(containmentRoot, filePath, false, label);
    assertRealPathInside(containmentRoot, filePath);
  }
  let handle;
  try {
    handle = openSync(filePath, "r");
  } catch (error) {
    throw new Error(`${label} is missing or unreadable: ${filePath}`, { cause: error });
  }
  try {
    const file = fstatSync(handle);
    if (!file.isFile() || file.size <= 0 || file.size > maxBytes) {
      throw new Error(`${label} must be a nonempty regular file no larger than ${maxBytes} bytes.`);
    }
    const bytes = readFileSync(handle);
    if (bytes.length !== file.size) {
      throw new Error(`${label} changed while it was being authenticated.`);
    }
    return bytes;
  } finally {
    closeSync(handle);
  }
}

function assertRealPathInside(parent, child) {
  let realParent;
  let realChild;
  try {
    realParent = realpathSync(parent);
    realChild = realpathSync(child);
  } catch (error) {
    throw new Error(`Unable to resolve evidence containment for ${child}.`, { cause: error });
  }
  assertInside(realParent, realChild);
}

function assertNoSymbolicPathComponents(parent, child, allowSymbolicLeaf, label) {
  const parentPath = resolve(parent);
  const childPath = resolve(child);
  assertInside(parentPath, childPath);
  const containmentRoot = lstatSync(parentPath);
  if (!containmentRoot.isDirectory() || containmentRoot.isSymbolicLink()) {
    throw new Error(`${label} containment root must be a non-symbolic directory.`);
  }
  const relativePath = relative(parentPath, childPath);
  if (relativePath === "") {
    return;
  }
  const segments = relativePath.split(sep);
  let current = parentPath;
  for (const [index, segment] of segments.entries()) {
    current = join(current, segment);
    const record = lstatSync(current);
    const leaf = index === segments.length - 1;
    if (record.isSymbolicLink() && !(leaf && allowSymbolicLeaf)) {
      throw new Error(`${label} has a symbolic ancestor: ${current}`);
    }
    if (!leaf && !record.isDirectory()) {
      throw new Error(`${label} has a non-directory ancestor: ${current}`);
    }
  }
}

function parseJsonObject(bytes, label) {
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error(`${label} is not valid JSON.`, { cause: error });
  }
  return exactObject(value, null, label);
}

function exactObject(value, keys, label) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  if (keys != null) exactKeys(value, keys, label);
  return value;
}

function exactKeys(value, keys, label) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${label} fields must be exactly ${expected.join(", ")}; received ${actual.join(", ")}.`,
    );
  }
}

function requireEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} must be ${JSON.stringify(expected)}; received ${JSON.stringify(actual)}.`);
  }
}

function requireSamePath(actual, expected, label) {
  if (typeof actual !== "string" || !isAbsolute(actual) || !sameHostPath(actual, expected)) {
    throw new Error(`${label} must resolve exactly to ${expected}; received ${String(actual)}.`);
  }
}

function requireHash(actual, expected, label) {
  if (typeof actual !== "string" || !sha256Pattern.test(actual) || actual !== expected) {
    throw new Error(`${label} does not authenticate the expected bytes.`);
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sameHostPath(left, right) {
  const normalizeIdentity = (value) => {
    const normalized = normalize(resolve(value));
    return process.platform === "win32" ? normalized.toLowerCase() : normalized;
  };
  return normalizeIdentity(left) === normalizeIdentity(right);
}

export function fileUriMatchesHostPath(uri, expectedPath) {
  if (
    typeof uri !== "string"
    || typeof expectedPath !== "string"
    || !isAbsolute(expectedPath)
  ) {
    return false;
  }
  try {
    const url = new URL(uri);
    if (
      url.protocol !== "file:"
      || url.username !== ""
      || url.password !== ""
      || url.port !== ""
      || url.search !== ""
      || url.hash !== ""
    ) {
      return false;
    }
    return sameHostPath(fileURLToPath(url), expectedPath);
  } catch {
    return false;
  }
}

function fileWorkspaceKeyMatches(workspaceKey, expectedPath) {
  try {
    const url = new URL(workspaceKey);
    return url.protocol === "file:" && sameHostPath(fileURLToPath(url), expectedPath);
  } catch {
    return false;
  }
}

export function validateObservationLedger(bytes) {
  const text = bytes.toString("utf8");
  if (text.charCodeAt(0) === 0xfeff) {
    throw new Error("Resource Discovery observation ledger must not contain a byte-order mark.");
  }
  const lines = text.endsWith("\n") ? text.slice(0, -1).split(/\r?\n/u) : text.split(/\r?\n/u);
  if (lines.length === 0 || lines.some((line) => line.length === 0)) {
    throw new Error("Resource Discovery observation ledger must contain nonempty JSONL rows.");
  }
  const records = [];
  for (const [index, line] of lines.entries()) {
    let event;
    try {
      event = JSON.parse(line);
    } catch (error) {
      throw new Error(`Observation ledger row ${index + 1} is not valid JSON.`, { cause: error });
    }
    const record = exactObject(event, null, `observation ledger row ${index + 1}`);
    for (const field of ["source", "observationId", "phase"]) {
      if (typeof record[field] !== "string" || record[field].length === 0) {
        throw new Error(`Observation ledger row ${index + 1} has an invalid ${field}.`);
      }
    }
    for (const [key, value] of Object.entries(record)) {
      if (value !== null && !["string", "number", "boolean"].includes(typeof value)) {
        throw new Error(`Observation ledger row ${index + 1} field ${key} is not primitive.`);
      }
      if (typeof value === "number" && !Number.isFinite(value)) {
        throw new Error(`Observation ledger row ${index + 1} field ${key} is not finite.`);
      }
    }
    records.push(Object.freeze({ eventOrdinal: index + 1, event: Object.freeze(record) }));
  }
  return Object.freeze(records);
}

function validateJourneyReceipts(value, fixture, versionLane) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Acceptance report journeys must be a nonempty array.");
  }
  const journeyIds = new Set();
  for (const [index, journey] of value.entries()) {
    const receipt = exactObject(journey, ["id", "status"], `journeys[${index}]`);
    if (typeof receipt.id !== "string" || receipt.id.length === 0 || journeyIds.has(receipt.id)) {
      throw new Error(`journeys[${index}].id must be nonempty and unique.`);
    }
    requireEqual(receipt.status, "passed", `journeys[${index}].status`);
    journeyIds.add(receipt.id);
  }
  const requiredIds = requiredJourneyIds(fixture.lanePolicy, versionLane);
  const requiredIdSet = new Set(requiredIds);
  for (const journeyId of journeyIds) {
    if (!requiredIdSet.has(journeyId)) {
      throw new Error(`Acceptance report contains unknown journey '${journeyId}'.`);
    }
  }
  for (const requiredId of requiredIds) {
    if (!journeyIds.has(requiredId)) {
      throw new Error(`Acceptance report is missing required journey '${requiredId}'.`);
    }
  }
}

function requiredJourneyIds(lanePolicy, versionLane) {
  validateLanePolicy(lanePolicy);
  const ids = resourceDiscoveryRequiredJourneyIds[versionLane];
  if (ids == null) throw new Error(`No Resource Discovery journey set exists for ${versionLane}.`);
  return ids;
}

export function validateFactsReceipt(value, ledgerRecords, fixture, versionLane, workspaceRoot) {
  const facts = exactObject(value, [
    "tree",
    "quickPick",
    "recovery",
    "output",
    "navigation",
    "cancellation",
  ], "acceptance report facts");
  const context = {
    ledgerRecords,
    fixture,
    versionLane,
    workspaceRoot,
    referencedOrdinals: new Set(),
    claims: new Set(),
    baseline: null,
    openCoverageAvailability: null,
    recovery: new Map(),
  };
  validateTreeFacts(facts.tree, context);
  validateQuickPickFacts(facts.quickPick, context);
  validateRecoveryFacts(facts.recovery, context);
  validateOutputFacts(facts.output, context);
  validateNavigationFacts(facts.navigation, context);
  validateCancellationFacts(facts.cancellation, context);
  validateFactConservation(context);
}

function exactLaneFactObject(value, label, versionLane, commonKeys, currentOnlyKeys) {
  if (versionLane !== "minimum" && versionLane !== "current-stable") {
    throw new Error(`${label} has no schema for lane '${versionLane}'.`);
  }
  return exactObject(
    value,
    versionLane === "current-stable"
      ? [...commonKeys, ...currentOnlyKeys]
      : commonKeys,
    label,
  );
}

export function resolveLedgerReference(value, label, context, expectedSource, expectedPhase) {
  const reference = exactObject(value, ["eventOrdinal", "observationId", "phase"], label);
  requirePositiveInteger(reference.eventOrdinal, `${label}.eventOrdinal`);
  requireNonemptyString(reference.observationId, `${label}.observationId`);
  requireNonemptyString(reference.phase, `${label}.phase`);
  const record = context.ledgerRecords[reference.eventOrdinal - 1];
  if (record == null || record.eventOrdinal !== reference.eventOrdinal) {
    throw new Error(`${label}.eventOrdinal does not resolve to a ledger event.`);
  }
  if (context.referencedOrdinals.has(reference.eventOrdinal)) {
    throw new Error(`${label} duplicates ledger eventOrdinal ${reference.eventOrdinal}.`);
  }
  const sources = Array.isArray(expectedSource) ? expectedSource : [expectedSource];
  if (!sources.includes(record.event.source)) {
    throw new Error(`${label} must reference source ${sources.join(" or ")}; received ${record.event.source}.`);
  }
  requireEqual(record.event.phase, expectedPhase, `${label}.phase event`);
  requireEqual(reference.phase, expectedPhase, `${label}.phase receipt`);
  requireEqual(reference.observationId, record.event.observationId, `${label}.observationId`);
  context.referencedOrdinals.add(reference.eventOrdinal);
  return record;
}

function requirePositiveInteger(value, label) {
  return requireNonNegativeInteger(value, label, true);
}

function requireStrictOrdinalOrder(records, label) {
  for (let index = 1; index < records.length; index += 1) {
    if (records[index - 1].eventOrdinal >= records[index].eventOrdinal) {
      throw new Error(`${label} ledger references must be in strict event order.`);
    }
  }
}

function requireRowState(event, state, label) {
  requireNonemptyString(event.rowStates, `${label}.rowStates`);
  const states = event.rowStates.split("|");
  if (!states.includes(state)) {
    throw new Error(`${label}.rowStates must include '${state}'.`);
  }
}

export function predecessorRaceFact(value, label = "predecessor race") {
  return exactObject(value, [
    "pendingInvalidated",
    "blocked",
    "pendingTreePublicationCount",
    "pendingViewStateCount",
    "invalidated",
    "cancelled",
    "discarded",
    "successorPublished",
    "predecessorGeneration",
    "successorGeneration",
    "predecessorFingerprint",
    "successorFingerprint",
    "latePredecessorPublishCount",
  ], label);
}

export function resolvePredecessorPendingEvidence(race, context, label = "predecessor race") {
  const pendingInvalidated = resolveLedgerReference(
    race.pendingInvalidated,
    `${label}.pendingInvalidated`,
    context,
    "resource-explorer-view",
    "invalidation",
  );
  const blocked = resolveLedgerReference(
    race.blocked,
    `${label}.blocked`,
    context,
    "resource-discovery-host-control",
    "blocked",
  );
  const invalidated = resolveLedgerReference(
    race.invalidated,
    `${label}.invalidated`,
    context,
    "resource-explorer-view",
    "invalidation",
  );
  requireEqual(pendingInvalidated.event.scope, "workspace", `${label}.pendingInvalidated.scope`);
  requireEqual(
    pendingInvalidated.event.workspaceKey,
    blocked.event.workspaceKey,
    `${label}.pendingInvalidated workspace`,
  );
  requireEqual(invalidated.event.scope, "workspace", `${label}.invalidated.scope`);
  requireEqual(invalidated.event.workspaceKey, blocked.event.workspaceKey, `${label} invalidated workspace`);
  requireStrictOrdinalOrder([pendingInvalidated, blocked, invalidated], label);
  const pendingSlice = context.ledgerRecords.filter((record) => (
    record.eventOrdinal > pendingInvalidated.eventOrdinal
      && record.eventOrdinal < blocked.eventOrdinal
  ));
  const pendingTreePublications = pendingSlice.filter((record) => (
    record.event.source === "resource-explorer"
      && ["publish-start", "publish-node", "publish-complete"].includes(record.event.phase)
  ));
  requireEqual(
    pendingTreePublications.length,
    race.pendingTreePublicationCount,
    `${label} pending tree publication count`,
  );
  requireEqual(race.pendingTreePublicationCount, 0, `${label}.pendingTreePublicationCount`);
  const pendingViewStates = pendingSlice.filter((record) => (
    record.event.source === "resource-explorer"
      && record.event.phase === "view-state"
  ));
  requireEqual(
    pendingViewStates.length,
    race.pendingViewStateCount,
    `${label} pending view-state count`,
  );
  requireEqual(race.pendingViewStateCount, 0, `${label}.pendingViewStateCount`);
  return Object.freeze({
    pendingInvalidated,
    blocked,
    invalidated,
  });
}

function validateTreeFacts(value, context) {
  const label = "acceptance report facts.tree";
  const tree = exactLaneFactObject(value, label, context.versionLane, [
    "baseline",
    "lifecycle",
    "predecessorRace",
    "unrelatedStability",
    "headerOnlyPublished",
    "openCoverage",
    "guardrail",
  ], ["pageDrain"]);
  validateBaselineTreeFacts(tree.baseline, context, `${label}.baseline`);
  validateLifecycleTreeFacts(tree.lifecycle, context, `${label}.lifecycle`);
  const race = predecessorRaceFact(tree.predecessorRace, `${label}.predecessorRace`);
  const {
    pendingInvalidated,
    blocked,
    invalidated,
  } = resolvePredecessorPendingEvidence(race, context, `${label}.predecessorRace`);
  const cancelled = resolveLedgerReference(
    race.cancelled,
    `${label}.predecessorRace.cancelled`,
    context,
    "resource-discovery-host-control",
    "cancelled",
  );
  const discarded = resolveLedgerReference(
    race.discarded,
    `${label}.predecessorRace.discarded`,
    context,
    "resource-explorer",
    "discarded",
  );
  const successor = resolveLedgerReference(
    race.successorPublished,
    `${label}.predecessorRace.successorPublished`,
    context,
    "resource-explorer",
    "publish-complete",
  );
  requirePositiveInteger(race.predecessorGeneration, `${label}.predecessorRace.predecessorGeneration`);
  requirePositiveInteger(race.successorGeneration, `${label}.predecessorRace.successorGeneration`);
  if (race.successorGeneration <= race.predecessorGeneration) {
    throw new Error(`${label}.predecessorRace successor generation must be newer.`);
  }
  requireNonemptyString(race.predecessorFingerprint, `${label}.predecessorRace.predecessorFingerprint`);
  requireNonemptyString(race.successorFingerprint, `${label}.predecessorRace.successorFingerprint`);
  if (race.successorFingerprint === race.predecessorFingerprint) {
    throw new Error(`${label}.predecessorRace successor fingerprint must change.`);
  }
  requireEqual(race.latePredecessorPublishCount, 0, `${label}.predecessorRace.latePredecessorPublishCount`);
  requireEqual(blocked.event.responseFingerprint, race.predecessorFingerprint, `${label}.predecessorRace.blocked.responseFingerprint`);
  requireEqual(blocked.event.operation, "inventory", `${label}.predecessorRace.blocked.operation`);
  requireEqual(blocked.event.stage, "after-response", `${label}.predecessorRace.blocked.stage`);
  requireEqual(blocked.event.includeTypeSurfaces, false, `${label}.predecessorRace.blocked.includeTypeSurfaces`);
  requireEqual(cancelled.event.observationId, blocked.event.observationId, `${label}.predecessorRace control id`);
  requireEqual(cancelled.event.requestOrdinal, blocked.event.requestOrdinal, `${label}.predecessorRace request ordinal`);
  requireEqual(discarded.event.reason, "superseded", `${label}.predecessorRace.discarded.reason`);
  requireEqual(discarded.event.generation, race.predecessorGeneration, `${label}.predecessorRace.discarded.generation`);
  requireEqual(discarded.event.fingerprint, null, `${label}.predecessorRace.discarded.fingerprint`);
  requirePositiveInteger(discarded.event.currentGeneration, `${label}.predecessorRace.discarded.currentGeneration`);
  requireEqual(successor.event.generation, race.successorGeneration, `${label}.predecessorRace.successor.generation`);
  requireEqual(successor.event.fingerprint, race.successorFingerprint, `${label}.predecessorRace.successor.fingerprint`);
  requireEqual(successor.event.publicationKind, "current", `${label}.predecessorRace.successor.publicationKind`);
  requireStrictOrdinalOrder(
    [pendingInvalidated, blocked, invalidated, cancelled, discarded, successor],
    `${label}.predecessorRace`,
  );
  const latePredecessorPublishes = context.ledgerRecords.filter((record) => (
    record.eventOrdinal > invalidated.eventOrdinal
      && record.event.source === "resource-explorer"
      && record.event.phase === "publish-complete"
      && record.event.fingerprint === race.predecessorFingerprint
  )).length;
  requireEqual(
    latePredecessorPublishes,
    race.latePredecessorPublishCount,
    `${label}.predecessorRace computed late predecessor publishes`,
  );
  context.claims.add("stable-pending");
  context.claims.add("latest-wins");

  const unrelated = exactObject(tree.unrelatedStability, [
    "before",
    "after",
    "nodeId",
    "navigationFingerprint",
    "changedFieldCount",
  ], `${label}.unrelatedStability`);
  const before = resolveLedgerReference(
    unrelated.before,
    `${label}.unrelatedStability.before`,
    context,
    "resource-explorer",
    "publish-node",
  );
  const after = resolveLedgerReference(
    unrelated.after,
    `${label}.unrelatedStability.after`,
    context,
    "resource-explorer",
    "publish-node",
  );
  requireNonemptyString(unrelated.nodeId, `${label}.unrelatedStability.nodeId`);
  requireNonemptyString(
    unrelated.navigationFingerprint,
    `${label}.unrelatedStability.navigationFingerprint`,
  );
  requireEqual(unrelated.changedFieldCount, 0, `${label}.unrelatedStability.changedFieldCount`);
  requireEqual(before.event.nodeId, unrelated.nodeId, `${label}.unrelatedStability.before.nodeId`);
  requireEqual(after.event.nodeId, unrelated.nodeId, `${label}.unrelatedStability.after.nodeId`);
  requireEqual(
    before.event.navigationFingerprint,
    unrelated.navigationFingerprint,
    `${label}.unrelatedStability.before.navigationFingerprint`,
  );
  requireEqual(
    after.event.navigationFingerprint,
    unrelated.navigationFingerprint,
    `${label}.unrelatedStability.after.navigationFingerprint`,
  );
  const stableFields = [
    "parentId",
    "nodeId",
    "nodeKind",
    "label",
    "description",
    "accessibilityLabel",
    "contextValue",
    "command",
    "navigationWorkspaceIdentity",
    "navigationProjectKey",
    "navigationFingerprint",
    "navigationResourceIdentity",
    "navigationChildIdentity",
    "navigationRole",
    "navigationPlacement",
    "implementationAvailable",
    "implementationWorkspaceIdentity",
    "implementationProjectKey",
    "implementationFingerprint",
    "implementationResourceIdentity",
    "implementationRole",
    "implementationPlacement",
    "collapsible",
    "defaultExpanded",
    "rowStates",
  ];
  const changedFields = stableFields.filter((field) => before.event[field] !== after.event[field]);
  requireEqual(changedFields.length, unrelated.changedFieldCount, `${label}.unrelatedStability changed fields`);
  if (!(before.eventOrdinal < invalidated.eventOrdinal
    && after.eventOrdinal > discarded.eventOrdinal
    && after.eventOrdinal < successor.eventOrdinal)) {
    throw new Error(`${label}.unrelatedStability references are outside the predecessor race window.`);
  }

  validateHeaderOnlyTreeFacts(tree.headerOnlyPublished, context, `${label}.headerOnlyPublished`);
  validateOpenCoverageTreeFacts(tree.openCoverage, context, `${label}.openCoverage`);
  validateGuardrailTreeFacts(tree.guardrail, context, `${label}.guardrail`);
  if (context.versionLane === "current-stable") {
    validatePageDrainTreeFacts(tree.pageDrain, context, `${label}.pageDrain`);
  }
}

export function baselineTreeFact(value, label = "baseline tree") {
  return exactObject(value, [
    "published",
    "generation",
    "fingerprint",
    "nodeCount",
    "rootCount",
  ], label);
}

function validateBaselineTreeFacts(value, context, label) {
  const fact = baselineTreeFact(value, label);
  const published = resolveLedgerReference(
    fact.published,
    `${label}.published`,
    context,
    "resource-explorer",
    "publish-complete",
  );
  requirePositiveInteger(fact.generation, `${label}.generation`);
  validateAggregatePublicationFingerprint(
    fact.fingerprint,
    published.event.fingerprint,
    `${label}.fingerprint`,
  );
  requirePositiveInteger(fact.nodeCount, `${label}.nodeCount`);
  requirePositiveInteger(fact.rootCount, `${label}.rootCount`);
  requireEqual(published.event.generation, fact.generation, `${label}.published.generation`);
  requireEqual(published.event.publicationKind, "current", `${label}.published.publicationKind`);
  requireEqual(published.event.nodeCount, fact.nodeCount, `${label}.published.nodeCount`);
  requireEqual(published.event.rootCount, fact.rootCount, `${label}.published.rootCount`);
  const nodes = publicationNodes(context, published, label);
  requireEqual(nodes.length, fact.nodeCount, `${label}.computed nodeCount`);
  const nodeIds = new Set();
  const nodeById = new Map();
  for (const [index, record] of nodes.entries()) {
    requireEqual(record.event.ordinal, index, `${label}.nodes[${index}].ordinal`);
    requireNonemptyString(record.event.nodeId, `${label}.nodes[${index}].nodeId`);
    requireUnique(nodeIds, record.event.nodeId, `${label}.nodes[${index}].nodeId`);
    if (record.event.parentId != null && !nodeById.has(record.event.parentId)) {
      throw new Error(`${label}.nodes[${index}] references a missing or later parent.`);
    }
    nodeById.set(record.event.nodeId, record);
  }
  requireEqual(
    nodes.filter((record) => record.event.parentId == null).length,
    fact.rootCount,
    `${label}.computed rootCount`,
  );

  const projectNodes = nodes.filter((record) => record.event.nodeKind === "project");
  const expectedProjects = new Map([
    ["host-alpha", { coverage: "open", rowCount: context.versionLane === "current-stable"
      ? context.fixture.witnesses.pageDrain.rowCount
      : null }],
    ["host-beta", { coverage: "complete", rowCount: null }],
    [context.fixture.witnesses.guardrail.projectKey, {
      coverage: context.fixture.witnesses.guardrail.coverage,
      rowCount: context.fixture.witnesses.guardrail.rowCount,
    }],
    [context.fixture.witnesses.openCoverage.projectKey, {
      coverage: context.fixture.witnesses.openCoverage.coverage,
      rowCount: context.fixture.witnesses.openCoverage.rowCount,
    }],
  ]);
  for (const [projectKey, expected] of expectedProjects) {
    const projectNode = projectNodeForKey(nodes, projectKey);
    requireEqual(projectNode.event.answerResult, "answered", `${label}.${projectKey}.answerResult`);
    requireEqual(projectNode.event.answerCoverage, expected.coverage, `${label}.${projectKey}.answerCoverage`);
    requireEqual(
      projectNode.event.contextValue,
      expected.coverage === "complete" ? "resourceProject" : "resourceProjectIssue",
      `${label}.${projectKey}.contextValue`,
    );
    requirePositiveInteger(projectNode.event.answerRowCount, `${label}.${projectKey}.answerRowCount`);
    if (expected.rowCount != null) {
      requireEqual(projectNode.event.answerRowCount, expected.rowCount, `${label}.${projectKey}.answerRowCount`);
    }
    const descendants = descendantRecords(nodes, projectNode.event.nodeId);
    const resources = descendants.filter((record) => record.event.nodeKind === "resource");
    requireEqual(resources.length, projectNode.event.answerRowCount, `${label}.${projectKey} resource rows`);
    for (const resource of resources) {
      requireEqual(resource.event.answerResult, "answered", `${label}.${projectKey} resource answerResult`);
      requireEqual(resource.event.answerCoverage, expected.coverage, `${label}.${projectKey} resource answerCoverage`);
      requireEqual(resource.event.answerRowCount, projectNode.event.answerRowCount, `${label}.${projectKey} resource answerRowCount`);
    }
    const kindNodes = descendants.filter((record) => record.event.parentId === projectNode.event.nodeId);
    const expectedKindOrder = [
      "Elements",
      "Template Controllers",
      "Attributes",
      "Value Converters",
      "Binding Behaviors",
    ];
    const observedKindOrder = kindNodes.map((record) => record.event.label.replace(/ \(\d+\)$/u, ""));
    requireArrayEqual(
      observedKindOrder,
      expectedKindOrder.filter((kind) => observedKindOrder.includes(kind)),
      `${label}.${projectKey} kind order`,
    );
    for (const kindNode of kindNodes) {
      requireEqual(kindNode.event.nodeKind, "kind", `${label}.${projectKey} kind node kind`);
      if (!nodes.some((record) => (
        record.event.parentId === kindNode.event.nodeId && record.event.nodeKind === "resource"
      ))) {
        throw new Error(`${label}.${projectKey} contains an empty kind group.`);
      }
    }
  }
  validateBaselineWitnessRows(nodes, context, label);
  context.baseline = Object.freeze({ published, nodes, nodeById, projectNodes });
  context.claims.add("complete-nonempty");
  context.claims.add("hierarchy");
  context.claims.add("resource-breadth");
}

export function validateAggregatePublicationFingerprint(factFingerprint, eventFingerprint, label) {
  requireEqual(factFingerprint, null, `${label} fact`);
  requireEqual(eventFingerprint, null, `${label} event`);
}

export function publicationNodes(context, published, label) {
  const nodes = context.ledgerRecords.filter((record) => (
    record.event.source === "resource-explorer"
      && record.event.phase === "publish-node"
      && record.event.observationId === published.event.observationId
      && record.event.generation === published.event.generation
      && record.event.publicationKind === published.event.publicationKind
      && record.eventOrdinal < published.eventOrdinal
  ));
  if (nodes.length === 0) throw new Error(`${label} contains no correlated publish-node events.`);
  return nodes.sort((left, right) => left.event.ordinal - right.event.ordinal);
}

function descendantRecords(nodes, ancestorId) {
  const descendants = [];
  const admitted = new Set([ancestorId]);
  for (const record of nodes) {
    if (admitted.has(record.event.parentId)) {
      admitted.add(record.event.nodeId);
      descendants.push(record);
    }
  }
  return descendants;
}

function projectNodeForKey(nodes, projectKey) {
  const candidates = nodes.filter((record) => (
    record.event.nodeKind === "project"
      && projectLabelIncludesKey(record.event.label, projectKey)
  ));
  const withCorrelatedResources = candidates.filter((candidate) => (
    descendantRecords(nodes, candidate.event.nodeId).some((record) => (
      record.event.navigationProjectKey === projectKey
    ))
  ));
  const matches = withCorrelatedResources.length > 0 ? withCorrelatedResources : candidates;
  if (matches.length !== 1) {
    throw new Error(`Publication does not contain exactly one project row '${projectKey}'.`);
  }
  return matches[0];
}

function projectLabelIncludesKey(label, projectKey) {
  return typeof label === "string" && label.split(" · ").includes(projectKey);
}

function validateBaselineWitnessRows(nodes, context, label) {
  const byNavigationIdentity = (identityKey, projectKey = null) => nodes.filter((record) => (
    record.event.nodeKind === "resource"
      && record.event.navigationResourceIdentity === identityKey
      && (projectKey == null || record.event.navigationProjectKey === projectKey)
  ));
  const requireResource = (row, projectKey, rowLabel) => {
    const matches = byNavigationIdentity(row.identityKey, projectKey);
    if (matches.length !== 1) {
      throw new Error(`${label}.${rowLabel} must publish exactly one correlated resource row.`);
    }
    const record = matches[0];
    requireEqual(record.event.label, row.name ?? context.fixture.witnesses.longSuffixDuplicates.name, `${label}.${rowLabel}.label`);
    requireEqual(record.event.command, "aurelia.openResource", `${label}.${rowLabel}.command`);
    requireEqual(record.event.navigationRole, "resource", `${label}.${rowLabel}.navigationRole`);
    return record;
  };
  const longWitness = context.fixture.witnesses.longSuffixDuplicates;
  const longRows = longWitness.rows.map((row, index) => requireResource(
    { ...row, name: longWitness.name },
    longWitness.projectKey,
    `longSuffixDuplicates.rows[${index}]`,
  ));
  requireEqual(longRows[0].event.label, longRows[1].event.label, `${label}.long duplicate labels`);
  if (longRows[0].event.description === longRows[1].event.description
    || longRows[0].event.accessibilityLabel === longRows[1].event.accessibilityLabel) {
    throw new Error(`${label}.long duplicate visible and accessible scents must be distinct.`);
  }
  for (const [index, record] of longRows.entries()) {
    const suffix = longWitness.rows[index].shortestUniqueSuffix;
    if (!record.event.description.includes(suffix) || !record.event.accessibilityLabel.includes(suffix)) {
      throw new Error(`${label}.longSuffixDuplicates.rows[${index}] omits its shortest unique suffix.`);
    }
  }
  for (const [index, row] of context.fixture.witnesses.localTemplateAndBindables.rows.entries()) {
    const resource = requireResource(row, "host-alpha", `localTemplateAndBindables.rows[${index}]`);
    for (const [bindableIndex, bindable] of row.bindables.entries()) {
      const matches = nodes.filter((record) => (
        record.event.nodeKind === "bindable"
          && record.event.navigationResourceIdentity === row.identityKey
          && record.event.navigationChildIdentity === bindable.identityKey
      ));
      if (matches.length !== 1) {
        throw new Error(`${label}.localTemplateAndBindables.rows[${index}].bindables[${bindableIndex}] was not published exactly once.`);
      }
      requireEqual(matches[0].event.parentId, resource.event.nodeId, `${label}.local bindable parent`);
      requireEqual(matches[0].event.navigationRole, "bindable", `${label}.local bindable role`);
    }
  }
  const duplicateLocalRows = context.fixture.witnesses.localTemplateAndBindables.rows
    .map((row) => ({ row, record: byNavigationIdentity(row.identityKey, "host-alpha")[0] }))
    .filter(({ row }) => row.name === "local-chip")
    .map(({ record }) => record);
  if (duplicateLocalRows.length !== 2
    || duplicateLocalRows[0].event.description === duplicateLocalRows[1].event.description
    || duplicateLocalRows[0].event.accessibilityLabel === duplicateLocalRows[1].event.accessibilityLabel) {
    throw new Error(`${label}.local-template same-name rows are not visibly and accessibly distinct.`);
  }
  const collisions = context.fixture.witnesses.aliasAndCrossKindCollisions;
  for (const [collection, rows] of [
    ["sameKindRows", collisions.sameKindRows],
    ["crossKindRows", collisions.crossKindRows],
  ]) {
    for (const [index, row] of rows.entries()) {
      requireResource(row, collisions.projectKey, `aliasAndCrossKindCollisions.${collection}[${index}]`);
    }
  }
  for (const rows of [collisions.sameKindRows, collisions.crossKindRows]) {
    const groups = new Map();
    for (const row of rows) groups.set(row.name, [...(groups.get(row.name) ?? []), row]);
    for (const [name, group] of groups) {
      if (group.length < 2) continue;
      const records = group.map((row) => byNavigationIdentity(row.identityKey, collisions.projectKey)[0]);
      if (new Set(records.map((record) => record.event.description)).size !== records.length
        || new Set(records.map((record) => record.event.accessibilityLabel)).size !== records.length) {
        throw new Error(`${label}.collision group '${name}' is not visibly and accessibly distinct.`);
      }
    }
  }
  for (const [index, alias] of collisions.aliases.entries()) {
    const matches = nodes.filter((record) => (
      record.event.nodeKind === "alias"
        && record.event.navigationResourceIdentity === alias.resourceIdentityKey
        && record.event.navigationChildIdentity === alias.aliasIdentityKey
    ));
    if (matches.length !== 1) {
      throw new Error(`${label}.aliasAndCrossKindCollisions.aliases[${index}] was not published exactly once.`);
    }
    requireEqual(matches[0].event.label, alias.aliasName, `${label}.alias[${index}].label`);
    requireEqual(matches[0].event.navigationRole, "alias", `${label}.alias[${index}].role`);
  }
  for (const [index, row] of context.fixture.witnesses.headerOnlyMetadata.rows.entries()) {
    const record = requireResource(row, "host-alpha", `headerOnlyMetadata.rows[${index}]`);
    requireRowState(record.event, "metadata-incomplete", `${label}.headerOnlyMetadata.rows[${index}]`);
  }
  requireResource(
    context.fixture.witnesses.openCoverage.appRow,
    context.fixture.witnesses.openCoverage.projectKey,
    "openCoverage.appRow",
  );
  requireResource(
    context.fixture.witnesses.guardrail.appRow,
    context.fixture.witnesses.guardrail.projectKey,
    "guardrail.appRow",
  );
  if (context.versionLane === "current-stable") {
    for (const [index, row] of context.fixture.witnesses.packageOrigins.rows.entries()) {
      const record = requireResource(row, "host-alpha", `packageOrigins.rows[${index}]`);
      for (const token of [row.originKind, row.packageName].filter((entry) => entry != null)) {
        if (!record.event.accessibilityLabel.includes(token)) {
          throw new Error(`${label}.packageOrigins.rows[${index}] omits public origin token '${token}'.`);
        }
      }
    }
  }
  context.claims.add("long-scent-duplicates");
  context.claims.add("collisions");
}

function validateLifecycleTreeFacts(value, context, label) {
  const facts = exactObject(value, ["quietWindow", "retirement"], label);
  const quiet = exactObject(facts.quietWindow, [
    "start",
    "end",
    "plainWorkspaceEventCount",
    "excludedWorkspaceEventCount",
    "pickerEventCount",
    "outputRequestCount",
    "navigationOpenCount",
  ], `${label}.quietWindow`);
  const start = resolveLedgerReference(
    quiet.start,
    `${label}.quietWindow.start`,
    context,
    "resource-discovery-host-control",
    "reset",
  );
  const end = resolveLedgerReference(
    quiet.end,
    `${label}.quietWindow.end`,
    context,
    "resource-discovery-host-control",
    "reset",
  );
  requireStrictOrdinalOrder([start, end], `${label}.quietWindow`);
  requireEqual(start.event.pending, false, `${label}.quietWindow.start.pending`);
  requireEqual(end.event.pending, false, `${label}.quietWindow.end.pending`);
  const between = context.ledgerRecords.filter((record) => (
    record.eventOrdinal > start.eventOrdinal && record.eventOrdinal < end.eventOrdinal
  ));
  const shardRoot = resolve(context.workspaceRoot, "..");
  const plainRoot = resolve(shardRoot, "plain-typescript");
  const excludedRoot = resolve(shardRoot, "hello-world", "excluded-project");
  const countWorkspace = (workspacePath) => between.filter((record) => (
    typeof record.event.workspaceKey === "string"
      && fileWorkspaceKeyMatches(record.event.workspaceKey, workspacePath)
  )).length;
  requireEqual(quiet.plainWorkspaceEventCount, 0, `${label}.quietWindow.plainWorkspaceEventCount`);
  requireEqual(countWorkspace(plainRoot), quiet.plainWorkspaceEventCount, `${label}.quietWindow computed plain events`);
  requireEqual(quiet.excludedWorkspaceEventCount, 0, `${label}.quietWindow.excludedWorkspaceEventCount`);
  requireEqual(countWorkspace(excludedRoot), quiet.excludedWorkspaceEventCount, `${label}.quietWindow computed excluded events`);
  for (const [field, count] of [
    ["pickerEventCount", between.filter((record) => record.event.source === "resource-quick-pick").length],
    ["outputRequestCount", between.filter((record) => record.event.phase === "output-requested").length],
    ["navigationOpenCount", between.filter((record) => record.event.source === "resource-navigation" && record.event.phase === "opened").length],
  ]) {
    requireEqual(quiet[field], 0, `${label}.quietWindow.${field}`);
    requireEqual(count, quiet[field], `${label}.quietWindow computed ${field}`);
  }

  const retirement = exactObject(facts.retirement, [
    "before",
    "after",
    "retiredResourcePublishCount",
    "retainedResourceCount",
  ], `${label}.retirement`);
  const before = resolveLedgerReference(
    retirement.before,
    `${label}.retirement.before`,
    context,
    "resource-explorer",
    "publish-complete",
  );
  const after = resolveLedgerReference(
    retirement.after,
    `${label}.retirement.after`,
    context,
    "resource-explorer",
    "publish-complete",
  );
  requireStrictOrdinalOrder([before, after], `${label}.retirement`);
  const afterNodes = publicationNodes(context, after, `${label}.retirement.after`);
  const fixtureIdentities = executableFixtureResourceIdentities(context.fixture);
  const retiredCount = afterNodes.filter((record) => (
    fixtureIdentities.has(record.event.navigationResourceIdentity)
  )).length;
  requireEqual(retirement.retiredResourcePublishCount, 0, `${label}.retirement.retiredResourcePublishCount`);
  requireEqual(retiredCount, retirement.retiredResourcePublishCount, `${label}.retirement computed retired rows`);
  const retainedCount = afterNodes.filter((record) => record.event.nodeKind === "resource").length;
  requirePositiveInteger(retirement.retainedResourceCount, `${label}.retirement.retainedResourceCount`);
  requireEqual(retainedCount, retirement.retainedResourceCount, `${label}.retirement retained rows`);
  if (afterNodes.some((record) => record.event.nodeKind === "project")) {
    throw new Error(`${label}.retirement must prove sole-project root elision.`);
  }
  if (!afterNodes.some((record) => record.event.nodeKind === "kind" && record.event.parentId == null)) {
    throw new Error(`${label}.retirement does not contain root-level kind groups.`);
  }
  context.claims.add("quiet-lifecycle");
  context.claims.add("retirement");
}

function validateHeaderOnlyTreeFacts(value, context, label) {
  const rows = context.fixture.witnesses.headerOnlyMetadata.rows;
  requireObjectArray(value, label, rows.length);
  for (const [index, receiptValue] of value.entries()) {
    const receiptLabel = `${label}[${index}]`;
    const receipt = exactObject(receiptValue, ["identityKey", "published"], receiptLabel);
    const expected = rows[index];
    requireEqual(receipt.identityKey, expected.identityKey, `${receiptLabel}.identityKey`);
    const published = resolveLedgerReference(
      receipt.published,
      `${receiptLabel}.published`,
      context,
      "resource-explorer",
      "publish-node",
    );
    requireEqual(
      published.event.navigationResourceIdentity,
      expected.identityKey,
      `${receiptLabel}.published.navigationResourceIdentity`,
    );
    requireEqual(published.event.navigationProjectKey, "host-alpha", `${receiptLabel}.published.projectKey`);
    requireRowState(published.event, "metadata-incomplete", `${receiptLabel}.published`);
  }
}

function validateOpenCoverageTreeFacts(value, context, label) {
  const fact = exactObject(value, [
    "projectKey",
    "inventoryCoverage",
    "inventoryRowCount",
    "unresolvedModules",
    "availabilityCoverage",
    "availabilityRowCount",
    "appPublished",
    "availabilityObserved",
  ], label);
  const witness = context.fixture.witnesses.openCoverage;
  requireEqual(fact.projectKey, witness.projectKey, `${label}.projectKey`);
  requireEqual(fact.inventoryCoverage, witness.coverage, `${label}.inventoryCoverage`);
  requireEqual(fact.inventoryRowCount, witness.rowCount, `${label}.inventoryRowCount`);
  requireEqual(
    fact.unresolvedModules,
    witness.completeness.unresolvedModules,
    `${label}.unresolvedModules`,
  );
  requireEqual(
    fact.availabilityCoverage,
    witness.availability.coverage,
    `${label}.availabilityCoverage`,
  );
  requireEqual(
    fact.availabilityRowCount,
    witness.availability.rowCount,
    `${label}.availabilityRowCount`,
  );
  const published = resolveLedgerReference(
    fact.appPublished,
    `${label}.appPublished`,
    context,
    "resource-explorer",
    "publish-node",
  );
  requireEqual(
    published.event.navigationResourceIdentity,
    witness.appRow.identityKey,
    `${label}.appPublished.navigationResourceIdentity`,
  );
  requireEqual(published.event.navigationProjectKey, witness.projectKey, `${label}.appPublished.projectKey`);
  requireEqual(published.event.answerResult, witness.result, `${label}.appPublished.answerResult`);
  requireEqual(published.event.answerCoverage, witness.coverage, `${label}.appPublished.answerCoverage`);
  requireEqual(published.event.answerRowCount, witness.rowCount, `${label}.appPublished.answerRowCount`);
  requireEqual(
    publicationResourceCountForProject(context.baseline.nodes, witness.projectKey),
    witness.rowCount,
    `${label} computed inventory rowCount`,
  );
  requireRowState(published.event, "discovery-incomplete", `${label}.appPublished`);
  const availability = resolveLedgerReference(
    fact.availabilityObserved,
    `${label}.availabilityObserved`,
    context,
    "go-to-available-resource",
    "initial-request-response",
  );
  requireEqual(availability.event.projectSelection, "exact", `${label}.availabilityObserved.projectSelection`);
  requireEqual(availability.event.templateSelection, "exact", `${label}.availabilityObserved.templateSelection`);
  requireEqual(availability.event.answerResult, witness.result, `${label}.availabilityObserved.answerResult`);
  requireEqual(availability.event.answerCoverage, witness.availability.coverage, `${label}.availabilityObserved.answerCoverage`);
  requireEqual(
    availability.event.resourceCount,
    witness.availability.rowCount,
    `${label}.availabilityObserved.resourceCount`,
  );
  requireEqual(
    availability.event.count,
    openCoverageSelectableResourceCount,
    `${label}.availabilityObserved.count`,
  );
  context.openCoverageAvailability = availability;
  context.claims.add("open");
}

function validateGuardrailTreeFacts(value, context, label) {
  const fact = exactObject(value, [
    "projectKey",
    "coverage",
    "rowCount",
    "appPublished",
    "excludedDefinitionPublishCount",
  ], label);
  const witness = context.fixture.witnesses.guardrail;
  requireEqual(fact.projectKey, witness.projectKey, `${label}.projectKey`);
  requireEqual(fact.coverage, witness.coverage, `${label}.coverage`);
  requireEqual(fact.rowCount, witness.rowCount, `${label}.rowCount`);
  requireEqual(
    fact.excludedDefinitionPublishCount,
    0,
    `${label}.excludedDefinitionPublishCount`,
  );
  const published = resolveLedgerReference(
    fact.appPublished,
    `${label}.appPublished`,
    context,
    "resource-explorer",
    "publish-node",
  );
  requireEqual(
    published.event.navigationResourceIdentity,
    witness.appRow.identityKey,
    `${label}.appPublished.navigationResourceIdentity`,
  );
  requireEqual(published.event.navigationProjectKey, witness.projectKey, `${label}.appPublished.projectKey`);
  requireEqual(published.event.answerResult, witness.result, `${label}.appPublished.answerResult`);
  requireEqual(published.event.answerCoverage, witness.coverage, `${label}.appPublished.answerCoverage`);
  requireEqual(published.event.answerRowCount, witness.rowCount, `${label}.appPublished.answerRowCount`);
  requireEqual(
    publicationResourceCountForProject(context.baseline.nodes, witness.projectKey),
    witness.rowCount,
    `${label} computed rowCount`,
  );
  requireRowState(published.event, "discovery-incomplete", `${label}.appPublished`);
  const excludedTokens = [witness.excludedDefinitionName];
  const observedExcluded = context.baseline.nodes.filter((record) => (
    ["label", "description", "accessibilityLabel"].some((field) => (
      typeof record.event[field] === "string"
        && excludedTokens.some((token) => record.event[field].includes(token))
    ))
  )).length;
  requireEqual(
    observedExcluded,
    fact.excludedDefinitionPublishCount,
    `${label} computed excluded definition rows`,
  );
  context.claims.add("truncated");
}

function validatePageDrainTreeFacts(value, context, label) {
  const fact = exactObject(value, [
    "projectKey",
    "rowCount",
    "pageSize",
    "pageRequestCount",
    "firstIdentityKey",
    "lastIdentityKey",
    "firstPublished",
    "lastPublished",
  ], label);
  const witness = context.fixture.witnesses.pageDrain;
  for (const field of ["projectKey", "rowCount", "pageSize", "pageRequestCount"]) {
    requireEqual(fact[field], witness[field], `${label}.${field}`);
  }
  requireEqual(fact.firstIdentityKey, witness.first.identityKey, `${label}.firstIdentityKey`);
  requireEqual(fact.lastIdentityKey, witness.last.identityKey, `${label}.lastIdentityKey`);
  for (const field of ["first", "last"]) {
    const published = resolveLedgerReference(
      fact[`${field}Published`],
      `${label}.${field}Published`,
      context,
      "resource-explorer",
      "publish-node",
    );
    requireEqual(
      published.event.navigationResourceIdentity,
      witness[field].identityKey,
      `${label}.${field}Published.navigationResourceIdentity`,
    );
    requireEqual(published.event.navigationProjectKey, witness.projectKey, `${label}.${field}Published.projectKey`);
    requireEqual(published.event.answerResult, witness.result, `${label}.${field}Published.answerResult`);
    requireEqual(published.event.answerCoverage, witness.coverage, `${label}.${field}Published.answerCoverage`);
    requireEqual(published.event.answerRowCount, witness.rowCount, `${label}.${field}Published.answerRowCount`);
  }
  requireEqual(
    publicationResourceCountForProject(context.baseline.nodes, witness.projectKey),
    witness.rowCount,
    `${label} computed rowCount`,
  );
  context.claims.add("page-drain");
}

function validateQuickPickFacts(value, context) {
  const label = "acceptance report facts.quickPick";
  const facts = exactObject(value, [
    "projectModel",
    "templateModel",
    "resourceModel",
    "back",
    "cancel",
    "unownedCursor",
    "noCursor",
  ], label);
  const ambiguity = context.fixture.witnesses.projectTemplateAmbiguity;
  const project = validateQuickPickModelFact(
    facts.projectModel,
    `${label}.projectModel`,
    context,
    "project",
  );
  requireEqual(project.fact.modelOrdinal, 3, `${label}.projectModel.modelOrdinal`);
  requireEqual(
    project.fact.itemCount,
    ambiguity.projectKeys.length,
    `${label}.projectModel.itemCount`,
  );
  requireArrayEqual(
    project.items.map((record) => record.event.label),
    ambiguity.projectKeys,
    `${label}.projectModel labels`,
  );
  if (!ambiguity.projectKeys.includes(project.fact.selectedProjectKey)) {
    throw new Error(`${label}.projectModel selectedProjectKey is not a manifest project candidate.`);
  }
  requireEqual(
    project.fact.selectedProjectKey,
    "host-alpha",
    `${label}.projectModel.selectedProjectKey`,
  );
  requireEqual(project.selection.event.selectionKind, "project", `${label}.projectModel.selectionKind`);
  requireEqual(
    project.selection.event.projectKey,
    project.fact.selectedProjectKey,
    `${label}.projectModel.selection.projectKey`,
  );
  const projectAccept = validateQuickPickAcceptCorrelation(
    project,
    ambiguity.projectKeys.indexOf(project.fact.selectedProjectKey),
    context,
    `${label}.projectModel.accept`,
  );
  const selectedProject = ambiguity.projects.find((candidate) => (
    candidate.projectKey === project.fact.selectedProjectKey
  ));
  if (selectedProject == null) throw new Error(`${label}.projectModel selected project is missing.`);

  const template = validateQuickPickModelFact(
    facts.templateModel,
    `${label}.templateModel`,
    context,
    "template",
  );
  requireEqual(template.fact.modelOrdinal, 4, `${label}.templateModel.modelOrdinal`);
  requireEqual(
    template.fact.itemCount,
    selectedProject.scopes.length,
    `${label}.templateModel.itemCount`,
  );
  requireArrayEqual(
    template.items.map((record) => record.event.label),
    selectedProject.scopes.map((scope) => scope.definitionName),
    `${label}.templateModel labels`,
  );
  const selectedScope = selectedProject.scopes.find((scope) => (
    scope.scopeIdentityKey === template.fact.selectedTemplateScopeIdentity
  ));
  if (selectedScope == null) {
    throw new Error(`${label}.templateModel selected scope is not a manifest scope candidate.`);
  }
  requireEqual(
    selectedScope.scopeIdentityKey,
    "template-resource-scope:v1:sYGd8lgb0DmojJtGcGvScL",
    `${label}.templateModel selected exclusion-bearing scope`,
  );
  requireEqual(
    selectedScope.mustExcludeResourceIdentityKeys.length,
    8,
    `${label}.templateModel selected exclusion count`,
  );
  requireEqual(template.selection.event.selectionKind, "template", `${label}.templateModel.selectionKind`);
  requireEqual(
    template.selection.event.templateScopeIdentity,
    template.fact.selectedTemplateScopeIdentity,
    `${label}.templateModel.selection.templateScopeIdentity`,
  );
  const templateAccept = validateQuickPickAcceptCorrelation(
    template,
    selectedProject.scopes.findIndex((scope) => scope.scopeIdentityKey === selectedScope.scopeIdentityKey),
    context,
    `${label}.templateModel.accept`,
  );

  const resource = validateAmbiguityEmptyResourceModel(
    facts.resourceModel,
    `${label}.resourceModel`,
    context,
    selectedProject,
    selectedScope,
  );
  requireEqual(project.ready.event.observationId, template.ready.event.observationId, `${label} command observation id`);
  requireEqual(project.ready.event.observationId, resource.ready.event.observationId, `${label} command observation id`);
  if (!(project.fact.modelOrdinal < template.fact.modelOrdinal
    && template.fact.modelOrdinal < resource.fact.modelOrdinal)) {
    throw new Error(`${label} model ordinals must increase from project to template to resource.`);
  }
  requireStrictOrdinalOrder(
    [
      project.ready,
      projectAccept,
      project.selection,
      template.ready,
      templateAccept,
      template.selection,
      resource.response,
      resource.ready,
      resource.cancelled,
      resource.disposed,
      resource.commandCancelled,
    ],
    `${label} selected flow`,
  );

  const backFact = exactObject(facts.back, ["event"], `${label}.back`);
  const back = resolveLedgerReference(
    backFact.event,
    `${label}.back.event`,
    context,
    "resource-quick-pick",
    "back",
  );
  validateQuickPickBackCorrelation(back, project.ready, context, `${label}.back`);
  const cancelFact = exactObject(facts.cancel, ["event"], `${label}.cancel`);
  const cancel = resolveLedgerReference(
    cancelFact.event,
    `${label}.cancel.event`,
    context,
    "resource-quick-pick",
    "cancelled",
  );
  validateQuickPickCancelCorrelation(
    cancel,
    context.openCoverageAvailability,
    context,
    `${label}.cancel`,
  );
  validateEmptyQuickPickState(
    facts.unownedCursor,
    context,
    `${label}.unownedCursor`,
    "unowned",
  );
  validateEmptyQuickPickState(
    facts.noCursor,
    context,
    `${label}.noCursor`,
    "no-cursor",
  );
  context.claims.add("project-ambiguity");
  context.claims.add("template-ambiguity");
  context.claims.add("unowned-cursor");
  context.claims.add("no-cursor");
}

export function validateQuickPickAcceptCorrelation(model, expectedItemOrdinal, context, label) {
  requireNonNegativeInteger(expectedItemOrdinal, `${label}.expectedItemOrdinal`);
  if (expectedItemOrdinal >= model.items.length) {
    throw new Error(`${label}.expectedItemOrdinal is outside the authenticated model.`);
  }
  const accepts = context.ledgerRecords.filter((record) => (
    record.event.source === "resource-quick-pick"
      && record.event.phase === "accept"
      && record.event.observationId === model.ready.event.observationId
      && record.event.modelOrdinal === model.fact.modelOrdinal
      && record.eventOrdinal > model.ready.eventOrdinal
      && record.eventOrdinal < model.selection.eventOrdinal
  ));
  requireEqual(accepts.length, 1, `${label} correlated accept count`);
  const accept = accepts[0];
  requireEqual(accept.event.itemOrdinal, expectedItemOrdinal, `${label}.itemOrdinal`);
  requireEqual(
    accept.event.selectedLabel,
    model.items[expectedItemOrdinal].event.label,
    `${label}.selectedLabel`,
  );
  requireStrictOrdinalOrder([model.ready, accept, model.selection], label);
  return accept;
}

export function validateQuickPickBackCorrelation(back, retainedProjectReady, context, label) {
  requireEqual(back.event.observationId, retainedProjectReady.event.observationId, `${label}.observationId`);
  requireEqual(back.event.modelOrdinal, 2, `${label}.modelOrdinal`);
  requireEqual(retainedProjectReady.event.modelOrdinal, 3, `${label}.retainedProjectModelOrdinal`);
  const firstTemplateModels = context.ledgerRecords.filter((record) => (
    record.event.source === "resource-quick-pick"
      && record.event.phase === "model-ready"
      && record.event.observationId === back.event.observationId
      && record.event.modelOrdinal === 2
      && record.eventOrdinal < back.eventOrdinal
  ));
  requireEqual(firstTemplateModels.length, 1, `${label} first template model count`);
  requireStrictOrdinalOrder(
    [firstTemplateModels[0], back, retainedProjectReady],
    label,
  );
}

export function validateQuickPickCancelCorrelation(cancel, availability, context, label) {
  if (availability == null) throw new Error(`${label} has no authenticated open-coverage response.`);
  requireEqual(cancel.event.observationId, availability.event.observationId, `${label}.observationId`);
  requireEqual(cancel.event.modelOrdinal, 1, `${label}.modelOrdinal`);
  const models = context.ledgerRecords.filter((record) => (
    record.event.source === "resource-quick-pick"
      && record.event.phase === "model-ready"
      && record.event.observationId === cancel.event.observationId
      && record.event.modelOrdinal === 1
      && record.eventOrdinal > availability.eventOrdinal
      && record.eventOrdinal < cancel.eventOrdinal
  ));
  requireEqual(models.length, 1, `${label} open-coverage model count`);
  requireEqual(models[0].event.itemCount, availability.event.count, `${label} itemCount`);
  requireStrictOrdinalOrder([availability, models[0], cancel], label);
}

function validateAmbiguityEmptyResourceModel(value, label, context, selectedProject, selectedScope) {
  const fact = exactObject(value, [
    "ready",
    "response",
    "cancelled",
    "disposed",
    "commandCancelled",
    "modelOrdinal",
    "itemCount",
    "excludedAppRootIdentityKey",
  ], label);
  requireEqual(fact.modelOrdinal, 5, `${label}.modelOrdinal`);
  requireEqual(fact.itemCount, 0, `${label}.itemCount`);
  requireEqual(
    fact.excludedAppRootIdentityKey,
    ambiguityExcludedAppRootIdentity,
    `${label}.excludedAppRootIdentityKey`,
  );
  requireEqual(
    fact.excludedAppRootIdentityKey,
    context.fixture.witnesses.projectTemplateAmbiguity.excludedAppRootIdentityKey,
    `${label}.fixture excludedAppRootIdentityKey`,
  );
  const response = resolveLedgerReference(
    fact.response,
    `${label}.response`,
    context,
    "go-to-available-resource",
    "initial-request-response",
  );
  const ready = resolveLedgerReference(
    fact.ready,
    `${label}.ready`,
    context,
    "resource-quick-pick",
    "model-ready",
  );
  const cancelled = resolveLedgerReference(
    fact.cancelled,
    `${label}.cancelled`,
    context,
    "resource-quick-pick",
    "cancelled",
  );
  const disposed = resolveLedgerReference(
    fact.disposed,
    `${label}.disposed`,
    context,
    "resource-quick-pick",
    "disposed",
  );
  const commandCancelled = resolveLedgerReference(
    fact.commandCancelled,
    `${label}.commandCancelled`,
    context,
    "go-to-available-resource",
    "cancelled",
  );
  const flowObservationId = ready.event.observationId;
  for (const [field, record] of Object.entries({ response, cancelled, disposed, commandCancelled })) {
    requireEqual(record.event.observationId, flowObservationId, `${label}.${field} observationId`);
  }
  for (const [field, record] of Object.entries({ ready, cancelled, disposed })) {
    requireEqual(record.event.modelOrdinal, 5, `${label}.${field}.modelOrdinal`);
  }
  requireEqual(commandCancelled.event.stage, "selection", `${label}.commandCancelled.stage`);
  requireEqual(ready.event.itemCount, 0, `${label}.ready.itemCount`);
  requireEqual(ready.event.step, 3, `${label}.ready.step`);
  requireEqual(ready.event.totalSteps, 3, `${label}.ready.totalSteps`);
  requireEqual(ready.event.buttonCount, 1, `${label}.ready.buttonCount`);
  requireEqual(
    ready.event.placeholder,
    `No navigable supported resources are available to ${selectedScope.definitionName}`,
    `${label}.ready.placeholder`,
  );
  requireNonemptyString(ready.event.title, `${label}.ready.title`);
  if (!ready.event.title.startsWith(`Resources available to ${selectedScope.definitionName} — `)) {
    throw new Error(`${label}.ready.title does not name the selected manifest scope.`);
  }

  requireEqual(response.event.answerResult, "answered", `${label}.response.answerResult`);
  requireEqual(response.event.answerCoverage, "complete", `${label}.response.answerCoverage`);
  requireEqual(response.event.answerSelection, "exact", `${label}.response.answerSelection`);
  requireEqual(response.event.projectSelection, "exact", `${label}.response.projectSelection`);
  requireEqual(response.event.templateSelection, "exact", `${label}.response.templateSelection`);
  requireEqual(response.event.status, "empty", `${label}.response.status`);
  requireEqual(response.event.selectedProjectKey, selectedProject.projectKey, `${label}.response.selectedProjectKey`);
  requireEqual(
    response.event.selectedTemplateScopeIdentity,
    selectedScope.scopeIdentityKey,
    `${label}.response.selectedTemplateScopeIdentity`,
  );
  requireEqual(
    response.event.templateCandidateCount,
    1,
    `${label}.response.templateCandidateCount`,
  );
  requireEqual(
    response.event.soleTemplateCandidateScopeIdentity,
    selectedScope.scopeIdentityKey,
    `${label}.response.soleTemplateCandidateScopeIdentity`,
  );
  requireEqual(response.event.resourceCount, selectedScope.rowCount, `${label}.response.resourceCount`);
  requireEqual(response.event.count, selectedScope.selectableRowCount, `${label}.response.count`);
  requireEqual(
    response.event.resourceIdentitySetSha256,
    resourceIdentitySetSha256(selectedScope.resourceIdentityKeys),
    `${label}.response.resourceIdentitySetSha256`,
  );
  requireNonemptyString(response.event.fingerprint, `${label}.response.fingerprint`);
  requireArrayEqual(selectedScope.resourceIdentityKeys, selectedScope.navigationUnavailableIdentityKeys, `${label} exact unavailable scope`);
  if (selectedScope.resourceIdentityKeys.includes(fact.excludedAppRootIdentityKey)) {
    throw new Error(`${label} re-admits the Stage 6D excluded app-root identity.`);
  }
  const modelItems = context.ledgerRecords.filter((record) => (
    record.event.source === "resource-quick-pick"
      && record.event.observationId === flowObservationId
      && record.event.phase === "model-item"
      && record.event.modelOrdinal === 5
  ));
  requireEqual(modelItems.length, 0, `${label} model-item count`);
  const accepts = context.ledgerRecords.filter((record) => (
    record.event.source === "resource-quick-pick"
      && record.event.observationId === flowObservationId
      && record.event.phase === "accept"
      && record.event.modelOrdinal === 5
  ));
  requireEqual(accepts.length, 0, `${label} resource accept count`);
  const resourceSelections = context.ledgerRecords.filter((record) => (
    record.event.source === "go-to-available-resource"
      && record.event.observationId === flowObservationId
      && record.event.phase === "availability-selection"
      && record.event.selectionKind === "resource"
  ));
  requireEqual(resourceSelections.length, 0, `${label} resource selection count`);
  const navigation = context.ledgerRecords.filter((record) => (
    record.eventOrdinal > ready.eventOrdinal
      && record.eventOrdinal < commandCancelled.eventOrdinal
      && record.event.source === "resource-navigation"
      && (record.event.phase === "start" || record.event.phase === "opened")
  ));
  requireEqual(navigation.length, 0, `${label} resource navigation count`);
  const navigationCompletions = context.ledgerRecords.filter((record) => (
    record.event.source === "go-to-available-resource"
      && record.event.observationId === flowObservationId
      && record.event.phase === "navigation-complete"
  ));
  requireEqual(navigationCompletions.length, 0, `${label} navigation completion count`);
  requireStrictOrdinalOrder(
    [response, ready, cancelled, disposed, commandCancelled],
    `${label} exact empty cancellation flow`,
  );
  return { fact, response, ready, cancelled, disposed, commandCancelled };
}

export function validateQuickPickCurrentEvidence(
  resource,
  selectedProject,
  selectedScope,
  context,
  label = "Quick Pick current evidence",
) {
  const response = resource.response;
  const selection = resource.selection;
  const opened = resource.opened;
  const completed = resource.completed;
  const selectedResourceIdentity = resource.fact.selectedResourceIdentity;
  const selectedProjectKey = selectedProject.projectKey;
  const selectedScopeIdentity = selectedScope.scopeIdentityKey;
  const flowObservationId = selection.event.observationId;
  requireEqual(response.event.observationId, flowObservationId, `${label}.response observationId`);
  requireEqual(resource.ready.event.observationId, flowObservationId, `${label}.ready observationId`);
  requireEqual(completed.event.observationId, flowObservationId, `${label}.completed observationId`);
  requireEqual(completed.event.status, "opened", `${label}.completed.status`);

  const navigationStarts = context.ledgerRecords.filter((record) => (
    record.event.source === "resource-navigation"
      && record.event.phase === "start"
      && record.event.observationId === opened.event.observationId
      && record.eventOrdinal > selection.eventOrdinal
      && record.eventOrdinal < opened.eventOrdinal
  ));
  requireEqual(navigationStarts.length, 1, `${label}.opened navigation start count`);
  const navigationStart = navigationStarts[0];
  requireNonemptyString(navigationStart.event.workspaceKey, `${label}.opened workspaceKey`);
  requireEqual(navigationStart.event.projectKey, selectedProjectKey, `${label}.opened projectKey`);
  requireEqual(
    navigationStart.event.resourceIdentity,
    selectedResourceIdentity,
    `${label}.opened start resourceIdentity`,
  );
  requireEqual(navigationStart.event.childIdentity, null, `${label}.opened start childIdentity`);
  requireEqual(navigationStart.event.role, "resource", `${label}.opened start role`);
  requireEqual(navigationStart.event.placement, "preview", `${label}.opened start placement`);
  requireEqual(
    navigationStart.event.requestedFingerprint,
    response.event.fingerprint,
    `${label}.opened start requestedFingerprint`,
  );
  const workspaceIdentity = observedWorkspaceIdentity(navigationStart.event.workspaceKey);

  const scopedCurrentPublications = context.ledgerRecords.filter((record) => (
    record.event.source === "resource-explorer"
      && record.event.phase === "publish-complete"
      && record.event.publicationKind === "current"
      && record.event.workspaceIdentity === workspaceIdentity
      && record.eventOrdinal < response.eventOrdinal
  )).sort((left, right) => left.eventOrdinal - right.eventOrdinal);
  if (scopedCurrentPublications.length === 0) {
    throw new Error(`${label} has no completed scoped current publication before the resource response.`);
  }
  const currentPublication = scopedCurrentPublications.at(-1);
  const currentNodes = publicationNodes(context, currentPublication, `${label}.currentPublication`);
  validateQuickPickCurrentPublicationFrame(
    currentPublication,
    currentNodes,
    workspaceIdentity,
    context,
    `${label}.currentPublication`,
  );
  const currentMatches = currentNodes.filter((record) => (
    record.event.nodeKind === "resource"
      && record.event.navigationWorkspaceIdentity === workspaceIdentity
      && record.event.navigationProjectKey === selectedProjectKey
      && record.event.navigationResourceIdentity === selectedResourceIdentity
  ));
  requireEqual(currentMatches.length, 1, `${label}.currentPublication selected node count`);
  const currentNode = currentMatches[0];
  requireEqual(
    response.event.fingerprint,
    currentPublication.event.fingerprint,
    `${label}.response publication fingerprint`,
  );
  requireEqual(
    response.event.fingerprint,
    currentNode.event.navigationFingerprint,
    `${label}.response current navigation fingerprint`,
  );

  const baselineNode = baselineResourceNode(context, selectedResourceIdentity, selectedProjectKey);
  requireNonemptyString(
    baselineNode.event.navigationFingerprint,
    `${label}.baseline.navigationFingerprint`,
  );
  requireEqual(
    JSON.stringify(publicationNodeDurableShape(currentNode)),
    JSON.stringify(publicationNodeDurableShape(baselineNode)),
    `${label}.currentPublication selected durable shape`,
  );

  requireNoRelevantQuickPickInvalidation(
    currentPublication,
    response,
    navigationStart.event.workspaceKey,
    context,
    `${label}.currentPublication-to-response`,
  );
  requireNoRelevantQuickPickInvalidation(
    response,
    opened,
    navigationStart.event.workspaceKey,
    context,
    `${label}.response-to-open`,
  );

  const freshResponses = quickPickFlowEventsBetween(
    context,
    selection,
    navigationStart,
    flowObservationId,
    "fresh-request-response",
  );
  requireEqual(freshResponses.length, 1, `${label}.fresh response count`);
  const freshResponse = freshResponses[0];
  const revalidations = quickPickFlowEventsBetween(
    context,
    selection,
    navigationStart,
    flowObservationId,
    "revalidation",
  );
  requireEqual(revalidations.length, 1, `${label}.revalidation count`);
  const revalidation = revalidations[0];
  const resourceIdentityDigest = resourceIdentitySetSha256(selectedScope.resourceIdentityKeys);
  for (const [field, expected] of Object.entries({
    answerResult: "answered",
    answerCoverage: "complete",
    answerSelection: "exact",
    selectedProjectKey,
    selectedTemplateScopeIdentity: selectedScopeIdentity,
    templateCandidateCount: 1,
    soleTemplateCandidateScopeIdentity: selectedScopeIdentity,
    resourceIdentitySetSha256: resourceIdentityDigest,
    fingerprint: response.event.fingerprint,
    count: selectedScope.rowCount,
    status: "available",
  })) {
    requireEqual(freshResponse.event[field], expected, `${label}.freshResponse.${field}`);
  }
  requireEqual(revalidation.event.fingerprint, response.event.fingerprint, `${label}.revalidation.fingerprint`);
  requireEqual(revalidation.event.editorUnchanged, true, `${label}.revalidation.editorUnchanged`);
  requireEqual(revalidation.event.outcome, "available", `${label}.revalidation.outcome`);
  requireEqual(revalidation.event.rowCount, selectedScope.rowCount, `${label}.revalidation.rowCount`);
  requireStrictOrdinalOrder(
    [
      currentPublication,
      response,
      resource.ready,
      selection,
      freshResponse,
      revalidation,
      navigationStart,
      opened,
      completed,
    ],
    `${label} current flow`,
  );
  return Object.freeze({
    currentPublication,
    currentNode,
    freshResponse,
    revalidation,
    navigationStart,
  });
}

function validateQuickPickCurrentPublicationFrame(
  publication,
  nodes,
  workspaceIdentity,
  context,
  label,
) {
  requireNonemptyString(publication.event.fingerprint, `${label}.fingerprint`);
  requireEqual(publication.event.workspaceIdentity, workspaceIdentity, `${label}.workspaceIdentity`);
  const sameFrame = (record) => (
    record.event.source === "resource-explorer"
      && record.event.observationId === publication.event.observationId
      && record.event.generation === publication.event.generation
      && record.event.publicationKind === publication.event.publicationKind
  );
  const starts = context.ledgerRecords.filter((record) => (
    sameFrame(record) && record.event.phase === "publish-start"
  ));
  requireEqual(starts.length, 1, `${label} start count`);
  const start = starts[0];
  const completions = context.ledgerRecords.filter((record) => (
    sameFrame(record) && record.event.phase === "publish-complete"
  ));
  requireEqual(completions.length, 1, `${label} completion count`);
  requireEqual(completions[0].eventOrdinal, publication.eventOrdinal, `${label} completion receipt`);
  const globalNodes = context.ledgerRecords.filter((record) => (
    sameFrame(record) && record.event.phase === "publish-node"
  )).sort((left, right) => left.event.ordinal - right.event.ordinal);
  requireEqual(globalNodes.length, publication.event.nodeCount, `${label} global nodeCount`);
  requireArrayEqual(
    globalNodes.map((record) => record.eventOrdinal),
    nodes.map((record) => record.eventOrdinal),
    `${label} global frame membership`,
  );
  requireEqual(start.event.workspaceIdentity, workspaceIdentity, `${label}.start.workspaceIdentity`);
  requireEqual(start.event.fingerprint, publication.event.fingerprint, `${label}.start.fingerprint`);
  requireEqual(start.event.rootCount, publication.event.rootCount, `${label}.start.rootCount`);
  requireEqual(nodes.length, publication.event.nodeCount, `${label}.nodeCount`);
  requireEqual(
    nodes.filter((record) => record.event.parentId == null).length,
    publication.event.rootCount,
    `${label}.rootCount`,
  );
  const nodeIds = new Set();
  for (const [index, record] of nodes.entries()) {
    requireEqual(record.event.ordinal, index, `${label}.nodes[${index}].ordinal`);
    requireNonemptyString(record.event.nodeId, `${label}.nodes[${index}].nodeId`);
    requireUnique(nodeIds, record.event.nodeId, `${label}.nodes[${index}].nodeId`);
  }
  requireStrictOrdinalOrder([start, ...globalNodes, publication], `${label} frame`);
  validateScopedPublicationFingerprintCoherence(publication, nodes, label);
}

function quickPickFlowEventsBetween(context, start, end, observationId, phase) {
  return context.ledgerRecords.filter((record) => (
    record.event.source === "go-to-available-resource"
      && record.event.phase === phase
      && record.event.observationId === observationId
      && record.eventOrdinal > start.eventOrdinal
      && record.eventOrdinal < end.eventOrdinal
  ));
}

function requireNoRelevantQuickPickInvalidation(start, end, workspaceKey, context, label) {
  const invalidations = context.ledgerRecords.filter((record) => (
    record.event.source === "resource-explorer-view"
      && record.event.phase === "invalidation"
      && record.eventOrdinal > start.eventOrdinal
      && record.eventOrdinal < end.eventOrdinal
      && (record.event.scope === "all" || record.event.workspaceKey === workspaceKey)
  ));
  requireEqual(invalidations.length, 0, `${label} relevant invalidation count`);
}

function validateQuickPickModelFact(value, label, context, kind) {
  const selectedField = kind === "project"
    ? "selectedProjectKey"
    : kind === "template"
      ? "selectedTemplateScopeIdentity"
      : "selectedResourceIdentity";
  const fact = exactObject(value, [
    "ready",
    ...(kind === "resource" ? ["response"] : []),
    "selection",
    ...(kind === "resource" ? ["opened", "completed"] : []),
    "modelOrdinal",
    "itemCount",
    selectedField,
  ], label);
  requirePositiveInteger(fact.modelOrdinal, `${label}.modelOrdinal`);
  requirePositiveInteger(fact.itemCount, `${label}.itemCount`);
  requireIdentity(fact[selectedField], `${label}.${selectedField}`);
  const ready = resolveLedgerReference(
    fact.ready,
    `${label}.ready`,
    context,
    "resource-quick-pick",
    "model-ready",
  );
  const selection = resolveLedgerReference(
    fact.selection,
    `${label}.selection`,
    context,
    "go-to-available-resource",
    "availability-selection",
  );
  const response = kind === "resource"
    ? resolveLedgerReference(
        fact.response,
        `${label}.response`,
        context,
        "go-to-available-resource",
        "initial-request-response",
      )
    : null;
  const opened = kind === "resource"
    ? resolveLedgerReference(
        fact.opened,
        `${label}.opened`,
        context,
        "resource-navigation",
        "opened",
      )
    : null;
  const completed = kind === "resource"
    ? resolveLedgerReference(
        fact.completed,
        `${label}.completed`,
        context,
        "go-to-available-resource",
        "navigation-complete",
      )
    : null;
  requireEqual(ready.event.modelOrdinal, fact.modelOrdinal, `${label}.ready.modelOrdinal`);
  requireEqual(ready.event.itemCount, fact.itemCount, `${label}.ready.itemCount`);
  requireEqual(ready.event.observationId, selection.event.observationId, `${label}.selection observationId`);
  const observedItems = context.ledgerRecords.filter((record) => (
    record.event.source === "resource-quick-pick"
      && record.event.observationId === ready.event.observationId
      && record.event.phase === "model-item"
      && record.event.modelOrdinal === fact.modelOrdinal
  )).sort((left, right) => left.event.itemOrdinal - right.event.itemOrdinal);
  requireEqual(observedItems.length, fact.itemCount, `${label}.model-item count`);
  for (const [index, record] of observedItems.entries()) {
    requireEqual(record.event.itemOrdinal, index, `${label}.model-item[${index}].itemOrdinal`);
    requireEqual(record.event.itemKind, "item", `${label}.model-item[${index}].itemKind`);
  }
  if (kind === "resource") {
    requireEqual(response.event.observationId, ready.event.observationId, `${label}.response observationId`);
    requireEqual(completed.event.observationId, ready.event.observationId, `${label}.completed observationId`);
    requireEqual(completed.event.status, "opened", `${label}.completed.status`);
  }
  return { fact, ready, response, selection, opened, completed, items: observedItems };
}

export function validateEmptyQuickPickState(value, context, label, stateKind) {
  const expected = stateKind === "unowned"
    ? {
        projectSelection: "null",
        templateSelection: "unavailable",
        title: "Go to Resource Available to Active Template",
        placeholder: "Open an analyzed Aurelia template to see its available resources",
      }
    : stateKind === "no-cursor"
      ? {
          projectSelection: "exact",
          templateSelection: "absent",
          title: "No Aurelia template at the cursor",
          placeholder: "Move the cursor into an analyzed Aurelia template and try again",
        }
      : null;
  if (expected == null) throw new Error(`${label} has an unknown empty-state kind.`);
  const fact = exactObject(value, ["ready", "response"], label);
  const response = resolveLedgerReference(
    fact.response,
    `${label}.response`,
    context,
    "go-to-available-resource",
    "initial-request-response",
  );
  const ready = resolveLedgerReference(
    fact.ready,
    `${label}.ready`,
    context,
    "resource-quick-pick",
    "model-ready",
  );
  requireStrictOrdinalOrder([response, ready], label);
  requireEqual(response.event.observationId, ready.event.observationId, `${label} observationId`);
  requireEqual(response.event.projectSelection, expected.projectSelection, `${label}.response.projectSelection`);
  requireEqual(response.event.templateSelection, expected.templateSelection, `${label}.response.templateSelection`);
  requireEqual(response.event.status, "empty", `${label}.response.status`);
  requireEqual(response.event.count, 0, `${label}.response.count`);
  requireEqual(response.event.resourceCount, 0, `${label}.response.resourceCount`);
  requireEqual(ready.event.itemCount, 0, `${label}.ready.itemCount`);
  requireEqual(ready.event.title, expected.title, `${label}.ready.title`);
  requireEqual(ready.event.placeholder, expected.placeholder, `${label}.ready.placeholder`);
  if (expected.projectSelection === "null") {
    for (const field of [
      "answerResult",
      "answerCoverage",
      "answerSelection",
      "selectedProjectKey",
      "selectedTemplateScopeIdentity",
      "templateCandidateCount",
      "soleTemplateCandidateScopeIdentity",
      "resourceIdentitySetSha256",
      "fingerprint",
    ]) {
      requireEqual(response.event[field], null, `${label}.response.${field}`);
    }
  } else {
    requireEqual(response.event.answerResult, "answered", `${label}.response.answerResult`);
    requireEqual(response.event.answerCoverage, "complete", `${label}.response.answerCoverage`);
    requireEqual(response.event.answerSelection, "absent", `${label}.response.answerSelection`);
    requireEqual(response.event.selectedProjectKey, "host-alpha", `${label}.response.selectedProjectKey`);
    requireEqual(response.event.selectedTemplateScopeIdentity, null, `${label}.response.selectedTemplateScopeIdentity`);
    requireEqual(response.event.templateCandidateCount, 0, `${label}.response.templateCandidateCount`);
    requireEqual(
      response.event.soleTemplateCandidateScopeIdentity,
      null,
      `${label}.response.soleTemplateCandidateScopeIdentity`,
    );
    requireEqual(
      response.event.resourceIdentitySetSha256,
      resourceIdentitySetSha256([]),
      `${label}.response.resourceIdentitySetSha256`,
    );
    requireNonemptyString(response.event.fingerprint, `${label}.response.fingerprint`);
  }
}

function validateRecoveryFacts(value, context) {
  const label = "acceptance report facts.recovery";
  const facts = exactLaneFactObject(
    value,
    label,
    context.versionLane,
    ["partial", "newest"],
    ["totalFailure"],
  );
  const partial = exactObject(facts.partial, [
    "projectKey",
    "faultApplied",
    "failedPublication",
    "retry",
    "recoveredPublication",
    "retainedSiblingCount",
    "stableCodeVisibleCount",
  ], `${label}.partial`);
  requireEqual(partial.projectKey, "host-beta", `${label}.partial.projectKey`);
  const partialFault = resolveLedgerReference(
    partial.faultApplied,
    `${label}.partial.faultApplied`,
    context,
    "resource-discovery-host-control",
    "fault-applied",
  );
  requireEqual(partialFault.event.effect, "project-error-once", `${label}.partial.faultApplied.effect`);
  requireEqual(partialFault.event.projectKey, partial.projectKey, `${label}.partial.faultApplied.projectKey`);
  const partialFailed = resolveLedgerReference(
    partial.failedPublication,
    `${label}.partial.failedPublication`,
    context,
    "resource-explorer",
    "publish-complete",
  );
  requireEqual(partialFailed.event.publicationKind, "current", `${label}.partial.failedPublication.kind`);
  requireEqual(partialFailed.event.workspaceIdentity, null, `${label}.partial.failedPublication.workspaceIdentity`);
  requireEqual(partialFailed.event.fingerprint, null, `${label}.partial.failedPublication.fingerprint`);
  const partialNodes = publicationNodes(context, partialFailed, `${label}.partial.failedPublication`);
  const partialIssue = partialNodes.find((record) => (
    record.event.nodeKind === "project" && projectLabelIncludesKey(record.event.label, partial.projectKey)
  ));
  if (partialIssue == null) throw new Error(`${label}.partial did not publish the failed project row.`);
  requireEqual(partialIssue.event.contextValue, "resourceProjectIssue", `${label}.partial project contextValue`);
  requireEqual(partialIssue.event.answerResult, null, `${label}.partial project answerResult`);
  if (!partialIssue.event.description.includes("resources could not be loaded")) {
    throw new Error(`${label}.partial project row omits public failure copy.`);
  }
  const partialRetry = resolveLedgerReference(
    partial.retry,
    `${label}.partial.retry`,
    context,
    "resource-explorer-view",
    "retry",
  );
  requireEqual(partialRetry.event.admitted, true, `${label}.partial.retry.admitted`);
  requireNonemptyString(partialRetry.event.workspaceKey, `${label}.partial.retry.workspaceKey`);
  if (!fileWorkspaceKeyMatches(partialRetry.event.workspaceKey, context.workspaceRoot)) {
    throw new Error(`${label}.partial.retry.workspaceKey does not authenticate the routed workspace.`);
  }
  const partialRecovered = resolveLedgerReference(
    partial.recoveredPublication,
    `${label}.partial.recoveredPublication`,
    context,
    "resource-explorer",
    "publish-complete",
  );
  requireEqual(partialRecovered.event.publicationKind, "current", `${label}.partial.recoveredPublication.kind`);
  requireEqual(
    partialRecovered.event.workspaceIdentity,
    observedWorkspaceIdentity(partialRetry.event.workspaceKey),
    `${label}.partial.recoveredPublication.workspaceIdentity`,
  );
  const partialRecoveredNodes = publicationNodes(
    context,
    partialRecovered,
    `${label}.partial.recoveredPublication`,
  );
  validateScopedPublicationFingerprintCoherence(
    partialRecovered,
    partialRecoveredNodes,
    `${label}.partial.recoveredPublication`,
  );
  const recoveredFailedProject = projectNodeForKey(partialRecoveredNodes, partial.projectKey);
  requireEqual(
    recoveredFailedProject.event.contextValue,
    "resourceProject",
    `${label}.partial recovered project contextValue`,
  );
  requireEqual(
    recoveredFailedProject.event.answerResult,
    "answered",
    `${label}.partial recovered project answerResult`,
  );
  for (const projectKey of [partial.projectKey, "host-alpha"]) {
    requireEqual(
      JSON.stringify(projectPublicationDurableShape(partialRecoveredNodes, projectKey)),
      JSON.stringify(projectPublicationDurableShape(context.baseline.nodes, projectKey)),
      `${label}.partial recovered ${projectKey} subtree`,
    );
  }
  requireStrictOrdinalOrder(
    [partialFault, partialFailed, partialRetry, partialRecovered],
    `${label}.partial`,
  );
  requirePositiveInteger(partial.retainedSiblingCount, `${label}.partial.retainedSiblingCount`);
  const retainedSiblings = publicationResourceCountForProject(partialNodes, "host-alpha");
  requireEqual(retainedSiblings, partial.retainedSiblingCount, `${label}.partial retained sibling count`);
  validateStableCodeVisibility(
    partial.stableCodeVisibleCount,
    partialFault,
    context,
    `${label}.partial.stableCodeVisibleCount`,
  );
  context.recovery.set("partial", { outputTargetNodeIds: new Set([partialIssue.event.nodeId]) });
  context.claims.add("partial");

  const newest = exactObject(facts.newest, [
    "faultApplied",
    "outOfDatePublication",
    "navigationFaultApplied",
    "recoveryPresented",
    "recoveryChoice",
    "retryInvalidated",
    "recoveredPublication",
    "retainedRowCount",
    "stableCodeVisibleCount",
  ], `${label}.newest`);
  const newestFault = resolveLedgerReference(
    newest.faultApplied,
    `${label}.newest.faultApplied`,
    context,
    "resource-discovery-host-control",
    "fault-applied",
  );
  requireEqual(newestFault.event.effect, "newest-error-once", `${label}.newest.faultApplied.effect`);
  const outOfDate = resolveLedgerReference(
    newest.outOfDatePublication,
    `${label}.newest.outOfDatePublication`,
    context,
    "resource-explorer",
    "publish-complete",
  );
  requireEqual(outOfDate.event.publicationKind, "current", `${label}.newest.outOfDatePublication.kind`);
  requireEqual(outOfDate.event.workspaceIdentity, null, `${label}.newest.outOfDatePublication.workspaceIdentity`);
  requireEqual(outOfDate.event.fingerprint, null, `${label}.newest.outOfDatePublication.fingerprint`);
  const outOfDateNodes = publicationNodes(context, outOfDate, `${label}.newest.outOfDatePublication`);
  if (!outOfDateNodes.some((record) => record.event.rowStates.split("|").includes("out-of-date"))) {
    throw new Error(`${label}.newest publication does not expose an out-of-date row state.`);
  }
  const newestNavigationFault = resolveLedgerReference(
    newest.navigationFaultApplied,
    `${label}.newest.navigationFaultApplied`,
    context,
    "resource-discovery-host-control",
    "fault-applied",
  );
  requireEqual(
    newestNavigationFault.event.effect,
    "project-error-once",
    `${label}.newest.navigationFaultApplied.effect`,
  );
  requireEqual(
    newestNavigationFault.event.projectKey,
    "host-alpha",
    `${label}.newest.navigationFaultApplied.projectKey`,
  );
  requireEqual(
    newestNavigationFault.event.stableCode,
    "AURELIA_RD_C2_NEWEST_NAV",
    `${label}.newest.navigationFaultApplied.stableCode`,
  );
  requirePositiveInteger(
    newestNavigationFault.event.requestOrdinal,
    `${label}.newest.navigationFaultApplied.requestOrdinal`,
  );
  if (!fileWorkspaceKeyMatches(newestNavigationFault.event.workspaceKey, context.workspaceRoot)) {
    throw new Error(`${label}.newest.navigationFaultApplied.workspaceKey does not authenticate the routed workspace.`);
  }
  const presented = resolveLedgerReference(
    newest.recoveryPresented,
    `${label}.newest.recoveryPresented`,
    context,
    "resource-explorer-view",
    "recovery-presented",
  );
  requirePositiveInteger(presented.event.actionCount, `${label}.newest.recoveryPresented.actionCount`);
  validateRecoveryPresentation(presented, `${label}.newest.recoveryPresented`);
  const choice = resolveLedgerReference(
    newest.recoveryChoice,
    `${label}.newest.recoveryChoice`,
    context,
    presented.event.source,
    "recovery-choice",
  );
  requireEqual(choice.event.observationId, presented.event.observationId, `${label}.newest recovery observationId`);
  requireEqual(choice.event.choice, "Retry", `${label}.newest.recoveryChoice.choice`);
  const newestRetryInvalidated = resolveLedgerReference(
    newest.retryInvalidated,
    `${label}.newest.retryInvalidated`,
    context,
    "resource-explorer-view",
    "invalidation",
  );
  requireEqual(
    newestRetryInvalidated.event.scope,
    "workspace",
    `${label}.newest.retryInvalidated.scope`,
  );
  requireNonemptyString(
    newestRetryInvalidated.event.workspaceKey,
    `${label}.newest.retryInvalidated.workspaceKey`,
  );
  requireEqual(
    newestNavigationFault.event.workspaceKey,
    newestRetryInvalidated.event.workspaceKey,
    `${label}.newest navigation fault workspace`,
  );
  if (!fileWorkspaceKeyMatches(newestRetryInvalidated.event.workspaceKey, context.workspaceRoot)) {
    throw new Error(`${label}.newest.retryInvalidated.workspaceKey does not authenticate the routed workspace.`);
  }
  const newestRecovered = resolveLedgerReference(
    newest.recoveredPublication,
    `${label}.newest.recoveredPublication`,
    context,
    "resource-explorer",
    "publish-complete",
  );
  requireEqual(newestRecovered.event.publicationKind, "current", `${label}.newest.recoveredPublication.kind`);
  requireEqual(
    newestRecovered.event.workspaceIdentity,
    observedWorkspaceIdentity(newestRetryInvalidated.event.workspaceKey),
    `${label}.newest.recoveredPublication.workspaceIdentity`,
  );
  const newestRecoveredNodes = publicationNodes(
    context,
    newestRecovered,
    `${label}.newest.recoveredPublication`,
  );
  validateScopedPublicationFingerprintCoherence(
    newestRecovered,
    newestRecoveredNodes,
    `${label}.newest.recoveredPublication`,
  );
  validateIssuePublicationConservation(
    newestRecoveredNodes,
    context.baseline.nodes,
    `${label}.newest recovered baseline issue rows`,
  );
  const newestRecoveredHostAlpha = projectNodeForKey(newestRecoveredNodes, "host-alpha");
  const baselineHostAlpha = projectNodeForKey(context.baseline.nodes, "host-alpha");
  requireEqual(
    newestRecoveredHostAlpha.event.answerResult,
    baselineHostAlpha.event.answerResult,
    `${label}.newest recovered host-alpha answerResult`,
  );
  requireEqual(
    newestRecoveredHostAlpha.event.answerCoverage,
    baselineHostAlpha.event.answerCoverage,
    `${label}.newest recovered host-alpha answerCoverage`,
  );
  if (newestRecoveredNodes.some((record) => (
    rowStatesInclude(record.event, "out-of-date") || rowStatesInclude(record.event, "updating")
  ))) {
    throw new Error(`${label}.newest recovered publication retains stale or updating rows.`);
  }
  requireEqual(
    JSON.stringify(projectPublicationDurableShape(newestRecoveredNodes, "host-alpha")),
    JSON.stringify(projectPublicationDurableShape(context.baseline.nodes, "host-alpha")),
    `${label}.newest recovered host-alpha subtree`,
  );
  requireStrictOrdinalOrder(
    [newestFault, outOfDate, newestNavigationFault, presented, choice, newestRetryInvalidated, newestRecovered],
    `${label}.newest`,
  );
  requirePositiveInteger(newest.retainedRowCount, `${label}.newest.retainedRowCount`);
  const retainedRows = outOfDateNodes.filter((record) => record.event.nodeKind === "resource").length;
  requireEqual(retainedRows, newest.retainedRowCount, `${label}.newest retained row count`);
  validateStableCodeVisibility(
    newest.stableCodeVisibleCount,
    newestFault,
    context,
    `${label}.newest.stableCodeVisibleCount`,
  );
  validateStableCodeVisibility(
    newest.stableCodeVisibleCount,
    newestNavigationFault,
    context,
    `${label}.newest.navigationStableCodeVisibleCount`,
  );
  context.recovery.set("newest", {
    outputTargetNodeIds: recoveryOutputTargetNodeIds(
      outOfDateNodes,
      context.baseline.nodes,
    ),
  });
  context.claims.add("stale");

  if (context.versionLane === "current-stable") {
    validateTotalFailureRecovery(facts.totalFailure, context, `${label}.totalFailure`);
  }
}

function validateTotalFailureRecovery(value, context, label) {
  const fact = exactObject(value, [
    "faultApplied",
    "failedPublication",
    "affectedProjects",
    "navigationFaultApplied",
    "recoveryPresented",
    "recoveryChoice",
    "recoveries",
    "finalState",
    "stableCodeVisibleCount",
  ], label);
  const fault = resolveLedgerReference(
    fact.faultApplied,
    `${label}.faultApplied`,
    context,
    "resource-discovery-host-control",
    "fault-applied",
  );
  requireEqual(fault.event.effect, "all-error-once", `${label}.faultApplied.effect`);
  const failed = resolveLedgerReference(
    fact.failedPublication,
    `${label}.failedPublication`,
    context,
    "resource-explorer",
    "publish-complete",
  );
  requireEqual(failed.event.publicationKind, "current", `${label}.failedPublication.kind`);
  requireEqual(failed.event.workspaceIdentity, null, `${label}.failedPublication.workspaceIdentity`);
  requireEqual(failed.event.fingerprint, null, `${label}.failedPublication.fingerprint`);
  const failedNodes = publicationNodes(context, failed, `${label}.failedPublication`);
  const issueNodes = failedNodes.filter((record) => (
    record.event.nodeKind === "project"
      && record.event.contextValue === "resourceProjectIssue"
  ));
  if (issueNodes.length === 0) throw new Error(`${label} did not publish actionable project failure rows.`);
  const baselineProjects = context.baseline.projectNodes.map((record, index) => (
    baselineProjectBoundary(record, context, `${label}.baselineProjects[${index}]`)
  ));
  const baselineByNodeId = new Map(baselineProjects.map((project) => [project.nodeId, project]));
  requireArrayEqual(
    issueNodes.map((record) => record.event.nodeId).sort(codeUnitOrder),
    baselineProjects.map((project) => project.nodeId).sort(codeUnitOrder),
    `${label} failed project node IDs`,
  );
  for (const [index, issue] of issueNodes.entries()) {
    requireEqual(issue.event.nodeKind, "project", `${label}.failedProjectNodes[${index}].nodeKind`);
    requireEqual(issue.event.answerResult, null, `${label}.failedProjectNodes[${index}].answerResult`);
    requireEqual(issue.event.answerCoverage, null, `${label}.failedProjectNodes[${index}].answerCoverage`);
    requireEqual(issue.event.answerRowCount, null, `${label}.failedProjectNodes[${index}].answerRowCount`);
    requireEqual(issue.event.rowStates, "", `${label}.failedProjectNodes[${index}].rowStates`);
    if (
      typeof issue.event.description !== "string"
      || !issue.event.description.includes("resources could not be loaded")
    ) {
      throw new Error(`${label}.failedProjectNodes[${index}] omits the shipping failure copy.`);
    }
  }

  const affectedGroups = [];
  const groupByWorkspaceIdentity = new Map();
  for (const issue of issueNodes) {
    const project = baselineByNodeId.get(issue.event.nodeId);
    if (project == null) {
      throw new Error(`${label} failed project ${issue.event.nodeId} has no baseline project boundary.`);
    }
    let group = groupByWorkspaceIdentity.get(project.workspaceIdentity);
    if (group == null) {
      group = {
        workspaceIdentity: project.workspaceIdentity,
        fingerprint: project.fingerprint,
        representative: issue,
        projects: [],
      };
      groupByWorkspaceIdentity.set(project.workspaceIdentity, group);
      affectedGroups.push(group);
    }
    requireEqual(project.fingerprint, group.fingerprint, `${label} affected workspace fingerprint`);
    group.projects.push(project);
  }
  requireEqual(affectedGroups.length, 2, `${label} distinct affected workspace count`);

  const affectedProjects = requireObjectArray(
    fact.affectedProjects,
    `${label}.affectedProjects`,
    affectedGroups.length,
  ).map((value, index) => {
    const affectedLabel = `${label}.affectedProjects[${index}]`;
    const affected = exactObject(value, [
      "workspaceIdentity",
      "projectKey",
      "nodeId",
      "published",
    ], affectedLabel);
    const group = affectedGroups[index];
    const project = baselineByNodeId.get(group.representative.event.nodeId);
    const published = resolveLedgerReference(
      affected.published,
      `${affectedLabel}.published`,
      context,
      "resource-explorer",
      "publish-node",
    );
    requireEqual(published.eventOrdinal, group.representative.eventOrdinal, `${affectedLabel}.published ordinal`);
    requireEqual(published.event.observationId, failed.event.observationId, `${affectedLabel}.published observationId`);
    requireEqual(published.event.generation, failed.event.generation, `${affectedLabel}.published generation`);
    requireEqual(published.event.publicationKind, failed.event.publicationKind, `${affectedLabel}.published kind`);
    requireEqual(affected.workspaceIdentity, group.workspaceIdentity, `${affectedLabel}.workspaceIdentity`);
    requireEqual(affected.projectKey, project.projectKey, `${affectedLabel}.projectKey`);
    requireEqual(affected.nodeId, group.representative.event.nodeId, `${affectedLabel}.nodeId`);
    return Object.freeze({ ...affected, published, group });
  });
  const navigationFault = resolveLedgerReference(
    fact.navigationFaultApplied,
    `${label}.navigationFaultApplied`,
    context,
    "resource-discovery-host-control",
    "fault-applied",
  );
  requireEqual(navigationFault.event.effect, "project-error-once", `${label}.navigationFaultApplied.effect`);
  requireEqual(navigationFault.event.projectKey, "host-alpha", `${label}.navigationFaultApplied.projectKey`);
  requireEqual(
    navigationFault.event.stableCode,
    "AURELIA_RD_C2_TOTAL_NAV",
    `${label}.navigationFaultApplied.stableCode`,
  );
  requirePositiveInteger(
    navigationFault.event.requestOrdinal,
    `${label}.navigationFaultApplied.requestOrdinal`,
  );
  if (!fileWorkspaceKeyMatches(navigationFault.event.workspaceKey, context.workspaceRoot)) {
    throw new Error(`${label}.navigationFaultApplied.workspaceKey does not authenticate the routed workspace.`);
  }
  const presented = resolveLedgerReference(
    fact.recoveryPresented,
    `${label}.recoveryPresented`,
    context,
    "go-to-available-resource",
    "recovery-presented",
  );
  validateRecoveryPresentation(presented, `${label}.recoveryPresented`);
  const choice = resolveLedgerReference(
    fact.recoveryChoice,
    `${label}.recoveryChoice`,
    context,
    presented.event.source,
    "recovery-choice",
  );
  requireEqual(choice.event.observationId, presented.event.observationId, `${label} recovery observationId`);
  requireEqual(choice.event.choice, "Retry", `${label}.recoveryChoice.choice`);

  const recoveries = requireObjectArray(
    fact.recoveries,
    `${label}.recoveries`,
    affectedProjects.length,
  ).map((value, index) => {
    const recoveryLabel = `${label}.recoveries[${index}]`;
    const recovery = exactObject(value, [
      "workspaceIdentity",
      "targetNodeId",
      "retry",
      "recoveredPublication",
    ], recoveryLabel);
    const retry = resolveLedgerReference(
      recovery.retry,
      `${recoveryLabel}.retry`,
      context,
      "resource-explorer-view",
      "retry",
    );
    requireEqual(retry.event.admitted, true, `${recoveryLabel}.retry.admitted`);
    requireNonemptyString(retry.event.workspaceKey, `${recoveryLabel}.retry.workspaceKey`);
    const recovered = resolveLedgerReference(
      recovery.recoveredPublication,
      `${recoveryLabel}.recoveredPublication`,
      context,
      "resource-explorer",
      "publish-complete",
    );
    requireEqual(recovered.event.publicationKind, "current", `${recoveryLabel}.recoveredPublication.kind`);
    requireEqual(
      recovered.event.workspaceIdentity,
      observedWorkspaceIdentity(retry.event.workspaceKey),
      `${recoveryLabel}.recoveredPublication.workspaceIdentity`,
    );
    const nodes = publicationNodes(context, recovered, `${recoveryLabel}.recoveredPublication`);
    validateScopedPublicationFingerprintCoherence(recovered, nodes, `${recoveryLabel}.recoveredPublication`);
    requireEqual(recovered.event.nodeCount, nodes.length, `${recoveryLabel}.recoveredPublication.nodeCount`);
    requireEqual(
      recovered.event.rootCount,
      nodes.filter((record) => record.event.parentId == null).length,
      `${recoveryLabel}.recoveredPublication.rootCount`,
    );
    return Object.freeze({ ...recovery, retry, recovered, nodes });
  });
  validateTotalRecoveryWorkspaceSequence(affectedProjects, recoveries, label);
  for (const [index, recovery] of recoveries.entries()) {
    const recoveryLabel = `${label}.recoveries[${index}]`;
    const expectedPath = index === 0 ? join(dirname(context.workspaceRoot), "hello-world") : context.workspaceRoot;
    if (!fileWorkspaceKeyMatches(recovery.retry.event.workspaceKey, expectedPath)) {
      throw new Error(`${recoveryLabel}.retry.workspaceKey does not authenticate ${expectedPath}.`);
    }
    const expectedRemainingIssueIds = expectedRecoveryIssueProjectNodeIds(
      affectedProjects,
      index,
      context.baseline.nodes
        .filter((record) => (
          record.event.nodeKind === "project"
            && record.event.contextValue === "resourceProjectIssue"
        ))
        .map((record) => record.event.nodeId),
    );
    const observedRemainingIssueIds = recovery.nodes
      .filter((record) => (
        record.event.nodeKind === "project"
          && record.event.contextValue === "resourceProjectIssue"
      ))
      .map((record) => record.event.nodeId)
      .sort(codeUnitOrder);
    requireArrayEqual(
      observedRemainingIssueIds,
      expectedRemainingIssueIds,
      `${recoveryLabel} remaining issue project node IDs`,
    );
    for (const [workspaceIndex, group] of affectedGroups.entries()) {
      const expectedNodes = workspaceIndex <= index ? context.baseline.nodes : failedNodes;
      const expectedState = workspaceIndex <= index ? "authenticated baseline" : "controlled failure";
      for (const project of group.projects) {
        requireEqual(
          JSON.stringify(projectPublicationRecoveryShapeByNodeId(
            recovery.nodes,
            project.nodeId,
            `${recoveryLabel} current project ${project.nodeId}`,
          )),
          JSON.stringify(projectPublicationRecoveryShapeByNodeId(
            expectedNodes,
            project.nodeId,
            `${recoveryLabel} expected project ${project.nodeId}`,
          )),
          `${recoveryLabel} project ${project.nodeId} ${expectedState} shape`,
        );
      }
    }
  }
  const orderedRecoveryRecords = [fault, failed, navigationFault, presented, choice];
  for (const recovery of recoveries) orderedRecoveryRecords.push(recovery.retry, recovery.recovered);
  requireStrictOrdinalOrder(orderedRecoveryRecords, label);

  const final = recoveries.at(-1);
  const finalState = exactObject(fact.finalState, [
    "nodeCount",
    "rootCount",
    "projectCount",
    "resourceCount",
    "issueRowCount",
    "outOfDateRowCount",
  ], `${label}.finalState`);
  const finalComputed = {
    nodeCount: final.nodes.length,
    rootCount: final.nodes.filter((record) => record.event.parentId == null).length,
    projectCount: final.nodes.filter((record) => record.event.nodeKind === "project").length,
    resourceCount: final.nodes.filter((record) => record.event.nodeKind === "resource").length,
    issueRowCount: final.nodes.filter((record) => record.event.contextValue === "resourceProjectIssue").length,
    outOfDateRowCount: final.nodes.filter((record) => rowStatesInclude(record.event, "out-of-date")).length,
  };
  for (const [field, count] of Object.entries(finalComputed)) {
    requireNonNegativeInteger(finalState[field], `${label}.finalState.${field}`);
    requireEqual(finalState[field], count, `${label}.finalState.${field}`);
  }
  requireEqual(
    finalState.issueRowCount,
    issuePublicationDurableShapes(context.baseline.nodes).length,
    `${label}.finalState.issueRowCount`,
  );
  requireEqual(finalState.outOfDateRowCount, 0, `${label}.finalState.outOfDateRowCount`);
  requireEqual(
    final.nodes.filter((record) => rowStatesInclude(record.event, "updating")).length,
    0,
    `${label}.finalState.updatingRowCount`,
  );
  requireEqual(
    JSON.stringify(final.nodes.map(publicationNodeDurableShape)),
    JSON.stringify(context.baseline.nodes.map(publicationNodeDurableShape)),
    `${label}.finalState baseline publication shape`,
  );
  validateFinalRecoveredWorkspaceFingerprints(
    final.nodes,
    recoveries.map((recovery) => ({
      workspaceIdentity: recovery.workspaceIdentity,
      fingerprint: recovery.recovered.event.fingerprint,
    })),
    `${label}.finalState workspace fingerprints`,
  );
  validateStableCodeVisibility(fact.stableCodeVisibleCount, fault, context, `${label}.stableCodeVisibleCount`);
  validateStableCodeVisibility(
    fact.stableCodeVisibleCount,
    navigationFault,
    context,
    `${label}.navigationStableCodeVisibleCount`,
  );
  context.recovery.set("totalFailure", {
    outputTargetNodeIds: new Set(issueNodes.map((record) => record.event.nodeId)),
  });
  context.claims.add("total-failure");
}

export function validateTotalRecoveryWorkspaceSequence(affectedProjects, recoveries, label) {
  if (!Array.isArray(affectedProjects) || affectedProjects.length < 2) {
    throw new Error(`${label}.affectedProjects must authenticate at least two workspace boundaries.`);
  }
  if (!Array.isArray(recoveries) || recoveries.length !== affectedProjects.length) {
    throw new Error(
      `${label}.recoveries must contain one serial recovery for each affected workspace boundary.`,
    );
  }
  const workspaceIdentities = new Set();
  for (const [index, affected] of affectedProjects.entries()) {
    const recovery = recoveries[index];
    requireIdentity(affected.workspaceIdentity, `${label}.affectedProjects[${index}].workspaceIdentity`);
    requireUnique(
      workspaceIdentities,
      affected.workspaceIdentity,
      `${label}.affectedProjects[${index}].workspaceIdentity`,
    );
    requireEqual(
      recovery.workspaceIdentity,
      affected.workspaceIdentity,
      `${label}.recoveries[${index}].workspaceIdentity`,
    );
    requireEqual(
      recovery.targetNodeId,
      affected.nodeId,
      `${label}.recoveries[${index}].targetNodeId`,
    );
    requireEqual(
      observedWorkspaceIdentity(recovery.retry.event.workspaceKey),
      affected.workspaceIdentity,
      `${label}.recoveries[${index}].retry workspace identity`,
    );
  }
}

function baselineProjectBoundary(record, context, label) {
  requireEqual(record.event.nodeKind, "project", `${label}.nodeKind`);
  const descendants = descendantRecords(context.baseline.nodes, record.event.nodeId);
  const workspaceIdentities = new Set();
  const projectKeys = new Set();
  const fingerprints = new Set();
  for (const descendant of descendants) {
    for (const workspaceIdentity of [
      descendant.event.navigationWorkspaceIdentity,
      descendant.event.implementationWorkspaceIdentity,
    ]) {
      if (workspaceIdentity != null) workspaceIdentities.add(workspaceIdentity);
    }
    for (const projectKey of [
      descendant.event.navigationProjectKey,
      descendant.event.implementationProjectKey,
    ]) {
      if (projectKey != null) projectKeys.add(projectKey);
    }
    for (const fingerprint of [
      descendant.event.navigationFingerprint,
      descendant.event.implementationFingerprint,
    ]) {
      if (fingerprint != null) fingerprints.add(fingerprint);
    }
  }
  if (workspaceIdentities.size !== 1) {
    throw new Error(`${label} must resolve exactly one workspace identity from baseline descendants.`);
  }
  if (projectKeys.size !== 1) {
    throw new Error(`${label} must resolve exactly one project key from baseline descendants.`);
  }
  if (fingerprints.size !== 1) {
    throw new Error(`${label} must resolve exactly one fingerprint from baseline descendants.`);
  }
  return Object.freeze({
    nodeId: record.event.nodeId,
    workspaceIdentity: [...workspaceIdentities][0],
    projectKey: [...projectKeys][0],
    fingerprint: [...fingerprints][0],
  });
}

function observedWorkspaceIdentity(workspaceKey) {
  requireNonemptyString(workspaceKey, "observed workspace key");
  return `workspace:${sha256(workspaceKey)}`;
}

function rowStatesInclude(event, state) {
  return typeof event.rowStates === "string" && event.rowStates.split("|").includes(state);
}

export function publicationNodeDurableShape(record) {
  const fields = [
    "ordinal",
    "parentId",
    "nodeId",
    "nodeKind",
    "label",
    "description",
    "accessibilityLabel",
    "contextValue",
    "command",
    "navigationWorkspaceIdentity",
    "navigationProjectKey",
    "navigationResourceIdentity",
    "navigationChildIdentity",
    "navigationRole",
    "navigationPlacement",
    "implementationAvailable",
    "implementationWorkspaceIdentity",
    "implementationProjectKey",
    "implementationResourceIdentity",
    "implementationRole",
    "implementationPlacement",
    "collapsible",
    "defaultExpanded",
    "rowStates",
    "answerResult",
    "answerCoverage",
    "answerRowCount",
  ];
  return Object.fromEntries(fields.map((field) => [field, record.event[field]]));
}

function publicationFingerprintSetsByWorkspace(nodes, label) {
  const fingerprintsByWorkspace = new Map();
  for (const [index, record] of nodes.entries()) {
    for (const lane of ["navigation", "implementation"]) {
      const workspaceIdentity = record.event[`${lane}WorkspaceIdentity`];
      const fingerprint = record.event[`${lane}Fingerprint`];
      requireEqual(
        workspaceIdentity == null,
        fingerprint == null,
        `${label}.nodes[${index}].${lane} workspace/fingerprint presence`,
      );
      if (workspaceIdentity == null) continue;
      let fingerprints = fingerprintsByWorkspace.get(workspaceIdentity);
      if (fingerprints == null) {
        fingerprints = new Set();
        fingerprintsByWorkspace.set(workspaceIdentity, fingerprints);
      }
      fingerprints.add(fingerprint);
    }
  }
  return fingerprintsByWorkspace;
}

export function validateScopedPublicationFingerprintCoherence(publication, nodes, label) {
  requireEqual(publication.event.source, "resource-explorer", `${label}.source`);
  requireEqual(publication.event.phase, "publish-complete", `${label}.phase`);
  requireEqual(publication.event.publicationKind, "current", `${label}.publicationKind`);
  requireNonemptyString(publication.event.workspaceIdentity, `${label}.workspaceIdentity`);
  requireNonemptyString(publication.event.fingerprint, `${label}.fingerprint`);
  if (!Array.isArray(nodes) || nodes.length === 0) throw new Error(`${label}.nodes must be nonempty.`);
  requireEqual(nodes.length, publication.event.nodeCount, `${label}.nodeCount`);
  for (const [index, record] of nodes.entries()) {
    requireEqual(record.event.source, "resource-explorer", `${label}.nodes[${index}].source`);
    requireEqual(record.event.phase, "publish-node", `${label}.nodes[${index}].phase`);
    requireEqual(record.event.observationId, publication.event.observationId, `${label}.nodes[${index}].observationId`);
    requireEqual(record.event.generation, publication.event.generation, `${label}.nodes[${index}].generation`);
    requireEqual(record.event.publicationKind, publication.event.publicationKind, `${label}.nodes[${index}].publicationKind`);
  }
  const fingerprintsByWorkspace = publicationFingerprintSetsByWorkspace(nodes, label);
  const targetFingerprints = fingerprintsByWorkspace.get(publication.event.workspaceIdentity);
  if (targetFingerprints == null || targetFingerprints.size === 0) {
    throw new Error(`${label} must authenticate at least one target workspace navigation lane.`);
  }
  requireArrayEqual(
    [...targetFingerprints],
    [publication.event.fingerprint],
    `${label} target workspace fingerprints`,
  );
}

export function validateFinalRecoveredWorkspaceFingerprints(nodes, recoveries, label) {
  if (!Array.isArray(nodes) || nodes.length === 0) throw new Error(`${label}.nodes must be nonempty.`);
  if (!Array.isArray(recoveries) || recoveries.length !== 2) {
    throw new Error(`${label}.recoveries must contain exactly two workspace recoveries.`);
  }
  const expected = new Map();
  const expectedWorkspaceIdentities = new Set();
  for (const [index, recovery] of recoveries.entries()) {
    requireNonemptyString(recovery.workspaceIdentity, `${label}.recoveries[${index}].workspaceIdentity`);
    requireNonemptyString(recovery.fingerprint, `${label}.recoveries[${index}].fingerprint`);
    requireUnique(
      expectedWorkspaceIdentities,
      recovery.workspaceIdentity,
      `${label}.recoveries[${index}].workspaceIdentity`,
    );
    expected.set(recovery.workspaceIdentity, recovery.fingerprint);
  }
  const observed = publicationFingerprintSetsByWorkspace(nodes, label);
  requireArrayEqual(
    [...observed.keys()].sort(codeUnitOrder),
    [...expected.keys()].sort(codeUnitOrder),
    `${label} workspace identities`,
  );
  for (const [workspaceIdentity, fingerprint] of expected) {
    requireArrayEqual(
      [...observed.get(workspaceIdentity)],
      [fingerprint],
      `${label} ${workspaceIdentity} latest fingerprint`,
    );
  }
}

export function issuePublicationDurableShapes(nodes) {
  return nodes
    .filter((record) => record.event.contextValue === "resourceProjectIssue")
    .map(publicationNodeDurableShape);
}

export function validateIssuePublicationConservation(actualNodes, baselineNodes, label) {
  requireEqual(
    JSON.stringify(issuePublicationDurableShapes(actualNodes)),
    JSON.stringify(issuePublicationDurableShapes(baselineNodes)),
    label,
  );
}

export function recoveryOutputTargetNodeIds(nodes, baselineNodes) {
  const baselineByNodeId = new Map(baselineNodes.map((record) => [record.event.nodeId, record]));
  return new Set(nodes
    .filter((record) => {
      if (
        record.event.contextValue !== "resourceProjectIssue"
        || !rowStatesInclude(record.event, "out-of-date")
      ) return false;
      const baseline = baselineByNodeId.get(record.event.nodeId);
      return baseline == null
        || JSON.stringify(publicationNodeDurableShape(record))
          !== JSON.stringify(publicationNodeDurableShape(baseline));
    })
    .map((record) => record.event.nodeId));
}

export function expectedRecoveryIssueProjectNodeIds(
  affectedProjects,
  recoveredWorkspaceIndex,
  baselineIssueProjectNodeIds,
) {
  return [...new Set([
    ...baselineIssueProjectNodeIds,
    ...affectedProjects
      .slice(recoveredWorkspaceIndex + 1)
      .flatMap((affected) => affected.group.projects.map((project) => project.nodeId)),
  ])].sort(codeUnitOrder);
}

function projectPublicationDurableShape(nodes, projectKey) {
  const project = projectNodeForKey(nodes, projectKey);
  return [project, ...descendantRecords(nodes, project.event.nodeId)].map(publicationNodeDurableShape);
}

function projectPublicationRecoveryShapeByNodeId(nodes, nodeId, label) {
  const matches = nodes.filter((record) => (
    record.event.nodeKind === "project" && record.event.nodeId === nodeId
  ));
  if (matches.length !== 1) {
    throw new Error(`${label} must contain exactly one project node.`);
  }
  const project = matches[0];
  return [project, ...descendantRecords(nodes, project.event.nodeId)].map((record) => {
    const shape = { ...publicationNodeDurableShape(record) };
    for (const field of ["ordinal", "description", "accessibilityLabel"]) delete shape[field];
    return shape;
  });
}

function codeUnitOrder(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function validateRecoveryPresentation(record, label) {
  requireEqual(record.event.actionCount, 2, `${label}.actionCount`);
  requireEqual(record.event.retryActionLabel, "Retry", `${label}.retryActionLabel`);
  requireEqual(record.event.outputActionLabel, "Open Aurelia Output", `${label}.outputActionLabel`);
  const allowedMessages = record.event.source === "resource-explorer-view"
    ? ["The Aurelia resource could not be opened. Try again or open Aurelia Output for details."]
    : [
        "Aurelia resource discovery couldn't load resources for the active template.",
        "Aurelia resource discovery couldn't refresh resources for the active template.",
        "Aurelia couldn't open the selected resource.",
      ];
  if (!allowedMessages.includes(record.event.message)) {
    throw new Error(`${label}.message is not the exact safe shipping recovery copy.`);
  }
}

function validateOutputFacts(value, context) {
  const label = "acceptance report facts.output";
  const facts = exactLaneFactObject(
    value,
    label,
    context.versionLane,
    ["partial", "newest", "treeActionRequestCount"],
    ["totalFailure"],
  );
  validateOutputRequestFact(facts.partial, context, `${label}.partial`);
  validateOutputRequestFact(facts.newest, context, `${label}.newest`);
  const expectedTreeActionCount = context.versionLane === "current-stable" ? 3 : 2;
  requireEqual(facts.treeActionRequestCount, expectedTreeActionCount, `${label}.treeActionRequestCount`);
  const observedTreeActions = context.ledgerRecords.filter((record) => (
    record.event.source === "resource-explorer-view"
      && record.event.phase === "output-requested"
      && record.event.origin === "tree-action"
  )).length;
  requireEqual(observedTreeActions, facts.treeActionRequestCount, `${label} computed treeActionRequestCount`);
  if (context.versionLane === "current-stable") {
    validateOutputRequestFact(facts.totalFailure, context, `${label}.totalFailure`);
  }
}

function validateOutputRequestFact(value, context, label) {
  const fact = exactObject(value, ["targetNodeId", "requested"], label);
  requireNonemptyString(fact.targetNodeId, `${label}.targetNodeId`);
  const requested = resolveLedgerReference(
    fact.requested,
    `${label}.requested`,
    context,
    "resource-explorer-view",
    "output-requested",
  );
  requireEqual(requested.event.origin, "tree-action", `${label}.requested.origin`);
  const flow = label.endsWith(".partial")
    ? "partial"
    : label.endsWith(".newest")
      ? "newest"
      : "totalFailure";
  if (!context.recovery.get(flow)?.outputTargetNodeIds.has(fact.targetNodeId)) {
    throw new Error(`${label}.targetNodeId is not an authenticated actionable failure row.`);
  }
}

function publicationResourceCountForProject(nodes, projectKey) {
  const projectNode = projectNodeForKey(nodes, projectKey);
  return descendantRecords(nodes, projectNode.event.nodeId)
    .filter((record) => record.event.nodeKind === "resource").length;
}

function validateStableCodeVisibility(value, fault, context, label) {
  requireEqual(value, 0, label);
  requireNonemptyString(fault.event.stableCode, `${label} control stableCode`);
  const visibleFields = ["label", "description", "accessibilityLabel", "message", "title", "placeholder"];
  const count = context.ledgerRecords.filter((record) => (
    record.event.source !== "resource-discovery-host-control"
      && visibleFields.some((field) => (
        typeof record.event[field] === "string"
          && record.event[field].includes(fault.event.stableCode)
      ))
  )).length;
  requireEqual(count, value, `${label} computed public marker count`);
}

function validateNavigationFacts(value, context) {
  const label = "acceptance report facts.navigation";
  const facts = exactLaneFactObject(
    value,
    label,
    context.versionLane,
    [
      "actions",
      "longDuplicates",
      "headerOnly",
      "shifted",
      "scopeRestart",
      "declarationRestart",
      "pathless",
    ],
    ["packageOrigins"],
  );
  validateNavigationActionFacts(facts.actions, context, `${label}.actions`);
  const duplicateRows = context.fixture.witnesses.longSuffixDuplicates.rows;
  requireObjectArray(facts.longDuplicates, `${label}.longDuplicates`, duplicateRows.length);
  for (const [index, factValue] of facts.longDuplicates.entries()) {
    validateOpenedWitnessFact(
      factValue,
      duplicateRows[index],
      duplicateRows[index].publicName,
      context,
      `${label}.longDuplicates[${index}]`,
      "resource",
    );
  }

  const headerOnly = exactObject(
    facts.headerOnly,
    ["publishedIdentityKeys", "implementationSourceFallback"],
    `${label}.headerOnly`,
  );
  const headerRows = context.fixture.witnesses.headerOnlyMetadata.rows;
  requireArrayEqual(
    headerOnly.publishedIdentityKeys,
    headerRows.map((row) => row.identityKey),
    `${label}.headerOnly.publishedIdentityKeys`,
  );
  const implementationFact = exactObject(headerOnly.implementationSourceFallback, [
    "identityKey",
    "relativePath",
    "start",
    "end",
    "opened",
  ], `${label}.headerOnly.implementationSourceFallback`);
  const headerRow = headerRows.find((row) => row.identityKey === implementationFact.identityKey);
  if (headerRow == null) {
    throw new Error(`${label}.headerOnly.implementationSourceFallback is not one of the five manifest rows.`);
  }
  validateOpenedWitnessFact(
    implementationFact,
    headerRow,
    headerRow.implementation,
    context,
    `${label}.headerOnly.implementationSourceFallback`,
    "resource",
  );

  const shiftedWitness = context.fixture.witnesses.shiftedAndRemovedNavigation.shifted;
  const shifted = exactObject(facts.shifted, [
    "identityKey",
    "relativePath",
    "start",
    "end",
    "opened",
  ], `${label}.shifted`);
  requireEqual(shifted.identityKey, shiftedWitness.identityKey, `${label}.shifted.identityKey`);
  requireEqual(shifted.relativePath, shiftedWitness.relativePath, `${label}.shifted.relativePath`);
  requireEqual(shifted.start, shiftedWitness.shiftedPublicName.start, `${label}.shifted.start`);
  requireEqual(shifted.end, shiftedWitness.shiftedPublicName.end, `${label}.shifted.end`);
  const shiftedOpened = resolveLedgerReference(
    shifted.opened,
    `${label}.shifted.opened`,
    context,
    "resource-navigation",
    "opened",
  );
  requireEqual(shiftedOpened.event.resourceIdentity, shiftedWitness.identityKey, `${label}.shifted.opened.identity`);
  const shiftedSourcePath = resolve(context.workspaceRoot, ...shiftedWitness.relativePath.split("/"));
  const initialText = readBoundedRegularFile(
    shiftedSourcePath,
    32 * 1024 * 1024,
    `${label}.shifted restored source`,
    context.workspaceRoot,
  ).toString("utf8");
  validateOpenedEventLocation(
    shiftedOpened.event,
    shiftedSourcePath,
    shiftedWitness.shiftedPublicName,
    `${shiftedWitness.prefix}${initialText}`,
    `${label}.shifted.opened`,
  );

  validateRaceRestartFacts(facts.scopeRestart, facts.declarationRestart, context, label);
  validatePathlessNavigationFact(facts.pathless, context, `${label}.pathless`);
  if (context.versionLane === "current-stable") {
    const packageRows = context.fixture.witnesses.packageOrigins.rows;
    requireObjectArray(facts.packageOrigins, `${label}.packageOrigins`, packageRows.length);
    for (const [index, factValue] of facts.packageOrigins.entries()) {
      const row = packageRows[index];
      const fact = packageOriginOpenedWitnessFact(
        factValue,
        row,
        `${label}.packageOrigins[${index}]`,
      );
      validateOpenedWitnessFact(
        fact,
        row,
        row.publicName,
        context,
        `${label}.packageOrigins[${index}]`,
        "resource",
      );
    }
    context.claims.add("provenance");
  }
  context.claims.add("navigation");
}

function validateNavigationActionFacts(value, context, label) {
  const facts = exactObject(value, [
    "local",
    "alias",
    "bindable",
    "implementation",
    "openToSide",
  ], label);
  const localRow = context.fixture.witnesses.localTemplateAndBindables.rows[0];
  validateKnownNavigationAction(
    facts.local,
    ["identityKey", "opened"],
    { identityKey: localRow.identityKey },
    localRow.relativePath,
    localRow.publicName,
    "resource",
    "preview",
    context,
    `${label}.local`,
  );

  const alias = context.fixture.witnesses.aliasAndCrossKindCollisions.aliases[0];
  validateKnownNavigationAction(
    facts.alias,
    ["resourceIdentityKey", "childIdentityKey", "opened"],
    { resourceIdentityKey: alias.resourceIdentityKey, childIdentityKey: alias.aliasIdentityKey },
    alias.relativePath,
    alias.source,
    "alias",
    "preview",
    context,
    `${label}.alias`,
  );

  const bindable = localRow.bindables[0];
  const bindablePath = resolve(context.workspaceRoot, ...localRow.relativePath.split("/"));
  const bindableText = readBoundedRegularFile(
    bindablePath,
    32 * 1024 * 1024,
    `${label}.bindable source`,
    context.workspaceRoot,
  ).toString("utf8");
  const declarationStart = bindableText.indexOf(`<bindable name="${bindable.name}"`);
  const bindableStart = declarationStart < 0
    ? -1
    : bindableText.indexOf(bindable.name, declarationStart + "<bindable name=\"".length);
  if (bindableStart < 0) throw new Error(`${label}.bindable source anchor is missing.`);
  validateKnownNavigationAction(
    facts.bindable,
    ["resourceIdentityKey", "childIdentityKey", "opened"],
    { resourceIdentityKey: localRow.identityKey, childIdentityKey: bindable.identityKey },
    localRow.relativePath,
    { start: bindableStart, end: bindableStart + bindable.name.length },
    "bindable",
    "preview",
    context,
    `${label}.bindable`,
  );

  const longWitness = context.fixture.witnesses.longSuffixDuplicates;
  const left = longWitness.rows[0];
  const leftPath = resolve(context.workspaceRoot, ...left.relativePath.split("/"));
  const leftText = readBoundedRegularFile(
    leftPath,
    32 * 1024 * 1024,
    `${label}.implementation source`,
    context.workspaceRoot,
  ).toString("utf8");
  const implementationName = "LeftLongSuffixDuplicateCard";
  const implementationStart = leftText.indexOf(implementationName);
  if (implementationStart < 0) throw new Error(`${label}.implementation source anchor is missing.`);
  validateKnownNavigationAction(
    facts.implementation,
    ["identityKey", "opened"],
    { identityKey: left.identityKey },
    left.relativePath,
    { start: implementationStart, end: implementationStart + implementationName.length },
    "implementation",
    "preview",
    context,
    `${label}.implementation`,
  );
  const implementationNode = baselineResourceNode(context, left.identityKey, longWitness.projectKey);
  requireEqual(implementationNode.event.implementationAvailable, true, `${label}.implementation advertised`);
  requireEqual(implementationNode.event.implementationResourceIdentity, left.identityKey, `${label}.implementation identity`);
  requireEqual(implementationNode.event.implementationRole, "implementation", `${label}.implementation role`);

  const right = longWitness.rows[1];
  validateKnownNavigationAction(
    facts.openToSide,
    ["identityKey", "opened"],
    { identityKey: right.identityKey },
    right.relativePath,
    right.publicName,
    "resource",
    "beside",
    context,
    `${label}.openToSide`,
  );
}

function validateKnownNavigationAction(
  value,
  keys,
  expectedScalars,
  relativePath,
  range,
  role,
  placement,
  context,
  label,
) {
  const fact = exactObject(value, keys, label);
  for (const [field, expected] of Object.entries(expectedScalars)) {
    requireEqual(fact[field], expected, `${label}.${field}`);
  }
  const resourceIdentity = expectedScalars.identityKey ?? expectedScalars.resourceIdentityKey;
  const opened = resolveLedgerReference(
    fact.opened,
    `${label}.opened`,
    context,
    "resource-navigation",
    "opened",
  );
  requireEqual(opened.event.resourceIdentity, resourceIdentity, `${label}.opened.resourceIdentity`);
  requireEqual(opened.event.childIdentity, expectedScalars.childIdentityKey ?? null, `${label}.opened.childIdentity`);
  requireEqual(opened.event.role, role, `${label}.opened.role`);
  requireEqual(opened.event.placement, placement, `${label}.opened.placement`);
  const sourcePath = resolve(context.workspaceRoot, ...relativePath.split("/"));
  const sourceText = readBoundedRegularFile(
    sourcePath,
    32 * 1024 * 1024,
    `${label} source`,
    context.workspaceRoot,
  ).toString("utf8");
  validateOpenedEventLocation(opened.event, sourcePath, range, sourceText, `${label}.opened`);
}

function baselineResourceNode(context, identityKey, projectKey) {
  const matches = context.baseline.nodes.filter((record) => (
    record.event.nodeKind === "resource"
      && record.event.navigationResourceIdentity === identityKey
      && record.event.navigationProjectKey === projectKey
  ));
  if (matches.length !== 1) {
    throw new Error(`Baseline publication does not contain exactly one ${projectKey}/${identityKey} row.`);
  }
  return matches[0];
}

export function packageOriginOpenedWitnessFact(value, witness, label) {
  const fact = exactObject(value, [
    "identityKey",
    "relativePath",
    "originKind",
    "packageName",
    "start",
    "end",
    "opened",
  ], label);
  const row = exactObject(witness, null, `${label} witness`);
  const publicName = exactObject(
    row.publicName,
    ["start", "end"],
    `${label} witness.publicName`,
  );
  for (const field of ["identityKey", "relativePath", "originKind", "packageName"]) {
    requireEqual(fact[field], row[field], `${label}.${field}`);
  }
  requireEqual(fact.start, publicName.start, `${label}.start`);
  requireEqual(fact.end, publicName.end, `${label}.end`);
  return Object.freeze({
    identityKey: fact.identityKey,
    relativePath: fact.relativePath,
    start: fact.start,
    end: fact.end,
    opened: fact.opened,
  });
}

function validateOpenedWitnessFact(factValue, witnessRow, range, context, label, expectedRole) {
  const fact = exactObject(factValue, [
    "identityKey",
    "relativePath",
    "start",
    "end",
    "opened",
  ], label);
  requireEqual(fact.identityKey, witnessRow.identityKey, `${label}.identityKey`);
  requireEqual(fact.relativePath, witnessRow.relativePath, `${label}.relativePath`);
  requireEqual(fact.start, range.start, `${label}.start`);
  requireEqual(fact.end, range.end, `${label}.end`);
  const opened = resolveLedgerReference(
    fact.opened,
    `${label}.opened`,
    context,
    "resource-navigation",
    "opened",
  );
  requireEqual(opened.event.resourceIdentity, witnessRow.identityKey, `${label}.opened.resourceIdentity`);
  if (expectedRole != null) requireEqual(opened.event.role, expectedRole, `${label}.opened.role`);
  const sourcePath = resolve(context.workspaceRoot, ...witnessRow.relativePath.split("/"));
  const sourceText = readBoundedRegularFile(
    sourcePath,
    32 * 1024 * 1024,
    `${label} source`,
    context.workspaceRoot,
  ).toString("utf8");
  validateOpenedEventLocation(opened.event, sourcePath, range, sourceText, `${label}.opened`);
  return opened;
}

function validateOpenedEventLocation(event, sourcePath, range, sourceText, label) {
  if (!fileUriMatchesHostPath(event.uri, sourcePath)) {
    throw new Error(
      `${label}.uri must identify the exact host path ${sourcePath}; received ${String(event.uri)}.`,
    );
  }
  const start = sourcePositionAt(sourceText, range.start, `${label}.start`);
  const end = sourcePositionAt(sourceText, range.end, `${label}.end`);
  requireEqual(event.startLine, start.line, `${label}.startLine`);
  requireEqual(event.startCharacter, start.character, `${label}.startCharacter`);
  requireEqual(event.endLine, end.line, `${label}.endLine`);
  requireEqual(event.endCharacter, end.character, `${label}.endCharacter`);
}

function validateRaceRestartFacts(scopeValue, declarationValue, context, navigationLabel) {
  const witness = context.fixture.witnesses.shiftedAndRemovedNavigation;
  const race = witness.availabilityRace;
  validateRaceRestartFact(scopeValue, context, `${navigationLabel}.scopeRestart`, {
    projectKey: witness.projectKey,
    identityKey: race.scopeEdit.expectedAvailability.removed.identityKey,
    retiredScopeIdentity: race.baseline.scopeIdentityKey,
    currentScopeIdentity:
      race.scopeEdit.restartWithoutSelection.response.selectedTemplate.scopeIdentityKey,
    baselineResponse: availabilitySelectionAsResponse(race.baseline),
    retiredResponse: race.scopeEdit.retiredBaselineScopeReproof.response,
    currentResponse: race.scopeEdit.restartWithoutSelection.response,
    resourcePresence: "present",
  });
  validateRaceRestartFact(declarationValue, context, `${navigationLabel}.declarationRestart`, {
    projectKey: witness.projectKey,
    identityKey: witness.removed.identityKey,
    retiredScopeIdentity: race.scopeEdit.expectedAvailability.scopeIdentityKey,
    currentScopeIdentity:
      race.afterRemoval.restartWithoutSelection.response.selectedTemplate.scopeIdentityKey,
    baselineResponse: race.scopeEdit.restartWithoutSelection.response,
    retiredResponse: race.afterRemoval.retiredRightOnlyScopeReproof.response,
    currentResponse: race.afterRemoval.restartWithoutSelection.response,
    resourcePresence: "unconfirmed",
  });
  context.claims.add("scope-restart");
  context.claims.add("declaration-restart");
}

function availabilitySelectionAsResponse(selection) {
  return {
    projectKey: selection.projectKey,
    result: selection.result,
    selection: selection.selection,
    coverage: selection.coverage,
    selectedTemplate: { scopeIdentityKey: selection.scopeIdentityKey },
    candidates: [{ scopeIdentityKey: selection.scopeIdentityKey }],
    rows: selection.rows,
  };
}

export function parseSemanticRuntimeFingerprint(value, label = "semantic-runtime fingerprint") {
  requireNonemptyString(value, label);
  const match = semanticRuntimeFingerprintPattern.exec(value);
  if (match?.groups == null) {
    throw new Error(`${label} must be a canonical semantic-runtime fingerprint.`);
  }
  const workspaceGeneration = BigInt(match.groups.workspaceGeneration);
  const requestEpoch = BigInt(match.groups.requestEpoch);
  return Object.freeze({
    sessionIdentity: match.groups.sessionIdentity,
    workspaceGeneration,
    sourceWorldRevision: match.groups.sourceWorldRevision,
    requestEpoch,
  });
}

export function validateRaceRestartFingerprintSequence(
  f1Fingerprint,
  navigationCurrentFingerprint,
  retiredReproofFingerprint,
  restartedCurrentFingerprint,
  label = "race restart fingerprint sequence",
) {
  const sequence = Object.freeze({
    f1: parseSemanticRuntimeFingerprint(f1Fingerprint, `${label}.f1`),
    navigationCurrent: parseSemanticRuntimeFingerprint(
      navigationCurrentFingerprint,
      `${label}.navigationCurrent`,
    ),
    retiredReproof: parseSemanticRuntimeFingerprint(
      retiredReproofFingerprint,
      `${label}.retiredReproof`,
    ),
    restartedCurrent: parseSemanticRuntimeFingerprint(
      restartedCurrentFingerprint,
      `${label}.restartedCurrent`,
    ),
  });
  for (const [field, fingerprint] of Object.entries(sequence).slice(1)) {
    for (const authorityField of [
      "sessionIdentity",
      "workspaceGeneration",
      "sourceWorldRevision",
    ]) {
      if (fingerprint[authorityField] !== sequence.f1[authorityField]) {
        throw new Error(`${label}.${field} durable authority ${authorityField} must match F1.`);
      }
    }
  }
  if (sequence.navigationCurrent.requestEpoch <= sequence.f1.requestEpoch) {
    throw new Error(`${label}.navigationCurrent request epoch must be strictly newer than F1.`);
  }
  if (sequence.retiredReproof.requestEpoch < sequence.navigationCurrent.requestEpoch) {
    throw new Error(`${label}.retiredReproof request epoch must not regress from navigation current.`);
  }
  if (sequence.restartedCurrent.requestEpoch < sequence.retiredReproof.requestEpoch) {
    throw new Error(`${label}.restartedCurrent request epoch must not regress from retired reproof.`);
  }
  return sequence;
}

function validateRaceRestartFact(value, context, label, expected) {
  const fact = exactObject(value, [
    "projectKey",
    "identityKey",
    "retiredScopeIdentity",
    "currentScopeIdentity",
    "selected",
    "freshAvailable",
    "blocked",
    "invalidated",
    "released",
    "snapshotRefused",
    "staleRetry",
    "retiredScopeResponse",
    "revalidated",
    "currentResponse",
    "currentModel",
    "modelCancelled",
    "modelDisposed",
    "commandCancelled",
    "terminalRefusedCount",
    "openedCount",
  ], label);
  for (const field of [
    "projectKey",
    "identityKey",
    "retiredScopeIdentity",
    "currentScopeIdentity",
  ]) {
    requireEqual(fact[field], expected[field], `${label}.${field}`);
  }
  requireEqual(fact.terminalRefusedCount, 0, `${label}.terminalRefusedCount`);
  requireEqual(fact.openedCount, 0, `${label}.openedCount`);
  const selected = resolveLedgerReference(
    fact.selected,
    `${label}.selected`,
    context,
    "go-to-available-resource",
    "availability-selection",
  );
  requireEqual(selected.event.selectionKind, "resource", `${label}.selected.selectionKind`);
  requireEqual(selected.event.projectKey, expected.projectKey, `${label}.selected.projectKey`);
  requireEqual(selected.event.resourceIdentity, expected.identityKey, `${label}.selected.resourceIdentity`);
  requireEqual(
    selected.event.templateScopeIdentity,
    expected.retiredScopeIdentity,
    `${label}.selected.templateScopeIdentity`,
  );
  const freshAvailable = resolveLedgerReference(
    fact.freshAvailable,
    `${label}.freshAvailable`,
    context,
    "go-to-available-resource",
    "fresh-request-response",
  );
  requireEqual(freshAvailable.event.observationId, selected.event.observationId, `${label}.freshAvailable observationId`);
  requireEqual(freshAvailable.event.status, "available", `${label}.freshAvailable.status`);
  requireNonemptyString(freshAvailable.event.fingerprint, `${label}.freshAvailable.fingerprint`);
  requireEqual(
    freshAvailable.event.count,
    expected.baselineResponse.rows.length,
    `${label}.freshAvailable.count`,
  );
  validateAvailabilityResponseObservation(
    freshAvailable.event,
    expected.baselineResponse,
    `${label}.freshAvailable`,
  );
  const blocked = resolveLedgerReference(
    fact.blocked,
    `${label}.blocked`,
    context,
    "resource-discovery-host-control",
    "blocked",
  );
  requireEqual(blocked.event.operation, "inventory", `${label}.blocked.operation`);
  requireEqual(blocked.event.stage, "before-dispatch", `${label}.blocked.stage`);
  requireEqual(blocked.event.includeTypeSurfaces, false, `${label}.blocked.includeTypeSurfaces`);
  requireEqual(blocked.event.responseFingerprint, null, `${label}.blocked.responseFingerprint`);
  const invalidated = resolveLedgerReference(
    fact.invalidated,
    `${label}.invalidated`,
    context,
    "resource-explorer-view",
    "invalidation",
  );
  requireEqual(invalidated.event.scope, "workspace", `${label}.invalidated.scope`);
  const exactWorkspaceKey = exactObservedWorkspaceKey(context, label);
  requireEqual(blocked.event.workspaceKey, exactWorkspaceKey, `${label}.blocked.workspaceKey`);
  requireEqual(invalidated.event.workspaceKey, exactWorkspaceKey, `${label}.invalidated.workspaceKey`);
  const released = resolveLedgerReference(
    fact.released,
    `${label}.released`,
    context,
    "resource-discovery-host-control",
    "released",
  );
  requireEqual(released.event.observationId, blocked.event.observationId, `${label}.control observationId`);
  requireEqual(released.event.requestOrdinal, blocked.event.requestOrdinal, `${label}.control requestOrdinal`);
  const snapshotRefused = resolveLedgerReference(
    fact.snapshotRefused,
    `${label}.snapshotRefused`,
    context,
    "resource-navigation",
    "refused",
  );
  requireEqual(snapshotRefused.event.resourceIdentity, expected.identityKey, `${label}.snapshotRefused.identity`);
  requireEqual(snapshotRefused.event.childIdentity, null, `${label}.snapshotRefused.childIdentity`);
  requireEqual(snapshotRefused.event.role, "resource", `${label}.snapshotRefused.role`);
  requireEqual(snapshotRefused.event.placement, "preview", `${label}.snapshotRefused.placement`);
  requireEqual(
    snapshotRefused.event.requestedFingerprint,
    freshAvailable.event.fingerprint,
    `${label}.snapshotRefused.requestedFingerprint`,
  );
  requireEqual(snapshotRefused.event.category, "snapshot-changed", `${label}.snapshotRefused.category`);
  requireEqual(snapshotRefused.event.editorUnchanged, true, `${label}.snapshotRefused.editorUnchanged`);
  requireNonemptyString(snapshotRefused.event.currentFingerprint, `${label}.snapshotRefused.currentFingerprint`);
  const staleRetry = resolveLedgerReference(
    fact.staleRetry,
    `${label}.staleRetry`,
    context,
    "go-to-available-resource",
    "navigation-stale-retry",
  );
  requireEqual(staleRetry.event.observationId, selected.event.observationId, `${label}.staleRetry observationId`);
  requireEqual(staleRetry.event.resourcePresence, expected.resourcePresence, `${label}.staleRetry.resourcePresence`);
  requireEqual(staleRetry.event.status, "stale", `${label}.staleRetry.status`);
  requireEqual(staleRetry.event.currentFingerprint, snapshotRefused.event.currentFingerprint, `${label}.staleRetry fingerprint`);
  const retiredScopeResponse = resolveLedgerReference(
    fact.retiredScopeResponse,
    `${label}.retiredScopeResponse`,
    context,
    "go-to-available-resource",
    "fresh-request-response",
  );
  requireEqual(
    retiredScopeResponse.event.observationId,
    selected.event.observationId,
    `${label}.retiredScopeResponse observationId`,
  );
  requireEqual(retiredScopeResponse.event.status, "restart", `${label}.retiredScopeResponse.status`);
  requireEqual(retiredScopeResponse.event.count, 0, `${label}.retiredScopeResponse.count`);
  validateAvailabilityResponseObservation(
    retiredScopeResponse.event,
    expected.retiredResponse,
    `${label}.retiredScopeResponse`,
  );
  const revalidated = resolveLedgerReference(
    fact.revalidated,
    `${label}.revalidated`,
    context,
    "go-to-available-resource",
    "revalidation",
  );
  requireEqual(revalidated.event.observationId, selected.event.observationId, `${label}.revalidated observationId`);
  requireEqual(revalidated.event.outcome, "restart", `${label}.revalidated.outcome`);
  requireEqual(revalidated.event.rowCount, 0, `${label}.revalidated.rowCount`);
  requireEqual(revalidated.event.fingerprint, retiredScopeResponse.event.fingerprint, `${label}.revalidated fingerprint`);
  requireEqual(revalidated.event.editorUnchanged, true, `${label}.revalidated.editorUnchanged`);
  const currentResponse = resolveLedgerReference(
    fact.currentResponse,
    `${label}.currentResponse`,
    context,
    "go-to-available-resource",
    "initial-request-response",
  );
  requireEqual(currentResponse.event.observationId, selected.event.observationId, `${label}.currentResponse observationId`);
  requireEqual(currentResponse.event.status, "ready", `${label}.currentResponse.status`);
  requireEqual(currentResponse.event.projectSelection, "exact", `${label}.currentResponse.projectSelection`);
  requireEqual(currentResponse.event.templateSelection, "exact", `${label}.currentResponse.templateSelection`);
  requireEqual(
    currentResponse.event.count,
    expected.currentResponse.selectableRowCount,
    `${label}.currentResponse.count`,
  );
  requireEqual(
    currentResponse.event.resourceCount,
    expected.currentResponse.rows.length,
    `${label}.currentResponse.resourceCount`,
  );
  validateRaceRestartFingerprintSequence(
    freshAvailable.event.fingerprint,
    snapshotRefused.event.currentFingerprint,
    retiredScopeResponse.event.fingerprint,
    currentResponse.event.fingerprint,
    `${label}.fingerprints`,
  );
  validateAvailabilityResponseObservation(
    currentResponse.event,
    expected.currentResponse,
    `${label}.currentResponse`,
  );
  const currentModel = resolveLedgerReference(
    fact.currentModel,
    `${label}.currentModel`,
    context,
    "resource-quick-pick",
    "model-ready",
  );
  requireEqual(currentModel.event.observationId, selected.event.observationId, `${label}.currentModel observationId`);
  requireEqual(currentModel.event.modelOrdinal, 2, `${label}.currentModel.modelOrdinal`);
  requireEqual(
    currentModel.event.itemCount,
    expected.currentResponse.selectableRowCount,
    `${label}.currentModel.itemCount`,
  );
  requireEqual(currentModel.event.matchOnDescription, true, `${label}.currentModel.matchOnDescription`);
  requireEqual(currentModel.event.matchOnDetail, true, `${label}.currentModel.matchOnDetail`);
  requireEqual(currentModel.event.buttonCount, 0, `${label}.currentModel.buttonCount`);
  requireEqual(currentModel.event.step, 1, `${label}.currentModel.step`);
  requireEqual(currentModel.event.totalSteps, 1, `${label}.currentModel.totalSteps`);
  requireEqual(
    currentModel.event.placeholder,
    "Search resources available to this exact template scope",
    `${label}.currentModel.placeholder`,
  );
  const expectedTitlePrefix = `Resources available to ${expected.currentResponse.selectedTemplate.definitionName} — `;
  if (
    typeof currentModel.event.title !== "string"
    || !currentModel.event.title.startsWith(expectedTitlePrefix)
    || currentModel.event.title.endsWith(" — incomplete")
  ) {
    throw new Error(`${label}.currentModel.title does not authenticate the complete current template model.`);
  }
  validateCurrentAvailabilityModelItems(currentModel, currentResponse, expected.currentResponse, context, label);
  const modelCancelled = resolveLedgerReference(
    fact.modelCancelled,
    `${label}.modelCancelled`,
    context,
    "resource-quick-pick",
    "cancelled",
  );
  const modelDisposed = resolveLedgerReference(
    fact.modelDisposed,
    `${label}.modelDisposed`,
    context,
    "resource-quick-pick",
    "disposed",
  );
  for (const [field, record] of [["modelCancelled", modelCancelled], ["modelDisposed", modelDisposed]]) {
    requireEqual(record.event.observationId, selected.event.observationId, `${label}.${field} observationId`);
    requireEqual(record.event.modelOrdinal, currentModel.event.modelOrdinal, `${label}.${field}.modelOrdinal`);
  }
  const cancelledOutcomeCount = context.ledgerRecords.filter((record) => (
    record.event.source === "resource-quick-pick"
      && record.event.observationId === selected.event.observationId
      && record.event.modelOrdinal === currentModel.event.modelOrdinal
      && record.event.phase === "outcome"
      && record.event.status === "cancelled"
      && record.eventOrdinal > modelCancelled.eventOrdinal
      && record.eventOrdinal < modelDisposed.eventOrdinal
  )).length;
  requireEqual(cancelledOutcomeCount, 1, `${label} current model cancelled outcome count`);
  const commandCancelled = resolveLedgerReference(
    fact.commandCancelled,
    `${label}.commandCancelled`,
    context,
    "go-to-available-resource",
    "cancelled",
  );
  requireEqual(commandCancelled.event.observationId, selected.event.observationId, `${label}.commandCancelled observationId`);
  requireEqual(commandCancelled.event.stage, "selection", `${label}.commandCancelled.stage`);
  requireStrictOrdinalOrder(
    [
      selected,
      freshAvailable,
      blocked,
      invalidated,
      released,
      snapshotRefused,
      staleRetry,
      retiredScopeResponse,
      revalidated,
      currentResponse,
      currentModel,
      modelCancelled,
      modelDisposed,
      commandCancelled,
    ],
    label,
  );
  const terminalRefusedCount = context.ledgerRecords.filter((record) => (
    record.event.source === "go-to-available-resource"
      && record.event.observationId === selected.event.observationId
      && record.event.phase === "refused"
  )).length;
  requireEqual(terminalRefusedCount, fact.terminalRefusedCount, `${label} computed terminalRefusedCount`);
  const internalRefusedCount = context.ledgerRecords.filter((record) => (
    record.event.source === "resource-navigation"
      && record.event.phase === "refused"
      && record.event.resourceIdentity === expected.identityKey
      && record.eventOrdinal > selected.eventOrdinal
      && record.eventOrdinal < commandCancelled.eventOrdinal
  )).length;
  requireEqual(internalRefusedCount, 1, `${label} internal snapshot refusal count`);
  const openedCount = context.ledgerRecords.filter((record) => (
    (record.event.source === "resource-navigation"
      && record.event.phase === "opened"
      && record.event.resourceIdentity === expected.identityKey
      && record.eventOrdinal > selected.eventOrdinal
      && record.eventOrdinal < commandCancelled.eventOrdinal)
      || (record.event.source === "go-to-available-resource"
        && record.event.observationId === selected.event.observationId
        && record.event.phase === "navigation-complete"
        && record.event.status === "opened")
  )).length;
  requireEqual(openedCount, fact.openedCount, `${label} computed openedCount`);
}

function validateCurrentAvailabilityModelItems(currentModel, currentResponse, response, context, label) {
  const unavailable = new Set(response.navigationUnavailableIdentityKeys);
  const selectableRows = response.rows.filter((row) => !unavailable.has(row.identityKey));
  requireEqual(
    selectableRows.length,
    response.selectableRowCount,
    `${label}.currentModel selectable manifest rows`,
  );
  const itemRecords = context.ledgerRecords.filter((record) => (
    record.event.source === "resource-quick-pick"
      && record.event.observationId === currentModel.event.observationId
      && record.event.modelOrdinal === currentModel.event.modelOrdinal
      && record.event.phase === "model-item"
      && record.eventOrdinal > currentResponse.eventOrdinal
      && record.eventOrdinal < currentModel.eventOrdinal
  ));
  requireEqual(itemRecords.length, response.selectableRowCount, `${label}.currentModel model-item count`);
  const duplicateWitness = context.fixture.witnesses.longSuffixDuplicates;
  const expectedItems = selectableRows.map((row) => {
    const duplicate = duplicateWitness.rows.find((candidate) => candidate.identityKey === row.identityKey);
    if (duplicate != null) {
      return { label: duplicateWitness.name, detailIncludes: duplicate.shortestUniqueSuffix };
    }
    if (row.visibilityKind === "app-root") {
      return { label: response.selectedTemplate.definitionName, detailIncludes: null };
    }
    throw new Error(`${label}.currentModel selectable identity is not an authenticated public row.`);
  }).sort((left, right) => left.label < right.label ? -1 : left.label > right.label ? 1 : 0);
  for (const [index, record] of itemRecords.entries()) {
    const expected = expectedItems[index];
    requireEqual(record.event.itemOrdinal, index, `${label}.currentModel.items[${index}].itemOrdinal`);
    requireEqual(record.event.itemKind, "item", `${label}.currentModel.items[${index}].itemKind`);
    requireEqual(record.event.label, expected.label, `${label}.currentModel.items[${index}].label`);
    requireNonemptyString(record.event.description, `${label}.currentModel.items[${index}].description`);
    requireNonemptyString(record.event.detail, `${label}.currentModel.items[${index}].detail`);
    if (expected.detailIncludes != null && !record.event.detail.includes(expected.detailIncludes)) {
      throw new Error(`${label}.currentModel.items[${index}].detail omits its exact duplicate scent.`);
    }
  }
}

function validateAvailabilityResponseObservation(event, response, label) {
  requireEqual(event.answerResult, response.result, `${label}.answerResult`);
  requireEqual(event.answerCoverage, response.coverage, `${label}.answerCoverage`);
  requireEqual(event.answerSelection, response.selection, `${label}.answerSelection`);
  requireEqual(event.selectedProjectKey, response.projectKey, `${label}.selectedProjectKey`);
  requireEqual(
    event.selectedTemplateScopeIdentity,
    response.selectedTemplate?.scopeIdentityKey ?? null,
    `${label}.selectedTemplateScopeIdentity`,
  );
  requireEqual(
    event.templateCandidateCount,
    response.candidates.length,
    `${label}.templateCandidateCount`,
  );
  requireEqual(
    event.soleTemplateCandidateScopeIdentity,
    response.candidates.length === 1 ? response.candidates[0].scopeIdentityKey : null,
    `${label}.soleTemplateCandidateScopeIdentity`,
  );
  requireEqual(
    event.resourceIdentitySetSha256,
    resourceIdentitySetSha256(response.rows.map((row) => row.identityKey)),
    `${label}.resourceIdentitySetSha256`,
  );
}

export function resourceIdentitySetSha256(identityKeys) {
  const sorted = [...identityKeys].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  return sha256(Buffer.from(
    `aurelia-resource-identity-set/1\n${JSON.stringify(sorted)}`,
    "utf8",
  ));
}

function validatePathlessNavigationFact(value, context, label) {
  const fact = exactObject(value, [
    "identityKey",
    "originKind",
    "packageName",
    "published",
  ], label);
  const witness = context.fixture.witnesses.pathlessFramework;
  requireEqual(fact.identityKey, witness.identityKey, `${label}.identityKey`);
  requireEqual(fact.originKind, witness.originKind, `${label}.originKind`);
  requireEqual(fact.packageName, witness.packageName, `${label}.packageName`);
  const published = resolveLedgerReference(
    fact.published,
    `${label}.published`,
    context,
    "resource-explorer",
    "publish-node",
  );
  requireEqual(published.event.nodeKind, "resource", `${label}.published.nodeKind`);
  const workspaceKey = exactObservedWorkspaceKey(context, label);
  const rawNodeId = `workspace:${workspaceKey}:project:${witness.projectKey}:${witness.identityKey}`;
  requireEqual(
    published.event.nodeId,
    `tree-node:${sha256(Buffer.from(rawNodeId, "utf8"))}`,
    `${label}.published.nodeId`,
  );
  requireEqual(published.event.label, witness.name, `${label}.published.label`);
  requireEqual(published.event.command, null, `${label}.published.command`);
  requireEqual(published.event.navigationResourceIdentity, null, `${label}.published.navigationResourceIdentity`);
  requireEqual(published.event.implementationAvailable, false, `${label}.published.implementationAvailable`);
  requireEqual(published.event.implementationResourceIdentity, null, `${label}.published.implementationResourceIdentity`);
  requireRowState(published.event, "non-navigable", `${label}.published`);
  for (const token of [witness.originKind, witness.packageName]) {
    if (!published.event.accessibilityLabel.includes(token)) {
      throw new Error(`${label}.published accessibility label omits '${token}'.`);
    }
  }
  context.claims.add("pathless");
}

function exactObservedWorkspaceKey(context, label) {
  const keys = new Set(context.ledgerRecords.flatMap((record) => (
    typeof record.event.workspaceKey === "string"
      && fileWorkspaceKeyMatches(record.event.workspaceKey, context.workspaceRoot)
      ? [record.event.workspaceKey]
      : []
  )));
  if (keys.size !== 1) {
    throw new Error(`${label} cannot authenticate one exact rendered workspace key.`);
  }
  return [...keys][0];
}

function validateCancellationFacts(value, context) {
  const label = "acceptance report facts.cancellation";
  const fact = exactObject(value, [
    "blocked",
    "controlCancelled",
    "pickerCancelled",
    "pickerDisposed",
    "commandCancelled",
    "recoveryPresentedCount",
    "outputRequestedCount",
  ], label);
  const blocked = resolveLedgerReference(
    fact.blocked,
    `${label}.blocked`,
    context,
    "resource-discovery-host-control",
    "blocked",
  );
  requireEqual(blocked.event.operation, "availability", `${label}.blocked.operation`);
  requireEqual(blocked.event.stage, "after-response", `${label}.blocked.stage`);
  const controlCancelled = resolveLedgerReference(
    fact.controlCancelled,
    `${label}.controlCancelled`,
    context,
    "resource-discovery-host-control",
    "cancelled",
  );
  requireEqual(controlCancelled.event.observationId, blocked.event.observationId, `${label}.control observationId`);
  requireEqual(controlCancelled.event.requestOrdinal, blocked.event.requestOrdinal, `${label}.control requestOrdinal`);
  const pickerCancelled = resolveLedgerReference(
    fact.pickerCancelled,
    `${label}.pickerCancelled`,
    context,
    "resource-quick-pick",
    "cancelled",
  );
  const pickerDisposed = resolveLedgerReference(
    fact.pickerDisposed,
    `${label}.pickerDisposed`,
    context,
    "resource-quick-pick",
    "disposed",
  );
  requireEqual(pickerDisposed.event.observationId, pickerCancelled.event.observationId, `${label}.picker observationId`);
  requireEqual(pickerDisposed.event.modelOrdinal, pickerCancelled.event.modelOrdinal, `${label}.picker modelOrdinal`);
  const commandCancelled = resolveLedgerReference(
    fact.commandCancelled,
    `${label}.commandCancelled`,
    context,
    "go-to-available-resource",
    "cancelled",
  );
  requireEqual(commandCancelled.event.observationId, pickerCancelled.event.observationId, `${label}.command observationId`);
  requireEqual(commandCancelled.event.stage, "selection", `${label}.commandCancelled.stage`);
  requireStrictOrdinalOrder(
    [blocked, controlCancelled, pickerCancelled, pickerDisposed, commandCancelled],
    label,
  );
  requireEqual(fact.recoveryPresentedCount, 0, `${label}.recoveryPresentedCount`);
  requireEqual(fact.outputRequestedCount, 0, `${label}.outputRequestedCount`);
  const commandRecords = context.ledgerRecords.filter((record) => (
    record.event.observationId === commandCancelled.event.observationId
  ));
  requireEqual(
    commandRecords.filter((record) => record.event.phase === "recovery-presented").length,
    fact.recoveryPresentedCount,
    `${label} computed recoveryPresentedCount`,
  );
  requireEqual(
    commandRecords.filter((record) => record.event.phase === "output-requested").length,
    fact.outputRequestedCount,
    `${label} computed outputRequestedCount`,
  );
  context.claims.add("cancelled");
}

function validateFactConservation(context) {
  const required = [
    "complete-nonempty",
    "hierarchy",
    "resource-breadth",
    "long-scent-duplicates",
    "collisions",
    "quiet-lifecycle",
    "retirement",
    "open",
    "truncated",
    "project-ambiguity",
    "template-ambiguity",
    "unowned-cursor",
    "no-cursor",
    "partial",
    "stale",
    "stable-pending",
    "latest-wins",
    "navigation",
    "scope-restart",
    "declaration-restart",
    "pathless",
    "cancelled",
    ...(context.versionLane === "current-stable"
      ? ["page-drain", "provenance", "total-failure"]
      : []),
  ];
  for (const claim of required) {
    if (!context.claims.has(claim)) {
      throw new Error(`Acceptance report facts do not conserve required claim '${claim}'.`);
    }
  }
}

function executableFixtureResourceIdentities(fixture) {
  const identities = new Set();
  const visit = (value) => {
    if (typeof value === "string") {
      if (/^(?:typescript|framework|local-template)-resource:v1:/u.test(value)) {
        identities.add(value);
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value != null && typeof value === "object") {
      Object.values(value).forEach(visit);
    }
  };
  visit(fixture.witnesses);
  return identities;
}

function validateSourceFixtureManifest(manifest) {
  exactKeys(manifest, [
    "schemaVersion",
    "copyInputs",
    "generatedInputs",
    "projects",
    "witnesses",
    "lanePolicy",
  ], "committed Resource Discovery fixture manifest");
  requireEqual(
    manifest.schemaVersion,
    "aurelia-resource-discovery-host-fixture/1",
    "committed fixture schemaVersion",
  );

  if (!Array.isArray(manifest.copyInputs) || manifest.copyInputs.length === 0) {
    throw new Error("Committed fixture copyInputs must be a nonempty array.");
  }
  const copyDestinations = new Set();
  for (const [index, value] of manifest.copyInputs.entries()) {
    const input = exactObject(
      value,
      ["sourceFixture", "include", "destination"],
      `copyInputs[${index}]`,
    );
    requireSafeRelativePath(input.sourceFixture, `copyInputs[${index}].sourceFixture`, false);
    requireSafeRelativePath(input.destination, `copyInputs[${index}].destination`, true);
    requireUnique(copyDestinations, input.destination, `copyInputs[${index}].destination`);
    if (!Array.isArray(input.include) || input.include.length === 0) {
      throw new Error(`copyInputs[${index}].include must be a nonempty array.`);
    }
    requireSortedUniqueStrings(input.include, `copyInputs[${index}].include`);
    for (const include of input.include) {
      if (
        include !== "package.json"
        && include !== "tsconfig.json"
        && include !== "src/**"
        && !include.startsWith("src/")
      ) {
        throw new Error(`copyInputs[${index}].include contains a non-allowlisted path '${include}'.`);
      }
      requireSafeManifestPattern(include, `copyInputs[${index}].include`);
    }
  }

  if (!Array.isArray(manifest.generatedInputs)) {
    throw new Error("Committed fixture generatedInputs must be an array.");
  }
  const generatedIds = new Set();
  const generatedDestinations = new Set();
  for (const [index, value] of manifest.generatedInputs.entries()) {
    const input = exactObject(
      value,
      ["id", "destination", "generatorVersion", "lanes"],
      `generatedInputs[${index}]`,
    );
    requireBoundedToken(input.id, `generatedInputs[${index}].id`);
    requireUnique(generatedIds, input.id, `generatedInputs[${index}].id`);
    requireSafeRelativePath(input.destination, `generatedInputs[${index}].destination`, true);
    requireUnique(
      generatedDestinations,
      input.destination,
      `generatedInputs[${index}].destination`,
    );
    requireBoundedToken(input.generatorVersion, `generatedInputs[${index}].generatorVersion`);
    requireSortedUniqueStrings(input.lanes, `generatedInputs[${index}].lanes`);
    if (input.lanes.length === 0) {
      throw new Error(`generatedInputs[${index}].lanes must not be empty.`);
    }
    if (input.lanes.some((lane) => lane !== "current-stable" && lane !== "minimum")) {
      throw new Error(`generatedInputs[${index}].lanes contains an unknown lane.`);
    }
  }

  if (!Array.isArray(manifest.projects) || manifest.projects.length === 0) {
    throw new Error("Committed fixture projects must be a nonempty array.");
  }
  const projectKeys = new Set();
  for (const [index, value] of manifest.projects.entries()) {
    const project = exactObject(value, null, `projects[${index}]`);
    const projectFields = project.sourceInput === "supplied"
      ? [
          "projectKey",
          "relativeRoot",
          "sourceInput",
          "relativeFiles",
          "excludedRelativeRoots",
        ]
      : project.sourceInput === "discover"
        ? [
            "projectKey",
            "relativeRoot",
            "sourceInput",
            "sourceDiscoveryOptions",
            "excludedRelativeRoots",
          ]
        : null;
    if (projectFields == null) {
      throw new Error(`projects[${index}].sourceInput must be supplied or discover.`);
    }
    exactKeys(project, projectFields, `projects[${index}]`);
    requireBoundedToken(project.projectKey, `projects[${index}].projectKey`);
    requireUnique(projectKeys, project.projectKey, `projects[${index}].projectKey`);
    requireSafeRelativePath(project.relativeRoot, `projects[${index}].relativeRoot`, true);
    if (project.sourceInput === "supplied") {
      requireSortedUniqueStrings(project.relativeFiles, `projects[${index}].relativeFiles`);
      if (project.relativeFiles.length === 0) {
        throw new Error(`projects[${index}].relativeFiles must not be empty.`);
      }
      for (const file of project.relativeFiles) {
        requireSafeRelativePath(file, `projects[${index}].relativeFiles`, false);
        if (file.includes("*")) {
          throw new Error(`projects[${index}].relativeFiles must not contain globs.`);
        }
      }
    } else {
      const options = exactObject(
        project.sourceDiscoveryOptions,
        ["extensions", "maxFiles"],
        `projects[${index}].sourceDiscoveryOptions`,
      );
      requireSortedUniqueStrings(
        options.extensions,
        `projects[${index}].sourceDiscoveryOptions.extensions`,
      );
      if (options.extensions.some((extension) => !/^\.[A-Za-z0-9]+$/u.test(extension))) {
        throw new Error(`projects[${index}].sourceDiscoveryOptions.extensions is invalid.`);
      }
      if (!Number.isSafeInteger(options.maxFiles) || options.maxFiles < 0) {
        throw new Error(`projects[${index}].sourceDiscoveryOptions.maxFiles is invalid.`);
      }
    }
    requireSortedUniqueStrings(
      project.excludedRelativeRoots,
      `projects[${index}].excludedRelativeRoots`,
    );
    for (const excludedRoot of project.excludedRelativeRoots) {
      requireSafeRelativePath(
        excludedRoot,
        `projects[${index}].excludedRelativeRoots`,
        false,
      );
    }
  }

  const witnesses = exactObject(manifest.witnesses, null, "committed fixture witnesses");
  validateFixtureWitnesses(witnesses);
  validateLanePolicy(manifest.lanePolicy, witnesses);
}

function validateFixtureWitnesses(witnesses) {
  exactKeys(witnesses, resourceDiscoveryFixtureWitnessIds, "committed fixture witnesses");
  validateProjectTemplateAmbiguityWitness(witnesses.projectTemplateAmbiguity);
  validateLongSuffixDuplicatesWitness(witnesses.longSuffixDuplicates);
  validateLocalTemplateWitness(witnesses.localTemplateAndBindables);
  validateCollisionWitness(witnesses.aliasAndCrossKindCollisions);
  validateHeaderOnlyWitness(witnesses.headerOnlyMetadata);
  validatePackageOriginsWitness(witnesses.packageOrigins);
  validatePathlessFrameworkWitness(witnesses.pathlessFramework);
  validateGuardrailWitness(witnesses.guardrail);
  validateOpenCoverageWitness(witnesses.openCoverage);
  validatePageDrainWitness(witnesses.pageDrain);
  validateShiftedAndRemovedWitness(witnesses.shiftedAndRemovedNavigation);
  if (!witnesses.shiftedAndRemovedNavigation.availabilityRace.baseline
    .navigationUnavailableIdentityKeys.includes(witnesses.pathlessFramework.identityKey)) {
    throw new Error("Availability restart witnesses omit the exact pathless framework identity.");
  }
  for (const id of resourceDiscoveryFixtureWitnessIds) {
    validateJsonManifestValues(witnesses[id], `witnesses.${id}`);
    assertNoWildcardStrings(witnesses[id], `witnesses.${id}`);
  }
}

function validateProjectTemplateAmbiguityWitness(value) {
  const label = "witnesses.projectTemplateAmbiguity";
  const witness = exactWitness(value, label, "required", [
    "admission",
    "relativePath",
    "source",
    "excludedAppRootIdentityKey",
    "projectKeys",
    "projects",
  ]);
  requireSafeRelativePath(witness.relativePath, `${label}.relativePath`, false);
  const source = exactObject(
    witness.source,
    ["size", "sha256", "anchor", "anchorOffset", "cursor"],
    `${label}.source`,
  );
  requireNonNegativeInteger(source.size, `${label}.source.size`, true);
  requireHashShape(source.sha256, `${label}.source.sha256`);
  requireNonemptyString(source.anchor, `${label}.source.anchor`);
  requireNonNegativeInteger(source.anchorOffset, `${label}.source.anchorOffset`);
  const cursor = exactObject(source.cursor, ["line", "character"], `${label}.source.cursor`);
  requireNonNegativeInteger(cursor.line, `${label}.source.cursor.line`);
  requireNonNegativeInteger(cursor.character, `${label}.source.cursor.character`);
  requireEqual(
    witness.excludedAppRootIdentityKey,
    ambiguityExcludedAppRootIdentity,
    `${label}.excludedAppRootIdentityKey`,
  );
  requireUniqueStringArray(witness.projectKeys, `${label}.projectKeys`, 2);
  requireObjectArray(witness.projects, `${label}.projects`, witness.projectKeys.length);
  const projectKeys = [];
  for (const [projectIndex, projectValue] of witness.projects.entries()) {
    const projectLabel = `${label}.projects[${projectIndex}]`;
    const project = exactObject(
      projectValue,
      ["projectKey", "templateIdentityKey", "scopes"],
      projectLabel,
    );
    requireNonemptyString(project.projectKey, `${projectLabel}.projectKey`);
    requireIdentity(project.templateIdentityKey, `${projectLabel}.templateIdentityKey`);
    requireObjectArray(project.scopes, `${projectLabel}.scopes`, 2);
    const expectedScopes = ambiguityScopeContracts[project.projectKey];
    if (expectedScopes == null) {
      throw new Error(`${projectLabel}.projectKey is not an admitted ambiguity project.`);
    }
    const scopeIds = new Set();
    for (const [scopeIndex, scopeValue] of project.scopes.entries()) {
      const scopeLabel = `${projectLabel}.scopes[${scopeIndex}]`;
      const scope = exactObject(scopeValue, [
        "scopeIdentityKey",
        "rowCount",
        "selectableRowCount",
        "navigationUnavailableIdentityKeys",
        "navigationUnavailableReason",
        "definitionName",
        "compilationLane",
        "source",
        "resourceIdentityKeys",
        "mustExcludeResourceIdentityKeys",
      ], scopeLabel);
      const expectedScope = expectedScopes[scopeIndex];
      requireIdentity(scope.scopeIdentityKey, `${scopeLabel}.scopeIdentityKey`);
      requireUnique(scopeIds, scope.scopeIdentityKey, `${scopeLabel}.scopeIdentityKey`);
      requireEqual(
        scope.scopeIdentityKey,
        expectedScope.scopeIdentityKey,
        `${scopeLabel}.scopeIdentityKey`,
      );
      requireEqual(scope.rowCount, expectedScope.rowCount, `${scopeLabel}.rowCount`);
      requireEqual(scope.selectableRowCount, 0, `${scopeLabel}.selectableRowCount`);
      requireEqual(
        scope.navigationUnavailableReason,
        "external-catalog",
        `${scopeLabel}.navigationUnavailableReason`,
      );
      requireNonemptyString(scope.definitionName, `${scopeLabel}.definitionName`);
      requireEqual(scope.compilationLane, "app-runtime", `${scopeLabel}.compilationLane`);
      requireSourceRange(scope.source, `${scopeLabel}.source`);
      requireUniqueIdentityArray(
        scope.resourceIdentityKeys,
        `${scopeLabel}.resourceIdentityKeys`,
        true,
      );
      requireUniqueIdentityArray(
        scope.navigationUnavailableIdentityKeys,
        `${scopeLabel}.navigationUnavailableIdentityKeys`,
        true,
      );
      requireUniqueIdentityArray(
        scope.mustExcludeResourceIdentityKeys,
        `${scopeLabel}.mustExcludeResourceIdentityKeys`,
        false,
      );
      requireEqual(
        scope.resourceIdentityKeys.length,
        scope.rowCount,
        `${scopeLabel}.resourceIdentityKeys row count`,
      );
      requireEqual(
        scope.navigationUnavailableIdentityKeys.length,
        scope.rowCount - scope.selectableRowCount,
        `${scopeLabel}.navigationUnavailableIdentityKeys count`,
      );
      const unavailable = new Set(scope.navigationUnavailableIdentityKeys);
      const selectable = scope.resourceIdentityKeys.filter((identity) => !unavailable.has(identity));
      requireArrayEqual(
        selectable,
        [],
        `${scopeLabel} selectable identity partition`,
      );
      requireArrayEqual(
        scope.navigationUnavailableIdentityKeys,
        scope.resourceIdentityKeys,
        `${scopeLabel}.navigationUnavailableIdentityKeys order`,
      );
      if (scope.resourceIdentityKeys.includes(ambiguityExcludedAppRootIdentity)) {
        throw new Error(`${scopeLabel} re-admits the Stage 6D excluded app-root identity.`);
      }
      requireEqual(
        scope.mustExcludeResourceIdentityKeys.length,
        expectedScope.mustExcludeCount,
        `${scopeLabel}.mustExcludeResourceIdentityKeys count`,
      );
      const admitted = new Set(scope.resourceIdentityKeys);
      if (scope.mustExcludeResourceIdentityKeys.some((identity) => admitted.has(identity))) {
        throw new Error(`${scopeLabel} admits an identity that it must exclude.`);
      }
    }
    projectKeys.push(project.projectKey);
  }
  requireArrayEqual(projectKeys, witness.projectKeys, `${label}.projectKeys`);
}

function validateLongSuffixDuplicatesWitness(value) {
  const label = "witnesses.longSuffixDuplicates";
  const witness = exactWitness(value, label, "required", [
    "admission",
    "projectKey",
    "kind",
    "name",
    "sharedFinalSegments",
    "rows",
  ]);
  requireEqual(witness.projectKey, "host-alpha", `${label}.projectKey`);
  requireEqual(witness.kind, "custom-element", `${label}.kind`);
  requireNonemptyString(witness.name, `${label}.name`);
  requireSafeRelativePath(witness.sharedFinalSegments, `${label}.sharedFinalSegments`, false);
  requireObjectArray(witness.rows, `${label}.rows`, 2);
  const identities = new Set();
  for (const [index, valueRow] of witness.rows.entries()) {
    const rowLabel = `${label}.rows[${index}]`;
    const row = exactObject(valueRow, [
      "identityKey",
      "relativePath",
      "shortestUniqueSuffix",
      "publicName",
    ], rowLabel);
    requireIdentity(row.identityKey, `${rowLabel}.identityKey`);
    requireUnique(identities, row.identityKey, `${rowLabel}.identityKey`);
    requireSafeRelativePath(row.relativePath, `${rowLabel}.relativePath`, false);
    requireSafeRelativePath(row.shortestUniqueSuffix, `${rowLabel}.shortestUniqueSuffix`, false);
    if (!row.relativePath.endsWith(row.shortestUniqueSuffix)
      || !row.relativePath.endsWith(witness.sharedFinalSegments)) {
      throw new Error(`${rowLabel} does not preserve the frozen duplicate suffix.`);
    }
    requireSourceRange(row.publicName, `${rowLabel}.publicName`);
  }
}

function validateLocalTemplateWitness(value) {
  const label = "witnesses.localTemplateAndBindables";
  const witness = exactWitness(value, label, "required", ["admission", "projectKey", "rows"]);
  requireEqual(witness.projectKey, "host-alpha", `${label}.projectKey`);
  requireObjectArray(witness.rows, `${label}.rows`, 5);
  const identities = new Set();
  for (const [index, valueRow] of witness.rows.entries()) {
    const rowLabel = `${label}.rows[${index}]`;
    const row = exactObject(valueRow, [
      "identityKey",
      "name",
      "ownerIdentityKey",
      "ownerName",
      "relativePath",
      "publicName",
      "bindables",
    ], rowLabel);
    requireIdentity(row.identityKey, `${rowLabel}.identityKey`);
    requireUnique(identities, row.identityKey, `${rowLabel}.identityKey`);
    requireNonemptyString(row.name, `${rowLabel}.name`);
    requireIdentity(row.ownerIdentityKey, `${rowLabel}.ownerIdentityKey`);
    requireNonemptyString(row.ownerName, `${rowLabel}.ownerName`);
    requireSafeRelativePath(row.relativePath, `${rowLabel}.relativePath`, false);
    requireSourceRange(row.publicName, `${rowLabel}.publicName`);
    requireObjectArray(row.bindables, `${rowLabel}.bindables`, 1);
    for (const [bindableIndex, bindableValue] of row.bindables.entries()) {
      const bindableLabel = `${rowLabel}.bindables[${bindableIndex}]`;
      const bindable = exactObject(
        bindableValue,
        ["identityKey", "name", "attribute"],
        bindableLabel,
      );
      requireIdentity(bindable.identityKey, `${bindableLabel}.identityKey`);
      requireNonemptyString(bindable.name, `${bindableLabel}.name`);
      requireNonemptyString(bindable.attribute, `${bindableLabel}.attribute`);
    }
  }
}

function validateCollisionWitness(value) {
  const label = "witnesses.aliasAndCrossKindCollisions";
  const witness = exactWitness(value, label, "required", [
    "admission",
    "projectKey",
    "sameKindRows",
    "aliases",
    "crossKindRows",
  ]);
  requireEqual(witness.projectKey, "host-alpha", `${label}.projectKey`);
  requireObjectArray(witness.sameKindRows, `${label}.sameKindRows`, 10);
  requireObjectArray(witness.aliases, `${label}.aliases`, 4);
  requireObjectArray(witness.crossKindRows, `${label}.crossKindRows`, 6);
  const identities = new Set();
  for (const [collection, rows] of [
    ["sameKindRows", witness.sameKindRows],
    ["crossKindRows", witness.crossKindRows],
  ]) {
    for (const [index, valueRow] of rows.entries()) {
      const rowLabel = `${label}.${collection}[${index}]`;
      const row = exactObject(
        valueRow,
        ["identityKey", "kind", "name", "relativePath", "publicName"],
        rowLabel,
      );
      requireIdentity(row.identityKey, `${rowLabel}.identityKey`);
      requireUnique(identities, row.identityKey, `${rowLabel}.identityKey`);
      requireNonemptyString(row.kind, `${rowLabel}.kind`);
      requireNonemptyString(row.name, `${rowLabel}.name`);
      requireSafeRelativePath(row.relativePath, `${rowLabel}.relativePath`, false);
      requireSourceRange(row.publicName, `${rowLabel}.publicName`);
    }
  }
  for (const [index, valueRow] of witness.aliases.entries()) {
    const rowLabel = `${label}.aliases[${index}]`;
    const row = exactObject(valueRow, [
      "resourceIdentityKey",
      "resourceName",
      "aliasName",
      "aliasIdentityKey",
      "relativePath",
      "source",
    ], rowLabel);
    requireIdentity(row.resourceIdentityKey, `${rowLabel}.resourceIdentityKey`);
    requireIdentity(row.aliasIdentityKey, `${rowLabel}.aliasIdentityKey`);
    requireNonemptyString(row.resourceName, `${rowLabel}.resourceName`);
    requireNonemptyString(row.aliasName, `${rowLabel}.aliasName`);
    requireSafeRelativePath(row.relativePath, `${rowLabel}.relativePath`, false);
    requireSourceRange(row.source, `${rowLabel}.source`);
  }
}

function validateHeaderOnlyWitness(value) {
  const label = "witnesses.headerOnlyMetadata";
  const witness = exactWitness(value, label, "required", ["admission", "projectKey", "rows"]);
  requireEqual(witness.projectKey, "host-alpha", `${label}.projectKey`);
  requireObjectArray(witness.rows, `${label}.rows`, 5);
  const identities = new Set();
  for (const [index, valueRow] of witness.rows.entries()) {
    const rowLabel = `${label}.rows[${index}]`;
    const row = exactObject(valueRow, [
      "identityKey",
      "kind",
      "name",
      "metadataState",
      "originKind",
      "relativePath",
      "publicName",
      "declaration",
      "implementation",
      "navigation",
      "navigationRole",
      "navigationUnavailableReason",
    ], rowLabel);
    requireIdentity(row.identityKey, `${rowLabel}.identityKey`);
    requireUnique(identities, row.identityKey, `${rowLabel}.identityKey`);
    requireNonemptyString(row.kind, `${rowLabel}.kind`);
    requireNonemptyString(row.name, `${rowLabel}.name`);
    requireEqual(row.metadataState, "header-only", `${rowLabel}.metadataState`);
    requireEqual(row.originKind, "project", `${rowLabel}.originKind`);
    requireSafeRelativePath(row.relativePath, `${rowLabel}.relativePath`, false);
    requireEqual(row.publicName, null, `${rowLabel}.publicName`);
    requireSourceRange(row.declaration, `${rowLabel}.declaration`);
    requireSourceRange(row.implementation, `${rowLabel}.implementation`);
    requireSourceRange(row.navigation, `${rowLabel}.navigation`);
    requireEqual(
      JSON.stringify(row.navigation),
      JSON.stringify(row.implementation),
      `${rowLabel}.navigation`,
    );
    requireEqual(row.navigationRole, "implementation", `${rowLabel}.navigationRole`);
    requireEqual(
      row.navigationUnavailableReason,
      null,
      `${rowLabel}.navigationUnavailableReason`,
    );
  }
}

function validatePackageOriginsWitness(value) {
  const label = "witnesses.packageOrigins";
  const witness = exactWitness(value, label, "current-only", ["admission", "projectKey", "rows"]);
  requireEqual(witness.projectKey, "host-alpha", `${label}.projectKey`);
  requireObjectArray(witness.rows, `${label}.rows`, 3);
  const expectedTopology = [
    {
      originKind: "package",
      packageName: "@acme/installed-resource-kit",
      pathPrefix: "host-corpus/package-origin/app/node_modules/@acme/installed-resource-kit/",
    },
    {
      originKind: "package",
      packageName: "@acme/linked-resource-kit",
      pathPrefix: ".host-packages/linked-resource-kit/",
    },
    {
      originKind: "project",
      packageName: null,
      pathPrefix: "host-corpus/package-origin/app/src/",
    },
  ];
  const identities = new Set();
  for (const [index, valueRow] of witness.rows.entries()) {
    const rowLabel = `${label}.rows[${index}]`;
    const row = exactObject(valueRow, [
      "identityKey",
      "name",
      "originKind",
      "packageName",
      "moduleKey",
      "relativePath",
      "publicName",
      "implementation",
      "navigationRole",
    ], rowLabel);
    requireIdentity(row.identityKey, `${rowLabel}.identityKey`);
    requireUnique(identities, row.identityKey, `${rowLabel}.identityKey`);
    requireNonemptyString(row.name, `${rowLabel}.name`);
    requireEqual(row.originKind, expectedTopology[index].originKind, `${rowLabel}.originKind`);
    requireEqual(row.packageName, expectedTopology[index].packageName, `${rowLabel}.packageName`);
    requireSafeRelativePath(row.moduleKey, `${rowLabel}.moduleKey`, false);
    requireSafeRelativePath(row.relativePath, `${rowLabel}.relativePath`, false);
    if (!row.relativePath.startsWith(expectedTopology[index].pathPrefix)) {
      throw new Error(`${rowLabel}.relativePath does not preserve installed/linked/project topology.`);
    }
    requireSourceRange(row.publicName, `${rowLabel}.publicName`);
    requireSourceRange(row.implementation, `${rowLabel}.implementation`);
    requireEqual(row.navigationRole, "public-name", `${rowLabel}.navigationRole`);
  }
}

function validatePathlessFrameworkWitness(value) {
  const label = "witnesses.pathlessFramework";
  const witness = exactWitness(value, label, "required", [
    "admission",
    "projectKey",
    "identityKey",
    "kind",
    "name",
    "originKind",
    "packageName",
    "publicName",
    "navigationRole",
    "navigationUnavailableReason",
  ]);
  requireEqual(witness.projectKey, "host-alpha", `${label}.projectKey`);
  requireIdentity(witness.identityKey, `${label}.identityKey`);
  requireNonemptyString(witness.kind, `${label}.kind`);
  requireNonemptyString(witness.name, `${label}.name`);
  requireEqual(witness.originKind, "framework", `${label}.originKind`);
  requireEqual(witness.packageName, "@aurelia/runtime-html", `${label}.packageName`);
  requireEqual(witness.publicName, null, `${label}.publicName`);
  requireEqual(witness.navigationRole, null, `${label}.navigationRole`);
  requireEqual(
    witness.navigationUnavailableReason,
    "external-catalog",
    `${label}.navigationUnavailableReason`,
  );
}

function validateGuardrailWitness(value) {
  const label = "witnesses.guardrail";
  const witness = exactWitness(value, label, "required", [
    "admission",
    "projectKey",
    "sourceDiscoveryOptions",
    "result",
    "coverage",
    "selection",
    "displayTextIncludes",
    "rowCount",
    "completeness",
    "appRow",
    "excludedDefinitionRelativePath",
    "excludedDefinitionName",
    "availability",
  ]);
  requireEqual(witness.projectKey, "host-guardrail", `${label}.projectKey`);
  const options = exactObject(
    witness.sourceDiscoveryOptions,
    ["extensions", "maxFiles"],
    `${label}.sourceDiscoveryOptions`,
  );
  requireArrayEqual(options.extensions, [".ts"], `${label}.sourceDiscoveryOptions.extensions`);
  requireEqual(options.maxFiles, 1, `${label}.sourceDiscoveryOptions.maxFiles`);
  requireEqual(witness.result, "answered", `${label}.result`);
  requireEqual(witness.coverage, "truncated", `${label}.coverage`);
  requireEqual(witness.selection, "not-applicable", `${label}.selection`);
  requireNonemptyString(witness.displayTextIncludes, `${label}.displayTextIncludes`);
  requireEqual(witness.rowCount, 28, `${label}.rowCount`);
  validateCompleteness(witness.completeness, `${label}.completeness`, {
    fullDefinitions: 28,
    headerOnly: 0,
    visibilityOnly: 0,
    localTemplates: 0,
    excludedCompilerSyntax: 19,
    unnamedDefinitions: 0,
    unresolvedModules: 0,
    openVisibility: 0,
  });
  validatePinnedAppRow(witness.appRow, `${label}.appRow`, {
    name: "guardrail-app",
    relativePath: "host-corpus/guardrail/src/a-main.ts",
  });
  requireEqual(
    witness.excludedDefinitionRelativePath,
    "host-corpus/guardrail/src/z-over-limit.ts",
    `${label}.excludedDefinitionRelativePath`,
  );
  requireEqual(witness.excludedDefinitionName, "over-limit", `${label}.excludedDefinitionName`);
  validateAvailabilityReceipt(witness.availability, `${label}.availability`, {
    coverage: "truncated",
    rowCount: 27,
  });
}

function validateOpenCoverageWitness(value) {
  const label = "witnesses.openCoverage";
  const witness = exactWitness(value, label, "required", [
    "admission",
    "projectKey",
    "unresolvedModuleSpecifier",
    "result",
    "selection",
    "coverage",
    "rowCount",
    "completeness",
    "appRow",
    "availability",
  ]);
  requireEqual(witness.projectKey, "host-open", `${label}.projectKey`);
  requireEqual(
    witness.unresolvedModuleSpecifier,
    "./missing-resource",
    `${label}.unresolvedModuleSpecifier`,
  );
  requireEqual(witness.result, "answered", `${label}.result`);
  requireEqual(witness.selection, "not-applicable", `${label}.selection`);
  requireEqual(witness.coverage, "open", `${label}.coverage`);
  requireEqual(witness.rowCount, 28, `${label}.rowCount`);
  validateCompleteness(witness.completeness, `${label}.completeness`, {
    fullDefinitions: 28,
    headerOnly: 0,
    visibilityOnly: 0,
    localTemplates: 0,
    excludedCompilerSyntax: 19,
    unnamedDefinitions: 0,
    unresolvedModules: 1,
    openVisibility: 0,
  });
  validatePinnedAppRow(witness.appRow, `${label}.appRow`, {
    name: "open-coverage-app",
    relativePath: "host-corpus/open/src/a-main.ts",
    metadataState: "full-definition",
  });
  validateAvailabilityReceipt(witness.availability, `${label}.availability`, {
    coverage: "open",
    rowCount: 27,
  });
}

function validatePageDrainWitness(value) {
  const label = "witnesses.pageDrain";
  const witness = exactWitness(value, label, "current-only", [
    "admission",
    "projectKey",
    "result",
    "selection",
    "coverage",
    "pageSize",
    "pageRequestCount",
    "generatedResourceCount",
    "rowCount",
    "completeness",
    "first",
    "last",
  ]);
  requireEqual(witness.projectKey, "host-alpha", `${label}.projectKey`);
  requireEqual(witness.result, "answered", `${label}.result`);
  requireEqual(witness.selection, "not-applicable", `${label}.selection`);
  requireEqual(witness.coverage, "open", `${label}.coverage`);
  requireEqual(witness.pageSize, 500, `${label}.pageSize`);
  requireEqual(witness.pageRequestCount, 2, `${label}.pageRequestCount`);
  requireEqual(witness.generatedResourceCount, 501, `${label}.generatedResourceCount`);
  requireEqual(witness.rowCount, 606, `${label}.rowCount`);
  validateCompleteness(witness.completeness, `${label}.completeness`, {
    fullDefinitions: 601,
    headerOnly: 5,
    visibilityOnly: 0,
    localTemplates: 5,
    excludedCompilerSyntax: 60,
    unnamedDefinitions: 0,
    unresolvedModules: 0,
    openVisibility: 2,
  });
  for (const [field, expectedName] of [["first", "page-drain-000"], ["last", "page-drain-500"]]) {
    const rowLabel = `${label}.${field}`;
    const row = exactObject(
      witness[field],
      ["identityKey", "name", "relativePath", "publicName"],
      rowLabel,
    );
    requireIdentity(row.identityKey, `${rowLabel}.identityKey`);
    requireEqual(row.name, expectedName, `${rowLabel}.name`);
    requireEqual(
      row.relativePath,
      "host-corpus/page-drain/src/main.ts",
      `${rowLabel}.relativePath`,
    );
    requireSourceRange(row.publicName, `${rowLabel}.publicName`);
  }
}

function validateShiftedAndRemovedWitness(value) {
  const label = "witnesses.shiftedAndRemovedNavigation";
  const witness = exactWitness(value, label, "required", [
    "admission",
    "projectKey",
    "availabilityRace",
    "shifted",
    "removed",
  ]);
  requireEqual(witness.projectKey, "host-alpha", `${label}.projectKey`);
  const shifted = exactObject(witness.shifted, [
    "identityKey",
    "relativePath",
    "prefix",
    "initialPublicName",
    "shiftedPublicName",
  ], `${label}.shifted`);
  requireIdentity(shifted.identityKey, `${label}.shifted.identityKey`);
  requireSafeRelativePath(shifted.relativePath, `${label}.shifted.relativePath`, false);
  requireNonemptyString(shifted.prefix, `${label}.shifted.prefix`);
  const initial = requireSourceRange(shifted.initialPublicName, `${label}.shifted.initialPublicName`);
  const moved = requireSourceRange(shifted.shiftedPublicName, `${label}.shifted.shiftedPublicName`);
  requireEqual(moved.start, initial.start + shifted.prefix.length, `${label}.shifted.shiftedPublicName.start`);
  requireEqual(moved.end, initial.end + shifted.prefix.length, `${label}.shifted.shiftedPublicName.end`);
  const removed = exactObject(witness.removed, [
    "identityKey",
    "relativePath",
    "replacement",
    "expectedPresentAfterRefresh",
  ], `${label}.removed`);
  requireIdentity(removed.identityKey, `${label}.removed.identityKey`);
  requireSafeRelativePath(removed.relativePath, `${label}.removed.relativePath`, false);
  requireNonemptyString(removed.replacement, `${label}.removed.replacement`);
  requireEqual(
    removed.replacement,
    "export class RightLongSuffixDuplicateCard {}\n",
    `${label}.removed.replacement`,
  );
  requireEqual(
    removed.expectedPresentAfterRefresh,
    false,
    `${label}.removed.expectedPresentAfterRefresh`,
  );
  validateAvailabilityRaceWitness(
    witness.availabilityRace,
    `${label}.availabilityRace`,
    removed.identityKey,
  );
}

function validateAvailabilityRaceWitness(value, label, removedIdentityKey) {
  const race = exactObject(value, [
    "template",
    "excludedAppRootIdentityKey",
    "baseline",
    "scopeEdit",
    "afterRemoval",
  ], label);
  const template = exactObject(race.template, [
    "relativePath",
    "size",
    "sha256",
    "anchor",
    "anchorOffset",
    "cursor",
  ], `${label}.template`);
  requireSafeRelativePath(template.relativePath, `${label}.template.relativePath`, false);
  requireNonNegativeInteger(template.size, `${label}.template.size`, true);
  requireHashShape(template.sha256, `${label}.template.sha256`);
  requireNonemptyString(template.anchor, `${label}.template.anchor`);
  requireNonNegativeInteger(template.anchorOffset, `${label}.template.anchorOffset`);
  const cursor = exactObject(template.cursor, ["line", "character"], `${label}.template.cursor`);
  requireNonNegativeInteger(cursor.line, `${label}.template.cursor.line`);
  requireNonNegativeInteger(cursor.character, `${label}.template.cursor.character`);
  // Stage 6D commit 646454bbc made the app subject contextual rather than a selectable
  // resource in its own compiler scope. Keep the host witness tied to that owner contract.
  requireEqual(
    race.excludedAppRootIdentityKey,
    "typescript-resource:v1:b079pogsRRexNF_ZxBe0Wk",
    `${label}.excludedAppRootIdentityKey`,
  );
  const baseline = validateAvailabilitySelectionWitness(
    race.baseline,
    `${label}.baseline`,
    true,
  );
  requireEqual(baseline.projectKey, "host-alpha", `${label}.baseline.projectKey`);
  requireEqual(
    baseline.templateSource.relativePath,
    template.relativePath,
    `${label}.baseline.templateSource.relativePath`,
  );
  requireObjectArray(baseline.rows, `${label}.baseline.rows`, 28);
  const baselineIdentities = new Set();
  for (const [index, rowValue] of baseline.rows.entries()) {
    const row = validateAvailabilityIdentityRow(rowValue, `${label}.baseline.rows[${index}]`);
    requireUnique(baselineIdentities, row.identityKey, `${label}.baseline.rows[${index}].identityKey`);
  }
  if (baselineIdentities.has(race.excludedAppRootIdentityKey)) {
    throw new Error(`${label}.baseline.rows must exclude the Stage 6D contextual app-root identity.`);
  }
  validateAvailabilityNavigationCounts(baseline, baseline.rows, `${label}.baseline`);
  const scopeEdit = exactObject(race.scopeEdit, [
    "relativePath",
    "before",
    "after",
    "editedSize",
    "editedSha256",
    "keptGlobalRegistration",
    "inventoryIdentityKeysStillPresent",
    "expectedAvailability",
    "retiredBaselineScopeReproof",
    "restartWithoutSelection",
  ], `${label}.scopeEdit`);
  requireEqual(scopeEdit.relativePath, template.relativePath, `${label}.scopeEdit.relativePath`);
  requireNonemptyString(scopeEdit.before, `${label}.scopeEdit.before`);
  requireNonemptyString(scopeEdit.after, `${label}.scopeEdit.after`);
  if (scopeEdit.before === scopeEdit.after) throw new Error(`${label}.scopeEdit must change authored bytes.`);
  requireNonNegativeInteger(scopeEdit.editedSize, `${label}.scopeEdit.editedSize`, true);
  requireHashShape(scopeEdit.editedSha256, `${label}.scopeEdit.editedSha256`);
  requireNonemptyString(scopeEdit.keptGlobalRegistration, `${label}.scopeEdit.keptGlobalRegistration`);
  requireUniqueIdentityArray(
    scopeEdit.inventoryIdentityKeysStillPresent,
    `${label}.scopeEdit.inventoryIdentityKeysStillPresent`,
    true,
  );
  const expected = validateAvailabilitySelectionWitness(
    scopeEdit.expectedAvailability,
    `${label}.scopeEdit.expectedAvailability`,
    false,
  );
  requireEqual(expected.projectKey, baseline.projectKey, `${label}.scopeEdit.expectedAvailability.projectKey`);
  requireEqual(
    expected.templateIdentityKey,
    baseline.templateIdentityKey,
    `${label}.scopeEdit.expectedAvailability.templateIdentityKey`,
  );
  if (expected.scopeIdentityKey === baseline.scopeIdentityKey) {
    throw new Error(`${label}.scopeEdit expected scope identity must change.`);
  }
  requireEqual(
    expected.templateSource.relativePath,
    template.relativePath,
    `${label}.scopeEdit.expectedAvailability.templateSource.relativePath`,
  );
  requireEqual(expected.rowCount, 28, `${label}.scopeEdit.expectedAvailability.rowCount`);
  const removed = validateAvailabilityIdentityRow(
    expected.removed,
    `${label}.scopeEdit.expectedAvailability.removed`,
  );
  const added = validateAvailabilityIdentityRow(
    expected.added,
    `${label}.scopeEdit.expectedAvailability.added`,
  );
  if (!baselineIdentities.has(removed.identityKey) || baselineIdentities.has(added.identityKey)) {
    throw new Error(`${label}.scopeEdit removed/added identities do not describe the baseline delta.`);
  }
  requireUniqueIdentityArray(
    expected.retainedIdentityKeys,
    `${label}.scopeEdit.expectedAvailability.retainedIdentityKeys`,
    true,
  );
  requireArrayEqual(
    expected.retainedIdentityKeys,
    baseline.rows.map((row) => row.identityKey).filter((identity) => identity !== removed.identityKey),
    `${label}.scopeEdit.expectedAvailability.retainedIdentityKeys`,
  );
  requireEqual(
    expected.retainedIdentityKeys.length + 1,
    expected.rowCount,
    `${label}.scopeEdit.expectedAvailability row delta`,
  );
  const expectedScopeCandidate = availabilityCandidateFromSelection(expected);
  const retiredBaseline = validateAvailabilityRequestWitness(
    scopeEdit.retiredBaselineScopeReproof,
    `${label}.scopeEdit.retiredBaselineScopeReproof`,
    {
      requestedProjectKey: baseline.projectKey,
      requestedScopeIdentityKey: baseline.scopeIdentityKey,
      selection: "absent",
      rowCount: 0,
      completeness: availabilityCompleteness(30),
      selectedTemplate: null,
      candidate: expectedScopeCandidate,
      displayText: "Choose a current template compiler scope before inspecting available resources.",
    },
  );
  const scopeRestart = validateAvailabilityRequestWitness(
    scopeEdit.restartWithoutSelection,
    `${label}.scopeEdit.restartWithoutSelection`,
    {
      requestedProjectKey: null,
      requestedScopeIdentityKey: null,
      selection: "exact",
      rowCount: 28,
      completeness: availabilityCompleteness(30),
      selectedTemplate: expectedScopeCandidate,
      candidate: expectedScopeCandidate,
      displayText: "long-suffix-app: 28 available runtime resource(s).",
      selectableModel: true,
    },
  );
  requireEqual(
    JSON.stringify(retiredBaseline.response.candidates[0]),
    JSON.stringify(scopeRestart.response.selectedTemplate),
    `${label}.scopeEdit retired/current candidate`,
  );
  const baselineRowByIdentity = new Map(baseline.rows.map((row) => [row.identityKey, row]));
  const expectedScopeRows = [
    expected.added,
    ...expected.retainedIdentityKeys.map((identityKey) => baselineRowByIdentity.get(identityKey)),
  ];
  if (expectedScopeRows.some((row) => row == null)) {
    throw new Error(`${label}.scopeEdit retained identities do not resolve to baseline rows.`);
  }
  requireEqual(
    JSON.stringify(scopeRestart.response.rows),
    JSON.stringify(expectedScopeRows),
    `${label}.scopeEdit.restartWithoutSelection.response.rows`,
  );
  if (scopeRestart.response.rows.some((row) => row.identityKey === race.excludedAppRootIdentityKey)) {
    throw new Error(`${label}.scopeEdit restart rows must exclude the Stage 6D contextual app-root identity.`);
  }

  const afterRemoval = exactObject(race.afterRemoval, [
    "inventory",
    "retiredRightOnlyScopeReproof",
    "restartWithoutSelection",
  ], `${label}.afterRemoval`);
  const inventory = exactObject(afterRemoval.inventory, [
    "projectKey",
    "result",
    "selection",
    "coverage",
    "rowCount",
    "completeness",
    "removedIdentityKey",
    "removedIdentityPresent",
  ], `${label}.afterRemoval.inventory`);
  requireEqual(inventory.projectKey, baseline.projectKey, `${label}.afterRemoval.inventory.projectKey`);
  requireEqual(inventory.result, "answered", `${label}.afterRemoval.inventory.result`);
  requireEqual(inventory.selection, "not-applicable", `${label}.afterRemoval.inventory.selection`);
  requireEqual(inventory.coverage, "open", `${label}.afterRemoval.inventory.coverage`);
  requireEqual(inventory.rowCount, 29, `${label}.afterRemoval.inventory.rowCount`);
  validateCompleteness(
    inventory.completeness,
    `${label}.afterRemoval.inventory.completeness`,
    availabilityCompleteness(29),
  );
  requireEqual(
    inventory.removedIdentityKey,
    removedIdentityKey,
    `${label}.afterRemoval.inventory.removedIdentityKey`,
  );
  requireEqual(
    inventory.removedIdentityKey,
    expected.added.identityKey,
    `${label}.afterRemoval.inventory scope-edit identity correlation`,
  );
  requireEqual(
    inventory.removedIdentityPresent,
    false,
    `${label}.afterRemoval.inventory.removedIdentityPresent`,
  );
  const afterRemovalRetiredValue = afterRemoval.retiredRightOnlyScopeReproof;
  const afterRemovalRestartValue = afterRemoval.restartWithoutSelection;
  const afterRemovalCandidateValue = afterRemovalRestartValue?.response?.selectedTemplate;
  const afterRemovalRetired = validateAvailabilityRequestWitness(
    afterRemovalRetiredValue,
    `${label}.afterRemoval.retiredRightOnlyScopeReproof`,
    {
      requestedProjectKey: baseline.projectKey,
      requestedScopeIdentityKey: expected.scopeIdentityKey,
      selection: "absent",
      rowCount: 0,
      completeness: availabilityCompleteness(29),
      selectedTemplate: null,
      candidate: afterRemovalCandidateValue,
      displayText: "Choose a current template compiler scope before inspecting available resources.",
    },
  );
  const afterRemovalRestart = validateAvailabilityRequestWitness(
    afterRemovalRestartValue,
    `${label}.afterRemoval.restartWithoutSelection`,
    {
      requestedProjectKey: null,
      requestedScopeIdentityKey: null,
      selection: "exact",
      rowCount: 28,
      completeness: availabilityCompleteness(29),
      selectedTemplate: afterRemovalCandidateValue,
      candidate: afterRemovalCandidateValue,
      displayText: "long-suffix-app: 28 available runtime resource(s).",
      selectableModel: true,
    },
  );
  const afterCandidate = afterRemovalRestart.response.selectedTemplate;
  requireEqual(afterCandidate.templateIdentityKey, baseline.templateIdentityKey, `${label}.afterRemoval templateIdentityKey`);
  if ([baseline.scopeIdentityKey, expected.scopeIdentityKey].includes(afterCandidate.scopeIdentityKey)) {
    throw new Error(`${label}.afterRemoval current scope identity must be new.`);
  }
  requireEqual(
    JSON.stringify(afterRemovalRetired.response.candidates[0]),
    JSON.stringify(afterCandidate),
    `${label}.afterRemoval retired/current candidate`,
  );
  const afterRows = afterRemovalRestart.response.rows;
  if (afterRows.some((row) => row.identityKey === race.excludedAppRootIdentityKey)) {
    throw new Error(`${label}.afterRemoval restart rows must exclude the Stage 6D contextual app-root identity.`);
  }
  if (afterRows.some((row) => row.identityKey === removedIdentityKey)) {
    throw new Error(`${label}.afterRemoval restart rows retain the removed identity.`);
  }
  const expectedAfterRemovalRows = [...baseline.rows.slice(1), baseline.rows[0]];
  requireEqual(
    JSON.stringify(afterRows),
    JSON.stringify(expectedAfterRemovalRows),
    `${label}.afterRemoval restart row order`,
  );
  requireArrayEqual(
    scopeRestart.response.navigationUnavailableIdentityKeys,
    baseline.navigationUnavailableIdentityKeys,
    `${label}.scopeEdit restart unavailable identities`,
  );
  requireArrayEqual(
    afterRemovalRestart.response.navigationUnavailableIdentityKeys,
    baseline.navigationUnavailableIdentityKeys,
    `${label}.afterRemoval restart unavailable identities`,
  );
}

function availabilityCandidateFromSelection(selection) {
  return {
    templateIdentityKey: selection.templateIdentityKey,
    scopeIdentityKey: selection.scopeIdentityKey,
    definitionName: selection.definitionName,
    compilationLane: selection.compilationLane,
    source: selection.templateSource,
  };
}

function availabilityCompleteness(fullDefinitions) {
  return {
    fullDefinitions,
    headerOnly: 0,
    visibilityOnly: 0,
    localTemplates: 0,
    excludedCompilerSyntax: 19,
    unnamedDefinitions: 0,
    unresolvedModules: 0,
    openVisibility: 2,
  };
}

function validateAvailabilityRequestWitness(value, label, expected) {
  const request = exactObject(value, [
    "requestedProjectKey",
    "requestedScopeIdentityKey",
    "response",
  ], label);
  requireEqual(request.requestedProjectKey, expected.requestedProjectKey, `${label}.requestedProjectKey`);
  requireEqual(
    request.requestedScopeIdentityKey,
    expected.requestedScopeIdentityKey,
    `${label}.requestedScopeIdentityKey`,
  );
  const response = validateAvailabilityResponseWitness(request.response, `${label}.response`, expected);
  return { ...request, response };
}

function validateAvailabilityResponseWitness(value, label, expected) {
  const response = exactObject(value, [
    "projectKey",
    "result",
    "selection",
    "coverage",
    "displayText",
    ...(expected.selectableModel
      ? ["rowCount", "selectableRowCount", "navigationUnavailableIdentityKeys"]
      : []),
    "selectedTemplate",
    "candidates",
    "rows",
    "completeness",
  ], label);
  requireEqual(response.projectKey, "host-alpha", `${label}.projectKey`);
  requireEqual(response.result, "answered", `${label}.result`);
  requireEqual(response.selection, expected.selection, `${label}.selection`);
  requireEqual(response.coverage, "complete", `${label}.coverage`);
  requireEqual(response.displayText, expected.displayText, `${label}.displayText`);
  if (expected.selectedTemplate == null) {
    requireEqual(response.selectedTemplate, null, `${label}.selectedTemplate`);
  } else {
    const selectedTemplate = validateAvailabilityCandidate(
      response.selectedTemplate,
      `${label}.selectedTemplate`,
    );
    requireEqual(
      JSON.stringify(selectedTemplate),
      JSON.stringify(expected.selectedTemplate),
      `${label}.selectedTemplate`,
    );
  }
  requireObjectArray(response.candidates, `${label}.candidates`, 1);
  const candidate = validateAvailabilityCandidate(response.candidates[0], `${label}.candidates[0]`);
  requireEqual(JSON.stringify(candidate), JSON.stringify(expected.candidate), `${label}.candidates[0]`);
  requireObjectArray(response.rows, `${label}.rows`, expected.rowCount);
  const identities = new Set();
  for (const [index, rowValue] of response.rows.entries()) {
    const row = validateAvailabilityIdentityRow(rowValue, `${label}.rows[${index}]`);
    requireUnique(identities, row.identityKey, `${label}.rows[${index}].identityKey`);
  }
  if (expected.selectableModel) {
    validateAvailabilityNavigationCounts(response, response.rows, label);
  }
  validateCompleteness(response.completeness, `${label}.completeness`, expected.completeness);
  return response;
}

function validateAvailabilityNavigationCounts(value, rows, label) {
  requireEqual(value.rowCount, 28, `${label}.rowCount`);
  requireEqual(value.rowCount, rows.length, `${label}.rowCount rows`);
  requireEqual(value.selectableRowCount, 1, `${label}.selectableRowCount`);
  requireUniqueIdentityArray(
    value.navigationUnavailableIdentityKeys,
    `${label}.navigationUnavailableIdentityKeys`,
    true,
  );
  const expectedUnavailable = rows
    .filter((row) => row.identityKey.startsWith("framework-resource:v1:"))
    .map((row) => row.identityKey);
  requireEqual(expectedUnavailable.length, 27, `${label} framework row count`);
  requireArrayEqual(
    value.navigationUnavailableIdentityKeys,
    expectedUnavailable,
    `${label}.navigationUnavailableIdentityKeys`,
  );
  requireEqual(
    value.rowCount,
    value.selectableRowCount + value.navigationUnavailableIdentityKeys.length,
    `${label} selectable/unavailable partition`,
  );
}

function validateAvailabilityCandidate(value, label) {
  const candidate = exactObject(value, [
    "templateIdentityKey",
    "scopeIdentityKey",
    "definitionName",
    "compilationLane",
    "source",
  ], label);
  requireIdentity(candidate.templateIdentityKey, `${label}.templateIdentityKey`);
  requireIdentity(candidate.scopeIdentityKey, `${label}.scopeIdentityKey`);
  requireEqual(candidate.definitionName, "long-suffix-app", `${label}.definitionName`);
  requireEqual(candidate.compilationLane, "app-runtime", `${label}.compilationLane`);
  const source = exactObject(candidate.source, ["relativePath", "start", "end"], `${label}.source`);
  requireEqual(source.relativePath, "host-corpus/long-scent/src/main.ts", `${label}.source.relativePath`);
  requireSourceRange({ start: source.start, end: source.end }, `${label}.source range`);
  return candidate;
}

function validateAvailabilitySelectionWitness(value, label, baseline) {
  const keys = [
    "projectKey",
    "result",
    "selection",
    "coverage",
    "templateIdentityKey",
    "scopeIdentityKey",
    "definitionName",
    "compilationLane",
    "templateSource",
    ...(baseline
      ? ["rowCount", "selectableRowCount", "navigationUnavailableIdentityKeys", "rows"]
      : ["rowCount", "removed", "added", "retainedIdentityKeys"]),
  ];
  const selection = exactObject(value, keys, label);
  requireNonemptyString(selection.projectKey, `${label}.projectKey`);
  requireEqual(selection.result, "answered", `${label}.result`);
  requireEqual(selection.selection, "exact", `${label}.selection`);
  requireEqual(selection.coverage, "complete", `${label}.coverage`);
  requireIdentity(selection.templateIdentityKey, `${label}.templateIdentityKey`);
  requireIdentity(selection.scopeIdentityKey, `${label}.scopeIdentityKey`);
  requireNonemptyString(selection.definitionName, `${label}.definitionName`);
  requireEqual(selection.compilationLane, "app-runtime", `${label}.compilationLane`);
  const templateSource = exactObject(
    selection.templateSource,
    ["relativePath", "start", "end"],
    `${label}.templateSource`,
  );
  requireSafeRelativePath(templateSource.relativePath, `${label}.templateSource.relativePath`, false);
  requireSourceRange(
    { start: templateSource.start, end: templateSource.end },
    `${label}.templateSource range`,
  );
  if (!baseline) requireNonNegativeInteger(selection.rowCount, `${label}.rowCount`, true);
  return selection;
}

function validateAvailabilityIdentityRow(value, label) {
  const row = exactObject(value, ["identityKey", "state", "visibilityKind"], label);
  requireIdentity(row.identityKey, `${label}.identityKey`);
  requireEqual(row.state, "available", `${label}.state`);
  requireNonemptyString(row.visibilityKind, `${label}.visibilityKind`);
  return row;
}

function exactWitness(value, label, admission, keys) {
  const witness = exactObject(value, keys, label);
  requireEqual(witness.admission, admission, `${label}.admission`);
  return witness;
}

function requireNonemptyString(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.length > 16_384) {
    throw new Error(`${label} must be a bounded nonempty string.`);
  }
  return value;
}

function requireIdentity(value, label) {
  requireNonemptyString(value, label);
  if (value.includes("*")) throw new Error(`${label} must not contain a wildcard identity.`);
  return value;
}

function requireHashShape(value, label) {
  if (typeof value !== "string" || !sha256Pattern.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256 hash.`);
  }
  return value;
}

function requireNonNegativeInteger(value, label, positive = false) {
  if (!Number.isSafeInteger(value) || value < (positive ? 1 : 0)) {
    throw new Error(`${label} must be a ${positive ? "positive" : "non-negative"} safe integer.`);
  }
  return value;
}

function requireSourceRange(value, label) {
  const range = exactObject(value, ["start", "end"], label);
  requireNonNegativeInteger(range.start, `${label}.start`);
  requireNonNegativeInteger(range.end, `${label}.end`, true);
  if (range.end <= range.start) throw new Error(`${label}.end must be greater than start.`);
  return range;
}

function requireObjectArray(value, label, exactLength) {
  if (!Array.isArray(value) || value.length !== exactLength) {
    throw new Error(`${label} must contain exactly ${exactLength} rows.`);
  }
  for (const [index, entry] of value.entries()) {
    if (entry == null || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`${label}[${index}] must be an object.`);
    }
  }
  return value;
}

function requireUniqueStringArray(value, label, exactLength) {
  if (!Array.isArray(value) || value.length !== exactLength) {
    throw new Error(`${label} must contain exactly ${exactLength} strings.`);
  }
  const seen = new Set();
  for (const [index, entry] of value.entries()) {
    requireNonemptyString(entry, `${label}[${index}]`);
    requireUnique(seen, entry, `${label}[${index}]`);
  }
  return value;
}

function requireUniqueIdentityArray(value, label, nonempty) {
  if (!Array.isArray(value) || (nonempty && value.length === 0)) {
    throw new Error(`${label} must be ${nonempty ? "a nonempty" : "an"} identity array.`);
  }
  const seen = new Set();
  for (const [index, entry] of value.entries()) {
    requireIdentity(entry, `${label}[${index}]`);
    requireUnique(seen, entry, `${label}[${index}]`);
  }
  return value;
}

function validateCompleteness(value, label, expected) {
  const fields = [
    "fullDefinitions",
    "headerOnly",
    "visibilityOnly",
    "localTemplates",
    "excludedCompilerSyntax",
    "unnamedDefinitions",
    "unresolvedModules",
    "openVisibility",
  ];
  const completeness = exactObject(value, fields, label);
  for (const field of fields) {
    requireEqual(completeness[field], expected[field], `${label}.${field}`);
  }
}

function validatePinnedAppRow(value, label, expected) {
  const keys = [
    "identityKey",
    "name",
    ...(expected.metadataState == null ? [] : ["metadataState"]),
    "relativePath",
    "publicName",
  ];
  const row = exactObject(value, keys, label);
  requireIdentity(row.identityKey, `${label}.identityKey`);
  requireEqual(row.name, expected.name, `${label}.name`);
  if (expected.metadataState != null) {
    requireEqual(row.metadataState, expected.metadataState, `${label}.metadataState`);
  }
  requireEqual(row.relativePath, expected.relativePath, `${label}.relativePath`);
  requireSourceRange(row.publicName, `${label}.publicName`);
}

function validateAvailabilityReceipt(value, label, expected) {
  const availability = exactObject(
    value,
    ["result", "selection", "coverage", "rowCount"],
    label,
  );
  requireEqual(availability.result, "answered", `${label}.result`);
  requireEqual(availability.selection, "exact", `${label}.selection`);
  requireEqual(availability.coverage, expected.coverage, `${label}.coverage`);
  requireEqual(availability.rowCount, expected.rowCount, `${label}.rowCount`);
}

function validateLanePolicy(value, witnesses = null) {
  const policy = exactObject(value, [
    "requiredWorkerLanes",
    "minimumVersion",
    "authoritativeTransport",
    "optionalTransports",
    "currentStableOnlyWitnesses",
  ], "rendered fixture lanePolicy");
  requireArrayEqual(
    policy.requiredWorkerLanes,
    ["current-stable", "minimum"],
    "lanePolicy.requiredWorkerLanes",
  );
  requireEqual(policy.minimumVersion, minimumVSCodeVersion, "lanePolicy.minimumVersion");
  requireEqual(policy.authoritativeTransport, "worker", "lanePolicy.authoritativeTransport");
  requireArrayEqual(policy.optionalTransports, ["ipc"], "lanePolicy.optionalTransports");
  requireSortedUniqueStrings(
    policy.currentStableOnlyWitnesses,
    "lanePolicy.currentStableOnlyWitnesses",
  );
  if (witnesses != null) {
    const currentOnly = Object.entries(witnesses)
      .filter(([, witness]) => witness.admission === "current-only")
      .map(([id]) => id)
      .sort((left, right) => left.localeCompare(right));
    requireArrayEqual(
      policy.currentStableOnlyWitnesses,
      currentOnly,
      "lanePolicy.currentStableOnlyWitnesses",
    );
  }
  return policy;
}

function validateRenderedManifestPreservation(source, rendered) {
  const appendedFields = [
    "sourceManifestSha256",
    "lane",
    "transport",
    "workspaceRoot",
    "files",
    "links",
    "descriptorRelativePath",
    "descriptorSha256",
  ];
  exactKeys(
    rendered,
    [...Object.keys(source), ...appendedFields],
    "rendered Resource Discovery fixture manifest",
  );
  for (const key of Object.keys(source)) {
    if (key === "schemaVersion") continue;
    if (JSON.stringify(rendered[key]) !== JSON.stringify(source[key])) {
      throw new Error(`Rendered fixture changed committed field '${key}'.`);
    }
  }
  validateRenderedFileReceipts(rendered.files);
  validateRenderedLinkReceipts(rendered.links);
}

function validateRenderedFileReceipts(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Rendered fixture files must be a nonempty array.");
  }
  const paths = [];
  for (const [index, entry] of value.entries()) {
    const file = exactObject(entry, ["relativePath", "size", "sha256"], `files[${index}]`);
    requireSafeRelativePath(file.relativePath, `files[${index}].relativePath`, false);
    if (!Number.isSafeInteger(file.size) || file.size < 0) {
      throw new Error(`files[${index}].size must be a non-negative safe integer.`);
    }
    if (typeof file.sha256 !== "string" || !sha256Pattern.test(file.sha256)) {
      throw new Error(`files[${index}].sha256 must be a lowercase SHA-256 hash.`);
    }
    paths.push(file.relativePath);
  }
  requireSortedUniqueStrings(paths, "rendered fixture file paths");
}

function validateRenderedLinkReceipts(value) {
  if (!Array.isArray(value)) throw new Error("Rendered fixture links must be an array.");
  const paths = [];
  for (const [index, entry] of value.entries()) {
    const link = exactObject(entry, [
      "relativePath",
      "target",
      "realPath",
      "kind",
      "packageManifestSha256",
    ], `links[${index}]`);
    requireSafeRelativePath(link.relativePath, `links[${index}].relativePath`, false);
    for (const field of ["target", "realPath"]) {
      if (typeof link[field] !== "string" || !isAbsolute(link[field])) {
        throw new Error(`links[${index}].${field} must be an absolute path.`);
      }
    }
    if (link.kind !== "junction" && link.kind !== "directory-symbolic-link") {
      throw new Error(`links[${index}].kind must record the normalized physical link type.`);
    }
    if (!sha256Pattern.test(link.packageManifestSha256 ?? "")) {
      throw new Error(`links[${index}].packageManifestSha256 must be a lowercase SHA-256 hash.`);
    }
    paths.push(link.relativePath);
  }
  requireSortedUniqueStrings(paths, "rendered fixture link paths");
}

export function authenticateRenderedCorpus(fixture, workspaceRoot) {
  for (const file of fixture.files) {
    const filePath = resolve(workspaceRoot, ...file.relativePath.split("/"));
    assertInside(workspaceRoot, filePath);
    const bytes = readBoundedRegularFile(
      filePath,
      32 * 1024 * 1024,
      `rendered fixture file '${file.relativePath}'`,
      workspaceRoot,
    );
    requireEqual(bytes.length, file.size, `rendered fixture file '${file.relativePath}' size`);
    requireHash(
      file.sha256,
      sha256(bytes),
      `rendered fixture file '${file.relativePath}' sha256`,
    );
  }
  for (const link of fixture.links) {
    const linkPath = resolve(workspaceRoot, ...link.relativePath.split("/"));
    assertInside(workspaceRoot, linkPath);
    assertNoSymbolicPathComponents(
      workspaceRoot,
      linkPath,
      true,
      `rendered fixture link '${link.relativePath}'`,
    );
    const linkRecord = lstatSync(linkPath);
    if (!linkRecord.isSymbolicLink()) {
      throw new Error(`Rendered fixture link '${link.relativePath}' is no longer symbolic.`);
    }
    const expectedKind = process.platform === "win32" ? "junction" : "directory-symbolic-link";
    requireEqual(link.kind, expectedKind, `rendered fixture link '${link.relativePath}' kind`);
    const realLinkPath = normalize(realpathSync(linkPath));
    requireSamePath(realLinkPath, link.realPath, `rendered fixture link '${link.relativePath}' realPath`);
    requireSamePath(realLinkPath, realpathSync(link.target), `rendered fixture link '${link.relativePath}' target`);
    const packageManifestPath = join(realLinkPath, "package.json");
    const packageManifestBytes = readBoundedRegularFile(
      packageManifestPath,
      2 * 1024 * 1024,
      `rendered fixture link '${link.relativePath}' package manifest`,
    );
    requireHash(
      link.packageManifestSha256,
      sha256(packageManifestBytes),
      `rendered fixture link '${link.relativePath}' packageManifestSha256`,
    );
  }
  authenticateExactWorkspaceEntries(fixture, workspaceRoot);
}

function authenticateExactWorkspaceEntries(fixture, workspaceRoot) {
  const expectedFiles = new Set([
    ...fixture.files.map((file) => file.relativePath),
    productSupportEvidenceNames.descriptor,
    productSupportEvidenceNames.fixtureManifest,
    productSupportEvidenceNames.ledger,
    productSupportEvidenceNames.report,
  ]);
  const expectedLinks = new Set(fixture.links.map((link) => link.relativePath));
  for (const pathValue of expectedFiles) {
    if (expectedLinks.has(pathValue)) {
      throw new Error(`Authenticated workspace path is both a file and link: ${pathValue}`);
    }
  }
  const expectedDirectories = new Set();
  for (const pathValue of [...expectedFiles, ...expectedLinks]) {
    const segments = pathValue.split("/");
    for (let length = 1; length < segments.length; length += 1) {
      expectedDirectories.add(segments.slice(0, length).join("/"));
    }
  }
  const seenFiles = new Set();
  const seenLinks = new Set();
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))) {
      const absolutePath = join(directory, entry.name);
      const relativePath = relative(workspaceRoot, absolutePath).split(sep).join("/");
      requireSafeRelativePath(relativePath, "authenticated workspace entry", false);
      const record = lstatSync(absolutePath);
      if (record.isSymbolicLink()) {
        if (!expectedLinks.has(relativePath)) {
          throw new Error(`Authenticated workspace contains unexpected symbolic link '${relativePath}'.`);
        }
        seenLinks.add(relativePath);
        continue;
      }
      if (record.isDirectory()) {
        if (!expectedDirectories.has(relativePath)) {
          throw new Error(`Authenticated workspace contains unexpected directory '${relativePath}'.`);
        }
        walk(absolutePath);
        continue;
      }
      if (record.isFile()) {
        if (!expectedFiles.has(relativePath)) {
          throw new Error(`Authenticated workspace contains unexpected file '${relativePath}'.`);
        }
        seenFiles.add(relativePath);
        continue;
      }
      throw new Error(`Authenticated workspace contains unsupported entry '${relativePath}'.`);
    }
  };
  walk(workspaceRoot);
  requireArrayEqual(
    [...seenFiles].sort((left, right) => left.localeCompare(right)),
    [...expectedFiles].sort((left, right) => left.localeCompare(right)),
    "authenticated workspace regular files",
  );
  requireArrayEqual(
    [...seenLinks].sort((left, right) => left.localeCompare(right)),
    [...expectedLinks].sort((left, right) => left.localeCompare(right)),
    "authenticated workspace symbolic links",
  );
}

function requireArrayEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} must be ${JSON.stringify(expected)}; received ${JSON.stringify(actual)}.`);
  }
}

function requireSortedUniqueStrings(value, label) {
  if (
    !Array.isArray(value)
    || value.some((entry) => typeof entry !== "string" || entry.length === 0)
  ) {
    throw new Error(`${label} must contain nonempty strings.`);
  }
  const sorted = [...new Set(value)].sort((left, right) => left.localeCompare(right));
  requireArrayEqual(value, sorted, label);
}

function requireUnique(seen, value, label) {
  if (seen.has(value)) throw new Error(`${label} must be unique; received '${value}' twice.`);
  seen.add(value);
}

function requireBoundedToken(value, label) {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > 160
    || !/^[A-Za-z0-9][A-Za-z0-9._@/-]*$/u.test(value)
  ) {
    throw new Error(`${label} must be a bounded stable token.`);
  }
}

function requireSafeRelativePath(value, label, allowDot) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\\")) {
    throw new Error(`${label} must be a normalized POSIX relative path.`);
  }
  if (allowDot && value === ".") return;
  if (
    value === "."
    || value.startsWith("/")
    || /^[A-Za-z]:/u.test(value)
    || value.split("/").some((part) => part.length === 0 || part === "." || part === "..")
  ) {
    throw new Error(`${label} must remain inside the disposable workspace.`);
  }
}

function requireSafeManifestPattern(value, label) {
  const pathValue = value.endsWith("/**") ? value.slice(0, -3) : value;
  requireSafeRelativePath(pathValue, label, false);
  if (value.includes("*") && !value.endsWith("/**")) {
    throw new Error(`${label} only supports a trailing '/**' directory pattern.`);
  }
}

function assertNoWildcardStrings(value, label, identityField = false) {
  if (typeof value === "string") {
    if (identityField && value.includes("*")) {
      throw new Error(`${label} contains a wildcard expected identity.`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => (
      assertNoWildcardStrings(entry, `${label}[${index}]`, identityField)
    ));
    return;
  }
  if (value != null && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      assertNoWildcardStrings(entry, `${label}.${key}`, /identity/iu.test(key));
    }
  }
}

function validateJsonManifestValues(value, label) {
  if (value === null || ["string", "boolean"].includes(typeof value)) return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => validateJsonManifestValues(entry, `${label}[${index}]`));
    return;
  }
  if (value != null && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      validateJsonManifestValues(entry, `${label}.${key}`);
    }
    return;
  }
  throw new Error(`${label} contains an unsupported JSON value.`);
}

function linkDirectoryExactly(target, linkPath) {
  assertInside(repoRoot, target);
  assertInside(tempRoot, linkPath);
  if (!existsSync(target) || !lstatSync(realpathSync(target)).isDirectory()) {
    throw new Error(`Extension Host dependency directory does not exist: ${target}`);
  }
  symlinkSync(target, linkPath, process.platform === "win32" ? "junction" : "dir");
  if (!lstatSync(linkPath).isSymbolicLink() || realpathSync(linkPath) !== realpathSync(target)) {
    throw new Error(`Extension Host dependency link does not resolve exactly to ${target}: ${linkPath}`);
  }
}

function assertInside(parent, child) {
  const parentPath = resolve(parent);
  const childPath = resolve(child);
  if (childPath !== parentPath && !childPath.startsWith(`${parentPath}\\`) && !childPath.startsWith(`${parentPath}/`)) {
    throw new Error(`Refusing to touch path outside ${parentPath}: ${childPath}`);
  }
}

export function assertDisposablePathBoundary(targetPath, label = "Disposable Extension Host path") {
  const boundaryPath = resolve(disposableTempBoundary);
  const resolvedTarget = resolve(targetPath);
  assertInside(boundaryPath, resolvedTarget);
  const relativeTarget = relative(boundaryPath, resolvedTarget);
  const segments = relativeTarget === "" ? [] : relativeTarget.split(sep);
  let current = boundaryPath;
  let missingAncestor = false;
  for (const segment of [null, ...segments]) {
    if (segment != null) current = join(current, segment);
    const record = optionalLstat(current);
    if (record == null) {
      missingAncestor = true;
      continue;
    }
    if (missingAncestor) {
      throw new Error(`${label} exists below a missing disposable ancestor: ${current}`);
    }
    if (record.isSymbolicLink()) {
      throw new Error(`${label} has a symbolic disposable path component: ${current}`);
    }
    if (!record.isDirectory()) {
      throw new Error(`${label} has a non-directory disposable path component: ${current}`);
    }
  }
  return resolvedTarget;
}

export function removeDisposableTreeSafely(rootPath, { allowedSymbolicLeaves = [] } = {}) {
  const resolvedRoot = assertDisposablePathBoundary(rootPath, "Disposable cleanup root");
  if (optionalLstat(resolvedRoot) == null) return;
  const allowed = new Set(allowedSymbolicLeaves);
  for (const [index, relativePath] of [...allowed].entries()) {
    requireSafeRelativePath(relativePath, `allowedSymbolicLeaves[${index}]`, false);
  }
  const symbolicLeaves = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = join(directory, entry.name);
      const relativePath = relative(resolvedRoot, absolutePath).split(sep).join("/");
      const record = lstatSync(absolutePath);
      if (record.isSymbolicLink()) {
        if (!allowed.has(relativePath)) {
          throw new Error(`Disposable cleanup root contains an unapproved symbolic leaf: ${relativePath}`);
        }
        symbolicLeaves.push({ absolutePath, relativePath });
        continue;
      }
      if (record.isDirectory()) visit(absolutePath);
    }
  };
  visit(resolvedRoot);
  for (const leaf of symbolicLeaves.sort((left, right) => right.relativePath.length - left.relativePath.length)) {
    assertInside(resolvedRoot, leaf.absolutePath);
    unlinkSync(leaf.absolutePath);
  }
  assertDisposablePathBoundary(resolvedRoot, "Disposable cleanup root");
  rmSync(resolvedRoot, { recursive: true, force: true });
}

function approvedMaterializationLinkLeaves(cleanupRoot, workspaceRoot, versionLane) {
  if (workspaceRoot == null) return [];
  const relativeWorkspace = relative(resolve(cleanupRoot), resolve(workspaceRoot)).split(sep).join("/");
  requireSafeRelativePath(relativeWorkspace, "materialized workspace cleanup path", false);
  const workspaceLinks = [
    // Accept one stale pre-direct-link workspace during disposable cleanup. New materializations authenticate only
    // the two package leaves below, and this path is still confined to the exact .temp shard workspace.
    "node_modules",
    "node_modules/aurelia",
    "node_modules/@aurelia/router",
  ];
  if (versionLane === "current-stable") {
    workspaceLinks.push(
      "host-corpus/package-origin/app/node_modules/@acme/linked-resource-kit",
      "host-corpus/package-origin/app/node_modules/@aurelia/runtime-html",
    );
  }
  return workspaceLinks.map((relativePath) => `${relativeWorkspace}/${relativePath}`);
}

function optionalLstat(pathValue) {
  try {
    return lstatSync(pathValue);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function pathIsInsideOrEqual(parent, child) {
  const relativePath = relative(resolve(parent), resolve(child));
  return relativePath === ""
    || (!isAbsolute(relativePath) && relativePath !== ".." && !relativePath.startsWith(`..${sep}`));
}

async function main() {
  const plan = parseRunnerArguments(process.argv.slice(2));
  if (plan.planOnly) {
    console.log(JSON.stringify(extensionHostRunnerPlanReceipt(plan)));
    return;
  }
  await runExtensionHostTests(plan);
}

export function extensionHostRunnerPlanReceipt(plan) {
  const fixturePlan = plan.shards.includes("product-support")
    ? validateResourceDiscoveryPlanInputs({
        lane: Object.freeze({
          transport: plan.transport,
          version: plan.version,
          versionLane: plan.versionLane,
          resolvedVersion: plan.versionLane === "minimum" ? minimumVSCodeVersion : "0.0.0",
        }),
      })
    : null;
  return {
    transport: plan.transport,
    version: plan.version,
    versionLane: plan.versionLane,
    productMode: plan.productMode,
    minimumVSCodeVersion: plan.minimumVSCodeVersion,
    shards: plan.shards,
    launchCount: plan.launchCount,
    launches: plan.shards.map((shard) => {
      const shardRoot = disposableShardRoot(plan.versionLane, plan.transport, shard);
      const workspaceRoot = join(shardRoot, "routed-catalog-storefront");
      return {
        shard,
        disposableRoot: shardRoot,
        workerRestartAcceptance: {
          enabled: shard === "worker-lifecycle" && plan.transport === "worker",
          authoritative: shard === "worker-lifecycle" && plan.transport === "worker",
        },
        productSupportAcceptance: shard === "product-support"
          ? {
              enabled: true,
              authoritative: plan.transport === "worker",
              sourceManifest: resourceDiscoveryFixtureManifest,
              workspaceRoot,
              descriptor: join(workspaceRoot, productSupportEvidenceNames.descriptor),
              fixtureManifest: join(workspaceRoot, productSupportEvidenceNames.fixtureManifest),
              ledger: join(workspaceRoot, productSupportEvidenceNames.ledger),
              report: join(workspaceRoot, productSupportEvidenceNames.report),
              requiresBuiltStaticContract: true,
              sourceManifestPresent: true,
              fixtureContractValid: fixturePlan.materializedLane === plan.versionLane,
              fixtureMaterializedLane: fixturePlan.materializedLane,
              fixtureMaterializedFileCount: fixturePlan.materializedFileCount,
              fixtureMaterializedLinkCount: fixturePlan.materializedLinkCount,
              sourceManifestSha256: fixturePlan.sourceManifestSha256,
              builtStaticContractPresent: [
                "dist/extension.cjs",
                "dist/server/main.cjs",
                "package.json",
              ].every((relativePath) => regularNonSymbolicFileExists(
                join(extensionDevelopmentPath, ...relativePath.split("/")),
              )),
            }
          : { enabled: false },
      };
    }),
  };
}

function regularNonSymbolicFileExists(filePath) {
  try {
    const record = lstatSync(filePath);
    return record.isFile() && !record.isSymbolicLink();
  } catch {
    return false;
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (invokedPath === fileURLToPath(import.meta.url)) {
  await main();
}
