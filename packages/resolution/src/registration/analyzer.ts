import { debug, toSourceFileId, type NormalizedPath, type ResourceDef, type SourceSpan } from "@aurelia-ls/compiler";
import type { FileFacts, FileContext, ImportDeclaration, RegistrationCall, TemplateImport } from "../extraction/file-facts.js";
import type { ClassValue, AnalyzableValue } from "../analysis/value/types.js";
import { extractStringArrayProp, getProperty } from "../analysis/value/types.js";
import type { ExportBindingMap } from "../binding/types.js";
import { lookupExportBinding } from "../binding/export-resolver.js";
import type { PluginManifest, PluginResolver } from "../plugins/types.js";
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
import { unwrapSourced } from "../semantics/sourced.js";

/**
 * Registration analyzer interface.
 *
 * Analyzes registration patterns to determine where resources are available.
 * Produces RegistrationAnalysis with sites[], orphans[], and unresolved[].
 */
export interface RegistrationAnalyzer {
  analyze(
    resources: readonly ResourceDef[],
    facts: Map<NormalizedPath, FileFacts>,
    exportBindings: ExportBindingMap,
    contexts?: Map<NormalizedPath, FileContext>,
  ): RegistrationAnalysis;
}

/**
 * Create a registration analyzer.
 *
 * The analyzer expects:
 * - facts to have import resolvedPath populated
 * - exportBindings to be pre-built (via buildExportBindingMap)
 * - contexts (optional) for template import analysis
 */
export function createRegistrationAnalyzer(): RegistrationAnalyzer {
  return {
    analyze(resources, facts, exportBindings, contexts) {
      const context = new AnalysisContext(facts, resources, exportBindings, contexts);
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

  /** Map from (source file, class name) to ResourceDef for fast lookup */
  private resourceIndex = new Map<string, ResourceDef>();

  /** Plugin resolver for known plugin manifests */
  public readonly pluginResolver: PluginResolver;

  constructor(
    public readonly facts: Map<NormalizedPath, FileFacts>,
    public readonly resources: readonly ResourceDef[],
    public readonly exportBindings: ExportBindingMap,
    public readonly contexts?: Map<NormalizedPath, FileContext>,
  ) {
    this.pluginResolver = createPluginResolver();
    this.buildIndexes();
  }

  /**
   * Get the FileContext for a file path.
   */
  getFileContext(filePath: NormalizedPath): FileContext | undefined {
    return this.contexts?.get(filePath);
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

    // Index resources by (source, className)
    for (const resource of this.resources) {
      const file = resource.file;
      const className = unwrapSourced(resource.className);
      if (!file || !className) continue;
      const key = `${file}::${className}`;
      this.resourceIndex.set(key, resource);
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
   * Find a ResourceDef by source file and class name.
   */
  findResource(source: NormalizedPath, className: string): ResourceDef | undefined {
    const key = `${source}::${className}`;
    return this.resourceIndex.get(key);
  }

  /**
   * Find a ResourceDef by class name, searching all files.
   * Used when we have a resolved import path.
   */
  findResourceByResolvedPath(resolvedPath: NormalizedPath, className: string): ResourceDef | undefined {
    return this.findResource(resolvedPath, className);
  }

  /**
   * Get exported class names for a module file.
   */
  getExportedClassNames(filePath: NormalizedPath): string[] {
    const names = this.exportedClasses.get(filePath);
    return names ? Array.from(names) : [];
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
  const registeredResources = new Set<ResourceDef>();
  const activatedPlugins: PluginManifest[] = [];
  const seenPlugins = new Set<string>(); // Dedupe by package

  // 1. Find all local registration sites (static dependencies, decorator deps, static $au deps)
  for (const [filePath, fileFacts] of context.facts) {
    for (const cls of fileFacts.classes) {
      const localSites = findLocalRegistrationSites(cls, filePath, context);
      for (const site of localSites) {
        sites.push(site);
        if (site.resourceRef.kind === "resolved") {
          registeredResources.add(site.resourceRef.resource);
        }
      }
    }
  }

  // 1.5. Find template import registration sites (from <import>/<require> in sibling templates)
  // Only process if contexts are provided (they come from resolve.ts)
  if (context.contexts) {
    for (const [filePath, fileContext] of context.contexts) {
      if (fileContext.templateImports.length === 0) continue;

      // Find all element resources from this source file
      const elementResources = context.resources.filter(
        (r) => r.file === filePath && r.kind === "custom-element"
      );

      // Find the sibling template file path (for evidence)
      // Use the .html sibling if available, otherwise fall back to the source path
      const templateSibling = fileContext.siblings.find(s => s.extension === '.html');
      const templateFile = templateSibling?.path ?? filePath;

      for (const resource of elementResources) {
        const templateSites = findTemplateImportSites(
          fileContext.templateImports,
          filePath,
          unwrapSourced(resource.className) ?? "unknown",
          templateFile,
          context,
        );
        for (const site of templateSites) {
          sites.push(site);
          if (site.resourceRef.kind === "resolved") {
            registeredResources.add(site.resourceRef.resource);
          }
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
          registeredResources.add(site.resourceRef.resource);
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

  // 3. Find orphans - resources with no registration sites
  const orphans: OrphanResource[] = [];
  for (const resource of context.resources) {
    if (!registeredResources.has(resource)) {
      orphans.push({
        resource,
        definitionSpan: resourceDefinitionSpan(resource),
      });
    }
  }

  return { sites, orphans, unresolved, activatedPlugins };
}

function resourceDefinitionSpan(resource: ResourceDef): SourceSpan {
  const classLocation = "location" in resource.className ? resource.className.location : undefined;
  const nameLocation = "location" in resource.name ? resource.name.location : undefined;
  const location = classLocation ?? nameLocation;
  const file = location?.file ?? resource.file;
  return {
    file: toSourceFileId(file!),
    start: location?.pos ?? 0,
    end: location?.end ?? 0,
  };
}

/**
 * Find local registration sites from a class's dependencies.
 */
function findLocalRegistrationSites(
  cls: ClassValue,
  filePath: NormalizedPath,
  context: AnalysisContext,
): RegistrationSite[] {
  const sites: RegistrationSite[] = [];
  const scope: RegistrationScope = { kind: "local", owner: filePath };

  // 1. static dependencies = [...]
  const staticDeps = cls.staticMembers.get('dependencies');
  if (staticDeps) {
    const refs = extractDependencyRefs(staticDeps);
    for (const ref of refs) {
      const site = createSiteFromValueRef(ref, scope, {
        kind: "static-dependencies",
        component: filePath,
        className: cls.className,
      }, filePath, context);
      sites.push(site);
    }
  }

  // 2. static $au = { dependencies: [...] }
  const staticAu = cls.staticMembers.get('$au');
  if (staticAu && staticAu.kind === 'object') {
    const auDeps = getProperty(staticAu, 'dependencies');
    if (auDeps) {
      const refs = extractDependencyRefs(auDeps);
      for (const ref of refs) {
        const site = createSiteFromValueRef(ref, scope, {
          kind: "static-au-dependencies",
          component: filePath,
          className: cls.className,
        }, filePath, context);
        sites.push(site);
      }
    }
  }

  // 3. @customElement({ dependencies: [...] }) or similar decorators
  for (const dec of cls.decorators) {
    if (dec.args.length > 0) {
      const firstArg = dec.args[0];
      if (firstArg?.kind === 'object') {
        const depsProp = getProperty(firstArg, 'dependencies');
        if (depsProp) {
          const refs = extractDependencyRefs(depsProp);
          for (const ref of refs) {
            const site = createSiteFromValueRef(ref, scope, {
              kind: "decorator-dependencies",
              component: filePath,
              className: cls.className,
            }, filePath, context);
            sites.push(site);
          }
        }
      }
    }
  }

  return sites;
}

/**
 * Dependency reference extracted from AnalyzableValue.
 */
interface ValueRef {
  kind: 'identifier' | 'property-access' | 'unknown';
  name: string;
  property?: string;
  resolvedPath?: NormalizedPath | null;
  span: { start: number; end: number };
}

/**
 * Extract the name from an AnalyzableValue that might be a reference or import.
 * Returns null if the value is not a simple identifier.
 */
function extractBaseName(value: AnalyzableValue): string | null {
  if (value.kind === 'reference') {
    return value.name;
  }
  if (value.kind === 'import') {
    return value.exportName;
  }
  return null;
}

/**
 * Extract dependency references from an AnalyzableValue.
 *
 * Handles:
 * - Array of references: [Foo, Bar, Baz]
 * - Single reference: Foo
 */
function extractDependencyRefs(value: AnalyzableValue): ValueRef[] {
  const refs: ValueRef[] = [];

  if (value.kind === 'array') {
    for (const element of value.elements) {
      const ref = extractSingleRef(element);
      if (ref) refs.push(ref);
    }
  } else {
    const ref = extractSingleRef(value);
    if (ref) refs.push(ref);
  }

  return refs;
}

/**
 * Extract a single reference from an AnalyzableValue element.
 */
function extractSingleRef(value: AnalyzableValue): ValueRef | null {
  const span = value.span ?? { start: 0, end: 0 };

  if (value.kind === 'reference') {
    return {
      kind: 'identifier',
      name: value.name,
      // ReferenceValue doesn't have resolvedPath directly, resolution happens via scope
      resolvedPath: undefined,
      span,
    };
  }

  if (value.kind === 'propertyAccess') {
    const baseName = extractBaseName(value.base);
    if (!baseName) {
      return {
        kind: 'unknown',
        name: '(complex property access)',
        span,
      };
    }
    return {
      kind: 'property-access',
      name: baseName,
      property: value.property,
      span,
    };
  }

  if (value.kind === 'import') {
    return {
      kind: 'identifier',
      name: value.exportName,
      resolvedPath: value.resolvedPath,
      span,
    };
  }

  // Unknown or complex value
  return {
    kind: 'unknown',
    name: '(unknown)',
    span,
  };
}

/**
 * Create a RegistrationSite from a ValueRef.
 */
function createSiteFromValueRef(
  ref: ValueRef,
  scope: RegistrationScope,
  evidence: RegistrationEvidence,
  filePath: NormalizedPath,
  context: AnalysisContext,
): RegistrationSite {
  const resourceRef = resolveValueRef(ref, filePath, context);
  const span: SourceSpan = {
    file: toSourceFileId(filePath),
    start: ref.span.start,
    end: ref.span.end,
  };

  return {
    resourceRef,
    scope,
    evidence,
    span,
  };
}

/**
 * Resolve a ValueRef to a ResourceRef.
 */
function resolveValueRef(ref: ValueRef, filePath: NormalizedPath, context: AnalysisContext): ResourceRef {
  if (ref.kind === 'identifier') {
    // If we have a resolved path, look up the resource
    if (ref.resolvedPath) {
      const resource = context.findResourceByResolvedPath(ref.resolvedPath, ref.name);
      if (resource) {
        return { kind: "resolved", resource };
      }
      return {
        kind: "unresolved",
        name: ref.name,
        reason: `Class '${ref.name}' at '${ref.resolvedPath}' is not a known resource`,
      };
    }

    // Try to resolve through file facts imports
    const fileFacts = context.facts.get(filePath);
    if (fileFacts) {
      for (const imp of fileFacts.imports) {
        if (imp.kind === "named" && imp.resolvedPath) {
          const found = imp.bindings.find(b => (b.alias ?? b.name) === ref.name);
          if (found) {
            const resolved = context.resolveExportedClass(imp.resolvedPath, found.name);
            const resource = resolved
              ? context.findResourceByResolvedPath(resolved.path, resolved.className)
              : undefined;
            if (resource) {
              return { kind: "resolved", resource };
            }
          }
        } else if (imp.kind === "default" && imp.alias === ref.name && imp.resolvedPath) {
          // For default imports, look up the default export
          const resolved = context.resolveExportedClass(imp.resolvedPath, 'default');
          const resource = resolved
            ? context.findResourceByResolvedPath(resolved.path, resolved.className)
            : undefined;
          if (resource) {
            return { kind: "resolved", resource };
          }
        }
      }
    }

    return {
      kind: "unresolved",
      name: ref.name,
      reason: `Could not resolve import for '${ref.name}'`,
    };
  }

  if (ref.kind === 'property-access') {
    // Property access: Module.Component
    const barrelPath = context.getNamespaceImportPath(filePath, ref.name);
    if (barrelPath && ref.property) {
      const resolved = context.resolveExportedClass(barrelPath, ref.property);
      const resource = resolved
        ? context.findResourceByResolvedPath(resolved.path, resolved.className)
        : undefined;
      if (resource) {
        return { kind: "resolved", resource };
      }
      return {
        kind: "unresolved",
        name: `${ref.name}.${ref.property}`,
        reason: `Class '${ref.property}' not found in namespace '${ref.name}'`,
      };
    }
    return {
      kind: "unresolved",
      name: `${ref.name}.${ref.property ?? '?'}`,
      reason: `Unknown namespace '${ref.name}'`,
    };
  }

  // Unknown
  return {
    kind: "unresolved",
    name: ref.name,
    reason: "Cannot statically analyze this value",
  };
}

/**
 * Find registration sites from template imports.
 *
 * Template imports in <import from="..."> create local scope registrations,
 * similar to static dependencies in the component class.
 *
 * Handles three cases:
 * 1. Named aliases: `<import from="./x" Foo.as="f">` → one site per alias
 * 2. Default alias: `<import from="./x" as="y">` → one site for the aliased default
 * 3. Plain import: `<import from="./x">` → one site for all module exports
 */
function findTemplateImportSites(
  templateImports: readonly TemplateImport[],
  componentPath: NormalizedPath,
  className: string,
  templateFile: NormalizedPath,
  context: AnalysisContext,
): RegistrationSite[] {
  const sites: RegistrationSite[] = [];
  const scope: RegistrationScope = { kind: "local", owner: componentPath };

  for (const imp of templateImports) {
    const evidence: RegistrationEvidence = {
      kind: "template-import",
      component: componentPath,
      className,
      templateFile,
    };

    // Case 1: Named aliases - create one site per alias
    if (imp.namedAliases.length > 0) {
      for (const alias of imp.namedAliases) {
        const resourceRef = resolveNamedAliasImport(imp, alias.exportName, context);
        sites.push({
          resourceRef,
          scope,
          evidence,
          span: imp.span,
        });
      }
      continue;
    }

    // Case 2: Default alias - single site
    if (imp.defaultAlias) {
      const site = createSiteFromTemplateImport(imp, scope, evidence, templateFile, context);
      sites.push(site);
      continue;
    }

    // Case 3: Plain import - one site per exported resource
    const plainSites = createSitesFromPlainTemplateImport(imp, scope, evidence, context);
    sites.push(...plainSites);
  }

  return sites;
}

/**
 * Create a RegistrationSite from a template import.
 */
function createSiteFromTemplateImport(
  imp: TemplateImport,
  scope: RegistrationScope,
  evidence: RegistrationEvidence,
  _templateFile: NormalizedPath,
  context: AnalysisContext,
): RegistrationSite {
  const resourceRef = resolveTemplateImportRef(imp, context);

  return {
    resourceRef,
    scope,
    evidence,
    span: imp.span, // Already a SourceSpan, no conversion needed
  };
}

/**
 * Create RegistrationSites for a plain template import.
 *
 * `<import from="./x">` registers all resources exported by the module.
 */
function createSitesFromPlainTemplateImport(
  imp: TemplateImport,
  scope: RegistrationScope,
  evidence: RegistrationEvidence,
  context: AnalysisContext,
): RegistrationSite[] {
  if (!imp.resolvedPath) {
    return [{
      resourceRef: {
        kind: "unresolved",
        name: imp.moduleSpecifier,
        reason: `Could not resolve module '${imp.moduleSpecifier}'`,
      },
      scope,
      evidence,
      span: imp.span,
    }];
  }

  const seen = new Set<ResourceDef>();
  const resources: ResourceDef[] = [];
  const exportedNames = context.getExportedClassNames(imp.resolvedPath);
  for (const exportName of exportedNames) {
    const resolved = context.resolveExportedClass(imp.resolvedPath, exportName);
    const resource = resolved
      ? context.findResourceByResolvedPath(resolved.path, resolved.className)
      : context.findResourceByResolvedPath(imp.resolvedPath, exportName);
    if (resource && !seen.has(resource)) {
      seen.add(resource);
      resources.push(resource);
    }
  }

  if (resources.length === 0) {
    return [{
      resourceRef: {
        kind: "unresolved",
        name: imp.moduleSpecifier,
        reason: `No resources found in '${imp.moduleSpecifier}'`,
      },
      scope,
      evidence,
      span: imp.span,
    }];
  }

  return resources.map((resource) => ({
    resourceRef: { kind: "resolved", resource },
    scope,
    evidence,
    span: imp.span,
  }));
}

/**
 * Resolve a named alias import to a ResourceRef.
 *
 * For `<import from="./x" Foo.as="f">`, looks up the export `Foo` from module `./x`.
 */
function resolveNamedAliasImport(
  imp: TemplateImport,
  exportName: string,
  context: AnalysisContext,
): ResourceRef {
  if (!imp.resolvedPath) {
    return {
      kind: "unresolved",
      name: imp.moduleSpecifier,
      reason: `Could not resolve module '${imp.moduleSpecifier}'`,
    };
  }

  const resolved = context.resolveExportedClass(imp.resolvedPath, exportName);
  const resource = resolved
    ? context.findResourceByResolvedPath(resolved.path, resolved.className)
    : context.findResourceByResolvedPath(imp.resolvedPath, exportName);
  if (resource) {
    return { kind: "resolved", resource };
  }

  return {
    kind: "unresolved",
    name: exportName,
    reason: `Export '${exportName}' not found in '${imp.moduleSpecifier}'`,
  };
}

/**
 * Resolve a template import to a ResourceRef.
 *
 * Handles two cases:
 * 1. Default alias: `<import from="./x" as="y">` → look up by alias name
 * 2. Plain import: `<import from="./x">` → look up any exported resource
 *
 * Named aliases are handled separately by resolveNamedAliasImport.
 */
function resolveTemplateImportRef(
  imp: TemplateImport,
  context: AnalysisContext,
): ResourceRef {
  // If we don't have a resolved path, module resolution failed
  if (!imp.resolvedPath) {
    return {
      kind: "unresolved",
      name: imp.moduleSpecifier,
      reason: `Could not resolve module '${imp.moduleSpecifier}'`,
    };
  }

  // If we have a default alias, try to find a resource with that name
  if (imp.defaultAlias) {
    const resolved = context.resolveExportedClass(imp.resolvedPath, "default")
      ?? context.resolveExportedClass(imp.resolvedPath, imp.defaultAlias);
    const resource = resolved
      ? context.findResourceByResolvedPath(resolved.path, resolved.className)
      : context.findResourceByResolvedPath(imp.resolvedPath, imp.defaultAlias);
    if (resource) {
      return { kind: "resolved", resource };
    }
  }

  // Plain import: find any resource exported from this module
  // This matches Aurelia runtime behavior where <import from="./foo">
  // makes all resources from ./foo available.
  for (const resource of context.resources) {
    if (resource.file === imp.resolvedPath) {
      return { kind: "resolved", resource };
    }
  }

  // No resource found in the imported module
  return {
    kind: "unresolved",
    name: imp.moduleSpecifier,
    reason: `No resources found in '${imp.moduleSpecifier}'`,
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
  call: RegistrationCall,
  filePath: NormalizedPath,
  imports: readonly ImportDeclaration[],
  context: AnalysisContext,
): GlobalRegistrationResult {
  const globalSites: RegistrationSite[] = [];
  const unresolvedPatterns: UnresolvedRegistration[] = [];
  const plugins: PluginManifest[] = [];
  const scope: RegistrationScope = { kind: "global" };

  debug.resolution("registration.global.call", {
    filePath,
    receiver: call.receiver,
    argCount: call.arguments.length,
  });

  for (const arg of call.arguments) {
    const result = processRegistrationValue(arg, scope, filePath, imports, call, context);
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
 * Process a registration value recursively.
 */
function processRegistrationValue(
  arg: AnalyzableValue,
  scope: RegistrationScope,
  filePath: NormalizedPath,
  imports: readonly ImportDeclaration[],
  call: RegistrationCall,
  context: AnalysisContext,
): ProcessArgResult {
  const sites: RegistrationSite[] = [];
  const unresolved: UnresolvedRegistration[] = [];
  const plugins: PluginManifest[] = [];

  // Convert arg span to SourceSpan with proper file ID
  const file = toSourceFileId(filePath);
  const argSpan: SourceSpan = {
    file,
    start: arg.span?.start ?? 0,
    end: arg.span?.end ?? 0,
  };

  if (arg.kind === "import") {
    const evidence: RegistrationEvidence = {
      kind: call.receiver === "aurelia" ? "aurelia-register" : "container-register",
      file: filePath,
    };

    const origin = { moduleSpecifier: arg.specifier, exportName: arg.exportName };
    const pluginResolution = context.pluginResolver.resolve(origin);
    if (pluginResolution.kind === "known") {
      plugins.push(pluginResolution.manifest);
      return { sites, unresolved, plugins };
    }

    const resolvedClass = arg.resolved?.kind === "class" ? arg.resolved : undefined;
    let resolvedPath = arg.resolvedPath ?? resolvedClass?.filePath;
    let className = resolvedClass?.className;

    if (!className && resolvedPath) {
      const resolvedExport = context.resolveExportedClass(resolvedPath, arg.exportName);
      if (resolvedExport) {
        resolvedPath = resolvedExport.path;
        className = resolvedExport.className;
      } else if (arg.exportName !== "default") {
        className = arg.exportName;
      }
    }

    debug.resolution("registration.global.import", {
      filePath,
      exportName: arg.exportName,
      resolvedPath,
      resolvedKind: arg.resolved?.kind,
      className,
    });

    if (resolvedPath && className) {
      const resource = context.findResourceByResolvedPath(resolvedPath, className);
      if (resource) {
        sites.push({
          resourceRef: { kind: "resolved", resource },
          scope,
          evidence,
          span: argSpan,
        });
      } else {
        sites.push({
          resourceRef: {
            kind: "unresolved",
            name: className,
            reason: `Class '${className}' at '${resolvedPath}' is not a known resource`,
          },
          scope,
          evidence,
          span: argSpan,
        });
      }
      return { sites, unresolved, plugins };
    }

    sites.push({
      resourceRef: {
        kind: "unresolved",
        name: arg.exportName,
        reason: `Cannot resolve import '${arg.exportName}' from '${arg.specifier}'`,
      },
      scope,
      evidence,
      span: argSpan,
    });

    return { sites, unresolved, plugins };
  }

  if (arg.kind === "reference") {
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
    // Use ValueRef to resolve
    // If the reference resolved to a ClassValue, get its filePath
    const resolvedPath = arg.resolved?.kind === 'class' ? arg.resolved.filePath : undefined;
    const ref: ValueRef = {
      kind: 'identifier',
      name: arg.name,
      resolvedPath,
      span: arg.span ?? { start: 0, end: 0 },
    };

    const resourceRef = resolveValueRef(ref, filePath, context);

    const evidence: RegistrationEvidence = {
      kind: call.receiver === "aurelia" ? "aurelia-register" : "container-register",
      file: filePath,
    };

    sites.push({
      resourceRef,
      scope,
      evidence,
      span: argSpan,
    });
  } else if (arg.kind === "call") {
    // Call expression: X.customize(...) pattern
    const callee = arg.callee;

    // Check for method call pattern: X.customize()
    if (callee.kind === 'propertyAccess') {
      const calleeBaseName = extractBaseName(callee.base);
      const origin = calleeBaseName ? traceIdentifierImport(calleeBaseName, imports) : null;

      if (origin && callee.property === "customize") {
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
      const calleeDesc = calleeBaseName ? `${calleeBaseName}.${callee.property}` : `(unknown).${callee.property}`;
      const pattern: UnresolvedPattern = {
        kind: "function-call",
        functionName: calleeDesc,
      };
      unresolved.push({
        pattern,
        file: filePath,
        span: argSpan,
        reason: `Cannot statically analyze call to '${calleeDesc}()'`,
      });
    } else {
      // Non-method call - can't analyze
      const pattern: UnresolvedPattern = {
        kind: "function-call",
        functionName: "(unknown)",
      };
      unresolved.push({
        pattern,
        file: filePath,
        span: argSpan,
        reason: "Cannot statically analyze this call expression",
      });
    }
  } else if (arg.kind === "array") {
    // Array literal: Aurelia.register([A, B, C])
    for (const el of arg.elements) {
      const result = processRegistrationValue(el, scope, filePath, imports, call, context);
      sites.push(...result.sites);
      unresolved.push(...result.unresolved);
      plugins.push(...result.plugins);
    }
  } else if (arg.kind === "propertyAccess") {
    // Property access: Aurelia.register(Router.RouterConfiguration) or widgets.SpecialWidget
    const argBaseName = extractBaseName(arg.base);

    // First, check if this is a plugin via namespace import
    const origin = argBaseName ? traceMemberAccessImport(argBaseName, arg.property, imports) : null;
    if (origin) {
      const pluginResolution = context.pluginResolver.resolve(origin);
      if (pluginResolution.kind === "known") {
        plugins.push(pluginResolution.manifest);
        return { sites, unresolved, plugins };
      }
    }

    // Not a plugin - resolve the namespace to find the barrel file
    const barrelPath = argBaseName ? context.getNamespaceImportPath(filePath, argBaseName) : null;
    if (barrelPath) {
      // Look up the member in the barrel's exports and follow re-export chain
      const resolved = context.resolveExportedClass(barrelPath, arg.property);
      const resource = resolved
        ? context.findResourceByResolvedPath(resolved.path, resolved.className)
        : undefined;

      const evidence: RegistrationEvidence = {
        kind: call.receiver === "aurelia" ? "aurelia-register" : "container-register",
        file: filePath,
      };

      const propAccessDesc = argBaseName ? `${argBaseName}.${arg.property}` : `(unknown).${arg.property}`;

      if (resource) {
        sites.push({
          resourceRef: { kind: "resolved", resource },
          scope,
          evidence,
          span: argSpan,
        });
      } else {
        sites.push({
          resourceRef: {
            kind: "unresolved",
            name: propAccessDesc,
            reason: `Could not resolve '${arg.property}' in namespace '${argBaseName ?? "(unknown)"}'`,
          },
          scope,
          evidence,
          span: argSpan,
        });
      }
    } else {
      // Namespace not found in imports
      const propAccessDesc = argBaseName ? `${argBaseName}.${arg.property}` : `(unknown).${arg.property}`;
      sites.push({
        resourceRef: {
          kind: "unresolved",
          name: propAccessDesc,
          reason: `Unknown namespace '${argBaseName ?? "(unknown)"}'`,
        },
        scope,
        evidence: {
          kind: call.receiver === "aurelia" ? "aurelia-register" : "container-register",
          file: filePath,
        },
        span: argSpan,
      });
    }
  } else if (arg.kind === "spread") {
    // Spread: Aurelia.register(...components)
    if (arg.expanded) {
      for (const el of arg.expanded) {
        const result = processRegistrationValue(el, scope, filePath, imports, call, context);
        sites.push(...result.sites);
        unresolved.push(...result.unresolved);
        plugins.push(...result.plugins);
      }
      return { sites, unresolved, plugins };
    }

    const spreadTarget = arg.target;
    let barrelPath: NormalizedPath | null = null;
    let spreadName = '(unknown)';

    if (spreadTarget.kind === 'reference') {
      spreadName = spreadTarget.name;
      barrelPath = context.getNamespaceImportPath(filePath, spreadTarget.name);
    } else if (spreadTarget.kind === 'import' && spreadTarget.exportName === '*') {
      spreadName = spreadTarget.specifier;
      barrelPath = spreadTarget.resolvedPath ?? null;
      if (!barrelPath) {
        const namespaceImport = imports.find(
          (imp) => imp.kind === "namespace" && imp.moduleSpecifier === spreadTarget.specifier
        );
        barrelPath = namespaceImport?.resolvedPath ?? null;
      }
    }

    if (barrelPath) {
      // Find all resources exported from the barrel
      for (const resource of context.resources) {
        const className = unwrapSourced(resource.className);
        if (className && context.isClassExportedFrom(className, barrelPath)) {
          const evidence: RegistrationEvidence = {
            kind: call.receiver === "aurelia" ? "aurelia-register" : "container-register",
            file: filePath,
          };

          sites.push({
            resourceRef: { kind: "resolved", resource },
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
        variableName: spreadName,
      };
      unresolved.push({
        pattern,
        file: filePath,
        span: argSpan,
        reason: `Cannot statically analyze spread of variable '${spreadName}'`,
      });
    }
  } else {
    // Unknown pattern - could be function call, conditional, etc.
    const pattern: UnresolvedPattern = {
      kind: "other",
      description: `Unknown registration pattern: ${arg.kind}`,
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

