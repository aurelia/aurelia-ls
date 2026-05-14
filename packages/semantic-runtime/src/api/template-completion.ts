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
  InquiryLocusKind,
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
import type { ExpressionAstNode } from '../expression/ast.js';
import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import { ExpressionParseResultInspector } from '../expression/parse-result-inspection.js';
import type { KernelStore } from '../kernel/store.js';
import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type { TemplateResourceRuntimeAnalysisEmission } from '../template/template-compilation-project-pass.js';
import type { TemplateCompilerIssue } from '../template/compiler-issue.js';
import type { RuntimeBindingScopeIssue } from '../template/runtime-binding-scope-issue.js';
import type { RuntimeBindingIssue } from '../template/runtime-binding-issue.js';
import type { RuntimeBindingBehaviorIssue } from '../template/runtime-binding-behavior.js';
import type { RuntimeValueConverterIssue } from '../template/runtime-value-converter.js';
import type { RuntimeControllerIssue } from '../template/runtime-controller-issue.js';
import type { RuntimeRendererIssue } from '../template/runtime-renderer-issue.js';
import type { TemplateExpressionParse } from '../template/value-site.js';
import { TemplateValueSiteKind } from '../template/value-site.js';
import { runtimeAcceptedBindingExpressionAstForParse } from '../template/expression-parse-projection.js';
import { TemplateProductDetails } from '../template/product-details.js';
import type {
  HtmlAttribute,
  HtmlIrNode,
} from '../template/html-ir.js';
import { HtmlElement } from '../template/html-ir.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import type { FullResourceDefinition } from '../resources/resource-definition.js';
import { TypeSystemProductDetails } from '../type-system/product-details.js';
import { CheckerExpressionTypeWorld } from '../type-system/expression-type-world.js';
import { CheckerExpressionTypeOpenKind } from '../type-system/expression-type-evaluation.js';
import {
  RuntimeAstFrameworkErrorCode,
  RuntimeHtmlAstFrameworkErrorCode,
  type RuntimeHtmlAstFrameworkErrorCode as RuntimeHtmlAstFrameworkErrorCodeValue,
} from '../type-system/framework-error-code.js';
import {
  CheckerTypeMemberKind,
  checkerIndexedAccessSupportsString,
} from '../type-system/type-shape.js';
import {
  RuntimeBindingDataFlowDirection,
  type RuntimeBindingDataFlow,
} from '../observation/runtime-binding-observation.js';
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
  SemanticTemplateCursorSuggestionValueTypeSource,
} from './contracts.js';
import {
  SEMANTIC_RUNTIME_API_VERSION,
  SemanticRuntimeAnswerOutcome,
  SemanticRuntimeDetail,
  type SemanticRuntimeAnswer,
} from './contracts.js';
import {
  describeAddress,
  sourceReferenceForParserSpan,
} from './source-reference.js';
import {
  bindingSourceAssignmentDiagnostic,
  bindingDataFlowFrameworkErrorDiagnostic,
  bindingTargetAccessFrameworkErrorDiagnostic,
  bindingSourceAssignmentDiagnosticKind,
  bindingSourceAssignmentReasonKinds,
  cursorDiagnosticRows,
  expressionRuntimeEvaluationErrorDiagnostic,
  expressionParseErrorDiagnostic,
  runtimeBindingIssueDiagnostic,
  runtimeBindingBehaviorIssueDiagnostic,
  runtimeBindingScopeIssueDiagnostic,
  runtimeRendererIssueDiagnostic,
  runtimeValueConverterIssueDiagnostic,
  runtimeControllerIssueDiagnostic,
  templateCompilerErrorDiagnostic,
} from './template-diagnostic-policy.js';

type TemplateCompilationLane = SemanticTemplateCompilationRow['compilationLane'];

interface TemplateDiagnosticExpectedValueType {
  readonly display: string;
  readonly source: SemanticTemplateCursorSuggestionValueTypeSource;
}

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
  readonly expressionWorld: CheckerExpressionTypeWorld;
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
    const span = sourceSpanForHandle(store, dataFlow.sourceAddressHandle);
    if (span == null || !sourceSpanContainsOffset(span, cursorOffset)) {
      return [];
    }
    const source = describeAddress(store, dataFlow.sourceAddressHandle);
    if (source == null) {
      return [];
    }
    const diagnostics: SemanticTemplateCursorDiagnosticRow[] = [];
    const assignmentDiagnosticKind = bindingSourceAssignmentDiagnosticKind(dataFlow.sourceAssignmentKind);
    if (assignmentDiagnosticKind != null) {
      diagnostics.push(bindingSourceAssignmentDiagnostic(
        store,
        dataFlow,
        bindingSourceAssignmentReasonKinds(dataFlow),
        assignmentDiagnosticKind,
        source,
      ));
    }
    const runtimeDiagnostic = expressionRuntimeEvaluationDiagnosticForDataFlow(store, dataFlow, source);
    if (runtimeDiagnostic != null) {
      diagnostics.push(runtimeDiagnostic);
    }
    const frameworkDiagnostic = bindingDataFlowFrameworkErrorDiagnostic(dataFlow, source);
    if (frameworkDiagnostic != null) {
      diagnostics.push(frameworkDiagnostic);
    }
    return diagnostics;
  });
}

function templateDiagnosticExpectedValueTypeForCursor(
  store: KernelStore,
  selection: TemplateCompletionResourceSelection,
  cursorOffset: number | null,
  valueSiteKind: SemanticTemplateCursorValueSiteRow['siteKind'] | null,
): TemplateDiagnosticExpectedValueType | null {
  if (cursorOffset == null || !valueSiteSupportsBindingTargetExpectedType(valueSiteKind)) {
    return null;
  }
  for (const dataFlow of selection.resource.runtimeAnalysis.bindingDataFlow.dataFlows) {
    const span = sourceSpanForHandle(store, dataFlow.sourceAddressHandle);
    if (span == null || !sourceSpanContainsOffset(span, cursorOffset)) {
      continue;
    }
    const display = dataFlow.targetValueType?.display ?? dataFlow.targetPropertyType?.display ?? null;
    if (display != null) {
      return { display, source: 'binding-target' };
    }
  }
  return null;
}

function valueSiteSupportsBindingTargetExpectedType(
  valueSiteKind: SemanticTemplateCursorValueSiteRow['siteKind'] | null,
): boolean {
  switch (valueSiteKind) {
    case TemplateValueSiteKind.BindableValue:
    case TemplateValueSiteKind.CustomAttributeValue:
    case TemplateValueSiteKind.BindingCommandValue:
    case TemplateValueSiteKind.MultiBindingValue:
    case TemplateValueSiteKind.TextInterpolation:
    case TemplateValueSiteKind.PlainAttributeInterpolation:
      return true;
    default:
      return false;
  }
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

export function readTemplateDiagnosticRows(
  store: KernelStore,
  workspaceRootDir: string,
  projectRootDir: string,
  emission: AureliaAppWorldProjectEmission,
  sourceFile: SemanticRuntimeSourceFileInput | null | undefined,
  includeHandles: boolean,
): readonly SemanticTemplateDiagnosticRow[] {
  const context = templateDiagnosticsScanContext(store, emission, includeHandles);
  const selections = templateResourceSelections(store, emission)
    .filter((selection) => templateDiagnosticSelectionMatchesFile(store, selection, sourceFile));
  const rows = [
    ...selections.flatMap((selection) => expressionParseDiagnosticRowsForSelection(store, selection, sourceFile, context)),
    ...selections.flatMap((selection) => templateCompilerIssueDiagnosticRowsForSelection(store, selection, sourceFile, context)),
    ...selections.flatMap((selection) => runtimeControllerIssueDiagnosticRowsForSelection(store, selection, sourceFile, context)),
    ...selections.flatMap((selection) => runtimeRendererIssueDiagnosticRowsForSelection(store, selection, sourceFile, context)),
    ...selections.flatMap((selection) => runtimeBindingIssueDiagnosticRowsForSelection(store, selection, sourceFile, context)),
    ...selections.flatMap((selection) => runtimeBindingBehaviorIssueDiagnosticRowsForSelection(store, selection, sourceFile, context)),
    ...selections.flatMap((selection) => runtimeValueConverterIssueDiagnosticRowsForSelection(store, selection, sourceFile, context)),
    ...selections.flatMap((selection) => runtimeBindingScopeIssueDiagnosticRowsForSelection(store, selection, sourceFile, context)),
    ...selections.flatMap((selection) => targetAccessDiagnosticRowsForSelection(store, selection, sourceFile, context)),
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
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  includeHandles: boolean,
): TemplateDiagnosticsScanContext {
  return {
    includeHandles,
    routeConfigProductHandles: emission.routes.readRouteConfigs().map((routeConfig) => routeConfig.productHandle),
    i18nTranslationKeyProductHandles: emission.i18n.readTranslationKeys().map((translationKey) => translationKey.productHandle),
    expressionWorld: new CheckerExpressionTypeWorld(store),
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
      new SourceTextCursor(source.sourcePath, position.line, position.character, offset),
      selection.resource.compilation.unit.templateSource.sourceAddressHandle,
    ),
    resource: selection.resource,
    page: new InquiryPageRequest(1, null),
    routeConfigProductHandles: context.routeConfigProductHandles,
    i18nTranslationKeyProductHandles: context.i18nTranslationKeyProductHandles,
    expressionWorld: context.expressionWorld,
  });
  const cursorInfo = templateCursorInfoResult(store, selection, cursorContext, context.includeHandles, [...new Set(cursorContext.missingInputs)]);
  return cursorInfo.diagnostics.flatMap((diagnostic) =>
    templateDiagnosticRowForDiagnostic(diagnostic, cursorInfo, source.sourcePath, span, context.seenRows)
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
    const source = describeAddress(store, dataFlow.sourceAddressHandle);
    if (source == null || !sourceReferenceMatchesFile(source, sourceFile)) {
      return [];
    }
    const diagnostics: SemanticTemplateCursorDiagnosticRow[] = [];
    const assignmentDiagnosticKind = bindingSourceAssignmentDiagnosticKind(dataFlow.sourceAssignmentKind);
    if (assignmentDiagnosticKind != null) {
      diagnostics.push(bindingSourceAssignmentDiagnostic(
        store,
        dataFlow,
        bindingSourceAssignmentReasonKinds(dataFlow),
        assignmentDiagnosticKind,
        source,
      ));
    }
    const runtimeDiagnostic = expressionRuntimeEvaluationDiagnosticForDataFlow(store, dataFlow, source);
    if (runtimeDiagnostic != null) {
      diagnostics.push(runtimeDiagnostic);
    }
    const frameworkDiagnostic = bindingDataFlowFrameworkErrorDiagnostic(dataFlow, source);
    if (frameworkDiagnostic != null) {
      diagnostics.push(frameworkDiagnostic);
    }
    return diagnostics.flatMap((diagnostic) => {
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
  });
}

function targetAccessDiagnosticRowsForSelection(
  store: KernelStore,
  selection: TemplateCompletionResourceSelection,
  sourceFile: SemanticRuntimeSourceFileInput | null | undefined,
  context: TemplateDiagnosticsScanContext,
): readonly SemanticTemplateDiagnosticRow[] {
  return selection.resource.runtimeAnalysis.controllerBind.targetAccesses.flatMap((targetAccess) => {
    const source = describeAddress(store, targetAccess.sourceAddressHandle);
    if (source == null || !sourceReferenceMatchesFile(source, sourceFile)) {
      return [];
    }
    const diagnostic = bindingTargetAccessFrameworkErrorDiagnostic(targetAccess, source);
    if (diagnostic == null) {
      return [];
    }
    const key = templateDiagnosticRowKey(diagnostic, source);
    if (context.seenRows.has(key)) {
      return [];
    }
    context.seenRows.add(key);
    return [{
      ...diagnostic,
      siteKind: TemplateCompletionSiteKind.AttributeValue,
      valueSiteKind: null,
      template: {
        compilationLane: selection.lane,
        source: describeAddress(store, selection.sourceAddressHandle),
      },
    }];
  });
}

function expressionParseDiagnosticRowsForSelection(
  store: KernelStore,
  selection: TemplateCompletionResourceSelection,
  sourceFile: SemanticRuntimeSourceFileInput | null | undefined,
  context: TemplateDiagnosticsScanContext,
): readonly SemanticTemplateDiagnosticRow[] {
  return templateExpressionParses(selection.resource).flatMap((parse) => {
    const payload = expressionParseDiagnosticPayload(parse);
    if (payload == null) {
      return [];
    }
    const source = sourceReferenceForExpressionParseDiagnostic(store, parse, payload.span);
    if (source == null || !sourceReferenceMatchesFile(source, sourceFile)) {
      return [];
    }
    const diagnostic = expressionParseErrorDiagnostic(
      payload.message,
      payload.frameworkErrorCode,
      source,
    );
    const key = templateDiagnosticRowKey(diagnostic, source);
    if (context.seenRows.has(key)) {
      return [];
    }
    context.seenRows.add(key);
    return [{
      ...diagnostic,
      siteKind: TemplateCompletionSiteKind.Expression,
      valueSiteKind: parse.site.siteKind,
      template: {
        compilationLane: selection.lane,
        source: describeAddress(store, selection.sourceAddressHandle),
      },
    }];
  });
}

function templateCompilerIssueDiagnosticRowsForSelection(
  store: KernelStore,
  selection: TemplateCompletionResourceSelection,
  sourceFile: SemanticRuntimeSourceFileInput | null | undefined,
  context: TemplateDiagnosticsScanContext,
): readonly SemanticTemplateDiagnosticRow[] {
  return templateCompilerIssues(selection.resource).flatMap((issue) => {
    const source = describeAddress(store, issue.sourceAddressHandle);
    if (source == null || !sourceReferenceMatchesFile(source, sourceFile)) {
      return [];
    }
    const diagnostic = templateCompilerErrorDiagnostic(
      issue.message,
      issue.frameworkErrorCode,
      source,
      issue.severity,
    );
    const key = templateDiagnosticRowKey(diagnostic, source);
    if (context.seenRows.has(key)) {
      return [];
    }
    context.seenRows.add(key);
    return [{
      ...diagnostic,
      siteKind: TemplateCompletionSiteKind.AttributeValue,
      valueSiteKind: null,
      template: {
        compilationLane: selection.lane,
        source: describeAddress(store, selection.sourceAddressHandle),
      },
    }];
  });
}

function runtimeControllerIssueDiagnosticRowsForSelection(
  store: KernelStore,
  selection: TemplateCompletionResourceSelection,
  sourceFile: SemanticRuntimeSourceFileInput | null | undefined,
  context: TemplateDiagnosticsScanContext,
): readonly SemanticTemplateDiagnosticRow[] {
  return selection.resource.runtimeAnalysis.runtimeRendering.controllerIssues.flatMap((issue) => {
    const source = sourceReferenceForRuntimeControllerIssue(store, issue);
    if (source == null || !sourceReferenceMatchesFile(source, sourceFile)) {
      return [];
    }
    const diagnostic = runtimeControllerIssueDiagnostic(issue, source);
    const key = templateDiagnosticRowKey(diagnostic, source);
    if (context.seenRows.has(key)) {
      return [];
    }
    context.seenRows.add(key);
    return [{
      ...diagnostic,
      siteKind: TemplateCompletionSiteKind.AttributeValue,
      valueSiteKind: null,
      template: {
        compilationLane: selection.lane,
        source: describeAddress(store, selection.sourceAddressHandle),
      },
    }];
  });
}

function runtimeRendererIssueDiagnosticRowsForSelection(
  store: KernelStore,
  selection: TemplateCompletionResourceSelection,
  sourceFile: SemanticRuntimeSourceFileInput | null | undefined,
  context: TemplateDiagnosticsScanContext,
): readonly SemanticTemplateDiagnosticRow[] {
  return selection.resource.runtimeAnalysis.runtimeRendering.rendererIssues.flatMap((issue) => {
    const source = sourceReferenceForRuntimeRendererIssue(store, issue);
    if (source == null || !sourceReferenceMatchesFile(source, sourceFile)) {
      return [];
    }
    const diagnostic = runtimeRendererIssueDiagnostic(issue, source);
    const key = templateDiagnosticRowKey(diagnostic, source);
    if (context.seenRows.has(key)) {
      return [];
    }
    context.seenRows.add(key);
    return [{
      ...diagnostic,
      siteKind: TemplateCompletionSiteKind.AttributeValue,
      valueSiteKind: null,
      template: {
        compilationLane: selection.lane,
        source: describeAddress(store, selection.sourceAddressHandle),
      },
    }];
  });
}

function runtimeBindingIssueDiagnosticRowsForSelection(
  store: KernelStore,
  selection: TemplateCompletionResourceSelection,
  sourceFile: SemanticRuntimeSourceFileInput | null | undefined,
  context: TemplateDiagnosticsScanContext,
): readonly SemanticTemplateDiagnosticRow[] {
  const issues = [
    ...selection.resource.runtimeAnalysis.runtimeRendering.bindingIssues,
    ...selection.resource.runtimeAnalysis.i18nTranslationBinding.issues,
  ];
  return issues.flatMap((issue) => {
    const source = sourceReferenceForRuntimeBindingIssue(store, issue);
    if (source == null || !sourceReferenceMatchesFile(source, sourceFile)) {
      return [];
    }
    const diagnostic = runtimeBindingIssueDiagnostic(issue, source);
    const key = templateDiagnosticRowKey(diagnostic, source);
    if (context.seenRows.has(key)) {
      return [];
    }
    context.seenRows.add(key);
    return [{
      ...diagnostic,
      siteKind: TemplateCompletionSiteKind.AttributeValue,
      valueSiteKind: null,
      template: {
        compilationLane: selection.lane,
        source: describeAddress(store, selection.sourceAddressHandle),
      },
    }];
  });
}

function runtimeBindingBehaviorIssueDiagnosticRowsForSelection(
  store: KernelStore,
  selection: TemplateCompletionResourceSelection,
  sourceFile: SemanticRuntimeSourceFileInput | null | undefined,
  context: TemplateDiagnosticsScanContext,
): readonly SemanticTemplateDiagnosticRow[] {
  return selection.resource.runtimeAnalysis.bindingBehavior.issues.flatMap((issue) => {
    const source = sourceReferenceForRuntimeBindingBehaviorIssue(store, issue);
    if (source == null || !sourceReferenceMatchesFile(source, sourceFile)) {
      return [];
    }
    const diagnostic = runtimeBindingBehaviorIssueDiagnostic(issue, source);
    const key = templateDiagnosticRowKey(diagnostic, source);
    if (context.seenRows.has(key)) {
      return [];
    }
    context.seenRows.add(key);
    return [{
      ...diagnostic,
      siteKind: TemplateCompletionSiteKind.AttributeValue,
      valueSiteKind: null,
      template: {
        compilationLane: selection.lane,
        source: describeAddress(store, selection.sourceAddressHandle),
      },
    }];
  });
}

function runtimeValueConverterIssueDiagnosticRowsForSelection(
  store: KernelStore,
  selection: TemplateCompletionResourceSelection,
  sourceFile: SemanticRuntimeSourceFileInput | null | undefined,
  context: TemplateDiagnosticsScanContext,
): readonly SemanticTemplateDiagnosticRow[] {
  return selection.resource.runtimeAnalysis.valueConverter.issues.flatMap((issue) => {
    const source = sourceReferenceForRuntimeValueConverterIssue(store, issue);
    if (source == null || !sourceReferenceMatchesFile(source, sourceFile)) {
      return [];
    }
    const diagnostic = runtimeValueConverterIssueDiagnostic(issue, source);
    const key = templateDiagnosticRowKey(diagnostic, source);
    if (context.seenRows.has(key)) {
      return [];
    }
    context.seenRows.add(key);
    return [{
      ...diagnostic,
      siteKind: TemplateCompletionSiteKind.AttributeValue,
      valueSiteKind: null,
      template: {
        compilationLane: selection.lane,
        source: describeAddress(store, selection.sourceAddressHandle),
      },
    }];
  });
}

function runtimeBindingScopeIssueDiagnosticRowsForSelection(
  store: KernelStore,
  selection: TemplateCompletionResourceSelection,
  sourceFile: SemanticRuntimeSourceFileInput | null | undefined,
  context: TemplateDiagnosticsScanContext,
): readonly SemanticTemplateDiagnosticRow[] {
  return selection.resource.runtimeAnalysis.scopes.scopeIssues.flatMap((issue) => {
    const source = sourceReferenceForRuntimeBindingScopeIssue(store, issue);
    if (source == null || !sourceReferenceMatchesFile(source, sourceFile)) {
      return [];
    }
    const diagnostic = runtimeBindingScopeIssueDiagnostic(issue, source);
    const key = templateDiagnosticRowKey(diagnostic, source);
    if (context.seenRows.has(key)) {
      return [];
    }
    context.seenRows.add(key);
    return [{
      ...diagnostic,
      siteKind: TemplateCompletionSiteKind.Expression,
      valueSiteKind: TemplateValueSiteKind.TemplateControllerValue,
      template: {
        compilationLane: selection.lane,
        source: describeAddress(store, selection.sourceAddressHandle),
      },
    }];
  });
}

function templateCompilerIssues(
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly TemplateCompilerIssue[] {
  return [
    ...resource.compilation.attributeClassification.issues,
    ...resource.compilation.bindingCommandLowering.issues,
    ...resource.compilation.compiledTemplate.issues,
  ];
}

function sourceReferenceForRuntimeControllerIssue(
  store: KernelStore,
  issue: RuntimeControllerIssue,
): NonNullable<SemanticTemplateDiagnosticRow['source']> | null {
  return describeAddress(store, issue.sourceAddressHandle);
}

function sourceReferenceForRuntimeBindingIssue(
  store: KernelStore,
  issue: RuntimeBindingIssue,
): NonNullable<SemanticTemplateDiagnosticRow['source']> | null {
  return describeAddress(store, issue.sourceAddressHandle);
}

function sourceReferenceForRuntimeRendererIssue(
  store: KernelStore,
  issue: RuntimeRendererIssue,
): NonNullable<SemanticTemplateDiagnosticRow['source']> | null {
  return describeAddress(store, issue.sourceAddressHandle);
}

function sourceReferenceForRuntimeBindingBehaviorIssue(
  store: KernelStore,
  issue: RuntimeBindingBehaviorIssue,
): NonNullable<SemanticTemplateDiagnosticRow['source']> | null {
  return describeAddress(store, issue.sourceAddressHandle);
}

function sourceReferenceForRuntimeValueConverterIssue(
  store: KernelStore,
  issue: RuntimeValueConverterIssue,
): NonNullable<SemanticTemplateDiagnosticRow['source']> | null {
  return describeAddress(store, issue.sourceAddressHandle);
}

function sourceReferenceForRuntimeBindingScopeIssue(
  store: KernelStore,
  issue: RuntimeBindingScopeIssue,
): NonNullable<SemanticTemplateDiagnosticRow['source']> | null {
  if (issue.sourceSpan?.file?.path != null) {
    return sourceReferenceForParserSpan(issue.sourceSpan.file.path, issue.sourceSpan, 'range');
  }
  return describeAddress(store, issue.sourceAddressHandle);
}

function expressionParseDiagnosticPayload(
  parse: TemplateExpressionParse,
): {
  readonly frameworkErrorCode: string | null;
  readonly message: string;
  readonly span: SourceSpan | null;
} | null {
  const result = parse.result;
  switch (result.kind) {
    case ExpressionParseResultKind.CompleteInputParseError:
      return {
        frameworkErrorCode: result.frameworkErrorCode,
        message: result.message,
        span: result.primarySpan,
      };
    case ExpressionParseResultKind.PropertyLikeDegradedPublication:
    case ExpressionParseResultKind.PropertyLikeFrontierPublication:
    case ExpressionParseResultKind.IteratorDegradedPublication:
    case ExpressionParseResultKind.IteratorFrontierPublication:
      return result.frameworkErrorCode == null
        ? null
        : {
            frameworkErrorCode: result.frameworkErrorCode,
            message: result.diagnosticMessage ?? 'The expression parser stopped at an incomplete expression frontier.',
            span: result.primarySpan,
          };
    case ExpressionParseResultKind.InterpolationDegradedPublication:
    case ExpressionParseResultKind.InterpolationFrontierPublication:
      return result.activeHole.frameworkErrorCode == null
        ? null
        : {
            frameworkErrorCode: result.activeHole.frameworkErrorCode,
            message: result.activeHole.diagnosticMessage ?? 'The interpolation parser stopped at an incomplete expression frontier.',
            span: result.activeHole.holeSpan,
          };
    default:
      return null;
  }
}

function sourceReferenceForExpressionParseDiagnostic(
  store: KernelStore,
  parse: TemplateExpressionParse,
  span: SourceSpan | null,
): NonNullable<SemanticTemplateDiagnosticRow['source']> | null {
  if (span?.file != null) {
    return sourceReferenceForSpan(span.file.path, span);
  }
  return describeAddress(store, parse.sourceAddressHandle);
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
  const parse = expressionParseForProductHandle(store, expressionProductHandle);
  return parse?.site.siteKind ?? null;
}

function expressionRuntimeEvaluationDiagnosticForDataFlow(
  store: KernelStore,
  dataFlow: RuntimeBindingDataFlow,
  source: NonNullable<SemanticTemplateDiagnosticRow['source']>,
): SemanticTemplateCursorDiagnosticRow | null {
  const frameworkErrorCode = runtimeAstFrameworkErrorCodeForDataFlow(store, dataFlow);
  if (frameworkErrorCode == null) {
    return null;
  }
  return expressionRuntimeEvaluationErrorDiagnostic(
    frameworkErrorCode,
    dataFlow.sourceTypeOpenReason ?? 'The TypeChecker projection reached a runtime expression-evaluation failure.',
    source,
    runtimeAstSelectedMemberName(store, dataFlow),
  );
}

function runtimeAstFrameworkErrorCodeForDataFlow(
  store: KernelStore,
  dataFlow: RuntimeBindingDataFlow,
): RuntimeAstFrameworkErrorCode | RuntimeHtmlAstFrameworkErrorCodeValue | null {
  switch (dataFlow.sourceTypeOpenKind) {
    case CheckerExpressionTypeOpenKind.HostContextNotFound:
      return RuntimeAstFrameworkErrorCode.AstHostNotFound;
    case CheckerExpressionTypeOpenKind.MissingValueConverterResource:
      return RuntimeHtmlAstFrameworkErrorCode.AstConverterNotFound;
    case CheckerExpressionTypeOpenKind.MissingBindingBehaviorResource:
      return RuntimeHtmlAstFrameworkErrorCode.AstBehaviorNotFound;
    case CheckerExpressionTypeOpenKind.DuplicateBindingBehavior:
      return RuntimeHtmlAstFrameworkErrorCode.AstBehaviorDuplicated;
    case CheckerExpressionTypeOpenKind.NullishMemberAccess:
      return dataFlow.strictBinding === true ? RuntimeAstFrameworkErrorCode.AstNullishMemberAccess : null;
    case CheckerExpressionTypeOpenKind.NullishKeyedAccess:
      return dataFlow.strictBinding === true ? RuntimeAstFrameworkErrorCode.AstNullishKeyedAccess : null;
    case CheckerExpressionTypeOpenKind.NullishCallTarget:
      return dataFlow.strictBinding === true
        ? runtimeAstCallTargetFrameworkErrorCode(store, dataFlow)
        : null;
    case CheckerExpressionTypeOpenKind.IncrementInConnectableEvaluation:
      return dataFlowDirectionIncludesSourceToTarget(dataFlow.direction)
        ? RuntimeAstFrameworkErrorCode.AstIncrementInfiniteLoop
        : null;
  }
  if (
    dataFlow.sourceTypeOpenKind !== CheckerExpressionTypeOpenKind.UnsupportedCallTarget
    && dataFlow.sourceTypeOpenKind !== CheckerExpressionTypeOpenKind.UnsupportedConstruct
  ) {
    return null;
  }
  const expression = runtimeAstDiagnosticExpression(store, dataFlow);
  if (expression == null) {
    return null;
  }
  switch (expression.$kind) {
    case 'CallScope':
    case 'CallMember':
      return RuntimeAstFrameworkErrorCode.AstNameIsNotAFunction;
    case 'TaggedTemplate':
      return RuntimeAstFrameworkErrorCode.AstTaggedNotAFunction;
    case 'CallFunction':
    case 'CallGlobal':
    case 'New':
      return RuntimeAstFrameworkErrorCode.AstNotAFunction;
    default:
      return dataFlow.sourceTypeOpenKind === CheckerExpressionTypeOpenKind.UnsupportedConstruct
        ? RuntimeAstFrameworkErrorCode.AstNotAFunction
        : null;
  }
}

function runtimeAstCallTargetFrameworkErrorCode(
  store: KernelStore,
  dataFlow: RuntimeBindingDataFlow,
): RuntimeAstFrameworkErrorCode | null {
  const expression = runtimeAstDiagnosticExpression(store, dataFlow);
  switch (expression?.$kind) {
    case 'CallScope':
    case 'CallMember':
      return RuntimeAstFrameworkErrorCode.AstNameIsNotAFunction;
    case 'CallFunction':
    case 'CallGlobal':
      return RuntimeAstFrameworkErrorCode.AstNotAFunction;
    default:
      return null;
  }
}

function dataFlowDirectionIncludesSourceToTarget(
  direction: RuntimeBindingDataFlowDirection | `${RuntimeBindingDataFlowDirection}`,
): boolean {
  return direction === RuntimeBindingDataFlowDirection.SourceToTarget
    || direction === RuntimeBindingDataFlowDirection.TwoWay;
}

function runtimeAstSelectedMemberName(
  store: KernelStore,
  dataFlow: RuntimeBindingDataFlow,
): string | null {
  const expression = runtimeAstDiagnosticExpression(store, dataFlow);
  switch (expression?.$kind) {
    case 'CallScope':
    case 'CallMember':
    case 'CallGlobal':
      return expression.name.name;
    case 'BindingBehavior':
    case 'ValueConverter':
      return expression.name.name;
    default:
      return dataFlow.sourceName;
  }
}

function runtimeAstDiagnosticExpression(
  store: KernelStore,
  dataFlow: RuntimeBindingDataFlow,
): ExpressionAstNode | null {
  const parse = expressionParseForProductHandle(store, dataFlow.expressionProductHandle);
  const ast = parse == null ? null : runtimeAcceptedBindingExpressionAstForParse(parse);
  return ast == null
    ? null
    : runtimeAstDiagnosticExpressionForOpenKind(ast, dataFlow.sourceTypeOpenKind);
}

function runtimeAstDiagnosticExpressionForOpenKind(
  ast: ExpressionAstNode,
  openKind: RuntimeBindingDataFlow['sourceTypeOpenKind'],
): ExpressionAstNode {
  switch (openKind) {
    case CheckerExpressionTypeOpenKind.MissingValueConverterResource:
      return firstRuntimeAstExpressionKind(ast, 'ValueConverter') ?? ast;
    case CheckerExpressionTypeOpenKind.MissingBindingBehaviorResource:
    case CheckerExpressionTypeOpenKind.DuplicateBindingBehavior:
      return firstRuntimeAstExpressionKind(ast, 'BindingBehavior') ?? ast;
    default:
      return unwrapRuntimeAstDiagnosticExpression(ast);
  }
}

function firstRuntimeAstExpressionKind(
  expression: ExpressionAstNode,
  kind: 'BindingBehavior' | 'ValueConverter',
): ExpressionAstNode | null {
  if (expression.$kind === kind) {
    return expression;
  }
  switch (expression.$kind) {
    case 'BindingBehavior':
    case 'ValueConverter':
      return firstRuntimeAstExpressionKind(expression.expression, kind);
    default:
      return null;
  }
}

function unwrapRuntimeAstDiagnosticExpression(expression: ExpressionAstNode): ExpressionAstNode {
  switch (expression.$kind) {
    case 'BindingBehavior':
    case 'ValueConverter':
      return unwrapRuntimeAstDiagnosticExpression(expression.expression);
    default:
      return expression;
  }
}

function expressionParseForProductHandle(
  store: KernelStore,
  expressionProductHandle: ProductHandle | null,
): TemplateExpressionParse | null {
  return expressionProductHandle == null
    ? null
    : store.productDetails.read(TemplateProductDetails.ExpressionParse, expressionProductHandle);
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
  readonly sourcePath: string;
  readonly hostPath: string;
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
  const sourcePath = file.path;
  const hostPath = sourceFileHostPath(workspaceRootDir, sourcePath);
  let source = cache.get(hostPath);
  if (source === undefined) {
    try {
      const text = readFileSync(hostPath, 'utf8');
      source = {
        sourcePath,
        hostPath,
        text,
        lineStarts: lineStartsForText(text),
      };
    } catch {
      source = null;
    }
    cache.set(hostPath, source);
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
  const expectedValueType = templateDiagnosticExpectedValueTypeForCursor(
    store,
    selection,
    query.locus.kind === InquiryLocusKind.SourceCursor ? query.locus.cursor.offset : null,
    valueSite?.siteKind ?? null,
  );
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
      cursorContext.memberOwnerTypeOpenSubject,
      valueSite?.source ?? html.attributeSource ?? html.source ?? describeAddress(store, selection.sourceAddressHandle),
      expectedValueType?.display ?? null,
      expectedValueType?.source ?? null,
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
  if (
    member == null
    && ownerType?.indexedValueType != null
    && checkerIndexedAccessSupportsString(ownerType.indexedAccessKeyKind)
  ) {
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
