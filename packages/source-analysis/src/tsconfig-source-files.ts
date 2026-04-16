import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import * as ts from 'typescript';

import type {
  LoadedTsconfigSnapshot,
  RepoSession,
} from './repo-session.js';

const SOURCE_FILE_PATTERN = /\.(tsx?|mts|cts)$/i;

export interface ParsedTsconfigSourceFile {
  readonly absPath: string;
  readonly relPath: string;
  readonly sourceFile: ts.SourceFile;
}

export interface ParsedTsconfigSourceFileBatch {
  readonly snapshot: LoadedTsconfigSnapshot;
  readonly sourceFiles: readonly ParsedTsconfigSourceFile[];
}

export interface ParsedTsconfigSourceFileScanResult {
  readonly batches: readonly ParsedTsconfigSourceFileBatch[];
  readonly warnings: readonly string[];
}

export function scanParsedTsconfigSourceFiles(
  session: RepoSession,
): ParsedTsconfigSourceFileScanResult {
  const warnings: string[] = [];
  const batches: ParsedTsconfigSourceFileBatch[] = [];
  const sourceFileCache = new Map<string, ts.SourceFile | null>();
  const tsconfigAbsPaths = session.findTsconfigs();

  for (const tsconfigAbs of tsconfigAbsPaths) {
    const loaded = session.tryLoadTsconfig(tsconfigAbs);
    if (!loaded.snapshot) {
      warnings.push(`Warning: failed to read ${tsconfigAbs}: ${loaded.error ?? 'unknown error'}`);
      continue;
    }

    const sourceFiles: ParsedTsconfigSourceFile[] = [];
    const seen = new Set<string>();

    for (const fileName of loaded.snapshot.parsed.fileNames) {
      const absPath = resolve(fileName);
      const relPath = session.toRepoRelative(absPath);
      if (!shouldIncludeRepoSourceFile(session, relPath)) {
        continue;
      }
      if (seen.has(relPath)) {
        continue;
      }

      const sourceFile = getParsedSourceFile(sourceFileCache, absPath);
      if (!sourceFile) {
        warnings.push(`Warning: failed to read ${absPath}`);
        continue;
      }

      seen.add(relPath);
      sourceFiles.push({
        absPath,
        relPath,
        sourceFile,
      });
    }

    if (sourceFiles.length === 0) {
      continue;
    }

    batches.push({
      snapshot: loaded.snapshot,
      sourceFiles,
    });
  }

  return {
    batches,
    warnings,
  };
}

function shouldIncludeRepoSourceFile(
  session: RepoSession,
  relPath: string,
): boolean {
  if (relPath.startsWith('..')) {
    return false;
  }
  if (!SOURCE_FILE_PATTERN.test(relPath) || relPath.endsWith('.d.ts')) {
    return false;
  }
  if (session.isInSubmodule(relPath) || session.isExcludedRepoRelativePath(relPath)) {
    return false;
  }
  return true;
}

function getParsedSourceFile(
  cache: Map<string, ts.SourceFile | null>,
  absPath: string,
): ts.SourceFile | null {
  const cached = cache.get(absPath);
  if (cached !== undefined) {
    return cached;
  }

  let sourceFile: ts.SourceFile | null = null;
  try {
    sourceFile = ts.createSourceFile(
      absPath,
      readFileSync(absPath, 'utf-8'),
      ts.ScriptTarget.Latest,
      true,
      scriptKindForPath(absPath),
    );
  } catch {
    sourceFile = null;
  }

  cache.set(absPath, sourceFile);
  return sourceFile;
}

function scriptKindForPath(pathValue: string): ts.ScriptKind {
  const normalized = pathValue.toLowerCase();
  if (normalized.endsWith('.tsx')) return ts.ScriptKind.TSX;
  return ts.ScriptKind.TS;
}
