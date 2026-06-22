import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { aureliaPatternExamples } from '@aurelia-ls/patterns';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '@aurelia-ls/semantic-runtime';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const fixtureRoot = path.join(repoRoot, '.temp', 'mcp-pattern-semantic-diagnostics');

if (!fixtureRoot.startsWith(path.join(repoRoot, '.temp') + path.sep)) {
  throw new Error(`Refusing to clean unexpected fixture root: ${fixtureRoot}`);
}

await fs.rm(fixtureRoot, { recursive: true, force: true });
await fs.mkdir(fixtureRoot, { recursive: true });

const projects = [];

for (const pattern of aureliaPatternExamples) {
  const projectRoot = path.join(fixtureRoot, pattern.patternId);
  const sourceRoot = path.join(projectRoot, 'src');
  await fs.mkdir(sourceRoot, { recursive: true });

  for (const file of pattern.source.files) {
    const destination = safePatternDestination(sourceRoot, file.path, pattern.patternId);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, file.contents, 'utf8');
  }

  projects.push({
    projectKey: pattern.patternId,
    rootDir: projectRoot,
    sourceFiles: pattern.source.files.map((file) => ({
      path: `src/${file.path}`.replaceAll('\\', '/'),
    })),
  });
}

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  projects,
});
const failures = [];

for (const pattern of aureliaPatternExamples) {
  const answer = await runtime.answerAppQuery({
    projectKey: pattern.patternId,
    kind: SemanticAppQueryKind.AppDiagnostics,
    analysisDepth: 'binding-observation',
    diagnosticProjection: 'type-projection',
    page: { size: 50 },
    appRetention: 'dispose-app',
  });
  const rows = diagnosticRows(answer);
  if (rows.length > 0) {
    failures.push({
      patternId: pattern.patternId,
      diagnostics: rows.map(compactDiagnosticRow),
    });
  }
}

if (failures.length > 0) {
  process.stderr.write(`Pattern semantic diagnostics contract failed for ${failures.length} pattern(s).\n`);
  process.stderr.write(`${JSON.stringify(failures, null, 2)}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Pattern semantic diagnostics contract passed for ${aureliaPatternExamples.length} pattern(s).\n`);
}

function diagnosticRows(answer) {
  if (Array.isArray(answer?.value?.rows)) {
    return answer.value.rows;
  }
  if (Array.isArray(answer?.value?.value?.rows)) {
    return answer.value.value.rows;
  }
  return [];
}

function compactDiagnosticRow(row) {
  return {
    diagnosticKind: row.diagnosticKind ?? null,
    frameworkCode: row.frameworkCode ?? row.frameworkErrorCode ?? row.code ?? null,
    summary: row.summary ?? null,
    source: row.source?.label ?? row.source?.path ?? null,
  };
}

function safePatternDestination(sourceRoot, filePath, patternId) {
  const root = path.resolve(sourceRoot);
  const destination = path.resolve(root, filePath);
  if (!destination.startsWith(root + path.sep)) {
    throw new Error(`${patternId} source file path escapes the pattern fixture root: ${filePath}`);
  }
  return destination;
}
