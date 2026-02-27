import { test, expect, describe, vi } from "vitest";
import { canonicalDocumentUri } from "@aurelia-ls/compiler";
import {
  handleGetOverlay,
  handleGetMapping,
  handleGetSsr,
  handleDumpState,
} from "@aurelia-ls/language-server/api";

function createMockLogger() {
  return {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  };
}

function createMockContext(overrides: Record<string, unknown> = {}) {
  const logger = createMockLogger();
  const workspace = {
    snapshot: vi.fn(() => ({ meta: { fingerprint: "test@1" } })),
    getOverlay: vi.fn(),
    getMapping: vi.fn(),
    getQueryFacade: vi.fn(),
    getCacheStats: vi.fn(() => ({})),
    templates: [],
    inlineTemplates: [],
  };
  return {
    logger,
    ensureProgramDocument: vi.fn(() => ({ offsetAt: vi.fn(() => 0) })),
    workspace,
    workspaceRoot: "/test/workspace",
    ...overrides,
  };
}

describe("handleGetOverlay", () => {
  test("returns null when params is null", () => {
    const ctx = createMockContext();
    const result = handleGetOverlay(ctx as never, null);
    expect(result).toBe(null);
  });

  test("returns null when params is undefined", () => {
    const ctx = createMockContext();
    const result = handleGetOverlay(ctx as never, undefined as never);
    expect(result).toBe(null);
  });

  test("returns null when uri is missing from object params", () => {
    const ctx = createMockContext();
    const result = handleGetOverlay(ctx as never, {});
    expect(result).toBe(null);
  });

  test("accepts string uri directly", () => {
    const ctx = createMockContext();
    ctx.workspace.getOverlay.mockReturnValue({ overlay: { path: "/test.ts", text: "code" }, mapping: { entries: [] }, calls: [] });

    const result = handleGetOverlay(ctx as never, "file:///test.html");

    expect(ctx.ensureProgramDocument).toHaveBeenCalledWith("file:///test.html");
    expect(ctx.workspace.getOverlay).toHaveBeenCalledWith(canonicalDocumentUri("file:///test.html").uri);
    expect(result).toEqual({
      fingerprint: "test@1",
      artifact: { overlay: { path: "/test.ts", text: "code" }, mapping: { entries: [] }, calls: [] },
    });
  });

  test("accepts uri in object params", () => {
    const ctx = createMockContext();
    ctx.workspace.getOverlay.mockReturnValue({ overlay: { path: "/test.ts", text: "code" }, mapping: { entries: [] }, calls: [] });

    const result = handleGetOverlay(ctx as never, { uri: "file:///test.html" });

    expect(ctx.workspace.getOverlay).toHaveBeenCalledWith(canonicalDocumentUri("file:///test.html").uri);
    expect(result).not.toBe(null);
  });

  test("returns null when overlay not found", () => {
    const ctx = createMockContext();
    ctx.workspace.getOverlay.mockReturnValue(null);

    const result = handleGetOverlay(ctx as never, { uri: "file:///missing.html" });

    expect(result).toBe(null);
  });

  test("logs and returns null on error", () => {
    const ctx = createMockContext();
    ctx.workspace.getOverlay.mockImplementation(() => { throw new Error("overlay failed"); });

    const result = handleGetOverlay(ctx as never, { uri: "file:///test.html" });

    expect(result).toBe(null);
    expect(ctx.logger.error).toHaveBeenCalledWith(expect.stringContaining("getOverlay"));
    expect(ctx.logger.error).toHaveBeenCalledWith(expect.stringContaining("overlay failed"));
  });
});

describe("handleGetMapping", () => {
  test("returns null when uri is missing", () => {
    const ctx = createMockContext();
    const result = handleGetMapping(ctx as never, null);
    expect(result).toBe(null);
  });

  test("returns null when document not found", () => {
    const ctx = createMockContext();
    ctx.ensureProgramDocument.mockReturnValue(null);

    const result = handleGetMapping(ctx as never, { uri: "file:///missing.html" });

    expect(result).toBe(null);
  });

  test("returns overlay path and mapping when available", () => {
    const ctx = createMockContext();
    ctx.workspace.getMapping.mockReturnValue({ entries: ["entry"] });
    ctx.workspace.getOverlay.mockReturnValue({ overlay: { path: "/test.ts" }, mapping: { entries: [] }, calls: [] });

    const result = handleGetMapping(ctx as never, { uri: "file:///test.html" });

    expect(result).toEqual({ overlayPath: "/test.ts", mapping: { entries: ["entry"] } });
  });

  test("logs and returns null on error", () => {
    const ctx = createMockContext();
    ctx.workspace.getMapping.mockImplementation(() => { throw new Error("mapping error"); });

    const result = handleGetMapping(ctx as never, { uri: "file:///test.html" });

    expect(result).toBe(null);
    expect(ctx.logger.error).toHaveBeenCalledWith(expect.stringContaining("getMapping"));
  });
});

describe("handleGetSsr", () => {
  test("returns null and logs info", () => {
    const ctx = createMockContext();

    const result = handleGetSsr(ctx as never, { uri: "file:///test.html" });

    expect(result).toBe(null);
    expect(ctx.logger.info).toHaveBeenCalledWith(expect.stringContaining("SSR not yet available"));
  });

  test("returns null when uri missing", () => {
    const ctx = createMockContext();
    const result = handleGetSsr(ctx as never, null);
    expect(result).toBe(null);
  });
});

describe("handleDumpState", () => {
  test("returns server state summary", () => {
    const ctx = createMockContext();
    ctx.workspace.templates = [{}, {}];
    ctx.workspace.inlineTemplates = [{}];

    const result = handleDumpState(ctx as never);

    expect(result).toEqual({
      workspaceRoot: "/test/workspace",
      fingerprint: "test@1",
      templateCount: 2,
      inlineTemplateCount: 1,
      programCache: {},
    });
  });

  test("returns error object on failure", () => {
    const ctx = createMockContext();
    ctx.workspace.snapshot.mockImplementation(() => { throw new Error("workspace crashed"); });

    const result = handleDumpState(ctx as never);

    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error).toContain("workspace crashed");
    expect(ctx.logger.error).toHaveBeenCalledWith(expect.stringContaining("dumpState"));
  });
});
