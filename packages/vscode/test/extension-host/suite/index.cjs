const assert = require("assert");
const { lstatSync, realpathSync } = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const Mocha = require("mocha");
const vscode = require("vscode");

const minimumVSCodeVersion = "1.91.0";
const shardFiles = Object.freeze({
  "worker-lifecycle": "worker-languageclient-restart.test.cjs",
  "rename-reliability": "rename-undo-redo.test.cjs",
  "product-support": "product-surface.test.cjs",
});
const shard = requiredEnvironment("AURELIA_LS_EXTENSION_HOST_SHARD");
const expectedActualVersion = requiredEnvironment("AURELIA_LS_EXTENSION_HOST_EXPECTED_ACTUAL_VERSION");
const expectedVersion = requiredEnvironment("AURELIA_LS_EXTENSION_HOST_EXPECTED_VERSION");
const expectedTransport = requiredEnvironment("AURELIA_LS_EXTENSION_HOST_EXPECTED_TRANSPORT");
const forcedIpc = requiredEnvironment("AURELIA_LS_FORCE_IPC_TRANSPORT");

if (!Object.hasOwn(shardFiles, shard)) {
  throw new Error(`Unknown Extension Host shard: ${shard}`);
}
if (expectedVersion !== "stable" && expectedVersion !== minimumVSCodeVersion) {
  throw new Error(`Expected VS Code version must be stable or ${minimumVSCodeVersion}.`);
}
if (expectedTransport !== "worker" && expectedTransport !== "ipc") {
  throw new Error("Expected Extension Host transport must be worker or ipc.");
}
if ((expectedTransport === "ipc") !== (forcedIpc === "1")) {
  throw new Error("Expected transport and AURELIA_LS_FORCE_IPC_TRANSPORT disagree.");
}
if (forcedIpc !== "0" && forcedIpc !== "1") {
  throw new Error("AURELIA_LS_FORCE_IPC_TRANSPORT must be 0 or 1.");
}
if (expectedTransport === "ipc" && shard !== "product-support") {
  throw new Error("Forced IPC may only authenticate the product-support shard.");
}
if (expectedTransport === "ipc" && expectedVersion !== "stable") {
  throw new Error("Forced IPC may only authenticate the current-stable support lane.");
}

async function run() {
  await assertHostSelection();

  const mocha = new Mocha({
    ui: "tdd",
    color: true,
    // Scenario assertions own their deadlines; this ceiling only covers the sum
    // of several intentional cold compiler and editor lifecycle cycles.
    timeout: 300000,
  });
  if (process.env.AURELIA_LS_EXTENSION_HOST_GREP) {
    mocha.grep(process.env.AURELIA_LS_EXTENSION_HOST_GREP);
  }
  mocha.addFile(path.join(__dirname, shardFiles[shard]));
  if (shard === "product-support") {
    mocha.addFile(path.join(__dirname, "diagnostics-lifecycle.test.cjs"));
  }

  return new Promise((resolve, reject) => {
    try {
      const runner = mocha.run((failures) => {
        if (failures > 0) {
          reject(new Error(`${failures} extension-host test(s) failed.`));
        } else {
          resolve();
        }
      });
      runner.on("fail", (test, error) => {
        const detail = error instanceof Error
          ? (error.stack ?? error.message)
          : String(error);
        console.error(
          `[aurelia-extension-host] ${test.fullTitle()} failed:\n${detail.slice(0, 12_000)}`,
        );
      });
    } catch (error) {
      reject(error);
    }
  });
}

async function assertHostSelection() {
  const product = vscode.extensions.getExtension("AureliaEffect.aurelia-2");
  assert(product, "Expected the Aurelia product extension.");
  const productMode = requiredEnvironment("AURELIA_LS_EXTENSION_HOST_PRODUCT_MODE");
  if (productMode === "installed-vsix") {
    await assertInstalledProduct(product);
  } else {
    assert.strictEqual(productMode, "development");
  }
  const harnessRoot = requiredEnvironment("AURELIA_LS_EXTENSION_HOST_HARNESS_ROOT");
  const transportModuleUrl = pathToFileURL(path.resolve(
    harnessRoot,
    "out/worker-transport.js",
  ));
  const { shouldUseWorkerTransport } = await import(transportModuleUrl.href);
  const actualTransport = shouldUseWorkerTransport() ? "worker" : "ipc";
  const actualVersion = vscode.version;

  assert.strictEqual(
    actualTransport,
    expectedTransport,
    `Expected ${expectedTransport} transport, selected ${actualTransport}.`,
  );
  assertSupportedVersion(actualVersion, expectedVersion);
  console.log(
    `[aurelia-extension-host] authenticated shard=${shard} `
      + `vscode=${actualVersion} requestedVersion=${versionLane(expectedVersion)} `
      + `transport=${actualTransport}`,
  );
}

async function assertInstalledProduct(product) {
  const extensionsRoot = realpathSync(requiredEnvironment("AURELIA_LS_INSTALLED_EXTENSIONS_ROOT"));
  const sourceRoot = realpathSync(requiredEnvironment("AURELIA_LS_INSTALLED_SOURCE_EXTENSION_ROOT"));
  const driverRoot = realpathSync(requiredEnvironment("AURELIA_LS_INSTALLED_DRIVER_ROOT"));
  const productMatches = vscode.extensions.all.filter((extension) =>
    extension.id.toLowerCase() === "aureliaeffect.aurelia-2"
  );
  assert.strictEqual(productMatches.length, 1, "Expected exactly one installed Aurelia product extension.");
  assert.strictEqual(product.isActive, true, "workspaceContains must activate the installed Aurelia product before test entry.");
  assert.strictEqual(product.packageJSON.publisher, requiredEnvironment("AURELIA_LS_INSTALLED_PRODUCT_PUBLISHER"));
  assert.strictEqual(product.packageJSON.name, requiredEnvironment("AURELIA_LS_INSTALLED_PRODUCT_NAME"));
  assert.strictEqual(product.packageJSON.version, requiredEnvironment("AURELIA_LS_INSTALLED_PRODUCT_VERSION"));
  assert.strictEqual(product.packageJSON.main, requiredEnvironment("AURELIA_LS_INSTALLED_PRODUCT_MAIN"));
  assert.strictEqual(product.packageJSON.engines?.vscode, requiredEnvironment("AURELIA_LS_INSTALLED_PRODUCT_ENGINE"));
  const productPath = realpathSync(product.extensionPath);
  assertRegularDirectory(productPath, "Installed Aurelia product extension");
  assertSamePath(productPath, requiredEnvironment("AURELIA_LS_INSTALLED_PRODUCT_PATH"), "Installed Aurelia product path");
  assertStrictChild(extensionsRoot, productPath, "Installed Aurelia product path");
  assertOutside(sourceRoot, productPath, "Installed Aurelia product path");
  assertOutside(driverRoot, productPath, "Installed Aurelia product path");
  const drivers = vscode.extensions.all.filter((extension) =>
    extension.id.toLowerCase() === "aurelia-ls-tests.installed-vsix-driver"
  );
  assert.strictEqual(drivers.length, 1, "Expected exactly one inert installed-VSIX driver.");
  const driver = drivers[0];
  const driverApi = await driver.activate();
  assert.strictEqual(driverApi?.extensionMode, vscode.ExtensionMode.Test);
  assertSamePath(driverApi?.extensionPath, driverRoot, "Installed-VSIX driver context path");
  assertSamePath(realpathSync(driver.extensionPath), driverRoot, "Installed-VSIX driver extension path");
}

function assertRegularDirectory(candidate, label) {
  const record = lstatSync(candidate);
  assert(!record.isSymbolicLink() && record.isDirectory(), `${label} must be a regular directory.`);
}

function assertSamePath(actual, expected, label) {
  const normalize = (candidate) => process.platform === "win32"
    ? path.resolve(candidate).toLowerCase()
    : path.resolve(candidate);
  assert.strictEqual(normalize(actual), normalize(expected), `${label} drifted.`);
}

function assertStrictChild(parent, child, label) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  assert(relative !== "" && relative !== "." && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative), `${label} must be a strict child.`);
}

function assertOutside(parent, child, label) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  assert(relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative), `${label} must remain outside ${parent}.`);
}

function requiredEnvironment(name) {
  const value = process.env[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function assertSupportedVersion(actual, expected) {
  const actualParts = parseStableVersion(actual, "actual VS Code version");
  parseStableVersion(expectedActualVersion, "resolved VS Code version");
  const minimumParts = parseStableVersion(minimumVSCodeVersion, "minimum VS Code version");
  assert.strictEqual(
    actual,
    expectedActualVersion,
    `VS Code resolution selected ${expectedActualVersion}, but the host reports ${actual}.`,
  );
  if (expected === minimumVSCodeVersion) {
    assert.strictEqual(
      actual,
      minimumVSCodeVersion,
      `The minimum support lane must run exactly VS Code ${minimumVSCodeVersion}.`,
    );
    return;
  }
  assert(
    compareVersions(actualParts, minimumParts) >= 0,
    `Current stable VS Code ${actual} is below the declared ${minimumVSCodeVersion} floor.`,
  );
}

function parseStableVersion(value, description) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
  assert(match, `${description} must be a stable numeric version, received ${value}.`);
  return match.slice(1).map(Number);
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    const difference = left[index] - right[index];
    if (difference !== 0) return difference;
  }
  return 0;
}

function versionLane(version) {
  return version === "stable" ? "current-stable" : "minimum";
}

module.exports = { run };
