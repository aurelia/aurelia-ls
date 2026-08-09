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
import {
  createExperimentalWorkerCancellationStrategy,
  createExperimentalWorkerMessageTransports,
  shouldUseExperimentalWorkerTransport,
} from "./worker-transport.js";

let app: ClientApp | undefined;

/** VS Code composition root. The extension intentionally exports no product API. */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const outputChannel = vscode.window.createOutputChannel("Aurelia LS (Client)", { log: true });
  const logger = new ClientLogger(outputChannel);
  const languageClient = new AureliaLanguageClient(logger, vscode, {
    createClient: createLanguageClient(logger.child("worker-transport")),
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

const createLanguageClient = (logger: ClientLogger): LanguageClientFactory => (
  id: string,
  name: string,
  serverModule: string,
  clientOptions: LanguageClientOptions,
): LanguageClient => {
  const transportLogger = logger.child("client", { id, name });
  if (shouldUseExperimentalWorkerTransport()) {
    return new LanguageClient(
      id,
      name,
      () => Promise.resolve(createExperimentalWorkerMessageTransports(serverModule, {
        onEvent: (event) => {
          switch (event.type) {
            case "online":
              transportLogger.debug("Experimental Worker transport is online");
              break;
            case "stdout":
              transportLogger.debug("Experimental Worker stdout", { text: event.text.trimEnd() });
              break;
            case "stderr":
              transportLogger.warn("Experimental Worker stderr", { text: event.text.trimEnd() });
              break;
            case "error":
              transportLogger.error("Experimental Worker transport failed", undefined, event.error);
              break;
            case "exit":
              if (event.code === 0) {
                transportLogger.debug("Experimental Worker transport exited", { code: event.code });
              } else {
                transportLogger.warn("Experimental Worker transport exited abnormally", { code: event.code });
              }
              break;
            case "force-terminate":
              transportLogger.warn("Experimental Worker transport exceeded its shutdown grace", {
                graceMilliseconds: event.graceMilliseconds,
              });
              break;
          }
        },
      })),
      {
        ...clientOptions,
        connectionOptions: {
          ...clientOptions.connectionOptions,
          cancellationStrategy: createExperimentalWorkerCancellationStrategy(),
        },
      },
    );
  }

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
