import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { appDiagnosticPresentation, createSemanticRuntime, SemanticAppQueryKind } from '../src/index.js';
import { NodeSemanticRuntimeProjectInputHost, SemanticRuntimeProjectInputAuthority } from '../src/kernel/project-input.js';
import { MutableProjectSourceOverlay } from './support/incremental-conformance.js';

test('attaches each missing plugin command to its own capability and leaves unknown commands independent', async () => {
  const workspaceRoot = fileURLToPath(new URL('../fixtures/pressure/unregistered-plugin-syntax/', import.meta.url));
  const filePath = path.join(workspaceRoot, 'src/unregistered-plugin-syntax-app.html');
  const tokens = ['dispatch:main', 'dispatch:second', 'dispatch', 'dispatching:main'];
  const markup = tokens.map(token => `<button click.${token}="dispatch()"></button>`).join('\n');
  const overlay = new MutableProjectSourceOverlay();
  overlay.write(filePath, markup);
  const runtime = await createSemanticRuntime({
    workspaceRoot,
    projectInputAuthority: new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost(overlay)),
  });
  try {
    const result = await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.AppDiagnostics,
      sourceFile: { filePath },
      analysisDepth: 'binding-observation',
      page: { size: 100 },
    });
    const rows = result.value.rows;
    const groups = appDiagnosticPresentation(rows, true).groups;
    const commands = rows.filter(row => row.frameworkErrorCode === 'AUR0713');
    expect(commands).toHaveLength(tokens.length);
    expect(groups).toHaveLength(tokens.length);
    for (const token of tokens) {
      const command = commands.find(row => markup.slice(row.source!.start!, row.source!.end!) === token)!;
      expect(command).toBeDefined();
      const offset = markup.indexOf(`click.${token}="`);
      if (token === 'dispatching:main') {
        expect(groups.some(group => rows[group.primary.rowIndex] === command && group.related.length === 0)).toBe(true);
        continue;
      }
      const group = groups.find(candidate => rows[candidate.primary.rowIndex]!.source?.start === offset)!;
      const primary = rows[group.primary.rowIndex]!;
      expect(primary.diagnosticKind).toBe('framework-capability-not-registered');
      expect(primary.missingInput).toBe('state.binding-syntax');
      expect(command.diagnosticRelations).toEqual([{
        relationKind: 'derived-consequence',
        relatedDiagnosticIdentityHandle: primary.diagnosticIdentityHandle,
      }]);
      expect(group.related.map(related => rows[related.rowIndex])).toEqual([command]);
    }
  } finally {
    runtime.retireWorkspaceIncarnation();
  }
}, 90_000);
