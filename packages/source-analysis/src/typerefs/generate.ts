#!/usr/bin/env node

import { generateTypeRefsAnalysis } from './analyze.js';
import { createSourceAnalysisSession, parseExcludedRepoRelativePrefixes } from '../session.js';

function main(): void {
  const repoPath = process.argv[2] || process.cwd();
  const target = process.argv[3] || '';
  const excludedRepoRelativePrefixes = parseExcludedRepoRelativePrefixes(process.argv[4], target);
  const session = createSourceAnalysisSession({
    repoPath,
    target,
    excludedRepoRelativePrefixes,
  });
  const result = generateTypeRefsAnalysis(session);

  if (result.warnings.length > 0) {
    process.stderr.write(`${result.warnings.join('\n')}\n`);
  }
  if (result.reportLines.length > 0) {
    process.stderr.write(`${result.reportLines.join('\n')}`);
  }
  process.stdout.write(JSON.stringify(result.output, null, 2) + '\n');
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
