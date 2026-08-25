import { createHash } from 'node:crypto';

/** Stable content identity for source values retained outside an exact project-input read. */
export function sourceTextContentRevision(text: string): string {
  return createHash('sha256').update(text).digest('base64url');
}
