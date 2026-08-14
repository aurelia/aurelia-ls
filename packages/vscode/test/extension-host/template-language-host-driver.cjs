const assert = require("assert");

function exactOpenDocument(workspace, uri, label) {
  const uriKey = exactUriKey(uri, label);
  const matches = matchingDocuments(workspace, uriKey);
  assert.strictEqual(
    matches.length,
    1,
    `${label} must resolve exactly one open document for ${uriKey}; observed ${JSON.stringify(
      documentState(matches),
    )}.`,
  );
  return matches[0];
}

async function waitForExactDocumentLanguage(
  workspace,
  uri,
  languageId,
  label,
  wait,
  timeoutMs = 60_000,
) {
  const uriKey = exactUriKey(uri, label);
  assert(typeof languageId === "string" && languageId.length > 0, `${label} requires a language id.`);
  assert(typeof wait === "function", `${label} requires the host wait primitive.`);

  await wait(
    () => {
      const matches = matchingDocuments(workspace, uriKey);
      if (matches.length > 1) {
        throw new Error(
          `${label} found ambiguous open documents for ${uriKey}: ${JSON.stringify(documentState(matches))}.`,
        );
      }
      return matches.length === 1 && matches[0].languageId === languageId;
    },
    () => `${label} should settle ${uriKey} into ${languageId}; observed ${JSON.stringify(
      documentState(matchingDocuments(workspace, uriKey)),
    )}`,
    timeoutMs,
  );
  return exactOpenDocument(workspace, uri, label);
}

function observeExactDocumentLifecycle(workspace, uri, label) {
  const uriKey = exactUriKey(uri, label);
  const events = [];
  const record = (phase, document) => {
    if (document?.uri?.toString?.() !== uriKey) return;
    events.push(Object.freeze({
      phase,
      languageId: document.languageId,
      version: document.version,
    }));
  };
  const subscriptions = [
    workspace.onDidOpenTextDocument((document) => record("open", document)),
    workspace.onDidCloseTextDocument((document) => record("close", document)),
  ];
  return {
    snapshot() {
      return events.map((event) => ({ ...event }));
    },
    dispose() {
      for (const subscription of subscriptions.splice(0).reverse()) subscription.dispose();
    },
  };
}

function assertSingleBackgroundLanguageTransition(events, label) {
  assert(Array.isArray(events), `${label} requires a lifecycle event array.`);
  assert.deepStrictEqual(
    events.map(({ phase, languageId }) => ({ phase, languageId })),
    [
      { phase: "open", languageId: "html" },
      { phase: "close", languageId: "html" },
      { phase: "open", languageId: "aurelia-html" },
    ],
    `${label} must perform one html -> aurelia-html close/open transition without a language loop; observed ${JSON.stringify(
      events,
    )}.`,
  );
}

function exactUriKey(uri, label) {
  const uriKey = uri?.toString?.();
  assert(typeof uriKey === "string" && uriKey.length > 0, `${label} requires an exact URI.`);
  return uriKey;
}

function matchingDocuments(workspace, uriKey) {
  assert(Array.isArray(workspace?.textDocuments), "Host workspace must expose textDocuments.");
  return workspace.textDocuments.filter((document) => document?.uri?.toString?.() === uriKey);
}

function documentState(documents) {
  return documents.map((document) => ({
    languageId: document.languageId,
    version: document.version,
    isClosed: document.isClosed,
  }));
}

module.exports = {
  assertSingleBackgroundLanguageTransition,
  exactOpenDocument,
  observeExactDocumentLifecycle,
  waitForExactDocumentLanguage,
};
