/**
 * Incremental Discovery
 *
 * Two levels of incrementality:
 * 1. Content hashing: skip re-extraction for files whose text is unchanged.
 * 2. Fact diffing: when content changed but extracted facts are structurally
 *    identical (e.g., method body edit), skip downstream stages entirely.
 *
 * Reports which files changed so callers can use the dependency graph
 * to scope downstream invalidation.
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
  /** Structural fingerprint of the semantically-meaningful parts of FileFacts. */
  readonly factsFingerprint: string;
}

export interface IncrementalDiscoveryStats {
  readonly cacheSize: number;
  readonly extracted: number;
  readonly reused: number;
  readonly removed: number;
}

/**
 * Result of an incremental discovery refresh.
 *
 * Includes the discovery result plus change metadata that callers can use
 * for dependency-graph-driven invalidation scoping.
 */
export interface IncrementalDiscoveryResult {
  /** The full discovery result (stages 1-10). */
  readonly discovery: ProjectSemanticsDiscoveryResult;
  /** Files whose content changed since last refresh. */
  readonly changedFiles: ReadonlySet<NormalizedPath>;
  /** Files that were removed since last refresh. */
  readonly removedFiles: ReadonlySet<NormalizedPath>;
  /** Files whose facts structurally changed (subset of changedFiles). */
  readonly factsChangedFiles: ReadonlySet<NormalizedPath>;
  /** True if any file had changed content (changedFiles or removedFiles non-empty). */
  readonly hasChanges: boolean;
  /** True if any file had structurally different facts (triggers downstream re-discovery). */
  readonly hasFactChanges: boolean;
}

export class IncrementalDiscovery {
  #cache = new Map<NormalizedPath, CachedFileFacts>();
  #cachedResult: ProjectSemanticsDiscoveryResult | null = null;

  /**
   * Run incremental project semantics discovery.
   *
   * On the first call, extracts all files and runs full discovery.
   * On subsequent calls:
   * - Only re-extracts files whose content has changed (content hash).
   * - If content changed but facts are structurally identical (fact fingerprint),
   *   the file is marked as content-changed but not fact-changed.
   * - If NO facts actually changed, returns the cached discovery result
   *   (skips all downstream stages 2-10).
   */
  refresh(
    program: ts.Program,
    config: ProjectSemanticsDiscoveryConfig,
    logger?: Logger,
  ): IncrementalDiscoveryResult {
    const { factsMap, changedFiles, removedFiles, factsChangedFiles } = this.#updateFactsCache(program, {
      fileSystem: config.fileSystem,
      templateExtensions: config.templateExtensions,
      styleExtensions: config.styleExtensions,
    });

    const hasChanges = changedFiles.size > 0 || removedFiles.size > 0;
    const hasFactChanges = factsChangedFiles.size > 0 || removedFiles.size > 0;

    // If facts haven't structurally changed and we have a cached result, reuse it.
    if (!hasFactChanges && this.#cachedResult !== null) {
      debug.project("incremental.skipDiscovery", {
        changedFiles: changedFiles.size,
        reason: "facts structurally unchanged",
      });
      return {
        discovery: this.#cachedResult,
        changedFiles,
        removedFiles,
        factsChangedFiles,
        hasChanges,
        hasFactChanges: false,
      };
    }

    // Facts changed — run stages 2-10.
    const discovery = discoverFromFacts(factsMap, program, config, logger);
    this.#cachedResult = discovery;

    return {
      discovery,
      changedFiles,
      removedFiles,
      factsChangedFiles,
      hasChanges,
      hasFactChanges,
    };
  }

  /** Number of cached file facts entries. */
  get cacheSize(): number {
    return this.#cache.size;
  }

  /** Clear the entire facts cache (e.g., after config change). */
  clear(): void {
    this.#cache.clear();
    this.#cachedResult = null;
  }

  #updateFactsCache(
    program: ts.Program,
    extractionOptions: ExtractionOptions,
  ): {
    factsMap: Map<NormalizedPath, FileFacts>;
    changedFiles: Set<NormalizedPath>;
    removedFiles: Set<NormalizedPath>;
    factsChangedFiles: Set<NormalizedPath>;
  } {
    const checker = program.getTypeChecker();
    const sourceFiles = program
      .getSourceFiles()
      .filter((sf) => !sf.isDeclarationFile);
    const currentPaths = new Set<NormalizedPath>();
    const changedFiles = new Set<NormalizedPath>();
    const factsChangedFiles = new Set<NormalizedPath>();

    let extracted = 0;
    let reused = 0;
    let factsReused = 0;

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
      const factsFingerprint = fingerprintFileFacts(facts);
      changedFiles.add(filePath);

      if (cached && cached.factsFingerprint === factsFingerprint) {
        // Content changed but facts are structurally identical (e.g., method body edit).
        // Update content hash but keep the same facts fingerprint.
        factsReused++;
      } else {
        // Facts actually changed — downstream stages need to re-run.
        factsChangedFiles.add(filePath);
      }

      this.#cache.set(filePath, { contentHash, facts, factsFingerprint });
      extracted++;
    }

    // Remove deleted files
    const removedFiles = new Set<NormalizedPath>();
    for (const path of this.#cache.keys()) {
      if (!currentPaths.has(path)) {
        this.#cache.delete(path);
        removedFiles.add(path);
      }
    }

    debug.project("incremental.factsCacheUpdate", {
      extracted,
      reused,
      factsReused,
      removed: removedFiles.size,
      factsChanged: factsChangedFiles.size,
      cacheSize: this.#cache.size,
    });

    // Build the full facts map from cache
    const factsMap = new Map<NormalizedPath, FileFacts>();
    for (const [path, cached] of this.#cache) {
      factsMap.set(path, cached.facts);
    }
    return { factsMap, changedFiles, removedFiles, factsChangedFiles };
  }
}

function fileContentHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * Produce a structural fingerprint of a FileFacts that ignores source positions.
 *
 * Two FileFacts are structurally equivalent when they produce the same fingerprint,
 * even if they came from different source text (e.g., method body edits, comment
 * changes, whitespace reformatting).
 *
 * The fingerprint captures all semantically-meaningful content: class names,
 * decorator applications WITH their arguments, static members, bindable members
 * WITH their configs, import/export structure, registration/define call arguments.
 * It excludes: TextSpan, SourceSpan, and any other source-position information.
 */
function fingerprintFileFacts(facts: FileFacts): string {
  const hash = createHash("sha256");

  // Classes: className, decorator applications (name + args), static members,
  // bindable members (name + args + type)
  for (const cls of facts.classes) {
    hash.update(`class:${cls.className ?? ''}`);
    if (cls.decorators) {
      for (const dec of cls.decorators) {
        hash.update(`dec:${dec.name}`);
        for (const arg of dec.args) {
          hashAnalyzableValue(hash, arg);
        }
      }
    }
    if (cls.staticMembers) {
      for (const [key, value] of cls.staticMembers) {
        hash.update(`static:${key}`);
        hashAnalyzableValue(hash, value);
      }
    }
    if (cls.bindableMembers) {
      for (const b of cls.bindableMembers) {
        hash.update(`bindable:${b.name}`);
        if (b.type) hash.update(`:type:${b.type}`);
        for (const arg of b.args) {
          hashAnalyzableValue(hash, arg);
        }
      }
    }
  }

  // Imports: module specifier + resolved path + binding names
  for (const imp of facts.imports) {
    hash.update(`import:${imp.kind}:${imp.moduleSpecifier}`);
    if ('resolvedPath' in imp && imp.resolvedPath) {
      hash.update(`:resolved:${imp.resolvedPath}`);
    }
    if (imp.kind === 'named' && 'bindings' in imp) {
      for (const b of imp.bindings) {
        hash.update(`:binding:${b.name}:${b.alias ?? ''}`);
      }
    }
    if (imp.kind === 'namespace' || imp.kind === 'default') {
      hash.update(`:alias:${imp.alias}`);
    }
  }

  // Exports: kind + names
  for (const exp of facts.exports) {
    hash.update(`export:${exp.kind}`);
    if (exp.kind === 'named') {
      for (const name of exp.names) hash.update(`:name:${name}`);
    }
    if (exp.kind === 'default' && exp.name) {
      hash.update(`:default:${exp.name}`);
    }
    if ((exp.kind === 'reexport-all' || exp.kind === 'reexport-named') && 'moduleSpecifier' in exp) {
      hash.update(`:spec:${exp.moduleSpecifier}`);
    }
  }

  // Variables: name + kind + exported
  for (const v of facts.variables) {
    hash.update(`var:${v.name}:${v.kind}:${v.isExported}`);
  }

  // Functions: name + exported
  for (const f of facts.functions) {
    hash.update(`fn:${f.name}:${f.isExported}`);
  }

  // Registration calls: receiver + arguments
  for (const reg of facts.registrationCalls) {
    hash.update(`reg:${reg.receiver}`);
    for (const arg of reg.arguments) {
      hashAnalyzableValue(hash, arg);
    }
  }

  // Define calls: resource type + definition + class ref
  for (const def of facts.defineCalls) {
    hash.update(`define:${def.resourceType}`);
    hashAnalyzableValue(hash, def.definition);
    hashAnalyzableValue(hash, def.classRef);
  }

  // Gaps: kind
  for (const gap of facts.gaps) {
    hash.update(`gap:${gap.why.kind}`);
  }

  return hash.digest("hex");
}

// ============================================================================
// AnalyzableValue hasher — position-stripping structural hash
// ============================================================================

type AnyValue = import("./evaluate/value/types.js").AnalyzableValue;

/**
 * Hash an AnalyzableValue tree into the running hash, stripping source
 * positions (TextSpan, SourceSpan) while capturing all semantic content.
 */
function hashAnalyzableValue(hash: ReturnType<typeof createHash>, value: AnyValue): void {
  hash.update(`(${value.kind}`);
  switch (value.kind) {
    case 'literal':
      hash.update(`:${typeof value.value}:${String(value.value ?? 'null')}`);
      break;
    case 'array':
      for (const el of value.elements) hashAnalyzableValue(hash, el);
      break;
    case 'object':
      for (const [k, v] of value.properties) {
        hash.update(`:k:${k}`);
        hashAnalyzableValue(hash, v);
      }
      break;
    case 'class':
      hash.update(`:${value.className}`);
      break;
    case 'function':
      hash.update(`:${value.name ?? ''}`);
      break;
    case 'reference':
      hash.update(`:${value.name}`);
      break;
    case 'import':
      hash.update(`:${value.specifier}:${value.exportName}`);
      break;
    case 'propertyAccess':
      hashAnalyzableValue(hash, value.base);
      hash.update(`:${value.property}`);
      break;
    case 'call':
      hashAnalyzableValue(hash, value.callee);
      for (const arg of value.args) hashAnalyzableValue(hash, arg);
      break;
    case 'spread':
      hashAnalyzableValue(hash, value.target);
      break;
    case 'new':
      hashAnalyzableValue(hash, value.callee);
      for (const arg of value.args) hashAnalyzableValue(hash, arg);
      break;
    case 'unknown':
      hash.update(`:${value.reason?.why?.kind ?? ''}`);
      break;
  }
  hash.update(')');
}
