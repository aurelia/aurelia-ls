import path from "node:path";

class Disposable {
  #dispose;
  disposed = false;

  constructor(dispose) {
    this.#dispose = dispose;
  }

  dispose() {
    this.disposed = true;
    this.#dispose?.();
  }
}

class EventEmitter {
  #listeners = new Set();

  event = (listener) => {
    this.#listeners.add(listener);
    return new Disposable(() => this.#listeners.delete(listener));
  };

  fire(value) {
    for (const listener of [...this.#listeners]) {
      try {
        listener(value);
      } catch {
        /* ignore */
      }
    }
  }

  dispose() {
    this.#listeners.clear();
  }
}

function hasScheme(raw) {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw);
}

function createUri(raw) {
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

function isUri(value) {
  return value && typeof value === "object" && ("fsPath" in value || "scheme" in value);
}

export function createVscodeApi(options = {}) {
  const commandHandlers = new Map();
  const registeredCommands = [];
  const contentProviders = [];
  const openedDocuments = [];
  const shownDocuments = [];
  const infoMessages = [];
  const errorMessages = [];
  const statusItems = [];
  const fileWatchers = [];
  const outputLogs = [];

  function registerCommand(command, handler) {
    commandHandlers.set(command, handler);
    registeredCommands.push(command);
    return new Disposable(() => commandHandlers.delete(command));
  }

  function createOutputChannel(name) {
    const lines = [];
    return {
      name,
      appendLine: (line) => lines.push(line),
      lines,
      dispose: () => lines.splice(0, lines.length),
    };
  }

  function openTextDocument(target) {
    const doc = makeDocument(target, contentProviders, openedDocuments.length);
    openedDocuments.push(doc);
    return Promise.resolve(doc);
  }

  const workspace = {
    fs: {
      stat: async (uri) => {
        if (options.existingFiles === false) {
          const err = new Error("ENOENT");
          err.code = "ENOENT";
          throw err;
        }
        return { type: "file", uri };
      },
    },
    registerTextDocumentContentProvider: (scheme, provider) => {
      contentProviders.push({ scheme, provider });
      return new Disposable(() => {
        const idx = contentProviders.findIndex((p) => p.scheme === scheme && p.provider === provider);
        if (idx >= 0) contentProviders.splice(idx, 1);
      });
    },
    openTextDocument,
    createFileSystemWatcher: (globPattern) => {
      const watcher = { globPattern, disposed: false, dispose() { this.disposed = true; } };
      fileWatchers.push(watcher);
      return watcher;
    },
  };

  const window = {
    get activeTextEditor() {
      return options.activeTextEditor ?? null;
    },
    set activeTextEditor(editor) {
      options.activeTextEditor = editor;
    },
    showInformationMessage: (message) => {
      infoMessages.push(message);
      return message;
    },
    showErrorMessage: (message) => {
      errorMessages.push(message);
      return message;
    },
    showTextDocument: async (doc, opts) => {
      shownDocuments.push({ doc, opts });
      return { document: doc };
    },
    openTextDocument,
    createOutputChannel,
    createStatusBarItem: (alignment, priority) => {
      const item = {
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
    file: (fsPath) => createUri(`file://${fsPath}`),
    parse: (value) => createUri(value),
    joinPath: (base, ...segments) => createUri(`file://${path.join(base.fsPath ?? "", ...segments)}`),
  };

  const vscode = {
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

function makeDocument(target, providers, docId) {
  const asUri = (input) => (typeof input === "string" ? createUri(input) : input);
  if (isUri(target)) {
    const uri = asUri(target);
    const provider = providers.find((p) => p.scheme === uri.scheme);
    const provided = provider?.provider?.provideTextDocumentContent?.(uri);
    const text = typeof provided === "string" ? provided : provided ?? "";
    return { uri, languageId: uri.scheme, getText: () => text, text };
  }
  if (target && typeof target === "object") {
    const uri = target.uri ? asUri(target.uri) : createUri(`untitled:${docId}`);
    const text = typeof target.content === "string" ? target.content : "";
    return {
      uri,
      languageId: target.language ?? target.languageId ?? "plaintext",
      getText: () => text,
      text,
    };
  }
  const uri = createUri(`untitled:${docId}`);
  return { uri, languageId: "plaintext", getText: () => "", text: "" };
}
