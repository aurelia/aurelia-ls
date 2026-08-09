import type { MessagePort } from "node:worker_threads";
import {
  CancellationSenderStrategy,
  PortMessageReader,
  PortMessageWriter,
  SharedArrayReceiverStrategy,
} from "vscode-jsonrpc/node";
import {
  createConnection,
  type Connection,
} from "vscode-languageserver/node";

/** Select the worker transport without changing stdio or Node IPC discovery. */
export function createLanguageServerConnection(workerPort: MessagePort | null): Connection {
  if (workerPort == null) return createConnection();

  return createConnection(
    new PortMessageReader(workerPort),
    new PortMessageWriter(workerPort),
    {
      cancellationStrategy: {
        receiver: new SharedArrayReceiverStrategy(),
        sender: CancellationSenderStrategy.Message,
      },
    },
  );
}
