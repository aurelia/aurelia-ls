import { canonicalDocumentUri, type Logger } from "@aurelia-ls/compiler";
import { HostReplayLog, hashEnvelopeForReplay } from "./replay-log.js";
import { runPressureSweep } from "./pressure-sweep.js";
import { HostSessionManager, type HostSessionState, type HostWorkspaceFactory } from "./session-manager.js";
import { HostVerifier } from "./verify.js";
import { SEMANTIC_AUTHORITY_SCHEMA_VERSION } from "./types.js";
import type {
  DocApplyEditsArgs,
  DocCloseArgs,
  DocMutationResult,
  DocOpenArgs,
  DocUpdateArgs,
  HostCacheMeta,
  HostInvalidationMeta,
  PressureRunScenarioArgs,
  QueryDiagnosticsArgs,
  QueryHoverArgs,
  QueryNavigationArgs,
  QuerySemanticTokensArgs,
  ReplayExportArgs,
  ReplayRunArgs,
  ReplayableCommandInvocation,
  SemanticAuthorityCommandArgs,
  SemanticAuthorityCommandInvocation,
  SemanticAuthorityCommandName,
  SemanticAuthorityCommandResult,
  SemanticAuthorityCommandStatus,
  SemanticAuthorityConfidence,
  SemanticAuthorityEnvelope,
  SemanticAuthorityEpistemic,
  SemanticAuthorityError,
  SemanticAuthorityGap,
  SemanticAuthorityParityAdapter,
  SemanticAuthorityPolicyProfile,
  SerializableWorkspaceDiagnostics,
  SessionCloseArgs,
  SessionOpenArgs,
  SessionRefreshArgs,
  SessionStatusArgs,
  VerifyDeterminismArgs,
  VerifyGapConservationArgs,
  VerifyParityArgs,
} from "./types.js";

const SILENT_LOGGER: Logger = { log: () => {}, info: () => {}, warn: () => {}, error: () => {} };
const DEFAULT_CACHE: HostCacheMeta = { hit: false, tier: "warm" };
const DEFAULT_INVALIDATION: HostInvalidationMeta = { kind: "none", count: 0 };
const DEFAULT_EPISTEMIC: SemanticAuthorityEpistemic = { confidence: "unknown", gaps: [], provenanceRefs: [] };

interface CommandOutcome {
  readonly status?: SemanticAuthorityCommandStatus;
  readonly result?: unknown;
  readonly sessionId?: string;
  readonly workspaceFingerprint?: string;
  readonly policyProfile?: SemanticAuthorityPolicyProfile;
  readonly cache?: HostCacheMeta;
  readonly invalidation?: HostInvalidationMeta;
  readonly touchedDocumentCount?: number;
  readonly errors?: readonly SemanticAuthorityError[];
  readonly epistemic?: Partial<SemanticAuthorityEpistemic>;
}

export interface HostExecuteOptions {
  readonly record?: boolean;
  readonly runId?: string | null;
}

export interface SemanticAuthorityHostRuntimeOptions {
  readonly logger?: Logger;
  readonly defaultWorkspaceRoot?: string;
  readonly workspaceFactory?: HostWorkspaceFactory;
  readonly parityAdapter?: SemanticAuthorityParityAdapter;
}

type MutableEnvelope = {
  schemaVersion: typeof SEMANTIC_AUTHORITY_SCHEMA_VERSION;
  command: SemanticAuthorityCommandName;
  status: SemanticAuthorityCommandStatus;
  result: unknown;
  policy: { profile: SemanticAuthorityPolicyProfile };
  epistemic: SemanticAuthorityEpistemic;
  meta: {
    sessionId?: string;
    commandId: string;
    workspaceFingerprint?: string;
    durationMs: number;
    cache: HostCacheMeta;
    invalidation: HostInvalidationMeta;
    touchedDocumentCount: number;
    replayRecordId?: string;
  };
  errors: readonly SemanticAuthorityError[];
};

export class SemanticAuthorityHostRuntime {
  readonly #logger: Logger;
  readonly #sessions: HostSessionManager;
  readonly #replay: HostReplayLog;
  readonly #verifier: HostVerifier;
  #globalCommandSequence = 0;

  constructor(options: SemanticAuthorityHostRuntimeOptions = {}) {
    this.#logger = options.logger ?? SILENT_LOGGER;
    this.#sessions = new HostSessionManager({
      logger: this.#logger,
      defaultWorkspaceRoot: options.defaultWorkspaceRoot,
      workspaceFactory: options.workspaceFactory,
    });
    this.#replay = new HostReplayLog();
    this.#verifier = new HostVerifier({
      dispatch: (invocation, executeOptions) => this.execute(
        invocation as SemanticAuthorityCommandInvocation,
        executeOptions,
      ),
      parityAdapter: options.parityAdapter,
    });
  }

  async execute<TCommand extends SemanticAuthorityCommandName>(
    invocation: SemanticAuthorityCommandInvocation<TCommand>,
    options: HostExecuteOptions = {},
  ): Promise<SemanticAuthorityEnvelope<SemanticAuthorityCommandResult<TCommand>>> {
    const startedAt = Date.now();
    const requestedSessionId = extractSessionId(invocation.args);
    const commandId = this.#allocateCommandId(requestedSessionId);

    let outcome: CommandOutcome;
    try {
      outcome = await this.#dispatch(invocation);
    } catch (error) {
      outcome = {
        status: "error",
        result: null,
        sessionId: requestedSessionId ?? undefined,
        workspaceFingerprint: this.#workspaceFingerprint(requestedSessionId) ?? undefined,
        policyProfile: this.#policyProfile(requestedSessionId, "tooling"),
        errors: [toCommandError(error)],
        epistemic: DEFAULT_EPISTEMIC,
      };
    }

    const sessionId = outcome.sessionId ?? requestedSessionId ?? null;
    const envelope = this.#buildEnvelope(invocation.command, commandId, Date.now() - startedAt, {
      status: outcome.status ?? "ok",
      result: outcome.result ?? null,
      sessionId: sessionId ?? undefined,
      workspaceFingerprint: outcome.workspaceFingerprint
        ?? this.#workspaceFingerprint(sessionId)
        ?? undefined,
      policyProfile: this.#policyProfile(sessionId, outcome.policyProfile ?? "tooling"),
      cache: outcome.cache ?? DEFAULT_CACHE,
      invalidation: outcome.invalidation ?? DEFAULT_INVALIDATION,
      touchedDocumentCount: outcome.touchedDocumentCount ?? 0,
      errors: outcome.errors ?? [],
      epistemic: mergeEpistemic(DEFAULT_EPISTEMIC, outcome.epistemic),
    });

    if (options.record !== false && sessionId && isReplayableCommand(invocation.command)) {
      const record = this.#replay.append({
        sessionId,
        runId: options.runId,
        commandId,
        invocation: { command: invocation.command, args: invocation.args },
        envelope: envelope as SemanticAuthorityEnvelope<unknown>,
      });
      envelope.meta.replayRecordId = record.recordId;
    }

    return envelope as SemanticAuthorityEnvelope<SemanticAuthorityCommandResult<TCommand>>;
  }

  #buildEnvelope(
    command: SemanticAuthorityCommandName,
    commandId: string,
    durationMs: number,
    value: {
      status: SemanticAuthorityCommandStatus;
      result: unknown;
      sessionId?: string;
      workspaceFingerprint?: string;
      policyProfile: SemanticAuthorityPolicyProfile;
      cache: HostCacheMeta;
      invalidation: HostInvalidationMeta;
      touchedDocumentCount: number;
      errors: readonly SemanticAuthorityError[];
      epistemic: SemanticAuthorityEpistemic;
    },
  ): MutableEnvelope {
    return {
      schemaVersion: SEMANTIC_AUTHORITY_SCHEMA_VERSION,
      command,
      status: value.status,
      result: value.result,
      policy: { profile: value.policyProfile },
      epistemic: value.epistemic,
      meta: {
        ...(value.sessionId ? { sessionId: value.sessionId } : {}),
        commandId,
        ...(value.workspaceFingerprint ? { workspaceFingerprint: value.workspaceFingerprint } : {}),
        durationMs,
        cache: value.cache,
        invalidation: value.invalidation,
        touchedDocumentCount: value.touchedDocumentCount,
      },
      errors: value.errors,
    };
  }

  async #dispatch<TCommand extends SemanticAuthorityCommandName>(
    invocation: SemanticAuthorityCommandInvocation<TCommand>,
  ): Promise<CommandOutcome> {
    switch (invocation.command) {
      case "session.open": return this.#sessionOpen(invocation.args as SessionOpenArgs);
      case "session.refresh": return this.#sessionRefresh(invocation.args as SessionRefreshArgs);
      case "session.close": return this.#sessionClose(invocation.args as SessionCloseArgs);
      case "session.status": return this.#sessionStatus(invocation.args as SessionStatusArgs);
      case "doc.open": return this.#docOpen(invocation.args as DocOpenArgs);
      case "doc.update": return this.#docUpdate(invocation.args as DocUpdateArgs);
      case "doc.applyEdits": return this.#docApplyEdits(invocation.args as DocApplyEditsArgs);
      case "doc.close": return this.#docClose(invocation.args as DocCloseArgs);
      case "query.snapshot": return this.#querySnapshot(invocation.args as SemanticAuthorityCommandArgs<"query.snapshot">);
      case "query.completions": return this.#queryCompletions(invocation.args as SemanticAuthorityCommandArgs<"query.completions">);
      case "query.hover": return this.#queryHover(invocation.args as SemanticAuthorityCommandArgs<"query.hover">);
      case "query.diagnostics": return this.#queryDiagnostics(invocation.args as SemanticAuthorityCommandArgs<"query.diagnostics">);
      case "query.navigation": return this.#queryNavigation(invocation.args as SemanticAuthorityCommandArgs<"query.navigation">);
      case "query.semanticTokens": return this.#querySemanticTokens(invocation.args as SemanticAuthorityCommandArgs<"query.semanticTokens">);
      case "refactor.rename": return this.#refactorRename(invocation.args as SemanticAuthorityCommandArgs<"refactor.rename">);
      case "refactor.codeActions": return this.#refactorCodeActions(invocation.args as SemanticAuthorityCommandArgs<"refactor.codeActions">);
      case "verify.determinism": return this.#verifyDeterminism(invocation.args as VerifyDeterminismArgs);
      case "verify.parity": return this.#verifyParity(invocation.args as VerifyParityArgs);
      case "verify.gapConservation": return this.#verifyGapConservation(invocation.args as VerifyGapConservationArgs);
      case "replay.exportRun": return this.#replayExport(invocation.args as ReplayExportArgs);
      case "replay.run": return this.#replayRun(invocation.args as ReplayRunArgs);
      case "pressure.runScenario": return this.#pressureRun(invocation.args as PressureRunScenarioArgs);
      default: return assertNever(invocation.command);
    }
  }

  #sessionOpen(args: SessionOpenArgs): CommandOutcome {
    const session = this.#sessions.open(args);
    return ok(session, {
      sessionId: session.id,
      workspaceRoot: session.workspaceRoot,
      workspaceFingerprint: this.#sessions.workspaceFingerprint(session),
      profile: session.profile,
      openDocumentCount: session.documents.size,
    }, { cache: { hit: false, tier: "cold" }, invalidation: { kind: "project", count: 1 }, confidence: "high" });
  }

  #sessionRefresh(args: SessionRefreshArgs): CommandOutcome {
    const session = this.#sessions.require(args.sessionId);
    const refreshed = session.workspace.refresh({ force: args.force });
    return ok(session, {
      sessionId: session.id,
      refreshed,
      workspaceFingerprint: this.#sessions.workspaceFingerprint(session),
    }, {
      cache: { hit: true, tier: "warm" },
      invalidation: refreshed ? { kind: "project", count: 1 } : DEFAULT_INVALIDATION,
      confidence: refreshed ? "high" : "exact",
    });
  }

  #sessionClose(args: SessionCloseArgs): CommandOutcome {
    const existing = this.#sessions.get(args.sessionId);
    const profile = existing?.profile ?? "tooling";
    const closed = this.#sessions.close(args.sessionId);
    if (!closed) {
      return degraded(args.sessionId, profile, { sessionId: args.sessionId, closed }, [missingSessionGap(args.sessionId)]);
    }
    return { status: "ok", result: { sessionId: args.sessionId, closed }, sessionId: args.sessionId, policyProfile: profile, epistemic: { confidence: "high" } };
  }

  #sessionStatus(args: SessionStatusArgs): CommandOutcome {
    const sessions = this.#sessions.summaries(args.sessionId);
    if (args.sessionId && sessions.length === 0) {
      return degraded(args.sessionId, "tooling", { sessions }, [missingSessionGap(args.sessionId)]);
    }
    return {
      status: "ok",
      result: { sessions },
      sessionId: args.sessionId,
      policyProfile: args.sessionId ? this.#policyProfile(args.sessionId, "tooling") : "tooling",
      epistemic: { confidence: "exact" },
    };
  }

  #docOpen(args: DocOpenArgs): CommandOutcome {
    const session = this.#sessions.require(args.sessionId);
    const uri = canonicalDocumentUri(args.uri).uri;
    session.workspace.open(uri, args.text, args.version);
    const text = args.text ?? session.workspace.lookupText(uri);
    if (text == null) {
      return degraded(session.id, session.profile, docResult(session, uri, args.version, { opened: false }), [{
        what: "Document content unavailable",
        why: `No text could be loaded for ${String(uri)}.`,
        howToClose: "Provide doc.open.text or ensure the target file exists.",
      }]);
    }
    this.#sessions.upsertDocument(session.id, uri, text, args.version ?? null);
    return ok(session, docResult(session, uri, args.version, { opened: true }), {
      cache: { hit: false, tier: "cold" },
      invalidation: { kind: "local", count: 1 },
      touchedDocumentCount: 1,
      confidence: "high",
    });
  }

  #docUpdate(args: DocUpdateArgs): CommandOutcome {
    const session = this.#sessions.require(args.sessionId);
    const uri = canonicalDocumentUri(args.uri).uri;
    session.workspace.update(uri, args.text, args.version);
    this.#sessions.upsertDocument(session.id, uri, args.text, args.version ?? null);
    return ok(session, docResult(session, uri, args.version), {
      invalidation: { kind: "local", count: 1 },
      touchedDocumentCount: 1,
      confidence: "high",
    });
  }

  #docApplyEdits(args: DocApplyEditsArgs): CommandOutcome {
    const session = this.#sessions.require(args.sessionId);
    const uri = canonicalDocumentUri(args.uri).uri;
    const currentText = session.workspace.lookupText(uri);
    if (currentText == null) {
      throw new Error(`Document not loaded: ${String(uri)}`);
    }
    const applied = applyTextEdits(currentText, args.edits);
    session.workspace.update(uri, applied.text, args.version);
    this.#sessions.upsertDocument(session.id, uri, applied.text, args.version ?? null);
    return ok(session, docResult(session, uri, args.version, { appliedEdits: applied.appliedEdits }), {
      invalidation: { kind: "local", count: applied.appliedEdits },
      touchedDocumentCount: 1,
      confidence: "high",
    });
  }

  #docClose(args: DocCloseArgs): CommandOutcome {
    const session = this.#sessions.require(args.sessionId);
    const uri = canonicalDocumentUri(args.uri).uri;
    session.workspace.close(uri);
    this.#sessions.removeDocument(session.id, uri);
    return ok(session, docResult(session, uri, null), {
      invalidation: { kind: "local", count: 1 },
      touchedDocumentCount: 1,
      confidence: "high",
    });
  }

  #querySnapshot(args: SemanticAuthorityCommandArgs<"query.snapshot">): CommandOutcome {
    const session = this.#sessions.require((args as { sessionId: string }).sessionId);
    return ok(session, session.workspace.snapshot(), { cache: { hit: true, tier: "warm" }, confidence: "exact" });
  }

  #queryCompletions(args: SemanticAuthorityCommandArgs<"query.completions">): CommandOutcome {
    const request = args as SemanticAuthorityCommandArgs<"query.completions">;
    const session = this.#sessions.require(request.sessionId);
    const uri = canonicalDocumentUri(request.uri).uri;
    const items = session.workspace.query(uri).completions(request.position);
    const confidence = completionsConfidence(items);
    const result = { items, isIncomplete: confidence === "partial" || confidence === "low" };
    if (result.isIncomplete) {
      return degraded(session.id, session.profile, result, [completionGap(items.length, confidence as "partial" | "low")]);
    }
    return ok(session, result, { cache: { hit: true, tier: "warm" }, confidence });
  }

  #queryHover(args: SemanticAuthorityCommandArgs<"query.hover">): CommandOutcome {
    const request = args as QueryHoverArgs;
    const session = this.#sessions.require(request.sessionId);
    const uri = canonicalDocumentUri(request.uri).uri;
    const hover = session.workspace.query(uri).hover(request.position);
    const confidence = normalizeConfidence(hover?.confidence);
    if (hover && (confidence === "partial" || confidence === "low") && hover.confidenceReason) {
      return degraded(session.id, session.profile, { hover }, [{
        what: "Hover confidence reduced",
        why: hover.confidenceReason,
        howToClose: "Strengthen declarations so hover resolution converges.",
      }]);
    }
    return ok(session, { hover }, {
      cache: { hit: true, tier: "warm" },
      confidence,
      provenanceRefs: hover?.location
        ? [locationRef(hover.location.uri, hover.location.span.start, hover.location.span.end)]
        : [],
    });
  }

  #queryDiagnostics(args: SemanticAuthorityCommandArgs<"query.diagnostics">): CommandOutcome {
    const request = args as QueryDiagnosticsArgs;
    const session = this.#sessions.require(request.sessionId);
    const uri = canonicalDocumentUri(request.uri).uri;
    const diagnostics = serializeDiagnostics(session.workspace.diagnostics(uri));
    if (diagnostics.suppressed.length > 0) {
      return degraded(session.id, session.profile, diagnostics, [{
        what: "Diagnostics were suppressed by policy",
        why: `${diagnostics.suppressed.length} diagnostics are in the suppressed lane.`,
        howToClose: "Inspect suppressed diagnostics and adjust declarations or policy thresholds.",
      }]);
    }
    return ok(session, diagnostics, { cache: { hit: true, tier: "warm" }, confidence: "high" });
  }

  #queryNavigation(args: SemanticAuthorityCommandArgs<"query.navigation">): CommandOutcome {
    const request = args as QueryNavigationArgs;
    const session = this.#sessions.require(request.sessionId);
    const uri = canonicalDocumentUri(request.uri).uri;
    const query = session.workspace.query(uri);
    const locations = request.mode === "definition"
      ? query.definition(request.position)
      : query.references(request.position);
    return ok(session, { mode: request.mode, locations }, {
      cache: { hit: true, tier: "warm" },
      confidence: locations.length > 0 ? "high" : "unknown",
      provenanceRefs: locations.slice(0, 20).map((loc) => locationRef(loc.uri, loc.span.start, loc.span.end)),
    });
  }

  #querySemanticTokens(args: SemanticAuthorityCommandArgs<"query.semanticTokens">): CommandOutcome {
    const request = args as QuerySemanticTokensArgs;
    const session = this.#sessions.require(request.sessionId);
    const uri = canonicalDocumentUri(request.uri).uri;
    return ok(session, { tokens: session.workspace.query(uri).semanticTokens() }, {
      cache: { hit: true, tier: "warm" },
      confidence: "high",
    });
  }

  #refactorRename(args: SemanticAuthorityCommandArgs<"refactor.rename">): CommandOutcome {
    const request = args as SemanticAuthorityCommandArgs<"refactor.rename">;
    const session = this.#sessions.require(request.sessionId);
    const result = session.workspace.refactor().rename({
      ...request.request,
      uri: canonicalDocumentUri(request.request.uri).uri,
    });
    if ("error" in result) {
      return degraded(session.id, session.profile, result, [{
        what: "Rename could not be completed",
        why: result.error.message,
        howToClose: "Resolve refactor policy constraints or rename a provenance-backed symbol.",
      }]);
    }
    return ok(session, result, { confidence: "high", touchedDocumentCount: result.edit.edits.length });
  }

  #refactorCodeActions(args: SemanticAuthorityCommandArgs<"refactor.codeActions">): CommandOutcome {
    const request = args as SemanticAuthorityCommandArgs<"refactor.codeActions">;
    const session = this.#sessions.require(request.sessionId);
    const actions = session.workspace.refactor().codeActions({
      ...request.request,
      uri: canonicalDocumentUri(request.request.uri).uri,
    });
    return ok(session, { actions }, { confidence: "high" });
  }

  async #verifyDeterminism(args: VerifyDeterminismArgs): Promise<CommandOutcome> {
    const session = this.#sessions.require(args.sessionId);
    const report = await this.#verifier.verifyDeterminism(args);
    if (!report.deterministic) {
      return degraded(session.id, session.profile, report, [{
        what: "Determinism check failed",
        why: `Observed ${report.divergenceIndexes.length} divergent replay hashes.`,
        howToClose: "Stabilize command behavior for fixed input signatures.",
      }]);
    }
    return ok(session, report, { confidence: "exact" });
  }

  async #verifyParity(args: VerifyParityArgs): Promise<CommandOutcome> {
    const session = this.#sessions.require(args.sessionId);
    const report = await this.#verifier.verifyParity(args);
    if (!report.adapterAvailable) {
      return degraded(session.id, session.profile, report, [{
        what: "Parity adapter unavailable",
        why: "No parity adapter has been configured for host verification.",
        howToClose: "Provide a SemanticAuthorityParityAdapter when creating the host runtime.",
      }]);
    }
    if (!report.parity) {
      return degraded(session.id, session.profile, report, [{
        what: "Parity mismatch",
        why: `Host hash ${report.hostHash} differs from adapter hash ${report.adapterHash}.`,
        howToClose: "Inspect projection seams and align adapter output with workspace authority.",
      }]);
    }
    return ok(session, report, { confidence: "exact" });
  }

  async #verifyGapConservation(args: VerifyGapConservationArgs): Promise<CommandOutcome> {
    const session = this.#sessions.require(args.sessionId);
    const report = await this.#verifier.verifyGapConservation(args);
    if (!report.conserved) {
      return degraded(session.id, session.profile, report, [{
        what: "Gap conservation failed",
        why: `Missing fields: ${report.missingFields.join(", ")}`,
        howToClose: "Ensure degraded envelopes always carry what, why, and howToClose.",
      }]);
    }
    return ok(session, report, { confidence: "exact" });
  }

  #replayExport(args: ReplayExportArgs): CommandOutcome {
    const session = this.#sessions.require(args.sessionId);
    const run = this.#replay.exportRun(session.id, args.runId);
    if (!run) {
      return degraded(session.id, session.profile, null, [{
        what: "Replay run not found",
        why: args.runId
          ? `Run '${args.runId}' does not exist for session ${session.id}.`
          : `No replay records exist for session ${session.id}.`,
        howToClose: "Execute replayable commands before exporting a run.",
      }]);
    }
    return ok(session, run, { confidence: "high" });
  }

  async #replayRun(args: ReplayRunArgs): Promise<CommandOutcome> {
    const session = this.#sessions.require(args.sessionId);
    const divergences: Array<{ index: number; command: ReplayableCommandInvocation["command"]; expectedHash: string; observedHash: string }> = [];
    let replayedRecords = 0;
    for (const [index, record] of args.run.records.entries()) {
      const invocation = withSession(record.invocation, session.id);
      const envelope = await this.execute(
        invocation as SemanticAuthorityCommandInvocation,
        { record: false },
      );
      const observedHash = hashEnvelopeForReplay(envelope as SemanticAuthorityEnvelope<unknown>);
      replayedRecords += 1;
      if (observedHash !== record.resultHash) {
        divergences.push({
          index,
          command: record.command,
          expectedHash: record.resultHash,
          observedHash,
        });
        if (args.stopOnFirstDivergence) break;
      }
    }

    const result = {
      runId: args.run.runId,
      totalRecords: args.run.records.length,
      replayedRecords,
      divergenceCount: divergences.length,
      divergences,
    };
    if (divergences.length > 0) {
      return degraded(session.id, session.profile, result, [{
        what: "Replay divergence detected",
        why: `${divergences.length} replayed commands diverged.`,
        howToClose: "Inspect divergence entries and stabilize command output for fixed signatures.",
      }]);
    }
    return ok(session, result, { confidence: "exact" });
  }

  async #pressureRun(args: PressureRunScenarioArgs): Promise<CommandOutcome> {
    const session = this.#sessions.require(args.sessionId);
    const runId = this.#replay.startRun(session.id, "pressure");
    const stopOnFailure = args.stopOnFailure ?? true;

    if (args.sweep) {
      const sweep = await runPressureSweep({
        sessionId: session.id,
        runId,
        workspaceRoot: session.workspaceRoot,
        sweep: args.sweep,
        stopOnFailure,
        execute: (invocation, options) => this.execute(invocation, options),
        onProgress: (event) => this.#logger.info(`[host.sweep] ${JSON.stringify(event)}`),
      });
      if (sweep.result.anomalyCount > 0 || sweep.stoppedEarly) {
        return degraded(session.id, session.profile, {
          runId,
          stoppedEarly: sweep.stoppedEarly,
          steps: [],
          sweep: sweep.result,
        }, [{
          what: "Sweep surfaced anomalies",
          why: `Observed ${sweep.result.anomalyCount} anomalies across ${sweep.result.observationCount} observations.`,
          howToClose: "Inspect sweep observations and close tagged seam anomalies.",
        }]);
      }
      return ok(session, {
        runId,
        stoppedEarly: false,
        steps: [],
        sweep: sweep.result,
      }, { confidence: "high" });
    }

    const steps = args.steps ?? [];
    if (steps.length === 0) {
      return degraded(session.id, session.profile, {
        runId,
        stoppedEarly: true,
        steps: [],
      }, [{
        what: "No pressure steps were provided",
        why: "pressure.runScenario requires either sweep configuration or at least one step.",
        howToClose: "Provide pressure.steps for step mode or pressure.sweep for sweep mode.",
      }]);
    }

    const stepResults: Array<{
      index: number;
      label: string | null;
      command: ReplayableCommandInvocation["command"];
      status: SemanticAuthorityCommandStatus;
      commandId: string;
      durationMs: number;
      expectationMatched: boolean;
      expectedStatus?: SemanticAuthorityCommandStatus;
    }> = [];
    const extraGaps: SemanticAuthorityGap[] = [];
    let stoppedEarly = false;

    for (const [index, step] of steps.entries()) {
      const invocation: ReplayableCommandInvocation = {
        command: step.command,
        args: withSessionValue(step.args, session.id),
      };
      const envelope = await this.execute(
        invocation as SemanticAuthorityCommandInvocation,
        { runId },
      );
      const expectationMatched = step.expectStatus
        ? envelope.status === step.expectStatus
        : true;
      if (!expectationMatched && step.expectStatus) {
        extraGaps.push({
          what: "Scenario step status mismatch",
          why: `Step ${index} expected '${step.expectStatus}' but got '${envelope.status}'.`,
          howToClose: "Update expectations or fix the command path causing unexpected degradation.",
        });
      }
      stepResults.push({
        index,
        label: step.label ?? null,
        command: step.command,
        status: envelope.status,
        commandId: envelope.meta.commandId,
        durationMs: envelope.meta.durationMs,
        expectationMatched,
        ...(step.expectStatus ? { expectedStatus: step.expectStatus } : {}),
      });
      if (stopOnFailure && (envelope.status === "error" || !expectationMatched)) {
        stoppedEarly = true;
        break;
      }
    }

    const result = { runId, stoppedEarly, steps: stepResults };
    const hasError = stepResults.some((step) => step.status === "error");
    const hasDegraded = stepResults.some((step) => step.status === "degraded");
    if (hasError) {
      return degraded(session.id, session.profile, result, [{
        what: "Scenario execution encountered command errors",
        why: "At least one scenario step returned status 'error'.",
        howToClose: "Inspect failing step command outputs and remediate the failing seams.",
      }, ...extraGaps]);
    }
    if (hasDegraded || extraGaps.length > 0) {
      return degraded(session.id, session.profile, result, [{
        what: "Scenario completed with degraded steps",
        why: "At least one step returned status 'degraded'.",
        howToClose: "Inspect degraded step envelopes and close declared gaps.",
      }, ...extraGaps]);
    }
    return ok(session, result, { confidence: "high" });
  }

  #workspaceFingerprint(sessionId: string | null): string | null {
    if (!sessionId) return null;
    const session = this.#sessions.get(sessionId);
    return session ? this.#sessions.workspaceFingerprint(session) : null;
  }

  #policyProfile(sessionId: string | null, fallback: SemanticAuthorityPolicyProfile): SemanticAuthorityPolicyProfile {
    if (!sessionId) return fallback;
    return this.#sessions.profileOf(sessionId) ?? fallback;
  }

  #allocateCommandId(sessionId: string | null): string {
    if (sessionId && this.#sessions.get(sessionId)) {
      return this.#sessions.nextCommandId(sessionId);
    }
    this.#globalCommandSequence += 1;
    return `global:cmd-${String(this.#globalCommandSequence).padStart(5, "0")}`;
  }
}

function ok(
  session: HostSessionState,
  result: unknown,
  options: {
    cache?: HostCacheMeta;
    invalidation?: HostInvalidationMeta;
    touchedDocumentCount?: number;
    confidence: SemanticAuthorityConfidence;
    provenanceRefs?: readonly string[];
  },
): CommandOutcome {
  return {
    status: "ok",
    result,
    sessionId: session.id,
    workspaceFingerprint: session.workspace.snapshot().meta.fingerprint,
    policyProfile: session.profile,
    cache: options.cache ?? DEFAULT_CACHE,
    invalidation: options.invalidation ?? DEFAULT_INVALIDATION,
    touchedDocumentCount: options.touchedDocumentCount ?? 0,
    epistemic: {
      confidence: options.confidence,
      gaps: [],
      provenanceRefs: options.provenanceRefs ?? [],
    },
  };
}

function degraded(
  sessionId: string,
  profile: SemanticAuthorityPolicyProfile,
  result: unknown,
  gaps: readonly SemanticAuthorityGap[],
): CommandOutcome {
  return {
    status: "degraded",
    result,
    sessionId,
    policyProfile: profile,
    epistemic: {
      confidence: "partial",
      gaps,
      provenanceRefs: [],
    },
  };
}

function extractSessionId(args: unknown): string | null {
  if (!args || typeof args !== "object") return null;
  const value = args as { sessionId?: unknown };
  return typeof value.sessionId === "string" ? value.sessionId : null;
}

function mergeEpistemic(
  base: SemanticAuthorityEpistemic,
  partial: Partial<SemanticAuthorityEpistemic> | undefined,
): SemanticAuthorityEpistemic {
  if (!partial) return base;
  return {
    confidence: partial.confidence ?? base.confidence,
    gaps: partial.gaps ?? base.gaps,
    provenanceRefs: partial.provenanceRefs ?? base.provenanceRefs,
  };
}

function toCommandError(error: unknown): SemanticAuthorityError {
  if (error instanceof Error) {
    return { code: "host-command-failed", message: error.message, retryable: false };
  }
  return { code: "host-command-failed", message: String(error), retryable: false };
}

function docResult(
  session: HostSessionState,
  uri: DocMutationResult["uri"],
  version: number | null | undefined,
  extra: { opened?: boolean; appliedEdits?: number } = {},
): DocMutationResult {
  return {
    sessionId: session.id,
    uri,
    openDocumentCount: session.documents.size,
    version: version ?? null,
    ...(extra.opened !== undefined ? { opened: extra.opened } : {}),
    ...(extra.appliedEdits !== undefined ? { appliedEdits: extra.appliedEdits } : {}),
  };
}

function serializeDiagnostics(
  diagnostics: ReturnType<HostSessionState["workspace"]["diagnostics"]>,
): SerializableWorkspaceDiagnostics {
  const bySurface: Record<string, readonly SerializableWorkspaceDiagnostics["suppressed"][number][]> = {};
  for (const [surface, entries] of diagnostics.bySurface.entries()) {
    bySurface[surface] = entries;
  }
  return {
    bySurface,
    suppressed: diagnostics.suppressed,
  };
}

function normalizeConfidence(
  confidence: "exact" | "high" | "partial" | "low" | "manual" | undefined,
): SemanticAuthorityConfidence {
  switch (confidence) {
    case "exact": return "exact";
    case "high": return "high";
    case "partial": return "partial";
    case "low": return "low";
    case "manual": return "partial";
    default: return "high";
  }
}

function completionsConfidence(
  items: readonly { confidence?: "exact" | "high" | "partial" | "low" }[],
): SemanticAuthorityConfidence {
  if (items.length === 0) return "unknown";
  if (items.some((item) => item.confidence === "low")) return "low";
  if (items.some((item) => item.confidence === "partial")) return "partial";
  if (items.every((item) => item.confidence === "exact")) return "exact";
  return "high";
}

function completionGap(
  itemCount: number,
  confidence: "partial" | "low",
): SemanticAuthorityGap {
  return {
    what: "Completion confidence reduced",
    why: `${itemCount} completion items were returned with ${confidence} confidence.`,
    howToClose: "Add explicit declarations and registrations so completion sources converge.",
  };
}

function locationRef(uri: string, start: number, end: number): string {
  return `${uri}#${start}:${end}`;
}

function withSession(
  invocation: ReplayableCommandInvocation,
  sessionId: string,
): ReplayableCommandInvocation {
  return {
    command: invocation.command,
    args: withSessionValue(invocation.args, sessionId),
  };
}

function withSessionValue(value: unknown, sessionId: string): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  return {
    ...(value as Record<string, unknown>),
    sessionId,
  };
}

function isReplayableCommand(
  command: SemanticAuthorityCommandName,
): command is ReplayableCommandInvocation["command"] {
  return !command.startsWith("verify.")
    && !command.startsWith("replay.")
    && command !== "pressure.runScenario";
}

function applyTextEdits(
  text: string,
  edits: readonly { start: number; end: number; newText: string }[],
): { text: string; appliedEdits: number } {
  const sorted = edits.map((edit) => ({ ...edit })).sort((a, b) => (b.start - a.start) || (b.end - a.end));
  let previousStart = Number.POSITIVE_INFINITY;
  let next = text;
  for (const edit of sorted) {
    if (!Number.isInteger(edit.start) || !Number.isInteger(edit.end)) {
      throw new Error("Text edit offsets must be integers.");
    }
    if (edit.start < 0 || edit.end < edit.start || edit.end > text.length) {
      throw new Error(`Invalid text edit span: [${edit.start}, ${edit.end}].`);
    }
    if (edit.end > previousStart) {
      throw new Error("Text edits must not overlap.");
    }
    next = `${next.slice(0, edit.start)}${edit.newText}${next.slice(edit.end)}`;
    previousStart = edit.start;
  }
  return { text: next, appliedEdits: sorted.length };
}

function missingSessionGap(sessionId: string): SemanticAuthorityGap {
  return {
    what: "Session does not exist",
    why: `No active session found for id '${sessionId}'.`,
    howToClose: "Run session.open and retry with the returned sessionId.",
  };
}

function assertNever(value: never): never {
  throw new Error(`Unsupported command: ${String(value)}`);
}

export function createSemanticAuthorityHostRuntime(
  options: SemanticAuthorityHostRuntimeOptions = {},
): SemanticAuthorityHostRuntime {
  return new SemanticAuthorityHostRuntime(options);
}
