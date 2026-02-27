#!/usr/bin/env node
/**
 * aurelia-inspect CLI
 *
 * Inspect npm packages to see what Aurelia resources the compiler extracts.
 *
 * Usage:
 *   npx aurelia-inspect ./path/to/package
 *   npx aurelia-inspect ./node_modules/aurelia2-table
 *   npx aurelia-inspect ../aurelia/packages/router
 *
 * Options:
 *   --json        Output full JSON (default)
 *   --summary     Output summary only (resource counts)
 *   --source      Prefer TypeScript source (default: true)
 *   --compiled    Prefer compiled JavaScript
 *   --help        Show this help message
 */

import { resolve } from 'node:path';
import { inspect } from '@aurelia-ls/compiler';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse flags
  const flags = {
    help: args.includes('--help') || args.includes('-h'),
    summary: args.includes('--summary'),
    compiled: args.includes('--compiled'),
  };

  // Get package path (first non-flag argument)
  const packagePath = args.find(arg => !arg.startsWith('--') && !arg.startsWith('-'));

  if (flags.help || !packagePath) {
    printUsage();
    process.exit(flags.help ? 0 : 1);
  }

  const resolvedPath = resolve(process.cwd(), packagePath);

  try {
    const result = await inspect(resolvedPath, {
      preferSource: !flags.compiled,
    });

    if (flags.summary) {
      printSummary(result);
    } else {
      // Full JSON output
      console.log(JSON.stringify(result, null, 2));
    }

    // Exit with error code if confidence is 'manual' (couldn't analyze)
    if (result.confidence === 'manual') {
      process.exit(2);
    }
  } catch (err) {
    console.error('Error analyzing package:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

function printUsage(): void {
  console.log(`
aurelia-inspect - Inspect npm packages for Aurelia resources

Usage:
  aurelia-inspect <package-path> [options]

Arguments:
  package-path    Path to the package directory (containing package.json)

Options:
  --json          Output full JSON (default)
  --summary       Output summary only (resource counts)
  --compiled      Prefer compiled JavaScript over TypeScript source
  --help, -h      Show this help message

Examples:
  aurelia-inspect ./node_modules/aurelia2-table
  aurelia-inspect ../aurelia2-plugins/packages/aurelia2-bootstrap --summary
  aurelia-inspect ./my-package --compiled

Exit codes:
  0  Success
  1  Error (invalid args, file not found, etc.)
  2  Package couldn't be analyzed (confidence: 'manual')
`);
}

interface InspectionResult {
  package: string;
  version: string;
  confidence: string;
  resources: Array<{
    kind: string;
    name: string;
    className: string;
    bindables: Array<{ name: string; mode?: string; primary?: boolean }>;
  }>;
  configurations: Array<{ exportName: string }>;
  gaps: Array<{ what: string; why: string; suggestion: string }>;
  meta: {
    primaryStrategy: string;
    analyzedPaths: string[];
  };
}

function printSummary(result: InspectionResult): void {
  console.log(`
Package: ${result.package}@${result.version}
Confidence: ${result.confidence}
Strategy: ${result.meta.primaryStrategy}

Resources: ${result.resources.length}
${result.resources.map(r => `  - ${r.name} (${r.kind}) [${r.className}]`).join('\n') || '  (none)'}

Bindables: ${result.resources.reduce((sum, r) => sum + r.bindables.length, 0)}
${result.resources
  .filter(r => r.bindables.length > 0)
  .map(r => `  ${r.name}: ${r.bindables.map(b => b.primary ? `${b.name}*` : b.name).join(', ')}`)
  .join('\n') || '  (none)'}

Configurations: ${result.configurations.length}
${result.configurations.map(c => `  - ${c.exportName}`).join('\n') || '  (none)'}

Gaps: ${result.gaps.length}
${result.gaps.map(g => `  - ${g.what}: ${g.why}`).join('\n') || '  (none)'}

Files analyzed: ${result.meta.analyzedPaths.length}
${result.meta.analyzedPaths.map(p => `  - ${p}`).join('\n') || '  (none)'}
`.trim());
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
