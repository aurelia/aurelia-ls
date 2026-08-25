function parseDiagnosticProviderSettlement(events, uri, documentVersion, observationStart) {
  const trace = events.map((event, index) => ({ event, index })).filter(({ event }) =>
    event.source === "language-client-provider"
    && event.operation === "diagnostics"
    && event.uri === uri
  );
  const attempts = [];
  const byId = new Map();
  let active;

  for (const entry of trace) {
    const event = entry.event;
    if (event.phase === "request") {
      if (typeof event.observationId !== "string" || event.observationId.length === 0) {
        return failed("Diagnostic provider request has no observation id.", trace);
      }
      if (active != null) {
        return failed(
          `Diagnostic provider attempt ${event.observationId} overlapped ${active.request.observationId}.`,
          trace,
        );
      }
      if (byId.has(event.observationId)) {
        return failed(`Diagnostic provider attempt ${event.observationId} reused an observation id.`, trace);
      }
      const attempt = { request: event, requestIndex: entry.index, terminal: null };
      attempts.push(attempt);
      byId.set(event.observationId, attempt);
      active = attempt;
      continue;
    }
    if (event.phase !== "response" && event.phase !== "failed") continue;
    if (typeof event.observationId !== "string" || event.observationId.length === 0) {
      return failed("Diagnostic provider terminal has no observation id.", trace);
    }
    const attempt = byId.get(event.observationId);
    if (attempt == null) {
      return failed(
        `Diagnostic provider attempt ${event.observationId} published a terminal without an observed request.`,
        trace,
      );
    }
    if (attempt.terminal != null) {
      return failed(
        `Diagnostic provider attempt ${event.observationId} published more than one terminal.`,
        trace,
      );
    }
    if (active !== attempt) {
      return failed(
        `Diagnostic provider attempt ${event.observationId} terminated out of request order.`,
        trace,
      );
    }
    if (event.documentVersion !== attempt.request.documentVersion) {
      return failed(
        `Diagnostic provider attempt ${event.observationId} changed document version between request and terminal.`,
        trace,
      );
    }
    const terminalShapeError = diagnosticTerminalShapeError(event);
    if (terminalShapeError != null) return failed(terminalShapeError, trace);
    attempt.terminal = event;
    active = undefined;
    if (
      event.phase === "failed"
      && (
        event.errorName !== "Canceled"
        || (event.cancellationRequested !== true && event.serverRetriggerRequested !== true)
      )
    ) {
      return failed(
        `Diagnostic provider attempt ${event.observationId} failed without authenticated cancellation.`,
        trace,
      );
    }
    if (event.phase === "response" && event.cancellationRequested === true) {
      return failed(
        `Diagnostic provider attempt ${event.observationId} responded after client cancellation.`,
        trace,
      );
    }
  }

  if (attempts.length === 0 || active != null) {
    return pending(trace);
  }
  for (const attempt of attempts) {
    if (attempt.terminal?.phase !== "response") continue;
    const responseError = diagnosticResponseError(attempt);
    if (responseError != null) return failed(responseError, trace);
  }
  const firstCurrentResponseIndex = attempts.findIndex((attempt) =>
    attempt.requestIndex >= observationStart
    && attempt.request.documentVersion === documentVersion
    && attempt.terminal?.phase === "response"
  );
  if (firstCurrentResponseIndex < 0) return pending(trace);
  if (attempts[firstCurrentResponseIndex].terminal.reportKind !== "full") {
    return failed(
      `Diagnostic provider attempt ${attempts[firstCurrentResponseIndex].request.observationId} returned ${String(attempts[firstCurrentResponseIndex].terminal.reportKind)} before the required current full report.`,
      trace,
    );
  }

  const fullAttempt = attempts[firstCurrentResponseIndex];
  const subsequentAttempts = attempts.slice(firstCurrentResponseIndex + 1);
  const unexpectedVersion = subsequentAttempts.find((attempt) =>
    attempt.request.documentVersion !== documentVersion
  );
  if (unexpectedVersion != null) {
    return failed(
      `Diagnostic provider attempt ${unexpectedVersion.request.observationId} followed the current full report with unexpected document version ${String(unexpectedVersion.request.documentVersion)}.`,
      trace,
    );
  }
  let settlementAttempt = fullAttempt;
  let retriggerPending = false;
  for (const attempt of subsequentAttempts) {
    if (attempt.terminal?.phase === "response") {
      retriggerPending = false;
      if (attempt.terminal.reportKind === "full") settlementAttempt = attempt;
    } else if (attempt.terminal?.serverRetriggerRequested === true) {
      retriggerPending = true;
    }
  }
  if (retriggerPending) return pending(trace);
  return {
    error: null,
    settlement: {
      ...settlementAttempt.terminal,
      observedAttemptCount: attempts.length,
      observedCurrentAttemptCount: attempts.filter((attempt) =>
        attempt.requestIndex >= observationStart
        && attempt.request.documentVersion === documentVersion
      ).length,
      observedCanceledAttemptCount: attempts.filter((attempt) => attempt.terminal?.phase === "failed").length,
      observedSubsequentAttemptCount: subsequentAttempts.length,
    },
    trace: trace.map((candidate) => candidate.event),
  };
}

function diagnosticTerminalShapeError(terminal) {
  const label = `Diagnostic provider attempt ${terminal.observationId}`;
  if (terminal.phase === "response") {
    if (typeof terminal.cancellationRequested !== "boolean") {
      return `${label} response has no boolean cancellation state.`;
    }
    if (terminal.errorName !== undefined || terminal.serverRetriggerRequested !== undefined) {
      return `${label} response carried failed-only terminal fields.`;
    }
    return null;
  }
  if (
    typeof terminal.cancellationRequested !== "boolean"
    || typeof terminal.serverRetriggerRequested !== "boolean"
  ) {
    return `${label} failure has no complete boolean cancellation state.`;
  }
  if (
    terminal.reportKind !== undefined
    || terminal.itemCount !== undefined
    || terminal.resultIdPresent !== undefined
  ) {
    return `${label} failure carried response-only terminal fields.`;
  }
  return null;
}

function diagnosticResponseError(attempt) {
  const terminal = attempt.terminal;
  if (terminal.reportKind === "full") {
    if (terminal.resultIdPresent !== true) {
      return `Current diagnostic provider attempt ${attempt.request.observationId} returned a full report without a result id.`;
    }
    if (!Number.isSafeInteger(terminal.itemCount) || terminal.itemCount < 0) {
      return `Current diagnostic provider attempt ${attempt.request.observationId} returned a full report without a valid item count.`;
    }
    return null;
  }
  if (terminal.reportKind === "unChanged") {
    if (attempt.request.previousResultIdPresent !== true) {
      return `Current diagnostic provider attempt ${attempt.request.observationId} returned unchanged without a previous result id.`;
    }
    if (terminal.resultIdPresent !== true || terminal.itemCount !== null) {
      return `Current diagnostic provider attempt ${attempt.request.observationId} returned an invalid unchanged report.`;
    }
    return null;
  }
  return `Current diagnostic provider attempt ${attempt.request.observationId} returned unsupported report kind ${String(terminal.reportKind)}.`;
}

function pending(trace) {
  return { error: null, settlement: null, trace: trace.map((candidate) => candidate.event) };
}

function failed(error, trace) {
  return { error, settlement: null, trace: trace.map((candidate) => candidate.event) };
}

module.exports = { parseDiagnosticProviderSettlement };
