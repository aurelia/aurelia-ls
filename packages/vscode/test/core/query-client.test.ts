import { describe, test, expect, vi } from "vitest";
import { QueryClient } from "../../out/core/query-client.js";
import type { VscodeApi } from "../../out/vscode-api.js";
import type { LspFacade } from "../../out/core/lsp-facade.js";
import { createTestObservability } from "../helpers/test-helpers.js";
import { createVscodeApi } from "../helpers/vscode-stub.js";

describe("QueryClient", () => {
  test("dedupes in-flight requests by key", async () => {
    const { vscode: stubVscode } = createVscodeApi();
    const { observability } = createTestObservability(stubVscode as unknown as VscodeApi);

    const lsp = {
      getOverlay: vi.fn(async () => ({ artifact: { overlay: { path: "x", text: "y" } } })),
    };

    const client = new QueryClient(lsp as unknown as LspFacade, observability);
    await Promise.all([
      client.getOverlay("file:///a", { dedupe: true }),
      client.getOverlay("file:///a", { dedupe: true }),
    ]);

    expect(lsp.getOverlay).toHaveBeenCalledTimes(1);
  });

  test("uses TTL cache when enabled", async () => {
    const { vscode: stubVscode } = createVscodeApi();
    const { observability } = createTestObservability(stubVscode as unknown as VscodeApi);

    const lsp = {
      getOverlay: vi.fn(async () => ({ artifact: { overlay: { path: "x", text: "y" } } })),
    };

    const client = new QueryClient(lsp as unknown as LspFacade, observability, { defaultTtlMs: 1000 });
    await client.getOverlay("file:///a", { ttlMs: 1000 });
    await client.getOverlay("file:///a", { ttlMs: 1000 });

    expect(lsp.getOverlay).toHaveBeenCalledTimes(1);
  });

  test("includes doc version in position queries", async () => {
    const { vscode: stubVscode } = createVscodeApi();
    const { observability } = createTestObservability(stubVscode as unknown as VscodeApi);

    const lsp = {
      queryAtPosition: vi.fn(async () => null),
    };

    const client = new QueryClient(lsp as unknown as LspFacade, observability);
    await client.queryAtPosition("file:///a", { line: 0, character: 0 }, { docVersion: 1 });
    await client.queryAtPosition("file:///a", { line: 0, character: 0 }, { docVersion: 2 });

    expect(lsp.queryAtPosition).toHaveBeenCalledTimes(2);
  });
});
