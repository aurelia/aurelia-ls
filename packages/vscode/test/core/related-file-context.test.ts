import { expect, test, vi } from "vitest";
import type { ClientContext } from "../../src/core/context.js";
import { RelatedFileContext } from "../../src/related-file-context.js";
import { createVscodeApi } from "../helpers/vscode-stub.js";

test("keys Open Related to exact resource URIs across focus changes, reproof and workspace withdrawal", async () => {
  const { vscode, recorded } = createVscodeApi();
  const app = "vscode-remote://ssh-remote+one/project";
  const html = app + "/card.html";
  const script = app + "/card.ts";
  const excluded = app + "/excluded/other.ts";
  const otherAuthority = html.replace("ssh-remote+one", "ssh-remote+two");
  const session = { workspace: { key: app }, client: {}, incarnation: 1 };
  let sessions = [session];
  let publishSessions!: () => void;
  type Change = { workspace: { key: string }; changeKind: "source-text" | "topology"; changedSourceUris: string[] };
  let publishChange!: (change: Change) => void;
  let finishRead!: (answer: { resultId: string; uris: readonly string[] }) => void;
  const read = vi.fn(async () => ({ resultId: "first", uris: [html, script, excluded, otherAuthority] as readonly string[] }));
  const ctx = {
    vscode,
    logger: { warn: vi.fn() },
    languageClient: {
      get sessions() { return sessions; },
      sessionForUri: (uri: { toString(): string }) => sessions.length && uri.toString().startsWith(app + "/")
        && uri.toString() !== excluded ? session : undefined,
      onDidChangeSessions(listener: () => void) { publishSessions = listener; return { dispose() {} }; },
    },
    lsp: {
      getRelatedFileSources: read,
      onAnalysisChanged(listener: (change: Change) => void) { publishChange = listener; return { dispose() {} }; },
    },
  };
  const context = new RelatedFileContext(ctx as unknown as ClientContext);
  const value = () => recorded.contextValues.get("aurelia.relatedFileUris");
  try {
    await vi.waitFor(() => expect(value()).toEqual({ [html]: true, [script]: true }));
    // The native workbench can now test either editor's resource URI without waiting for an extension-host round trip.
    expect(read).toHaveBeenCalledTimes(1);
    read.mockImplementationOnce(() => new Promise(resolve => { finishRead = resolve; }));
    publishChange({ workspace: session.workspace, changeKind: "topology", changedSourceUris: [] });
    expect(read).toHaveBeenCalledTimes(2);
    expect(value()).toEqual({ [html]: true, [script]: true });
    sessions = [];
    publishSessions();
    expect(value()).toEqual({});
    finishRead({ resultId: "second", uris: [html, script] });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(value()).toEqual({});
  } finally {
    context.dispose();
  }
});
