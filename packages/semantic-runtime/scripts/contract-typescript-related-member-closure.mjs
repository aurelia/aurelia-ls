import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';
import {
  readTypeSystemRelatedMemberFamily,
} from '../out/type-system/related-member-symbols.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/typescript-related-member-closure');
const templatePath = path.join(fixtureRoot, 'src/app.html');
const appPath = path.join(fixtureRoot, 'src/app.ts');
const templateText = fs.readFileSync(templatePath, 'utf8');
const appText = fs.readFileSync(appPath, 'utf8');
const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'contract:typescript-related-member-closure',
});

const cases = [
  { name: 'value', declarations: 3, usages: 7 },
  { name: 'inherited', declarations: 1, usages: 1 },
  { name: 'overridden', declarations: 2, usages: 1 },
  { name: 'readonlyValue', declarations: 2, usages: 1 },
  { name: 'accessorValue', declarations: 3, usages: 1 },
  { name: 'abstractValue', declarations: 3, usages: 1 },
  { name: 'parameterValue', declarations: 2, usages: 1 },
  { name: 'run', declarations: 2, usages: 4 },
  { name: 'execute', declarations: 2, usages: 1 },
  { name: 'overloaded', declarations: 4, usages: 1 },
  { name: 'perform', declarations: 3, usages: 1 },
];

for (const memberCase of cases) {
  await assertMemberFamily(memberCase);
}

const valueWithoutDeclarations = await referencesFor('value', false);
assert.equal(valueWithoutDeclarations.coverage, 'complete');
assert.equal(
  valueWithoutDeclarations.value.rows.filter((row) => row.referenceKind === 'declaration').length,
  0,
  'includeDeclaration=false must remove every related TypeScript declaration, not only the canonical target.',
);
assert.equal(
  valueWithoutDeclarations.value.rows.length,
  8,
  'Value references without declarations should retain seven TypeScript usages and the template occurrence.',
);

const valueRename = await renameFor('value', 'valueNext');
assert.deepEqual(
  valueRename.value.edits.filter((edit) => edit.newText === 'valueNext: value').map(sourceKey).sort(),
  [
    sourceKeyFor(appPath, tokenStart(appText, 'const contextualShorthand: PrimaryContract = {\n  value,', 'value')),
    sourceKeyFor(appPath, tokenStart(appText, 'const { value } = input;', 'value')),
  ].sort(),
  'TypeScript-owned shorthand/destructuring rewrites must preserve the local binding while renaming property intent.',
);
const structuralDeclaration = tokenStart(appText, "class StructuralContract {\n  value = '';", 'value');
const structuralUse = tokenStart(appText, 'structural.value;', 'value');
assert.ok(
  valueRename.value.edits.every((edit) => {
    const key = sourceKey(edit);
    return key !== sourceKeyFor(appPath, structuralDeclaration)
      && key !== sourceKeyFor(appPath, structuralUse);
  }),
  'Structurally assignable but unrelated class members must not be folded into the nominal TypeScript rename family.',
);

const lengthReferences = await referencesFor('length', true);
assert.equal(lengthReferences.coverage, 'complete');
assert.deepEqual(
  countReferenceKinds(lengthReferences.value.rows),
  { declaration: 1, 'template-usage': 1, 'typescript-usage': 1 },
);
const lengthDeclaration = lengthReferences.value.rows.find((row) => row.referenceKind === 'declaration');
assert.ok(
  lengthDeclaration?.source?.path?.replace(/\\/g, '/').endsWith('/typescript/lib/lib.es5.d.ts'),
  'References should retain the standard-library declaration that proves Array.length ownership.',
);
const lengthPrepare = await renameFor('length', null);
const lengthRename = await renameFor('length', 'size');
for (const answer of [lengthPrepare, lengthRename]) {
  assert.equal(answer.result, 'answered');
  assert.equal(answer.coverage, 'complete');
  assert.equal(answer.value.status, 'not-available');
  assert.equal(answer.value.reason, 'typescript-rename-not-allowed');
  assert.deepEqual(answer.value.edits, []);
  assert.match(answer.value.displayText, /standard TypeScript library/i);
}

assertInferredShorthandClosure();

console.log(JSON.stringify({
  ok: true,
  memberFamilies: cases.length,
  appOwnedReferenceAndRenameSites: cases.reduce(
    (total, memberCase) => total + memberCase.declarations + memberCase.usages + 1,
    0,
  ),
  nativeMemberRefusal: 'Array.length',
  inferredShorthandClosure: true,
}, null, 2));

async function assertMemberFamily(memberCase) {
  const references = await referencesFor(memberCase.name, true);
  assert.equal(references.result, 'answered');
  assert.equal(references.selection, 'exact');
  assert.equal(references.coverage, 'complete');
  assert.deepEqual(
    countReferenceKinds(references.value.rows),
    {
      declaration: memberCase.declarations,
      'template-usage': 1,
      'typescript-usage': memberCase.usages,
    },
    `${memberCase.name} should preserve the complete TypeScript related-symbol family.`,
  );

  const prepare = await renameFor(memberCase.name, null);
  assert.equal(prepare.result, 'answered');
  assert.equal(prepare.selection, 'exact');
  assert.equal(prepare.coverage, 'complete');
  assert.equal(prepare.value.status, 'available');
  assert.equal(prepare.value.reason, null);

  const newName = `${memberCase.name}Next`;
  const rename = await renameFor(memberCase.name, newName);
  assert.equal(rename.result, 'answered');
  assert.equal(rename.selection, 'exact');
  assert.equal(rename.coverage, 'complete');
  assert.equal(rename.value.status, 'available');
  assert.equal(rename.value.reason, null);
  assert.equal(rename.value.edits.length, references.value.rows.length);
  assert.deepEqual(
    rename.value.edits.map(sourceKey).sort(),
    references.value.rows.map(sourceKey).sort(),
    `${memberCase.name} references and rename must project the same related-symbol closure.`,
  );
  for (const edit of rename.value.edits) {
    assert.equal(
      edit.oldText,
      authoredText(edit.source),
      `${memberCase.name} rename oldText must match the exact authored source span.`,
    );
    if (memberCase.name !== 'value' || edit.newText !== 'valueNext: value') {
      assert.equal(edit.newText, newName);
    }
  }
}

async function referencesFor(name, includeDeclaration) {
  return runtime.answerAppQuery({
    ...queryAt(name),
    kind: SemanticAppQueryKind.TemplateReferences,
    includeDeclaration,
    page: { size: 100 },
  });
}

async function renameFor(name, newName) {
  return runtime.answerAppQuery({
    ...queryAt(name),
    kind: SemanticAppQueryKind.TemplateRename,
    ...(newName == null ? {} : { newName }),
  });
}

function queryAt(name) {
  const offset = templateText.indexOf(name);
  assert.notEqual(offset, -1, `Expected ${name} in the related-member template.`);
  return {
    sourceFilePath: templatePath,
    cursor: { filePath: templatePath, offset: offset + 1 },
    detail: 'handles',
    analysisDepth: 'binding-observation',
    includeAuthoringTemplates: true,
    appRetention: 'retain-app',
  };
}

function countReferenceKinds(rows) {
  const counts = {};
  for (const row of rows) {
    counts[row.referenceKind] = (counts[row.referenceKind] ?? 0) + 1;
  }
  return counts;
}

function sourceKey(row) {
  const source = row.source;
  assert.ok(source?.path != null && source.start != null && source.end != null, 'Expected an exact source span.');
  return `${canonicalPath(absoluteSourcePath(source.path))}:${source.start}:${source.end}`;
}

function sourceKeyFor(fileName, start, length = 'value'.length) {
  return `${canonicalPath(path.resolve(fileName))}:${start}:${start + length}`;
}

function authoredText(source) {
  assert.ok(source?.path != null && source.start != null && source.end != null, 'Expected an exact source span.');
  return fs.readFileSync(absoluteSourcePath(source.path), 'utf8').slice(source.start, source.end);
}

function absoluteSourcePath(fileName) {
  return path.isAbsolute(fileName) ? fileName : path.resolve(fixtureRoot, fileName);
}

function canonicalPath(fileName) {
  return fileName.replace(/\\/g, '/').toLowerCase();
}

function tokenStart(source, carrier, token) {
  const carrierStart = source.indexOf(carrier);
  assert.notEqual(carrierStart, -1, `Expected carrier: ${carrier}`);
  const tokenOffset = carrier.indexOf(token);
  assert.notEqual(tokenOffset, -1, `Expected ${token} in carrier: ${carrier}`);
  return carrierStart + tokenOffset;
}

function assertInferredShorthandClosure() {
  const fileName = 'C:/virtual/inferred-shorthand.ts';
  const source = `
const local = '';
const inferred = { local };
inferred.local;
const orphanLocal = '';
const orphan = { orphanLocal };
void orphan;
`;
  const options = { strict: true, noLib: true, noEmit: true, target: ts.ScriptTarget.ESNext };
  const host = ts.createCompilerHost(options);
  host.fileExists = (candidate) => candidate === fileName;
  host.readFile = (candidate) => candidate === fileName ? source : undefined;
  host.getSourceFile = (candidate, languageVersion) => candidate === fileName
    ? ts.createSourceFile(candidate, source, languageVersion, true)
    : undefined;
  const program = ts.createProgram([fileName], options, host);
  const sourceFile = program.getSourceFile(fileName);
  assert.ok(sourceFile);

  const localShorthand = tokenStart(source, 'const inferred = { local };', 'local');
  const localFamily = readTypeSystemRelatedMemberFamily({
    program,
    sourceFile,
    start: localShorthand,
    end: localShorthand + 'local'.length,
    editableSourceFiles: [sourceFile],
    sourceFileRole: () => 'app-source',
  });
  assert.equal(localFamily.state, 'complete');
  assert.equal(localFamily.family?.rename.state, 'available');
  assert.deepEqual(
    localFamily.family?.rename.sites.map((site) => [site.start, site.prefixText, site.suffixText]),
    [
      [localShorthand, null, ': local'],
      [tokenStart(source, 'inferred.local;', 'local'), null, null],
    ],
  );

  const orphanShorthand = tokenStart(source, 'const orphan = { orphanLocal };', 'orphanLocal');
  const orphanFamily = readTypeSystemRelatedMemberFamily({
    program,
    sourceFile,
    start: orphanShorthand,
    end: orphanShorthand + 'orphanLocal'.length,
    editableSourceFiles: [sourceFile],
    sourceFileRole: () => 'app-source',
  });
  assert.equal(orphanFamily.state, 'complete', JSON.stringify(orphanFamily));
  assert.equal(orphanFamily.family?.rename.state, 'available');
  assert.deepEqual(
    orphanFamily.family?.rename.sites.map((site) => [site.start, site.prefixText, site.suffixText]),
    [[orphanShorthand, null, ': orphanLocal']],
  );
}
