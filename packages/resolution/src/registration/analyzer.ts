import { toSourceFileId, type NormalizedPath, type SourceSpan } from "@aurelia-ls/compiler";
import type { SourceFacts, DependencyRef, ClassFacts, RegistrationCallFact, RegistrationArgFact, ImportFact } from "../extraction/types.js";
import type { ResourceCandidate } from "../inference/types.js";
import type { ExportBindingMap } from "../binding/types.js";
import { lookupExportBinding } from "../binding/export-resolver.js";
import type { PluginManifest, PluginResolver, ImportOrigin } from "../plugins/types.js";
import {
  createPluginResolver,
  traceIdentifierImport,
  traceMemberAccessImport,
} from "../plugins/resolver.js";
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
    exportBindings: ExportBindingMap,
  ): RegistrationAnalysis;
}

/**
 * Create a registration analyzer.
 *
 * The analyzer expects:
 * - facts to have DependencyRef.resolvedPath populated (via resolveImports)
 * - exportBindings to be pre-built (via buildExportBindingMap)
 */
export function createRegistrationAnalyzer(): RegistrationAnalyzer {
  return {
    analyze(candidates, facts, exportBindings) {
      const context = new AnalysisContext(facts, candidates, exportBindings);
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

  /** Map from file path to exported class names (for spread resolution) */
  private exportedClasses = new Map<NormalizedPath, Set<string>>();

  /** Map from (source file, class name) to ResourceCandidate for fast lookup */
  private candidateIndex = new Map<string, ResourceCandidate>();

  /** Plugin resolver for known plugin manifests */
  public readonly pluginResolver: PluginResolver;

  constructor(
    public readonly facts: Map<NormalizedPath, SourceFacts>,
    public readonly candidates: readonly ResourceCandidate[],
    public readonly exportBindings: ExportBindingMap,
  ) {
    this.pluginResolver = createPluginResolver();
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

    // Index exported class names for spread resolution
    // (Uses the exportBindings map to get all exported names)
    for (const [path, bindings] of this.exportBindings) {
      this.exportedClasses.set(path, new Set(bindings.keys()));
    }

    // Index candidates by (source, className)
    for (const candidate of this.candidates) {
      const key = `${candidate.source}::${candidate.className}`;
      this.candidateIndex.set(key, candidate);
    }
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

  /**
   * Resolve an exported class name through the pre-built export binding map.
   *
   * Uses the export binding map built in a prior phase, so this is O(1) lookup
   * rather than recursive traversal.
   */
  resolveExportedClass(
    filePath: NormalizedPath,
    className: string,
  ): { path: NormalizedPath; className: string } | null {
    const binding = lookupExportBinding(this.exportBindings, filePath, className);
    if (binding) {
      return {
        path: binding.definitionPath,
        className: binding.definitionName,
      };
    }
    return null;
  }
}

/**
 * Main analysis function.
 */
function analyzeRegistrations(context: AnalysisContext): RegistrationAnalysis {
  const sites: RegistrationSite[] = [];
  const unresolved: UnresolvedRegistration[] = [];
  const registeredCandidates = new Set<ResourceCandidate>();
  const activatedPlugins: PluginManifest[] = [];
  const seenPlugins = new Set<string>(); // Dedupe by package

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
      const result = findGlobalRegistrationSites(
        call,
        filePath,
        fileFacts.imports,
        context,
      );
      for (const site of result.globalSites) {
        sites.push(site);
        if (site.resourceRef.kind === "resolved") {
          registeredCandidates.add(site.resourceRef.resource);
        }
      }
      unresolved.push(...result.unresolvedPatterns);

      // Track activated plugins (dedupe by package)
      for (const plugin of result.plugins) {
        if (!seenPlugins.has(plugin.package)) {
          seenPlugins.add(plugin.package);
          activatedPlugins.push(plugin);
        }
      }
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

  return { sites, orphans, unresolved, activatedPlugins };
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
 * Result from processing global registration sites.
 */
interface GlobalRegistrationResult {
  globalSites: RegistrationSite[];
  unresolvedPatterns: UnresolvedRegistration[];
  plugins: PluginManifest[];
}

/**
 * Find global registration sites from a register() call.
 */
function findGlobalRegistrationSites(
  call: RegistrationCallFact,
  filePath: NormalizedPath,
  imports: readonly ImportFact[],
  context: AnalysisContext,
): GlobalRegistrationResult {
  const globalSites: RegistrationSite[] = [];
  const unresolvedPatterns: UnresolvedRegistration[] = [];
  const plugins: PluginManifest[] = [];
  const scope: RegistrationScope = { kind: "global" };

  for (const arg of call.arguments) {
    const result = processRegistrationArg(arg, scope, filePath, imports, call, context);
    globalSites.push(...result.sites);
    unresolvedPatterns.push(...result.unresolved);
    plugins.push(...result.plugins);
  }

  return { globalSites, unresolvedPatterns, plugins };
}

/**
 * Result from processing a registration argument.
 */
interface ProcessArgResult {
  sites: RegistrationSite[];
  unresolved: UnresolvedRegistration[];
  plugins: PluginManifest[];
}

/**
 * Process a registration argument recursively.
 */
function processRegistrationArg(
  arg: RegistrationArgFact,
  scope: RegistrationScope,
  filePath: NormalizedPath,
  imports: readonly ImportFact[],
  call: RegistrationCallFact,
  context: AnalysisContext,
): ProcessArgResult {
  const sites: RegistrationSite[] = [];
  const unresolved: UnresolvedRegistration[] = [];
  const plugins: PluginManifest[] = [];

  // Convert arg span to SourceSpan with proper file ID
  const file = toSourceFileId(filePath);
  const argSpan: SourceSpan = {
    file,
    start: arg.span.start,
    end: arg.span.end,
  };

  if (arg.kind === "identifier") {
    // Trace the identifier back through imports to get its origin
    const origin = traceIdentifierImport(arg.name, imports);

    // Check if this is a known plugin (e.g., RouterConfiguration, StandardConfiguration)
    if (origin) {
      const pluginResolution = context.pluginResolver.resolve(origin);
      if (pluginResolution.kind === "known") {
        // Record the activated plugin - don't create RegistrationSites
        // The scope builder will add resources from DEFAULT_SEMANTICS
        plugins.push(pluginResolution.manifest);
        return { sites, unresolved, plugins };
      }
    }

    // Direct identifier: Aurelia.register(MyElement)
    // We need to resolve this identifier to a candidate
    // First, look it up in the file's imports
    const fileFacts = context.facts.get(filePath);
    let resolvedPath: NormalizedPath | null = null;
    let originalClassName: string = arg.name; // May be aliased

    if (fileFacts) {
      for (const imp of fileFacts.imports) {
        if (imp.kind === "named" && imp.resolvedPath) {
          const found = imp.names.find(n => (n.alias ?? n.name) === arg.name);
          if (found) {
            resolvedPath = imp.resolvedPath;
            // Use the original name from the import, not the alias
            originalClassName = found.name;
            break;
          }
        } else if (imp.kind === "default" && imp.alias === arg.name && imp.resolvedPath) {
          resolvedPath = imp.resolvedPath;
          // For default imports, we need to find what's exported as default
          originalClassName = arg.name; // Will be resolved via re-export chain
          break;
        }
      }
    }

    // Resolve through re-export chains if needed
    const resolved = resolvedPath
      ? context.resolveExportedClass(resolvedPath, originalClassName)
      : null;

    const candidate = resolved
      ? context.findCandidateByResolvedPath(resolved.path, resolved.className)
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
  } else if (arg.kind === "callExpression") {
    // Call expression: X.customize(...) pattern
    // Trace the receiver through imports
    const origin = traceIdentifierImport(arg.receiver, imports);

    if (origin && arg.method === "customize") {
      // Check if this is a known plugin with .customize()
      if (context.pluginResolver.supportsCustomize(origin)) {
        const pluginResolution = context.pluginResolver.resolve(origin);
        if (pluginResolution.kind === "known") {
          // Treat X.customize(...) the same as X
          plugins.push(pluginResolution.manifest);
          return { sites, unresolved, plugins };
        }
      }
    }

    // Unknown call expression - can't analyze statically
    const pattern: UnresolvedPattern = {
      kind: "function-call",
      functionName: `${arg.receiver}.${arg.method}`,
    };
    unresolved.push({
      pattern,
      file: filePath,
      span: argSpan,
      reason: `Cannot statically analyze call to '${arg.receiver}.${arg.method}()'`,
    });
  } else if (arg.kind === "arrayLiteral") {
    // Array literal: Aurelia.register([A, B, C])
    for (const el of arg.elements) {
      const result = processRegistrationArg(el, scope, filePath, imports, call, context);
      sites.push(...result.sites);
      unresolved.push(...result.unresolved);
      plugins.push(...result.plugins);
    }
  } else if (arg.kind === "memberAccess") {
    // Member access: Aurelia.register(Router.RouterConfiguration) or widgets.SpecialWidget
    // First, check if this is a plugin via namespace import
    const origin = traceMemberAccessImport(arg.namespace, arg.member, imports);
    if (origin) {
      const pluginResolution = context.pluginResolver.resolve(origin);
      if (pluginResolution.kind === "known") {
        plugins.push(pluginResolution.manifest);
        return { sites, unresolved, plugins };
      }
    }

    // Not a plugin - resolve the namespace to find the barrel file
    const barrelPath = context.getNamespaceImportPath(filePath, arg.namespace);
    if (barrelPath) {
      // Look up the member in the barrel's exports and follow re-export chain
      const resolved = context.resolveExportedClass(barrelPath, arg.member);
      const candidate = resolved
        ? context.findCandidateByResolvedPath(resolved.path, resolved.className)
        : undefined;

      const evidence: RegistrationEvidence = {
        kind: call.receiver === "Aurelia" ? "aurelia-register" : "container-register",
        file: filePath,
      };

      if (candidate) {
        sites.push({
          resourceRef: { kind: "resolved", resource: candidate },
          scope,
          evidence,
          span: argSpan,
        });
      } else {
        sites.push({
          resourceRef: {
            kind: "unresolved",
            name: `${arg.namespace}.${arg.member}`,
            reason: `Could not resolve '${arg.member}' in namespace '${arg.namespace}'`,
          },
          scope,
          evidence,
          span: argSpan,
        });
      }
    } else {
      // Namespace not found in imports
      sites.push({
        resourceRef: {
          kind: "unresolved",
          name: `${arg.namespace}.${arg.member}`,
          reason: `Unknown namespace '${arg.namespace}'`,
        },
        scope,
        evidence: {
          kind: call.receiver === "Aurelia" ? "aurelia-register" : "container-register",
          file: filePath,
        },
        span: argSpan,
      });
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

  return { sites, unresolved, plugins };
}
