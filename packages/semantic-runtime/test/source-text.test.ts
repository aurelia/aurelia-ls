import { createHash } from 'node:crypto';
import { expect, test } from 'vitest';
import { decodeSourceText, sourceTextContentRevision } from '../src/kernel/source-text.js';
import { localKeyPart } from '../src/kernel/local-key.js';

test('disk source decoding preserves the leading BOM, code units and input bytes across UTF encodings', () => {
  const text = '\uFEFFconst value = "é😀";';
  for (const bytes of [Buffer.from(text), Buffer.from(text, 'utf16le'), Buffer.from(text, 'utf16le').swap16()]) {
    const before = Buffer.from(bytes);
    expect(decodeSourceText(bytes)).toBe(text);
    expect(bytes).toEqual(before);
  }
  expect(decodeSourceText(Buffer.from('plain'))).toBe('plain');
  const unpaired = '\uFEFF\uD800';
  expect(decodeSourceText(Buffer.from(unpaired, 'utf16le').swap16())).toBe(unpaired);
});

test('distinct JS code units keep distinct source revisions and DI key parts', () => {
  const texts = ['\uD800', '\uD801', '\uDC00', '\uFFFD', '😀', '!utf16!ANg'];
  expect(new Set(texts.map(text => sourceTextContentRevision(text))).size).toBe(texts.length);
  expect(new Set(texts.map(localKeyPart)).size).toBe(texts.length);
  expect(sourceTextContentRevision('é😀')).toBe(createHash('sha256').update('é😀').digest('base64url'));
  expect(localKeyPart('é😀')).toBe(encodeURIComponent('é😀'));
});
