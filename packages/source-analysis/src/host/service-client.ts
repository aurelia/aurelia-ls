import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';
import { resolve } from 'node:path';

import { createSnapshotPaths } from '../snapshot-config.js';
import type {
  HostCommandEnvelope,
  HostCommandInvocation,
  HostCommandName,
} from './types.js';
import {
  type HostServicePayload,
  type HostServiceRequest,
  type HostServiceResponse,
  type HostServiceStatePayload,
  isHostServicePathError,
  resolveHostServiceEndpoint,
} from './service-protocol.js';

const STARTUP_TIMEOUT_MS = 4_000;
const STARTUP_POLL_INTERVAL_MS = 75;

export interface HostServiceStatus {
  readonly running: boolean;
  readonly endpoint: string;
  readonly pid?: number;
  readonly sessionCount?: number;
  readonly started?: boolean;
  readonly stopped?: boolean;
}

export async function executeHostServiceInvocation(
  invocation: HostCommandInvocation<HostCommandName>,
): Promise<HostCommandEnvelope<unknown>> {
  const payload = await sendServiceRequest(
    {
      kind: 'runtime',
      invocation,
    },
    { autoStart: false },
  );

  if (payload.kind !== 'runtime') {
    throw new Error('Unexpected source-analysis host service response payload.');
  }

  return payload.value.envelope;
}

export async function ensureHostServiceRunning(): Promise<HostServiceStatus> {
  const endpoint = resolveHostServiceEndpoint(import.meta.url);
  let started = false;

  try {
    const payload = await sendServiceRequest(
      { kind: 'management', command: 'ping' },
      { autoStart: false },
    );
    if (payload.kind !== 'management') {
      throw new Error('Unexpected source-analysis host service payload.');
    }
    return toRunningStatus(payload.value, { endpoint, started });
  } catch (error) {
    if (!(error instanceof Error) || !(error as NodeJS.ErrnoException).code || !isHostServicePathError(error as NodeJS.ErrnoException)) {
      throw error;
    }
  }

  startDetachedHostService(endpoint);
  started = true;
  const payload = await waitForHostService(endpoint, STARTUP_TIMEOUT_MS);
  return toRunningStatus(payload.value, { endpoint, started });
}

export async function inspectHostServiceStatus(): Promise<HostServiceStatus> {
  const endpoint = resolveHostServiceEndpoint(import.meta.url);
  try {
    const payload = await sendServiceRequest(
      { kind: 'management', command: 'ping' },
      { autoStart: false },
    );
    if (payload.kind !== 'management') {
      throw new Error('Unexpected source-analysis host service payload.');
    }
    return toRunningStatus(payload.value, { endpoint, started: false });
  } catch (error) {
    if (error instanceof Error && (error as NodeJS.ErrnoException).code && isHostServicePathError(error as NodeJS.ErrnoException)) {
      return {
        running: false,
        endpoint,
      };
    }
    throw error;
  }
}

export async function stopHostService(): Promise<HostServiceStatus> {
  const endpoint = resolveHostServiceEndpoint(import.meta.url);
  try {
    const payload = await sendServiceRequest(
      { kind: 'management', command: 'shutdown' },
      { autoStart: false },
    );
    if (payload.kind !== 'management') {
      throw new Error('Unexpected source-analysis host service payload.');
    }
    return {
      ...toRunningStatus(payload.value, { endpoint, started: false }),
      stopped: true,
    };
  } catch (error) {
    if (error instanceof Error && (error as NodeJS.ErrnoException).code && isHostServicePathError(error as NodeJS.ErrnoException)) {
      return {
        running: false,
        endpoint,
        stopped: false,
      };
    }
    throw error;
  }
}

async function waitForHostService(
  endpoint: string,
  timeoutMs: number,
): Promise<Extract<HostServicePayload, { kind: 'management' }>> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const payload = await sendServiceRequest(
        { kind: 'management', command: 'ping' },
        { autoStart: false },
      );
      if (payload.kind !== 'management') {
        throw new Error('Unexpected source-analysis host payload during startup.');
      }
      return payload;
    } catch (error) {
      lastError = error;
      if (!(error instanceof Error) || !(error as NodeJS.ErrnoException).code || !isHostServicePathError(error as NodeJS.ErrnoException)) {
        throw error;
      }
      await delay(STARTUP_POLL_INTERVAL_MS);
    }
  }

  throw lastError instanceof Error
    ? new Error(`Timed out waiting for source-analysis host service: ${lastError.message}`)
    : new Error('Timed out waiting for source-analysis host service to start.');
}

function startDetachedHostService(
  endpoint: string,
): void {
  const paths = createSnapshotPaths(import.meta.url);
  const daemonEntry = resolve(paths.toolRootPath, 'out/host/service-daemon.js');
  const child = spawn(
    process.execPath,
    [daemonEntry, '--endpoint', endpoint],
    {
      cwd: paths.toolRootPath,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    },
  );
  child.unref();
}

async function sendServiceRequest(
  request: HostServiceRequest,
  options: {
    readonly autoStart: boolean;
  },
): Promise<HostServicePayload> {
  const endpoint = resolveHostServiceEndpoint(import.meta.url);
  try {
    return await connectAndSend(endpoint, request);
  } catch (error) {
    if (!options.autoStart || !(error instanceof Error) || !(error as NodeJS.ErrnoException).code || !isHostServicePathError(error as NodeJS.ErrnoException)) {
      throw error;
    }
    await ensureHostServiceRunning();
    return connectAndSend(endpoint, request);
  }
}

function connectAndSend(
  endpoint: string,
  request: HostServiceRequest,
): Promise<HostServicePayload> {
  return new Promise((resolvePromise, rejectPromise) => {
    const socket = createConnection(endpoint);
    let settled = false;
    let buffer = '';

    const rejectOnce = (error: unknown): void => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      rejectPromise(error);
    };

    const resolveOnce = (payload: HostServicePayload): void => {
      if (settled) {
        return;
      }
      settled = true;
      resolvePromise(payload);
    };

    socket.setEncoding('utf8');
    socket.on('error', rejectOnce);
    socket.on('connect', () => {
      socket.write(`${JSON.stringify(request)}\n`);
    });
    socket.on('data', (chunk) => {
      buffer += chunk;
    });
    socket.on('end', () => {
      try {
        const raw = buffer.trim();
        if (!raw) {
          throw new Error('Empty response from source-analysis host service.');
        }
        const response = JSON.parse(raw) as HostServiceResponse;
        if (!response.ok) {
          throw new Error(response.error.message);
        }
        resolveOnce(response.payload);
      } catch (error) {
        rejectOnce(error);
      }
    });
  });
}

function toRunningStatus(
  value: HostServiceStatePayload,
  meta: {
    readonly endpoint: string;
    readonly started: boolean;
  },
): HostServiceStatus {
  return {
    running: value.running,
    endpoint: meta.endpoint,
    pid: value.pid,
    sessionCount: value.sessionCount,
    started: meta.started,
  };
}

function delay(
  ms: number,
): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}
