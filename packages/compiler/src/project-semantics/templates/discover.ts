import type ts from "typescript";
import { basename, dirname, resolve as resolvePath } from "node:path";
import type {
  NormalizedPath,
  ResourceDef,
  ResourceGraph,
  ResourceScopeId,
} from '../compiler.js';
import { normalizePathForId } from '../compiler.js';
import type { RegistrationAnalysis } from "../register/types.js";
import { unwrapSourced } from "../assemble/sourced.js";
import type { InlineTemplateInfo, TemplateInfo } from "./types.js";

export interface DiscoveredTemplates {
  templates: TemplateInfo[];
  inlineTemplates: InlineTemplateInfo[];
}

/**
 * Discover templates for element resources.
 *
 * For each element:
 * - If it has an inline template (string literal), add to inlineTemplates
 * - Otherwise, apply convention (foo.ts -> foo.html) and add to templates
 *
 * Processes both registered resources (sites) and orphaned resources (declared
 * but never registered). Orphans like the root `my-app` component still need
 * their templates discovered.
 */
export function discoverTemplates(
  registration: RegistrationAnalysis,
  program: ts.Program,
  resourceGraph: ResourceGraph,
): DiscoveredTemplates {
  const templates: TemplateInfo[] = [];
  const inlineTemplates: InlineTemplateInfo[] = [];
  const sourceFiles = new Set(program.getSourceFiles().map((sf) => normalizePathForId(sf.fileName)));
  const processedResources = new Set<ResourceDef>();

  // Process registered resources (from registration sites)
  for (const site of registration.sites) {
    // Only process resolved resources
    if (site.resourceRef.kind !== "resolved") continue;

    const resource = site.resourceRef.resource;

    // Avoid duplicates (a resource may have multiple registration sites)
    if (processedResources.has(resource)) continue;
    processedResources.add(resource);

    // Only elements have templates
    if (resource.kind !== "custom-element") continue;
    if (!resource.file) continue;

    const componentPath = resource.file;
    const scopeId = scopeIdForResource(resource, registration, resourceGraph, componentPath);
    const className = unwrapSourced(resource.className) ?? "unknown";
    const resourceName = unwrapSourced(resource.name) ?? "unknown";
    const inlineTemplate = unwrapSourced(resource.inlineTemplate);

    // Check for inline template first
    if (inlineTemplate !== undefined) {
      inlineTemplates.push({
        content: inlineTemplate,
        componentPath,
        scopeId,
        className,
        resourceName,
      });
      continue;
    }

    // No inline template - try convention-based discovery
    const templatePath = resolveTemplatePath(componentPath, sourceFiles);

    if (!templatePath) continue;

    templates.push({
      templatePath,
      componentPath,
      scopeId,
      className,
      resourceName,
    });
  }

  // Process orphaned resources (declared but never registered)
  // Orphans like `my-app` are valid elements that need template discovery.
  // They go to root scope since they have no explicit registration.
  for (const orphan of registration.orphans) {
    const resource = orphan.resource;

    // Avoid duplicates (shouldn't happen, but defensive)
    if (processedResources.has(resource)) continue;
    processedResources.add(resource);

    // Only elements have templates
    if (resource.kind !== "custom-element") continue;
    if (!resource.file) continue;

    const componentPath = resource.file;
    const scopeId = scopeIdForComponent(componentPath, resourceGraph);
    const className = unwrapSourced(resource.className) ?? "unknown";
    const resourceName = unwrapSourced(resource.name) ?? "unknown";
    const inlineTemplate = unwrapSourced(resource.inlineTemplate);

    // Check for inline template first
    if (inlineTemplate !== undefined) {
      inlineTemplates.push({
        content: inlineTemplate,
        componentPath,
        scopeId,
        className,
        resourceName,
      });
      continue;
    }

    // No inline template - try convention-based discovery
    const templatePath = resolveTemplatePath(componentPath, sourceFiles);

    if (!templatePath) continue;

    templates.push({
      templatePath,
      componentPath,
      scopeId,
      className,
      resourceName,
    });
  }

  return { templates, inlineTemplates };
}

/**
 * Resolve the template path for a component using convention.
 *
 * Convention: foo.ts -> foo.html (same directory).
 *
 * This is called only when there's no inline template. For external templates,
 * developers use:
 *   import template from './foo.html';
 *   @customElement({ template })
 *
 * Since we can't resolve identifier references statically, we use convention.
 */
function resolveTemplatePath(
  componentPath: NormalizedPath,
  _knownFiles: Set<NormalizedPath>,
): NormalizedPath | null {
  // Convention: foo.ts -> foo.html, foo.js -> foo.html
  const dir = dirname(componentPath);
  const base = basename(componentPath);
  const htmlName = base.replace(/\.(ts|js|tsx|jsx)$/, ".html");

  if (htmlName === base) {
    // No extension match, can't apply convention
    return null;
  }

  return normalizePathForId(resolvePath(dir, htmlName));
}

function scopeIdForComponent(
  componentPath: NormalizedPath,
  resourceGraph: ResourceGraph,
): ResourceScopeId {
  const localScopeId = `local:${componentPath}` as ResourceScopeId;
  if (localScopeId in resourceGraph.scopes) return localScopeId;
  return resourceGraph.root;
}

function scopeIdForResource(
  resource: ResourceDef,
  registration: RegistrationAnalysis,
  resourceGraph: ResourceGraph,
  componentPath: NormalizedPath,
): ResourceScopeId {
  const componentScope = scopeIdForComponent(componentPath, resourceGraph);
  if (componentScope !== resourceGraph.root) return componentScope;

  const localOwners: NormalizedPath[] = [];
  for (const site of registration.sites) {
    if (site.resourceRef.kind !== "resolved") continue;
    if (site.resourceRef.resource !== resource) continue;
    if (site.scope.kind !== "local") continue;
    localOwners.push(site.scope.owner);
  }
  if (localOwners.length > 0) {
    const owner = [...localOwners].sort()[0]!;
    const localScopeId = `local:${owner}` as ResourceScopeId;
    if (localScopeId in resourceGraph.scopes) return localScopeId;
  }
  return componentScope;
}
