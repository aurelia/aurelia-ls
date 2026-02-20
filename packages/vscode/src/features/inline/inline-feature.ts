import type { SemanticTokens, TextDocument, TextEditor } from "vscode";
import { ContractKeys, hasContract } from "../../core/capabilities.js";
import type { FeatureModule } from "../../core/feature-graph.js";
import { DisposableStore } from "../../core/disposables.js";
import {
  collectInlineGapMarkers,
  hasCompatibleSemanticTokensLegend,
} from "./gap-indicators.js";

type InlineDecorationState = {
  partial: readonly import("vscode").Range[];
  low: readonly import("vscode").Range[];
};

const EMPTY_STATE: InlineDecorationState = {
  partial: [],
  low: [],
};

function toDocumentUri(document: TextDocument): string {
  return document.uri.toString();
}

function applyStateToEditor(
  editor: TextEditor,
  state: InlineDecorationState,
  partialDecoration: import("vscode").TextEditorDecorationType,
  lowDecoration: import("vscode").TextEditorDecorationType,
): void {
  editor.setDecorations(partialDecoration, state.partial);
  editor.setDecorations(lowDecoration, state.low);
}

export const InlineUxFeature: FeatureModule = {
  id: "inline.ux",
  isEnabled: (ctx) => ctx.config.current.features.inline,
  isAvailable: (ctx) => {
    if (!hasContract(ctx.capabilities.current, ContractKeys.semanticTokens, false)) return false;
    return hasCompatibleSemanticTokensLegend(ctx.capabilities.current);
  },
  activate: (ctx) => {
    const store = new DisposableStore();
    const byUri = new Map<string, InlineDecorationState>();

    const partialDecoration = ctx.vscode.window.createTextEditorDecorationType({
      after: {
        contentText: " [Aurelia: partial]",
        color: "#6b7280",
        margin: "0 0 0 0.4em",
      },
    });
    const lowDecoration = ctx.vscode.window.createTextEditorDecorationType({
      after: {
        contentText: " [Aurelia: low]",
        color: "#b45309",
        margin: "0 0 0 0.4em",
      },
    });
    store.add(partialDecoration);
    store.add(lowDecoration);

    const applyToVisibleEditors = (uri: string, state: InlineDecorationState): void => {
      for (const editor of ctx.vscode.window.visibleTextEditors) {
        if (editor.document.uri.toString() !== uri) continue;
        applyStateToEditor(editor, state, partialDecoration, lowDecoration);
      }
    };

    const clearUri = (uri: string): void => applyToVisibleEditors(uri, EMPTY_STATE);

    const consumeSemanticTokens = (document: TextDocument, semanticTokens: SemanticTokens): void => {
      const uri = toDocumentUri(document);
      const markers = collectInlineGapMarkers(Array.from(semanticTokens.data ?? []));
      const partial = markers
        .filter((marker) => marker.level === "partial")
        .map((marker) => new ctx.vscode.Range(
          marker.line,
          marker.character + marker.length,
          marker.line,
          marker.character + marker.length,
        ));
      const low = markers
        .filter((marker) => marker.level === "low")
        .map((marker) => new ctx.vscode.Range(
          marker.line,
          marker.character + marker.length,
          marker.line,
          marker.character + marker.length,
        ));
      const state: InlineDecorationState = { partial, low };
      byUri.set(uri, state);
      applyToVisibleEditors(uri, state);
    };

    store.add(ctx.vscode.window.onDidChangeVisibleTextEditors((editors) => {
      for (const editor of editors) {
        const uri = editor.document.uri.toString();
        const state = byUri.get(uri) ?? EMPTY_STATE;
        applyStateToEditor(editor, state, partialDecoration, lowDecoration);
      }
    }));

    store.add(ctx.vscode.workspace.onDidCloseTextDocument((document) => {
      const uri = toDocumentUri(document);
      byUri.delete(uri);
      clearUri(uri);
    }));

    store.add(ctx.vscode.workspace.onDidChangeTextDocument((event) => {
      const uri = toDocumentUri(event.document);
      if (!byUri.has(uri)) return;
      byUri.delete(uri);
      clearUri(uri);
    }));

    ctx.languageClient.setInlineUxSemanticTokensConsumer(consumeSemanticTokens);
    ctx.languageClient.setInlineUxEnabled(true);
    ctx.logger.debug("inline.feature.init");

    store.add({
      dispose: () => {
        ctx.languageClient.setInlineUxEnabled(false);
        ctx.languageClient.setInlineUxSemanticTokensConsumer(null);
        for (const [uri] of byUri) {
          clearUri(uri);
        }
        byUri.clear();
        ctx.logger.debug("inline.feature.dispose");
      },
    });

    return store;
  },
};
