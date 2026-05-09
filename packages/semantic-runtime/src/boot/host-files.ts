import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from 'node:fs';
import path from 'node:path';

export interface BootPackageManifest {
  readonly [key: string]: unknown;
  readonly name?: unknown;
  readonly workspaces?: unknown;
  readonly dependencies?: unknown;
  readonly peerDependencies?: unknown;
  readonly devDependencies?: unknown;
}

const packageManifestCache = new Map<string, BootPackageManifest | null>();

export function readPackageManifest(packageRoot: string): BootPackageManifest | null {
  const normalizedRoot = normalizePosixPath(path.resolve(packageRoot));
  const cached = packageManifestCache.get(normalizedRoot);
  if (cached !== undefined) {
    return cached;
  }
  const manifestPath = path.join(packageRoot, 'package.json');
  if (!existsSync(manifestPath)) {
    packageManifestCache.set(normalizedRoot, null);
    return null;
  }
  try {
    const parsed = JSON.parse(readFileSync(manifestPath, 'utf8')) as BootPackageManifest;
    packageManifestCache.set(normalizedRoot, parsed);
    return parsed;
  } catch {
    packageManifestCache.set(normalizedRoot, null);
    return null;
  }
}

export function readPackageName(packageRoot: string): string | null {
  const manifest = readPackageManifest(packageRoot);
  return typeof manifest?.name === 'string' && manifest.name.length > 0
    ? manifest.name
    : null;
}

export function hasPackageManifest(directory: string): boolean {
  return existsSync(path.join(directory, 'package.json'));
}

export function safeReadDirectory(directory: string): readonly string[] {
  try {
    return readdirSync(directory).sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
}

export function safeIsDirectory(directory: string): boolean {
  try {
    return statSync(directory).isDirectory();
  } catch {
    return false;
  }
}

export function normalizePosixPath(fileName: string): string {
  return path.normalize(fileName).replace(/\\/g, '/');
}
