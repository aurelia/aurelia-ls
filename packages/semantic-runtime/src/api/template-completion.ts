import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  answerTemplateCompletion,
  TemplateCompletionSiteKind,
  templateCompletionQueryForCursor,
  type TemplateCompletionCandidate,
  type TemplateCompletionCursorContext,
} from '../inquiry/template-completion.js';
import {
  SourceCursorInquiryLocus,
  SourceTextCursor,
} from '../inquiry/locus.js';
import { InquiryPageRequest } from '../inquiry/page.js';
import {
  isSourceFileAddress,
  sourceFilePathMatches,
  sourcePathMatchesFileName,
} from '../kernel/source-address.js';
import type { SourceSpanAddress } from '../kernel/address.js';
import { sourceSpanContainsOffset } from '../kernel/address.js';
import type { ProductHandle } from '../kernel/handles.js';
import type { SourceSpan } from '../expression/source-span.js';
import { ExpressionParseResultInspector } from '../expression/parse-result-inspection.js';
import type { KernelStore } from '../kernel/store.js';
import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type { TemplateResourceRuntimeAnalysisEmission } from '../template/template-compilation-project-pass.js';
import type { TemplateExpressionParse } from '../template/value-site.js';
import { TemplateProductDetails } from '../template/product-details.js';
import type {
  HtmlAttribute,
  HtmlIrNode,
} from '../template/html-ir.js';
import { HtmlElement } from '../template/html-ir.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import type { FullResourceDefinition } from '../resources/resource-definition.js';
import { TypeSystemProductDetails } from '../type-system/product-details.js';
import {
  CheckerTypeMemberKind,
} from '../type-system/type-shape.js';
import type { TemplateBindableReference } from '../template/compiler-world-reference.js';
import { semanticOutcomeForInquiry } from './answer.js';
import type {
  SemanticRuntimePageResult,
  SemanticRuntimeSourceFileInput,
  SemanticRuntimeSourceCursorInput,
  SemanticTemplateCompilationRow,
  SemanticTemplateCursorBindableRow,
  SemanticTemplateCursorDiagnosticRow,
  SemanticTemplateCompletionCandidateRow,
  SemanticTemplateDiagnosticRow,
  SemanticTemplateDiagnosticsResult,
  SemanticTemplateCursorDefinitionRow,
  SemanticTemplateCursorHtmlRow,
  SemanticTemplateCursorInfoResult,
  SemanticTemplateCursorMemberRow,
  SemanticTemplateCursorValueSiteRow,
  SemanticTemplateCompletionResult,
} from './contracts.js';
import {
  SEMANTIC_RUNTIME_API_VERSION,
  SemanticRuntimeAnswerOutcome,
  SemanticRuntimeDetail,
  type SemanticRuntimeAnswer,
} from './contracts.js';
import {
  describeAddress,
} from './source-reference.js';
import {
  bindingSourceAssignmentDiagnostic,
  bindingSourceAssignmentDiagnosticKind,
  bindingSourceAssignmentReasonKinds,
  cursorDiagnosticRows,
} from './template-diagnostic-policy.js';

type TemplateCompilationLane = SemanticTemplateCompilationRow['compilationLane'];

type TemplateCompletionResourceSelection = {
  readonly resource: TemplateResourceRuntimeAnalysisEmission;
  readonly lane: TemplateCompilationLane;
  readonly sourceAddressHandle: SourceSpanAddress['handle'] | null;
};

interface TemplateCompletionReadResult {
  readonly outcome: SemanticRuntimeAnswerOutcome;
  readonly summary: string;
  readonly value: SemanticTemplateCompletionResult;
  readonly page: SemanticRuntimePageResult | null;
}

interface TemplateCompletionReadContext {
  readonly locus: SourceCursorInquiryLocus;
  readonly selection: TemplateCompletionResourceSelection;
}

interface TemplateCompletionAnswerContext {
  readonly cursorContext: TemplateCompletionCursorContext;
  readonly selection: TemplateCompletionResourceSelection;
}

interface TemplateDiagnosticsScanContext {
  readonly includeHandles: boolean;
  readonly routeConfigProductHandles: readonly ProductHandle[];
  readonly i18nTranslationKeyProductHandles: readonly ProductHandle[];
  readonly sourceTextCache: Map<string, TemplateSourceText | null>;
  readonly seenRows: Set<string>;
}

export function readSemanticTemplateCompletions(
  store: KernelStore,
  workspaceRootDir: string,
  projectRootDir: string,
  emission: AureliaAppWorldProjectEmission,
  cursor: SemanticRuntimeSourceCursorInput | null | undefined,
  page: InquiryPageRequest,
  detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}`,
): SemanticRuntimeAnswer<SemanticTemplateCompletionResult> {
  const read = readTemplateCompletion(store, workspaceRootDir, projectRootDir, emission, cursor, page, detail === SemanticRuntimeDetail.Handles);
  return {
    schemaVersion: SEMANTIC_RUNTIME_API_VERSION,
    outcome: read.outcome,
    summary: read.summary,
    value: read.value,
    page: read.page,
  };
}

export function readSemanticTemplateCursorInfo(
  store: KernelStore,
  workspaceRootDir: string,
  projectRootDir: string,
  emission: AureliaAppWorldProjectEmission,
  cursor: SemanticRuntimeSourceCursorInput | null | undefined,
  detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}`,
): SemanticRuntimeAnswer<SemanticTemplateCursorInfoResult> {
  const readContext = readContextForCursor(store, workspaceRootDir, projectRootDir, emission, cursor, new InquiryPageRequest(1, null));
  if ('outcome' in readContext) {
    return missingTemplateCursorInfo(readContext);
  }
  const read = readTemplateCursorInfoValue(
    store,
    emission,
    readContext,
    detail === SemanticRuntimeDetail.Handles,
  );
  return {
    schemaVersion: SEMANTIC_RUNTIME_API_VERSION,
    outcome: read.missingInputs.length === 0 ? SemanticRuntimeAnswerOutcome.Hit : SemanticRuntimeAnswerOutcome.Partial,
    summary: `Resolved template cursor as ${read.value.siteKind}.`,
    value: read.value,
    page: null,
  };
}

function readTemplateCursorInfoValue(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  readContext: TemplateCompletionReadContext,
  includeHandles: boolean,
): {
  readonly value: SemanticTemplateCursorInfoResult;
  readonly missingInputs: readonly string[];
} {
  const cursorContext = templateCompletionQueryForCursor(store, {
    locus: readContext.locus,
    resource: readContext.selection.resource,
    page: new InquiryPageRequest(1, null),
    routeConfigProductHandles: emission.routes.readRouteConfigs().map((routeConfig) => routeConfig.productHandle),
    i18nTranslationKeyProductHandles: emission.i18n.readTranslationKeys().map((translationKey) => translationKey.productHandle),
  });
  const missingInputs = [...new Set(cursorContext.missingInputs)];
  return {
    missingInputs,
    value: withCursorAssignmentDiagnostics(
      templateCursorInfoResult(store, readContext.selection, cursorContext, includeHandles, missingInputs),
      bindingSourceAssignmentCursorDiagnostics(store, readContext.selection, readContext.locus.cursor.offset),
    ),
  };
}

function bindingSourceAssignmentCursorDiagnostics(
  store: KernelStore,
  selection: TemplateCompletionResourceSelection,
  cursorOffset: number | null,
): readonly SemanticTemplateCursorDiagnosticRow[] {
  if (cursorOffset == null) {
    return [];
  }
  return selection.resource.runtimeAnalysis.bindingDataFlow.dataFlows.flatMap((dataFlow) => {
    const diagnosticKind = bindingSourceAssignmentDiagnosticKind(dataFlow.sourceAssignmentKind);
    if (diagnosticKind == null) {
      return [];
    }
    const span = sourceSpanForHandle(store, dataFlow.sourceAddressHandle);
    if (span == null || !sourceSpanContainsOffset(span, cursorOffset)) {
      return [];
    }
    const source = describeAddress(store, dataFlow.sourceAddressHandle);
    if (source == null) {
      return [];
    }
    return [bindingSourceAssignmentDiagnostic(
      store,
      dataFlow,
      bindingSourceAssignmentReasonKinds(dataFlow),
      diagnosticKind,
      source,
    )];
  });
}

function withCursorAssignmentDiagnostics(
  value: SemanticTemplateCursorInfoResult,
  diagnostics: readonly SemanticTemplateCursorDiagnosticRow[],
): SemanticTemplateCursorInfoResult {
  if (diagnostics.length === 0) {
    return value;
  }
  const byKey = new Map<string, SemanticTemplateCursorDiagnosticRow>();
  for (const diagnostic of [...value.diagnostics, ...diagnostics]) {
    byKey.set(cursorDiagnosticKey(diagnostic), diagnostic);
  }
  return {
    ...value,
    diagnostics: [...byKey.values()],
  };
}

function cursorDiagnosticKey(
  diagnostic: SemanticTemplateCursorDiagnosticRow,
): string {
  return [
    diagnostic.source?.path ?? 'no-source',
    diagnostic.source?.start ?? 'no-start',
    diagnostic.source?.end ?? 'no-end',
    diagnostic.diagnosticAuthority,
    diagnostic.frameworkErrorCode ?? 'no-framework-code',
    diagnostic.diagnosticKind,
    diagnosticRowMissingInputKey(diagnostic),
    diagnostic.selectedMemberName ?? 'none',
  ].join(':');
}

export function readSemanticTemplateDiagnostics(
  store: KernelStore,
  workspaceRootDir: string,
  projectRootDir: string,
  emission: AureliaAppWorldProjectEmission,
  sourceFile: SemanticRuntimeSourceFileInput | null | undefined,
  page: InquiryPageRequest,
  detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}`,
): SemanticRuntimeAnswer<SemanticTemplateDiagnosticsResult> {
  const rows = readTemplateDiagnosticRows(
    store,
    workspaceRootDir,
    projectRootDir,
    emission,
    sourceFile,
    detail === SemanticRuntimeDetail.Handles,
  );
  const paged = pageTemplateDiagnosticRows(rows, page);
  return {
    schemaVersion: SEMANTIC_RUNTIME_API_VERSION,
    outcome: paged.page.nextCursor == null
      ? SemanticRuntimeAnswerOutcome.Hit
      : SemanticRuntimeAnswerOutcome.Partial,
    summary: sourceFile == null
      ? `Returned ${paged.rows.length} of ${rows.length} template diagnostic row(s) from the opened app basis.`
      : `Returned ${paged.rows.length} of ${rows.length} template diagnostic row(s) for the requested source file.`,
    value: { rows: paged.rows },
    page: paged.page,
  };
}

function readTemplateCompletion(
  store: KernelStore,
  workspaceRootDir: string,
  projectRootDir: string,
  emission: AureliaAppWorldProjectEmission,
  cursor: SemanticRuntimeSourceCursorInput | null | undefined,
  page: InquiryPageRequest,
  includeHandles: boolean,
): TemplateCompletionReadResult {
  const readContext = readContextForCursor(store, workspaceRootDir, projectRootDir, emission, cursor, page);
  if ('outcome' in readContext) {
    return readContext;
  }

  const cursorContext = templateCompletionQueryForCursor(store, {
    locus: readContext.locus,
    resource: readContext.selection.resource,
    page,
    routeConfigProductHandles: emission.routes.readRouteConfigs().map((routeConfig) => routeConfig.productHandle),
    i18nTranslationKeyProductHandles: emission.i18n.readTranslationKeys().map((translationKey) => translationKey.productHandle),
  });
  const answer = answerTemplateCompletion(store, cursorContext.query);
  return templateCompletionReadResult(store, { cursorContext, selection: readContext.selection }, answer, includeHandles);
}

function readContextForCursor(
  store: KernelStore,
  workspaceRootDir: string,
  projectRootDir: string,
  emission: AureliaAppWorldProjectEmission,
  cursor: SemanticRuntimeSourceCursorInput | null | undefined,
  page: InquiryPageRequest,
): TemplateCompletionReadContext | TemplateCompletionReadResult {
  if (cursor == null) {
    return missingTemplateCompletion(page, ['source-cursor'], 'Template completion requires a source cursor.');
  }

  const offset = cursor.offset ?? offsetForCursor(workspaceRootDir, projectRootDir, cursor);
  if (offset == null) {
    return missingTemplateCompletion(page, ['source-offset'], 'Template completion requires a source offset or readable source file.');
  }

  const selection = selectTemplateResourceForCursor(store, emission, cursor.filePath, offset);
  if (selection == null) {
    return missingTemplateCompletion(page, ['template-resource'], 'No compiled template resource was available for the supplied source cursor.');
  }

  return {
    locus: new SourceCursorInquiryLocus(
      new SourceTextCursor(cursor.filePath, cursor.line, cursor.character, offset),
      selection.resource.compilation.unit.templateSource.sourceAddressHandle,
    ),
    selection,
  };
}

function readTemplateDiagnosticRows(
  store: KernelStore,
  workspaceRootDir: string,
  projectRootDir: string,
  emission: AureliaAppWorldProjectEmission,
  sourceFile: SemanticRuntimeSourceFileInput | null | undefined,
  includeHandles: boolean,
): readonly SemanticTemplateDiagnosticRow[] {
  const context = templateDiagnosticsScanContext(emission, includeHandles);
  const selections = templateResourceSelections(store, emission)
    .filter((selection) => templateDiagnosticSelectionMatchesFile(store, selection, sourceFile));
  const rows = [
    ...selections.flatMap((selection) => templateDiagnosticRowsForSelection(store, workspaceRootDir, selection, context)),
    ...selections.flatMap((selection) => bindingDataFlowDiagnosticRowsForSelection(store, selection, sourceFile, context)),
  ];
  return [...rows].sort((left, right) =>
    (left.source?.path ?? '').localeCompare(right.source?.path ?? '')
    || (left.source?.start ?? 0) - (right.source?.start ?? 0)
    || (left.selectedMemberName ?? '').localeCompare(right.selectedMemberName ?? '')
    || left.diagnosticAuthority.localeCompare(right.diagnosticAuthority)
    || (left.frameworkErrorCode ?? '').localeCompare(right.frameworkErrorCode ?? '')
    || left.diagnosticKind.localeCompare(right.diagnosticKind)
  );
}

function templateDiagnosticsScanContext(
  emission: AureliaAppWorldProjectEmission,
  includeHandles: boolean,
): TemplateDiagnosticsScanContext {
  return {
    includeHandles,
    routeConfigProductHandles: emission.routes.readRouteConfigs().map((routeConfig) => routeConfig.productHandle),
    i18nTranslationKeyProductHandles: emission.i18n.readTranslationKeys().map((translationKey) => translationKey.productHandle),
    sourceTextCache: new Map(),
    seenRows: new Set(),
  };
}

function templateDiagnosticSelectionMatchesFile(
  store: KernelStore,
  selection: TemplateCompletionResourceSelection,
  sourceFile: SemanticRuntimeSourceFileInput | null | undefined,
): boolean {
  if (sourceFile?.filePath == null) {
    return true;
  }
  const templateSpan = templateSourceSpan(store, selection.resource);
  return templateSpan != null && sourceSpanFileMatches(store, templateSpan, sourceFile.filePath);
}

function templateDiagnosticRowsForSelection(
  store: KernelStore,
  workspaceRootDir: string,
  selection: TemplateCompletionResourceSelection,
  context: TemplateDiagnosticsScanContext,
): readonly SemanticTemplateDiagnosticRow[] {
  const source = templateSourceText(workspaceRootDir, store, selection.resource, context.sourceTextCache);
  if (source == null) {
    return [];
  }
  return expressionMemberNameSpans(selection.resource)
    .flatMap((span) => templateDiagnosticRowsForMemberSpan(store, selection, source, span, context));
}

function templateDiagnosticRowsForMemberSpan(
  store: KernelStore,
  selection: TemplateCompletionResourceSelection,
  source: TemplateSourceText,
  span: SourceSpan,
  context: TemplateDiagnosticsScanContext,
): readonly SemanticTemplateDiagnosticRow[] {
  const offset = span.start + Math.floor((span.end - span.start) / 2);
  if (offset < 0 || offset > source.text.length) {
    return [];
  }
  const position = positionForOffset(source, offset);
  const cursorContext = templateCompletionQueryForCursor(store, {
    locus: new SourceCursorInquiryLocus(
      new SourceTextCursor(source.filePath, position.line, position.character, offset),
      selection.resource.compilation.unit.templateSource.sourceAddressHandle,
    ),
    resource: selection.resource,
    page: new InquiryPageRequest(1, null),
    routeConfigProductHandles: context.routeConfigProductHandles,
    i18nTranslationKeyProductHandles: context.i18nTranslationKeyProductHandles,
  });
  const cursorInfo = templateCursorInfoResult(store, selection, cursorContext, context.includeHandles, [...new Set(cursorContext.missingInputs)]);
  return cursorInfo.diagnostics.flatMap((diagnostic) =>
    templateDiagnosticRowForDiagnostic(diagnostic, cursorInfo, source.filePath, span, context.seenRows)
  );
}

function templateDiagnosticRowForDiagnostic(
  diagnostic: SemanticTemplateCursorDiagnosticRow,
  cursorInfo: SemanticTemplateCursorInfoResult,
  filePath: string,
  span: SourceSpan,
  seenRows: Set<string>,
): readonly SemanticTemplateDiagnosticRow[] {
  const source = sourceReferenceForSpan(filePath, span);
  const key = templateDiagnosticRowKey(diagnostic, source);
  if (seenRows.has(key)) {
    return [];
  }
  seenRows.add(key);
  return [{
    ...diagnostic,
    source,
    siteKind: cursorInfo.siteKind,
    valueSiteKind: cursorInfo.valueSite?.siteKind ?? null,
    template: cursorInfo.template,
  }];
}

function templateDiagnosticRowKey(
  diagnostic: SemanticTemplateCursorDiagnosticRow,
  source: NonNullable<SemanticTemplateDiagnosticRow['source']>,
): string {
  return [
    source.path,
    source.start,
    source.end,
    diagnostic.diagnosticAuthority,
    diagnostic.frameworkErrorCode ?? 'no-framework-code',
    diagnostic.diagnosticKind,
    diagnosticRowMissingInputKey(diagnostic),
    diagnostic.selectedMemberName ?? 'none',
  ].join(':');
}

function diagnosticRowMissingInputKey(
  diagnostic: SemanticTemplateCursorDiagnosticRow,
): string {
  return diagnostic.missingInputs.length === 0
    ? diagnostic.missingInput ?? 'none'
    : [...diagnostic.missingInputs].sort().join('+');
}

function bindingDataFlowDiagnosticRowsForSelection(
  store: KernelStore,
  selection: TemplateCompletionResourceSelection,
  sourceFile: SemanticRuntimeSourceFileInput | null | undefined,
  context: TemplateDiagnosticsScanContext,
): readonly SemanticTemplateDiagnosticRow[] {
  return selection.resource.runtimeAnalysis.bindingDataFlow.dataFlows.flatMap((dataFlow) => {
    const diagnosticKind = bindingSourceAssignmentDiagnosticKind(dataFlow.sourceAssignmentKind);
    if (diagnosticKind == null) {
      return [];
    }
    const source = describeAddress(store, dataFlow.sourceAddressHandle);
    if (source == null || !sourceReferenceMatchesFile(source, sourceFile)) {
      return [];
    }
    const reasonKinds = bindingSourceAssignmentReasonKinds(dataFlow);
    const diagnostic = bindingSourceAssignmentDiagnostic(store, dataFlow, reasonKinds, diagnosticKind, source);
    const key = templateDiagnosticRowKey(diagnostic, source);
    if (context.seenRows.has(key)) {
      return [];
    }
    context.seenRows.add(key);
    return [{
      ...diagnostic,
      siteKind: TemplateCompletionSiteKind.Expression,
      valueSiteKind: valueSiteKindForDataFlow(store, dataFlow.expressionProductHandle),
      template: {
        compilationLane: selection.lane,
        source: describeAddress(store, selection.sourceAddressHandle),
      },
    }];
  });
}

function sourceReferenceMatchesFile(
  source: SemanticTemplateDiagnosticRow['source'],
  sourceFile: SemanticRuntimeSourceFileInput | null | undefined,
): boolean {
  return sourceFile?.filePath == null
    || (source?.path != null && sourcePathMatchesFileName(source.path, sourceFile.filePath));
}

function valueSiteKindForDataFlow(
  store: KernelStore,
  expressionProductHandle: ProductHandle | null,
): SemanticTemplateDiagnosticRow['valueSiteKind'] {
  const parse = expressionProductHandle == null
    ? null
    : store.productDetails.read(TemplateProductDetails.ExpressionParse, expressionProductHandle);
  return parse?.site.siteKind ?? null;
}

function templateResourceSelections(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
): readonly TemplateCompletionResourceSelection[] {
  return [
    ...emission.templates.resources.map((resource) => ({
      resource,
      lane: 'app-runtime' as const,
      sourceAddressHandle: templateSelectionSourceAddressHandle(store, resource),
    })),
    ...emission.templates.authoringResources.map((resource) => ({
      resource,
      lane: 'authoring' as const,
      sourceAddressHandle: templateSelectionSourceAddressHandle(store, resource),
    })),
  ];
}

function templateSelectionSourceAddressHandle(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
): SourceSpanAddress['handle'] | null {
  return templateSourceSpan(store, resource)?.handle ?? null;
}

function expressionMemberNameSpans(
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly SourceSpan[] {
  const spans: SourceSpan[] = [];
  const seen = new Set<string>();
  for (const parse of templateExpressionParses(resource)) {
    for (const span of ExpressionParseResultInspector.memberNameSpans(parse.result)) {
      const key = `${span.start}:${span.end}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      spans.push(span);
    }
  }
  return spans.sort((left, right) => left.start - right.start || left.end - right.end);
}

function templateExpressionParses(
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly TemplateExpressionParse[] {
  return [
    ...resource.compilation.bindingCommandLowering.expressionParses,
    ...resource.compilation.valueSites.parses,
  ];
}

interface TemplateSourceText {
  readonly filePath: string;
  readonly text: string;
  readonly lineStarts: readonly number[];
}

function templateSourceText(
  workspaceRootDir: string,
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  cache: Map<string, TemplateSourceText | null>,
): TemplateSourceText | null {
  const span = templateSourceSpan(store, resource);
  if (span == null) {
    return null;
  }
  const file = store.readAddress(span.fileHandle);
  if (file == null || !isSourceFileAddress(file)) {
    return null;
  }
  const filePath = sourceFileHostPath(workspaceRootDir, file.path);
  let source = cache.get(filePath);
  if (source === undefined) {
    try {
      const text = readFileSync(filePath, 'utf8');
      source = {
        filePath,
        text,
        lineStarts: lineStartsForText(text),
      };
    } catch {
      source = null;
    }
    cache.set(filePath, source);
  }
  return source;
}

function sourceFileHostPath(
  workspaceRootDir: string,
  filePath: string,
): string {
  return path.isAbsolute(filePath)
    ? filePath
    : path.resolve(workspaceRootDir, filePath);
}

function positionForOffset(
  source: TemplateSourceText,
  offset: number,
): { readonly line: number; readonly character: number } {
  const line = lineIndexForOffset(source.lineStarts, offset);
  const lineStart = source.lineStarts[line] ?? 0;
  return {
    line,
    character: offset - lineStart,
  };
}

function lineStartsForText(text: string): readonly number[] {
  const starts = [0];
  for (let index = 0; index < text.length; index += 1) {
    const char = text.charCodeAt(index);
    if (char === 13) {
      const next = text.charCodeAt(index + 1);
      if (next === 10) {
        index += 1;
      }
      starts.push(index + 1);
      continue;
    }
    if (char === 10) {
      starts.push(index + 1);
    }
  }
  return starts;
}

function lineIndexForOffset(
  lineStarts: readonly number[],
  offset: number,
): number {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const lineStart = lineStarts[mid] ?? 0;
    if (lineStart <= offset) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return Math.max(0, high);
}

function sourceReferenceForSpan(
  filePath: string,
  span: SourceSpan,
): NonNullable<SemanticTemplateDiagnosticRow['source']> {
  return {
    kind: 'source-span-address',
    label: `${filePath}@${span.start}..${span.end}`,
    path: filePath,
    start: span.start,
    end: span.end,
    role: 'name',
  };
}

function pageTemplateDiagnosticRows<TRow>(
  rows: readonly TRow[],
  page: InquiryPageRequest,
): {
  readonly rows: readonly TRow[];
  readonly page: SemanticRuntimePageResult;
} {
  const size = Math.max(0, page.size);
  const cursor = page.cursor;
  const start = cursor == null ? 0 : diagnosticCursorStart(cursor, rows.length);
  const safeStart = start < 0 ? rows.length : start;
  const selected = rows.slice(safeStart, safeStart + size);
  const nextCursor = selected.length > 0 && safeStart + selected.length < rows.length
    ? `offset:${safeStart + selected.length - 1}`
    : null;
  return {
    rows: selected,
    page: {
      size,
      cursor,
      nextCursor,
      returnedRows: selected.length,
      totalRows: rows.length,
    },
  };
}

function diagnosticCursorStart(
  cursor: string,
  rowCount: number,
): number {
  if (cursor.startsWith('offset:')) {
    const offset = Number.parseInt(cursor.slice('offset:'.length), 10);
    return Number.isFinite(offset) ? offset + 1 : rowCount;
  }
  return rowCount;
}

function templateCompletionReadResult(
  store: KernelStore,
  context: TemplateCompletionAnswerContext,
  answer: ReturnType<typeof answerTemplateCompletion>,
  includeHandles: boolean,
): TemplateCompletionReadResult {
  const rows = answer.value.candidates.map((candidate) => templateCompletionCandidateRow(candidate, includeHandles));
  return {
    outcome: semanticOutcomeForInquiry(answer.outcome),
    summary: answer.summary,
    value: {
      siteKind: answer.value.siteKind,
      candidates: rows,
      expressionFrontier: answer.value.expressionFrontier == null
        ? null
        : {
          frontierKind: answer.value.expressionFrontier.frontierKind,
          expectedContinuationClasses: answer.value.expressionFrontier.expectedContinuationClasses,
        },
      missingInputs: [...new Set([...context.cursorContext.missingInputs, ...answer.value.missingInputs])],
      template: {
        compilationLane: context.selection.lane,
        source: describeAddress(store, context.selection.sourceAddressHandle),
      },
    },
    page: semanticTemplateCompletionPage(answer.page, rows.length),
  };
}

function semanticTemplateCompletionPage(
  page: ReturnType<typeof answerTemplateCompletion>['page'],
  rowCount: number,
): SemanticRuntimePageResult | null {
  if (page == null) {
    return null;
  }

  return {
    size: page.size,
    cursor: page.cursor,
    nextCursor: page.nextCursor,
    returnedRows: page.returned,
    totalRows: page.total ?? rowCount,
  };
}

function missingTemplateCompletion(
  page: InquiryPageRequest,
  missingInputs: readonly string[],
  summary: string,
): TemplateCompletionReadResult {
  return {
    outcome: SemanticRuntimeAnswerOutcome.Miss,
    summary,
    value: {
      siteKind: TemplateCompletionSiteKind.Unknown,
      candidates: [],
      expressionFrontier: null,
      missingInputs,
      template: {
        compilationLane: null,
        source: null,
      },
    },
    page: {
      size: page.size,
      cursor: page.cursor,
      nextCursor: null,
      returnedRows: 0,
      totalRows: 0,
    },
  };
}

function missingTemplateCursorInfo(
  read: TemplateCompletionReadResult,
): SemanticRuntimeAnswer<SemanticTemplateCursorInfoResult> {
  return {
    schemaVersion: SEMANTIC_RUNTIME_API_VERSION,
    outcome: read.outcome,
    summary: read.summary,
    value: {
      siteKind: TemplateCompletionSiteKind.Unknown,
      expressionFrontier: null,
      missingInputs: read.value.missingInputs,
      template: read.value.template,
      html: emptyCursorHtmlRow(),
      valueSite: null,
      selectedDefinition: null,
      selectedBindable: null,
      selectedMemberName: null,
      selectedMember: null,
      memberOwnerType: null,
      diagnostics: [],
    },
    page: null,
  };
}

function templateCursorInfoResult(
  store: KernelStore,
  selection: TemplateCompletionResourceSelection,
  cursorContext: TemplateCompletionCursorContext,
  includeHandles: boolean,
  missingInputs: readonly string[],
): SemanticTemplateCursorInfoResult {
  const query = cursorContext.query;
  const html = cursorHtmlRow(store, cursorContext, includeHandles);
  const valueSite = cursorValueSiteRow(store, cursorContext, includeHandles);
  const selectedMember = cursorSelectedMemberRow(store, cursorContext, includeHandles);
  const memberOwnerType = cursorMemberOwnerTypeRow(store, query.memberOwnerTypeProductHandle, includeHandles);
  return {
    siteKind: query.siteKind,
    expressionFrontier: cursorContext.expressionFrontier == null
      ? null
      : {
          frontierKind: cursorContext.expressionFrontier.frontierKind,
          expectedContinuationClasses: cursorContext.expressionFrontier.expectedContinuationClasses,
        },
    missingInputs,
    template: {
      compilationLane: selection.lane,
      source: describeAddress(store, selection.sourceAddressHandle),
    },
    html,
    valueSite,
    selectedDefinition: cursorDefinitionRow(store, query.selectedDefinitionProductHandle, includeHandles),
    selectedBindable: cursorBindableRow(store, cursorContext.selectedBindable, includeHandles),
    selectedMemberName: cursorContext.selectedMemberName,
    selectedMember,
    memberOwnerType,
    diagnostics: cursorDiagnosticRows(
      store,
      query.siteKind,
      missingInputs,
      cursorContext.selectedMemberName,
      selectedMember,
      memberOwnerType,
      query.memberOwnerTypeProductHandle,
      valueSite?.source ?? html.attributeSource ?? html.source ?? describeAddress(store, selection.sourceAddressHandle),
    ),
  };
}

function cursorHtmlRow(
  store: KernelStore,
  cursorContext: TemplateCompletionCursorContext,
  includeHandles: boolean,
): SemanticTemplateCursorHtmlRow {
  const node = readHtmlNode(store, cursorContext.htmlNodeProductHandle);
  const attribute = readHtmlAttribute(store, cursorContext.htmlAttributeProductHandle);
  const nodeSourceAddressHandle = node?.sourceAddressHandle ?? null;
  const attributeSourceAddressHandle = attribute?.sourceAddressHandle ?? null;
  return {
    nodeKind: node?.nodeKind ?? null,
    tagName: node instanceof HtmlElement ? node.tagName : null,
    attributeName: attribute?.rawName ?? null,
    attributeValue: attribute?.rawValue ?? null,
    source: describeAddress(store, nodeSourceAddressHandle),
    attributeSource: describeAddress(store, attributeSourceAddressHandle),
    ...(includeHandles ? {
      handles: {
        nodeProductHandle: cursorContext.htmlNodeProductHandle,
        attributeProductHandle: cursorContext.htmlAttributeProductHandle,
        nodeSourceAddressHandle,
        attributeSourceAddressHandle,
      },
    } : {}),
  };
}

function cursorValueSiteRow(
  store: KernelStore,
  cursorContext: TemplateCompletionCursorContext,
  includeHandles: boolean,
): SemanticTemplateCursorValueSiteRow | null {
  const site = cursorContext.valueSiteProductHandle == null
    ? null
    : store.productDetails.read(TemplateProductDetails.ValueSite, cursorContext.valueSiteProductHandle);
  if (site == null) {
    return null;
  }
  return {
    siteKind: site.siteKind,
    rawValue: site.rawValue,
    entryFamily: site.entryFamily,
    bindingCommandName: site.bindingCommand?.name ?? null,
    bindableName: site.bindable?.reference.name ?? null,
    bindableAttribute: site.bindable?.reference.attribute ?? null,
    source: describeAddress(store, site.sourceAddressHandle),
    ...(includeHandles ? {
      handles: {
        productHandle: site.productHandle,
        identityHandle: site.identityHandle,
        sourceAddressHandle: site.sourceAddressHandle,
      },
    } : {}),
  };
}

function cursorDefinitionRow(
  store: KernelStore,
  productHandle: TemplateCompletionCursorContext['query']['selectedDefinitionProductHandle'],
  includeHandles: boolean,
): SemanticTemplateCursorDefinitionRow | null {
  const definition = productHandle == null
    ? null
    : store.productDetails.read(ResourceProductDetails.Definition, productHandle);
  if (definition == null) {
    return null;
  }
  return definitionRow(store, definition, includeHandles);
}

function definitionRow(
  store: KernelStore,
  definition: FullResourceDefinition,
  includeHandles: boolean,
): SemanticTemplateCursorDefinitionRow {
  return {
    resourceKind: definition.type,
    name: 'name' in definition ? definition.name : null,
    targetName: 'target' in definition ? definition.target.localName : null,
    source: describeAddress(store, definition.sourceAddressHandle),
    ...(includeHandles ? {
      handles: {
        definitionProductHandle: definition.productHandle,
        identityHandle: definition.identityHandle,
        sourceAddressHandle: definition.sourceAddressHandle,
      },
    } : {}),
  };
}

function cursorBindableRow(
  store: KernelStore,
  bindable: TemplateBindableReference | null,
  includeHandles: boolean,
): SemanticTemplateCursorBindableRow | null {
  if (bindable == null) {
    return null;
  }
  return {
    name: bindable.reference.name,
    attribute: bindable.reference.attribute,
    mode: bindable.definition.mode,
    ownerDefinitionProductHandle: bindable.reference.ownerDefinitionProductHandle,
    source: describeAddress(store, bindable.reference.sourceAddressHandle),
    ...(includeHandles ? {
      handles: {
        ownerDefinitionProductHandle: bindable.reference.ownerDefinitionProductHandle,
        sourceAddressHandle: bindable.reference.sourceAddressHandle,
      },
    } : {}),
  };
}

function cursorMemberOwnerTypeRow(
  store: KernelStore,
  productHandle: TemplateCompletionCursorContext['query']['memberOwnerTypeProductHandle'],
  includeHandles: boolean,
): SemanticTemplateCursorInfoResult['memberOwnerType'] {
  const typeShape = productHandle == null
    ? null
    : store.productDetails.read(TypeSystemProductDetails.TypeShape, productHandle);
  if (typeShape == null) {
    return null;
  }
  return {
    display: typeShape.display,
    shapeKind: typeShape.shapeKind,
    origin: typeShape.origin,
    source: describeAddress(store, typeShape.sourceAddressHandle),
    ...(includeHandles ? {
      handles: {
        productHandle: typeShape.productHandle,
        identityHandle: typeShape.identityHandle,
        sourceAddressHandle: typeShape.sourceAddressHandle,
      },
    } : {}),
  };
}

function cursorSelectedMemberRow(
  store: KernelStore,
  cursorContext: TemplateCompletionCursorContext,
  includeHandles: boolean,
): SemanticTemplateCursorMemberRow | null {
  const memberName = cursorContext.selectedMemberName;
  if (memberName == null || cursorContext.query.memberOwnerTypeProductHandle == null) {
    return null;
  }
  const ownerType = store.productDetails.read(TypeSystemProductDetails.TypeShape, cursorContext.query.memberOwnerTypeProductHandle);
  const member = ownerType?.members.find((candidate) => candidate.name === memberName) ?? null;
  if (member == null && ownerType?.indexedValueType != null) {
    return {
      name: memberName,
      memberKind: CheckerTypeMemberKind.IndexSignature,
      typeDisplay: ownerType.indexedValueType.display,
      isOptional: false,
      isReadonly: false,
      source: null,
    };
  }
  if (member == null) {
    return null;
  }
  return {
    name: member.name,
    memberKind: member.memberKind,
    typeDisplay: member.valueType?.display ?? null,
    isOptional: member.isOptional,
    isReadonly: member.isReadonly,
    source: describeAddress(store, member.sourceAddressHandle),
    ...(includeHandles ? {
      handles: {
        productHandle: member.productHandle,
        identityHandle: member.identityHandle,
        sourceAddressHandle: member.sourceAddressHandle,
      },
    } : {}),
  };
}

function readHtmlNode(
  store: KernelStore,
  productHandle: TemplateCompletionCursorContext['htmlNodeProductHandle'],
): HtmlIrNode | null {
  return productHandle == null
    ? null
    : store.productDetails.read(TemplateProductDetails.HtmlNode, productHandle);
}

function readHtmlAttribute(
  store: KernelStore,
  productHandle: TemplateCompletionCursorContext['htmlAttributeProductHandle'],
): HtmlAttribute | null {
  return productHandle == null
    ? null
    : store.productDetails.read(TemplateProductDetails.HtmlAttribute, productHandle);
}

function emptyCursorHtmlRow(): SemanticTemplateCursorHtmlRow {
  return {
    nodeKind: null,
    tagName: null,
    attributeName: null,
    attributeValue: null,
    source: null,
    attributeSource: null,
  };
}

function selectTemplateResourceForCursor(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  filePath: string,
  offset: number,
): TemplateCompletionResourceSelection | null {
  const candidates = [
    ...emission.templates.resources.map((resource) => ({ resource, lane: 'app-runtime' as const })),
    ...emission.templates.authoringResources.map((resource) => ({ resource, lane: 'authoring' as const })),
  ];
  let selected: (TemplateCompletionResourceSelection & { readonly spanWidth: number }) | null = null;
  for (const candidate of candidates) {
    for (const span of cursorCandidateSpans(store, candidate.resource)) {
      if (!sourceSpanContainsOffset(span, offset) || !sourceSpanFileMatches(store, span, filePath)) {
        continue;
      }
      const spanWidth = span.end - span.start;
      if (selected == null || spanWidth < selected.spanWidth) {
        selected = {
          ...candidate,
          sourceAddressHandle: span.handle,
          spanWidth,
        };
      }
    }
  }
  return selected == null
    ? null
    : {
        resource: selected.resource,
        lane: selected.lane,
        sourceAddressHandle: selected.sourceAddressHandle,
      };
}

function cursorCandidateSpans(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly SourceSpanAddress[] {
  return [
    templateSourceSpan(store, resource),
    sourceSpanForHandle(store, resource.compilation.html.document.sourceAddressHandle),
    ...resource.compilation.html.nodes.map((node) => sourceSpanForHandle(store, node.sourceAddressHandle)),
    ...resource.compilation.html.attributes.flatMap((attribute) => [
      sourceSpanForHandle(store, attribute.sourceAddressHandle),
      sourceSpanForHandle(store, attribute.nameAddressHandle),
      sourceSpanForHandle(store, attribute.valueAddressHandle),
    ]),
  ].filter((span): span is SourceSpanAddress => span != null);
}

function sourceSpanFileMatches(
  store: KernelStore,
  span: SourceSpanAddress,
  filePath: string,
): boolean {
  const file = store.readAddress(span.fileHandle);
  return file != null && isSourceFileAddress(file) && sourceFilePathMatches(file, filePath);
}

function sourceSpanForHandle(
  store: KernelStore,
  handle: SourceSpanAddress['handle'] | null,
): SourceSpanAddress | null {
  const address = handle == null ? null : store.readAddress(handle);
  return address?.kind === 'source-span-address' ? address as SourceSpanAddress : null;
}

function templateSourceSpan(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
): SourceSpanAddress | null {
  const handle = resource.compilation.unit.templateSource.sourceAddressHandle;
  const address = handle == null ? null : store.readAddress(handle);
  if (address?.kind === 'source-span-address') {
    return address as SourceSpanAddress;
  }
  if (address?.kind === 'template-address' && address.authoredSourceHandle != null) {
    const authored = store.readAddress(address.authoredSourceHandle);
    return authored?.kind === 'source-span-address' ? authored as SourceSpanAddress : null;
  }
  return null;
}

function offsetForCursor(
  workspaceRootDir: string,
  projectRootDir: string,
  cursor: SemanticRuntimeSourceCursorInput,
): number | null {
  for (const filePath of cursorInputHostPathCandidates(workspaceRootDir, projectRootDir, cursor.filePath)) {
    try {
      return offsetForLineCharacter(readFileSync(filePath, 'utf8'), cursor.line, cursor.character);
    } catch {
      continue;
    }
  }
  return null;
}

function cursorInputHostPathCandidates(
  workspaceRootDir: string,
  projectRootDir: string,
  filePath: string,
): readonly string[] {
  if (path.isAbsolute(filePath)) {
    return [filePath];
  }
  return [...new Set([
    path.resolve(projectRootDir, filePath),
    path.resolve(workspaceRootDir, filePath),
  ])];
}

function offsetForLineCharacter(
  text: string,
  line: number,
  character: number,
): number | null {
  if (line < 0 || character < 0) {
    return null;
  }
  let offset = 0;
  let currentLine = 0;
  while (currentLine < line) {
    const newline = text.indexOf('\n', offset);
    if (newline < 0) {
      return null;
    }
    offset = newline + 1;
    currentLine++;
  }
  return offset + character <= text.length ? offset + character : null;
}

function templateCompletionCandidateRow(
  candidate: TemplateCompletionCandidate,
  includeHandles: boolean,
): SemanticTemplateCompletionCandidateRow {
  return {
    candidateKind: candidate.candidateKind,
    name: candidate.name,
    sourceKind: candidate.sourceKind,
    summary: candidate.summary,
    typeDisplay: candidate.typeReference?.display ?? null,
    ...(includeHandles ? {
      handles: {
        productHandle: candidate.productHandle,
        identityHandle: candidate.identityHandle,
        sourceAddressHandle: candidate.sourceAddressHandle,
      },
    } : {}),
  };
}
