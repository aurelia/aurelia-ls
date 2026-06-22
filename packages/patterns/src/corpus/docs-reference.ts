import type {
  CodeFence,
  DocsCorpus,
  MarkdownDocument,
  MarkdownSection
} from './corpus-types.js';
import { sourceUnitsForDocument } from './source-units.js';

export interface AureliaDocsPageInput {
  readonly size?: number | null;
  readonly cursor?: string | null;
}

export interface AureliaDocsSearchInput {
  readonly query: string;
  readonly page?: AureliaDocsPageInput | null;
  readonly documentPathPrefix?: string | null;
}

export interface AureliaDocsSearchResult {
  readonly query: string;
  readonly corpus: AureliaDocsCorpusSummary;
  readonly page: AureliaDocsPage;
  readonly items: readonly AureliaDocsSearchItem[];
}

export interface AureliaDocsCorpusSummary {
  readonly rootDir: string;
  readonly markdownDocumentCount: number;
}

export interface AureliaDocsPage {
  readonly size: number;
  readonly returnedRows: number;
  readonly cursor?: string;
  readonly nextCursor?: string;
}

export interface AureliaDocsSearchItem {
  readonly documentPath: string;
  readonly title: string;
  readonly heading?: string;
  readonly headingPath: readonly string[];
  readonly sectionAnchor?: string;
  readonly officialUrl: string;
  readonly snippet: string;
  readonly score: number;
}

export interface AureliaDocsFetchInput {
  readonly documentPath: string;
  readonly sectionAnchor?: string | null;
  readonly maxChars?: number | null;
}

export interface AureliaDocsFetchResult {
  readonly documentPath: string;
  readonly title: string;
  readonly officialUrl: string;
  readonly mode: 'document' | 'section';
  readonly maxChars: number;
  readonly truncated: boolean;
  readonly cautions: readonly string[];
  readonly availableSections: readonly AureliaDocsSectionSummary[];
  readonly sections: readonly AureliaDocsFetchedSection[];
}

export interface AureliaDocsSectionSummary {
  readonly heading?: string;
  readonly headingPath: readonly string[];
  readonly sectionAnchor?: string;
  readonly officialUrl: string;
}

export interface AureliaDocsFetchedSection extends AureliaDocsSectionSummary {
  readonly startLine: number;
  readonly endLine: number;
  readonly prose: string;
  readonly codeFences: readonly AureliaDocsFetchedCodeFence[];
  readonly truncated: boolean;
}

export interface AureliaDocsFetchedCodeFence {
  readonly language: string;
  readonly title?: string;
  readonly code: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly truncated: boolean;
}

interface DocsSearchEntry {
  readonly document: MarkdownDocument;
  readonly section: MarkdownSection;
  readonly title: string;
  readonly sectionAnchor?: string;
  readonly text: string;
  readonly codeText: string;
  readonly signalNames: readonly string[];
}

const DEFAULT_SEARCH_PAGE_SIZE = 8;
const MAX_SEARCH_PAGE_SIZE = 20;
const DEFAULT_FETCH_MAX_CHARS = 6000;
const MAX_FETCH_MAX_CHARS = 12000;
const MIN_FETCH_MAX_CHARS = 1000;

export function searchAureliaDocs(
  corpus: DocsCorpus,
  input: AureliaDocsSearchInput
): AureliaDocsSearchResult {
  const query = input.query.trim();
  if (query.length === 0) {
    throw new Error('Aurelia docs search requires a non-empty query.');
  }

  const tokens = tokenize(query);
  const page = normalizePage(input.page);
  const documentPathPrefix = normalizePathPrefix(input.documentPathPrefix);
  const entries = (tokens.length === 0 ? [] : buildDocsSearchEntries(corpus)
    .filter((entry) => !isSearchExcludedEntry(entry))
    .filter((entry) => documentPathPrefix === undefined || entry.document.relativePath.startsWith(documentPathPrefix))
    .map((entry) => scoreEntry(entry, query, tokens))
    .filter((scored) => scored.score > 0)
    .sort((left, right) =>
      right.score - left.score ||
      left.entry.document.relativePath.localeCompare(right.entry.document.relativePath) ||
      left.entry.section.startLine - right.entry.section.startLine
    ));
  const startIndex = cursorToStartIndex(page.cursor);
  const pageItems = entries.slice(startIndex, startIndex + page.size);
  const nextIndex = startIndex + pageItems.length;

  return {
    query,
    corpus: {
      rootDir: corpus.rootDir,
      markdownDocumentCount: searchableDocumentCount(corpus)
    },
    page: {
      size: page.size,
      returnedRows: pageItems.length,
      ...(page.cursor !== undefined ? { cursor: page.cursor } : {}),
      ...(page.size > 0 && nextIndex < entries.length ? { nextCursor: `after:${nextIndex - 1}` } : {})
    },
    items: pageItems.map(({ entry, score }) => ({
      documentPath: entry.document.relativePath,
      title: entry.title,
      ...(entry.section.heading !== undefined ? { heading: entry.section.heading } : {}),
      headingPath: entry.section.headingPath,
      ...(entry.sectionAnchor !== undefined ? { sectionAnchor: entry.sectionAnchor } : {}),
      officialUrl: officialAureliaDocsUrl(entry.document.relativePath, entry.sectionAnchor),
      snippet: makeSnippet(entry.text.length > 0 ? entry.text : entry.codeText, tokens),
      score
    }))
  };
}

export function fetchAureliaDocs(
  corpus: DocsCorpus,
  input: AureliaDocsFetchInput
): AureliaDocsFetchResult {
  const document = corpus.markdownDocuments.find((candidate) => candidate.relativePath === input.documentPath);
  if (document === undefined || document.relativePath === 'TOC.md') {
    throw new Error(`Unknown Aurelia docs documentPath '${input.documentPath}'. Use aurelia_docs_search first.`);
  }

  const maxChars = normalizeMaxChars(input.maxChars);
  const requestedAnchor = input.sectionAnchor?.trim();
  const availableSections = document.sections.map((section) => sectionSummary(document.relativePath, section));
  const selectedSections = requestedAnchor == null || requestedAnchor.length === 0
    ? document.sections
    : sectionsForAnchor(document, requestedAnchor);

  if (selectedSections.length === 0) {
    const anchors = availableSections
      .map((section) => section.sectionAnchor)
      .filter((anchor): anchor is string => anchor !== undefined)
      .slice(0, 20)
      .join(', ');
    throw new Error(`Unknown sectionAnchor '${requestedAnchor}' for ${document.relativePath}. Available anchors include: ${anchors}`);
  }

  const budget = { remaining: maxChars, truncated: false };
  const fetchedSections: AureliaDocsFetchedSection[] = [];

  for (const section of selectedSections) {
    if (budget.remaining <= 0) {
      budget.truncated = true;
      break;
    }
    fetchedSections.push(fetchSection(document, section, budget));
    if (requestedAnchor != null && requestedAnchor.length > 0) {
      break;
    }
  }

  return {
    documentPath: document.relativePath,
    title: document.title ?? document.relativePath,
    officialUrl: officialAureliaDocsUrl(document.relativePath, requestedAnchor ?? undefined),
    mode: requestedAnchor == null || requestedAnchor.length === 0 ? 'document' : 'section',
    maxChars,
    truncated: budget.truncated,
    cautions: cautionsForDocument(document.relativePath),
    availableSections,
    sections: fetchedSections
  };
}

export function officialAureliaDocsUrl(documentPath: string, sectionAnchor?: string): string {
  const withoutExtension = documentPath.replace(/\.md$/i, '');
  const routePath = withoutExtension
    .replace(/(?:^|\/)README$/i, '')
    .replace(/\/index$/i, '');
  const encodedPath = routePath
    .split('/')
    .filter((part) => part.length > 0)
    .map(encodeURIComponent)
    .join('/');
  const base = `https://docs.aurelia.io/${encodedPath}`;
  return sectionAnchor === undefined || sectionAnchor.length === 0
    ? base
    : `${base}#${encodeURIComponent(sectionAnchor)}`;
}

export function aureliaDocsSectionAnchor(section: Pick<MarkdownSection, 'heading'>): string | undefined {
  if (section.heading === undefined) {
    return undefined;
  }
  const stripped = section.heading
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return stripped.length > 0 ? stripped : undefined;
}

function buildDocsSearchEntries(corpus: DocsCorpus): readonly DocsSearchEntry[] {
  const entries: DocsSearchEntry[] = [];

  for (const document of corpus.markdownDocuments) {
    if (document.relativePath === 'TOC.md') {
      continue;
    }

    const sourceUnits = sourceUnitsForDocument(document);
    const signalsBySection = new Map<string, string[]>();
    const codeBySection = new Map<string, string[]>();

    for (const sourceUnit of sourceUnits) {
      const signals = signalsBySection.get(sourceUnit.sectionId) ?? [];
      signals.push(...sourceUnit.signals.map((signal) => signal.name));
      signalsBySection.set(sourceUnit.sectionId, signals);

      const code = codeBySection.get(sourceUnit.sectionId) ?? [];
      code.push(sourceUnit.sourceText);
      codeBySection.set(sourceUnit.sectionId, code);
    }

    for (const section of document.sections) {
      entries.push({
        document,
        section,
        title: document.title ?? document.relativePath,
        ...(aureliaDocsSectionAnchor(section) !== undefined ? { sectionAnchor: aureliaDocsSectionAnchor(section) } : {}),
        text: [
          document.relativePath,
          document.title ?? '',
          ...document.navigationNodes.map((node) => node.title),
          ...section.headingPath,
          section.prose
        ].join('\n'),
        codeText: (codeBySection.get(section.sectionId) ?? []).join('\n'),
        signalNames: Array.from(new Set(signalsBySection.get(section.sectionId) ?? [])).sort()
      });
    }
  }

  return entries;
}

function scoreEntry(
  entry: DocsSearchEntry,
  query: string,
  tokens: readonly string[]
): { entry: DocsSearchEntry; score: number } {
  const normalizedQuery = normalizeSearchText(query);
  const titleText = normalizeSearchText(entry.title);
  const pathText = normalizeSearchText(entry.document.relativePath);
  const headingText = normalizeSearchText(entry.section.headingPath.join(' '));
  const proseText = normalizeSearchText(entry.section.prose);
  const codeText = normalizeSearchText(entry.codeText);
  const signalText = normalizeSearchText(entry.signalNames.join(' '));
  let score = 0;

  if (normalizedQuery.length > 0) {
    if (titleText.includes(normalizedQuery)) score += 30;
    if (headingText.includes(normalizedQuery)) score += 28;
    if (pathText.includes(normalizedQuery)) score += 18;
    if (proseText.includes(normalizedQuery)) score += 14;
    if (codeText.includes(normalizedQuery)) score += 10;
  }

  for (const token of tokens) {
    if (titleText.includes(token)) score += 10;
    if (headingText.includes(token)) score += 9;
    if (pathText.includes(token)) score += 7;
    if (proseText.includes(token)) score += 4;
    if (codeText.includes(token)) score += 3;
    if (signalText.includes(token)) score += 5;
  }

  score += docsSurfacePrior(entry.document.relativePath, tokens);

  if (score > 0 && entry.section.headingDepth === 1) {
    score += 1;
  }
  if (score > 0 && entry.section.codeFenceIds.length > 0) {
    score += 1;
  }

  return { entry, score };
}

function docsSurfacePrior(documentPath: string, tokens: readonly string[]): number {
  if (tokens.some((token) => token === 'test' || token === 'tests' || token === 'testing' || token === 'spec')) {
    return 0;
  }
  if (tokens.some((token) => /^aur\d{4}$/.test(token) || token === 'error' || token === 'diagnostic')) {
    return 0;
  }
  if (documentPath.startsWith('developer-guides/testing/')) {
    return -18;
  }
  if (documentPath.startsWith('developer-guides/error-messages/')) {
    return -16;
  }
  return 0;
}

function fetchSection(
  document: MarkdownDocument,
  section: MarkdownSection,
  budget: { remaining: number; truncated: boolean }
): AureliaDocsFetchedSection {
  const summary = sectionSummary(document.relativePath, section);
  const prose = takeFromBudget(section.prose, budget);
  const codeFences: AureliaDocsFetchedCodeFence[] = [];
  const fencesById = new Map(document.codeFences.map((fence) => [fence.fenceId, fence]));

  for (const fenceId of section.codeFenceIds) {
    const fence = fencesById.get(fenceId);
    if (fence === undefined) {
      continue;
    }
    codeFences.push(fetchCodeFence(fence, budget));
  }

  return {
    ...summary,
    startLine: section.startLine,
    endLine: section.endLine,
    prose,
    codeFences,
    truncated: budget.truncated
  };
}

function fetchCodeFence(
  fence: CodeFence,
  budget: { remaining: number; truncated: boolean }
): AureliaDocsFetchedCodeFence {
  const code = takeFromBudget(fence.code, budget);
  return {
    language: fence.language,
    ...(fence.title !== undefined ? { title: fence.title } : {}),
    code,
    startLine: fence.startLine,
    endLine: fence.endLine,
    truncated: code.length < fence.code.length
  };
}

function sectionSummary(documentPath: string, section: MarkdownSection): AureliaDocsSectionSummary {
  const sectionAnchor = aureliaDocsSectionAnchor(section);
  return {
    ...(section.heading !== undefined ? { heading: section.heading } : {}),
    headingPath: section.headingPath,
    ...(sectionAnchor !== undefined ? { sectionAnchor } : {}),
    officialUrl: officialAureliaDocsUrl(documentPath, sectionAnchor)
  };
}

function sectionsForAnchor(document: MarkdownDocument, sectionAnchor: string): readonly MarkdownSection[] {
  return document.sections.filter((section) => aureliaDocsSectionAnchor(section) === sectionAnchor);
}

function cautionsForDocument(documentPath: string): readonly string[] {
  if (isRouterDirectDocument(documentPath)) {
    return ['router-direct is permanently excluded from Aurelia Patterns; prefer current @aurelia/router docs for new app guidance.'];
  }
  return [];
}

function normalizePage(page: AureliaDocsPageInput | null | undefined): { size: number; cursor?: string } {
  const requestedSize = page?.size ?? DEFAULT_SEARCH_PAGE_SIZE;
  const size = Math.min(Math.max(requestedSize, 0), MAX_SEARCH_PAGE_SIZE);
  return {
    size,
    ...(page?.cursor != null && page.cursor.length > 0 ? { cursor: page.cursor } : {})
  };
}

function normalizeMaxChars(maxChars: number | null | undefined): number {
  if (maxChars == null) {
    return DEFAULT_FETCH_MAX_CHARS;
  }
  return Math.min(Math.max(Math.floor(maxChars), MIN_FETCH_MAX_CHARS), MAX_FETCH_MAX_CHARS);
}

function cursorToStartIndex(cursor: string | undefined): number {
  if (cursor === undefined) {
    return 0;
  }
  const match = cursor.match(/^after:(\d+)$/);
  if (match === null) {
    return 0;
  }
  return Number.parseInt(match[1]!, 10) + 1;
}

function searchableDocumentCount(corpus: DocsCorpus): number {
  return corpus.markdownDocuments.filter((document) =>
    document.relativePath !== 'TOC.md' && !isSearchExcludedDocument(document.relativePath)
  ).length;
}

function isSearchExcludedDocument(documentPath: string): boolean {
  return isRouterDirectDocument(documentPath);
}

function isSearchExcludedEntry(entry: DocsSearchEntry): boolean {
  if (isSearchExcludedDocument(entry.document.relativePath)) {
    return true;
  }
  const text = `${entry.title} ${entry.section.heading ?? ''} ${entry.section.headingPath.join(' ')} ${entry.text} ${entry.codeText}`.toLowerCase();
  return entry.signalNames.includes('router-direct') ||
    text.includes('@aurelia/router-direct') ||
    text.includes('router-direct');
}

function isRouterDirectDocument(documentPath: string): boolean {
  return /(?:^|\/)router-direct(?:\/|\.md$)/.test(documentPath);
}

function normalizePathPrefix(prefix: string | null | undefined): string | undefined {
  if (prefix == null || prefix.trim().length === 0) {
    return undefined;
  }
  return prefix.trim().replace(/\\/g, '/').replace(/^\/+/, '');
}

function makeSnippet(text: string, tokens: readonly string[], maxLength = 280): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= maxLength) {
    return compact;
  }

  const lower = compact.toLowerCase();
  const firstHit = tokens
    .map((token) => lower.indexOf(token))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0] ?? 0;
  const start = Math.max(0, firstHit - 80);
  const end = Math.min(compact.length, start + maxLength);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < compact.length ? '...' : '';
  return `${prefix}${compact.slice(start, end).trim()}${suffix}`;
}

function takeFromBudget(text: string, budget: { remaining: number; truncated: boolean }): string {
  if (budget.remaining <= 0 || text.length === 0) {
    budget.truncated = budget.truncated || text.length > 0;
    return '';
  }
  if (text.length <= budget.remaining) {
    budget.remaining -= text.length;
    return text;
  }
  const slice = text.slice(0, budget.remaining);
  budget.remaining = 0;
  budget.truncated = true;
  return slice;
}

function tokenize(query: string): readonly string[] {
  return Array.from(new Set(
    normalizeSearchText(query)
      .match(/[a-z0-9_@:.#-]+/g)
      ?.filter((token) => token.length >= 2) ?? []
  ));
}

function normalizeSearchText(text: string): string {
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[^a-z0-9_@:.#-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
