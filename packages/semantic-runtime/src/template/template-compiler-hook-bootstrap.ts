import type { ClaimEndpointHandle } from '../kernel/claim.js';
import type { OpenSeamHandle } from '../kernel/handles.js';
import { StaticCallableSlot } from '../evaluation/function-execution.js';
import {
  CssClassMappingPropertyState,
  type CssClassMappingAuthority,
} from './css-class-mapping.js';
import {
  TemplateCompilerHookCallableAuthorityKind,
  TemplateCompilerHookKind,
  TemplateCompilerHookMembershipState,
  TemplateCompilerHookProviderResolutionKind,
  type TemplateCompilerHookEntry,
  type TemplateCompilerHookSet,
} from './compiler-hook-world.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';
import {
  TemplateCompilerCallableReference,
  type TemplateCompilerBootstrapContextReference,
  type TemplateCompilerExecutionLaneReference,
  type TemplateCompilerExecutionSession,
  TemplateCompilerHookOperationStage,
  TemplateCompilerMutationBatchState,
  type TemplateCompilerOperation,
  TemplateCompilerOperationCompletion,
  TemplateCompilerOperationCompletionKind,
  TemplateCompilerOperationExecutionMechanism,
  TemplateCompilerOperationKind,
} from './template-compiler-execution.js';
import {
  TemplateCompilerElementOccurrence,
  type TemplateCompilerAttributeOccurrence,
  type TemplateCompilerFragmentOccurrence,
  type TemplateCompilerNodeOccurrence,
} from './template-compiler-occurrence.js';

export const enum TemplateCompilerHookBootstrapState {
  Exact = 'exact',
  Open = 'open',
  Abrupt = 'abrupt',
}

/** Product-free outcome of the pre-plan hook phase for one compiler invocation lane. */
export class TemplateCompilerHookBootstrapResult {
  constructor(
    readonly state: TemplateCompilerHookBootstrapState,
    readonly operations: readonly TemplateCompilerOperation[],
    readonly boundaryEntryOrdinal: number | null,
    readonly summary: string | null,
  ) {}
}

export interface TemplateCompilerHookBootstrapRequest {
  readonly execution: TemplateCompilerExecutionSession;
  readonly lane: TemplateCompilerExecutionLaneReference;
  readonly compilerWorld: TemplateCompilerWorldEmission;
  /** Query-owned fallback when exact callable authority reaches a consumer execution boundary. */
  readonly executionOpenSeamHandle: OpenSeamHandle;
}

class TemplateCompilerHookBootstrapFrame {
  private readonly context: TemplateCompilerBootstrapContextReference;
  private readonly hooks: TemplateCompilerHookSet;
  private readonly initialOperationCount: number;

  constructor(private readonly request: TemplateCompilerHookBootstrapRequest) {
    this.context = request.execution.bootstrapContext(request.lane);
    this.hooks = request.compilerWorld.compilerHooks;
    this.initialOperationCount = request.execution.sequence.readOperations().length;
  }

  execute(): TemplateCompilerHookBootstrapResult {
    if (this.hooks.membershipState === TemplateCompilerHookMembershipState.Open) {
      return this.finishBoundary(
        TemplateCompilerHookBootstrapState.Open,
        null,
        'TemplateCompilerHooks membership remains open before provider resolution.',
        this.recordOpenSetResolution(),
      );
    }

    const providerBoundary = this.hooks.firstProviderBoundaryOrdinal;
    if (providerBoundary != null) {
      const entry = this.hooks.entries[providerBoundary]!;
      return entry.provider.resolutionKind === TemplateCompilerHookProviderResolutionKind.Abrupt
        ? this.finishBoundary(
            TemplateCompilerHookBootstrapState.Abrupt,
            providerBoundary,
            entry.provider.reason ?? 'TemplateCompilerHooks provider resolution completed abruptly.',
            this.recordProviderAbrupt(providerBoundary, entry),
          )
        : this.finishBoundary(
            TemplateCompilerHookBootstrapState.Open,
            providerBoundary,
            entry.provider.reason ?? 'TemplateCompilerHooks provider resolution remains open.',
            this.recordProviderOpen(providerBoundary, entry),
          );
    }

    this.recordHookSetResolutionComplete();
    for (const [entryOrdinal, entry] of this.hooks.entries.entries()) {
      const boundary = this.executeEntry(entryOrdinal, entry);
      if (boundary != null) return boundary;
    }
    return new TemplateCompilerHookBootstrapResult(
      TemplateCompilerHookBootstrapState.Exact,
      this.readNewOperations(),
      null,
      null,
    );
  }

  private executeEntry(
    entryOrdinal: number,
    entry: TemplateCompilerHookEntry,
  ): TemplateCompilerHookBootstrapResult | null {
    switch (entry.callable.authorityKind) {
      case TemplateCompilerHookCallableAuthorityKind.Absent:
        this.recordCallableInspectionComplete(entryOrdinal, entry);
        return null;
      case TemplateCompilerHookCallableAuthorityKind.Abrupt:
        return this.finishBoundary(
          TemplateCompilerHookBootstrapState.Abrupt,
          entryOrdinal,
          entry.callable.reason ?? 'TemplateCompilerHooks compiling-member inspection completed abruptly.',
          this.recordCallableInspectionAbrupt(entryOrdinal, entry),
        );
      case TemplateCompilerHookCallableAuthorityKind.Open:
        return this.finishBoundary(
          TemplateCompilerHookBootstrapState.Open,
          entryOrdinal,
          entry.callable.reason ?? 'TemplateCompilerHooks compiling-member inspection remains open.',
          this.recordCallableInspectionOpen(entryOrdinal, entry),
        );
      case TemplateCompilerHookCallableAuthorityKind.StaticCallable:
        return this.staticCallableBoundary(entryOrdinal, entry);
      case TemplateCompilerHookCallableAuthorityKind.BuiltIn:
        return this.executeBuiltIn(entryOrdinal, entry);
    }
  }

  private staticCallableBoundary(
    entryOrdinal: number,
    entry: TemplateCompilerHookEntry,
  ): TemplateCompilerHookBootstrapResult {
    const slotKey = entry.callable.callableSlotKey;
    const target = slotKey == null
      ? null
      : this.request.compilerWorld.callableBindings.target(new StaticCallableSlot(slotKey));
    const summary = target == null
      ? 'TemplateCompilerHooks retained a static callable slot without current execution authority.'
      : 'Receiver-bearing TemplateCompilerHooks callable is exact, but no compiler-DOM execution host was admitted.';
    return this.finishBoundary(
      TemplateCompilerHookBootstrapState.Open,
      entryOrdinal,
      summary,
      this.recordInvocationOpen(
        entryOrdinal,
        entry,
        callableReference(this.hooks, entry),
        [this.request.executionOpenSeamHandle],
      ),
    );
  }

  private executeBuiltIn(
    entryOrdinal: number,
    entry: TemplateCompilerHookEntry,
  ): TemplateCompilerHookBootstrapResult | null {
    if (entry.hookKind !== TemplateCompilerHookKind.CssModules) {
      return this.finishBoundary(
        TemplateCompilerHookBootstrapState.Open,
        entryOrdinal,
        `Built-in compiler hook '${entry.hookKind}' has no semantic executor.`,
        this.recordInvocationOpen(
          entryOrdinal,
          entry,
          callableReference(this.hooks, entry),
          [this.request.executionOpenSeamHandle],
        ),
      );
    }
    const mapping = this.request.compilerWorld.cssClassMapping;
    if (
      entry.cssClassMapping == null
      || entry.cssClassMapping.productHandle !== mapping.productHandle
      || entry.cssClassMapping.identityHandle !== mapping.identityHandle
    ) {
      return this.finishBoundary(
        TemplateCompilerHookBootstrapState.Open,
        entryOrdinal,
        'CSS Modules hook does not reference the current compiler-world class mapping.',
        this.recordInvocationOpen(
          entryOrdinal,
          entry,
          callableReference(this.hooks, entry),
          [this.request.executionOpenSeamHandle],
        ),
      );
    }
    const effect = cssModulesEffect(this.context, mapping);
    if (effect.openClassName != null) {
      return this.finishBoundary(
        TemplateCompilerHookBootstrapState.Open,
        entryOrdinal,
        `CSS Modules mapping for class '${effect.openClassName}' remains open.`,
        this.recordInvocationOpen(
          entryOrdinal,
          entry,
          callableReference(this.hooks, entry),
          mappingOpenSeamHandles(mapping, this.request.executionOpenSeamHandle),
        ),
      );
    }

    const target = this.request.execution.compilerHookTarget(
      this.context,
      this.hooks,
      TemplateCompilerHookOperationStage.Invocation,
      entryOrdinal,
      callableReference(this.hooks, entry),
    );
    const attempt = this.request.execution.beginOperation({
      operationKey: this.entryOperationKey(entryOrdinal, 'invoke'),
      context: this.context,
      operationKind: TemplateCompilerOperationKind.CompilerHook,
      executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
      target,
      causeHandles: [this.hooks.productHandle, mapping.productHandle],
    });
    for (const rewrite of effect.rewrites) {
      this.request.execution.rewriteAttributeValue(attempt, rewrite.attribute, rewrite.value);
    }
    const operation = this.request.execution.completeOperation(
      attempt,
      complete(),
    );
    if (operation.mutationBatch.state !== TemplateCompilerMutationBatchState.Committed) {
      throw new Error(`Built-in CSS Modules hook '${operation.operationKey}' did not commit its exact mutation batch.`);
    }
    return null;
  }

  private recordOpenSetResolution(): TemplateCompilerOperation {
    const target = this.request.execution.compilerHookTarget(
      this.context,
      this.hooks,
      TemplateCompilerHookOperationStage.HookSetResolution,
      null,
    );
    return this.recordOperation(
      `${this.request.lane.localKey}:compiler-hooks:resolve`,
      TemplateCompilerOperationExecutionMechanism.NotAttempted,
      target,
      open(this.hookSetOpenSeams()),
      [this.hooks.productHandle],
    );
  }

  private recordHookSetResolutionComplete(): TemplateCompilerOperation {
    const target = this.request.execution.compilerHookTarget(
      this.context,
      this.hooks,
      TemplateCompilerHookOperationStage.HookSetResolution,
      null,
    );
    return this.recordOperation(
      `${this.request.lane.localKey}:compiler-hooks:resolve`,
      TemplateCompilerOperationExecutionMechanism.BuiltIn,
      target,
      complete(),
      [this.hooks.productHandle],
    );
  }

  private recordProviderOpen(entryOrdinal: number, entry: TemplateCompilerHookEntry): TemplateCompilerOperation {
    return this.recordEntryBoundary(
      entryOrdinal,
      entry,
      TemplateCompilerHookOperationStage.ProviderResolution,
      'provider',
      TemplateCompilerOperationExecutionMechanism.NotAttempted,
      open(withFallback(entry.provider.openSeamHandles, this.request.executionOpenSeamHandle)),
    );
  }

  private recordProviderAbrupt(entryOrdinal: number, entry: TemplateCompilerHookEntry): TemplateCompilerOperation {
    return this.recordEntryBoundary(
      entryOrdinal,
      entry,
      TemplateCompilerHookOperationStage.ProviderResolution,
      'provider',
      TemplateCompilerOperationExecutionMechanism.BuiltIn,
      abrupt(entry.provider.reason ?? 'TemplateCompilerHooks provider resolution completed abruptly.'),
    );
  }

  private recordCallableInspectionComplete(
    entryOrdinal: number,
    entry: TemplateCompilerHookEntry,
  ): TemplateCompilerOperation {
    return this.recordEntryBoundary(
      entryOrdinal,
      entry,
      TemplateCompilerHookOperationStage.CallableInspection,
      'inspect',
      TemplateCompilerOperationExecutionMechanism.BuiltIn,
      complete(),
    );
  }

  private recordCallableInspectionOpen(
    entryOrdinal: number,
    entry: TemplateCompilerHookEntry,
  ): TemplateCompilerOperation {
    return this.recordEntryBoundary(
      entryOrdinal,
      entry,
      TemplateCompilerHookOperationStage.CallableInspection,
      'inspect',
      TemplateCompilerOperationExecutionMechanism.NotAttempted,
      open(withFallback(entry.callable.openSeamHandles, this.request.executionOpenSeamHandle)),
    );
  }

  private recordCallableInspectionAbrupt(
    entryOrdinal: number,
    entry: TemplateCompilerHookEntry,
  ): TemplateCompilerOperation {
    return this.recordEntryBoundary(
      entryOrdinal,
      entry,
      TemplateCompilerHookOperationStage.CallableInspection,
      'inspect',
      TemplateCompilerOperationExecutionMechanism.BuiltIn,
      abrupt(entry.callable.reason ?? 'TemplateCompilerHooks callable inspection completed abruptly.'),
    );
  }

  private recordInvocationOpen(
    entryOrdinal: number,
    entry: TemplateCompilerHookEntry,
    callable: TemplateCompilerCallableReference,
    openSeamHandles: readonly OpenSeamHandle[],
  ): TemplateCompilerOperation {
    const target = this.request.execution.compilerHookTarget(
      this.context,
      this.hooks,
      TemplateCompilerHookOperationStage.Invocation,
      entryOrdinal,
      callable,
    );
    return this.recordOperation(
      this.entryOperationKey(entryOrdinal, 'invoke'),
      TemplateCompilerOperationExecutionMechanism.NotAttempted,
      target,
      open(withFallback(openSeamHandles, this.request.executionOpenSeamHandle)),
      entryCauseHandles(this.hooks, entry),
    );
  }

  private recordEntryBoundary(
    entryOrdinal: number,
    entry: TemplateCompilerHookEntry,
    operationStage: TemplateCompilerHookOperationStage.ProviderResolution
      | TemplateCompilerHookOperationStage.CallableInspection,
    operationSuffix: string,
    mechanism: TemplateCompilerOperationExecutionMechanism,
    completion: TemplateCompilerOperationCompletion,
  ): TemplateCompilerOperation {
    const target = this.request.execution.compilerHookTarget(
      this.context,
      this.hooks,
      operationStage,
      entryOrdinal,
    );
    return this.recordOperation(
      this.entryOperationKey(entryOrdinal, operationSuffix),
      mechanism,
      target,
      completion,
      entryCauseHandles(this.hooks, entry),
    );
  }

  private recordOperation(
    operationKey: string,
    mechanism: TemplateCompilerOperationExecutionMechanism,
    target: ReturnType<TemplateCompilerExecutionSession['compilerHookTarget']>,
    completion: TemplateCompilerOperationCompletion,
    causeHandles: readonly ClaimEndpointHandle[],
  ): TemplateCompilerOperation {
    const attempt = this.request.execution.beginOperation({
      operationKey,
      context: this.context,
      operationKind: TemplateCompilerOperationKind.CompilerHook,
      executionMechanism: mechanism,
      target,
      causeHandles,
    });
    return this.request.execution.completeOperation(attempt, completion);
  }

  private entryOperationKey(entryOrdinal: number, suffix: string): string {
    return `${this.request.lane.localKey}:compiler-hooks:entry:${entryOrdinal}:${suffix}`;
  }

  private hookSetOpenSeams(): readonly OpenSeamHandle[] {
    return withFallback(
      this.hooks.openReasons.flatMap((reason) => reason.openSeamHandles),
      this.request.executionOpenSeamHandle,
    );
  }

  private finishBoundary(
    state: TemplateCompilerHookBootstrapState.Open | TemplateCompilerHookBootstrapState.Abrupt,
    entryOrdinal: number | null,
    summary: string,
    _operation: TemplateCompilerOperation,
  ): TemplateCompilerHookBootstrapResult {
    return new TemplateCompilerHookBootstrapResult(
      state,
      this.readNewOperations(),
      entryOrdinal,
      summary,
    );
  }

  private readNewOperations(): readonly TemplateCompilerOperation[] {
    return this.request.execution.sequence.readOperations().slice(this.initialOperationCount);
  }
}

export function executeTemplateCompilerHookBootstrap(
  request: TemplateCompilerHookBootstrapRequest,
): TemplateCompilerHookBootstrapResult {
  return new TemplateCompilerHookBootstrapFrame(request).execute();
}

class CssClassAttributeRewrite {
  constructor(
    readonly attribute: TemplateCompilerAttributeOccurrence,
    readonly value: string,
  ) {}
}

class CssModulesEffect {
  constructor(
    readonly rewrites: readonly CssClassAttributeRewrite[],
    readonly openClassName: string | null,
  ) {}
}

function cssModulesEffect(
  context: TemplateCompilerBootstrapContextReference,
  mapping: CssClassMappingAuthority,
): CssModulesEffect {
  const rewrites: CssClassAttributeRewrite[] = [];
  for (const element of compilerHookElementOrder(context.compilerCarrier, context.compilerContent)) {
    const attribute = element.readAttributes().find((candidate) => candidate.name === 'class') ?? null;
    if (attribute == null || attribute.value.length === 0) continue;
    const tokens = attribute.value.split(/\s+/g);
    const mapped: string[] = [];
    for (const token of tokens) {
      const lookup = mapping.lookup(token);
      if (lookup.propertyState === CssClassMappingPropertyState.Open) {
        return new CssModulesEffect([], token);
      }
      mapped.push(
        lookup.propertyState === CssClassMappingPropertyState.Value
          ? lookup.mappedClassName || token
          : token,
      );
    }
    const value = mapped.join(' ');
    if (value !== attribute.value) rewrites.push(new CssClassAttributeRewrite(attribute, value));
  }
  return new CssModulesEffect(rewrites, null);
}

/** Framework order: carrier, ordinary querySelectorAll descendants, then each nested template content recursively. */
function compilerHookElementOrder(
  carrier: TemplateCompilerElementOccurrence,
  content: TemplateCompilerFragmentOccurrence,
): readonly TemplateCompilerElementOccurrence[] {
  const elements: TemplateCompilerElementOccurrence[] = [carrier];
  const visitContainer = (container: TemplateCompilerFragmentOccurrence): void => {
    const templates: TemplateCompilerElementOccurrence[] = [];
    const visitOrdinary = (node: TemplateCompilerNodeOccurrence): void => {
      if (node instanceof TemplateCompilerElementOccurrence) {
        elements.push(node);
        if (node.templateContent != null) templates.push(node);
      }
      for (const child of node.readChildren()) visitOrdinary(child);
    };
    for (const child of container.readChildren()) visitOrdinary(child);
    for (const template of templates) visitContainer(template.templateContent!);
  };
  visitContainer(content);
  return elements;
}

function callableReference(
  hooks: TemplateCompilerHookSet,
  entry: TemplateCompilerHookEntry,
): TemplateCompilerCallableReference {
  return new TemplateCompilerCallableReference(
    entry.cssClassMapping?.productHandle ?? entry.cause.productHandle ?? hooks.productHandle,
    entry.callable.identityHandle ?? entry.cause.identityHandle ?? hooks.identityHandle,
    entry.callable.sourceAddressHandle ?? entry.cause.sourceAddressHandle ?? hooks.sourceAddressHandle,
  );
}

function entryCauseHandles(
  hooks: TemplateCompilerHookSet,
  entry: TemplateCompilerHookEntry,
): readonly ClaimEndpointHandle[] {
  return entry.cause.productHandle == null
    ? [hooks.productHandle]
    : [hooks.productHandle, entry.cause.productHandle];
}

function mappingOpenSeamHandles(
  mapping: CssClassMappingAuthority,
  fallback: OpenSeamHandle,
): readonly OpenSeamHandle[] {
  return withFallback(
    mapping.openReasons.flatMap((reason) => reason.openSeamHandles),
    fallback,
  );
}

function withFallback(
  handles: readonly OpenSeamHandle[],
  fallback: OpenSeamHandle,
): readonly OpenSeamHandle[] {
  const unique = [...new Set(handles)];
  return unique.length === 0 ? [fallback] : unique;
}

function complete(): TemplateCompilerOperationCompletion {
  return new TemplateCompilerOperationCompletion(TemplateCompilerOperationCompletionKind.Complete);
}

function open(openSeamHandles: readonly OpenSeamHandle[]): TemplateCompilerOperationCompletion {
  return new TemplateCompilerOperationCompletion(
    TemplateCompilerOperationCompletionKind.Open,
    openSeamHandles,
  );
}

function abrupt(detail: string): TemplateCompilerOperationCompletion {
  return new TemplateCompilerOperationCompletion(
    TemplateCompilerOperationCompletionKind.Abrupt,
    [],
    detail,
  );
}
