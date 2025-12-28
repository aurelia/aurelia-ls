import { test, expect, describe, vi } from "vitest";
import { handleGetOverlay, handleGetMapping, handleGetSsr, handleDumpState } from "../../out/handlers/custom.js";

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
  return {
    logger,
    syncWorkspaceWithIndex: vi.fn(),
    materializeOverlay: vi.fn(),
    ensureProgramDocument: vi.fn(),
    workspace: {
      fingerprint: "test@1",
      program: {
        getMapping: vi.fn(),
        getQuery: vi.fn(),
        getCacheStats: vi.fn(() => ({})),
      },
    },
    workspaceRoot: "/test/workspace",
    paths: {
      isCaseSensitive: vi.fn(() => true),
    },
    tsService: {
      getProjectVersion: vi.fn(() => "1"),
      getService: vi.fn(() => ({
        getProgram: vi.fn(() => ({
          getRootFileNames: vi.fn(() => ["/test/src/main.ts"]),
        })),
      })),
    },
    overlayFs: {
      listScriptRoots: vi.fn(() => ["/test/src"]),
      listOverlays: vi.fn(() => ["/test/src/component.overlay.ts"]),
    },
    overlayPathOptions: vi.fn(() => ({})),
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
    ctx.materializeOverlay.mockReturnValue({ overlay: { path: "/test.ts", text: "code" }, mapping: { entries: [] }, calls: [] });

    const result = handleGetOverlay(ctx as never, "file:///test.html");

    expect(ctx.syncWorkspaceWithIndex).toHaveBeenCalled();
    expect(ctx.materializeOverlay).toHaveBeenCalledWith("file:///test.html");
    expect(result).toEqual({
      fingerprint: "test@1",
      artifact: { overlay: { path: "/test.ts", text: "code" }, mapping: { entries: [] }, calls: [] },
    });
  });

  test("accepts uri in object params", () => {
    const ctx = createMockContext();
    ctx.materializeOverlay.mockReturnValue({ overlay: { path: "/test.ts", text: "code" }, mapping: { entries: [] }, calls: [] });

    const result = handleGetOverlay(ctx as never, { uri: "file:///test.html" });

    expect(ctx.materializeOverlay).toHaveBeenCalledWith("file:///test.html");
    expect(result).not.toBe(null);
  });

  test("returns null when overlay not found", () => {
    const ctx = createMockContext();
    ctx.materializeOverlay.mockReturnValue(null);

    const result = handleGetOverlay(ctx as never, { uri: "file:///missing.html" });

    expect(result).toBe(null);
  });

  test("logs and returns null on error", () => {
    const ctx = createMockContext();
    ctx.syncWorkspaceWithIndex.mockImplementation(() => { throw new Error("sync failed"); });

    const result = handleGetOverlay(ctx as never, { uri: "file:///test.html" });

    expect(result).toBe(null);
    expect(ctx.logger.error).toHaveBeenCalledWith(expect.stringContaining("getOverlay"));
    expect(ctx.logger.error).toHaveBeenCalledWith(expect.stringContaining("sync failed"));
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

  test("logs and returns null on error", () => {
    const ctx = createMockContext();
    ctx.syncWorkspaceWithIndex.mockImplementation(() => { throw new Error("mapping error"); });

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

    const result = handleDumpState(ctx as never);

    expect(result).toEqual({
      workspaceRoot: "/test/workspace",
      caseSensitive: true,
      projectVersion: "1",
      overlayRoots: ["/test/src"],
      overlays: ["/test/src/component.overlay.ts"],
      programRoots: ["/test/src/main.ts"],
      programCache: {},
    });
  });

  test("returns error object on failure", () => {
    const ctx = createMockContext();
    ctx.tsService.getService.mockImplementation(() => { throw new Error("TS service crashed"); });

    const result = handleDumpState(ctx as never);

    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error).toContain("TS service crashed");
    expect(ctx.logger.error).toHaveBeenCalledWith(expect.stringContaining("dumpState"));
  });
});
