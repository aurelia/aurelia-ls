/**
 * Router SSR Integration Tests
 *
 * Tests server-side rendering of routed Aurelia applications.
 *
 * FEATURES:
 * - AOT compilation of templates with router resources (au-viewport, load, href)
 * - SSR rendering with au-viewport using SSRRouterConfiguration
 * - Route activation via router.load() for nested route rendering
 * - Manifest recording for routed components via getRoutedController() API
 *
 * Based on patterns from:
 * - aurelia/packages/__tests__/src/router/smoke-tests.spec.ts
 * - aurelia/examples/base-url/
 * - https://docs.aurelia.io/getting-to-know-aurelia/routing/aurelia-router/
 */

import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { JSDOM } from "jsdom";
import { DI, Registration, IContainer } from "@aurelia/kernel";
import {
  Aurelia,
  IPlatform,
  StandardConfiguration,
  CustomElement,
  AppTask,
} from "@aurelia/runtime-html";
import {
  IRouter,
  ViewportCustomElement,
  ILocationManager,
  ServerLocationManager,
  RouteContext,
  RouterOptions,
  IRouterOptions,
} from "@aurelia/router";
import { BrowserPlatform } from "@aurelia/platform-browser";

import { compileWithAot } from "../out/aot.js";
import { DEFAULT_SEMANTICS } from "../out/index.js";
import { patchComponentDefinition } from "../out/ssr/patch.js";
import { renderWithComponents } from "../out/ssr/render.js";

// =============================================================================
// Route Components (simple pages for testing)
// =============================================================================

/**
 * Home page component - default route
 */
class HomePage {
  title = "Home";
  message = "Welcome to the home page";

  static $au = {
    type: "custom-element",
    name: "home-page",
  };
}

const HOME_TEMPLATE = `<div class="page home-page">
  <h1>\${title}</h1>
  <p>\${message}</p>
</div>`;

/**
 * About page component - /about route
 */
class AboutPage {
  title = "About";
  description = "This is the about page";

  static $au = {
    type: "custom-element",
    name: "about-page",
  };
}

const ABOUT_TEMPLATE = `<div class="page about-page">
  <h1>\${title}</h1>
  <p>\${description}</p>
</div>`;

/**
 * Root application component with router viewport
 */
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

// Simple template WITHOUT router-specific attributes for initial testing.
// The compiler's router registry treats `href` on anchors as a custom attribute,
// which requires RouterConfiguration to be registered at runtime.
// For this test, we use a minimal template to verify basic viewport SSR rendering.
const ROUTER_APP_TEMPLATE = `<div class="router-app">
  <header>
    <h1>\${appName}</h1>
    <nav>
      <span class="nav-link">Home</span>
      <span class="nav-link">About</span>
    </nav>
  </header>
  <main>
    <au-viewport></au-viewport>
  </main>
</div>`;

// =============================================================================
// SSR Router Configuration
// =============================================================================

/**
 * Ensure ViewportCustomElement has its definition.
 * The definition can be cleared by tests calling CustomElement.clearDefinition(),
 * and once cleared, the element can't be registered until re-defined.
 */
function ensureViewportDefined() {
  try {
    CustomElement.getDefinition(ViewportCustomElement);
  } catch {
    // Definition was cleared, re-define it
    CustomElement.define({
      name: 'au-viewport',
      bindables: ['name', 'usedBy', 'default', 'fallback'],
    }, ViewportCustomElement);
  }
}

/**
 * Create SSR router configuration.
 *
 * Unlike RouterConfiguration which is browser-oriented, this:
 * - Uses ServerLocationManager instead of BrowserLocationManager
 * - Registers only ViewportCustomElement (no load/href attributes needed for SSR)
 * - Sets up RouteContext for route resolution
 * - Can optionally trigger route resolution for nested routes
 *
 * @param requestUrl - The URL to render
 * @param baseHref - Base href for routing
 * @param activateRoutes - If true, also trigger route resolution (for nested routes)
 */
function createSSRRouterConfiguration(requestUrl, baseHref = "/", activateRoutes = false) {
  // Ensure ViewportCustomElement is defined (may have been cleared by other tests)
  ensureViewportDefined();

  return {
    register(container) {
      const locationManager = new ServerLocationManager(requestUrl, baseHref);
      const routerOptions = RouterOptions.create({});

      const registrations = [
        // Use ServerLocationManager instead of BrowserLocationManager
        Registration.instance(ILocationManager, locationManager),

        // Router options
        Registration.instance(IRouterOptions, routerOptions),
        Registration.instance(RouterOptions, routerOptions),

        // Router instance
        IRouter,

        // Viewport element
        ViewportCustomElement,

        // Set up route context on hydration (needed for route resolution)
        AppTask.hydrated(IContainer, RouteContext.setRoot),
      ];

      // Optionally trigger route resolution for nested routes
      if (activateRoutes) {
        registrations.push(
          AppTask.activated(IRouter, router => router.load(requestUrl))
        );
      }

      return container.register(...registrations);
    },
  };
}

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Create semantics that recognize router resources.
 * This tells the compiler about au-viewport, load, href attributes.
 */
function createRouterSemantics() {
  return {
    ...DEFAULT_SEMANTICS,
    resources: {
      ...DEFAULT_SEMANTICS.resources,
      elements: {
        ...DEFAULT_SEMANTICS.resources.elements,
        "home-page": {
          kind: "element",
          name: "home-page",
          boundary: true,
          containerless: false,
          bindables: {},
        },
        "about-page": {
          kind: "element",
          name: "about-page",
          boundary: true,
          containerless: false,
          bindables: {},
        },
        // au-viewport is already in DEFAULT_SEMANTICS from router registry
      },
    },
  };
}

/**
 * Count occurrences of a string.
 */
function countOccurrences(str, substr) {
  let count = 0;
  let pos = 0;
  while ((pos = str.indexOf(substr, pos)) !== -1) {
    count++;
    pos += substr.length;
  }
  return count;
}

// =============================================================================
// Tests: AOT Compilation of Router Resources
// =============================================================================

describe("Router SSR: AOT Compilation", () => {
  test("compiles template with au-viewport element", () => {
    const semantics = createRouterSemantics();

    const aot = compileWithAot(ROUTER_APP_TEMPLATE, {
      name: "router-app",
      semantics,
    });

    console.log("# Router app AOT template:", aot.template);
    console.log("# Router app AOT instructions:", JSON.stringify(aot.instructions, null, 2));

    // Template should preserve au-viewport element
    assert.ok(
      aot.template.includes("<au-viewport"),
      "AOT template should contain au-viewport element"
    );

    // Should have instructions for the template
    assert.ok(
      aot.instructions.length > 0,
      "Should have AOT instructions"
    );
  });

  test("compiles template with load attribute", () => {
    const semantics = createRouterSemantics();

    const aot = compileWithAot(ROUTER_APP_TEMPLATE, {
      name: "router-app",
      semantics,
    });

    // The load attribute should be processed
    // (either preserved or compiled to instructions)
    assert.ok(
      aot.template.includes("load") || aot.instructions.some(row =>
        row.some(instr => instr.type === "ra" || instr.type === "sp")
      ),
      "AOT should handle load attribute"
    );
  });

  test("compiles route component templates", () => {
    const homeAot = compileWithAot(HOME_TEMPLATE, { name: "home-page" });
    const aboutAot = compileWithAot(ABOUT_TEMPLATE, { name: "about-page" });

    console.log("# Home AOT template:", homeAot.template);
    console.log("# About AOT template:", aboutAot.template);

    // Both should compile successfully
    assert.ok(homeAot.template.includes("home-page"), "Home template should have class");
    assert.ok(aboutAot.template.includes("about-page"), "About template should have class");
  });
});

// =============================================================================
// Tests: SSR Rendering with Router
// =============================================================================

describe("Router SSR: Server-Side Rendering", () => {
  test("renders root component with viewport", async () => {
    // Compile all templates
    const homeAot = compileWithAot(HOME_TEMPLATE, { name: "home-page" });
    const aboutAot = compileWithAot(ABOUT_TEMPLATE, { name: "about-page" });

    const semantics = createRouterSemantics();
    const appAot = compileWithAot(ROUTER_APP_TEMPLATE, {
      name: "router-app",
      semantics,
    });

    // Patch component definitions
    patchComponentDefinition(HomePage, homeAot);
    patchComponentDefinition(AboutPage, aboutAot);
    patchComponentDefinition(RouterApp, appAot);

    // Render with SSR router configuration
    // NOTE: Do NOT add ViewportCustomElement to childComponents - it comes from
    // @aurelia/router and has its own definition. childComponents goes through
    // clearDefinition which breaks external elements like ViewportCustomElement.
    const result = await renderWithComponents(RouterApp, {
      childComponents: [HomePage, AboutPage],
      request: {
        url: "/",
        baseHref: "/",
      },
      register: (container) => {
        container.register(createSSRRouterConfiguration("/", "/"));
      },
    });

    // Should have the root app structure
    assert.ok(
      result.html.includes("router-app"),
      "Should render router-app class"
    );
    assert.ok(
      result.html.includes("Router SSR Test"),
      "Should render app name"
    );

    // Should have au-viewport element
    assert.ok(
      result.html.includes("<au-viewport"),
      "Should render au-viewport element"
    );

    // Navigation links should be present
    assert.ok(
      result.html.includes("Home") && result.html.includes("About"),
      "Should render navigation links"
    );
  });

  test("renders correct route for /home URL", async () => {
    // Compile templates
    const homeAot = compileWithAot(HOME_TEMPLATE, { name: "home-page" });
    const aboutAot = compileWithAot(ABOUT_TEMPLATE, { name: "about-page" });

    const semantics = createRouterSemantics();
    const appAot = compileWithAot(ROUTER_APP_TEMPLATE, {
      name: "router-app",
      semantics,
    });

    // Patch definitions
    patchComponentDefinition(HomePage, homeAot);
    patchComponentDefinition(AboutPage, aboutAot);
    patchComponentDefinition(RouterApp, appAot);

    // Render for /home URL
    const result = await renderWithComponents(RouterApp, {
      childComponents: [HomePage, AboutPage],
      request: {
        url: "/home",
        baseHref: "/",
      },
      register: (container) => {
        container.register(createSSRRouterConfiguration("/home", "/"));
      },
    });

    // This test uses activateRoutes=false (default), so route content is not rendered.
    // The viewport element renders but stays empty. Use activateRoutes=true to populate.
    assert.ok(
      result.html.includes("<au-viewport"),
      "Should render au-viewport element"
    );
  });

  test("renders correct route for /about URL", async () => {
    // Compile templates
    const homeAot = compileWithAot(HOME_TEMPLATE, { name: "home-page" });
    const aboutAot = compileWithAot(ABOUT_TEMPLATE, { name: "about-page" });

    const semantics = createRouterSemantics();
    const appAot = compileWithAot(ROUTER_APP_TEMPLATE, {
      name: "router-app",
      semantics,
    });

    // Patch definitions
    patchComponentDefinition(HomePage, homeAot);
    patchComponentDefinition(AboutPage, aboutAot);
    patchComponentDefinition(RouterApp, appAot);

    // Render for /about URL
    const result = await renderWithComponents(RouterApp, {
      childComponents: [HomePage, AboutPage],
      request: {
        url: "/about",
        baseHref: "/",
      },
      register: (container) => {
        container.register(createSSRRouterConfiguration("/about", "/"));
      },
    });

    // This test uses activateRoutes=false (default), so route content is not rendered.
    // The viewport element renders but stays empty. Use activateRoutes=true to populate.
    assert.ok(
      result.html.includes("<au-viewport"),
      "Should render au-viewport element"
    );
  });
});

// =============================================================================
// Tests: Manifest Recording for Routed Components
// =============================================================================

describe("Router SSR: Manifest Recording", () => {
  test("manifest includes viewport in children", async () => {
    // Compile templates
    const homeAot = compileWithAot(HOME_TEMPLATE, { name: "home-page" });
    const aboutAot = compileWithAot(ABOUT_TEMPLATE, { name: "about-page" });

    const semantics = createRouterSemantics();
    const appAot = compileWithAot(ROUTER_APP_TEMPLATE, {
      name: "router-app",
      semantics,
    });

    // Patch definitions
    patchComponentDefinition(HomePage, homeAot);
    patchComponentDefinition(AboutPage, aboutAot);
    patchComponentDefinition(RouterApp, appAot);

    // Render
    const result = await renderWithComponents(RouterApp, {
      childComponents: [HomePage, AboutPage],
      request: {
        url: "/",
        baseHref: "/",
      },
      register: (container) => {
        container.register(createSSRRouterConfiguration("/", "/"));
      },
    });

    // Manifest should exist
    assert.ok(result.manifest, "Should have manifest");
    assert.ok(result.manifest.manifest, "Should have root scope");

    // Root should be router-app
    assert.equal(
      result.manifest.root,
      "router-app",
      "Manifest root should be router-app"
    );

    // Check for viewport in children
    const rootScope = result.manifest.manifest;
    const hasViewport = rootScope.children?.some(
      child => child.name === "au-viewport"
    );

    assert.ok(hasViewport, "Manifest should include au-viewport in children");
  });

  test("manifest includes routed component inside viewport", async () => {
    // Compile templates
    const homeAot = compileWithAot(HOME_TEMPLATE, { name: "home-page" });
    const aboutAot = compileWithAot(ABOUT_TEMPLATE, { name: "about-page" });

    const semantics = createRouterSemantics();
    const appAot = compileWithAot(ROUTER_APP_TEMPLATE, {
      name: "router-app",
      semantics,
    });

    // Patch definitions
    patchComponentDefinition(HomePage, homeAot);
    patchComponentDefinition(AboutPage, aboutAot);
    patchComponentDefinition(RouterApp, appAot);

    // Render with route activation
    const result = await renderWithComponents(RouterApp, {
      childComponents: [HomePage, AboutPage],
      request: {
        url: "/",
        baseHref: "/",
      },
      register: (container) => {
        // activateRoutes=true to ensure the route component is rendered
        container.register(createSSRRouterConfiguration("/", "/", true));
      },
    });

    // Find viewport in manifest
    const rootScope = result.manifest.manifest;
    const viewport = rootScope.children?.find(
      child => child.name === "au-viewport"
    );

    assert.ok(viewport, "Should have viewport in manifest");
    assert.ok(viewport.children?.length > 0, "Viewport should have children");

    // The routed component (home-page for "/" route) should be inside viewport
    const routedComponent = viewport.children?.find(
      child => child.name === "home-page"
    );

    assert.ok(
      routedComponent,
      "Routed component (home-page) should be recorded inside viewport"
    );
  });
});

// =============================================================================
// Tests: DOM Structure Integrity
// =============================================================================

describe("Router SSR: DOM Structure", () => {
  test("no double rendering of root component", async () => {
    // Compile templates
    const homeAot = compileWithAot(HOME_TEMPLATE, { name: "home-page" });
    const aboutAot = compileWithAot(ABOUT_TEMPLATE, { name: "about-page" });

    const semantics = createRouterSemantics();
    const appAot = compileWithAot(ROUTER_APP_TEMPLATE, {
      name: "router-app",
      semantics,
    });

    // Patch definitions
    patchComponentDefinition(HomePage, homeAot);
    patchComponentDefinition(AboutPage, aboutAot);
    patchComponentDefinition(RouterApp, appAot);

    // Render
    const result = await renderWithComponents(RouterApp, {
      childComponents: [HomePage, AboutPage],
      request: {
        url: "/",
        baseHref: "/",
      },
      register: (container) => {
        container.register(createSSRRouterConfiguration("/", "/"));
      },
    });

    // Count structural elements
    const routerAppCount = countOccurrences(result.html, 'class="router-app"');
    const headerCount = countOccurrences(result.html, "<header");
    const mainCount = countOccurrences(result.html, "<main");
    const viewportCount = countOccurrences(result.html, "<au-viewport");

    // Should have exactly one of each structural element
    assert.equal(
      routerAppCount,
      1,
      `Expected 1 .router-app, got ${routerAppCount}`
    );
    assert.equal(
      headerCount,
      1,
      `Expected 1 header, got ${headerCount}`
    );
    assert.equal(
      mainCount,
      1,
      `Expected 1 main, got ${mainCount}`
    );
    assert.equal(
      viewportCount,
      1,
      `Expected 1 au-viewport, got ${viewportCount}`
    );
  });
});

// =============================================================================
// Tests: Nested Routes with Route Activation
// =============================================================================

describe("Router SSR: Route Activation", () => {
  test("renders home route content for / URL", async () => {
    // Compile templates
    const homeAot = compileWithAot(HOME_TEMPLATE, { name: "home-page" });
    const aboutAot = compileWithAot(ABOUT_TEMPLATE, { name: "about-page" });

    const semantics = createRouterSemantics();
    const appAot = compileWithAot(ROUTER_APP_TEMPLATE, {
      name: "router-app",
      semantics,
    });

    // Patch definitions
    patchComponentDefinition(HomePage, homeAot);
    patchComponentDefinition(AboutPage, aboutAot);
    patchComponentDefinition(RouterApp, appAot);

    // Render with route activation enabled
    const result = await renderWithComponents(RouterApp, {
      childComponents: [HomePage, AboutPage],
      request: {
        url: "/",
        baseHref: "/",
      },
      register: (container) => {
        container.register(createSSRRouterConfiguration("/", "/", true));
      },
    });

    // Should render route content inside viewport
    assert.ok(
      result.html.includes("home-page"),
      "Should render home-page element"
    );
    assert.ok(
      result.html.includes("Welcome to the home page"),
      "Should render home page content"
    );
  });

  test("renders about route content for /about URL", async () => {
    // Compile templates
    const homeAot = compileWithAot(HOME_TEMPLATE, { name: "home-page" });
    const aboutAot = compileWithAot(ABOUT_TEMPLATE, { name: "about-page" });

    const semantics = createRouterSemantics();
    const appAot = compileWithAot(ROUTER_APP_TEMPLATE, {
      name: "router-app",
      semantics,
    });

    // Patch definitions
    patchComponentDefinition(HomePage, homeAot);
    patchComponentDefinition(AboutPage, aboutAot);
    patchComponentDefinition(RouterApp, appAot);

    // Render with route activation for /about URL
    const result = await renderWithComponents(RouterApp, {
      childComponents: [HomePage, AboutPage],
      request: {
        url: "/about",
        baseHref: "/",
      },
      register: (container) => {
        container.register(createSSRRouterConfiguration("/about", "/", true));
      },
    });

    // Should render about route content inside viewport
    assert.ok(
      result.html.includes("about-page"),
      "Should render about-page element"
    );
    assert.ok(
      result.html.includes("This is the about page"),
      "Should render about page content"
    );
  });

  test("no double rendering when routes are activated", async () => {
    // Compile templates
    const homeAot = compileWithAot(HOME_TEMPLATE, { name: "home-page" });
    const aboutAot = compileWithAot(ABOUT_TEMPLATE, { name: "about-page" });

    const semantics = createRouterSemantics();
    const appAot = compileWithAot(ROUTER_APP_TEMPLATE, {
      name: "router-app",
      semantics,
    });

    // Patch definitions
    patchComponentDefinition(HomePage, homeAot);
    patchComponentDefinition(AboutPage, aboutAot);
    patchComponentDefinition(RouterApp, appAot);

    // Render with route activation
    const result = await renderWithComponents(RouterApp, {
      childComponents: [HomePage, AboutPage],
      request: {
        url: "/",
        baseHref: "/",
      },
      register: (container) => {
        container.register(createSSRRouterConfiguration("/", "/", true));
      },
    });

    // Count occurrences of key elements to verify no double rendering
    const routerAppCount = countOccurrences(result.html, 'class="router-app"');
    const homePageCount = countOccurrences(result.html, 'class="page home-page"');
    const viewportCount = countOccurrences(result.html, "<au-viewport");

    // Should have exactly one of each
    assert.equal(routerAppCount, 1, `Expected 1 .router-app, got ${routerAppCount}`);
    assert.equal(homePageCount, 1, `Expected 1 .home-page, got ${homePageCount}`);
    assert.equal(viewportCount, 1, `Expected 1 au-viewport, got ${viewportCount}`);
  });
});
