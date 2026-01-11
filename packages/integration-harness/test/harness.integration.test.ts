import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

import {
  buildHarnessReport,
  buildScenarioReport,
  compareSnapshot,
  createSnapshotBundle,
  evaluateExpectations,
  getSnapshotPaths,
  runIntegrationScenario,
  writeSnapshot,
} from "@aurelia-ls/integration-harness";
import type { IntegrationScenario } from "@aurelia-ls/integration-harness";
import {
  compileWithAot,
  patchComponentDefinition,
  render,
} from "@aurelia-ls/ssr";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_DIR = path.join(__dirname, "snapshots");
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const EXPLICIT_APP_TSCONFIG = path.resolve(
  __dirname,
  "..",
  "..",
  "resolution",
  "test",
  "apps",
  "explicit-app",
  "tsconfig.json",
);
const AURELIA_TABLE_PACKAGE = path.resolve(
  REPO_ROOT,
  "aurelia2-plugins",
  "packages",
  "aurelia2-table",
);
const HAS_AURELIA_TABLE = fs.existsSync(
  path.join(AURELIA_TABLE_PACKAGE, "package.json"),
);
const FIXTURE_MULTI_CLASS = path.resolve(
  __dirname,
  "..",
  "..",
  "resolution",
  "test",
  "npm",
  "fixtures",
  "multi-class",
);

const UPDATE_SNAPSHOTS = process.env.AURELIA_INTEGRATION_GOLDEN === "1";

const SCENARIOS: IntegrationScenario[] = [
  {
    id: "explicit-app-local",
    title: "Explicit app local dependencies flow into compile scope",
    tags: ["tsconfig", "local", "aot", "overlay"],
    source: {
      kind: "tsconfig",
      tsconfigPath: EXPLICIT_APP_TSCONFIG,
    },
    resolution: {
      fileSystem: "node",
    },
    compile: [
      {
        id: "product-card",
        templatePath: "src/widgets/product-card.html",
        scope: { localOf: "product-card" },
        aot: true,
        overlay: true,
      },
    ],
    expect: {
      resources: {
        local: {
          "product-card": ["price-tag", "stock-badge"],
        },
      },
      bindables: [
        { resource: "price-tag", name: "amount" },
        { resource: "stock-badge", name: "inStock", attribute: "in-stock" },
      ],
      aot: {
        instructions: [
          { type: "hydrateElement", res: "price-tag" },
          { type: "hydrateElement", res: "stock-badge" },
        ],
      },
    },
  },
  {
    id: "conditional-define",
    title: "Defines resolve conditional registration guards",
    tags: ["memory", "defines", "registration"],
    source: {
      kind: "memory",
      files: {
        "/src/entry.ts": [
          "function customElement(name: string) {",
          "  return function(_target: unknown) {};",
          "}",
          "",
          "const Aurelia = { register: (..._args: unknown[]) => {} };",
          "",
          "@customElement(\"guarded-el\")",
          "export class GuardedElement {}",
          "",
          "if (__SSR__) {",
          "  Aurelia.register(GuardedElement);",
          "}",
          "",
        ].join("\n"),
      },
    },
    resolution: {
      defines: {
        __SSR__: true,
      },
    },
    compile: [
      {
        id: "guarded",
        templatePath: "/src/guarded.html",
        markup: "<guarded-el></guarded-el>",
        aot: true,
      },
    ],
    expect: {
      resources: {
        global: ["guarded-el"],
      },
      aot: {
        instructions: [{ type: "hydrateElement", res: "guarded-el" }],
      },
    },
  },
  {
    id: "conditional-unknown",
    title: "Unknown guards surface conditional registration gaps",
    tags: ["memory", "registration", "gaps"],
    source: {
      kind: "memory",
      files: {
        "/src/entry.ts": [
          "function customElement(name: string) {",
          "  return function(_target: unknown) {};",
          "}",
          "",
          "const Aurelia = { register: (..._args: unknown[]) => {} };",
          "",
          "@customElement(\"guarded-el\")",
          "export class GuardedElement {}",
          "",
          "if (__SSR__) {",
          "  Aurelia.register(GuardedElement);",
          "}",
          "",
        ].join("\n"),
      },
    },
    compile: [
      {
        id: "guarded",
        templatePath: "/src/guarded.html",
        markup: "<guarded-el></guarded-el>",
        aot: true,
      },
    ],
    expect: {
      gaps: [
        {
          kind: "conditional-registration",
          contains: "registration guarded",
        },
      ],
      resources: {
        global: ["guarded-el"],
      },
      aot: {
        instructions: [{ type: "hydrateElement", res: "guarded-el" }],
      },
    },
  },
  {
    id: "external-multi-class",
    title: "External npm resources feed semantics and AOT",
    tags: ["external", "npm", "aot"],
    source: {
      kind: "memory",
      files: {
        "/src/entry.ts": "export const marker = 0;",
      },
    },
    externalPackages: [
      {
        path: FIXTURE_MULTI_CLASS,
        preferSource: true,
      },
    ],
    externalResourcePolicy: "root-scope",
    resolution: {
      packageRoots: {
        "@test/multi-class": FIXTURE_MULTI_CLASS,
      },
    },
    compile: [
      {
        id: "external-demo",
        templatePath: "/src/external.html",
        markup: "<user-card name.bind=\"name\" avatar.bind=\"avatar\" highlight.bind=\"color\"></user-card>",
        aot: true,
      },
    ],
    expect: {
      resources: {
        global: ["user-card", "highlight"],
      },
      bindables: [
        { resource: "user-card", name: "name" },
        { resource: "user-card", name: "avatar" },
        { resource: "highlight", name: "color", primary: true },
      ],
      aot: {
        instructions: [{ type: "hydrateElement", res: "user-card" }],
      },
    },
  },
];

if (HAS_AURELIA_TABLE) {
  SCENARIOS.push({
    id: "aurelia2-table-ssr",
    title: "aurelia2-table resources compile and render with SSR",
    tags: ["external", "runtime", "ssr", "aot"],
    source: {
      kind: "memory",
      files: {
        "/src/entry.ts": "export const marker = 0;",
      },
    },
    externalPackages: [
      {
        path: AURELIA_TABLE_PACKAGE,
        preferSource: true,
      },
    ],
    externalResourcePolicy: "root-scope",
    resolution: {
      packageRoots: {
        "aurelia2-table": AURELIA_TABLE_PACKAGE,
      },
    },
    compile: [
      {
        id: "aurelia2-table-ssr",
        templatePath: "/src/aurelia2-table-ssr.html",
        markup: [
          "<aut-pagination",
          "  total-items.bind=\"12\"",
          "  page-size.bind=\"5\"",
          "  current-page.bind=\"1\"",
          "  direction-links.bind=\"false\"",
          "  boundary-links.bind=\"false\">",
          "</aut-pagination>",
        ].join("\n"),
        aot: true,
      },
    ],
    expect: {
      resources: {
        global: ["aut-pagination", "aurelia-table"],
      },
      aot: {
        instructions: [{ type: "hydrateElement", res: "aut-pagination" }],
      },
    },
  });
}

describe("integration harness scenarios", () => {
  test("runs end-to-end scenarios with snapshots", async () => {
    const reports = [];

    for (const scenario of SCENARIOS) {
      const run = await runIntegrationScenario(scenario);
      const failures = evaluateExpectations(run, scenario.expect);
      reports.push(buildScenarioReport(run, failures));

      if (scenario.id === "conditional-define") {
        const hasConditionalGap = (run.catalog.gaps ?? []).some(
          (gap) => gap.kind === "conditional-registration",
        );
        expect(hasConditionalGap).toBe(false);
      }

      if (scenario.id === "external-multi-class") {
        const externalResources = run.external.flatMap((pkg) => pkg.resources.map((r) => r.kind));
        expect(externalResources.length).toBeGreaterThan(0);
      }

      await runRuntimeAssertions(run);

      const bundle = createSnapshotBundle(run);
      const normalized = normalizeSnapshotBundle(bundle);
      const paths = getSnapshotPaths(SNAPSHOT_DIR, scenario.id);

      assertSnapshot(`${scenario.id}:semantic`, paths.semantic, normalized.semantic);
      assertSnapshot(`${scenario.id}:api`, paths.apiSurface, normalized.apiSurface);
      if (normalized.aot) {
        assertSnapshot(`${scenario.id}:aot`, paths.aot ?? "", normalized.aot);
      }
    }

    const report = buildHarnessReport(reports);
    const failureSummary = report.scenarios
      .filter((entry) => entry.failures.length > 0)
      .map((entry) => ({
        id: entry.id,
        failures: entry.failures,
      }));

    expect(report.failed, JSON.stringify(failureSummary, null, 2)).toBe(0);
  });
});

async function runRuntimeAssertions(run: Awaited<ReturnType<typeof runIntegrationScenario>>): Promise<void> {
  if (run.scenario.id !== "aurelia2-table-ssr") {
    return;
  }

  const runtimeTemplate = [
    "<aut-pagination",
    "  total-items.bind=\"12\"",
    "  page-size.bind=\"5\"",
    "  current-page.bind=\"1\"",
    "  direction-links.bind=\"false\"",
    "  boundary-links.bind=\"false\">",
    "</aut-pagination>",
  ].join("\n");

  class AureliaTableRuntimeApp {
    static $au = {
      type: "custom-element",
      name: "aurelia2-table-runtime",
      template: runtimeTemplate,
    };
  }

  const aot = compileWithAot(runtimeTemplate, {
    name: "aurelia2-table-runtime",
    semantics: run.semantics,
    resourceGraph: run.resourceGraph,
    resourceScope: run.resourceGraph.root,
    stripSpans: false,
  });

  patchComponentDefinition(AureliaTableRuntimeApp, aot, { name: "aurelia2-table-runtime" });

  const pluginModule = await loadAureliaTableModule();
  const configuration = pluginModule.AureliaTableConfiguration;
  if (!configuration) {
    throw new Error("AureliaTableConfiguration not found in aurelia2-table module.");
  }

  const autPagination = pluginModule.AutPaginationCustomElement as unknown;

  if (autPagination && typeof autPagination === "function") {
    const proto = (autPagination as { prototype?: { bind?: (...args: unknown[]) => void; bound?: (...args: unknown[]) => void } }).prototype;
    if (proto?.bind && !proto.bound) {
      // Bridge legacy bind() to the v2 bound() hook so initial calculations run post-bindings.
      const originalBind = proto.bind;
      proto.bound = function (...args: unknown[]) {
        return originalBind.apply(this, args);
      };
    }
  }

  let paginationVm: Record<string, unknown> | null = null;
  const result = await render(AureliaTableRuntimeApp, {
    register: (container) => {
      container.register(configuration);
    },
    beforeStop: (rootController) => {
      const stack = [rootController as unknown as { children?: unknown[]; vmKind?: string; definition?: { name?: string }; viewModel?: unknown }];
      while (stack.length > 0) {
        const current = stack.pop();
        if (!current) continue;
        if (current.vmKind === "customElement" && current.definition?.name === "aut-pagination") {
          paginationVm = (current.viewModel ?? null) as Record<string, unknown> | null;
          break;
        }
        const children = current.children ?? [];
        for (const child of children) {
          stack.push(child as { children?: unknown[]; vmKind?: string; definition?: { name?: string }; viewModel?: unknown });
        }
      }
    },
  });

  if (!paginationVm) {
    throw new Error("AutPaginationCustomElement controller not found in SSR tree.");
  }
  expect(paginationVm.totalItems).toBe(12);
  expect(paginationVm.pageSize).toBe(5);
  expect(paginationVm.totalPages).toBe(3);
  const displayPages = paginationVm.displayPages as Array<{ title?: string }> | undefined;
  expect(displayPages?.map((entry) => entry.title)).toEqual(["1", "2", "3"]);

  const links = extractPageLinks(result.html);

  expect(links).toEqual(["1", "2", "3"]);
}

function extractPageLinks(html: string): string[] {
  const linkRegex =
    /<a\b[^>]*class=(["'])(?:[^"']*\bpage-link\b[^"']*)\1[^>]*>([\s\S]*?)<\/a>/gi;
  const links: string[] = [];
  for (const match of html.matchAll(linkRegex)) {
    const text = match[2].replace(/<[^>]+>/g, "").trim();
    if (text) {
      links.push(text);
    }
  }
  return links;
}

let aureliaTableModulePromise: Promise<Record<string, unknown>> | null = null;

async function loadAureliaTableModule(): Promise<Record<string, unknown>> {
  if (!HAS_AURELIA_TABLE) {
    throw new Error("aurelia2-table package not available.");
  }

  if (!aureliaTableModulePromise) {
    aureliaTableModulePromise = buildAureliaTableBundle();
  }

  return aureliaTableModulePromise;
}

async function buildAureliaTableBundle(): Promise<Record<string, unknown>> {
  const entry = path.join(AURELIA_TABLE_PACKAGE, "src", "index.ts");
  const buildDir = path.join(REPO_ROOT, ".temp", "aurelia2-table-build");
  const outfile = path.join(buildDir, "index.mjs");

  await fs.promises.mkdir(buildDir, { recursive: true });
  await ensureAureliaWorkspaceModules(buildDir);

  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "es2022",
    sourcemap: "inline",
    resolveExtensions: [".ts", ".js"],
    tsconfigRaw: {
      compilerOptions: {
        useDefineForClassFields: false,
      },
    },
    define: {
      __DEV__: "false",
    },
    plugins: [
      {
        name: "resolve-ts-fallbacks",
        setup(build) {
          build.onResolve({ filter: /\.js$/ }, (args) => {
            const tsPath = path.resolve(args.resolveDir, args.path.replace(/\.js$/, ".ts"));
            if (fs.existsSync(tsPath)) {
              return { path: tsPath };
            }
            return null;
          });

          build.onResolve({ filter: /\.html$/ }, (args) => {
            const tsPath = path.resolve(args.resolveDir, `${args.path}.ts`);
            if (fs.existsSync(tsPath)) {
              return { path: tsPath };
            }
            return null;
          });
        },
      },
    ],
    external: ["aurelia", "@aurelia/*"],
  });

  return import(/* @vite-ignore */ pathToFileURL(outfile).href);
}

async function ensureAureliaWorkspaceModules(buildDir: string): Promise<void> {
  const aureliaPackagesRoot = path.join(REPO_ROOT, "aurelia", "packages");
  const nodeModulesRoot = path.join(buildDir, "node_modules");
  await fs.promises.mkdir(nodeModulesRoot, { recursive: true });

  const entries = await fs.promises.readdir(aureliaPackagesRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const pkgRoot = path.join(aureliaPackagesRoot, entry.name);
    const pkgJsonPath = path.join(pkgRoot, "package.json");
    if (!fs.existsSync(pkgJsonPath)) continue;

    const pkgJson = JSON.parse(await fs.promises.readFile(pkgJsonPath, "utf8")) as {
      name?: string;
    };
    if (!pkgJson.name) continue;

    let targetPath: string | null = null;
    if (pkgJson.name === "aurelia") {
      targetPath = path.join(nodeModulesRoot, "aurelia");
    } else if (pkgJson.name.startsWith("@aurelia/")) {
      const pkgName = pkgJson.name.slice("@aurelia/".length);
      targetPath = path.join(nodeModulesRoot, "@aurelia", pkgName);
    }

    if (!targetPath) continue;
    if (fs.existsSync(targetPath)) continue;

    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.promises.symlink(pkgRoot, targetPath, "junction");
  }
}

function assertSnapshot(label: string, snapshotPath: string, value: unknown): void {
  if (UPDATE_SNAPSHOTS) {
    writeSnapshot(snapshotPath, value);
    return;
  }

  const comparison = compareSnapshot(snapshotPath, value);
  if (!comparison.match) {
    const relPath = path.relative(REPO_ROOT, snapshotPath);
    const reason = comparison.expected ? "Snapshot mismatch" : "Snapshot missing";
    throw new Error(
      `${label}: ${reason} (${relPath}). ` +
        "Re-run with AURELIA_INTEGRATION_GOLDEN=1 to update snapshots.",
    );
  }
}

function normalizeSnapshotBundle<T extends Record<string, unknown>>(bundle: T): T {
  return normalizeSnapshotValue(bundle) as T;
}

function normalizeSnapshotValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeSnapshotValue(entry));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = normalizeSnapshotValue(entry);
    }
    return out;
  }
  if (typeof value === "string") {
    return normalizeSnapshotPath(value);
  }
  return value;
}

function normalizeSnapshotPath(value: string): string {
  const normalizedRoot = normalizePathForCompare(REPO_ROOT);
  if (!normalizedRoot) return value;
  const normalized = normalizePathForCompare(value);
  const prefix = normalizedRoot.endsWith("/") ? normalizedRoot : `${normalizedRoot}/`;
  if (normalized.startsWith(prefix)) {
    return normalized.slice(prefix.length);
  }
  return value;
}

function normalizePathForCompare(value: string): string {
  const normalized = value.replace(/\\/g, "/");
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}
