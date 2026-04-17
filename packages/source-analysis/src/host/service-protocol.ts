import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createSnapshotPaths } from '../snapshot-config.js';
import type {
  HostCommandEnvelope,
  HostCommandInvocation,
  HostCommandName,
} from './types.js';

export interface HostServiceRuntimeRequest {
  readonly kind: 'runtime';
  readonly invocation: HostCommandInvocation<HostCommandName>;
}

export interface HostServiceManagementRequest {
  readonly kind: 'management';
  readonly command: 'ping' | 'shutdown';
}

export type HostServiceRequest =
  | HostServiceRuntimeRequest
  | HostServiceManagementRequest;

export interface HostServiceStatePayload {
  readonly running: boolean;
  readonly pid: number;
  readonly endpoint: string;
  readonly sessionCount: number;
}

export interface HostServiceRuntimePayload {
  readonly envelope: HostCommandEnvelope<unknown>;
}

export type HostServicePayload =
  | {
    readonly kind: 'runtime';
    readonly value: HostServiceRuntimePayload;
  }
  | {
    readonly kind: 'management';
    readonly value: HostServiceStatePayload;
  };

export type HostServiceResponse =
  | {
    readonly ok: true;
    readonly payload: HostServicePayload;
  }
  | {
    readonly ok: false;
    readonly error: {
      readonly message: string;
    };
  };

export function resolveHostServiceEndpoint(
  moduleUrl: string,
): string {
  const override = process.env.SOURCE_ANALYSIS_HOST_ENDPOINT?.trim();
  if (override) {
    return override;
  }
  const paths = createSnapshotPaths(moduleUrl);
  const hash = createHash('sha1')
    .update(paths.toolRootPath)
    .digest('hex')
    .slice(0, 12);

  if (process.platform === 'win32') {
    return `\\\\.\\pipe\\source-analysis-host-${hash}`;
  }

  return join(tmpdir(), `source-analysis-host-${hash}.sock`);
}

export function isHostServicePathError(
  error: NodeJS.ErrnoException,
): boolean {
  return error.code === 'ENOENT'
    || error.code === 'ECONNREFUSED'
    || error.code === 'EPIPE';
}
