import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

export function fixtureChildRoots(rootDir, includeName = () => true) {
  return readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => {
      const childRoot = path.join(rootDir, entry.name);
      return entry.isDirectory() && includeName(entry.name) && fixtureRootHasFiles(childRoot);
    })
    .map((entry) => path.join(rootDir, entry.name))
    .sort((left, right) => path.basename(left).localeCompare(path.basename(right)));
}

export function fixtureRootHasFiles(rootDir) {
  const pending = [rootDir];
  while (pending.length > 0) {
    const currentDir = pending.pop();
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      if (entry.isFile()) {
        return true;
      }
      if (entry.isDirectory()) {
        pending.push(path.join(currentDir, entry.name));
      }
    }
  }
  return false;
}

export function parsePressureRootCliOptions(args, config) {
  const fixtureNames = [];
  const rootEntries = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--fixture' || arg === '--fixtures') {
      fixtureNames.push(...splitCliList(requireCliValue(args, index, arg)));
      index += 1;
      continue;
    }
    if (arg === '--root' || arg === '--roots' || arg === '--pressureRoot' || arg === '--pressureRoots') {
      rootEntries.push(...splitCliList(requireCliValue(args, index, arg)));
      index += 1;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log([
        `Usage: ${config.usageName} -- [--fixture <name>] [--root <path>]`,
        config.fixtureHelp,
        'Use --root for a custom fixture root or fixture collection root.',
      ].join('\n'));
      process.exit(0);
    }
    throw new Error(`Unsupported ${config.label} argument '${arg}'. Use --fixture <name> or --root <path>.`);
  }
  return {
    fixtureNames: [...new Set(fixtureNames)].sort((left, right) => left.localeCompare(right)),
    rootEntries: [...new Set(rootEntries)].sort((left, right) => left.localeCompare(right)),
  };
}

export function pressureRootsForOptions(options, config) {
  const cliRoots = [
    ...options.rootEntries.flatMap((entry) => fixtureCollectionRootsFor(resolvePressureRootEntry(entry, config), config)),
    ...options.fixtureNames.flatMap((name) => fixtureRootsForName(name, config)),
  ];
  if (cliRoots.length > 0) {
    return uniqueSortedPaths(cliRoots);
  }

  const raw = config.envRootNames
    .map((name) => process.env[name])
    .find((value) => value != null && value.trim().length > 0);
  if (raw == null) {
    return uniqueSortedPaths(config.defaultRoots);
  }
  return uniqueSortedPaths(raw
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .flatMap((entry) => fixtureCollectionRootsFor(resolvePressureRootEntry(entry, config), config)));
}

function requireCliValue(args, index, key) {
  const value = args[index + 1];
  if (value == null || value.startsWith('--')) {
    throw new Error(`Missing value for ${key}.`);
  }
  return value;
}

function splitCliList(value) {
  return value
    .split(/[;,]/u)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function resolvePressureRootEntry(entry, config) {
  return path.isAbsolute(entry) ? path.resolve(entry) : path.resolve(config.workspaceRoot, entry);
}

function fixtureRootsForName(name, config) {
  const candidates = fixtureRootCandidatesForName(name, config);
  const roots = candidates.filter((candidate) => existsSync(candidate) && fixtureRootHasFiles(candidate));
  if (roots.length === 0) {
    throw new Error(`No pressure fixture matched '${name}'. Use pressure:<name>, authoring:<name>, or --root <path>.`);
  }
  return roots;
}

function fixtureRootCandidatesForName(name, config) {
  if (name.startsWith('pressure:')) {
    return [path.join(config.pressureFixtureRoot, name.slice('pressure:'.length))];
  }
  if (name.startsWith('authoring:')) {
    return [path.join(config.authoringFixtureRoot, name.slice('authoring:'.length))];
  }
  return [
    path.join(config.pressureFixtureRoot, name),
    path.join(config.authoringFixtureRoot, name),
  ];
}

function fixtureCollectionRootsFor(root, config) {
  if (samePath(root, config.authoringFixtureRoot)) {
    return fixtureChildRoots(
      config.authoringFixtureRoot,
      config.includeAuthoringFixtureName,
    );
  }
  if (samePath(root, config.pressureFixtureRoot)) {
    return fixtureChildRoots(config.pressureFixtureRoot);
  }
  return [root];
}

function uniqueSortedPaths(paths) {
  return [...new Set(paths.map((entry) => path.resolve(entry)))]
    .sort((left, right) => left.localeCompare(right));
}

function samePath(left, right) {
  return path.resolve(left) === path.resolve(right);
}
