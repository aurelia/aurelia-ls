import path from "node:path";
import type { Disposable, ExtensionContext, TextDocumentContentProvider, Uri } from "vscode";

// =============================================================================
// Types
// =============================================================================

interface StubUri {
  scheme: string;
  authority: string;
  fsPath: string;
  path: string;
  query: string;
  fragment: string;
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
  informationMessageResponses?: Array<string | undefined>;
  errorMessageResponses?: Array<string | undefined>;
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
  onDidCreate(listener: (uri: StubUri) => void): Disposable;
  onDidChange(listener: (uri: StubUri) => void): Disposable;
  onDidDelete(listener: (uri: StubUri) => void): Disposable;
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
  triggerButton(index: number): void;
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
  infoMessageRequests: Array<{ message: string; items: readonly string[] }>;
  errorMessages: string[];
  errorMessageRequests: Array<{ message: string; items: readonly string[] }>;
  statusItems: StubStatusBarItem[];
  fileWatchers: StubFileWatcher[];
  outputLogs: string[];
  shownOutputChannels: Array<{ name: string; preserveFocus: boolean | undefined }>;
  quickPicks: StubQuickPick[];
  contextValues: Map<string, unknown>;
  languageChanges: Array<{ document: StubDocument; languageId: string }>;
  fireWorkspaceFoldersChanged(): void;
  fireConfigurationChanged(section?: string, resource?: string): void;
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
    registerCommand: (command: string, handler: (...args: unknown[]) => unknown) => Disposable;
    executeCommand: (command: string, ...args: unknown[]) => Promise<unknown>;
  };
  workspace: {
    workspaceFolders: Array<{ name: string; index: number; uri: StubUri }> | undefined;
    textDocuments: StubDocument[];
    fs: {
      stat: (uri: StubUri) => Promise<{ type: number; uri: StubUri }>;
      readFile: (uri: StubUri) => Promise<Uint8Array>;
    };
    findFiles: (include: unknown, exclude?: unknown, maxResults?: number) => Promise<StubUri[]>;
    getConfiguration: (section: string, uri?: StubUri) => { get<T>(key: string, defaultValue: T): T };
    onDidChangeWorkspaceFolders: (listener: () => void) => Disposable;
    onDidChangeConfiguration: (listener: (event: {
      affectsConfiguration: (section: string, resource?: StubUri | null) => boolean;
    }) => void) => Disposable;
    onDidOpenTextDocument: (listener: (document: StubDocument) => void) => Disposable;
    onDidChangeTextDocument: (listener: (event: { document: StubDocument }) => void) => Disposable;
    onDidSaveTextDocument: (listener: (document: StubDocument) => void) => Disposable;
    onDidCloseTextDocument: (listener: (document: StubDocument) => void) => Disposable;
    registerTextDocumentContentProvider: (scheme: string, provider: TextDocumentContentProvider) => Disposable;
    openTextDocument: (target: unknown) => Promise<StubDocument>;
    createFileSystemWatcher: (globPattern: unknown) => StubFileWatcher;
  };
  window: {
    activeTextEditor: unknown;
    showInformationMessage: (message: string, ...items: string[]) => Promise<string | undefined>;
    showErrorMessage: (message: string, ...items: string[]) => Promise<string | undefined>;
    showTextDocument: (doc: StubDocument, opts?: unknown) => Promise<{ document: StubDocument }>;
    openTextDocument: (target: unknown) => Promise<StubDocument>;
    createOutputChannel: (name: string, options?: { log: true }) => StubOutputChannel;
    createStatusBarItem: (alignment: number, priority: number) => StubStatusBarItem;
    createQuickPick: () => StubQuickPick;
    onDidChangeActiveTextEditor: (listener: (editor: unknown) => void) => Disposable;
  };
  Uri: {
    file: (fsPath: string) => StubUri;
    parse: (value: string) => StubUri;
    joinPath: (base: StubUri, ...segments: string[]) => StubUri;
  };
  languages: {
    setTextDocumentLanguage: (document: StubDocument, languageId: string) => Promise<StubDocument>;
  };
  RelativePattern: new (base: unknown, pattern: string) => { base: unknown; baseUri: StubUri; pattern: string };
  EventEmitter: typeof EventEmitter;
  Disposable: typeof StubDisposable;
  CancellationTokenSource: typeof CancellationTokenSource;
  Position: typeof Position;
  Range: typeof Range;
  ThemeColor: typeof ThemeColor;
  ThemeIcon: typeof ThemeIcon;
  QuickInputButtons: { Back: object };
  QuickPickItemKind: { Separator: number; Default: number };
  TreeItemCollapsibleState: { None: number; Collapsed: number; Expanded: number };
  StatusBarAlignment: { Left: number; Right: number };
  ViewColumn: { Beside: number; One: number };
  FileType: { Unknown: number; File: number; Directory: number; SymbolicLink: number };
}

// =============================================================================
// Stub ExtensionContext
// =============================================================================

/**
 * Create a stub ExtensionContext with only the properties the extension uses.
 */
export function stubExtensionContext(vscode: StubVscodeApi, extensionPath = "/ext"): ExtensionContext {
  const extensionUri = vscode.Uri.parse(`file://${extensionPath}`) as unknown as Uri;
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

class StubDisposable implements Disposable {
  #dispose: (() => void) | undefined;
  disposed = false;

  constructor(dispose?: () => void) {
    this.#dispose = dispose;
  }

  static from(...disposables: readonly Disposable[]): StubDisposable {
    return new StubDisposable(() => {
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

  event = (listener: (value: T) => void): Disposable => {
    this.#listeners.add(listener);
    return new StubDisposable(() => this.#listeners.delete(listener));
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
    readonly onCancellationRequested: (listener: () => void) => Disposable;
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

class ThemeColor {
  constructor(readonly id: string) {}
}

class ThemeIcon {
  constructor(readonly id: string, readonly color?: ThemeColor) {}
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
  #active = new EventEmitter<readonly unknown[]>();
  #hide = new EventEmitter<void>();
  #button = new EventEmitter<unknown>();

  onDidAccept(listener: () => void): Disposable {
    return this.#accept.event(listener);
  }

  onDidChangeActive(listener: (items: readonly unknown[]) => void): Disposable {
    return this.#active.event(listener);
  }

  onDidHide(listener: () => void): Disposable {
    return this.#hide.event(listener);
  }

  onDidTriggerButton(listener: (button: unknown) => void): Disposable {
    return this.#button.event(listener);
  }

  show(): void {
    this.visible = true;
  }

  accept(index: number): void {
    const selected = this.items[index];
    this.selectedItems = selected == null ? [] : [selected];
    this.#active.fire(this.selectedItems);
    this.#accept.fire();
  }

  back(): void {
    this.#button.fire(QuickInputButtons.Back);
  }

  triggerButton(index: number): void {
    const button = this.buttons[index];
    if (button != null) this.#button.fire(button);
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.#hide.fire();
  }

  dispose(): void {
    this.visible = false;
    this.#accept.dispose();
    this.#active.dispose();
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

  onDidCreate(listener: (uri: StubUri) => void): Disposable {
    return this.#create.event(listener);
  }

  onDidChange(listener: (uri: StubUri) => void): Disposable {
    return this.#change.event(listener);
  }

  onDidDelete(listener: (uri: StubUri) => void): Disposable {
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
  const withoutPrefix = decodeUriPath(remainder.replace(/^\/\//, ""));
  const fsPath = scheme === "file" ? path.normalize(withoutPrefix) : withoutPrefix;
  const uriPath = `/${fsPath.replaceAll("\\", "/").replace(/^\/+/, "")}`;
  return {
    scheme,
    authority: "",
    fsPath,
    path: uriPath,
    query: "",
    fragment: "",
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

function decodeUriPath(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
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
  const infoMessageRequests: Array<{ message: string; items: readonly string[] }> = [];
  const errorMessages: string[] = [];
  const errorMessageRequests: Array<{ message: string; items: readonly string[] }> = [];
  const statusItems: StubStatusBarItem[] = [];
  const fileWatchers: StubFileWatcher[] = [];
  const outputLogs: string[] = [];
  const shownOutputChannels: Array<{ name: string; preserveFocus: boolean | undefined }> = [];
  const quickPicks: StubQuickPick[] = [];
  const contextValues = new Map<string, unknown>();
  const languageChanges: Array<{ document: StubDocument; languageId: string }> = [];
  const workspaceFoldersChanged = new EventEmitter<void>();
  const configurationChanged = new EventEmitter<{
    affectsConfiguration: (section: string, resource?: StubUri | null) => boolean;
  }>();
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
  const explicitlyMissingFiles = new Set<string>();

  function registerCommand(command: string, handler: (...args: unknown[]) => unknown): Disposable {
    commandHandlers.set(command, handler);
    registeredCommands.push(command);
    return new StubDisposable(() => commandHandlers.delete(command));
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
      show: (preserveFocus?: boolean) => {
        shownOutputChannels.push({ name, preserveFocus });
      },
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
        const filePath = path.normalize(uri.fsPath);
        if (options.existingFiles === false || explicitlyMissingFiles.has(filePath)) {
          const err = new Error("ENOENT") as Error & { code: string };
          err.code = "ENOENT";
          throw err;
        }
        const isDirectory = !files.has(filePath) && (
          workspaceFolders?.some((folder) => path.normalize(folder.uri.fsPath) === filePath) === true
          || [...files.keys()].some((candidate) => pathIsWithin(candidate, filePath) && candidate !== filePath)
        );
        return { type: isDirectory ? 2 : 1, uri };
      },
      readFile: async (uri: StubUri) => {
        const text = files.get(path.normalize(uri.fsPath));
        if (text == null) {
          throw new Error(`ENOENT: ${uri.fsPath}`);
        }
        return new TextEncoder().encode(text);
      },
    },
    findFiles: async (include: unknown, _exclude?: unknown, maxResults?: number) => {
      const pattern = include as { baseUri?: StubUri; base?: { uri?: StubUri }; pattern?: string };
      const base = pattern.baseUri ?? pattern.base?.uri ?? null;
      const expectedBaseName = pattern.pattern?.startsWith("**/")
        ? pattern.pattern.slice(3)
        : null;
      const matches = [...files.keys()]
        .filter((file) => base == null || pathIsWithin(file, base.fsPath))
        .filter((file) => expectedBaseName == null || path.basename(file) === expectedBaseName)
        .map((file) => createUri(`file://${file}`));
      return maxResults == null ? matches : matches.slice(0, maxResults);
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
      listener: (event: {
        affectsConfiguration: (section: string, resource?: StubUri | null) => boolean;
      }) => void,
    ) => configurationChanged.event(listener),
    onDidOpenTextDocument: (listener: (document: StubDocument) => void) => documentOpened.event(listener),
    onDidChangeTextDocument: (listener: (event: { document: StubDocument }) => void) => documentChanged.event(listener),
    onDidSaveTextDocument: (listener: (document: StubDocument) => void) => documentSaved.event(listener),
    onDidCloseTextDocument: (listener: (document: StubDocument) => void) => documentClosed.event(listener),
    registerTextDocumentContentProvider: (scheme: string, provider: TextDocumentContentProvider): Disposable => {
      contentProviders.push({ scheme, provider });
      return new StubDisposable(() => {
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
    showInformationMessage: (message: string, ...items: string[]) => {
      infoMessages.push(message);
      infoMessageRequests.push({ message, items });
      return Promise.resolve(options.informationMessageResponses?.shift());
    },
    showErrorMessage: (message: string, ...items: string[]) => {
      errorMessages.push(message);
      errorMessageRequests.push({ message, items });
      return Promise.resolve(options.errorMessageResponses?.shift());
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

  async function setTextDocumentLanguage(document: StubDocument, languageId: string): Promise<StubDocument> {
    if (document.languageId === languageId) return document;
    const documentIndex = textDocuments.indexOf(document);
    if (documentIndex < 0) {
      throw new Error(`Cannot change the language of a closed document: ${document.uri.toString()}`);
    }
    textDocuments.splice(documentIndex, 1);
    documentClosed.fire(document);
    const replacement: StubDocument = {
      uri: document.uri,
      languageId,
      text: document.text,
      getText: () => replacement.text,
    };
    textDocuments.splice(documentIndex, 0, replacement);
    const activeEditor = options.activeTextEditor as { readonly document?: StubDocument } | undefined;
    if (activeEditor?.document === document) {
      options.activeTextEditor = { ...activeEditor, document: replacement };
    }
    languageChanges.push({ document: replacement, languageId });
    documentOpened.fire(replacement);
    return replacement;
  }

  const vscode: StubVscodeApi = {
    commands: { registerCommand, executeCommand },
    workspace,
    window,
    languages: { setTextDocumentLanguage },
    Uri,
    RelativePattern,
    EventEmitter,
    Disposable: StubDisposable,
    CancellationTokenSource,
    Position,
    Range,
    ThemeColor,
    ThemeIcon,
    QuickInputButtons,
    QuickPickItemKind: { Separator: -1, Default: 0 },
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    StatusBarAlignment: { Left: 1, Right: 2 },
    ViewColumn: { Beside: 2, One: 1 },
    FileType: { Unknown: 0, File: 1, Directory: 2, SymbolicLink: 64 },
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
      infoMessageRequests,
      errorMessages,
      errorMessageRequests,
      statusItems,
      fileWatchers,
      outputLogs,
      shownOutputChannels,
      quickPicks,
      contextValues,
      languageChanges,
      fireWorkspaceFoldersChanged: () => workspaceFoldersChanged.fire(),
      fireConfigurationChanged: (section = "aurelia", resource) => configurationChanged.fire({
        affectsConfiguration: (candidate, scope) => {
          if (candidate !== section && !candidate.startsWith(`${section}.`)) return false;
          if (resource == null || scope == null) return true;
          return pathIsWithin(scope.fsPath, createUri(resource).fsPath);
        },
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
      setFile: (uri, value) => {
        const filePath = path.normalize(createUri(uri).fsPath);
        explicitlyMissingFiles.delete(filePath);
        files.set(filePath, value);
      },
      deleteFile: (uri) => {
        const filePath = path.normalize(createUri(uri).fsPath);
        files.delete(filePath);
        explicitlyMissingFiles.add(filePath);
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
    const provided = provider?.provider?.provideTextDocumentContent?.(uri as unknown as Uri, { isCancellationRequested: false, onCancellationRequested: () => ({ dispose: () => {} }) });
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
