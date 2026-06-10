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
const templateText = fs.readFileSync(templatePath, 'utf8');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'contract:template-completion-member-metadata',
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
