import assert from 'node:assert/strict';
import { describeAddress } from '../out/api/source-reference.js';
import {
  GeneratedAddress,
  SourceFileAddress,
  SourceSpanAddress,
} from '../out/kernel/address.js';
import {
  AureliaResourceIdentity,
  TypeScriptDeclarationIdentity,
} from '../out/kernel/identity.js';
import { sourceSpanAddressForAddress } from '../out/kernel/source-address.js';
import { KernelStore, KernelStoreBatch } from '../out/kernel/store.js';

const store = new KernelStore('contract-source-anchor-identity');
const sourceFileHandle = store.handles.address('example.ts');
const sourceSpanHandle = store.handles.address('example.ts:ExampleElement:name');
const declarationHandle = store.handles.identity('ExampleElement:declaration');
const resourceHandle = store.handles.identity('example-element:resource');
const generatedHandle = store.handles.address('generated:example-element:binding');

store.commit(new KernelStoreBatch([
  new SourceFileAddress(sourceFileHandle, 'contract', 'src/example.ts', 'typescript', 'app-source'),
  new SourceSpanAddress(sourceSpanHandle, sourceFileHandle, 10, 24, 'name'),
  new TypeScriptDeclarationIdentity(declarationHandle, 'src/example.ts', 'ExampleElement', 'ExampleElement', sourceSpanHandle),
  new AureliaResourceIdentity(resourceHandle, 'custom-element', 'example-element', declarationHandle),
  new GeneratedAddress(generatedHandle, 'binding', resourceHandle),
], 'identity-backed generated address'));

const generatedSource = describeAddress(store, generatedHandle);
assert.equal(generatedSource?.kind, 'generated-address');
assert.equal(generatedSource?.anchor?.kind, 'source-span-address');
assert.equal(generatedSource?.anchor?.path, 'src/example.ts');
assert.equal(generatedSource?.anchor?.start, 10);
assert.equal(generatedSource?.anchor?.end, 24);

const authoredSpan = sourceSpanAddressForAddress(store, generatedHandle);
assert.equal(authoredSpan?.handle, sourceSpanHandle);

console.log(JSON.stringify({
  ok: true,
  source: generatedSource,
}, null, 2));
