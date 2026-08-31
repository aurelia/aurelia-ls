import * as vscode from "vscode";
import {
  LanguageClient,
  TransportKind,
  type LanguageClientOptions,
  type ServerOptions,
} from "vscode-languageclient/node";
import { ClientApp } from "./app.js";
import {
  AURELIA_LANGUAGE_CLIENT_FORCE_TERMINATE,
  AureliaLanguageClient,
  type LanguageClientFactory,
} from "./client-core.js";
import { DefaultFeatures } from "./features/index.js";
import { ClientLogger } from "./log.js";
import {
  createWorkerCancellationStrategy,
  createWorkerMessageTransports,
  shouldUseWorkerTransport,
} from "./worker-transport.js";
import { createWorkerRestartHostControl } from "./worker-restart-host-control.js";
import { SupportReportService } from "./support-report.js";

let app: ClientApp | undefined;
let workerRestartHostControl: vscode.Disposable | undefined;
let supportReport: SupportReportService | undefined;

/** VS Code composition root. The extension intentionally exports no product API. */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const outputChannel = vscode.window.createOutputChannel("Aurelia LS (Client)", { log: true });
  const logger = new ClientLogger(outputChannel);
  const transportMode = shouldUseWorkerTransport() ? "worker" : "ipc";
  supportReport = new SupportReportService(context, vscode, { transportMode });
  context.subscriptions.push(supportReport.registerCommand());
  const languageClient = new AureliaLanguageClient(logger, vscode, {
    createClient: createLanguageClient(logger.child("worker-transport"), supportReport),
  });
  supportReport.attachLanguageClient(languageClient);
  app = new ClientApp(context, {
    vscode,
    logger,
    outputChannel,
    languageClient,
    supportReport,
    features: DefaultFeatures,
  });
  await app.activate();
  workerRestartHostControl = createWorkerRestartHostControl(languageClient);
}

export async function deactivate(): Promise<void> {
  workerRestartHostControl?.dispose();
  workerRestartHostControl = undefined;
  await app?.deactivate();
  app = undefined;
  supportReport?.dispose();
  supportReport = undefined;
}

const createLanguageClient = (
  logger: ClientLogger,
  support: SupportReportService,
): LanguageClientFactory => (
  id: string,
  name: string,
  serverModule: string,
  clientOptions: LanguageClientOptions,
): LanguageClient => {
  const transportLogger = logger.child("client", { id, name });
  if (shouldUseWorkerTransport()) {
    let activeTransport: ReturnType<typeof createWorkerMessageTransports> | null = null;
    const client = new LanguageClient(
      id,
      name,
      () => {
        const transport = createWorkerMessageTransports(serverModule, {
          onEvent: (event) => {
            support.recordWorkerTransportEvent({ id, name }, event);
            switch (event.type) {
              case "online":
                transportLogger.debug("Worker transport is online");
                break;
              case "stdout":
                transportLogger.debug("Worker stdout", { text: event.text.trimEnd() });
                break;
              case "stderr":
                transportLogger.warn("Worker stderr", { text: event.text.trimEnd() });
                break;
              case "error":
                transportLogger.error("Worker transport failed", undefined, event.error);
                break;
              case "exit":
                if (event.code === 0) {
                  transportLogger.debug("Worker transport exited", { code: event.code });
                } else {
                  transportLogger.warn("Worker transport exited abnormally", { code: event.code });
                }
                break;
              case "force-terminate":
                transportLogger.warn("Worker transport exceeded its shutdown grace", {
                  graceMilliseconds: event.graceMilliseconds,
                });
                break;
            }
          },
        });
        activeTransport = transport;
        void transport.exited.finally(() => {
          if (activeTransport === transport) activeTransport = null;
        });
        return Promise.resolve(transport);
      },
      {
        ...clientOptions,
        connectionOptions: {
          ...clientOptions.connectionOptions,
          cancellationStrategy: createWorkerCancellationStrategy(),
        },
      },
    );
    Object.defineProperty(client, AURELIA_LANGUAGE_CLIENT_FORCE_TERMINATE, {
      configurable: false,
      enumerable: false,
      value: async () => activeTransport?.terminate(),
      writable: false,
    });
    return client;
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
