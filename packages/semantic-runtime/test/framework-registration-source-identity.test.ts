import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from 'vitest';
import { createSemanticRuntime } from '../src/api/runtime.js';
import { SemanticRuntimeProjectInputAuthority, NodeSemanticRuntimeProjectInputHost } from '../src/kernel/project-input.js';
import { FrameworkRegistrationCapability } from '../src/registration/framework-registration-manifest.js';
import { aureliaFrameworkRegistrationAdmissionSource } from '../src/source-plan/aurelia-framework-registration-admission-source.js';
import { planFrameworkRegistrationSourceOperations } from '../src/source-plan/typescript-source-operation.js';
import { MutableProjectSourceOverlay } from './support/incremental-conformance.js';

test('registers the public framework value visible at each app call and preserves import trivia', async () => {
  const workspaceRoot = path.resolve(import.meta.dirname, '../fixtures/pressure/unregistered-shorthand-syntax');
  const file = path.join(workspaceRoot, 'src/main.ts');
  const text = fs.readFileSync(file, 'utf8')
    .replace('StandardConfiguration }', '/* stock */ StandardConfiguration /* keep */ }')
    .replace('new Aurelia()', "import { ShortHandBindingSyntax as shorthand } from 'aurelia';\nconst ShortHandBindingSyntax = [];\nnew Aurelia()")
    + '\nexport function nested(shorthand: string) {\n  const aureliaShortHandBindingSyntax = [];\n  return new Aurelia().app(UnregisteredShorthandSyntaxApp);\n}';
  const overlay = new MutableProjectSourceOverlay();
  overlay.write(file, text);
  const runtime = await createSemanticRuntime({
    workspaceRoot,
    projectInputAuthority: new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost(overlay)),
  });
  try {
    const project = (await runtime.openApp()).emission.typeSystem;
    const source = project.readProgramSourceFileByProjectPath('src/main.ts')!;
    const admission = aureliaFrameworkRegistrationAdmissionSource({
      capability: FrameworkRegistrationCapability.RuntimeHtmlShortHandBindingSyntax,
      preferredModuleName: '@aurelia/runtime-html',
    })!;
    const plan = (start: number, end: number) => {
      const edits = planFrameworkRegistrationSourceOperations(source, project, admission, start, end);
      expect(edits).not.toBeNull();
      let result = text;
      for (const edit of [...edits!].sort((a, b) => b.start - a.start)) {
        expect(text.slice(edit.start, edit.end)).toBe(edit.oldText);
        result = result.slice(0, edit.start) + edit.newText + result.slice(edit.end);
      }
      return result;
    };
    const top = plan(text.indexOf('new Aurelia()'), text.indexOf('.start()'));
    expect(top).toContain('.register(shorthand)');
    expect(top).not.toContain('ShortHandBindingSyntax as aurelia');
    const nested = plan(text.lastIndexOf('new Aurelia()'), text.length);
    expect(nested).toContain('ShortHandBindingSyntax as aureliaShortHandBindingSyntax2');
    expect(nested).toContain('.register(aureliaShortHandBindingSyntax2)');
    expect(nested).toContain('/* stock */ StandardConfiguration /* keep */');
  } finally {
    runtime.retireWorkspaceIncarnation();
  }
});
