import ts from 'typescript';

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
import {
  clampPublicInquiryPageSize,
  InquiryPageRequest,
  PUBLIC_INQUIRY_MAX_PAGE_SIZE,
} from '../inquiry/page.js';
import {
  isSourceFileAddress,
  sourceSpanAddressForAddress,
  sourceFilePathMatches,
  sourcePathMatchesFileName,
} from '../kernel/source-address.js';
import type { SourceSpanAddress } from '../kernel/address.js';
import {
  sourceSpanContains,
  sourceSpanContainsOffset,
} from '../kernel/address.js';
import type { AddressHandle, IdentityHandle, ProductHandle } from '../kernel/handles.js';
import {
  AuthoredSourceTextCache,
  authoredSourcePositionForOffset,
  type AuthoredSourceText,
} from '../kernel/authored-source-text.js';
import type { SourceSpan } from '../expression/source-span.js';
import { isAureliaExpressionGlobalName } from '../expression/global-names.js';
import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import {
  ExpressionParseResultInspector,
  type ExpressionMemberAccessSpan,
  type ExpressionScopeAccess,
} from '../expression/parse-result-inspection.js';
import type { KernelStore } from '../kernel/store.js';
import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import { BindingContextSlotAssignmentAccessKind } from '../configuration/scope.js';
import {
  SemanticAppAnalysisDepth,
  semanticAppAnalysisDepthSatisfies,
} from '../configuration/app-analysis.js';
import type { TemplateResourceRuntimeAnalysisEmission } from '../template/template-compilation-project-pass.js';
import type { TemplateCompilerIssue } from '../template/compiler-issue.js';
import type { RuntimeBindingScopeIssue } from '../template/runtime-binding-scope-issue.js';
import type { RuntimeBindingIssue } from '../template/runtime-binding-issue.js';
import type { RuntimeBindingBehaviorIssue } from '../template/runtime-binding-behavior.js';
import type { RuntimeValueConverterIssue } from '../template/runtime-value-converter.js';
import type { RuntimeControllerIssue } from '../template/runtime-controller-issue.js';
import type { RuntimeRendererIssue } from '../template/runtime-renderer-issue.js';
import { RefBindingInstruction } from '../template/instruction-ir.js';
import type { RouterIssueModel } from '../router/model.js';
import type { RouteParameterEndpointPlan } from '../router/route-instruction-materialization.js';
import {
  FrameworkCapabilityAdmissionState,
  FrameworkCapabilityDemandSiteKind,
  type FrameworkCapabilityDemand,
} from '../framework/capability-demand.js';
import type { TemplateExpressionParse } from '../template/value-site.js';
import { TemplateValueSiteKind } from '../template/value-site.js';
import { TemplateProductDetails } from '../template/product-details.js';
import { readTemplateExpressionParse } from '../template/expression-parse-product.js';
import type {
  HtmlAttribute,
  HtmlIrNode,
} from '../template/html-ir.js';
import { HtmlElement } from '../template/html-ir.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import {
  taxonomyResourceKindForDefinition,
  type FullResourceDefinition,
} from '../resources/resource-definition.js';
import { TypeSystemHotDetails, TypeSystemProductDetails } from '../type-system/product-details.js';
import {
  readTypeSystemOverlayDiagnostics,
  type TypeSystemOverlayDiagnostic,
} from '../type-system/diagnostics.js';
import { readRouterIssues } from './route-projections.js';
import { semanticTypeScriptDiagnosticSeverity } from './typescript-diagnostics.js';
import { TypeSystemProjectBuilder, type TypeSystemProject } from '../type-system/project.js';
import type { CheckerTypeProjector } from '../type-system/checker-projector.js';
import {
  checkerPropertySymbol,
  checkerSymbolValueType,
} from '../type-system/checker-node-helpers.js';
import {
  CheckerTypeMemberKind,
  checkerIndexedAccessSupportsString,
  checkerTypeMemberReachableIdentityHandle,
} from '../type-system/type-shape.js';
import { checkerTypeMemberSourceAddressHandle } from '../type-system/checker-type-member-source.js';
import { readOrProjectCheckerTypeMembersInProjection } from '../type-system/checker-type-member-surface.js';
import type { RuntimeBindingDataFlow } from '../observation/runtime-binding-observation.js';
import type { TemplateBindableReference } from '../template/compiler-world-reference.js';
import {
  semanticClosureForInquiry,
  semanticOutcomeForInquiry,
} from './answer.js';
import { resolveSemanticSourceCursor } from './source-cursor.js';
import { closureForAnswer } from './answer-helpers.js';
import type {
  SemanticRuntimePageResult,
  SemanticRuntimeSourceFileInput,
  SemanticRuntimeSourceCursorInput,
  SemanticDiagnosticRelation,
  SemanticDiagnosticSubject,
  SemanticTemplateCompilationRow,
  SemanticTemplateCursorBindableRow,
  SemanticTemplateCursorDiagnosticRow,
  SemanticTemplateCompletionCandidateRow,
  SemanticTemplateDiagnosticRow,
  SemanticTemplateDiagnosticPhase,
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
  SemanticDiagnosticProjectionPolicy,
  SemanticRuntimeAnswerClosure,
  SemanticRuntimeAnswerOutcome,
  SemanticRuntimeDetail,
  type SemanticRuntimeAnswer,
} from './contracts.js';
import {
  projectBindableDefinitionSources,
  projectBindableDefinitionSurface,
} from './bindable-projection.js';
import {
  describeAddress,
  semanticSourceReferenceContainsOffset,
  semanticSourceReferenceMatchesFilePath,
  sourceReferenceForParserSpan,
} from './source-reference.js';
import {
  bindingDataFlowDiagnosticSource,
  bindingDataFlowDiagnostics,
  bindingTargetAccessFrameworkErrorDiagnostic,
  cursorDiagnosticRows,
  expressionParseErrorDiagnostic,
  missingExpressionRootDiagnostic,
  runtimeBindingIssueDiagnostic,
  runtimeBindingBehaviorIssueDiagnostic,
  runtimeBindingScopeIssueDiagnostic,
  runtimeRendererIssueDiagnostic,
  runtimeValueConverterIssueDiagnostic,
  runtimeControllerIssueDiagnostic,
  routerIssueDiagnostic,
  frameworkCapabilityDemandDiagnostic,
  unsupportedExpressionGlobalDiagnostic,
  templateCompilerErrorDiagnostic,
} from './template-diagnostic-policy.js';
import {
  resourceLocalBindingDataFlows,
  resourceLocalBindingTargetAccesses,
  resourceLocalCompilerReachableHtmlAttributeProductHandles,
} from '../template/runtime-resource-ownership.js';
import {
  resourceLocalEffectiveTemplateExpressionParses,
} from '../template/template-expression-selection.js';
import {
  TemplateTypeSystemOverlayBuilder,
  type TemplateTypeSystemOverlayEmission,
} from '../template/template-type-system-overlay.js';
import {
  TemplateDiagnosticRelations,
  type TemplateDiagnosticRelationOrigin,
} from './template-diagnostic-relations.js';

type TemplateCompilationLane = SemanticTemplateCompilationRow['compilationLane'];

const templateOverlayDiagnosticsByEmission = new WeakMap<AureliaAppWorldProjectEmission, TemplateOverlayDiagnosticCache>();

interface TemplateDiagnosticExpectedValueType {
  readonly display: string;
  readonly source: SemanticTemplateCursorSuggestionValueTypeSource;
}

type TemplateCompletionResourceSelection = {
  readonly resource: TemplateResourceRuntimeAnalysisEmission;
  readonly lane: TemplateCompilationLane;
  readonly sourceAddressHandle: SourceSpanAddress['handle'] | null;
};

interface TemplateOverlayDiagnosticSelection {
  readonly selection: TemplateCompletionResourceSelection;
  readonly emission: TemplateTypeSystemOverlayEmission;
}

interface TemplateOverlayDiagnosticCache {
  readonly diagnostics: readonly TypeSystemOverlayDiagnostic[];
  readonly selectionsByOriginKey: ReadonlyMap<string, TemplateOverlayDiagnosticSelection>;
}

interface TemplateOverlayDiagnosticSubjectProjection {
  readonly subject: SemanticDiagnosticSubject | null;
  readonly memberAccess: ExpressionMemberAccessSpan | null;
}

interface TemplateCompletionReadResult {
  readonly outcome: SemanticRuntimeAnswerOutcome;
  readonly closure: SemanticRuntimeAnswerClosure;
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
  readonly store: KernelStore;
  readonly includeHandles: boolean;
  readonly capabilityDemands: readonly FrameworkCapabilityDemand[];
  readonly routeConfigProductHandles: readonly ProductHandle[];
  readonly routeParameterEndpointPlans: ReadonlyMap<ProductHandle, RouteParameterEndpointPlan>;
  readonly i18nTranslationKeyProductHandles: readonly ProductHandle[];
  readonly sourceTextCache: AuthoredSourceTextCache;
  readonly diagnosticRelationsByResource: WeakMap<TemplateResourceRuntimeAnalysisEmission, TemplateDiagnosticRelations>;
  readonly seenRows: Set<string>;
}

interface TemplateDiagnosticOrigin {
  readonly phase: SemanticTemplateDiagnosticPhase | null;
  readonly semanticProductHandle: ProductHandle | null;
  readonly sourceAddressHandle: AddressHandle | null;
  readonly overlayOriginKey?: string | null;
  readonly overlayFileName?: string | null;
  readonly overlaySegmentLabel?: string | null;
}

type TemplateDiagnosticOriginFields = Pick<SemanticTemplateDiagnosticRow, 'phase'> & {
  readonly diagnosticIdentityHandle: IdentityHandle | null;
  readonly handles?: NonNullable<SemanticTemplateDiagnosticRow['handles']>;
};

interface ExpressionMemberDiagnosticSite {
  readonly span: ExpressionMemberAccessSpan;
  readonly parse: TemplateExpressionParse;
}

interface ExpressionRootDiagnosticSite {
  readonly access: ExpressionScopeAccess;
  readonly parse: TemplateExpressionParse;
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
    closure: read.closure,
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
  diagnosticProjection: SemanticDiagnosticProjectionPolicy | `${SemanticDiagnosticProjectionPolicy}` | null | undefined = SemanticDiagnosticProjectionPolicy.TypeProjection,
): SemanticRuntimeAnswer<SemanticTemplateCursorInfoResult> {
  const readContext = readContextForCursor(store, workspaceRootDir, projectRootDir, emission, cursor, new InquiryPageRequest(1, null));
  if ('outcome' in readContext) {
    return missingTemplateCursorInfo(readContext);
  }
  const read = readTemplateCursorInfoValue(
    store,
    workspaceRootDir,
    projectRootDir,
    emission,
    readContext,
    detail === SemanticRuntimeDetail.Handles,
    diagnosticProjection,
  );
  const outcome = read.missingInputs.length === 0 ? SemanticRuntimeAnswerOutcome.Hit : SemanticRuntimeAnswerOutcome.Partial;
  return {
    schemaVersion: SEMANTIC_RUNTIME_API_VERSION,
    outcome,
    closure: closureForAnswer(outcome),
    summary: `Resolved template cursor as ${read.value.siteKind}.`,
    value: read.value,
    page: null,
  };
}

function readTemplateCursorInfoValue(
  store: KernelStore,
  workspaceRootDir: string,
  projectRootDir: string,
  emission: AureliaAppWorldProjectEmission,
  readContext: TemplateCompletionReadContext,
  includeHandles: boolean,
  diagnosticProjection: SemanticDiagnosticProjectionPolicy | `${SemanticDiagnosticProjectionPolicy}` | null | undefined,
): {
  readonly value: SemanticTemplateCursorInfoResult;
  readonly missingInputs: readonly string[];
} {
  const cursorContext = templateCompletionQueryForCursor(store, {
    locus: readContext.locus,
    resource: readContext.selection.resource,
    typeSystem: emission.typeSystem,
    page: new InquiryPageRequest(1, null),
    routeConfigProductHandles: emission.routes.readRouteConfigs().map((routeConfig) => routeConfig.productHandle),
    routeParameterEndpointPlans: emission.routeInstructions.readRouteParameterEndpointPlans(),
    i18nTranslationKeyProductHandles: emission.i18n.readTranslationKeys().map((translationKey) => translationKey.productHandle),
  });
  const missingInputs = [...new Set(cursorContext.missingInputs)];
  const cursorOffset = readContext.locus.cursor.offset;
  const baseValue = templateCursorInfoResult(store, readContext.selection, cursorContext, includeHandles, missingInputs);
  const diagnostics = cursorOffset == null
    ? []
    : readTemplateDiagnosticRows(
        store,
        workspaceRootDir,
        projectRootDir,
        emission,
        { filePath: readContext.locus.cursor.filePath },
        includeHandles,
        diagnosticProjection,
      ).filter((diagnostic) =>
        semanticSourceReferenceContainsOffset(diagnostic.source, cursorOffset)
      );
  return {
    missingInputs,
    value: withCursorDiagnostics(baseValue, diagnostics),
  };
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
  for (const dataFlow of resourceLocalBindingDataFlows(store, selection.resource)) {
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

function withCursorDiagnostics(
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
  const nextValue = {
    ...value,
    diagnostics: [...byKey.values()],
  };
  return {
    ...nextValue,
    displayText: semanticTemplateCursorInfoDisplayText(nextValue),
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
  diagnosticProjection: SemanticDiagnosticProjectionPolicy | `${SemanticDiagnosticProjectionPolicy}` | null | undefined = SemanticDiagnosticProjectionPolicy.TypeProjection,
): SemanticRuntimeAnswer<SemanticTemplateDiagnosticsResult> {
  const rows = readTemplateDiagnosticRows(
    store,
    workspaceRootDir,
    projectRootDir,
    emission,
    sourceFile,
    detail === SemanticRuntimeDetail.Handles,
    diagnosticProjection,
  );
  const paged = pageTemplateDiagnosticRows(rows, page);
  const scopedToSourceFile = sourceFile != null;
  return {
    schemaVersion: SEMANTIC_RUNTIME_API_VERSION,
    outcome: paged.page.nextCursor == null
      ? SemanticRuntimeAnswerOutcome.Hit
      : SemanticRuntimeAnswerOutcome.Partial,
    closure: closureForAnswer(
      paged.page.nextCursor == null
        ? SemanticRuntimeAnswerOutcome.Hit
        : SemanticRuntimeAnswerOutcome.Partial,
      paged.page,
    ),
    summary: !scopedToSourceFile
      ? `Returned ${paged.rows.length} of ${rows.length} template diagnostic row(s) from the opened app basis.`
      : `Returned ${paged.rows.length} of ${rows.length} template diagnostic row(s) for the requested source file.`,
    value: {
      displayText: semanticTemplateDiagnosticsDisplayText(paged.rows, rows.length, scopedToSourceFile),
      rows: paged.rows,
    },
    page: paged.page,
  };
}

function semanticTemplateDiagnosticsDisplayText(
  rows: readonly SemanticTemplateDiagnosticRow[],
  totalRows: number,
  scopedToSourceFile: boolean,
): string {
  const lines = [
    `Template diagnostics: returned ${rows.length} of ${totalRows} row(s) ${scopedToSourceFile ? 'for the requested source file' : 'from the opened app basis'}.`,
  ];
  if (totalRows === 0) {
    lines.push('Pressure: no template diagnostics in this locus.');
  } else {
    lines.push(`Returned-page severity: ${formatCountMap(countValues(rows, (row) => row.severity))}.`);
    lines.push(`Kinds: ${formatList(uniqueValues(rows, (row) => row.diagnosticKind, TEMPLATE_DISPLAY_LIST_LIMIT))}.`);
    const frameworkCodes = uniqueValues(rows, (row) => row.frameworkErrorCode, TEMPLATE_DISPLAY_LIST_LIMIT);
    if (frameworkCodes.length > 0) {
      lines.push(`Framework codes: ${frameworkCodes.join(', ')}.`);
    }
    lines.push('Next: page raw diagnostics only after the severity/kind cluster identifies an actionable source locus.');
  }
  return lines.join('\n');
}

function semanticTemplateCompletionDisplayText(
  value: Omit<SemanticTemplateCompletionResult, 'displayText'>,
): string {
  const lines = [
    `Template completions: site=${value.siteKind}; candidates=${value.candidates.length}; template=${templateLocationDisplay(value.template)}.`,
  ];
  if (value.expressionFrontier != null) {
    lines.push(`Expression frontier: ${value.expressionFrontier.frontierKind ?? 'none'}; continuations=${formatList(value.expressionFrontier.expectedContinuationClasses)}.`);
  }
  if (value.missingInputs.length > 0) {
    lines.push(`Missing inputs: ${value.missingInputs.join(', ')}.`);
  }
  if (value.candidates.length > 0) {
    lines.push(`Candidates: ${value.candidates.slice(0, TEMPLATE_DISPLAY_LIST_LIMIT).map((candidate) =>
      `${candidate.name} (${candidate.candidateKind}/${candidate.sourceKind}${templateCompletionMemberFactDisplay(candidate)})`
    ).join('; ')}${value.candidates.length > TEMPLATE_DISPLAY_LIST_LIMIT ? `; +${value.candidates.length - TEMPLATE_DISPLAY_LIST_LIMIT} more` : ''}.`);
  }
  lines.push('Next: use aurelia_template_cursor_info at the same cursor when selected member, bindable, owner type, or cursor diagnostics are needed.');
  return lines.join('\n');
}

function semanticTemplateCursorInfoDisplayText(
  value: Omit<SemanticTemplateCursorInfoResult, 'displayText'>,
): string {
  const lines = [
    `Template cursor: site=${value.siteKind}; template=${templateLocationDisplay(value.template)}; html=${htmlCursorDisplay(value.html)}.`,
  ];
  if (value.valueSite != null) {
    lines.push(`Value site: ${value.valueSite.siteKind}${value.valueSite.bindingCommandName == null ? '' : ` via ${value.valueSite.bindingCommandName}`}; value=${trimTemplateDisplay(value.valueSite.rawValue)}.`);
  }
  if (value.selectedDefinition != null) {
    lines.push(`Selected resource: ${value.selectedDefinition.resourceKind} ${value.selectedDefinition.name ?? value.selectedDefinition.targetName ?? 'unnamed'}.`);
  }
  if (value.selectedBindable != null) {
    lines.push(`Selected bindable: ${value.selectedBindable.attribute} (${value.selectedBindable.mode}).`);
  }
  if (value.selectedMember != null || value.memberOwnerType != null || value.selectedMemberName != null) {
    lines.push(`Selected member: ${value.selectedMemberName ?? value.selectedMember?.name ?? 'none'}; owner=${value.memberOwnerType?.display ?? 'unknown'}; memberType=${value.selectedMember?.typeDisplay ?? 'unknown'}.`);
  }
  if (value.expressionFrontier != null) {
    lines.push(`Expression frontier: ${value.expressionFrontier.frontierKind ?? 'none'}; continuations=${formatList(value.expressionFrontier.expectedContinuationClasses)}.`);
  }
  if (value.missingInputs.length > 0) {
    lines.push(`Missing inputs: ${value.missingInputs.join(', ')}.`);
  }
  if (value.diagnostics.length === 0) {
    lines.push('Diagnostics: none at this cursor.');
  } else {
    lines.push(`Diagnostics: ${value.diagnostics.length}; severities=${formatCountMap(countValues(value.diagnostics, (row) => row.severity))}; kinds=${formatList(uniqueValues(value.diagnostics, (row) => row.diagnosticKind, TEMPLATE_DISPLAY_LIST_LIMIT))}.`);
  }
  lines.push('Next: use aurelia_template_completions for candidate names, aurelia_template_diagnostics for file-level pressure, or binding summary queries for runtime value flow.');
  return lines.join('\n');
}

const TEMPLATE_DISPLAY_LIST_LIMIT = 5;

function templateLocationDisplay(
  template: { readonly compilationLane: TemplateCompilationLane | null; readonly source: { readonly path?: string | null } | null },
): string {
  return `${template.compilationLane ?? 'unknown'}${template.source?.path == null ? '' : ` ${template.source.path}`}`;
}

function htmlCursorDisplay(row: SemanticTemplateCursorHtmlRow): string {
  const tag = row.tagName == null ? row.nodeKind ?? 'unknown-node' : `<${row.tagName}>`;
  return row.attributeName == null ? tag : `${tag}@${row.attributeName}`;
}

function formatList(values: readonly unknown[]): string {
  return values.length === 0 ? 'none' : values.map(String).join(', ');
}

function countValues<TRow>(
  rows: readonly TRow[],
  read: (row: TRow) => string | null,
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = read(row);
    if (value != null) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return counts;
}

function uniqueValues<TRow>(
  rows: readonly TRow[],
  read: (row: TRow) => string | null,
  limit: number,
): readonly string[] {
  return [...new Set(rows.map(read).filter((value): value is string => value != null))]
    .sort((left, right) => left.localeCompare(right))
    .slice(0, limit);
}

function formatCountMap(counts: ReadonlyMap<string, number>): string {
  if (counts.size === 0) {
    return 'none';
  }
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => `${key}=${count}`)
    .join(', ');
}

function trimTemplateDisplay(value: string): string {
  const normalized = value.replace(/\s+/gu, ' ').trim();
  return normalized.length <= 120 ? normalized : `${normalized.slice(0, 117)}...`;
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
    typeSystem: emission.typeSystem,
    page,
    routeConfigProductHandles: emission.routes.readRouteConfigs().map((routeConfig) => routeConfig.productHandle),
    routeParameterEndpointPlans: emission.routeInstructions.readRouteParameterEndpointPlans(),
    i18nTranslationKeyProductHandles: emission.i18n.readTranslationKeys().map((translationKey) => translationKey.productHandle),
  });
  const answer = answerTemplateCompletion(store, cursorContext.query, cursorContext.expressionWorld);
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

  const resolution = resolveSemanticSourceCursor(
    workspaceRootDir,
    projectRootDir,
    cursor,
    emission.project.inputGeneration.host,
  );
  if (resolution.cursor == null || resolution.cursor.offset == null) {
    return missingTemplateCompletion(
      page,
      resolution.missingInputs,
      resolution.summary ?? 'Template completion requires a source offset or readable source file.',
    );
  }
  const offset = resolution.cursor.offset;
  const resolvedCursor = resolution.cursor;

  const selection = selectTemplateResourceForCursor(store, emission, resolvedCursor.filePath, offset);
  if (selection == null) {
    return missingTemplateCompletion(page, ['template-resource'], 'No compiled template resource was available for the supplied source cursor.');
  }

  return {
    locus: new SourceCursorInquiryLocus(
      new SourceTextCursor(resolvedCursor.filePath, resolvedCursor.line, resolvedCursor.character, offset),
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
  diagnosticProjection: SemanticDiagnosticProjectionPolicy | `${SemanticDiagnosticProjectionPolicy}` | null | undefined = SemanticDiagnosticProjectionPolicy.TypeProjection,
): readonly SemanticTemplateDiagnosticRow[] {
  const projectionPolicy = normalizeSemanticDiagnosticProjectionPolicy(diagnosticProjection);
  const context = templateDiagnosticsScanContext(store, workspaceRootDir, emission, includeHandles);
  const selections = templateResourceSelections(store, emission)
    .filter((selection) => templateDiagnosticSelectionMatchesFile(store, selection, sourceFile));
  const rows = [
    ...selections.flatMap((selection) => expressionParseDiagnosticRowsForSelection(store, selection, sourceFile, context)),
    ...selections.flatMap((selection) => frameworkCapabilityDemandDiagnosticRowsForSelection(store, emission, selection, sourceFile, context)),
    ...selections.flatMap((selection) => templateCompilerIssueDiagnosticRowsForSelection(store, selection, sourceFile, context)),
    ...selections.flatMap((selection) => runtimeControllerIssueDiagnosticRowsForSelection(store, selection, sourceFile, context)),
    ...selections.flatMap((selection) => runtimeRendererIssueDiagnosticRowsForSelection(store, selection, sourceFile, context)),
    ...selections.flatMap((selection) => runtimeBindingIssueDiagnosticRowsForSelection(store, selection, sourceFile, context)),
    ...selections.flatMap((selection) => runtimeBindingBehaviorIssueDiagnosticRowsForSelection(store, selection, sourceFile, context)),
    ...selections.flatMap((selection) => runtimeValueConverterIssueDiagnosticRowsForSelection(store, selection, sourceFile, context)),
    ...selections.flatMap((selection) => runtimeBindingScopeIssueDiagnosticRowsForSelection(store, selection, sourceFile, context)),
    ...selections.flatMap((selection) => routerIssueDiagnosticRowsForSelection(store, emission, selection, sourceFile, context)),
    ...selections.flatMap((selection) => targetAccessDiagnosticRowsForSelection(store, selection, sourceFile, context)),
    ...typeProjectionTemplateDiagnosticRows(store, workspaceRootDir, emission, selections, context, projectionPolicy),
    ...selections.flatMap((selection) => bindingDataFlowDiagnosticRowsForSelection(store, selection, sourceFile, context)),
    ...selections.flatMap((selection) => expressionRootDiagnosticRowsForSelection(store, emission, selection, sourceFile, context)),
    ...templateOverlayTypeDiagnosticRows(store, emission, selections, sourceFile, context, projectionPolicy),
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

function typeProjectionTemplateDiagnosticRows(
  store: KernelStore,
  workspaceRootDir: string,
  emission: AureliaAppWorldProjectEmission,
  selections: readonly TemplateCompletionResourceSelection[],
  context: TemplateDiagnosticsScanContext,
  diagnosticProjection: SemanticDiagnosticProjectionPolicy,
): readonly SemanticTemplateDiagnosticRow[] {
  if (
    diagnosticProjection !== SemanticDiagnosticProjectionPolicy.TypeProjection
    || !semanticAppAnalysisDepthSatisfies(emission.analysisDepth, SemanticAppAnalysisDepth.BindingObservation)
  ) {
    return [];
  }
  return selections.flatMap((selection) =>
    templateDiagnosticRowsForSelection(store, workspaceRootDir, emission, selection, context)
  );
}

function templateOverlayTypeDiagnosticRows(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  selections: readonly TemplateCompletionResourceSelection[],
  sourceFile: SemanticRuntimeSourceFileInput | null | undefined,
  context: TemplateDiagnosticsScanContext,
  diagnosticProjection: SemanticDiagnosticProjectionPolicy,
): readonly SemanticTemplateDiagnosticRow[] {
  if (
    diagnosticProjection !== SemanticDiagnosticProjectionPolicy.TypeProjection
    || !semanticAppAnalysisDepthSatisfies(emission.analysisDepth, SemanticAppAnalysisDepth.BindingObservation)
  ) {
    return [];
  }
  const allowedOriginKeys = new Set(selections.map((selection) =>
    templateOverlayOriginKey(selection.resource)
  ));
  const cache = templateOverlayDiagnosticCache(store, emission);
  return cache.diagnostics.flatMap((diagnostic) => {
    if (!allowedOriginKeys.has(diagnostic.overlayOriginKey)) {
      return [];
    }
    const selection = cache.selectionsByOriginKey.get(diagnostic.overlayOriginKey);
    if (selection == null) {
      return [];
    }
    const source = sourceReferenceForOverlayDiagnostic(store, diagnostic);
    if (source == null || !sourceReferenceMatchesFile(source, sourceFile)) {
      return [];
    }
    const row = templateOverlayDiagnosticRow(store, selection.selection, diagnostic, source, context);
    const key = templateDiagnosticRowKey(row, source);
    if (context.seenRows.has(key)) {
      return [];
    }
    context.seenRows.add(key);
    return [row];
  });
}

function templateOverlayDiagnosticCache(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
): TemplateOverlayDiagnosticCache {
  const cached = templateOverlayDiagnosticsByEmission.get(emission);
  if (cached != null) {
    return cached;
  }
  const builder = new TemplateTypeSystemOverlayBuilder(store, emission.project, emission.typeSystem);
  const overlaySelections: TemplateOverlayDiagnosticSelection[] = templateResourceSelections(store, emission)
    .map((selection): TemplateOverlayDiagnosticSelection => ({
      selection,
      emission: builder.build(selection.resource, selection.resource.compilation.localKey),
    }))
    .filter((selection) => selection.emission.overlaySource != null);
  if (overlaySelections.length === 0) {
    const empty = {
      diagnostics: [],
      selectionsByOriginKey: new Map(),
    };
    templateOverlayDiagnosticsByEmission.set(emission, empty);
    return empty;
  }
  const overlaySources = overlaySelections.flatMap((selection) =>
    selection.emission.overlaySource == null ? [] : [selection.emission.overlaySource]
  );
  const overlayTypeSystem = new TypeSystemProjectBuilder(emission.typeSystem.programSources).build(
    emission.project,
    emission.evaluation,
    { overlaySources },
  );
  const selectionsByOriginKey = new Map<string, TemplateOverlayDiagnosticSelection>();
  for (const selection of overlaySelections) {
    const overlaySource = selection.emission.overlaySource;
    if (overlaySource != null) {
      selectionsByOriginKey.set(overlaySource.originKey, selection);
    }
  }
  const result = {
    diagnostics: readTypeSystemOverlayDiagnostics(overlayTypeSystem)
      .filter((diagnostic) =>
        selectionsByOriginKey.has(diagnostic.overlayOriginKey)
        && templateOverlayDiagnosticIsPublic(diagnostic)
      ),
    selectionsByOriginKey,
  };
  templateOverlayDiagnosticsByEmission.set(emission, result);
  return result;
}

function templateOverlayOriginKey(
  resource: TemplateResourceRuntimeAnalysisEmission,
): string {
  return `template-type-system-overlay:${resource.compilation.localKey}`;
}

function templateDiagnosticOriginFields(
  store: KernelStore,
  includeHandles: boolean,
  origin: TemplateDiagnosticOrigin,
): TemplateDiagnosticOriginFields {
  const semanticIdentityHandle = origin.semanticProductHandle == null
    ? null
    : store.readProduct(origin.semanticProductHandle)?.identityHandle ?? null;
  return {
    phase: origin.phase,
    diagnosticIdentityHandle: semanticIdentityHandle,
    ...(includeHandles
      ? {
        handles: {
          sourceAddressHandle: origin.sourceAddressHandle,
          semanticProductHandle: origin.semanticProductHandle,
          semanticIdentityHandle,
          overlayOriginKey: origin.overlayOriginKey ?? null,
          overlayFileName: origin.overlayFileName ?? null,
          overlaySegmentLabel: origin.overlaySegmentLabel ?? null,
        },
      }
      : {}),
  };
}

function templateOverlayDiagnosticRow(
  store: KernelStore,
  selection: TemplateCompletionResourceSelection,
  diagnostic: TypeSystemOverlayDiagnostic,
  source: NonNullable<SemanticTemplateDiagnosticRow['source']>,
  context: TemplateDiagnosticsScanContext,
): SemanticTemplateDiagnosticRow {
  const missingInput = `typescript:TS${diagnostic.diagnostic.code}`;
  const suggestion = templateOverlayDiagnosticSuggestion(diagnostic, source);
  const subject = templateOverlayDiagnosticSubject(store, selection.resource, diagnostic, source);
  const parse = diagnostic.semanticProductHandle == null
    ? null
    : readTemplateExpressionParse(store, diagnostic.semanticProductHandle);
  return {
    diagnosticKind: 'template-expression-typescript-diagnostic',
    diagnosticAuthority: 'typescript',
    frameworkErrorCode: null,
    severity: semanticTypeScriptDiagnosticSeverity(diagnostic.diagnostic.category),
    summary: `TS${diagnostic.diagnostic.code}: ${diagnostic.diagnostic.message}`,
    missingInput,
    missingInputs: [missingInput],
    source,
    subject: subject.subject,
    selectedMemberName: null,
    ownerTypeDisplay: null,
    ownerTypeShapeKind: null,
    ownerTypeOrigin: null,
    suggestion,
    siteKind: TemplateCompletionSiteKind.Expression,
    valueSiteKind: TemplateValueSiteKind.BindingCommandValue,
    template: {
      compilationLane: selection.lane,
      source: describeAddress(store, selection.sourceAddressHandle),
    },
    ...templateDiagnosticOriginFields(store, context.includeHandles, {
      phase: diagnostic.diagnostic.phase,
      sourceAddressHandle: diagnostic.authoredSource?.sourceAddressHandle ?? null,
      semanticProductHandle: diagnostic.semanticProductHandle,
      overlayOriginKey: diagnostic.overlayOriginKey,
      overlayFileName: diagnostic.overlayFileName,
      overlaySegmentLabel: diagnostic.segment?.label ?? null,
    }),
    ...templateDiagnosticRelationFields(
      diagnostic.diagnostic.code === 18046 && parse != null && subject.memberAccess != null
        ? templateDiagnosticRelations(selection, context)
          .forExpressionSubject(parse, subject.memberAccess.subjectSpan)
        : null,
    ),
  };
}

function templateOverlayDiagnosticSubject(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  diagnostic: TypeSystemOverlayDiagnostic,
  source: NonNullable<SemanticTemplateDiagnosticRow['source']>,
): TemplateOverlayDiagnosticSubjectProjection {
  return templateExpressionDiagnosticSubjectProjection(
    store,
    resource,
    diagnostic.semanticProductHandle,
    source,
  );
}

function templateExpressionDiagnosticSubjectProjection(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  semanticProductHandle: ProductHandle | null,
  source: NonNullable<SemanticTemplateDiagnosticRow['source']>,
  subjectName: string | null = null,
): TemplateOverlayDiagnosticSubjectProjection {
  if (source.path == null || source.start == null || source.end == null) {
    return { subject: null, memberAccess: null };
  }
  const memberAccess = memberAccessSpanForDiagnosticRange(
    store,
    resource,
    semanticProductHandle,
    source.start,
    source.end,
  );
  return {
    memberAccess,
    subject: memberAccess == null
      ? {
        subjectKind: 'template-expression',
        subjectName,
        source,
      }
      : diagnosticSubjectForSpan(
        source.path,
        memberAccess.subjectKind,
        memberAccess.subjectSpan,
        subjectName,
      ),
  };
}

function templateExpressionDiagnosticSubject(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  semanticProductHandle: ProductHandle | null,
  source: NonNullable<SemanticTemplateDiagnosticRow['source']>,
  subjectName: string | null = null,
): SemanticDiagnosticSubject | null {
  return templateExpressionDiagnosticSubjectProjection(
    store,
    resource,
    semanticProductHandle,
    source,
    subjectName,
  ).subject;
}

function memberAccessSpanForDiagnosticRange(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  semanticProductHandle: ProductHandle | null,
  start: number,
  end: number,
): ExpressionMemberAccessSpan | null {
  const parses = resourceLocalEffectiveTemplateExpressionParses(store, resource);
  const preferred = semanticProductHandle == null
    ? []
    : parses.filter((parse) => parse.productHandle === semanticProductHandle);
  for (const parse of [...preferred, ...parses]) {
    const access = ExpressionParseResultInspector.memberAccessSpans(parse.result)
      .find((span) => span.subjectSpan.start <= start && end <= span.subjectSpan.end);
    if (access != null) {
      return access;
    }
  }
  return null;
}

function templateOverlayDiagnosticSuggestion(
  diagnostic: TypeSystemOverlayDiagnostic,
  source: NonNullable<SemanticTemplateDiagnosticRow['source']>,
): NonNullable<SemanticTemplateDiagnosticRow['suggestion']> {
  const nullish = templateOverlayDiagnosticIsNullish(diagnostic.diagnostic.code);
  return {
    suggestionKind: nullish ? 'guard-nullish-expression' : 'inspect-owner-type',
    actionKind: nullish ? 'rewrite-expression' : 'inspect-owner-type',
    actionTarget: {
      targetKind: 'expression',
      source,
      memberName: null,
      typeDisplay: null,
    },
    summary: nullish
      ? `Guard or narrow the nullable template expression before reading through it for TS${diagnostic.diagnostic.code}.`
      : `Inspect the template expression and its TypeScript owner surface for TS${diagnostic.diagnostic.code}.`,
    targetMemberName: null,
    ownerTypeDisplay: null,
    valueTypeDisplay: null,
    valueTypeSource: null,
  };
}

function templateOverlayDiagnosticIsNullish(code: number): boolean {
  switch (code) {
    case 2532:
    case 18047:
    case 18048:
      return true;
    default:
      return false;
  }
}

function templateOverlayDiagnosticIsPublic(
  diagnostic: TypeSystemOverlayDiagnostic,
): boolean {
  if (diagnostic.authoredSource == null || diagnostic.diagnostic.phase !== 'semantic') {
    return false;
  }

  // The generated overlay is a checker surface, not user-authored TypeScript. Public rows initially admit only
  // diagnostics whose codes describe the copied expression's type relationship; name-resolution holes, syntax errors,
  // and implicit-any fallout are substrate pressure until the overlay can prove a more precise authored cause. TS18046
  // is admitted because an unknown owner often means semantic-runtime preserved a weak app type instead of erasing it.
  switch (diagnostic.diagnostic.code) {
    case 2322:
    case 2339:
    case 2345:
    case 2349:
    case 2532:
    case 2551:
    case 2554:
    case 2588:
    case 2769:
    case 18046:
    case 18047:
    case 18048:
      return true;
    default:
      return false;
  }
}

function sourceReferenceForOverlayDiagnostic(
  store: KernelStore,
  diagnostic: TypeSystemOverlayDiagnostic,
): NonNullable<SemanticTemplateDiagnosticRow['source']> | null {
  const authoredSource = diagnostic.authoredSource;
  if (authoredSource == null) {
    return null;
  }
  const source = describeAddress(store, authoredSource.sourceAddressHandle);
  if (source == null) {
    return null;
  }
  const start = authoredSource.sourceStart ?? source.start;
  const end = authoredSource.sourceEnd ?? source.end;
  return {
    ...source,
    kind: 'source-span-address',
    label: source.path == null || start == null || end == null
      ? source.label
      : `${source.path}@${start}..${end}`,
    start,
    end,
    role: `typescript-overlay:${diagnostic.diagnostic.phase}`,
  };
}

function normalizeSemanticDiagnosticProjectionPolicy(
  policy: SemanticDiagnosticProjectionPolicy | `${SemanticDiagnosticProjectionPolicy}` | null | undefined,
): SemanticDiagnosticProjectionPolicy {
  return policy === SemanticDiagnosticProjectionPolicy.AvailableProducts
    ? SemanticDiagnosticProjectionPolicy.AvailableProducts
    : SemanticDiagnosticProjectionPolicy.TypeProjection;
}

function templateDiagnosticsScanContext(
  store: KernelStore,
  workspaceRootDir: string,
  emission: AureliaAppWorldProjectEmission,
  includeHandles: boolean,
): TemplateDiagnosticsScanContext {
  return {
    store,
    includeHandles,
    capabilityDemands: emission.capabilityDemands.readDemands(),
    routeConfigProductHandles: emission.routes.readRouteConfigs().map((routeConfig) => routeConfig.productHandle),
    routeParameterEndpointPlans: emission.routeInstructions.readRouteParameterEndpointPlans(),
    i18nTranslationKeyProductHandles: emission.i18n.readTranslationKeys().map((translationKey) => translationKey.productHandle),
    sourceTextCache: new AuthoredSourceTextCache(workspaceRootDir, emission.project.inputGeneration.host),
    diagnosticRelationsByResource: new WeakMap(),
    seenRows: new Set(),
  };
}

function templateDiagnosticRelations(
  selection: TemplateCompletionResourceSelection,
  context: TemplateDiagnosticsScanContext,
): TemplateDiagnosticRelations {
  let relations = context.diagnosticRelationsByResource.get(selection.resource);
  if (relations == null) {
    relations = new TemplateDiagnosticRelations(
      context.store,
      selection.resource,
      frameworkCapabilityDemandsForSelection(context.capabilityDemands, selection),
    );
    context.diagnosticRelationsByResource.set(selection.resource, relations);
  }
  return relations;
}

function templateDiagnosticRelationFields(
  origin: TemplateDiagnosticRelationOrigin | null,
): { readonly diagnosticRelations?: readonly SemanticDiagnosticRelation[] } {
  if (origin == null) {
    return {};
  }
  return {
    diagnosticRelations: [{
      relationKind: origin.relationKind,
      relatedDiagnosticIdentityHandle: origin.relatedDiagnosticIdentityHandle,
    }],
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
  emission: AureliaAppWorldProjectEmission,
  selection: TemplateCompletionResourceSelection,
  context: TemplateDiagnosticsScanContext,
): readonly SemanticTemplateDiagnosticRow[] {
  const source = templateSourceText(store, selection.resource, context.sourceTextCache);
  if (source == null) {
    return [];
  }
  return expressionMemberDiagnosticSites(store, selection.resource)
    .flatMap((site) => templateDiagnosticRowsForMemberSite(store, emission, selection, source, site, context));
}

function templateDiagnosticRowsForMemberSite(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  selection: TemplateCompletionResourceSelection,
  source: AuthoredSourceText,
  site: ExpressionMemberDiagnosticSite,
  context: TemplateDiagnosticsScanContext,
): readonly SemanticTemplateDiagnosticRow[] {
  const span = site.span;
  const offset = span.nameSpan.start + Math.floor((span.nameSpan.end - span.nameSpan.start) / 2);
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
    typeSystem: emission.typeSystem,
    page: new InquiryPageRequest(1, null),
    routeConfigProductHandles: context.routeConfigProductHandles,
    routeParameterEndpointPlans: context.routeParameterEndpointPlans,
    i18nTranslationKeyProductHandles: context.i18nTranslationKeyProductHandles,
  });
  const cursorInfo = templateCursorInfoResult(store, selection, cursorContext, context.includeHandles, [...new Set(cursorContext.missingInputs)]);
  return cursorInfo.diagnostics.flatMap((diagnostic) =>
    templateDiagnosticRowForDiagnostic(store, selection, diagnostic, cursorInfo, source.sourcePath, site, context)
  );
}

function templateDiagnosticRowForDiagnostic(
  store: KernelStore,
  selection: TemplateCompletionResourceSelection,
  diagnostic: SemanticTemplateCursorDiagnosticRow,
  cursorInfo: SemanticTemplateCursorInfoResult,
  filePath: string,
  site: ExpressionMemberDiagnosticSite,
  context: TemplateDiagnosticsScanContext,
): readonly SemanticTemplateDiagnosticRow[] {
  const span = site.span;
  const source = sourceReferenceForSpan(filePath, span.nameSpan);
  const key = templateDiagnosticRowKey(diagnostic, source);
  if (context.seenRows.has(key)) {
    return [];
  }
  context.seenRows.add(key);
  return [{
    ...diagnostic,
    ...templateDiagnosticOriginFields(store, context.includeHandles, {
      phase: null,
      semanticProductHandle: site.parse.productHandle,
      sourceAddressHandle: site.parse.sourceAddressHandle,
    }),
    ...templateDiagnosticRelationFields(
      diagnostic.diagnosticKind === 'weak-expression-member-owner'
        && diagnostic.missingInputs.includes('expression-member-owner-type:missing-slot-type')
        ? templateDiagnosticRelations(selection, context).forExpressionSubject(site.parse, span.subjectSpan)
        : null,
    ),
    source,
    subject: diagnosticSubjectForSpan(
      filePath,
      span.subjectKind,
      span.subjectSpan,
      diagnostic.selectedMemberName,
    ),
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
  return resourceLocalBindingDataFlows(store, selection.resource).flatMap((dataFlow) => {
    const source = bindingDataFlowDiagnosticSource(store, dataFlow)
      ?? describeAddress(store, dataFlow.sourceAddressHandle);
    if (source == null || !sourceReferenceMatchesFile(source, sourceFile)) {
      return [];
    }
    const diagnostics = bindingDataFlowDiagnostics(store, dataFlow, source);
    return diagnostics.flatMap((diagnostic) => {
      const key = templateDiagnosticRowKey(diagnostic, source);
      if (context.seenRows.has(key)) {
        return [];
      }
      context.seenRows.add(key);
      return [{
        ...diagnostic,
        ...templateDiagnosticOriginFields(store, context.includeHandles, {
          phase: null,
          semanticProductHandle: dataFlow.productHandle,
          sourceAddressHandle: dataFlow.sourceAddressHandle,
        }),
        ...templateDiagnosticRelationFields(
          diagnostic.diagnosticKind === 'binding-target-assignment-strictness'
            ? templateDiagnosticRelations(selection, context).forBindingDataFlow(dataFlow)
            : null,
        ),
        siteKind: TemplateCompletionSiteKind.Expression,
        valueSiteKind: valueSiteKindForDataFlow(store, dataFlow.expressionProductHandle),
        subject: templateExpressionDiagnosticSubject(
          store,
          selection.resource,
          dataFlow.expressionProductHandle,
          source,
          diagnostic.selectedMemberName,
        ),
        template: {
          compilationLane: selection.lane,
          source: describeAddress(store, selection.sourceAddressHandle),
        },
      }];
    });
  });
}

function expressionRootDiagnosticRowsForSelection(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  selection: TemplateCompletionResourceSelection,
  sourceFile: SemanticRuntimeSourceFileInput | null | undefined,
  context: TemplateDiagnosticsScanContext,
): readonly SemanticTemplateDiagnosticRow[] {
  const authoredSource = templateSourceText(store, selection.resource, context.sourceTextCache);
  if (authoredSource == null) {
    return [];
  }
  return expressionRootDiagnosticSites(store, selection.resource).flatMap((site) => {
    const span = site.access.name.span;
    const offset = span.start + Math.floor((span.end - span.start) / 2);
    if (offset < 0 || offset > authoredSource.text.length) {
      return [];
    }
    const position = positionForOffset(authoredSource, offset);
    const cursorContext = templateCompletionQueryForCursor(store, {
      locus: new SourceCursorInquiryLocus(
        new SourceTextCursor(authoredSource.sourcePath, position.line, position.character, offset),
        selection.resource.compilation.unit.templateSource.sourceAddressHandle,
      ),
      resource: selection.resource,
      typeSystem: emission.typeSystem,
      page: new InquiryPageRequest(1, null),
      routeConfigProductHandles: context.routeConfigProductHandles,
      routeParameterEndpointPlans: context.routeParameterEndpointPlans,
      i18nTranslationKeyProductHandles: context.i18nTranslationKeyProductHandles,
    });
    const cursorInfo = templateCursorInfoResult(
      store,
      selection,
      cursorContext,
      context.includeHandles,
      [...new Set(cursorContext.missingInputs)],
    );
    if (
      cursorContext.bindingSourceContextOpenReason != null
      || cursorContext.selectedScopeSlot != null
      || cursorInfo.selectedMember != null
    ) {
      return [];
    }
    const source = sourceReferenceForParserSpan(
      authoredSource.sourcePath,
      span,
      'name',
      describeAddress(store, site.parse.sourceAddressHandle),
    );
    if (!sourceReferenceMatchesFile(source, sourceFile)) {
      return [];
    }
    const rootName = site.access.name.name;
    const diagnostic = typeSystemGlobalThisValueExists(emission.typeSystem, rootName)
      && !isAureliaExpressionGlobalName(rootName)
      ? unsupportedExpressionGlobalDiagnostic(rootName, source)
      : missingExpressionRootDiagnostic(rootName, source);
    const key = templateDiagnosticRowKey(diagnostic, source);
    if (context.seenRows.has(key)) {
      return [];
    }
    context.seenRows.add(key);
    return [{
      ...diagnostic,
      ...templateDiagnosticOriginFields(store, context.includeHandles, {
        phase: null,
        semanticProductHandle: site.parse.productHandle,
        sourceAddressHandle: site.parse.sourceAddressHandle,
      }),
      siteKind: TemplateCompletionSiteKind.Expression,
      valueSiteKind: site.parse.site.siteKind,
      subject: templateExpressionDiagnosticSubject(store, selection.resource, site.parse.productHandle, source),
      template: {
        compilationLane: selection.lane,
        source: describeAddress(store, selection.sourceAddressHandle),
      },
    }];
  });
}

function expressionRootDiagnosticSites(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly ExpressionRootDiagnosticSite[] {
  const sites: ExpressionRootDiagnosticSite[] = [];
  const seen = new Set<string>();
  for (const parse of resourceLocalEffectiveTemplateExpressionParses(store, resource)) {
    // Frontier subtrees support recovery/completion, but semantic absence would cascade from syntax not yet closed.
    if (!ExpressionParseResultInspector.hasCanonicalAst(parse.result)) {
      continue;
    }
    for (const access of ExpressionParseResultInspector.scopeAccesses(parse.result)) {
      const key = `${parse.productHandle}:${access.name.span.start}:${access.name.span.end}:${access.name.name}:${access.ancestor}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      sites.push({ access, parse });
    }
  }
  return sites.sort((left, right) =>
    left.access.name.span.start - right.access.name.span.start
    || left.access.name.span.end - right.access.name.span.end
    || left.access.name.name.localeCompare(right.access.name.name)
  );
}

function typeSystemGlobalThisValueExists(
  typeSystem: TypeSystemProject,
  name: string,
): boolean {
  const location = typeSystemProjectSourceFile(typeSystem);
  const globalThisSymbol = typeSystem.checker.resolveName(
    'globalThis',
    location ?? undefined,
    ts.SymbolFlags.Value,
    false,
  );
  const globalThisType = globalThisSymbol == null
    ? null
    : checkerSymbolValueType(typeSystem.checker, globalThisSymbol, location);
  const globalPropertySymbol = globalThisType == null
    ? null
    : checkerPropertySymbol(typeSystem.checker, globalThisType, name);
  return globalPropertySymbol == null
    ? false
    : checkerSymbolValueType(typeSystem.checker, globalPropertySymbol, location) != null;
}

function typeSystemProjectSourceFile(
  typeSystem: TypeSystemProject,
): ts.SourceFile | null {
  for (const source of typeSystem.project.sourceFiles) {
    const sourceFile = typeSystem.readProgramSourceFileByPath(source.path);
    if (sourceFile != null) {
      return sourceFile;
    }
  }
  return typeSystem.program.getSourceFiles().find((sourceFile) => !sourceFile.isDeclarationFile) ?? null;
}

function targetAccessDiagnosticRowsForSelection(
  store: KernelStore,
  selection: TemplateCompletionResourceSelection,
  sourceFile: SemanticRuntimeSourceFileInput | null | undefined,
  context: TemplateDiagnosticsScanContext,
): readonly SemanticTemplateDiagnosticRow[] {
  return resourceLocalBindingTargetAccesses(store, selection.resource).flatMap((targetAccess) => {
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
      ...templateDiagnosticOriginFields(store, context.includeHandles, {
        phase: null,
        semanticProductHandle: targetAccess.productHandle,
        sourceAddressHandle: targetAccess.sourceAddressHandle,
      }),
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
  return resourceLocalEffectiveTemplateExpressionParses(store, selection.resource).flatMap((parse) => {
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
      ...templateDiagnosticOriginFields(store, context.includeHandles, {
        phase: null,
        semanticProductHandle: parse.productHandle,
        sourceAddressHandle: parse.sourceAddressHandle,
      }),
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
  return templateCompilerIssues(store, selection.resource).flatMap((issue) => {
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
    const relatedInformation = issue.relatedInformation.flatMap((related) => {
      const relatedSource = describeAddress(store, related.sourceAddressHandle);
      return relatedSource == null ? [] : [{ message: related.message, source: relatedSource }];
    });
    const key = templateDiagnosticRowKey(diagnostic, source);
    if (context.seenRows.has(key)) {
      return [];
    }
    context.seenRows.add(key);
    return [{
      ...diagnostic,
      ...(relatedInformation.length === 0 ? {} : { relatedInformation }),
      ...templateDiagnosticOriginFields(store, context.includeHandles, {
        phase: issue.phase,
        semanticProductHandle: issue.productHandle,
        sourceAddressHandle: issue.sourceAddressHandle,
      }),
      siteKind: TemplateCompletionSiteKind.AttributeValue,
      valueSiteKind: null,
      template: {
        compilationLane: selection.lane,
        source: describeAddress(store, selection.sourceAddressHandle),
      },
    }];
  });
}

function frameworkCapabilityDemandDiagnosticRowsForSelection(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  selection: TemplateCompletionResourceSelection,
  sourceFile: SemanticRuntimeSourceFileInput | null | undefined,
  context: TemplateDiagnosticsScanContext,
): readonly SemanticTemplateDiagnosticRow[] {
  return frameworkCapabilityDemandsForSelection(
    emission.capabilityDemands.readDemands(),
    selection,
  ).flatMap((demand) => {
    if (
      demand.admissionState !== FrameworkCapabilityAdmissionState.NotAdmitted
      && demand.admissionState !== FrameworkCapabilityAdmissionState.ConfiguredOut
    ) {
      return [];
    }
    const source = describeAddress(store, demand.sourceAddressHandle);
    if (source == null || !sourceReferenceMatchesFile(source, sourceFile)) {
      return [];
    }
    const diagnostic = frameworkCapabilityDemandDiagnostic(
      demand,
      source,
      demand.configurationSourceAddressHandles.flatMap((handle) => {
        const configurationSource = describeAddress(store, handle);
        return configurationSource == null ? [] : [configurationSource];
      }),
    );
    const key = templateDiagnosticRowKey(diagnostic, source);
    if (context.seenRows.has(key)) {
      return [];
    }
    context.seenRows.add(key);
    return [{
      ...diagnostic,
      ...templateDiagnosticOriginFields(store, context.includeHandles, {
        phase: null,
        semanticProductHandle: demand.productHandle,
        sourceAddressHandle: demand.sourceAddressHandle,
      }),
      siteKind: templateCompletionSiteKindForFrameworkCapabilityDemand(demand),
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
      ...templateDiagnosticOriginFields(store, context.includeHandles, {
        phase: issue.phase,
        semanticProductHandle: issue.productHandle,
        sourceAddressHandle: issue.sourceAddressHandle,
      }),
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
    const instruction = store.productDetails.read(TemplateProductDetails.Instruction, issue.instructionProductHandle);
    const selectedMemberName = instruction instanceof RefBindingInstruction ? instruction.target : null;
    const diagnostic = runtimeRendererIssueDiagnostic(issue, source, selectedMemberName);
    const key = templateDiagnosticRowKey(diagnostic, source);
    if (context.seenRows.has(key)) {
      return [];
    }
    context.seenRows.add(key);
    return [{
      ...diagnostic,
      ...templateDiagnosticOriginFields(store, context.includeHandles, {
        phase: issue.phase,
        semanticProductHandle: issue.productHandle,
        sourceAddressHandle: issue.sourceAddressHandle,
      }),
      ...(selectedMemberName == null ? {} : {
        subject: {
          subjectKind: 'template-syntax' as const,
          subjectName: selectedMemberName,
          source,
        },
      }),
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
  const issues = selection.resource.runtimeAnalysis.readRuntimeBindingIssues();
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
      ...templateDiagnosticOriginFields(store, context.includeHandles, {
        phase: issue.phase,
        semanticProductHandle: issue.productHandle,
        sourceAddressHandle: issue.sourceAddressHandle,
      }),
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
      ...templateDiagnosticOriginFields(store, context.includeHandles, {
        phase: issue.phase,
        semanticProductHandle: issue.productHandle,
        sourceAddressHandle: issue.sourceAddressHandle,
      }),
      ...templateDiagnosticRelationFields(
        templateDiagnosticRelations(selection, context).forBindingBehaviorIssue(issue),
      ),
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
      ...templateDiagnosticOriginFields(store, context.includeHandles, {
        phase: issue.phase,
        semanticProductHandle: issue.productHandle,
        sourceAddressHandle: issue.sourceAddressHandle,
      }),
      ...templateDiagnosticRelationFields(
        templateDiagnosticRelations(selection, context).forValueConverterIssue(issue),
      ),
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
      ...templateDiagnosticOriginFields(store, context.includeHandles, {
        phase: issue.phase,
        semanticProductHandle: issue.productHandle,
        sourceAddressHandle: issue.sourceAddressHandle,
      }),
      siteKind: TemplateCompletionSiteKind.Expression,
      valueSiteKind: TemplateValueSiteKind.TemplateControllerValue,
      template: {
        compilationLane: selection.lane,
        source: describeAddress(store, selection.sourceAddressHandle),
      },
    }];
  });
}

function routerIssueDiagnosticRowsForSelection(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  selection: TemplateCompletionResourceSelection,
  sourceFile: SemanticRuntimeSourceFileInput | null | undefined,
  context: TemplateDiagnosticsScanContext,
): readonly SemanticTemplateDiagnosticRow[] {
  const templateSpan = templateSourceSpan(store, selection.resource);
  if (templateSpan == null) {
    return [];
  }
  return readRouterIssues(emission).flatMap((issue) => {
    const source = sourceReferenceForRouterIssue(store, issue);
    if (
      source == null
      || !sourceReferenceMatchesFile(source, sourceFile)
      || !sourceReferenceWithinTemplateSpan(store, source, templateSpan)
    ) {
      return [];
    }
    const diagnostic = routerIssueDiagnostic(issue, source);
    const key = templateDiagnosticRowKey(diagnostic, source);
    if (context.seenRows.has(key)) {
      return [];
    }
    context.seenRows.add(key);
    return [{
      ...diagnostic,
      ...templateDiagnosticOriginFields(store, context.includeHandles, {
        phase: issue.phase,
        semanticProductHandle: issue.productHandle,
        sourceAddressHandle: issue.sourceAddressHandle,
      }),
      siteKind: TemplateCompletionSiteKind.AttributeValue,
      valueSiteKind: null,
      template: {
        compilationLane: selection.lane,
        source: describeAddress(store, selection.sourceAddressHandle),
      },
    }];
  });
}

function templateCompilerIssues(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly TemplateCompilerIssue[] {
  const compilerReachableAttributes = resourceLocalCompilerReachableHtmlAttributeProductHandles(resource);
  const preTraversalIssues = [
    ...resource.compilation.attributeClassification.issues,
    ...resource.compilation.bindingCommandLowering.issues,
  ].filter((issue) =>
    compilerIssueBelongsToReachableAttribute(
      store,
      resource,
      compilerReachableAttributes,
      issue,
    )
  );
  return [
    ...resource.compilation.compilerWorld.issues,
    ...preTraversalIssues,
    ...resource.compilation.compiledTemplate.issues,
  ];
}

function compilerIssueBelongsToReachableAttribute(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  compilerReachableAttributes: ReadonlySet<ProductHandle>,
  issue: TemplateCompilerIssue,
): boolean {
  const issueSpan = sourceSpanAddressForAddress(store, issue.sourceAddressHandle);
  if (issueSpan == null) {
    return true;
  }
  return resource.compilation.html.attributes.some((attribute) => {
    if (!compilerReachableAttributes.has(attribute.productHandle)) {
      return false;
    }
    const attributeSpan = sourceSpanAddressForAddress(store, attribute.sourceAddressHandle);
    return attributeSpan != null && sourceSpanContains(attributeSpan, issueSpan);
  });
}

function frameworkCapabilityDemandsForSelection(
  demands: readonly FrameworkCapabilityDemand[],
  selection: TemplateCompletionResourceSelection,
): readonly FrameworkCapabilityDemand[] {
  const compilation = selection.resource.compilation;
  return demands.filter((demand) =>
    demand.resourceDefinitionProductHandle === compilation.definition.productHandle
    && demand.analysisContextProductHandle === compilation.analysisContextProductHandle
  );
}

function templateCompletionSiteKindForFrameworkCapabilityDemand(
  demand: FrameworkCapabilityDemand,
): TemplateCompletionSiteKind {
  switch (demand.siteKind) {
    case FrameworkCapabilityDemandSiteKind.TemplateElement:
      return TemplateCompletionSiteKind.ElementName;
    case FrameworkCapabilityDemandSiteKind.TemplateAttribute:
      return TemplateCompletionSiteKind.AttributeName;
    case FrameworkCapabilityDemandSiteKind.TemplateValueConverter:
      return TemplateCompletionSiteKind.ExpressionValueConverter;
    case FrameworkCapabilityDemandSiteKind.TemplateBindingBehavior:
      return TemplateCompletionSiteKind.ExpressionBindingBehavior;
    case FrameworkCapabilityDemandSiteKind.SourceServiceApi:
      return TemplateCompletionSiteKind.Expression;
  }
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

function sourceReferenceForRouterIssue(
  store: KernelStore,
  issue: RouterIssueModel,
): NonNullable<SemanticTemplateDiagnosticRow['source']> | null {
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
      return {
        frameworkErrorCode: result.frameworkErrorCode,
        message: result.diagnosticMessage ?? 'The expression parser stopped at an incomplete expression frontier.',
        span: result.primarySpan,
      };
    case ExpressionParseResultKind.InterpolationDegradedPublication:
    case ExpressionParseResultKind.InterpolationFrontierPublication:
      return {
        frameworkErrorCode: result.activeHole.frameworkErrorCode,
        message: result.activeHole.diagnosticMessage ?? 'The interpolation parser stopped at an incomplete expression frontier.',
        span: result.activeHole.primarySpan,
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
    || semanticSourceReferenceMatchesFilePath(source, sourceFile.filePath);
}

function sourceReferenceWithinTemplateSpan(
  store: KernelStore,
  source: NonNullable<SemanticTemplateDiagnosticRow['source']>,
  templateSpan: SourceSpanAddress,
): boolean {
  const file = store.readAddress(templateSpan.fileHandle);
  return file != null
    && isSourceFileAddress(file)
    && source.path != null
    && sourcePathMatchesFileName(file.path, source.path)
    && typeof source.start === 'number'
    && typeof source.end === 'number'
    && templateSpan.start <= source.start
    && source.end <= templateSpan.end;
}

function valueSiteKindForDataFlow(
  store: KernelStore,
  expressionProductHandle: ProductHandle | null,
): SemanticTemplateDiagnosticRow['valueSiteKind'] {
  const parse = readTemplateExpressionParse(store, expressionProductHandle);
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

function expressionMemberDiagnosticSites(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly ExpressionMemberDiagnosticSite[] {
  const sites: ExpressionMemberDiagnosticSite[] = [];
  const seen = new Set<string>();
  for (const parse of resourceLocalEffectiveTemplateExpressionParses(store, resource)) {
    for (const span of ExpressionParseResultInspector.memberAccessSpans(parse.result)) {
      const key = `${span.subjectKind}:${span.subjectSpan.start}:${span.subjectSpan.end}:${span.nameSpan.start}:${span.nameSpan.end}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      sites.push({
        span,
        parse,
      });
    }
  }
  return sites.sort((left, right) =>
    left.span.nameSpan.start - right.span.nameSpan.start
    || left.span.nameSpan.end - right.span.nameSpan.end
    || left.span.subjectSpan.start - right.span.subjectSpan.start
    || left.span.subjectSpan.end - right.span.subjectSpan.end
  );
}

function templateSourceText(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  cache: AuthoredSourceTextCache,
): AuthoredSourceText | null {
  const span = templateSourceSpan(store, resource);
  if (span == null) {
    return null;
  }
  const file = store.readAddress(span.fileHandle);
  if (file == null || !isSourceFileAddress(file)) {
    return null;
  }
  return cache.read(file.path);
}

function positionForOffset(
  source: AuthoredSourceText,
  offset: number,
): { readonly line: number; readonly character: number } {
  return authoredSourcePositionForOffset(source, offset);
}

function sourceReferenceForSpan(
  filePath: string,
  span: SourceSpan,
  role: string = 'name',
): NonNullable<SemanticTemplateDiagnosticRow['source']> {
  return {
    kind: 'source-span-address',
    label: `${filePath}@${span.start}..${span.end}`,
    path: filePath,
    start: span.start,
    end: span.end,
    role,
  };
}

function diagnosticSubjectForSpan(
  filePath: string,
  subjectKind: SemanticDiagnosticSubject['subjectKind'],
  span: SourceSpan,
  subjectName: string | null,
): SemanticDiagnosticSubject {
  return {
    subjectKind,
    subjectName,
    source: sourceReferenceForSpan(filePath, span, subjectKind),
  };
}

function pageTemplateDiagnosticRows<TRow>(
  rows: readonly TRow[],
  page: InquiryPageRequest,
): {
  readonly rows: readonly TRow[];
  readonly page: SemanticRuntimePageResult;
} {
  const requestedSize = Math.max(0, page.size);
  const size = clampPublicInquiryPageSize(requestedSize);
  const cursor = page.cursor;
  const start = cursor == null ? 0 : diagnosticCursorStart(cursor, rows.length);
  const safeStart = start < 0 ? rows.length : start;
  const selected = rows.slice(safeStart, safeStart + size);
  const nextCursor = selected.length > 0 && safeStart + selected.length < rows.length
    ? `after:${safeStart + selected.length - 1}`
    : null;
  return {
    rows: selected,
    page: {
      size,
      cursor,
      nextCursor,
      returnedRows: selected.length,
      totalRows: rows.length,
      ...(requestedSize === size
        ? {}
        : {
          requestedSize,
          maxSize: PUBLIC_INQUIRY_MAX_PAGE_SIZE,
          clamped: true,
        }),
    },
  };
}

function diagnosticCursorStart(
  cursor: string,
  rowCount: number,
): number {
  if (cursor.startsWith('after:')) {
    const offset = Number.parseInt(cursor.slice('after:'.length), 10);
    return Number.isFinite(offset) ? offset + 1 : rowCount;
  }
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
  const page = semanticTemplateCompletionPage(answer.page, rows.length);
  const missingInputs = [...new Set([...context.cursorContext.missingInputs, ...answer.value.missingInputs])];
  const inquiryOutcome = semanticOutcomeForInquiry(answer.outcome);
  const outcome = missingInputs.length > 0 && (
    inquiryOutcome === SemanticRuntimeAnswerOutcome.Hit
    || inquiryOutcome === SemanticRuntimeAnswerOutcome.Miss
  )
    ? SemanticRuntimeAnswerOutcome.Partial
    : inquiryOutcome;
  const inquiryClosure = semanticClosureForInquiry(answer.outcome);
  const closure = page?.nextCursor != null
    ? SemanticRuntimeAnswerClosure.Paged
    : missingInputs.length > 0 && inquiryClosure === SemanticRuntimeAnswerClosure.Complete
      ? SemanticRuntimeAnswerClosure.Open
      : inquiryClosure;
  const value: Omit<SemanticTemplateCompletionResult, 'displayText'> = {
    siteKind: answer.value.siteKind,
    domainKind: answer.value.domainKind,
    candidates: rows,
    expressionFrontier: answer.value.expressionFrontier == null
      ? null
      : {
        frontierKind: answer.value.expressionFrontier.frontierKind,
        expectedContinuationClasses: answer.value.expressionFrontier.expectedContinuationClasses,
      },
    missingInputs,
    template: {
      compilationLane: context.selection.lane,
      source: describeAddress(store, context.selection.sourceAddressHandle),
    },
  };
  return {
    outcome,
    closure,
    summary: answer.summary,
    value: {
      displayText: semanticTemplateCompletionDisplayText(value),
      ...value,
    },
    page,
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
    ...(page.clamped
      ? {
        requestedSize: page.requestedSize ?? undefined,
        maxSize: page.maxSize ?? undefined,
        clamped: true,
      }
      : {}),
  };
}

function missingTemplateCompletion(
  page: InquiryPageRequest,
  missingInputs: readonly string[],
  summary: string,
): TemplateCompletionReadResult {
  return {
    outcome: SemanticRuntimeAnswerOutcome.Miss,
    closure: closureForAnswer(SemanticRuntimeAnswerOutcome.Miss),
    summary,
    value: {
      displayText: semanticTemplateCompletionDisplayText({
        siteKind: TemplateCompletionSiteKind.Unknown,
        domainKind: null,
        candidates: [],
        expressionFrontier: null,
        missingInputs,
        template: {
          compilationLane: null,
          source: null,
        },
      }),
      siteKind: TemplateCompletionSiteKind.Unknown,
      domainKind: null,
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
  const value: Omit<SemanticTemplateCursorInfoResult, 'displayText'> = {
    siteKind: TemplateCompletionSiteKind.Unknown,
    activeSource: null,
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
  };
  return {
    schemaVersion: SEMANTIC_RUNTIME_API_VERSION,
    outcome: read.outcome,
    closure: read.closure,
    summary: read.summary,
    value: {
      displayText: semanticTemplateCursorInfoDisplayText(value),
      ...value,
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
  const memberOwnerType = cursorMemberOwnerTypeRow(
    store,
    query.memberOwnerTypeProductHandle,
    cursorContext.memberOwnerTypeSourceAddressHandle,
    includeHandles,
  );
  const expectedValueType = templateDiagnosticExpectedValueTypeForCursor(
    store,
    selection,
    query.locus.kind === InquiryLocusKind.SourceCursor ? query.locus.cursor.offset : null,
    valueSite?.siteKind ?? null,
  );
  const activeSource = cursorContext.activeExpressionSpan == null
    ? describeAddress(store, cursorContext.activeSourceAddressHandle)
    : query.locus.kind === InquiryLocusKind.SourceCursor
      ? sourceReferenceForParserSpan(
          query.locus.cursor.filePath,
          cursorContext.activeExpressionSpan,
          'active-template-token',
        )
      : null;
  const value: Omit<SemanticTemplateCursorInfoResult, 'displayText'> = {
    siteKind: query.siteKind,
    activeSource,
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
    selectedDefinition: cursorDefinitionRow(
      store,
      query.selectedDefinitionProductHandle,
      cursorContext.selectedDefinitionMatchedName,
      includeHandles,
    ),
    selectedBindable: cursorBindableRow(
      store,
      selection.resource.runtimeAnalysis.expressionWorld.projector,
      cursorContext.selectedBindable,
      includeHandles,
    ),
    selectedMemberName: cursorContext.selectedMemberName,
    selectedMember,
    memberOwnerType,
    diagnostics: cursorDiagnosticRows(
      store,
      query.siteKind,
      missingInputs,
      cursorContext.selectedMemberName,
      selectedMember,
      cursorContext.selectedScopeSlot != null,
      memberOwnerType,
      query.memberOwnerTypeProductHandle,
      cursorContext.memberOwnerTypeOpenSubject,
      valueSite?.source ?? html.attributeSource ?? html.source ?? describeAddress(store, selection.sourceAddressHandle),
      expectedValueType?.display ?? null,
      expectedValueType?.source ?? null,
    ),
    ...(includeHandles ? {
      handles: {
        activeSourceAddressHandle: cursorContext.activeSourceAddressHandle,
      },
    } : {}),
  };
  return {
    displayText: semanticTemplateCursorInfoDisplayText(value),
    ...value,
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
  const tagNameSourceAddressHandle = node instanceof HtmlElement ? node.tagNameAddressHandle : null;
  const closingTagNameSourceAddressHandle = node instanceof HtmlElement ? node.closingTagNameAddressHandle : null;
  const attributeSourceAddressHandle = attribute?.sourceAddressHandle ?? null;
  return {
    nodeKind: node?.nodeKind ?? null,
    tagName: node instanceof HtmlElement ? node.tagName : null,
    attributeName: attribute?.rawName ?? null,
    attributeValue: attribute?.rawValue ?? null,
    source: describeAddress(store, nodeSourceAddressHandle),
    tagNameSource: describeAddress(store, tagNameSourceAddressHandle),
    closingTagNameSource: describeAddress(store, closingTagNameSourceAddressHandle),
    attributeSource: describeAddress(store, attributeSourceAddressHandle),
    ...(includeHandles ? {
      handles: {
        nodeProductHandle: cursorContext.htmlNodeProductHandle,
        attributeProductHandle: cursorContext.htmlAttributeProductHandle,
        nodeSourceAddressHandle,
        tagNameSourceAddressHandle,
        closingTagNameSourceAddressHandle,
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
  matchedName: string | null,
  includeHandles: boolean,
): SemanticTemplateCursorDefinitionRow | null {
  const definition = productHandle == null
    ? null
    : store.productDetails.read(ResourceProductDetails.Definition, productHandle);
  if (definition == null) {
    return null;
  }
  return definitionRow(store, definition, matchedName, includeHandles);
}

function definitionRow(
  store: KernelStore,
  definition: FullResourceDefinition,
  selectedName: string | null,
  includeHandles: boolean,
): SemanticTemplateCursorDefinitionRow {
  const matched = matchedResourceName(definition, selectedName);
  return {
    resourceKind: taxonomyResourceKindForDefinition(definition),
    name: 'name' in definition ? definition.name : null,
    matchedName: matched.name,
    targetName: 'target' in definition ? definition.target.localName : null,
    source: describeAddress(store, definition.sourceAddressHandle),
    nameSource: describeAddress(store, definitionNameSourceAddressHandle(definition)),
    matchedNameSource: describeAddress(store, matched.sourceAddressHandle),
    targetSource: describeAddress(store, definition.target.addressHandle),
    ...(includeHandles ? {
      handles: {
        definitionProductHandle: definition.productHandle,
        identityHandle: definition.identityHandle,
        sourceAddressHandle: definition.sourceAddressHandle,
        nameSourceAddressHandle: definitionNameSourceAddressHandle(definition),
        matchedNameSourceAddressHandle: matched.sourceAddressHandle,
        targetAddressHandle: definition.target.addressHandle,
      },
    } : {}),
  };
}

function matchedResourceName(
  definition: FullResourceDefinition,
  selectedName: string | null,
): { readonly name: string | null; readonly sourceAddressHandle: AddressHandle | null } {
  if (selectedName == null || !('name' in definition)) {
    return { name: null, sourceAddressHandle: null };
  }
  const normalized = selectedName.toLowerCase();
  const alias = definition.aliases.find((candidate) => candidate.name.toLowerCase() === normalized) ?? null;
  if (alias != null) {
    return { name: alias.name, sourceAddressHandle: alias.addressHandle };
  }
  return definition.name.toLowerCase() === normalized
    ? { name: definition.name, sourceAddressHandle: definitionNameSourceAddressHandle(definition) }
    : { name: selectedName, sourceAddressHandle: null };
}

function definitionNameSourceAddressHandle(
  definition: FullResourceDefinition,
): AddressHandle | null {
  return 'nameSourceAddressHandle' in definition ? definition.nameSourceAddressHandle : null;
}

function cursorBindableRow(
  store: KernelStore,
  projector: CheckerTypeProjector,
  bindable: TemplateBindableReference | null,
  includeHandles: boolean,
): SemanticTemplateCursorBindableRow | null {
  if (bindable == null) {
    return null;
  }
  const ownerDefinition = bindable.reference.ownerDefinitionProductHandle == null
    ? null
    : store.productDetails.read(
        ResourceProductDetails.Definition,
        bindable.reference.ownerDefinitionProductHandle,
      );
  return {
    name: bindable.reference.name,
    attribute: bindable.reference.attribute,
    callback: bindable.definition.callback,
    mode: bindable.definition.mode,
    ...projectBindableDefinitionSurface(store, projector, bindable.definition, ownerDefinition?.target ?? null),
    ...projectBindableDefinitionSources(store, bindable.definition),
    ownerDefinitionProductHandle: bindable.reference.ownerDefinitionProductHandle,
    source: describeAddress(store, bindable.reference.sourceAddressHandle),
    nameSource: describeAddress(store, bindable.reference.nameSourceAddressHandle),
    attributeSource: describeAddress(store, bindable.reference.attributeSourceAddressHandle),
    propertySource: describeAddress(store, bindable.reference.propertyTarget?.addressHandle ?? null),
    callbackSource: describeAddress(store, bindable.definition.callbackSourceAddressHandle),
    callbackTargetSource: describeAddress(store, bindable.definition.callbackTarget?.addressHandle ?? null),
    modeSource: describeAddress(store, bindable.definition.modeSourceAddressHandle),
    setSource: describeAddress(store, bindable.definition.setSourceAddressHandle),
    ...(includeHandles ? {
      handles: {
        ownerDefinitionProductHandle: bindable.reference.ownerDefinitionProductHandle,
        sourceAddressHandle: bindable.reference.sourceAddressHandle,
        nameSourceAddressHandle: bindable.reference.nameSourceAddressHandle,
        attributeSourceAddressHandle: bindable.reference.attributeSourceAddressHandle,
        propertyTargetIdentityHandle: bindable.reference.propertyTarget?.identityHandle ?? null,
        propertyTargetAddressHandle: bindable.reference.propertyTarget?.addressHandle ?? null,
        callbackSourceAddressHandle: bindable.definition.callbackSourceAddressHandle,
        callbackTargetIdentityHandle: bindable.definition.callbackTarget?.identityHandle ?? null,
        callbackTargetAddressHandle: bindable.definition.callbackTarget?.addressHandle ?? null,
        modeSourceAddressHandle: bindable.definition.modeSourceAddressHandle,
        setSourceAddressHandle: bindable.definition.setSourceAddressHandle,
        setterTargetIdentityHandle: bindable.definition.set.target?.identityHandle ?? null,
        setterTargetAddressHandle: bindable.definition.set.target?.addressHandle ?? null,
        typeSourceAddressHandle: bindable.definition.typeSourceAddressHandle,
        nullableSourceAddressHandle: bindable.definition.nullableSourceAddressHandle,
      },
    } : {}),
  };
}

function cursorMemberOwnerTypeRow(
  store: KernelStore,
  productHandle: TemplateCompletionCursorContext['query']['memberOwnerTypeProductHandle'],
  sourceAddressHandle: AddressHandle | null,
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
    source: describeAddress(store, sourceAddressHandle ?? typeShape.sourceAddressHandle),
    declarationSource: describeAddress(store, typeShape.declarationSourceAddressHandle),
    ...(includeHandles ? {
      handles: {
        productHandle: typeShape.productHandle,
        identityHandle: typeShape.identityHandle,
        sourceAddressHandle: sourceAddressHandle ?? typeShape.sourceAddressHandle,
        declarationSourceAddressHandle: typeShape.declarationSourceAddressHandle,
      },
    } : {}),
  };
}

function cursorSelectedMemberRow(
  store: KernelStore,
  cursorContext: TemplateCompletionCursorContext,
  includeHandles: boolean,
): SemanticTemplateCursorMemberRow | null {
  if (cursorContext.selectedScopeSlot != null) {
    return cursorScopeSlotMemberRow(store, cursorContext.selectedScopeSlot, includeHandles);
  }

  const memberName = cursorContext.selectedMemberName;
  if (memberName == null || cursorContext.query.memberOwnerTypeProductHandle == null) {
    return null;
  }
  const ownerType = store.productDetails.read(TypeSystemProductDetails.TypeShape, cursorContext.query.memberOwnerTypeProductHandle);
  const members = ownerType == null
    ? []
    : readOrProjectCheckerTypeMembersInProjection(
        cursorContext.expressionWorld.projector,
        ownerType,
        cursorContext.query.memberOwnerTypeProductHandle,
      );
  const member = members.find((candidate) => candidate.name === memberName) ?? null;
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
      declarationSource: null,
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
    source: describeAddress(store, checkerTypeMemberSourceAddressHandle(store, member)),
    declarationSource: describeAddress(store, checkerTypeMemberSourceAddressHandle(store, member)),
    ...(includeHandles ? {
      handles: {
        ownerProductHandle: member.ownerType.productHandle,
        detailHandle: member.detailHandle,
        declarationIdentityHandle: member.declarationIdentityHandle,
        ownerTypeIdentityHandle: member.ownerType.identityHandle,
        reachableIdentityHandle: checkerTypeMemberReachableIdentityHandle(member),
        sourceAddressHandle: checkerTypeMemberSourceAddressHandle(store, member),
        declarationSourceAddressHandle: checkerTypeMemberSourceAddressHandle(store, member),
      },
    } : {}),
  };
}

function cursorScopeSlotMemberRow(
  store: KernelStore,
  selection: NonNullable<TemplateCompletionCursorContext['selectedScopeSlot']>,
  includeHandles: boolean,
): SemanticTemplateCursorMemberRow {
  const { scope, slot } = selection;
  const member = slot.targetTypeMemberHandle == null
    ? null
    : store.hotDetails.read(TypeSystemHotDetails.TypeMember, slot.targetTypeMemberHandle);
  const sourceAddressHandle = slot.sourceAddressHandle
    ?? (member == null ? null : checkerTypeMemberSourceAddressHandle(store, member));
  const declarationSourceAddressHandle = member == null
    ? null
    : checkerTypeMemberSourceAddressHandle(store, member);
  const ownerProductHandle = member?.ownerType.productHandle ?? scope.productHandle;
  return {
    name: slot.name,
    memberKind: member?.memberKind ?? CheckerTypeMemberKind.Property,
    typeDisplay: slot.targetType?.display ?? member?.valueType?.display ?? null,
    isOptional: member?.isOptional ?? false,
    isReadonly: slot.assignmentAccessKind === BindingContextSlotAssignmentAccessKind.FrameworkManagedReadOnly
      || (member?.isReadonly ?? false),
    source: describeAddress(store, sourceAddressHandle),
    declarationSource: describeAddress(store, declarationSourceAddressHandle),
    ...(includeHandles ? {
      handles: {
        ownerProductHandle,
        detailHandle: slot.targetTypeMemberHandle,
        declarationIdentityHandle: member?.declarationIdentityHandle ?? slot.targetIdentityHandle,
        ownerTypeIdentityHandle: member?.ownerType.identityHandle ?? null,
        reachableIdentityHandle: member == null
          ? slot.targetIdentityHandle
          : checkerTypeMemberReachableIdentityHandle(member),
        sourceAddressHandle,
        declarationSourceAddressHandle,
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
    tagNameSource: null,
    closingTagNameSource: null,
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

function templateCompletionCandidateRow(
  candidate: TemplateCompletionCandidate,
  includeHandles: boolean,
): SemanticTemplateCompletionCandidateRow {
  const memberFacts = candidate.typeMemberFacts;
  return {
    candidateKind: candidate.candidateKind,
    name: candidate.name,
    sourceKind: candidate.sourceKind,
    summary: candidate.summary,
    typeDisplay: candidate.typeReference?.display ?? null,
    memberKind: memberFacts?.memberKind ?? null,
    memberVisibility: memberFacts?.visibilityKind ?? null,
    memberIsOptional: memberFacts?.isOptional ?? null,
    memberIsReadonly: memberFacts?.isReadonly ?? null,
    aureliaHookKind: memberFacts?.aureliaHookKind ?? null,
    ...(includeHandles ? {
      handles: {
        productHandle: candidate.productHandle,
        identityHandle: candidate.identityHandle,
        sourceAddressHandle: candidate.sourceAddressHandle,
      },
    } : {}),
  };
}

function templateCompletionMemberFactDisplay(
  candidate: SemanticTemplateCompletionCandidateRow,
): string {
  const parts = [
    candidate.memberVisibility == null ? null : `visibility=${candidate.memberVisibility}`,
    candidate.memberKind == null ? null : `memberKind=${candidate.memberKind}`,
    candidate.aureliaHookKind == null ? null : `aureliaHook=${candidate.aureliaHookKind}`,
  ].filter((part): part is string => part != null);
  return parts.length === 0 ? '' : `; ${parts.join(', ')}`;
}
