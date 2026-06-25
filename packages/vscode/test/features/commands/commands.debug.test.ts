import { test, expect } from "vitest";
import { registerCommands } from "../../../out/commands.js";
import { QueryClient } from "../../../out/core/query-client.js";
import type { LspFacade } from "../../../out/core/lsp-facade.js";
import type { VscodeApi } from "../../../out/vscode-api.js";
import { createTestObservability } from "../../helpers/test-helpers.js";
import { createVscodeApi, stubExtensionContext } from "../../helpers/vscode-stub.js";

class StubLsp {
  #responders: Record<string, unknown>;
  calls: Array<{ method: string; params?: unknown }> = [];

  constructor(responders: Record<string, unknown> = {}) {
    this.#responders = responders;
  }

  async dumpState() {
    this.calls.push({ method: "aurelia/dumpState", params: {} });
    return this.#responders["aurelia/dumpState"] ?? null;
  }
}

function createHarness(responders: Record<string, unknown> = {}) {
  const { vscode: stubVscode, recorded } = createVscodeApi();
  const vscode = stubVscode as unknown as VscodeApi;
  const { observability, logger } = createTestObservability(vscode);
  const lsp = new StubLsp(responders);
  const queries = new QueryClient(lsp as unknown as LspFacade, observability);
  const context = stubExtensionContext(stubVscode);

  registerCommands(context, queries, observability, vscode);

  return { recorded, lsp, logger };
}

test("dumpState logs semantic-runtime server state", async () => {
  const { recorded, lsp, logger } = createHarness({
    "aurelia/dumpState": { engine: "semantic-runtime", resources: 3 },
  });

  await recorded.commandHandlers.get("aurelia.dumpState")?.();

  expect(lsp.calls).toEqual([{ method: "aurelia/dumpState", params: {} }]);
  expect(recorded.infoMessages).toContain("Dumped state to 'Aurelia LS (Client)' output.");
  const logLines = (logger.channel as unknown as { lines: string[] }).lines;
  expect(logLines.some((line) => line.includes("\"engine\": \"semantic-runtime\""))).toBe(true);
});
