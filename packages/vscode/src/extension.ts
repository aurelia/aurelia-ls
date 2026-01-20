import type { ClientLogger } from "./log.js";
import type { VscodeApi } from "./vscode-api.js";
import type { AureliaLanguageClient } from "./client-core.js";
import type { FeatureModule } from "./core/feature-registry.js";
import { ClientApp } from "./app.js";
import type { ExtensionContext } from "vscode";

let app: ClientApp | undefined;

export interface ActivationServices {
  vscode?: VscodeApi;
  logger?: ClientLogger;
  languageClient?: AureliaLanguageClient;
  features?: FeatureModule[];
}

export async function activate(context: ExtensionContext, services: ActivationServices = {}) {
  app = new ClientApp(context, services);
  await app.activate();
  return app;
}

export async function deactivate() {
  await app?.deactivate();
  app = undefined;
}
