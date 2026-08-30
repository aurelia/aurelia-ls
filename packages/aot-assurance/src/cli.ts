import { format, parse } from 'node:path';

import type { AssuranceScenario, EmissionFalsifier } from './contract.js';
import { runAssurance } from './run.js';

interface CliOptions {
  adapterSpecifier?: string;
  receiptPath?: string;
  keepOutput: boolean;
  falsifier?: EmissionFalsifier;
  scenario: AssuranceScenario | 'all';
}

const options = readOptions(process.argv.slice(2));

const adapterSpecifier = options.adapterSpecifier
  ?? process.env.AOT_ASSURANCE_ADAPTER
  ?? new URL('./aot-adapter.js', import.meta.url).href;
const scenarios: readonly AssuranceScenario[] = options.scenario === 'all'
  ? ['g0', 'hello-world', 'routed-storefront', 'state-backed-form']
  : [options.scenario];
if (options.falsifier != null && scenarios.some((scenario) => scenario !== 'g0')) {
  throw new Error('Emission falsifiers are G0-only controls; select --scenario g0.');
}
for (const scenario of scenarios) {
  const receipt = await runAssurance({
    adapterSpecifier,
    scenario,
    receiptPath: scenarioReceiptPath(options.receiptPath, scenario, options.scenario === 'all'),
    keepOutput: options.keepOutput,
    falsifier: options.falsifier,
  });
  process.stdout.write([
    `AOT ${scenario} assurance passed.`,
    `JIT build: ${receipt.builds[0].durationMs.toFixed(1)}ms`,
    `AOT build: ${receipt.builds[1].durationMs.toFixed(1)}ms`,
    `AOT artifacts: ${receipt.aot.artifacts.length}`,
    '',
  ].join('\n'));
}

function readOptions(args: readonly string[]): CliOptions {
  const options: CliOptions = {
    keepOutput: false,
    scenario: 'g0',
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
      case '--scenario': {
        const value = requireValue(args, ++index, argument);
        if (
          value !== 'g0'
          && value !== 'hello-world'
          && value !== 'routed-storefront'
          && value !== 'state-backed-form'
          && value !== 'all'
        ) {
          throw new Error(`Unknown assurance scenario ${value}`);
        }
        options.scenario = value;
        break;
      }
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

function scenarioReceiptPath(
  receiptPath: string | undefined,
  scenario: AssuranceScenario,
  multiple: boolean,
): string | undefined {
  if (receiptPath == null || !multiple) return receiptPath;
  const parsed = parse(receiptPath);
  return format({
    dir: parsed.dir,
    name: `${parsed.name}.${scenario}`,
    ext: parsed.ext,
  });
}

function requireValue(args: readonly string[], index: number, option: string): string {
  const value = args[index];
  if (value === undefined || value.startsWith('--')) throw new Error(`${option} requires a value`);
  return value;
}
