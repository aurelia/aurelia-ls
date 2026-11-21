import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { createSemanticRuntime } from '../src/api/runtime.js';
import { NodeSemanticRuntimeProjectInputHost, SemanticRuntimeProjectInputAuthority } from '../src/kernel/project-input.js';

test('public DI issues distinguish request order, fresh alias factories, and authored declaration identity', async () => {
  const root = fileURLToPath(new URL('../fixtures/pressure/di-provider-activation/', import.meta.url));
  const main = path.join(root, 'src/main.ts');
  const source = `
import { DI, Registration, newInstanceOf as optional, resolve } from '@aurelia/kernel';
import { Aurelia } from '@aurelia/runtime-html';
class App {}
class Local {}
class Date {}
const Renamed = Date;
const native = globalThis.Date;
const Missing = DI.createInterface('Missing');
const Alias = DI.createInterface('Alias');
const Default = DI.createInterface('Default', builder => builder.transient(Local));
const DefaultAlias = DI.createInterface('DefaultAlias');
const parent = DI.createContainer();
const child = parent.createChild();
const sibling = parent.createChild();
parent.register(Registration.aliasTo(Missing, Alias), Registration.aliasTo(Default, DefaultAlias));
try { child.get(optional(Missing)); } catch {}
try { child.get(optional(Alias)); } catch {}
try { child.get(Alias); } catch {}
child.register(Registration.transient(Missing, Local));
child.get(optional(Alias));
try { sibling.get(optional(Alias)); } catch {}
child.get(DefaultAlias);
child.get(optional(DefaultAlias));
const off = false;
parent.getResolver('absent', off);
try { parent.getResolver('absent', true); } catch {}
parent.invoke(Date);
parent.getFactory(Renamed);
try { parent.get(Renamed); } catch {}
try { parent.invoke(native); } catch {}
try { parent.getFactory(globalThis.Date); } catch {}
try { parent.get(native); } catch {}
class Owner { constructor() { class Nested { static x = resolve(Local); } } }
parent.invoke(Owner);
{ const resolve = (_key: typeof Local) => 0; resolve(Local); }
try { resolve(Local); } catch {}
new Aurelia(parent).app({ component: App, host: document.body });
`.trim();
  const authority = new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost({
    readFile: name => path.resolve(name) === main ? source : undefined,
    fileExists: name => path.resolve(name) === main ? true : undefined,
  }));
  const runtime = await createSemanticRuntime({ workspaceRoot: root, storeKey: 'di-diagnostic-resolution', projectInputAuthority: authority });
  const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
  const issues = app.diIssues({ size: 100 });
  expect(issues.page.exhausted).toBe(true);
  const observed = issues.value.rows.filter(row => row.source?.path === 'src/main.ts').map(row => {
    const start = row.source!.start!;
    return [start, source.slice(start, row.source!.end!), row.frameworkErrorCode, row.containerApiCall?.keyWrapperKind ?? null];
  });
  const expected = [
    ['child.get(optional(Missing))', 'AUR0017', 'newInstanceOf'],
    ['child.get(optional(Alias))', 'AUR0012', 'newInstanceOf'],
    ['child.get(Alias)', 'AUR0012', null],
    ['sibling.get(optional(Alias))', 'AUR0012', 'newInstanceOf'],
    ["parent.getResolver('absent', true)", 'AUR0009', null],
    ['parent.get(Renamed)', 'AUR0010', null],
    ['parent.invoke(native)', 'AUR0015', null],
    ['parent.getFactory(globalThis.Date)', 'AUR0015', null],
    ['parent.get(native)', 'AUR0010', null],
    ['resolve(Local)', 'AUR0016', null],
  ] as const;
  expect(observed).toHaveLength(expected.length);
  for (const [call, code, wrapper] of expected) {
    const offset = call === 'resolve(Local)' ? source.lastIndexOf(call) : source.indexOf(call);
    expect(observed).toContainEqual([offset, call, code, wrapper]);
  }
});
