import path from 'node:path';

import { SourceSpanAddress, SourceSpanRole } from '../kernel/address.js';
import {
  type ComputationCommitResult,
  type ComputationId,
  type ComputationLocus,
  ComputationRecordReadView,
  type ComputationRun,
  type ComputationLifecycleRegistry,
} from '../kernel/computation-lifecycle.js';
import type { AddressHandle, IdentityHandle, ProductHandle } from '../kernel/handles.js';
import { KernelPublicationPlan } from '../kernel/publication.js';
import { sourceFileAddressForAddress, sourceSpanAddressForAddress } from '../kernel/source-address.js';
import { SourceTextSnapshotState } from '../kernel/source-text-snapshot.js';
import type {
  SourceTextSnapshot,
  SourceTextSnapshotAuthority,
} from '../kernel/source-text-snapshot.js';
import { KernelStoreBatch, type KernelStore, type KernelStoreReadView } from '../kernel/store.js';
import {
  CustomElementTemplateDefinition,
  CustomElementTemplateKind,
  CustomElementDefinition,
} from '../resources/custom-element-definition.js';
import type { SemanticRuntimeTelemetryOptions } from '../telemetry/options.js';
import {
  TemplateCompilerReadView,
  type TemplateCompilerWorldAuthority,
} from './compiler-read-view.js';
import {
  TemplateCompilationProjectPass,
  TemplateResourceCompilationRequest,
  type TemplateResourceCompilationEmission,
} from './template-compilation-project-pass.js';

export const enum TemplateCompilationCohortKind {
  /** App-admitted component compilation inside one app-root compiler cohort. */
  App = 'app',
  /** Standalone authoring compilation outside an admitted app-root cohort. */
  Authoring = 'authoring',
}

/** Stable domain locus for one top-level template compilation occurrence. */
export class TemplateCompilationLocus implements ComputationLocus {
  readonly kind = 'template-compilation';
  readonly reconciliationKey: string;
  readonly summary: string;

  constructor(
    readonly projectKey: string,
    readonly ownerHandle: IdentityHandle | ProductHandle,
    readonly cohortKind: TemplateCompilationCohortKind,
    readonly analysisContextProductHandle: ProductHandle,
    readonly appRootDefinitionProductHandle: ProductHandle | null,
  ) {
    this.reconciliationKey = encodeLocusParts([
      projectKey,
      ownerHandle,
      cohortKind,
      analysisContextProductHandle,
      appRootDefinitionProductHandle ?? 'no-app-root',
    ]);
    this.summary = `${cohortKind} template ${ownerHandle} in ${projectKey}`;
  }
}

/** Inputs needed to run one external-HTML front door inside a computation lifecycle. */
export class TemplateCompilationComputationRequest {
  constructor(
    readonly projectKey: string,
    readonly projectRootDir: string,
    readonly cohortKind: TemplateCompilationCohortKind,
    readonly analysisContextProductHandle: ProductHandle,
    readonly appRootDefinitionProductHandle: ProductHandle | null,
    readonly compilerWorldAuthority: TemplateCompilerWorldAuthority,
    /** Stable owner seed used to resolve the current definition from the admitted compiler world. */
    readonly definition: CustomElementDefinition,
  ) {}
}

/** Prepared compiler candidate whose staged publication is not visible until commit succeeds. */
export class TemplateCompilationComputationAttempt {
  constructor(
    private readonly run: ComputationRun,
    readonly locus: TemplateCompilationLocus,
    readonly source: SourceTextSnapshot | null,
    readonly candidateCompilation: TemplateResourceCompilationEmission | null,
  ) {}

  get computationId(): ComputationId {
    return this.run.computationId;
  }

  get runSequence(): number {
    return this.run.runSequence;
  }

  commit(): TemplateCompilationComputationResult {
    const commit = this.run.commit();
    return new TemplateCompilationComputationResult(
      this.locus,
      this.source,
      this.candidateCompilation,
      commit,
    );
  }
}

/** Outcome of validating and atomically publishing one prepared template compilation. */
export class TemplateCompilationComputationResult {
  constructor(
    readonly locus: TemplateCompilationLocus,
    readonly source: SourceTextSnapshot | null,
    /** Ephemeral assembly candidate; read canonical retained/replaced details from the store after a successful commit. */
    readonly candidateCompilation: TemplateResourceCompilationEmission | null,
    readonly commit: ComputationCommitResult,
  ) {}
}

class CapturedTemplateSource {
  constructor(
    readonly template: CustomElementTemplateDefinition,
    readonly sourceFileAddressHandle: AddressHandle,
    readonly snapshot: SourceTextSnapshot,
  ) {}
}

/** Same-runtime computation orchestration over the shared template front door. */
export class TemplateCompilationComputationService {
  constructor(
    private readonly store: KernelStore,
    private readonly lifecycle: ComputationLifecycleRegistry,
    private readonly sourceText: SourceTextSnapshotAuthority,
  ) {}

  prepare(
    request: TemplateCompilationComputationRequest,
    telemetry: SemanticRuntimeTelemetryOptions | null = null,
  ): TemplateCompilationComputationAttempt {
    const ownerHandle = request.definition.identityHandle ?? request.definition.productHandle;
    if (ownerHandle == null) {
      throw new Error(`Template ${request.definition.name} has no stable definition identity or product handle.`);
    }
    const locus = new TemplateCompilationLocus(
      request.projectKey,
      ownerHandle,
      request.cohortKind,
      request.analysisContextProductHandle,
      request.appRootDefinitionProductHandle,
    );
    const compilerReads = new TemplateCompilerReadView(this.store, request.compilerWorldAuthority);
    const recordReads = new ComputationRecordReadView(this.store);
    const visibleOwner = compilerReads.templateOwnerResource(request.definition);
    const definition = visibleOwner?.definition instanceof CustomElementDefinition
      ? visibleOwner.definition
      : null;
    const sourceAdmission = definition?.template == null
      ? null
      : this.captureTemplateSource(request, definition, definition.template, recordReads);
    const source = sourceAdmission?.snapshot ?? null;
    const run = this.lifecycle.begin(locus);

    let compilation: TemplateResourceCompilationEmission | null = null;
    if (
      definition != null
      && sourceAdmission != null
      && sourceAdmission.snapshot.state !== SourceTextSnapshotState.Absent
    ) {
      const localKey = `template-compilation:${run.computationId}`;
      const admittedTemplate = externalMarkupTemplateFromSnapshot(
        recordReads,
        run,
        localKey,
        sourceAdmission.template,
        sourceAdmission.sourceFileAddressHandle,
        sourceAdmission.snapshot,
      );
      const compilerWorld = compilerReads.world;
      compilation = new TemplateCompilationProjectPass(this.store, run).compileResourceFrontDoor(
        new TemplateResourceCompilationRequest(
          localKey,
          request.analysisContextProductHandle,
          request.appRootDefinitionProductHandle,
          compilerWorld,
          definition,
          admittedTemplate,
          compilerReads,
        ),
        telemetry,
      );
    }
    if (source != null) {
      run.observe(source);
    }
    for (const read of compilerReads.readAll()) {
      run.observe(read);
    }
    for (const read of recordReads.readAll()) {
      run.observe(read);
    }
    return new TemplateCompilationComputationAttempt(run, locus, source, compilation);
  }

  private captureTemplateSource(
    request: TemplateCompilationComputationRequest,
    definition: CustomElementDefinition,
    template: CustomElementTemplateDefinition,
    recordReads: ComputationRecordReadView,
  ): CapturedTemplateSource {
    const sourceFile = sourceFileAddressForAddress(recordReads, template.addressHandle);
    if (sourceFile == null) {
      throw new Error(`Template ${definition.name} has no authored source-file address.`);
    }
    const sourceFileName = path.isAbsolute(sourceFile.path)
      ? path.normalize(sourceFile.path)
      : path.resolve(request.projectRootDir, sourceFile.path);
    const source = this.sourceText.capture(sourceFileName);
    if (source.state === SourceTextSnapshotState.Unavailable) {
      throw new Error(`Template source ${sourceFileName} exists but its text is unavailable.`);
    }
    return new CapturedTemplateSource(template, sourceFile.handle, source);
  }
}

function externalMarkupTemplateFromSnapshot(
  store: KernelStoreReadView,
  run: ComputationRun,
  localKey: string,
  template: CustomElementTemplateDefinition,
  sourceFileAddressHandle: AddressHandle,
  source: SourceTextSnapshot,
): CustomElementTemplateDefinition {
  const sourceSpan = sourceSpanAddressForAddress(store, template.addressHandle);
  const isWholeFileMarkup = template.kind === CustomElementTemplateKind.Markup
    && template.sourceMap == null
    && (
      sourceSpan == null
      || (
        sourceSpan.start === 0
        && sourceSpan.end === (template.markup?.length ?? -1)
      )
    );
  if (!isWholeFileMarkup) {
    throw new Error(
      'Template computation currently admits external HTML only; inline templates require '
      + 'their evaluator decode and source-map authority to share the same immutable source snapshot.',
    );
  }
  const markup = source.requireText();
  const addressHandle = store.handles.address(`${localKey}:authored-source`);
  run.publish(new KernelPublicationPlan(new KernelStoreBatch([
    new SourceSpanAddress(
      addressHandle,
      sourceFileAddressHandle,
      0,
      markup.length,
      SourceSpanRole.Primary,
    ),
  ], `${localKey}:authored-source`)));
  return new CustomElementTemplateDefinition(
    CustomElementTemplateKind.Markup,
    markup,
    addressHandle,
    null,
  );
}

function encodeLocusParts(parts: readonly string[]): string {
  return parts.map((part) => `${part.length}:${part}`).join('|');
}
