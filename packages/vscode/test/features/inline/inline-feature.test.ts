import { describe, test, expect, vi } from "vitest";
import type { ClientContext } from "../../../out/core/context.js";
import { InlineUxFeature } from "../../../out/features/inline/inline-feature.js";
import {
  INLINE_EXPECTED_LEGEND_HASH,
  INLINE_GAP_AWARE_MASK,
  INLINE_GAP_CONSERVATIVE_MASK,
} from "../../../out/features/inline/gap-indicators.js";
import { createTestConfig } from "../../helpers/test-helpers.js";

type StubDisposable = { dispose(): void };
type StubUri = { toString(): string };
type StubDocument = { uri: StubUri };
type StubTextEditor = {
  document: StubDocument;
  setDecorations: ReturnType<typeof vi.fn>;
};
type StubDecoration = {
  label: string;
  dispose: ReturnType<typeof vi.fn>;
};

class StubRange {
  readonly startLine: number;
  readonly startCharacter: number;
  readonly endLine: number;
  readonly endCharacter: number;

  constructor(startLine: number, startCharacter: number, endLine: number, endCharacter: number) {
    this.startLine = startLine;
    this.startCharacter = startCharacter;
    this.endLine = endLine;
    this.endCharacter = endCharacter;
  }
}

function createUri(value: string): StubUri {
  return {
    toString: () => value,
  };
}

function createInlineContext(options?: {
  inlineEnabled?: boolean;
  semanticTokensContract?: { legendHash?: string } | false;
}) {
  const inlineEnabled = options?.inlineEnabled ?? true;
  const semanticTokensContract = options?.semanticTokensContract ?? {
    version: "semanticTokens/1",
    legendHash: INLINE_EXPECTED_LEGEND_HASH,
  };
  const editor: StubTextEditor = {
    document: { uri: createUri("file:///app.html") },
    setDecorations: vi.fn(),
  };
  const visibleTextEditors: StubTextEditor[] = [editor];
  const decorations: StubDecoration[] = [];
  const visibleListeners = new Set<(editors: readonly StubTextEditor[]) => void>();
  const closeListeners = new Set<(document: StubDocument) => void>();
  const changeListeners = new Set<(event: { document: StubDocument }) => void>();

  const setInlineUxEnabled = vi.fn();
  const setInlineUxSemanticTokensConsumer = vi.fn();
  const loggerDebug = vi.fn();

  const onDidChangeVisibleTextEditors = (listener: (editors: readonly StubTextEditor[]) => void): StubDisposable => {
    visibleListeners.add(listener);
    return { dispose: () => void visibleListeners.delete(listener) };
  };
  const onDidCloseTextDocument = (listener: (document: StubDocument) => void): StubDisposable => {
    closeListeners.add(listener);
    return { dispose: () => void closeListeners.delete(listener) };
  };
  const onDidChangeTextDocument = (listener: (event: { document: StubDocument }) => void): StubDisposable => {
    changeListeners.add(listener);
    return { dispose: () => void changeListeners.delete(listener) };
  };

  const ctx = {
    config: {
      current: createTestConfig({
        features: {
          inline: inlineEnabled,
        },
      }),
    },
    capabilities: {
      current: {
        contracts: {
          semanticTokens: semanticTokensContract,
        },
      },
    },
    languageClient: {
      setInlineUxEnabled,
      setInlineUxSemanticTokensConsumer,
    },
    logger: {
      debug: loggerDebug,
    },
    vscode: {
      Range: StubRange,
      window: {
        visibleTextEditors,
        createTextEditorDecorationType: (opts: { after?: { contentText?: string } }): StubDecoration => {
          const decoration = {
            label: opts.after?.contentText ?? "",
            dispose: vi.fn(),
          };
          decorations.push(decoration);
          return decoration;
        },
        onDidChangeVisibleTextEditors,
      },
      workspace: {
        onDidCloseTextDocument,
        onDidChangeTextDocument,
      },
    },
  } as unknown as ClientContext;

  return {
    ctx,
    editor,
    decorations,
    fireVisible: (editors: readonly StubTextEditor[]): void => {
      for (const listener of visibleListeners) listener(editors);
    },
    fireClose: (document: StubDocument): void => {
      for (const listener of closeListeners) listener(document);
    },
    fireChange: (event: { document: StubDocument }): void => {
      for (const listener of changeListeners) listener(event);
    },
    spies: {
      setInlineUxEnabled,
      setInlineUxSemanticTokensConsumer,
      loggerDebug,
    },
  };
}

function inlineConsumer(
  spy: ReturnType<typeof vi.fn>,
): ((document: StubDocument, semanticTokens: { data: Uint32Array }) => void) {
  const candidate = spy.mock.calls[0]?.[0];
  if (typeof candidate !== "function") {
    throw new Error("Inline semantic token consumer was not registered");
  }
  return candidate as (document: StubDocument, semanticTokens: { data: Uint32Array }) => void;
}

function readRanges(callArg: unknown): StubRange[] {
  return (Array.isArray(callArg) ? callArg : []) as StubRange[];
}

describe("InlineUxFeature", () => {
  test("isEnabled follows inline feature toggle", () => {
    expect(InlineUxFeature.isEnabled?.(createInlineContext({ inlineEnabled: true }).ctx)).toBe(true);
    expect(InlineUxFeature.isEnabled?.(createInlineContext({ inlineEnabled: false }).ctx)).toBe(false);
  });

  test("isAvailable requires semantic token contract and matching legend hash", () => {
    expect(InlineUxFeature.isAvailable?.(createInlineContext().ctx)).toBe(true);
    expect(InlineUxFeature.isAvailable?.(createInlineContext({ semanticTokensContract: false }).ctx)).toBe(false);
    expect(InlineUxFeature.isAvailable?.(
      createInlineContext({ semanticTokensContract: { legendHash: "mismatch" } }).ctx,
    )).toBe(false);
  });

  test("activation bridges semantic tokens to inline partial/low decorations", () => {
    const harness = createInlineContext();
    const disposable = InlineUxFeature.activate(harness.ctx) as StubDisposable;

    expect(harness.spies.setInlineUxEnabled).toHaveBeenCalledWith(true);
    expect(harness.spies.setInlineUxSemanticTokensConsumer).toHaveBeenCalledTimes(1);
    const consume = inlineConsumer(harness.spies.setInlineUxSemanticTokensConsumer);

    consume(harness.editor.document, {
      data: Uint32Array.from([
        0, 2, 6, 3, INLINE_GAP_AWARE_MASK,
        0, 10, 4, 3, INLINE_GAP_AWARE_MASK | INLINE_GAP_CONSERVATIVE_MASK,
      ]),
    });

    expect(harness.editor.setDecorations).toHaveBeenCalledTimes(2);
    const partialCall = harness.editor.setDecorations.mock.calls[0];
    const lowCall = harness.editor.setDecorations.mock.calls[1];

    expect(partialCall?.[0]).toBe(harness.decorations[0]);
    expect(lowCall?.[0]).toBe(harness.decorations[1]);

    const partialRanges = readRanges(partialCall?.[1]);
    const lowRanges = readRanges(lowCall?.[1]);
    expect(partialRanges).toHaveLength(1);
    expect(lowRanges).toHaveLength(1);
    expect(partialRanges[0]).toMatchObject({
      startLine: 0,
      startCharacter: 8,
      endLine: 0,
      endCharacter: 8,
    });
    expect(lowRanges[0]).toMatchObject({
      startLine: 0,
      startCharacter: 16,
      endLine: 0,
      endCharacter: 16,
    });

    disposable.dispose();
    expect(harness.spies.setInlineUxEnabled).toHaveBeenLastCalledWith(false);
    expect(harness.spies.setInlineUxSemanticTokensConsumer).toHaveBeenLastCalledWith(null);
  });

  test("clears stale inline markers on document edits", () => {
    const harness = createInlineContext();
    const disposable = InlineUxFeature.activate(harness.ctx) as StubDisposable;
    const consume = inlineConsumer(harness.spies.setInlineUxSemanticTokensConsumer);

    consume(harness.editor.document, {
      data: Uint32Array.from([
        0, 1, 5, 3, INLINE_GAP_AWARE_MASK,
      ]),
    });
    expect(harness.editor.setDecorations).toHaveBeenCalledTimes(2);

    harness.fireChange({ document: harness.editor.document });
    expect(harness.editor.setDecorations).toHaveBeenCalledTimes(4);
    const clearPartialCall = harness.editor.setDecorations.mock.calls[2];
    const clearLowCall = harness.editor.setDecorations.mock.calls[3];
    expect(readRanges(clearPartialCall?.[1])).toEqual([]);
    expect(readRanges(clearLowCall?.[1])).toEqual([]);

    disposable.dispose();
  });
});
