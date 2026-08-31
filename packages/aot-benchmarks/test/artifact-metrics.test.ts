import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

import {
  BROTLI_QUALITY,
  GZIP_LEVEL,
  assertArtifactSetMetrics,
  measureArtifactSet,
} from '../src/artifact-metrics.js';

describe('artifact metrics', () => {
  it('records exact per-file compression and separate initial/total JavaScript aggregates', () => {
    const entry = Buffer.from('import "./lazy.js"; console.log("entry");');
    const lazy = Buffer.from('export const value = "lazy";');
    const html = Buffer.from('<main></main>');
    const measured = measureArtifactSet([
      { path: 'assets/entry.js', bytes: entry, kind: 'javascript', initialEager: true, served: true, imports: ['assets/lazy.js'] },
      { path: 'assets/lazy.js', bytes: lazy, kind: 'javascript', initialEager: false, served: true },
      { path: 'index.html', bytes: html, kind: 'html', initialEager: false, served: true },
    ]);

    expect(measured.files.map(file => file.path)).toEqual(['assets/entry.js', 'assets/lazy.js', 'index.html']);
    expect(measured.files[0]).toMatchObject({
      rawBytes: entry.byteLength,
      gzip9Bytes: gzipSync(entry, { level: GZIP_LEVEL }).byteLength,
      brotli11Bytes: brotliCompressSync(entry, {
        params: { [constants.BROTLI_PARAM_QUALITY]: BROTLI_QUALITY },
      }).byteLength,
    });
    expect(measured.initialEagerJavaScript).toMatchObject({ fileCount: 1, rawBytes: entry.byteLength });
    expect(measured.totalJavaScript).toMatchObject({ fileCount: 2, rawBytes: entry.byteLength + lazy.byteLength });
    expect(measured.nonJavaScript).toMatchObject({ fileCount: 1, rawBytes: html.byteLength });
    expect(() => assertArtifactSetMetrics(measured)).not.toThrow();
  });

  it('rejects duplicate, non-canonical, and dangling artifact topology', () => {
    const input = { path: 'entry.js', bytes: Buffer.from('x'), kind: 'javascript' as const, initialEager: true, served: true };
    expect(() => measureArtifactSet([input, input])).toThrow(/duplicate path/u);
    expect(() => measureArtifactSet([{ ...input, path: '../entry.js' }])).toThrow(/canonical path/u);
    expect(() => measureArtifactSet([{ ...input, imports: ['absent.js'] }])).toThrow(/absent artifact/u);
    expect(() => measureArtifactSet([{ ...input, kind: 'html' }])).toThrow(/not JavaScript/u);
  });

  it('rejects a persisted aggregate or identity that no longer agrees with its files', () => {
    const measured = measureArtifactSet([
      { path: 'entry.js', bytes: Buffer.from('x'), kind: 'javascript', initialEager: true, served: true },
    ]);
    const wrongAggregate = structuredClone(measured) as any;
    wrongAggregate.totalJavaScript.rawBytes += 1;
    expect(() => assertArtifactSetMetrics(wrongAggregate)).toThrow(/does not match/u);

    const wrongIdentity = structuredClone(measured) as any;
    wrongIdentity.files[0].served = false;
    expect(() => assertArtifactSetMetrics(wrongIdentity)).toThrow(/identity does not match/u);
  });
});
