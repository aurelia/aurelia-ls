/**
 * Smoke test for the bundled language server.
 *
 * Verifies that the bundled server can:
 * 1. Start up without crashing
 * 2. Respond to LSP initialize request
 * 3. Shut down cleanly
 *
 * This catches bundle configuration issues, missing dependencies, etc.
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createMessageConnection } from "vscode-jsonrpc/node";
import { test, expect, afterEach } from "vitest";
import {
  createExperimentalWorkerCancellationStrategy,
  createExperimentalWorkerMessageTransports,
} from "../../out/worker-transport.js";

const VSCODE_PACKAGE_ROOT = path.resolve(import.meta.dirname, "../..");
const SERVER_PATH = path.resolve(VSCODE_PACKAGE_ROOT, "dist/server/main.cjs");
const BUNDLE_SCRIPT = path.resolve(VSCODE_PACKAGE_ROOT, "esbuild.mjs");

function ensureBundledServer(): void {
  const result = spawnSync("node", [BUNDLE_SCRIPT], {
    cwd: VSCODE_PACKAGE_ROOT,
    stdio: "pipe",
    encoding: "utf8",
  });

  if (result.status !== 0 || !existsSync(SERVER_PATH)) {
    throw new Error(
      `Failed to build bundled server.\nstdout:\n${result.stdout ?? ""}\nstderr:\n${result.stderr ?? ""}`,
    );
  }
}

/** JSON-RPC message header */
function makeHeader(content: string): string {
  return `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n${content}`;
}

/** Send a JSON-RPC request */
function sendRequest(process: ChildProcess, id: number, method: string, params: unknown): void {
  const body = JSON.stringify({ jsonrpc: "2.0", id, method, params });
  process.stdin!.write(makeHeader(body));
}

/** Send a JSON-RPC notification (no id) */
function sendNotification(process: ChildProcess, method: string, params?: unknown): void {
  const body = JSON.stringify({ jsonrpc: "2.0", method, params });
  process.stdin!.write(makeHeader(body));
}

/** Parse JSON-RPC messages from stdout buffer */
function parseMessages(data: string): Array<{ id?: number; result?: unknown; error?: unknown }> {
  const messages: Array<{ id?: number; result?: unknown; error?: unknown }> = [];
  const parts = data.split(/Content-Length: \d+\r\n\r\n/);
  for (const part of parts) {
    if (part.trim()) {
      try {
        messages.push(JSON.parse(part) as { id?: number; result?: unknown; error?: unknown });
      } catch {
        // partial message, ignore
      }
    }
  }
  return messages;
}

let serverProcess: ChildProcess | null = null;

afterEach(() => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
    serverProcess = null;
  }
});

test("bundled server initializes and confirms semantic workspace shape", async () => {
  ensureBundledServer();

  serverProcess = spawn("node", [SERVER_PATH, "--stdio"], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  const output: string[] = [];
  const errors: string[] = [];

  serverProcess.stdout!.on("data", (data: Buffer) => {
    output.push(data.toString());
  });

  serverProcess.stderr!.on("data", (data: Buffer) => {
    errors.push(data.toString());
  });

  const workspaceRoot = path.resolve(VSCODE_PACKAGE_ROOT, "../../fixtures/hello-world");

  // Send initialize request
  sendRequest(serverProcess, 1, "initialize", {
    processId: process.pid,
    capabilities: {},
    rootUri: pathToFileURL(workspaceRoot).toString(),
  });

  // Wait for response
  const response = await new Promise<{ id?: number; result?: { capabilities?: unknown }; error?: unknown }>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Server did not respond within 5s. Errors: ${errors.join("")}`));
    }, 5000);

    const check = () => {
      const combined = output.join("");
      const messages = parseMessages(combined);
      const initResponse = messages.find((m) => m.id === 1);
      if (initResponse) {
        clearTimeout(timeout);
        resolve(initResponse);
      }
    };

    serverProcess!.stdout!.on("data", check);
  });

  expect(response.error, "initialize should not return an error").toBeUndefined();
  expect(response.result, "initialize should return a result").toBeDefined();
  expect(response.result?.capabilities, "server should return capabilities").toBeDefined();

  // Send initialized notification
  sendNotification(serverProcess, "initialized", {});

  sendRequest(serverProcess, 2, "aurelia/workspaceStatus", null);
  const statusResponse = await waitForResponse<{
    projectAnalysisCounts?: Array<{ analysisKind: string; count: number }>;
  }>(2, output, errors);
  expect(statusResponse.error, "workspace status should not return an error").toBeUndefined();
  expect(statusResponse.result?.projectAnalysisCounts).toContainEqual(
    expect.objectContaining({ analysisKind: "app-world", count: 1 }),
  );

  // Send shutdown request
  sendRequest(serverProcess, 3, "shutdown", null);

  // Wait briefly for shutdown response
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Send exit notification
  sendNotification(serverProcess, "exit");

  // Wait for process to exit
  const exitCode = await new Promise<number | null>((resolve) => {
    const timeout = setTimeout(() => {
      serverProcess!.kill();
      resolve(null);
    }, 2000);

    serverProcess!.on("exit", (code) => {
      clearTimeout(timeout);
      resolve(code);
    });
  });

  expect(exitCode, "server should exit cleanly").toBe(0);
}, 20000);

test("bundled server initializes over Worker transport and exits cleanly", async () => {
  ensureBundledServer();

  const transports = createExperimentalWorkerMessageTransports(SERVER_PATH);
  const connection = createMessageConnection(
    transports.reader,
    transports.writer,
    undefined,
    { cancellationStrategy: createExperimentalWorkerCancellationStrategy() },
  );
  connection.listen();

  try {
    const workspaceRoot = path.resolve(VSCODE_PACKAGE_ROOT, "../../fixtures/hello-world");
    const initializeResult = await connection.sendRequest<{
      capabilities?: unknown;
    }>("initialize", {
      processId: process.pid,
      capabilities: {},
      rootUri: pathToFileURL(workspaceRoot).toString(),
    });

    expect(initializeResult.capabilities, "server should return capabilities").toBeDefined();

    await connection.sendNotification("initialized", {});

    const status = await connection.sendRequest<{
      projectAnalysisCounts?: Array<{ analysisKind: string; count: number }>;
    }>("aurelia/workspaceStatus", null);
    expect(status.projectAnalysisCounts).toContainEqual(
      expect.objectContaining({ analysisKind: "app-world", count: 1 }),
    );

    await connection.sendRequest("shutdown", null);
    const exited = once(transports.worker, "exit");
    await connection.sendNotification("exit");
    const [exitCode] = await exited as [number];

    expect(exitCode, "Worker server should exit cleanly").toBe(0);
  } finally {
    connection.end();
    connection.dispose();
    if (transports.worker.threadId !== -1) {
      await transports.worker.terminate();
    }
  }
}, 20000);

function waitForResponse<T>(
  id: number,
  output: string[],
  errors: string[],
): Promise<{ id?: number; result?: T; error?: unknown }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Server did not respond to request ${id} within 10s. Errors: ${errors.join("")}`));
    }, 10_000);
    const check = () => {
      const response = parseMessages(output.join("")).find((message) => message.id === id);
      if (response == null) return;
      clearTimeout(timeout);
      resolve(response as { id?: number; result?: T; error?: unknown });
    };
    serverProcess!.stdout!.on("data", check);
    check();
  });
}
