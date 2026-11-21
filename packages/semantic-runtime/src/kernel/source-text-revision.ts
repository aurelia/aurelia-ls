import { createHash } from 'node:crypto';

/** Stable content identity for source values retained outside an exact project-input read. */
export function sourceTextContentRevision(text: string, encoding: 'base64url' | 'hex' = 'base64url'): string {
  const hash = createHash('sha256');
  // A UTF-8 encoding would collapse an unpaired surrogate into U+FFFD. 0xff cannot start valid UTF-8.
  if (/[\uD800-\uDFFF]/u.test(text)) hash.update(Buffer.from([0xff])).update(text, 'utf16le');
  else hash.update(text, 'utf8');
  return hash.digest(encoding);
}
