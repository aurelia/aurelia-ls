import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { resolve } from "@aurelia/kernel";
import {
  compileAndRenderAot,
  compileWithAot,
  patchComponentDefinition,
  renderWithComponents,
} from "@aurelia-ls/ssr";

import {
  runIntegrationScenario,
  resolveExternalPackagePath,
  type IntegrationScenario,
  type SsrHydrationExpectation,
  type DomExpectation,
  type ParityExpectation,
  type DoubleRenderExpectation,
  type ManifestExpectation,
  type HydrationMutation,
} from "@aurelia-ls/integration-harness";
import {
  checkForDoubleRender,
  countElements,
  createComponent,
  createHydrationContext,
  getTexts,
  hydrateSsr,
} from "./_helpers/ssr-hydration.js";
import { loadExternalModule } from "./_helpers/external-modules.js";

type HydrationCase = SsrHydrationExpectation & {
  dependencies?: Array<new () => Record<string, unknown>>;
};

const BASE_SOURCE: IntegrationScenario["source"] = {
  kind: "memory",
  files: {
    "/src/entry.ts": "export const marker = 0;",
  },
};
const AURELIA_TABLE_PACKAGE = resolveExternalPackagePath("aurelia2-table");
const HAS_AURELIA_TABLE = fs.existsSync(path.join(AURELIA_TABLE_PACKAGE, "package.json"));
const AURELIA_STATE_PACKAGE = resolveExternalPackagePath("@aurelia/state");
const HAS_AURELIA_STATE = fs.existsSync(path.join(AURELIA_STATE_PACKAGE, "package.json"));

const EXPLICIT_CE_RESOURCES = {
  elements: {
    "child-panel": {
      kind: "element",
      name: "child-panel",
      bindables: {
        items: { name: "items" },
        label: { name: "label" },
      },
      boundary: true,
    },
  },
} as const;

const TEMPLATE_MAP: Record<string, string> = {
  "repeat-basic": [
    "<ul>",
    "  <li repeat.for=\"item of items\" class=\"item\">${item}</li>",
    "</ul>",
  ].join("\n"),
  "if-else-toggle": [
    "<section>",
    "  <div if.bind=\"show\" class=\"panel\">",
    "    <span class=\"value\">${label}</span>",
    "  </div>",
    "  <div else class=\"empty\">Nothing</div>",
    "</section>",
  ].join("\n"),
  "repeat-in-if": [
    "<div if.bind=\"items.length\">",
    "  <span repeat.for=\"item of items\" class=\"entry\">${item}</span>",
    "</div>",
  ].join("\n"),
  "switch-basic": [
    "<div switch.bind=\"status\">",
    "  <span case=\"ready\" class=\"status-ready\">Ready</span>",
    "  <span case=\"busy\" class=\"status-busy\">Busy</span>",
    "  <span default-case class=\"status-default\">Unknown</span>",
    "</div>",
  ].join("\n"),
  "with-context": [
    "<div with.bind=\"user\">",
    "  <span class=\"name\">${name}</span>",
    "  <span if.bind=\"role\" class=\"role\">${role}</span>",
    "</div>",
  ].join("\n"),
  "nested-groups": [
    "<div repeat.for=\"group of groups\" class=\"group\">",
    "  <h4 class=\"group-title\">${group.title}</h4>",
    "  <div repeat.for=\"item of group.items\" class=\"item\">${item}</div>",
    "</div>",
  ].join("\n"),
  "computed-summary": [
    "<div>",
    "  <span class=\"count\">${count}</span>",
    "  <ul>",
    "    <li repeat.for=\"item of items\" class=\"item\">${item}</li>",
    "  </ul>",
    "</div>",
  ].join("\n"),
  "attribute-binding": [
    "<div class.bind=\"isActive ? 'active' : 'inactive'\" data-kind.bind=\"kind\">",
    "  <span class=\"label\">${label}</span>",
    "</div>",
  ].join("\n"),
  "ce-boundary-repeat": [
    "<section class=\"parent-shell\">",
    "  <child-panel items.bind=\"items\" label.bind=\"label\"></child-panel>",
    "</section>",
  ].join("\n"),
};

class ComputedSummaryVm {
  get count() {
    return Array.isArray(this.items) ? this.items.length : 0;
  }
}

const CHILD_PANEL_TEMPLATE = [
  "<div class=\"child-panel\">",
  "  <h4 class=\"child-label\">${label}</h4>",
  "  <ul>",
  "    <li repeat.for=\"item of items\" class=\"child-item\">${item}</li>",
  "  </ul>",
  "  <div if.bind=\"!items.length\" class=\"child-empty\">Empty</div>",
  "</div>",
].join("\n");

const THIRD_PARTY_HYDRATION_TEMPLATE = [
  "<section class=\"third-party-shell\">",
  "  <aut-pagination",
  "    total-items.bind=\"totalItems\"",
  "    page-size.bind=\"pageSize\"",
  "    current-page.bind=\"page\"",
  "    direction-links.bind=\"false\"",
  "    boundary-links.bind=\"false\">",
  "  </aut-pagination>",
  "  <p class=\"page-value\">${page}</p>",
  "</section>",
].join("\n");

const STATE_PLUGIN_TEMPLATE = [
  "<section class=\"state-shell\">",
  "  <p class=\"count\">${count & state}</p>",
  "  <button class=\"inc\" click.trigger=\"increment()\">+</button>",
  "</section>",
].join("\n");

const ChildPanel = createComponent(
  "child-panel",
  CHILD_PANEL_TEMPLATE,
  {},
  class {},
  {
    bindables: {
      items: {},
      label: {},
    },
  },
);

const HYDRATION_CASES: HydrationCase[] = [
  {
    id: "repeat-basic",
    target: "repeat-basic",
    componentName: "repeat-basic",
    ssrState: {
      items: ["Alpha", "Beta", "Gamma"],
    },
    expectMarkers: "present",
    ssrDom: [
      {
        selector: ".item",
        count: 3,
        texts: ["Alpha", "Beta", "Gamma"],
      },
    ],
    hydrateDom: [
      {
        selector: ".item",
        count: 3,
        texts: ["Alpha", "Beta", "Gamma"],
      },
    ],
    parity: [{ selector: ".item" }],
    doubleRender: [
      {
        selector: ".item",
        expectedTexts: ["Alpha", "Beta", "Gamma"],
      },
    ],
    mutations: [
      {
        description: "add item",
        mutate: (vm) => {
          (vm.items as string[]).push("Delta");
        },
        expect: [
          { selector: ".item", count: 4, contains: ["Delta"] },
        ],
      },
      {
        description: "remove item",
        mutate: (vm) => {
          (vm.items as string[]).shift();
        },
        expect: [
          { selector: ".item", count: 3 },
        ],
      },
    ],
  },
  {
    id: "if-else-toggle",
    target: "if-else-toggle",
    componentName: "if-else-toggle",
    ssrState: {
      show: true,
      label: "Online",
    },
    expectMarkers: "present",
    ssrDom: [
      { selector: ".panel", count: 1 },
      { selector: ".empty", count: 0 },
      { selector: ".value", texts: ["Online"] },
    ],
    hydrateDom: [
      { selector: ".panel", count: 1 },
      { selector: ".empty", count: 0 },
    ],
    parity: [
      { selector: ".panel" },
      { selector: ".empty" },
    ],
    mutations: [
      {
        description: "toggle false",
        mutate: (vm) => {
          vm.show = false;
        },
        expect: [
          { selector: ".panel", count: 0 },
          { selector: ".empty", count: 1 },
        ],
      },
      {
        description: "toggle true with new label",
        mutate: (vm) => {
          vm.show = true;
          vm.label = "Offline";
        },
        expect: [
          { selector: ".panel", count: 1 },
          { selector: ".value", texts: ["Offline"] },
        ],
      },
    ],
  },
  {
    id: "repeat-in-if",
    target: "repeat-in-if",
    componentName: "repeat-in-if",
    ssrState: {
      items: ["One", "Two"],
    },
    expectMarkers: "present",
    manifest: {
      root: "repeat-in-if",
      controllers: {
        if: 1,
        repeat: 1,
      },
    },
    ssrDom: [
      { selector: ".entry", count: 2, texts: ["One", "Two"] },
    ],
    hydrateDom: [
      { selector: ".entry", count: 2 },
    ],
    parity: [{ selector: ".entry" }],
    doubleRender: [
      { selector: ".entry", expectedTexts: ["One", "Two"] },
    ],
    mutations: [
      {
        description: "clear list",
        mutate: (vm) => {
          vm.items = [];
        },
        expect: [{ selector: ".entry", count: 0 }],
      },
      {
        description: "restore list",
        mutate: (vm) => {
          vm.items = ["Three"];
        },
        expect: [{ selector: ".entry", count: 1, texts: ["Three"] }],
      },
    ],
  },
  {
    id: "switch-basic",
    target: "switch-basic",
    componentName: "switch-basic",
    ssrState: {
      status: "busy",
    },
    expectMarkers: "present",
    manifest: {
      root: "switch-basic",
      controllers: {
        switch: 1,
        case: 2,
        "default-case": 1,
      },
    },
    ssrDom: [
      { selector: ".status-busy", count: 1, texts: ["Busy"] },
      { selector: ".status-ready", count: 0 },
      { selector: ".status-default", count: 0 },
    ],
    hydrateDom: [
      { selector: ".status-busy", count: 1 },
    ],
    parity: [{ selector: ".status-busy" }],
    doubleRender: [
      { selector: ".status-busy", expectedTexts: ["Busy"] },
    ],
    mutations: [
      {
        description: "switch to ready",
        mutate: (vm) => {
          vm.status = "ready";
        },
        expect: [
          { selector: ".status-ready", count: 1, texts: ["Ready"] },
          { selector: ".status-busy", count: 0 },
        ],
      },
      {
        description: "switch to default",
        mutate: (vm) => {
          vm.status = "unknown";
        },
        expect: [
          { selector: ".status-default", count: 1, texts: ["Unknown"] },
          { selector: ".status-ready", count: 0 },
        ],
      },
    ],
  },
  {
    id: "with-context",
    target: "with-context",
    componentName: "with-context",
    ssrState: {
      user: { name: "Nia", role: "Admin" },
    },
    expectMarkers: "present",
    ssrDom: [
      { selector: ".name", texts: ["Nia"] },
      { selector: ".role", count: 1, texts: ["Admin"] },
    ],
    hydrateDom: [
      { selector: ".name", texts: ["Nia"] },
    ],
    parity: [{ selector: ".name" }],
    mutations: [
      {
        description: "update user",
        mutate: (vm) => {
          const user = vm.user as { name?: string; role?: string };
          user.name = "Ezra";
          user.role = "";
        },
        expect: [
          { selector: ".name", texts: ["Ezra"] },
          { selector: ".role", count: 0 },
        ],
      },
      {
        description: "restore role",
        mutate: (vm) => {
          const user = vm.user as { role?: string };
          user.role = "Staff";
        },
        expect: [
          { selector: ".role", count: 1, texts: ["Staff"] },
        ],
      },
    ],
  },
  {
    id: "nested-groups",
    target: "nested-groups",
    componentName: "nested-groups",
    ssrState: {
      groups: [
        { title: "Group A", items: ["A1", "A2"] },
        { title: "Group B", items: ["B1"] },
      ],
    },
    expectMarkers: "present",
    manifest: {
      root: "nested-groups",
      controllers: {
        repeat: 3,
      },
    },
    ssrDom: [
      { selector: ".group", count: 2 },
      { selector: ".group-title", texts: ["Group A", "Group B"] },
      { selector: ".item", count: 3 },
    ],
    hydrateDom: [
      { selector: ".group", count: 2 },
      { selector: ".item", count: 3 },
    ],
    parity: [{ selector: ".item" }],
    doubleRender: [
      { selector: ".group-title", expectedTexts: ["Group A", "Group B"] },
    ],
    mutations: [
      {
        description: "add item",
        mutate: (vm) => {
          (vm.groups as Array<{ items: string[] }>)[0].items.push("A3");
        },
        expect: [
          { selector: ".item", count: 4, contains: ["A3"] },
        ],
      },
      {
        description: "add group",
        mutate: (vm) => {
          (vm.groups as Array<{ title: string; items: string[] }>).push({
            title: "Group C",
            items: ["C1"],
          });
        },
        expect: [
          { selector: ".group", count: 3 },
          { selector: ".item", count: 5 },
        ],
      },
    ],
  },
  {
    id: "computed-summary",
    target: "computed-summary",
    componentName: "computed-summary",
    componentClass: ComputedSummaryVm,
    ssrState: {
      items: ["Red", "Green"],
    },
    expectMarkers: "present",
    ssrDom: [
      { selector: ".count", texts: ["2"] },
      { selector: ".item", count: 2 },
    ],
    hydrateDom: [
      { selector: ".count", texts: ["2"] },
      { selector: ".item", count: 2 },
    ],
    parity: [{ selector: ".count" }],
    mutations: [
      {
        description: "push item",
        mutate: (vm) => {
          (vm.items as string[]).push("Blue");
        },
        expect: [
          { selector: ".count", texts: ["3"] },
          { selector: ".item", count: 3 },
        ],
      },
    ],
  },
  {
    id: "attribute-binding",
    target: "attribute-binding",
    componentName: "attribute-binding",
    ssrState: {
      isActive: true,
      kind: "alpha",
      label: "Hello",
    },
    expectMarkers: "present",
    ssrDom: [
      { selector: ".active", count: 1 },
      { selector: ".label", texts: ["Hello"] },
    ],
    hydrateDom: [
      { selector: ".active", count: 1 },
    ],
    parity: [{ selector: ".label" }],
    mutations: [
      {
        description: "toggle class and attribute",
        mutate: (vm) => {
          vm.isActive = false;
          vm.kind = "beta";
          vm.label = "Hi";
        },
        expect: [
          { selector: ".inactive", count: 1 },
          { selector: ".label", texts: ["Hi"] },
        ],
      },
    ],
  },
  {
    id: "repeat-basic-markers-stripped",
    target: "repeat-basic",
    componentName: "repeat-basic",
    ssrState: {
      items: ["Alpha", "Beta", "Gamma"],
    },
    ssrOptions: {
      stripMarkers: true,
    },
    expectMarkers: "absent",
    expectHydrationError: true,
  },
  {
    id: "ce-boundary-repeat",
    target: "ce-boundary-repeat",
    componentName: "ce-boundary-repeat",
    ssrState: {
      items: ["North", "South"],
      label: "Regions",
    },
    expectMarkers: "present",
    manifest: {
      root: "ce-boundary-repeat",
      controllers: {
        repeat: 1,
        if: 1,
      },
    },
    ssrDom: [
      { selector: ".child-label", texts: ["Regions"] },
      { selector: ".child-item", count: 2, texts: ["North", "South"] },
      { selector: ".child-empty", count: 0 },
    ],
    hydrateDom: [
      { selector: ".child-label", texts: ["Regions"] },
      { selector: ".child-item", count: 2 },
    ],
    parity: [
      { selector: ".child-item" },
    ],
    doubleRender: [
      { selector: ".child-item", expectedTexts: ["North", "South"] },
    ],
    mutations: [
      {
        description: "remove all items",
        mutate: (vm) => {
          vm.items = [];
        },
        expect: [
          { selector: ".child-item", count: 0 },
          { selector: ".child-empty", count: 1 },
        ],
      },
      {
        description: "restore items",
        mutate: (vm) => {
          vm.items = ["East"];
        },
        expect: [
          { selector: ".child-item", count: 1, texts: ["East"] },
          { selector: ".child-empty", count: 0 },
        ],
      },
    ],
    dependencies: [ChildPanel],
  },
];

const MATRIX_SCENARIO: IntegrationScenario = {
  id: "ssr-hydration-matrix",
  title: "SSR + hydration parity matrix",
  tags: ["ssr", "hydration", "aot"],
  source: BASE_SOURCE,
  resolution: {
    explicitResources: EXPLICIT_CE_RESOURCES,
  },
  compile: Object.entries(TEMPLATE_MAP).map(([id, markup]) => ({
    id,
    templatePath: `/src/${id}.html`,
    markup,
    aot: true,
  })),
  expect: {
    ssr: HYDRATION_CASES,
  },
};

describe("integration harness: SSR + hydration parity", () => {
  test("runs SSR/hydration matrix cases", async () => {
    const run = await runIntegrationScenario(MATRIX_SCENARIO);
    const cases = MATRIX_SCENARIO.expect?.ssr ?? [];
    for (const entry of cases) {
      await runSsrHydrationCase(run, entry);
    }
  });
});

describe("integration harness: third-party hydration parity", () => {
  test.skipIf(!HAS_AURELIA_TABLE)("hydrates third-party bindings after SSR", async () => {
    const scenario: IntegrationScenario = {
      id: "third-party-hydration-parity",
      title: "Third-party SSR + hydration preserves bindings",
      tags: ["ssr", "hydration", "third-party"],
      source: BASE_SOURCE,
      externalPackages: [{ id: "aurelia2-table", preferSource: true }],
    };

    const run = await runIntegrationScenario(scenario);
    const pluginModule = await loadExternalModule(AURELIA_TABLE_PACKAGE);
    const AureliaTableConfiguration = pluginModule.AureliaTableConfiguration as {
      register: (container: unknown) => void;
    };
    const AutPaginationCustomElement = pluginModule.AutPaginationCustomElement as new () => Record<string, unknown>;
    ensureBoundLifecycle(AutPaginationCustomElement);

    const ThirdPartyHydrationApp = createComponent(
      "third-party-hydration-app",
      THIRD_PARTY_HYDRATION_TEMPLATE,
      {
        page: 1,
        pageSize: 5,
        totalItems: 12,
      },
    );

    const rootAot = compileWithAot(THIRD_PARTY_HYDRATION_TEMPLATE, {
      name: "third-party-hydration-app",
      semantics: run.semantics,
      resourceGraph: run.resourceGraph,
      resourceScope: run.resourceGraph.root,
    });
    patchComponentDefinition(ThirdPartyHydrationApp, rootAot, { name: "third-party-hydration-app" });

    const renderResult = await renderWithComponents(ThirdPartyHydrationApp, {
      register: (container) => {
        container.register(AureliaTableConfiguration);
      },
    });

    const ssrContext = createHydrationContext(
      renderResult.html,
      { page: 1, pageSize: 5, totalItems: 12 },
      renderResult.manifest,
      {
        ssrDef: {
          template: rootAot.template,
          instructions: rootAot.instructions,
        },
      },
    );
    expect(countElements(ssrContext.host, "aut-pagination")).toBe(1);
    expect(getTexts(ssrContext.host, ".page-value")).toEqual(["1"]);
    ssrContext.dom.window.close();

    const hydrated = await hydrateSsr(
      renderResult.html,
      { page: 1, pageSize: 5, totalItems: 12 },
      renderResult.manifest,
      rootAot,
      {
        componentName: "third-party-hydration-app",
        componentClass: ThirdPartyHydrationApp,
        register: (container) => {
          container.register(AureliaTableConfiguration);
        },
      },
    );

    expect(getTexts(hydrated.host, ".page-value")).toEqual(["1"]);
    (globalThis as { CustomEvent?: typeof CustomEvent }).CustomEvent = hydrated.dom.window.CustomEvent;
    const paginationVm = resolvePaginationViewModel(hydrated);
    expect(paginationVm.totalPages).toBe(3);
    hydrated.vm.page = 2;
    await flushDom();
    expect(paginationVm.currentPage).toBe(2);

    paginationVm.selectPage?.(3);
    await flushDom();
    expect(hydrated.vm.page).toBe(3);

    await hydrated.stop();
  });
});

describe("integration harness: state plugin SSR + hydration", () => {
  test.skipIf(!HAS_AURELIA_STATE)("hydrates store-backed bindings", async () => {
    const scenario: IntegrationScenario = {
      id: "state-plugin-ssr",
      title: "State plugin SSR + hydration preserves bindings",
      tags: ["ssr", "hydration", "state"],
      source: BASE_SOURCE,
      externalPackages: [{ id: "@aurelia/state", preferSource: true }],
    };
    const run = await runIntegrationScenario(scenario);
    const stateModule = await loadExternalModule(AURELIA_STATE_PACKAGE);
    const StateDefaultConfiguration = stateModule.StateDefaultConfiguration as {
      init: (state: unknown, ...handlers: Array<(state: unknown, action: unknown) => unknown>) => {
        register: (container: unknown) => void;
      };
    };
    const IStore = stateModule.IStore as unknown;

    type CounterState = { count: number };
    type CounterAction = { type: "inc" };
    const counterHandler = (state: CounterState, action: CounterAction) => {
      if (action.type === "inc") {
        return { ...state, count: state.count + 1 };
      }
      return state;
    };

    class StateApp {
      private readonly store = resolve(IStore) as {
        dispatch(action: CounterAction): void;
        getState(): CounterState;
      };

      public get count(): number {
        return this.store.getState().count;
      }

      public increment(): void {
        this.store.dispatch({ type: "inc" });
      }

      static $au = {
        type: "custom-element",
        name: "state-app",
        template: STATE_PLUGIN_TEMPLATE,
      };
    }

    const rootAot = compileWithAot(STATE_PLUGIN_TEMPLATE, {
      name: "state-app",
      semantics: run.semantics,
      resourceGraph: run.resourceGraph,
      resourceScope: run.resourceGraph.root,
    });
    patchComponentDefinition(StateApp, rootAot, { name: "state-app" });

    const registerState = (container: { register: (...args: unknown[]) => void }) => {
      container.register(StateDefaultConfiguration.init({ count: 0 }, counterHandler));
    };

    const renderResult = await renderWithComponents(StateApp, {
      register: registerState,
    });

    const ssrState = {};
    const ssrContext = createHydrationContext(
      renderResult.html,
      ssrState,
      renderResult.manifest,
      {
        ssrDef: {
          template: rootAot.template,
          instructions: rootAot.instructions,
        },
      },
    );
    expect(getTexts(ssrContext.host, ".count")).toEqual(["0"]);
    ssrContext.dom.window.close();

    const hydrated = await hydrateSsr(
      renderResult.html,
      ssrState,
      renderResult.manifest,
      rootAot,
      {
        componentName: "state-app",
        componentClass: StateApp,
        register: registerState,
      },
    );

    expect(getTexts(hydrated.host, ".count")).toEqual(["0"]);
    hydrated.vm.increment?.();
    await flushDom();
    expect(getTexts(hydrated.host, ".count")).toEqual(["1"]);

    await hydrated.stop();
  });
});

async function runSsrHydrationCase(
  run: Awaited<ReturnType<typeof runIntegrationScenario>>,
  expectation: HydrationCase,
): Promise<void> {
  const compile = run.compile[expectation.target];
  if (!compile) {
    throw new Error(`SSR case "${expectation.id}" references missing compile target "${expectation.target}".`);
  }

  const componentName = expectation.componentName;
  const dependencies = expectation.dependencies ?? [];
  const Component = expectation.componentClass
    ? createComponent(
      componentName,
      compile.markup,
      expectation.ssrState,
      expectation.componentClass,
      dependencies.length ? { dependencies } : {},
    )
    : createComponent(
      componentName,
      compile.markup,
      expectation.ssrState,
      class {},
      dependencies.length ? { dependencies } : {},
    );

  let ssrResult: {
    html: string;
    aot: ReturnType<typeof compileWithAot>;
    manifest: { root?: string; manifest?: unknown };
  };
  if (dependencies.length > 0) {
    for (const Dep of dependencies) {
      const def = (Dep as { $au?: { name?: string; template?: string } }).$au;
      if (!def?.name || typeof def.template !== "string") {
        throw new Error(`Dependency for SSR case "${expectation.id}" is missing $au.name or $au.template.`);
      }
      const depAot = compileWithAot(def.template, {
        name: def.name,
        semantics: run.semantics,
        resourceGraph: run.resourceGraph,
        resourceScope: run.resourceGraph.root,
      });
      patchComponentDefinition(Dep, depAot, { name: def.name });
    }

    const rootAot = compileWithAot(compile.markup, {
      name: componentName,
      templatePath: compile.templatePath,
      semantics: run.semantics,
      resourceGraph: run.resourceGraph,
      resourceScope: compile.scopeId,
    });
    patchComponentDefinition(Component, rootAot, { name: componentName });

    const renderResult = await renderWithComponents(Component, {
      childComponents: dependencies,
      ssr: expectation.ssrOptions,
    });

    ssrResult = {
      html: renderResult.html,
      aot: rootAot,
      manifest: renderResult.manifest,
    };
  } else {
    ssrResult = await compileAndRenderAot(Component, {
      name: componentName,
      templatePath: compile.templatePath,
      semantics: run.semantics,
      resourceGraph: run.resourceGraph,
      resourceScope: compile.scopeId,
      ssr: expectation.ssrOptions,
    });
  }

  if (expectation.expectMarkers === "present") {
    expect(ssrResult.html.includes("<!--au-->")).toBe(true);
  }
  if (expectation.expectMarkers === "absent") {
    expect(ssrResult.html.includes("<!--au-->")).toBe(false);
  }

  assertManifest(expectation.manifest, ssrResult.manifest);

  const ssrContext = createHydrationContext(
    ssrResult.html,
    expectation.ssrState,
    ssrResult.manifest,
    {
      hostElement: expectation.host,
      ssrDef: {
        template: ssrResult.aot.template,
        instructions: ssrResult.aot.instructions,
      },
    },
  );
  assertDomExpectations("SSR", ssrContext, expectation.ssrDom);
  const parityCounts = captureParityCounts(ssrContext, expectation.parity);
  ssrContext.dom.window.close();

  const hydrationState = expectation.clientState ?? expectation.ssrState;
  let hydrated: Awaited<ReturnType<typeof hydrateSsr>> | null = null;
  try {
    hydrated = await hydrateSsr(
      ssrResult.html,
      hydrationState,
      ssrResult.manifest,
      ssrResult.aot,
      {
        componentName,
        hostElement: expectation.host,
        componentClass: Component,
        childComponents: dependencies.length ? dependencies : undefined,
      },
    );
  } catch (error) {
    if (expectation.expectHydrationError) {
      if (expectation.hydrationErrorContains && error instanceof Error) {
        expect(error.message).toContain(expectation.hydrationErrorContains);
      }
      return;
    }
    throw error;
  }

  if (expectation.expectHydrationError) {
    throw new Error(`SSR case "${expectation.id}" expected hydration to fail.`);
  }

  if (!hydrated) {
    throw new Error(`SSR case "${expectation.id}" did not produce hydration result.`);
  }

  assertDomExpectations("Hydration", hydrated, expectation.hydrateDom);
  assertParityCounts(parityCounts, hydrated, expectation.parity);
  assertDoubleRender(expectation.doubleRender, hydrated);
  await applyMutations(hydrated, expectation.mutations);

  await hydrated.stop();
}

function assertDomExpectations(
  label: string,
  root: { host: Element; document: Document },
  expectations: readonly DomExpectation[] | undefined,
): void {
  if (!expectations) return;

  for (const expectation of expectations) {
    const scope = resolveScope(root, expectation.scope);
    const count = expectation.count;
    if (count !== undefined) {
      expect(countElements(scope, expectation.selector), `${label}: ${expectation.selector}`).toBe(count);
    }

    if (expectation.texts) {
      expect(getTexts(scope, expectation.selector), `${label}: ${expectation.selector}`).toEqual(expectation.texts);
    }

    if (expectation.contains) {
      const texts = getTexts(scope, expectation.selector);
      for (const expected of expectation.contains) {
        expect(texts, `${label}: ${expectation.selector}`).toContain(expected);
      }
    }
  }
}

function captureParityCounts(
  root: { host: Element; document: Document },
  parity: readonly ParityExpectation[] | undefined,
): Map<string, number> {
  const counts = new Map<string, number>();
  if (!parity) return counts;

  for (const entry of parity) {
    const scope = resolveScope(root, entry.scope);
    const key = `${entry.scope ?? "host"}::${entry.selector}`;
    counts.set(key, countElements(scope, entry.selector));
  }

  return counts;
}

function assertParityCounts(
  counts: Map<string, number>,
  root: { host: Element; document: Document },
  parity: readonly ParityExpectation[] | undefined,
): void {
  if (!parity) return;
  for (const entry of parity) {
    const scope = resolveScope(root, entry.scope);
    const key = `${entry.scope ?? "host"}::${entry.selector}`;
    const expected = counts.get(key);
    if (expected === undefined) continue;
    expect(countElements(scope, entry.selector), `Parity: ${entry.selector}`).toBe(expected);
  }
}

function assertDoubleRender(
  expectations: readonly DoubleRenderExpectation[] | undefined,
  root: { host: Element; document: Document },
): void {
  if (!expectations) return;

  for (const expectation of expectations) {
    const scope = resolveScope(root, expectation.scope ?? "document");
    const result = checkForDoubleRender(scope, expectation.selector);

    if (expectation.expectedTexts) {
      expect(result.texts.filter(Boolean)).toEqual(expectation.expectedTexts);
    }

    const shouldDuplicate = expectation.expectDuplicates ?? false;
    if (shouldDuplicate) {
      expect(result.hasDuplicates).toBe(true);
      if (expectation.minDuplicates !== undefined) {
        expect(result.duplicates.length).toBeGreaterThanOrEqual(expectation.minDuplicates);
      }
    } else {
      expect(result.hasDuplicates, `Double render: ${expectation.selector}`).toBe(false);
    }
  }
}

async function applyMutations(
  hydrated: Awaited<ReturnType<typeof hydrateSsr>>,
  mutations: readonly HydrationMutation[] | undefined,
): Promise<void> {
  if (!mutations) return;

  for (const mutation of mutations) {
    await mutation.mutate(hydrated.vm);
    await flushDom();
    assertDomExpectations(
      mutation.description ?? "mutation",
      hydrated,
      mutation.expect,
    );
  }
}

function assertManifest(
  expectation: ManifestExpectation | undefined,
  manifest: { root?: string; manifest?: unknown },
): void {
  if (!expectation) return;

  if (expectation.root) {
    expect(manifest.root).toBe(expectation.root);
  }

  if (!expectation.controllers) return;
  const rootScope = manifest.manifest;
  if (!rootScope || typeof rootScope !== "object") {
    throw new Error("SSR manifest root scope missing.");
  }
  const counts = countManifestControllers(rootScope as { children?: unknown[] });

  for (const [controller, expected] of Object.entries(expectation.controllers)) {
    const actual = counts[controller] ?? 0;
    expect(actual, `manifest:${controller}`).toBe(expected);
  }
}

function countManifestControllers(scope: { children?: unknown[] }): Record<string, number> {
  const counts: Record<string, number> = {};
  const stack: Array<{ children?: unknown[] }> = [scope];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const children = current.children ?? [];
    for (const child of children) {
      if (isTemplateControllerNode(child)) {
        counts[child.type] = (counts[child.type] ?? 0) + 1;
        for (const view of child.views ?? []) {
          if (view && typeof view === "object") {
            stack.push(view as { children?: unknown[] });
          }
        }
        continue;
      }

      if (isScopeNode(child)) {
        stack.push(child as { children?: unknown[] });
      }
    }
  }

  return counts;
}

function resolveScope(
  root: { host: Element; document: Document },
  scope: "host" | "document" | undefined,
): Element | Document {
  return scope === "document" ? root.document : root.host;
}

async function flushDom(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function resolvePaginationViewModel(hydrated: {
  host: Element;
  document: Document;
  appRoot: { controller?: unknown };
}): { selectPage?: (page: number) => void } {
  const hostElement = hydrated.document.querySelector("aut-pagination") as
    | (Element & { $au?: Record<string, unknown> })
    | null;
  const viaElement = hostElement?.$au?.["au:resource:custom-element"] as
    | { viewModel?: { selectPage?: (page: number) => void } }
    | undefined;
  if (viaElement?.viewModel?.selectPage) {
    return viaElement.viewModel;
  }
  const viaController = findControllerByName(hydrated.appRoot?.controller, "aut-pagination");
  if (viaController?.viewModel?.selectPage) {
    return viaController.viewModel;
  }
  throw new Error("Unable to locate aut-pagination view model for interaction.");
}

function findControllerByName(
  root: unknown,
  name: string,
): { viewModel?: { selectPage?: (page: number) => void } } | null {
  if (!root || typeof root !== "object") return null;
  const definitionName = (root as { definition?: { name?: string } }).definition?.name;
  if (definitionName === name) {
    return root as { viewModel?: { selectPage?: (page: number) => void } };
  }
  const children = (root as { children?: unknown[] }).children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findControllerByName(child, name);
      if (found) return found;
    }
  }
  return null;
}

function isTemplateControllerNode(
  entry: unknown,
): entry is { type: string; views?: unknown[] } {
  if (!entry || typeof entry !== "object") return false;
  return "type" in entry && "views" in entry;
}

function isScopeNode(entry: unknown): entry is { children?: unknown[] } {
  if (!entry || typeof entry !== "object") return false;
  return "children" in entry && !("type" in entry);
}

function ensureBoundLifecycle(elementCtor: unknown): void {
  const proto = (elementCtor as { prototype?: { bind?: (...args: unknown[]) => void; bound?: (...args: unknown[]) => void } })
    .prototype;
  if (proto?.bind && !proto.bound) {
    proto.bound = function (...args: unknown[]) {
      return proto.bind?.apply(this, args);
    };
  }
}

function findPageLink(document: Document, text: string): HTMLAnchorElement | null {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a.page-link"));
  return links.find((link) => link.textContent?.trim() === text) ?? null;
}

function findActivePage(document: Document): HTMLAnchorElement | null {
  return document.querySelector<HTMLAnchorElement>("li.page-item.active a.page-link");
}
