import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { StaticBuildServer } from '@aurelia-ls/aot-assurance';
import { afterEach, describe, expect, test } from 'vitest';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('production assurance server', () => {
  test('neutralizes only the browser-owned favicon probe', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'aot-assurance-server-'));
    temporaryRoots.push(root);
    await writeFile(path.join(root, 'index.html'), '<!doctype html><title>fixture</title>', 'utf8');
    const server = new StaticBuildServer(root);
    try {
      const url = await server.start();
      expect((await fetch(`${url}/favicon.ico`)).status).toBe(204);
      expect((await fetch(`${url}/missing-application.js`)).status).toBe(404);
      expect((await fetch(url)).status).toBe(200);
    } finally {
      await server.close();
    }
  });
});
