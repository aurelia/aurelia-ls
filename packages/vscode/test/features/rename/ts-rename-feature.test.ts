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

  get(uri: StubUri): Array<{ range: StubRange; newText: string }> {
    return this.replacements
      .filter((replacement) => replacement.uri.toString() === uri.toString())
      .map((replacement) => ({ range: replacement.range, newText: replacement.newText }));
  }

  set(uri: StubUri, edits: Array<{ range: StubRange; newText: string }>): void {
    for (let index = this.replacements.length - 1; index >= 0; index--) {
      if (this.replacements[index]!.uri.toString() === uri.toString()) {
        this.replacements.splice(index, 1);
      }
    }
    for (const edit of edits) {
      this.replace(uri, edit.range, edit.newText);
    }
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

type RenameResponse =
  | { status: "success"; workspaceEdit: { documentChanges?: Array<{ textDocument: { uri: string; version: number | null }; edits: Array<{ range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string }> }> }; message: string; templateReferenceCount: number; candidateCount: number }
  | { status: "not-applicable"; reason: string; message: string; templateReferenceCount: number; candidateCount: number }
  | { status: "refused"; reason: string; message: string; templateReferenceCount: number; candidateCount: number }
  | { status: "blocked"; reason: string; message: string; failures?: readonly string[]; templateReferenceCount?: number; candidateCount?: number };

type StubDocument = {
  languageId: string;
  uri: StubUri;
  version: number;
  getWordRangeAtPosition(position: StubPosition): StubRange | undefined;
  getText(range: StubRange): string;
};

function createContext(options: { renameResponse?: RenameResponse; textDocuments?: StubDocument[] } = {}) {
  const providers: StubProvider[] = [];
  const infoMessages: string[] = [];
  const tsEdit = new StubWorkspaceEdit();
  tsEdit.replace(
    new StubUri("file:///app.ts"),
    new StubRange(new StubPosition(2, 10), new StubPosition(2, 15)),
    "heading",
  );

  const executeCommand = vi.fn(async () => tsEdit);
  const renameFromTs = vi.fn(async () => options.renameResponse ?? {
    status: "not-applicable",
    reason: "no-template-edits",
    message: "No template edits.",
    templateReferenceCount: 0,
    candidateCount: 0,
  });
  const registerRenameProvider = vi.fn((_selector: unknown, provider: StubProvider): StubDisposable => {
    providers.push(provider);
    return { dispose: vi.fn() };
  });
  const convertWorkspaceEdit = vi.fn(async (workspaceEdit: Extract<RenameResponse, { status: "success" }>["workspaceEdit"]) => {
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
      Uri: {
        parse: (value: string) => new StubUri(value),
      },
      WorkspaceEdit: StubWorkspaceEdit,
      workspace: {
        textDocuments: options.textDocuments ?? [],
      },
      window: {
        showInformationMessage: vi.fn((message: string) => {
          infoMessages.push(message);
          return message;
        }),
      },
      commands: {
        executeCommand,
      },
      languages: {
        registerRenameProvider,
      },
    },
    lsp: {
      renameFromTs,
    },
    rawClient: {
      protocol2CodeConverter: {
        asWorkspaceEdit: convertWorkspaceEdit,
      },
    },
    logger: {
      debug: vi.fn(),
      warn: vi.fn(),
    },
  } as unknown as ClientContext;

  return { ctx, providers, executeCommand, renameFromTs, convertWorkspaceEdit, tsEdit, infoMessages };
}

function createDocument(): StubDocument {
  const wordRange = new StubRange(new StubPosition(2, 10), new StubPosition(2, 15));
  return {
    languageId: "typescript",
    uri: new StubUri("file:///app.ts"),
    version: 1,
    getWordRangeAtPosition: vi.fn(() => wordRange),
    getText: vi.fn(() => "title"),
  };
}

describe("TsRenameFeature", () => {
  test("prepares a TypeScript word range without invoking LSP", async () => {
    const harness = createContext();
    TsRenameFeature.activate(harness.ctx);
    const document = createDocument();

    const result = await harness.providers[0]?.prepareRename(document, new StubPosition(2, 11));

    expect(result).toMatchObject({ placeholder: "title" });
    expect(harness.renameFromTs).not.toHaveBeenCalled();
  });

  test("delegates TypeScript rename and merges runtime template edits", async () => {
    const harness = createContext({
      renameResponse: {
        status: "success",
        workspaceEdit: {
          documentChanges: [
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
        message: "1 template edit.",
        templateReferenceCount: 1,
        candidateCount: 0,
      },
    });
    TsRenameFeature.activate(harness.ctx);
    const document = createDocument();
    const token = { isCancellationRequested: false } as never;

    const edit = await harness.providers[0]?.provideRenameEdits(
      document,
      new StubPosition(2, 11),
      "heading",
      token,
    );

    expect(harness.executeCommand).toHaveBeenCalledWith(
      "vscode.executeDocumentRenameProvider",
      document.uri,
      expect.any(StubPosition),
      "heading",
    );
    expect(harness.renameFromTs).toHaveBeenCalledWith(
      "file:///app.ts",
      { line: 2, character: 11 },
      "heading",
      token,
    );
    expect(edit).toBe(harness.tsEdit);
    expect(edit?.replacements).toHaveLength(2);
    expect(edit?.replacements[1]).toMatchObject({
      uri: { value: "file:///app.html" },
      range: {
        start: { line: 0, character: 3 },
        end: { line: 0, character: 8 },
      },
      newText: "heading",
    });
  });

  test("blocks TS-origin rename when template propagation targets a stale open document version", async () => {
    const openTemplate = {
      languageId: "html",
      uri: new StubUri("file:///app.html"),
      version: 8,
      getWordRangeAtPosition: vi.fn(),
      getText: vi.fn(),
    };
    const harness = createContext({
      textDocuments: [openTemplate],
      renameResponse: {
        status: "success",
        workspaceEdit: {
          documentChanges: [
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
        message: "1 template edit.",
        templateReferenceCount: 1,
        candidateCount: 0,
      },
    });
    TsRenameFeature.activate(harness.ctx);
    const document = createDocument();

    await expect(harness.providers[0]?.provideRenameEdits(
      document,
      new StubPosition(2, 11),
      "heading",
    )).rejects.toThrow("editor documents changed");
  });

  test("stops TS-origin composition when the provider request is cancelled", async () => {
    const harness = createContext({
      renameResponse: {
        status: "success",
        workspaceEdit: { documentChanges: [] },
        message: "No current edit.",
        templateReferenceCount: 0,
        candidateCount: 0,
      },
    });
    TsRenameFeature.activate(harness.ctx);
    const document = createDocument();
    const token = { isCancellationRequested: false };
    harness.renameFromTs.mockImplementationOnce(async () => {
      token.isCancellationRequested = true;
      return {
        status: "success",
        workspaceEdit: { documentChanges: [] },
        message: "Cancelled edit.",
        templateReferenceCount: 0,
        candidateCount: 0,
      };
    });

    const edit = await harness.providers[0]?.provideRenameEdits(
      document,
      new StubPosition(2, 11),
      "heading",
      token,
    );

    expect(edit).toBeUndefined();
    expect(harness.renameFromTs).toHaveBeenCalledWith(
      "file:///app.ts",
      { line: 2, character: 11 },
      "heading",
      token,
    );
    expect(harness.convertWorkspaceEdit).not.toHaveBeenCalled();
  });

  test("returns TypeScript-only edits when template propagation is not applicable", async () => {
    const harness = createContext({
      renameResponse: {
        status: "not-applicable",
        reason: "no-template-edits",
        message: "No template edits.",
        templateReferenceCount: 0,
        candidateCount: 0,
      },
    });
    TsRenameFeature.activate(harness.ctx);
    const document = createDocument();

    const edit = await harness.providers[0]?.provideRenameEdits(
      document,
      new StubPosition(2, 11),
      "heading",
    );

    expect(edit).toBe(harness.tsEdit);
    expect(edit?.replacements).toHaveLength(1);
  });

  test("warns when template propagation leaves unverified candidates unchanged", async () => {
    const harness = createContext({
      renameResponse: {
        status: "not-applicable",
        reason: "unverified-candidates-only",
        message: "Only unverified candidates were found.",
        templateReferenceCount: 0,
        candidateCount: 2,
      },
    });
    TsRenameFeature.activate(harness.ctx);
    const document = createDocument();

    await harness.providers[0]?.provideRenameEdits(
      document,
      new StubPosition(2, 11),
      "heading",
    );

    expect(harness.infoMessages).toEqual([
      "Aurelia rename left 2 same-name template usages unchanged because they could not be verified.",
    ]);
  });

  test("blocks the combined rename when template propagation mapping is blocked", async () => {
    const harness = createContext({
      renameResponse: {
        status: "blocked",
        reason: "mapping-failed",
        message: "Aurelia template rename propagation was blocked: stale edit.",
        failures: ["stale edit"],
        templateReferenceCount: 1,
        candidateCount: 0,
      },
    });
    TsRenameFeature.activate(harness.ctx);
    const document = createDocument();

    await expect(harness.providers[0]?.provideRenameEdits(
      document,
      new StubPosition(2, 11),
      "heading",
    )).rejects.toThrow("Aurelia template rename propagation was blocked: stale edit.");
  });
});
