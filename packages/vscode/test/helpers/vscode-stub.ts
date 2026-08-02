import path from "node:path";
import type { ExtensionContext, Disposable as VscodeDisposable, Uri as VscodeUri, TextDocumentContentProvider } from "vscode";

// =============================================================================
// Types
// =============================================================================

interface StubUri {
  scheme: string;
  authority: string;
  fsPath: string;
  path: string;
  toString(): string;
  with(change: { scheme?: string; authority?: string; path?: string }): StubUri;
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
  files?: Record<string, string>;
  workspaceFolders?: Array<{ name: string; uri: string }>;
  configuration?: Record<string, unknown>;
  workspaceConfiguration?: Record<string, Record<string, unknown>>;
  openDocuments?: Array<{ uri: string; languageId: string; text: string }>;
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
  hide(): void;
  dispose(): void;
}

interface StubFileWatcher {
  globPattern: unknown;
  disposed: boolean;
  onDidCreate(listener: (uri: StubUri) => void): VscodeDisposable;
  onDidChange(listener: (uri: StubUri) => void): VscodeDisposable;
  onDidDelete(listener: (uri: StubUri) => void): VscodeDisposable;
  fireCreate(uri: StubUri): void;
  fireChange(uri: StubUri): void;
  fireDelete(uri: StubUri): void;
  dispose(): void;
}

interface StubOutputChannel {
  readonly name: string;
  readonly lines: string[];
  readonly entries: Array<{
    level: "trace" | "debug" | "info" | "warn" | "error";
    message: string;
    args: readonly unknown[];
  }>;
  appendLine(line: string): void;
  trace(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string | Error, ...args: unknown[]): void;
  show(preserveFocus?: boolean): void;
  dispose(): void;
}

export interface StubQuickPick {
  title: string;
  placeholder: string;
  busy: boolean;
  visible: boolean;
  items: readonly unknown[];
  selectedItems: readonly unknown[];
  buttons: readonly unknown[];
  matchOnDescription: boolean;
  matchOnDetail: boolean;
  step: number | undefined;
  totalSteps: number | undefined;
  accept(index: number): void;
  back(): void;
  hide(): void;
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
  quickPicks: StubQuickPick[];
  contextValues: Map<string, unknown>;
  fireWorkspaceFoldersChanged(): void;
  fireConfigurationChanged(section?: string): void;
  fireActiveTextEditorChanged(editor: unknown): void;
  fireDocumentOpened(document: StubDocument): void;
  fireDocumentChanged(document: StubDocument): void;
  fireDocumentSaved(document: StubDocument): void;
  fireDocumentClosed(document: StubDocument): void;
  setFile(uri: string, text: string): void;
  deleteFile(uri: string): void;
}

export interface StubVscodeApi {
  commands: {
    registerCommand: (command: string, handler: (...args: unknown[]) => unknown) => VscodeDisposable;
    executeCommand: (command: string, ...args: unknown[]) => Promise<unknown>;
  };
  workspace: {
    workspaceFolders: Array<{ name: string; index: number; uri: StubUri }> | undefined;
    textDocuments: StubDocument[];
    fs: {
      stat: (uri: StubUri) => Promise<{ type: string; uri: StubUri }>;
      readFile: (uri: StubUri) => Promise<Uint8Array>;
    };
    findFiles: (include: unknown, exclude?: unknown) => Promise<StubUri[]>;
    getConfiguration: (section: string, uri?: StubUri) => { get<T>(key: string, defaultValue: T): T };
    onDidChangeWorkspaceFolders: (listener: () => void) => VscodeDisposable;
    onDidChangeConfiguration: (listener: (event: { affectsConfiguration: (section: string) => boolean }) => void) => VscodeDisposable;
    onDidOpenTextDocument: (listener: (document: StubDocument) => void) => VscodeDisposable;
    onDidChangeTextDocument: (listener: (event: { document: StubDocument }) => void) => VscodeDisposable;
    onDidSaveTextDocument: (listener: (document: StubDocument) => void) => VscodeDisposable;
    onDidCloseTextDocument: (listener: (document: StubDocument) => void) => VscodeDisposable;
    registerTextDocumentContentProvider: (scheme: string, provider: TextDocumentContentProvider) => VscodeDisposable;
    openTextDocument: (target: unknown) => Promise<StubDocument>;
    createFileSystemWatcher: (globPattern: unknown) => StubFileWatcher;
  };
  window: {
    activeTextEditor: unknown;
    showInformationMessage: (message: string) => string;
    showErrorMessage: (message: string) => string;
    showTextDocument: (doc: StubDocument, opts?: unknown) => Promise<{ document: StubDocument }>;
    openTextDocument: (target: unknown) => Promise<StubDocument>;
    createOutputChannel: (name: string, options?: { log: true }) => StubOutputChannel;
    createStatusBarItem: (alignment: number, priority: number) => StubStatusBarItem;
    createQuickPick: () => StubQuickPick;
    onDidChangeActiveTextEditor: (listener: (editor: unknown) => void) => VscodeDisposable;
  };
  Uri: {
    file: (fsPath: string) => StubUri;
    parse: (value: string) => StubUri;
    joinPath: (base: StubUri, ...segments: string[]) => StubUri;
  };
  RelativePattern: new (base: unknown, pattern: string) => { base: unknown; baseUri: StubUri; pattern: string };
  EventEmitter: typeof EventEmitter;
  Disposable: typeof Disposable;
  CancellationTokenSource: typeof CancellationTokenSource;
  Position: typeof Position;
  Range: typeof Range;
  ThemeIcon: typeof ThemeIcon;
  QuickInputButtons: { Back: object };
  TreeItemCollapsibleState: { None: number; Collapsed: number; Expanded: number };
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

  static from(...disposables: readonly VscodeDisposable[]): Disposable {
    return new Disposable(() => {
      for (const disposable of disposables) disposable.dispose();
    });
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

class CancellationTokenSource {
  readonly #cancelled = new EventEmitter<void>();
  #isCancellationRequested = false;
  readonly token: {
    readonly isCancellationRequested: boolean;
    readonly onCancellationRequested: (listener: () => void) => VscodeDisposable;
  };

  constructor() {
    const source = this;
    this.token = {
      get isCancellationRequested() {
        return source.#isCancellationRequested;
      },
      onCancellationRequested: (listener) => this.#cancelled.event(listener),
    };
  }

  cancel(): void {
    if (this.#isCancellationRequested) return;
    this.#isCancellationRequested = true;
    this.#cancelled.fire();
  }

  dispose(): void {
    this.#cancelled.dispose();
  }
}

class Position {
  constructor(readonly line: number, readonly character: number) {}
}

class Range {
  constructor(readonly start: Position, readonly end: Position) {}
}

class ThemeIcon {
  constructor(readonly id: string) {}
}

class QuickPick implements StubQuickPick {
  title = "";
  placeholder = "";
  busy = false;
  visible = false;
  items: readonly unknown[] = [];
  selectedItems: readonly unknown[] = [];
  buttons: readonly unknown[] = [];
  matchOnDescription = false;
  matchOnDetail = false;
  step: number | undefined;
  totalSteps: number | undefined;
  #accept = new EventEmitter<void>();
  #hide = new EventEmitter<void>();
  #button = new EventEmitter<unknown>();

  onDidAccept(listener: () => void): VscodeDisposable {
    return this.#accept.event(listener);
  }

  onDidHide(listener: () => void): VscodeDisposable {
    return this.#hide.event(listener);
  }

  onDidTriggerButton(listener: (button: unknown) => void): VscodeDisposable {
    return this.#button.event(listener);
  }

  show(): void {
    this.visible = true;
  }

  accept(index: number): void {
    const selected = this.items[index];
    this.selectedItems = selected == null ? [] : [selected];
    this.#accept.fire();
  }

  back(): void {
    this.#button.fire(QuickInputButtons.Back);
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.#hide.fire();
  }

  dispose(): void {
    this.visible = false;
    this.#accept.dispose();
    this.#hide.dispose();
    this.#button.dispose();
  }
}

const QuickInputButtons = { Back: {} } as const;

class RelativePattern {
  readonly baseUri: StubUri;

  constructor(readonly base: unknown, readonly pattern: string) {
    const candidate = base as { uri?: StubUri; fsPath?: string };
    this.baseUri = candidate.uri ?? createUri(`file://${candidate.fsPath ?? ""}`);
  }

}

class FileWatcher implements StubFileWatcher {
  disposed = false;
  #create = new EventEmitter<StubUri>();
  #change = new EventEmitter<StubUri>();
  #delete = new EventEmitter<StubUri>();

  constructor(readonly globPattern: unknown) {}

  onDidCreate(listener: (uri: StubUri) => void): VscodeDisposable {
    return this.#create.event(listener);
  }

  onDidChange(listener: (uri: StubUri) => void): VscodeDisposable {
    return this.#change.event(listener);
  }

  onDidDelete(listener: (uri: StubUri) => void): VscodeDisposable {
    return this.#delete.event(listener);
  }

  fireCreate(uri: StubUri): void {
    this.#create.fire(uri);
  }

  fireChange(uri: StubUri): void {
    this.#change.fire(uri);
  }

  fireDelete(uri: StubUri): void {
    this.#delete.fire(uri);
  }

  dispose(): void {
    this.disposed = true;
    this.#create.dispose();
    this.#change.dispose();
    this.#delete.dispose();
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
  const withoutPrefix = remainder.replace(/^\/\//, "");
  const fsPath = scheme === "file" ? path.normalize(withoutPrefix) : withoutPrefix;
  const uriPath = `/${fsPath.replaceAll("\\", "/").replace(/^\/+/, "")}`;
  return {
    scheme,
    authority: "",
    fsPath,
    path: uriPath,
    toString() {
      return raw;
    },
    with(change) {
      const nextScheme = change.scheme ?? scheme;
      const nextAuthority = change.authority ?? "";
      const nextPath = change.path ?? uriPath;
      return createUri(`${nextScheme}://${nextAuthority}${nextPath}`);
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
  const quickPicks: StubQuickPick[] = [];
  const contextValues = new Map<string, unknown>();
  const workspaceFoldersChanged = new EventEmitter<void>();
  const configurationChanged = new EventEmitter<{ affectsConfiguration: (section: string) => boolean }>();
  const documentOpened = new EventEmitter<StubDocument>();
  const documentChanged = new EventEmitter<{ document: StubDocument }>();
  const documentSaved = new EventEmitter<StubDocument>();
  const documentClosed = new EventEmitter<StubDocument>();
  const activeTextEditorChanged = new EventEmitter<unknown>();
  const workspaceFolders = options.workspaceFolders?.map((folder, index) => ({
    name: folder.name,
    index,
    uri: createUri(folder.uri),
  }));
  const textDocuments = (options.openDocuments ?? []).map((document) => {
    const result: StubDocument = {
      uri: createUri(document.uri),
      languageId: document.languageId,
      text: document.text,
      getText: () => result.text,
    };
    return result;
  });
  const files = new Map(Object.entries(options.files ?? {}).map(([file, text]) => [
    path.normalize(createUri(file).fsPath),
    text,
  ]));

  function registerCommand(command: string, handler: (...args: unknown[]) => unknown): Disposable {
    commandHandlers.set(command, handler);
    registeredCommands.push(command);
    return new Disposable(() => commandHandlers.delete(command));
  }

  async function executeCommand(command: string, ...args: unknown[]): Promise<unknown> {
    if (command === "setContext") {
      contextValues.set(String(args[0]), args[1]);
      return undefined;
    }
    return commandHandlers.get(command)?.(...args);
  }

  function createOutputChannel(name: string, _options?: { log: true }): StubOutputChannel {
    const lines: string[] = [];
    const entries: StubOutputChannel["entries"] = [];
    const write = (level: StubOutputChannel["entries"][number]["level"], message: string, args: readonly unknown[]) => {
      entries.push({ level, message, args });
      lines.push(`[${level.toUpperCase()}] ${message}`);
      outputLogs.push(`[${level.toUpperCase()}] ${message}`);
    };
    return {
      name,
      appendLine: (line: string) => lines.push(line),
      lines,
      entries,
      trace: (message: string, ...args: unknown[]) => write("trace", message, args),
      debug: (message: string, ...args: unknown[]) => write("debug", message, args),
      info: (message: string, ...args: unknown[]) => write("info", message, args),
      warn: (message: string, ...args: unknown[]) => write("warn", message, args),
      error: (message: string | Error, ...args: unknown[]) => write("error", String(message), args),
      show: () => {},
      dispose: () => {
        lines.splice(0, lines.length);
        entries.splice(0, entries.length);
      },
    };
  }

  function openTextDocument(target: unknown): Promise<StubDocument> {
    const doc = makeDocument(target, contentProviders, openedDocuments.length);
    openedDocuments.push(doc);
    textDocuments.push(doc);
    return Promise.resolve(doc);
  }

  const workspace = {
    workspaceFolders,
    textDocuments,
    fs: {
      stat: async (uri: StubUri) => {
        if (options.existingFiles === false) {
          const err = new Error("ENOENT") as Error & { code: string };
          err.code = "ENOENT";
          throw err;
        }
        return { type: "file", uri };
      },
      readFile: async (uri: StubUri) => {
        const text = files.get(path.normalize(uri.fsPath));
        if (text == null) {
          throw new Error(`ENOENT: ${uri.fsPath}`);
        }
        return new TextEncoder().encode(text);
      },
    },
    findFiles: async (include: unknown) => {
      const pattern = include as { baseUri?: StubUri; base?: { uri?: StubUri }; pattern?: string };
      const base = pattern.baseUri ?? pattern.base?.uri ?? null;
      return [...files.keys()]
        .filter((file) => base == null || pathIsWithin(file, base.fsPath))
        .filter((file) => pattern.pattern !== "**/package.json" || path.basename(file) === "package.json")
        .map((file) => createUri(`file://${file}`));
    },
    getConfiguration: (section: string, uri?: StubUri) => ({
      get<T>(key: string, defaultValue: T): T {
        const workspaceEntry = uri == null
          ? undefined
          : Object.entries(options.workspaceConfiguration ?? {})
            .filter(([root]) => pathIsWithin(uri.fsPath, createUri(root).fsPath))
            .sort((left, right) => right[0].length - left[0].length)[0]?.[1];
        const fullKey = `${section}.${key}`;
        const value = workspaceEntry?.[fullKey]
          ?? workspaceEntry?.[key]
          ?? options.configuration?.[fullKey]
          ?? options.configuration?.[key];
        return (value === undefined ? defaultValue : value) as T;
      },
    }),
    onDidChangeWorkspaceFolders: (listener: () => void) => workspaceFoldersChanged.event(listener),
    onDidChangeConfiguration: (
      listener: (event: { affectsConfiguration: (section: string) => boolean }) => void,
    ) => configurationChanged.event(listener),
    onDidOpenTextDocument: (listener: (document: StubDocument) => void) => documentOpened.event(listener),
    onDidChangeTextDocument: (listener: (event: { document: StubDocument }) => void) => documentChanged.event(listener),
    onDidSaveTextDocument: (listener: (document: StubDocument) => void) => documentSaved.event(listener),
    onDidCloseTextDocument: (listener: (document: StubDocument) => void) => documentClosed.event(listener),
    registerTextDocumentContentProvider: (scheme: string, provider: TextDocumentContentProvider): Disposable => {
      contentProviders.push({ scheme, provider });
      return new Disposable(() => {
        const idx = contentProviders.findIndex((p) => p.scheme === scheme && p.provider === provider);
        if (idx >= 0) contentProviders.splice(idx, 1);
      });
    },
    openTextDocument,
    createFileSystemWatcher: (globPattern: unknown): StubFileWatcher => {
      const watcher = new FileWatcher(globPattern);
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
        hide() { this.visible = false; },
        dispose() { this.disposed = true; },
      };
      statusItems.push(item);
      return item;
    },
    createQuickPick: () => {
      const picker = new QuickPick();
      quickPicks.push(picker);
      return picker;
    },
    onDidChangeActiveTextEditor: (listener: (editor: unknown) => void) => activeTextEditorChanged.event(listener),
  };

  const Uri = {
    file: (fsPath: string) => createUri(`file://${fsPath}`),
    parse: (value: string) => createUri(value),
    joinPath: (base: StubUri, ...segments: string[]) => createUri(`file://${path.join(base.fsPath ?? "", ...segments)}`),
  };

  const vscode: StubVscodeApi = {
    commands: { registerCommand, executeCommand },
    workspace,
    window,
    Uri,
    RelativePattern,
    EventEmitter,
    Disposable,
    CancellationTokenSource,
    Position,
    Range,
    ThemeIcon,
    QuickInputButtons,
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
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
      quickPicks,
      contextValues,
      fireWorkspaceFoldersChanged: () => workspaceFoldersChanged.fire(),
      fireConfigurationChanged: (section = "aurelia") => configurationChanged.fire({
        affectsConfiguration: (candidate) => candidate === section || candidate.startsWith(`${section}.`),
      }),
      fireActiveTextEditorChanged: (editor) => {
        options.activeTextEditor = editor;
        activeTextEditorChanged.fire(editor);
      },
      fireDocumentOpened: (document) => {
        if (!textDocuments.includes(document)) textDocuments.push(document);
        documentOpened.fire(document);
      },
      fireDocumentChanged: (document) => documentChanged.fire({ document }),
      fireDocumentSaved: (document) => documentSaved.fire(document),
      fireDocumentClosed: (document) => {
        const index = textDocuments.indexOf(document);
        if (index >= 0) textDocuments.splice(index, 1);
        documentClosed.fire(document);
      },
      setFile: (uri, value) => files.set(path.normalize(createUri(uri).fsPath), value),
      deleteFile: (uri) => {
        files.delete(path.normalize(createUri(uri).fsPath));
      },
    },
  };
}

function pathIsWithin(candidate: string, root: string): boolean {
  const relative = path.relative(path.normalize(root), path.normalize(candidate));
  return relative === ""
    || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
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
