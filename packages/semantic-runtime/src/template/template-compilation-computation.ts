import path from 'node:path';

import { SourceSpanAddress, SourceSpanRole } from '../kernel/address.js';
import {
  type ComputationCommitResult,
  type ComputationId,
  type ComputationLocus,
  type ComputationRead,
  type ComputationReadValidation,
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
} from './compiler-read-view.js';
import {
  encodeTemplateCompilationKeyParts,
  type TemplateCompilationCohort,
  type TemplateCompilationCohortSetAuthority,
} from './template-compilation-cohort.js';
import {
  TemplateCompilationProjectPass,
  TemplateResourceFamilyCompilationRequest,
  type TemplateResourceCompilationEmission,
} from './template-compilation-project-pass.js';

/** Stable domain locus for one top-level authored template family. */
export class TemplateCompilationLocus implements ComputationLocus {
  readonly kind = 'template-compilation';
  readonly reconciliationKey: string;
  readonly summary: string;

  constructor(
    readonly projectKey: string,
    readonly ownerHandle: IdentityHandle | ProductHandle,
  ) {
    this.reconciliationKey = encodeTemplateCompilationKeyParts([
      projectKey,
      ownerHandle,
    ]);
    this.summary = `template family ${ownerHandle} in ${projectKey}`;
  }
}

/** Inputs needed to run one external-HTML template family inside a computation lifecycle. */
export class TemplateCompilationComputationRequest {
  constructor(
    readonly projectKey: string,
    readonly projectRootDir: string,
    readonly cohortSetAuthority: TemplateCompilationCohortSetAuthority,
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
    readonly candidateCompilations: readonly TemplateResourceCompilationEmission[],
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
      this.candidateCompilations,
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
    readonly candidateCompilations: readonly TemplateResourceCompilationEmission[],
    readonly commit: ComputationCommitResult,
  ) {}
}

class CapturedTemplateSource {
  constructor(
    readonly template: CustomElementTemplateDefinition,
    readonly sourceFileAddressHandle: AddressHandle,
    readonly snapshot: SourceTextSnapshot,
    readonly sourceSpanStart: number | null,
    readonly sourceSpanEnd: number | null,
  ) {}
}

class ResolvedTemplateCompilationCohort {
  constructor(
    readonly cohort: TemplateCompilationCohort,
    readonly compilerReads: TemplateCompilerReadView,
    readonly definition: CustomElementDefinition | null,
  ) {}
}

class TemplateCompilationCohortSetRead implements ComputationRead {
  readonly domain = 'template-compilation-cohorts';
  readonly readKey: string;
  readonly observedRevision: string;

  constructor(
    private readonly authority: TemplateCompilationCohortSetAuthority,
    projectKey: string,
    ownerHandle: IdentityHandle | ProductHandle,
    readonly cohorts: readonly TemplateCompilationCohort[],
  ) {
    this.readKey = `template-compilation-cohorts:${encodeTemplateCompilationKeyParts([projectKey, ownerHandle])}`;
    this.observedRevision = cohortSetRevision(cohorts);
  }

  validate(): ComputationReadValidation {
    const currentRevision = cohortSetRevision(this.authority.current());
    return {
      isCurrent: currentRevision === this.observedRevision,
      currentRevision,
      changedFacets: currentRevision === this.observedRevision ? [] : ['membership'],
    };
  }
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
    );
    const run = this.lifecycle.begin(locus);
    const cohortSet = new TemplateCompilationCohortSetRead(
      request.cohortSetAuthority,
      request.projectKey,
      ownerHandle,
      request.cohortSetAuthority.current(),
    );
    const recordReads = new ComputationRecordReadView(this.store);
    const resolvedCohorts = cohortSet.cohorts.map((cohort) => {
      const compilerReads = new TemplateCompilerReadView(run, cohort.compilerWorldAuthority);
      const visibleOwner = compilerReads.templateOwnerResource(request.definition);
      return new ResolvedTemplateCompilationCohort(
        cohort,
        compilerReads,
        visibleOwner?.definition instanceof CustomElementDefinition
          ? visibleOwner.definition
          : null,
      );
    });
    const sourceAdmissions = resolvedCohorts.flatMap((resolved) =>
      resolved.definition?.template == null
        ? []
        : [this.captureTemplateSource(request, resolved.definition, resolved.definition.template, recordReads)]
    );
    if (
      sourceAdmissions.length > 0
      && resolvedCohorts.some((resolved) => resolved.definition != null && resolved.definition.template == null)
    ) {
      throw new Error(`Compiler cohorts disagree on whether template ${request.definition.name} has an authored source.`);
    }
    const sourceAdmission = coherentSourceAdmission(request.definition, sourceAdmissions);
    const source = sourceAdmission?.snapshot ?? null;
    const compilations: TemplateResourceCompilationEmission[] = [];
    if (sourceAdmission != null && sourceAdmission.snapshot.state !== SourceTextSnapshotState.Absent) {
      const familyLocalKey = `template-family:${run.computationId}`;
      const admittedTemplate = externalMarkupTemplateFromSnapshot(
        recordReads,
        run,
        familyLocalKey,
        sourceAdmission.template,
        sourceAdmission.sourceFileAddressHandle,
        sourceAdmission.snapshot,
      );
      const pass = new TemplateCompilationProjectPass(this.store, run);
      for (const resolved of resolvedCohorts) {
        if (resolved.definition == null) {
          continue;
        }
        compilations.push(...pass.compileResourceFamilyFrontDoor(
          new TemplateResourceFamilyCompilationRequest(
            `${familyLocalKey}:cohort:${resolved.cohort.key}`,
            resolved.cohort.analysisContextProductHandle,
            resolved.cohort.appRootDefinitionProductHandle,
            resolved.cohort.compilerWorldAuthority,
            resolved.definition,
            admittedTemplate,
          ),
          null,
          telemetry,
        ));
      }
    }
    run.observe(cohortSet);
    if (source != null) {
      run.observe(source);
    }
    for (const resolved of resolvedCohorts) {
      for (const read of resolved.compilerReads.readAll()) {
        run.observe(read);
      }
    }
    for (const compilation of compilations) {
      for (const read of compilation.registeredReads) {
        run.observe(read);
      }
    }
    for (const read of recordReads.readAll()) {
      run.observe(read);
    }
    return new TemplateCompilationComputationAttempt(run, locus, source, compilations);
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
    const sourceSpan = sourceSpanAddressForAddress(recordReads, template.addressHandle);
    const sourceFileName = path.isAbsolute(sourceFile.path)
      ? path.normalize(sourceFile.path)
      : path.resolve(request.projectRootDir, sourceFile.path);
    const source = this.sourceText.capture(sourceFileName);
    if (source.state === SourceTextSnapshotState.Unavailable) {
      throw new Error(`Template source ${sourceFileName} exists but its text is unavailable.`);
    }
    return new CapturedTemplateSource(
      template,
      sourceFile.handle,
      source,
      sourceSpan?.start ?? null,
      sourceSpan?.end ?? null,
    );
  }
}

function coherentSourceAdmission(
  definition: CustomElementDefinition,
  admissions: readonly CapturedTemplateSource[],
): CapturedTemplateSource | null {
  const first = admissions[0] ?? null;
  if (first == null) {
    return null;
  }
  for (const admission of admissions.slice(1)) {
    if (
      admission.sourceFileAddressHandle !== first.sourceFileAddressHandle
      || admission.snapshot.fileName !== first.snapshot.fileName
      || admission.snapshot.observedRevision !== first.snapshot.observedRevision
      || admission.sourceSpanStart !== first.sourceSpanStart
      || admission.sourceSpanEnd !== first.sourceSpanEnd
    ) {
      throw new Error(`Compiler cohorts disagree on the authored source for template ${definition.name}.`);
    }
  }
  return first;
}

function cohortSetRevision(cohorts: readonly TemplateCompilationCohort[]): string {
  return encodeTemplateCompilationKeyParts(cohorts.map((cohort) => cohort.key));
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
