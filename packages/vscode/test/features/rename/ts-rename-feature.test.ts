import { describe, expect, test, vi } from "vitest";
import type { ClientContext } from "../../../out/core/context.js";
import { TsRenameFeature } from "../../../out/features/rename/ts-rename-feature.js";

type StubDisposable = { dispose(): void };
type StubProvider = {
  prepareRename(document: StubDocument, position: StubPosition, token?: unknown): Promise<unknown>;
  provideRenameEdits(document: StubDocument, position: StubPosition, newName: string, token?: unknown): Promise<StubWorkspaceEdit | undefined>;
};

class StubPosition {
  constructor(
    readonly line: number,
    readonly character: number,
  ) {}
}

class StubRange {
  constructor(
    readonly start: StubPosition,
    readonly end: StubPosition,
  ) {}
}

class StubUri {
  constructor(readonly value: string) {}

  get fsPath(): string {
    return this.value.replace("file:///", "");
  }

  toString(): string {
    return this.value;
  }
}

class StubWorkspaceEdit {
  readonly replacements: Array<{ uri: StubUri; range: StubRange; newText: string }> = [];

  replace(uri: StubUri, range: StubRange, newText: string): void {
    this.replacements.push({ uri, range, newText });
  }

  entries(): Array<[StubUri, unknown[]]> {
    const byUri = new Map<string, { uri: StubUri; edits: unknown[] }>();
    for (const replacement of this.replacements) {
      const key = replacement.uri.toString();
      const entry = byUri.get(key) ?? { uri: replacement.uri, edits: [] };
      entry.edits.push(replacement);
      byUri.set(key, entry);
    }
    return Array.from(byUri.values()).map((entry) => [entry.uri, entry.edits]);
  }
}

type ProtocolEdit = {
  documentChanges?: Array<{
    textDocument: { uri: string; version: number | null };
    edits: Array<{
      range: {
        start: { line: number; character: number };
        end: { line: number; character: number };
      };
      newText: string;
    }>;
  }>;
};

type RenameResponse =
  | { status: "available"; range: ProtocolEditRange; placeholder: string; message: string; templateReferenceCount: number; typeScriptReferenceCount: number; candidateCount: number }
  | { status: "success"; workspaceEdit: ProtocolEdit; message: string; templateReferenceCount: number; typeScriptReferenceCount: number; candidateCount: number }
  | { status: "not-applicable"; reason: string; message: string; templateReferenceCount: number; typeScriptReferenceCount: number; candidateCount: number }
  | { status: "refused"; reason: string; message: string; templateReferenceCount: number; typeScriptReferenceCount: number; candidateCount: number }
  | { status: "blocked"; reason: string; message: string; failures?: readonly string[]; templateReferenceCount?: number; typeScriptReferenceCount?: number; candidateCount?: number };

type ProtocolEditRange = {
  start: { line: number; character: number };
  end: { line: number; character: number };
};

type StubDocument = {
  languageId: string;
  uri: StubUri;
  version: number;
};

function createContext(options: {
  renameResponse?: RenameResponse;
  textDocuments?: StubDocument[];
  ownsDocument?: boolean;
} = {}) {
  const providers: StubProvider[] = [];
  const selectors: unknown[] = [];
  const registrations: Array<{ dispose: ReturnType<typeof vi.fn> }> = [];
  const infoMessages: string[] = [];
  const renameFromTs = vi.fn(async () => options.renameResponse ?? notApplicableResponse());
  const registerRenameProvider = vi.fn((selector: unknown, provider: StubProvider): StubDisposable => {
    selectors.push(selector);
    providers.push(provider);
    const registration = { dispose: vi.fn() };
    registrations.push(registration);
    return registration;
  });
  const convertWorkspaceEdit = vi.fn(async (_uri: string, workspaceEdit: ProtocolEdit) => {
    const edit = new StubWorkspaceEdit();
    for (const change of workspaceEdit.documentChanges ?? []) {
      const uri = new StubUri(change.textDocument.uri);
      for (const row of change.edits) {
        edit.replace(
          uri,
          new StubRange(
            new StubPosition(row.range.start.line, row.range.start.character),
            new StubPosition(row.range.end.line, row.range.end.character),
          ),
          row.newText,
        );
      }
    }
    return edit;
  });

  const ctx = {
    vscode: {
      Position: StubPosition,
      Range: StubRange,
      Uri: { parse: (value: string) => new StubUri(value) },
      WorkspaceEdit: StubWorkspaceEdit,
      workspace: { textDocuments: options.textDocuments ?? [] },
      window: {
        showInformationMessage: vi.fn((message: string) => {
          infoMessages.push(message);
          return message;
        }),
      },
      languages: { registerRenameProvider },
    },
    lsp: { renameFromTs, convertWorkspaceEdit },
    languageClient: {
      sessionForUri: () => options.ownsDocument === false ? undefined : {},
    },
    logger: { debug: vi.fn(), warn: vi.fn() },
  } as unknown as ClientContext;

  return {
    ctx,
    providers,
    selectors,
    registrations,
    renameFromTs,
    convertWorkspaceEdit,
    infoMessages,
  };
}

function createDocument(languageId = "typescript"): StubDocument {
  return {
    languageId,
    uri: new StubUri("file:///app.ts"),
    version: 1,
  };
}

function availableResponse(): RenameResponse {
  return {
    status: "available",
    range: {
      start: { line: 2, character: 10 },
      end: { line: 2, character: 15 },
    },
    placeholder: "title",
    message: "Cross-domain rename is available.",
    templateReferenceCount: 1,
    typeScriptReferenceCount: 0,
    candidateCount: 0,
  };
}

function successResponse(): RenameResponse {
  return {
    status: "success",
    workspaceEdit: {
      documentChanges: [
        {
          textDocument: { uri: "file:///app.ts", version: 1 },
          edits: [{
            range: {
              start: { line: 2, character: 10 },
              end: { line: 2, character: 15 },
            },
            newText: "heading",
          }],
        },
        {
          textDocument: { uri: "file:///app.html", version: 7 },
          edits: [{
            range: {
              start: { line: 0, character: 3 },
              end: { line: 0, character: 8 },
            },
            newText: "heading",
          }],
        },
      ],
    },
    message: "2 cross-domain edits.",
    templateReferenceCount: 1,
    typeScriptReferenceCount: 1,
    candidateCount: 0,
  };
}

function notApplicableResponse(candidateCount = 0): RenameResponse {
  return {
    status: "not-applicable",
    reason: candidateCount > 0 ? "unverified-candidates-only" : "no-aurelia-references",
    message: "No proven Aurelia references.",
    templateReferenceCount: 0,
    typeScriptReferenceCount: 0,
    candidateCount,
  };
}

async function activateFeature(ctx: ClientContext): Promise<StubDisposable> {
  const contributions: StubDisposable[] = [];
  await TsRenameFeature.activate(ctx, (contribution) => {
    contributions.push(contribution);
    return contribution;
  });
  return {
    dispose: () => {
      for (const contribution of contributions.reverse()) contribution.dispose();
    },
  };
}

describe("TsRenameFeature", () => {
  test("registers one stable provider for every TypeScript and JavaScript language form", async () => {
    const harness = createContext();
    const activation = await activateFeature(harness.ctx);

    expect(harness.selectors[0]).toEqual([
      { language: "typescript" },
      { language: "typescriptreact" },
      { language: "javascript" },
      { language: "javascriptreact" },
    ]);
    activation.dispose();
    expect(harness.registrations[0]?.dispose).toHaveBeenCalledTimes(1);
  });

  test("routes JavaScript origins through the same semantic rename plan", async () => {
    const harness = createContext({ renameResponse: availableResponse() });
    await activateFeature(harness.ctx);

    await harness.providers[0]?.prepareRename(
      createDocument("javascriptreact"),
      new StubPosition(2, 11),
    );

    expect(harness.renameFromTs).toHaveBeenCalledTimes(1);
  });

  test("claims preparation only for a proven Aurelia cross-domain symbol", async () => {
    const harness = createContext({ renameResponse: availableResponse() });
    await activateFeature(harness.ctx);
    const document = createDocument();
    const position = new StubPosition(2, 11);

    const result = await harness.providers[0]?.prepareRename(document, position);

    expect(result).toEqual({
      range: new StubRange(new StubPosition(2, 10), new StubPosition(2, 15)),
      placeholder: "title",
    });
    expect(harness.renameFromTs).toHaveBeenCalledWith(
      "file:///app.ts",
      { line: 2, character: 11 },
      undefined,
      undefined,
    );
  });

  test("falls through to TypeScript for symbols without Aurelia references", async () => {
    const harness = createContext();
    await activateFeature(harness.ctx);
    const document = createDocument();
    const position = new StubPosition(2, 11);

    expect(await harness.providers[0]?.prepareRename(document, position)).toBeUndefined();
    expect(await harness.providers[0]?.provideRenameEdits(document, position, "heading")).toBeUndefined();
    expect(harness.renameFromTs).toHaveBeenCalledTimes(2);
  });

  test("does not claim TypeScript documents outside an owned Aurelia workspace", async () => {
    const harness = createContext({ ownsDocument: false });
    await activateFeature(harness.ctx);
    const document = createDocument();
    const position = new StubPosition(2, 11);

    expect(await harness.providers[0]?.prepareRename(document, position)).toBeUndefined();
    expect(await harness.providers[0]?.provideRenameEdits(document, position, "heading")).toBeUndefined();
    expect(harness.renameFromTs).not.toHaveBeenCalled();
  });

  test("returns the server's atomic TypeScript and Aurelia edit plan", async () => {
    const harness = createContext({ renameResponse: successResponse() });
    await activateFeature(harness.ctx);
    const token = { isCancellationRequested: false } as never;

    const edit = await harness.providers[0]?.provideRenameEdits(
      createDocument(),
      new StubPosition(2, 11),
      "heading",
      token,
    );

    expect(harness.renameFromTs).toHaveBeenCalledWith(
      "file:///app.ts",
      { line: 2, character: 11 },
      "heading",
      token,
    );
    expect(edit?.replacements).toEqual([
      expect.objectContaining({ uri: { value: "file:///app.ts" }, newText: "heading" }),
      expect.objectContaining({ uri: { value: "file:///app.html" }, newText: "heading" }),
    ]);
  });

  test("blocks the atomic rename when any open document version is stale", async () => {
    const openTemplate = { languageId: "html", uri: new StubUri("file:///app.html"), version: 8 };
    const harness = createContext({ textDocuments: [openTemplate], renameResponse: successResponse() });
    await activateFeature(harness.ctx);

    await expect(harness.providers[0]?.provideRenameEdits(
      createDocument(),
      new StubPosition(2, 11),
      "heading",
    )).rejects.toThrow("editor documents changed");
  });

  test("honors cancellation before, after, and during cross-domain requests", async () => {
    const harness = createContext({ renameResponse: successResponse() });
    await activateFeature(harness.ctx);
    const provider = harness.providers[0]!;
    const document = createDocument();
    const position = new StubPosition(2, 11);
    const alreadyCancelled = { isCancellationRequested: true };
    expect(await provider.provideRenameEdits(document, position, "heading", alreadyCancelled)).toBeUndefined();
    expect(harness.renameFromTs).not.toHaveBeenCalled();

    const requestToken = { isCancellationRequested: false };
    harness.renameFromTs.mockImplementationOnce(async () => {
      requestToken.isCancellationRequested = true;
      return successResponse();
    });
    expect(await provider.provideRenameEdits(document, position, "heading", requestToken)).toBeUndefined();
    expect(harness.convertWorkspaceEdit).not.toHaveBeenCalled();

    const conversionToken = { isCancellationRequested: false };
    harness.renameFromTs.mockResolvedValueOnce(successResponse());
    harness.convertWorkspaceEdit.mockImplementationOnce(async () => {
      conversionToken.isCancellationRequested = true;
      return new StubWorkspaceEdit();
    });
    expect(await provider.provideRenameEdits(document, position, "heading", conversionToken)).toBeUndefined();

    const prepareToken = { isCancellationRequested: false };
    harness.renameFromTs.mockImplementationOnce(async () => {
      prepareToken.isCancellationRequested = true;
      return availableResponse();
    });
    expect(await provider.prepareRename(document, position, prepareToken)).toBeUndefined();
  });

  test("does not collapse identical concurrent user retries", async () => {
    const harness = createContext();
    await activateFeature(harness.ctx);
    const firstGate = deferred<RenameResponse>();
    const secondGate = deferred<RenameResponse>();
    harness.renameFromTs
      .mockImplementationOnce(() => firstGate.promise)
      .mockImplementationOnce(() => secondGate.promise);
    const provider = harness.providers[0]!;
    const document = createDocument();
    const position = new StubPosition(2, 11);

    const first = provider.provideRenameEdits(document, position, "same");
    const second = provider.provideRenameEdits(document, position, "same");
    await vi.waitFor(() => expect(harness.renameFromTs).toHaveBeenCalledTimes(2));
    firstGate.resolve(successResponse());
    secondGate.resolve(successResponse());

    expect((await first)?.replacements).toHaveLength(2);
    expect((await second)?.replacements).toHaveLength(2);
  });

  test("surfaces blocked atomic plans and reports unverified candidates", async () => {
    const blocked = createContext({
      renameResponse: {
        status: "blocked",
        reason: "mapping-failed",
        message: "Aurelia cross-domain rename was blocked: stale edit.",
        failures: ["stale edit"],
        templateReferenceCount: 1,
        typeScriptReferenceCount: 1,
        candidateCount: 0,
      },
    });
    await activateFeature(blocked.ctx);
    await expect(blocked.providers[0]?.provideRenameEdits(
      createDocument(),
      new StubPosition(2, 11),
      "heading",
    )).rejects.toThrow("Aurelia cross-domain rename was blocked: stale edit.");

    const candidates = createContext({ renameResponse: notApplicableResponse(2) });
    await activateFeature(candidates.ctx);
    expect(await candidates.providers[0]?.provideRenameEdits(
      createDocument(),
      new StubPosition(2, 11),
      "heading",
    )).toBeUndefined();
    expect(candidates.infoMessages).toEqual([
      "Aurelia rename left 2 same-name template usages unchanged because they could not be verified.",
    ]);
  });
});

interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}
