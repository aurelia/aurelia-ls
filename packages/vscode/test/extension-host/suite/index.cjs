const assert = require("assert");
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

  return new Promise((resolve, reject) => {
    try {
      mocha.run((failures) => {
        if (failures > 0) {
          reject(new Error(`${failures} extension-host test(s) failed.`));
        } else {
          resolve();
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

async function assertHostSelection() {
  const transportModuleUrl = pathToFileURL(path.resolve(
    __dirname,
    "../../../out/worker-transport.js",
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
