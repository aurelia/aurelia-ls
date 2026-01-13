import { describe, expect, test } from "vitest";
import { IContainer, Registration } from "@aurelia/kernel";
import {
  AppTask,
  CustomElement,
} from "@aurelia/runtime-html";
import {
  ILocationManager,
  IRouter,
  IRouterOptions,
  RouteContext,
  RouterOptions,
  ServerLocationManager,
  ViewportCustomElement,
} from "@aurelia/router";
import {
  compileWithAot,
  patchComponentDefinition,
  renderWithComponents,
} from "@aurelia-ls/ssr";
import {
  checkForDoubleRender,
  countElements,
  createHydrationContext,
  getTexts,
  hydrateSsr,
} from "./_helpers/ssr-hydration.js";

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
});
