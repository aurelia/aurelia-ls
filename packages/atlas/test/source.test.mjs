import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { createInMemoryApi } from '../dist/inquiry/runtime/api.js';
import { createSourceProject } from '../dist/source/project.js';
import { readTypeScriptEnumUsageIndex } from '../dist/source/enum-usage.js';
import { profileProductArchitectureAnalysis, readProductArchitectureAnalysis } from '../dist/inquiry/runtime/product-architecture-analysis.js';

test('source queries conserve text, module targets, and vocabulary identity across scopes', async (t) => {
  const parent = realpathSync(tmpdir());
  const repoRoot = mkdtempSync(path.join(parent, 'atlas-source-test-'));
  t.after(() => {
    assert.equal(path.dirname(realpathSync(repoRoot)), parent);
    rmSync(repoRoot, { recursive: true, force: true });
  });
  const pkg = 'packages/semantic-runtime';
  const files = {
    'a.ts': 'export const text = "𝄞";\r\n',
    'b.ts': 'export { demo } from "./demo.mjs";\nvoid import("./demo.mjs", {with:{type:"json"}});\nimport "public-lib/feature";',
    'demo.mts': 'export const demo = "mts";',
    'demo.ts': 'export const demo = "different file";',
    'invoke.ts': 'const obj = {run(){}, stop(){}}; const literal = "run"; obj[literal](); export function invoke(key:"run"|"stop") { obj[key](); }',
    'enum.ts': 'declare function next(): number;\nexport enum Flags { Mask = 1 << 2, Next, Unknown = next(), Negative = ~1 }\nexport const flag = Flags.Mask;\nexport function unrelated(Flags: {Mask:number}) { return Flags.Mask; }',
    'kernel/vocabulary/product-kinds.ts': 'declare function def(...args:string[]):{key:string}; export const KernelProductKinds = {Example:{Entry:def("Example","entry","product-kind","demo")}};',
    'kernel/vocabulary/binding-kinds.ts': 'export const KernelBindingKinds = {};',
    'kernel/vocabulary/open-seam-kinds.ts': 'export const KernelOpenSeamKinds = {};',
    'kernel/vocabulary/claim-predicates.ts': 'export const KernelClaimPredicates = {};',
    'kernel/vocabulary/instruction-kinds.ts': 'export const KernelInstructionKinds = {};',
    'kernel/vocabulary/index.ts': 'export { KernelProductKinds } from "./product-kinds.js";',
    'use.ts': 'import {KernelProductKinds as K} from "./kernel/vocabulary/index.js";\nvoid K.Example.Entry.key;\nfunction shadow(KernelProductKinds: any) { return KernelProductKinds.Example.Entry; }',
  };
  function write(relativePath, contents) {
    const full = path.join(repoRoot, relativePath);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, contents);
  }
  for (const [file, contents] of Object.entries(files)) write(`${pkg}/src/${file}`, contents);
  write(`${pkg}/tsconfig.json`, JSON.stringify({ compilerOptions: { module: 'nodenext', target: 'esnext' }, include: ['src'] }));
  write(`${pkg}/package.json`, JSON.stringify({ name: '@aurelia-ls/semantic-runtime', type: 'module' }));
  write('guide.md', 'old content');
  write('node_modules/public-lib/package.json', JSON.stringify({name:'public-lib', type:'module', exports:{'./feature':{types:'./types/feature.d.ts'}}}));
  write('node_modules/public-lib/types/feature.d.ts', 'export declare const feature: string;');
  const project = createSourceProject({ repoRoot, packages: [{
    id: 'semantic-runtime', packageName: '@aurelia-ls/semantic-runtime', rootPath: pkg, tsconfigPath: `${pkg}/tsconfig.json`,
  }] });
  t.after(() => project.dispose());
  const api = createInMemoryApi({ sourceProject: project });
  const fileLocus = name => ({ kind: 'source-file', filePath: `${pkg}/src/${name}` });
  const graph = await api.ask({ lens: 'ts.structure', projection: 'module-graph', locus: fileLocus('b.ts') });
  assert.deepEqual(graph.value.moduleGraph.edges.map(edge => [edge.kind, edge.resolvedFile?.repoPath]).sort(), [
    ['dynamic-import', `${pkg}/src/demo.mts`],
    ['export', `${pkg}/src/demo.mts`],
    ['import', 'node_modules/public-lib/types/feature.d.ts'],
  ].sort());
  for (const { handle, source } of graph.evidence) {
    const throughHandle = await api.ask({ lens: 'ts.source', projection: 'text', locus: { kind: 'handle', handle } });
    const direct = await api.ask({ lens: 'ts.source', projection: 'text', locus: { kind: 'source-range', range: source } });
    assert.equal(throughHandle.value.targetCount, 1);
    assert.equal(throughHandle.value.slices[0].text, direct.value.slices[0].text);
  }
  const observed = new Map();
  let request = { lens: 'ts.source', projection: 'text', locus: { kind: 'repo-area', areaId: 'semantic-runtime' }, budget: { rows: 2, textChars: 7 } };
  const cursors = new Set();
  while (request) {
    const answer = await api.ask(request);
    assert.equal(answer.outcome, 'hit', answer.summary);
    assert(answer.value.slices.length <= 2);
    assert(answer.value.slices.reduce((sum, slice) => sum + slice.text.length, 0) <= 7);
    for (const slice of answer.value.slices) {
      const file = slice.target.file.repoPath;
      const previous = observed.get(file) ?? '';
      assert.equal(previous.length, slice.textOffset);
      observed.set(file, previous + slice.text);
    }
    request = answer.continuations.find(c => c.kind === 'next-page')?.inquiry;
    assert(!cursors.has(answer.page.nextCursor), 'Repeated text cursor');
    cursors.add(answer.page.nextCursor);
  }
  assert.deepEqual(observed, new Map(Object.entries(files).map(([name, contents]) => [`${pkg}/src/${name}`, contents])));
  const usage = await api.ask({ lens: 'product.vocabulary', projection: 'usage', locus: fileLocus('use.ts') });
  assert.deepEqual(usage.value.usages.map(row => [row.accessPath, row.entryId]), [
    ['K.Example.Entry.key','KernelProductKinds.Example.Entry'],
  ]);
  const unrelated = await api.ask({ lens: 'product.vocabulary', projection: 'usage', locus: fileLocus('a.ts') });
  assert.equal(unrelated.outcome, 'miss');
  const fileRequest = {lens:'ts.source', projection:'text', locus:fileLocus('demo.mts')};
  const constrained = await api.ask({...fileRequest, subject:{scheme:'declaration',name:'demo'}});
  assert.deepEqual(constrained.value.targets.map(t => t.file.repoPath), [`${pkg}/src/demo.mts`]);
  for (const subject of [{scheme:'file',filePath:`${pkg}/src/demo.ts`}, {scheme:'invalid'}]) {
    assert.equal((await api.ask({...fileRequest,subject})).outcome, 'no-claim');
  }
  for (const cursor of ['0:garbage','0:9999','-5']) {
    assert.equal((await api.ask({...fileRequest, page:{cursor}})).outcome, 'unsupported');
  }
  const enums = readTypeScriptEnumUsageIndex(project, {packageId:'semantic-runtime'});
  const flags = enums.enumDeclarations.find(row => row.enumName === 'Flags');
  assert.deepEqual(Object.fromEntries(flags.members.map(m => [m.memberName,m.value])), {
    Mask:4, Next:5, Unknown:null, Negative:-2,
  });
  assert.deepEqual(enums.memberReferences.filter(r => r.memberName === 'Mask').map(r => r.span.startLine), [3]);
  const broad = { lens: 'ts.type', projection: 'rename', locus: {kind:'repo'}, subject: {scheme:'declaration', name:'demo'} };
  const ambiguous = await api.ask(broad);
  assert.equal(ambiguous.outcome, 'ambiguous');
  assert.equal(ambiguous.value.rename.canRename, false);
  const exact = await api.ask({...broad, subject:{...broad.subject, filePath:`${pkg}/src/demo.mts`}});
  assert.equal(exact.outcome, 'hit', exact.summary);
  const exportRequest = {lens:'ts.type',projection:'references',locus:{kind:'repo'}};
  const exported = {scheme:'export', filePath:`${pkg}/src/demo.mts`, exportName:'demo',packageId:'semantic-runtime'};
  assert.equal((await api.ask({...exportRequest,subject:exported})).outcome, 'hit');
  assert.equal((await api.ask({...exportRequest,subject:{...exported,packageName:'public-lib'}})).outcome, 'miss');
  const sample = await api.ask({ lens: 'ts.structure', projection: 'module-graph', locus: {kind:'repo'}, budget:{rows:1} });
  assert.equal(sample.value.moduleGraph.resolution.targets.length, 1);
  assert(sample.value.moduleGraph.resolution.omittedTargetCount >= Object.keys(files).length - 1);
  const calls = await api.ask({ lens: 'product.architecture', projection: 'call-sites', locus: fileLocus('invoke.ts') });
  const constant = calls.value.callSites.find(row => row.calleeText === 'obj[literal]');
  const dynamic = calls.value.callSites.find(row => row.calleeText === 'obj[key]');
  assert.equal(constant.calleeSymbolName, 'run');
  assert.equal(dynamic.resolved, false);
  const compact = readProductArchitectureAnalysis(project);
  const symbolsOnly = readProductArchitectureAnalysis(project, {includeCallSites:false, includeKernelRecords:false});
  assert.strictEqual(symbolsOnly.symbolReferences, compact.symbolReferences);
  assert.strictEqual(symbolsOnly.modules, compact.modules);
  assert.equal(symbolsOnly.callSites.length, 0);
  assert.equal(symbolsOnly.kernelRecordConstructions.length, 0);
  const exactOptions = {includeCallDetails:true, includeFunctionBodyAnalysis:true};
  const exactRows = readProductArchitectureAnalysis(project, exactOptions);
  assert.strictEqual(exactRows.symbolReferences, compact.symbolReferences);
  assert.strictEqual(exactRows.callDependencies, compact.callDependencies);
  assert.notStrictEqual(exactRows.callSites, compact.callSites);
  assert(exactRows.callSites.some(row => row.signature !== null));
  assert(compact.callSites.every(row => row.signature === null));
  assert.strictEqual(readProductArchitectureAnalysis(project, exactOptions), exactRows);
  const profile = profileProductArchitectureAnalysis(project, exactOptions);
  assert.notStrictEqual(profile.analysis.symbolReferences, exactRows.symbolReferences);
  assert.deepEqual(profile.analysis, exactRows);
  const badRange = await api.ask({
    lens: 'ts.source', projection: 'text', locus: {kind:'source-range', range:{
      filePath:`${pkg}/src/b.ts`, start:{line:0,character:40}, end:{line:1,character:8},
    }},
  });
  assert.equal(badRange.outcome, 'miss');
  const doc = {kind:'source-file',filePath:'guide.md'};
  const unchecked = await api.ask({lens:'ts.type',projection:'diagnostics',locus:doc});
  assert.equal(unchecked.outcome, 'no-claim');
  assert.equal(unchecked.value.diagnostics.checkedFileCount, 0);
  const read = async () => (await api.ask({lens:'ts.source',projection:'text',locus:doc})).value.slices[0].text;
  assert.equal(await read(), 'old content');
  write('guide.md', 'updated content');
  assert.equal(await read(), 'updated content');
});
