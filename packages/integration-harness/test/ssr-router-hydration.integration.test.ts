import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { IContainer, Registration, resolve } from "@aurelia/kernel";
import { AppTask, CustomElement, Rendering } from "@aurelia/runtime-html";
import {
  ILocationManager,
  IRouter,
  IRouterOptions,
  RouteContext,
  RouterOptions,
  ServerLocationManager,
  ViewportCustomElement,
  route,
} from "@aurelia/router";
import {
  compileWithAot,
  patchComponentDefinition,
  renderWithComponents,
} from "@aurelia-ls/ssr";
import {
  resolveExternalPackagePath,
  runIntegrationScenario,
  type IntegrationScenario,
} from "@aurelia-ls/integration-harness";
import {
  checkForDoubleRender,
  countElements,
  createHydrationContext,
  getTexts,
  hydrateSsr,
} from "./_helpers/ssr-hydration.js";
import { loadExternalModule } from "./_helpers/external-modules.js";
import { ensureBoundLifecycle, patchAutPaginationDefinition } from "./_helpers/third-party.js";

const AURELIA_TABLE_PACKAGE = resolveExternalPackagePath("aurelia2-table");
const HAS_AURELIA_TABLE = fs.existsSync(path.join(AURELIA_TABLE_PACKAGE, "package.json"));
const AURELIA_STATE_PACKAGE = resolveExternalPackagePath("@aurelia/state");
const HAS_AURELIA_STATE = fs.existsSync(path.join(AURELIA_STATE_PACKAGE, "package.json"));

if (process.env.AURELIA_DEBUG_AOT === "1") {
  process.env.AURELIA_SSR_DEBUG_MISMATCH = "1";
  const originalRender = Rendering.prototype.render;
  Rendering.prototype.render = function (controller, targets, definition, host) {
    try {
      return originalRender.call(this, controller, targets, definition, host);
    } catch (error) {
      if (error instanceof Error && error.message.includes("AUR0757")) {
        const template = definition.template;
        const markerCount = typeof template === "string"
          ? (template.match(/<!--au-->/g) ?? []).length
          : null;
        // eslint-disable-next-line no-console
        console.log("[render-mismatch]", {
          name: definition.name,
          targetCount: targets.length,
          rowCount: definition.instructions.length,
          markerCount,
          templateType: template == null ? "null" : typeof template,
        });
      }
      throw error;
    }
  };
}

class HomePage {
  title = "Home";
  message = "Welcome to the home page";

  static $au = {
    type: "custom-element",
    name: "home-page",
  };
}

const HOME_TEMPLATE = [
  "<div class=\"page home-page\">",
  "  <h1>${title}</h1>",
  "  <p>${message}</p>",
  "</div>",
].join("\n");

class AboutPage {
  title = "About";
  description = "This is the about page";

  static $au = {
    type: "custom-element",
    name: "about-page",
  };
}

const ABOUT_TEMPLATE = [
  "<div class=\"page about-page\">",
  "  <h1>${title}</h1>",
  "  <p>${description}</p>",
  "</div>",
].join("\n");

const THIRD_PARTY_PAGE_TEMPLATE = [
  "<div class=\"page third-party-page\">",
  "  <h1>${title}</h1>",
  "  <aut-pagination",
  "    total-items.bind=\"totalItems\"",
  "    page-size.bind=\"pageSize\"",
  "    current-page.bind=\"page\"",
  "    direction-links.bind=\"false\"",
  "    boundary-links.bind=\"false\">",
  "  </aut-pagination>",
  "</div>",
].join("\n");

const DECORATOR_ROUTE_TEMPLATE = [
  "<div class=\"page decorator-table-page\">",
  "  <h1>${title}</h1>",
  "  <p class=\"count\">${count & state}</p>",
  "  <button class=\"inc\" click.trigger=\"increment()\">+</button>",
  "  <aut-pagination",
  "    total-items.bind=\"totalItems\"",
  "    page-size.bind=\"pageSize\"",
  "    current-page.bind=\"page\"",
  "    direction-links.bind=\"false\"",
  "    boundary-links.bind=\"false\">",
  "  </aut-pagination>",
  "</div>",
].join("\n");

const DECORATOR_APP_TEMPLATE = [
  "<div class=\"router-app decorator-app\">",
  "  <header>",
  "    <h1>${appName}</h1>",
  "  </header>",
  "  <main>",
  "    <au-viewport></au-viewport>",
  "  </main>",
  "</div>",
].join("\n");

class RouterApp {
  appName = "Router SSR Test";

  static routes = [
    { path: "", component: HomePage, title: "Home" },
    { path: "home", component: HomePage, title: "Home" },
    { path: "about", component: AboutPage, title: "About" },
  ];

  static $au = {
    type: "custom-element",
    name: "router-app",
    dependencies: [HomePage, AboutPage],
  };
}

const ROUTER_APP_TEMPLATE = [
  "<div class=\"router-app\">",
  "  <header>",
  "    <h1>${appName}</h1>",
  "  </header>",
  "  <main>",
  "    <au-viewport></au-viewport>",
  "  </main>",
  "</div>",
].join("\n");

function ensureViewportDefined() {
  try {
    CustomElement.getDefinition(ViewportCustomElement);
  } catch {
    CustomElement.define({
      name: "au-viewport",
      bindables: ["name", "usedBy", "default", "fallback"],
    }, ViewportCustomElement);
  }
}

function createSSRRouterConfiguration(
  requestUrl: string,
  baseHref = "/",
  activateRoutes = true,
) {
  ensureViewportDefined();

  return {
    register(container: IContainer) {
      const locationManager = new ServerLocationManager(requestUrl, baseHref);
      const routerOptions = RouterOptions.create({});

      const registrations = [
        Registration.instance(ILocationManager, locationManager),
        Registration.instance(IRouterOptions, routerOptions),
        Registration.instance(RouterOptions, routerOptions),
        IRouter,
        ViewportCustomElement,
        AppTask.hydrated(IContainer, RouteContext.setRoot),
        AppTask.activated(IRouter, (router) => router.start(true)),
        AppTask.deactivated(IRouter, (router) => router.stop()),
      ];

      if (activateRoutes) {
        registrations.push(
          AppTask.activated(IRouter, (router) => router.load(requestUrl)),
        );
      }

      return container.register(...registrations);
    },
  };
}

function findPageLink(document: Document, text: string): HTMLAnchorElement | null {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a.page-link"));
  return links.find((link) => link.textContent?.trim() === text) ?? null;
}

function findActivePage(document: Document): HTMLAnchorElement | null {
  return document.querySelector<HTMLAnchorElement>("li.page-item.active a.page-link");
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

async function waitForControllerByName(
  root: unknown,
  name: string,
  timeoutMs = 2000,
): Promise<{ viewModel?: { selectPage?: (page: number) => void } } | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const found = findControllerByName(root, name);
    if (found) return found;
    await flushDom();
  }
  return null;
}

async function waitForElementController(
  document: Document,
  selector: string,
  timeoutMs = 2000,
): Promise<{ viewModel?: unknown } | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const el = document.querySelector(selector) as (Element & { $au?: Record<string, unknown> }) | null;
    const ctrl = el?.$au?.["au:resource:custom-element"] as { viewModel?: unknown } | undefined;
    if (ctrl?.viewModel) {
      return ctrl;
    }
    if (process.env.AURELIA_DEBUG_AOT === "1" && el && el.$au) {
      // eslint-disable-next-line no-console
      console.log("[router-decorator] element $au keys", Object.keys(el.$au));
    }
    await flushDom();
  }
  return null;
}

describe("integration harness: router SSR + hydration", () => {
  test("hydrates routed viewport content without duplication", async () => {
    const homeAot = compileWithAot(HOME_TEMPLATE, { name: "home-page" });
    const aboutAot = compileWithAot(ABOUT_TEMPLATE, { name: "about-page" });
    const appAot = compileWithAot(ROUTER_APP_TEMPLATE, { name: "router-app" });

    patchComponentDefinition(HomePage, homeAot, { name: "home-page" });
    patchComponentDefinition(AboutPage, aboutAot, { name: "about-page" });
    patchComponentDefinition(RouterApp, appAot, { name: "router-app" });

    const renderResult = await renderWithComponents(RouterApp, {
      childComponents: [HomePage, AboutPage],
      request: { url: "/about", baseHref: "/" },
      register: (container) => {
        container.register(createSSRRouterConfiguration("/about", "/", true));
      },
    });

    expect(renderResult.manifest.root).toBe("router-app");

    const ssrContext = createHydrationContext(
      renderResult.html,
      {},
      renderResult.manifest,
      {
        ssrDef: {
          template: appAot.template,
          instructions: appAot.instructions,
        },
      },
    );
    expect(countElements(ssrContext.host, "au-viewport")).toBe(1);
    expect(countElements(ssrContext.host, ".about-page")).toBe(1);
    expect(getTexts(ssrContext.host, ".about-page h1")).toEqual(["About"]);
    ssrContext.dom.window.close();

    const hydrated = await hydrateSsr(
      renderResult.html,
      {},
      renderResult.manifest,
      appAot,
      {
        componentName: "router-app",
        componentClass: RouterApp,
        childComponents: [HomePage, AboutPage],
        register: (container) => {
          container.register(createSSRRouterConfiguration("/about", "/", true));
        },
      },
    );

    expect(countElements(hydrated.host, ".about-page")).toBe(1);
    expect(getTexts(hydrated.host, ".about-page h1")).toEqual(["About"]);

    const doubleRender = checkForDoubleRender(hydrated.document, ".page");
    expect(doubleRender.hasDuplicates).toBe(false);

    await hydrated.stop();
  });

  test("hydrates routed third-party components", async () => {
    if (!HAS_AURELIA_TABLE) {
      throw new Error("aurelia2-table package is required for router integration tests.");
    }
    const scenario: IntegrationScenario = {
      id: "router-with-third-party",
      title: "Router SSR + hydration supports third-party elements",
      tags: ["router", "ssr", "hydration", "third-party"],
      source: {
        kind: "memory",
        files: {
          "/src/entry.ts": [
            "import { Aurelia } from \"aurelia\";",
            "import { RouterConfiguration } from \"@aurelia/router\";",
            "",
            "Aurelia.register(RouterConfiguration);",
            "export const marker = 0;",
          ].join("\n"),
        },
      },
    externalPackages: [
      { id: "@aurelia/router", preferSource: true },
      { id: "aurelia2-table", preferSource: true },
    ],
    };
    const run = await runIntegrationScenario(scenario);

    const pluginModule = await loadExternalModule(AURELIA_TABLE_PACKAGE);
    const AureliaTableConfiguration = pluginModule.AureliaTableConfiguration as {
      register: (container: unknown) => void;
    };
    const AutPaginationCustomElement = pluginModule.AutPaginationCustomElement as
      new () => Record<string, unknown>;
    await patchAutPaginationDefinition(AutPaginationCustomElement, run);
    ensureBoundLifecycle(AutPaginationCustomElement);

    class ThirdPartyPage {
      title = "Third Party";
      page = 1;
      pageSize = 5;
      totalItems = 12;

      static $au = {
        type: "custom-element",
        name: "third-party-page",
      };
    }

    class RouterAppWithThirdParty {
      static routes = [
        { path: "", component: ThirdPartyPage, title: "Third Party" },
      ];

      static $au = {
        type: "custom-element",
        name: "router-app-third-party",
        dependencies: [ThirdPartyPage],
      };
    }

    const thirdPartyAot = compileWithAot(THIRD_PARTY_PAGE_TEMPLATE, {
      name: "third-party-page",
      semantics: run.semantics,
      resourceGraph: run.resourceGraph,
      resourceScope: run.resourceGraph.root,
    });
    const appAot = compileWithAot(ROUTER_APP_TEMPLATE, {
      name: "router-app-third-party",
      semantics: run.semantics,
      resourceGraph: run.resourceGraph,
      resourceScope: run.resourceGraph.root,
    });

    patchComponentDefinition(ThirdPartyPage, thirdPartyAot, { name: "third-party-page" });
    patchComponentDefinition(RouterAppWithThirdParty, appAot, { name: "router-app-third-party" });

    const renderResult = await renderWithComponents(RouterAppWithThirdParty, {
      childComponents: [ThirdPartyPage],
      request: { url: "/", baseHref: "/" },
      register: (container) => {
        container.register(
          createSSRRouterConfiguration("/", "/", true),
          AureliaTableConfiguration,
        );
      },
    });

    const ssrContext = createHydrationContext(
      renderResult.html,
      { page: 1, pageSize: 5, totalItems: 12 },
      renderResult.manifest,
      {
        ssrDef: {
          template: appAot.template,
          instructions: appAot.instructions,
        },
      },
    );
    expect(countElements(ssrContext.host, "aut-pagination")).toBe(1);
    ssrContext.dom.window.close();

    const hydrated = await hydrateSsr(
      renderResult.html,
      { page: 1, pageSize: 5, totalItems: 12 },
      renderResult.manifest,
      appAot,
      {
        componentName: "router-app-third-party",
        componentClass: RouterAppWithThirdParty,
        childComponents: [ThirdPartyPage],
        register: (container) => {
          container.register(
            createSSRRouterConfiguration("/", "/", true),
            AureliaTableConfiguration,
          );
        },
      },
    );

    expect(countElements(hydrated.host, "aut-pagination")).toBe(1);
    (globalThis as { CustomEvent?: typeof CustomEvent }).CustomEvent = hydrated.dom.window.CustomEvent;
    const paginationVm = resolvePaginationViewModel(hydrated);
    const pageVm = (paginationVm as { $controller?: { parent?: { viewModel?: { page?: number } } } })
      .$controller?.parent?.viewModel;
    expect(pageVm).toBeTruthy();
    paginationVm.selectPage?.(2);
    await flushDom();
    expect(pageVm?.page).toBe(2);

    const doubleRender = checkForDoubleRender(hydrated.document, ".page");
    expect(doubleRender.hasDuplicates).toBe(false);

    await hydrated.stop();
  });

  test(
    "hydrates @route apps with third-party + state bindings",
    async () => {
      if (!HAS_AURELIA_TABLE || !HAS_AURELIA_STATE) {
        throw new Error("aurelia2-table and @aurelia/state packages are required for this router test.");
      }
      const scenario: IntegrationScenario = {
        id: "router-decorator-third-party-state",
        title: "Router @route + third-party + state SSR/hydration",
        tags: ["router", "ssr", "hydration", "third-party", "state"],
        source: {
          kind: "memory",
          files: {
            "/src/entry.ts": "export const marker = 0;",
          },
        },
        externalPackages: [
          { id: "@aurelia/router", preferSource: true },
          { id: "aurelia2-table", preferSource: true },
          { id: "@aurelia/state", preferSource: true },
        ],
      };
      const run = await runIntegrationScenario(scenario);

      const pluginModule = await loadExternalModule(AURELIA_TABLE_PACKAGE);
      const AureliaTableConfiguration = pluginModule.AureliaTableConfiguration as {
        register: (container: unknown) => void;
      };
      const AutPaginationCustomElement = pluginModule.AutPaginationCustomElement as
        new () => Record<string, unknown>;
      await patchAutPaginationDefinition(AutPaginationCustomElement, run);
      ensureBoundLifecycle(AutPaginationCustomElement);

      const stateModule = await loadExternalModule(AURELIA_STATE_PACKAGE);
      const StateDefaultConfiguration = stateModule.StateDefaultConfiguration as {
        init: (
          state: unknown,
          ...handlers: Array<(state: unknown, action: unknown) => unknown>
        ) => { register: (container: unknown) => void };
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

      class DecoratorTablePage {
        title = "Inventory";
        page = 1;
        pageSize = 5;
        totalItems = 12;
        private readonly store = resolve(IStore) as {
          dispatch(action: CounterAction): void;
          getState(): CounterState;
        };

        get count(): number {
          return this.store.getState().count;
        }

        increment(): void {
          this.store.dispatch({ type: "inc" });
        }

        static $au = {
          type: "custom-element",
          name: "decorator-table-page",
        };
      }

      @route({
        title: "Decorator Router",
        routes: [
          {
            id: "table",
            path: ["", "table"],
            component: DecoratorTablePage,
            title: "Table",
          },
        ],
      })
      class DecoratorRouterApp {
        appName = "Decorator Router App";

        static $au = {
          type: "custom-element",
          name: "router-app-decorator",
          dependencies: [DecoratorTablePage],
        };
      }

      const pageAot = compileWithAot(DECORATOR_ROUTE_TEMPLATE, {
        name: "decorator-table-page",
        semantics: run.semantics,
        resourceGraph: run.resourceGraph,
        resourceScope: run.resourceGraph.root,
      });
      const appAot = compileWithAot(DECORATOR_APP_TEMPLATE, {
        name: "router-app-decorator",
        semantics: run.semantics,
        resourceGraph: run.resourceGraph,
        resourceScope: run.resourceGraph.root,
      });
      patchComponentDefinition(DecoratorTablePage, pageAot, { name: "decorator-table-page" });
      patchComponentDefinition(DecoratorRouterApp, appAot, { name: "router-app-decorator" });
      CustomElement.clearDefinition(DecoratorTablePage);
      CustomElement.clearDefinition(DecoratorRouterApp);
      CustomElement.define(DecoratorTablePage.$au!, DecoratorTablePage);
      CustomElement.define(DecoratorRouterApp.$au!, DecoratorRouterApp);

      if (process.env.AURELIA_DEBUG_AOT === "1") {
        // eslint-disable-next-line no-console
        console.log("[router-decorator] page targetCount", pageAot.targetCount, "rows", pageAot.instructions.length);
        // eslint-disable-next-line no-console
        console.log("[router-decorator] page template", pageAot.template);
        // eslint-disable-next-line no-console
        console.log("[router-decorator] app targetCount", appAot.targetCount, "rows", appAot.instructions.length);
        // eslint-disable-next-line no-console
        console.log("[router-decorator] app template", appAot.template);
        const countMarkers = (template: unknown) => (
          typeof template === "string" ? (template.match(/<!--au-->/g) ?? []).length : null
        );
        const appDef = CustomElement.getDefinition(DecoratorRouterApp);
        const pageDef = CustomElement.getDefinition(DecoratorTablePage);
        // eslint-disable-next-line no-console
        console.log("[router-decorator] app def", {
          templateType: appDef.template == null ? "null" : typeof appDef.template,
          markerCount: countMarkers(appDef.template),
          rowCount: appDef.instructions.length,
        });
        // eslint-disable-next-line no-console
        console.log("[router-decorator] page def", {
          templateType: pageDef.template == null ? "null" : typeof pageDef.template,
          markerCount: countMarkers(pageDef.template),
          rowCount: pageDef.instructions.length,
        });
      }

      const registerState = (container: { register: (...args: unknown[]) => void }) => {
        container.register(StateDefaultConfiguration.init({ count: 0 }, counterHandler));
      };

      const renderResult = await renderWithComponents(DecoratorRouterApp, {
        childComponents: [DecoratorTablePage],
        request: { url: "/table", baseHref: "/" },
        register: (container) => {
          container.register(
            createSSRRouterConfiguration("/table", "/", true),
            AureliaTableConfiguration,
          );
          registerState(container);
        },
      });

      const ssrContext = createHydrationContext(
        renderResult.html,
        {},
        renderResult.manifest,
        {
          ssrDef: {
            template: appAot.template,
            instructions: appAot.instructions,
          },
        },
      );
      expect(countElements(ssrContext.host, ".decorator-table-page")).toBe(1);
      expect(getTexts(ssrContext.host, ".count")).toEqual(["0"]);
      ssrContext.dom.window.close();

      const hydrated = await hydrateSsr(
        renderResult.html,
        {},
        renderResult.manifest,
        appAot,
        {
          componentName: "router-app-decorator",
          componentClass: DecoratorRouterApp,
          reuseComponentClass: true,
          childComponents: [DecoratorTablePage],
          register: (container) => {
            container.register(
              createSSRRouterConfiguration("/table", "/", true),
              AureliaTableConfiguration,
            );
            registerState(container);
          },
        },
      );

      if (process.env.AURELIA_DEBUG_AOT === "1") {
        // eslint-disable-next-line no-console
        console.log("[router-decorator] hydrated counts", {
          viewport: countElements(hydrated.host, "au-viewport"),
          pageHost: countElements(hydrated.host, "decorator-table-page"),
          pageInner: countElements(hydrated.host, ".decorator-table-page"),
        });
      }

      const pageController = await waitForElementController(
        hydrated.document,
        "decorator-table-page",
        4000,
      );
      const pageVm = pageController?.viewModel as DecoratorTablePage | undefined;
      expect(pageVm).toBeTruthy();
      expect(getTexts(hydrated.host, ".count")).toEqual(["0"]);

      pageVm?.increment();
      await flushDom();
      expect(getTexts(hydrated.host, ".count")).toEqual(["1"]);

      (globalThis as { CustomEvent?: typeof CustomEvent }).CustomEvent = hydrated.dom.window.CustomEvent;
      const paginationVm = resolvePaginationViewModel(hydrated);
      paginationVm.selectPage?.(2);
      await flushDom();
      expect(pageVm?.page).toBe(2);

      const doubleRender = checkForDoubleRender(hydrated.document, ".page");
      expect(doubleRender.hasDuplicates).toBe(false);

      await hydrated.stop();
    },
  );
});
