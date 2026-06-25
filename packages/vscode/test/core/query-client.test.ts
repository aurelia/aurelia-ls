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
      getDiagnostics: vi.fn(async () => ({ diagnostics: { bySurface: {}, suppressed: [] } })),
    };

    const client = new QueryClient(lsp as unknown as LspFacade, observability);
    await Promise.all([
      client.getDiagnostics("file:///a", { dedupe: true }),
      client.getDiagnostics("file:///a", { dedupe: true }),
    ]);

    expect(lsp.getDiagnostics).toHaveBeenCalledTimes(1);
  });

  test("uses TTL cache when enabled", async () => {
    const { vscode: stubVscode } = createVscodeApi();
    const { observability } = createTestObservability(stubVscode as unknown as VscodeApi);

    const lsp = {
      getDiagnostics: vi.fn(async () => ({ diagnostics: { bySurface: {}, suppressed: [] } })),
    };

    const client = new QueryClient(lsp as unknown as LspFacade, observability, { defaultTtlMs: 1000 });
    await client.getDiagnostics("file:///a", { ttlMs: 1000 });
    await client.getDiagnostics("file:///a", { ttlMs: 1000 });

    expect(lsp.getDiagnostics).toHaveBeenCalledTimes(1);
  });

});
