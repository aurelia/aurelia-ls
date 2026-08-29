#!/usr/bin/env node

import { spawn } from "node:child_process";
import {
  cpSync,
  existsSync,
  lstatSync,
  linkSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { Writable } from "node:stream";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  artifactPaths,
  artifactSchemaVersion,
  gitState,
  sha256,
  verifyVsix,
} from "./vsix-artifact.mjs";
import {
  prepareWorkspaceDependencies,
  readClientLogEvidence,
  readExtensionHostLogEvidence,
  validateWorkspaceDependencies,
} from "./collect-extension-host-tails.mjs";

export { sha256 };

export const installedPlanSchemaVersion = "aurelia-ls/installed-vsix-plan/v2";
export const installedEvidenceSchemaVersion = "aurelia-ls/installed-vsix-evidence/v2";
export const installedDriverReportSchemaVersion = "aurelia-ls/installed-vsix-driver-report/v2";
export const requestedVSCodeVersion = "stable";
export const expectedTestElectronVersion = "3.0.0";
export const installedInventoryPolicy = Object.freeze({
  payload: "every extension/ receipt entry except package.json installed byte-for-byte with no extra payload files or directories",
  packageManifest: "archive package fields plus exact VS Code __metadata transform; timestamp bounded to the sole install, targetPlatform undefined, size equal to packaged extension bytes",
  installerMetadataPath: ".vsixmanifest",
  installerMetadataArchivePath: "extension.vsixmanifest",
  installerMetadataAuthority: "exact byte equality with the generated VSIX control entry",
});

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
export const extensionRoot = path.resolve(scriptDirectory, "..");
export const repoRoot = path.resolve(extensionRoot, "../..");
export const releaseRoot = path.join(extensionRoot, ".release");
export const driverRoot = path.join(extensionRoot, "test", "installed-driver");
export const driverTestsPath = path.join(driverRoot, "suite", "index.cjs");
export const fixtureRoot = path.join(
  repoRoot,
  "packages",
  "semantic-runtime",
  "fixtures",
  "pressure",
  "app-pattern-compact-routed-catalog-storefront",
);
export const dependencyRoot = path.join(repoRoot, "packages", "semantic-runtime", "node_modules");
export const evidenceParent = path.join(repoRoot, ".temp", "vscode-vsix-installed");
export const targetRelativePath = "src/routes/service-plan-list-route.html";
export const relatedRelativePath = "src/routes/service-plan-list-route.ts";

const productId = "AureliaEffect.aurelia-2";
const allowedExtensionsRootMetadata = new Set([".obsolete", "extensions.json"]);
const reportLimitBytes = 64 * 1024;
const installedManifestLimitBytes = 1024 * 1024;
const evidenceLimitBytes = 2 * 1024 * 1024;
const usage = "Usage: node scripts/verify-installed-vsix.mjs [--plan]";

export function parseInstalledArguments(args) {
  let planOnly = false;
  for (const argument of args) {
    if (argument === "--plan" && !planOnly) {
      planOnly = true;
      continue;
    }
    throw new Error(`${argument === "--plan" ? "--plan may only be provided once." : `Unknown argument: ${argument}`}\n${usage}`);
  }
  return Object.freeze({ planOnly });
}

export function installedLayout(repositoryHead, root = evidenceParent) {
  requireFullObjectId(repositoryHead);
  const resolvedParent = path.resolve(root);
  const evidenceRoot = path.join(resolvedParent, repositoryHead.slice(0, 12));
  assertStrictChild(resolvedParent, evidenceRoot, "Installed-VSIX evidence root");
  return Object.freeze({
    evidenceParent: resolvedParent,
    evidenceRoot,
    workspaceRoot: path.join(evidenceRoot, "w"),
    workspaceFile: path.join(evidenceRoot, "w.code-workspace"),
    userDataDirectory: path.join(evidenceRoot, "u"),
    extensionsDirectory: path.join(evidenceRoot, "e"),
    driverReportPath: path.join(evidenceRoot, "driver.report.json"),
    installStdoutPath: path.join(evidenceRoot, "install.stdout.txt"),
    installStderrPath: path.join(evidenceRoot, "install.stderr.txt"),
    hostStdoutPath: path.join(evidenceRoot, "host.stdout.txt"),
    hostStderrPath: path.join(evidenceRoot, "host.stderr.txt"),
    evidencePath: path.join(evidenceRoot, "installed.evidence.json"),
  });
}

export function publicInstalledPlan({ repositoryHead, packageJson, root = evidenceParent }) {
  const layout = installedLayout(repositoryHead, root);
  const paths = artifactPaths(packageJson, releaseRoot, repositoryHead);
  return Object.freeze({
    schemaVersion: installedPlanSchemaVersion,
    repositoryHead,
    artifact: repoRelative(paths.vsix),
    receipt: repoRelative(paths.receipt),
    evidenceRoot: repoRelative(layout.evidenceRoot),
    requestedVSCodeVersion,
    downloadResolutionCount: 1,
    packageCount: 0,
    installCount: 1,
    hostLaunchCount: 1,
    retryCount: 0,
    replacementCount: 0,
    productExtensionDevelopmentPathCount: 0,
    driverExtensionDevelopmentPath: repoRelative(driverRoot),
    productionClassification: "exact installed path plus sole inert-driver extension-development topology",
    artifactPolicy: "verify and consume the existing current-HEAD VSIX; never build, package, replace, or overwrite it",
    installedInventoryPolicy,
  });
}

export function buildInstallInvocation({ electron, vscodeExecutablePath, artifactPath, layout }) {
  const resolvedCli = electron.resolveCliArgsFromVSCodeExecutablePath(
    vscodeExecutablePath,
    { reuseMachineInstall: true },
  );
  if (!Array.isArray(resolvedCli) || resolvedCli.length !== 1) {
    throw new Error("Pinned VS Code CLI resolution must return exactly one executable and no implicit arguments.");
  }
  const [command] = resolvedCli;
  if (!path.isAbsolute(command)) throw new Error("Resolved VS Code CLI path must be absolute.");
  assertRegularRealFile(command, "Resolved VS Code CLI");
  if (typeof electron.resolveCliPathFromVSCodeExecutablePath === "function") {
    const expectedCli = electron.resolveCliPathFromVSCodeExecutablePath(
      vscodeExecutablePath,
    );
    if (!samePath(command, expectedCli)) throw new Error("Resolved VS Code CLI executable identity drifted.");
  }
  const args = [
    `--user-data-dir=${layout.userDataDirectory}`,
    `--extensions-dir=${layout.extensionsDirectory}`,
    "--install-extension",
    artifactPath,
  ];
  assertNoForbiddenInstallArguments(args);
  return Object.freeze({ command, args: Object.freeze(args), cwd: repoRoot });
}

export function testElectronEvidence(dependencies = {}) {
  const extensionPackage = dependencies.extensionPackageJson
    ?? JSON.parse(readFileSync(path.join(extensionRoot, "package.json"), "utf8"));
  const packagePath = dependencies.testElectronPackageJsonPath
    ?? createRequire(path.join(extensionRoot, "package.json")).resolve("@vscode/test-electron/package.json");
  assertRegularRealFile(packagePath, "Resolved @vscode/test-electron package.json");
  assertStrictChild(repoRoot, packagePath, "Resolved @vscode/test-electron package.json");
  const bytes = readFileSync(packagePath);
  const resolvedPackage = JSON.parse(bytes.toString("utf8"));
  if (
    extensionPackage.devDependencies?.["@vscode/test-electron"] !== expectedTestElectronVersion
    || resolvedPackage.version !== expectedTestElectronVersion
  ) {
    throw new Error(`@vscode/test-electron must be declared and resolved exactly at ${expectedTestElectronVersion}.`);
  }
  return Object.freeze({
    version: resolvedPackage.version,
    packageJsonPath: repoRelative(packagePath),
    packageJsonBytes: bytes.length,
    packageJsonSha256: sha256(bytes),
  });
}

export function buildHostInvocation({
  vscodeExecutablePath,
  resolvedVersion,
  product,
  identity,
  layout,
}) {
  const targetPath = path.join(layout.workspaceRoot, targetRelativePath);
  const relatedPath = path.join(layout.workspaceRoot, relatedRelativePath);
  const extensionTestsEnv = Object.freeze({
    AURELIA_LS_INSTALLED_REPORT_PATH: layout.driverReportPath,
    AURELIA_LS_INSTALLED_WORKSPACE_ROOT: layout.workspaceRoot,
    AURELIA_LS_INSTALLED_TARGET_PATH: targetPath,
    AURELIA_LS_INSTALLED_RELATED_PATH: relatedPath,
    AURELIA_LS_INSTALLED_VSCODE_VERSION: resolvedVersion,
    AURELIA_LS_INSTALLED_PRODUCT_VERSION: identity.version,
    AURELIA_LS_INSTALLED_PRODUCT_PUBLISHER: identity.publisher,
    AURELIA_LS_INSTALLED_PRODUCT_NAME: identity.name,
    AURELIA_LS_INSTALLED_PRODUCT_MAIN: identity.main,
    AURELIA_LS_INSTALLED_PRODUCT_ENGINE: identity.vscodeEngine,
    AURELIA_LS_INSTALLED_PRODUCT_PATH: product.extensionPath,
    AURELIA_LS_INSTALLED_EXTENSIONS_ROOT: layout.extensionsDirectory,
    AURELIA_LS_INSTALLED_SOURCE_EXTENSION_ROOT: extensionRoot,
    AURELIA_LS_INSTALLED_DRIVER_ROOT: driverRoot,
    AURELIA_LS_EXTENSION_HOST_OBSERVATION: "1",
    AURELIA_LS_EXTENSION_HOST_TAIL_OBSERVATION: "1",
  });
  const launchArgs = Object.freeze([
    layout.workspaceFile,
    `--user-data-dir=${layout.userDataDirectory}`,
    `--extensions-dir=${layout.extensionsDirectory}`,
    "--log=trace",
    "--disable-workspace-trust",
    "--skip-welcome",
    "--skip-release-notes",
  ]);
  assertNoForbiddenHostArguments(launchArgs);
  return Object.freeze({
    vscodeExecutablePath,
    extensionDevelopmentPath: driverRoot,
    extensionTestsPath: driverTestsPath,
    launchArgs,
    extensionTestsEnv,
  });
}

export function discoverInstalledProduct(extensionsDirectory, identity) {
  assertRegularRealDirectory(extensionsDirectory, "Installed extensions directory");
  const candidates = [];
  for (const entry of readdirSync(extensionsDirectory, { withFileTypes: true })) {
    const entryPath = path.join(extensionsDirectory, entry.name);
    const info = lstatSync(entryPath);
    if (info.isSymbolicLink()) throw new Error(`Installed extensions root contains a symbolic link: ${entryPath}`);
    if (entry.isFile()) {
      if (!allowedExtensionsRootMetadata.has(entry.name)) {
        throw new Error(`Unexpected installer metadata in extensions root: ${entry.name}`);
      }
      continue;
    }
    if (!entry.isDirectory()) throw new Error(`Unsupported extensions-root entry: ${entry.name}`);
    assertRegularRealDirectory(entryPath, "Installed extension directory");
    const packagePath = path.join(entryPath, "package.json");
    if (!existsSync(packagePath)) throw new Error(`Installed extension directory has no package.json: ${entryPath}`);
    assertRegularRealFile(packagePath, "Installed extension package.json");
    const packageBytes = readFileSync(packagePath);
    if (packageBytes.length === 0 || packageBytes.length > installedManifestLimitBytes) {
      throw new Error(
        `Installed extension package.json bytes must be within 1..${installedManifestLimitBytes}; received ${packageBytes.length}.`,
      );
    }
    const manifest = JSON.parse(packageBytes.toString("utf8"));
    candidates.push({ entryPath, manifest });
  }
  const matches = candidates.filter(({ manifest }) =>
    `${manifest.publisher}.${manifest.name}`.toLowerCase() === productId.toLowerCase()
  );
  if (matches.length !== 1 || candidates.length !== 1) {
    throw new Error(
      `Expected exactly one installed extension and one ${productId} match; found ${candidates.length} extension(s) and ${matches.length} match(es).`,
    );
  }
  const match = matches[0];
  assertRegularRealDirectory(match.entryPath, "Installed product extension");
  assertStrictChild(extensionsDirectory, match.entryPath, "Installed product extension");
  assertOutside(extensionRoot, match.entryPath, "Installed product extension");
  assertOutside(driverRoot, match.entryPath, "Installed product extension");
  for (const key of ["publisher", "name", "version", "main"]) {
    if (match.manifest[key] !== identity[key]) {
      throw new Error(`Installed product ${key} drifted: ${JSON.stringify(match.manifest[key])}.`);
    }
  }
  if (match.manifest.engines?.vscode !== identity.vscodeEngine) {
    throw new Error("Installed product VS Code engine drifted.");
  }
  return Object.freeze({
    extensionPath: realpathSync(match.entryPath),
    manifest: Object.freeze(match.manifest),
  });
}

export function verifyInstalledInventory(receipt, extensionPath, installWindow) {
  requireInstallWindow(installWindow);
  const payload = receipt.entries
    .filter((entry) => entry.path.startsWith("extension/"))
    .map((entry) => Object.freeze({
      ...entry,
      classification: entry.path === "extension/package.json"
        ? "vscode-installer-transformed-manifest"
        : "extension-payload",
      relativePath: entry.path.slice("extension/".length),
    }));
  const packageManifestEntries = payload.filter((entry) => entry.path === "extension/package.json");
  if (packageManifestEntries.length !== 1) {
    throw new Error(`VSIX receipt must contain exactly one extension/package.json entry; received ${packageManifestEntries.length}.`);
  }
  const installerMetadataEntries = receipt.entries.filter(
    (entry) => entry.path === installedInventoryPolicy.installerMetadataArchivePath,
  );
  if (installerMetadataEntries.length !== 1) {
    throw new Error(
      `VSIX receipt must contain exactly one ${installedInventoryPolicy.installerMetadataArchivePath} control entry; received ${installerMetadataEntries.length}.`,
    );
  }
  const [installerMetadataEntry] = installerMetadataEntries;
  if (installerMetadataEntry.source?.kind !== "generated-control") {
    throw new Error("VSIX installer metadata authority must be a generated control entry.");
  }
  const expected = [
    ...payload,
    Object.freeze({
      ...installerMetadataEntry,
      classification: "vscode-installer-metadata",
      relativePath: installedInventoryPolicy.installerMetadataPath,
    }),
  ]
    .sort((left, right) => codePointCompare(left.relativePath, right.relativePath));
  if (new Set(expected.map((entry) => entry.relativePath)).size !== expected.length) {
    throw new Error("VSIX receipt maps more than one entry to the same installed path.");
  }
  const tree = regularTree(extensionPath);
  const actualPaths = tree.files
    .map((filePath) => path.relative(extensionPath, filePath).split(path.sep).join("/"))
    .sort(codePointCompare);
  const expectedPaths = expected.map((entry) => entry.relativePath);
  if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) {
    const missing = expectedPaths.filter((entry) => !actualPaths.includes(entry));
    const extra = actualPaths.filter((entry) => !expectedPaths.includes(entry));
    throw new Error(`Installed payload inventory mismatch; missing=${JSON.stringify(missing)}, extra=${JSON.stringify(extra)}.`);
  }
  const expectedDirectories = [...new Set(expectedPaths.flatMap((entry) => {
    const parts = entry.split("/");
    return parts.slice(0, -1).map((_part, index) => parts.slice(0, index + 1).join("/"));
  }))].sort(codePointCompare);
  const actualDirectories = tree.directories
    .map((directory) => path.relative(extensionPath, directory).split(path.sep).join("/"))
    .sort(codePointCompare);
  if (JSON.stringify(actualDirectories) !== JSON.stringify(expectedDirectories)) {
    const missing = expectedDirectories.filter((entry) => !actualDirectories.includes(entry));
    const extra = actualDirectories.filter((entry) => !expectedDirectories.includes(entry));
    throw new Error(`Installed payload directory inventory mismatch; missing=${JSON.stringify(missing)}, extra=${JSON.stringify(extra)}.`);
  }
  const evidence = expected.map((entry) => {
    const filePath = path.join(extensionPath, ...entry.relativePath.split("/"));
    assertStrictChild(extensionPath, filePath, "Installed payload file");
    assertRegularRealFile(filePath, "Installed payload file");
    const bytes = readFileSync(filePath);
    if (entry.classification === "vscode-installer-transformed-manifest") {
      return verifyInstalledPackageManifest(receipt, entry, bytes, installWindow);
    }
    const digest = sha256(bytes);
    if (bytes.length !== entry.bytes || digest !== entry.sha256) {
      throw new Error(`Installed payload bytes drifted for ${entry.relativePath}.`);
    }
    return Object.freeze({
      path: entry.relativePath,
      archivePath: entry.path,
      classification: entry.classification,
      bytes: bytes.length,
      sha256: digest,
      receiptSha256: entry.sha256,
      equal: true,
    });
  });
  return Object.freeze({
    payload: Object.freeze(evidence.filter((entry) => entry.classification === "extension-payload")),
    packageManifest: evidence.find((entry) => entry.classification === "vscode-installer-transformed-manifest"),
    installerMetadata: evidence.find((entry) => entry.classification === "vscode-installer-metadata"),
  });
}

function requireInstallWindow(installWindow) {
  if (
    !Number.isSafeInteger(installWindow?.startedEpochMilliseconds)
    || !Number.isSafeInteger(installWindow?.completedEpochMilliseconds)
    || installWindow.startedEpochMilliseconds <= 0
    || installWindow.completedEpochMilliseconds < installWindow.startedEpochMilliseconds
  ) {
    throw new Error("Installed inventory requires the exact sole-install timestamp window.");
  }
}

function verifyInstalledPackageManifest(receipt, entry, installedBytes, installWindow) {
  const source = entry.source;
  if (
    source?.kind !== "local"
    || source.equal !== true
    || typeof source.path !== "string"
    || !Number.isSafeInteger(source.bytes)
    || typeof source.sha256 !== "string"
  ) {
    throw new Error("Installed package.json requires an exact local archive authority.");
  }
  const sourcePath = path.resolve(repoRoot, source.path);
  assertStrictChild(repoRoot, sourcePath, "Installed package.json archive authority");
  assertRegularRealFile(sourcePath, "Installed package.json archive authority");
  const sourceBytes = readFileSync(sourcePath);
  const sourceDigest = sha256(sourceBytes);
  if (
    sourceBytes.length !== source.bytes
    || sourceDigest !== source.sha256
    || sourceBytes.length !== entry.bytes
    || sourceDigest !== entry.sha256
  ) {
    throw new Error("Installed package.json archive authority bytes drifted.");
  }

  let sourceManifest;
  let installedManifest;
  try {
    sourceManifest = JSON.parse(sourceBytes.toString("utf8"));
    installedManifest = JSON.parse(installedBytes.toString("utf8"));
  } catch (error) {
    throw new Error(`Installed package.json transformation was not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (
    sourceManifest == null
    || typeof sourceManifest !== "object"
    || Array.isArray(sourceManifest)
    || Object.hasOwn(sourceManifest, "__metadata")
  ) {
    throw new Error("Archive package.json cannot carry VS Code installer metadata.");
  }
  const metadata = installedManifest?.__metadata;
  const metadataKeys = metadata == null || typeof metadata !== "object" || Array.isArray(metadata)
    ? []
    : Object.keys(metadata);
  const packagedBytes = receipt.entries
    .filter((candidate) => candidate.path.startsWith("extension/") || candidate.path === installedInventoryPolicy.installerMetadataArchivePath)
    .reduce((total, candidate) => total + candidate.bytes, 0);
  if (!Number.isSafeInteger(packagedBytes) || packagedBytes <= 0) {
    throw new Error("VSIX receipt packaged-byte total was invalid.");
  }
  if (
    JSON.stringify(metadataKeys) !== JSON.stringify(["installedTimestamp", "targetPlatform", "size"])
    || !Number.isSafeInteger(metadata?.installedTimestamp)
    || metadata.installedTimestamp < installWindow.startedEpochMilliseconds
    || metadata.installedTimestamp > installWindow.completedEpochMilliseconds
    || metadata.targetPlatform !== "undefined"
    || metadata.size !== packagedBytes
  ) {
    throw new Error("Installed package.json metadata did not match the exact VS Code installer transform.");
  }
  const transformedBytes = Buffer.from(JSON.stringify({
    ...sourceManifest,
    __metadata: {
      installedTimestamp: metadata.installedTimestamp,
      targetPlatform: "undefined",
      size: packagedBytes,
    },
  }, null, "\t"));
  if (!installedBytes.equals(transformedBytes)) {
    throw new Error("Installed package.json bytes did not equal the exact VS Code installer transform.");
  }
  return Object.freeze({
    path: entry.relativePath,
    archivePath: entry.path,
    classification: entry.classification,
    bytes: installedBytes.length,
    sha256: sha256(installedBytes),
    receiptBytes: entry.bytes,
    receiptSha256: entry.sha256,
    source: Object.freeze({
      path: source.path,
      bytes: sourceBytes.length,
      sha256: sourceDigest,
      equal: true,
    }),
    metadata: Object.freeze({ ...metadata }),
    packagedBytes,
    exactTransform: true,
  });
}

export function snapshotRegularTree(root, options = {}) {
  assertRegularRealDirectory(root, "Snapshot root");
  const tree = regularTree(root, new Set(options.ignoredTopLevel ?? []));
  const directories = tree.directories
    .map((directory) => path.relative(root, directory).split(path.sep).join("/"))
    .sort(codePointCompare);
  const entries = tree.files
    .map((filePath) => {
      const bytes = readFileSync(filePath);
      return Object.freeze({
        path: path.relative(root, filePath).split(path.sep).join("/"),
        bytes: bytes.length,
        sha256: sha256(bytes),
      });
    })
    .sort((left, right) => codePointCompare(left.path, right.path));
  return Object.freeze({
    directoryCount: directories.length,
    directories: Object.freeze(directories),
    fileCount: entries.length,
    totalBytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
    sha256: sha256(`${JSON.stringify({ directories, entries })}\n`),
    entries: Object.freeze(entries),
  });
}

export function validateWorkspaceDependenciesAfterHost(workspaceRoot) {
  return validateWorkspaceDependencies(workspaceRoot, {
    dependencyRoot,
    expectedDependencyRoot: dependencyRoot,
  });
}

export function validateInstalledDriverReport(report, context) {
  const issues = [];
  const geometry = context.geometry ?? expectedCompletionGeometry(context.targetPath);
  const relatedPath = context.relatedPath ?? path.join(path.dirname(context.targetPath), "service-plan-list-route.ts");
  check(report?.schemaVersion === installedDriverReportSchemaVersion, issues, "driver report schema drifted");
  check(report?.status === "passed", issues, "driver report did not pass");
  check(Array.isArray(report?.errors) && report.errors.length === 0, issues, "driver report retained errors");
  check(report?.error == null, issues, "driver report retained a terminal error");
  check(report?.vscodeVersion === context.resolvedVersion, issues, "driver VS Code version drifted");
  check(report?.product?.matchCount === 1, issues, "driver did not find exactly one product extension");
  check(String(report?.product?.id ?? "").toLowerCase() === productId.toLowerCase(), issues, "driver product id drifted");
  check(samePath(report?.product?.extensionPath, context.product.extensionPath), issues, "driver product path drifted");
  check(report?.product?.version === context.identity.version, issues, "driver product version drifted");
  check(report?.product?.main === context.identity.main, issues, "driver product main drifted");
  check(report?.product?.vscodeEngine === context.identity.vscodeEngine, issues, "driver product engine drifted");
  check(report?.product?.productionClassification === "inferred-installed-production", issues, "driver production classification drifted");
  check(
    report?.product?.productionInference === "exact installed root under isolated extensions directory; sole extensionDevelopmentPath is the inert driver",
    issues,
    "driver production inference drifted",
  );
  check(report?.product?.activeAtTestEntry === true, issues, "product was not active at driver entry");
  check(report?.driver?.matchCount === 1, issues, "driver extension count drifted");
  check(report?.driver?.id === "aurelia-ls-tests.installed-vsix-driver", issues, "driver id drifted");
  check(report?.driver?.version === "0.0.0", issues, "driver version drifted");
  check(samePath(report?.driver?.extensionPath, driverRoot), issues, "driver extension path drifted");
  check(report?.driver?.mode === "Test" && report?.driver?.modeValue === 3, issues, "driver context was not Test mode");
  check(samePath(report?.driver?.contextExtensionPath, driverRoot), issues, "driver context path drifted");
  check(report?.preconditions?.targetUnopenedAtEntry === true, issues, "target was open at driver entry");
  check(report?.preconditions?.targetUnshownAtEntry === true, issues, "target was shown at driver entry");
  check(report?.preconditions?.productActiveAtEntry === true, issues, "product was inactive at driver entry");
  check(report?.preconditions?.activationMode === "auto", issues, "activation mode was not auto");
  check(report?.preconditions?.zeroProviderObservationsBeforeTrigger === true, issues, "provider traffic preceded completion trigger");
  check(report?.completion?.command === "vscode.executeCompletionItemProvider", issues, "native completion command drifted");
  check(report?.completion?.anchor === "state.servicePlans.searchText", issues, "completion anchor drifted");
  check(report?.completion?.label === "searchText", issues, "completion label drifted");
  check(report?.completion?.kind === "Property" && report?.completion?.kindValue === 9, issues, "completion kind drifted");
  check(report?.completion?.detailIncludesTypeMember === true, issues, "completion lost type-member provenance");
  check(typeof report?.completion?.detail === "string" && report.completion.detail.includes("type-member"), issues, "completion detail lost type-member provenance");
  check(report?.completion?.newText === "searchText", issues, "completion insertion text drifted");
  check(report?.completion?.rangeText === "searchText", issues, "completion replacement range drifted");
  check(fileUriIdentifiesPath(report?.completion?.targetUri, context.targetPath), issues, "completion target URI drifted");
  check(JSON.stringify(report?.completion?.position) === JSON.stringify(geometry.position), issues, "completion position drifted");
  check(JSON.stringify(report?.completion?.range) === JSON.stringify(geometry.range), issues, "completion authored range drifted");
  check(report?.observation?.requestCount === 1, issues, "completion request count drifted");
  check(report?.observation?.responseCount === 1, issues, "completion response count drifted");
  check(report?.observation?.failureCount === 0, issues, "completion failure count drifted");
  check(typeof report?.observation?.observationId === "string" && report.observation.observationId.length > 0, issues, "completion correlation id was absent");
  check(Number.isInteger(report?.observation?.itemCount) && report.observation.itemCount > 0, issues, "provider returned no completion items");
  check(Number.isSafeInteger(report?.observation?.documentVersion) && report.observation.documentVersion > 0, issues, "completion document version was invalid");
  check(report?.observation?.request?.source === "language-client-provider", issues, "completion request source drifted");
  check(report?.observation?.request?.operation === "completion" && report?.observation?.request?.phase === "request", issues, "completion request shape drifted");
  check(report?.observation?.response?.source === "language-client-provider", issues, "completion response source drifted");
  check(report?.observation?.response?.operation === "completion" && report?.observation?.response?.phase === "response", issues, "completion response shape drifted");
  check(report?.observation?.request?.observationId === report?.observation?.observationId, issues, "completion request did not correlate");
  check(report?.observation?.response?.observationId === report?.observation?.observationId, issues, "completion response did not correlate");
  check(report?.observation?.request?.line === geometry.position.line, issues, "completion request line drifted");
  check(report?.observation?.request?.character === geometry.position.character, issues, "completion request character drifted");
  check(report?.observation?.request?.itemCount === null, issues, "completion request carried a response item count");
  check(report?.observation?.request?.cancellationRequested === null, issues, "completion request carried a cancellation terminal");
  check(report?.observation?.request?.documentVersion === report?.observation?.documentVersion, issues, "completion request version drifted");
  check(report?.observation?.response?.documentVersion === report?.observation?.documentVersion, issues, "completion response version drifted");
  check(report?.observation?.response?.itemCount === report?.observation?.itemCount, issues, "completion response item count drifted");
  check(Number.isSafeInteger(report?.observation?.response?.itemCount) && report.observation.response.itemCount > 0, issues, "completion response item count was invalid");
  check(report?.observation?.response?.line === null && report?.observation?.response?.character === null, issues, "completion response carried request coordinates");
  check(report?.observation?.response?.cancellationRequested === false, issues, "completion response was canceled");
  check(fileUriIdentifiesPath(report?.observation?.request?.uri, context.targetPath), issues, "completion request URI drifted");
  check(fileUriIdentifiesPath(report?.observation?.response?.uri, context.targetPath), issues, "completion response URI drifted");
  check(report?.customJourney?.command === "aurelia.openRelatedFile", issues, "custom journey command drifted");
  check(report?.customJourney?.commandRegistered === true, issues, "custom journey command was not registered");
  check(report?.customJourney?.resultOk === true, issues, "custom journey command did not settle successfully");
  check(fileUriIdentifiesPath(report?.customJourney?.sourceUri, context.targetPath), issues, "custom journey source URI drifted");
  check(fileUriIdentifiesPath(report?.customJourney?.expectedTargetUri, relatedPath), issues, "custom journey expected target URI drifted");
  check(fileUriIdentifiesPath(report?.customJourney?.activeEditorUri, relatedPath), issues, "custom journey active editor URI drifted");
  check(report?.customJourney?.targetLanguageId === "typescript", issues, "custom journey target language drifted");
  check(report?.customJourney?.targetUnopenedBefore === true, issues, "custom journey target was already open");
  check(report?.customJourney?.sourceDirtyBefore === false, issues, "custom journey source was dirty before navigation");
  check(report?.customJourney?.sourceDirtyAfter === false, issues, "custom journey dirtied its source");
  check(report?.customJourney?.targetDirtyAfter === false, issues, "custom journey dirtied its target");
  check(report?.customJourney?.sourceBytesUnchanged === true, issues, "custom journey changed source bytes");
  check(report?.customJourney?.targetBytesUnchanged === true, issues, "custom journey changed target bytes");
  if (issues.length > 0) throw new Error(`Installed driver report failed validation: ${issues.join("; ")}.`);
  return Object.freeze({ status: "passed", issues: Object.freeze([]) });
}

export async function verifyInstalledVsix(dependencies = {}) {
  rejectAmbientTransportOverrides(dependencies.environment ?? process.env, dependencies.execArgv ?? process.execArgv);
  const readGitState = dependencies.gitState ?? gitState;
  const before = readGitState(dependencies, { repoRoot });
  const verifyArtifact = dependencies.verifyVsix ?? verifyVsix;
  const receipt = await verifyArtifact(dependencies.archiveDependencies ?? {});
  requireArtifactReceipt(receipt, before);
  const packageJson = dependencies.packageJson
    ?? JSON.parse(readFileSync(path.join(extensionRoot, "package.json"), "utf8"));
  const electronTool = (dependencies.testElectronEvidence ?? testElectronEvidence)({
    extensionPackageJson: packageJson,
    ...(dependencies.testElectronDependencies ?? {}),
  });
  const paths = (dependencies.artifactPaths ?? artifactPaths)(packageJson, releaseRoot, before.head);
  const artifactPath = path.resolve(repoRoot, receipt.artifact.path);
  if (!samePath(artifactPath, paths.vsix)) {
    throw new Error("VSIX receipt artifact path does not match the current-HEAD artifact path.");
  }
  for (const [label, candidate] of [["artifact", paths.vsix], ["receipt", paths.receipt], ["checksum", paths.checksum]]) {
    assertStrictChild(paths.releaseRoot, candidate, `VSIX ${label} path`);
  }
  assertRegularRealFile(artifactPath, "Verified VSIX artifact");
  if (sha256(readFileSync(artifactPath)) !== receipt.artifact.sha256) {
    throw new Error("Verified VSIX artifact bytes changed after archive verification.");
  }
  const layout = installedLayout(before.head, dependencies.evidenceParent ?? evidenceParent);
  const state = createEvidenceState({ before, receipt, paths, artifactPath, layout, electronTool });
  claimEvidenceLayout(layout);
  let terminalError = null;

  try {
    state.workspaceDependencies = prepareEvidenceLayout(layout, dependencies);
    state.method.downloadResolutionCount += 1;
    const resolution = await (dependencies.resolveVSCode ?? resolveVSCodeCurrentStable)();
    state.vscode = {
      requestedVersion: requestedVSCodeVersion,
      resolvedVersion: resolution.resolvedVersion,
      executablePath: resolution.vscodeExecutablePath,
      resolutionCount: 1,
      resolvedVersionReportCount: resolution.resolvedVersionReportCount ?? 1,
      retryCount: resolution.retryCount ?? 0,
      progressStages: [...(resolution.progressStages ?? [])],
      reporterErrors: [...(resolution.reporterErrors ?? [])],
      terminalError: resolution.terminalError ?? null,
    };
    state.method.retryCount = state.vscode.retryCount;
    validateResolution(resolution);

    const installInvocation = buildInstallInvocation({
      electron: resolution.electron,
      vscodeExecutablePath: resolution.vscodeExecutablePath,
      artifactPath,
      layout,
    });
    state.install.invocation = serializableInvocation(installInvocation);
    state.method.installCount += 1;
    state.install.startedEpochMilliseconds = Date.now();
    const installResult = await (dependencies.installVsix ?? runChildProcess)(installInvocation);
    state.install.completedEpochMilliseconds = Date.now();
    state.install.result = processResultEvidence(installResult);
    writeBytesExclusive(layout.installStdoutPath, retainedBytes(installResult.stdout));
    writeBytesExclusive(layout.installStderrPath, retainedBytes(installResult.stderr));
    requireSuccessfulProcess(installResult, "VSIX installation");

    const product = discoverInstalledProduct(layout.extensionsDirectory, receipt.identity);
    const installedBeforeHost = verifyInstalledInventory(receipt, product.extensionPath, state.install);
    state.product = {
      extensionPath: product.extensionPath,
      productionClassification: "inferred-installed-production",
      productionInference: "exact isolated installed path and sole inert-driver extensionDevelopmentPath",
      inventoryBeforeHost: installedBeforeHost,
      inventoryAfterHost: null,
    };

    const expectedGeometry = expectedCompletionGeometry(path.join(fixtureRoot, targetRelativePath));
    const hostInvocation = buildHostInvocation({
      vscodeExecutablePath: resolution.vscodeExecutablePath,
      resolvedVersion: resolution.resolvedVersion,
      product,
      identity: receipt.identity,
      layout,
    });
    state.host.invocation = serializableHostInvocation(hostInvocation);
    state.method.hostLaunchCount += 1;
    const hostResult = await (dependencies.runHost ?? ((invocation) => runExtensionHost(resolution.electron, invocation)))(hostInvocation);
    state.host.result = processResultEvidence(hostResult);
    writeBytesExclusive(layout.hostStdoutPath, retainedBytes(hostResult.stdout));
    writeBytesExclusive(layout.hostStderrPath, retainedBytes(hostResult.stderr));

    const logWorkspace = {
      sampleRoot: layout.evidenceRoot,
      workspaceRoot: layout.workspaceRoot,
      userDataDirectory: layout.userDataDirectory,
    };
    try {
      const reportCapture = readBoundedJson(layout.driverReportPath, reportLimitBytes, "Installed driver report");
      state.driverReport = {
        path: repoRelative(layout.driverReportPath),
        bytes: reportCapture.bytes,
        sha256: reportCapture.sha256,
        value: reportCapture.value,
        parseError: reportCapture.parseError,
      };
    } catch (error) {
      state.driverReportCaptureError = errorEvidence(error);
    }
    state.logs.client = captureLogSlot(
      dependencies.readClientLogEvidence ?? readClientLogEvidence,
      logWorkspace,
      layout,
      "client",
      {
        expectedServerPath: path.join(product.extensionPath, "dist", "server", "main.cjs"),
        expectedWorkspaceRoot: layout.workspaceRoot,
      },
    );
    state.logs.extensionHost = captureLogSlot(
      dependencies.readExtensionHostLogEvidence ?? readExtensionHostLogEvidence,
      logWorkspace,
      layout,
      "extensionHost",
    );

    const copiedAfterHost = snapshotRegularTree(layout.workspaceRoot, { ignoredTopLevel: ["node_modules"] });
    state.workspaceAfterHost = copiedAfterHost;
    if (JSON.stringify(copiedAfterHost) !== JSON.stringify(state.workspaceDependencies.fixture.copied)) {
      throw new Error("Installed host changed the byte-attested workspace fixture.");
    }
    state.workspaceDependencyAfterHost = (
      dependencies.validateWorkspaceDependenciesAfterHost ?? validateWorkspaceDependenciesAfterHost
    )(layout.workspaceRoot);

    requireSuccessfulProcess(hostResult, "Installed VSIX host acceptance");
    if (state.driverReportCaptureError != null || state.driverReport == null) {
      throw new Error(`Installed driver report capture failed: ${state.driverReportCaptureError?.message ?? "missing evidence"}.`);
    }
    if (state.driverReport.parseError != null) {
      throw new Error(`Installed driver report JSON failed to parse: ${state.driverReport.parseError.message}.`);
    }
    validateInstalledDriverReport(state.driverReport.value, {
      resolvedVersion: resolution.resolvedVersion,
      product,
      identity: receipt.identity,
      targetPath: path.join(layout.workspaceRoot, targetRelativePath),
      relatedPath: path.join(layout.workspaceRoot, relatedRelativePath),
      geometry: expectedGeometry,
    });
    requireCleanLogSlots(state.logs);

    const productAfterHost = discoverInstalledProduct(layout.extensionsDirectory, receipt.identity);
    if (!samePath(productAfterHost.extensionPath, product.extensionPath)) {
      throw new Error("Installed product path changed during host acceptance.");
    }
    state.product.inventoryAfterHost = verifyInstalledInventory(receipt, productAfterHost.extensionPath, state.install);
    state.method.verifyCount += 1;
    const finalReceipt = await verifyArtifact(dependencies.archiveDependencies ?? {});
    requireArtifactReceipt(finalReceipt, before);
    if (JSON.stringify(finalReceipt) !== JSON.stringify(receipt)) {
      throw new Error("VSIX receipt changed during installed-host acceptance.");
    }
    const after = readGitState(dependencies, { repoRoot });
    requireSameRepositoryState(before, after);
    state.repository.after = after;
    state.status = "passed";
  } catch (error) {
    terminalError = error;
    state.status = "failed";
    state.error = errorEvidence(error);
    try {
      state.repository.after = readGitState(dependencies, { repoRoot });
    } catch (gitError) {
      state.repository.afterError = errorEvidence(gitError);
    }
  }

  const recordFinalizationError = (phase, error) => {
    terminalError ??= error;
    state.status = "failed";
    state.error ??= errorEvidence(error);
    state.finalizationErrors.push({ phase, ...errorEvidence(error) });
  };
  try {
    await dependencies.beforeEvidence?.({ state, layout });
  } catch (error) {
    recordFinalizationError("before-evidence", error);
  }
  try {
    auditRetainedEvidence(state, layout, receipt, {
      validateWorkspaceDependenciesAfterHost:
        dependencies.validateWorkspaceDependenciesAfterHost ?? validateWorkspaceDependenciesAfterHost,
    });
  } catch (error) {
    recordFinalizationError("final-audit", error);
  }
  try {
    const finalRepository = readGitState(dependencies, { repoRoot });
    requireSameRepositoryState(before, finalRepository);
    state.repository.final = finalRepository;
  } catch (error) {
    recordFinalizationError("final-repository", error);
  }
  writeEvidenceExclusive(layout.evidencePath, state);
  if (terminalError != null) throw terminalError;
  return Object.freeze(state);
}

function createEvidenceState({ before, receipt, paths, artifactPath, layout, electronTool }) {
  assertRegularRealFile(paths.receipt, "VSIX receipt");
  assertRegularRealFile(paths.checksum, "VSIX checksum");
  const receiptBytes = readFileSync(paths.receipt);
  const checksumBytes = readFileSync(paths.checksum);
  return {
    schemaVersion: installedEvidenceSchemaVersion,
    status: "failed",
    error: null,
    repository: { before, after: null, afterError: null, final: null },
    archive: {
      schemaVersion: artifactSchemaVersion,
      artifactPath: repoRelative(artifactPath),
      artifactBytes: receipt.artifact.bytes,
      artifactSha256: receipt.artifact.sha256,
      receiptPath: repoRelative(paths.receipt),
      receiptBytes: receiptBytes.length,
      receiptSha256: sha256(receiptBytes),
      checksumPath: repoRelative(paths.checksum),
      checksumBytes: checksumBytes.length,
      checksumSha256: sha256(checksumBytes),
      identity: receipt.identity,
    },
    method: {
      packageCount: 0,
      verifyCount: 1,
      downloadResolutionCount: 0,
      installCount: 0,
      hostLaunchCount: 0,
      retryCount: 0,
      replacementCount: 0,
      productModeEvidence: "topology-inferred from exact installed path plus sole inert-driver development path",
      driverModeEvidence: "direct ExtensionContext.extensionMode Test evidence",
      rawStderrPolicy: "descriptive-retained-and-hashed",
      installedInventoryPolicy,
    },
    layout: Object.fromEntries(Object.entries(layout).map(([key, value]) => [key, repoRelative(value)])),
    driverInputs: [
      fileEvidence(path.join(driverRoot, "package.json")),
      fileEvidence(path.join(driverRoot, "extension.cjs")),
      fileEvidence(driverTestsPath),
    ],
    tools: { testElectron: electronTool },
    workspaceDependencies: null,
    workspaceAfterHost: null,
    workspaceDependencyAfterHost: null,
    vscode: null,
    install: {
      invocation: null,
      startedEpochMilliseconds: null,
      completedEpochMilliseconds: null,
      result: null,
    },
    product: null,
    host: { invocation: null, result: null },
    driverReport: null,
    driverReportCaptureError: null,
    logs: { client: null, extensionHost: null },
    finalizationErrors: [],
  };
}

function prepareEvidenceLayout(layout, dependencies) {
  const copyWorkspace = dependencies.copyWorkspace ?? ((source, target) => cpSync(source, target, { recursive: true }));
  assertRegularRealDirectory(fixtureRoot, "Installed acceptance fixture");
  const sourceSnapshot = snapshotRegularTree(fixtureRoot);
  copyWorkspace(fixtureRoot, layout.workspaceRoot);
  assertRegularRealDirectory(layout.workspaceRoot, "Copied installed workspace");
  const copiedSnapshot = snapshotRegularTree(layout.workspaceRoot);
  if (JSON.stringify(copiedSnapshot) !== JSON.stringify(sourceSnapshot)) {
    throw new Error("Copied installed workspace does not byte-match the complete source fixture tree.");
  }
  writeTextExclusive(layout.workspaceFile, `${JSON.stringify({ folders: [{ name: "installed-vsix", path: "w" }] }, null, 2)}\n`);
  const workspaceDependencies = (dependencies.prepareWorkspaceDependencies ?? prepareWorkspaceDependencies)({
    outputRoot: layout.evidenceParent,
    sampleRoot: layout.evidenceRoot,
    workspaceRoot: layout.workspaceRoot,
  }, {
    dependencyRoot,
    expectedDependencyRoot: dependencyRoot,
  });
  const targetPath = path.join(layout.workspaceRoot, targetRelativePath);
  assertRegularRealFile(targetPath, "Installed completion target");
  const relatedPath = path.join(layout.workspaceRoot, relatedRelativePath);
  assertRegularRealFile(relatedPath, "Installed related-file target");
  return Object.freeze({
    fixture: Object.freeze({ source: sourceSnapshot, copied: copiedSnapshot, equal: true }),
    dependencies: workspaceDependencies,
  });
}

function claimEvidenceLayout(layout) {
  const repoTemp = path.join(repoRoot, ".temp");
  ensureRegularDirectory(repoRoot, "Repository root");
  ensureDirectChildDirectory(repoRoot, repoTemp, "Repository temporary root");
  ensureDirectChildDirectory(repoTemp, layout.evidenceParent, "Installed evidence parent");
  if (existsSync(layout.evidenceRoot)) {
    throw new Error(`Refusing to overwrite installed-VSIX evidence: ${layout.evidenceRoot}`);
  }
  mkdirSync(layout.evidenceRoot);
  assertRegularRealDirectory(layout.evidenceRoot, "Installed evidence root");
  for (const directory of [layout.userDataDirectory, layout.extensionsDirectory]) {
    mkdirSync(directory);
    assertRegularRealDirectory(directory, "Installed evidence directory");
  }
}

export async function resolveVSCodeCurrentStable(dependencies = {}) {
  const electron = dependencies.electron ?? await import("@vscode/test-electron");
  const consoleReporter = dependencies.consoleReporter ?? await electron.makeConsoleReporter();
  const reports = [];
  const errors = [];
  let vscodeExecutablePath = null;
  let terminalError = null;
  try {
    vscodeExecutablePath = await electron.downloadAndUnzipVSCode({
      version: requestedVSCodeVersion,
      extensionDevelopmentPath: driverRoot,
      reporter: {
        error: (error) => {
          errors.push(error instanceof Error ? error.message : String(error));
          consoleReporter.error(error);
        },
        report: (report) => {
          reports.push(report);
          consoleReporter.report(report);
        },
      },
    });
  } catch (error) {
    terminalError = errorEvidence(error);
  }
  const resolvedRows = reports.filter((report) =>
    report.stage === electron.ProgressReportStage.ResolvedVersion);
  const retryRows = reports.filter((report) =>
    report.stage === electron.ProgressReportStage.Retrying);
  return {
    electron,
    vscodeExecutablePath,
    resolvedVersion: resolvedRows.length === 1 ? resolvedRows[0].version : null,
    resolvedVersionReportCount: resolvedRows.length,
    retryCount: retryRows.length,
    progressStages: reports.map((report) => report.stage),
    reporterErrors: errors,
    terminalError,
  };
}

export function validateResolution(resolution) {
  if (resolution?.terminalError != null) {
    throw new Error(`VS Code resolution failed: ${resolution.terminalError.message}.`);
  }
  if (!resolution?.electron || typeof resolution.electron.runTests !== "function") {
    throw new Error("VS Code resolution did not retain the pinned test-electron API.");
  }
  if ((resolution.resolvedVersionReportCount ?? 1) !== 1) {
    throw new Error(
      `Current-stable VS Code resolution reported ${resolution.resolvedVersionReportCount ?? 0} exact versions; expected one.`,
    );
  }
  if ((resolution.retryCount ?? 0) !== 0) {
    throw new Error(`Current-stable VS Code resolution retried ${resolution.retryCount} time(s); expected zero.`);
  }
  if ((resolution.reporterErrors ?? []).length > 0) {
    throw new Error(`Current-stable VS Code resolution reported errors: ${resolution.reporterErrors.join("; ")}`);
  }
  if (!/^\d+\.\d+\.\d+$/u.test(resolution.resolvedVersion ?? "")) {
    throw new Error("VS Code resolution did not report an exact numeric current-stable version.");
  }
  if (compareVersions(resolution.resolvedVersion, "1.91.0") < 0) {
    throw new Error(`Resolved VS Code ${resolution.resolvedVersion} is below the supported 1.91.0 floor.`);
  }
  assertRegularRealFile(resolution.vscodeExecutablePath, "Resolved VS Code executable");
}

export async function runChildProcess(invocation) {
  return new Promise((resolve, reject) => {
    const child = spawn(invocation.command, invocation.args, {
      cwd: invocation.cwd,
      env: process.env,
      shell: process.platform === "win32" && /\.cmd$/iu.test(invocation.command),
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => { stdout.push(Buffer.from(chunk)); });
    child.stderr.on("data", (chunk) => { stderr.push(Buffer.from(chunk)); });
    child.once("error", reject);
    child.once("close", (exitCode, signal) => resolve({
      exitCode,
      signal,
      stdout: Buffer.concat(stdout),
      stderr: Buffer.concat(stderr),
    }));
  });
}

async function runExtensionHost(electron, invocation) {
  const stdout = captureWritable();
  const stderr = captureWritable();
  try {
    const exitCode = await electron.runTests({ ...invocation, stdout: stdout.stream, stderr: stderr.stream });
    return { exitCode, signal: null, stdout: stdout.buffer(), stderr: stderr.buffer(), error: null };
  } catch (error) {
    return {
      exitCode: typeof error?.code === "number" ? error.code : null,
      signal: typeof error?.signal === "string" ? error.signal : null,
      stdout: stdout.buffer(),
      stderr: stderr.buffer(),
      error: errorEvidence(error),
    };
  }
}

export function requireArtifactReceipt(receipt, repository) {
  if (receipt?.schemaVersion !== artifactSchemaVersion) throw new Error("VSIX receipt schema drifted.");
  if (receipt?.repository?.before?.head !== repository.head || receipt?.repository?.after?.head !== repository.head) {
    throw new Error("VSIX receipt does not bind the current repository HEAD.");
  }
  if (receipt?.identity?.id !== productId) throw new Error("VSIX receipt product identity drifted.");
}

export function requireSuccessfulProcess(result, label) {
  if (result?.exitCode !== 0 || result?.signal != null || result?.error != null) {
    throw new Error(`${label} failed with exit=${String(result?.exitCode)} signal=${String(result?.signal)}: ${result?.error?.message ?? "no structured error"}`);
  }
}

function captureLogSlot(reader, workspace, layout, kind, expectations = {}) {
  try {
    const helper = reader(workspace);
    const evidence = logEvidenceEntry(helper, layout, kind, expectations);
    const validationIssues = [...(helper.validationIssues ?? [])];
    if (kind === "client" && evidence.workerOnlineCount !== 1) {
      validationIssues.push(
        `own Client.log recorded ${evidence.workerOnlineCount} Worker-online markers; expected exactly one`,
      );
    }
    if (
      kind === "client"
      && (
        evidence.startedWorkspaceUris.length !== 1
        || !fileUriIdentifiesPath(evidence.startedWorkspaceUris[0], expectations.expectedWorkspaceRoot)
      )
    ) {
      validationIssues.push("own Client.log did not start exactly the installed workspace");
    }
    if (kind === "client" && evidence.stoppedCount !== 1) {
      validationIssues.push(`own Client.log recorded ${evidence.stoppedCount} stops; expected exactly one`);
    }
    if (kind === "client" && evidence.workerFaults.length !== 0) {
      validationIssues.push(`own Client.log recorded ${evidence.workerFaults.length} Worker fault marker(s)`);
    }
    if (kind === "client" && evidence.overrideMarkerCount !== 0) {
      validationIssues.push(`own Client.log recorded ${evidence.overrideMarkerCount} server override marker(s)`);
    }
    if (
      kind === "client"
      && (
        evidence.resolvedServerModules.length !== 1
        || !samePath(evidence.resolvedServerModules[0], expectations.expectedServerPath)
      )
    ) {
      validationIssues.push("own Client.log did not resolve exactly the installed VSIX server module");
    }
    if (kind === "extensionHost" && evidence.activationRecordCount !== 1) {
      validationIssues.push(
        `Extension Host log recorded ${evidence.activationRecordCount} Aurelia activation records; expected exactly one`,
      );
    }
    if (kind === "extensionHost" && evidence.startup !== true) {
      validationIssues.push("Extension Host Aurelia activation was not startup:true");
    }
    if (
      kind === "extensionHost"
      && ![
        "workspaceContains:node_modules/aurelia/package.json",
        "workspaceContains:node_modules/@aurelia/runtime-html/package.json",
      ].includes(evidence.activationEvent)
    ) {
      validationIssues.push("Extension Host Aurelia activation was not an accepted shipping workspaceContains event");
    }
    return { evidence, captureError: null, validationIssues };
  } catch (error) {
    return { evidence: null, captureError: errorEvidence(error), validationIssues: [] };
  }
}

function requireCleanLogSlots(logs) {
  const issues = [];
  for (const [kind, slot] of Object.entries(logs)) {
    if (slot?.captureError != null) issues.push(`${kind} capture failed: ${slot.captureError.message}`);
    if (slot?.evidence == null) issues.push(`${kind} evidence is missing`);
    issues.push(...(slot?.validationIssues ?? []).map((issue) => `${kind}: ${issue}`));
  }
  if (issues.length > 0) throw new Error(`Installed host log evidence failed: ${issues.join("; ")}.`);
}

function logEvidenceEntry(helper, layout, kind, expectations) {
  const logsRoot = path.join(layout.userDataDirectory, "logs");
  const isClient = kind === "client";
  const label = isClient ? "Client log" : "Extension Host log";
  const file = captureRetainedFile(helper.path, logsRoot, label, isClient ? 16 * 1024 * 1024 : 32 * 1024 * 1024);
  if (file.bytes !== helper.bytes || file.sha256 !== helper.sha256) {
    throw new Error(`${label} helper evidence disagrees with retained bytes.`);
  }
  const raw = readFileSync(helper.path, "utf8");
  const parsedRows = raw
    .split(/\r?\n/gu)
    .map((line) => ({
      line,
      message: /^\S+ \S+ \[(?:trace|debug|info|warning|error)\] (.*)$/u.exec(line)?.[1] ?? null,
    }));
  const messages = parsedRows.map(({ message }) => message).filter((message) => message != null);
  const workerOnlineMarker = "[worker-transport.client] Worker transport is online";
  const workerOnlineCount = messages
    .filter((message) => message === workerOnlineMarker || message.startsWith(`${workerOnlineMarker} `))
    .length;
  const serverModulePrefix = "[client] resolved server module: ";
  const resolvedServerModules = messages
    .filter((message) => message.startsWith(serverModulePrefix))
    .map((message) => message.slice(serverModulePrefix.length).trim());
  const overrideMarkerCount = messages
    .filter((message) =>
      message.startsWith("[client] using server override:")
      || message.startsWith("[client] override set but not found:")
    )
    .length;
  const startedWorkspaceUris = messages
    .filter((message) => message.startsWith("[client] started ") && message.endsWith(" from package-manifest"))
    .map((message) => message.slice("[client] started ".length, -" from package-manifest".length));
  const stoppedCount = messages.filter((message) => message === "[client] stopped").length;
  const workerFaultMarkers = [
    "[worker-transport.client] Worker stderr",
    "[worker-transport.client] Worker transport failed",
    "[worker-transport.client] Worker transport exited abnormally",
    "[worker-transport.client] Worker transport exceeded its shutdown grace",
  ];
  const workerFaults = workerFaultMarkers.flatMap((marker) => messages
    .map((message, messageIndex) => ({ message, messageIndex }))
    .filter(({ message }) => message.startsWith(marker))
    .map(({ messageIndex }) => ({ marker, messageIndex })));
  const activationRows = parsedRows.filter(({ message }) =>
    message?.startsWith("ExtensionService#_doActivateExtension AureliaEffect.aurelia-2,"));
  const activationMatch = activationRows.length === 1
    ? /^ExtensionService#_doActivateExtension AureliaEffect\.aurelia-2, startup: (true|false), activationEvent: '([^']+)'$/u
      .exec(activationRows[0].message)
    : null;
  return isClient
    ? {
        ...file,
        startedWorkspaceUris,
        stoppedCount,
        workerFaults,
        workerOnlineCount,
        resolvedServerModules,
        expectedServerModule: expectations.expectedServerPath,
        overrideMarkerCount,
      }
    : {
        ...file,
        rawActivationLine: activationRows.length === 1 ? activationRows[0].line : null,
        activationRecordCount: activationRows.length,
        startup: activationMatch == null ? null : activationMatch[1] === "true",
        activationEvent: activationMatch?.[2] ?? null,
      };
}

function processResultEvidence(result) {
  const stdout = retainedBytes(result?.stdout);
  const stderr = retainedBytes(result?.stderr);
  return {
    exitCode: result?.exitCode ?? null,
    signal: result?.signal ?? null,
    error: result?.error ?? null,
    stdoutBytes: stdout.length,
    stdoutSha256: sha256(stdout),
    stderrBytes: stderr.length,
    stderrSha256: sha256(stderr),
  };
}

function retainedBytes(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value == null) return Buffer.alloc(0);
  return Buffer.from(String(value), "utf8");
}

function fileEvidence(filePath) {
  assertRegularRealFile(filePath, "Installed gate input");
  const bytes = readFileSync(filePath);
  return {
    path: repoRelative(filePath),
    bytes: bytes.length,
    sha256: sha256(bytes),
  };
}

function captureRetainedFile(filePath, parent, label, maximumBytes) {
  if (typeof filePath !== "string") throw new Error(`${label} path is missing.`);
  assertStrictChild(parent, filePath, label);
  assertRegularRealFile(filePath, label);
  const value = readFileSync(filePath);
  if (value.length === 0 || value.length > maximumBytes) {
    throw new Error(`${label} bytes must be within 1..${maximumBytes}; received ${value.length}.`);
  }
  return {
    path: repoRelative(filePath),
    bytes: value.length,
    sha256: sha256(value),
  };
}

function auditRetainedEvidence(state, layout, receipt, dependencies) {
  const checks = [];
  const add = (candidate, expectedBytes, expectedSha256, label) => {
    if (candidate == null || expectedBytes == null || expectedSha256 == null) return;
    checks.push({ candidate, expectedBytes, expectedSha256, label });
  };
  add(path.resolve(repoRoot, state.archive.artifactPath), state.archive.artifactBytes, state.archive.artifactSha256, "VSIX artifact");
  add(path.resolve(repoRoot, state.archive.receiptPath), state.archive.receiptBytes, state.archive.receiptSha256, "VSIX receipt");
  add(path.resolve(repoRoot, state.archive.checksumPath), state.archive.checksumBytes, state.archive.checksumSha256, "VSIX checksum");
  add(layout.installStdoutPath, state.install.result?.stdoutBytes, state.install.result?.stdoutSha256, "install stdout");
  add(layout.installStderrPath, state.install.result?.stderrBytes, state.install.result?.stderrSha256, "install stderr");
  add(layout.hostStdoutPath, state.host.result?.stdoutBytes, state.host.result?.stdoutSha256, "host stdout");
  add(layout.hostStderrPath, state.host.result?.stderrBytes, state.host.result?.stderrSha256, "host stderr");
  add(layout.driverReportPath, state.driverReport?.bytes, state.driverReport?.sha256, "driver report");
  add(
    state.logs?.client?.evidence?.path == null ? null : path.resolve(repoRoot, state.logs.client.evidence.path),
    state.logs?.client?.evidence?.bytes,
    state.logs?.client?.evidence?.sha256,
    "Client log",
  );
  add(
    state.logs?.extensionHost?.evidence?.path == null ? null : path.resolve(repoRoot, state.logs.extensionHost.evidence.path),
    state.logs?.extensionHost?.evidence?.bytes,
    state.logs?.extensionHost?.evidence?.sha256,
    "Extension Host log",
  );
  for (const { candidate, expectedBytes, expectedSha256, label } of checks) {
    assertRegularRealFile(candidate, label);
    const value = readFileSync(candidate);
    if (value.length !== expectedBytes || sha256(value) !== expectedSha256) {
      throw new Error(`${label} changed after it was captured for installed-VSIX evidence.`);
    }
  }

  for (const input of state.driverInputs ?? []) {
    const candidate = path.resolve(repoRoot, input.path);
    assertStrictChild(repoRoot, candidate, "Installed driver input");
    assertRegularRealFile(candidate, "Installed driver input");
    const value = readFileSync(candidate);
    if (value.length !== input.bytes || sha256(value) !== input.sha256) {
      throw new Error(`Installed driver input changed after it was captured: ${input.path}.`);
    }
  }
  const testElectron = state.tools?.testElectron;
  if (testElectron != null) {
    const candidate = path.resolve(repoRoot, testElectron.packageJsonPath);
    assertStrictChild(repoRoot, candidate, "@vscode/test-electron package.json");
    assertRegularRealFile(candidate, "@vscode/test-electron package.json");
    const value = readFileSync(candidate);
    if (value.length !== testElectron.packageJsonBytes || sha256(value) !== testElectron.packageJsonSha256) {
      throw new Error("@vscode/test-electron package.json changed after it was captured.");
    }
  }

  const copiedFixture = state.workspaceDependencies?.fixture?.copied;
  if (copiedFixture != null) {
    const currentWorkspace = snapshotRegularTree(layout.workspaceRoot, { ignoredTopLevel: ["node_modules"] });
    if (JSON.stringify(currentWorkspace) !== JSON.stringify(copiedFixture)) {
      throw new Error("Installed workspace changed after its final host snapshot.");
    }
    if (state.workspaceAfterHost != null && JSON.stringify(currentWorkspace) !== JSON.stringify(state.workspaceAfterHost)) {
      throw new Error("Installed workspace final audit disagrees with its post-host snapshot.");
    }
  }
  if (state.workspaceDependencyAfterHost != null) {
    const dependencyEvidence = dependencies.validateWorkspaceDependenciesAfterHost(layout.workspaceRoot);
    if (JSON.stringify(dependencyEvidence) !== JSON.stringify(state.workspaceDependencyAfterHost)) {
      throw new Error("Installed workspace dependency identity changed after its post-host validation.");
    }
  }

  if (state.product != null) {
    const product = discoverInstalledProduct(layout.extensionsDirectory, receipt.identity);
    if (!samePath(product.extensionPath, state.product.extensionPath)) {
      throw new Error("Installed product path changed after its post-host validation.");
    }
    const currentInventory = verifyInstalledInventory(receipt, product.extensionPath, state.install);
    const expectedInventory = state.product.inventoryAfterHost ?? state.product.inventoryBeforeHost;
    if (JSON.stringify(currentInventory) !== JSON.stringify(expectedInventory)) {
      throw new Error("Installed product inventory changed after its post-host validation.");
    }
  }
}

function serializableInvocation(invocation) {
  return { command: invocation.command, args: [...invocation.args], cwd: invocation.cwd };
}

function serializableHostInvocation(invocation) {
  return {
    vscodeExecutablePath: invocation.vscodeExecutablePath,
    extensionDevelopmentPath: invocation.extensionDevelopmentPath,
    extensionTestsPath: invocation.extensionTestsPath,
    launchArgs: [...invocation.launchArgs],
    extensionTestsEnv: { ...invocation.extensionTestsEnv },
  };
}

function readBoundedJson(filePath, maximumBytes, label) {
  assertRegularRealFile(filePath, label);
  const bytes = readFileSync(filePath);
  if (bytes.length === 0 || bytes.length > maximumBytes) {
    throw new Error(`${label} bytes must be within 1..${maximumBytes}; received ${bytes.length}.`);
  }
  try {
    return {
      value: JSON.parse(bytes.toString("utf8")),
      parseError: null,
      bytes: bytes.length,
      sha256: sha256(bytes),
    };
  } catch (error) {
    return {
      value: null,
      parseError: errorEvidence(error),
      bytes: bytes.length,
      sha256: sha256(bytes),
    };
  }
}

function expectedCompletionGeometry(targetPath) {
  const text = readFileSync(targetPath, "utf8");
  const anchor = "state.servicePlans.searchText";
  const prefix = "state.servicePlans.";
  const anchorOffset = text.indexOf(anchor);
  if (anchorOffset < 0 || text.indexOf(anchor, anchorOffset + 1) >= 0) {
    throw new Error("Installed completion anchor must occur exactly once in the target document.");
  }
  const startOffset = anchorOffset + prefix.length;
  const endOffset = startOffset + "searchText".length;
  return {
    position: positionAt(text, startOffset),
    range: { start: positionAt(text, startOffset), end: positionAt(text, endOffset) },
  };
}

function positionAt(text, offset) {
  const before = text.slice(0, offset);
  const lines = before.split(/\r\n|\r|\n/u);
  return { line: lines.length - 1, character: lines.at(-1).length };
}

function regularTree(root, ignoredTopLevel = new Set()) {
  const files = [];
  const directories = [];
  const visit = (directory, depth) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (depth === 0 && ignoredTopLevel.has(entry.name)) continue;
      const candidate = path.join(directory, entry.name);
      const info = lstatSync(candidate);
      if (info.isSymbolicLink()) throw new Error(`Installed payload contains a symbolic link: ${candidate}`);
      if (entry.isDirectory()) {
        directories.push(candidate);
        visit(candidate, depth + 1);
      } else if (entry.isFile()) {
        files.push(candidate);
      } else {
        throw new Error(`Installed payload contains an unsupported filesystem entry: ${candidate}`);
      }
    }
  };
  visit(root, 0);
  return { files, directories };
}

export function captureWritable() {
  const chunks = [];
  return {
    stream: new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    }),
    buffer: () => Buffer.concat(chunks),
    text: () => Buffer.concat(chunks).toString("utf8"),
  };
}

function writeTextExclusive(filePath, value) {
  assertStrictChild(path.dirname(filePath), filePath, "Evidence file");
  writeFileSync(filePath, value, { encoding: "utf8", flag: "wx" });
}

function writeBytesExclusive(filePath, value) {
  assertStrictChild(path.dirname(filePath), filePath, "Evidence file");
  writeFileSync(filePath, value, { flag: "wx" });
}

function writeEvidenceExclusive(filePath, value) {
  const raw = `${JSON.stringify(value, null, 2)}\n`;
  if (Buffer.byteLength(raw) > evidenceLimitBytes) throw new Error("Installed-VSIX evidence exceeds its bounded size.");
  const temporaryPath = `${filePath}.temporary`;
  writeFileSync(temporaryPath, raw, { encoding: "utf8", flag: "wx" });
  linkSync(temporaryPath, filePath);
  unlinkSync(temporaryPath);
  assertRegularRealFile(filePath, "Installed-VSIX evidence");
  if (readFileSync(filePath, "utf8") !== raw) throw new Error("Installed-VSIX evidence bytes drifted after publication.");
}

function ensureDirectChildDirectory(parent, candidate, label) {
  assertStrictChild(parent, candidate, label);
  if (!existsSync(candidate)) mkdirSync(candidate);
  assertRegularRealDirectory(candidate, label);
}

function ensureRegularDirectory(candidate, label) {
  if (!existsSync(candidate)) throw new Error(`${label} does not exist: ${candidate}`);
  assertRegularRealDirectory(candidate, label);
}

function assertRegularRealDirectory(candidate, label) {
  const info = lstatSync(candidate);
  if (info.isSymbolicLink() || !info.isDirectory()) throw new Error(`${label} must be a regular non-symlink directory: ${candidate}`);
  if (!samePath(realpathSync(candidate), candidate)) throw new Error(`${label} resolved unexpectedly: ${candidate}`);
}

function assertRegularRealFile(candidate, label) {
  const info = lstatSync(candidate);
  if (info.isSymbolicLink() || !info.isFile()) throw new Error(`${label} must be a regular non-symlink file: ${candidate}`);
  if (!samePath(realpathSync(candidate), candidate)) throw new Error(`${label} resolved unexpectedly: ${candidate}`);
}

function assertStrictChild(parent, child, label) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  if (relative === "" || relative === "." || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`${label} must stay strictly inside ${path.resolve(parent)}: ${path.resolve(child)}`);
  }
}

function assertOutside(parent, child, label) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  if (!(relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))) {
    throw new Error(`${label} must stay outside ${path.resolve(parent)}: ${path.resolve(child)}`);
  }
}

function assertNoForbiddenInstallArguments(args) {
  const joined = args.join(" ");
  for (const forbidden of ["--force", "--disable-extensions", "--extensionDevelopmentPath", "--inspect", "--inspect-brk"]) {
    if (joined.includes(forbidden)) throw new Error(`Installed VSIX invocation contains forbidden argument ${forbidden}.`);
  }
}

function assertNoForbiddenHostArguments(args) {
  const joined = args.join(" ");
  for (const forbidden of ["--disable-extensions", "--disable-extension", "--inspect", "--inspect-brk"]) {
    if (joined.includes(forbidden)) throw new Error(`Installed host invocation contains forbidden argument ${forbidden}.`);
  }
}

function rejectAmbientTransportOverrides(environment, execArgv) {
  for (const name of ["AURELIA_LS_FORCE_IPC_TRANSPORT", "AURELIA_LS_SERVER_PATH"]) {
    if (environment[name] !== undefined) {
      throw new Error(`Installed acceptance requires shipping defaults without ${name}.`);
    }
  }
  const isDebugArgument = (argument) => /^(?:--inspect(?:-brk)?|--debug(?:-brk)?)(?:=.*)?$/u.test(argument);
  if (execArgv.some(isDebugArgument)) {
    throw new Error("Installed acceptance cannot run under an inspector transport override.");
  }
  if (
    typeof environment.NODE_OPTIONS === "string"
    && /(?:^|\s)--(?:inspect(?:-brk)?|debug(?:-brk)?)(?:=\S*)?(?=\s|$)/u.test(environment.NODE_OPTIONS)
  ) {
    throw new Error("Installed acceptance cannot pass an inspector through NODE_OPTIONS.");
  }
}

export function requireSameRepositoryState(before, after) {
  if (before.head !== after.head || before.status !== after.status || before.submodules !== after.submodules) {
    throw new Error("Repository state changed during installed-VSIX acceptance.");
  }
}

function requireFullObjectId(value) {
  if (typeof value !== "string" || !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(value)) {
    throw new Error("Installed-VSIX evidence requires a full lowercase hexadecimal repository HEAD.");
  }
}

function samePath(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const normalize = (candidate) => process.platform === "win32"
    ? path.resolve(candidate).toLowerCase()
    : path.resolve(candidate);
  return normalize(left) === normalize(right);
}

function fileUriIdentifiesPath(uri, expectedPath) {
  if (typeof uri !== "string") return false;
  try {
    return samePath(fileURLToPath(uri), expectedPath);
  } catch {
    return false;
  }
}

function repoRelative(candidate) {
  if (typeof candidate !== "string") return null;
  const resolved = path.resolve(candidate);
  assertStrictChild(repoRoot, resolved, "Retained evidence path");
  return path.relative(repoRoot, resolved).split(path.sep).join("/");
}

function codePointCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function check(condition, issues, message) {
  if (!condition) issues.push(message);
}

function compareVersions(left, right) {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
  }
  return 0;
}

function errorEvidence(error) {
  return {
    name: error instanceof Error ? error.name : "Error",
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack ?? null : null,
  };
}

async function main() {
  const args = parseInstalledArguments(process.argv.slice(2));
  if (args.planOnly) {
    const repository = gitState();
    const packageJson = JSON.parse(readFileSync(path.join(extensionRoot, "package.json"), "utf8"));
    process.stdout.write(`${JSON.stringify(publicInstalledPlan({ repositoryHead: repository.head, packageJson }))}\n`);
    return;
  }
  const evidence = await verifyInstalledVsix();
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  await main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
