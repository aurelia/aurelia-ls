import { ErrorReporter } from "../../out/core/errors.js";
import { ClientLogger } from "../../out/log.js";
import type { VscodeApi } from "../../out/vscode-api.js";

export function createTestServices(vscode: VscodeApi) {
  const logger = new ClientLogger(vscode.window.createOutputChannel("test", { log: true }));
  const errors = new ErrorReporter(logger, vscode);
  return { errors, logger };
}
