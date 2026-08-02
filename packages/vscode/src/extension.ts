import * as vscode from "vscode";
import {
  LanguageClient,
  TransportKind,
  type LanguageClientOptions,
  type ServerOptions,
} from "vscode-languageclient/node";
import { ClientApp } from "./app.js";
import { AureliaLanguageClient, type LanguageClientFactory } from "./client-core.js";
import { DefaultFeatures } from "./features/index.js";
import { ClientLogger } from "./log.js";

let app: ClientApp | undefined;

/** VS Code composition root. The extension intentionally exports no product API. */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const outputChannel = vscode.window.createOutputChannel("Aurelia LS (Client)", { log: true });
  const logger = new ClientLogger(outputChannel);
  const languageClient = new AureliaLanguageClient(logger, vscode, {
    createClient: createLanguageClient,
  });
  app = new ClientApp(context, {
    vscode,
    logger,
    outputChannel,
    languageClient,
    features: DefaultFeatures,
  });
  await app.activate();
}

export async function deactivate(): Promise<void> {
  await app?.deactivate();
  app = undefined;
}

const createLanguageClient: LanguageClientFactory = (
  id: string,
  name: string,
  serverModule: string,
  clientOptions: LanguageClientOptions,
): LanguageClient => {
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    // Port zero asks Node to choose a free inspector port for each workspace
    // session, so multi-root extension debugging cannot collide with itself.
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: { execArgv: ["--inspect=0"] },
    },
  };
  return new LanguageClient(id, name, serverOptions, clientOptions);
};
