import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import {
  NodeSemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputAuthority,
  type SemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputReadKind,
} from '../src/kernel/project-input.js';

class MutableProjectInputHost implements SemanticRuntimeProjectInputHost {
  private readonly files = new Map<string, string>();
  private readonly directories = new Set<string>();

  write(fileName: string, text: string): void {
    const normalized = normalize(fileName);
    this.files.set(normalized, text);
    this.directories.add(normalize(path.dirname(normalized)));
  }

  remove(fileName: string): void {
    this.files.delete(normalize(fileName));
  }

  readFile(fileName: string): string | undefined {
    return this.files.get(normalize(fileName));
  }

  fileExists(fileName: string): boolean {
    return this.files.has(normalize(fileName));
  }

  readDirectory(directoryName: string): readonly string[] {
    const directory = normalize(directoryName);
    return [...new Set([...this.files.keys(), ...this.directories]
      .filter((entry) => normalize(path.dirname(entry)) === directory)
      .map((entry) => path.basename(entry)))]
      .sort((left, right) => left.localeCompare(right));
  }

  directoryExists(directoryName: string): boolean {
    return this.directories.has(normalize(directoryName));
  }

  realpath(fileName: string): string {
    return normalize(fileName);
  }

  matchFiles(rootDir: string): readonly string[] {
    const root = normalize(rootDir);
    return [...this.files.keys()].filter((fileName) => fileName.startsWith(`${root}/`)).sort();
  }
}

describe('SemanticRuntimeProjectInputAuthority', () => {
  test('replaces a generation when positive or negative host reads change', () => {
    const rootDir = normalize('C:/workspace/app');
    const sourceFile = normalize(`${rootDir}/src/app.ts`);
    const missingFile = normalize(`${rootDir}/src/missing.ts`);
    const host = new MutableProjectInputHost();
    host.write(sourceFile, 'export class App {}');
    const authority = new SemanticRuntimeProjectInputAuthority(host);

    const first = authority.capture({ projectKey: 'app', rootDir });
    expect(first.host.readFile(sourceFile)).toBe('export class App {}');
    expect(first.host.fileExists(missingFile)).toBe(false);
    expect(first.validate().isCurrent).toBe(true);
    expect(first.readRegisteredInputs().map((read) => read.kind)).toEqual([
      SemanticRuntimeProjectInputReadKind.FileContent,
      SemanticRuntimeProjectInputReadKind.FileExistence,
    ]);

    host.write(sourceFile, 'export class App { title = "changed"; }');
    host.write(missingFile, 'export const admitted = true;');
    expect(first.validate()).toMatchObject({
      isCurrent: false,
      changedFacets: expect.arrayContaining([
        SemanticRuntimeProjectInputReadKind.FileContent,
        SemanticRuntimeProjectInputReadKind.FileExistence,
      ]),
    });

    const second = authority.capture({ projectKey: 'app', rootDir });
    expect(second).not.toBe(first);
    expect(second.revision).not.toBe(first.revision);
    expect(first.isCurrent()).toBe(false);
    expect(second.host.readFile(sourceFile)).toContain('changed');
    expect(second.host.fileExists(missingFile)).toBe(true);
  });

  test('keeps one immutable host snapshot during a run and rejects it at validation', () => {
    const rootDir = normalize('C:/workspace/app');
    const sourceFile = normalize(`${rootDir}/src/app.ts`);
    const host = new MutableProjectInputHost();
    host.write(sourceFile, 'export const value = 1;');
    const authority = new SemanticRuntimeProjectInputAuthority(host);
    const generation = authority.capture({ projectKey: 'app', rootDir });

    expect(generation.host.readFile(sourceFile)).toContain('1');
    host.write(sourceFile, 'export const value = 2;');
    expect(generation.host.readFile(sourceFile)).toContain('1');
    expect(generation.validate()).toMatchObject({
      isCurrent: false,
      changedFacets: [SemanticRuntimeProjectInputReadKind.FileContent],
    });
  });

  test('uses one explicit event sequence for editor-style revocation', () => {
    const rootDir = normalize('C:/workspace/app');
    const authority = new SemanticRuntimeProjectInputAuthority(new MutableProjectInputHost());
    const first = authority.capture({ projectKey: 'app', rootDir });

    expect(authority.advance()).toBe(1);
    expect(first.isCurrent()).toBe(false);
    expect(() => first.host.fileExists(`${rootDir}/src/app.ts`)).toThrow(/no longer current/);

    const second = authority.capture({ projectKey: 'app', rootDir });
    expect(second.eventSequence).toBe(1);
    expect(second.isCurrent()).toBe(true);
  });

  test('invalidates retained runtime summaries by every captured project revision', async () => {
    const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/aliased-bindable-surfaces');
    const mainFile = path.join(fixtureRoot, 'src/main.ts');
    const overlay = new MutableProjectInputHost();
    overlay.write(mainFile, readFileSync(mainFile, 'utf8'));
    const authority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost({
        readFile: (fileName) => overlay.readFile(fileName),
        fileExists: (fileName) => overlay.readFile(fileName) == null ? undefined : true,
      }),
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'test:project-input-summary-revision',
      projectInputAuthority: authority,
      projects: [{
        rootDir: '.',
        projectKey: 'app',
        sourceFiles: [{ path: 'src/main.ts' }],
      }],
    });

    const first = runtime.summary({ inquiryProfile: 'mcp-orientation' });
    expect(first.value.defaultAppProjectKey).toBe('app');

    overlay.write(mainFile, 'export const noBootstrap = true;');
    authority.advance();
    const second = runtime.summary({ inquiryProfile: 'mcp-orientation' });
    expect(second.value.defaultAppProjectKey).toBeNull();
    expect(second.value.appCandidates).toHaveLength(0);
    expect(first.value.appCandidates).toHaveLength(1);

    const third = runtime.summary({ inquiryProfile: 'mcp-orientation' });
    expect(third.value).toEqual(second.value);
    const claims = runtime.analysisCacheOverview({ includeQueryClaimRows: true }).value.runtimeQueryClaimProfiles
      .find((profile) => profile.inquiryProfile === 'mcp-orientation')?.queryClaims;
    expect(claims?.retainedAnswerHits).toBeGreaterThanOrEqual(1);
  });
});

function normalize(fileName: string): string {
  return path.resolve(fileName).replace(/\\/g, '/').toLowerCase();
}
