import { describe, expect, it, vi, beforeEach } from "vitest";
vi.mock("../src/loader.js", () => ({
  loadProjectComponents: vi.fn(),
}));

import { createSSRMiddleware } from "../src/middleware.js";
import type { PluginState } from "../src/types.js";
import { loadProjectComponents } from "../src/loader.js";

const loadProjectComponentsMock = vi.mocked(loadProjectComponents);

function createPluginState(overrides: Partial<PluginState> = {}): PluginState {
  return {
    entry: "/src/my-app.html",
    state: () => ({}),
    stripMarkers: false,
    include: ["**"],
    exclude: [],
    htmlShell: "<html><body><!--ssr-outlet--><!--ssr-state--></body></html>",
    projectSemantics: {} as any,
    baseHref: "/",
    register: null,
    ssg: {
      enabled: false,
      entryPoints: [],
      outDir: ".",
      fallback: "404.html",
      additionalRoutes: undefined,
      onBeforeRender: undefined,
      onAfterRender: undefined,
    },
    routeTree: null,
    ssrEntry: null,
    trace: {
      enabled: false,
      output: "console",
      minDurationNs: 0n,
      file: null,
      includeEvents: true,
      summary: true,
    },
    ...overrides,
  };
}

function createServerStub(ssrModule: any, registerModule?: any) {
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  const ssrLoadModule = vi.fn(async (id: string) => {
    if (id === "@aurelia-ls/ssr") {
      return ssrModule;
    }
    return registerModule ?? {};
  });

  return {
    config: { logger },
    ssrLoadModule,
    ssrFixStacktrace: vi.fn(),
  } as any;
}

function createResponseStub() {
  return {
    writeHead: vi.fn(),
    end: vi.fn(),
  } as any;
}

describe("createSSRMiddleware", () => {
  beforeEach(() => {
    loadProjectComponentsMock.mockReset();
  });

  it("skips non-GET and asset requests", async () => {
    const handler = createSSRMiddleware(
      createServerStub({ render: vi.fn() }),
      createPluginState(),
    );

    const next = vi.fn();
    await handler({ method: "POST", url: "/" } as any, createResponseStub(), next);
    expect(next).toHaveBeenCalledTimes(1);

    const nextAsset = vi.fn();
    await handler({ method: "GET", url: "/assets/app.css" } as any, createResponseStub(), nextAsset);
    expect(nextAsset).toHaveBeenCalledTimes(1);
  });

  it("renders SSR output and injects hydration payload", async () => {
    const render = vi.fn(async () => ({
      html: "<div>SSR</div>",
      manifest: { manifest: { root: [] } },
    }));

    loadProjectComponentsMock.mockResolvedValue({
      root: {
        ComponentClass: class Root {},
        aot: {
          template: "<div>root</div>",
          raw: {
            codeResult: { expressions: [], definition: {} },
            nestedHtmlTree: null,
          },
        },
      },
      children: [],
      components: new Map(),
    });

    const handler = createSSRMiddleware(
      createServerStub({ render }),
      createPluginState(),
      () => Promise.resolve({} as any),
    );

    const res = createResponseStub();
    const next = vi.fn();

    await handler(
      { method: "GET", url: "/", headers: { host: "localhost" } } as any,
      res,
      next,
    );

    expect(next).not.toHaveBeenCalled();
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
    expect(res.end).toHaveBeenCalledWith(expect.stringContaining("<div>SSR</div>"));
    expect(res.end).toHaveBeenCalledWith(expect.stringContaining("window.__AU_DEF__"));
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("errors when register module does not export register", async () => {
    const render = vi.fn(async () => ({
      html: "<div>SSR</div>",
      manifest: { manifest: {} },
    }));

    loadProjectComponentsMock.mockResolvedValue({
      root: {
        ComponentClass: class Root {},
        aot: {
          template: "<div>root</div>",
          raw: {
            codeResult: { expressions: [], definition: {} },
            nestedHtmlTree: null,
          },
        },
      },
      children: [],
      components: new Map(),
    });

    const handler = createSSRMiddleware(
      createServerStub({ render }, {}),
      createPluginState({ register: "/src/register.ts" }),
      () => Promise.resolve({} as any),
    );

    const next = vi.fn();
    await handler(
      { method: "GET", url: "/", headers: { host: "localhost" } } as any,
      createResponseStub(),
      next,
    );

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    const error = next.mock.calls[0]?.[0] as Error;
    expect(error.message).toContain("must export a 'register' function");
  });

  it("skips excluded routes even when include matches", async () => {
    const handler = createSSRMiddleware(
      createServerStub({ render: vi.fn() }),
      createPluginState({ include: ["**"], exclude: ["/api/**"] }),
    );

    const next = vi.fn();
    await handler({ method: "GET", url: "/api/health" } as any, createResponseStub(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
