import { describe, expect, test, vi } from "vitest";
import type { VscodeApi } from "../../out/vscode-api.js";
import { OwnedTemplateLanguageController } from "../../out/template-language.js";
import { createVscodeApi } from "../helpers/vscode-stub.js";

describe("owned template language containment", () => {
  test("uses exact semantic template association within one admitted project", async () => {
    const harness = createHarness([
      ["file:///workspace/src/components/product-card.html", "html"],
      ["file:///workspace/src/unrelated.html", "html"],
    ], (uri) => ownership(uri, uri.endsWith("/components/product-card.html"), "template"));

    harness.controller.start();
    await vi.waitFor(() => expect(harness.languageIds()).toEqual([
      "aurelia-html",
      "html",
    ]));
    await settleAsyncWork();

    expect(harness.requests).toHaveBeenCalledTimes(2);
    expect(harness.requests.mock.results.map((result) => result.value.owners)).toEqual([
      [{ projectKey: "app", role: "template" }],
      [{ projectKey: "app", role: "template" }],
    ]);
    await harness.controller.disposeAsync();

    expect(harness.languageIds()).toEqual(["html", "html"]);
  });

  test("switches every proven open template, leaves ordinary HTML alone, and restores on session loss", async () => {
    const harness = createHarness([
      ["file:///workspace/src/app.html", "html"],
      ["file:///workspace/docs/index.html", "html"],
      ["file:///workspace/src/card.html", "html"],
    ], (uri) => ownership(uri, uri.includes("/src/")));
    const originalApp = harness.vscode.workspace.textDocuments[0];
    const originalCard = harness.vscode.workspace.textDocuments[2];

    harness.controller.start();
    await vi.waitFor(() => expect(harness.languageIds()).toEqual([
      "aurelia-html",
      "html",
      "aurelia-html",
    ]));
    expect(harness.vscode.workspace.textDocuments[0]).not.toBe(originalApp);
    expect(harness.vscode.workspace.textDocuments[2]).not.toBe(originalCard);
    await settleAsyncWork();
    expect(harness.requests).toHaveBeenCalledTimes(3);

    harness.setSession(false);
    await vi.waitFor(() => expect(harness.languageIds()).toEqual(["html", "html", "html"]));
    expect(harness.requests).toHaveBeenCalledTimes(3);
    await harness.controller.disposeAsync();
  });

  test("rejects a stale ownership answer after a newer source analysis answer", async () => {
    const stale = deferred<ReturnType<typeof ownership>>();
    let request = 0;
    const harness = createHarness(
      [["file:///workspace/src/app.html", "html"]],
      (uri) => request++ === 0 ? stale.promise : ownership(uri, false),
    );
    harness.controller.start();
    await vi.waitFor(() => expect(harness.requests).toHaveBeenCalledTimes(1));

    harness.fireAnalysis("source-text");
    await vi.waitFor(() => expect(harness.requests).toHaveBeenCalledTimes(2));
    stale.resolve(ownership("file:///workspace/src/app.html", true));
    await settleAsyncWork();

    expect(harness.languageIds()).toEqual(["html"]);
    expect(harness.recorded.languageChanges).toEqual([]);
    await harness.controller.disposeAsync();
  });

  test("re-proves live false-to-true and true-to-false associations after source analysis settles", async () => {
    let owned = false;
    const harness = createHarness(
      [["file:///workspace/src/live-card.html", "html"]],
      (uri) => ownership(uri, owned, "template"),
    );
    harness.controller.start();
    await vi.waitFor(() => expect(harness.requests).toHaveBeenCalledTimes(1));
    expect(harness.languageIds()).toEqual(["html"]);

    harness.fireAnalysis("source-text", "file:///other-workspace");
    await settleAsyncWork();
    expect(harness.requests).toHaveBeenCalledTimes(1);

    owned = true;
    harness.fireAnalysis("source-text");
    await vi.waitFor(() => expect(harness.languageIds()).toEqual(["aurelia-html"]));
    expect(harness.requests).toHaveBeenCalledTimes(2);

    owned = false;
    harness.fireAnalysis("source-text");
    await vi.waitFor(() => expect(harness.languageIds()).toEqual(["html"]));
    expect(harness.requests).toHaveBeenCalledTimes(3);
    expect(harness.recorded.languageChanges.map((entry) => entry.languageId)).toEqual([
      "aurelia-html",
      "html",
    ]);
    await harness.controller.disposeAsync();
  });

  test("fails closed on ownership rejection and restores only controller-selected custom mode", async () => {
    let reject = false;
    const harness = createHarness([
      ["file:///workspace/src/controlled.html", "html"],
      ["file:///workspace/src/manual.html", "aurelia-html"],
    ], (uri) => reject
      ? Promise.reject(new Error(`ownership rejected for ${uri}`))
      : ownership(uri, true, "template"));
    harness.controller.start();
    await vi.waitFor(() => expect(harness.languageIds()).toEqual([
      "aurelia-html",
      "aurelia-html",
    ]));
    await settleAsyncWork();

    reject = true;
    harness.fireAnalysis("source-text");
    await vi.waitFor(() => expect(harness.languageIds()).toEqual([
      "html",
      "aurelia-html",
    ]));
    expect(harness.requests).toHaveBeenCalledTimes(4);
    expect(harness.recorded.languageChanges.map((entry) => entry.languageId)).toEqual([
      "aurelia-html",
      "html",
    ]);
    await harness.controller.disposeAsync();
    expect(harness.languageIds()).toEqual(["html", "aurelia-html"]);
  });

  test("re-proves a newer owned answer after an in-flight failure restoration", async () => {
    let answerKind: "owned" | "reject" = "owned";
    const harness = createHarness(
      [["file:///workspace/src/recovery-race.html", "html"]],
      (uri) => answerKind === "reject"
        ? Promise.reject(new Error(`ownership rejected for ${uri}`))
        : ownership(uri, true, "template"),
    );
    harness.controller.start();
    await vi.waitFor(() => expect(harness.languageIds()).toEqual(["aurelia-html"]));
    await settleAsyncWork();

    const restore = deferred<void>();
    const original = harness.vscode.languages.setTextDocumentLanguage;
    let restoreCalls = 0;
    let concurrent = 0;
    let maximumConcurrent = 0;
    harness.vscode.languages.setTextDocumentLanguage = async (document, languageId) => {
      concurrent += 1;
      maximumConcurrent = Math.max(maximumConcurrent, concurrent);
      try {
        if (languageId === "html") {
          restoreCalls += 1;
          await restore.promise;
        }
        return await original(document, languageId);
      } finally {
        concurrent -= 1;
      }
    };

    answerKind = "reject";
    harness.fireAnalysis("source-text");
    await vi.waitFor(() => expect(restoreCalls).toBe(1));

    answerKind = "owned";
    harness.fireAnalysis("source-text");
    await vi.waitFor(() => expect(harness.requests).toHaveBeenCalledTimes(3));
    restore.resolve();

    await vi.waitFor(() => expect(harness.languageIds()).toEqual(["aurelia-html"]));
    await vi.waitFor(() => expect(harness.requests.mock.calls.length).toBeGreaterThanOrEqual(4));
    expect(maximumConcurrent).toBe(1);
    expect(harness.recorded.languageChanges.map((entry) => entry.languageId)).toEqual([
      "aurelia-html",
      "html",
      "aurelia-html",
    ]);
    await harness.controller.disposeAsync();
    expect(harness.languageIds()).toEqual(["html"]);
  });

  test("keeps an exactly owned root document in HTML mode", async () => {
    const harness = createHarness(
      [["file:///workspace/index.html", "html"]],
      (uri) => ({ ...ownership(uri, false), owners: [{ projectKey: "app", role: "root-document" }] }),
    );
    harness.controller.start();
    await vi.waitFor(() => expect(harness.requests).toHaveBeenCalledTimes(1));
    await settleAsyncWork();

    expect(harness.languageIds()).toEqual(["html"]);
    expect(harness.recorded.languageChanges).toEqual([]);
    await harness.controller.disposeAsync();
  });

  test("invalidates an ownership answer when its document closes", async () => {
    const answer = deferred<ReturnType<typeof ownership>>();
    const harness = createHarness(
      [["file:///workspace/src/app.html", "html"]],
      () => answer.promise,
    );
    harness.controller.start();
    await vi.waitFor(() => expect(harness.requests).toHaveBeenCalledTimes(1));
    const document = harness.vscode.workspace.textDocuments[0]!;
    harness.recorded.fireDocumentClosed(document);
    answer.resolve(ownership(document.uri.toString(), true));
    await settleAsyncWork();

    expect(harness.vscode.workspace.textDocuments).toEqual([]);
    expect(harness.recorded.languageChanges).toEqual([]);
    await harness.controller.disposeAsync();
  });

  test("reconciles a topology withdrawal that races a non-cancellable language switch", async () => {
    let owned = true;
    const harness = createHarness(
      [["file:///workspace/src/app.html", "html"]],
      (uri) => ownership(uri, owned),
    );
    const change = deferred<void>();
    const original = harness.vscode.languages.setTextDocumentLanguage;
    harness.vscode.languages.setTextDocumentLanguage = async (document, languageId) => {
      if (languageId === "aurelia-html") await change.promise;
      return original(document, languageId);
    };
    harness.controller.start();
    await vi.waitFor(() => expect(harness.requests).toHaveBeenCalledTimes(1));

    owned = false;
    harness.fireTopology();
    change.resolve();
    await vi.waitFor(() => expect(harness.languageIds()).toEqual(["html"]));
    expect(harness.requests.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(harness.requests.mock.calls.length).toBeLessThanOrEqual(3);
    await harness.controller.disposeAsync();
  });

  test("tracks one converged transition when the host reopens the same document object", async () => {
    let owned = true;
    const harness = createHarness(
      [["file:///workspace/src/same-object-converged.html", "html"]],
      (uri) => ownership(uri, owned),
    );
    const originalDocument = harness.vscode.workspace.textDocuments[0]!;
    const transitions: string[] = [];
    const lifecycle: Array<{ phase: "close" | "open"; languageId: string }> = [];
    harness.vscode.workspace.onDidCloseTextDocument((document) => {
      lifecycle.push({ phase: "close", languageId: document.languageId });
    });
    harness.vscode.workspace.onDidOpenTextDocument((document) => {
      lifecycle.push({ phase: "open", languageId: document.languageId });
    });
    harness.vscode.languages.setTextDocumentLanguage = (document, languageId) => {
      transitions.push(languageId);
      harness.recorded.fireDocumentClosed(document);
      document.languageId = languageId;
      harness.recorded.languageChanges.push({ document, languageId });
      harness.recorded.fireDocumentOpened(document);
      return Promise.resolve(document);
    };

    harness.controller.start();
    await vi.waitFor(() => expect(harness.languageIds()).toEqual(["aurelia-html"]));
    await settleAsyncWork();
    expect(harness.vscode.workspace.textDocuments).toEqual([originalDocument]);
    expect(harness.requests).toHaveBeenCalledTimes(1);
    expect(transitions).toEqual(["aurelia-html"]);
    expect(lifecycle).toEqual([
      { phase: "close", languageId: "html" },
      { phase: "open", languageId: "aurelia-html" },
    ]);

    owned = false;
    harness.fireTopology();
    await vi.waitFor(() => expect(harness.languageIds()).toEqual(["html"]));
    await settleAsyncWork();
    expect(harness.vscode.workspace.textDocuments).toEqual([originalDocument]);
    expect(harness.requests).toHaveBeenCalledTimes(2);
    expect(transitions).toEqual(["aurelia-html", "html"]);
    expect(lifecycle).toEqual([
      { phase: "close", languageId: "html" },
      { phase: "open", languageId: "aurelia-html" },
      { phase: "close", languageId: "aurelia-html" },
      { phase: "open", languageId: "html" },
    ]);
    await harness.controller.disposeAsync();
    expect(transitions).toEqual(["aurelia-html", "html"]);
  });

  test("reconciles a stale switch when the host mutates and reopens the same document object", async () => {
    let owned = true;
    const harness = createHarness(
      [["file:///workspace/src/same-object.html", "html"]],
      (uri) => ownership(uri, owned),
    );
    const originalDocument = harness.vscode.workspace.textDocuments[0]!;
    const change = deferred<void>();
    const transitions: string[] = [];
    const lifecycle: Array<{ phase: "close" | "open"; languageId: string }> = [];
    harness.vscode.workspace.onDidCloseTextDocument((document) => {
      lifecycle.push({ phase: "close", languageId: document.languageId });
    });
    harness.vscode.workspace.onDidOpenTextDocument((document) => {
      lifecycle.push({ phase: "open", languageId: document.languageId });
    });
    harness.vscode.languages.setTextDocumentLanguage = async (document, languageId) => {
      transitions.push(languageId);
      if (languageId === "aurelia-html") await change.promise;
      harness.recorded.fireDocumentClosed(document);
      document.languageId = languageId;
      harness.recorded.languageChanges.push({ document, languageId });
      harness.recorded.fireDocumentOpened(document);
      return document;
    };
    harness.controller.start();
    await vi.waitFor(() => expect(transitions).toEqual(["aurelia-html"]));

    owned = false;
    harness.fireTopology();
    await vi.waitFor(() => expect(harness.requests).toHaveBeenCalledTimes(2));
    expect(harness.vscode.workspace.textDocuments).toEqual([originalDocument]);
    expect(originalDocument.languageId).toBe("html");

    change.resolve();
    await vi.waitFor(() => expect(harness.languageIds()).toEqual(["html"]));
    await vi.waitFor(() => expect(transitions).toEqual(["aurelia-html", "html"]));
    expect(harness.vscode.workspace.textDocuments).toEqual([originalDocument]);
    expect(harness.requests).toHaveBeenCalledTimes(3);
    expect(lifecycle).toEqual([
      { phase: "close", languageId: "html" },
      { phase: "open", languageId: "aurelia-html" },
      { phase: "close", languageId: "aurelia-html" },
      { phase: "open", languageId: "html" },
    ]);

    await settleAsyncWork();
    expect(harness.requests).toHaveBeenCalledTimes(3);
    expect(transitions).toEqual(["aurelia-html", "html"]);
    await harness.controller.disposeAsync();
    expect(transitions).toEqual(["aurelia-html", "html"]);
  });

  test("serializes repeated owned reconciles behind one non-cancellable language switch", async () => {
    const harness = createHarness(
      [["file:///workspace/src/app.html", "html"]],
      (uri) => ownership(uri, true),
    );
    const change = deferred<void>();
    const original = harness.vscode.languages.setTextDocumentLanguage;
    let calls = 0;
    let concurrent = 0;
    let maximumConcurrent = 0;
    let closes = 0;
    let opens = 0;
    harness.vscode.workspace.onDidCloseTextDocument(() => { closes += 1; });
    harness.vscode.workspace.onDidOpenTextDocument(() => { opens += 1; });
    harness.vscode.languages.setTextDocumentLanguage = async (document, languageId) => {
      calls += 1;
      concurrent += 1;
      maximumConcurrent = Math.max(maximumConcurrent, concurrent);
      try {
        if (languageId === "aurelia-html") await change.promise;
        return await original(document, languageId);
      } finally {
        concurrent -= 1;
      }
    };
    harness.controller.start();
    await vi.waitFor(() => expect(calls).toBe(1));

    harness.fireTopology();
    harness.fireTopology();
    await settleAsyncWork();
    expect(calls).toBe(1);
    expect(maximumConcurrent).toBe(1);

    change.resolve();
    await vi.waitFor(() => expect(harness.languageIds()).toEqual(["aurelia-html"]));
    await settleAsyncWork();
    expect(calls).toBe(1);
    expect(maximumConcurrent).toBe(1);
    expect({ closes, opens }).toEqual({ closes: 1, opens: 1 });
    const requestCount = harness.requests.mock.calls.length;
    await settleAsyncWork();
    expect(harness.requests).toHaveBeenCalledTimes(requestCount);
    await harness.controller.disposeAsync();
  });

  test("waits for an in-flight switch before restoring during deactivation", async () => {
    const harness = createHarness(
      [["file:///workspace/src/app.html", "html"]],
      (uri) => ownership(uri, true),
    );
    const change = deferred<void>();
    const original = harness.vscode.languages.setTextDocumentLanguage;
    harness.vscode.languages.setTextDocumentLanguage = async (document, languageId) => {
      if (languageId === "aurelia-html") await change.promise;
      return original(document, languageId);
    };
    harness.controller.start();
    await vi.waitFor(() => expect(harness.requests).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(harness.vscode.languages.setTextDocumentLanguage).toBeDefined());
    await settleAsyncWork();

    const disposal = harness.controller.disposeAsync();
    change.resolve();
    await disposal;

    expect(harness.languageIds()).toEqual(["html"]);
    expect(harness.recorded.languageChanges.map((entry) => entry.languageId)).toEqual([
      "aurelia-html",
      "html",
    ]);
  });

  test("does not restore a custom mode that the controller did not select", async () => {
    const harness = createHarness(
      [["file:///workspace/src/manual.html", "aurelia-html"]],
      (uri) => ownership(uri, true),
    );
    harness.controller.start();
    await vi.waitFor(() => expect(harness.requests).toHaveBeenCalledTimes(1));
    await harness.controller.disposeAsync();

    expect(harness.languageIds()).toEqual(["aurelia-html"]);
    expect(harness.recorded.languageChanges).toEqual([]);
  });

  test.each([
    ["unowned", true],
    ["sessionless", false],
  ])("preserves a manually selected custom mode when %s", async (_label, active) => {
    const harness = createHarness(
      [["file:///workspace/src/manual-unowned.html", "aurelia-html"]],
      (uri) => ownership(uri, false),
    );
    if (!active) harness.setSession(false);
    harness.controller.start();
    await settleAsyncWork();
    await harness.controller.disposeAsync();

    expect(harness.languageIds()).toEqual(["aurelia-html"]);
    expect(harness.recorded.languageChanges).toEqual([]);
  });

  test("does not carry controller ownership across a real close and reopen", async () => {
    let owned = true;
    const harness = createHarness(
      [["file:///workspace/src/reopened.html", "html"]],
      (uri) => ownership(uri, owned),
    );
    harness.controller.start();
    await vi.waitFor(() => expect(harness.languageIds()).toEqual(["aurelia-html"]));

    const controlled = harness.vscode.workspace.textDocuments[0]!;
    owned = false;
    harness.recorded.fireDocumentClosed(controlled);
    expect(harness.vscode.workspace.textDocuments).toEqual([]);
    const reopened = {
      uri: controlled.uri,
      languageId: "aurelia-html",
      text: controlled.text,
      getText: () => controlled.text,
    };
    harness.recorded.fireDocumentOpened(reopened);
    expect(harness.vscode.workspace.textDocuments).toEqual([reopened]);
    await vi.waitFor(() => expect(harness.requests).toHaveBeenCalledTimes(2));
    await settleAsyncWork();
    expect(harness.languageIds()).toEqual(["aurelia-html"]);
    await harness.controller.disposeAsync();

    expect(harness.languageIds()).toEqual(["aurelia-html"]);
    expect(harness.recorded.languageChanges.map((entry) => entry.languageId)).toEqual([
      "aurelia-html",
    ]);
  });

  test("drops controller ownership when a genuine close displaces an in-flight restore", async () => {
    let owned = true;
    const harness = createHarness(
      [["file:///workspace/src/restore-race.html", "html"]],
      (uri) => ownership(uri, owned),
    );
    harness.controller.start();
    await vi.waitFor(() => expect(harness.languageIds()).toEqual(["aurelia-html"]));

    const restore = deferred<void>();
    const original = harness.vscode.languages.setTextDocumentLanguage;
    let restoreCalls = 0;
    harness.vscode.languages.setTextDocumentLanguage = async (document, languageId) => {
      if (languageId === "html") {
        restoreCalls += 1;
        await restore.promise;
      }
      return original(document, languageId);
    };
    owned = false;
    harness.fireTopology();
    await vi.waitFor(() => expect(restoreCalls).toBe(1));

    const restoring = harness.vscode.workspace.textDocuments[0]!;
    harness.recorded.fireDocumentClosed(restoring);
    expect(harness.vscode.workspace.textDocuments).toEqual([]);
    const reopened = {
      uri: restoring.uri,
      languageId: "aurelia-html",
      text: restoring.text,
      getText: () => restoring.text,
    };
    harness.recorded.fireDocumentOpened(reopened);
    expect(harness.vscode.workspace.textDocuments).toEqual([reopened]);
    restore.resolve();

    await vi.waitFor(() => expect(harness.requests.mock.calls.length).toBeGreaterThanOrEqual(3));
    await settleAsyncWork();
    expect(harness.languageIds()).toEqual(["aurelia-html"]);
    expect(harness.recorded.languageChanges.map((entry) => entry.languageId)).toEqual([
      "aurelia-html",
    ]);
    await harness.controller.disposeAsync();
    expect(harness.languageIds()).toEqual(["aurelia-html"]);
  });
});

function createHarness(
  inputs: readonly (readonly [uri: string, languageId: string])[],
  answer: (uri: string) => ReturnType<typeof ownership> | Promise<ReturnType<typeof ownership>>,
) {
  const { vscode, recorded } = createVscodeApi({
    workspaceFolders: [{ name: "workspace", uri: "file:///workspace" }],
    openDocuments: inputs.map(([uri, languageId]) => ({ uri, languageId, text: "<template></template>" })),
  });
  const requests = vi.fn(answer);
  const sessionListeners = new Set<() => void>();
  const analysisListeners = new Set<(payload: {
    changeKind: "source-text" | "topology";
    workspace: { key: string };
  }) => void>();
  const session = { workspace: { key: "file:///workspace" }, client: {} };
  let active = true;
  const ctx = {
    vscode: vscode as unknown as VscodeApi,
    logger: { warn: vi.fn() },
    languageClient: {
      sessionForUri: () => active ? session : undefined,
      onDidChangeSessions: (listener: () => void) => {
        sessionListeners.add(listener);
        return { dispose: () => sessionListeners.delete(listener) };
      },
    },
    lsp: {
      getSourceOwnership: async (uri: string) => ({
        ...(await requests(uri)),
        workspace: { key: "file:///workspace", name: "workspace", uri: "file:///workspace" },
      }),
      onAnalysisChanged: (listener: (payload: {
        changeKind: "source-text" | "topology";
        workspace: { key: string };
      }) => void) => {
        analysisListeners.add(listener);
        return { dispose: () => analysisListeners.delete(listener) };
      },
    },
  };
  const controller = new OwnedTemplateLanguageController(ctx as never);
  return {
    controller,
    recorded,
    requests,
    vscode,
    languageIds: () => vscode.workspace.textDocuments.map((document) => document.languageId),
    setSession(value: boolean) {
      active = value;
      for (const listener of sessionListeners) listener();
    },
    fireTopology() {
      for (const listener of analysisListeners) {
        listener({ changeKind: "topology", workspace: { key: "file:///workspace" } });
      }
    },
    fireAnalysis(
      changeKind: "source-text" | "topology",
      workspaceKey = "file:///workspace",
    ) {
      for (const listener of analysisListeners) {
        listener({ changeKind, workspace: { key: workspaceKey } });
      }
    },
  };
}

function ownership(
  uri: string,
  templateOwned: boolean,
  ownerRole: string | null = templateOwned ? "template" : null,
) {
  return {
    fingerprint: "test",
    sourceUri: uri,
    answer: { result: "answered" },
    templateOwned,
    owners: ownerRole == null ? [] : [{ projectKey: "app", role: ownerRole }],
  };
}

async function settleAsyncWork(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}
