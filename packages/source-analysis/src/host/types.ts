import type {
  SourceAnalysisAnswer,
  SourceAnalysisFocusKind,
  SourceAnalysisQuestionRoute,
  SourceAnalysisReadMode,
} from '../query-model.js';
import type { SourceAnalysisAuditValue } from '../audit.js';
import type { SourceAnalysisAnswerDocument } from '../answer-document.js';
import type { SourceAnalysisAnswerRef } from '../answer-card.js';
import type { SourceAnalysisConsumerKind } from '../inquiry-policy.js';
import type { SourceAnalysisRenderedPlainText } from '../answer-renderer.js';
import type {
  SourceAnalysisCapabilityDiscoveryValue,
  SourceAnalysisCapabilityPlanValue,
  SourceAnalysisCapabilityRepairValue,
} from '../ingress.js';
import type {
  SourceAnalysisInquiryAskValue,
  SourceAnalysisInquiryDiscoveryValue,
  SourceAnalysisInquiryPlanValue,
} from '../inquiry-ingress.js';
import type { SourceAnalysisInquiryFamilyId } from '../inquiry-catalog.js';
import type { DepsOutput } from '../deps/schema.js';
import type { ExportsOutput } from '../exports/schema.js';
import type { SourceAnalysisNavigationValue } from '../navigation.js';
import type { SourceAnalysisRouteWitnessValue } from '../route-witness.js';
import type { TypeRefsOutput } from '../typerefs/schema.js';

export const SOURCE_ANALYSIS_HOST_SCHEMA_VERSION = 'v1alpha1' as const;
export const SOURCE_ANALYSIS_KINDS = ['deps', 'typerefs', 'exports'] as const;
export const SOURCE_ANALYSIS_HOST_RENDER_STYLES = [
  'answer',
  'plain-text',
  'json-document',
] as const;

export type SourceAnalysisKind = typeof SOURCE_ANALYSIS_KINDS[number];
export type SourceAnalysisHostRenderStyle =
  typeof SOURCE_ANALYSIS_HOST_RENDER_STYLES[number];

export interface SourceAnalysisOutputByKind {
  deps: DepsOutput;
  typerefs: TypeRefsOutput;
  exports: ExportsOutput;
}

export interface SourceAnalysisSummaryByKind {
  deps: DepsOutput['summary'];
  typerefs: TypeRefsOutput['summary'];
  exports: ExportsOutput['summary'];
}

export interface SourceAnalysisHostError {
  readonly code: string;
  readonly message: string;
  readonly retryable?: boolean;
}

export interface SourceAnalysisHostCacheMeta {
  readonly hit: boolean;
  readonly tier: 'warm' | 'cold';
}

export interface SourceAnalysisHostInvalidationMeta {
  readonly kind: 'none' | 'files' | 'project';
  readonly count: number;
  readonly dirtyKinds: readonly SourceAnalysisKind[];
  readonly dirtyFiles: readonly string[];
}

export interface SourceAnalysisHostEnvelopeMeta {
  readonly sessionId?: string;
  readonly durationMs: number;
  readonly cache: SourceAnalysisHostCacheMeta;
  readonly invalidation: SourceAnalysisHostInvalidationMeta;
  readonly refreshedKinds: readonly SourceAnalysisKind[];
}

export type SourceAnalysisHostCommandStatus = 'ok' | 'error';

export interface SourceAnalysisHostEnvelope<TResult> {
  readonly schemaVersion: typeof SOURCE_ANALYSIS_HOST_SCHEMA_VERSION;
  readonly command: SourceAnalysisHostCommandName;
  readonly status: SourceAnalysisHostCommandStatus;
  readonly result: TResult;
  readonly meta: SourceAnalysisHostEnvelopeMeta;
  readonly errors: readonly SourceAnalysisHostError[];
}

export interface SessionOpenArgs {
  readonly sessionId?: string;
  readonly repoPath: string;
  readonly target?: string;
  readonly excludedRepoRelativePrefixes?: readonly string[] | null;
  readonly warmPrograms?: boolean;
}

export interface SessionOpenResult {
  readonly sessionId: string;
  readonly repoPath: string;
  readonly target: string;
  readonly warmPrograms: boolean;
  readonly dirtyKinds: readonly SourceAnalysisKind[];
}

export interface SessionCloseArgs {
  readonly sessionId: string;
}

export interface SessionCloseResult {
  readonly sessionId: string;
  readonly closed: boolean;
}

export interface SessionStatusArgs {
  readonly sessionId?: string;
}

export interface SessionStatusEntry {
  readonly sessionId: string;
  readonly repoPath: string;
  readonly target: string;
  readonly warmPrograms: boolean;
  readonly dirtyKinds: readonly SourceAnalysisKind[];
  readonly cachedKinds: readonly SourceAnalysisKind[];
  readonly dirtyFiles: readonly string[];
  readonly lastRefreshAtByKind: Partial<Record<SourceAnalysisKind, string>>;
}

export interface SessionStatusResult {
  readonly sessions: readonly SessionStatusEntry[];
}

export interface SessionInvalidateArgs {
  readonly sessionId: string;
  readonly files?: readonly string[];
  readonly scope?: 'files' | 'project';
}

export interface SessionInvalidateResult {
  readonly sessionId: string;
  readonly scope: 'files' | 'project';
  readonly invalidatedFiles: readonly string[];
  readonly dirtyKinds: readonly SourceAnalysisKind[];
}

export interface SessionRefreshArgs {
  readonly sessionId: string;
  readonly kinds?: readonly SourceAnalysisKind[];
  readonly force?: boolean;
}

export interface SessionRefreshResult {
  readonly sessionId: string;
  readonly refreshedKinds: readonly SourceAnalysisKind[];
  readonly dirtyKinds: readonly SourceAnalysisKind[];
  readonly warningsByKind: Partial<Record<SourceAnalysisKind, readonly string[]>>;
  readonly lastRefreshAtByKind: Partial<Record<SourceAnalysisKind, string>>;
}

export interface QueryArgs {
  readonly sessionId: string;
  readonly refreshIfNeeded?: boolean;
}

export interface RenderArgs {
  readonly readMode?: SourceAnalysisReadMode;
  readonly consumer?: SourceAnalysisConsumerKind;
  readonly renderStyle?: SourceAnalysisHostRenderStyle;
}

export interface RenderQueryArgs extends QueryArgs, RenderArgs {}

export type SourceAnalysisHostRenderedView =
  | {
    readonly style: 'plain-text';
    readonly rendered: SourceAnalysisRenderedPlainText;
  }
  | {
    readonly style: 'json-document';
    readonly document: SourceAnalysisAnswerDocument<SourceAnalysisAnswerRef>;
  };

export interface QueryAuditPackageArgs extends RenderQueryArgs {
  readonly packageName: string;
}

export interface QueryRouteWitnessArgs extends RenderQueryArgs {
  readonly focusKind: 'file' | 'type';
  readonly focusValue: string;
}

export interface QueryNavigateArgs extends RenderQueryArgs {
  readonly focusKind: 'package' | 'file' | 'type' | 'export';
  readonly focusValue: string;
  readonly questionRoute?: SourceAnalysisQuestionRoute;
}

export interface DescribeCapabilitiesArgs extends RenderArgs {
  readonly question?: string;
  readonly focusKind?: SourceAnalysisFocusKind;
  readonly includeExamples?: boolean;
  readonly topK?: number;
}

export interface DescribeInquiriesArgs extends RenderArgs {
  readonly question?: string;
  readonly focusKind?: SourceAnalysisFocusKind;
  readonly familyId?: SourceAnalysisInquiryFamilyId;
  readonly includeExamples?: boolean;
  readonly topK?: number;
}

export interface PlanQuestionArgs extends RenderArgs {
  readonly question: string;
  readonly sessionId?: string;
  readonly focusKind?: SourceAnalysisFocusKind;
  readonly focusValue?: string;
}

export interface PlanInquiryArgs extends RenderArgs {
  readonly question: string;
  readonly sessionId?: string;
  readonly repoPath?: string;
  readonly target?: string;
  readonly focusKind?: SourceAnalysisFocusKind;
  readonly focusValue?: string;
  readonly familyId?: SourceAnalysisInquiryFamilyId;
}

export interface AskQuestionArgs extends RenderArgs {
  readonly question: string;
  readonly sessionId?: string;
  readonly repoPath?: string;
  readonly target?: string;
  readonly focusKind?: SourceAnalysisFocusKind;
  readonly focusValue?: string;
  readonly familyId?: SourceAnalysisInquiryFamilyId;
}

export interface RepairCommandArgs extends RenderArgs {
  readonly command?: string;
  readonly args?: Record<string, unknown>;
  readonly question?: string;
}

export interface QuerySummaryResult<TKind extends SourceAnalysisKind> {
  readonly kind: TKind;
  readonly generatedAt: string;
  readonly summary: SourceAnalysisSummaryByKind[TKind];
  readonly warnings: readonly string[];
}

export interface QuerySnapshotResult<TKind extends SourceAnalysisKind> {
  readonly kind: TKind;
  readonly snapshot: SourceAnalysisOutputByKind[TKind];
  readonly warnings: readonly string[];
}

export interface QueryAuditPackageResult {
  readonly answer: SourceAnalysisAnswer<SourceAnalysisAuditValue>;
  readonly rendered?: SourceAnalysisHostRenderedView;
  readonly warnings: readonly string[];
}

export interface QueryRouteWitnessResult {
  readonly answer: SourceAnalysisAnswer<SourceAnalysisRouteWitnessValue>;
  readonly rendered?: SourceAnalysisHostRenderedView;
  readonly warnings: readonly string[];
}

export interface QueryNavigateResult {
  readonly answer: SourceAnalysisAnswer<SourceAnalysisNavigationValue>;
  readonly rendered?: SourceAnalysisHostRenderedView;
  readonly warnings: readonly string[];
}

export interface DescribeCapabilitiesResult {
  readonly answer: SourceAnalysisAnswer<SourceAnalysisCapabilityDiscoveryValue>;
  readonly rendered?: SourceAnalysisHostRenderedView;
}

export interface DescribeInquiriesResult {
  readonly answer: SourceAnalysisAnswer<SourceAnalysisInquiryDiscoveryValue>;
  readonly rendered?: SourceAnalysisHostRenderedView;
}

export interface PlanQuestionResult {
  readonly answer: SourceAnalysisAnswer<SourceAnalysisCapabilityPlanValue>;
  readonly rendered?: SourceAnalysisHostRenderedView;
}

export interface PlanInquiryResult {
  readonly answer: SourceAnalysisAnswer<SourceAnalysisInquiryPlanValue>;
  readonly rendered?: SourceAnalysisHostRenderedView;
}

export interface RepairCommandResult {
  readonly answer: SourceAnalysisAnswer<SourceAnalysisCapabilityRepairValue>;
  readonly rendered?: SourceAnalysisHostRenderedView;
}

export interface AskQuestionExecutionStep {
  readonly command: string;
  readonly args: Record<string, unknown>;
  readonly status: 'executed' | 'skipped' | 'failed';
  readonly detail?: string;
}

export interface AskQuestionExecution {
  readonly usedSessionId?: string;
  readonly ephemeralSession: boolean;
  readonly steps: readonly AskQuestionExecutionStep[];
  readonly primaryEnvelope?: SourceAnalysisHostEnvelope<unknown>;
}

export interface AskQuestionResult {
  readonly answer: SourceAnalysisAnswer<SourceAnalysisInquiryAskValue>;
  readonly rendered?: SourceAnalysisHostRenderedView;
  readonly execution?: AskQuestionExecution;
}

export interface MaterializeSnapshotsArgs {
  readonly sessionId: string;
  readonly kinds?: readonly SourceAnalysisKind[];
  readonly outDir?: string;
  readonly refreshIfNeeded?: boolean;
}

export interface MaterializeSnapshotsResult {
  readonly sessionId: string;
  readonly outDir: string;
  readonly files: Partial<Record<SourceAnalysisKind, string>>;
}

export interface SourceAnalysisHostCommandArgsMap {
  'describe.inquiries': DescribeInquiriesArgs;
  'describe.capabilities': DescribeCapabilitiesArgs;
  'plan.inquiry': PlanInquiryArgs;
  'plan.question': PlanQuestionArgs;
  'ask.question': AskQuestionArgs;
  'repair.command': RepairCommandArgs;
  'session.open': SessionOpenArgs;
  'session.close': SessionCloseArgs;
  'session.status': SessionStatusArgs;
  'session.invalidate': SessionInvalidateArgs;
  'session.refresh': SessionRefreshArgs;
  'query.deps.summary': QueryArgs;
  'query.deps.snapshot': QueryArgs;
  'query.typerefs.summary': QueryArgs;
  'query.typerefs.snapshot': QueryArgs;
  'query.exports.summary': QueryArgs;
  'query.exports.snapshot': QueryArgs;
  'query.audit.package': QueryAuditPackageArgs;
  'query.route.witness': QueryRouteWitnessArgs;
  'query.navigate': QueryNavigateArgs;
  'materializeSnapshots': MaterializeSnapshotsArgs;
}

export interface SourceAnalysisHostCommandResultMap {
  'describe.inquiries': DescribeInquiriesResult;
  'describe.capabilities': DescribeCapabilitiesResult;
  'plan.inquiry': PlanInquiryResult;
  'plan.question': PlanQuestionResult;
  'ask.question': AskQuestionResult;
  'repair.command': RepairCommandResult;
  'session.open': SessionOpenResult;
  'session.close': SessionCloseResult;
  'session.status': SessionStatusResult;
  'session.invalidate': SessionInvalidateResult;
  'session.refresh': SessionRefreshResult;
  'query.deps.summary': QuerySummaryResult<'deps'>;
  'query.deps.snapshot': QuerySnapshotResult<'deps'>;
  'query.typerefs.summary': QuerySummaryResult<'typerefs'>;
  'query.typerefs.snapshot': QuerySnapshotResult<'typerefs'>;
  'query.exports.summary': QuerySummaryResult<'exports'>;
  'query.exports.snapshot': QuerySnapshotResult<'exports'>;
  'query.audit.package': QueryAuditPackageResult;
  'query.route.witness': QueryRouteWitnessResult;
  'query.navigate': QueryNavigateResult;
  'materializeSnapshots': MaterializeSnapshotsResult;
}

export type SourceAnalysisHostCommandName = keyof SourceAnalysisHostCommandArgsMap;

export interface SourceAnalysisHostCommandInvocation<
  TCommand extends SourceAnalysisHostCommandName = SourceAnalysisHostCommandName,
> {
  readonly command: TCommand;
  readonly args: SourceAnalysisHostCommandArgsMap[TCommand];
}

export type SourceAnalysisHostCommandResult<
  TCommand extends SourceAnalysisHostCommandName,
> = SourceAnalysisHostCommandResultMap[TCommand];
