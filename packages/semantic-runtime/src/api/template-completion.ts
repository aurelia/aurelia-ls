import ts from 'typescript';

import {
  answerTemplateCompletion,
  templateCompletionReadsResourceScope,
  templateRouteExpressionPathSpanForCursor,
  TemplateCompletionSiteKind,
  templateCompletionQueryForCursor,
  type TemplateCompletionCandidate,
  type TemplateCompletionCursorContext,
  type TemplateCompletionRouterContext,
} from '../inquiry/template-completion.js';
import {
  InquiryLocusKind,
  SourceCursorInquiryLocus,
  SourceTextCursor,
} from '../inquiry/locus.js';
import {
  InquiryPageRequest,
} from '../inquiry/page.js';
import {
  isSourceFileAddress,
  sourceSpanAddressForAddress,
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
import { SourceSpan } from '../expression/source-span.js';
import { isAureliaExpressionGlobalName } from '../expression/global-names.js';
import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import {
  ExpressionParseResultInspector,
  type ExpressionMemberAccessSpan,
  type ExpressionScopeAccess,
} from '../expression/parse-result-inspection.js';
import type { KernelStore } from '../kernel/store.js';
import { projectOwnsTemplateEditSourceFile } from '../boot/source-ownership.js';
import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import { BindingContextSlotAssignmentAccessKind } from '../configuration/scope.js';
import {
  SemanticAppAnalysisDepth,
  semanticAppAnalysisDepthSatisfies,
} from '../configuration/app-analysis.js';
import type { TemplateResourceRuntimeAnalysisEmission } from '../template/template-compilation-project-pass.js';
import {
  TemplateCompilerIssueKind,
  type TemplateCompilerIssue,
} from '../template/compiler-issue.js';
import {
  registrationHidingOpenSeamsForContainer,
  registrationOpenSeamCanHideResource,
} from '../di/registration-open-pressure.js';
import type { RuntimeBindingScopeIssue } from '../template/runtime-binding-scope-issue.js';
import type { RuntimeBindingIssue } from '../template/runtime-binding-issue.js';
import type { RuntimeBindingDataFlow } from '../observation/runtime-binding-observation.js';
import {
  RuntimeBindingBehaviorIssueKind,
  type RuntimeBindingBehaviorIssue,
} from '../template/runtime-binding-behavior.js';
import {
  RuntimeValueConverterIssueKind,
  type RuntimeValueConverterIssue,
} from '../template/runtime-value-converter.js';
import type { RuntimeControllerIssue } from '../template/runtime-controller-issue.js';
import type { RuntimeRendererIssue } from '../template/runtime-renderer-issue.js';
import { RefBindingInstruction } from '../template/instruction-ir.js';
import { RouterNavigationTargetKind, type RouterIssueModel } from '../router/model.js';
import {
  FrameworkCapabilityAdmissionState,
  FrameworkCapabilityDemandSiteKind,
  type FrameworkCapabilityDemand,
} from '../framework/capability-demand.js';
import { FrameworkRegistrationCapability } from '../registration/framework-registration-manifest.js';
import type { TemplateExpressionParse } from '../template/value-site.js';
import { TemplateValueSiteKind } from '../template/value-site.js';
import { TemplateProductDetails } from '../template/product-details.js';
import { readTemplateExpressionParse } from '../template/expression-parse-product.js';
import type {
  HtmlIrNode,
} from '../template/html-ir.js';
import {
  HtmlAttribute,
  HtmlComment,
  HtmlDoctype,
  type HtmlDocument,
  HtmlElement,
  HtmlNamespaceKind,
  type HtmlRecovery,
  HtmlRecoveryKind,
  HtmlText,
} from '../template/html-ir.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import {
  resourceDefinitionNameSourceAddressHandle,
  taxonomyResourceKindForDefinition,
  type FullResourceDefinition,
} from '../resources/resource-definition.js';
import {
  ResourceDefinitionKind,
  runtimeResourceKeyForKind,
} from '../resources/resource-kind.js';
import {
  runtimeAsElementResourceName,
  runtimeAttributeName,
  runtimeElementResourceName,
} from '../template/runtime-dom-name.js';
import { TypeSystemHotDetails, TypeSystemProductDetails } from '../type-system/product-details.js';
import {
  readTypeSystemOverlayDiagnostics,
  type TypeSystemOverlayDiagnostic,
} from '../type-system/diagnostics.js';
import { readRouterIssueRows, readRouterIssues } from './route-projections.js';
import { semanticTypeScriptDiagnosticSeverity } from './typescript-diagnostics.js';
import { TypeSystemProjectBuilder, type TypeSystemProject } from '../type-system/project.js';
import type { CheckerTypeProjector } from '../type-system/checker-projector.js';
import {
  checkerPropertySymbol,
  checkerSymbolValueType,
} from '../type-system/checker-node-helpers.js';
import {
  CheckerTypeMemberKind,
  CheckerTypeProjectionOrigin,
  type CheckerTypeMember,
  type CheckerTypeReference,
  checkerIndexedAccessSupportsString,
  checkerTypeMemberReachableIdentityHandle,
} from '../type-system/type-shape.js';
import { checkerTypeMemberSourceAddressHandle } from '../type-system/checker-type-member-source.js';
import {
  checkerDeclarationsDeprecationReason,
  checkerSymbolMemberDocumentation,
  checkerTypeMemberIsDeprecated,
  checkerTypeMemberVisibilityKind,
  CHECKER_MEMBER_TEXT_MAX_SOURCES,
  type CheckerTypeMemberTextDraft,
} from '../type-system/checker-member-surface.js';
import { readOrProjectCheckerTypeMembersInProjection } from '../type-system/checker-type-member-surface.js';
import { readCheckerReferenceSurface } from '../type-system/type-surface.js';
import { CheckerExpressionTypeOpenKind } from '../type-system/expression-type-evaluation.js';
import type { TemplateBindableReference } from '../template/compiler-world-reference.js';
import { resolveSemanticSourceCursor } from './source-cursor.js';
import {
  answer as publicAnswer,
  COMPLETE_COLLECTION_ANSWER_OPTIONS,
  pageRows,
} from './answer-helpers.js';
import type {
  SemanticRuntimePageInput,
  SemanticRuntimePageResult,
  SemanticRuntimeSourceFileInput,
  SemanticRuntimeSourceCursorInput,
  SemanticAppDiagnosticRow,
  SemanticDiagnosticPresentationGroup,
  SemanticDiagnosticPresentationRow,
  SemanticDiagnosticPresentationWithheldRow,
  SemanticDiagnosticRelation,
  SemanticDiagnosticSubject,
  SemanticTemplateCompilationRow,
  SemanticTemplateCursorBindableRow,
  SemanticTemplateCursorDiagnosticRow,
  SemanticTemplateCursorDiagnosticPresentation,
  SemanticTemplateCompletionCandidateRow,
  SemanticTemplateDiagnosticRow,
  SemanticTemplateDiagnosticPhase,
  SemanticTemplateDiagnosticsResult,
  SemanticTemplateCursorDefinitionRow,
  SemanticTemplateCursorExpressionRow,
  SemanticTemplateCursorHtmlRow,
  SemanticTemplateCursorInfoResult,
  SemanticTemplateCursorMemberRow,
  SemanticTemplateCursorMemberTextRow,
  SemanticTemplateCursorRouteTargetRow,
  SemanticTemplateCursorValueSiteRow,
  SemanticTemplateCompletionResult,
  SemanticTemplateCursorSuggestionValueTypeSource,
  SemanticTemplateCursorUncertainty,
} from './contracts.js';
import {
  SemanticDiagnosticProjectionPolicy,
  SemanticRuntimeAnswerCoverage,
  SemanticRuntimeAnswerResult,
  SemanticRuntimeAnswerSelection,
  SemanticRuntimeDetail,
  SemanticTemplateBindableUsageModeAuthority,
  type SemanticRuntimeAnswer,
} from './contracts.js';
import {
  projectBindableDefinitionSources,
  projectBindableDefinitionSurface,
} from './bindable-projection.js';
import {
  bindableUsageModeMissingInputs,
  cursorBindableUsageModeRow,
  noBindableUsageMode,
  type SemanticTemplateCursorBindableUsageModeFields,
} from './template-bindable-usage-mode.js';
import { templateSelectedCallSignature } from './template-call-signature.js';
import {
  describeAddress,
  semanticExactSourceReference,
  semanticSourceReferenceContainsOffset,
  semanticSourceReferenceMatchesFilePath,
  sourceReferenceForUnqualifiedTypeScriptNode,
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
  htmlRecoveryDiagnostic,
  unsupportedExpressionGlobalDiagnostic,
  templateCompilerErrorDiagnostic,
} from './template-diagnostic-policy.js';
import {
  resourceLocalBindingDataFlows,
  resourceLocalBindingTargetAccesses,
  resourceLocalCompilerReachableHtmlAttributeProductHandles,
} from '../template/runtime-resource-ownership.js';
import {
  runtimeExpressionAccessUsesForTemplateExpression,
  resourceLocalEffectiveTemplateExpressionParses,
} from '../template/template-expression-selection.js';
import {
  RuntimeExpressionAccessForm,
  type RuntimeExpressionAccessUse,
} from '../runtime-expression/runtime-expression-access-use.js';
import {
  TemplateTypeSystemOverlayBuilder,
  type TemplateTypeSystemOverlayEmission,
} from '../template/template-type-system-overlay.js';
import {
  TemplateDiagnosticRelations,
  type TemplateDiagnosticRelationOrigin,
} from './template-diagnostic-relations.js';
import {
  routerAppDiagnosticRow,
  templateAppDiagnosticRow,
  templateDiagnosticContributesToAppDiagnostics,
} from './app-diagnostics.js';
import { appDiagnosticPresentation } from './diagnostic-presentation.js';
import type { SemanticSourceReference } from './source-reference.js';
import { sameTypeSystemSourcePath } from '../type-system/source-file-path.js';
import { exactTemplateSourceTextForSourceSpan } from '../resources/template-source-text.js';

type TemplateCompilationLane = SemanticTemplateCompilationRow['compilationLane'];

const templateOverlayDiagnosticsByEmission = new WeakMap<AureliaAppWorldProjectEmission, TemplateOverlayDiagnosticCache>();

interface TemplateDiagnosticExpectedValueType {
  readonly display: string;
  readonly source: SemanticTemplateCursorSuggestionValueTypeSource;
}

export type TemplateResourceCursorSelection = {
  readonly resource: TemplateResourceRuntimeAnalysisEmission;
  readonly lane: TemplateCompilationLane;
  readonly sourceAddressHandle: SourceSpanAddress['handle'] | null;
};

type TemplateCompletionResourceSelection = TemplateResourceCursorSelection;

interface TemplateOverlayDiagnosticSelection {
  readonly selection: TemplateCompletionResourceSelection;
  readonly emission: TemplateTypeSystemOverlayEmission;
}

interface TemplateOverlayDiagnosticCache {
  /** Full overlay diagnostic set retained once for exact checker consumers such as selected-call resolution. */
  readonly allDiagnostics: readonly TypeSystemOverlayDiagnostic[];
  readonly diagnostics: readonly TypeSystemOverlayDiagnostic[];
  readonly selectionsByOriginKey: ReadonlyMap<string, TemplateOverlayDiagnosticSelection>;
  readonly typeSystem: TypeSystemProject | null;
}

interface TemplateOverlayDiagnosticSubjectProjection {
  readonly subject: SemanticDiagnosticSubject | null;
  readonly memberAccess: ExpressionMemberAccessSpan | null;
}

interface TemplateCompletionReadResult {
  readonly result: SemanticRuntimeAnswerResult;
  readonly selection: SemanticRuntimeAnswerSelection;
  readonly coverage: SemanticRuntimeAnswerCoverage;
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

const TEMPLATE_RESOURCE_REGISTRATION_OPEN_MISSING_INPUT = 'template-resource-scope:registration-open';

interface TemplateDiagnosticsScanContext {
  readonly store: KernelStore;
  readonly emission: AureliaAppWorldProjectEmission;
  readonly includeHandles: boolean;
  readonly capabilityDemands: readonly FrameworkCapabilityDemand[];
  readonly router: TemplateCompletionRouterContext;
  readonly i18nTranslationKeyProductHandles: readonly ProductHandle[];
  readonly sourceTextCache: AuthoredSourceTextCache;
  readonly diagnosticRelationsByResource: WeakMap<TemplateResourceRuntimeAnalysisEmission, TemplateDiagnosticRelations>;
  readonly seenRows: Set<string>;
}

function templateCompletionRouterContext(
  emission: AureliaAppWorldProjectEmission,
): TemplateCompletionRouterContext {
  return {
    routeConfigProductHandles: emission.routes.readRouteConfigs().map((routeConfig) => routeConfig.productHandle),
    routeParameterEndpointPlans: emission.routeInstructions.readRouteParameterEndpointPlans(),
    configurableRoutes: emission.routeRecognizer.readConfigurableRoutes(),
    recognizedRoutes: emission.routeRecognition.readRecognizedRoutes(),
  };
}

function templateResourceRegistrationMissingInputs(
  emission: AureliaAppWorldProjectEmission,
  selection: TemplateCompletionResourceSelection,
  cursorContext: TemplateCompletionCursorContext,
): readonly string[] {
  return templateCompletionReadsResourceScope(
    cursorContext.query.siteKind,
    cursorContext.expressionFrontier,
  ) && registrationHidingResourceSeamsForSelection(emission, selection, null).length > 0
    ? [TEMPLATE_RESOURCE_REGISTRATION_OPEN_MISSING_INPUT]
    : [];
}

function registrationHidingResourceSeamsForSelection(
  emission: AureliaAppWorldProjectEmission,
  selection: TemplateCompletionResourceSelection,
  requestedLookupKeys: ReadonlySet<string> | null,
) {
  return registrationHidingOpenSeamsForContainer(
    emission.appWorld.diWorld,
    emission.appWorld.configuration.openSeamScopes,
    emission.containerChainFacts,
    selection.resource.compilation.compilerWorld.container.identityHandle,
    (operation) => registrationOpenSeamCanHideResource(operation, requestedLookupKeys),
  );
}

function registrationCanHideNamedResource(
  emission: AureliaAppWorldProjectEmission,
  selection: TemplateCompletionResourceSelection,
  resourceKind: ResourceDefinitionKind,
  resourceName: string,
): boolean {
  const lookupKey = runtimeResourceKeyForKind(resourceKind, resourceName);
  return lookupKey != null
    && registrationHidingResourceSeamsForSelection(
      emission,
      selection,
      new Set([lookupKey]),
    ).length > 0;
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
  page: SemanticRuntimePageInput | undefined,
  detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}`,
): SemanticRuntimeAnswer<SemanticTemplateCompletionResult> {
  const read = readTemplateCompletion(store, workspaceRootDir, projectRootDir, emission, cursor, page, detail === SemanticRuntimeDetail.Handles);
  return publicAnswer(read.result, read.summary, read.value, {
    page: read.page,
    selection: read.selection,
    coverage: read.coverage,
  });
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
  if ('result' in readContext) {
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
  return publicAnswer(
    SemanticRuntimeAnswerResult.Answered,
    `Resolved template cursor as ${read.value.siteKind}.`,
    read.value,
    {
      selection: SemanticRuntimeAnswerSelection.Exact,
      coverage: read.missingInputs.length === 0
        ? SemanticRuntimeAnswerCoverage.Complete
        : SemanticRuntimeAnswerCoverage.Open,
    },
  );
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
    frameworkCapabilityDemands: emission.capabilityDemands.readDemands(),
    page: new InquiryPageRequest(1, null),
    router: templateCompletionRouterContext(emission),
    i18nTranslationKeyProductHandles: emission.i18n.readTranslationKeys().map((translationKey) => translationKey.productHandle),
  });
  const selectedBindableUsageMode = cursorBindableUsageModeRow(
    store,
    readContext.selection.resource,
    cursorContext,
  );
  const selectedCall = templateSelectedCallSignature(
    store,
    cursorContext,
    () => {
      const cache = templateOverlayDiagnosticCache(store, emission);
      const overlay = cache.selectionsByOriginKey.get(
        templateOverlayOriginKey(readContext.selection.resource),
      )?.emission ?? null;
      return overlay == null
        ? null
        : {
            emission: overlay,
            typeSystem: cache.typeSystem,
            diagnostics: cache.allDiagnostics.filter((diagnostic) =>
              diagnostic.overlayOriginKey === overlay.overlaySource?.originKey
            ),
          };
    },
  );
  const missingInputs = [...new Set([
    ...cursorContext.missingInputs,
    ...bindableUsageModeMissingInputs(selectedBindableUsageMode),
    ...(selectedCall?.openReason == null ? [] : ['selected-call-signature:open']),
    ...templateResourceRegistrationMissingInputs(emission, readContext.selection, cursorContext),
  ])];
  const cursorOffset = readContext.locus.cursor.offset;
  const baseValue = templateCursorInfoResult(
    store,
    readContext.selection,
    cursorContext,
    includeHandles,
    missingInputs,
    selectedBindableUsageMode,
    true,
    selectedCall,
  );
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
      );
  return {
    missingInputs,
    value: withCursorDiagnosticPresentation(
      baseValue,
      diagnostics,
      emission.project.projectKey,
      cursorOffset,
      // Identity handles stay internal here and prove which router-owned AppDiagnostic replaces each template proxy.
      readRouterIssueRows(emission, store, true).map(routerAppDiagnosticRow),
    ),
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

interface CursorDiagnosticPresentationInput {
  readonly cursorDiagnostic: SemanticTemplateDiagnosticRow;
  readonly appDiagnostic: SemanticAppDiagnosticRow;
}

function cursorDiagnosticPresentationInputs(
  diagnostics: readonly SemanticTemplateDiagnosticRow[],
  projectKey: string,
  appDiagnosticReplacements: readonly SemanticAppDiagnosticRow[],
): readonly CursorDiagnosticPresentationInput[] {
  const claimedReplacementIndices = new Set<number>();
  return diagnostics.flatMap((cursorDiagnostic): readonly CursorDiagnosticPresentationInput[] => {
    if (templateDiagnosticContributesToAppDiagnostics(cursorDiagnostic)) {
      return [{
        cursorDiagnostic,
        appDiagnostic: templateAppDiagnosticRow(projectKey, cursorDiagnostic),
      }];
    }
    const replacementIndex = appDiagnosticReplacements.findIndex((candidate, candidateIndex) =>
      !claimedReplacementIndices.has(candidateIndex)
      && appDiagnosticReplacementMatchesCursorCarrier(cursorDiagnostic, candidate)
    );
    if (replacementIndex < 0) {
      return [];
    }
    claimedReplacementIndices.add(replacementIndex);
    return [{
      cursorDiagnostic,
      appDiagnostic: appDiagnosticReplacements[replacementIndex]!,
    }];
  });
}

/**
 * Router template diagnostics are cursor carriers for router-owned AppDiagnostics rows, not an independently admitted
 * app diagnostic family. Pair only the exact owning row so presentation keeps AppDiagnostics authority without
 * leaking unrelated app diagnostics or presenting the template proxy twice.
 */
function appDiagnosticReplacementMatchesCursorCarrier(
  cursorDiagnostic: SemanticTemplateDiagnosticRow,
  appDiagnostic: SemanticAppDiagnosticRow,
): boolean {
  return cursorDiagnostic.diagnosticKind === 'router-framework-error'
    && appDiagnostic.diagnosticDomain === 'router'
    && appDiagnostic.relatedQueryKind === 'router-issues'
    && cursorDiagnostic.diagnosticIdentityHandle != null
    && appDiagnostic.handles?.identityHandle === cursorDiagnostic.diagnosticIdentityHandle
    && appDiagnostic.diagnosticAuthority === cursorDiagnostic.diagnosticAuthority
    && appDiagnostic.frameworkErrorCode === cursorDiagnostic.frameworkErrorCode
    && appDiagnostic.severity === cursorDiagnostic.severity
    && appDiagnostic.summary === cursorDiagnostic.summary
    && appDiagnostic.missingInput === cursorDiagnostic.missingInput
    && appDiagnostic.missingInputs.length === cursorDiagnostic.missingInputs.length
    && appDiagnostic.missingInputs.every((missingInput, index) =>
      missingInput === cursorDiagnostic.missingInputs[index]
    )
    && diagnosticSuggestionsMatchExactly(appDiagnostic.suggestion, cursorDiagnostic.suggestion)
    && semanticTemplateCursorSourcesMatchExactly(appDiagnostic.source, cursorDiagnostic.source);
}

function diagnosticSuggestionsMatchExactly(
  left: SemanticAppDiagnosticRow['suggestion'],
  right: SemanticTemplateDiagnosticRow['suggestion'],
): boolean {
  if (left == null || right == null) {
    return left === right;
  }
  return left.suggestionKind === right.suggestionKind
    && left.actionKind === right.actionKind
    && left.summary === right.summary
    && left.targetMemberName === right.targetMemberName
    && left.ownerTypeDisplay === right.ownerTypeDisplay
    && left.valueTypeDisplay === right.valueTypeDisplay
    && left.valueTypeSource === right.valueTypeSource
    && diagnosticActionTargetsMatchExactly(left.actionTarget, right.actionTarget);
}

function diagnosticActionTargetsMatchExactly(
  left: NonNullable<SemanticAppDiagnosticRow['suggestion']>['actionTarget'],
  right: NonNullable<SemanticTemplateDiagnosticRow['suggestion']>['actionTarget'],
): boolean {
  if (left == null || right == null) {
    return left === right;
  }
  return left.targetKind === right.targetKind
    && left.memberName === right.memberName
    && left.typeDisplay === right.typeDisplay
    && nullableExactDiagnosticSourcesMatch(left.source, right.source);
}

function nullableExactDiagnosticSourcesMatch(
  left: SemanticSourceReference | null,
  right: SemanticSourceReference | null,
): boolean {
  return left == null || right == null
    ? left === right
    : semanticTemplateCursorSourcesMatchExactly(left, right);
}

function withCursorDiagnosticPresentation(
  value: SemanticTemplateCursorInfoResult,
  diagnostics: readonly SemanticTemplateDiagnosticRow[],
  projectKey: string,
  cursorOffset: number | null,
  appDiagnosticReplacements: readonly SemanticAppDiagnosticRow[],
): SemanticTemplateCursorInfoResult {
  const compact = semanticTemplateCursorDiagnosticPresentation(
    diagnostics,
    projectKey,
    value.activeSource,
    cursorOffset,
    appDiagnosticReplacements,
  );
  return cursorInfoWithDiagnosticPresentation(
    value,
    compact.diagnostics,
    compact.diagnosticPresentation,
  );
}

/**
 * Apply app-level template admission and presentation before selecting one cursor outcome while conserving every
 * co-located admitted outcome and each contextual row needed to explain it.
 */
export function semanticTemplateCursorDiagnosticPresentation(
  diagnostics: readonly SemanticTemplateDiagnosticRow[],
  projectKey: string,
  activeSource: SemanticSourceReference | null,
  cursorOffset: number | null,
  appDiagnosticReplacements: readonly SemanticAppDiagnosticRow[] = [],
): {
  readonly diagnostics: readonly SemanticTemplateDiagnosticRow[];
  readonly diagnosticPresentation: SemanticTemplateCursorDiagnosticPresentation | null;
} {
  const admittedInputs = cursorDiagnosticPresentationInputs(
    diagnostics,
    projectKey,
    appDiagnosticReplacements,
  );
  const admittedTemplateRows = admittedInputs.map((input) => input.cursorDiagnostic);
  const admittedAppRows = admittedInputs.map((input) => input.appDiagnostic);
  const presentation = appDiagnosticPresentation(admittedAppRows, true);
  const presented = cursorPresentedDiagnosticCandidates(
    presentation.groups,
    admittedAppRows,
    activeSource,
    cursorOffset,
  );
  const withheld = cursorWithheldDiagnosticCandidates(
    presentation.withheld,
    admittedAppRows,
    activeSource,
    cursorOffset,
  );
  const compact = compactCursorDiagnostics(presented, withheld, admittedTemplateRows);
  const winningPresented = [...presented].sort((left, right) => cursorDiagnosticCandidateOrder(
    admittedAppRows[left.group.primary.rowIndex] ?? null,
    left.presenterOrder,
    admittedAppRows[right.group.primary.rowIndex] ?? null,
    right.presenterOrder,
    activeSource,
  ))[0] ?? null;
  if (winningPresented != null) {
    return {
      diagnostics: compact.diagnostics,
      diagnosticPresentation: {
        kind: 'presented',
        rawRowCount: compact.diagnostics.length,
        group: reindexCursorDiagnosticGroup(winningPresented.group, compact.indexBySourceIndex),
      },
    };
  }
  const winningWithheld = [...withheld].sort((left, right) => cursorDiagnosticCandidateOrder(
    admittedAppRows[left.withheld.rowIndex] ?? null,
    left.presenterOrder,
    admittedAppRows[right.withheld.rowIndex] ?? null,
    right.presenterOrder,
    activeSource,
  ))[0] ?? null;
  if (winningWithheld != null) {
    return {
      diagnostics: compact.diagnostics,
      diagnosticPresentation: {
        kind: 'withheld',
        rawRowCount: compact.diagnostics.length,
        withheld: {
          ...winningWithheld.withheld,
          rowIndex: requireCompactCursorDiagnosticIndex(
            compact.indexBySourceIndex,
            winningWithheld.withheld.rowIndex,
          ),
        },
      },
    };
  }
  return { diagnostics: [], diagnosticPresentation: null };
}

function cursorInfoWithDiagnosticPresentation(
  value: SemanticTemplateCursorInfoResult,
  diagnostics: readonly SemanticTemplateCursorDiagnosticRow[],
  diagnosticPresentation: SemanticTemplateCursorDiagnosticPresentation | null,
): SemanticTemplateCursorInfoResult {
  const nextValue = {
    ...value,
    diagnostics,
    diagnosticPresentation,
  };
  return {
    ...nextValue,
    displayText: semanticTemplateCursorInfoDisplayText(nextValue),
  };
}

interface CursorPresentedDiagnosticCandidate {
  readonly presenterOrder: number;
  readonly group: SemanticDiagnosticPresentationGroup;
}

interface CursorWithheldDiagnosticCandidate {
  readonly presenterOrder: number;
  readonly withheld: SemanticDiagnosticPresentationWithheldRow;
}

function cursorPresentedDiagnosticCandidates(
  groups: readonly SemanticDiagnosticPresentationGroup[],
  rows: readonly SemanticAppDiagnosticRow[],
  activeSource: SemanticSourceReference | null,
  cursorOffset: number | null,
): readonly CursorPresentedDiagnosticCandidate[] {
  return groups.flatMap((group, presenterOrder) => {
    const ownsCursor = [group.primary, ...group.related].some((presentationRow) => {
      const row = rows[presentationRow.rowIndex] ?? null;
      return semanticTemplateCursorSourcePathsMatchExactly(row?.source ?? null, activeSource)
        && semanticSourceReferenceContainsOffset(row?.source ?? null, cursorOffset);
    });
    return ownsCursor
      ? [{ presenterOrder, group }]
      : [];
  });
}

function cursorWithheldDiagnosticCandidates(
  withheld: readonly SemanticDiagnosticPresentationWithheldRow[],
  rows: readonly SemanticAppDiagnosticRow[],
  activeSource: SemanticSourceReference | null,
  cursorOffset: number | null,
): readonly CursorWithheldDiagnosticCandidate[] {
  return withheld.flatMap((row, presenterOrder) => {
    const diagnostic = rows[row.rowIndex] ?? null;
    return semanticTemplateCursorSourcePathsMatchExactly(diagnostic?.source ?? null, activeSource)
      && semanticSourceReferenceContainsOffset(diagnostic?.source ?? null, cursorOffset)
      ? [{ presenterOrder, withheld: row }]
      : [];
  });
}

function cursorDiagnosticCandidateOrder(
  left: SemanticAppDiagnosticRow | null,
  leftPresenterOrder: number,
  right: SemanticAppDiagnosticRow | null,
  rightPresenterOrder: number,
  activeSource: SemanticSourceReference | null,
): number {
  return Number(semanticTemplateCursorSourcesMatchExactly(right?.source ?? null, activeSource))
    - Number(semanticTemplateCursorSourcesMatchExactly(left?.source ?? null, activeSource))
    || sourceReferenceSpanLength(left?.source ?? null) - sourceReferenceSpanLength(right?.source ?? null)
    || cursorDiagnosticSeverityRank(right?.severity ?? 'information')
      - cursorDiagnosticSeverityRank(left?.severity ?? 'information')
    || leftPresenterOrder - rightPresenterOrder;
}

export function semanticTemplateCursorSourcesMatchExactly(
  left: SemanticSourceReference | null,
  right: SemanticSourceReference | null,
): boolean {
  const exactLeft = semanticExactSourceReference(left);
  const exactRight = semanticExactSourceReference(right);
  return exactLeft?.path != null
    && exactRight?.path != null
    && sameTypeSystemSourcePath(exactLeft.path, exactRight.path)
    && exactLeft.start === exactRight.start
    && exactLeft.end === exactRight.end;
}

function semanticTemplateCursorSourcePathsMatchExactly(
  left: SemanticSourceReference | null,
  right: SemanticSourceReference | null,
): boolean {
  const exactLeft = semanticExactSourceReference(left);
  const exactRight = semanticExactSourceReference(right);
  return exactLeft?.path != null
    && exactRight?.path != null
    && sameTypeSystemSourcePath(exactLeft.path, exactRight.path);
}

function sourceReferenceSpanLength(source: SemanticSourceReference | null): number {
  const exact = semanticExactSourceReference(source);
  return exact?.start == null || exact.end == null
    ? Number.POSITIVE_INFINITY
    : exact.end - exact.start;
}

function cursorDiagnosticSeverityRank(
  severity: SemanticTemplateCursorDiagnosticRow['severity'],
): number {
  switch (severity) {
    case 'error': return 3;
    case 'warning': return 2;
    case 'information': return 1;
  }
}

function compactCursorDiagnostics(
  presented: readonly CursorPresentedDiagnosticCandidate[],
  withheld: readonly CursorWithheldDiagnosticCandidate[],
  rows: readonly SemanticTemplateDiagnosticRow[],
): {
  readonly diagnostics: readonly SemanticTemplateDiagnosticRow[];
  readonly indexBySourceIndex: ReadonlyMap<number, number>;
} {
  const sourceIndices = [
    ...presented.flatMap((candidate) => [
      candidate.group.primary.rowIndex,
      ...candidate.group.related.map((related) => related.rowIndex),
    ]),
    ...withheld.map((candidate) => candidate.withheld.rowIndex),
  ];
  assertCursorDiagnosticCompactionClaims(sourceIndices, rows.length);
  const uniqueSourceIndices = [...new Set(sourceIndices)].sort((left, right) => left - right);
  const compactIndexBySourceIndex = new Map(
    uniqueSourceIndices.map((sourceIndex, compactIndex) => [sourceIndex, compactIndex]),
  );
  return {
    diagnostics: uniqueSourceIndices.map((sourceIndex) => rows[sourceIndex]!),
    indexBySourceIndex: compactIndexBySourceIndex,
  };
}

function reindexCursorDiagnosticGroup(
  group: SemanticDiagnosticPresentationGroup,
  indexBySourceIndex: ReadonlyMap<number, number>,
): SemanticDiagnosticPresentationGroup {
  const reindex = (row: SemanticDiagnosticPresentationRow): SemanticDiagnosticPresentationRow => ({
    ...row,
    rowIndex: requireCompactCursorDiagnosticIndex(indexBySourceIndex, row.rowIndex),
  });
  return {
    ...group,
    primary: reindex(group.primary),
    related: group.related.map(reindex),
  };
}

function requireCompactCursorDiagnosticIndex(
  indexBySourceIndex: ReadonlyMap<number, number>,
  sourceIndex: number,
): number {
  const compactIndex = indexBySourceIndex.get(sourceIndex);
  if (compactIndex == null) {
    throw new Error(`Cursor diagnostic presentation lost admitted source row ${sourceIndex}.`);
  }
  return compactIndex;
}

function assertCursorDiagnosticCompactionClaims(
  claimedSourceIndices: readonly number[],
  sourceRowCount: number,
): void {
  const claimed = new Set<number>();
  for (const sourceIndex of claimedSourceIndices) {
    if (!Number.isInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= sourceRowCount) {
      throw new Error(`Cursor diagnostic presentation claimed invalid source row ${sourceIndex}.`);
    }
    if (claimed.has(sourceIndex)) {
      throw new Error(`Cursor diagnostic presentation claimed source row ${sourceIndex} more than once.`);
    }
    claimed.add(sourceIndex);
  }
}

export function readSemanticTemplateDiagnostics(
  store: KernelStore,
  workspaceRootDir: string,
  projectRootDir: string,
  emission: AureliaAppWorldProjectEmission,
  sourceFile: SemanticRuntimeSourceFileInput | null | undefined,
  page: SemanticRuntimePageInput | undefined,
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
  const paged = pageRows(rows, page);
  const scopedToSourceFile = sourceFile != null;
  const coverage = readSemanticTemplateDiagnosticCoverage(store, emission, sourceFile);
  return publicAnswer(
    SemanticRuntimeAnswerResult.Answered,
    !scopedToSourceFile
      ? `Returned ${paged.rows.length} of ${rows.length} template diagnostic row(s) from the opened app basis.`
      : `Returned ${paged.rows.length} of ${rows.length} template diagnostic row(s) for the requested source file.`,
    {
      displayText: semanticTemplateDiagnosticsDisplayText(paged.rows, rows.length, scopedToSourceFile),
      rows: paged.rows,
    },
    { ...COMPLETE_COLLECTION_ANSWER_OPTIONS, coverage, page: paged.page },
  );
}

/** Exact diagnostic completeness for the selected template set's consulting registration chains. */
export function readSemanticTemplateDiagnosticCoverage(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  sourceFile: SemanticRuntimeSourceFileInput | null | undefined,
): SemanticRuntimeAnswerCoverage {
  if (emission.project.sourceDiscovery?.truncated === true) {
    return SemanticRuntimeAnswerCoverage.Truncated;
  }
  return templateDiagnosticSelectionsForSource(store, emission, sourceFile).some((selection) =>
    registrationHidingResourceSeamsForSelection(emission, selection, null).length > 0
  )
    ? SemanticRuntimeAnswerCoverage.Open
    : SemanticRuntimeAnswerCoverage.Complete;
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
    lines.push(`Selected bindable: ${value.selectedBindable.attribute} (${selectedBindableModeDisplay(value.selectedBindable)}).`);
  }
  if (value.selectedRouteTarget != null) {
    lines.push(`Selected route target: ${value.selectedRouteTarget.targetKind} ${value.selectedRouteTarget.matchedName}.`);
  }
  if (value.selectedExpression != null) {
    lines.push(
      `Selected expression: ${value.selectedExpression.expressionKind}; type=${value.selectedExpression.typeDisplay ?? 'unknown'}; open=${value.selectedExpression.openKind ?? 'none'}.`,
    );
  }
  if (value.selectedMember != null || value.memberOwnerType != null || value.selectedMemberName != null) {
    lines.push(`Selected member: ${value.selectedMemberName ?? value.selectedMember?.name ?? 'none'}; owner=${value.memberOwnerType?.display ?? 'unknown'}; memberType=${value.selectedMember?.typeDisplay ?? 'unknown'}.`);
  }
  if (value.selectedCall != null) {
    lines.push(value.selectedCall.status === 'open' || value.selectedCall.signatureTail == null
      ? `Selected call: ${value.selectedCall.signatureName}; effective=open.`
      : `Selected call: ${value.selectedCall.signatureName}${value.selectedCall.signatureTail}${value.selectedCall.signatureIsTruncated ? '…' : ''}; candidate=${(value.selectedCall.selectedCandidateIndex ?? 0) + 1}/${value.selectedCall.candidateCount}.`);
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

function selectedBindableModeDisplay(
  bindable: SemanticTemplateCursorBindableRow,
): string {
  const declaration = `default=${bindable.mode}`;
  if (bindable.usageModeAuthority == null) {
    return declaration;
  }
  if (bindable.usageModeAuthority === SemanticTemplateBindableUsageModeAuthority.PlainLiteral) {
    return `${declaration}; static (no binding mode)`;
  }
  if (bindable.usageModeAuthority === SemanticTemplateBindableUsageModeAuthority.Open) {
    return `${declaration}; effective=open`;
  }
  return `${declaration}; effective=${bindable.usageEffectiveMode ?? 'unknown'} via ${bindable.usageModeAuthority}`;
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
  page: SemanticRuntimePageInput | undefined,
  includeHandles: boolean,
): TemplateCompletionReadResult {
  const readContext = readContextForCursor(store, workspaceRootDir, projectRootDir, emission, cursor, page);
  if ('result' in readContext) {
    return readContext;
  }

  const cursorContext = templateCompletionQueryForCursor(store, {
    locus: readContext.locus,
    resource: readContext.selection.resource,
    typeSystem: emission.typeSystem,
    frameworkCapabilityDemands: emission.capabilityDemands.readDemands(),
    page: new InquiryPageRequest(Number.MAX_SAFE_INTEGER, null),
    router: templateCompletionRouterContext(emission),
    i18nTranslationKeyProductHandles: emission.i18n.readTranslationKeys().map((translationKey) => translationKey.productHandle),
  });
  const answer = answerTemplateCompletion(store, cursorContext);
  return templateCompletionReadResult(
    store,
    { cursorContext, selection: readContext.selection },
    answer,
    includeHandles,
    page,
    templateResourceRegistrationMissingInputs(emission, readContext.selection, cursorContext),
  );
}

function readContextForCursor(
  store: KernelStore,
  workspaceRootDir: string,
  projectRootDir: string,
  emission: AureliaAppWorldProjectEmission,
  cursor: SemanticRuntimeSourceCursorInput | null | undefined,
  page: SemanticRuntimePageInput | undefined,
): TemplateCompletionReadContext | TemplateCompletionReadResult {
  if (cursor == null) {
    return missingTemplateCompletion(page, ['source-cursor'], 'Template completion requires a source cursor.');
  }

  const resolution = resolveSemanticSourceCursor(
    emission.project,
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

  if (!projectOwnsTemplateEditSourceFile(emission.project, resolvedCursor.filePath)) {
    return missingTemplateCompletion(
      page,
      ['editable-template-source'],
      `Template completion source '${resolvedCursor.filePath}' is not an editable authored template in this project.`,
    );
  }

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
  const selections = templateDiagnosticSelectionsForSource(store, emission, sourceFile);
  const htmlRecovery = htmlRecoveryDiagnosticProjection(store, selections, sourceFile, context);
  const rows = [
    ...htmlRecovery.rows,
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
  const uncertainCapabilityIdentities = new Set(emission.capabilityDemands.readDemands()
    .filter((demand) =>
      demand.admissionState === FrameworkCapabilityAdmissionState.AdmissionUnknown
      || demand.admissionState === FrameworkCapabilityAdmissionState.AdmittedChainUnproven
    )
    .map((demand) => demand.identityHandle));
  // AUR4001 already owns the exact duplicate t-params carrier with framework semantics. Keep that stronger row instead
  // of replacing it with the generic HTML duplicate-attribute recovery; unrelated framework rows do not suppress it.
  const duplicateAttributeFrameworkSources = rows
    .filter((row) => row.frameworkErrorCode === 'AUR4001')
    .map((row) => semanticExactSourceReference(row.source))
    .filter((source): source is NonNullable<typeof source> => source != null);
  return rows.filter((row) =>
    !row.diagnosticRelations?.some((relation) =>
      relation.relationKind === 'derived-consequence'
      && uncertainCapabilityIdentities.has(relation.relatedDiagnosticIdentityHandle)
    )
    && (
      row.diagnosticKind === 'html-syntax-recovery'
      || row.diagnosticAuthority === 'framework-error-code'
      || !htmlRecovery.blockedSources.some((blocked) => semanticSourceContains(blocked, row.source))
    )
    && !(
      row.diagnosticKind === 'html-syntax-recovery'
      && row.missingInput === `html-recovery:${HtmlRecoveryKind.DuplicateAttribute}`
      && duplicateAttributeFrameworkSources.some((frameworkSource) => semanticSourceContains(frameworkSource, row.source))
    )
  ).sort((left, right) =>
    (left.source?.path ?? '').localeCompare(right.source?.path ?? '')
    || (left.source?.start ?? 0) - (right.source?.start ?? 0)
    || (left.selectedMemberName ?? '').localeCompare(right.selectedMemberName ?? '')
    || left.diagnosticAuthority.localeCompare(right.diagnosticAuthority)
    || (left.frameworkErrorCode ?? '').localeCompare(right.frameworkErrorCode ?? '')
    || left.diagnosticKind.localeCompare(right.diagnosticKind)
  );
}

function templateDiagnosticSelectionsForSource(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  sourceFile: SemanticRuntimeSourceFileInput | null | undefined,
): readonly TemplateCompletionResourceSelection[] {
  return templateResourceSelections(store, emission)
    .filter((selection) => templateDiagnosticSelectionMatchesFile(store, selection, sourceFile));
}

interface HtmlRecoveryDiagnosticProjection {
  readonly rows: readonly SemanticTemplateDiagnosticRow[];
  /** Malformed carriers whose downstream semantic rows would only be parser-recovery cascades. */
  readonly blockedSources: readonly NonNullable<SemanticTemplateDiagnosticRow['source']>[];
}

interface HtmlRecoveryDiagnosticSite {
  readonly recovery: HtmlRecovery;
  readonly owner: HtmlAttribute | HtmlComment | HtmlDoctype | HtmlDocument | HtmlElement | HtmlText | null;
  readonly ownerSource: SemanticTemplateDiagnosticRow['source'];
}

const htmlOptionalEndTagNames = new Set([
  'html',
  'head',
  'body',
  'li',
  'dt',
  'dd',
  'p',
  'rt',
  'rp',
  'rb',
  'rtc',
  'optgroup',
  'option',
  'colgroup',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'td',
  'th',
]);

function htmlRecoveryDiagnosticProjection(
  store: KernelStore,
  selections: readonly TemplateCompletionResourceSelection[],
  sourceFile: SemanticRuntimeSourceFileInput | null | undefined,
  context: TemplateDiagnosticsScanContext,
): HtmlRecoveryDiagnosticProjection {
  const rows: SemanticTemplateDiagnosticRow[] = [];
  const blockedSources: NonNullable<SemanticTemplateDiagnosticRow['source']>[] = [];
  for (const selection of selections) {
    const sites = actionableHtmlRecoverySites(store, selection);
    for (const site of sites) {
      const source = describeAddress(store, site.recovery.addressHandle);
      if (source == null || !sourceReferenceMatchesFile(source, sourceFile)) {
        continue;
      }
      const diagnostic = htmlRecoveryDiagnostic(site.recovery.recoveryKind, site.recovery.summary, source);
      const key = templateDiagnosticRowKey(diagnostic, source);
      if (context.seenRows.has(key)) {
        continue;
      }
      context.seenRows.add(key);
      const owner = site.owner;
      rows.push({
        ...diagnostic,
        ...templateDiagnosticOriginFields(store, context.includeHandles, {
          phase: null,
          semanticProductHandle: site.recovery.productHandle,
          sourceAddressHandle: site.recovery.addressHandle,
        }),
        subject: {
          subjectKind: 'template-syntax',
          subjectName: owner instanceof HtmlElement
            ? owner.tagName
            : owner instanceof HtmlAttribute
              ? owner.rawName
              : null,
          source,
        },
        siteKind: owner instanceof HtmlElement
          ? TemplateCompletionSiteKind.ElementName
          : owner instanceof HtmlAttribute
            ? TemplateCompletionSiteKind.AttributeValue
            : TemplateCompletionSiteKind.Unknown,
        valueSiteKind: null,
        template: {
          compilationLane: selection.lane,
          source: describeAddress(store, selection.sourceAddressHandle),
        },
      });
      if (htmlRecoveryBlocksOwnedSemanticRows(site.recovery.recoveryKind)) {
        const blocked = semanticExactSourceReference(
          htmlRecoveryBlockingOwnerSource(store, selection, site) ?? source,
        );
        if (blocked != null) {
          blockedSources.push(blocked);
        }
      }
    }
  }
  return { rows, blockedSources };
}

function actionableHtmlRecoverySites(
  store: KernelStore,
  selection: TemplateCompletionResourceSelection,
): readonly HtmlRecoveryDiagnosticSite[] {
  const html = selection.resource.compilation.html;
  const ownerByRecovery = new Map<
    HtmlRecovery,
    HtmlAttribute | HtmlComment | HtmlDoctype | HtmlDocument | HtmlElement | HtmlText
  >();
  for (const recovery of html.document.recoveries) {
    ownerByRecovery.set(recovery, html.document);
  }
  for (const node of html.nodes) {
    if (
      !(node instanceof HtmlElement)
      && !(node instanceof HtmlComment)
      && !(node instanceof HtmlDoctype)
      && !(node instanceof HtmlText)
    ) {
      continue;
    }
    for (const recovery of node.recoveries) {
      ownerByRecovery.set(recovery, node);
    }
  }
  for (const attribute of html.attributes) {
    for (const recovery of attribute.recoveries) {
      ownerByRecovery.set(recovery, attribute);
    }
  }
  const sites = html.recoveries.flatMap((recovery): HtmlRecoveryDiagnosticSite[] => {
    const owner = ownerByRecovery.get(recovery) ?? null;
    if (!htmlRecoveryIsActionable(recovery.recoveryKind, owner)) {
      return [];
    }
    return [{
      recovery,
      owner,
      ownerSource: owner == null ? null : describeAddress(store, owner.sourceAddressHandle),
    }];
  });
  const invalidAttributeCarrierSources = sites
    .filter((site) => site.recovery.recoveryKind === HtmlRecoveryKind.InvalidAttribute)
    .map((site) => semanticExactSourceReference(htmlRecoveryBlockingOwnerSource(store, selection, site)))
    .filter((source): source is NonNullable<typeof source> => source != null);
  const swallowingSources = sites
    .filter((site) => htmlRecoverySwallowsFollowingMarkup(site.recovery.recoveryKind))
    .map((site) => semanticExactSourceReference(htmlRecoverySwallowingSource(store, site)))
    .filter((source): source is NonNullable<typeof source> => source != null);
  const attributeFailureSources = sites
    .filter((site) => site.owner instanceof HtmlAttribute && htmlRecoveryIsAttributeFailure(site.recovery.recoveryKind))
    .map((site) => semanticExactSourceReference(site.ownerSource))
    .filter((source): source is NonNullable<typeof source> => source != null);
  const redundantStartTags = new Set(sites.filter((site) => {
    if (site.recovery.recoveryKind !== HtmlRecoveryKind.UnterminatedStartTag) {
      return false;
    }
    const ownerSource = semanticExactSourceReference(site.ownerSource);
    return ownerSource != null && attributeFailureSources.some((attribute) =>
      attribute.path === ownerSource.path
      && attribute.start! >= ownerSource.start!
      && attribute.end === ownerSource.end
    );
  }));
  const missingSites = sites.filter((site) => site.recovery.recoveryKind === HtmlRecoveryKind.MissingEndTag);
  const nonVoidSelfClosingOwners = new Set(sites
    .filter((site) => site.recovery.recoveryKind === HtmlRecoveryKind.NonVoidSelfClosing)
    .map((site) => site.owner));
  const deepestMissingByEnd = new Map<string, HtmlRecoveryDiagnosticSite>();
  for (const site of missingSites) {
    const ownerSource = semanticExactSourceReference(site.ownerSource);
    if (
      ownerSource?.path == null
      || ownerSource.start == null
      || ownerSource.end == null
    ) {
      deepestMissingByEnd.set(`recovery:${String(site.recovery.addressHandle)}`, site);
      continue;
    }
    if (swallowingSources.some((swallowing) =>
      swallowing.path === ownerSource.path
      && swallowing.start! >= ownerSource.start!
      && swallowing.end === ownerSource.end
    )) {
      continue;
    }
    const key = `${ownerSource.path}:${ownerSource.end}`;
    const existing = deepestMissingByEnd.get(key);
    const existingStart = semanticExactSourceReference(existing?.ownerSource ?? null)?.start ?? -1;
    if (ownerSource.start >= existingStart) {
      deepestMissingByEnd.set(key, site);
    }
  }
  const admittedMissing = new Set(deepestMissingByEnd.values());
  const hasUnterminatedEndTag = sites.some((site) =>
    site.recovery.recoveryKind === HtmlRecoveryKind.UnterminatedEndTag
  );
  return sites.filter((site) =>
    !redundantStartTags.has(site)
    && !(
      site.recovery.recoveryKind !== HtmlRecoveryKind.InvalidAttribute
      && invalidAttributeCarrierSources.some((carrier) =>
        semanticSourceContains(carrier, describeAddress(store, site.recovery.addressHandle))
      )
    )
    && !(
      site.recovery.recoveryKind === HtmlRecoveryKind.MissingEndTag
      && nonVoidSelfClosingOwners.has(site.owner)
    )
    && (
      site.recovery.recoveryKind !== HtmlRecoveryKind.MissingEndTag
      || (!hasUnterminatedEndTag && admittedMissing.has(site))
    )
  );
}

function htmlRecoveryBlockingOwnerSource(
  store: KernelStore,
  selection: TemplateCompletionResourceSelection,
  site: HtmlRecoveryDiagnosticSite,
): SemanticTemplateDiagnosticRow['source'] {
  if (site.recovery.recoveryKind === HtmlRecoveryKind.NestingLimitExceeded) {
    return describeAddress(store, site.recovery.addressHandle);
  }
  if (
    site.recovery.recoveryKind !== HtmlRecoveryKind.InvalidAttribute
    || !(site.owner instanceof HtmlAttribute)
  ) {
    return site.ownerSource;
  }
  const owner = selection.resource.compilation.html.nodes.find((node): node is HtmlElement =>
    node instanceof HtmlElement
    && node.attributes.some((attribute) => attribute.productHandle === site.owner?.productHandle)
  ) ?? null;
  return owner == null ? site.ownerSource : describeAddress(store, owner.sourceAddressHandle);
}

function htmlRecoverySwallowingSource(
  store: KernelStore,
  site: HtmlRecoveryDiagnosticSite,
): SemanticTemplateDiagnosticRow['source'] {
  return site.recovery.recoveryKind === HtmlRecoveryKind.NestingLimitExceeded
    ? describeAddress(store, site.recovery.addressHandle)
    : site.ownerSource ?? describeAddress(store, site.recovery.addressHandle);
}

function htmlRecoveryIsActionable(
  recoveryKind: HtmlRecoveryKind,
  owner: HtmlAttribute | HtmlComment | HtmlDoctype | HtmlDocument | HtmlElement | HtmlText | null,
): boolean {
  switch (recoveryKind) {
    case HtmlRecoveryKind.MissingEndTag:
      return owner instanceof HtmlElement
        && (
          owner.namespace !== HtmlNamespaceKind.Html
          || !htmlOptionalEndTagNames.has(owner.tagName.toLowerCase())
        );
    case HtmlRecoveryKind.UnexpectedEndTag:
    case HtmlRecoveryKind.UnterminatedStartTag:
    case HtmlRecoveryKind.UnterminatedEndTag:
    case HtmlRecoveryKind.NonVoidSelfClosing:
    case HtmlRecoveryKind.UnterminatedComment:
    case HtmlRecoveryKind.MalformedComment:
    case HtmlRecoveryKind.UnterminatedCdata:
    case HtmlRecoveryKind.UnterminatedAttribute:
    case HtmlRecoveryKind.MissingAttributeValue:
    case HtmlRecoveryKind.InvalidAttribute:
    case HtmlRecoveryKind.DuplicateAttribute:
    case HtmlRecoveryKind.InvalidDoctype:
    case HtmlRecoveryKind.NestingLimitExceeded:
      return true;
    default:
      return false;
  }
}

function htmlRecoverySwallowsFollowingMarkup(recoveryKind: HtmlRecoveryKind): boolean {
  return recoveryKind === HtmlRecoveryKind.UnterminatedStartTag
    || recoveryKind === HtmlRecoveryKind.UnterminatedEndTag
    || recoveryKind === HtmlRecoveryKind.UnterminatedAttribute
    || recoveryKind === HtmlRecoveryKind.UnterminatedComment
    || recoveryKind === HtmlRecoveryKind.UnterminatedCdata
    || recoveryKind === HtmlRecoveryKind.InvalidDoctype
    || recoveryKind === HtmlRecoveryKind.NestingLimitExceeded;
}

function htmlRecoveryBlocksOwnedSemanticRows(recoveryKind: HtmlRecoveryKind): boolean {
  return htmlRecoverySwallowsFollowingMarkup(recoveryKind)
    || recoveryKind === HtmlRecoveryKind.MissingAttributeValue
    || recoveryKind === HtmlRecoveryKind.InvalidAttribute
    || recoveryKind === HtmlRecoveryKind.DuplicateAttribute;
}

function htmlRecoveryIsAttributeFailure(recoveryKind: HtmlRecoveryKind): boolean {
  return recoveryKind === HtmlRecoveryKind.UnterminatedAttribute
    || recoveryKind === HtmlRecoveryKind.MissingAttributeValue
    || recoveryKind === HtmlRecoveryKind.InvalidAttribute;
}

function semanticSourceContains(
  owner: NonNullable<SemanticTemplateDiagnosticRow['source']>,
  candidate: SemanticTemplateDiagnosticRow['source'],
): boolean {
  const exactCandidate = semanticExactSourceReference(candidate);
  return exactCandidate != null
    && owner.path != null
    && exactCandidate.path != null
    && sameTypeSystemSourcePath(owner.path, exactCandidate.path)
    && owner.start != null
    && owner.end != null
    && exactCandidate.start != null
    && exactCandidate.end != null
    && owner.start <= exactCandidate.start
    && exactCandidate.end <= owner.end;
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
      allDiagnostics: [],
      diagnostics: [],
      selectionsByOriginKey: new Map(),
      typeSystem: null,
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
  const allDiagnostics = readTypeSystemOverlayDiagnostics(overlayTypeSystem);
  const result = {
    allDiagnostics,
    diagnostics: allDiagnostics
      .filter((diagnostic) =>
        selectionsByOriginKey.has(diagnostic.overlayOriginKey)
        && templateOverlayDiagnosticIsPublic(diagnostic)
      ),
    selectionsByOriginKey,
    typeSystem: overlayTypeSystem,
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
    typeScriptDiagnosticCode: diagnostic.diagnostic.code,
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
    emission,
    includeHandles,
    capabilityDemands: emission.capabilityDemands.readDemands(),
    router: templateCompletionRouterContext(emission),
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
    frameworkCapabilityDemands: emission.capabilityDemands.readDemands(),
    page: new InquiryPageRequest(1, null),
    router: context.router,
    i18nTranslationKeyProductHandles: context.i18nTranslationKeyProductHandles,
  });
  const cursorInfo = templateCursorInfoResult(
    store,
    selection,
    cursorContext,
    context.includeHandles,
    [...new Set(cursorContext.missingInputs)],
    noBindableUsageMode(),
    false,
    null,
  );
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
      if (diagnostic.selectedMemberName != null && registrationCanHideDataFlowExpressionResource(
        context.emission,
        selection,
        dataFlow,
        diagnostic.selectedMemberName,
      )) {
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

function registrationCanHideDataFlowExpressionResource(
  emission: AureliaAppWorldProjectEmission,
  selection: TemplateCompletionResourceSelection,
  dataFlow: RuntimeBindingDataFlow,
  resourceName: string,
): boolean {
  switch (dataFlow.sourceTypeOpenKind) {
    case CheckerExpressionTypeOpenKind.MissingValueConverterResource:
      return registrationCanHideNamedResource(
        emission,
        selection,
        ResourceDefinitionKind.ValueConverter,
        resourceName,
      );
    case CheckerExpressionTypeOpenKind.MissingBindingBehaviorResource:
      return registrationCanHideNamedResource(
        emission,
        selection,
        ResourceDefinitionKind.BindingBehavior,
        resourceName,
      );
    default:
      return false;
  }
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
      frameworkCapabilityDemands: emission.capabilityDemands.readDemands(),
      page: new InquiryPageRequest(1, null),
      router: context.router,
      i18nTranslationKeyProductHandles: context.i18nTranslationKeyProductHandles,
    });
    const cursorInfo = templateCursorInfoResult(
      store,
      selection,
      cursorContext,
      context.includeHandles,
      [...new Set(cursorContext.missingInputs)],
      noBindableUsageMode(),
      false,
      null,
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
    const accessUses = runtimeExpressionAccessUsesForTemplateExpression(resource, parse.productHandle);
    for (const access of ExpressionParseResultInspector.scopeAccesses(parse.result)) {
      const matchingAccessUses = accessUses.filter((accessUse) =>
        runtimeExpressionAccessUseMatchesScopeAccess(store, accessUse, access)
      );
      if (
        matchingAccessUses.length === 0
        || matchingAccessUses.every((accessUse) => accessUse.lexicalLocal)
      ) {
        continue;
      }
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

function runtimeExpressionAccessUseMatchesScopeAccess(
  store: KernelStore,
  accessUse: RuntimeExpressionAccessUse,
  access: ExpressionScopeAccess,
): boolean {
  if (
    accessUse.accessForm !== RuntimeExpressionAccessForm.Scope
    && accessUse.accessForm !== RuntimeExpressionAccessForm.ScopeCall
  ) {
    return false;
  }
  const source = sourceSpanAddressForAddress(store, accessUse.nameSourceAddressHandle);
  return source != null
    && source.start === access.name.span.start
    && source.end === access.name.span.end;
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
    const sourceFile = typeSystem.readProgramSourceFileByProjectPath(source.path);
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
    const unknownCommandLookupKeys = issue.issueKind === TemplateCompilerIssueKind.UnknownBindingCommand
      ? unknownBindingCommandLookupKeysForIssue(store, selection, issue)
      : null;
    if (
      unknownCommandLookupKeys != null
      && registrationHidingResourceSeamsForSelection(
        context.emission,
        selection,
        unknownCommandLookupKeys,
      ).length > 0
    ) {
      return [];
    }
    if (
      issue.issueKind === TemplateCompilerIssueKind.ProjectionOnNonCustomElement
      && (
        selection.resource.compilation.appRootDefinitionProductHandle == null
        || registrationHidingResourceSeamsForSelection(
          context.emission,
          selection,
          projectionTargetLookupKeysForIssue(selection, issue),
        ).length > 0
      )
    ) {
      return [];
    }
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

function projectionTargetLookupKeysForIssue(
  selection: TemplateCompletionResourceSelection,
  issue: TemplateCompilerIssue,
): ReadonlySet<string> | null {
  const html = selection.resource.compilation.html;
  const projectedAttribute = html.attributes.find((attribute) =>
    attribute.sourceAddressHandle === issue.sourceAddressHandle
  ) ?? null;
  if (projectedAttribute == null) return null;
  const projectedOwner = html.nodes.find((node): node is HtmlElement =>
    node instanceof HtmlElement
    && node.attributes.some((attribute) => attribute.productHandle === projectedAttribute.productHandle)
  ) ?? null;
  if (projectedOwner == null) return null;
  const parent = html.nodes.find((node): node is HtmlElement =>
    node instanceof HtmlElement
    && node.children.some((child) => child.productHandle === projectedOwner.productHandle)
  ) ?? null;
  if (parent == null) return null;
  const lookupName = runtimeElementResourceName(parent.tagName, parent.namespace);
  const lookupKey = runtimeResourceKeyForKind(ResourceDefinitionKind.CustomElement, lookupName);
  return lookupKey == null ? null : new Set([lookupKey]);
}

function unknownBindingCommandLookupKeysForIssue(
  store: KernelStore,
  selection: TemplateCompletionResourceSelection,
  issue: TemplateCompilerIssue,
): ReadonlySet<string> | null {
  const issueSource = semanticExactSourceReference(describeAddress(store, issue.sourceAddressHandle));
  if (issueSource == null) return null;
  const syntax = selection.resource.compilation.authoredAttributeSyntaxes.find((candidate) =>
    candidate.command != null
    && semanticTemplateCursorSourcesMatchExactly(
      semanticExactSourceReference(describeAddress(store, candidate.commandSourceAddressHandle)),
      issueSource,
    )
  ) ?? null;
  if (syntax?.command == null) return null;
  const lookupKey = runtimeResourceKeyForKind(ResourceDefinitionKind.BindingCommand, syntax.command);
  return lookupKey == null ? null : new Set([lookupKey]);
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
    if (
      issue.issueKind === RuntimeBindingBehaviorIssueKind.ResourceNotFound
      && registrationCanHideNamedResource(
        context.emission,
        selection,
        ResourceDefinitionKind.BindingBehavior,
        issue.application.behaviorName,
      )
    ) {
      return [];
    }
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
    if (
      issue.issueKind === RuntimeValueConverterIssueKind.ResourceNotFound
      && registrationCanHideNamedResource(
        context.emission,
        selection,
        ResourceDefinitionKind.ValueConverter,
        issue.application.converterName,
      )
    ) {
      return [];
    }
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
    && sameTypeSystemSourcePath(file.path, source.path)
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

function templateCompletionReadResult(
  store: KernelStore,
  context: TemplateCompletionAnswerContext,
  answer: ReturnType<typeof answerTemplateCompletion>,
  includeHandles: boolean,
  pageInput: SemanticRuntimePageInput | undefined,
  additionalMissingInputs: readonly string[] = [],
): TemplateCompletionReadResult {
  const replacementSource = templateCompletionReplacementSource(store, context);
  const rows = answer.value.candidates.map((candidate) =>
    templateCompletionCandidateRow(candidate, replacementSource, includeHandles)
  );
  const paged = pageRows(rows, pageInput);
  const missingInputs = [...new Set([
    ...context.cursorContext.missingInputs,
    ...answer.value.missingInputs,
    ...additionalMissingInputs,
  ])];
  const selection = answer.selection;
  const inquiryCoverage = answer.coverage;
  const coverage = missingInputs.length > 0 && inquiryCoverage === SemanticRuntimeAnswerCoverage.Complete
    ? SemanticRuntimeAnswerCoverage.Open
    : inquiryCoverage;
  const value: Omit<SemanticTemplateCompletionResult, 'displayText'> = {
    siteKind: answer.value.siteKind,
    domainKind: answer.value.domainKind,
    candidates: paged.rows,
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
    result: answer.result,
    selection,
    coverage,
    summary: answer.summary,
    value: {
      displayText: semanticTemplateCompletionDisplayText(value),
      ...value,
    },
    page: paged.page,
  };
}

function templateCompletionReplacementSource(
  store: KernelStore,
  context: TemplateCompletionAnswerContext,
): SemanticTemplateCompletionCandidateRow['edit']['source'] {
  const cursorContext = context.cursorContext;
  const locus = cursorContext.query.locus;
  if (locus.kind !== InquiryLocusKind.SourceCursor || locus.cursor.offset == null) {
    throw new Error('Template completion candidates require an authored source cursor with an offset.');
  }
  const carrier = describeAddress(store, context.selection.sourceAddressHandle);
  if (cursorContext.activeExpressionSpan != null) {
    return sourceReferenceForParserSpan(
      locus.cursor.filePath,
      cursorContext.activeExpressionSpan,
      'completion-replacement',
      carrier,
    );
  }
  // A frontier/degraded expression has no canonical token span at the cursor.
  // Its value-site address is the enclosing binding/interpolation carrier, not
  // an authored completion token. Replacing that carrier makes editors filter
  // every candidate against unrelated text and would destroy the expression
  // if a candidate were applied. With no token to replace, insert exactly at
  // the cursor; completed partial tokens still take the branch above.
  if (templateCompletionSiteUsesExpressionParse(cursorContext.query.siteKind)) {
    return sourceReferenceForParserSpan(
      locus.cursor.filePath,
      new SourceSpan(locus.cursor.offset, locus.cursor.offset),
      'completion-insertion',
      carrier,
    );
  }
  const activeSource = semanticExactSourceReference(
    describeAddress(store, cursorContext.activeSourceAddressHandle),
  );
  return activeSource ?? sourceReferenceForParserSpan(
    locus.cursor.filePath,
    new SourceSpan(locus.cursor.offset, locus.cursor.offset),
    'completion-insertion',
    carrier,
  );
}

function templateCompletionSiteUsesExpressionParse(
  siteKind: TemplateCompletionSiteKind,
): boolean {
  switch (siteKind) {
    case TemplateCompletionSiteKind.Expression:
    case TemplateCompletionSiteKind.ExpressionMember:
    case TemplateCompletionSiteKind.ExpressionValueConverter:
    case TemplateCompletionSiteKind.ExpressionBindingBehavior:
      return true;
    default:
      return false;
  }
}

function missingTemplateCompletion(
  page: SemanticRuntimePageInput | undefined,
  missingInputs: readonly string[],
  summary: string,
): TemplateCompletionReadResult {
  const paged = pageRows([], page);
  return {
    result: SemanticRuntimeAnswerResult.Answered,
    selection: SemanticRuntimeAnswerSelection.Absent,
    coverage: SemanticRuntimeAnswerCoverage.Complete,
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
    page: paged.page,
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
    selectedRouteTarget: null,
    selectedMemberName: null,
    selectedMember: null,
    selectedCall: null,
    selectedExpression: null,
    uncertainty: null,
    memberOwnerType: null,
    diagnostics: [],
    diagnosticPresentation: null,
  };
  return publicAnswer(read.result, read.summary, {
      displayText: semanticTemplateCursorInfoDisplayText(value),
      ...value,
    }, {
      selection: read.selection,
      coverage: read.coverage,
    });
}

function templateCursorInfoResult(
  store: KernelStore,
  selection: TemplateCompletionResourceSelection,
  cursorContext: TemplateCompletionCursorContext,
  includeHandles: boolean,
  missingInputs: readonly string[],
  selectedBindableUsageMode: SemanticTemplateCursorBindableUsageModeFields,
  includePresentationMetadata: boolean,
  selectedCall: SemanticTemplateCursorInfoResult['selectedCall'],
): SemanticTemplateCursorInfoResult {
  const query = cursorContext.query;
  const html = cursorHtmlRow(store, cursorContext, includeHandles);
  const valueSite = cursorValueSiteRow(store, cursorContext, includeHandles);
  const selectedMember = cursorSelectedMemberRow(
    store,
    cursorContext,
    includeHandles,
    includePresentationMetadata,
  );
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
  const expressionSource = query.expressionParseProductHandle == null
    ? null
    : describeAddress(
        store,
        readTemplateExpressionParse(store, query.expressionParseProductHandle)?.sourceAddressHandle ?? null,
      );
  const baseActiveSource = cursorContext.activeExpressionSpan == null
    ? describeAddress(store, cursorContext.activeSourceAddressHandle)
    : query.locus.kind === InquiryLocusKind.SourceCursor
      ? sourceReferenceForParserSpan(
          expressionSource?.path ?? query.locus.cursor.filePath,
          cursorContext.activeExpressionSpan,
          'active-template-token',
          expressionSource,
        )
      : null;
  const routeActiveSource = cursorRouteActiveSource(
    store,
    cursorContext,
    valueSite,
    baseActiveSource,
  );
  const activeSource = cursorSelectedMemberActiveSource(
    routeActiveSource,
    selectedMember,
    query.locus.kind === InquiryLocusKind.SourceCursor ? query.locus.cursor : null,
  );
  const selectedExpression = cursorSelectedExpressionRow(
    store,
    cursorContext,
    activeSource,
    includeHandles,
  );
  const selectedDefinition = cursorDefinitionRow(
    store,
    query.selectedDefinitionProductHandle,
    cursorContext.selectedDefinitionMatchedName,
    selection.resource,
    cursorContext,
    activeSource,
    includeHandles,
  );
  const selectedBindable = cursorBindableRow(
    store,
    selection.resource.runtimeAnalysis.expressionWorld.projector,
    cursorContext.selectedBindable,
    cursorContext.selectedBindableValueType,
    selectedBindableUsageMode,
    includeHandles,
  );
  const selectedRouteTarget = cursorRouteTargetRow(store, cursorContext, includeHandles);
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
    selectedDefinition,
    selectedBindable,
    selectedRouteTarget,
    selectedMemberName: cursorContext.selectedMemberName,
    selectedMember,
    selectedCall,
    selectedExpression,
    uncertainty: cursorUncertainty(
      store,
      selection.resource,
      cursorContext,
      missingInputs,
      selectedDefinition,
      selectedBindable,
      selectedMember,
    ),
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
    diagnosticPresentation: null,
    ...(includeHandles ? {
      handles: {
        activeSourceAddressHandle: cursorActiveSourceAddressHandle(
          store,
          activeSource,
          cursorContext,
          valueSite,
          selectedMember,
        ),
      },
    } : {}),
  };
  return {
    displayText: semanticTemplateCursorInfoDisplayText(value),
    ...value,
  };
}

/** Publish a store handle only when its current authored span is exactly the winning public active source. */
function cursorActiveSourceAddressHandle(
  store: KernelStore,
  activeSource: SemanticSourceReference | null,
  cursorContext: TemplateCompletionCursorContext,
  valueSite: SemanticTemplateCursorValueSiteRow | null,
  selectedMember: SemanticTemplateCursorMemberRow | null,
): AddressHandle | null {
  const candidates = [
    cursorContext.activeSourceAddressHandle,
    valueSite?.handles?.sourceAddressHandle ?? null,
    selectedMember?.handles?.sourceAddressHandle ?? null,
    selectedMember?.handles?.declarationSourceAddressHandle ?? null,
  ];
  for (const handle of new Set(candidates)) {
    if (
      handle != null
      && semanticTemplateCursorSourcesMatchExactly(describeAddress(store, handle), activeSource)
    ) {
      return handle;
    }
  }
  return null;
}

/** Refine only router loci whose authored value grammar proves a narrower active token at this exact cursor. */
function cursorRouteActiveSource(
  store: KernelStore,
  cursorContext: TemplateCompletionCursorContext,
  valueSite: SemanticTemplateCursorValueSiteRow | null,
  activeSource: SemanticSourceReference | null,
): SemanticSourceReference | null {
  const locus = cursorContext.query.locus;
  if (
    locus.kind !== InquiryLocusKind.SourceCursor
    || locus.cursor.offset == null
    || cursorContext.valueSiteProductHandle == null
    || valueSite == null
  ) {
    return activeSource;
  }
  const exactValueSource = semanticExactSourceReference(valueSite.source);
  if (
    exactValueSource?.path == null
    || !sameTypeSystemSourcePath(exactValueSource.path, locus.cursor.filePath)
    || !semanticSourceReferenceContainsOffset(exactValueSource, locus.cursor.offset)
  ) {
    return activeSource;
  }
  const site = store.productDetails.read(
    TemplateProductDetails.ValueSite,
    cursorContext.valueSiteProductHandle,
  );
  if (site == null) {
    return activeSource;
  }
  if (cursorContext.selectedRouteTarget?.targetKind === RouterNavigationTargetKind.RouteId) {
    return exactValueSource;
  }
  const attribute = readHtmlAttribute(store, cursorContext.htmlAttributeProductHandle);
  const nestedRouteIdValue = site.sourceAddressHandle != null
    && site.sourceAddressHandle !== attribute?.valueAddressHandle
    && valueSite.bindableName === 'route'
    && valueSite.bindableAttribute === 'route';
  if (nestedRouteIdValue) {
    return exactValueSource;
  }
  // Only the value site that owns the whole attribute value uses the primary string-navigation path grammar.
  // Other nested multi-binding sites do not inherit route-id or route-path identity.
  if (
    site.sourceAddressHandle == null
    || site.sourceAddressHandle !== attribute?.valueAddressHandle
  ) {
    return activeSource;
  }
  const pathSpan = templateRouteExpressionPathSpanForCursor(
    store,
    site,
    locus.cursor.offset,
  );
  if (pathSpan != null) {
    return sourceReferenceForParserSpan(
      exactValueSource.path,
      pathSpan,
      'route-path',
      exactValueSource,
    );
  }
  return activeSource;
}

/**
 * Prefer a proved authored member-name token over a broader parser range at that same cursor. Member declaration
 * sources may point into another file (ordinary TypeScript members) or back to an earlier local declaration (a local
 * use), so exact request-file identity and cursor containment are mandatory before refining the active source.
 */
function cursorSelectedMemberActiveSource(
  activeSource: SemanticSourceReference | null,
  selectedMember: SemanticTemplateCursorMemberRow | null,
  cursor: SourceTextCursor | null,
): SemanticSourceReference | null {
  if (selectedMember == null || cursor == null) {
    return activeSource;
  }
  const candidates = [selectedMember.source, selectedMember.declarationSource]
    .map((source, sourceOrder) => ({
      source: semanticExactSourceReference(source),
      sourceOrder,
    }))
    .filter((candidate): candidate is { source: SemanticSourceReference; sourceOrder: number } =>
      candidate.source?.path != null
      && candidate.source.role === 'name'
      && sameTypeSystemSourcePath(candidate.source.path, cursor.filePath)
      && semanticSourceReferenceContainsOffset(candidate.source, cursor.offset)
    )
    .sort((left, right) =>
      sourceReferenceSpanLength(left.source) - sourceReferenceSpanLength(right.source)
      || (left.source.start ?? 0) - (right.source.start ?? 0)
      || left.sourceOrder - right.sourceOrder
    );
  const selectedSource = candidates[0]?.source ?? null;
  if (selectedSource == null) {
    return activeSource;
  }

  const exactActiveSource = semanticExactSourceReference(activeSource);
  const activeSourceAuthenticatesCursor = exactActiveSource?.path != null
    && sameTypeSystemSourcePath(exactActiveSource.path, cursor.filePath)
    && semanticSourceReferenceContainsOffset(exactActiveSource, cursor.offset);
  if (
    activeSourceAuthenticatesCursor
    && exactActiveSource.start != null
    && exactActiveSource.end != null
    && selectedSource.start != null
    && selectedSource.end != null
    && !(
      exactActiveSource.start <= selectedSource.start
      && selectedSource.end <= exactActiveSource.end
    )
  ) {
    return activeSource;
  }
  return selectedSource;
}

const resourceAvailabilityMissingInputs = new Set<string>([
  TEMPLATE_RESOURCE_REGISTRATION_OPEN_MISSING_INPUT,
  FrameworkRegistrationCapability.RuntimeHtmlDefaultResources,
  FrameworkRegistrationCapability.I18nDefaultResources,
  FrameworkRegistrationCapability.ValidationHtmlDefaultResources,
  FrameworkRegistrationCapability.RouterDefaultResources,
  FrameworkRegistrationCapability.UiVirtualizationDefaultResources,
  FrameworkRegistrationCapability.StateDefaultResources,
]);

function cursorUncertainty(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  cursorContext: TemplateCompletionCursorContext,
  missingInputs: readonly string[],
  selectedDefinition: SemanticTemplateCursorDefinitionRow | null,
  selectedBindable: SemanticTemplateCursorBindableRow | null,
  selectedMember: SemanticTemplateCursorMemberRow | null,
): SemanticTemplateCursorUncertainty | null {
  return classifySemanticTemplateCursorUncertainty({
    missingInputs,
    selectedDefinition: selectedDefinition != null,
    selectedBindableValueType: selectedBindable?.valueType,
    selectedBindableOwnsLocus: selectedBindable?.valueType === null
      && cursorSelectsBindableTypeLocus(store, resource, cursorContext),
    selectedMemberTypeDisplay: selectedMember?.typeDisplay,
    selectedExpressionOpen: cursorContext.selectedExpression?.openKind != null,
    selectedScopeSlotTypeOpen:
      cursorContext.selectedScopeSlot?.slot.targetType?.origin === CheckerTypeProjectionOrigin.Open,
  });
}

export interface SemanticTemplateCursorUncertaintyEvidence {
  readonly missingInputs: readonly string[];
  readonly selectedDefinition: boolean;
  /** Undefined means no selected bindable; null means the selected bindable has no projected type. */
  readonly selectedBindableValueType: string | null | undefined;
  /** Exact cursor locus is an authored bindable name/attribute declaration or compiled attribute target. */
  readonly selectedBindableOwnsLocus?: boolean;
  /** Undefined means no selected member; null means the selected member has no projected type. */
  readonly selectedMemberTypeDisplay: string | null | undefined;
  readonly selectedExpressionOpen: boolean;
  /** Exact selected scope-slot type retained a partial projection whose origin remains open. */
  readonly selectedScopeSlotTypeOpen: boolean;
}

/** Translate only cursor-locus pressure that can be tied to the displayed semantic answer. */
export function classifySemanticTemplateCursorUncertainty(
  evidence: SemanticTemplateCursorUncertaintyEvidence,
): SemanticTemplateCursorUncertainty | null {
  const { missingInputs } = evidence;
  if (missingInputs.includes('router-navigation-target-open')) {
    return {
      category: 'dynamic-route-target',
      affectedDomain: 'route',
      affectedLocus: 'route-target',
    };
  }
  if (missingInputs.includes('router-navigation-target-ambiguous')) {
    return {
      category: 'route-configuration-ambiguous',
      affectedDomain: 'route',
      affectedLocus: 'route-target',
    };
  }
  if (missingInputs.some((input) =>
    input === 'router-navigation-target'
    || input === 'router-navigation-target-products'
    || input === 'router-navigation-target-source'
  )) {
    return {
      category: 'route-information-incomplete',
      affectedDomain: 'route',
      affectedLocus: 'route-target',
    };
  }
  if (evidence.selectedExpressionOpen) {
    return {
      category: 'type-information-incomplete',
      affectedDomain: 'binding-context',
      affectedLocus: 'selected-expression',
    };
  }
  if (
    evidence.selectedBindableOwnsLocus === true
    && evidence.selectedBindableValueType === null
  ) {
    return {
      category: 'type-information-incomplete',
      affectedDomain: 'bindable',
      affectedLocus: 'selected-bindable',
    };
  }
  if (
    evidence.selectedMemberTypeDisplay === null
    || (
      evidence.selectedMemberTypeDisplay !== undefined
      && evidence.selectedScopeSlotTypeOpen
      && missingInputs.includes('scope-slot:type-projection-open')
    )
  ) {
    return {
      category: 'type-information-incomplete',
      affectedDomain: 'member',
      affectedLocus: 'selected-member',
    };
  }
  if (
    evidence.selectedDefinition
    && missingInputs.some((input) => resourceAvailabilityMissingInputs.has(input))
  ) {
    return {
      category: 'resource-availability-incomplete',
      affectedDomain: 'resource',
      affectedLocus: 'selected-resource',
    };
  }
  return null;
}

function cursorSelectsBindableTypeLocus(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  cursorContext: TemplateCompletionCursorContext,
): boolean {
  const bindable = cursorContext.selectedBindable;
  const locus = cursorContext.query.locus;
  if (
    bindable == null
    || locus.kind !== InquiryLocusKind.SourceCursor
    || locus.cursor.offset == null
  ) {
    return false;
  }
  const declarationHandles = [
    bindable.reference.nameSourceAddressHandle,
    bindable.reference.attributeSourceAddressHandle,
  ];
  if (declarationHandles.some((handle) =>
    cursorTouchesExactSourceAddress(store, handle, locus.cursor)
  )) {
    return true;
  }

  const selectedAttribute = bindable.reference.attribute;
  const topLevelTarget = resource.compilation.attributeClassification.classifications.some((classification) => {
    if (!sameCursorBindableReference(classification.bindable, bindable)) {
      return false;
    }
    const syntax = resource.compilation.authoredAttributeSyntaxes.find((candidate) =>
      candidate.productHandle === classification.syntaxProductHandle
    ) ?? null;
    return syntax?.target === selectedAttribute
      && cursorTouchesExactSourceAddress(store, syntax.targetSourceAddressHandle, locus.cursor);
  });
  if (topLevelTarget) {
    return true;
  }

  return resource.compilation.bindingCommandLowering.multiBindingSegments.some((segment) => {
    if (!sameCursorBindableReference(segment.bindable, bindable)) {
      return false;
    }
    const syntax = resource.compilation.authoredAttributeSyntaxes.find((candidate) =>
      candidate.productHandle === segment.syntaxProductHandle
    ) ?? null;
    return syntax?.target === selectedAttribute
      && cursorTouchesExactSourceAddress(store, segment.targetSourceAddressHandle, locus.cursor);
  });
}

function sameCursorBindableReference(
  left: TemplateBindableReference | null,
  right: TemplateBindableReference,
): boolean {
  return left != null
    && left.reference.ownerDefinitionProductHandle === right.reference.ownerDefinitionProductHandle
    && left.reference.name === right.reference.name
    && left.reference.attribute === right.reference.attribute
    && left.reference.sourceAddressHandle === right.reference.sourceAddressHandle
    && left.reference.nameSourceAddressHandle === right.reference.nameSourceAddressHandle
    && left.reference.attributeSourceAddressHandle === right.reference.attributeSourceAddressHandle;
}

function cursorTouchesExactSourceAddress(
  store: KernelStore,
  addressHandle: AddressHandle | null,
  cursor: SourceTextCursor,
): boolean {
  const source = semanticExactSourceReference(describeAddress(store, addressHandle));
  return source?.path != null
    && cursor.offset != null
    && sameTypeSystemSourcePath(source.path, cursor.filePath)
    && semanticSourceReferenceContainsOffset(source, cursor.offset);
}

function cursorRouteTargetRow(
  store: KernelStore,
  cursorContext: TemplateCompletionCursorContext,
  includeHandles: boolean,
): SemanticTemplateCursorRouteTargetRow | null {
  const target = cursorContext.selectedRouteTarget;
  if (target == null) {
    return null;
  }
  return {
    targetKind: target.targetKind,
    matchedName: target.matchedName,
    routeConfigId: target.routeConfig.id,
    source: describeAddress(store, target.routeConfig.sourceAddressHandle),
    targetSource: describeAddress(store, target.targetSourceAddressHandle),
    ...(includeHandles ? {
      handles: {
        routeConfigProductHandle: target.routeConfig.productHandle,
        routeConfigIdentityHandle: target.routeConfig.identityHandle,
        configurableRouteProductHandle: target.configurableRouteProductHandle,
        endpointProductHandle: target.endpointProductHandle,
        recognizedRouteProductHandle: target.recognizedRouteProductHandle,
        sourceAddressHandle: target.routeConfig.sourceAddressHandle,
        targetSourceAddressHandle: target.targetSourceAddressHandle,
      },
    } : {}),
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
  const attributeValueSourceAddressHandle = attribute?.valueAddressHandle ?? null;
  return {
    nodeKind: node?.nodeKind ?? null,
    tagName: node instanceof HtmlElement ? node.tagName : null,
    namespace: node instanceof HtmlElement ? node.namespace : null,
    attributeName: attribute?.rawName ?? null,
    attributeValue: attribute?.rawValue ?? null,
    source: describeAddress(store, nodeSourceAddressHandle),
    tagNameSource: describeAddress(store, tagNameSourceAddressHandle),
    closingTagNameSource: describeAddress(store, closingTagNameSourceAddressHandle),
    attributeSource: describeAddress(store, attributeSourceAddressHandle),
    attributeValueSource: describeAddress(store, attributeValueSourceAddressHandle),
    ...(includeHandles ? {
      handles: {
        nodeProductHandle: cursorContext.htmlNodeProductHandle,
        attributeProductHandle: cursorContext.htmlAttributeProductHandle,
        nodeSourceAddressHandle,
        tagNameSourceAddressHandle,
        closingTagNameSourceAddressHandle,
        attributeSourceAddressHandle,
        attributeValueSourceAddressHandle,
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
  resource: TemplateResourceRuntimeAnalysisEmission,
  cursorContext: TemplateCompletionCursorContext,
  activeSource: SemanticSourceReference | null,
  includeHandles: boolean,
): SemanticTemplateCursorDefinitionRow | null {
  const definition = productHandle == null
    ? null
    : store.productDetails.read(ResourceProductDetails.Definition, productHandle);
  if (definition == null) {
    return null;
  }
  return definitionRow(
    store,
    definition,
    matchedName,
    cursorDefinitionAuthoredName(store, definition, resource, cursorContext, activeSource, matchedName),
    includeHandles,
  );
}

function definitionRow(
  store: KernelStore,
  definition: FullResourceDefinition,
  selectedName: string | null,
  authoredSelectedName: string | null,
  includeHandles: boolean,
): SemanticTemplateCursorDefinitionRow {
  const matched = matchedResourceName(definition, selectedName);
  return {
    resourceKind: taxonomyResourceKindForDefinition(definition),
    name: 'name' in definition ? definition.name : null,
    matchedName: matched.name,
    authoredMatchedName: authoredSelectedName,
    runtimeMatchedName: selectedName,
    targetName: 'target' in definition ? definition.target.localName : null,
    source: describeAddress(store, definition.sourceAddressHandle),
    nameSource: describeAddress(store, resourceDefinitionNameSourceAddressHandle(definition)),
    matchedNameSource: describeAddress(store, matched.sourceAddressHandle),
    targetSource: describeAddress(store, definition.target.addressHandle),
    ...(includeHandles ? {
      handles: {
        definitionProductHandle: definition.productHandle,
        identityHandle: definition.identityHandle,
        sourceAddressHandle: definition.sourceAddressHandle,
        nameSourceAddressHandle: resourceDefinitionNameSourceAddressHandle(definition),
        matchedNameSourceAddressHandle: matched.sourceAddressHandle,
        targetAddressHandle: definition.target.addressHandle,
      },
    } : {}),
  };
}

/** Recover the selected source spelling without confusing it with the browser/compiler lookup spelling. */
function cursorDefinitionAuthoredName(
  store: KernelStore,
  definition: FullResourceDefinition,
  resource: TemplateResourceRuntimeAnalysisEmission,
  cursorContext: TemplateCompletionCursorContext,
  activeSource: SemanticSourceReference | null,
  runtimeMatchedName: string | null,
): string | null {
  if (runtimeMatchedName == null) {
    return null;
  }
  const node = readHtmlNode(store, cursorContext.htmlNodeProductHandle);
  if (
    node instanceof HtmlElement
    && semanticTemplateCursorSourcesMatchExactly(
      describeAddress(store, node.tagNameAddressHandle),
      activeSource,
    )
    && semanticTemplateCursorSourceLength(activeSource) === node.tagName.length
    && runtimeElementResourceName(node.tagName, node.namespace) === runtimeMatchedName
  ) {
    return node.tagName;
  }
  if (
    node instanceof HtmlElement
    && semanticTemplateCursorSourcesMatchExactly(
      describeAddress(store, node.closingTagNameAddressHandle),
      activeSource,
    )
  ) {
    const closing = authoredTemplateCarrierSlice(store, resource, activeSource);
    return closing != null
      && runtimeElementResourceName(closing.text, node.namespace) === runtimeMatchedName
      ? closing.text
      : null;
  }
  const attribute = readHtmlAttribute(store, cursorContext.htmlAttributeProductHandle);
  if (attribute != null) {
    const name = authoredCarrierSlice(
      attribute.rawName,
      describeAddress(store, attribute.nameAddressHandle),
      activeSource,
    );
    if (
      name != null
      && cursorDefinitionAuthoredAttributeNameMatches(
        definition,
        name.text,
        name.relativeStart,
        runtimeMatchedName,
        attribute.rawName,
        node instanceof HtmlElement ? node.namespace : undefined,
        resource.compilation.authoredAttributeSyntaxes.some((syntax) =>
          syntax.patternLiterals.some((literal) =>
            semanticTemplateCursorSourcesMatchExactly(
              describeAddress(store, literal.sourceAddressHandle),
              activeSource,
            )
          )
        ),
        resource.compilation.authoredAttributeSyntaxes.some((syntax) =>
          syntax.command === runtimeMatchedName
          && (
            semanticTemplateCursorSourcesMatchExactly(
              describeAddress(store, syntax.commandSourceAddressHandle),
              activeSource,
            )
            || syntax.patternLiterals.some((literal) =>
              semanticTemplateCursorSourcesMatchExactly(
                describeAddress(store, literal.sourceAddressHandle),
                activeSource,
              )
            )
          )
        ),
      )
    ) {
      return name.text;
    }
    const value = authoredCarrierSlice(
      attribute.rawValue,
      describeAddress(store, attribute.valueAddressHandle),
      activeSource,
    );
    if (
      value != null
      && taxonomyResourceKindForDefinition(definition) === ResourceDefinitionKind.BindingCommand
      && resource.compilation.bindingCommandLowering.attributeSyntaxes.some((syntax) =>
        syntax.command === runtimeMatchedName
        && semanticTemplateCursorSourcesMatchExactly(
          describeAddress(store, syntax.commandSourceAddressHandle),
          activeSource,
        )
      )
    ) {
      return value.text;
    }
    if (
      value != null
      && semanticTemplateCursorSourcesMatchExactly(
        describeAddress(store, attribute.valueAddressHandle),
        activeSource,
      )
      && definition.type === ResourceDefinitionKind.CustomElement
      && runtimeAttributeName(attribute.rawName, node instanceof HtmlElement ? node.namespace : undefined) === 'as-element'
      && runtimeAsElementResourceName(value.text) === runtimeMatchedName
    ) {
      return value.text;
    }
  }
  // Only expression-resource names own an exact parser token without a kernel address.
  const expressionOwned = cursorContext.activeExpressionSpan != null
    && (
      (
        definition.type === ResourceDefinitionKind.ValueConverter
        && cursorContext.query.siteKind === TemplateCompletionSiteKind.ExpressionValueConverter
      )
      || (
        definition.type === ResourceDefinitionKind.BindingBehavior
        && cursorContext.query.siteKind === TemplateCompletionSiteKind.ExpressionBindingBehavior
      )
    );
  if (!expressionOwned) {
    return null;
  }
  const expression = authoredTemplateCarrierSlice(store, resource, activeSource);
  return expression?.text === runtimeMatchedName ? expression.text : null;
}

function cursorDefinitionAuthoredAttributeNameMatches(
  definition: FullResourceDefinition,
  authoredPart: string,
  relativeStart: number,
  runtimeMatchedName: string,
  authoredAttributeName: string,
  namespace: HtmlElement['namespace'] | undefined,
  attributePatternLiteralOwned: boolean,
  bindingCommandSyntaxOwned: boolean,
): boolean {
  const runtimeAttribute = runtimeAttributeName(authoredAttributeName, namespace);
  const runtimePart = relativeStart < 0
    ? null
    : runtimeAttribute.slice(relativeStart, relativeStart + authoredPart.length);
  switch (taxonomyResourceKindForDefinition(definition)) {
    case ResourceDefinitionKind.CustomAttribute:
    case ResourceDefinitionKind.TemplateController:
      return runtimePart === runtimeMatchedName;
    case ResourceDefinitionKind.BindingCommand:
      return runtimePart === runtimeMatchedName || bindingCommandSyntaxOwned;
    case ResourceDefinitionKind.AttributePattern:
      return attributePatternLiteralOwned;
    case ResourceDefinitionKind.CustomElement:
    case ResourceDefinitionKind.ValueConverter:
    case ResourceDefinitionKind.BindingBehavior:
      return false;
  }
}

function authoredCarrierSlice(
  carrierText: string,
  carrierSource: SemanticSourceReference | null,
  activeSource: SemanticSourceReference | null,
): { readonly text: string; readonly relativeStart: number } | null {
  const carrier = semanticExactSourceReference(carrierSource);
  const active = semanticExactSourceReference(activeSource);
  if (
    carrier?.path == null
    || active?.path == null
    || !sameTypeSystemSourcePath(carrier.path, active.path)
    || carrier.start == null
    || carrier.end == null
    || carrier.end - carrier.start !== carrierText.length
    || active.start == null
    || active.end == null
    || active.start < carrier.start
    || active.end > carrier.end
  ) {
    return null;
  }
  const relativeStart = active.start - carrier.start;
  const relativeEnd = active.end - carrier.start;
  return relativeEnd <= carrierText.length
    ? { text: carrierText.slice(relativeStart, relativeEnd), relativeStart }
    : null;
}

function semanticTemplateCursorSourceLength(source: SemanticSourceReference | null): number | null {
  const exact = semanticExactSourceReference(source);
  return exact?.start == null || exact.end == null ? null : exact.end - exact.start;
}

function authoredTemplateCarrierSlice(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  activeSource: SemanticSourceReference | null,
): { readonly text: string; readonly relativeStart: number } | null {
  const templateSource = resource.compilation.unit.templateSource;
  const markup = templateSource.markup;
  const carrier = semanticExactSourceReference(describeAddress(store, templateSource.sourceAddressHandle));
  const active = semanticExactSourceReference(activeSource);
  if (
    markup == null
    || carrier?.path == null
    || active?.path == null
    || !sameTypeSystemSourcePath(carrier.path, active.path)
    || carrier.start == null
    || active.start == null
    || active.end == null
  ) {
    return null;
  }
  const text = exactTemplateSourceTextForSourceSpan(
    markup,
    templateSource.sourceMap,
    carrier.start,
    active.start,
    active.end,
  );
  return text == null ? null : { text, relativeStart: 0 };
}

function matchedResourceName(
  definition: FullResourceDefinition,
  selectedName: string | null,
): { readonly name: string | null; readonly sourceAddressHandle: AddressHandle | null } {
  if (selectedName == null || !('name' in definition)) {
    return { name: null, sourceAddressHandle: null };
  }
  // `selectedName` is already the runtime lookup spelling selected by the
  // compiler/expression lane. Resource keys are exact: HTML normalization
  // happens before custom-element/attribute lookup, while VC/BB names remain
  // expression-case-sensitive.
  const matches = (candidate: string): boolean => candidate === selectedName;
  if (matches(definition.name)) {
    return { name: definition.name, sourceAddressHandle: resourceDefinitionNameSourceAddressHandle(definition) };
  }
  const alias = definition.aliases.find((candidate) => matches(candidate.name)) ?? null;
  if (alias != null) {
    return { name: alias.name, sourceAddressHandle: alias.addressHandle };
  }
  return { name: selectedName, sourceAddressHandle: null };
}

function cursorBindableRow(
  store: KernelStore,
  projector: CheckerTypeProjector,
  bindable: TemplateBindableReference | null,
  selectedBindableValueType: CheckerTypeReference | null,
  usageMode: SemanticTemplateCursorBindableUsageModeFields,
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
  const definitionSurface = projectBindableDefinitionSurface(
    store,
    projector,
    bindable.definition,
    ownerDefinition?.target ?? null,
  );
  const contextualSurface = definitionSurface.valueType == null
    && selectedBindableValueType != null
    && selectedBindableValueType.origin !== CheckerTypeProjectionOrigin.Open
      ? readCheckerReferenceSurface(store, selectedBindableValueType)
      : null;
  return {
    name: bindable.reference.name,
    attribute: bindable.reference.attribute,
    callback: bindable.definition.callback,
    mode: bindable.definition.mode,
    ...definitionSurface,
    ...(contextualSurface?.display == null ? {} : {
      valueType: contextualSurface.display,
      valueTypeShapeKind: contextualSurface.shapeKind,
      effectiveValueTypeShapeKind: contextualSurface.effectiveShapeKind,
      valueTypeHasCallSignature: contextualSurface.hasCallSignature,
      valueTypeHasMembers: contextualSurface.hasMembers,
      valueTypeIsWeak: contextualSurface.isWeak,
    }),
    ...projectBindableDefinitionSources(store, bindable.definition),
    ...usageMode,
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

function cursorSelectedExpressionRow(
  store: KernelStore,
  cursorContext: TemplateCompletionCursorContext,
  activeSource: SemanticTemplateCursorInfoResult['activeSource'],
  includeHandles: boolean,
): SemanticTemplateCursorExpressionRow | null {
  const selection = cursorContext.selectedExpression;
  const source = semanticExactSourceReference(activeSource);
  const span = cursorContext.activeExpressionSpan;
  if (selection == null || source == null || span == null) {
    return null;
  }
  const typeReference = selection.typeReference;
  const typeShape = typeReference?.productHandle == null
    ? null
    : store.productDetails.read(TypeSystemProductDetails.TypeShape, typeReference.productHandle);
  const typeSourceAddressHandle = selection.typeSourceAddressHandle
    ?? typeReference?.sourceAddressHandle
    ?? typeShape?.sourceAddressHandle
    ?? null;
  const typeDeclarationSourceAddressHandle = typeShape?.declarationSourceAddressHandle ?? null;
  return {
    expressionKind: selection.expressionKind,
    authoredScopeAncestor: selection.authoredScopeAncestor,
    scopeLookupAncestor: selection.scopeLookupAncestor,
    typeDisplay: typeShape?.display ?? typeReference?.display ?? null,
    typeShapeKind: typeShape?.shapeKind ?? typeReference?.shapeKind ?? null,
    typeOrigin: typeShape?.origin ?? typeReference?.origin ?? null,
    openKind: selection.openKind,
    openReason: selection.openReason,
    source,
    typeSource: describeAddress(store, typeSourceAddressHandle),
    typeDeclarationSource: describeAddress(store, typeDeclarationSourceAddressHandle),
    ...(includeHandles ? {
      handles: {
        typeProductHandle: typeShape?.productHandle ?? typeReference?.productHandle ?? null,
        typeIdentityHandle: typeShape?.identityHandle ?? typeReference?.identityHandle ?? null,
        typeSourceAddressHandle,
        typeDeclarationSourceAddressHandle,
      },
    } : {}),
  };
}

function cursorSelectedMemberRow(
  store: KernelStore,
  cursorContext: TemplateCompletionCursorContext,
  includeHandles: boolean,
  includePresentationMetadata: boolean,
): SemanticTemplateCursorMemberRow | null {
  if (cursorContext.selectedScopeSlot != null) {
    return cursorScopeSlotMemberRow(
      store,
      cursorContext.selectedScopeSlot,
      includeHandles,
      includePresentationMetadata,
    );
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
      visibilityKind: null,
      isDeprecated: null,
      documentation: null,
      deprecationReason: null,
      scopeRole: null,
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
    ...cursorCheckerMemberMetadata(includePresentationMetadata ? member : null),
    scopeRole: null,
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
  includePresentationMetadata: boolean,
): SemanticTemplateCursorMemberRow {
  const { scope, slot } = selection;
  const member = slot.targetTypeMemberHandle == null
    ? null
    : store.hotDetails.read(TypeSystemHotDetails.TypeMember, slot.targetTypeMemberHandle);
  const sourceAddressHandle = selection.declarationSourceAddressHandle
    ?? slot.sourceAddressHandle
    ?? (member == null ? null : checkerTypeMemberSourceAddressHandle(store, member));
  const declarationSourceAddressHandle = selection.declarationSourceAddressHandle
    ?? (member == null
      ? null
      : checkerTypeMemberSourceAddressHandle(store, member));
  const ownerProductHandle = member?.ownerType.productHandle
    ?? selection.ownerProductHandle
    ?? scope.productHandle;
  return {
    name: slot.name,
    memberKind: member?.memberKind ?? CheckerTypeMemberKind.Property,
    typeDisplay: slot.targetType?.display ?? member?.valueType?.display ?? null,
    isOptional: member?.isOptional ?? false,
    isReadonly: slot.assignmentAccessKind === BindingContextSlotAssignmentAccessKind.FrameworkManagedReadOnly
      || (member?.isReadonly ?? false),
    ...cursorCheckerMemberMetadata(
      includePresentationMetadata && selection.scopeRole == null && member?.name === slot.name
        ? member
        : null,
    ),
    scopeRole: selection.scopeRole,
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

function cursorCheckerMemberMetadata(
  member: CheckerTypeMember | null,
): Pick<
  SemanticTemplateCursorMemberRow,
  'visibilityKind' | 'isDeprecated' | 'documentation' | 'deprecationReason'
> {
  const carrier = member?.carrier ?? null;
  if (member == null || carrier == null) {
    return {
      visibilityKind: null,
      isDeprecated: null,
      documentation: null,
      deprecationReason: null,
    };
  }
  const isDeprecated = checkerTypeMemberIsDeprecated(member);
  return {
    visibilityKind: checkerTypeMemberVisibilityKind(member),
    isDeprecated,
    documentation: cursorCheckerMemberTextRow(checkerSymbolMemberDocumentation(
      carrier.checker,
      carrier.symbol,
      carrier.declarations,
    )),
    deprecationReason: isDeprecated
      ? cursorCheckerMemberTextRow(checkerDeclarationsDeprecationReason(carrier.declarations))
      : null,
  };
}

function cursorCheckerMemberTextRow(
  text: CheckerTypeMemberTextDraft | null,
): SemanticTemplateCursorMemberTextRow | null {
  if (text == null) {
    return null;
  }
  const sources = text.sourceNodes
    .slice(0, CHECKER_MEMBER_TEXT_MAX_SOURCES)
    .map(sourceReferenceForUnqualifiedTypeScriptNode);
  return {
    format: 'plaintext',
    text: text.text,
    isTruncated: text.isTruncated,
    sourceCount: text.sourceCount,
    sources,
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
    namespace: null,
    attributeName: null,
    attributeValue: null,
    source: null,
    tagNameSource: null,
    closingTagNameSource: null,
    attributeSource: null,
    attributeValueSource: null,
  };
}

function selectTemplateResourceForCursor(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  filePath: string,
  offset: number,
): TemplateCompletionResourceSelection | null {
  return templateResourceCursorSelections(store, emission, filePath, offset)[0] ?? null;
}

/** Return every equally specific template/compiler-scope candidate at one authored cursor. */
export function templateResourceCursorSelections(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  filePath: string,
  offset: number,
): readonly TemplateResourceCursorSelection[] {
  const candidates = [
    ...emission.templates.resources.map((resource) => ({ resource, lane: 'app-runtime' as const })),
    ...emission.templates.authoringResources.map((resource) => ({ resource, lane: 'authoring' as const })),
  ];
  let bestWidth = Number.POSITIVE_INFINITY;
  const selected: TemplateResourceCursorSelection[] = [];
  for (const candidate of candidates) {
    let candidateSpan: SourceSpanAddress | null = null;
    for (const span of cursorCandidateSpans(store, candidate.resource)) {
      if (!sourceSpanContainsOffset(span, offset) || !sourceSpanFileMatches(store, span, filePath)) {
        continue;
      }
      if (candidateSpan == null || span.end - span.start < candidateSpan.end - candidateSpan.start) {
        candidateSpan = span;
      }
    }
    if (candidateSpan == null) {
      continue;
    }
    const width = candidateSpan.end - candidateSpan.start;
    if (width < bestWidth) {
      bestWidth = width;
      selected.length = 0;
    }
    if (width === bestWidth) {
      selected.push({
        ...candidate,
        sourceAddressHandle: candidateSpan.handle,
      });
    }
  }
  return selected;
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
  return file != null && isSourceFileAddress(file) && sameTypeSystemSourcePath(file.path, filePath);
}

function sourceSpanForHandle(
  store: KernelStore,
  handle: SourceSpanAddress['handle'] | null,
): SourceSpanAddress | null {
  const address = handle == null ? null : store.readAddress(handle);
  return address?.kind === 'source-span-address' ? address : null;
}

function templateSourceSpan(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
): SourceSpanAddress | null {
  const handle = resource.compilation.unit.templateSource.sourceAddressHandle;
  const address = handle == null ? null : store.readAddress(handle);
  if (address?.kind === 'source-span-address') {
    return address;
  }
  if (address?.kind === 'template-address' && address.authoredSourceHandle != null) {
    const authored = store.readAddress(address.authoredSourceHandle);
    return authored?.kind === 'source-span-address' ? authored : null;
  }
  return null;
}

function templateCompletionCandidateRow(
  candidate: TemplateCompletionCandidate,
  replacementSource: SemanticTemplateCompletionCandidateRow['edit']['source'],
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
    memberIsDeprecated: memberFacts?.isDeprecated ?? null,
    aureliaHookKind: memberFacts?.aureliaHookKind ?? null,
    edit: {
      source: replacementSource,
      newText: candidate.insertionText,
    },
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
    candidate.memberIsDeprecated === true ? 'deprecated' : null,
    candidate.aureliaHookKind == null ? null : `aureliaHook=${candidate.aureliaHookKind}`,
  ].filter((part): part is string => part != null);
  return parts.length === 0 ? '' : `; ${parts.join(', ')}`;
}
