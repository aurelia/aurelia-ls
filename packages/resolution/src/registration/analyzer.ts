import { toSourceFileId, type NormalizedPath, type SourceSpan } from "@aurelia-ls/compiler";
import type { SourceFacts, DependencyRef, ClassFacts, RegistrationCallFact, RegistrationArgFact } from "../extraction/types.js";
import type { ResourceCandidate } from "../inference/types.js";
import type {
  RegistrationAnalysis,
  RegistrationSite,
  RegistrationScope,
  ResourceRef,
  RegistrationEvidence,
  OrphanResource,
  UnresolvedRegistration,
  UnresolvedPattern,
} from "./types.js";

/**
 * Registration analyzer interface.
 *
 * Analyzes registration patterns to determine where resources are available.
 * Produces RegistrationAnalysis with sites[], orphans[], and unresolved[].
 */
export interface RegistrationAnalyzer {
  analyze(
    candidates: readonly ResourceCandidate[],
    facts: Map<NormalizedPath, SourceFacts>,
  ): RegistrationAnalysis;
}

/**
 * Create a registration analyzer.
 *
 * The analyzer expects facts to have DependencyRef.resolvedPath populated
 * (via resolveImports). If not populated, resource matching will fail.
 */
export function createRegistrationAnalyzer(): RegistrationAnalyzer {
  return {
    analyze(candidates, facts) {
      const context = new AnalysisContext(facts, candidates);
      return analyzeRegistrations(context);
    },
  };
}

/**
 * Analysis context with precomputed indexes.
 */
class AnalysisContext {
  /** Map from file path to namespace imports: alias → resolvedPath */
  private namespaceImports = new Map<NormalizedPath, Map<string, NormalizedPath>>();

  /** Map from file path to exported class names (including re-exports) */
  private exportedClasses = new Map<NormalizedPath, Set<string>>();

  /** Map from (source file, class name) to ResourceCandidate for fast lookup */
  private candidateIndex = new Map<string, ResourceCandidate>();

  constructor(
    public readonly facts: Map<NormalizedPath, SourceFacts>,
    public readonly candidates: readonly ResourceCandidate[],
  ) {
    this.buildIndexes();
  }

  private buildIndexes(): void {
    // Index namespace imports
    for (const [path, fileFacts] of this.facts) {
      const nsImports = new Map<string, NormalizedPath>();
      for (const imp of fileFacts.imports) {
        if (imp.kind === "namespace" && imp.resolvedPath) {
          nsImports.set(imp.alias, imp.resolvedPath);
        }
      }
      if (nsImports.size > 0) {
        this.namespaceImports.set(path, nsImports);
      }
    }

    // Index exported classes (resolve re-exports)
    for (const [path] of this.facts) {
      this.exportedClasses.set(path, this.collectExportedClasses(path, new Set()));
    }

    // Index candidates by (source, className)
    for (const candidate of this.candidates) {
      const key = `${candidate.source}::${candidate.className}`;
      this.candidateIndex.set(key, candidate);
    }
  }

  /**
   * Collect all class names exported from a file, resolving re-exports.
   */
  private collectExportedClasses(path: NormalizedPath, visited: Set<NormalizedPath>): Set<string> {
    if (visited.has(path)) return new Set();
    visited.add(path);

    const fileFacts = this.facts.get(path);
    if (!fileFacts) return new Set();

    const classes = new Set<string>();

    // Add directly exported classes
    for (const cls of fileFacts.classes) {
      classes.add(cls.name);
    }

    // Process export declarations
    for (const exp of fileFacts.exports) {
      if (exp.kind === "named") {
        for (const name of exp.names) {
          classes.add(name);
        }
      } else if (exp.kind === "reexport-all" && exp.resolvedPath) {
        const reexported = this.collectExportedClasses(exp.resolvedPath, visited);
        for (const name of reexported) {
          classes.add(name);
        }
      } else if (exp.kind === "reexport-named" && exp.resolvedPath) {
        for (const exported of exp.names) {
          classes.add(exported.alias ?? exported.name);
        }
      }
    }

    return classes;
  }

  /**
   * Get the resolved path for a namespace import alias.
   */
  getNamespaceImportPath(file: NormalizedPath, alias: string): NormalizedPath | null {
    return this.namespaceImports.get(file)?.get(alias) ?? null;
  }

  /**
   * Check if a class is exported from a file (directly or via re-export).
   */
  isClassExportedFrom(className: string, file: NormalizedPath): boolean {
    return (this.exportedClasses.get(file) ?? new Set()).has(className);
  }

  /**
   * Find a ResourceCandidate by source file and class name.
   */
  findCandidate(source: NormalizedPath, className: string): ResourceCandidate | undefined {
    const key = `${source}::${className}`;
    return this.candidateIndex.get(key);
  }

  /**
   * Find a ResourceCandidate by class name, searching all files.
   * Used when we have a DependencyRef with resolvedPath.
   */
  findCandidateByResolvedPath(resolvedPath: NormalizedPath, className: string): ResourceCandidate | undefined {
    return this.findCandidate(resolvedPath, className);
  }
}

/**
 * Main analysis function.
 */
function analyzeRegistrations(context: AnalysisContext): RegistrationAnalysis {
  const sites: RegistrationSite[] = [];
  const unresolved: UnresolvedRegistration[] = [];
  const registeredCandidates = new Set<ResourceCandidate>();

  // 1. Find all local registration sites (static dependencies, decorator deps, static $au deps)
  for (const [filePath, fileFacts] of context.facts) {
    for (const cls of fileFacts.classes) {
      const localSites = findLocalRegistrationSites(cls, filePath, context);
      for (const site of localSites) {
        sites.push(site);
        if (site.resourceRef.kind === "resolved") {
          registeredCandidates.add(site.resourceRef.resource);
        }
      }
    }
  }

  // 2. Find all global registration sites (Aurelia.register, container.register)
  for (const [filePath, fileFacts] of context.facts) {
    for (const call of fileFacts.registrationCalls) {
      const { globalSites, unresolvedPatterns } = findGlobalRegistrationSites(
        call,
        filePath,
        context,
      );
      for (const site of globalSites) {
        sites.push(site);
        if (site.resourceRef.kind === "resolved") {
          registeredCandidates.add(site.resourceRef.resource);
        }
      }
      unresolved.push(...unresolvedPatterns);
    }
  }

  // 3. Find orphans - candidates with no registration sites
  const orphans: OrphanResource[] = [];
  for (const candidate of context.candidates) {
    if (!registeredCandidates.has(candidate)) {
      orphans.push({
        resource: candidate,
        definitionSpan: {
          file: toSourceFileId(candidate.source),
          start: 0, // TODO: Get actual span from extraction
          end: 0,
        },
      });
    }
  }

  return { sites, orphans, unresolved };
}

/**
 * Find local registration sites from a class's dependencies.
 */
function findLocalRegistrationSites(
  cls: ClassFacts,
  filePath: NormalizedPath,
  context: AnalysisContext,
): RegistrationSite[] {
  const sites: RegistrationSite[] = [];
  const scope: RegistrationScope = { kind: "local", owner: filePath };

  // 1. static dependencies = [...]
  if (cls.staticDependencies) {
    for (const ref of cls.staticDependencies.references) {
      const site = createSiteFromDependencyRef(ref, scope, {
        kind: "static-dependencies",
        component: filePath,
        className: cls.name,
      }, filePath, context);
      sites.push(site);
    }
  }

  // 2. static $au = { dependencies: [...] }
  if (cls.staticAu?.dependencies) {
    for (const ref of cls.staticAu.dependencies) {
      const site = createSiteFromDependencyRef(ref, scope, {
        kind: "static-au-dependencies",
        component: filePath,
        className: cls.name,
      }, filePath, context);
      sites.push(site);
    }
  }

  // 3. @customElement({ dependencies: [...] }) or similar decorators
  for (const dec of cls.decorators) {
    if (dec.args?.kind === "object") {
      const depsProp = dec.args.properties["dependencies"];
      if (depsProp?.kind === "dependencyArray") {
        for (const ref of depsProp.refs) {
          const site = createSiteFromDependencyRef(ref, scope, {
            kind: "decorator-dependencies",
            component: filePath,
            className: cls.name,
          }, filePath, context);
          sites.push(site);
        }
      }
    }
  }

  return sites;
}

/**
 * Create a RegistrationSite from a DependencyRef.
 */
function createSiteFromDependencyRef(
  ref: DependencyRef,
  scope: RegistrationScope,
  evidence: RegistrationEvidence,
  filePath: NormalizedPath,
  context: AnalysisContext,
): RegistrationSite {
  const resourceRef = resolveResourceRef(ref, context);
  const span = refToSourceSpan(ref, filePath);

  return {
    resourceRef,
    scope,
    evidence,
    span,
  };
}

/**
 * Resolve a DependencyRef to a ResourceRef.
 */
function resolveResourceRef(ref: DependencyRef, context: AnalysisContext): ResourceRef {
  if (ref.kind === "identifier") {
    // If we have a resolved path, look up the candidate
    if (ref.resolvedPath) {
      const candidate = context.findCandidateByResolvedPath(ref.resolvedPath, ref.name);
      if (candidate) {
        return { kind: "resolved", resource: candidate };
      }
      return {
        kind: "unresolved",
        name: ref.name,
        reason: `Class '${ref.name}' at '${ref.resolvedPath}' is not a known resource`,
      };
    }
    // No resolved path - import resolution failed
    return {
      kind: "unresolved",
      name: ref.name,
      reason: `Could not resolve import for '${ref.name}'`,
    };
  }

  // kind === "import" - direct import reference
  return {
    kind: "unresolved",
    name: ref.moduleSpecifier,
    reason: `Direct import references not yet supported`,
  };
}

/**
 * Convert a DependencyRef to a SourceSpan.
 *
 * Uses toSourceFileId to properly convert NormalizedPath to SourceFileId.
 */
function refToSourceSpan(ref: DependencyRef, filePath: NormalizedPath): SourceSpan {
  const file = toSourceFileId(filePath);
  return {
    file,
    start: ref.span.start,
    end: ref.span.end,
  };
}

/**
 * Find global registration sites from a register() call.
 */
function findGlobalRegistrationSites(
  call: RegistrationCallFact,
  filePath: NormalizedPath,
  context: AnalysisContext,
): { globalSites: RegistrationSite[]; unresolvedPatterns: UnresolvedRegistration[] } {
  const globalSites: RegistrationSite[] = [];
  const unresolvedPatterns: UnresolvedRegistration[] = [];
  const scope: RegistrationScope = { kind: "global" };

  for (const arg of call.arguments) {
    const { sites, unresolved } = processRegistrationArg(arg, scope, filePath, call, context);
    globalSites.push(...sites);
    unresolvedPatterns.push(...unresolved);
  }

  return { globalSites, unresolvedPatterns };
}

/**
 * Process a registration argument recursively.
 */
function processRegistrationArg(
  arg: RegistrationArgFact,
  scope: RegistrationScope,
  filePath: NormalizedPath,
  call: RegistrationCallFact,
  context: AnalysisContext,
): { sites: RegistrationSite[]; unresolved: UnresolvedRegistration[] } {
  const sites: RegistrationSite[] = [];
  const unresolved: UnresolvedRegistration[] = [];

  // Convert arg span to SourceSpan with proper file ID
  const file = toSourceFileId(filePath);
  const argSpan: SourceSpan = {
    file,
    start: arg.span.start,
    end: arg.span.end,
  };

  if (arg.kind === "identifier") {
    // Direct identifier: Aurelia.register(MyElement)
    // We need to resolve this identifier to a candidate
    // First, look it up in the file's imports
    const fileFacts = context.facts.get(filePath);
    let resolvedPath: NormalizedPath | null = null;

    if (fileFacts) {
      for (const imp of fileFacts.imports) {
        if (imp.kind === "named" && imp.resolvedPath) {
          const found = imp.names.find(n => (n.alias ?? n.name) === arg.name);
          if (found) {
            resolvedPath = imp.resolvedPath;
            break;
          }
        } else if (imp.kind === "default" && imp.alias === arg.name && imp.resolvedPath) {
          resolvedPath = imp.resolvedPath;
          break;
        }
      }
    }

    const candidate = resolvedPath
      ? context.findCandidateByResolvedPath(resolvedPath, arg.name)
      : undefined;

    const resourceRef: ResourceRef = candidate
      ? { kind: "resolved", resource: candidate }
      : { kind: "unresolved", name: arg.name, reason: "Could not resolve to a known resource" };

    const evidence: RegistrationEvidence = {
      kind: call.receiver === "Aurelia" ? "aurelia-register" : "container-register",
      file: filePath,
    };

    sites.push({
      resourceRef,
      scope,
      evidence,
      span: argSpan,
    });
  } else if (arg.kind === "arrayLiteral") {
    // Array literal: Aurelia.register([A, B, C])
    for (const el of arg.elements) {
      const result = processRegistrationArg(el, scope, filePath, call, context);
      sites.push(...result.sites);
      unresolved.push(...result.unresolved);
    }
  } else if (arg.kind === "spread") {
    // Spread: Aurelia.register(...components)
    const barrelPath = context.getNamespaceImportPath(filePath, arg.name);
    if (barrelPath) {
      // Find all candidates exported from the barrel
      for (const candidate of context.candidates) {
        if (context.isClassExportedFrom(candidate.className, barrelPath)) {
          const evidence: RegistrationEvidence = {
            kind: call.receiver === "Aurelia" ? "aurelia-register" : "container-register",
            file: filePath,
          };

          sites.push({
            resourceRef: { kind: "resolved", resource: candidate },
            scope,
            evidence,
            span: argSpan,
          });
        }
      }
    } else {
      // Can't resolve the spread - might be a variable, not a namespace import
      const pattern: UnresolvedPattern = {
        kind: "spread-variable",
        variableName: arg.name,
      };
      unresolved.push({
        pattern,
        file: filePath,
        span: argSpan,
        reason: `Cannot statically analyze spread of variable '${arg.name}'`,
      });
    }
  } else if (arg.kind === "unknown") {
    // Unknown pattern - could be function call, conditional, etc.
    const pattern: UnresolvedPattern = {
      kind: "other",
      description: "Unknown registration pattern",
    };
    unresolved.push({
      pattern,
      file: filePath,
      span: argSpan,
      reason: "Cannot statically analyze this registration pattern",
    });
  }

  return { sites, unresolved };
}
