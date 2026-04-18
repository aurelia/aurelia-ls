import type {
  InquiryAnswer,
  QuestionRoute,
  ReadMode,
} from '../inquiry-model.js';
import type { AuditValue } from '../audit.js';
import type { AnswerDocument } from '../answer-document.js';
import type { AnswerRef } from '../answer-ref.js';
import type { ConsumerKind } from '../inquiry-policy.js';
import type { RenderedPlainText } from '../answer-renderer.js';
import type {
  AuthorityOutcome,
  SpendThreshold,
} from '../authority/contracts.js';
import type { DepsOutput } from '../deps/schema.js';
import type { ExportsOutput, PackageExportRecord, PackageExportsSummary } from '../exports/schema.js';
import type { FocusedFileQueryInspection } from '../focused-file-query.js';
import type { NavigationValue } from '../navigation.js';
import type { RouteWitnessValue } from '../route-witness.js';
import type { StructuralDeclarationLookup } from '../structural-declaration-surface.js';
import type { TypeDecl, TypeRefsOutput } from '../typerefs/schema.js';
import type { SnapshotKind } from '../snapshots.js';
import type { AnalysisProfile } from '../analysis-profile.js';
import type { ProfileSnapshotSupport } from '../profile-support.js';
import type { AnalyzabilityPosture } from '../analyzability-posture.js';

export const HOST_SCHEMA_VERSION = 'v1alpha1' as const;
export const HOST_RENDER_STYLES = [
  'answer',
  'plain-text',
  'json-document',
] as const;

export type HostRenderStyle =
  typeof HOST_RENDER_STYLES[number];

export interface SnapshotOutputMap {
  deps: DepsOutput;
  typerefs: TypeRefsOutput;
  exports: ExportsOutput;
}

export interface SnapshotSummaryMap {
  deps: DepsOutput['summary'];
  typerefs: TypeRefsOutput['summary'];
  exports: ExportsOutput['summary'];
}

export interface HostError {
  readonly code: string;
  readonly message: string;
  readonly retryable?: boolean;
}

export interface HostCacheMeta {
  readonly hit: boolean;
  readonly tier: 'warm' | 'cold';
}

export interface HostInvalidationMeta {
  readonly kind: 'none' | 'files' | 'project';
  readonly count: number;
  readonly dirtyKinds: readonly SnapshotKind[];
  readonly dirtyFiles: readonly string[];
}

export interface HostCommandMeta {
  readonly sessionId?: string;
  readonly durationMs: number;
  readonly cache: HostCacheMeta;
  readonly invalidation: HostInvalidationMeta;
  readonly refreshedKinds: readonly SnapshotKind[];
}

export type HostCommandStatus = 'ok' | 'error';

export interface HostCommandEnvelope<TResult> {
  readonly schemaVersion: typeof HOST_SCHEMA_VERSION;
  readonly command: HostCommandName;
  readonly status: HostCommandStatus;
  readonly result: TResult;
  readonly meta: HostCommandMeta;
  readonly errors: readonly HostError[];
}

export interface SessionOpenArgs {
  readonly sessionId?: string;
  readonly repoPath: string;
  readonly target?: string;
  readonly profilePath?: string;
  readonly excludedRepoRelativePrefixes?: readonly string[] | null;
  readonly warmPrograms?: boolean;
}

export interface SessionOpenResult {
  readonly sessionId: string;
  readonly repoPath: string;
  readonly target: string;
  readonly profileId: string;
  readonly profilePath: string | null;
  readonly warmPrograms: boolean;
  readonly dirtyKinds: readonly SnapshotKind[];
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
  readonly profileId: string;
  readonly profilePath: string | null;
  readonly warmPrograms: boolean;
  readonly dirtyKinds: readonly SnapshotKind[];
  readonly cachedKinds: readonly SnapshotKind[];
  readonly dirtyFiles: readonly string[];
  readonly lastRefreshAtByKind: Partial<Record<SnapshotKind, string>>;
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
  readonly dirtyKinds: readonly SnapshotKind[];
}

export interface SessionRefreshArgs {
  readonly sessionId: string;
  readonly kinds?: readonly SnapshotKind[];
  readonly force?: boolean;
}

export interface SessionRefreshResult {
  readonly sessionId: string;
  readonly refreshedKinds: readonly SnapshotKind[];
  readonly dirtyKinds: readonly SnapshotKind[];
  readonly warningsByKind: Partial<Record<SnapshotKind, readonly string[]>>;
  readonly lastRefreshAtByKind: Partial<Record<SnapshotKind, string>>;
}

export interface SessionQueryArgs {
  readonly sessionId: string;
  readonly refreshIfNeeded?: boolean;
}

export interface HostRenderOptions {
  readonly readMode?: ReadMode;
  readonly consumer?: ConsumerKind;
  readonly renderStyle?: HostRenderStyle;
}

export interface SessionRenderQueryArgs extends SessionQueryArgs, HostRenderOptions {}

export type HostRenderedView =
  | {
    readonly style: 'plain-text';
    readonly rendered: RenderedPlainText;
  }
  | {
    readonly style: 'json-document';
    readonly document: AnswerDocument<AnswerRef>;
  };

export interface AuditPackageQueryArgs extends SessionRenderQueryArgs {
  readonly packageName: string;
}

export interface RouteWitnessQueryArgs extends SessionRenderQueryArgs {
  readonly focusKind: 'file' | 'type';
  readonly focusValue: string;
}

export interface NavigateQueryArgs extends SessionRenderQueryArgs {
  readonly focusKind: 'package' | 'file' | 'symbol' | 'type' | 'export';
  readonly focusValue: string;
  readonly questionRoute?: QuestionRoute;
}

export interface DescribeProfileArgs {
  readonly repoPath?: string;
  readonly target?: string;
  readonly profilePath?: string;
}

export interface PrimitiveQueryArgs extends SessionQueryArgs {
  readonly spendThreshold?: SpendThreshold;
}

export interface ResolvePackageQueryArgs extends PrimitiveQueryArgs {
  readonly locator: string;
  readonly locatorKind?: 'package-name' | 'package-dir';
}

export interface ResolveTypeQueryArgs extends PrimitiveQueryArgs {
  readonly locator: string;
}

export interface ResolveExportQueryArgs extends PrimitiveQueryArgs {
  readonly locator: string;
}

export interface LookupSymbolDeclarationArgs extends SessionQueryArgs {
  readonly locator: string;
}

export interface InspectFileQueryArgs extends SessionQueryArgs {
  readonly filePath: string;
}

export interface ResolvePackageQueryResult {
  readonly outcome: AuthorityOutcome<PackageExportsSummary, PackageExportsSummary>;
  readonly warnings: readonly string[];
}

export interface ResolveTypeQueryResult {
  readonly outcome: AuthorityOutcome<TypeDecl, TypeDecl>;
  readonly warnings: readonly string[];
}

export interface ResolveExportQueryResult {
  readonly outcome: AuthorityOutcome<PackageExportRecord, PackageExportRecord>;
  readonly warnings: readonly string[];
}

export interface LookupSymbolDeclarationResult {
  readonly lookup: StructuralDeclarationLookup;
  readonly warnings: readonly string[];
}

export interface InspectFileQueryResult {
  readonly inspection: FocusedFileQueryInspection;
  readonly warnings: readonly string[];
}

export interface SessionSummaryQueryResult<TKind extends SnapshotKind> {
  readonly kind: TKind;
  readonly generatedAt: string;
  readonly summary: SnapshotSummaryMap[TKind];
  readonly warnings: readonly string[];
}

export interface SessionSnapshotQueryResult<TKind extends SnapshotKind> {
  readonly kind: TKind;
  readonly snapshot: SnapshotOutputMap[TKind];
  readonly warnings: readonly string[];
}

export interface AuditPackageQueryResult {
  readonly answer: InquiryAnswer<AuditValue>;
  readonly rendered?: HostRenderedView;
  readonly warnings: readonly string[];
}

export interface RouteWitnessQueryResult {
  readonly answer: InquiryAnswer<RouteWitnessValue>;
  readonly rendered?: HostRenderedView;
  readonly warnings: readonly string[];
}

export interface NavigateQueryResult {
  readonly answer: InquiryAnswer<NavigationValue>;
  readonly rendered?: HostRenderedView;
  readonly warnings: readonly string[];
}

export interface DescribeProfileResult {
  readonly profile: AnalysisProfile;
  readonly snapshotSupport: ProfileSnapshotSupport;
  readonly posture: AnalyzabilityPosture;
}

export interface MaterializeSnapshotsArgs {
  readonly sessionId: string;
  readonly kinds?: readonly SnapshotKind[];
  readonly outDir?: string;
  readonly refreshIfNeeded?: boolean;
}

export interface MaterializeSnapshotsResult {
  readonly sessionId: string;
  readonly outDir: string;
  readonly files: Partial<Record<SnapshotKind, string>>;
}

export interface HostCommandArgsMap {
  'describe.profile': DescribeProfileArgs;
  'session.open': SessionOpenArgs;
  'session.close': SessionCloseArgs;
  'session.status': SessionStatusArgs;
  'session.invalidate': SessionInvalidateArgs;
  'session.refresh': SessionRefreshArgs;
  'query.deps.summary': SessionQueryArgs;
  'query.deps.snapshot': SessionQueryArgs;
  'query.typerefs.summary': SessionQueryArgs;
  'query.typerefs.snapshot': SessionQueryArgs;
  'query.exports.summary': SessionQueryArgs;
  'query.exports.snapshot': SessionQueryArgs;
  'query.audit.package': AuditPackageQueryArgs;
  'query.route.witness': RouteWitnessQueryArgs;
  'query.navigate': NavigateQueryArgs;
  'query.package.resolve': ResolvePackageQueryArgs;
  'query.type.resolve': ResolveTypeQueryArgs;
  'query.export.resolve': ResolveExportQueryArgs;
  'query.symbol.lookup': LookupSymbolDeclarationArgs;
  'query.file.inspect': InspectFileQueryArgs;
  'materializeSnapshots': MaterializeSnapshotsArgs;
}

export interface HostCommandResultMap {
  'describe.profile': DescribeProfileResult;
  'session.open': SessionOpenResult;
  'session.close': SessionCloseResult;
  'session.status': SessionStatusResult;
  'session.invalidate': SessionInvalidateResult;
  'session.refresh': SessionRefreshResult;
  'query.deps.summary': SessionSummaryQueryResult<'deps'>;
  'query.deps.snapshot': SessionSnapshotQueryResult<'deps'>;
  'query.typerefs.summary': SessionSummaryQueryResult<'typerefs'>;
  'query.typerefs.snapshot': SessionSnapshotQueryResult<'typerefs'>;
  'query.exports.summary': SessionSummaryQueryResult<'exports'>;
  'query.exports.snapshot': SessionSnapshotQueryResult<'exports'>;
  'query.audit.package': AuditPackageQueryResult;
  'query.route.witness': RouteWitnessQueryResult;
  'query.navigate': NavigateQueryResult;
  'query.package.resolve': ResolvePackageQueryResult;
  'query.type.resolve': ResolveTypeQueryResult;
  'query.export.resolve': ResolveExportQueryResult;
  'query.symbol.lookup': LookupSymbolDeclarationResult;
  'query.file.inspect': InspectFileQueryResult;
  'materializeSnapshots': MaterializeSnapshotsResult;
}

export type HostCommandName = keyof HostCommandArgsMap;

export interface HostCommandInvocation<
  TCommand extends HostCommandName = HostCommandName,
> {
  readonly command: TCommand;
  readonly args: HostCommandArgsMap[TCommand];
}

export type HostCommandResult<
  TCommand extends HostCommandName,
> = HostCommandResultMap[TCommand];
