/**
 * Template Import Extraction
 *
 * Extracts <import> and <require> elements from template HTML files.
 * Uses the compiler's extractTemplateMeta function to parse the template.
 *
 * These imports create local scope registrations (equivalent to static dependencies).
 */

import {
  extractTemplateMeta,
  toSourceFileId,
  type NormalizedPath,
  type ImportMetaIR,
  type TemplateMetaIR,
  type Located,
  type SourceSpan,
} from '../compiler.js';
import { parseFragment } from "parse5";
import type { DefaultTreeAdapterMap, Token } from "parse5";
import type { FileSystemContext } from "../project/context.js";
import type {
  LocalTemplateDefinition,
  LocalTemplateImport,
  TemplateImport,
} from "./file-facts.js";

/**
 * Extract template imports from a template file.
 *
 * @param templatePath - Path to the template file
 * @param fileSystem - File system context for reading the file
 * @returns Array of template import facts, or empty array if template can't be read
 */
export function extractTemplateImports(
  templatePath: NormalizedPath,
  fileSystem: FileSystemContext,
): TemplateImport[] {
  // Read the template file
  const content = fileSystem.readFile(templatePath);
  if (content === undefined) {
    return [];
  }

  // Extract meta elements using compiler's function
  const meta = extractTemplateMeta(content, templatePath);

  // Convert ImportMetaIR to TemplateImport
  return meta.imports.map((imp) => convertImportMeta(imp, templatePath));
}

/**
 * Extract template imports nested inside <template as-custom-element>.
 *
 * These are tracked separately from root-template imports because local-template
 * import scope policy is still explicit and unresolved.
 */
export function extractLocalTemplateImports(
  templatePath: NormalizedPath,
  fileSystem: FileSystemContext,
): LocalTemplateImport[] {
  const content = fileSystem.readFile(templatePath);
  if (content === undefined) {
    return [];
  }
  return extractLocalTemplateImportsFromHtml(content, templatePath);
}

/**
 * Extract local-template (<template as-custom-element>) imports from HTML content.
 */
export function extractLocalTemplateImportsFromHtml(
  html: string,
  templatePath: NormalizedPath,
): LocalTemplateImport[] {
  const fragment = parseFragment(html, { sourceCodeLocationInfo: true });
  const imports: LocalTemplateImport[] = [];
  collectLocalTemplateImports(fragment, templatePath, null, imports);
  return imports;
}

/**
 * Extract local-template declarations and their non-import template metadata.
 */
export function extractLocalTemplateDefinitions(
  templatePath: NormalizedPath,
  fileSystem: FileSystemContext,
): LocalTemplateDefinition[] {
  const content = fileSystem.readFile(templatePath);
  if (content === undefined) {
    return [];
  }
  return extractLocalTemplateDefinitionsFromHtml(content, templatePath);
}

/**
 * Extract local-template declarations and their non-import template metadata
 * from HTML content.
 */
export function extractLocalTemplateDefinitionsFromHtml(
  html: string,
  templatePath: NormalizedPath,
): LocalTemplateDefinition[] {
  const fragment = parseFragment(html, { sourceCodeLocationInfo: true });
  const definitions: LocalTemplateDefinition[] = [];
  collectLocalTemplateDefinitions(fragment, html, templatePath, definitions);
  return definitions;
}

/**
 * Convert ImportMetaIR from the compiler to TemplateImport.
 *
 * Preserves source spans as SourceSpan (with file) rather than downgrading to TextSpan.
 */
function convertImportMeta(imp: ImportMetaIR, templatePath: NormalizedPath): TemplateImport {
  const namedAliases = imp.namedAliases.map((na) => ({
    exportName: na.exportName,
    alias: na.alias,
    ...(na.asLoc ? { asLoc: na.asLoc } : {}),
  }));

  const file = toSourceFileId(templatePath);

  return {
    moduleSpecifier: imp.from.value,
    resolvedPath: null, // Will be resolved by import resolution phase
    defaultAlias: imp.defaultAlias ?? null,
    namedAliases,
    span: {
      file,
      start: imp.elementLoc.start,
      end: imp.elementLoc.end,
    },
    moduleSpecifierSpan: {
      file,
      start: imp.from.loc.start,
      end: imp.from.loc.end,
    },
  };
}

type P5DocumentFragment = DefaultTreeAdapterMap["documentFragment"];
type P5Node = DefaultTreeAdapterMap["node"];
type P5Element = DefaultTreeAdapterMap["element"];
type P5Template = DefaultTreeAdapterMap["template"];
type ElementLocation = Token.ElementLocation;

function collectLocalTemplateImports(
  node: P5DocumentFragment | P5Element,
  templatePath: NormalizedPath,
  localTemplateName: Located<string> | null,
  out: LocalTemplateImport[],
): void {
  const children = "childNodes" in node ? node.childNodes : [];

  for (const child of children) {
    const element = asElement(child);
    if (!element) continue;

    const tag = element.tagName.toLowerCase();
    const nextLocalTemplateName = resolveLocalTemplateOwner(element, tag, templatePath) ?? localTemplateName;

    if (nextLocalTemplateName && (tag === "import" || tag === "require")) {
      const imported = convertLocalTemplateImport(element, templatePath);
      if (imported) out.push({ localTemplateName: nextLocalTemplateName, import: imported });
    }

    if (element.childNodes) {
      collectLocalTemplateImports(element, templatePath, nextLocalTemplateName, out);
    }

    const template = child as P5Template;
    if (template.content?.childNodes) {
      collectLocalTemplateImports(template.content, templatePath, nextLocalTemplateName, out);
    }
  }
}

function collectLocalTemplateDefinitions(
  node: P5DocumentFragment | P5Element,
  html: string,
  templatePath: NormalizedPath,
  out: LocalTemplateDefinition[],
): void {
  const children = "childNodes" in node ? node.childNodes : [];

  for (const child of children) {
    const element = asElement(child);
    if (!element) continue;

    const tag = element.tagName.toLowerCase();
    if (tag === "template") {
      const localTemplateName = resolveLocalTemplateOwner(element, tag, templatePath);
      if (localTemplateName) {
        const localDefinition = toLocalTemplateDefinition(element, localTemplateName, html, templatePath);
        if (localDefinition) {
          out.push(localDefinition);
        }
      }
    }

    if (element.childNodes) {
      collectLocalTemplateDefinitions(element, html, templatePath, out);
    }

    const template = child as P5Template;
    if (template.content?.childNodes) {
      collectLocalTemplateDefinitions(template.content, html, templatePath, out);
    }
  }
}

function toLocalTemplateDefinition(
  element: P5Element,
  localTemplateName: Located<string>,
  html: string,
  templatePath: NormalizedPath,
): LocalTemplateDefinition | null {
  const location = element.sourceCodeLocation as ElementLocation | undefined;
  if (!location) {
    return null;
  }
  const start = location.startTag?.startOffset ?? location.startOffset ?? 0;
  const end = location.endTag?.endOffset ?? location.endOffset ?? location.startTag?.endOffset ?? start;
  if (end < start) {
    return null;
  }

  const snippet = html.slice(start, end);
  const rawMeta = extractTemplateMeta(snippet, templatePath, { includeLocalTemplateRoots: true });
  const templateMeta = offsetTemplateMeta(rawMeta, start);
  const span = sourceSpanFromElementLocation(location, templatePath);

  return {
    localTemplateName,
    span,
    templateMeta,
  };
}

function offsetTemplateMeta(meta: TemplateMetaIR, offset: number): TemplateMetaIR {
  return {
    imports: meta.imports.map((entry) => ({
      ...entry,
      from: offsetLocated(entry.from, offset),
      defaultAlias: entry.defaultAlias ? offsetLocated(entry.defaultAlias, offset) : null,
      namedAliases: entry.namedAliases.map((namedAlias) => ({
        ...namedAlias,
        exportName: offsetLocated(namedAlias.exportName, offset),
        alias: offsetLocated(namedAlias.alias, offset),
        ...(namedAlias.asLoc !== undefined
          ? { asLoc: namedAlias.asLoc ? offsetSpan(namedAlias.asLoc, offset) : null }
          : {}),
      })),
      elementLoc: offsetSpan(entry.elementLoc, offset),
      tagLoc: offsetSpan(entry.tagLoc, offset),
    })),
    bindables: meta.bindables.map((entry) => ({
      ...entry,
      name: offsetLocated(entry.name, offset),
      mode: entry.mode ? offsetLocated(entry.mode, offset) : null,
      attribute: entry.attribute ? offsetLocated(entry.attribute, offset) : null,
      elementLoc: offsetSpan(entry.elementLoc, offset),
      tagLoc: offsetSpan(entry.tagLoc, offset),
    })),
    shadowDom: meta.shadowDom
      ? {
          ...meta.shadowDom,
          mode: offsetLocated(meta.shadowDom.mode, offset),
          elementLoc: offsetSpan(meta.shadowDom.elementLoc, offset),
          tagLoc: offsetSpan(meta.shadowDom.tagLoc, offset),
        }
      : null,
    aliases: meta.aliases.map((entry) => ({
      ...entry,
      names: entry.names.map((name) => offsetLocated(name, offset)),
      elementLoc: offsetSpan(entry.elementLoc, offset),
      tagLoc: offsetSpan(entry.tagLoc, offset),
    })),
    containerless: meta.containerless
      ? {
          ...meta.containerless,
          elementLoc: offsetSpan(meta.containerless.elementLoc, offset),
          tagLoc: offsetSpan(meta.containerless.tagLoc, offset),
        }
      : null,
    capture: meta.capture
      ? {
          ...meta.capture,
          elementLoc: offsetSpan(meta.capture.elementLoc, offset),
          tagLoc: offsetSpan(meta.capture.tagLoc, offset),
        }
      : null,
    hasSlot: meta.hasSlot,
  };
}

function resolveLocalTemplateOwner(
  element: P5Element,
  tag: string,
  templatePath: NormalizedPath,
): Located<string> | null {
  if (tag !== "template") return null;
  const asCustomElement = element.attrs?.find((attr) => attr.name === "as-custom-element");
  if (!asCustomElement) return null;
  const location = element.sourceCodeLocation as ElementLocation | undefined;
  const loc = sourceSpanFromAttrLocation(
    location?.attrs?.["as-custom-element"],
    sourceSpanFromElementLocation(location, templatePath),
    templatePath,
  );
  return createLocated(asCustomElement.value, loc);
}

function asElement(node: P5Node): P5Element | null {
  return typeof (node as Partial<P5Element>).tagName === "string" ? (node as P5Element) : null;
}

function convertLocalTemplateImport(
  element: P5Element,
  templatePath: NormalizedPath,
): TemplateImport | null {
  const fromAttr = element.attrs?.find((attr) => attr.name === "from");
  if (!fromAttr) {
    return null;
  }

  const location = element.sourceCodeLocation as ElementLocation | undefined;
  const elementSpan = sourceSpanFromElementLocation(location, templatePath);
  const moduleSpecifierSpan = sourceSpanFromAttrLocation(location?.attrs?.["from"], elementSpan, templatePath);

  const defaultAliasAttr = element.attrs?.find((attr) => attr.name === "as");
  const defaultAlias = defaultAliasAttr
    ? createLocated(defaultAliasAttr.value, sourceSpanFromAttrLocation(location?.attrs?.["as"], elementSpan, templatePath))
    : null;

  const namedAliases = (element.attrs ?? [])
    .filter((attr) => attr.name.endsWith(".as") && attr.name !== ".as")
    .map((attr) => {
      const attrSpan = sourceSpanFromAttrLocation(location?.attrs?.[attr.name], elementSpan, templatePath);
      const exportName = attr.name.slice(0, -3);
      return {
        exportName: createLocated(exportName, spanPrefix(attrSpan, exportName.length)),
        alias: createLocated(attr.value, attrSpan),
        asLoc: spanSlice(attrSpan, exportName.length, exportName.length + 3),
      };
    });

  return {
    moduleSpecifier: fromAttr.value,
    resolvedPath: null,
    defaultAlias,
    namedAliases,
    span: elementSpan,
    moduleSpecifierSpan,
  };
}

function createLocated<T extends string>(value: T, loc: SourceSpan): Located<T> {
  return { value, loc };
}

function offsetLocated<T extends string>(value: Located<T>, offset: number): Located<T> {
  return {
    ...value,
    loc: offsetSpan(value.loc, offset),
  };
}

function offsetSpan(span: SourceSpan, offset: number): SourceSpan {
  return {
    file: span.file,
    start: span.start + offset,
    end: span.end + offset,
  };
}

function sourceSpanFromElementLocation(
  loc: ElementLocation | undefined,
  templatePath: NormalizedPath,
): SourceSpan {
  const file = toSourceFileId(templatePath);
  if (!loc) {
    return { file, start: 0, end: 0 };
  }
  const start = loc.startTag?.startOffset ?? loc.startOffset ?? 0;
  const end = loc.endTag?.endOffset ?? loc.startTag?.endOffset ?? loc.endOffset ?? start;
  return { file, start, end };
}

function sourceSpanFromAttrLocation(
  loc: Token.Location | undefined,
  fallback: SourceSpan,
  templatePath: NormalizedPath,
): SourceSpan {
  if (!loc) {
    return fallback;
  }
  return {
    file: toSourceFileId(templatePath),
    start: loc.startOffset,
    end: loc.endOffset,
  };
}

function spanPrefix(span: SourceSpan, length: number): SourceSpan {
  const boundedLength = Math.max(0, Math.min(length, span.end - span.start));
  return {
    file: span.file,
    start: span.start,
    end: span.start + boundedLength,
  };
}

function spanSlice(span: SourceSpan, startOffset: number, endOffset: number): SourceSpan {
  const absoluteStart = span.start + Math.max(0, startOffset);
  const absoluteEnd = span.start + Math.max(startOffset, endOffset);
  return {
    file: span.file,
    start: Math.min(absoluteStart, span.end),
    end: Math.min(absoluteEnd, span.end),
  };
}

/**
 * Resolve module specifiers in template imports to file paths.
 *
 * Uses TypeScript's module resolution to resolve relative and package imports.
 *
 * @param imports - Template import facts to resolve
 * @param templatePath - Path to the template file (base for relative imports)
 * @param resolveModule - Function to resolve module specifier to file path
 * @returns Template import facts with resolvedPath populated
 */
export function resolveTemplateImportPaths(
  imports: readonly TemplateImport[],
  templatePath: NormalizedPath,
  resolveModule: (specifier: string, fromFile: NormalizedPath) => NormalizedPath | null,
): TemplateImport[] {
  return imports.map((imp) => {
    const resolvedPath = resolveModule(imp.moduleSpecifier, templatePath);
    return {
      ...imp,
      resolvedPath,
    };
  });
}

/**
 * Get all template imports from a component's sibling template.
 *
 * Convenience function that combines extraction with sibling detection.
 *
 * @param componentPath - Path to the component source file
 * @param siblingTemplatePath - Path to the sibling template file (if known)
 * @param fileSystem - File system context
 * @returns Template import facts, or empty array if no template
 */
export function extractComponentTemplateImports(
  componentPath: NormalizedPath,
  siblingTemplatePath: NormalizedPath | undefined,
  fileSystem: FileSystemContext,
): TemplateImport[] {
  if (!siblingTemplatePath) {
    return [];
  }

  return extractTemplateImports(siblingTemplatePath, fileSystem);
}
