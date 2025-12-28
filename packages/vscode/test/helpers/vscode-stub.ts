import path from "node:path";
import type { ExtensionContext, Disposable as VscodeDisposable, Uri as VscodeUri, TextDocumentContentProvider } from "vscode";

// =============================================================================
// Types
// =============================================================================

interface StubUri {
  scheme: string;
  fsPath: string;
  path: string;
  toString(): string;
}

interface StubDocument {
  uri: StubUri;
  languageId: string;
  getText(): string;
  text: string;
}

interface ContentProvider {
  scheme: string;
  provider: TextDocumentContentProvider;
}

interface CreateVscodeApiOptions {
  existingFiles?: boolean;
  activeTextEditor?: unknown;
}

interface StubStatusBarItem {
  alignment: number;
  priority: number;
  text: string;
  command: string | undefined;
  tooltip: string | undefined;
  visible: boolean;
  disposed?: boolean;
  show(): void;
  dispose(): void;
}

interface StubFileWatcher {
  globPattern: string;
  disposed: boolean;
  dispose(): void;
}

interface RecordedActions {
  commandHandlers: Map<string, (...args: unknown[]) => unknown>;
  registeredCommands: string[];
  contentProviders: ContentProvider[];
  openedDocuments: StubDocument[];
  shownDocuments: Array<{ doc: StubDocument; opts?: unknown }>;
  infoMessages: string[];
  errorMessages: string[];
  statusItems: StubStatusBarItem[];
  fileWatchers: StubFileWatcher[];
  outputLogs: string[];
}

export interface StubVscodeApi {
  commands: { registerCommand: (command: string, handler: (...args: unknown[]) => unknown) => VscodeDisposable };
  workspace: {
    fs: { stat: (uri: StubUri) => Promise<{ type: string; uri: StubUri }> };
    registerTextDocumentContentProvider: (scheme: string, provider: TextDocumentContentProvider) => VscodeDisposable;
    openTextDocument: (target: unknown) => Promise<StubDocument>;
    createFileSystemWatcher: (globPattern: string) => StubFileWatcher;
  };
  window: {
    activeTextEditor: unknown;
    showInformationMessage: (message: string) => string;
    showErrorMessage: (message: string) => string;
    showTextDocument: (doc: StubDocument, opts?: unknown) => Promise<{ document: StubDocument }>;
    openTextDocument: (target: unknown) => Promise<StubDocument>;
    createOutputChannel: (name: string) => { name: string; appendLine: (line: string) => void; lines: string[]; dispose: () => void };
    createStatusBarItem: (alignment: number, priority: number) => StubStatusBarItem;
  };
  Uri: {
    file: (fsPath: string) => StubUri;
    parse: (value: string) => StubUri;
    joinPath: (base: StubUri, ...segments: string[]) => StubUri;
  };
  EventEmitter: typeof EventEmitter;
  StatusBarAlignment: { Left: number; Right: number };
  ViewColumn: { Beside: number; One: number };
}

// =============================================================================
// Stub ExtensionContext
// =============================================================================

/**
 * Create a stub ExtensionContext with only the properties the extension uses.
 */
export function stubExtensionContext(vscode: StubVscodeApi, extensionPath = "/ext"): ExtensionContext {
  const extensionUri = vscode.Uri.parse(`file://${extensionPath}`) as unknown as VscodeUri;
  return {
    subscriptions: [],
    extensionUri,
    extensionPath,
    // Stub out other required properties with no-ops
    workspaceState: { get: () => undefined, update: async () => {}, keys: () => [] },
    globalState: { get: () => undefined, update: async () => {}, keys: () => [], setKeysForSync: () => {} },
    secrets: { get: async () => undefined, store: async () => {}, delete: async () => {}, onDidChange: () => ({ dispose: () => {} }) },
    storageUri: extensionUri,
    storagePath: extensionPath,
    globalStorageUri: extensionUri,
    globalStoragePath: extensionPath,
    logUri: extensionUri,
    logPath: extensionPath,
    extensionMode: 1, // Production
    environmentVariableCollection: { persistent: false, description: "", replace: () => {}, append: () => {}, prepend: () => {}, get: () => undefined, forEach: () => {}, delete: () => {}, clear: () => {}, getScoped: () => ({}) },
    asAbsolutePath: (rel: string) => path.join(extensionPath, rel),
    extension: { id: "test.extension", extensionUri, extensionPath, isActive: true, packageJSON: {}, exports: undefined, extensionKind: 1, activate: async () => {} },
    languageModelAccessInformation: { onDidChange: () => ({ dispose: () => {} }), canSendRequest: () => true },
  } as unknown as ExtensionContext;
}

// =============================================================================
// Internal Classes
// =============================================================================

class Disposable implements VscodeDisposable {
  #dispose: (() => void) | undefined;
  disposed = false;

  constructor(dispose?: () => void) {
    this.#dispose = dispose;
  }

  dispose(): void {
    this.disposed = true;
    this.#dispose?.();
  }
}

class EventEmitter<T> {
  #listeners = new Set<(value: T) => void>();

  event = (listener: (value: T) => void): VscodeDisposable => {
    this.#listeners.add(listener);
    return new Disposable(() => this.#listeners.delete(listener));
  };

  fire(value: T): void {
    for (const listener of [...this.#listeners]) {
      try {
        listener(value);
      } catch {
        /* ignore */
      }
    }
  }

  dispose(): void {
    this.#listeners.clear();
  }
}

// =============================================================================
// URI Helpers
// =============================================================================

function hasScheme(raw: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw);
}

function createUri(raw: string | StubUri): StubUri {
  if (typeof raw !== "string") return raw;
  const scheme = hasScheme(raw) ? raw.slice(0, raw.indexOf(":")) : "file";
  const remainder = raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw;
  const fsPath = scheme === "file" ? path.normalize(remainder.replace(/^\/\//, "")) : remainder;
  return {
    scheme,
    fsPath,
    path: fsPath,
    toString() {
      return raw;
    },
  };
}

function isUri(value: unknown): value is StubUri {
  return value !== null && typeof value === "object" && ("fsPath" in value || "scheme" in value);
}

// =============================================================================
// Main API Factory
// =============================================================================

export function createVscodeApi(options: CreateVscodeApiOptions = {}): { vscode: StubVscodeApi; recorded: RecordedActions } {
  const commandHandlers = new Map<string, (...args: unknown[]) => unknown>();
  const registeredCommands: string[] = [];
  const contentProviders: ContentProvider[] = [];
  const openedDocuments: StubDocument[] = [];
  const shownDocuments: Array<{ doc: StubDocument; opts?: unknown }> = [];
  const infoMessages: string[] = [];
  const errorMessages: string[] = [];
  const statusItems: StubStatusBarItem[] = [];
  const fileWatchers: StubFileWatcher[] = [];
  const outputLogs: string[] = [];

  function registerCommand(command: string, handler: (...args: unknown[]) => unknown): Disposable {
    commandHandlers.set(command, handler);
    registeredCommands.push(command);
    return new Disposable(() => commandHandlers.delete(command));
  }

  function createOutputChannel(name: string) {
    const lines: string[] = [];
    return {
      name,
      appendLine: (line: string) => lines.push(line),
      lines,
      dispose: () => lines.splice(0, lines.length),
    };
  }

  function openTextDocument(target: unknown): Promise<StubDocument> {
    const doc = makeDocument(target, contentProviders, openedDocuments.length);
    openedDocuments.push(doc);
    return Promise.resolve(doc);
  }

  const workspace = {
    fs: {
      stat: async (uri: StubUri) => {
        if (options.existingFiles === false) {
          const err = new Error("ENOENT") as Error & { code: string };
          err.code = "ENOENT";
          throw err;
        }
        return { type: "file", uri };
      },
    },
    registerTextDocumentContentProvider: (scheme: string, provider: TextDocumentContentProvider): Disposable => {
      contentProviders.push({ scheme, provider });
      return new Disposable(() => {
        const idx = contentProviders.findIndex((p) => p.scheme === scheme && p.provider === provider);
        if (idx >= 0) contentProviders.splice(idx, 1);
      });
    },
    openTextDocument,
    createFileSystemWatcher: (globPattern: string): StubFileWatcher => {
      const watcher: StubFileWatcher = { globPattern, disposed: false, dispose() { this.disposed = true; } };
      fileWatchers.push(watcher);
      return watcher;
    },
  };

  const window = {
    get activeTextEditor() {
      return options.activeTextEditor ?? null;
    },
    set activeTextEditor(editor: unknown) {
      options.activeTextEditor = editor;
    },
    showInformationMessage: (message: string) => {
      infoMessages.push(message);
      return message;
    },
    showErrorMessage: (message: string) => {
      errorMessages.push(message);
      return message;
    },
    showTextDocument: async (doc: StubDocument, opts?: unknown) => {
      shownDocuments.push({ doc, opts });
      return { document: doc };
    },
    openTextDocument,
    createOutputChannel,
    createStatusBarItem: (alignment: number, priority: number): StubStatusBarItem => {
      const item: StubStatusBarItem = {
        alignment,
        priority,
        text: "",
        command: undefined,
        tooltip: undefined,
        visible: false,
        show() { this.visible = true; },
        dispose() { this.disposed = true; },
      };
      statusItems.push(item);
      return item;
    },
  };

  const Uri = {
    file: (fsPath: string) => createUri(`file://${fsPath}`),
    parse: (value: string) => createUri(value),
    joinPath: (base: StubUri, ...segments: string[]) => createUri(`file://${path.join(base.fsPath ?? "", ...segments)}`),
  };

  const vscode: StubVscodeApi = {
    commands: { registerCommand },
    workspace,
    window,
    Uri,
    EventEmitter,
    StatusBarAlignment: { Left: 1, Right: 2 },
    ViewColumn: { Beside: 2, One: 1 },
  };

  return {
    vscode,
    recorded: {
      commandHandlers,
      registeredCommands,
      contentProviders,
      openedDocuments,
      shownDocuments,
      infoMessages,
      errorMessages,
      statusItems,
      fileWatchers,
      outputLogs,
    },
  };
}

// =============================================================================
// Document Factory
// =============================================================================

interface DocumentTarget {
  uri?: string | StubUri;
  content?: string;
  language?: string;
  languageId?: string;
}

function makeDocument(target: unknown, providers: ContentProvider[], docId: number): StubDocument {
  const asUri = (input: string | StubUri): StubUri => (typeof input === "string" ? createUri(input) : input);

  if (isUri(target)) {
    const uri = asUri(target);
    const provider = providers.find((p) => p.scheme === uri.scheme);
    const provided = provider?.provider?.provideTextDocumentContent?.(uri as unknown as VscodeUri, { isCancellationRequested: false, onCancellationRequested: () => ({ dispose: () => {} }) });
    const text = typeof provided === "string" ? provided : "";
    return { uri, languageId: uri.scheme, getText: () => text, text };
  }

  if (target && typeof target === "object") {
    const t = target as DocumentTarget;
    const uri = t.uri ? asUri(t.uri) : createUri(`untitled:${docId}`);
    const text = typeof t.content === "string" ? t.content : "";
    return {
      uri,
      languageId: t.language ?? t.languageId ?? "plaintext",
      getText: () => text,
      text,
    };
  }

  const uri = createUri(`untitled:${docId}`);
  return { uri, languageId: "plaintext", getText: () => "", text: "" };
}
