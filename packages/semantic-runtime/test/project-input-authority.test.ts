import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { ComputationReadValidationScope } from '../src/kernel/computation-lifecycle.js';
import {
  NodeSemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputAuthority,
  type SemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputReadKind,
} from '../src/kernel/project-input.js';

class MutableProjectInputHost implements SemanticRuntimeProjectInputHost {
  private readonly files = new Map<string, string>();
  private readonly directories = new Set<string>();
  private readonly fileReadCounts = new Map<string, number>();

  write(fileName: string, text: string): void {
    const normalized = normalize(fileName);
    this.files.set(normalized, text);
    this.directories.add(normalize(path.dirname(normalized)));
  }

  remove(fileName: string): void {
    this.files.delete(normalize(fileName));
  }

  readFile(fileName: string): string | undefined {
    const normalized = normalize(fileName);
    this.fileReadCounts.set(normalized, (this.fileReadCounts.get(normalized) ?? 0) + 1);
    return this.files.get(normalized);
  }

  fileReadCount(fileName: string): number {
    return this.fileReadCounts.get(normalize(fileName)) ?? 0;
  }

  resetFileReadCounts(): void {
    this.fileReadCounts.clear();
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

  test('retains narrow product reads inside one synchronous owner scope', () => {
    const rootDir = normalize('C:/workspace/app');
    const sourceFile = normalize(`${rootDir}/src/app.ts`);
    const missingFile = normalize(`${rootDir}/src/missing.ts`);
    const host = new MutableProjectInputHost();
    host.write(sourceFile, 'export const value = 1;');
    const generation = new SemanticRuntimeProjectInputAuthority(host)
      .capture({ projectKey: 'app', rootDir });
    const ownerScope = generation.createReadScope('app-owner');
    const productScope = generation.createReadScope('narrow-product');

    generation.withReadScope(ownerScope, () => {
      generation.host.readFile(sourceFile);
      productScope.host.fileExists(missingFile);
    });
    generation.host.directoryExists(rootDir);

    expect(ownerScope.readRegisteredInputs().map((read) => read.kind)).toEqual([
      SemanticRuntimeProjectInputReadKind.FileContent,
      SemanticRuntimeProjectInputReadKind.FileExistence,
    ]);
    expect(productScope.readRegisteredInputs().map((read) => read.kind)).toEqual([
      SemanticRuntimeProjectInputReadKind.FileExistence,
    ]);
    expect(() => generation.withReadScope(ownerScope, () => Promise.resolve()))
      .toThrow(/cannot cross an asynchronous boundary/);
  });

  test('rebases a consumer host across an event-only generation after exact positive and negative reads', () => {
    const rootDir = normalize('C:/workspace/app');
    const sourceFile = normalize(`${rootDir}/src/app.ts`);
    const missingFile = normalize(`${rootDir}/src/missing.ts`);
    const host = new MutableProjectInputHost();
    host.write(sourceFile, 'export const value = 1;');
    const authority = new SemanticRuntimeProjectInputAuthority(host);
    const first = authority.capture({ projectKey: 'app', rootDir });
    const scope = first.createReadScope('reusable-consumer');
    const stableHost = scope.host;

    expect(stableHost.readFile(sourceFile)).toContain('1');
    expect(stableHost.fileExists(missingFile)).toBe(false);
    authority.advance();
    const second = authority.capture({ projectKey: 'app', rootDir });

    expect(scope.tryRebaseCurrent(second)).toBe(true);
    expect(scope.host).toBe(stableHost);
    expect(stableHost.readFile(sourceFile)).toContain('1');
    expect(stableHost.fileExists(missingFile)).toBe(false);
    expect(scope.belongsTo(second)).toBe(true);
    expect(scope.readRegisteredInputs().every((read) => read.validate().isCurrent)).toBe(true);

    host.write(sourceFile, 'export const value = 2;');
    host.write(missingFile, 'export const admitted = true;');
    expect(stableHost.readFile(sourceFile)).toContain('1');
    expect(stableHost.fileExists(missingFile)).toBe(false);
    expect(scope.tryRebaseCurrent(second)).toBe(false);
  });

  test('shares target-generation input capture across consumer scopes in one proof', () => {
    const rootDir = normalize('C:/workspace/app');
    const sourceFile = normalize(`${rootDir}/src/app.ts`);
    const host = new MutableProjectInputHost();
    host.write(sourceFile, 'export const value = 1;');
    const authority = new SemanticRuntimeProjectInputAuthority(host);
    const first = authority.capture({ projectKey: 'app', rootDir });
    const scopes = [
      first.createReadScope('consumer-a'),
      first.createReadScope('consumer-b'),
      first.createReadScope('consumer-c'),
    ];
    for (const scope of scopes) {
      expect(scope.host.readFile(sourceFile)).toContain('1');
    }

    authority.advance();
    const second = authority.capture({ projectKey: 'app', rootDir });
    const validationScope = new ComputationReadValidationScope();
    const targetOwnerScope = second.createReadScope('target-owner');
    host.resetFileReadCounts();

    second.withReadScope(targetOwnerScope, () => {
      for (const scope of scopes) {
        expect(scope.tryRebaseCurrentInScope(second, validationScope)).toBe(true);
      }
    });
    expect(host.fileReadCount(sourceFile)).toBe(2);
    expect(scopes.every((scope) => scope.belongsTo(second))).toBe(true);
    const sharedRead = scopes[0]?.readRegisteredInputs()[0];
    expect(sharedRead).toBeDefined();
    expect(scopes.every((scope) => scope.readRegisteredInputs()[0] === sharedRead)).toBe(true);
    expect(targetOwnerScope.readRegisteredInputs()).toEqual([sharedRead]);
  });

  test('refuses read-scope rebase when a prior positive or negative read changed', () => {
    const rootDir = normalize('C:/workspace/app');
    const sourceFile = normalize(`${rootDir}/src/app.ts`);
    const missingFile = normalize(`${rootDir}/src/missing.ts`);
    const host = new MutableProjectInputHost();
    host.write(sourceFile, 'export const value = 1;');
    const authority = new SemanticRuntimeProjectInputAuthority(host);
    const first = authority.capture({ projectKey: 'app', rootDir });
    const contentScope = first.createReadScope('content-consumer');
    const existenceScope = first.createReadScope('existence-consumer');
    contentScope.host.readFile(sourceFile);
    existenceScope.host.fileExists(missingFile);

    host.write(sourceFile, 'export const value = 2;');
    host.write(missingFile, 'export const admitted = true;');
    authority.advance();
    const second = authority.capture({ projectKey: 'app', rootDir });

    expect(contentScope.tryRebaseCurrent(second)).toBe(false);
    expect(existenceScope.tryRebaseCurrent(second)).toBe(false);
    expect(contentScope.belongsTo(first)).toBe(true);
    expect(existenceScope.belongsTo(first)).toBe(true);
    expect(() => contentScope.host.readFile(sourceFile)).toThrow(/no longer current/);
  });

  test('refuses read-scope rebase across input authorities and while the scope is active', () => {
    const rootDir = normalize('C:/workspace/app');
    const firstAuthority = new SemanticRuntimeProjectInputAuthority(new MutableProjectInputHost());
    const secondAuthority = new SemanticRuntimeProjectInputAuthority(new MutableProjectInputHost());
    const first = firstAuthority.capture({ projectKey: 'app', rootDir });
    const unrelated = secondAuthority.capture({ projectKey: 'app', rootDir });
    const scope = first.createReadScope('owned-consumer');

    expect(() => scope.tryRebaseCurrent(unrelated)).toThrow(/unrelated generation/);
    expect(() => first.withReadScope(scope, () => {
      firstAuthority.advance();
      const next = firstAuthority.capture({ projectKey: 'app', rootDir });
      scope.tryRebaseCurrent(next);
    })).toThrow(/cannot rebase while it is active/);
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
