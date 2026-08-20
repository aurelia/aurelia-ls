import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

import {
  createSemanticRuntime,
  NodeSemanticRuntimeProjectInputHost,
  SemanticAppQueryKind,
  SemanticRuntimeProjectInputAuthority,
  type SemanticTemplateCompletionResult,
} from '../src/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('template completion edit ranges', () => {
  test('inserts at an empty member frontier and replaces only a completed partial member', async () => {
    const fixtureRoot = path.resolve(packageRoot, '../../fixtures/hello-world');
    const templatePath = path.join(fixtureRoot, 'src/components/product-card.html');
    const originalTemplate = readFileSync(templatePath, 'utf8');
    const templateText = originalTemplate.replace(
      '  <p if.bind="item">${item.description}</p>',
      [
        '  <p if.bind="item">${item.description} ${item.}</p>',
        '  <p if.bind="item">${item.de}</p>',
        '  <p if.bind="item">${item.</p>',
        '  <p if.bind="item">${item.de</p>',
        '  <span>${lab</span>',
      ].join('\n'),
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'template-completion-edit-range',
      projectInputAuthority: new SemanticRuntimeProjectInputAuthority(
        new NodeSemanticRuntimeProjectInputHost({
          readFile(fileName) {
            return samePath(fileName, templatePath) ? templateText : undefined;
          },
          fileExists(fileName) {
            return samePath(fileName, templatePath) ? true : undefined;
          },
        }),
      ),
    });

    const completionAt = async (marker: string, cursorSuffix: string) => {
      const markerStart = templateText.indexOf(marker);
      if (markerStart < 0) throw new Error(`Expected marker ${marker}.`);
      const offset = markerStart + marker.lastIndexOf(cursorSuffix) + cursorSuffix.length;
      const lines = templateText.slice(0, offset).split(/\r?\n/u);
      const answer = await runtime.answerAppQuery({
        kind: SemanticAppQueryKind.TemplateCompletions,
        sourceFilePath: templatePath,
        cursor: {
          filePath: templatePath,
          line: lines.length - 1,
          character: lines.at(-1)?.length ?? 0,
          offset,
        },
        inquiryProfile: 'lsp-cursor',
        analysisDepth: 'binding-observation',
        includeAuthoringTemplates: true,
        appRetention: 'retain-app',
      });
      return { answer, value: answer.value as SemanticTemplateCompletionResult, offset };
    };

    const empty = await completionAt(
      '${item.description} ${item.}</p>',
      '${item.',
    );
    expect(empty.answer).toMatchObject({
      result: 'answered',
      selection: 'exact',
      coverage: 'complete',
    });
    expect(empty.value.siteKind).toBe('expression-member');
    expect(empty.value.missingInputs).toEqual([]);
    expect(empty.value.candidates.map((candidate) => candidate.name)).toEqual([
      'description',
      'name',
      'quantity',
      'sku',
      'tags',
      'tone',
    ]);
    for (const candidate of empty.value.candidates) {
      expect(candidate.edit.source).toMatchObject({
        path: 'src/components/product-card.html',
        start: empty.offset,
        end: empty.offset,
        role: 'completion-insertion',
      });
    }

    const partial = await completionAt('${item.de}</p>', '${item.de');
    expect(partial.answer).toMatchObject({
      result: 'answered',
      selection: 'exact',
      coverage: 'complete',
    });
    expect(partial.value.siteKind).toBe('expression-member');
    expect(partial.value.candidates.map((candidate) => candidate.name)).toEqual([
      'description',
      'name',
      'quantity',
      'sku',
      'tags',
      'tone',
    ]);
    for (const candidate of partial.value.candidates) {
      expect(candidate.edit.source).toMatchObject({
        path: 'src/components/product-card.html',
        start: partial.offset - 'de'.length,
        end: partial.offset,
        role: 'completion-replacement',
      });
      const source = candidate.edit.source;
      expect(source.start == null || source.end == null
        ? null
        : templateText.slice(source.start, source.end)).toBe('de');
    }

    const unterminatedEmpty = await completionAt('${item.</p>', '${item.');
    expect(unterminatedEmpty.value.siteKind).toBe('expression-member');
    expect(unterminatedEmpty.value.candidates.map((candidate) => candidate.name))
      .toEqual(empty.value.candidates.map((candidate) => candidate.name));
    for (const candidate of unterminatedEmpty.value.candidates) {
      expect(candidate.edit.source).toMatchObject({
        start: unterminatedEmpty.offset,
        end: unterminatedEmpty.offset,
        role: 'completion-insertion',
      });
    }

    const unterminatedPartial = await completionAt('${item.de</p>', '${item.de');
    expect(unterminatedPartial.value.siteKind).toBe('expression-member');
    expect(unterminatedPartial.value.candidates.map((candidate) => candidate.name))
      .toEqual(empty.value.candidates.map((candidate) => candidate.name));
    for (const candidate of unterminatedPartial.value.candidates) {
      const source = candidate.edit.source;
      expect(source).toMatchObject({
        start: unterminatedPartial.offset - 'de'.length,
        end: unterminatedPartial.offset,
        role: 'completion-replacement',
      });
      expect(source.start == null || source.end == null
        ? null
        : templateText.slice(source.start, source.end)).toBe('de');
    }

    const unterminatedRoot = await completionAt('${lab</span>', '${lab');
    expect(unterminatedRoot.value.siteKind).toBe('expression');
    const labelText = unterminatedRoot.value.candidates.find(
      (candidate) => candidate.name === 'labelText',
    );
    expect(labelText?.edit.source).toMatchObject({
      start: unterminatedRoot.offset - 'lab'.length,
      end: unterminatedRoot.offset,
      role: 'completion-replacement',
    });
    const labelSource = labelText?.edit.source;
    expect(labelSource?.start == null || labelSource.end == null
      ? null
      : templateText.slice(labelSource.start, labelSource.end)).toBe('lab');
  }, 120_000);
});

function samePath(left: string, right: string): boolean {
  return path.resolve(left).replace(/\\/gu, '/').toLowerCase()
    === path.resolve(right).replace(/\\/gu, '/').toLowerCase();
}
