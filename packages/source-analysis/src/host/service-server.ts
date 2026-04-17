import { existsSync, rmSync } from 'node:fs';
import { createServer, type Server, type Socket } from 'node:net';

import {
  createSnapshotHostRuntime,
  type SnapshotHostRuntime,
} from './runtime.js';
import {
  type HostServicePayload,
  type HostServiceRequest,
  type HostServiceResponse,
} from './service-protocol.js';

const DEFAULT_IDLE_TIMEOUT_MS = 15 * 60_000;

export interface HostServiceServerOptions {
  readonly endpoint: string;
  readonly idleTimeoutMs?: number;
  readonly runtime?: SnapshotHostRuntime;
}

export interface HostServiceServer {
  readonly endpoint: string;
  readonly runtime: SnapshotHostRuntime;
  close(): Promise<void>;
}

export async function startHostServiceServer(
  options: HostServiceServerOptions,
): Promise<HostServiceServer> {
  const endpoint = options.endpoint;
  const runtime = options.runtime ?? createSnapshotHostRuntime({
    executionMode: 'session-first',
  });
  const idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
  let idleTimer: NodeJS.Timeout | undefined;
  const sockets = new Set<Socket>();

  if (process.platform !== 'win32' && existsSync(endpoint)) {
    rmSync(endpoint, { force: true });
  }

  const server = createServer({ allowHalfOpen: true }, (socket) => {
    sockets.add(socket);
    resetIdleTimer();
    let buffer = '';
    let responded = false;

    socket.setEncoding('utf8');
    socket.on('data', (chunk) => {
      buffer += chunk;
      if (!responded && buffer.includes('\n')) {
        responded = true;
        void respond(socket, buffer, runtime, endpoint, server, sockets);
      }
    });
    socket.on('end', () => {
      if (!responded && buffer.trim().length > 0) {
        responded = true;
        void respond(socket, buffer, runtime, endpoint, server, sockets);
      }
    });
    socket.on('error', () => {
    });
    socket.on('close', () => {
      sockets.delete(socket);
    });
  });

  await new Promise<void>((resolvePromise, rejectPromise) => {
    server.once('error', rejectPromise);
    server.listen(endpoint, () => {
      server.off('error', rejectPromise);
      resetIdleTimer();
      resolvePromise();
    });
  });

  return {
    endpoint,
    runtime,
    async close() {
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
      for (const socket of sockets) {
        socket.destroy();
      }
      sockets.clear();
      await closeServer(server);
      if (process.platform !== 'win32' && existsSync(endpoint)) {
        rmSync(endpoint, { force: true });
      }
    },
  };

  function resetIdleTimer(): void {
    if (idleTimer) {
      clearTimeout(idleTimer);
    }
    idleTimer = setTimeout(() => {
      void closeServer(server).then(() => {
        if (process.platform !== 'win32' && existsSync(endpoint)) {
          rmSync(endpoint, { force: true });
        }
        process.exit(0);
      });
    }, idleTimeoutMs);
  }
}

async function respond(
  socket: NodeJS.WritableStream,
  rawRequest: string,
  runtime: SnapshotHostRuntime,
  endpoint: string,
  server: Server,
  sockets: Set<Socket>,
): Promise<void> {
  const response = handleRequest(rawRequest, runtime, endpoint);
  socket.end(JSON.stringify(response));
  if (response.ok && response.payload.kind === 'management' && response.payload.value.running === false) {
    for (const activeSocket of sockets) {
      activeSocket.destroy();
    }
    sockets.clear();
    await closeServer(server);
    if (process.platform !== 'win32' && existsSync(endpoint)) {
      rmSync(endpoint, { force: true });
    }
    process.exit(0);
  }
}

function handleRequest(
  rawRequest: string,
  runtime: SnapshotHostRuntime,
  endpoint: string,
): HostServiceResponse {
  try {
    const request = JSON.parse(rawRequest.trim()) as HostServiceRequest;
    const payload = handlePayload(request, runtime, endpoint);
    return {
      ok: true,
      payload,
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

function handlePayload(
  request: HostServiceRequest,
  runtime: SnapshotHostRuntime,
  endpoint: string,
): HostServicePayload {
  if (request.kind === 'runtime') {
    return {
      kind: 'runtime',
      value: {
        envelope: runtime.execute(request.invocation),
      },
    };
  }

  if (request.command === 'shutdown') {
    return {
      kind: 'management',
      value: {
        running: false,
        pid: process.pid,
        endpoint,
        sessionCount: readSessionCount(runtime),
      },
    };
  }

  return {
    kind: 'management',
    value: {
      running: true,
      pid: process.pid,
      endpoint,
      sessionCount: readSessionCount(runtime),
    },
  };
}

function readSessionCount(
  runtime: SnapshotHostRuntime,
): number {
  const envelope = runtime.execute({
    command: 'session.status',
    args: {},
  });
  const result = envelope.result as {
    readonly sessions?: readonly unknown[];
  };
  return result.sessions?.length ?? 0;
}

function closeServer(
  server: Server,
): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    if (!server.listening) {
      resolvePromise();
      return;
    }
    server.close((error) => {
      if (error) {
        rejectPromise(error);
      } else {
        resolvePromise();
      }
    });
  });
}
