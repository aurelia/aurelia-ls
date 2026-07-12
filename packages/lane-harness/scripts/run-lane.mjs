#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(SCRIPT_DIR, "..");
const REPO_ROOT = path.resolve(PACKAGE_ROOT, "..", "..");
const SERVER_PATH = path.resolve(REPO_ROOT, "packages/language-server/out/main.js");
const REQUEST_TIMEOUT_MS = 30000;
const STARTUP_TIMEOUT_MS = 10000;
const SHUTDOWN_TIMEOUT_MS = 5000;
const OPEN_SETTLE_TIMEOUT_MS = 5000;
const DIAGNOSTICS_TIMEOUT_MS = 30000;
const SUPPORTED_LANES = new Set(["rename", "references", "hover", "completions", "definition", "documentHighlight", "diagnostics", "codeAction"]);

// Keep in sync with COMPLETION_GAP_MARKER_LABEL in packages/language-server/src/mapping/lsp-types.ts.
const COMPLETION_GAP_MARKER_LABEL = "Aurelia analysis incomplete";

const COMPLETION_ITEM_KIND_NAMES = {
  1: "text", 2: "method", 3: "function", 4: "constructor", 5: "field", 6: "variable",
  7: "class", 8: "interface", 9: "module", 10: "property", 11: "unit", 12: "value",
  13: "enum", 14: "keyword", 15: "snippet", 16: "color", 17: "file", 18: "reference",
  19: "folder", 20: "enum-member", 21: "constant", 22: "struct", 23: "event",
  24: "operator", 25: "type-parameter",
};

class HarnessError extends Error {
  constructor(message) {
    super(message);
    this.name = "HarnessError";
  }
}

class SnapshotMismatchError extends Error {
  constructor(snapshotPath, detail) {
    super(`Snapshot mismatch: ${snapshotPath}\n${detail}`);
    this.name = "SnapshotMismatchError";
    this.snapshotPath = snapshotPath;
  }
}

class LspClient {
  #process;
  #nextId = 1;
  #pending = new Map();
  #buffer = Buffer.alloc(0);
  #stderr = [];
  #notifications = [];
  #notificationWaiters = [];
  #exit = null;

  constructor(serverPath) {
    this.#process = spawn(process.execPath, [serverPath, "--stdio"], {
      cwd: REPO_ROOT,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    this.#process.stdout.on("data", (chunk) => {
      this.#buffer = Buffer.concat([this.#buffer, chunk]);
      this.#drainMessages();
    });

    this.#process.stderr.on("data", (chunk) => {
      this.#stderr.push(chunk.toString("utf8"));
    });

    this.#exit = new Promise((resolve) => {
      this.#process.once("exit", (code, signal) => {
        for (const pending of this.#pending.values()) {
          clearTimeout(pending.timeout);
          pending.reject(
            new HarnessError(
              `Language server exited before replying (code=${String(code)}, signal=${String(signal)}).\n${this.stderrText}`,
            ),
          );
        }
        this.#pending.clear();
        resolve({ code, signal });
      });
    });

    this.#process.once("error", (error) => {
      for (const pending of this.#pending.values()) {
        clearTimeout(pending.timeout);
        pending.reject(error);
      }
      this.#pending.clear();
    });
  }

  get stderrText() {
    return this.#stderr.join("");
  }

  request(method, params, timeoutMs = REQUEST_TIMEOUT_MS) {
    const id = this.#nextId++;
    const message = { jsonrpc: "2.0", id, method, params };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.#pending.delete(id);
        reject(
          new HarnessError(
            `Timed out waiting for ${method} response after ${timeoutMs}ms.\n${this.stderrText}`,
          ),
        );
      }, timeoutMs);

      this.#pending.set(id, { resolve, reject, timeout, method });
      this.#send(message);
    });
  }

  notify(method, params) {
    this.#send({ jsonrpc: "2.0", method, params });
  }

  async waitForNotifications(method, count, predicate, timeoutMs) {
    const matches = [];
    const collectExisting = () => {
      for (const notification of this.#notifications) {
        if (notification.method === method && predicate(notification)) {
          matches.push(notification);
        }
      }
      return matches.length >= count;
    };

    if (collectExisting()) {
      return matches.slice(0, count);
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.#notificationWaiters = this.#notificationWaiters.filter((w) => w !== waiter);
        resolve(matches.slice(0, count));
      }, timeoutMs);

      const waiter = {
        method,
        notify: (notification) => {
          if (notification.method !== method || !predicate(notification)) {
            return;
          }
          matches.push(notification);
          if (matches.length >= count) {
            clearTimeout(timeout);
            this.#notificationWaiters = this.#notificationWaiters.filter((w) => w !== waiter);
            resolve(matches.slice(0, count));
          }
        },
      };

      this.#notificationWaiters.push(waiter);
    });
  }

  notificationCursor() {
    return this.#notifications.length;
  }

  notificationsSince(cursor, method, predicate = () => true) {
    return this.#notifications
      .slice(cursor)
      .filter((notification) => notification.method === method && predicate(notification));
  }

  async shutdown() {
    if (this.#process.exitCode !== null || this.#process.killed) {
      return;
    }

    try {
      await this.request("shutdown", null, SHUTDOWN_TIMEOUT_MS);
    } catch {
      // The runner is already done; continue to exit/kill cleanup.
    }

    if (!this.#process.killed) {
      this.notify("exit");
    }

    const exited = await Promise.race([
      this.#exit,
      delay(SHUTDOWN_TIMEOUT_MS).then(() => null),
    ]);

    if (exited === null && !this.#process.killed) {
      this.#process.kill();
      await this.#exit;
    }
  }

  #send(message) {
    const body = JSON.stringify(message);
    const header = `Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n`;
    this.#process.stdin.write(header + body, "utf8");
  }

  #sendResponse(id, result) {
    this.#send({ jsonrpc: "2.0", id, result });
  }

  #drainMessages() {
    while (true) {
      const headerEnd = this.#buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) {
        return;
      }

      const header = this.#buffer.subarray(0, headerEnd).toString("ascii");
      const lengthMatch = /Content-Length:\s*(\d+)/i.exec(header);
      if (!lengthMatch) {
        throw new HarnessError(`Malformed LSP header: ${header}`);
      }

      const contentLength = Number(lengthMatch[1]);
      const messageStart = headerEnd + 4;
      const messageEnd = messageStart + contentLength;
      if (this.#buffer.length < messageEnd) {
        return;
      }

      const body = this.#buffer.subarray(messageStart, messageEnd).toString("utf8");
      this.#buffer = this.#buffer.subarray(messageEnd);
      this.#handleMessage(JSON.parse(body));
    }
  }

  #handleMessage(message) {
    // JSON-RPC request IDs are scoped to each direction. A server request may legally reuse the ID of a pending
    // client request, so the presence of `method` must win over numeric ID matching.
    if (Object.prototype.hasOwnProperty.call(message, "id") && typeof message.method === "string") {
      this.#sendResponse(message.id, defaultClientResponse(message));
      return;
    }

    if (Object.prototype.hasOwnProperty.call(message, "id") && this.#pending.has(message.id)) {
      const pending = this.#pending.get(message.id);
      this.#pending.delete(message.id);
      clearTimeout(pending.timeout);
      pending.resolve(message);
      return;
    }

    if (typeof message.method === "string") {
      this.#notifications.push(message);
      for (const waiter of [...this.#notificationWaiters]) {
        waiter.notify(message);
      }
    }
  }
}

function defaultClientResponse(message) {
  if (message.method === "workspace/configuration") {
    const items = Array.isArray(message.params?.items) ? message.params.items : [];
    return items.map(() => null);
  }
  return null;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  if (!options.fixture) {
    throw new HarnessError("Missing required --fixture <name>.");
  }
  if (!options.lane) {
    throw new HarnessError("Missing required --lane <name>.");
  }
  if (!SUPPORTED_LANES.has(options.lane)) {
    throw new HarnessError(
      `Supported lanes are ${[...SUPPORTED_LANES].join(", ")}, got ${JSON.stringify(options.lane)}.`,
    );
  }
  if (!existsSync(SERVER_PATH)) {
    throw new HarnessError(
      `Language server build output is missing: ${path.relative(REPO_ROOT, SERVER_PATH)}\n` +
        "Run the workspace build first, for example: pnpm --filter @aurelia-ls/semantic-runtime build",
    );
  }

  const probeFile = resolveProbeFile(options.fixture);
  const probeDocument = JSON.parse(await readFile(probeFile, "utf8"));
  const fixtureRoot = path.resolve(REPO_ROOT, probeDocument.fixture);
  const fixtureName = path.basename(fixtureRoot);

  if (!existsSync(fixtureRoot)) {
    throw new HarnessError(`Fixture root does not exist: ${path.relative(REPO_ROOT, fixtureRoot)}`);
  }

  const allLaneProbes = probeDocument.lanes?.[options.lane];
  if (!Array.isArray(allLaneProbes) || allLaneProbes.length === 0) {
    throw new HarnessError(`No probes found for lane ${JSON.stringify(options.lane)} in ${probeFile}.`);
  }

  const probes = options.probe
    ? allLaneProbes.filter((probe) => probe.id === options.probe)
    : allLaneProbes;
  if (probes.length === 0) {
    throw new HarnessError(`No probe with id ${JSON.stringify(options.probe)} in ${probeFile}.`);
  }

  const textCache = new Map();
  const readFixtureText = async (relativeFile) => {
    const key = normalizeRelativePath(relativeFile);
    if (!textCache.has(key)) {
      const absoluteFile = resolveFixturePath(fixtureRoot, key);
      textCache.set(key, await readFile(absoluteFile, "utf8"));
    }
    return textCache.get(key);
  };

  for (const relativeFile of new Set(probes.map((probe) => normalizeRelativePath(probe.file)))) {
    await readFixtureText(relativeFile);
  }

  const client = new LspClient(SERVER_PATH);
  try {
    await initializeServer(client, fixtureRoot, fixtureName);
    await openProbeDocuments(client, fixtureRoot, probes, readFixtureText);

    const openUris = new Set(probes.map((probe) => pathToFileURL(resolveFixturePath(fixtureRoot, probe.file)).href));
    await client.waitForNotifications(
      "aurelia/analysisReady",
      openUris.size,
      (notification) => openUris.has(notification.params?.uri),
      OPEN_SETTLE_TIMEOUT_MS,
    );

    const results = [];
    for (const probe of probes) {
      results.push(await runLaneProbe(client, fixtureRoot, options.lane, probe, readFixtureText));
    }

    const snapshot = renderSnapshot({
      fixtureName,
      fixtureRoot,
      lane: options.lane,
      probeFile,
      probes: results,
      selectedProbe: options.probe ?? null,
    });
    const snapshotPath = path.resolve(PACKAGE_ROOT, "snapshots", fixtureName, `${options.lane}.snap.md`);

    if (options.update) {
      await mkdir(path.dirname(snapshotPath), { recursive: true });
      await writeFile(snapshotPath, snapshot, "utf8");
      console.log(`Updated ${path.relative(REPO_ROOT, snapshotPath)}`);
    } else {
      if (!existsSync(snapshotPath)) {
        throw new SnapshotMismatchError(
          path.relative(REPO_ROOT, snapshotPath),
          "Snapshot file does not exist. Re-run with --update to create it.",
        );
      }
      const existing = await readFile(snapshotPath, "utf8");
      if (existing !== snapshot) {
        throw new SnapshotMismatchError(
          path.relative(REPO_ROOT, snapshotPath),
          describeSnapshotMismatch(existing, snapshot),
        );
      }
      console.log(`Snapshot matched ${path.relative(REPO_ROOT, snapshotPath)}`);
    }

    printSummary(results);
  } finally {
    await client.shutdown();
  }
}

function parseArgs(args) {
  const options = {
    fixture: null,
    lane: null,
    probe: null,
    update: false,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    switch (arg) {
      case "--fixture":
        options.fixture = requireValue(args, ++index, arg);
        break;
      case "--lane":
        options.lane = requireValue(args, ++index, arg);
        break;
      case "--probe":
        options.probe = requireValue(args, ++index, arg);
        break;
      case "--update":
      case "-u":
        options.update = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        throw new HarnessError(`Unknown argument: ${arg}\n${usage()}`);
    }
  }

  return options;
}

function requireValue(args, index, flag) {
  const value = args[index];
  if (!value || value.startsWith("--")) {
    throw new HarnessError(`Missing value for ${flag}.`);
  }
  return value;
}

function usage() {
  return [
    "Usage:",
    "  pnpm --filter @aurelia-ls/lane-harness lane -- --fixture <fixture-name> --lane <rename|references|hover|completions|definition|documentHighlight|diagnostics|codeAction> [--probe <id>] [--update]",
    "",
    "Example:",
    "  pnpm --filter @aurelia-ls/lane-harness lane -- --fixture app-pattern-routed-catalog-storefront --lane rename --update",
  ].join("\n");
}

function resolveProbeFile(fixtureArg) {
  const direct = path.resolve(REPO_ROOT, fixtureArg);
  if (existsSync(direct)) {
    return direct;
  }

  const slug = fixtureArg.replace(/\.probes\.json$/u, "");
  const probeFile = path.resolve(PACKAGE_ROOT, "probes", `${slug}.probes.json`);
  if (!existsSync(probeFile)) {
    throw new HarnessError(`Probe file not found for fixture ${JSON.stringify(fixtureArg)}.`);
  }
  return probeFile;
}

async function initializeServer(client, fixtureRoot, fixtureName) {
  const rootUri = pathToFileURL(fixtureRoot).href;
  const response = await client.request(
    "initialize",
    {
      processId: process.pid,
      rootUri,
      workspaceFolders: [{ uri: rootUri, name: fixtureName }],
      capabilities: {
        textDocument: {
          codeAction: {
            dataSupport: true,
            resolveSupport: { properties: ["edit"] },
          },
          rename: {
            dynamicRegistration: false,
            prepareSupport: true,
          },
        },
        workspace: {
          applyEdit: true,
          configuration: true,
          workspaceFolders: true,
        },
      },
      initializationOptions: {
        aurelia: {
          workspace: {
            trusted: true,
          },
        },
      },
    },
    STARTUP_TIMEOUT_MS,
  );

  if (response.error) {
    throw new HarnessError(`initialize failed: ${JSON.stringify(response.error)}`);
  }
  client.notify("initialized", {});
}

async function openProbeDocuments(client, fixtureRoot, probes, readFixtureText) {
  const opened = new Set();
  for (const probe of probes) {
    const relativeFile = normalizeRelativePath(probe.file);
    if (opened.has(relativeFile)) {
      continue;
    }
    opened.add(relativeFile);
    const absoluteFile = resolveFixturePath(fixtureRoot, relativeFile);
    const uri = pathToFileURL(absoluteFile).href;
    client.notify("textDocument/didOpen", {
      textDocument: {
        uri,
        languageId: languageIdForPath(relativeFile),
        version: 1,
        text: await readFixtureText(relativeFile),
      },
    });
  }
}

function languageIdForPath(file) {
  if (file.endsWith(".html")) {
    return "html";
  }
  if (file.endsWith(".ts") || file.endsWith(".tsx")) {
    return "typescript";
  }
  if (file.endsWith(".js") || file.endsWith(".jsx")) {
    return "javascript";
  }
  if (file.endsWith(".json")) {
    return "json";
  }
  return "plaintext";
}

async function runLaneProbe(client, fixtureRoot, lane, probe, readFixtureText) {
  switch (lane) {
    case "rename":
      return runRenameProbe(client, fixtureRoot, probe, readFixtureText);
    case "references":
      return runReferencesProbe(client, fixtureRoot, probe, readFixtureText);
    case "hover":
      return runHoverProbe(client, fixtureRoot, probe, readFixtureText);
    case "completions":
      return runCompletionsProbe(client, fixtureRoot, probe, readFixtureText);
    case "definition":
      return runDefinitionProbe(client, fixtureRoot, probe, readFixtureText);
    case "documentHighlight":
      return runDocumentHighlightProbe(client, fixtureRoot, probe, readFixtureText);
    case "diagnostics":
      return runDiagnosticsProbe(client, fixtureRoot, probe, readFixtureText);
    case "codeAction":
      return runCodeActionProbe(client, fixtureRoot, probe, readFixtureText);
    default:
      throw new HarnessError(`Unsupported lane: ${lane}`);
  }
}

async function runCompletionsProbe(client, fixtureRoot, probe, readFixtureText) {
  const relativeFile = normalizeRelativePath(probe.file);
  const sourceText = await readFixtureText(relativeFile);
  const anchor = resolveAnchorPosition(sourceText, probe);
  const absoluteFile = resolveFixturePath(fixtureRoot, relativeFile);
  const uri = pathToFileURL(absoluteFile).href;

  const completionResponse = await client.request("textDocument/completion", {
    textDocument: { uri },
    position: anchor.position,
    context: { triggerKind: 1 },
  });

  return {
    lane: "completions",
    probe,
    relativeFile,
    anchor,
    completionResponse,
    completionSummary: summarizeCompletionResponse(completionResponse, probe),
  };
}

// Completions are snapshotted as membership assertions plus aggregates, never as full item
// lists: the candidate set is large and order/detail churn would drown the review signal.
function summarizeCompletionResponse(response, probe) {
  if (response.error) {
    return {
      outcome: "error",
      error: normalizeSnapshotValue(response.error),
      membership: [],
      mismatches: 0,
    };
  }

  const result = response.result;
  const items = Array.isArray(result) ? result : Array.isArray(result?.items) ? result.items : [];
  const isIncomplete = Array.isArray(result) ? false : Boolean(result?.isIncomplete);
  const gapMarker = items.some((item) => item?.label === COMPLETION_GAP_MARKER_LABEL);

  const kindCounts = {};
  for (const item of items) {
    const kindName = COMPLETION_ITEM_KIND_NAMES[item?.kind] ?? `kind-${String(item?.kind)}`;
    kindCounts[kindName] = (kindCounts[kindName] ?? 0) + 1;
  }
  const sortedKindCounts = Object.fromEntries(
    Object.entries(kindCounts).sort(([left], [right]) => left.localeCompare(right)),
  );

  const membership = [];
  const watched = probe.watch ?? {};
  for (const [expectation, labels] of [["present", watched.present ?? []], ["absent", watched.absent ?? []]]) {
    for (const label of [...labels].sort()) {
      const matches = items.filter((item) => item?.label === label);
      membership.push({
        label,
        expectation,
        found: matches.length > 0,
        kinds: [...new Set(matches.map((item) => COMPLETION_ITEM_KIND_NAMES[item?.kind] ?? `kind-${String(item?.kind)}`))].sort(),
        details: [...new Set(matches.map((item) => typeof item?.detail === "string" ? item.detail.slice(0, 120) : null).filter(Boolean))].sort().slice(0, 3),
      });
    }
  }

  const mismatches = membership.filter(
    (row) => (row.expectation === "present") !== row.found,
  ).length;

  return {
    outcome: items.length === 0 ? "empty" : "result",
    isIncomplete,
    totalItems: items.length,
    gapMarker,
    kindCounts: sortedKindCounts,
    membership,
    mismatches,
  };
}

async function runRenameProbe(client, fixtureRoot, probe, readFixtureText) {
  const relativeFile = normalizeRelativePath(probe.file);
  const sourceText = await readFixtureText(relativeFile);
  const anchor = resolveAnchorPosition(sourceText, probe);
  const absoluteFile = resolveFixturePath(fixtureRoot, relativeFile);
  const uri = pathToFileURL(absoluteFile).href;

  const prepareResponse = await client.request("textDocument/prepareRename", {
    textDocument: { uri },
    position: anchor.position,
  });

  const expectedOldTexts = inferExpectedOldTexts(prepareResponse, sourceText, anchor);

  const renameNotificationCursor = client.notificationCursor();
  const renameResponse = await client.request("textDocument/rename", {
    textDocument: { uri },
    position: anchor.position,
    newName: probe.newName,
  });
  const renameNotifications = client.notificationsSince(
    renameNotificationCursor,
    "window/showMessage",
  );

  const apply = renameResponse.error
    ? emptyApplyResult("rename-error", expectedOldTexts)
    : await applyWorkspaceEdit({
        workspaceEdit: renameResponse.result,
        fixtureRoot,
        readFixtureText,
        expectedOldTexts,
      });

  return {
    lane: "rename",
    probe,
    relativeFile,
    anchor,
    prepareResponse,
    renameResponse,
    renameNotifications,
    expectedOldTexts,
    apply,
  };
}

async function runReferencesProbe(client, fixtureRoot, probe, readFixtureText) {
  const relativeFile = normalizeRelativePath(probe.file);
  const sourceText = await readFixtureText(relativeFile);
  const anchor = resolveAnchorPosition(sourceText, probe);
  const absoluteFile = resolveFixturePath(fixtureRoot, relativeFile);
  const uri = pathToFileURL(absoluteFile).href;

  const referencesResponse = await client.request("textDocument/references", {
    textDocument: { uri },
    position: anchor.position,
    context: {
      includeDeclaration: true,
    },
  });
  const locations = referencesResponse.error
    ? []
    : await summarizeLocations(referencesResponse.result, fixtureRoot, readFixtureText);

  return {
    lane: "references",
    probe,
    relativeFile,
    anchor,
    referencesResponse,
    locations,
  };
}

async function runHoverProbe(client, fixtureRoot, probe, readFixtureText) {
  const relativeFile = normalizeRelativePath(probe.file);
  const sourceText = await readFixtureText(relativeFile);
  const anchor = resolveAnchorPosition(sourceText, probe);
  const absoluteFile = resolveFixturePath(fixtureRoot, relativeFile);
  const uri = pathToFileURL(absoluteFile).href;

  const hoverResponse = await client.request("textDocument/hover", {
    textDocument: { uri },
    position: anchor.position,
  });

  return {
    lane: "hover",
    probe,
    relativeFile,
    anchor,
    hoverResponse,
  };
}

async function runDefinitionProbe(client, fixtureRoot, probe, readFixtureText) {
  const relativeFile = normalizeRelativePath(probe.file);
  const sourceText = await readFixtureText(relativeFile);
  const anchor = resolveAnchorPosition(sourceText, probe);
  const absoluteFile = resolveFixturePath(fixtureRoot, relativeFile);
  const uri = pathToFileURL(absoluteFile).href;

  const definitionResponse = await client.request("textDocument/definition", {
    textDocument: { uri },
    position: anchor.position,
  });
  const locations = definitionResponse.error
    ? []
    : await summarizeLocations(definitionResponse.result, fixtureRoot, readFixtureText);

  return {
    lane: "definition",
    probe,
    relativeFile,
    anchor,
    definitionResponse,
    locations,
  };
}

async function runDocumentHighlightProbe(client, fixtureRoot, probe, readFixtureText) {
  const relativeFile = normalizeRelativePath(probe.file);
  const sourceText = await readFixtureText(relativeFile);
  const anchor = resolveAnchorPosition(sourceText, probe);
  const absoluteFile = resolveFixturePath(fixtureRoot, relativeFile);
  const uri = pathToFileURL(absoluteFile).href;

  const documentHighlightResponse = await client.request("textDocument/documentHighlight", {
    textDocument: { uri },
    position: anchor.position,
  });
  const highlights = documentHighlightResponse.error
    ? []
    : summarizeDocumentHighlights(documentHighlightResponse.result, sourceText);

  return {
    lane: "documentHighlight",
    probe,
    relativeFile,
    anchor,
    documentHighlightResponse,
    highlights,
  };
}

async function runDiagnosticsProbe(client, fixtureRoot, probe, readFixtureText) {
  const relativeFile = normalizeRelativePath(probe.file);
  const sourceText = await readFixtureText(relativeFile);
  const absoluteFile = resolveFixturePath(fixtureRoot, relativeFile);
  const uri = pathToFileURL(absoluteFile).href;

  const publishNotifications = await client.waitForNotifications(
    "textDocument/publishDiagnostics",
    1,
    (notification) => notification.params?.uri === uri,
    DIAGNOSTICS_TIMEOUT_MS,
  );
  const publishNotification = publishNotifications.at(-1) ?? null;
  const publishSummary = await summarizePublishDiagnosticsNotification(
    publishNotification,
    sourceText,
    fixtureRoot,
    readFixtureText,
  );

  const customResponse = await client.request("aurelia/getDiagnostics", { uri });
  const customSummary = await summarizeCustomDiagnosticsResponse(customResponse, fixtureRoot, readFixtureText);

  return {
    lane: "diagnostics",
    probe,
    relativeFile,
    publishNotification,
    publishSummary,
    customResponse,
    customSummary,
    alignment: summarizeDiagnosticsAlignment(publishSummary, customSummary),
  };
}

async function runCodeActionProbe(client, fixtureRoot, probe, readFixtureText) {
  const relativeFile = normalizeRelativePath(probe.file);
  const sourceText = await readFixtureText(relativeFile);
  const anchor = resolveAnchorPosition(sourceText, probe);
  const absoluteFile = resolveFixturePath(fixtureRoot, relativeFile);
  const uri = pathToFileURL(absoluteFile).href;
  const range = { start: anchor.position, end: anchor.position };
  const publishNotifications = await client.waitForNotifications(
    "textDocument/publishDiagnostics",
    1,
    (notification) => notification.params?.uri === uri,
    DIAGNOSTICS_TIMEOUT_MS,
  );
  const codeActionDiagnostics = codeActionContextDiagnostics(
    publishNotifications.at(-1)?.params?.diagnostics,
    range,
  );

  const codeActionResponse = await client.request("textDocument/codeAction", {
    textDocument: { uri },
    range,
    context: {
      diagnostics: codeActionDiagnostics,
      only: ["quickfix"],
    },
  });

  const actions = codeActionResponse.error
    ? []
    : Array.isArray(codeActionResponse.result)
      ? codeActionResponse.result
      : [];
  const expectedOldTexts = codeActionExpectedOldTexts(probe);
  const actionResults = [];
  for (let index = 0; index < actions.length; index += 1) {
    const action = actions[index];
    const shouldResolve = action?.edit == null
      && action?.data?.semanticRuntime?.resolve?.schema === "aurelia.template-code-action-resolve/1";
    const resolveResponse = shouldResolve
      ? await client.request("codeAction/resolve", action)
      : null;
    const resolvedAction = resolveResponse?.error
      ? action
      : resolveResponse?.result ?? action;
    actionResults.push({
      index,
      title: String(action?.title ?? ""),
      kind: action?.kind ?? null,
      isPreferred: action?.isPreferred ?? null,
      disabled: normalizeSnapshotValue(action?.disabled ?? null),
      command: normalizeSnapshotValue(action?.command ?? null),
      diagnosticCount: Array.isArray(action?.diagnostics) ? action.diagnostics.length : 0,
      data: normalizeSnapshotValue(action?.data ?? null),
      resolution: summarizeCodeActionResolution(resolveResponse, resolvedAction),
      apply: await applyWorkspaceEdit({
        workspaceEdit: resolvedAction?.edit ?? null,
        fixtureRoot,
        readFixtureText,
        expectedOldTexts,
      }),
    });
  }

  return {
    lane: "codeAction",
    probe,
    relativeFile,
    anchor,
    range,
    codeActionResponse,
    codeActionDiagnostics,
    expectedOldTexts,
    actions: actionResults,
  };
}

function summarizeCodeActionResolution(response, action) {
  if (response == null) {
    return {
      outcome: "not-requested",
      hasEdit: action?.edit != null,
      hasCommand: action?.command != null,
    };
  }
  return {
    outcome: response.error ? "error" : action?.edit != null ? "resolved" : "no-edit",
    hasEdit: action?.edit != null,
    hasCommand: action?.command != null,
    error: normalizeSnapshotValue(response.error ?? null),
  };
}

function codeActionContextDiagnostics(diagnostics, range) {
  if (!Array.isArray(diagnostics)) {
    return [];
  }
  return diagnostics.filter((diagnostic) =>
    isRange(diagnostic?.range) && rangesIntersect(diagnostic.range, range)
  );
}

function rangesIntersect(left, right) {
  return comparePositions(left.end, right.start) >= 0
    && comparePositions(right.end, left.start) >= 0;
}

function comparePositions(left, right) {
  return left.line - right.line || left.character - right.character;
}

function codeActionExpectedOldTexts(probe) {
  if (Array.isArray(probe.expectedOldTexts)) {
    return [...new Set(probe.expectedOldTexts.map((value) => String(value)))];
  }
  return [""];
}

function summarizeDocumentHighlights(result, sourceText) {
  if (!Array.isArray(result)) {
    return [];
  }

  return result.map((highlight) => {
    const range = highlight?.range ?? null;
    if (!isRange(range)) {
      return {
        range: normalizeSnapshotValue(range),
        kind: documentHighlightKindName(highlight?.kind),
        rangeText: null,
        anomaly: "unsupported-highlight-shape",
      };
    }
    return {
      range: normalizeSnapshotValue(range),
      kind: documentHighlightKindName(highlight?.kind),
      rangeText: readRangeText(sourceText, range),
      anomaly: null,
    };
  });
}

async function summarizePublishDiagnosticsNotification(notification, sourceText, fixtureRoot, readFixtureText) {
  if (notification == null) {
    return {
      outcome: "missing-notification",
      uri: null,
      diagnosticCount: 0,
      diagnostics: [],
    };
  }

  const diagnostics = Array.isArray(notification.params?.diagnostics)
    ? notification.params.diagnostics
    : [];
  return {
    outcome: "published",
    uri: normalizeSnapshotString(notification.params?.uri ?? ""),
    diagnosticCount: diagnostics.length,
    diagnostics: await Promise.all(diagnostics.map((diagnostic) =>
      summarizeLspDiagnostic(diagnostic, sourceText, fixtureRoot, readFixtureText)
    )),
  };
}

async function summarizeLspDiagnostic(diagnostic, sourceText, fixtureRoot, readFixtureText) {
  const range = diagnostic?.range ?? null;
  let rangeText = null;
  let anomaly = null;
  if (isRange(range)) {
    try {
      rangeText = readRangeText(sourceText, range);
    } catch (error) {
      anomaly = error instanceof Error ? error.message : String(error);
    }
  } else if (range != null) {
    anomaly = "unsupported-range-shape";
  }

  return {
    code: normalizeSnapshotValue(diagnostic?.code ?? null),
    message: normalizeSnapshotString(String(diagnostic?.message ?? "")),
    severity: diagnosticSeverityName(diagnostic?.severity),
    source: diagnostic?.source ?? null,
    range: isRange(range) ? normalizeRangeForSnapshot(range) : normalizeSnapshotValue(range),
    rangeText,
    anomaly,
    relatedInformation: Array.isArray(diagnostic?.relatedInformation)
      ? await Promise.all(diagnostic.relatedInformation.map((related) =>
        summarizeLspDiagnosticRelatedInformation(related, sourceText, fixtureRoot, readFixtureText)
      ))
      : [],
    data: summarizeDiagnosticData(diagnostic?.data),
  };
}

async function summarizeLspDiagnosticRelatedInformation(related, sourceText, fixtureRoot, readFixtureText) {
  const location = related?.location ?? null;
  const range = location?.range ?? null;
  const uri = typeof location?.uri === "string" ? location.uri : null;
  const file = uri == null ? null : uriToFixtureRelativePath(uri, fixtureRoot);
  let rangeText = null;
  let anomaly = null;
  if (isRange(range)) {
    try {
      const text = file == null ? sourceText : await readFixtureText(file);
      rangeText = readRangeText(text, range);
    } catch (error) {
      anomaly = error instanceof Error ? error.message : String(error);
    }
  } else if (range != null) {
    anomaly = "unsupported-range-shape";
  }
  if (uri != null && file == null && anomaly == null) {
    anomaly = "outside-fixture";
  }
  return {
    message: normalizeSnapshotString(String(related?.message ?? "")),
    uri: normalizeSnapshotString(location?.uri ?? ""),
    file,
    range: isRange(range) ? normalizeRangeForSnapshot(range) : normalizeSnapshotValue(range),
    rangeText,
    anomaly,
  };
}

async function summarizeCustomDiagnosticsResponse(response, fixtureRoot, readFixtureText) {
  if (response.error) {
    return {
      outcome: "error",
      error: normalizeSnapshotValue(response.error),
    };
  }

  if (response.result == null) {
    return {
      outcome: "result",
      result: null,
    };
  }

  const diagnostics = response.result.diagnostics ?? {};
  const bySurface = diagnostics.bySurface ?? {};
  const surfaces = {};
  for (const surface of Object.keys(bySurface).sort()) {
    const items = Array.isArray(bySurface[surface]) ? bySurface[surface] : [];
    surfaces[surface] = {
      diagnosticCount: items.length,
      diagnostics: await Promise.all(items.map((item) =>
        summarizeCustomDiagnosticsItem(item, fixtureRoot, readFixtureText)
      )),
    };
  }

  const raw = Array.isArray(diagnostics.raw) ? diagnostics.raw : [];
  const suppressed = Array.isArray(diagnostics.suppressed) ? diagnostics.suppressed : [];
  return {
    outcome: "result",
    uri: normalizeSnapshotString(response.result.uri ?? ""),
    fingerprint: response.result.fingerprint ?? null,
    surfaces,
    raw: {
      diagnosticCount: raw.length,
      diagnostics: await Promise.all(raw.map((item) =>
        summarizeCustomDiagnosticsItem(item, fixtureRoot, readFixtureText)
      )),
    },
    presentation: await summarizeCustomDiagnosticsPresentation(diagnostics.presentation, fixtureRoot, readFixtureText),
    suppressed: {
      diagnosticCount: suppressed.length,
      diagnostics: await Promise.all(suppressed.map((item) =>
        summarizeCustomDiagnosticsItem(item, fixtureRoot, readFixtureText)
      )),
    },
  };
}

async function summarizeCustomDiagnosticsPresentation(presentation, fixtureRoot, readFixtureText) {
  if (presentation == null || typeof presentation !== "object" || Array.isArray(presentation)) {
    return null;
  }
  const groups = Array.isArray(presentation.groups) ? presentation.groups : [];
  return {
    rawRowCount: presentation.rawRowCount ?? null,
    primaryCount: presentation.primaryCount ?? null,
    contextualCount: presentation.contextualCount ?? null,
    complete: presentation.complete ?? null,
    groups: await Promise.all(groups.map((group) =>
      summarizeCustomDiagnosticsPresentationGroup(group, fixtureRoot, readFixtureText)
    )),
  };
}

async function summarizeCustomDiagnosticsPresentationGroup(group, fixtureRoot, readFixtureText) {
  return {
    groupKey: normalizeSnapshotString(String(group?.groupKey ?? "")),
    subject: summarizeDiagnosticSubject(group?.subject),
    rawRowCount: group?.rawRowCount ?? null,
    primarySeverity: group?.primarySeverity ?? null,
    maxRawSeverity: group?.maxRawSeverity ?? null,
    primary: await summarizeCustomDiagnosticsPresentationItem(group?.primary, fixtureRoot, readFixtureText),
    related: await Promise.all((Array.isArray(group?.related) ? group.related : []).map((item) =>
      summarizeCustomDiagnosticsPresentationItem(item, fixtureRoot, readFixtureText)
    )),
  };
}

async function summarizeCustomDiagnosticsPresentationItem(item, fixtureRoot, readFixtureText) {
  return {
    rowId: normalizeSnapshotString(String(item?.rowId ?? "")),
    role: item?.role ?? null,
    relation: item?.relation ?? null,
    diagnostic: await summarizeCustomDiagnosticsItem(item?.diagnostic ?? {}, fixtureRoot, readFixtureText),
  };
}

async function summarizeCustomDiagnosticsItem(item, fixtureRoot, readFixtureText) {
  const uri = typeof item?.uri === "string" ? item.uri : null;
  const file = uri == null ? null : uriToFixtureRelativePath(uri, fixtureRoot);
  const span = isSourceSpan(item?.span) ? item.span : null;
  let spanText = null;
  let anomaly = null;

  if (uri != null && file == null) {
    anomaly = "outside-fixture";
  } else if (file != null && span != null) {
    try {
      const text = await readFixtureText(file);
      spanText = text.slice(span.start, span.end);
    } catch (error) {
      anomaly = error instanceof Error ? error.message : String(error);
    }
  }

  return {
    code: normalizeSnapshotValue(item?.code ?? null),
    message: normalizeSnapshotString(String(item?.message ?? "")),
    severity: item?.severity ?? null,
    impact: item?.impact ?? null,
    actionability: item?.actionability ?? null,
    category: item?.category ?? null,
    status: item?.status ?? null,
    source: item?.source ?? null,
    uri: uri == null ? null : normalizeSnapshotString(uri),
    file,
    span: span == null ? normalizeSnapshotValue(item?.span ?? null) : { start: span.start, end: span.end },
    spanText,
    anomaly,
    data: summarizeDiagnosticData(item?.data),
    related: await Promise.all((Array.isArray(item?.related) ? item.related : []).map((related) =>
      summarizeCustomDiagnosticsRelatedItem(related, fixtureRoot, readFixtureText)
    )),
    issues: normalizeSnapshotValue(item?.issues ?? []),
  };
}

async function summarizeCustomDiagnosticsRelatedItem(related, fixtureRoot, readFixtureText) {
  const uri = typeof related?.uri === "string" ? related.uri : null;
  const file = uri == null ? null : uriToFixtureRelativePath(uri, fixtureRoot);
  const span = isSourceSpan(related?.span) ? related.span : null;
  let spanText = null;
  let anomaly = null;
  if (uri != null && file == null) {
    anomaly = "outside-fixture";
  } else if (file != null && span != null) {
    try {
      const text = await readFixtureText(file);
      spanText = text.slice(span.start, span.end);
    } catch (error) {
      anomaly = error instanceof Error ? error.message : String(error);
    }
  }
  return {
    code: normalizeSnapshotValue(related?.code ?? null),
    message: normalizeSnapshotString(String(related?.message ?? "")),
    uri: uri == null ? null : normalizeSnapshotString(uri),
    file,
    span: span == null ? normalizeSnapshotValue(related?.span ?? null) : { start: span.start, end: span.end },
    spanText,
    sourceRole: related?.sourceRole ?? null,
    anomaly,
  };
}

function summarizeDiagnosticsAlignment(publishSummary, customSummary) {
  const lspDiagnostics = publishSummary.diagnostics ?? [];
  const customLspDiagnostics = customSummary?.surfaces?.lsp?.diagnostics ?? [];
  const lspKeys = new Map(lspDiagnostics.map((diagnostic) => [diagnosticComparisonKey(diagnostic), diagnostic]));
  const customKeys = new Map(customLspDiagnostics.map((diagnostic) => [diagnosticComparisonKey(diagnostic), diagnostic]));
  const lspOnly = [...lspKeys.keys()].filter((key) => !customKeys.has(key)).sort();
  const customOnly = [...customKeys.keys()].filter((key) => !lspKeys.has(key)).sort();

  return {
    lspPublishCount: lspDiagnostics.length,
    customLspSurfaceCount: customLspDiagnostics.length,
    suppressedCount: customSummary?.suppressed?.diagnosticCount ?? 0,
    countsMatch: lspDiagnostics.length === customLspDiagnostics.length,
    comparisonKey: "domain/kind/code/severity/text/message",
    lspOnly,
    customOnly,
  };
}

function diagnosticComparisonKey(diagnostic) {
  const data = diagnostic.data ?? {};
  return [
    data.diagnosticDomain ?? "unknown-domain",
    data.diagnosticKind ?? "unknown-kind",
    String(diagnostic.code ?? "no-code"),
    comparableDiagnosticSeverity(diagnostic.severity),
    diagnostic.rangeText ?? diagnostic.spanText ?? "no-text",
    diagnostic.message ?? "",
  ].join("|");
}

function comparableDiagnosticSeverity(severity) {
  return severity === "info"
    ? "information"
    : severity ?? "unknown-severity";
}

function summarizeDiagnosticData(data) {
  const root = data && typeof data === "object" && !Array.isArray(data) ? data : {};
  const semanticRuntime = root.semanticRuntime && typeof root.semanticRuntime === "object"
    ? root.semanticRuntime
    : root.semanticRuntime === true
      ? root
      : {};
  const taxonomyRoot = root.__aurelia && typeof root.__aurelia === "object" && root.__aurelia.diagnostics
    ? root.__aurelia.diagnostics
    : {};

  return {
    diagnosticDomain: semanticRuntime.diagnosticDomain ?? root.diagnosticDomain ?? null,
    diagnosticKind: semanticRuntime.diagnosticKind ?? root.diagnosticKind ?? null,
    diagnosticAuthority: semanticRuntime.diagnosticAuthority ?? root.diagnosticAuthority ?? null,
    frameworkErrorCode: semanticRuntime.frameworkErrorCode ?? root.frameworkErrorCode ?? null,
    frameworkRawErrorAuthority: semanticRuntime.frameworkRawErrorAuthority ?? root.frameworkRawErrorAuthority ?? null,
    phase: semanticRuntime.phase ?? root.phase ?? null,
    relatedQueryKind: semanticRuntime.relatedQueryKind ?? root.relatedQueryKind ?? null,
    sourceRole: semanticRuntime.sourceRole ?? root.sourceRole ?? null,
    missingInput: semanticRuntime.missingInput ?? root.missingInput ?? null,
    missingInputs: normalizeSnapshotValue(semanticRuntime.missingInputs ?? root.missingInputs ?? []),
    subject: summarizeDiagnosticSubject(semanticRuntime.subject ?? root.subject ?? null),
    relatedInformation: normalizeSnapshotValue(semanticRuntime.relatedInformation ?? root.relatedInformation ?? []),
    repairAffordance: normalizeSnapshotValue(semanticRuntime.repairAffordance ?? root.repairAffordance ?? null),
    taxonomy: {
      schema: taxonomyRoot.schema ?? null,
      impact: taxonomyRoot.impact ?? null,
      actionability: taxonomyRoot.actionability ?? null,
      category: taxonomyRoot.category ?? null,
      confidence: taxonomyRoot.confidence ?? null,
    },
  };
}

function summarizeDiagnosticSubject(subject) {
  if (subject == null || typeof subject !== "object" || Array.isArray(subject)) {
    return null;
  }
  return {
    subjectKind: subject.subjectKind ?? null,
    source: summarizeSourceReference(subject.source ?? null),
    uri: subject.uri ?? null,
    span: isSourceSpan(subject.span) ? { start: subject.span.start, end: subject.span.end } : normalizeSnapshotValue(subject.span ?? null),
  };
}

function summarizeSourceReference(source) {
  if (source == null || typeof source !== "object" || Array.isArray(source)) {
    return null;
  }
  return {
    kind: source.kind ?? null,
    label: source.label == null ? null : normalizeSnapshotString(String(source.label)),
    path: source.path == null ? null : normalizeSnapshotString(String(source.path)),
    start: source.start ?? null,
    end: source.end ?? null,
    role: source.role ?? null,
  };
}

function diagnosticSeverityName(severity) {
  switch (severity) {
    case 1:
      return "error";
    case 2:
      return "warning";
    case 3:
      return "information";
    case 4:
      return "hint";
    case undefined:
    case null:
      return null;
    default:
      return `severity-${String(severity)}`;
  }
}

function isSourceSpan(value) {
  return (
    value &&
    typeof value === "object" &&
    Number.isInteger(value.start) &&
    Number.isInteger(value.end) &&
    value.start >= 0 &&
    value.end >= value.start
  );
}

function documentHighlightKindName(kind) {
  switch (kind) {
    case 1:
      return "text";
    case 2:
      return "read";
    case 3:
      return "write";
    case undefined:
    case null:
      return null;
    default:
      return `kind-${String(kind)}`;
  }
}

async function summarizeLocations(result, fixtureRoot, readFixtureText) {
  const entries = Array.isArray(result)
    ? result
    : result == null
      ? []
      : [result];
  if (entries.length === 0) {
    return [];
  }

  const locations = [];
  for (const location of entries) {
    const uri = location.uri ?? location.targetUri ?? null;
    const range = location.range ?? location.targetSelectionRange ?? location.targetRange ?? null;
    if (typeof uri !== "string" || !isRange(range)) {
      locations.push({
        uri: normalizeSnapshotValue(uri),
        range: normalizeSnapshotValue(range),
        rangeText: null,
        anomaly: "unsupported-location-shape",
      });
      continue;
    }

    const relativeFile = uriToFixtureRelativePath(uri, fixtureRoot);
    let rangeText = null;
    let anomaly = null;
    if (relativeFile == null) {
      anomaly = "outside-fixture";
    } else {
      try {
        rangeText = readRangeText(await readFixtureText(relativeFile), range);
      } catch (error) {
        anomaly = error instanceof Error ? error.message : String(error);
      }
    }

    locations.push({
      uri: normalizeSnapshotString(uri),
      file: relativeFile,
      range: normalizeRangeForSnapshot(range),
      rangeText,
      anomaly,
    });
  }

  return locations.sort((left, right) =>
    String(left.uri ?? "").localeCompare(String(right.uri ?? ""))
    || compareOptionalRanges(left.range, right.range)
    || String(left.rangeText ?? "").localeCompare(String(right.rangeText ?? ""))
  );
}

function inferExpectedOldTexts(prepareResponse, sourceText, anchor) {
  const candidates = [];
  if (!prepareResponse.error && prepareResponse.result) {
    const range = extractPrepareRange(prepareResponse.result);
    if (range) {
      const rangeText = readRangeText(sourceText, range);
      if (rangeText.length > 0) {
        candidates.push(rangeText);
      }
    }
    if (typeof prepareResponse.result.placeholder === "string" && prepareResponse.result.placeholder.length > 0) {
      candidates.push(prepareResponse.result.placeholder);
    }
  }

  candidates.push(anchor.identifierAtCursor || anchor.atText || anchor.anchorText);
  return [...new Set(candidates.filter((candidate) => candidate.length > 0))];
}

function extractPrepareRange(result) {
  if (isRange(result)) {
    return result;
  }
  if (isRange(result?.range)) {
    return result.range;
  }
  return null;
}

function isRange(value) {
  return (
    value &&
    typeof value === "object" &&
    value.start &&
    value.end &&
    Number.isInteger(value.start.line) &&
    Number.isInteger(value.start.character) &&
    Number.isInteger(value.end.line) &&
    Number.isInteger(value.end.character)
  );
}

async function applyWorkspaceEdit({ workspaceEdit, fixtureRoot, readFixtureText, expectedOldTexts }) {
  if (!workspaceEdit) {
    return emptyApplyResult("no-workspace-edit", expectedOldTexts);
  }

  const collected = collectWorkspaceTextEdits(workspaceEdit);
  const anomalies = [...collected.unsupported];
  const grouped = new Map();

  for (const edit of collected.edits) {
    const relativeFile = uriToFixtureRelativePath(edit.uri, fixtureRoot);
    if (!relativeFile) {
      anomalies.push({
        type: "outside-fixture",
        uri: edit.uri,
        source: edit.source,
      });
      continue;
    }
    if (!grouped.has(relativeFile)) {
      grouped.set(relativeFile, []);
    }
    grouped.get(relativeFile).push({ ...edit, relativeFile });
  }

  if (grouped.size === 0) {
    return {
      expectedOldTexts,
      outcome: anomalies.length > 0 ? "apply-anomaly" : "no-edits",
      editCount: collected.edits.length,
      filesTouched: [],
      validation: [],
      anomalies,
      diffs: "",
    };
  }

  const validation = [];
  const originals = new Map();
  const replacements = new Map();

  for (const [relativeFile, edits] of [...grouped.entries()].sort(compareEntriesByKey)) {
    let originalText;
    try {
      originalText = await readFixtureText(relativeFile);
    } catch (error) {
      anomalies.push({
        type: "missing-file",
        file: relativeFile,
        message: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    originals.set(relativeFile, originalText);
    const editsWithOffsets = [];

    for (const edit of edits) {
      try {
        const offsets = rangeToOffsets(originalText, edit.range);
        const oldText = originalText.slice(offsets.start, offsets.end);
        const status = expectedOldTexts.includes(oldText) ? "ok" : "old-text-mismatch";
        const record = {
          file: relativeFile,
          range: normalizeRangeForSnapshot(edit.range),
          oldText,
          newText: edit.newText,
          source: edit.source,
          status,
        };
        validation.push(record);
        if (status !== "ok") {
          anomalies.push({
            type: "old-text-mismatch",
            file: relativeFile,
            range: normalizeRangeForSnapshot(edit.range),
            expectedOldTexts,
            actualOldText: oldText,
            newText: edit.newText,
          });
        }
        editsWithOffsets.push({ ...edit, ...offsets, oldText });
      } catch (error) {
        anomalies.push({
          type: "invalid-range",
          file: relativeFile,
          range: normalizeRangeForSnapshot(edit.range),
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const sorted = editsWithOffsets.sort((left, right) => {
      if (left.start !== right.start) {
        return left.start - right.start;
      }
      return left.end - right.end;
    });

    let previous = null;
    for (const edit of sorted) {
      if (previous && edit.start < previous.end) {
        anomalies.push({
          type: "overlapping-edit",
          file: relativeFile,
          previousRange: normalizeRangeForSnapshot(previous.range),
          range: normalizeRangeForSnapshot(edit.range),
        });
      }
      previous = edit;
    }

    replacements.set(relativeFile, sorted);
  }

  validation.sort(compareValidationRecords);

  if (anomalies.length > 0) {
    return {
      expectedOldTexts,
      outcome: "apply-anomaly",
      editCount: collected.edits.length,
      filesTouched: [...grouped.keys()].sort(),
      validation,
      anomalies,
      diffs: "",
    };
  }

  const diffs = [];
  const filesTouched = [];
  for (const [relativeFile, edits] of [...replacements.entries()].sort(compareEntriesByKey)) {
    const originalText = originals.get(relativeFile);
    let nextText = originalText;
    for (const edit of [...edits].sort((left, right) => right.start - left.start)) {
      nextText = nextText.slice(0, edit.start) + edit.newText + nextText.slice(edit.end);
    }

    if (nextText !== originalText) {
      filesTouched.push(relativeFile);
      diffs.push(renderUnifiedDiff(relativeFile, originalText, nextText));
    }
  }

  return {
    expectedOldTexts,
    outcome: diffs.length > 0 ? "applied" : "no-change",
    editCount: collected.edits.length,
    filesTouched,
    validation,
    anomalies: [],
    diffs: diffs.join("\n"),
  };
}

function emptyApplyResult(outcome, expectedOldTexts) {
  return {
    expectedOldTexts,
    outcome,
    editCount: 0,
    filesTouched: [],
    validation: [],
    anomalies: [],
    diffs: "",
  };
}

function collectWorkspaceTextEdits(workspaceEdit) {
  const edits = [];
  const unsupported = [];

  if (workspaceEdit.changes && typeof workspaceEdit.changes === "object") {
    for (const uri of Object.keys(workspaceEdit.changes).sort()) {
      const textEdits = Array.isArray(workspaceEdit.changes[uri]) ? workspaceEdit.changes[uri] : [];
      for (const edit of textEdits) {
        edits.push({
          uri,
          range: edit.range,
          newText: edit.newText ?? "",
          source: "changes",
        });
      }
    }
  }

  if (Array.isArray(workspaceEdit.documentChanges)) {
    for (const change of workspaceEdit.documentChanges) {
      if (Array.isArray(change?.edits) && change.textDocument?.uri) {
        for (const edit of change.edits) {
          edits.push({
            uri: change.textDocument.uri,
            range: edit.range,
            newText: edit.newText ?? "",
            source: "documentChanges",
          });
        }
        continue;
      }

      unsupported.push({
        type: "unsupported-document-change",
        change: normalizeSnapshotValue(change),
      });
    }
  }

  edits.sort(compareTextEditRecords);
  return { edits, unsupported };
}

function compareTextEditRecords(left, right) {
  return (
    left.uri.localeCompare(right.uri) ||
    compareRanges(left.range, right.range) ||
    left.newText.localeCompare(right.newText) ||
    left.source.localeCompare(right.source)
  );
}

function compareRanges(left, right) {
  return (
    left.start.line - right.start.line ||
    left.start.character - right.start.character ||
    left.end.line - right.end.line ||
    left.end.character - right.end.character
  );
}

function compareOptionalRanges(left, right) {
  const leftIsRange = isRange(left);
  const rightIsRange = isRange(right);
  if (!leftIsRange || !rightIsRange) {
    return Number(leftIsRange) - Number(rightIsRange);
  }
  return compareRanges(left, right);
}

function compareEntriesByKey(left, right) {
  return left[0].localeCompare(right[0]);
}

function compareValidationRecords(left, right) {
  return (
    left.file.localeCompare(right.file) ||
    compareRanges(left.range, right.range) ||
    left.newText.localeCompare(right.newText) ||
    left.source.localeCompare(right.source)
  );
}

function resolveAnchorPosition(text, probe) {
  const anchorText = requiredString(probe.anchor, `${probe.id}.anchor`);
  const anchorOccurrence = positiveInteger(probe.occurrence ?? 1, `${probe.id}.occurrence`);
  const anchorOffset = nthIndexOf(text, anchorText, anchorOccurrence);
  if (anchorOffset === -1) {
    throw new HarnessError(
      `Anchor ${JSON.stringify(anchorText)} occurrence ${anchorOccurrence} not found for probe ${probe.id}.`,
    );
  }

  const atText = probe.at ?? anchorText;
  const atOccurrence = positiveInteger(probe.atOccurrence ?? 1, `${probe.id}.atOccurrence`);
  const anchorSlice = text.slice(anchorOffset, anchorOffset + anchorText.length);
  const relativeAtOffset = nthIndexOf(anchorSlice, atText, atOccurrence);
  if (relativeAtOffset === -1) {
    throw new HarnessError(
      `at ${JSON.stringify(atText)} occurrence ${atOccurrence} not found inside anchor ${JSON.stringify(anchorText)} for probe ${probe.id}.`,
    );
  }

  const offset = anchorOffset + relativeAtOffset;
  const position = offsetToPosition(text, offset);
  return {
    anchorText,
    anchorOccurrence,
    atText,
    atOccurrence,
    offset,
    position,
    displayPosition: `${position.line + 1}:${position.character + 1}`,
    identifierAtCursor: identifierAtOffset(text, offset),
  };
}

function requiredString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new HarnessError(`${label} must be a non-empty string.`);
  }
  return value;
}

function positiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) {
    throw new HarnessError(`${label} must be a positive integer.`);
  }
  return value;
}

function nthIndexOf(text, search, occurrence) {
  let fromIndex = 0;
  for (let seen = 0; seen < occurrence; seen += 1) {
    const found = text.indexOf(search, fromIndex);
    if (found === -1) {
      return -1;
    }
    if (seen === occurrence - 1) {
      return found;
    }
    fromIndex = found + search.length;
  }
  return -1;
}

function identifierAtOffset(text, offset) {
  if (!isIdentifierCharacter(text[offset])) {
    return "";
  }

  let start = offset;
  while (start > 0 && isIdentifierCharacter(text[start - 1])) {
    start -= 1;
  }

  let end = offset;
  while (end < text.length && isIdentifierCharacter(text[end])) {
    end += 1;
  }

  return text.slice(start, end);
}

function isIdentifierCharacter(char) {
  return Boolean(char && /[A-Za-z0-9_$]/u.test(char));
}

function offsetToPosition(text, offset) {
  const lineStarts = computeLineStarts(text);
  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lineStarts[mid] <= offset) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  const line = Math.max(0, high);
  return {
    line,
    character: offset - lineStarts[line],
  };
}

function computeLineStarts(text) {
  const starts = [0];
  for (let index = 0; index < text.length; index += 1) {
    if (text.charCodeAt(index) === 10) {
      starts.push(index + 1);
    }
  }
  return starts;
}

function rangeToOffsets(text, range) {
  if (!isRange(range)) {
    throw new HarnessError(`Invalid range: ${JSON.stringify(range)}`);
  }
  const start = positionToOffset(text, range.start);
  const end = positionToOffset(text, range.end);
  if (end < start) {
    throw new HarnessError(`Range end is before start: ${JSON.stringify(range)}`);
  }
  return { start, end };
}

function positionToOffset(text, position) {
  const lineStarts = computeLineStarts(text);
  if (position.line < 0 || position.line >= lineStarts.length) {
    throw new HarnessError(`Line ${position.line} is outside document with ${lineStarts.length} lines.`);
  }

  const lineStart = lineStarts[position.line];
  const nextLineStart = lineStarts[position.line + 1] ?? text.length;
  let lineEnd = nextLineStart;
  if (lineEnd > lineStart && text.charCodeAt(lineEnd - 1) === 10) {
    lineEnd -= 1;
  }
  if (lineEnd > lineStart && text.charCodeAt(lineEnd - 1) === 13) {
    lineEnd -= 1;
  }

  const lineLength = lineEnd - lineStart;
  if (position.character < 0 || position.character > lineLength) {
    throw new HarnessError(
      `Character ${position.character} is outside line ${position.line} with length ${lineLength}.`,
    );
  }

  return lineStart + position.character;
}

function readRangeText(text, range) {
  const offsets = rangeToOffsets(text, range);
  return text.slice(offsets.start, offsets.end);
}

function renderSnapshot({ fixtureName, fixtureRoot, lane, probeFile, probes, selectedProbe }) {
  const lines = [];
  lines.push(`# ${fixtureName} ${lane} lane snapshot`);
  lines.push("");
  lines.push(`Fixture: \`${toRepoRelative(fixtureRoot)}\``);
  lines.push(`Probe file: \`${toRepoRelative(probeFile)}\``);
  lines.push(`Lane: \`${lane}\``);
  if (selectedProbe) {
    lines.push(`Probe filter: \`${selectedProbe}\``);
  }
  lines.push("");
  lines.push("This snapshot records observed language-server behavior. Operator verdicts live in the probe data.");
  lines.push("");

  for (const result of probes) {
    lines.push(`## ${result.probe.id}`);
    lines.push("");
    lines.push("### Probe");
    lines.push("");
    lines.push(fencedJson(probeSummary(result)));
    lines.push("");
    renderLaneSnapshotSections(lines, result);
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function renderLaneSnapshotSections(lines, result) {
  switch (result.lane) {
    case "rename":
      lines.push("### prepareRename");
      lines.push("");
      lines.push(fencedJson(summarizeRpcResponse(result.prepareResponse)));
      lines.push("");
      lines.push("### rename");
      lines.push("");
      lines.push(fencedJson(summarizeRpcResponse(result.renameResponse)));
      lines.push("");
      lines.push("### Notifications");
      lines.push("");
      lines.push(fencedJson(summarizeNotifications(result.renameNotifications)));
      lines.push("");
      lines.push("### In-memory apply");
      lines.push("");
      lines.push(fencedJson(applySummary(result.apply)));
      lines.push("");
      lines.push("### Applied diff");
      lines.push("");
      if (result.apply.diffs) {
        lines.push("```diff");
        lines.push(result.apply.diffs.trimEnd());
        lines.push("```");
      } else {
        lines.push("_No in-memory diff._");
      }
      return;
    case "references":
      lines.push("### references");
      lines.push("");
      lines.push(fencedJson(summarizeRpcResponse(result.referencesResponse)));
      lines.push("");
      lines.push("### Resolved locations");
      lines.push("");
      lines.push(fencedJson({
        locationCount: result.locations.length,
        locations: result.locations,
      }));
      return;
    case "definition":
      lines.push("### definition");
      lines.push("");
      lines.push(fencedJson(summarizeRpcResponse(result.definitionResponse)));
      lines.push("");
      lines.push("### Resolved locations");
      lines.push("");
      lines.push(fencedJson({
        locationCount: result.locations.length,
        locations: result.locations,
      }));
      return;
    case "documentHighlight":
      lines.push("### documentHighlight");
      lines.push("");
      lines.push(fencedJson(summarizeRpcResponse(result.documentHighlightResponse)));
      lines.push("");
      lines.push("### Resolved highlights");
      lines.push("");
      lines.push(fencedJson({
        highlightCount: result.highlights.length,
        highlights: result.highlights,
      }));
      return;
    case "hover":
      lines.push("### hover");
      lines.push("");
      lines.push(fencedJson(summarizeHoverResponse(result.hoverResponse)));
      lines.push("");
      lines.push("### Hover markdown");
      lines.push("");
      {
        const markdown = hoverMarkdown(result.hoverResponse);
        if (markdown.value.length > 0) {
          lines.push(fencedBlock("markdown", markdown.value.trimEnd()));
        } else {
          lines.push("_No hover markdown._");
        }
      }
      return;
    case "completions": {
      const { membership, mismatches, ...aggregates } = result.completionSummary;
      lines.push("### completion");
      lines.push("");
      lines.push(fencedJson(aggregates));
      lines.push("");
      lines.push("### Membership");
      lines.push("");
      lines.push(fencedJson({ mismatches, watched: membership }));
      return;
    }
    case "diagnostics":
      lines.push("### publishDiagnostics");
      lines.push("");
      lines.push(fencedJson(result.publishSummary));
      lines.push("");
      lines.push("### aurelia/getDiagnostics");
      lines.push("");
      lines.push(fencedJson(result.customSummary));
      lines.push("");
      lines.push("### Alignment");
      lines.push("");
      lines.push(fencedJson(result.alignment));
      return;
    case "codeAction":
      lines.push("### codeAction");
      lines.push("");
      lines.push(fencedJson(summarizeCodeActionResponse(result.codeActionResponse)));
      lines.push("");
      lines.push("### Context diagnostics");
      lines.push("");
      lines.push(fencedJson({
        diagnosticCount: result.codeActionDiagnostics.length,
        diagnostics: result.codeActionDiagnostics.map((diagnostic) => ({
          code: normalizeSnapshotValue(diagnostic?.code ?? null),
          message: normalizeSnapshotString(String(diagnostic?.message ?? "")),
          source: diagnostic?.source ?? null,
          range: isRange(diagnostic?.range) ? normalizeRangeForSnapshot(diagnostic.range) : normalizeSnapshotValue(diagnostic?.range ?? null),
          data: summarizeDiagnosticData(diagnostic?.data),
        })),
      }));
      lines.push("");
      lines.push("### Actions");
      lines.push("");
      lines.push(fencedJson({
        actionCount: result.actions.length,
        actions: result.actions.map((action) => {
          const summary = { ...action };
          delete summary.apply;
          return summary;
        }),
      }));
      lines.push("");
      lines.push("### In-memory apply");
      lines.push("");
      lines.push(fencedJson({
        expectedOldTexts: result.expectedOldTexts,
        actions: result.actions.map((action) => ({
          index: action.index,
          title: action.title,
          ...applySummary(action.apply),
        })),
      }));
      lines.push("");
      lines.push("### Applied diffs");
      lines.push("");
      if (result.actions.some((action) => action.apply.diffs)) {
        for (const action of result.actions) {
          lines.push(`#### ${action.index}: ${action.title || "(untitled action)"}`);
          lines.push("");
          if (action.apply.diffs) {
            lines.push("```diff");
            lines.push(action.apply.diffs.trimEnd());
            lines.push("```");
          } else {
            lines.push("_No in-memory diff._");
          }
          lines.push("");
        }
      } else {
        lines.push("_No in-memory diff._");
      }
      return;
    default:
      throw new HarnessError(`Unsupported result lane: ${result.lane}`);
  }
}

function probeSummary(result) {
  const summary = {
    file: result.relativeFile,
  };
  if (result.anchor != null) {
    summary.anchor = result.anchor.anchorText;
    summary.occurrence = result.anchor.anchorOccurrence;
    summary.at = result.anchor.atText;
    summary.atOccurrence = result.anchor.atOccurrence;
    summary.lspPosition = result.anchor.position;
    summary.displayPosition = `${result.relativeFile}:${result.anchor.displayPosition}`;
  }
  if (result.probe.newName != null) {
    summary.newName = result.probe.newName;
  }
  return summary;
}

function summarizeRpcResponse(response) {
  if (response.error) {
    return {
      outcome: "error",
      error: normalizeSnapshotValue(response.error),
    };
  }
  return {
    outcome: "result",
    result: normalizeSnapshotValue(response.result),
  };
}

function summarizeHoverResponse(response) {
  if (response.error) {
    return {
      outcome: "error",
      error: normalizeSnapshotValue(response.error),
    };
  }
  if (response.result == null) {
    return {
      outcome: "result",
      result: null,
    };
  }

  const markdown = hoverMarkdown(response);
  return {
    outcome: "result",
    result: {
      contentsKind: markdown.kind,
      markdownCharacters: markdown.value.length,
      range: normalizeSnapshotValue(response.result.range ?? null),
    },
  };
}

function summarizeCodeActionResponse(response) {
  if (response.error) {
    return {
      outcome: "error",
      error: normalizeSnapshotValue(response.error),
    };
  }
  if (response.result == null) {
    return {
      outcome: "result",
      result: null,
    };
  }
  if (!Array.isArray(response.result)) {
    return {
      outcome: "result",
      result: normalizeSnapshotValue(response.result),
    };
  }
  return {
    outcome: "result",
    actionCount: response.result.length,
    actions: response.result.map((action) => ({
      title: String(action?.title ?? ""),
      kind: action?.kind ?? null,
      isPreferred: action?.isPreferred ?? null,
      hasEdit: action?.edit != null,
      hasCommand: action?.command != null,
      diagnosticCount: Array.isArray(action?.diagnostics) ? action.diagnostics.length : 0,
    })),
  };
}

function summarizeNotifications(notifications) {
  return {
    notificationCount: notifications.length,
    notifications: notifications.map((notification) => normalizeSnapshotValue(notification)),
  };
}

function hoverMarkdown(response) {
  if (response.error || response.result == null) {
    return { kind: null, value: "" };
  }

  const contents = response.result.contents;
  if (typeof contents === "string") {
    return { kind: "plaintext", value: contents };
  }
  if (Array.isArray(contents)) {
    return {
      kind: "marked-string[]",
      value: contents.map(markedStringText).filter((part) => part.length > 0).join("\n\n"),
    };
  }
  if (contents && typeof contents === "object") {
    if (typeof contents.value === "string" && typeof contents.language === "string") {
      return {
        kind: "marked-string",
        value: `\`\`\`${contents.language}\n${contents.value.trimEnd()}\n\`\`\``,
      };
    }
    if (typeof contents.value === "string") {
      return {
        kind: typeof contents.kind === "string" ? contents.kind : "markup",
        value: contents.value,
      };
    }
  }

  return { kind: null, value: "" };
}

function markedStringText(value) {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object" && typeof value.value === "string") {
    if (typeof value.language === "string") {
      return `\`\`\`${value.language}\n${value.value.trimEnd()}\n\`\`\``;
    }
    return value.value;
  }
  return "";
}

function applySummary(apply) {
  return {
    outcome: apply.outcome,
    expectedOldTexts: apply.expectedOldTexts,
    editCount: apply.editCount,
    filesTouched: apply.filesTouched,
    validation: apply.validation,
    anomalies: normalizeSnapshotValue(apply.anomalies),
  };
}

function fencedJson(value) {
  return `\`\`\`json\n${stableStringify(value)}\n\`\`\``;
}

function fencedBlock(info, value) {
  const cleanValue = value.split("\n").map((line) => line.trimEnd()).join("\n");
  const maxRun = Math.max(2, ...[...cleanValue.matchAll(/`+/gu)].map((match) => match[0].length));
  const fence = "`".repeat(maxRun + 1);
  return `${fence}${info}\n${cleanValue}\n${fence}`;
}

function stableStringify(value) {
  return JSON.stringify(sortJson(value), null, 2);
}

function sortJson(value) {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }
  if (value && typeof value === "object") {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortJson(value[key]);
    }
    return sorted;
  }
  return value;
}

function normalizeSnapshotValue(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeSnapshotValue);
  }
  if (value && typeof value === "object") {
    if (looksLikeWorkspaceEdit(value)) {
      return normalizeWorkspaceEditForSnapshot(value);
    }
    const normalized = {};
    for (const key of Object.keys(value).sort()) {
      normalized[key] = normalizeSnapshotValue(value[key]);
    }
    return normalized;
  }
  if (typeof value === "string") {
    return normalizeSnapshotString(value);
  }
  return value;
}

function looksLikeWorkspaceEdit(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      (Object.prototype.hasOwnProperty.call(value, "changes") ||
        Object.prototype.hasOwnProperty.call(value, "documentChanges")),
  );
}

function normalizeWorkspaceEditForSnapshot(workspaceEdit) {
  const normalized = {};

  if (workspaceEdit.changes && typeof workspaceEdit.changes === "object") {
    normalized.changes = {};
    for (const uri of Object.keys(workspaceEdit.changes).sort()) {
      normalized.changes[normalizeSnapshotString(uri)] = [...workspaceEdit.changes[uri]]
        .sort(compareLspTextEdits)
        .map(normalizeSnapshotValue);
    }
  }

  if (Array.isArray(workspaceEdit.documentChanges)) {
    normalized.documentChanges = workspaceEdit.documentChanges.map(normalizeSnapshotValue);
  }

  if (workspaceEdit.changeAnnotations && typeof workspaceEdit.changeAnnotations === "object") {
    normalized.changeAnnotations = normalizeSnapshotValue(workspaceEdit.changeAnnotations);
  }

  return normalized;
}

function compareLspTextEdits(left, right) {
  return compareRanges(left.range, right.range) || String(left.newText ?? "").localeCompare(String(right.newText ?? ""));
}

function normalizeSnapshotString(value) {
  if (value.startsWith("file:")) {
    try {
      const fsPath = fileURLToPath(value);
      const fixtureRelative = relativePathIfInside(path.resolve(REPO_ROOT, "packages/semantic-runtime/fixtures"), fsPath);
      if (fixtureRelative) {
        return `fixtures://${fixtureRelative}`;
      }
      const repoRelative = relativePathIfInside(REPO_ROOT, fsPath);
      if (repoRelative) {
        return `repo://${repoRelative}`;
      }
    } catch {
      return value;
    }
  }

  return value
    .replaceAll(toPosix(REPO_ROOT), "repo://")
    .replaceAll(REPO_ROOT, "repo://")
    .replaceAll("\\", "/");
}

function renderUnifiedDiff(relativeFile, oldText, newText) {
  const oldLines = splitLinesForDiff(oldText);
  const newLines = splitLinesForDiff(newText);
  const operations = diffLines(oldLines, newLines);
  const oldCount = oldLines.length;
  const newCount = newLines.length;
  const lines = [
    `diff --git a/${relativeFile} b/${relativeFile}`,
    `--- a/${relativeFile}`,
    `+++ b/${relativeFile}`,
    `@@ -${oldCount === 0 ? 0 : 1},${oldCount} +${newCount === 0 ? 0 : 1},${newCount} @@`,
  ];

  for (const operation of operations) {
    const line = operation.line.trimEnd();
    if (operation.type === "equal") {
      lines.push(line.length === 0 ? "" : ` ${line}`);
    } else if (operation.type === "delete") {
      lines.push(`-${line}`);
    } else {
      lines.push(`+${line}`);
    }
  }

  return lines.join("\n");
}

function splitLinesForDiff(text) {
  const normalized = text.replace(/\r\n/gu, "\n").replace(/\r/gu, "\n");
  const lines = normalized.split("\n");
  if (lines.at(-1) === "") {
    lines.pop();
  }
  return lines;
}

function diffLines(oldLines, newLines) {
  const table = Array.from({ length: oldLines.length + 1 }, () => Array(newLines.length + 1).fill(0));
  for (let oldIndex = oldLines.length - 1; oldIndex >= 0; oldIndex -= 1) {
    for (let newIndex = newLines.length - 1; newIndex >= 0; newIndex -= 1) {
      if (oldLines[oldIndex] === newLines[newIndex]) {
        table[oldIndex][newIndex] = table[oldIndex + 1][newIndex + 1] + 1;
      } else {
        table[oldIndex][newIndex] = Math.max(table[oldIndex + 1][newIndex], table[oldIndex][newIndex + 1]);
      }
    }
  }

  const operations = [];
  let oldIndex = 0;
  let newIndex = 0;
  while (oldIndex < oldLines.length && newIndex < newLines.length) {
    if (oldLines[oldIndex] === newLines[newIndex]) {
      operations.push({ type: "equal", line: oldLines[oldIndex] });
      oldIndex += 1;
      newIndex += 1;
    } else if (table[oldIndex + 1][newIndex] >= table[oldIndex][newIndex + 1]) {
      operations.push({ type: "delete", line: oldLines[oldIndex] });
      oldIndex += 1;
    } else {
      operations.push({ type: "insert", line: newLines[newIndex] });
      newIndex += 1;
    }
  }

  while (oldIndex < oldLines.length) {
    operations.push({ type: "delete", line: oldLines[oldIndex] });
    oldIndex += 1;
  }

  while (newIndex < newLines.length) {
    operations.push({ type: "insert", line: newLines[newIndex] });
    newIndex += 1;
  }

  return operations;
}

function normalizeRangeForSnapshot(range) {
  return {
    start: {
      line: range.start.line,
      character: range.start.character,
    },
    end: {
      line: range.end.line,
      character: range.end.character,
    },
  };
}

function resolveFixturePath(fixtureRoot, relativeFile) {
  const normalized = normalizeRelativePath(relativeFile);
  const absoluteFile = path.resolve(fixtureRoot, normalized);
  const relative = path.relative(fixtureRoot, absoluteFile);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new HarnessError(`Fixture path escapes fixture root: ${relativeFile}`);
  }
  return absoluteFile;
}

function normalizeRelativePath(file) {
  return toPosix(file).replace(/^\/+/u, "");
}

function uriToFixtureRelativePath(uri, fixtureRoot) {
  let fsPath;
  try {
    fsPath = fileURLToPath(uri);
  } catch {
    return null;
  }
  return relativePathIfInside(fixtureRoot, fsPath);
}

function relativePathIfInside(root, file) {
  const relative = path.relative(root, file);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  return toPosix(relative);
}

function toRepoRelative(file) {
  return toPosix(path.relative(REPO_ROOT, file));
}

function toPosix(file) {
  return file.replaceAll(path.sep, "/").replaceAll("\\", "/");
}

function describeSnapshotMismatch(existing, next) {
  const existingLines = existing.split("\n");
  const nextLines = next.split("\n");
  const max = Math.max(existingLines.length, nextLines.length);
  for (let index = 0; index < max; index += 1) {
    if (existingLines[index] !== nextLines[index]) {
      return [
        `First difference at line ${index + 1}.`,
        `Expected: ${existingLines[index] ?? "<missing>"}`,
        `Received: ${nextLines[index] ?? "<missing>"}`,
        "Re-run with --update if this observed behavior change is intentional.",
      ].join("\n");
    }
  }
  return "Snapshot text differs. Re-run with --update if intentional.";
}

function printSummary(results) {
  const rows = results.map(summaryRowForResult);

  const columns = [
    ["probe", "id"],
    ["outcome", "outcome"],
    ["count", "count"],
    ["files", "files"],
    ["verdict", "verdict"],
  ];
  const widths = Object.fromEntries(
    columns.map(([label, key]) => [
      key,
      Math.max(label.length, ...rows.map((row) => row[key].length)),
    ]),
  );

  console.log("");
  console.log(
    columns.map(([label, key]) => label.padEnd(widths[key])).join("  "),
  );
  console.log(
    columns.map(([, key]) => "-".repeat(widths[key])).join("  "),
  );
  for (const row of rows) {
    console.log(
      columns.map(([, key]) => row[key].padEnd(widths[key])).join("  "),
    );
  }
}

function summaryRowForResult(result) {
  switch (result.lane) {
    case "rename":
      return {
        id: result.probe.id,
        outcome: result.apply.outcome,
        count: String(result.apply.editCount),
        files: result.apply.filesTouched.length > 0 ? result.apply.filesTouched.join(",") : "-",
        verdict: result.probe.verdict ?? "undecided",
      };
    case "references": {
      const files = [...new Set(result.locations.map((location) => location.file).filter(Boolean))].sort();
      return {
        id: result.probe.id,
        outcome: result.referencesResponse.error ? "error" : result.locations.length > 0 ? "result" : "no-locations",
        count: String(result.locations.length),
        files: files.length > 0 ? files.join(",") : "-",
        verdict: result.probe.verdict ?? "undecided",
      };
    }
    case "definition": {
      const files = [...new Set(result.locations.map((location) => location.file).filter(Boolean))].sort();
      return {
        id: result.probe.id,
        outcome: result.definitionResponse.error ? "error" : result.locations.length > 0 ? "result" : "no-locations",
        count: String(result.locations.length),
        files: files.length > 0 ? files.join(",") : "-",
        verdict: result.probe.verdict ?? "undecided",
      };
    }
    case "documentHighlight":
      return {
        id: result.probe.id,
        outcome: result.documentHighlightResponse.error
          ? "error"
          : result.highlights.length > 0
            ? "result"
            : "no-highlights",
        count: String(result.highlights.length),
        files: result.highlights.length > 0 ? result.relativeFile : "-",
        verdict: result.probe.verdict ?? "undecided",
      };
    case "hover":
      return {
        id: result.probe.id,
        outcome: result.hoverResponse.error ? "error" : result.hoverResponse.result == null ? "no-hover" : "result",
        count: result.hoverResponse.result == null ? "0" : "1",
        files: "-",
        verdict: result.probe.verdict ?? "undecided",
      };
    case "completions": {
      const summary = result.completionSummary;
      return {
        id: result.probe.id,
        outcome: summary.outcome === "error"
          ? "error"
          : summary.mismatches > 0
            ? `watch-mismatch:${summary.mismatches}`
            : summary.outcome,
        count: String(summary.totalItems ?? 0),
        files: "-",
        verdict: result.probe.verdict ?? "undecided",
      };
    }
    case "diagnostics":
      return {
        id: result.probe.id,
        outcome: result.publishSummary.outcome === "published"
          ? result.alignment.countsMatch
            ? "published"
            : "alignment-mismatch"
          : result.publishSummary.outcome,
        count: String(result.publishSummary.diagnosticCount ?? 0),
        files: result.relativeFile,
        verdict: result.probe.verdict ?? "undecided",
      };
    case "codeAction": {
      const files = [...new Set(result.actions.flatMap((action) => action.apply.filesTouched))].sort();
      const anomalous = result.actions.filter((action) => action.apply.anomalies.length > 0).length;
      return {
        id: result.probe.id,
        outcome: result.codeActionResponse.error
          ? "error"
          : anomalous > 0
            ? `apply-anomaly:${anomalous}`
            : result.actions.length > 0
              ? "result"
              : "no-actions",
        count: String(result.actions.length),
        files: files.length > 0 ? files.join(",") : "-",
        verdict: result.probe.verdict ?? "undecided",
      };
    }
    default:
      throw new HarnessError(`Unsupported result lane: ${result.lane}`);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
