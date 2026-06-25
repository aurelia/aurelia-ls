import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-completion-member-metadata');
const templatePath = path.join(fixtureRoot, 'src/app.html');
const originalTemplateText = fs.readFileSync(templatePath, 'utf8');
const templateText = originalTemplateText.replace('${}', '${title}');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'contract:template-completion-member-metadata',
  sourceTextProvider: {
    readFile(fileName) {
      return samePath(fileName, templatePath) ? templateText : undefined;
    },
    fileExists(fileName) {
      return samePath(fileName, templatePath) ? true : undefined;
    },
  },
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const completion = app.ask({
  kind: SemanticAppQueryKind.TemplateCompletions,
  cursor: cursorAfter('${'),
  page: { size: 60 },
});
const thisMemberCompletion = app.ask({
  kind: SemanticAppQueryKind.TemplateCompletions,
  cursor: cursorAfter('${$this.'),
  page: { size: 60 },
});
const titleCursorInfo = app.ask({
  kind: SemanticAppQueryKind.TemplateCursorInfo,
  cursor: cursorInside('${title}', 'title', 1),
});

const byName = new Map(completion.value.candidates.map((candidate) => [candidate.name, candidate]));
const thisMemberByName = new Map(thisMemberCompletion.value.candidates.map((candidate) => [candidate.name, candidate]));

assertMember('title', {
  memberKind: 'property',
  memberVisibility: 'public',
  memberIsReadonly: false,
  aureliaHookKind: null,
});
assertMember('publicCount', {
  memberKind: 'property',
  memberVisibility: 'public',
  memberIsReadonly: true,
  aureliaHookKind: null,
});
assertMember('summary', {
  memberKind: 'accessor',
  memberVisibility: 'public',
  memberIsReadonly: false,
  aureliaHookKind: null,
});
assertMember('attached', {
  memberKind: 'method',
  memberVisibility: 'public',
  memberIsReadonly: false,
  aureliaHookKind: 'component-lifecycle',
});
assertMember('detached', {
  memberKind: 'method',
  memberVisibility: 'public',
  memberIsReadonly: false,
  aureliaHookKind: 'component-lifecycle',
});
assertMember('applyDarkTheme', {
  memberKind: 'method',
  memberVisibility: 'private',
  memberIsReadonly: false,
  aureliaHookKind: null,
});
assertMember('resetTheme', {
  memberKind: 'method',
  memberVisibility: 'protected',
  memberIsReadonly: false,
  aureliaHookKind: null,
});

assert.equal(thisMemberCompletion.value.siteKind, 'expression-member');
assert.deepEqual(thisMemberCompletion.value.missingInputs, []);
assertThisMember('title', {
  memberKind: 'property',
  memberVisibility: 'public',
  memberIsReadonly: false,
  aureliaHookKind: null,
});
assertThisMember('attached', {
  memberKind: 'method',
  memberVisibility: 'public',
  memberIsReadonly: false,
  aureliaHookKind: 'component-lifecycle',
});
assert.equal(titleCursorInfo.value.selectedMemberName, 'title');
assert.equal(titleCursorInfo.value.selectedMember?.memberKind, 'property');
assert.equal(titleCursorInfo.value.selectedMember?.typeDisplay, 'string');
assert.equal(titleCursorInfo.value.selectedMember?.source?.role, 'name');
assert.equal(
  titleCursorInfo.value.selectedMember?.source?.path?.replace(/\\/g, '/'),
  'src/app.ts',
);
assert.equal(typeof titleCursorInfo.value.selectedMember?.source?.start, 'number');
assert.equal(typeof titleCursorInfo.value.selectedMember?.source?.end, 'number');

console.log(JSON.stringify({
  ok: true,
  summary: {
    siteKind: completion.value.siteKind,
    thisMemberSiteKind: thisMemberCompletion.value.siteKind,
    sampledMembers: [
      'title',
      'publicCount',
      'summary',
      'attached',
      'detached',
      'applyDarkTheme',
      'resetTheme',
    ].map((name) => {
      const candidate = byName.get(name);
      return {
        name,
        memberKind: candidate?.memberKind ?? null,
        memberVisibility: candidate?.memberVisibility ?? null,
        memberIsReadonly: candidate?.memberIsReadonly ?? null,
        aureliaHookKind: candidate?.aureliaHookKind ?? null,
      };
    }),
    sampledThisMembers: [
      'title',
      'attached',
    ].map((name) => {
      const candidate = thisMemberByName.get(name);
      return {
        name,
        memberKind: candidate?.memberKind ?? null,
        memberVisibility: candidate?.memberVisibility ?? null,
        memberIsReadonly: candidate?.memberIsReadonly ?? null,
        aureliaHookKind: candidate?.aureliaHookKind ?? null,
      };
    }),
    cursorInfo: {
      selectedMemberName: titleCursorInfo.value.selectedMemberName,
      selectedMemberKind: titleCursorInfo.value.selectedMember?.memberKind ?? null,
      selectedMemberType: titleCursorInfo.value.selectedMember?.typeDisplay ?? null,
      selectedMemberSource: titleCursorInfo.value.selectedMember?.source ?? null,
    },
  },
}, null, 2));

function cursorAfter(marker) {
  const markerOffset = templateText.indexOf(marker);
  assert.notEqual(markerOffset, -1, `Expected marker: ${marker}`);
  const offset = markerOffset + marker.length;
  const before = templateText.slice(0, offset);
  const lines = before.split(/\r?\n/u);
  return {
    filePath: 'src/app.html',
    line: lines.length - 1,
    character: lines[lines.length - 1].length,
    offset,
  };
}

function cursorInside(marker, needle, delta = 0) {
  const markerOffset = templateText.indexOf(marker);
  assert.notEqual(markerOffset, -1, `Expected marker: ${marker}`);
  const needleOffset = templateText.indexOf(needle, markerOffset);
  assert.notEqual(needleOffset, -1, `Expected needle ${needle} in marker ${marker}.`);
  const offset = needleOffset + delta;
  const before = templateText.slice(0, offset);
  const lines = before.split(/\r?\n/u);
  return {
    filePath: 'src/app.html',
    line: lines.length - 1,
    character: lines[lines.length - 1].length,
    offset,
  };
}

function samePath(left, right) {
  return path.resolve(left).replace(/\\/g, '/').toLowerCase()
    === path.resolve(right).replace(/\\/g, '/').toLowerCase();
}

function assertMember(name, expected) {
  const candidate = byName.get(name);
  assert.ok(candidate, `Expected completion candidate ${name}.`);
  assertExpectedMember(candidate, name, expected);
}

function assertThisMember(name, expected) {
  const candidate = thisMemberByName.get(name);
  assert.ok(candidate, `Expected $this completion candidate ${name}.`);
  assertExpectedMember(candidate, `$this.${name}`, expected);
}

function assertExpectedMember(candidate, name, expected) {
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(
      candidate[key],
      value,
      `Expected ${name}.${key} to be ${value}, observed ${candidate[key] ?? 'null'}.`,
    );
  }
}
