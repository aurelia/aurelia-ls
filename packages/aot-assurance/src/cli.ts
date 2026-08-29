import { proveLocalFalsifiers } from './falsifiers.js';
import type { EmissionFalsifier } from './contract.js';

interface CliOptions {
  adapterSpecifier?: string;
  receiptPath?: string;
  keepOutput: boolean;
  requireBundleClosure: boolean;
  falsifiersOnly: boolean;
  falsifier?: EmissionFalsifier;
}

const options = readOptions(process.argv.slice(2));

if (options.falsifiersOnly) {
  proveLocalFalsifiers();
  process.stdout.write('AOT assurance local falsifiers passed.\n');
} else {
  const adapterSpecifier = options.adapterSpecifier
    ?? process.env.AOT_ASSURANCE_ADAPTER
    ?? new URL('./aot-adapter.js', import.meta.url).href;
  const { runAssurance } = await import('./run.js');
  const receipt = await runAssurance({
    adapterSpecifier,
    receiptPath: options.receiptPath,
    keepOutput: options.keepOutput,
    requireBundleClosure: options.requireBundleClosure,
    falsifier: options.falsifier,
  });
  process.stdout.write([
    'AOT G0 assurance passed.',
    `JIT build: ${receipt.builds[0].durationMs.toFixed(1)}ms`,
    `AOT build: ${receipt.builds[1].durationMs.toFixed(1)}ms`,
    `AOT artifacts: ${receipt.aot.artifacts.length}`,
    `Rendered compiler/parser implementations: ${receipt.renderedCompilerParserImplementations.length}`,
    '',
  ].join('\n'));
}

function readOptions(args: readonly string[]): CliOptions {
  const options: CliOptions = {
    keepOutput: false,
    requireBundleClosure: false,
    falsifiersOnly: false,
  };
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === undefined) throw new Error(`Missing argument at index ${index}`);
    switch (argument) {
      case '--adapter':
        options.adapterSpecifier = requireValue(args, ++index, argument);
        break;
      case '--receipt':
        options.receiptPath = requireValue(args, ++index, argument);
        break;
      case '--keep-output':
        options.keepOutput = true;
        break;
      case '--require-bundle-closure':
        options.requireBundleClosure = true;
        break;
      case '--falsifiers-only':
        options.falsifiersOnly = true;
        break;
      case '--falsifier': {
        const value = requireValue(args, ++index, argument);
        if (value !== 'mutate-instruction' && value !== 'restore-needs-compile' && value !== 'drop-nested-definition') {
          throw new Error(`Unknown emission falsifier ${value}`);
        }
        options.falsifier = value;
        break;
      }
      default:
        throw new Error(`Unknown argument ${argument}`);
    }
  }
  return options;
}

function requireValue(args: readonly string[], index: number, option: string): string {
  const value = args[index];
  if (value === undefined || value.startsWith('--')) throw new Error(`${option} requires a value`);
  return value;
}
