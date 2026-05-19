import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const require = createRequire(import.meta.url);

const contractSuites = [
  contract('observation', 'fast', [
    'observation',
    'observer-locator',
    'proxy-observation',
    'forms',
    'binding',
  ], 'contract-computed-observer-source.mjs', 'Plain getter, @computed, and ComputedObserver source projection.'),
  contract('observation', 'fast', [
    'observation',
    'observer-locator',
    'binding',
  ], 'contract-observer-locator-target-access.mjs', 'ObserverLocator target access, ComputedObserver targets, and node observer errors.'),
  contract('observation', 'fast', [
    'observation',
    'observer-locator',
    'configuration',
  ], 'contract-node-observer-service-customization.mjs', 'NodeObserverLocator service customization and accessor/observer split.'),
  contract('observation', 'fast', [
    'observation',
    'proxy-observation',
    'state',
  ], 'contract-proxy-observation.mjs', 'ProxyObservable watcher dependency rows, wrappers, @nowrap, and trackable calls.'),
  contract('observation', 'fast', [
    'observation',
    'watcher',
    'source-address',
  ], 'contract-runtime-watcher-expression-source.mjs', 'Property-key runtime watcher observed-dependency source spans.'),
  contract('observation', 'fast', [
    'observation',
    'effect',
    'source-address',
  ], 'contract-runtime-effect-observation.mjs', 'Source-level Observation.watch/run effects and observed-dependency rows.'),
  contract('observation', 'fast', [
    'observation',
    'proxy-observation',
    'source-address',
  ], 'contract-proxy-observable-escapes.mjs', 'Source-level ProxyObservable getRaw/unwrap escape rows.'),
  contract('observation', 'fast', [
    'observation',
    'binding',
    'forms',
    'value-channel',
  ], 'contract-select-checked-value-channels.mjs', 'Select, checked, radio, model, matcher, and form value-channel semantics.'),
  contract('observation', 'fast', [
    'observation',
    'binding',
    'type-system',
  ], 'contract-template-collection-observation.mjs', 'Template collection reads, callback locals, and dynamic keyed source routes.'),
  contract('observation', 'fast', [
    'observation',
    'computed',
    'binding',
  ], 'contract-trackable-method-observation.mjs', '@computed/@astTrack method calls in observed template expressions.'),
  contract('composition', 'fast', [
    'composition',
    'binding',
    'runtime-boundary',
    'template',
  ], 'contract-runtime-composition-bound-controller.mjs', 'AuCompose component/model values through parent-to-child bindable flow and static method this binding.'),
  contract('diagnostics', 'fast', [
    'diagnostics',
    'repair',
    'template',
    'type-system',
  ], 'contract-template-diagnostics.mjs', 'Weak owner diagnostics, repair targets, assignment pressure, and compact repair clusters.'),
  contract('expression', 'fast', [
    'expression',
    'type-system',
    'template',
  ], 'contract-expression-object-literal-shorthand.mjs', 'Expression object-literal shorthand semantics.'),
  contract('router', 'route', [
    'router',
    'binding',
    'runtime-boundary',
  ], 'contract-router-dynamic-pattern.mjs', 'Dynamic router href closure/open-boundary semantics.'),
  contract('authoring.forms', 'route', [
    'authoring',
    'fixtures',
    'forms',
    'observation',
  ], 'smoke-authoring-state-backed-form.mjs', 'Generated state-backed form semantic effects.'),
  contract('authoring.forms', 'route', [
    'authoring',
    'fixtures',
    'forms',
    'validation',
  ], 'smoke-authoring-validated-state-backed-form.mjs', 'Generated validated state-backed form semantic effects.'),
  contract('authoring.forms', 'route', [
    'authoring',
    'fixtures',
    'forms',
    'service',
  ], 'smoke-authoring-service-backed-form.mjs', 'Generated service-backed form semantic effects.'),
  contract('authoring.forms', 'route', [
    'authoring',
    'fixtures',
    'forms',
    'i18n',
  ], 'smoke-authoring-localized-state-backed-form.mjs', 'Generated localized state-backed form semantic effects.'),
  contract('authoring.forms', 'route', [
    'authoring',
    'fixtures',
    'forms',
    'router',
  ], 'smoke-authoring-routed-state-backed-form.mjs', 'Generated routed state-backed form semantic effects.'),
  contract('authoring.state', 'route', [
    'authoring',
    'fixtures',
    'state',
    'plugin',
  ], 'smoke-authoring-state-store-todo.mjs', 'Generated @aurelia/state todo semantic effects.'),
  contract('authoring.catalog', 'route', [
    'authoring',
    'fixtures',
    'state',
    'composition',
    'style',
  ], 'smoke-authoring-catalog-storefront.mjs', 'Generated catalog storefront semantic effects.'),
  contract('authoring.composition', 'route', [
    'authoring',
    'fixtures',
    'composition',
  ], 'smoke-authoring-composed-dashboard.mjs', 'Generated composed dashboard semantic effects.'),
  contract('authoring.repair', 'route', [
    'authoring',
    'repair',
    'diagnostics',
  ], 'smoke-authoring-repair-plan.mjs', 'Repair plan semantic effects over the mixed-form pressure fixture.'),
  contract('authoring.policy', 'route', [
    'authoring',
    'observation',
    'state',
    'fixtures',
  ], 'contract-one-hop-forwarding-accessor.mjs', 'Contrastive one-hop state forwarding accessor authoring pressure.'),
];

const args = parseArgs(process.argv.slice(2));

if (args.list) {
  printList();
  process.exit(0);
}

const selected = selectedContracts(args);
if (selected.length === 0) {
  console.error('No contract scripts matched the requested filters.');
  printUsage();
  process.exit(1);
}

console.log('semantic-runtime semantic contract suite');
console.log(`routes: ${args.routes.size === 0 ? 'all' : [...args.routes].join(',')}`);
console.log(`domains: ${args.domains.size === 0 ? 'all' : [...args.domains].join(',')}`);
console.log(`tiers: ${args.tiers.size === 0 ? 'all' : [...args.tiers].join(',')}`);
console.log(`scripts: ${selected.length}`);
for (const entry of selected) {
  console.log(`- ${entry.routeId}/${entry.tier}: ${entry.script} :: ${entry.summary}`);
}

if (!args.skipBuild) {
  await runCommand(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.json'], {
    verbose: args.verbose,
  });
}

const failures = [];
const started = performance.now();
for (const entry of selected) {
  const entryStarted = performance.now();
  const result = await runCommand(process.execPath, [path.join(packageRoot, 'scripts', entry.script)], {
    allowFailure: true,
    verbose: args.verbose,
  });
  const milliseconds = performance.now() - entryStarted;
  if (result.exitCode === 0) {
    console.log(`contract ok: ${entry.script} (${milliseconds.toFixed(1)}ms)`);
  } else {
    failures.push(`${entry.script} exited with ${result.exitCode}`);
    console.error(`contract failed: ${entry.script} (${milliseconds.toFixed(1)}ms)`);
    if (result.output.trim().length > 0) {
      console.error(result.output.trim());
    }
  }
}

const summary = {
  ok: failures.length === 0,
  scripts: selected.length,
  failures,
  elapsedMilliseconds: Math.round(performance.now() - started),
};
console.log(JSON.stringify(summary, null, 2));
if (failures.length > 0) {
  process.exitCode = 1;
}

function contract(routeId, tier, domains, script, summary) {
  return {
    routeId,
    tier,
    domains,
    script,
    summary,
  };
}

function parseArgs(rawArgs) {
  const parsed = {
    routes: new Set(),
    domains: new Set(),
    tiers: new Set(),
    list: false,
    skipBuild: false,
    verbose: false,
  };
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === '--list') {
      parsed.list = true;
      continue;
    }
    if (arg === '--skip-build') {
      parsed.skipBuild = true;
      continue;
    }
    if (arg === '--verbose') {
      parsed.verbose = true;
      continue;
    }
    if (arg === '--route' || arg === '--domain' || arg === '--tier') {
      const value = rawArgs[index + 1];
      if (value == null) {
        throw new Error(`${arg} requires a value.`);
      }
      addFilter(parsed, arg.slice(2), value);
      index += 1;
      continue;
    }
    const equalMatch = arg.match(/^--(route|domain|tier)=(.+)$/);
    if (equalMatch != null) {
      addFilter(parsed, equalMatch[1], equalMatch[2]);
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

function addFilter(parsed, kind, rawValue) {
  const values = rawValue
    .split(/[;,]/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const target = kind === 'route'
    ? parsed.routes
    : kind === 'domain'
      ? parsed.domains
      : parsed.tiers;
  for (const value of values) {
    target.add(value);
  }
}

function selectedContracts(filters) {
  return contractSuites.filter((entry) => {
    if (filters.routes.size > 0 && !filters.routes.has(entry.routeId)) {
      return false;
    }
    if (filters.domains.size > 0 && !entry.domains.some((domain) => filters.domains.has(domain))) {
      return false;
    }
    if (filters.tiers.size > 0 && !filters.tiers.has(entry.tier)) {
      return false;
    }
    return true;
  });
}

function printList() {
  console.log('semantic-runtime semantic contract suite');
  for (const entry of contractSuites) {
    console.log(`${entry.routeId}\t${entry.tier}\t${entry.domains.join(',')}\t${entry.script}\t${entry.summary}`);
  }
}

function printUsage() {
  console.error('Usage: pnpm contract:suite -- [--route observation] [--domain forms] [--tier fast] [--list] [--skip-build] [--verbose]');
}

function runCommand(command, commandArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: packageRoot,
      stdio: options.verbose === true ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    if (options.verbose !== true) {
      child.stdout?.on('data', (chunk) => {
        output = appendOutput(output, chunk);
      });
      child.stderr?.on('data', (chunk) => {
        output = appendOutput(output, chunk);
      });
    }
    child.on('error', reject);
    child.on('close', (exitCode) => {
      if (exitCode === 0 || options.allowFailure === true) {
        resolve({ exitCode, output });
      } else {
        reject(new Error(`${command} ${commandArgs.join(' ')} exited with ${exitCode}\n${output}`));
      }
    });
  });
}

function appendOutput(current, chunk) {
  const next = current + chunk.toString();
  return next.length > 20000 ? next.slice(next.length - 20000) : next;
}
