"use strict";

const assert = require("node:assert/strict");
const {
  existsSync,
  linkSync,
  lstatSync,
  readFileSync,
  realpathSync,
  unlinkSync,
  writeFileSync,
} = require("node:fs");
const path = require("node:path");
const vscode = require("vscode");

const schemaVersion = "aurelia-ls/installed-vsix-driver-report/v1";
const productId = "AureliaEffect.aurelia-2";
const driverId = "aurelia-ls-tests.installed-vsix-driver";
const observationEvent = "aurelia-ls:extension-host-observation";
const completionAnchor = "state.servicePlans.searchText";
const completionPrefix = "state.servicePlans.";
const completionLabel = "searchText";
const reportLimitBytes = 64 * 1024;
const observationTimeoutMilliseconds = 25_000;

async function run() {
  const reportPath = requiredEnvironment("AURELIA_LS_INSTALLED_REPORT_PATH");
  const report = emptyReport();
  let caught = null;
  let waiter = null;
  const observations = [];
  const recordObservation = (event) => {
    if (event != null && typeof event === "object") observations.push(event);
  };
  process.on(observationEvent, recordObservation);

  try {
    const environment = strictEnvironment(reportPath);
    report.vscodeVersion = vscode.version;
    assert.strictEqual(vscode.version, environment.vscodeVersion, "The host must use the one resolved VS Code version.");
    assertSingleWorkspace(environment.workspaceRoot);

    const productMatches = vscode.extensions.all.filter((extension) =>
      extension.id.toLowerCase() === productId.toLowerCase()
    );
    report.product.matchCount = productMatches.length;
    assert.strictEqual(productMatches.length, 1, `Expected exactly one installed ${productId} extension.`);
    const product = productMatches[0];
    assertRegularDirectory(product.extensionPath, "Installed product extension root");
    const productPath = realpathSync(product.extensionPath);
    const productManifest = product.packageJSON;
    const productActiveAtTestEntry = product.isActive;
    assert.strictEqual(
      productActiveAtTestEntry,
      true,
      "workspaceContains must activate Aurelia before any driver await at test entry.",
    );
    report.product = {
      matchCount: productMatches.length,
      id: product.id,
      extensionPath: productPath,
      version: productManifest.version ?? null,
      main: productManifest.main ?? null,
      vscodeEngine: productManifest.engines?.vscode ?? null,
      productionClassification: "inferred-installed-production",
      productionInference: "exact installed root under isolated extensions directory; sole extensionDevelopmentPath is the inert driver",
      activeAtTestEntry: productActiveAtTestEntry,
    };
    assert.strictEqual(product.id.toLowerCase(), productId.toLowerCase());
    assert.strictEqual(productManifest.publisher, environment.productPublisher, "Installed product publisher drifted.");
    assert.strictEqual(productManifest.name, environment.productName, "Installed product name drifted.");
    assert.strictEqual(productManifest.version, environment.productVersion, "Installed product version drifted.");
    assert.strictEqual(productManifest.main, environment.productMain, "Installed product main drifted.");
    assert.strictEqual(productManifest.engines?.vscode, environment.productEngine, "Installed product engine drifted.");
    assertSamePath(productPath, environment.productPath, "Installed product path");
    assertInside(environment.extensionsRoot, productPath, "Installed product path");
    assertOutside(environment.sourceExtensionRoot, productPath, "Installed product path");
    assertOutside(environment.driverRoot, productPath, "Installed product path");

    const driverMatches = vscode.extensions.all.filter((extension) =>
      extension.id.toLowerCase() === driverId.toLowerCase()
    );
    report.driver.matchCount = driverMatches.length;
    assert.strictEqual(driverMatches.length, 1, `Expected exactly one inert ${driverId} extension.`);
    const driver = driverMatches[0];
    assertRegularDirectory(driver.extensionPath, "Inert driver extension root");
    const driverPath = realpathSync(driver.extensionPath);
    const driverApi = await driver.activate();
    report.driver = {
      matchCount: driverMatches.length,
      id: driver.id,
      extensionPath: driverPath,
      version: driver.packageJSON.version ?? null,
      mode: extensionModeName(driverApi?.extensionMode),
      modeValue: driverApi?.extensionMode ?? null,
      contextExtensionPath: driverApi?.extensionPath ?? null,
    };
    assert.strictEqual(driverApi?.extensionMode, vscode.ExtensionMode.Test, "The inert runner context must be Test mode.");
    assertSamePath(driverApi?.extensionPath, environment.driverRoot, "Inert driver context path");
    assert.strictEqual(driver.packageJSON.version, "0.0.0", "The inert driver version must remain 0.0.0.");
    assertSamePath(driverPath, environment.driverRoot, "Inert driver path");

    const targetUri = vscode.Uri.file(environment.targetPath);
    report.preconditions.targetUnopenedAtEntry = !vscode.workspace.textDocuments.some((document) =>
      document.uri.toString() === targetUri.toString()
    );
    report.preconditions.targetUnshownAtEntry = !vscode.window.visibleTextEditors.some((editor) =>
      editor.document.uri.toString() === targetUri.toString()
    );
    report.preconditions.productActiveAtEntry = productActiveAtTestEntry;
    report.preconditions.activationMode = vscode.workspace
      .getConfiguration("aurelia", targetUri)
      .get("activationMode");
    assert.strictEqual(report.preconditions.targetUnopenedAtEntry, true, "The completion target must be unopened at test entry.");
    assert.strictEqual(report.preconditions.targetUnshownAtEntry, true, "The completion target must be unshown at test entry.");
    assert.strictEqual(report.preconditions.productActiveAtEntry, true, "workspaceContains must activate Aurelia before driver entry.");
    assert.strictEqual(report.preconditions.activationMode, "auto", "Installed acceptance must use automatic project admission.");
    assert.strictEqual(providerEvents(observations).length, 0, "No provider observations may precede the sole completion trigger.");

    const document = await vscode.workspace.openTextDocument(targetUri);
    assert.strictEqual(document.uri.toString(), targetUri.toString());
    assert.strictEqual(
      vscode.window.visibleTextEditors.some((editor) => editor.document.uri.toString() === targetUri.toString()),
      false,
      "The completion target must remain unshown.",
    );
    const text = document.getText();
    const anchorOffset = text.indexOf(completionAnchor);
    assert(anchorOffset >= 0, `Expected completion anchor ${completionAnchor}.`);
    assert.strictEqual(text.indexOf(completionAnchor, anchorOffset + 1), -1, "Completion anchor must be unique.");
    const position = document.positionAt(anchorOffset + completionPrefix.length);
    waiter = createCompletionWaiter(targetUri.toString(), position);
    report.preconditions.zeroProviderObservationsBeforeTrigger = providerEvents(observations).length === 0;
    assert.strictEqual(report.preconditions.zeroProviderObservationsBeforeTrigger, true);

    const completionResult = await vscode.commands.executeCommand(
      "vscode.executeCompletionItemProvider",
      targetUri,
      position,
    );
    const correlated = await waiter.promise;
    waiter.dispose();
    waiter = null;
    const items = Array.isArray(completionResult)
      ? completionResult
      : Array.isArray(completionResult?.items) ? completionResult.items : [];
    const matches = items.filter((item) =>
      completionItemLabel(item) === completionLabel
        && item.kind === vscode.CompletionItemKind.Property
        && typeof item.detail === "string"
        && item.detail.includes("type-member")
    );
    assert.strictEqual(matches.length, 1, "Expected one exact native searchText Property/type-member completion.");
    const fullProviderTrace = providerEvents(observations);
    assert.strictEqual(fullProviderTrace.length, 2, "Provider trace must contain only the target completion request and response.");
    assert.deepStrictEqual(
      fullProviderTrace.map((event) => [event.source, event.operation, event.phase, event.uri, event.observationId]),
      [
        ["language-client-provider", "completion", "request", targetUri.toString(), correlated.request.observationId],
        ["language-client-provider", "completion", "response", targetUri.toString(), correlated.request.observationId],
      ],
      "Provider trace did not remain an exact correlated completion pair.",
    );
    assert.strictEqual(correlated.request.documentVersion, document.version, "Completion request document version drifted.");
    assert.strictEqual(correlated.response.documentVersion, document.version, "Completion response document version drifted.");
    assert(
      typeof correlated.request.observationId === "string" && correlated.request.observationId.length > 0,
      "Completion request observationId must be a nonempty string.",
    );
    assert(Number.isInteger(correlated.response.itemCount) && correlated.response.itemCount > 0, "Completion response itemCount must be positive.");
    assert.strictEqual(
      correlated.response.itemCount,
      items.length,
      "Completion response itemCount must match the settled native completion result.",
    );
    const item = matches[0];
    const edit = completionEdit(item);
    assert(edit.range != null, "The completion must carry an explicit replacement range.");
    assert.strictEqual(edit.newText, completionLabel, "The completion edit must insert searchText exactly.");
    assert.strictEqual(document.getText(edit.range), completionLabel, "The completion range must replace searchText exactly.");

    report.completion = {
      command: "vscode.executeCompletionItemProvider",
      anchor: completionAnchor,
      label: completionItemLabel(item),
      kind: "Property",
      kindValue: item.kind,
      detail: item.detail,
      detailIncludesTypeMember: item.detail.includes("type-member"),
      newText: edit.newText,
      rangeText: document.getText(edit.range),
      range: serializeRange(edit.range),
      targetUri: targetUri.toString(),
      position: { line: position.line, character: position.character },
    };
    report.observation = {
      observationId: correlated.request.observationId,
      requestCount: correlated.requests.length,
      responseCount: correlated.responses.length,
      failureCount: correlated.failures.length,
      itemCount: correlated.response.itemCount,
      documentVersion: document.version,
      request: sanitizeObservation(correlated.request),
      response: sanitizeObservation(correlated.response),
    };
    report.status = "passed";
  } catch (error) {
    caught = error;
    report.status = "failed";
    report.errors.push(error instanceof Error ? error.message : String(error));
    report.error = {
      name: error instanceof Error ? error.name : "Error",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack ?? null : null,
    };
  } finally {
    waiter?.dispose();
    process.off(observationEvent, recordObservation);
  }

  writeReportAtomically(reportPath, report);
  if (caught != null) throw caught;
}

function strictEnvironment(reportPath) {
  const values = {
    reportPath,
    workspaceRoot: requiredEnvironment("AURELIA_LS_INSTALLED_WORKSPACE_ROOT"),
    targetPath: requiredEnvironment("AURELIA_LS_INSTALLED_TARGET_PATH"),
    vscodeVersion: requiredEnvironment("AURELIA_LS_INSTALLED_VSCODE_VERSION"),
    productVersion: requiredEnvironment("AURELIA_LS_INSTALLED_PRODUCT_VERSION"),
    productPublisher: requiredEnvironment("AURELIA_LS_INSTALLED_PRODUCT_PUBLISHER"),
    productName: requiredEnvironment("AURELIA_LS_INSTALLED_PRODUCT_NAME"),
    productMain: requiredEnvironment("AURELIA_LS_INSTALLED_PRODUCT_MAIN"),
    productEngine: requiredEnvironment("AURELIA_LS_INSTALLED_PRODUCT_ENGINE"),
    productPath: requiredEnvironment("AURELIA_LS_INSTALLED_PRODUCT_PATH"),
    extensionsRoot: requiredEnvironment("AURELIA_LS_INSTALLED_EXTENSIONS_ROOT"),
    sourceExtensionRoot: requiredEnvironment("AURELIA_LS_INSTALLED_SOURCE_EXTENSION_ROOT"),
    driverRoot: requiredEnvironment("AURELIA_LS_INSTALLED_DRIVER_ROOT"),
  };
  for (const [label, candidate] of Object.entries(values)) {
    if (
      label === "vscodeVersion"
      || label === "productVersion"
      || label === "productPublisher"
      || label === "productName"
      || label === "productMain"
      || label === "productEngine"
    ) continue;
    assert(path.isAbsolute(candidate), `${label} must be absolute.`);
  }
  assert(/^\d+\.\d+\.\d+$/.test(values.vscodeVersion), "Resolved VS Code version must be exact and numeric.");
  assertInside(path.dirname(values.reportPath), values.workspaceRoot, "Installed workspace");
  assertInside(values.workspaceRoot, values.targetPath, "Installed target");
  assertRegularDirectory(values.workspaceRoot, "Installed workspace");
  assertRegularDirectory(values.extensionsRoot, "Isolated extensions root");
  assertRegularDirectory(values.sourceExtensionRoot, "Source extension root");
  assertRegularDirectory(values.driverRoot, "Inert driver root");
  const targetInfo = lstatSync(values.targetPath);
  assert(!targetInfo.isSymbolicLink() && targetInfo.isFile(), "Installed target must be a regular non-symlink file.");
  assertSamePath(realpathSync(values.workspaceRoot), values.workspaceRoot, "Installed workspace");
  assertSamePath(realpathSync(values.targetPath), values.targetPath, "Installed target");
  assertSamePath(realpathSync(values.extensionsRoot), values.extensionsRoot, "Isolated extensions root");
  assertSamePath(realpathSync(values.sourceExtensionRoot), values.sourceExtensionRoot, "Source extension root");
  assertSamePath(realpathSync(values.driverRoot), values.driverRoot, "Inert driver root");
  assert.strictEqual(process.env.AURELIA_LS_EXTENSION_HOST_OBSERVATION, "1");
  assert.strictEqual(process.env.AURELIA_LS_EXTENSION_HOST_TAIL_OBSERVATION, "1");
  return values;
}

function emptyReport() {
  return {
    schemaVersion,
    status: "failed",
    errors: [],
    error: null,
    vscodeVersion: null,
    product: { matchCount: 0 },
    driver: { matchCount: 0 },
    preconditions: {
      targetUnopenedAtEntry: false,
      targetUnshownAtEntry: false,
      productActiveAtEntry: false,
      activationMode: null,
      zeroProviderObservationsBeforeTrigger: false,
    },
    completion: null,
    observation: null,
  };
}

function assertSingleWorkspace(expectedRoot) {
  const folders = vscode.workspace.workspaceFolders ?? [];
  assert.strictEqual(folders.length, 1, "Installed acceptance requires one workspace folder.");
  assertSamePath(realpathSync(folders[0].uri.fsPath), expectedRoot, "Workspace folder");
}

function createCompletionWaiter(uri, position) {
  let settled = false;
  let timer;
  let resolvePromise;
  let rejectPromise;
  let request = null;
  const requests = [];
  const responses = [];
  const failures = [];
  const finish = (callback, value) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    process.off(observationEvent, listener);
    callback(value);
  };
  const fail = (message) => finish(rejectPromise, new Error(message));
  const listener = (event) => {
    if (
      settled
      || event == null
      || typeof event !== "object"
      || event.source !== "language-client-provider"
      || event.operation !== "completion"
      || event.uri !== uri
    ) return;
    if (event.phase === "request") {
      requests.push(event);
      if (request != null) return fail("Observed duplicate completion provider requests.");
      if (typeof event.observationId !== "string" || event.observationId.length === 0) {
        return fail("Completion request observationId must be a nonempty string.");
      }
      if (event.line !== position.line || event.character !== position.character) {
        return fail("Completion observation position did not match the native trigger.");
      }
      request = event;
      return;
    }
    if (event.phase === "failed") failures.push(event);
    if (event.phase === "response") responses.push(event);
    if (event.phase !== "failed" && event.phase !== "response") return;
    if (request == null || event.observationId !== request.observationId) {
      return fail("Completion response did not correlate to its request.");
    }
    if (event.phase === "failed") return fail(`Completion provider failed: ${event.errorName ?? "Error"}.`);
    if (event.cancellationRequested !== false) return fail("Completion provider response was canceled.");
    if (requests.length !== 1 || responses.length !== 1 || failures.length !== 0) {
      return fail("Completion provider observation cardinality was not exactly one request and one response.");
    }
    finish(resolvePromise, { request, response: event, requests, responses, failures });
  };
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
    process.on(observationEvent, listener);
    timer = setTimeout(() => fail("Timed out waiting for the correlated completion provider response."), observationTimeoutMilliseconds);
  });
  return {
    promise,
    dispose() {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      process.off(observationEvent, listener);
    },
  };
}

function completionItemLabel(item) {
  return typeof item?.label === "string" ? item.label : item?.label?.label ?? null;
}

function completionEdit(item) {
  const textEdit = item?.textEdit;
  const range = textEdit?.range
    ?? textEdit?.replacing
    ?? textEdit?.inserting
    ?? (item?.range instanceof vscode.Range ? item.range : item?.range?.replacing ?? item?.range?.inserting ?? null);
  const insertText = typeof item?.insertText === "string" ? item.insertText : item?.insertText?.value ?? null;
  return { range, newText: textEdit?.newText ?? insertText };
}

function providerEvents(events) {
  return events.filter((event) => event.source === "language-client-provider");
}

function sanitizeObservation(event) {
  return {
    source: event.source ?? null,
    operation: event.operation ?? null,
    phase: event.phase ?? null,
    observationId: event.observationId ?? null,
    uri: event.uri ?? null,
    documentVersion: Number.isInteger(event.documentVersion) ? event.documentVersion : null,
    line: Number.isInteger(event.line) ? event.line : null,
    character: Number.isInteger(event.character) ? event.character : null,
    itemCount: Number.isInteger(event.itemCount) ? event.itemCount : null,
    cancellationRequested: typeof event.cancellationRequested === "boolean" ? event.cancellationRequested : null,
  };
}

function serializeRange(range) {
  return {
    start: { line: range.start.line, character: range.start.character },
    end: { line: range.end.line, character: range.end.character },
  };
}

function extensionModeName(mode) {
  if (mode === vscode.ExtensionMode.Production) return "Production";
  if (mode === vscode.ExtensionMode.Development) return "Development";
  if (mode === vscode.ExtensionMode.Test) return "Test";
  return "Unknown";
}

function requiredEnvironment(name) {
  const value = process.env[name];
  assert(typeof value === "string" && value.length > 0, `Missing required environment ${name}.`);
  return value;
}

function assertInside(parent, child, label) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  assert(
    relative !== "" && relative !== "." && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
    `${label} must be a strict child of ${path.resolve(parent)}: ${path.resolve(child)}`,
  );
}

function assertOutside(parent, child, label) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  assert(
    relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative),
    `${label} must be outside ${path.resolve(parent)}: ${path.resolve(child)}`,
  );
}

function assertSamePath(left, right, label) {
  const normalize = (candidate) => process.platform === "win32"
    ? path.resolve(candidate).toLowerCase()
    : path.resolve(candidate);
  assert.strictEqual(normalize(left), normalize(right), `${label} did not match its expected path.`);
}

function assertRegularDirectory(directoryPath, label) {
  const info = lstatSync(directoryPath);
  assert(!info.isSymbolicLink() && info.isDirectory(), `${label} must be a regular non-symlink directory.`);
}

function writeReportAtomically(reportPath, report) {
  const parent = path.dirname(reportPath);
  assert(existsSync(parent), `Driver report parent must already exist: ${parent}`);
  assertRegularDirectory(parent, "Driver report parent");
  assertSamePath(realpathSync(parent), parent, "Driver report parent");
  const raw = `${JSON.stringify(report, null, 2)}\n`;
  assert(Buffer.byteLength(raw) <= reportLimitBytes, `Driver report exceeds ${reportLimitBytes} bytes.`);
  const temporaryPath = `${reportPath}.temporary`;
  writeFileSync(temporaryPath, raw, { encoding: "utf8", flag: "wx" });
  linkSync(temporaryPath, reportPath);
  unlinkSync(temporaryPath);
  const finalInfo = lstatSync(reportPath);
  assert(!finalInfo.isSymbolicLink() && finalInfo.isFile(), "Driver report must be a regular non-symlink file.");
  assertSamePath(realpathSync(reportPath), reportPath, "Driver report");
  assert.strictEqual(readFileSync(reportPath, "utf8"), raw, "Persisted driver report bytes drifted.");
}

module.exports = { run };
