import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const require = createRequire(import.meta.url);

const contractSuites = [
  contract('evaluation', 'fast', [
    'evaluation',
    'module-graph',
    'type-only-imports',
  ], 'contract-evaluation-module-graph.mjs', 'Runtime-shaped module graph erases type-only imports/re-exports while preserving value import/export edges.'),
  contract('evaluation', 'fast', [
    'evaluation',
    'mcp',
    'source-address',
  ], 'contract-evaluation-ambient-globals.mjs', 'Project-local ambient global declarations resolve as host boundaries while open-seam filters expose unresolved identifier source samples.'),
  contract('evaluation', 'fast', [
    'evaluation',
    'api',
    'mcp',
    'open-seams',
  ], 'contract-open-seam-interpretation.mjs', 'Controlled open-seam vocabulary keys carry public attempt and boundary interpretation.'),
  contract('evaluation', 'fast', [
    'evaluation',
    'api',
    'mcp',
    'open-seams',
    'source-address',
  ], 'contract-open-seam-sites.mjs', 'Repeated evaluator derivations collapse into unique authored open-seam sites with raw-row counts.'),
  contract('evaluation', 'fast', [
    'evaluation',
    'api',
    'open-seams',
    'reason-kinds',
  ], 'contract-evaluation-open-seam-reasons.mjs', 'Evaluator-produced open seams carry reason kinds for missing identifiers, unsupported loops, and compound assignments.'),
  contract('di', 'fast', [
    'di',
    'registration',
    'api',
    'open-seams',
    'reason-kinds',
  ], 'contract-di-registration-open-reasons.mjs', 'Open registration seams carry machine-readable reasons through registration and DI public rows.'),
  contract('evaluation', 'fast', [
    'evaluation',
    'source-role',
    'type-system',
    'diagnostics',
  ], 'contract-evaluation-tooling-script-source-role.mjs', 'Top-level tooling scripts stay visible to TypeScript diagnostics without entering app-world static evaluation.'),
  contract('evaluation', 'fast', [
    'evaluation',
    'loop',
    'mutation',
  ], 'contract-evaluation-classic-for-loop.mjs', 'Bounded classic for loops and simple compound/update assignments reduce through StaticEvaluator guardrails.'),
  contract('evaluation', 'fast', [
    'evaluation',
    'host-boundary',
    'vite',
  ], 'contract-evaluation-import-meta-boundary.mjs', 'import.meta.env reduces to host-environment boundaries while dependency-array spreads keep known entries imprecisely.'),
  contract('evaluation', 'fast', [
    'evaluation',
    'package-source',
    'resources',
    'open-seams',
  ], 'contract-external-package-source-admission.mjs', 'Source-shipped package entrypoints are admitted for app analysis while opaque package values remain reason-coded boundaries.'),
  contract('resources', 'fast', [
    'resources',
    'host-boundary',
    'vite',
    'open-seams',
  ], 'contract-resource-import-meta-dependencies.mjs', 'import.meta-dependent resource dependency spreads publish resource dependency reason kinds without evaluator syntax noise.'),
  contract('resources', 'fast', [
    'resources',
    'host-boundary',
    'bindables',
    'open-seams',
  ], 'contract-resource-bindable-boundary-config.mjs', 'Open bindable configuration spreads publish resource reason kinds while avoiding fabricated mode/setter certainty.'),
  contract('evaluation', 'fast', [
    'evaluation',
    'class',
    'module-order',
  ], 'contract-evaluation-class-declaration-order.mjs', 'Static class property evaluation runs when the class declaration executes, after prior module const bindings are initialized.'),
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
    'style',
    'value-channel',
  ], 'contract-class-style-value-channels.mjs', 'Class/style interpolation value channels, data flow, and observed template reads.'),
  contract('observation', 'fast', [
    'observation',
    'binding',
    'forms',
    'value-channel',
    'type-system',
  ], 'contract-keyed-form-source-bindings.mjs', 'Keyed checkbox/select source writeback through array and record expressions.'),
  contract('app-builder', 'fast', [
    'app-builder',
    'controls',
    'binding',
    'mcp',
  ], 'contract-control-use-inventory.mjs', 'Authored native control inventory rows are classified from runtime binding value-channel and data-flow products.'),
  contract('observation', 'fast', [
    'observation',
    'binding',
    'forms',
    'validation',
    'type-system',
  ], 'contract-dynamic-keyed-validation.mjs', 'Validate binding behavior over dynamic keyed form sources.'),
  contract('observation', 'fast', [
    'observation',
    'binding',
    'event',
    'application',
  ], 'contract-listener-method-reference.mjs', 'ListenerBinding method references, handler factories, and state call topology.'),
  contract('observation', 'fast', [
    'observation',
    'binding',
    'type-system',
  ], 'contract-template-collection-observation.mjs', 'Template collection reads, callback locals, and dynamic keyed source routes.'),
  contract('observation', 'fast', [
    'observation',
    'binding',
    'value-converter',
    'template',
  ], 'contract-binding-source-value-converters.mjs', 'Binding-source value reduction invokes evaluator-local value converter toView for static repeat locals.'),
  contract('observation', 'fast', [
    'observation',
    'binding',
    'callback',
    'template',
  ], 'contract-binding-source-arrow-callbacks.mjs', 'Binding-source value reduction evaluates Aurelia arrow callbacks with Scope.fromParent-shaped parameter scopes.'),
  contract('observation', 'fast', [
    'observation',
    'binding',
    'data-flow',
    'diagnostics',
    'type-system',
  ], 'contract-binding-data-flow-summary.mjs', 'Compact binding data-flow summary issue rollups.'),
  contract('observation', 'fast', [
    'observation',
    'binding',
    'authoring',
    'mcp',
  ], 'contract-binding-observed-dependency-summary.mjs', 'Compact binding observed-dependency summary and source-state rollups.'),
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
  contract('template', 'fast', [
    'template',
    'rendering',
    'controller',
    'recursive-rendering',
    'type-system',
  ], 'contract-recursive-rendering.mjs', 'Recursive custom-element rendering boundary, synthetic-view scope, bindable flow, and getter dependency provenance.'),
  contract('diagnostics', 'fast', [
    'diagnostics',
    'repair',
    'template',
    'type-system',
  ], 'contract-template-diagnostics.mjs', 'Weak owner diagnostics, repair targets, assignment pressure, and compact repair clusters.'),
  contract('diagnostics', 'fast', [
    'diagnostics',
    'type-system',
    'mcp',
  ], 'contract-typescript-diagnostics.mjs', 'Ordinary TypeScript Program diagnostics exposed through focused and unified app diagnostic queries.'),
  contract('dialog', 'fast', [
    'dialog',
    'configuration',
    'di',
    'open-seams',
  ], 'contract-dialog-classic-with-child.mjs', 'DialogConfigurationClassic.withChild closes child resolver diagnostics without generic DI registry-body seams.'),
  contract('dialog', 'fast', [
    'dialog',
    'diagnostics',
    'configuration',
    'di',
  ], 'contract-dialog-source-errors.mjs', 'Dialog source diagnostics claim only visible merged settings errors and child-key misses.'),
  contract('fetch-client', 'fast', [
    'fetch-client',
    'diagnostics',
    'configuration',
  ], 'contract-fetch-client-source-errors.mjs', 'Fetch-client source diagnostics cover closed invalid configure, header, and retry-interceptor shapes.'),
  contract('validation', 'fast', [
    'validation',
    'diagnostics',
    'configuration',
  ], 'contract-validation-source-errors.mjs', 'Validation source diagnostics claim only framework-backed rule and model-rule failures.'),
  contract('framework', 'fast', [
    'framework',
    'diagnostics',
    'configuration',
    'di',
  ], 'contract-source-service-api-demand.mjs', 'Source service API roots produce framework capability demands when their plugin service resolvers are not registered.'),
  contract('framework', 'fast', [
    'framework',
    'open-seams',
    'source-address',
  ], 'contract-service-root-candidate-rollup.mjs', 'Framework service-root candidates cap detailed seams while preserving an explicit source-backed rollup.'),
  contract('i18n', 'fast', [
    'i18n',
    'binding',
    'state',
    'type-system',
    'diagnostics',
  ], 'contract-i18n-binding-lifecycle.mjs', 'Translation key and t-params expressions follow their distinct framework binding-behavior lifecycles.'),
  contract('type-system', 'fast', [
    'type-system',
    'kernel',
    'query-claim',
    'lifetime',
  ], 'contract-type-projection-lifetime.mjs', 'TypeChecker projection sidecar indexes prune with kernel product-detail disposal.'),
  contract('type-system', 'fast', [
    'type-system',
    'checker',
    'atlas',
  ], 'contract-checker-value-access.mjs', 'Feature-side TypeChecker value access stays routed through TypeSystemProject/checker helpers or documented local contexts.'),
  contract('type-system', 'fast', [
    'type-system',
    'expression',
    'checker',
  ], 'contract-expression-primitive-literals.mjs', 'Primitive literal expressions preserve TypeScript literal types instead of widening to broad primitives.'),
  contract('type-system', 'fast', [
    'type-system',
    'expression',
    'checker',
    'template',
  ], 'contract-expression-synthetic-unions.mjs', 'Synthetic array/object expression unions preserve repeat-local member surfaces.'),
  contract('type-system', 'fast', [
    'type-system',
    'expression',
    'checker',
    'branch-scope',
  ], 'contract-expression-branch-narrowing.mjs', 'Expression-local conditional and short-circuit branches share checker-backed scope narrowing.'),
  contract('type-system', 'fast', [
    'type-system',
    'expression',
    'template',
    'binding',
  ], 'contract-expression-context-usage.mjs', 'Aurelia expression evaluation contexts stay behind documented fallback owners or runtime binding-source projection.'),
  contract('inquiry', 'fast', [
    'inquiry',
    'api',
    'mcp',
    'filters',
  ], 'contract-app-query-filter-preflight.mjs', 'Public app-query selectors that would otherwise be silently dropped return unsupported answers with accepted query-kind menus.'),
  contract('inquiry', 'fast', [
    'inquiry',
    'api',
    'mcp',
    'continuations',
    'app-builder',
    'diagnostics',
    'template',
    'router',
  ], 'contract-app-query-continuations.mjs', 'Public app-query answers expose typed, followable continuations while authoring remains intentionally deferred.', {
    routeAliases: ['app-builder'],
  }),
  contract('inquiry', 'fast', [
    'inquiry',
    'continuations',
    'kernel',
  ], 'contract-inquiry-continuations.mjs', 'Kernel inquiry continuations carry shared intent/evidence applicability.'),
  contract('inquiry', 'fast', [
    'inquiry',
    'query-claim',
    'api',
    'performance',
  ], 'contract-query-claim-graph.mjs', 'Query-claim graph laziness, retained-answer reuse, failure handling, budgets, and indexed disposal policy.'),
  contract('app-builder', 'fast', [
    'app-builder',
    'api',
    'mcp',
    'source-plan',
  ], 'contract-app-builder-query-surface.mjs', 'Public app-builder queries expose catalog discovery, part-source invocation, preview source text, origin payloads, and integrity checks.'),
  contract('kernel', 'fast', [
    'kernel',
    'source-address',
    'provenance',
    'continuations',
  ], 'contract-source-anchor-identity.mjs', 'Generated addresses anchored to identities resolve back to authored source anchors.'),
  contract('source-plan', 'fast', [
    'source-plan',
    'app-builder',
    'configuration',
  ], 'contract-source-plan-admission-origins.mjs', 'Framework configuration admissions preserve origin-bearing import and registration contributions through entrypoint source plans.', {
    routeAliases: ['app-builder'],
  }),
  contract('inquiry', 'fast', [
    'inquiry',
    'api',
    'source-address',
    'continuations',
  ], 'contract-source-reference-carriers.mjs', 'Public row DTO source-reference carrier keys cover nested SemanticSourceReference fields and shared source-precision classification.'),
  contract('diagnostics', 'fast', [
    'diagnostics',
    'type-system',
    'overlay',
    'template',
  ], 'contract-type-system-overlays.mjs', 'Program-owned TypeScript overlay roots and template-adjacent semantic source segments with hidden ordinary diagnostic eligibility.'),
  contract('template', 'fast', [
    'template',
    'completion',
    'state',
    'type-system',
  ], 'contract-template-completion-source-scope.mjs', 'Template completions spend runtime binding source scopes without leaking state-backed controller conditions into child scopes.'),
  contract('template', 'fast', [
    'template',
    'completion',
    'type-system',
  ], 'contract-template-completion-member-metadata.mjs', 'Template completion candidates expose checker member kind, visibility, readonly/optional flags, and Aurelia hook categories.'),
  contract('template', 'fast', [
    'template',
    'completion',
    'callback',
    'type-system',
  ], 'contract-contextual-call-argument-completion.mjs', 'Template completions spend contextual callback scopes for checker-backed calls and synthetic array methods.'),
  contract('template', 'fast', [
    'template',
    'compiler',
    'projection',
  ], 'contract-template-content-projection.mjs', 'Custom-element child content is lowered into HydrateElement projection instruction sequences instead of parent render rows.'),
  contract('template', 'fast', [
    'template',
    'controller',
    'type-system',
    'overlay',
  ], 'contract-template-controller-built-ins.mjs', 'Built-in template-controller flow rows and overlay scope replay for if/else, repeat, with, promise, switch, and portal.'),
  contract('expression', 'fast', [
    'expression',
    'type-system',
    'template',
  ], 'contract-expression-object-literal-shorthand.mjs', 'Expression object-literal shorthand semantics.'),
  contract('expression', 'fast', [
    'expression',
    'evaluation',
    'template',
  ], 'contract-expression-global-intrinsics.mjs', 'Aurelia parser-admitted globals and shared host intrinsic value reduction.'),
  contract('router', 'fast', [
    'router',
    'binding',
    'runtime-boundary',
  ], 'contract-router-dynamic-pattern.mjs', 'Dynamic router href closure/open-boundary semantics.'),
  contract('router', 'fast', [
    'router',
    'binding',
    'observation',
  ], 'contract-router-active-link-state.mjs', 'Router activeClass and load.active from-view state semantics.'),
  contract('app-pattern.policy', 'fast', [
    'app-pattern',
    'observation',
    'state',
    'fixtures',
  ], 'contract-one-hop-forwarding-accessor.mjs', 'Contrastive one-hop state forwarding accessor authoring pressure.'),
  contract('app-pattern.policy', 'fast', [
    'app-pattern',
    'observation',
    'state',
    'fixtures',
    'component',
  ], 'contract-component-object-boundary.mjs', 'Local typed object component input and direct domain binding authoring pressure.'),
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

function contract(routeId, tier, domains, script, summary, options = {}) {
  return {
    routeId,
    routeAliases: options.routeAliases ?? [],
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
    if (filters.routes.size > 0 && !contractRouteMatches(entry, filters.routes)) {
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

function routeMatches(routeId, routeFilters) {
  for (const routeFilter of routeFilters) {
    if (routeId === routeFilter || routeId.startsWith(`${routeFilter}.`)) {
      return true;
    }
  }
  return false;
}

function contractRouteMatches(entry, routeFilters) {
  if (routeMatches(entry.routeId, routeFilters)) {
    return true;
  }
  return entry.routeAliases.some((routeAlias) => routeMatches(routeAlias, routeFilters));
}

function printList() {
  console.log('semantic-runtime semantic contract suite');
  for (const entry of contractSuites) {
    const routeLabel = entry.routeAliases.length === 0
      ? entry.routeId
      : `${entry.routeId} aliases=${entry.routeAliases.join(',')}`;
    console.log(`${routeLabel}\t${entry.tier}\t${entry.domains.join(',')}\t${entry.script}\t${entry.summary}`);
  }
}

function printUsage() {
  console.error('Usage: pnpm contract:suite -- [--route observation|router|app-pattern.policy] [--domain forms] [--tier fast] [--list] [--skip-build] [--verbose]');
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
