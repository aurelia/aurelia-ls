import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../src/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const pressureRoot = path.join(packageRoot, 'fixtures/pressure');

describe('template rename candidates', () => {
  test('refuses a partial member migration and preserves every unresolved location', async () => {
    const root = path.join(pressureRoot, 'template-typechecking-corpus');
    const filePath = path.join(root, 'src/read-expressions.html');
    const text = await readFile(filePath, 'utf8');
    const runtime = await createSemanticRuntime({
      workspaceRoot: root,
      storeKey: 'template-rename-unresolved-candidates',
    });
    const answer = await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.TemplateRename,
      sourceFilePath: filePath,
      cursor: cursorInside(text, filePath, '${definiteItem.label}', 'label'),
      newName: 'caption',
      analysisDepth: 'binding-observation',
      diagnosticProjection: 'type-projection',
      includeAuthoringTemplates: true,
      appRetention: 'retain-app',
    });

    expect(answer.value.status).toBe('not-available');
    expect(answer.value.reason).toBe('unresolved-candidates');
    expect(answer.coverage).toBe('open');
    expect(answer.value.edits).toEqual([]);
    expect(answer.value.candidateRows).toHaveLength(2);
    expect(answer.value.candidateRows.map((row) => row.candidateReason))
      .toEqual(['target-open', 'target-open']);
    const expectedStarts = [
      tokenStart(text, '${unknownValue.label}', 'label', 1),
      tokenStart(text, '${unknownValue.label}', 'label', 2),
    ];
    expect(answer.value.candidateRows.map((row) => row.source?.start)).toEqual(expectedStarts);
    for (const row of answer.value.candidateRows) {
      expect(row.source?.path?.replace(/\\/gu, '/')).toBe('src/read-expressions.html');
      expect(row.source?.end).toBe((row.source?.start ?? 0) + 'label'.length);
    }
  }, 60_000);

  test('does not fall through natively when TypeScript has only unresolved Aurelia candidates', async () => {
    const root = path.join(pressureRoot, 'template-typechecking-corpus');
    const filePath = path.join(root, 'src/model.ts');
    const text = await readFile(filePath, 'utf8');
    const pairStart = text.indexOf('export interface CorpusPair');
    const labelStart = text.indexOf('label', pairStart);
    const runtime = await createSemanticRuntime({
      workspaceRoot: root,
      storeKey: 'typescript-rename-unresolved-candidates-only',
    });
    const answer = await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.TemplateRenameFromTypeScript,
      sourceFilePath: filePath,
      cursor: {
        filePath,
        offset: labelStart + 1,
        line: 0,
        character: 0,
      },
      newName: 'caption',
      analysisDepth: 'binding-observation',
      diagnosticProjection: 'type-projection',
      includeAuthoringTemplates: true,
      appRetention: 'retain-app',
    });

    expect(answer.value.status).toBe('not-available');
    expect(answer.value.reason).toBe('unresolved-candidates');
    expect(answer.value.templateReferenceCount).toBe(0);
    expect(answer.value.typeScriptReferenceCount).toBe(2);
    expect(answer.value.edits).toEqual([]);
    expect(answer.value.candidateRows).toHaveLength(2);
    expect(answer.value.candidateRows.every((row) => row.candidateReason === 'target-open')).toBe(true);
  }, 60_000);

  test('does not promote a closed same-spelling state member into a root-member candidate', async () => {
    const root = path.join(pressureRoot, 'template-overlay-state-binding-scope');
    const filePath = path.join(root, 'src/app.html');
    const text = await readFile(filePath, 'utf8');
    const runtime = await createSemanticRuntime({
      workspaceRoot: root,
      storeKey: 'template-rename-closed-collision',
    });
    const answer = await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.TemplateRename,
      sourceFilePath: filePath,
      cursor: cursorInside(text, filePath, '$parent.title', 'title'),
      newName: 'hostTitle',
      analysisDepth: 'binding-observation',
      diagnosticProjection: 'type-projection',
      includeAuthoringTemplates: true,
      appRetention: 'retain-app',
    });

    expect(answer.value.status).toBe('available');
    expect(answer.coverage).toBe('complete');
    expect(answer.value.candidateRows).toEqual([]);
    const stateOwnedStart = tokenStart(text, 'title & state', 'title');
    expect(answer.value.edits.some((edit) =>
      edit.source?.path?.replace(/\\/gu, '/') === 'src/app.html'
      && edit.source.start === stateOwnedStart
    )).toBe(false);
  }, 60_000);

  test('keeps equal bindable aliases partitioned by their resolved resource identity', async () => {
    const root = path.join(pressureRoot, 'aliased-bindable-surfaces');
    const filePath = path.join(root, 'src/app.html');
    const text = await readFile(filePath, 'utf8');
    const runtime = await createSemanticRuntime({
      workspaceRoot: root,
      storeKey: 'template-rename-bindable-alias-collision',
    });
    const answer = await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.TemplateRename,
      sourceFilePath: filePath,
      cursor: cursorInside(
        text,
        filePath,
        'display-label.bind="aliasLabel"',
        'display-label',
      ),
      newName: 'headline-label',
      analysisDepth: 'binding-observation',
      diagnosticProjection: 'type-projection',
      includeAuthoringTemplates: true,
      appRetention: 'retain-app',
    });

    expect(answer.value.status).toBe('available');
    expect(answer.coverage).toBe('complete');
    expect(answer.value.candidateRows).toEqual([]);
    expect(answer.value.edits).toHaveLength(2);
    expect(answer.value.edits.some((edit) =>
      edit.source?.path?.replace(/\\/gu, '/') === 'src/display-hint.ts'
    )).toBe(false);
  }, 60_000);
});

function cursorInside(
  text: string,
  filePath: string,
  marker: string,
  token: string,
) {
  const start = tokenStart(text, marker, token);
  const offset = start + 1;
  const before = text.slice(0, offset);
  const lines = before.split(/\r?\n/gu);
  return {
    filePath,
    offset,
    line: lines.length - 1,
    character: lines.at(-1)?.length ?? 0,
  };
}

function tokenStart(
  text: string,
  marker: string,
  token: string,
  markerOccurrence = 1,
): number {
  let markerStart = -1;
  for (let occurrence = 0; occurrence < markerOccurrence; occurrence += 1) {
    markerStart = text.indexOf(marker, markerStart + 1);
  }
  if (markerStart < 0) {
    throw new Error(`Missing marker '${marker}' occurrence ${markerOccurrence}.`);
  }
  const start = text.indexOf(token, markerStart);
  if (start < 0 || start >= markerStart + marker.length) {
    throw new Error(`Missing token '${token}' inside '${marker}'.`);
  }
  return start;
}
