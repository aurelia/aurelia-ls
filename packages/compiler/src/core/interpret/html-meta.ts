/**
 * HTML Meta Element Processing — Convention-Paired Template Preprocessing
 *
 * When a convention-recognized CE has a paired HTML file, this module
 * parses the HTML and extracts meta elements:
 * - <bindable property="..." attribute="..." mode="...">
 * - <containerless>
 * - <use-shadow-dom mode="open|closed">
 * - <capture>
 * - <template as-custom-element="..."> (local templates)
 *
 * Produces additional observations on the same resourceKey as the TS
 * convention resource, or new resources for local templates.
 *
 * Simple regex-based HTML parsing — no DOM parser needed for these
 * well-structured meta elements.
 */

import ts from 'typescript';
import type { NormalizedPath } from '../../model/identity.js';
import type { InterpreterConfig } from './interpreter.js';
import type { GreenValue } from '../../value/green.js';
import type { Sourced } from '../../value/sourced.js';
import { InternPool } from '../../value/intern.js';
import { evaluationNodeId, type ProjectDepNodeId } from '../graph/types.js';

const internPool = new InternPool();

/**
 * Check for a paired HTML file and extract meta element observations.
 */
export function extractHtmlMetaObservations(
  sf: ts.SourceFile,
  filePath: NormalizedPath,
  config: InterpreterConfig,
  _checker: ts.TypeChecker,
): void {
  // Only process .ts files that might have convention-paired HTML
  if (!filePath.endsWith('.ts')) return;

  const htmlPath = filePath.replace(/\.ts$/, '.html') as NormalizedPath;

  // Check if the HTML file exists in the program's file system
  const htmlContent = readHtmlFile(htmlPath, config);
  if (!htmlContent) return;

  // Record dependency on the HTML file
  config.graph.tracer.readFile(htmlPath);

  // Find the convention resource key for this file
  const baseName = extractFileBaseName(filePath);
  if (!baseName) return;

  // Parse meta elements from the HTML content
  const metas = parseHtmlMetaElements(htmlContent);

  // Find the class name from the TS file (for className observation on local templates)
  const className = findConventionClassName(sf);

  // Process top-level meta elements (apply to the convention CE)
  const conventionKey = `custom-element:${baseName}`;
  const evalNode = evaluationNodeId(filePath, className ?? baseName);

  for (const meta of metas.topLevel) {
    emitMetaObservation(config, conventionKey, meta, evalNode);
  }

  // Process <import from="..."> elements — local registrations via template import
  if (metas.imports.length > 0) {
    const importRefs = metas.imports.map(imp => imp.from);
    const green = internPool.intern({
      kind: 'array',
      elements: importRefs.map(ref => ({ kind: 'literal' as const, value: ref })),
    });
    const red: Sourced<unknown> = { origin: 'source', state: 'known', value: importRefs };

    config.graph.observations.registerObservation(
      conventionKey,
      'template-imports',
      { tier: 'analysis-explicit', form: 'import-element' },
      green,
      red,
      evalNode,
    );
  }

  // Process local templates
  for (const local of metas.localTemplates) {
    const localKey = `custom-element:${local.name}`;
    const localEvalNode = evaluationNodeId(filePath, `local:${local.name}`);

    // Emit identity for the local CE
    emitRawObservation(config, localKey, 'name', local.name, localEvalNode, 'local-template');
    emitRawObservation(config, localKey, 'className', className ?? baseName, localEvalNode, 'local-template');
    emitRawObservation(config, localKey, 'kind', 'custom-element', localEvalNode, 'local-template');

    // Emit meta elements scoped to the local template
    for (const meta of local.metas) {
      emitMetaObservation(config, localKey, meta, localEvalNode, 'local-template');
    }
  }
}

// =============================================================================
// HTML Parsing
// =============================================================================

interface MetaElement {
  kind: 'bindable' | 'containerless' | 'use-shadow-dom' | 'capture';
  attrs: Record<string, string>;
}

interface LocalTemplate {
  name: string;
  metas: MetaElement[];
}

interface TemplateImportElement {
  from: string;
}

interface ParsedHtmlMeta {
  topLevel: MetaElement[];
  localTemplates: LocalTemplate[];
  imports: TemplateImportElement[];
}

function parseHtmlMetaElements(html: string): ParsedHtmlMeta {
  const topLevel: MetaElement[] = [];
  const localTemplates: LocalTemplate[] = [];
  const imports: TemplateImportElement[] = [];

  // Find local templates first and extract their content
  const localRegex = /<template\s+as-custom-element="([^"]+)"[^>]*>([\s\S]*?)<\/template>/g;
  const localRanges: Array<{ start: number; end: number }> = [];
  let localMatch;

  while ((localMatch = localRegex.exec(html)) !== null) {
    const name = localMatch[1]!;
    const innerContent = localMatch[2]!;
    localRanges.push({ start: localMatch.index, end: localMatch.index + localMatch[0].length });

    const metas = extractMetaElementsFromContent(innerContent);
    localTemplates.push({ name, metas });
  }

  // Extract top-level content (outside local templates)
  let topLevelHtml = html;
  for (const range of localRanges.reverse()) {
    topLevelHtml = topLevelHtml.slice(0, range.start) + topLevelHtml.slice(range.end);
  }

  topLevel.push(...extractMetaElementsFromContent(topLevelHtml));

  // Extract <import> elements from top-level content
  // <import from="./path"> or <import from="./path"></import> or <import from="./path"/>
  const importRegex = /<import\s+from\s*=\s*"([^"]+)"\s*(?:\/>|><\/import>|>)/g;
  let importMatch;
  while ((importMatch = importRegex.exec(topLevelHtml)) !== null) {
    imports.push({ from: importMatch[1]! });
  }

  return { topLevel, localTemplates, imports };
}

function extractMetaElementsFromContent(content: string): MetaElement[] {
  const metas: MetaElement[] = [];

  // <bindable property="..." attribute="..." mode="...">
  const bindableRegex = /<bindable\s+([^>]*?)(?:\/>|><\/bindable>|>)/g;
  let match;
  while ((match = bindableRegex.exec(content)) !== null) {
    const attrs = parseAttributes(match[1]!);
    metas.push({ kind: 'bindable', attrs });
  }

  // <containerless> or <containerless/>
  if (/<containerless\s*(?:\/>|><\/containerless>|>)/i.test(content)) {
    metas.push({ kind: 'containerless', attrs: {} });
  }

  // <use-shadow-dom> or <use-shadow-dom mode="closed">
  const shadowMatch = /<use-shadow-dom\s*([^>]*?)(?:\/>|><\/use-shadow-dom>|>)/i.exec(content);
  if (shadowMatch) {
    const attrs = parseAttributes(shadowMatch[1] ?? '');
    metas.push({ kind: 'use-shadow-dom', attrs });
  }

  // <capture> or <capture/>
  if (/<capture\s*(?:\/>|><\/capture>|>)/i.test(content)) {
    metas.push({ kind: 'capture', attrs: {} });
  }

  return metas;
}

function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const regex = /(\w[\w-]*)(?:\s*=\s*"([^"]*)")?/g;
  let match;
  while ((match = regex.exec(attrString)) !== null) {
    attrs[match[1]!] = match[2] ?? '';
  }
  return attrs;
}

// =============================================================================
// Observation Emission
// =============================================================================

function emitMetaObservation(
  config: InterpreterConfig,
  resourceKey: string,
  meta: MetaElement,
  evalNode: ProjectDepNodeId,
  form: string = 'convention',
): void {
  switch (meta.kind) {
    case 'bindable': {
      const property = meta.attrs['property'];
      if (!property) return;
      const prefix = `bindable:${property}`;
      emitRawObservation(config, resourceKey, `${prefix}:property`, property, evalNode, form);
      if (meta.attrs['attribute']) {
        emitRawObservation(config, resourceKey, `${prefix}:attribute`, meta.attrs['attribute'], evalNode, form);
      }
      if (meta.attrs['mode']) {
        emitRawObservation(config, resourceKey, `${prefix}:mode`, meta.attrs['mode'], evalNode, form);
      }
      break;
    }
    case 'containerless':
      emitRawObservation(config, resourceKey, 'containerless', true, evalNode, form);
      break;
    case 'use-shadow-dom': {
      const mode = meta.attrs['mode'] === 'closed' ? 'closed' : 'open';
      emitRawObservation(config, resourceKey, 'shadowOptions', { mode }, evalNode, form);
      break;
    }
    case 'capture':
      emitRawObservation(config, resourceKey, 'capture', true, evalNode, form);
      break;
  }
}

function emitRawObservation(
  config: InterpreterConfig,
  resourceKey: string,
  fieldPath: string,
  value: unknown,
  evalNode: ProjectDepNodeId,
  form: string,
): void {
  const green = internPool.intern(valueToGreen(value));
  const red: Sourced<unknown> = { origin: 'source', state: 'known', value };

  config.graph.observations.registerObservation(
    resourceKey,
    fieldPath,
    { tier: 'analysis-convention', form },
    green,
    red,
    evalNode,
  );
}

function valueToGreen(value: unknown): GreenValue {
  if (value === null || value === undefined || typeof value === 'string' ||
      typeof value === 'number' || typeof value === 'boolean') {
    return { kind: 'literal', value: value as string | number | boolean | null | undefined };
  }
  if (Array.isArray(value)) {
    return { kind: 'array', elements: value.map(valueToGreen) };
  }
  if (typeof value === 'object') {
    const props = new Map<string, GreenValue>();
    for (const [k, v] of Object.entries(value)) {
      props.set(k, valueToGreen(v));
    }
    return { kind: 'object', properties: props, methods: new Map() };
  }
  return { kind: 'unknown', reasonKind: 'unsupported-value' };
}

// =============================================================================
// Helpers
// =============================================================================

function readHtmlFile(path: NormalizedPath, config: InterpreterConfig): string | null {
  // Try the config's readFile first (supports in-memory fixtures)
  if (config.readFile) {
    const content = config.readFile(path);
    if (content !== undefined) return content;
  }
  // Fallback: try ts.sys
  if (ts.sys?.readFile) {
    const content = ts.sys.readFile(path);
    if (content !== undefined) return content;
  }
  return null;
}

function extractFileBaseName(filePath: NormalizedPath): string | null {
  const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  const fileName = lastSlash >= 0 ? filePath.slice(lastSlash + 1) : filePath;
  const dotIdx = fileName.lastIndexOf('.');
  return dotIdx > 0 ? fileName.slice(0, dotIdx) : null;
}

function findConventionClassName(sf: ts.SourceFile): string | null {
  for (const stmt of sf.statements) {
    if (ts.isClassDeclaration(stmt) && stmt.name) {
      return stmt.name.text;
    }
  }
  return null;
}
