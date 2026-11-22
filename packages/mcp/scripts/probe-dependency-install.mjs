import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const fixture = fileURLToPath(new URL('../../semantic-runtime/fixtures/pressure/app-pattern-minimal-app/', import.meta.url));

/** Query an app before and after dependency installation using the same separate tools-directory server. */
export async function probeDependencyInstall(client, typescriptVersion, installApplication) {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'au-mcp-dependency-install-'));
  try {
    await cp(path.join(fixture, 'src'), path.join(workspaceRoot, 'src'), { recursive: true });
    await cp(path.join(fixture, 'tsconfig.json'), path.join(workspaceRoot, 'tsconfig.json'));
    const manifest = JSON.parse(await readFile(path.join(fixture, 'package.json'), 'utf8'));
    manifest.dependencies.aurelia = '2.0.0-rc.2';
    manifest.devDependencies.typescript = typescriptVersion;
    await writeFile(path.join(workspaceRoot, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');

    const templatePath = 'src/app.html';
    const original = await readFile(path.join(workspaceRoot, templatePath), 'utf8');
    const template = original.replace('${message}', '${missingMessage}');
    assert.notEqual(template, original, 'fixture still binds the declared message');
    await writeFile(path.join(workspaceRoot, templatePath), template);
    const start = template.indexOf('missingMessage');

    async function query(queryKind, sourceFilePath) {
      const reply = await client.callTool({
        name: 'aurelia_app_query',
        arguments: { workspaceRoot, queryKind, sourceFilePath, page: { size: 50 } },
      });
      assert(!reply.isError, reply.content?.[0]?.text);
      const answer = reply.structuredContent?.value;
      assert.equal(answer?.result, 'answered', answer?.summary);
      return answer.value;
    }

    async function checkTemplate() {
      const diagnostics = await query('app-diagnostics', templatePath);
      assert(diagnostics.rows.some(row => row.diagnosticKind === 'missing-expression-member'
        && row.source?.path === templatePath && row.source.start === start && row.source.end === start + 'missingMessage'.length),
      'the source-local template member has an exact diagnostic independent of package installation');
    }

    const before = await query('typescript-diagnostics', 'src/app.ts');
    assert.equal(before.typeScript.versionRelation, 'workspace-not-found');
    assert.equal(before.typeScript.workspace, null);
    assert(before.rows.some(row => row.code === 2307 && row.message.includes("'aurelia'") && row.source?.path === 'src/app.ts'),
      'TypeScript reports the missing declared Aurelia package on its import');
    await checkTemplate();

    await installApplication(workspaceRoot);

    const after = await query('typescript-diagnostics', 'src/app.ts');
    assert.equal(after.typeScript.workspace?.version, typescriptVersion);
    assert.equal(after.typeScript.versionRelation, 'same-version-different-package');
    assert.deepEqual(after.rows, [], 'installing dependencies withdraws the missing-import diagnosis without a server restart');
    await checkTemplate();
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
}
