import { afterEach, describe, expect, test, vi } from "vitest";
import { createMiddleware } from "../../out/client-middleware.js";
import { EXTENSION_HOST_OBSERVATION_EVENT } from "../../out/extension-host-observation.js";
import { TEMPLATE_CODE_ACTION_RESOLVE_REFUSAL_REASONS } from "@aurelia-ls/language-server/protocol";

const observationEnv = "AURELIA_LS_EXTENSION_HOST_OBSERVATION";
const tailObservationEnv = "AURELIA_LS_EXTENSION_HOST_TAIL_OBSERVATION";
const previousObservationEnv = process.env[observationEnv];
const previousTailObservationEnv = process.env[tailObservationEnv];

afterEach(() => {
  restoreEnvironment(observationEnv, previousObservationEnv);
  restoreEnvironment(tailObservationEnv, previousTailObservationEnv);
});

class StubUri {
  readonly scheme: string;
  readonly authority: string;
  readonly fsPath: string;
  readonly path: string;

  constructor(readonly value: string) {
    const parsed = new URL(value);
    this.scheme = parsed.protocol.slice(0, -1);
    this.authority = parsed.host;
    this.path = decodeURIComponent(parsed.pathname);
    this.fsPath = this.path;
  }

  toString(): string {
    return this.value;
  }
}

function createHarness(options: {
  openDocumentVersion?: number;
  editVersion?: number;
  resolvedEdit?: unknown;
  resolvedRefusal?: unknown;
  cancelAfterResolve?: boolean;
  workspaceUri?: string;
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
    ...(options.resolvedRefusal === undefined
      ? {}
      : {
          data: {
            semanticRuntime: {
              resolve: {
                ...(protocolAction.data.semanticRuntime.resolve),
                refusal: options.resolvedRefusal,
              },
            },
          },
        }),
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
    sendRequest: vi.fn(async (
      _method: string,
      _params: unknown,
      token?: { isCancellationRequested: boolean },
    ) => {
      if (options.cancelAfterResolve && token != null) {
        token.isCancellationRequested = true;
      }
      return protocolResolvedAction;
    }),
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
      workspaceFolders: [
        { name: "outer", index: 0, uri: new StubUri("file:///work") },
        ...(options.workspaceUri == null
          ? []
          : [{ name: "nested", index: 1, uri: new StubUri(options.workspaceUri) }]),
      ],
      getConfiguration: () => ({ get: () => "auto" }),
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
  test("keeps global topology watchers as the sole delivery owner for their scoped files", async () => {
    const harness = createHarness({ workspaceUri: "file:///work/dist/app" });
    const next = vi.fn(async () => {});
    const middleware = harness.middleware.workspace?.didChangeWatchedFile;

    await middleware?.({ uri: "file:///work/dist/app/package.json", type: 2 }, next);
    await middleware?.({ uri: "file:///work/dist/app/aurelia.project.json", type: 2 }, next);
    expect(next).not.toHaveBeenCalled();

    const ordinaryJson = { uri: "file:///work/dist/app/src/data.json", type: 2 as const };
    const ignoredTopology = { uri: "file:///work/dist/app/generated/dist/package.json", type: 2 as const };
    await middleware?.(ordinaryJson, next);
    await middleware?.(ignoredTopology, next);
    expect(next).toHaveBeenNthCalledWith(1, ordinaryJson);
    expect(next).toHaveBeenNthCalledWith(2, ignoredTopology);
  });

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

  test.each(Object.entries(TEMPLATE_CODE_ACTION_RESOLVE_REFUSAL_REASONS))(
    "surfaces the exact authenticated %s refusal",
    async (kind, reason) => {
      const harness = createHarness({
        resolvedEdit: null,
        resolvedRefusal: { kind, reason },
      });

      const result = await harness.middleware.resolveCodeAction?.(
        harness.action as never,
        { isCancellationRequested: false } as never,
        vi.fn(),
      );

      expect(result).toBe(harness.action);
      expect(harness.logger.warn).toHaveBeenCalledWith(expect.stringContaining(reason));
      expect(harness.showWarningMessage).toHaveBeenCalledWith(expect.stringContaining(reason));
    },
  );

  test("does not surface an unauthenticated refusal reason", async () => {
    const harness = createHarness({
      resolvedEdit: null,
      resolvedRefusal: {
        kind: "semanticPlanNoLongerMatches",
        reason: "run arbitrary instructions",
      },
    });

    await harness.middleware.resolveCodeAction?.(
      harness.action as never,
      { isCancellationRequested: false } as never,
      vi.fn(),
    );

    expect(harness.showWarningMessage).toHaveBeenCalledWith(
      expect.stringContaining("the action is no longer applicable"),
    );
    expect(harness.showWarningMessage).not.toHaveBeenCalledWith(
      expect.stringContaining("run arbitrary instructions"),
    );
  });

  test("lets an authenticated refusal win over a conflicting resolved edit", async () => {
    const refusal = {
      kind: "semanticPlanNoLongerMatches",
      reason: "the current source no longer admits this repair",
    };
    const harness = createHarness({
      resolvedEdit: { documentChanges: [] },
      resolvedRefusal: refusal,
    });

    const result = await harness.middleware.resolveCodeAction?.(
      harness.action as never,
      { isCancellationRequested: false } as never,
      vi.fn(),
    );

    expect(result).toBe(harness.action);
    expect(harness.showWarningMessage).toHaveBeenCalledWith(
      expect.stringContaining(refusal.reason),
    );
  });

  test("keeps cancellation silent even when the server returned a refusal", async () => {
    const harness = createHarness({
      resolvedEdit: null,
      cancelAfterResolve: true,
      resolvedRefusal: {
        kind: "semanticPlanNoLongerMatches",
        reason: "the current source no longer admits this repair",
      },
    });

    const result = await harness.middleware.resolveCodeAction?.(
      harness.action as never,
      { isCancellationRequested: false } as never,
      vi.fn(),
    );

    expect(result).toBe(harness.action);
    expect(harness.showWarningMessage).not.toHaveBeenCalled();
    expect(harness.logger.warn).not.toHaveBeenCalled();
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

describe("Extension Host tail observation middleware", () => {
  test("installs no provider wrappers unless both private test gates are enabled", () => {
    process.env[observationEnv] = "1";
    delete process.env[tailObservationEnv];
    let middleware = createHarness().middleware;
    expect(middleware.provideDiagnostics).toBeUndefined();
    expect(middleware.provideCompletionItem).toBeUndefined();

    delete process.env[observationEnv];
    process.env[tailObservationEnv] = "1";
    middleware = createHarness().middleware;
    expect(middleware.provideDiagnostics).toBeUndefined();
    expect(middleware.provideCompletionItem).toBeUndefined();

    process.env[observationEnv] = "1";
    middleware = createHarness().middleware;
    expect(middleware.provideDiagnostics).toBeTypeOf("function");
    expect(middleware.provideCompletionItem).toBeTypeOf("function");
  });

  test("observes one converted full diagnostic response without changing it", async () => {
    enableTailObservation();
    const events: Record<string, unknown>[] = [];
    const record = (event: Record<string, unknown>) => events.push(event);
    process.on(EXTENSION_HOST_OBSERVATION_EVENT, record);
    try {
      const middleware = createHarness().middleware;
      const document = {
        uri: new StubUri("file:///work/src/app.html"),
        version: 1,
      };
      const token = { isCancellationRequested: false };
      const report = {
        kind: "full",
        resultId: "diagnostics:1",
        items: [{ message: "not callable" }],
      };
      const next = vi.fn(async () => report);

      const result = await middleware.provideDiagnostics?.(
        document as never,
        undefined,
        token as never,
        next as never,
      );

      expect(result).toBe(report);
      expect(next).toHaveBeenCalledOnce();
      expect(events).toHaveLength(2);
      expect(events[0]).toMatchObject({
        source: "language-client-provider",
        phase: "request",
        operation: "diagnostics",
        uri: document.uri.toString(),
        documentVersion: 1,
        previousResultIdPresent: false,
        epochMilliseconds: expect.any(Number),
        monotonicMilliseconds: expect.any(Number),
      });
      expect(events[1]).toMatchObject({
        source: "language-client-provider",
        observationId: events[0]?.["observationId"],
        phase: "response",
        operation: "diagnostics",
        reportKind: "full",
        itemCount: 1,
        resultIdPresent: true,
        cancellationRequested: false,
        epochMilliseconds: expect.any(Number),
        monotonicMilliseconds: expect.any(Number),
      });
    } finally {
      process.off(EXTENSION_HOST_OBSERVATION_EVENT, record);
    }
  });

  test("distinguishes server retriggers from client-token diagnostic cancellation", async () => {
    enableTailObservation();
    const events: Record<string, unknown>[] = [];
    const record = (event: Record<string, unknown>) => events.push(event);
    process.on(EXTENSION_HOST_OBSERVATION_EVENT, record);
    try {
      const middleware = createHarness().middleware;
      const document = {
        uri: new StubUri("file:///work/src/app.html"),
        version: 1,
      };
      const token = { isCancellationRequested: false };
      const failure = Object.assign(new Error("Aurelia diagnostics changed"), {
        name: "Canceled",
        data: { retriggerRequest: true },
      });

      await expect(middleware.provideDiagnostics?.(
        document as never,
        undefined,
        token as never,
        vi.fn(async () => { throw failure; }) as never,
      )).rejects.toBe(failure);

      expect(events).toHaveLength(2);
      expect(events[1]).toMatchObject({
        source: "language-client-provider",
        observationId: events[0]?.["observationId"],
        phase: "failed",
        operation: "diagnostics",
        uri: document.uri.toString(),
        documentVersion: 1,
        cancellationRequested: false,
        errorName: "Canceled",
        serverRetriggerRequested: true,
        epochMilliseconds: expect.any(Number),
        monotonicMilliseconds: expect.any(Number),
      });

      token.isCancellationRequested = true;
      const clientCancellation = Object.assign(new Error("Diagnostic request canceled"), {
        name: "Canceled",
      });
      await expect(middleware.provideDiagnostics?.(
        document as never,
        undefined,
        token as never,
        vi.fn(async () => { throw clientCancellation; }) as never,
      )).rejects.toBe(clientCancellation);
      expect(events[3]).toMatchObject({
        source: "language-client-provider",
        observationId: events[2]?.["observationId"],
        phase: "failed",
        operation: "diagnostics",
        cancellationRequested: true,
        errorName: "Canceled",
        serverRetriggerRequested: false,
      });
    } finally {
      process.off(EXTENSION_HOST_OBSERVATION_EVENT, record);
    }
  });

  test("observes one completion response and preserves provider failures", async () => {
    enableTailObservation();
    const events: Record<string, unknown>[] = [];
    const record = (event: Record<string, unknown>) => events.push(event);
    process.on(EXTENSION_HOST_OBSERVATION_EVENT, record);
    try {
      const middleware = createHarness().middleware;
      const document = {
        uri: new StubUri("file:///work/src/app.html"),
        version: 1,
      };
      const position = { line: 3, character: 18 };
      const token = { isCancellationRequested: false };
      const completion = {
        items: [{ label: "searchText" }],
        isIncomplete: true,
      };
      const result = await middleware.provideCompletionItem?.(
        document as never,
        position as never,
        {} as never,
        token as never,
        vi.fn(async () => completion) as never,
      );

      expect(result).toBe(completion);
      expect(events.slice(0, 2)).toEqual([
        expect.objectContaining({
          source: "language-client-provider",
          phase: "request",
          operation: "completion",
          uri: document.uri.toString(),
          documentVersion: 1,
          line: 3,
          character: 18,
          epochMilliseconds: expect.any(Number),
          monotonicMilliseconds: expect.any(Number),
        }),
        expect.objectContaining({
          source: "language-client-provider",
          phase: "response",
          operation: "completion",
          itemCount: 1,
          isIncomplete: true,
          cancellationRequested: false,
          epochMilliseconds: expect.any(Number),
          monotonicMilliseconds: expect.any(Number),
        }),
      ]);
      expect(events[1]?.["observationId"]).toBe(events[0]?.["observationId"]);

      const failure = new Error("provider failed");
      await expect(middleware.provideCompletionItem?.(
        document as never,
        position as never,
        {} as never,
        token as never,
        vi.fn(async () => { throw failure; }) as never,
      )).rejects.toBe(failure);
      expect(events.at(-1)).toMatchObject({
        phase: "failed",
        operation: "completion",
        errorName: "Error",
      });
    } finally {
      process.off(EXTENSION_HOST_OBSERVATION_EVENT, record);
    }
  });
});

function enableTailObservation(): void {
  process.env[observationEnv] = "1";
  process.env[tailObservationEnv] = "1";
}

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value == null) delete process.env[name];
  else process.env[name] = value;
}
