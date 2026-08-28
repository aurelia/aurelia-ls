import type { ProductDetailReadView } from '../kernel/product-details.js';
import type {
  KernelMaterializationReadView,
  KernelReadProjectionRevisionView,
} from '../kernel/store.js';
import type {
  TemplateCompilationFamilyFrontDoorEmission,
  TemplateCompilationFrontDoorEmission,
  TemplateResourceCompilationEmission,
} from './template-compilation-project-pass.js';
import type { BrowserEffectiveTemplateEmission } from './browser-effective-template-materializer.js';
import { LocalTemplateDefinitionMaterializer } from './local-template-definition-materializer.js';
import { TemplateCompilerReadView, TemplateCompilerWorldAuthority } from './compiler-read-view.js';
import {
  type TemplateCompilerInvocationBootstrapClosure,
  type TemplateCompilerExecutionLaneReference,
  TemplateCompilerExecutionSession,
} from './template-compiler-execution.js';
import {
  executeTemplateCompilerHookBootstrap,
  type TemplateCompilerHookBootstrapResult,
  TemplateCompilerHookBootstrapState,
} from './template-compiler-hook-bootstrap.js';
import {
  executeTemplateCompilerLocalExtraction,
  type TemplateCompilerLocalExtractionResult,
  TemplateCompilerLocalExtractionState,
} from './template-compiler-local-extraction.js';
import {
  buildTemplateCompilerNormalizedSiteIndex,
  type TemplateCompilerNormalizedSiteIndexResult,
  TemplateCompilerNormalizedSiteIndexState,
} from './template-compiler-normalized-site-index.js';
import { TemplateCompilerOccurrenceForest } from './template-compiler-occurrence.js';
import { TemplateCompilerPreWalkRemainderAuthority } from './template-compiler-prewalk-remainder.js';
import {
  bindTemplateCompilerRootSiteInvocation,
  type TemplateCompilerSiteInvocationBindingResult,
  TemplateCompilerSiteInvocationBindingReasonKind,
  TemplateCompilerSiteInvocationBindingState,
} from './template-compiler-site-invocation.js';
import {
  executeTemplateCompilerRootSiteCursor,
  type TemplateCompilerSiteCursorResult,
  TemplateCompilerSiteCursorResultState,
  TemplateCompilerSiteCursorTraversalMode,
} from './template-compiler-site-cursor.js';

const rootSiteRunAuthority = {};

export const enum TemplateCompilerRootSiteRunState {
  GraphMismatch = 'graph-mismatch',
  HookOpen = 'hook-open',
  HookAbrupt = 'hook-abrupt',
  LocalRefused = 'local-refused',
  LocalAbrupt = 'local-abrupt',
  LocalExtractedUnsupported = 'local-extracted-unsupported',
  FamilyMissing = 'family-missing',
  BindingMismatch = 'binding-mismatch',
  CursorMismatch = 'cursor-mismatch',
  CursorTranscript = 'cursor-transcript',
}

export class TemplateCompilerRootSiteRunReason {
  constructor(
    readonly reasonKind: string,
    readonly summary: string,
  ) {}
}

export interface TemplateCompilerRootSiteRunRequest {
  readonly runKey: string;
  readonly compilation: TemplateResourceCompilationEmission;
  readonly browserEmission: BrowserEffectiveTemplateEmission;
  readonly currentFrontDoor: TemplateCompilationFrontDoorEmission;
  readonly compilerReadStore: Pick<KernelMaterializationReadView, 'readMaterializationsByOwner'>
    & ProductDetailReadView
    & KernelReadProjectionRevisionView;
  readonly traversalMode?: TemplateCompilerSiteCursorTraversalMode;
}

/** Shared exact bootstrap/bind/cursor run used by portable observation and context-family compilation. */
export class TemplateCompilerRootSiteRun {
  constructor(
    authority: object,
    readonly state: TemplateCompilerRootSiteRunState,
    readonly graphExact: TemplateCompilerNormalizedSiteIndexResult,
    readonly authoredBundleCount: number,
    readonly forest: TemplateCompilerOccurrenceForest | null,
    readonly execution: TemplateCompilerExecutionSession | null,
    readonly lane: TemplateCompilerExecutionLaneReference | null,
    readonly hook: TemplateCompilerHookBootstrapResult | null,
    readonly local: TemplateCompilerLocalExtractionResult | null,
    readonly bootstrapClosure: TemplateCompilerInvocationBootstrapClosure | null,
    readonly family: TemplateCompilationFamilyFrontDoorEmission | null,
    readonly binding: TemplateCompilerSiteInvocationBindingResult | null,
    readonly cursor: TemplateCompilerSiteCursorResult | null,
    readonly reasons: readonly TemplateCompilerRootSiteRunReason[],
  ) {
    const exact = state === TemplateCompilerRootSiteRunState.CursorTranscript;
    const exactBinding = binding?.binding ?? null;
    const exactTranscript = cursor?.transcript ?? null;
    if (
      authority !== rootSiteRunAuthority
      || exact !== (
        forest != null
        && execution != null
        && lane != null
        && graphExact.state === TemplateCompilerNormalizedSiteIndexState.GraphExact
        && graphExact.index != null
        && hook?.state === TemplateCompilerHookBootstrapState.Exact
        && local?.isExact() === true
        && bootstrapClosure != null
        && family != null
        && binding?.state === TemplateCompilerSiteInvocationBindingState.Exact
        && binding.binding != null
        && cursor?.state === TemplateCompilerSiteCursorResultState.Transcript
        && cursor.transcript != null
        && reasons.length === 0
      )
      || (exact && (
        execution!.forest !== forest
        || !execution!.sequence.readLanes().includes(lane!)
        || hook!.lane !== lane
        || local!.lane !== lane
        || bootstrapClosure!.lane !== lane
        || bootstrapClosure!.hookBootstrap !== hook
        || bootstrapClosure!.localExtraction !== local
        || execution!.bootstrapClosure(lane) !== bootstrapClosure
        || exactBinding!.execution !== execution
        || exactBinding!.forest !== forest
        || exactBinding!.lane !== lane
        || exactBinding!.bootstrapClosure !== bootstrapClosure
        || exactBinding!.graphExact !== graphExact
        || exactBinding!.compilation !== graphExact.index!.compilation
        || hook.compilerWorld !== exactBinding!.compilerWorld
        || exactBinding!.currentFamily !== family
        || exactTranscript!.binding !== exactBinding
        || authoredBundleCount !== graphExact.index!.attributeSites.length + graphExact.index!.textSites.length
      ))
    ) {
      throw new Error('Template compiler root-site run lost exact or unavailable stage ownership.');
    }
  }

  isTranscript(): boolean {
    return this.state === TemplateCompilerRootSiteRunState.CursorTranscript;
  }
}

export function executeTemplateCompilerRootSiteRun(
  request: TemplateCompilerRootSiteRunRequest,
): TemplateCompilerRootSiteRun {
  const graphExact = buildTemplateCompilerNormalizedSiteIndex(request.compilation);
  if (graphExact.state !== TemplateCompilerNormalizedSiteIndexState.GraphExact || graphExact.index == null) {
    return unavailable(
      TemplateCompilerRootSiteRunState.GraphMismatch,
      graphExact,
      0,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      graphExact.mismatches.map((mismatch) => new TemplateCompilerRootSiteRunReason(
        mismatch.mismatchKind,
        mismatch.summary,
      )),
    );
  }
  const authoredBundleCount = graphExact.index.attributeSites.length + graphExact.index.textSites.length;
  if (!request.browserEmission.isModuleConstructed() || !request.browserEmission.publication.isCurrent()) {
    return unavailable(
      TemplateCompilerRootSiteRunState.BindingMismatch,
      graphExact,
      authoredBundleCount,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      [new TemplateCompilerRootSiteRunReason(
        TemplateCompilerSiteInvocationBindingReasonKind.BrowserPublicationUnavailable,
        'Browser-effective compiler input belongs to a revoked or unavailable publication candidate.',
      )],
    );
  }
  const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(request.browserEmission);
  const execution = TemplateCompilerExecutionSession.createForForest(request.runKey, forest);
  const lane = execution.admitRootInvocation(request.compilation.localKey);
  const hook = executeTemplateCompilerHookBootstrap({
    execution,
    lane,
    compilerWorld: request.compilation.compilerWorld,
    executionOpenSeamHandle: request.browserEmission.publication.handles.openSeam(`${request.runKey}:hook-open`),
  });
  if (hook.state !== TemplateCompilerHookBootstrapState.Exact) {
    const state = hook.state === TemplateCompilerHookBootstrapState.Abrupt
      ? TemplateCompilerRootSiteRunState.HookAbrupt
      : TemplateCompilerRootSiteRunState.HookOpen;
    return unavailable(
      state,
      graphExact,
      authoredBundleCount,
      forest,
      execution,
      lane,
      hook,
      null,
      null,
      null,
      null,
      null,
      [new TemplateCompilerRootSiteRunReason(state, `Compiler hook bootstrap ended as '${hook.state}'.`)],
    );
  }

  const definitions = new LocalTemplateDefinitionMaterializer(request.browserEmission.publication);
  const local = executeTemplateCompilerLocalExtraction({
    execution,
    lane,
    hookBootstrap: hook,
    ownerName: request.compilation.definition.name,
    ownerCauseHandles: [
      request.compilation.definition.productHandle ?? request.compilation.unit.templateSource.productHandle,
    ],
    reserveDefinition: (invocationKey) => definitions.reserveOccurrenceDefinition(invocationKey),
  });
  if (!local.isExact()) {
    const state = local.state === TemplateCompilerLocalExtractionState.Abrupt
      ? TemplateCompilerRootSiteRunState.LocalAbrupt
      : TemplateCompilerRootSiteRunState.LocalRefused;
    const failure = local.failure;
    return unavailable(
      state,
      graphExact,
      authoredBundleCount,
      forest,
      execution,
      lane,
      hook,
      local,
      null,
      null,
      null,
      null,
      [new TemplateCompilerRootSiteRunReason(
        failure?.issueKind ?? state,
        failure?.summary ?? `Local extraction ended as '${local.state}'.`,
      )],
    );
  }
  const bootstrapClosure = execution.closeInvocationBootstrap(hook, local);
  if (local.state === TemplateCompilerLocalExtractionState.Extracted) {
    const state = TemplateCompilerRootSiteRunState.LocalExtractedUnsupported;
    return unavailable(
      state,
      graphExact,
      authoredBundleCount,
      forest,
      execution,
      lane,
      hook,
      local,
      bootstrapClosure,
      null,
      null,
      null,
      [new TemplateCompilerRootSiteRunReason(
        state,
        'Occurrence-backed local-template child lanes are not yet admitted to the root-site family compiler.',
      )],
    );
  }

  const family = request.currentFrontDoor.familyForOwner(request.compilation.familyOwnerHandle);
  if (family == null) {
    const state = TemplateCompilerRootSiteRunState.FamilyMissing;
    return unavailable(
      state,
      graphExact,
      authoredBundleCount,
      forest,
      execution,
      lane,
      hook,
      local,
      bootstrapClosure,
      null,
      null,
      null,
      [new TemplateCompilerRootSiteRunReason(state, 'Current front door has no exact compilation family owner.')],
    );
  }
  const binding = bindTemplateCompilerRootSiteInvocation({
    execution,
    bootstrapClosure,
    browserEmission: request.browserEmission,
    graphExact,
    currentFrontDoor: request.currentFrontDoor,
    currentFamily: family,
  });
  if (binding.state !== TemplateCompilerSiteInvocationBindingState.Exact || binding.binding == null) {
    return unavailable(
      TemplateCompilerRootSiteRunState.BindingMismatch,
      graphExact,
      authoredBundleCount,
      forest,
      execution,
      lane,
      hook,
      local,
      bootstrapClosure,
      family,
      binding,
      null,
      binding.reasons.map((reason) => new TemplateCompilerRootSiteRunReason(reason.reasonKind, reason.summary)),
    );
  }
  const cursor = executeTemplateCompilerRootSiteCursor({
    binding: binding.binding,
    compilerReads: new TemplateCompilerReadView(
      request.compilerReadStore,
      TemplateCompilerWorldAuthority.fixed(request.compilation.compilerWorld),
    ),
    preWalkAuthority: TemplateCompilerPreWalkRemainderAuthority.capture(binding.binding),
    traversalMode: request.traversalMode ?? TemplateCompilerSiteCursorTraversalMode.CompatibilityStop,
  });
  if (cursor.state !== TemplateCompilerSiteCursorResultState.Transcript || cursor.transcript == null) {
    return unavailable(
      TemplateCompilerRootSiteRunState.CursorMismatch,
      graphExact,
      authoredBundleCount,
      forest,
      execution,
      lane,
      hook,
      local,
      bootstrapClosure,
      family,
      binding,
      cursor,
      cursor.reasons.map((reason) => new TemplateCompilerRootSiteRunReason(reason.reasonKind, reason.summary)),
    );
  }
  return new TemplateCompilerRootSiteRun(
    rootSiteRunAuthority,
    TemplateCompilerRootSiteRunState.CursorTranscript,
    graphExact,
    authoredBundleCount,
    forest,
    execution,
    lane,
    hook,
    local,
    bootstrapClosure,
    family,
    binding,
    cursor,
    [],
  );
}

function unavailable(
  state: Exclude<TemplateCompilerRootSiteRunState, TemplateCompilerRootSiteRunState.CursorTranscript>,
  graphExact: TemplateCompilerNormalizedSiteIndexResult,
  authoredBundleCount: number,
  forest: TemplateCompilerOccurrenceForest | null,
  execution: TemplateCompilerExecutionSession | null,
  lane: TemplateCompilerExecutionLaneReference | null,
  hook: TemplateCompilerHookBootstrapResult | null,
  local: TemplateCompilerLocalExtractionResult | null,
  bootstrapClosure: TemplateCompilerInvocationBootstrapClosure | null,
  family: TemplateCompilationFamilyFrontDoorEmission | null,
  binding: TemplateCompilerSiteInvocationBindingResult | null,
  cursor: TemplateCompilerSiteCursorResult | null,
  reasons: readonly TemplateCompilerRootSiteRunReason[],
): TemplateCompilerRootSiteRun {
  return new TemplateCompilerRootSiteRun(
    rootSiteRunAuthority,
    state,
    graphExact,
    authoredBundleCount,
    forest,
    execution,
    lane,
    hook,
    local,
    bootstrapClosure,
    family,
    binding,
    cursor,
    reasons.length > 0 ? reasons : [new TemplateCompilerRootSiteRunReason(state, state)],
  );
}
