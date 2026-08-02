import { describe, expect, test, vi } from "vitest";
import { createMiddleware } from "../../out/client-middleware.js";

class StubUri {
  constructor(readonly value: string) {}

  toString(): string {
    return this.value;
  }
}

function createHarness(options: {
  openDocumentVersion?: number;
  editVersion?: number;
  resolvedEdit?: unknown;
} = {}) {
  const uri = "file:///app.ts";
  const document = {
    languageId: "typescript",
    uri: new StubUri(uri),
    version: options.openDocumentVersion ?? 4,
  };
  const action = {
    title: "Declare member 'titel' on MyApp",
    data: {
      semanticRuntime: {
        resolve: {
          schema: "aurelia.template-code-action-resolve/1",
        },
      },
    },
  };
  const protocolAction = { title: action.title, data: action.data };
  const protocolResolvedAction = {
    ...protocolAction,
    ...(options.resolvedEdit === null
      ? {}
      : {
          edit: options.resolvedEdit ?? {
            documentChanges: [{
              textDocument: { uri, version: options.editVersion ?? document.version },
              edits: [],
            }],
          },
        }),
  };
  const convertedAction = {
    ...action,
    edit: protocolResolvedAction.edit == null ? undefined : { converted: true },
  };
  const rawClient = {
    sendRequest: vi.fn(async () => protocolResolvedAction),
    code2ProtocolConverter: {
      asCodeActionSync: vi.fn(() => protocolAction),
    },
    protocol2CodeConverter: {
      asCodeAction: vi.fn(async () => convertedAction),
    },
  };
  const showWarningMessage = vi.fn();
  const logger = { warn: vi.fn() };
  const vscode = {
    Uri: {
      parse: (value: string) => new StubUri(value),
    },
    workspace: {
      textDocuments: [document],
    },
    window: { showWarningMessage },
  };
  const middleware = createMiddleware(
    vscode as never,
    logger as never,
    { client: rawClient } as never,
  );
  return { action, convertedAction, logger, middleware, rawClient, showWarningMessage };
}

describe("code-action resolve middleware", () => {
  test("returns a current resolved action after protocol conversion and version validation", async () => {
    const harness = createHarness();
    const token = { isCancellationRequested: false };
    const next = vi.fn();

    const result = await harness.middleware.resolveCodeAction?.(
      harness.action as never,
      token as never,
      next,
    );

    expect(result).toBe(harness.convertedAction);
    expect(next).not.toHaveBeenCalled();
    expect(harness.rawClient.sendRequest).toHaveBeenCalledWith(
      "codeAction/resolve",
      expect.objectContaining({ title: harness.action.title }),
      token,
    );
    expect(harness.rawClient.protocol2CodeConverter.asCodeAction).toHaveBeenCalled();
    expect(harness.showWarningMessage).not.toHaveBeenCalled();
  });

  test("refuses a resolved edit whose open target changed while the action was prepared", async () => {
    const harness = createHarness({ openDocumentVersion: 5, editVersion: 4 });

    const result = await harness.middleware.resolveCodeAction?.(
      harness.action as never,
      { isCancellationRequested: false } as never,
      vi.fn(),
    );

    expect(result).toBe(harness.action);
    expect(harness.rawClient.protocol2CodeConverter.asCodeAction).toHaveBeenCalled();
    expect(harness.logger.warn).toHaveBeenCalledWith(expect.stringContaining("expected version 4"));
    expect(harness.showWarningMessage).toHaveBeenCalledWith(expect.stringContaining("Request the code action again"));
  });

  test("refuses an action that is no longer semantically applicable", async () => {
    const harness = createHarness({ resolvedEdit: null });

    const result = await harness.middleware.resolveCodeAction?.(
      harness.action as never,
      { isCancellationRequested: false } as never,
      vi.fn(),
    );

    expect(result).toBe(harness.action);
    expect(harness.logger.warn).toHaveBeenCalledWith(expect.stringContaining("no longer applicable"));
    expect(harness.showWarningMessage).toHaveBeenCalledOnce();
  });

  test("delegates code actions that do not carry Aurelia resolve data", async () => {
    const harness = createHarness();
    const action = { title: "Unrelated action" };
    const delegated = { ...action, edit: { delegated: true } };
    const next = vi.fn(async () => delegated);

    const result = await harness.middleware.resolveCodeAction?.(
      action as never,
      { isCancellationRequested: false } as never,
      next as never,
    );

    expect(result).toBe(delegated);
    expect(next).toHaveBeenCalled();
    expect(harness.rawClient.sendRequest).not.toHaveBeenCalled();
  });
});
