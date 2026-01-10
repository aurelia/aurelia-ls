import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const DEFAULT_URL = "http://localhost:3000/";
const DEFAULT_ROOT = "body";
const DEFAULT_OUT = "browser-inspect.json";
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_POLL_INTERVAL = 500;
const DEFAULT_DELAY = 0;

function parseArgs(argv) {
  const args = {
    url: DEFAULT_URL,
    root: DEFAULT_ROOT,
    out: DEFAULT_OUT,
    headful: false,
    timeout: DEFAULT_TIMEOUT,
    start: null,
    cwd: process.cwd(),
    pollInterval: DEFAULT_POLL_INTERVAL,
    attrs: [],
    waitFor: null,
    delayMs: DEFAULT_DELAY,
    probes: [],
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--url":
        args.url = argv[++i];
        break;
      case "--root":
        args.root = argv[++i];
        break;
      case "--out":
        args.out = argv[++i];
        break;
      case "--headful":
        args.headful = true;
        break;
      case "--timeout":
        args.timeout = Number(argv[++i]);
        break;
      case "--start":
        args.start = argv[++i];
        break;
      case "--cwd":
        args.cwd = argv[++i];
        break;
      case "--poll":
        args.pollInterval = Number(argv[++i]);
        break;
      case "--attr":
        args.attrs.push(argv[++i]);
        break;
      case "--wait":
        args.waitFor = argv[++i];
        break;
      case "--delay":
        args.delayMs = Number(argv[++i]);
        break;
      case "--probe": {
        const raw = argv[++i];
        if (!raw) break;
        const [namePart, ...exprParts] = raw.split("=");
        const expr = exprParts.length ? exprParts.join("=") : namePart;
        const name = exprParts.length ? namePart : `probe_${args.probes.length + 1}`;
        args.probes.push({ name, expr });
        break;
      }
      default:
        break;
    }
  }

  return args;
}

async function waitForServer(url, timeoutMs, intervalMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.ok || res.status === 304) {
        return true;
      }
    } catch {
      // ignore until timeout
    }
    await delay(intervalMs);
  }
  return false;
}

function startProcess(command, cwd) {
  const child = spawn(command, {
    cwd,
    shell: true,
    stdio: "inherit",
    env: { ...process.env },
  });

  const cleanup = () => {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  };
  process.on("exit", cleanup);
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  return child;
}

function ensureOutputPath(path) {
  const fullPath = resolvePath(path);
  mkdirSync(dirname(fullPath), { recursive: true });
  return fullPath;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let child = null;
  if (args.start) {
    child = startProcess(args.start, args.cwd);
    const ready = await waitForServer(args.url, args.timeout, args.pollInterval);
    if (!ready) {
      throw new Error(`Server not ready at ${args.url} within ${args.timeout}ms`);
    }
  }

  const browser = await chromium.launch({ headless: !args.headful });
  const page = await browser.newPage();
  await page.goto(args.url, { waitUntil: "networkidle", timeout: args.timeout });
  await page.waitForSelector(args.root, { timeout: args.timeout });
  if (args.waitFor) {
    await page.waitForSelector(args.waitFor, { timeout: args.timeout });
  }
  if (args.delayMs > 0) {
    await delay(args.delayMs);
  }

  const snapshot = await page.evaluate(({ rootSelector, attrNames, probes }) => {
    const ELEMENT_KEY = "au:resource:custom-element";
    const ATTR_PREFIX = "au:resource:custom-attribute:";

    function summarizeDefinition(def) {
      if (!def) return null;
      return {
        name: def.name ?? null,
        type: def.type ?? null,
        isTemplateController: def.isTemplateController ?? false,
        containerless: def.containerless ?? false,
        hasSlots: def.hasSlots ?? false,
        bindables: def.bindables ? Object.keys(def.bindables) : [],
      };
    }

    function summarizeViewModel(vm) {
      if (!vm || typeof vm !== "object") return null;
      const summary = {};
      for (const key of Object.keys(vm)) {
        const value = vm[key];
        if (Array.isArray(value)) {
          summary[key] = { type: "array", length: value.length };
        } else if (value && typeof value === "object") {
          summary[key] = { type: "object" };
        } else {
          summary[key] = { type: typeof value, value };
        }
      }
      return summary;
    }

    function getAttributeControllers(node) {
      const refs = node?.$au;
      if (!refs) return [];
      const entries = Object.entries(refs).filter(([key]) => key.startsWith(ATTR_PREFIX));
      return entries.map(([key, controller]) => ({
        key,
        name: key.slice(ATTR_PREFIX.length),
        vmKind: controller?.vmKind ?? null,
        definition: summarizeDefinition(controller?.definition),
        viewModel: controller?.viewModel ? summarizeViewModel(controller.viewModel) : null,
      }));
    }

    function walk(ctrl) {
      if (!ctrl) return null;
      const host = ctrl.host ?? ctrl.location ?? null;
      const nodeName = host?.nodeName ?? null;
      const attrs = host ? getAttributeControllers(host) : [];
      const node = {
        vmKind: ctrl.vmKind,
        nodeName,
        definition: summarizeDefinition(ctrl.definition),
        viewModelType: ctrl.viewModel?.constructor?.name ?? null,
        viewModel: summarizeViewModel(ctrl.viewModel),
        attributes: attrs,
        children: [],
      };

      if (ctrl.vmKind === "customElement") {
        const name = ctrl.definition?.name ?? null;
        if (name === "au-viewport") {
          const routed = ctrl.viewModel?.currentController ?? null;
          const routedNode = walk(routed);
          if (routedNode) node.children.push(routedNode);
        } else {
          node.children.push(...(ctrl.children ?? []).map(walk).filter(Boolean));
        }
        return node;
      }

      if (ctrl.vmKind === "customAttribute" && ctrl.definition?.isTemplateController) {
        const vm = ctrl.viewModel;
        if (vm?.view) {
          const viewNode = walk(vm.view);
          if (viewNode) node.children.push(viewNode);
        }
        if (Array.isArray(vm?.views)) {
          for (const view of vm.views) {
            const viewNode = walk(view);
            if (viewNode) node.children.push(viewNode);
          }
        }
        return node;
      }

      if (ctrl.vmKind === "synthetic") {
        node.children.push(...(ctrl.children ?? []).map(walk).filter(Boolean));
        return node;
      }

      node.children.push(...(ctrl.children ?? []).map(walk).filter(Boolean));
      return node;
    }

    const rootEl = document.querySelector(rootSelector);
    const rootCtrl = rootEl?.$au?.[ELEMENT_KEY] ?? null;
    const tree = walk(rootCtrl);

    function indexAttributesFromTree(root) {
      const index = {};
      if (!root) return index;
      const pending = [root];
      while (pending.length) {
        const node = pending.pop();
        if (!node) continue;
        for (const attr of node.attributes ?? []) {
          if (!index[attr.name]) {
            index[attr.name] = [];
          }
          index[attr.name].push({
            nodeName: node.nodeName,
            viewModel: attr.viewModel,
          });
        }
        for (const child of node.children ?? []) {
          pending.push(child);
        }
      }
      return index;
    }

    function indexAttributesFromDom() {
      const index = {};
      const nodes = document.querySelectorAll("*");
      for (const node of nodes) {
        const refs = node?.$au;
        if (!refs) continue;
        for (const [key, controller] of Object.entries(refs)) {
          if (!key.startsWith(ATTR_PREFIX)) continue;
          const name = key.slice(ATTR_PREFIX.length);
          if (!index[name]) {
            index[name] = [];
          }
          index[name].push({
            nodeName: node.nodeName,
            viewModel: summarizeViewModel(controller?.viewModel),
            definition: summarizeDefinition(controller?.definition),
          });
        }
      }
      return index;
    }

    const attributeIndex = Object.assign({}, indexAttributesFromTree(tree), indexAttributesFromDom());

    const filteredAttributes = {};
    if (attrNames?.length) {
      for (const name of attrNames) {
        if (attributeIndex[name]) {
          filteredAttributes[name] = attributeIndex[name];
        }
      }
    }

    function runProbes(root, rootCtrl, list) {
      const results = {};
      if (!list?.length) return results;
      for (const probe of list) {
        try {
          const fn = new Function("root", "rootCtrl", `return (${probe.expr});`);
          results[probe.name] = { ok: true, value: fn(root, rootCtrl) };
        } catch (error) {
          results[probe.name] = { ok: false, error: String(error) };
        }
      }
      return results;
    }

    const probeResults = runProbes(rootEl, rootCtrl, probes);

    return {
      url: location.href,
      rootSelector,
      timestamp: new Date().toISOString(),
      tree,
      attributes: attrNames?.length ? filteredAttributes : attributeIndex,
      probes: probeResults,
    };
  }, { rootSelector: args.root, attrNames: args.attrs, probes: args.probes });

  const outPath = ensureOutputPath(args.out);
  writeFileSync(outPath, JSON.stringify(snapshot, null, 2), "utf-8");

  await browser.close();
  if (child) {
    child.kill("SIGTERM");
  }
  console.log(`[inspect-runtime] wrote ${outPath}`);
}

main().catch((error) => {
  console.error(`[inspect-runtime] ${error?.stack ?? error}`);
  process.exit(1);
});
