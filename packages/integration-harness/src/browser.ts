import { spawn } from "node:child_process";
import { once } from "node:events";
import { request as requestHttp } from "node:http";
import { request as requestHttps } from "node:https";
import { createConnection } from "node:net";
import { URL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import type { BrowserRuntimeExpectation, DomExpectation, DomScope } from "./schema.js";
import type { Browser, Page } from "playwright";

export interface BrowserInspection {
  url: string;
  rootSelector: string;
  hasRoot: boolean;
  hasController: boolean;
  attributeCounts: Record<string, number>;
  probeResults: Record<string, { ok: boolean; value?: unknown; error?: string }>;
  domResults: Array<{
    selector: string;
    scope: DomScope;
    count: number;
    texts: string[];
  }>;
}

export async function inspectBrowserRuntime(
  expectation: BrowserRuntimeExpectation,
): Promise<BrowserInspection> {
  const {
    url,
    start,
    cwd,
    root = "body",
    waitFor,
    timeoutMs = 30_000,
    headful = false,
    delayMs = 0,
    attrs = [],
    dom = [],
    probes = [],
  } = expectation;

  const runtime = await loadPlaywright();
  let child: ReturnType<typeof spawn> | null = null;
  let childProcessGroup = false;
  let browser: Browser | null = null;
  const hasServer = Boolean(start);

  try {
    if (start) {
      childProcessGroup = process.platform !== "win32";
      child = spawn(start, {
        cwd,
        shell: true,
        detached: childProcessGroup,
        stdio: "inherit",
        env: { ...process.env },
      });
      const ready = await waitForServer(url, timeoutMs);
      if (!ready) {
        throw new Error(`Server not ready at ${url} within ${timeoutMs}ms`);
      }
    }

    browser = await runtime.chromium.launch({ headless: !headful });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: timeoutMs });
    await page.waitForSelector(root, { timeout: timeoutMs });
    if (waitFor) {
      await page.waitForSelector(waitFor, { timeout: timeoutMs });
    }
    if (delayMs > 0) {
      await delay(delayMs);
    }

    const domResults = await evaluateDomExpectations(page, dom, root);
    const snapshot = await page.evaluate(
      ({ rootSelector, attrNames, probeList }) => {
        const ELEMENT_KEY = "au:resource:custom-element";
        const ATTR_PREFIX = "au:resource:custom-attribute:";

        const rootEl = document.querySelector(rootSelector) as (Element & { $au?: Record<string, unknown> }) | null;
        const rootCtrl = rootEl?.$au?.[ELEMENT_KEY] ?? null;

        function countAttributes() {
          const counts: Record<string, number> = {};
          const attrList = Array.isArray(attrNames) ? attrNames : [];
          const nodes = document.querySelectorAll("*");
          for (const node of nodes) {
            const refs = (node as Element & { $au?: Record<string, unknown> })?.$au;
            if (!refs) continue;
            for (const key of Object.keys(refs)) {
              if (!key.startsWith(ATTR_PREFIX)) continue;
              const name = key.slice(ATTR_PREFIX.length);
              if (attrList.length && !attrList.includes(name)) continue;
              counts[name] = (counts[name] ?? 0) + 1;
            }
          }
          return counts;
        }

        function runProbes() {
          const results: Record<string, { ok: boolean; value?: unknown; error?: string }> = {};
          for (const probe of probeList) {
            try {
              const fn = new Function("root", "rootCtrl", `return (${probe.expr});`);
              results[probe.name] = { ok: true, value: fn(rootEl, rootCtrl) };
            } catch (error) {
              results[probe.name] = { ok: false, error: String(error) };
            }
          }
          return results;
        }

        return {
          hasRoot: Boolean(rootEl),
          hasController: Boolean(rootCtrl),
          attributeCounts: countAttributes(),
          probeResults: runProbes(),
        };
      },
      { rootSelector: root, attrNames: attrs, probeList: probes },
    );

    return {
      url,
      rootSelector: root,
      hasRoot: snapshot.hasRoot,
      hasController: snapshot.hasController,
      attributeCounts: snapshot.attributeCounts,
      probeResults: snapshot.probeResults,
      domResults,
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignore cleanup errors
      }
    }
    if (child) {
      await stopProcess(child, childProcessGroup);
    }
    if (hasServer) {
      await ensurePortClosed(url, 4_000);
    }
  }
}

async function loadPlaywright(): Promise<typeof import("playwright")> {
  try {
    return await import("playwright");
  } catch (error) {
    throw new Error(`Playwright is required for browser runtime assertions: ${String(error)}`);
  }
}

async function waitForServer(url: string, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await pingServer(url);
    if (ok) return true;
    await delay(500);
  }
  return false;
}

async function pingServer(url: string): Promise<boolean> {
  const target = new URL(url);
  const request = target.protocol === "https:" ? requestHttps : requestHttp;
  return new Promise((resolve) => {
    const req = request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port,
        path: target.pathname,
        method: "GET",
      },
      (res) => {
        const ok = res.statusCode === 200 || res.statusCode === 304;
        res.resume();
        resolve(ok);
      },
    );
    req.on("error", () => resolve(false));
    req.end();
  });
}

async function stopProcess(
  child: ReturnType<typeof spawn>,
  useProcessGroup: boolean,
): Promise<void> {
  if (!child.pid) return;
  if (process.platform === "win32") {
    await killTreeWindows(child.pid);
    return;
  }

  if (child.exitCode !== null) return;

  await trySignal(child, "SIGINT", 2000, useProcessGroup);
  if (child.exitCode !== null) return;

  await trySignal(child, "SIGTERM", 2000, useProcessGroup);
  if (child.exitCode !== null) return;

  await trySignal(child, "SIGKILL", 2000, useProcessGroup);
}

async function trySignal(
  child: ReturnType<typeof spawn>,
  signal: NodeJS.Signals,
  timeoutMs: number,
  useProcessGroup: boolean,
): Promise<void> {
  const pid = child.pid;
  if (!pid) return;
  try {
    if (useProcessGroup && process.platform !== "win32") {
      process.kill(-pid, signal);
    } else {
      child.kill(signal);
    }
  } catch {
    return;
  }
  await Promise.race([
    once(child, "exit"),
    delay(timeoutMs),
  ]);
}

async function killTreeWindows(pid: number): Promise<void> {
  return new Promise((resolve) => {
    const killer = spawn("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    killer.on("exit", () => resolve());
    killer.on("error", () => resolve());
  });
}

async function evaluateDomExpectations(
  page: Page,
  expectations: readonly DomExpectation[],
  rootSelector: string,
): Promise<BrowserInspection["domResults"]> {
  const results: BrowserInspection["domResults"] = [];
  for (const expectation of expectations) {
    const scope = expectation.scope ?? "document";
    const root = scope === "host" ? `${rootSelector} ${expectation.selector}` : expectation.selector;
    const locator = page.locator(root);
    const count = await locator.count();
    const texts = (await locator.allTextContents()).map((text: string) => text.trim()).filter(Boolean);
    results.push({
      selector: expectation.selector,
      scope,
      count,
      texts,
    });
  }
  return results;
}

async function ensurePortClosed(url: string, timeoutMs: number): Promise<void> {
  const closed = await waitForPortToClose(url, timeoutMs);
  if (closed) return;
  if (process.platform !== "win32") return;
  await killPortWindows(url);
  await waitForPortToClose(url, timeoutMs);
}

async function waitForPortToClose(url: string, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const open = await isPortOpen(url);
    if (!open) return true;
    await delay(250);
  }
  return false;
}

async function isPortOpen(url: string): Promise<boolean> {
  const target = new URL(url);
  const port = target.port
    ? Number.parseInt(target.port, 10)
    : target.protocol === "https:" ? 443 : 80;
  const hosts = [target.hostname];
  if (target.hostname === "localhost") {
    hosts.push("127.0.0.1", "::1");
  }
  for (const host of hosts) {
    const ok = await tryConnect(host, port);
    if (ok) return true;
  }
  return false;
}

async function tryConnect(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection(
      { host, port },
      () => {
        socket.destroy();
        resolve(true);
      },
    );
    socket.on("error", () => resolve(false));
    socket.setTimeout(1500, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function killPortWindows(url: string): Promise<void> {
  const target = new URL(url);
  const port = target.port
    ? Number.parseInt(target.port, 10)
    : target.protocol === "https:" ? 443 : 80;
  const output = await readNetstat();
  const pids = new Set<number>();
  for (const line of output.split(/\r?\n/)) {
    if (!line.includes("LISTENING")) continue;
    if (!line.includes(`:${port}`)) continue;
    const parts = line.trim().split(/\s+/);
    const local = parts[1] ?? "";
    if (!local.endsWith(`:${port}`)) continue;
    const pid = Number.parseInt(parts[parts.length - 1] ?? "", 10);
    if (Number.isFinite(pid)) {
      pids.add(pid);
    }
  }
  for (const pid of pids) {
    await killTreeWindows(pid);
  }
}

async function readNetstat(): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn("netstat", ["-ano"], { windowsHide: true });
    let data = "";
    child.stdout?.on("data", (chunk) => {
      data += chunk.toString();
    });
    child.on("exit", () => resolve(data));
    child.on("error", () => resolve(data));
  });
}
