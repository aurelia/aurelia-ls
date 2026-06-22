import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  AURELIA_USER_DOCS_MANIFEST_FILE,
  AURELIA_USER_DOCS_SNAPSHOT_ROOT,
  createAureliaUserDocsSnapshot,
  readBundledAureliaUserDocsCorpus,
  readBundledAureliaUserDocsManifest
} from './corpus/docs-snapshot.js';

test('docs snapshot copies corpus files and writes a manifest', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'patterns-docs-snapshot-'));
  try {
    const sourceRoot = path.join(tempRoot, 'source');
    const outputRoot = path.join(tempRoot, 'package');
    fs.mkdirSync(path.join(sourceRoot, 'guide'), { recursive: true });
    fs.mkdirSync(path.join(sourceRoot, 'images'), { recursive: true });
    fs.writeFileSync(path.join(sourceRoot, 'TOC.md'), '- [Guide](guide/index.md)\n');
    fs.writeFileSync(path.join(sourceRoot, 'guide/index.md'), '# Guide\n\n```ts\nexport class Guide {}\n```\n');
    fs.writeFileSync(path.join(sourceRoot, 'images/pixel.png'), Buffer.from([0, 1, 2, 3]));
    fs.mkdirSync(path.join(outputRoot, AURELIA_USER_DOCS_SNAPSHOT_ROOT, 'stale'), { recursive: true });
    fs.writeFileSync(path.join(outputRoot, AURELIA_USER_DOCS_SNAPSHOT_ROOT, 'stale/file.md'), '# stale\n');

    const manifest = createAureliaUserDocsSnapshot({
      sourceRootDir: sourceRoot,
      outputRootDir: outputRoot,
      sourceRevision: 'test-revision',
      generatedAt: '2026-06-15T00:00:00.000Z'
    });

    assert.equal(manifest.corpusId, 'aurelia-user-docs');
    assert.equal(manifest.source.sourceRevision, 'test-revision');
    assert.equal(manifest.snapshot.fileCount, 3);
    assert.equal(manifest.snapshot.markdownFileCount, 2);
    assert.equal(manifest.snapshot.imageFileCount, 1);
    assert.equal(manifest.snapshot.otherFileCount, 0);
    assert.deepEqual(
      manifest.files.map((file) => file.relativePath).sort(),
      ['TOC.md', 'guide/index.md', 'images/pixel.png']
    );
    assert.ok(fs.existsSync(path.join(outputRoot, AURELIA_USER_DOCS_MANIFEST_FILE)));
    assert.ok(fs.existsSync(path.join(outputRoot, AURELIA_USER_DOCS_SNAPSHOT_ROOT, 'guide/index.md')));
    assert.equal(fs.existsSync(path.join(outputRoot, AURELIA_USER_DOCS_SNAPSHOT_ROOT, 'stale/file.md')), false);

    const bundledManifest = readBundledAureliaUserDocsManifest(outputRoot);
    const bundledCorpus = readBundledAureliaUserDocsCorpus(outputRoot);
    assert.equal(bundledManifest.snapshot.sha256, manifest.snapshot.sha256);
    assert.equal(bundledCorpus.files.length, 3);
    assert.equal(bundledCorpus.markdownDocuments.length, 2);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
