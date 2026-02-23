/**
 * Incremental Discovery
 *
 * Caches per-file extraction results (FileFacts) and only re-extracts files
 * whose content has changed. All downstream stages (exports, evaluate,
 * recognize, assemble, register, scope, snapshot, templates) re-run from
 * scratch since they have cross-file dependencies.
 *
 * This eliminates the dominant cost of discovery — per-file AST walking —
 * for unchanged files, while preserving full correctness for cross-file
 * analysis stages.
 */

import { createHash } from "node:crypto";
import ts from "typescript";
import type { NormalizedPath } from "./compiler.js";
import type { FileFacts } from "./extract/file-facts.js";
import { extractFileFacts, type ExtractionOptions } from "./extract/file-facts-extractor.js";
import { discoverFromFacts, type ProjectSemanticsDiscoveryConfig, type ProjectSemanticsDiscoveryResult } from "./resolve.js";
import type { Logger } from "./types.js";
import { canonicalPath } from "./util/naming.js";
import { debug } from "./compiler.js";

interface CachedFileFacts {
  readonly contentHash: string;
  readonly facts: FileFacts;
}

export interface IncrementalDiscoveryStats {
  readonly cacheSize: number;
  readonly extracted: number;
  readonly reused: number;
  readonly removed: number;
}

export class IncrementalDiscovery {
  #cache = new Map<NormalizedPath, CachedFileFacts>();

  /**
   * Run incremental project semantics discovery.
   *
   * On the first call, extracts all files (equivalent to discoverProjectSemantics).
   * On subsequent calls, only re-extracts files whose content has changed.
   * All downstream stages always run from scratch.
   */
  refresh(
    program: ts.Program,
    config: ProjectSemanticsDiscoveryConfig,
    logger?: Logger,
  ): ProjectSemanticsDiscoveryResult {
    const rawFacts = this.#updateFactsCache(program, {
      fileSystem: config.fileSystem,
      templateExtensions: config.templateExtensions,
      styleExtensions: config.styleExtensions,
    });
    return discoverFromFacts(rawFacts, program, config, logger);
  }

  /** Number of cached file facts entries. */
  get cacheSize(): number {
    return this.#cache.size;
  }

  /** Clear the entire facts cache (e.g., after config change). */
  clear(): void {
    this.#cache.clear();
  }

  #updateFactsCache(
    program: ts.Program,
    extractionOptions: ExtractionOptions,
  ): Map<NormalizedPath, FileFacts> {
    const checker = program.getTypeChecker();
    const sourceFiles = program
      .getSourceFiles()
      .filter((sf) => !sf.isDeclarationFile);
    const currentPaths = new Set<NormalizedPath>();

    let extracted = 0;
    let reused = 0;

    for (const sf of sourceFiles) {
      const filePath = canonicalPath(sf.fileName);
      currentPaths.add(filePath);

      const contentHash = fileContentHash(sf.text);
      const cached = this.#cache.get(filePath);

      if (cached && cached.contentHash === contentHash) {
        reused++;
        continue;
      }

      // File changed or new — re-extract
      const facts = extractFileFacts(sf, checker, program, extractionOptions);
      this.#cache.set(filePath, { contentHash, facts });
      extracted++;
    }

    // Remove deleted files
    let removed = 0;
    for (const path of this.#cache.keys()) {
      if (!currentPaths.has(path)) {
        this.#cache.delete(path);
        removed++;
      }
    }

    debug.project("incremental.factsCacheUpdate", {
      extracted,
      reused,
      removed,
      cacheSize: this.#cache.size,
    });

    // Build the full facts map from cache
    const factsMap = new Map<NormalizedPath, FileFacts>();
    for (const [path, cached] of this.#cache) {
      factsMap.set(path, cached.facts);
    }
    return factsMap;
  }
}

function fileContentHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
