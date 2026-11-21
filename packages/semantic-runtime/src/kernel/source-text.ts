export { sourceTextContentRevision } from './source-text-revision.js';

/** Decode BOM-marked UTF-16 or ordinary UTF-8, preserving the BOM in the physical source snapshot. */
export function decodeSourceText(bytes: Uint8Array): string {
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (buffer[0] === 0xff && buffer[1] === 0xfe) return buffer.toString('utf16le');
  if (buffer[0] === 0xfe && buffer[1] === 0xff) {
    // Like the LE path, retain individual UTF-16 code units and ignore a final incomplete unit.
    return Buffer.from(buffer.subarray(0, buffer.length - buffer.length % 2)).swap16().toString('utf16le');
  }
  return buffer.toString('utf8');
}
