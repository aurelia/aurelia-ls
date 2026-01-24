import type { NormalizedPath, ResourceScopeId } from "@aurelia-ls/compiler";

export interface TemplateInfo {
  /** Path to the .html template file */
  templatePath: NormalizedPath;
  /** Path to the .ts component file */
  componentPath: NormalizedPath;
  /** Scope ID for compilation ("root" or "local:...") */
  scopeId: ResourceScopeId;
  /** Component class name */
  className: string;
  /** Resource name (kebab-case) */
  resourceName: string;
}

export interface InlineTemplateInfo {
  /** The inline template content (HTML string) */
  content: string;
  /** Path to the .ts component file containing the inline template */
  componentPath: NormalizedPath;
  /** Scope ID for compilation ("root" or "local:...") */
  scopeId: ResourceScopeId;
  /** Component class name */
  className: string;
  /** Resource name (kebab-case) */
  resourceName: string;
}
