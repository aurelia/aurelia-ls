import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { build } from "esbuild";

import {
  buildHarnessReport,
  buildScenarioReport,
  compareSnapshot,
  createSnapshotBundle,
  evaluateExpectations,
  getSnapshotPaths,
  inspectBrowserRuntime,
  resolveExternalPackagePath,
  runIntegrationScenario,
  writeSnapshot,
} from "@aurelia-ls/integration-harness";
import type { BrowserRuntimeExpectation, IntegrationScenario, SsrRuntimeExpectation } from "@aurelia-ls/integration-harness";
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
  "compiler",
  "test",
  "project-semantics",
  "apps",
  "explicit-app",
  "tsconfig.json",
);
const CONVENTION_APP_TSCONFIG = path.resolve(
  __dirname,
  "..",
  "..",
  "compiler",
  "test",
  "project-semantics",
  "apps",
  "convention-app",
  "tsconfig.json",
);
const SIBLING_APP_TSCONFIG = path.resolve(
  __dirname,
  "..",
  "..",
  "compiler",
  "test",
  "project-semantics",
  "apps",
  "sibling-app",
  "tsconfig.json",
);
const BASIC_CSR_ROOT = path.resolve(REPO_ROOT, "playground", "basic-csr");
const BASIC_CSR_TSCONFIG = path.resolve(BASIC_CSR_ROOT, "tsconfig.json");
const BASIC_CSR_URL = "http://localhost:4173/";
const BASIC_CSR_START = "pnpm exec vite playground/basic-csr --port 4173 --strictPort";
const SSR_TABLE_FIXTURE_ROOT = path.resolve(
  __dirname,
  "fixtures",
  "ssr-aurelia2-table",
);
const SSR_TABLE_FIXTURE_TSCONFIG = path.join(SSR_TABLE_FIXTURE_ROOT, "tsconfig.json");
const SSR_TABLE_FIXTURE_REL = path.relative(REPO_ROOT, SSR_TABLE_FIXTURE_ROOT)
  .split(path.sep)
  .join("/");
const SSR_TABLE_FIXTURE_CONFIG = `${SSR_TABLE_FIXTURE_REL}/vite.config.ts`;
const SSR_TABLE_URL = "http://localhost:4185/";
const SSR_TABLE_START = [
  "pnpm exec vite",
  SSR_TABLE_FIXTURE_REL,
  `--config ${SSR_TABLE_FIXTURE_CONFIG}`,
  "--port 4185",
  "--strictPort",
  "--mode ssr",
].join(" ");
const TEMPLATE_IMPORTS_TSCONFIG = path.resolve(
  REPO_ROOT,
  "playground",
  "template-imports",
  "tsconfig.json",
);
const TEMPLATE_IMPORTS_AURELIA_TABLE_TSCONFIG = path.resolve(
  __dirname,
  "fixtures",
  "template-imports-aurelia2-table",
  "tsconfig.json",
);
const TEMPLATE_IMPORTS_PKG_TSCONFIG = path.resolve(
  __dirname,
  "fixtures",
  "template-imports-pkg",
  "tsconfig.json",
);
const TEMPLATE_IMPORTS_MULTI_SUBPATH_TSCONFIG = path.resolve(
  __dirname,
  "fixtures",
  "template-imports-multi-subpath",
  "tsconfig.json",
);
const TEMPLATE_IMPORTS_MULTI_SUBPATH_ROOT = path.resolve(
  __dirname,
  "fixtures",
  "template-imports-multi-subpath",
);
const TEMPLATE_IMPORTS_MULTI_SUBPATH_TEMPLATE = fs.readFileSync(
  path.join(TEMPLATE_IMPORTS_MULTI_SUBPATH_ROOT, "src", "my-app.html"),
  "utf-8",
);
const AURELIA_TABLE_PACKAGE = resolveExternalPackagePath("aurelia2-table");
const AURELIA_OUTCLICK_PACKAGE = resolveExternalPackagePath("aurelia2-outclick");
const AURELIA_FORMS_PACKAGE = resolveExternalPackagePath("aurelia2-forms");
const AURELIA_NOTIFICATION_PACKAGE = resolveExternalPackagePath("aurelia2-notification");
const AURELIA_GOOGLE_MAPS_PACKAGE = resolveExternalPackagePath("aurelia2-google-maps");
const HAS_AURELIA_TABLE = fs.existsSync(
  path.join(AURELIA_TABLE_PACKAGE, "package.json"),
);
const HAS_AURELIA_OUTCLICK = fs.existsSync(
  path.join(AURELIA_OUTCLICK_PACKAGE, "package.json"),
);
const HAS_AURELIA_FORMS = fs.existsSync(
  path.join(AURELIA_FORMS_PACKAGE, "package.json"),
);
const HAS_AURELIA_NOTIFICATION = fs.existsSync(
  path.join(AURELIA_NOTIFICATION_PACKAGE, "package.json"),
);
const HAS_AURELIA_GOOGLE_MAPS = fs.existsSync(
  path.join(AURELIA_GOOGLE_MAPS_PACKAGE, "package.json"),
);
if (!HAS_AURELIA_TABLE) {
  throw new Error(
    "[integration-harness] aurelia2-table package missing. " +
    "The integration harness requires the aurelia2-plugins submodule to run third-party SSR scenarios.",
  );
}
const FIXTURE_MULTI_CLASS = resolveExternalPackagePath("@test/multi-class");

const EXPLICIT_THIRD_PARTY_RESOURCES = {
  elements: {
    "third-party-card": {
      kind: "element",
      name: "third-party-card",
      bindables: {
        items: { name: "items" },
      },
    },
  },
} as const;

const AURELIA_TABLE_RUNTIME_TEMPLATE = [
  "<aut-pagination",
  "  total-items.bind=\"12\"",
  "  page-size.bind=\"5\"",
  "  current-page.bind=\"1\"",
  "  direction-links.bind=\"false\"",
  "  boundary-links.bind=\"false\">",
  "</aut-pagination>",
].join("\n");

const UPDATE_SNAPSHOTS = process.env.AURELIA_INTEGRATION_GOLDEN === "1";
const LOG_MEMORY = process.env.AURELIA_HARNESS_MEMORY_LOG === "1";
const SHOULD_GC = process.env.AURELIA_HARNESS_GC === "1";
const MEMORY_OUTPUT_PATH = process.env.AURELIA_HARNESS_MEMORY_PATH;
const ONLY_SCENARIOS = (process.env.AURELIA_HARNESS_ONLY ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
let warnedGcUnavailable = false;

const SCENARIOS: IntegrationScenario[] = [
  {
    id: "explicit-app-local",
    title: "Explicit app local dependencies flow into compile scope",
    tags: ["tsconfig", "local", "aot", "overlay"],
    source: {
      kind: "tsconfig",
      tsconfigPath: EXPLICIT_APP_TSCONFIG,
    },
    discovery: {
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
    id: "explicit-app-aot-suite",
    title: "Explicit app templates compile across root + local scopes",
    tags: ["tsconfig", "aot", "scope", "template-controller"],
    source: {
      kind: "tsconfig",
      tsconfigPath: EXPLICIT_APP_TSCONFIG,
    },
    discovery: {
      fileSystem: "node",
    },
    compile: [
      {
        id: "explicit-product-card",
        templatePath: "src/widgets/product-card.html",
        scope: { localOf: "product-card" },
        aot: true,
      },
      {
        id: "explicit-my-app",
        templatePath: "src/my-app.html",
        scope: "root",
        aot: true,
      },
      {
        id: "explicit-repeat-with-child",
        templatePath: "/src/repeat-with-child.html",
        markup: [
          "<div repeat.for=\"item of items\">",
          "  <nav-bar></nav-bar>",
          "  <span>${item}</span>",
          "</div>",
        ].join("\n"),
        scope: "root",
        aot: true,
      },
      {
        id: "explicit-if-else-with-child",
        templatePath: "/src/if-else-with-child.html",
        markup: [
          "<div>",
          "  <div if.bind=\"show\">",
          "    <user-card name.bind=\"userName\"></user-card>",
          "  </div>",
          "  <div else>",
          "    <span>No user</span>",
          "  </div>",
          "</div>",
        ].join("\n"),
        scope: "root",
        aot: true,
      },
      {
        id: "explicit-multiple-elements",
        templatePath: "/src/multiple-elements.html",
        markup: [
          "<div>",
          "  <nav-bar></nav-bar>",
          "  <user-card name.bind=\"userName\" avatar.bind=\"avatarUrl\"></user-card>",
          "</div>",
        ].join("\n"),
        scope: "root",
        aot: true,
      },
    ],
    expect: {
      resources: {
        global: ["nav-bar", "data-grid", "user-card"],
        local: {
          "product-card": ["price-tag", "stock-badge"],
        },
      },
      aot: {
        instructions: [
          { type: "hydrateElement", res: "nav-bar" },
          { type: "hydrateElement", res: "user-card" },
          { type: "hydrateTemplateController", res: "repeat" },
          { type: "hydrateTemplateController", res: "if" },
        ],
      },
    },
  },
  {
    id: "convention-app",
    title: "Convention-based resources flow into compilation",
    tags: ["tsconfig", "conventions", "aot"],
    source: {
      kind: "tsconfig",
      tsconfigPath: CONVENTION_APP_TSCONFIG,
    },
    discovery: {
      fileSystem: "node",
    },
    compile: [
      {
        id: "convention-my-app",
        templatePath: "src/my-app.html",
        scope: "root",
        aot: true,
      },
      {
        id: "convention-cortex-devices",
        templatePath: "src/cortex-devices.html",
        scope: { localOf: "cortex-devices" },
        aot: true,
      },
      {
        id: "convention-user-profile",
        templatePath: "src/user-profile.html",
        scope: { localOf: "user-profile" },
        aot: true,
      },
    ],
    expect: {
      resources: {
        global: ["cortex-devices", "user-profile"],
      },
      aot: {
        instructions: [
          { type: "hydrateElement", res: "cortex-devices" },
          { type: "hydrateElement", res: "user-profile" },
        ],
      },
    },
  },
  {
    id: "sibling-app",
    title: "Sibling template pairing feeds custom element semantics",
    tags: ["tsconfig", "conventions", "aot"],
    source: {
      kind: "tsconfig",
      tsconfigPath: SIBLING_APP_TSCONFIG,
    },
    discovery: {
      fileSystem: "node",
    },
    compile: [
      {
        id: "sibling-my-app",
        templatePath: "src/my-app.html",
        scope: "root",
        aot: true,
      },
    ],
    expect: {
      resources: {
        global: ["nav-bar", "user-card"],
      },
      aot: {
        instructions: [
          { type: "hydrateElement", res: "nav-bar" },
          { type: "hydrateElement", res: "user-card" },
        ],
      },
    },
  },
  {
    id: "basic-csr-browser",
    title: "Browser runtime hook sees CSR-rendered DOM",
    tags: ["browser", "runtime", "csr"],
    source: {
      kind: "tsconfig",
      tsconfigPath: BASIC_CSR_TSCONFIG,
    },
    discovery: {
      fileSystem: "node",
    },
    expect: {
      runtime: {
        kind: "browser",
        url: BASIC_CSR_URL,
        start: BASIC_CSR_START,
        cwd: REPO_ROOT,
        root: "my-app",
        waitFor: "h1[data-testid=\"title\"]",
        dom: [
          {
            selector: "h1[data-testid=\"title\"]",
            scope: "host",
            texts: ["Hello from Aurelia"],
          },
          {
            selector: "p[data-testid=\"count\"]",
            scope: "host",
            texts: ["Clicks: 0"],
          },
        ],
      },
    },
  },
  {
    id: "template-imports",
    title: "Template <import> elements create local scope resources",
    tags: ["tsconfig", "template-imports", "local-scope", "aot"],
    source: {
      kind: "tsconfig",
      tsconfigPath: TEMPLATE_IMPORTS_TSCONFIG,
    },
    discovery: {
      fileSystem: "node",
    },
    compile: [
      {
        id: "template-imports-my-app",
        templatePath: "src/my-app.html",
        scope: { localOf: "my-app" },
        aot: true,
      },
    ],
    expect: {
      resources: {
        local: {
          "my-app": ["counter"],
        },
      },
      bindables: [{ resource: "counter", name: "label" }],
      aot: {
        instructions: [{ type: "hydrateElement", res: "counter" }],
      },
    },
  },
  {
    id: "template-imports-third-party",
    title: "Template <import> from package adds third-party resources locally",
    tags: ["tsconfig", "template-imports", "third-party", "local-scope", "aot"],
    source: {
      kind: "tsconfig",
      tsconfigPath: TEMPLATE_IMPORTS_PKG_TSCONFIG,
    },
    discovery: {
      fileSystem: "node",
      packageRoots: {
        "@test/multi-class": FIXTURE_MULTI_CLASS,
      },
    },
    compile: [
      {
        id: "template-imports-third-party-my-app",
        templatePath: "src/my-app.html",
        scope: { localOf: "my-app" },
        aot: true,
      },
    ],
    expect: {
      resources: {
        local: {
          "my-app": ["user-card", "highlight"],
        },
      },
      bindables: [
        { resource: "user-card", name: "name" },
        { resource: "user-card", name: "avatar" },
        { resource: "highlight", name: "color", primary: true },
      ],
      aot: {
        instructions: [
          { type: "hydrateElement", res: "user-card" },
          { type: "hydrateAttribute", res: "highlight" },
        ],
      },
    },
  },
  {
    id: "template-imports-multi-subpath",
    title: "Template imports handle subpath + multiple packages",
    tags: ["tsconfig", "template-imports", "third-party", "subpath", "local-scope", "aot"],
    source: {
      kind: "tsconfig",
      tsconfigPath: TEMPLATE_IMPORTS_MULTI_SUBPATH_TSCONFIG,
    },
    discovery: {
      fileSystem: "node",
      packageRoots: {
        "@test/multi-class": FIXTURE_MULTI_CLASS,
      },
    },
    compile: [
      {
        id: "template-imports-multi-subpath-my-app",
        templatePath: "src/my-app.html",
        scope: { localOf: "my-app" },
        aot: true,
      },
    ],
    expect: {
      resources: {
        local: {
          "my-app": ["user-card", "highlight", "sub-card"],
        },
      },
      bindables: [
        { resource: "user-card", name: "name" },
        { resource: "user-card", name: "avatar" },
        { resource: "highlight", name: "color", primary: true },
        { resource: "sub-card", name: "label" },
      ],
      aot: {
        instructions: [
          { type: "hydrateElement", res: "user-card" },
          { type: "hydrateAttribute", res: "highlight" },
          { type: "hydrateElement", res: "sub-card" },
        ],
      },
      runtime: {
        kind: "ssr-module",
        modulePath: TEMPLATE_IMPORTS_MULTI_SUBPATH_ROOT,
        entry: "src/runtime-config.ts",
        configExport: "MultiClassRuntimeConfiguration",
        componentName: "template-imports-multi-subpath-runtime",
        template: TEMPLATE_IMPORTS_MULTI_SUBPATH_TEMPLATE,
        rootVm: {
          userName: "Ada Lovelace",
          avatarUrl: "/avatars/ada.png",
          accent: "blue",
          label: "Scoped Import",
        },
        elementName: "sub-card",
        scopeFromCompile: "template-imports-multi-subpath-my-app",
        vm: {
          label: "Scoped Import",
        },
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
    discovery: {
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
    id: "local-import-defs",
    title: "Local import overlays allow template-only resources",
    tags: ["memory", "local-imports", "aot"],
    source: {
      kind: "memory",
      files: {
        "/src/entry.ts": "export const marker = 0;",
      },
    },
    compile: [
      {
        id: "local-imports-template",
        templatePath: "/src/local-imports.html",
        markup: "<local-chip label.bind=\"label\"></local-chip>",
        aot: true,
        localImports: [
          {
            name: "local-chip",
            bindables: {
              label: { name: "label" },
            },
          },
        ],
      },
    ],
    expect: {
      aot: {
        instructions: [{ type: "hydrateElement", res: "local-chip" }],
      },
    },
  },
  {
    id: "registration-plan",
    title: "Registration plan filters to used resources per scope",
    tags: ["memory", "registration-plan", "usage"],
    source: {
      kind: "memory",
      files: {
        "/src/entry.ts": [
          "import { customElement } from \"aurelia\";",
          "",
          "const Aurelia = { register: (..._args: unknown[]) => {} };",
          "",
          "@customElement(\"alpha-el\")",
          "export class AlphaElement {}",
          "",
          "@customElement(\"beta-el\")",
          "export class BetaElement {}",
          "",
          "Aurelia.register(AlphaElement, BetaElement);",
        ].join("\n"),
      },
    },
    compile: [
      {
        id: "registration-plan-root",
        templatePath: "/src/registration-plan.html",
        markup: "<alpha-el></alpha-el>",
        scope: "root",
        aot: true,
      },
    ],
    expect: {
      resources: {
        global: ["alpha-el", "beta-el"],
      },
      aot: {
        instructions: [{ type: "hydrateElement", res: "alpha-el" }],
      },
      registrationPlan: {
        scopes: {
          root: {
            elements: ["alpha-el"],
            exclude: {
              elements: ["beta-el"],
            },
          },
        },
      },
    },
  },
  {
    id: "registration-plan-third-party",
    title: "Registration plan includes used third-party resources",
    tags: ["external", "registration-plan", "usage"],
    source: {
      kind: "memory",
      files: {
        "/src/entry.ts": "export const marker = 0;",
      },
    },
    externalPackages: [
      {
        id: "@test/multi-class",
        preferSource: true,
      },
    ],
    externalResourcePolicy: "root-scope",
    compile: [
      {
        id: "registration-plan-third-party-root",
        templatePath: "/src/third-party-plan.html",
        markup: "<user-card highlight.bind=\"color\"></user-card>",
        scope: "root",
        aot: true,
      },
    ],
    expect: {
      resources: {
        global: ["user-card", "highlight"],
      },
      registrationPlan: {
        scopes: {
          root: {
            elements: ["user-card"],
            attributes: ["highlight"],
          },
        },
      },
    },
  },
  {
    id: "explicit-third-party",
    title: "Explicit third-party config merges into root scope",
    tags: ["memory", "explicit-resources", "aot"],
    source: {
      kind: "memory",
      files: {
        "/src/entry.ts": "export const marker = 0;",
      },
    },
    discovery: {
      explicitResources: EXPLICIT_THIRD_PARTY_RESOURCES,
    },
    compile: [
      {
        id: "explicit-third-party-root",
        templatePath: "/src/explicit-third-party.html",
        markup: "<third-party-card items.bind=\"items\"></third-party-card>",
        aot: true,
      },
    ],
    expect: {
      resources: {
        global: ["third-party-card"],
      },
      aot: {
        instructions: [{ type: "hydrateElement", res: "third-party-card" }],
      },
      registrationPlan: {
        scopes: {
          root: {
            elements: ["third-party-card"],
          },
        },
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
        id: "@test/multi-class",
        preferSource: true,
      },
    ],
    externalResourcePolicy: "root-scope",
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
    id: "template-imports-aurelia2-table",
    title: "Template import pulls aurelia2-table resources into local scope",
    tags: ["tsconfig", "template-imports", "third-party", "local-scope", "aot"],
    source: {
      kind: "tsconfig",
      tsconfigPath: TEMPLATE_IMPORTS_AURELIA_TABLE_TSCONFIG,
    },
    discovery: {
      fileSystem: "node",
      packageRoots: {
        "aurelia2-table": AURELIA_TABLE_PACKAGE,
      },
    },
    compile: [
      {
        id: "template-imports-aurelia2-table-my-app",
        templatePath: "src/my-app.html",
        scope: { localOf: "my-app" },
        aot: true,
      },
    ],
    expect: {
      resources: {
        local: {
          "my-app": ["aut-pagination", "aurelia-table"],
        },
      },
      aot: {
        instructions: [
          { type: "hydrateElement", res: "aut-pagination" },
          { type: "hydrateAttribute", res: "aurelia-table" },
        ],
      },
    },
  });

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
        id: "aurelia2-table",
        preferSource: true,
      },
    ],
    externalResourcePolicy: "root-scope",
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
      runtime: {
        kind: "ssr-module",
        modulePath: AURELIA_TABLE_PACKAGE,
        configExport: "AureliaTableConfiguration",
        elementName: "aut-pagination",
        componentName: "aurelia2-table-runtime",
        template: AURELIA_TABLE_RUNTIME_TEMPLATE,
        patchElementExport: "AutPaginationCustomElement",
        patches: ["bridge-bind-to-bound"],
        vm: {
          totalItems: 12,
          pageSize: 5,
          totalPages: 3,
          displayPages: ["1", "2", "3"],
        },
        htmlLinks: ["1", "2", "3"],
      },
    },
  });

  SCENARIOS.push({
    id: "aurelia2-table-ssr-browser",
    title: "aurelia2-table filters respond after SSR hydration in browser",
    tags: ["browser", "runtime", "ssr", "third-party", "filters"],
    source: {
      kind: "tsconfig",
      tsconfigPath: SSR_TABLE_FIXTURE_TSCONFIG,
    },
    discovery: {
      fileSystem: "node",
    },
    expect: {
      runtime: {
        kind: "browser",
        url: SSR_TABLE_URL,
        start: SSR_TABLE_START,
        cwd: REPO_ROOT,
        root: "app-root",
        waitFor: "[data-au-hydrated]",
        timeoutMs: 60_000,
        dom: [
          {
            selector: ".row .name",
            scope: "host",
            texts: ["Amp Deluxe", "Cab Classic", "FX Chorus"],
          },
        ],
          probes: [
            {
              name: "probeSmoke",
              expr: "\"probe-ok\"",
              expect: "probe-ok",
            },
            {
              name: "filterRows",
              expr: [
                "(async () => {",
                "  const root = document.querySelector('app-root');",
                "  const hydrated = root?.dataset?.auHydrated ?? null;",
                "  const input = root?.querySelector?.('.filter') ?? document.querySelector('.filter');",
                "  if (!input) return JSON.stringify({ rows: [], filter: null, hydrated, hasInput: false });",
                "  input.value = 'amp';",
                "  input.dispatchEvent(new Event('input', { bubbles: true }));",
                "  await new Promise((resolve) => setTimeout(resolve, 0));",
                "  const scope = root ?? document;",
                "  const rows = Array.from(scope.querySelectorAll('.row .name'))",
                "    .map((el) => el.textContent?.trim() ?? '')",
                "    .filter(Boolean);",
                "  const table = scope.querySelector('table');",
                "  const attr = table?.$au?.['au:resource:custom-attribute:aurelia-table'];",
                "  const attrVm = attr?.viewModel ?? null;",
                "  const attrAttached = attrVm?.isAttached ?? null;",
                "  const displayData = attrVm?.displayData ?? null;",
                "  const displayCount = Array.isArray(displayData) ? displayData.length : null;",
                "  const attrFilter = attrVm?.filters?.[0]?.value ?? null;",
                "  const dataCount = Array.isArray(attrVm?.data) ? attrVm.data.length : null;",
                "  const ctrl = root?.$au?.['au:resource:custom-element'];",
                "  const filter = ctrl?.viewModel?.filters?.[0]?.value ?? null;",
                "  return JSON.stringify({ rows, filter, hydrated, hasInput: true, attrAttached, displayCount, attrFilter, dataCount });",
                "})()",
              ].join("\n"),
              expect: JSON.stringify({
                rows: ["Amp Deluxe"],
                filter: "amp",
                hydrated: "true",
                hasInput: true,
                attrAttached: true,
                displayCount: 1,
                attrFilter: "amp",
                dataCount: 3,
              }),
            },
          ],
        },
      },
  });

  SCENARIOS.push({
    id: "aurelia2-table-multi-binding",
    title: "aurelia2-table multi-binding syntax compiles correctly",
    tags: ["external", "aot", "attribute", "third-party", "multi-binding"],
    source: {
      kind: "memory",
      files: {
        "/src/entry.ts": "export const marker = 0;",
      },
    },
    externalPackages: [
      {
        id: "aurelia2-table",
        preferSource: true,
      },
    ],
    externalResourcePolicy: "root-scope",
    compile: [
      {
        id: "aurelia2-table-multi-binding",
        markup: [
          "<div",
          "  aurelia-table=\"data.bind: items; display-data.bind: displayed; filters.bind: filters\">",
          "</div>",
        ].join("\n"),
        aot: true,
      },
    ],
    expect: {
      resources: {
        global: ["aurelia-table"],
      },
      bindables: [
        { resource: "aurelia-table", name: "data" },
        { resource: "aurelia-table", name: "displayData" },
        { resource: "aurelia-table", name: "filters" },
      ],
      aot: {
        instructions: [{ type: "hydrateAttribute", res: "aurelia-table" }],
      },
    },
  });
}

if (HAS_AURELIA_OUTCLICK) {
  SCENARIOS.push({
    id: "aurelia2-outclick-aot",
    title: "aurelia2-outclick attribute compiles in root scope",
    tags: ["external", "aot", "attribute", "third-party"],
    source: {
      kind: "memory",
      files: {
        "/src/entry.ts": "export const marker = 0;",
      },
    },
    externalPackages: [
      {
        id: "aurelia2-outclick",
        preferSource: true,
      },
    ],
    externalResourcePolicy: "root-scope",
    compile: [
      {
        id: "aurelia2-outclick-aot",
        templatePath: "/src/aurelia2-outclick.html",
        markup: "<div outclick.call=\"handle($event)\"></div>",
        aot: true,
      },
    ],
    expect: {
      resources: {
        global: ["outclick"],
      },
      bindables: [
        { resource: "outclick", name: "fn", primary: true },
      ],
      aot: {
        instructions: [{ type: "hydrateAttribute", res: "outclick" }],
      },
    },
  });
}

if (HAS_AURELIA_FORMS) {
  SCENARIOS.push({
    id: "aurelia2-forms-aot",
    title: "aurelia2-forms elements and attributes compile in root scope",
    tags: ["external", "aot", "element", "attribute", "third-party"],
    source: {
      kind: "memory",
      files: {
        "/src/entry.ts": "export const marker = 0;",
      },
    },
    externalPackages: [
      {
        id: "aurelia2-forms",
        preferSource: true,
      },
    ],
    externalResourcePolicy: "root-scope",
    compile: [
      {
        id: "aurelia2-forms-aot",
        templatePath: "/src/aurelia2-forms.html",
        markup: [
          "<au-form form.bind=\"form\">",
          "  <input au-field=\"email\">",
          "</au-form>",
        ].join("\n"),
        aot: true,
      },
    ],
    expect: {
      resources: {
        global: ["au-form", "au-field"],
      },
      aot: {
        instructions: [
          { type: "hydrateElement", res: "au-form" },
          { type: "hydrateAttribute", res: "au-field" },
        ],
      },
    },
  });
}

if (HAS_AURELIA_TABLE && HAS_AURELIA_OUTCLICK && HAS_AURELIA_FORMS) {
  SCENARIOS.push({
    id: "aurelia2-multi-package-aot",
    title: "Multiple npm packages compile together in one template",
    tags: ["external", "aot", "third-party", "multi-package"],
    source: {
      kind: "memory",
      files: {
        "/src/entry.ts": "export const marker = 0;",
      },
    },
    externalPackages: [
      {
        id: "aurelia2-table",
        preferSource: true,
      },
      {
        id: "aurelia2-outclick",
        preferSource: true,
      },
      {
        id: "aurelia2-forms",
        preferSource: true,
      },
    ],
    externalResourcePolicy: "root-scope",
    compile: [
      {
        id: "aurelia2-multi-package-aot",
        markup: [
          "<section>",
          "  <div aurelia-table=\"data.bind: items\"></div>",
          "  <aut-pagination total-items.bind=\"12\" page-size.bind=\"5\" current-page.bind=\"page\"></aut-pagination>",
          "  <div outclick.bind=\"onOutclick\"></div>",
          "  <input au-field=\"name\">",
          "</section>",
        ].join("\n"),
        aot: true,
      },
    ],
    expect: {
      resources: {
        global: ["aurelia-table", "aut-pagination", "outclick", "au-field"],
      },
      aot: {
        instructions: [
          { type: "hydrateAttribute", res: "aurelia-table" },
          { type: "hydrateElement", res: "aut-pagination" },
          { type: "hydrateAttribute", res: "outclick" },
          { type: "hydrateAttribute", res: "au-field" },
        ],
      },
    },
  });
}

if (HAS_AURELIA_NOTIFICATION) {
  SCENARIOS.push({
    id: "aurelia2-notification-aot",
    title: "aurelia2-notification host compiles in root scope",
    tags: ["external", "aot", "element", "third-party"],
    source: {
      kind: "memory",
      files: {
        "/src/entry.ts": "export const marker = 0;",
      },
    },
    externalPackages: [
      {
        id: "aurelia2-notification",
        preferSource: true,
      },
    ],
    externalResourcePolicy: "root-scope",
    compile: [
      {
        id: "aurelia2-notification-aot",
        templatePath: "/src/aurelia2-notification.html",
        markup: [
          "<au-notification-host",
          "  position.bind=\"position\"",
          "  host-class=\"host\"",
          "  container-class=\"container\">",
          "</au-notification-host>",
        ].join("\n"),
        aot: true,
      },
    ],
    expect: {
      resources: {
        global: ["au-notification-host"],
      },
      bindables: [
        { resource: "au-notification-host", name: "position" },
        { resource: "au-notification-host", name: "hostClass" },
        { resource: "au-notification-host", name: "containerClass" },
      ],
      aot: {
        instructions: [{ type: "hydrateElement", res: "au-notification-host" }],
      },
    },
  });
}

if (HAS_AURELIA_GOOGLE_MAPS) {
  SCENARIOS.push({
    id: "aurelia2-google-maps-aot",
    title: "aurelia2-google-maps element compiles with key bindables",
    tags: ["external", "aot", "element", "third-party"],
    source: {
      kind: "memory",
      files: {
        "/src/entry.ts": "export const marker = 0;",
      },
    },
    externalPackages: [
      {
        id: "aurelia2-google-maps",
        preferSource: true,
      },
    ],
    externalResourcePolicy: "root-scope",
    compile: [
      {
        id: "aurelia2-google-maps-aot",
        templatePath: "/src/aurelia2-google-maps.html",
        markup: [
          "<google-map",
          "  latitude.bind=\"lat\"",
          "  longitude.bind=\"lng\"",
          "  zoom.bind=\"zoom\">",
          "</google-map>",
        ].join("\n"),
        aot: true,
      },
    ],
    expect: {
      resources: {
        global: ["google-map"],
      },
      bindables: [
        { resource: "google-map", name: "latitude" },
        { resource: "google-map", name: "longitude" },
        { resource: "google-map", name: "zoom" },
      ],
      aot: {
        instructions: [{ type: "hydrateElement", res: "google-map" }],
      },
    },
  });
}

const SCENARIO_GROUP_SIZE = 2;
const DEFAULT_SCENARIO_TIMEOUT_MS = 30_000;
const GROUP_TIMEOUT_BUFFER_MS = 10_000;
// Skip browser/SSR runtime scenarios — they spawn Vite dev servers and use
// Playwright, which is flaky on Windows (server startup regularly exceeds
// the 30s timeout). These test runtime rendering, not compiler correctness.
// Run individually with AURELIA_HARNESS_ONLY when runtime verification is needed.
const SKIP_SCENARIOS = new Set(["basic-csr-browser", "aurelia2-table-ssr-browser"]);
const ACTIVE_SCENARIOS = ONLY_SCENARIOS.length > 0
  ? SCENARIOS.filter((scenario) => ONLY_SCENARIOS.includes(scenario.id))
  : SCENARIOS.filter((scenario) => !SKIP_SCENARIOS.has(scenario.id));
if (ONLY_SCENARIOS.length > 0 && ACTIVE_SCENARIOS.length === 0) {
  throw new Error(
    [
      "[integration-harness] No scenarios matched AURELIA_HARNESS_ONLY.",
      `Requested: ${ONLY_SCENARIOS.join(", ")}`,
      `Available: ${SCENARIOS.map((scenario) => scenario.id).join(", ")}`,
    ].join(" "),
  );
}
const SCENARIO_GROUPS = chunkScenarios(ACTIVE_SCENARIOS, SCENARIO_GROUP_SIZE);
const SCENARIO_GROUP_TIMEOUTS = SCENARIO_GROUPS.map((group) => (
  group.reduce((total, scenario) => total + getScenarioTimeoutMs(scenario), GROUP_TIMEOUT_BUFFER_MS)
));

describe("integration harness scenarios", () => {
  SCENARIO_GROUPS.forEach((group, index) => {
    const label = `runs end-to-end scenarios with snapshots (${index + 1}/${SCENARIO_GROUPS.length})`;
    const timeoutMs = SCENARIO_GROUP_TIMEOUTS[index] ?? DEFAULT_SCENARIO_TIMEOUT_MS;
    test(label, async () => {
      await runScenarioGroup(group);
    }, timeoutMs);
  });
});

async function runScenarioGroup(group: IntegrationScenario[]): Promise<void> {
  const reports = [];

  for (const scenario of group) {
    let run = await runIntegrationScenario(scenario);
    const scenarioId = run.scenario.id;
    const failures = evaluateExpectations(run, scenario.expect);
    reports.push(buildScenarioReport(run, failures));
    logMemoryTrace(run);

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

    if (SHOULD_GC) {
      run = null;
      await logGcBaseline(scenarioId);
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
}

function chunkScenarios(
  scenarios: IntegrationScenario[],
  groupSize: number,
): IntegrationScenario[][] {
  const groups: IntegrationScenario[][] = [];
  for (let i = 0; i < scenarios.length; i += groupSize) {
    groups.push(scenarios.slice(i, i + groupSize));
  }
  return groups;
}

function getScenarioTimeoutMs(scenario: IntegrationScenario): number {
  const runtime = scenario.expect?.runtime as BrowserRuntimeExpectation | SsrRuntimeExpectation | undefined;
  if (runtime?.kind === "browser") {
    return Math.max(DEFAULT_SCENARIO_TIMEOUT_MS, runtime.timeoutMs ?? DEFAULT_SCENARIO_TIMEOUT_MS);
  }
  return DEFAULT_SCENARIO_TIMEOUT_MS;
}

async function runRuntimeAssertions(run: Awaited<ReturnType<typeof runIntegrationScenario>>): Promise<void> {
  const runtime = run.scenario.expect?.runtime;
  if (!runtime) {
    return;
  }

  if (runtime.kind === "ssr-module") {
    await runSsrModuleAssertions(run, runtime);
    return;
  }

  if (runtime.kind === "browser") {
    await runBrowserAssertions(runtime);
  }
}

function logMemoryTrace(run: Awaited<ReturnType<typeof runIntegrationScenario>>): void {
  if (!LOG_MEMORY) return;
  const trace = run.memory;
  if (!trace || trace.samples.length === 0) return;
  const lines: string[] = [];
  lines.push(`[memory] scenario=${run.scenario.id}`);
  for (const sample of trace.samples) {
    const mb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
    lines.push(
      `  ${sample.label.padEnd(12)} heap=${mb(sample.heapUsed)} rss=${mb(sample.rss)} ext=${mb(sample.external)} time=${sample.timeMs.toFixed(1)}ms`,
    );
  }
  if (trace.peak) {
    lines.push(
      `  peak heap=${(trace.peak.heapUsed / (1024 * 1024)).toFixed(2)}MB at ${trace.peak.label}`,
    );
  }
  writeMemoryLog(lines);
}

async function logGcBaseline(scenarioId: string): Promise<void> {
  const gcFn = getGc();
  if (!gcFn) {
    if (!warnedGcUnavailable) {
      warnedGcUnavailable = true;
      const message = "[memory] GC requested but global.gc is not available (enable --expose-gc).";
      writeMemoryLog([message]);
    }
    return;
  }

  const before = takeMemorySample(`gc:before:${scenarioId}`);
  gcFn();
  gcFn();
  await new Promise((resolve) => setImmediate(resolve));
  const after = takeMemorySample(`gc:after:${scenarioId}`);

  const lines = [
    `[memory] scenario=${scenarioId} (gc)`,
    formatMemorySample(before),
    formatMemorySample(after),
    formatMemoryDelta(before, after),
  ];
  writeMemoryLog(lines);
}

function getGc(): (() => void) | null {
  const gc = (globalThis as { gc?: () => void }).gc;
  return typeof gc === "function" ? gc : null;
}

function takeMemorySample(label: string) {
  const usage = process.memoryUsage();
  return {
    label,
    rss: usage.rss,
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    external: usage.external,
    arrayBuffers: usage.arrayBuffers ?? 0,
  };
}

function formatMemorySample(sample: ReturnType<typeof takeMemorySample>): string {
  return [
    "  ",
    sample.label.padEnd(18),
    `heap=${formatBytes(sample.heapUsed)}`,
    `rss=${formatBytes(sample.rss)}`,
    `ext=${formatBytes(sample.external)}`,
  ].join(" ");
}

function formatMemoryDelta(
  before: ReturnType<typeof takeMemorySample>,
  after: ReturnType<typeof takeMemorySample>,
): string {
  return [
    "  ",
    "gc:delta".padEnd(18),
    `heap=${formatBytes(after.heapUsed - before.heapUsed)}`,
    `rss=${formatBytes(after.rss - before.rss)}`,
    `ext=${formatBytes(after.external - before.external)}`,
  ].join(" ");
}

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

function writeMemoryLog(lines: string[]): void {
  const output = lines.join("\n") + "\n";
  process.stdout.write(output);
  if (MEMORY_OUTPUT_PATH) {
    fs.mkdirSync(path.dirname(MEMORY_OUTPUT_PATH), { recursive: true });
    fs.appendFileSync(MEMORY_OUTPUT_PATH, output);
  }
}

async function runSsrModuleAssertions(
  run: Awaited<ReturnType<typeof runIntegrationScenario>>,
  runtime: SsrRuntimeExpectation,
): Promise<void> {
  const scopeFromCompile = runtime.scopeFromCompile
    ? run.compile[runtime.scopeFromCompile]?.scopeId
    : undefined;
  if (runtime.scopeFromCompile && !scopeFromCompile) {
    throw new Error(`Runtime scope compile target "${runtime.scopeFromCompile}" not found.`);
  }
  const resourceScope = runtime.scopeId ?? scopeFromCompile ?? run.resourceGraph.root;

  const rootVm = runtime.rootVm;
  class RuntimeApp {
    public constructor() {
      if (rootVm) {
        Object.assign(this, rootVm);
      }
    }

    static $au = {
      type: "custom-element",
      name: runtime.componentName,
      template: runtime.template,
    };
  }

  const aot = compileWithAot(runtime.template, {
    name: runtime.componentName,
    semantics: run.semantics,
    resourceGraph: run.resourceGraph,
    resourceScope,
    stripSpans: false,
  });

  patchComponentDefinition(RuntimeApp, aot, { name: runtime.componentName });

  const pluginModule = await loadExternalModule(runtime.modulePath, runtime.entry);
  const configuration = pluginModule[runtime.configExport];
  if (!configuration) {
    throw new Error(`Runtime config export "${runtime.configExport}" not found.`);
  }

  if (runtime.patchElementExport && runtime.patches?.includes("bridge-bind-to-bound")) {
    const elementCtor = pluginModule[runtime.patchElementExport] as unknown;
    if (elementCtor && typeof elementCtor === "function") {
      const proto = (elementCtor as { prototype?: { bind?: (...args: unknown[]) => void; bound?: (...args: unknown[]) => void } }).prototype;
      if (proto?.bind && !proto.bound) {
        const originalBind = proto.bind;
        proto.bound = function (...args: unknown[]) {
          return originalBind.apply(this, args);
        };
      }
    }
  }

  let targetVm: Record<string, unknown> | null = null;
  const result = await render(RuntimeApp, {
    register: (container) => {
      container.register(configuration);
    },
    beforeStop: (rootController) => {
      const stack = [rootController as unknown as { children?: unknown[]; vmKind?: string; definition?: { name?: string }; viewModel?: unknown }];
      while (stack.length > 0) {
        const current = stack.pop();
        if (!current) continue;
        if (current.vmKind === "customElement" && current.definition?.name === runtime.elementName) {
          targetVm = (current.viewModel ?? null) as Record<string, unknown> | null;
          break;
        }
        const children = current.children ?? [];
        for (const child of children) {
          stack.push(child as { children?: unknown[]; vmKind?: string; definition?: { name?: string }; viewModel?: unknown });
        }
      }
    },
  });

  if (!targetVm) {
    throw new Error(`Runtime controller "${runtime.elementName}" not found in SSR tree.`);
  }

  if (runtime.vm) {
    for (const [key, expected] of Object.entries(runtime.vm)) {
      const actual = targetVm[key];
      if (Array.isArray(expected) && Array.isArray(actual)) {
        const titles = actual.every((entry) => entry && typeof entry === "object" && "title" in (entry as Record<string, unknown>))
          ? actual.map((entry) => (entry as { title?: string }).title).filter(Boolean)
          : actual;
        expect(titles).toEqual(expected);
        continue;
      }
      expect(actual).toBe(expected);
    }
  }

  if (runtime.htmlLinks) {
    const links = extractPageLinks(result.html);
    expect(links).toEqual(runtime.htmlLinks);
  }
}

async function runBrowserAssertions(runtime: BrowserRuntimeExpectation): Promise<void> {
  const inspection = await inspectBrowserRuntime(runtime);

  if (process.env.AURELIA_HARNESS_DEBUG_PROBES === "1") {
    const configured = JSON.stringify(runtime.probes ?? [], null, 2);
    process.stdout.write(`[browser] configuredProbes\n${configured}\n`);
    const probes = JSON.stringify(inspection.probeResults, null, 2);
    process.stdout.write(`[browser] probeResults\n${probes}\n`);
  }

  expect(inspection.hasRoot).toBe(true);
  expect(inspection.hasController).toBe(true);

  if (runtime.attributes) {
    for (const [name, expectedCount] of Object.entries(runtime.attributes)) {
      const actual = inspection.attributeCounts[name] ?? 0;
      expect(actual, `attribute count for ${name}`).toBe(expectedCount);
    }
  }

  if (runtime.dom && runtime.dom.length > 0) {
    runtime.dom.forEach((expectation, index) => {
      const actual = inspection.domResults[index];
      if (!actual) {
        throw new Error(`Browser DOM expectation missing for "${expectation.selector}".`);
      }
      if (expectation.count !== undefined) {
        expect(actual.count, `count for ${expectation.selector}`).toBe(expectation.count);
      }
      if (expectation.texts) {
        expect(actual.texts, `texts for ${expectation.selector}`).toEqual(expectation.texts);
      }
      if (expectation.contains) {
        for (const fragment of expectation.contains) {
          const matched = actual.texts.some((text) => text.includes(fragment));
          expect(matched, `contains "${fragment}" for ${expectation.selector}`).toBe(true);
        }
      }
    });
  }

  if (runtime.probes && runtime.probes.length > 0) {
    for (const probe of runtime.probes) {
      const result = inspection.probeResults[probe.name];
      if (!result) {
        throw new Error(`Browser probe "${probe.name}" not found in results.`);
      }
      if (!result.ok) {
        throw new Error(`Browser probe "${probe.name}" failed: ${result.error ?? "unknown error"}`);
      }
      if (probe.expect !== undefined) {
        expect(result.value, `probe "${probe.name}"`).toEqual(probe.expect);
      }
    }
  }
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

const runtimeModuleCache = new Map<string, Promise<Record<string, unknown>>>();

async function loadExternalModule(
  modulePath: string,
  entry?: string,
): Promise<Record<string, unknown>> {
  const cacheKey = entry ? `${modulePath}::${entry}` : modulePath;
  if (!runtimeModuleCache.has(cacheKey)) {
    runtimeModuleCache.set(cacheKey, buildExternalModuleBundle(modulePath, entry));
  }
  return runtimeModuleCache.get(cacheKey)!;
}

async function buildExternalModuleBundle(
  modulePath: string,
  entry?: string,
): Promise<Record<string, unknown>> {
  const cacheKey = entry ? `${modulePath}::${entry}` : modulePath;
  const entryPath = entry
    ? (path.isAbsolute(entry) ? entry : path.join(modulePath, entry))
    : path.join(modulePath, "src", "index.ts");
  const buildDir = path.join(REPO_ROOT, ".temp", "integration-harness", hashCacheKey(cacheKey));
  const outfile = path.join(buildDir, "index.mjs");

  await fs.promises.mkdir(buildDir, { recursive: true });
  await ensureAureliaWorkspaceModules(buildDir);

  await build({
    entryPoints: [entryPath],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "es2022",
    sourcemap: "inline",
    resolveExtensions: [".ts", ".js"],
    loader: {
      ".html": "text",
    },
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

function hashCacheKey(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
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
  const ctx: NormalizeContext = {
    exprIds: new Map(),
    nextExprIndex: 0,
  };
  return normalizeSnapshotValue(bundle, ctx) as T;
}

type NormalizeContext = {
  exprIds: Map<string, string>;
  nextExprIndex: number;
};

function normalizeSnapshotValue(value: unknown, ctx: NormalizeContext): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeSnapshotValue(entry, ctx));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      const normalizedKey = normalizeSnapshotString(key, ctx);
      out[normalizedKey] = normalizeSnapshotValue(entry, ctx);
    }
    return out;
  }
  if (typeof value === "string") {
    return normalizeSnapshotString(value, ctx);
  }
  return value;
}

function normalizeSnapshotString(value: string, ctx: NormalizeContext): string {
  const normalizedPath = normalizeSnapshotPath(value);
  return normalizeExprId(normalizedPath, ctx);
}

function normalizeExprId(value: string, ctx: NormalizeContext): string {
  if (!EXPR_ID_PATTERN.test(value)) {
    return value;
  }
  const existing = ctx.exprIds.get(value);
  if (existing) {
    return existing;
  }
  const normalized = `expr_${String(ctx.nextExprIndex).padStart(4, "0")}`;
  ctx.nextExprIndex += 1;
  ctx.exprIds.set(value, normalized);
  return normalized;
}

function normalizeSnapshotPath(value: string): string {
  const normalizedRoot = normalizePathForCompare(REPO_ROOT);
  if (!normalizedRoot) return value;
  const normalizedValue = value.replace(/\\/g, "/");
  const normalized = normalizePathForCompare(normalizedValue);
  const prefix = normalizedRoot.endsWith("/") ? normalizedRoot : `${normalizedRoot}/`;
  if (normalized.startsWith(prefix)) {
    return normalizedValue.slice(prefix.length);
  }
  if (normalized.includes(prefix)) {
    const flags = process.platform === "win32" ? "gi" : "g";
    const pattern = new RegExp(escapeRegExp(prefix), flags);
    return normalizedValue.replace(pattern, "");
  }
  return value;
}

function normalizePathForCompare(value: string): string {
  const normalized = value.replace(/\\/g, "/");
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const EXPR_ID_PATTERN = /^expr_[0-9a-f]{8,}$/i;
