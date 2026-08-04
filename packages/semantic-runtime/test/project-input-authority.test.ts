import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test, vi } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import {
  SemanticRuntimeProjectInputCurrentnessMode,
  type SemanticRuntimeProjectInputCurrentnessPolicy,
  type SemanticRuntimeProjectInputReadDescriptor,
} from '../src/index.js';
import { ComputationReadValidationScope } from '../src/kernel/computation-lifecycle.js';
import {
  NodeSemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputAuthority,
  SemanticRuntimeProjectInputChange,
  SemanticRuntimeProjectInputChangeKind,
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

  test('classifies frozen exact descriptors and pull-validates every unclassified read kind', () => {
    const rootDir = normalize('C:/workspace/app');
    const sourceDir = normalize(`${rootDir}/src`);
    const sourceFile = normalize(`${sourceDir}/app.ts`);
    const host = new MutableProjectInputHost();
    host.write(sourceFile, 'export class App {}');
    const descriptors: SemanticRuntimeProjectInputReadDescriptor[] = [];
    const policy: SemanticRuntimeProjectInputCurrentnessPolicy = {
      authorityForRead(descriptor) {
        descriptors.push(descriptor);
        return null;
      },
    };
    const authority = new SemanticRuntimeProjectInputAuthority(host, policy);
    const generation = authority.capture({ projectKey: 'app', rootDir });
    const extensions = ['.ts'];
    const excludes = ['**/generated/**'];
    const includes = ['src/**/*.ts'];

    generation.host.readFile(sourceFile);
    generation.host.fileExists(sourceFile);
    generation.host.readDirectory(sourceDir);
    generation.host.directoryExists(sourceDir);
    generation.host.realpath(sourceFile);
    generation.host.matchFiles(rootDir, extensions, excludes, includes, 4);
    extensions.push('.js');
    excludes.push('**/later/**');
    includes.push('other/**/*.ts');

    expect(descriptors).toEqual([
      { kind: SemanticRuntimeProjectInputReadKind.FileContent, fileName: sourceFile },
      { kind: SemanticRuntimeProjectInputReadKind.FileExistence, fileName: sourceFile },
      { kind: SemanticRuntimeProjectInputReadKind.DirectoryEntries, directoryName: sourceDir },
      { kind: SemanticRuntimeProjectInputReadKind.DirectoryExistence, directoryName: sourceDir },
      { kind: SemanticRuntimeProjectInputReadKind.Realpath, fileName: sourceFile },
      {
        kind: SemanticRuntimeProjectInputReadKind.MatchedFiles,
        rootDir,
        extensions: ['.ts'],
        excludes: ['**/generated/**'],
        includes: ['src/**/*.ts'],
        depth: 4,
      },
    ]);
    expect(descriptors.every(Object.isFrozen)).toBe(true);
    const matched = descriptors.at(-1);
    expect(matched?.kind).toBe(SemanticRuntimeProjectInputReadKind.MatchedFiles);
    if (matched?.kind === SemanticRuntimeProjectInputReadKind.MatchedFiles) {
      expect(Object.isFrozen(matched.extensions)).toBe(true);
      expect(Object.isFrozen(matched.excludes)).toBe(true);
      expect(Object.isFrozen(matched.includes)).toBe(true);
    }
    const reads = generation.readRegisteredInputs();
    expect(reads.every((read) =>
      read.currentnessAuthority.mode === SemanticRuntimeProjectInputCurrentnessMode.PullValidated
    )).toBe(true);
    expect(reads.every((read) => Object.isFrozen(read.currentnessAuthority))).toBe(true);
    const validations = reads.map((read) => vi.spyOn(read, 'validate'));
    expect(generation.validate().isCurrent).toBe(true);
    expect(validations.every((validation) => validation.mock.calls.length === 1)).toBe(true);
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

  test('rejects a generation revoked reentrantly by one of its pull-validation callbacks', () => {
    const rootDir = normalize('C:/workspace/app');
    const sourceFile = normalize(`${rootDir}/src/app.ts`);
    const host = new MutableProjectInputHost();
    host.write(sourceFile, 'export const value = 1;');
    const authority = new SemanticRuntimeProjectInputAuthority(host);
    const generation = authority.capture({ projectKey: 'app', rootDir });
    generation.host.readFile(sourceFile);
    const read = generation.readRegisteredInputs()[0]!;
    const validate = read.validate.bind(read);
    vi.spyOn(read, 'validate').mockImplementation((scope) => {
      const result = validate(scope);
      authority.advance();
      return result;
    });

    expect(generation.validate()).toMatchObject({
      isCurrent: false,
      changedFacets: expect.arrayContaining(['generation']),
    });
    expect(generation.isCurrent()).toBe(false);
    expect(authority.capture({ projectKey: 'app', rootDir })).not.toBe(generation);
  });

  test('keeps exact file-value transfer separate from structural source-world membership', () => {
    const rootDir = normalize('C:/workspace/app');
    const sourceFile = normalize(`${rootDir}/src/app.ts`);
    const markerFile = normalize(`${rootDir}/packages/feature/package.json`);
    const authority = new SemanticRuntimeProjectInputAuthority(new MutableProjectInputHost());
    const firstProject = authority.capture({ projectKey: 'app', rootDir });
    const firstWorkspace = authority.captureWorkspace({ workspaceInputKey: 'workspace', rootDir });
    const exactFile = new SemanticRuntimeProjectInputChange(
      SemanticRuntimeProjectInputChangeKind.FileValue,
      sourceFile,
    );

    expect(exactFile).toMatchObject({
      kind: SemanticRuntimeProjectInputChangeKind.FileValue,
      path: sourceFile,
    });
    expect(Object.isFrozen(exactFile)).toBe(true);
    authority.advance([exactFile]);
    expect(firstProject.isCurrent()).toBe(false);
    expect(firstWorkspace.isCurrent()).toBe(true);

    const secondWorkspace = authority.captureWorkspace({ workspaceInputKey: 'workspace', rootDir });
    expect(secondWorkspace).toBe(firstWorkspace);
    const structural = new SemanticRuntimeProjectInputChange(
      SemanticRuntimeProjectInputChangeKind.StructuralMembership,
      markerFile,
    );
    expect(structural).toMatchObject({
      kind: SemanticRuntimeProjectInputChangeKind.StructuralMembership,
      path: markerFile,
    });
    expect(Object.isFrozen(structural)).toBe(true);
    authority.advance([structural]);
    expect(firstWorkspace.isCurrent()).toBe(false);
    expect(authority.captureWorkspace({ workspaceInputKey: 'workspace', rootDir })).not.toBe(firstWorkspace);
  });

  test('keeps file identity current and timestamps a late workspace content read at its observation sequence', () => {
    const rootDir = normalize('C:/workspace/app');
    const sourceFile = normalize(`${rootDir}/src/app.ts`);
    const host = new MutableProjectInputHost();
    host.write(sourceFile, 'export const value = 1;');
    const authority = new SemanticRuntimeProjectInputAuthority(
      host,
      { authorityForRead: () => ({ mode: SemanticRuntimeProjectInputCurrentnessMode.PushObserved }) },
    );
    const workspace = authority.captureWorkspace({ workspaceInputKey: 'workspace', rootDir });
    expect(workspace.host.fileExists(sourceFile)).toBe(true);

    host.write(sourceFile, 'export const value = 2;');
    authority.advance([
      new SemanticRuntimeProjectInputChange(
        SemanticRuntimeProjectInputChangeKind.FileValue,
        sourceFile,
      ),
    ]);

    expect(workspace.isCurrent()).toBe(true);
    expect(workspace.host.readFile(sourceFile)).toContain('2');
    const reads = workspace.readRegisteredInputs();
    expect(reads.find((read) => read.kind === SemanticRuntimeProjectInputReadKind.FileExistence)
      ?.validateObservedValue().isCurrent).toBe(true);
    expect(reads.find((read) => read.kind === SemanticRuntimeProjectInputReadKind.FileContent)
      ?.validateObservedValue().isCurrent).toBe(true);
    expect(authority.captureWorkspace({ workspaceInputKey: 'workspace', rootDir })).toBe(workspace);
  });

  test('invalidates exact workspace values when a later validation callback publishes a relevant event', () => {
    const rootDir = normalize('C:/workspace/app');
    const pushedFile = normalize(`${rootDir}/src/pushed.ts`);
    const pulledFile = normalize(`${rootDir}/src/pulled.ts`);
    const host = new MutableProjectInputHost();
    host.write(pushedFile, 'export const pushed = true;');
    host.write(pulledFile, 'export const pulled = true;');
    const authority = new SemanticRuntimeProjectInputAuthority(host, pushObservedFileContentPolicy(pushedFile));
    const workspace = authority.captureWorkspace({ workspaceInputKey: 'workspace', rootDir });
    workspace.host.readFile(pushedFile);
    workspace.host.readFile(pulledFile);
    const reads = workspace.readRegisteredInputs();
    const pulledRead = reads.find((read) => read.descriptor.kind === SemanticRuntimeProjectInputReadKind.FileContent
      && read.descriptor.fileName === pulledFile)!;
    const validatePulled = pulledRead.validateObservedValue.bind(pulledRead);
    vi.spyOn(pulledRead, 'validateObservedValue').mockImplementation(() => {
      const result = validatePulled();
      authority.advance([
        new SemanticRuntimeProjectInputChange(
          SemanticRuntimeProjectInputChangeKind.FileValue,
          pushedFile,
        ),
      ]);
      return result;
    });

    expect(workspace.validateRegisteredInputValues()).toMatchObject({
      isCurrent: false,
      changedFacets: [SemanticRuntimeProjectInputReadKind.FileContent],
    });
    expect(workspace.isCurrent()).toBe(true);
    expect(authority.captureWorkspace({ workspaceInputKey: 'workspace', rootDir })).not.toBe(workspace);
  });

  test('rechecks workspace generation ownership after exact-value validation returns', () => {
    const rootDir = normalize('C:/workspace/app');
    const sourceFile = normalize(`${rootDir}/src/app.ts`);
    const host = new MutableProjectInputHost();
    host.write(sourceFile, 'export const value = true;');
    const authority = new SemanticRuntimeProjectInputAuthority(host);
    const workspace = authority.captureWorkspace({ workspaceInputKey: 'workspace', rootDir });
    workspace.host.readFile(sourceFile);
    const validate = workspace.validateRegisteredInputValues.bind(workspace);
    vi.spyOn(workspace, 'validateRegisteredInputValues').mockImplementation(() => {
      const result = validate();
      authority.advance([
        new SemanticRuntimeProjectInputChange(
          SemanticRuntimeProjectInputChangeKind.StructuralMembership,
          sourceFile,
        ),
      ]);
      return result;
    });

    expect(authority.captureWorkspace({ workspaceInputKey: 'workspace', rootDir })).not.toBe(workspace);
    expect(workspace.isCurrent()).toBe(false);
  });

  test('uses exact push observation as currentness proof without polling that read', () => {
    const rootDir = normalize('C:/workspace/app');
    const sourceFile = normalize(`${rootDir}/src/app.ts`);
    const host = new MutableProjectInputHost();
    host.write(sourceFile, 'export const value = 1;');
    const authority = new SemanticRuntimeProjectInputAuthority(
      host,
      pushObservedFileContentPolicy(sourceFile),
    );
    const first = authority.capture({ projectKey: 'app', rootDir });

    expect(first.host.readFile(sourceFile)).toContain('1');
    const exactReadValidation = vi.spyOn(first.readRegisteredInputs()[0]!, 'validate');
    host.resetFileReadCounts();
    expect(first.validate().isCurrent).toBe(true);
    expect(authority.capture({ projectKey: 'app', rootDir })).toBe(first);
    expect(exactReadValidation).not.toHaveBeenCalled();
    expect(host.fileReadCount(sourceFile)).toBe(0);

    host.write(sourceFile, 'export const value = 2;');
    expect(first.validate().isCurrent).toBe(true);
    expect(host.fileReadCount(sourceFile)).toBe(0);

    authority.advance();
    expect(first.validate().isCurrent).toBe(false);
    const second = authority.capture({ projectKey: 'app', rootDir });
    expect(second).not.toBe(first);
    expect(second.host.readFile(sourceFile)).toContain('2');
    expect(host.fileReadCount(sourceFile)).toBe(1);
  });

  test('validates only the compact pull subset and replaces locally on a typed pull mismatch', () => {
    const rootDir = normalize('C:/workspace/app');
    const pushedFile = normalize(`${rootDir}/src/open.ts`);
    const snapshotFile = normalize(`${rootDir}/src/generated.ts`);
    const pulledFile = normalize(`${rootDir}/shared/dependency.ts`);
    const host = new MutableProjectInputHost();
    host.write(pushedFile, 'export const open = 1;');
    host.write(snapshotFile, 'export const generated = 1;');
    host.write(pulledFile, 'export const dependency = 1;');
    const authority = new SemanticRuntimeProjectInputAuthority(host, {
      authorityForRead(descriptor) {
        if (descriptor.kind !== SemanticRuntimeProjectInputReadKind.FileContent) return null;
        if (descriptor.fileName === pushedFile) {
          return { mode: SemanticRuntimeProjectInputCurrentnessMode.PushObserved };
        }
        if (descriptor.fileName === snapshotFile) {
          return {
            mode: SemanticRuntimeProjectInputCurrentnessMode.SessionSnapshot,
            snapshotIdentity: 'build-snapshot-1',
          };
        }
        return null;
      },
    });
    const first = authority.capture({ projectKey: 'app', rootDir });
    first.host.readFile(pushedFile);
    first.host.readFile(snapshotFile);
    first.host.readFile(pulledFile);
    const reads = first.readRegisteredInputs();
    const pushed = reads.find((read) => read.descriptor.kind === SemanticRuntimeProjectInputReadKind.FileContent
      && read.descriptor.fileName === pushedFile)!;
    const snapshot = reads.find((read) => read.descriptor.kind === SemanticRuntimeProjectInputReadKind.FileContent
      && read.descriptor.fileName === snapshotFile)!;
    const pulled = reads.find((read) => read.descriptor.kind === SemanticRuntimeProjectInputReadKind.FileContent
      && read.descriptor.fileName === pulledFile)!;
    const pushedValidation = vi.spyOn(pushed, 'validate');
    const snapshotValidation = vi.spyOn(snapshot, 'validate');
    const pulledValidation = vi.spyOn(pulled, 'validate');

    host.resetFileReadCounts();
    expect(first.validate().isCurrent).toBe(true);
    expect(pushedValidation).not.toHaveBeenCalled();
    expect(snapshotValidation).not.toHaveBeenCalled();
    expect(pulledValidation).toHaveBeenCalledOnce();
    expect(host.fileReadCount(pushedFile)).toBe(0);
    expect(host.fileReadCount(snapshotFile)).toBe(0);
    expect(host.fileReadCount(pulledFile)).toBe(1);

    host.write(pushedFile, 'export const open = 2;');
    host.write(snapshotFile, 'export const generated = 2;');
    pulledValidation.mockClear();
    host.resetFileReadCounts();
    expect(first.validate().isCurrent).toBe(true);
    expect(pulledValidation).toHaveBeenCalledOnce();
    expect(host.fileReadCount(pushedFile)).toBe(0);
    expect(host.fileReadCount(snapshotFile)).toBe(0);
    expect(host.fileReadCount(pulledFile)).toBe(1);

    host.write(pulledFile, 'export const dependency = 2;');
    const mismatch = first.validate();
    expect(mismatch).toMatchObject({
      isCurrent: false,
      changedFacets: [SemanticRuntimeProjectInputReadKind.FileContent],
    });
    expect(authority.currentEventSequence).toBe(0);
    const second = authority.capture({ projectKey: 'app', rootDir });
    expect(second).not.toBe(first);
    expect(second.eventSequence).toBe(0);
    expect(second.revision).not.toBe(first.revision);
    expect(first.isCurrent()).toBe(false);
  });

  test('recaptures mode and snapshot-identity transitions across generations', () => {
    const rootDir = normalize('C:/workspace/app');
    const sourceFile = normalize(`${rootDir}/src/app.ts`);
    const host = new MutableProjectInputHost();
    host.write(sourceFile, 'export const value = 1;');
    let mode = SemanticRuntimeProjectInputCurrentnessMode.PushObserved;
    let snapshotIdentity = 'snapshot-a';
    const authority = new SemanticRuntimeProjectInputAuthority(host, {
      authorityForRead(descriptor) {
        if (
          descriptor.kind !== SemanticRuntimeProjectInputReadKind.FileContent
          || descriptor.fileName !== sourceFile
        ) return null;
        return mode === SemanticRuntimeProjectInputCurrentnessMode.SessionSnapshot
          ? { mode, snapshotIdentity }
          : { mode };
      },
    });
    const first = authority.capture({ projectKey: 'app', rootDir });
    const scope = first.createReadScope('transitioning-consumer');
    const otherScope = first.createReadScope('other-transitioning-consumer');
    expect(scope.host.readFile(sourceFile)).toContain('1');
    expect(otherScope.host.readFile(sourceFile)).toContain('1');

    mode = SemanticRuntimeProjectInputCurrentnessMode.SessionSnapshot;
    authority.advance();
    const second = authority.capture({ projectKey: 'app', rootDir });
    host.resetFileReadCounts();
    expect(scope.tryRebaseCurrent(second)).toBe(true);
    expect(otherScope.tryRebaseCurrent(second)).toBe(true);
    expect(host.fileReadCount(sourceFile)).toBe(1);
    expect(otherScope.readRegisteredInputs()[0]).toBe(scope.readRegisteredInputs()[0]);
    expect(scope.readRegisteredInputs()[0]?.currentnessAuthority).toEqual({
      mode: SemanticRuntimeProjectInputCurrentnessMode.SessionSnapshot,
      snapshotIdentity: 'snapshot-a',
    });

    authority.advance();
    const third = authority.capture({ projectKey: 'app', rootDir });
    host.resetFileReadCounts();
    expect(scope.tryRebaseCurrent(third)).toBe(true);
    expect(host.fileReadCount(sourceFile)).toBe(0);

    host.write(sourceFile, 'export const value = 2;');
    snapshotIdentity = 'snapshot-b';
    authority.advance();
    const fourth = authority.capture({ projectKey: 'app', rootDir });
    host.resetFileReadCounts();
    expect(scope.tryRebaseCurrent(fourth)).toBe(false);
    expect(host.fileReadCount(sourceFile)).toBe(1);

    host.write(sourceFile, 'export const value = 1;');
    mode = SemanticRuntimeProjectInputCurrentnessMode.PullValidated;
    authority.advance();
    const fifth = authority.capture({ projectKey: 'app', rootDir });
    host.resetFileReadCounts();
    expect(scope.tryRebaseCurrent(fifth)).toBe(true);
    expect(host.fileReadCount(sourceFile)).toBe(1);
    expect(scope.readRegisteredInputs()[0]?.currentnessAuthority).toEqual({
      mode: SemanticRuntimeProjectInputCurrentnessMode.PullValidated,
    });
  });

  test('applies explicit push and snapshot guarantees to directory and matched-file requests', () => {
    const rootDir = normalize('C:/workspace/app');
    const sourceDir = normalize(`${rootDir}/src`);
    const host = new MutableProjectInputHost();
    host.write(`${sourceDir}/app.ts`, 'export class App {}');
    let snapshotIdentity = 'tree-1';
    const authority = new SemanticRuntimeProjectInputAuthority(host, {
      authorityForRead(descriptor) {
        switch (descriptor.kind) {
          case SemanticRuntimeProjectInputReadKind.DirectoryEntries:
            return descriptor.directoryName === sourceDir
              ? { mode: SemanticRuntimeProjectInputCurrentnessMode.PushObserved }
              : null;
          case SemanticRuntimeProjectInputReadKind.MatchedFiles:
            return descriptor.rootDir === rootDir
              ? {
                  mode: SemanticRuntimeProjectInputCurrentnessMode.SessionSnapshot,
                  snapshotIdentity,
                }
              : null;
          default:
            return null;
        }
      },
    });
    const first = authority.capture({ projectKey: 'app', rootDir });
    const directoryScope = first.createReadScope('directory-membership');
    const matchScope = first.createReadScope('matched-membership');
    expect(directoryScope.host.readDirectory(sourceDir)).toEqual(['app.ts']);
    expect(matchScope.host.matchFiles(rootDir, ['.ts'], [], ['src/**/*.ts'], 3)).toEqual([
      normalize(`${sourceDir}/app.ts`),
    ]);

    // Deliberately violate the tree-1 snapshot promise: the retained match proves why identity must name immutable
    // output, while the separately push-observed directory is revoked and recaptured by the broad event below.
    host.write(`${sourceDir}/later.ts`, 'export const later = true;');
    expect(first.validate().isCurrent).toBe(true);
    authority.advance();
    const second = authority.capture({ projectKey: 'app', rootDir });
    expect(directoryScope.tryRebaseCurrent(second)).toBe(false);
    expect(matchScope.tryRebaseCurrent(second)).toBe(true);

    snapshotIdentity = 'tree-2';
    authority.advance();
    const third = authority.capture({ projectKey: 'app', rootDir });
    expect(matchScope.tryRebaseCurrent(third)).toBe(false);
  });

  test('rejects session-snapshot currentness without an immutable snapshot identity', () => {
    const rootDir = normalize('C:/workspace/app');
    const sourceFile = normalize(`${rootDir}/src/app.ts`);
    const host = new MutableProjectInputHost();
    host.write(sourceFile, 'export class App {}');
    const authority = new SemanticRuntimeProjectInputAuthority(host, {
      authorityForRead: () => ({
        mode: SemanticRuntimeProjectInputCurrentnessMode.SessionSnapshot,
        snapshotIdentity: '   ',
      }),
    });
    const generation = authority.capture({ projectKey: 'app', rootDir });

    expect(() => generation.host.readFile(sourceFile)).toThrow(/non-empty snapshotIdentity/);
  });

  test('rebases unaffected consumer reads without polling after an exact file event', () => {
    const rootDir = normalize('C:/workspace/app');
    const scriptFile = normalize(`${rootDir}/src/app.ts`);
    const templateFile = normalize(`${rootDir}/src/app.html`);
    const host = new MutableProjectInputHost();
    host.write(scriptFile, 'export class App {}');
    host.write(templateFile, '<template>before</template>');
    const authority = new SemanticRuntimeProjectInputAuthority(
      host,
      pushObservedFileContentPolicy(scriptFile, templateFile),
    );
    const first = authority.capture({ projectKey: 'app', rootDir });
    const scriptConsumer = first.createReadScope('script-consumer');
    const templateConsumer = first.createReadScope('template-consumer');
    expect(scriptConsumer.host.readFile(scriptFile)).toContain('class App');
    expect(templateConsumer.host.readFile(templateFile)).toContain('before');

    host.write(templateFile, '<template>after</template>');
    host.resetFileReadCounts();
    authority.advance([
      new SemanticRuntimeProjectInputChange(SemanticRuntimeProjectInputChangeKind.FileValue, templateFile),
    ]);
    const second = authority.capture({ projectKey: 'app', rootDir });

    expect(scriptConsumer.tryRebaseCurrent(second)).toBe(true);
    expect(host.fileReadCount(scriptFile)).toBe(0);
    expect(templateConsumer.tryRebaseCurrent(second)).toBe(false);
    expect(host.fileReadCount(templateFile)).toBe(1);
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

  test('rebases exact directory and matched-file lists and rejects later membership changes', () => {
    const rootDir = normalize('C:/workspace/app');
    const sourceDir = normalize(`${rootDir}/src`);
    const host = new MutableProjectInputHost();
    host.write(`${sourceDir}/app.ts`, 'export class App {}');
    host.write(`${sourceDir}/other.ts`, 'export const other = true;');
    const authority = new SemanticRuntimeProjectInputAuthority(host);
    const first = authority.capture({ projectKey: 'app', rootDir });
    const scope = first.createReadScope('source-membership');

    expect(scope.host.readDirectory(sourceDir)).toEqual(['app.ts', 'other.ts']);
    expect(scope.host.matchFiles(rootDir)).toHaveLength(2);

    authority.advance();
    const second = authority.capture({ projectKey: 'app', rootDir });
    expect(scope.tryRebaseCurrent(second)).toBe(true);

    host.write(`${sourceDir}/later.ts`, 'export const later = true;');
    expect(scope.tryRebaseCurrent(second)).toBe(false);
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

function pushObservedFileContentPolicy(
  ...fileNames: readonly string[]
): SemanticRuntimeProjectInputCurrentnessPolicy {
  const exactFiles = new Set(fileNames);
  return {
    authorityForRead: (descriptor) =>
      descriptor.kind === SemanticRuntimeProjectInputReadKind.FileContent
      && exactFiles.has(descriptor.fileName)
        ? { mode: SemanticRuntimeProjectInputCurrentnessMode.PushObserved }
        : null,
  };
}
