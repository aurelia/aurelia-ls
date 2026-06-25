import type { KernelStore } from '../kernel/store.js';
import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type {
  HtmlElement,
} from '../template/html-ir.js';
import {
  HtmlIrNodeKind,
} from '../template/html-ir.js';
import {
  describeAddress,
  semanticSourceReferenceMatchesFilePath,
  type SemanticSourceReference,
} from './source-reference.js';
import {
  SemanticRuntimeDetail,
  SemanticTemplateFoldingRangeKind,
  type SemanticTemplateFoldingRangeRow,
} from './contracts.js';

type TemplateResourceEmission = AureliaAppWorldProjectEmission['templates']['resources'][number];

export function readTemplateFoldingRangeRows(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  sourceFile: string | null,
  detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}`,
): readonly SemanticTemplateFoldingRangeRow[] {
  const handles = detail === SemanticRuntimeDetail.Handles;
  return uniqueTemplateFoldingRangeRows([
    ...emission.templates.resources,
    ...emission.templates.authoringResources,
  ].flatMap((resource) => templateResourceFoldingRangeRows(store, resource, handles)))
    .filter((row) =>
      sourceFile == null || semanticSourceReferenceMatchesFilePath(row.source, sourceFile)
    )
    .sort(compareTemplateFoldingRangeRows);
}

function templateResourceFoldingRangeRows(
  store: KernelStore,
  resource: TemplateResourceEmission,
  handles: boolean,
): readonly SemanticTemplateFoldingRangeRow[] {
  return resource.compilation.html.nodes
    .filter((node): node is HtmlElement => node.nodeKind === HtmlIrNodeKind.Element)
    .map((element) => templateElementFoldingRangeRow(store, resource, element, handles))
    .filter((row): row is SemanticTemplateFoldingRangeRow => row != null);
}

function templateElementFoldingRangeRow(
  store: KernelStore,
  resource: TemplateResourceEmission,
  element: HtmlElement,
  handles: boolean,
): SemanticTemplateFoldingRangeRow | null {
  const source = exactSourceReference(describeAddress(store, element.sourceAddressHandle));
  if (source?.start == null || source.end == null) {
    return null;
  }

  const templateSource = exactSourceReference(describeAddress(store, resource.compilation.unit.templateSource.sourceAddressHandle));
  const markup = resource.compilation.unit.templateSource.markup;
  if (markup == null || !sourceHasMultilineMarkup(source, templateSource, markup)) {
    return null;
  }

  return {
    foldKind: SemanticTemplateFoldingRangeKind.Element,
    definitionName: resource.compilation.definition.name,
    tagName: element.tagName,
    childCount: element.children.length,
    selfClosing: element.selfClosing,
    source,
    ...(handles ? {
      handles: {
        elementProductHandle: element.productHandle,
        sourceAddressHandle: element.sourceAddressHandle,
      },
    } : {}),
  };
}

function sourceHasMultilineMarkup(
  source: SemanticSourceReference,
  templateSource: SemanticSourceReference | null,
  markup: string,
): boolean {
  if (source.start == null || source.end == null) {
    return false;
  }
  const baseStart = templateSource?.start ?? 0;
  const localStart = source.start - baseStart;
  const localEnd = source.end - baseStart;
  if (localStart < 0 || localEnd > markup.length || localStart >= localEnd) {
    return false;
  }
  return /[\r\n]/u.test(markup.slice(localStart, localEnd));
}

function exactSourceReference(
  source: SemanticSourceReference | null,
): SemanticSourceReference | null {
  if (source == null) {
    return null;
  }
  if (source.start != null && source.end != null) {
    return source;
  }
  return exactSourceReference(source.anchor ?? null);
}

function uniqueTemplateFoldingRangeRows(
  rows: readonly SemanticTemplateFoldingRangeRow[],
): readonly SemanticTemplateFoldingRangeRow[] {
  const seen = new Set<string>();
  const unique: SemanticTemplateFoldingRangeRow[] = [];
  for (const row of rows) {
    const source = exactSourceReference(row.source);
    if (source?.start == null || source.end == null) {
      continue;
    }
    const key = [
      source.path ?? '',
      source.start,
      source.end,
      row.foldKind,
      row.tagName,
    ].join(':');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push({
      ...row,
      source,
    });
  }
  return unique;
}

function compareTemplateFoldingRangeRows(
  left: SemanticTemplateFoldingRangeRow,
  right: SemanticTemplateFoldingRangeRow,
): number {
  return (left.source?.path ?? '').localeCompare(right.source?.path ?? '')
    || (left.source?.start ?? -1) - (right.source?.start ?? -1)
    || (left.source?.end ?? -1) - (right.source?.end ?? -1)
    || left.definitionName.localeCompare(right.definitionName)
    || left.tagName.localeCompare(right.tagName);
}
