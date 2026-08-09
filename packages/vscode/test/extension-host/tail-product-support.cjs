const assert = require("node:assert");
const {
  existsSync,
  mkdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const vscode = require("vscode");

const schemaVersion = "aurelia-ls/extension-host-tail-sample/v4";
const extensionId = "AureliaEffect.aurelia-2";
const observationEvent = "aurelia-ls:extension-host-observation";
const targetRelativePath = "src/routes/service-plan-list-route.html";
const completionAnchor = "state.servicePlans.searchText";
const completionPrefix = "state.servicePlans.";
const completionLabel = "searchText";
const observationTimeoutMilliseconds = 25_000;
const servedLanguageIds = new Set([
  "html",
  "typescript",
  "typescriptreact",
  "javascript",
  "javascriptreact",
  "css",
  "json",
]);

async function run() {
  const reportPath = requiredEnvironment("AURELIA_LS_EXTENSION_HOST_TAIL_REPORT_PATH");
  const raw = rawRunMetadata();
  const state = createReportState(raw);
  const observations = [];
  let diagnosticTargetUri = null;
  const recordObservation = (event) => {
    if (event == null || typeof event !== "object") return;
    observations.push(event);
    if (diagnosticTargetUri != null) {
      recordDiagnosticObservation(state, event, diagnosticTargetUri);
    }
  };
  let caught = null;
  let waiter = null;
  process.on(observationEvent, recordObservation);

  try {
    const environment = strictRunEnvironment(raw, reportPath);
    authenticateRunMetadata(state, environment);
    const targetUri = vscode.Uri.file(path.join(environment.workspace, targetRelativePath));
    if (environment.journey === "cold-full-diagnostics") {
      diagnosticTargetUri = targetUri.toString();
      state.witness = emptyDiagnosticWitness();
    }
    const extension = vscode.extensions.getExtension(extensionId);
    assert(extension, `Expected extension ${extensionId} in the Extension Development Host.`);

    state.actualVersion = vscode.version;
    assert.strictEqual(
      state.actualVersion,
      environment.resolvedVersion,
      `Expected VS Code ${environment.resolvedVersion}, received ${state.actualVersion}.`,
    );
    const transportModuleUrl = pathToFileURL(path.join(extension.extensionPath, "out", "worker-transport.js"));
    const { shouldUseWorkerTransport } = await import(transportModuleUrl.href);
    state.transport = shouldUseWorkerTransport() ? "worker" : "ipc";
    assert.strictEqual(state.transport, "worker", "Extension Host tail acquisition requires shipping Worker transport.");

    assertSingleWorkspace(environment.workspace);
    state.method.targetUnopenedAtTestEntry = targetIsUnopened(targetUri);
    assert.strictEqual(
      state.method.targetUnopenedAtTestEntry,
      true,
      "The host-tail target must not be open at test entry.",
    );
    state.method.targetUnshownAtTestEntry = targetIsUnshown(targetUri);
    assert.strictEqual(
      state.method.targetUnshownAtTestEntry,
      true,
      "The host-tail target must not be visible at test entry.",
    );
    assertNoOpenWorkspaceServedDocuments(environment.workspace);
    const activationMode = vscode.workspace
      .getConfiguration("aurelia", targetUri)
      .get("activationMode");
    assert.strictEqual(activationMode, "auto", "Host-tail acquisition must use normal auto admission.");
    state.method.activationMode = activationMode;
    state.method.activeAtTestEntry = extension.isActive;
    assert.strictEqual(
      state.method.activeAtTestEntry,
      true,
      "workspaceContains must automatically activate Aurelia before tail-suite entry.",
    );
    assertNoDocumentProviderRequests(observations, "test entry");

    state.timing.readinessStartEpochMilliseconds = Date.now();
    state.timing.readinessStartMonotonicMilliseconds = performance.now();
    await extension.activate();
    state.timing.readinessCompleteEpochMilliseconds = Date.now();
    state.timing.readinessCompleteMonotonicMilliseconds = performance.now();
    assert.strictEqual(extension.isActive, true, "The Aurelia extension did not remain active.");
    assertNoDocumentProviderRequests(observations, "suite readiness await");

    if (environment.journey === "cold-full-diagnostics") {
      waiter = createDiagnosticReceiptWaiter(targetUri.toString());
      state.method.zeroObservedDocumentProviderRequestsBeforeTrigger =
        providerEvents(observations).length === 0;
      assert.strictEqual(state.method.zeroObservedDocumentProviderRequestsBeforeTrigger, true);
      state.timing.triggerEpochMilliseconds = Date.now();
      state.timing.triggerMonotonicMilliseconds = performance.now();
      const editor = await vscode.window.showTextDocument(targetUri, { preview: false });
      assert.strictEqual(editor.document.uri.toString(), targetUri.toString());
      state.document = documentIdentity(editor.document);
      const response = await waiter.promise;
      waiter.dispose();
      waiter = null;
      validateDiagnosticJourney(state, observations, response, targetUri.toString());
    } else {
      const document = await vscode.workspace.openTextDocument(targetUri);
      assert.strictEqual(document.uri.toString(), targetUri.toString());
      assertTargetNeverShown(targetUri);
      const text = document.getText();
      const anchorOffset = text.indexOf(completionAnchor);
      assert(anchorOffset >= 0, `Expected completion anchor '${completionAnchor}'.`);
      const position = document.positionAt(anchorOffset + completionPrefix.length);
      waiter = createObservationWaiter((event) => isProviderTerminal(
        event,
        "completion",
        targetUri.toString(),
      ));
      state.method.zeroObservedDocumentProviderRequestsBeforeTrigger =
        providerEvents(observations).length === 0;
      assert.strictEqual(state.method.zeroObservedDocumentProviderRequestsBeforeTrigger, true);
      state.timing.triggerEpochMilliseconds = Date.now();
      state.timing.triggerMonotonicMilliseconds = performance.now();
      const completionResult = await vscode.commands.executeCommand(
        "vscode.executeCompletionItemProvider",
        targetUri,
        position,
      );
      state.timing.completionSettledEpochMilliseconds = Date.now();
      state.timing.completionSettledMonotonicMilliseconds = performance.now();
      const response = await waiter.promise;
      waiter.dispose();
      waiter = null;
      assertProviderResponse(response, "completion");
      state.document = documentIdentity(document);
      state.witness = completionWitness(
        observations,
        response,
        completionResult,
        document,
      );
      captureProviderReceipt(state, observations, response, "completion");
      validateCompletionJourney(state, observations);
    }

    validateTiming(state);
    state.validation.status = "passed";
  } catch (error) {
    caught = error;
    retainDiagnosticDocumentIdentity(state, diagnosticTargetUri);
    state.validation.status = "failed";
    state.validation.errors.push(errorMessage(error));
    state.error = {
      name: error instanceof Error ? error.name : "Error",
      message: errorMessage(error),
      stack: error instanceof Error ? error.stack ?? null : null,
    };
  } finally {
    waiter?.dispose();
    process.off(observationEvent, recordObservation);
  }

  finalizeDurations(state);
  writeReportAtomically(reportPath, state.workspace, state);
  if (caught != null) throw caught;
}

function rawRunMetadata() {
  return {
    journey: process.env.AURELIA_LS_EXTENSION_HOST_TAIL_JOURNEY ?? "",
    lane: process.env.AURELIA_LS_EXTENSION_HOST_TAIL_LANE ?? "",
    requestedVersion: process.env.AURELIA_LS_EXTENSION_HOST_TAIL_REQUESTED_VERSION ?? "",
    resolvedVersion: process.env.AURELIA_LS_EXTENSION_HOST_TAIL_RESOLVED_VERSION ?? "",
    workspace: process.env.AURELIA_LS_EXTENSION_HOST_TAIL_WORKSPACE ?? "",
    launchEpochMilliseconds: finiteNumberOrZero(
      process.env.AURELIA_LS_EXTENSION_HOST_TAIL_LAUNCH_EPOCH_MS,
    ),
    pair: integerOrZero(process.env.AURELIA_LS_EXTENSION_HOST_TAIL_PAIR),
    sequence: integerOrZero(process.env.AURELIA_LS_EXTENSION_HOST_TAIL_SEQUENCE),
    pairPosition: integerOrZero(process.env.AURELIA_LS_EXTENSION_HOST_TAIL_PAIR_POSITION),
  };
}

function strictRunEnvironment(raw, reportPath) {
  for (const name of [
    "AURELIA_LS_EXTENSION_HOST_TAIL_JOURNEY",
    "AURELIA_LS_EXTENSION_HOST_TAIL_LANE",
    "AURELIA_LS_EXTENSION_HOST_TAIL_REQUESTED_VERSION",
    "AURELIA_LS_EXTENSION_HOST_TAIL_RESOLVED_VERSION",
    "AURELIA_LS_EXTENSION_HOST_TAIL_WORKSPACE",
    "AURELIA_LS_EXTENSION_HOST_TAIL_LAUNCH_EPOCH_MS",
    "AURELIA_LS_EXTENSION_HOST_TAIL_PAIR",
    "AURELIA_LS_EXTENSION_HOST_TAIL_SEQUENCE",
    "AURELIA_LS_EXTENSION_HOST_TAIL_PAIR_POSITION",
  ]) {
    requiredEnvironment(name);
  }
  assert(
    raw.journey === "cold-full-diagnostics" || raw.journey === "first-completion",
    `Unknown host-tail journey: ${raw.journey}.`,
  );
  assert(raw.lane === "current-stable" || raw.lane === "minimum", `Unknown host-tail lane: ${raw.lane}.`);
  assert.strictEqual(
    raw.requestedVersion,
    raw.lane === "current-stable" ? "stable" : "1.91.0",
    "Requested VS Code version does not match its lane.",
  );
  assert(/^\d+\.\d+\.\d+$/.test(raw.resolvedVersion), "Resolved VS Code version must be exact and numeric.");
  assert(path.isAbsolute(raw.workspace), "Tail workspace path must be absolute.");
  assert(path.isAbsolute(reportPath), "Tail report path must be absolute.");
  assert.strictEqual(
    path.resolve(reportPath),
    path.resolve(path.dirname(raw.workspace), "sample.report.json"),
    "Tail report must be the sample-root sibling of the isolated workspace.",
  );
  assert(Number.isFinite(raw.launchEpochMilliseconds) && raw.launchEpochMilliseconds > 0, "Launch epoch must be positive.");
  assert(Number.isInteger(raw.pair) && raw.pair > 0, "Pair must be a positive integer.");
  assert(Number.isInteger(raw.sequence) && raw.sequence > 0, "Sequence must be a positive integer.");
  assert(raw.pairPosition === 1 || raw.pairPosition === 2, "Pair position must be 1 or 2.");
  assert.strictEqual(process.env.AURELIA_LS_EXTENSION_HOST_OBSERVATION, "1");
  assert.strictEqual(process.env.AURELIA_LS_EXTENSION_HOST_TAIL_OBSERVATION, "1");
  assert.strictEqual(process.env.AURELIA_LS_FORCE_IPC_TRANSPORT, "0");
  assert.strictEqual(process.env.AURELIA_LS_EXTENSION_HOST_EXPECTED_TRANSPORT, "worker");
  return raw;
}

function createReportState(raw) {
  const testEntryEpochMilliseconds = Date.now();
  const testEntryMonotonicMilliseconds = performance.now();
  return {
    schemaVersion,
    validation: { status: "failed", errors: [] },
    journey: raw.journey,
    lane: raw.lane,
    requestedVersion: raw.requestedVersion,
    resolvedVersion: raw.resolvedVersion,
    actualVersion: null,
    transport: null,
    pair: raw.pair,
    sequence: raw.sequence,
    pairPosition: raw.pairPosition,
    workspace: raw.workspace,
    method: {
      activation: "shipping-workspaceContains-eager-activation",
      activationMode: "unknown",
      activeAtTestEntry: false,
      readiness: "already-active-api-readiness-check",
      providerObservationScope: "test-entry-through-receipt",
      targetUnopenedAtTestEntry: false,
      targetUnshownAtTestEntry: false,
      zeroObservedDocumentProviderRequestsBeforeTrigger: false,
      diagnosticReschedulePolicy: {
        suiteTriggerCount: 1,
        suiteRetryCount: 0,
        receiptTimeoutMilliseconds: observationTimeoutMilliseconds,
        hostInclusiveMaximumMillisecondsExclusive: 30_000,
        timeoutBoundary: "before sole suite trigger through full response",
        attemptCardinalityLimit: null,
        sequence: "[request, authenticated Canceled failure]* then [request, full response]",
        timing: "first request through final response",
        cancellationCountAcceptanceThreshold: null,
      },
    },
    document: null,
    timing: {
      launchEpochMilliseconds: raw.launchEpochMilliseconds,
      testEntryEpochMilliseconds,
      testEntryMonotonicMilliseconds,
      readinessStartEpochMilliseconds: null,
      readinessStartMonotonicMilliseconds: null,
      readinessCompleteEpochMilliseconds: null,
      readinessCompleteMonotonicMilliseconds: null,
      triggerEpochMilliseconds: null,
      triggerMonotonicMilliseconds: null,
      requestEpochMilliseconds: null,
      requestMonotonicMilliseconds: null,
      receiptEpochMilliseconds: null,
      receiptMonotonicMilliseconds: null,
      completionSettledEpochMilliseconds: null,
      completionSettledMonotonicMilliseconds: null,
      hostInclusiveMilliseconds: null,
      completionSettledHostInclusiveMilliseconds: null,
      readinessWaitMilliseconds: null,
      requestLocalMilliseconds: null,
    },
    witness: null,
    error: null,
  };
}

function authenticateRunMetadata(state, environment) {
  state.journey = environment.journey;
  state.lane = environment.lane;
  state.requestedVersion = environment.requestedVersion;
  state.resolvedVersion = environment.resolvedVersion;
  state.pair = environment.pair;
  state.sequence = environment.sequence;
  state.pairPosition = environment.pairPosition;
  state.workspace = environment.workspace;
  state.timing.launchEpochMilliseconds = environment.launchEpochMilliseconds;
}

function captureProviderReceipt(state, observations, response, operation) {
  const beforeReceipt = observationsThrough(observations, response);
  const requests = beforeReceipt.filter((event) => isProviderEvent(event, operation, "request"));
  assert.strictEqual(requests.length, 1, `Expected exactly one ${operation} provider request before receipt.`);
  const request = requests[0];
  assert.strictEqual(request.observationId, response.observationId, `${operation} receipt correlation changed.`);
  state.timing.requestEpochMilliseconds = finiteObservationNumber(request, "epochMilliseconds");
  state.timing.requestMonotonicMilliseconds = finiteObservationNumber(request, "monotonicMilliseconds");
  state.timing.receiptEpochMilliseconds = finiteObservationNumber(response, "epochMilliseconds");
  state.timing.receiptMonotonicMilliseconds = finiteObservationNumber(response, "monotonicMilliseconds");
}

function emptyDiagnosticWitness() {
  return {
    kind: "diagnostics",
    observationId: null,
    providerRequestCount: 0,
    providerResponseCount: 0,
    providerFailureCount: 0,
    canceledAttemptsBeforeReceipt: 0,
    diagnosticAttempts: [],
    previousResultIdPresent: null,
    reportKind: null,
    itemCount: null,
    resultIdPresent: null,
    cancellationRequested: null,
  };
}

function recordDiagnosticObservation(state, event, targetUri) {
  if (state.timing.receiptEpochMilliseconds != null
      || !isProviderEvent(event, "diagnostics", event.phase, targetUri)) return;
  const witness = state.witness;
  if (witness?.kind !== "diagnostics") return;

  if (event.phase === "request") {
    witness.providerRequestCount += 1;
    witness.diagnosticAttempts.push({
      observationId: diagnosticLedgerString(event.observationId),
      request: diagnosticRequestLedgerEvent(event),
      terminal: null,
    });
    if (state.timing.requestEpochMilliseconds == null) {
      state.timing.requestEpochMilliseconds = diagnosticLedgerNumber(event.epochMilliseconds);
      state.timing.requestMonotonicMilliseconds = diagnosticLedgerNumber(event.monotonicMilliseconds);
    }
    return;
  }

  if (event.phase !== "response" && event.phase !== "failed") return;
  if (event.phase === "response") witness.providerResponseCount += 1;
  else {
    witness.providerFailureCount += 1;
    if (event.errorName === "Canceled") witness.canceledAttemptsBeforeReceipt += 1;
  }
  const observationId = diagnosticLedgerString(event.observationId);
  let attempt = witness.diagnosticAttempts.find((candidate) =>
    candidate.observationId === observationId && candidate.terminal == null
  );
  if (attempt == null) {
    attempt = { observationId, request: null, terminal: null };
    witness.diagnosticAttempts.push(attempt);
  }
  if (attempt != null) attempt.terminal = diagnosticTerminalLedgerEvent(event);

  if (event.phase === "response") {
    state.timing.receiptEpochMilliseconds = diagnosticLedgerNumber(event.epochMilliseconds);
    state.timing.receiptMonotonicMilliseconds = diagnosticLedgerNumber(event.monotonicMilliseconds);
    witness.observationId = observationId;
    witness.previousResultIdPresent = attempt?.request?.previousResultIdPresent ?? null;
    witness.reportKind = diagnosticLedgerString(event.reportKind);
    witness.itemCount = diagnosticLedgerNumber(event.itemCount);
    witness.resultIdPresent = diagnosticLedgerBoolean(event.resultIdPresent);
    witness.cancellationRequested = diagnosticLedgerBoolean(event.cancellationRequested);
  }
}

function diagnosticRequestLedgerEvent(event) {
  return {
    source: diagnosticLedgerString(event.source),
    operation: diagnosticLedgerString(event.operation),
    phase: diagnosticLedgerString(event.phase),
    uri: diagnosticLedgerString(event.uri),
    documentVersion: diagnosticLedgerNumber(event.documentVersion),
    epochMilliseconds: diagnosticLedgerNumber(event.epochMilliseconds),
    monotonicMilliseconds: diagnosticLedgerNumber(event.monotonicMilliseconds),
    previousResultIdPresent: diagnosticLedgerBoolean(event.previousResultIdPresent),
  };
}

function diagnosticTerminalLedgerEvent(event) {
  return {
    source: diagnosticLedgerString(event.source),
    operation: diagnosticLedgerString(event.operation),
    phase: diagnosticLedgerString(event.phase),
    uri: diagnosticLedgerString(event.uri),
    documentVersion: diagnosticLedgerNumber(event.documentVersion),
    epochMilliseconds: diagnosticLedgerNumber(event.epochMilliseconds),
    monotonicMilliseconds: diagnosticLedgerNumber(event.monotonicMilliseconds),
    cancellationRequested: diagnosticLedgerBoolean(event.cancellationRequested),
    errorName: event.phase === "failed" ? diagnosticLedgerString(event.errorName) : null,
    serverRetriggerRequested: event.phase === "failed"
      ? diagnosticLedgerBoolean(event.serverRetriggerRequested)
      : false,
    reportKind: event.phase === "response" ? diagnosticLedgerString(event.reportKind) : null,
    itemCount: event.phase === "response" ? diagnosticLedgerNumber(event.itemCount) : null,
    resultIdPresent: event.phase === "response"
      ? diagnosticLedgerBoolean(event.resultIdPresent)
      : null,
  };
}

function diagnosticLedgerString(value) {
  return typeof value === "string" ? value : null;
}

function diagnosticLedgerNumber(value) {
  return Number.isFinite(value) ? value : null;
}

function diagnosticLedgerBoolean(value) {
  return typeof value === "boolean" ? value : null;
}

function completionWitness(observations, response, completionResult, document) {
  const beforeReceipt = observationsThrough(observations, response);
  const evidence = providerOperationCounts(beforeReceipt, "completion");
  const items = Array.isArray(completionResult)
    ? completionResult
    : Array.isArray(completionResult?.items) ? completionResult.items : [];
  const item = items.find((candidate) =>
    completionItemLabel(candidate) === completionLabel
      && typeof candidate.detail === "string"
      && candidate.detail.includes("type-member")
  );
  assert(item, `Expected collision-safe type-member completion '${completionLabel}'.`);
  const replacementRange = completionReplacementRange(item);
  return {
    kind: "completion",
    observationId: stringObservation(response, "observationId"),
    providerRequestCount: evidence.requests,
    providerResponseCount: evidence.responses,
    providerFailureCount: evidence.failures,
    itemCount: numberObservation(response, "itemCount"),
    expectedLabel: completionLabel,
    detailIncludesTypeMember: item.detail.includes("type-member"),
    completionKind: typeof item.kind === "number" ? item.kind : null,
    insertText: completionInsertText(item),
    replacementText: replacementRange == null ? null : document.getText(replacementRange),
    diagnosticRequestsBeforeReceipt: beforeReceipt.filter((event) =>
      isProviderEvent(event, "diagnostics", "request")
    ).length,
    cancellationRequested: booleanObservation(response, "cancellationRequested"),
  };
}

function validateDiagnosticJourney(state, observations, response, targetUri) {
  const witness = state.witness;
  assert.strictEqual(witness.kind, "diagnostics");
  assert.strictEqual(response.phase, "response");
  assert.strictEqual(witness.observationId, response.observationId);
  assert(witness.diagnosticAttempts.length >= 1, "Expected a final successful diagnostic attempt.");
  const canceledAttempts = witness.diagnosticAttempts.length - 1;
  assert.deepStrictEqual(
    [witness.providerRequestCount, witness.providerResponseCount, witness.providerFailureCount],
    [1 + canceledAttempts, 1, canceledAttempts],
  );
  assert.strictEqual(witness.canceledAttemptsBeforeReceipt, canceledAttempts);

  const providerTrace = providerEvents(observationsThrough(observations, response));
  assert.strictEqual(providerTrace.length, witness.diagnosticAttempts.length * 2);
  assert.deepStrictEqual(
    providerTrace.map((event) => event.phase),
    witness.diagnosticAttempts.flatMap((_attempt, index) => [
      "request",
      index < canceledAttempts ? "failed" : "response",
    ]),
  );
  assert(providerTrace.every((event) => event.operation === "diagnostics" && event.uri === targetUri));

  const documentVersion = state.document.version;
  for (const [index, attempt] of witness.diagnosticAttempts.entries()) {
    validateDiagnosticAttempt(attempt, index, targetUri, documentVersion);
    const traceRequest = providerTrace[index * 2];
    const traceTerminal = providerTrace[index * 2 + 1];
    assert.strictEqual(traceRequest.observationId, attempt.observationId);
    assert.strictEqual(traceTerminal.observationId, attempt.observationId);
  }
  assert.strictEqual(
    new Set(witness.diagnosticAttempts.map((attempt) => attempt.observationId)).size,
    witness.diagnosticAttempts.length,
    "Every diagnostic attempt must allocate a globally unique observation id.",
  );
  for (const attempt of witness.diagnosticAttempts.slice(0, -1)) {
    validateCanceledDiagnosticTerminal(attempt.terminal);
  }
  validateSuccessfulDiagnosticTerminal(witness.diagnosticAttempts.at(-1).terminal);
  const ledgerEpochSequence = witness.diagnosticAttempts.flatMap((attempt) => [
    attempt.request.epochMilliseconds,
    attempt.terminal.epochMilliseconds,
  ]);
  const ledgerMonotonicSequence = witness.diagnosticAttempts.flatMap((attempt) => [
    attempt.request.monotonicMilliseconds,
    attempt.terminal.monotonicMilliseconds,
  ]);
  assertNondecreasingFinite(ledgerEpochSequence, "diagnostic attempt epoch");
  assertNondecreasingFinite(ledgerMonotonicSequence, "diagnostic attempt monotonic");

  assert.strictEqual(witness.previousResultIdPresent, false);
  assert.strictEqual(witness.reportKind, "full");
  assert.strictEqual(witness.resultIdPresent, true);
  assert.strictEqual(witness.cancellationRequested, false);
  assert.strictEqual(state.timing.requestEpochMilliseconds, witness.diagnosticAttempts[0].request.epochMilliseconds);
  assert.strictEqual(
    state.timing.requestMonotonicMilliseconds,
    witness.diagnosticAttempts[0].request.monotonicMilliseconds,
  );
  assert.strictEqual(
    state.timing.receiptEpochMilliseconds,
    witness.diagnosticAttempts.at(-1).terminal.epochMilliseconds,
  );
  assert.strictEqual(
    state.timing.receiptMonotonicMilliseconds,
    witness.diagnosticAttempts.at(-1).terminal.monotonicMilliseconds,
  );
}

function validateDiagnosticAttempt(attempt, index, targetUri, documentVersion) {
  assert(attempt != null && typeof attempt === "object");
  assert(typeof attempt.observationId === "string" && attempt.observationId.length > 0);
  assert(attempt.request != null && typeof attempt.request === "object");
  assert(attempt.terminal != null && typeof attempt.terminal === "object");
  assert.deepStrictEqual(
    [attempt.request.source, attempt.request.operation, attempt.request.phase],
    ["language-client-provider", "diagnostics", "request"],
  );
  assert.deepStrictEqual(
    [attempt.terminal.source, attempt.terminal.operation],
    ["language-client-provider", "diagnostics"],
  );
  assert.strictEqual(attempt.request.uri, targetUri);
  assert.strictEqual(attempt.terminal.uri, targetUri);
  assert.strictEqual(attempt.request.documentVersion, documentVersion);
  assert.strictEqual(attempt.terminal.documentVersion, documentVersion);
  assert.strictEqual(attempt.request.previousResultIdPresent, false);
  assert(Number.isFinite(attempt.request.epochMilliseconds));
  assert(Number.isFinite(attempt.request.monotonicMilliseconds));
  assert(Number.isFinite(attempt.terminal.epochMilliseconds));
  assert(Number.isFinite(attempt.terminal.monotonicMilliseconds));
  assert(
    attempt.terminal.epochMilliseconds >= attempt.request.epochMilliseconds,
    `Diagnostic attempt ${index + 1} epoch timestamps were inverted.`,
  );
  assert(
    attempt.terminal.monotonicMilliseconds >= attempt.request.monotonicMilliseconds,
    `Diagnostic attempt ${index + 1} monotonic timestamps were inverted.`,
  );
}

function validateCanceledDiagnosticTerminal(terminal) {
  assert.strictEqual(terminal.phase, "failed");
  assert.strictEqual(terminal.errorName, "Canceled");
  assert.strictEqual(typeof terminal.cancellationRequested, "boolean");
  assert.strictEqual(typeof terminal.serverRetriggerRequested, "boolean");
  assert(
    terminal.cancellationRequested === true || terminal.serverRetriggerRequested === true,
    "Canceled diagnostics must authenticate a client token or server retrigger.",
  );
  assert.strictEqual(terminal.reportKind, null);
  assert.strictEqual(terminal.itemCount, null);
  assert.strictEqual(terminal.resultIdPresent, null);
}

function validateSuccessfulDiagnosticTerminal(terminal) {
  assert.strictEqual(terminal.phase, "response");
  assert.strictEqual(terminal.cancellationRequested, false);
  assert.strictEqual(terminal.errorName, null);
  assert.strictEqual(terminal.serverRetriggerRequested, false);
  assert.strictEqual(terminal.reportKind, "full");
  assert(Number.isSafeInteger(terminal.itemCount) && terminal.itemCount >= 0);
  assert.strictEqual(terminal.resultIdPresent, true);
}

function validateCompletionJourney(state, observations) {
  const witness = state.witness;
  assert.strictEqual(witness.kind, "completion");
  assert.deepStrictEqual(
    [witness.providerRequestCount, witness.providerResponseCount, witness.providerFailureCount],
    [1, 1, 0],
  );
  assert(witness.itemCount > 0);
  assert.strictEqual(witness.completionKind, vscode.CompletionItemKind.Property);
  assert.strictEqual(vscode.CompletionItemKind.Property, 9);
  assert.strictEqual(witness.detailIncludesTypeMember, true);
  assert.strictEqual(witness.insertText, completionLabel);
  assert.strictEqual(witness.replacementText, completionLabel);
  assert.strictEqual(witness.diagnosticRequestsBeforeReceipt, 0);
  assert.strictEqual(witness.cancellationRequested, false);
  assert(state.timing.completionSettledEpochMilliseconds != null);
  assert(state.timing.completionSettledMonotonicMilliseconds != null);
  assert(
    state.timing.completionSettledMonotonicMilliseconds >= state.timing.receiptMonotonicMilliseconds,
    "Native completion command settled before its provider receipt.",
  );
  assert.strictEqual(
    observationsThroughReceipt(state, observations).filter((event) =>
      isProviderEvent(event, "diagnostics", "request")
    ).length,
    0,
  );
}

function validateTiming(state) {
  const timing = state.timing;
  const epochSequence = [
    timing.launchEpochMilliseconds,
    timing.testEntryEpochMilliseconds,
    timing.readinessStartEpochMilliseconds,
    timing.readinessCompleteEpochMilliseconds,
    timing.triggerEpochMilliseconds,
    timing.requestEpochMilliseconds,
    timing.receiptEpochMilliseconds,
  ];
  const monotonicSequence = [
    timing.testEntryMonotonicMilliseconds,
    timing.readinessStartMonotonicMilliseconds,
    timing.readinessCompleteMonotonicMilliseconds,
    timing.triggerMonotonicMilliseconds,
    timing.requestMonotonicMilliseconds,
    timing.receiptMonotonicMilliseconds,
  ];
  assertNondecreasingFinite(epochSequence, "epoch");
  assertNondecreasingFinite(monotonicSequence, "monotonic");
}

function finalizeDurations(state) {
  const timing = state.timing;
  timing.hostInclusiveMilliseconds = differenceOrNull(
    timing.receiptEpochMilliseconds,
    timing.launchEpochMilliseconds,
  );
  timing.completionSettledHostInclusiveMilliseconds = differenceOrNull(
    timing.completionSettledEpochMilliseconds,
    timing.launchEpochMilliseconds,
  );
  timing.readinessWaitMilliseconds = differenceOrNull(
    timing.readinessCompleteMonotonicMilliseconds,
    timing.readinessStartMonotonicMilliseconds,
  );
  timing.requestLocalMilliseconds = differenceOrNull(
    timing.receiptMonotonicMilliseconds,
    timing.requestMonotonicMilliseconds,
  );
}

function assertSingleWorkspace(workspace) {
  const folders = vscode.workspace.workspaceFolders ?? [];
  assert.strictEqual(folders.length, 1, "Host-tail acquisition requires exactly one workspace root.");
  assert.strictEqual(normalizePath(folders[0].uri.fsPath), normalizePath(workspace));
}

function targetIsUnopened(targetUri) {
  return !vscode.workspace.textDocuments.some(
    (document) => document.uri.toString() === targetUri.toString(),
  );
}

function targetIsUnshown(targetUri) {
  return !vscode.window.visibleTextEditors.some(
    (editor) => editor.document.uri.toString() === targetUri.toString(),
  );
}

function assertTargetNeverShown(targetUri) {
  assert.strictEqual(
    targetIsUnshown(targetUri),
    true,
    "The completion target must remain non-visible before its first request.",
  );
}

function assertNoOpenWorkspaceServedDocuments(workspace) {
  const documents = vscode.workspace.textDocuments.filter((document) =>
    servedLanguageIds.has(document.languageId)
      && document.uri.scheme === "file"
      && pathIsInside(workspace, document.uri.fsPath)
  );
  assert.deepStrictEqual(
    documents.map((document) => ({
      languageId: document.languageId,
      uri: document.uri.toString(),
    })),
    [],
    "No workspace-owned served-language document may be open at test entry.",
  );
}

function pathIsInside(parent, child) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function assertNoDocumentProviderRequests(observations, label) {
  assert.strictEqual(
    providerEvents(observations).length,
    0,
    `Expected zero document-provider requests during ${label}.`,
  );
}

function observationsThrough(observations, terminal) {
  const index = observations.indexOf(terminal);
  assert(index >= 0, "Provider receipt was not recorded by the primary observation listener.");
  return observations.slice(0, index + 1);
}

function observationsThroughReceipt(state, observations) {
  return observations.filter((event) =>
    typeof event.monotonicMilliseconds === "number"
      && event.monotonicMilliseconds <= state.timing.receiptMonotonicMilliseconds
  );
}

function providerEvents(observations) {
  return observations.filter((event) => event.source === "language-client-provider");
}

function providerOperationCounts(observations, operation) {
  const events = observations.filter((event) =>
    event.source === "language-client-provider" && event.operation === operation
  );
  return {
    requests: events.filter((event) => event.phase === "request").length,
    responses: events.filter((event) => event.phase === "response").length,
    failures: events.filter((event) => event.phase === "failed").length,
  };
}

function isProviderEvent(event, operation, phase, uri) {
  return event != null
    && typeof event === "object"
    && event.source === "language-client-provider"
    && event.operation === operation
    && event.phase === phase
    && (uri == null || event.uri === uri);
}

function isProviderTerminal(event, operation, uri) {
  return isProviderEvent(event, operation, "response", uri)
    || isProviderEvent(event, operation, "failed", uri);
}

function assertProviderResponse(event, operation) {
  assert.strictEqual(
    event.phase,
    "response",
    `${operation} provider failed before its first receipt (${event.errorName ?? "Error"}).`,
  );
}

function createDiagnosticReceiptWaiter(uri) {
  let settled = false;
  let timer;
  let resolvePromise;
  let rejectPromise;
  let activeObservationId = null;
  const observationIds = new Set();
  const finish = (callback, value) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    process.off(observationEvent, listener);
    callback(value);
  };
  const fail = (message) => finish(rejectPromise, new Error(message));
  const listener = (event) => {
    if (settled || !isProviderEvent(event, "diagnostics", event?.phase, uri)) return;
    const observationId = event.observationId;
    if (event.phase === "request") {
      if (activeObservationId != null) {
        fail("Observed overlapping diagnostic attempts instead of a terminal reschedule boundary.");
      } else if (observationIds.has(observationId)) {
        fail("Diagnostic reschedule reused an observation id.");
      } else {
        observationIds.add(observationId);
        activeObservationId = observationId;
      }
      return;
    }
    if (event.phase !== "failed" && event.phase !== "response") return;
    if (activeObservationId !== observationId) {
      fail(`Diagnostic ${event.phase} did not correlate to the active request.`);
      return;
    }
    activeObservationId = null;
    if (event.phase === "response") {
      finish(resolvePromise, event);
      return;
    }
    if (event.errorName !== "Canceled") {
      fail(`Diagnostic provider failed before receipt (${event.errorName ?? "Error"}).`);
    } else if (event.cancellationRequested !== true && event.serverRetriggerRequested !== true) {
      fail("Canceled diagnostic attempt had neither client-token nor server-retrigger evidence.");
    }
  };
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
    process.on(observationEvent, listener);
    timer = setTimeout(() => {
      finish(
        reject,
        new Error(`Timed out after ${observationTimeoutMilliseconds} ms waiting for a successful diagnostic receipt.`),
      );
    }, observationTimeoutMilliseconds);
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

function createObservationWaiter(predicate) {
  let settled = false;
  let timer;
  let resolvePromise;
  const listener = (event) => {
    if (settled || !predicate(event)) return;
    settled = true;
    clearTimeout(timer);
    process.off(observationEvent, listener);
    resolvePromise(event);
  };
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    process.on(observationEvent, listener);
    timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      process.off(observationEvent, listener);
      reject(new Error(`Timed out after ${observationTimeoutMilliseconds} ms waiting for a provider receipt.`));
    }, observationTimeoutMilliseconds);
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

function retainDiagnosticDocumentIdentity(state, targetUri) {
  if (state.journey !== "cold-full-diagnostics" || state.document != null || targetUri == null) return;
  const document = vscode.workspace.textDocuments.find((candidate) =>
    candidate.uri.toString() === targetUri
  );
  if (document != null) state.document = documentIdentity(document);
}

function completionItemLabel(item) {
  return typeof item?.label === "string" ? item.label : item?.label?.label ?? null;
}

function completionInsertText(item) {
  return typeof item?.insertText === "string" ? item.insertText : item?.insertText?.value ?? null;
}

function completionReplacementRange(item) {
  if (item?.range instanceof vscode.Range) return item.range;
  return item?.range?.replacing ?? item?.range?.inserting ?? null;
}

function documentIdentity(document) {
  return {
    uri: document.uri.toString(),
    relativePath: targetRelativePath,
    version: document.version,
  };
}

function finiteObservationNumber(event, key) {
  const value = event[key];
  assert(Number.isFinite(value), `Observation ${key} must be finite.`);
  return value;
}

function numberObservation(event, key) {
  return finiteObservationNumber(event, key);
}

function stringObservation(event, key) {
  const value = event[key];
  assert(typeof value === "string" && value.length > 0, `Observation ${key} must be a non-empty string.`);
  return value;
}

function booleanObservation(event, key) {
  const value = event[key];
  assert.strictEqual(typeof value, "boolean", `Observation ${key} must be boolean.`);
  return value;
}

function assertNondecreasingFinite(values, label) {
  for (let index = 0; index < values.length; index += 1) {
    assert(Number.isFinite(values[index]), `${label} timestamp ${index} must be finite.`);
    if (index > 0) {
      assert(values[index] >= values[index - 1], `${label} timestamps must be nondecreasing.`);
    }
  }
}

function differenceOrNull(end, start) {
  return Number.isFinite(end) && Number.isFinite(start) ? end - start : null;
}

function requiredEnvironment(name) {
  const value = process.env[name];
  if (typeof value !== "string" || value.length === 0) throw new Error(`${name} is required.`);
  return value;
}

function finiteNumberOrZero(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function integerOrZero(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : 0;
}

function normalizePath(value) {
  const resolved = path.resolve(value).replaceAll("\\", "/");
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function writeReportAtomically(reportPath, workspace, report) {
  assert.strictEqual(
    path.resolve(reportPath),
    path.resolve(path.dirname(workspace), "sample.report.json"),
    "Refusing to write a tail report outside its exact isolated sample root.",
  );
  const directory = path.dirname(reportPath);
  const temporaryPath = `${reportPath}.${process.pid}.tmp`;
  mkdirSync(directory, { recursive: true });
  assert.strictEqual(existsSync(reportPath), false, `Refusing to overwrite tail report ${reportPath}.`);
  assert.strictEqual(existsSync(temporaryPath), false, `Refusing to overwrite temporary tail report ${temporaryPath}.`);
  try {
    writeFileSync(temporaryPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    renameSync(temporaryPath, reportPath);
  } catch (error) {
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
    throw error;
  }
}

module.exports = { run };
