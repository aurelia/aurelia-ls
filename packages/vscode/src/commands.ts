/**
 * Debug commands — framework developer tools gated behind features.debugCommands.
 *
 * These commands expose semantic-runtime/server state useful for framework
 * development and debugging the language server itself. They are NOT the
 * user-facing commands (those live in features/commands/user-commands.ts).
 */
import type { ExtensionContext } from "vscode";
import type { ObservabilityService } from "./core/observability.js";
import type { QueryClient } from "./core/query-client.js";
import { QueryPolicies } from "./core/query-policy.js";
import { getVscodeApi, type VscodeApi } from "./vscode-api.js";

export function registerCommands(
  context: ExtensionContext,
  queries: QueryClient,
  observability: ObservabilityService,
  vscode: VscodeApi = getVscodeApi(),
) {
  const logger = observability.logger.child("commands");
  const errors = observability.errors;
  const trace = observability.trace;

  const run = <T>(id: string, fn: () => Promise<T>) =>
    errors.capture(`command.${id}`, () => trace.spanAsync(`command.${id}`, fn), { context: { command: id } });

  context.subscriptions.push(
    vscode.commands.registerCommand("aurelia.dumpState", () => {
      return run("dumpState", async () => {
        logger.info("dumpState.request");
        const state = await queries.dumpState(QueryPolicies.dumpState);
        logger.write("debug", JSON.stringify(state, null, 2), undefined, { raw: true, force: true });
        vscode.window.showInformationMessage("Dumped state to 'Aurelia LS (Client)' output.");
      });
    }),
  );
}
