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

type StubDocument = {
  languageId: string;
  uri: StubUri;
  getWordRangeAtPosition(position: StubPosition): StubRange | undefined;
  getText(range: StubRange): string;
};

function createContext(options: { renameResponse?: unknown } = {}) {
  const providers: StubProvider[] = [];
  const tsEdit = new StubWorkspaceEdit();
  tsEdit.replace(
    new StubUri("file:///app.ts"),
    new StubRange(new StubPosition(2, 10), new StubPosition(2, 15)),
    "heading",
  );

  const executeCommand = vi.fn(async () => tsEdit);
  const renameFromTs = vi.fn(async () => options.renameResponse ?? null);
  const registerRenameProvider = vi.fn((_selector: unknown, provider: StubProvider): StubDisposable => {
    providers.push(provider);
    return { dispose: vi.fn() };
  });

  const ctx = {
    vscode: {
      Position: StubPosition,
      Range: StubRange,
      Uri: {
        parse: (value: string) => new StubUri(value),
      },
      WorkspaceEdit: StubWorkspaceEdit,
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
    logger: {
      debug: vi.fn(),
      warn: vi.fn(),
    },
  } as unknown as ClientContext;

  return { ctx, providers, executeCommand, renameFromTs, tsEdit };
}

function createDocument(): StubDocument {
  const wordRange = new StubRange(new StubPosition(2, 10), new StubPosition(2, 15));
  return {
    languageId: "typescript",
    uri: new StubUri("file:///app.ts"),
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
        changes: {
          "file:///app.html": [
            {
              range: {
                start: { line: 0, character: 3 },
                end: { line: 0, character: 8 },
              },
              newText: "heading",
            },
          ],
        },
      },
    });
    TsRenameFeature.activate(harness.ctx);
    const document = createDocument();

    const edit = await harness.providers[0]?.provideRenameEdits(
      document,
      new StubPosition(2, 11),
      "heading",
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
});
