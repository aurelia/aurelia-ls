/**
 * Handler Tests
 *
 * Tests for SSR handler functionality with exact assertions.
 * Focuses on error handling, shell injection, and type guards.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  createSSRHandler,
  isSSRHandler,
  type SSRHandler,
  type SSRResult,
} from "@aurelia-ls/ssr";

// Counter for unique component names
let testCounter = 0;

/**
 * Creates a working component class with unique name.
 */
function createWorkingComponent(
  baseName: string,
  template: string,
  state: Record<string, unknown> = {},
) {
  const uniqueId = ++testCounter;
  const uniqueName = `${baseName}-${uniqueId}`;
  const uniqueTemplate = template.replace(/>/, ` data-test-id="${uniqueId}">`);

  const ComponentClass = class {
    constructor() {
      Object.assign(this, state);
    }
  } as any;
  ComponentClass.$au = {
    type: "custom-element",
    name: uniqueName,
    template: uniqueTemplate,
  };
  return ComponentClass;
}

/**
 * Creates a component that throws during construction.
 */
function createThrowingComponent(baseName: string, errorMessage: string) {
  const uniqueId = ++testCounter;
  const uniqueName = `${baseName}-${uniqueId}`;

  const ComponentClass = class {
    constructor() {
      throw new Error(errorMessage);
    }
  } as any;
  ComponentClass.$au = {
    type: "custom-element",
    name: uniqueName,
    template: "<div>Should not render</div>",
  };
  return ComponentClass;
}

// =============================================================================
// renderMany Error Handling
// =============================================================================

describe("Handler: renderMany error handling", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("yields error result when render throws", async () => {
    const ThrowingApp = createThrowingComponent("throwing-app", "Component exploded!");

    const handler = createSSRHandler({
      root: ThrowingApp,
      shell: "<!DOCTYPE html><html><body><!--ssr-outlet--><!--ssr-state--></body></html>",
    });

    const results: SSRResult[] = [];
    for await (const result of handler.renderMany(["/error-page"])) {
      results.push(result);
    }

    expect(results.length).toBe(1);
    expect(results[0]!.url).toBe("/error-page");
    // Error message in HTML comment
    expect(results[0]!.html).toContain("<!-- SSR Error:");
    expect(results[0]!.html).toContain("Component exploded!");
    // Error manifest structure
    expect(results[0]!.manifest.root).toBe("error");
    expect(results[0]!.manifest.manifest.children).toEqual([]);
  });

  it("logs error to console.error with URL context", async () => {
    const ThrowingApp = createThrowingComponent("logging-app", "Logging test error");

    const handler = createSSRHandler({
      root: ThrowingApp,
      shell: "<!DOCTYPE html><html><body><!--ssr-outlet--><!--ssr-state--></body></html>",
    });

    const results: SSRResult[] = [];
    for await (const result of handler.renderMany(["/log-test"])) {
      results.push(result);
    }

    // Verify console.error was called at least once
    expect(consoleErrorSpy).toHaveBeenCalled();

    // Find the call that contains the URL (handler logs "[ssr] Failed to render /log-test:")
    const ssrErrorCall = consoleErrorSpy.mock.calls.find(
      (call) => typeof call[0] === "string" && call[0].includes("/log-test"),
    );
    expect(ssrErrorCall).toBeDefined();
    // Second arg is the error
    expect(ssrErrorCall![1]).toBeInstanceOf(Error);
    expect((ssrErrorCall![1] as Error).message).toBe("Logging test error");
  });

  it("continues rendering remaining URLs after one fails", async () => {
    // Create a throwing component - ALL URLs will fail
    const ThrowingApp = createThrowingComponent("all-throw", "All URLs fail");

    const handler = createSSRHandler({
      root: ThrowingApp,
      shell: "<!DOCTYPE html><html><body><!--ssr-outlet--><!--ssr-state--></body></html>",
    });

    const urls = ["/page1", "/page2", "/page3"];
    const results: SSRResult[] = [];

    for await (const result of handler.renderMany(urls)) {
      results.push(result);
    }

    // All URLs should have results (even though they all failed)
    expect(results.length).toBe(3);
    expect(results[0]!.url).toBe("/page1");
    expect(results[1]!.url).toBe("/page2");
    expect(results[2]!.url).toBe("/page3");

    // All should be error results
    expect(results[0]!.html).toContain("<!-- SSR Error:");
    expect(results[1]!.html).toContain("<!-- SSR Error:");
    expect(results[2]!.html).toContain("<!-- SSR Error:");

    // All should have error manifest
    for (const result of results) {
      expect(result.manifest.root).toBe("error");
    }
  });

  it("handles non-Error thrown values", async () => {
    const uniqueId = ++testCounter;
    const uniqueName = `string-throw-${uniqueId}`;

    // Component that throws a string instead of Error
    const StringThrowingApp = class {
      constructor() {
        throw "Just a string error";
      }
    } as any;
    StringThrowingApp.$au = {
      type: "custom-element",
      name: uniqueName,
      template: "<div>Never</div>",
    };

    const handler = createSSRHandler({
      root: StringThrowingApp,
      shell: "<!DOCTYPE html><html><body><!--ssr-outlet--><!--ssr-state--></body></html>",
    });

    const results: SSRResult[] = [];
    for await (const result of handler.renderMany(["/string-error"])) {
      results.push(result);
    }

    expect(results.length).toBe(1);
    // String error should be included in the comment
    expect(results[0]!.html).toContain("Just a string error");
  });
});

// =============================================================================
// Shell Injection
// =============================================================================

describe("Handler: injectIntoShell", () => {
  it("injects content at <!--ssr-outlet--> marker", async () => {
    const TestApp = createWorkingComponent("outlet-test", "<div>InjectedContent</div>");

    const handler = createSSRHandler({
      root: TestApp,
      shell: "<!DOCTYPE html><html><body><header>Nav</header><!--ssr-outlet--><footer>Foot</footer><!--ssr-state--></body></html>",
    });

    const result = await handler.render("/");

    // Content should be between header and footer
    expect(result.html).toContain("<header>Nav</header>");
    expect(result.html).toContain("InjectedContent");
    expect(result.html).toContain("<footer>Foot</footer>");

    // Verify order
    const headerIndex = result.html.indexOf("<header>");
    const contentIndex = result.html.indexOf("InjectedContent");
    const footerIndex = result.html.indexOf("<footer>");

    expect(headerIndex).toBeLessThan(contentIndex);
    expect(contentIndex).toBeLessThan(footerIndex);
  });

  it("injects before </body> when no outlet marker", async () => {
    const TestApp = createWorkingComponent("fallback-outlet", "<div>FallbackContent</div>");

    const handler = createSSRHandler({
      root: TestApp,
      // Shell without <!--ssr-outlet--> marker
      shell: "<!DOCTYPE html><html><body><nav>Menu</nav><!--ssr-state--></body></html>",
    });

    const result = await handler.render("/");

    // Content should appear before </body>
    expect(result.html).toContain("FallbackContent");
    const contentIndex = result.html.indexOf("FallbackContent");
    const bodyCloseIndex = result.html.indexOf("</body>");
    expect(contentIndex).toBeLessThan(bodyCloseIndex);

    // Nav should appear before content
    const navIndex = result.html.indexOf("<nav>Menu</nav>");
    expect(navIndex).toBeLessThan(contentIndex);
  });

  it("injects hydration script at <!--ssr-state--> marker", async () => {
    const TestApp = createWorkingComponent("state-test", "<div>StateContent</div>");

    const handler = createSSRHandler({
      root: TestApp,
      shell: "<!DOCTYPE html><html><body><!--ssr-outlet--><div id='after'>After</div><!--ssr-state--></body></html>",
    });

    const result = await handler.render("/");

    // Hydration script should be present
    expect(result.html).toContain("__AU_SSR_SCOPE__");
    expect(result.html).toContain("<script>");

    // Script should be where the marker was (before </body>, after #after)
    const afterDivIndex = result.html.indexOf('id="after"');
    const scriptIndex = result.html.indexOf("__AU_SSR_SCOPE__");
    expect(afterDivIndex).toBeLessThan(scriptIndex);
  });

  it("omits hydration script when no state marker", async () => {
    const TestApp = createWorkingComponent("no-state", "<div>NoStateContent</div>");

    const handler = createSSRHandler({
      root: TestApp,
      // Shell with outlet but no state marker
      shell: "<!DOCTYPE html><html><body><!--ssr-outlet--></body></html>",
    });

    const result = await handler.render("/");

    // Content present, no hydration script
    expect(result.html).toContain("NoStateContent");
    expect(result.html).not.toContain("__AU_SSR_SCOPE__");
    expect(result.html).not.toContain("<script>");
  });

  it("uses default shell when none provided", async () => {
    const TestApp = createWorkingComponent("default-shell", "<div>DefaultShellContent</div>");

    const handler = createSSRHandler({
      root: TestApp,
      // No shell provided
    });

    const result = await handler.render("/");

    // Default shell structure
    expect(result.html).toContain("<!DOCTYPE html>");
    expect(result.html).toContain("<html>");
    expect(result.html).toContain("DefaultShellContent");
    expect(result.html).toContain("__AU_SSR_SCOPE__");
  });
});

// =============================================================================
// Marker Stripping
// =============================================================================

describe("Handler: stripMarkers option", () => {
  it("preserves markers by default", async () => {
    const TestApp = createWorkingComponent("markers-default", "<div>${msg}</div>", { msg: "Hello" });

    const handler = createSSRHandler({
      root: TestApp,
      shell: "<!DOCTYPE html><html><body><!--ssr-outlet--><!--ssr-state--></body></html>",
      // stripMarkers not set (defaults to false)
    });

    const result = await handler.render("/");
    expect(result.html).toContain("<!--au-->");
  });

  it("strips markers when config.stripMarkers=true", async () => {
    const TestApp = createWorkingComponent("markers-config", "<div>${msg}</div>", { msg: "Configured" });

    const handler = createSSRHandler({
      root: TestApp,
      shell: "<!DOCTYPE html><html><body><!--ssr-outlet--><!--ssr-state--></body></html>",
      stripMarkers: true,
    });

    const result = await handler.render("/");
    expect(result.html).not.toContain("<!--au-->");
    expect(result.html).toContain("Configured");
  });

  it("per-render stripMarkers=true overrides config stripMarkers=false", async () => {
    const TestApp = createWorkingComponent("markers-override-true", "<div>${msg}</div>", { msg: "Override" });

    const handler = createSSRHandler({
      root: TestApp,
      shell: "<!DOCTYPE html><html><body><!--ssr-outlet--><!--ssr-state--></body></html>",
      stripMarkers: false, // Config says keep
    });

    const result = await handler.render("/", { stripMarkers: true }); // Override to strip
    expect(result.html).not.toContain("<!--au-->");
  });

  it("per-render stripMarkers=false overrides config stripMarkers=true", async () => {
    const TestApp = createWorkingComponent("markers-override-false", "<div>${msg}</div>", { msg: "Keep" });

    const handler = createSSRHandler({
      root: TestApp,
      shell: "<!DOCTYPE html><html><body><!--ssr-outlet--><!--ssr-state--></body></html>",
      stripMarkers: true, // Config says strip
    });

    const result = await handler.render("/", { stripMarkers: false }); // Override to keep
    expect(result.html).toContain("<!--au-->");
  });
});

// =============================================================================
// isSSRHandler Type Guard
// =============================================================================

describe("Handler: isSSRHandler type guard", () => {
  it("returns true for valid SSRHandler", () => {
    const TestApp = createWorkingComponent("guard-valid", "<div>Valid</div>");
    const handler = createSSRHandler({ root: TestApp });

    expect(isSSRHandler(handler)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isSSRHandler(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isSSRHandler(undefined)).toBe(false);
  });

  it("returns false for non-object", () => {
    expect(isSSRHandler("string")).toBe(false);
    expect(isSSRHandler(123)).toBe(false);
    expect(isSSRHandler(true)).toBe(false);
  });

  it("returns false for object without render method", () => {
    const fake = {
      renderMany: async function* () { yield { url: "/", html: "", manifest: {} }; },
    };
    expect(isSSRHandler(fake)).toBe(false);
  });

  it("returns false for object without renderMany method", () => {
    const fake = {
      render: async () => ({ url: "/", html: "", manifest: {} }),
    };
    expect(isSSRHandler(fake)).toBe(false);
  });

  it("returns false for object with non-function render", () => {
    const fake = {
      render: "not a function",
      renderMany: async function* () { yield { url: "/", html: "", manifest: {} }; },
    };
    expect(isSSRHandler(fake)).toBe(false);
  });

  it("returns false for object with non-function renderMany", () => {
    const fake = {
      render: async () => ({ url: "/", html: "", manifest: {} }),
      renderMany: "not a function",
    };
    expect(isSSRHandler(fake)).toBe(false);
  });

  it("returns true for duck-typed object with both methods", () => {
    const duckTyped = {
      render: async () => ({ url: "/", html: "", manifest: { root: "test", manifest: { children: [] } } }),
      renderMany: async function* () { yield { url: "/", html: "", manifest: {} }; },
      config: { root: {}, components: [], shell: "", baseHref: "/", stripMarkers: false },
    };
    expect(isSSRHandler(duckTyped)).toBe(true);
  });
});

// =============================================================================
// Handler Configuration
// =============================================================================

describe("Handler: configuration", () => {
  it("exposes resolved config with defaults", () => {
    const TestApp = createWorkingComponent("config-expose", "<div>Config</div>");

    const handler = createSSRHandler({
      root: TestApp,
      // Only root provided, everything else should default
    });

    expect(handler.config.root).toBe(TestApp);
    expect(handler.config.components).toEqual([]);
    expect(handler.config.baseHref).toBe("/");
    expect(handler.config.stripMarkers).toBe(false);
    expect(handler.config.shell).toContain("<!DOCTYPE html>");
  });

  it("preserves custom config values", () => {
    const TestApp = createWorkingComponent("config-custom", "<div>Custom</div>");
    const ChildApp = createWorkingComponent("child-custom", "<span>Child</span>");
    const customShell = "<html><body><!--ssr-outlet--><!--ssr-state--></body></html>";

    const handler = createSSRHandler({
      root: TestApp,
      components: [ChildApp],
      shell: customShell,
      baseHref: "/app/",
      stripMarkers: true,
    });

    expect(handler.config.root).toBe(TestApp);
    expect(handler.config.components).toEqual([ChildApp]);
    expect(handler.config.shell).toBe(customShell);
    expect(handler.config.baseHref).toBe("/app/");
    expect(handler.config.stripMarkers).toBe(true);
  });
});
