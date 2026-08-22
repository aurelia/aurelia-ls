import {
  computationCommitCurrentnessError,
  ComputationCommitState,
  type ComputationGenerationAuthority,
  type ComputationLifecycleRegistry,
} from '../kernel/computation-lifecycle.js';
import {
  frameworkIntrinsicDiKeyLocal,
  frameworkIntrinsicDiKeys,
} from '../di/framework-intrinsic-di-key.js';
import { InterfaceDiKeyIdentity } from '../kernel/identity.js';
import { catalogGroupLocalKey, catalogVariantLocalKey } from '../kernel/local-key.js';
import {
  KernelPublicationPlan,
  type KernelPublicationContext,
} from '../kernel/publication.js';
import type { SourceFileRole } from '../kernel/address.js';
import { KernelStoreBatch, type KernelStore } from '../kernel/store.js';
import {
  BuiltInResourceCatalogEmission,
  BuiltInResourceCatalogMaterializer,
} from '../resources/built-in-resource-catalog-materializer.js';
import {
  allBuiltInResourceCatalogInputs,
  type BuiltInResourceCatalogInput,
} from '../resources/built-in-resources.js';
import {
  BuiltInSyntaxCatalogEmission,
  BuiltInSyntaxCatalogMaterializer,
  type BuiltInSyntaxCatalogInput,
} from '../template/built-in-syntax-catalog-materializer.js';
import {
  ExtensionBuiltInSyntaxCatalogs,
  RuntimeHtmlBuiltInSyntaxCatalogs,
} from '../template/built-in-syntax.js';
import {
  BuiltInRuntimeRendererCatalogEmission,
  BuiltInRuntimeRendererCatalogMaterializer,
  RuntimeRendererCatalogs,
  type BuiltInRuntimeRendererCatalogInput,
} from '../template/runtime-renderer-catalog-materializer.js';
import {
  TypeSystemProgramSourceAuthority,
  type TypeSystemProgramSourceCatalog,
  type TypeSystemProgramSourcePublication,
} from '../type-system/program-source-authority.js';

/** Stable framework catalogs borrowed by app and authoring computations. */
export interface FrameworkSupportCatalogs {
  materializeSyntaxCatalogs(inputs: readonly BuiltInSyntaxCatalogInput[]): BuiltInSyntaxCatalogEmission;
  materializeResourceCatalogs(inputs: readonly BuiltInResourceCatalogInput[]): BuiltInResourceCatalogEmission;
  materializeRendererCatalogs(inputs: readonly BuiltInRuntimeRendererCatalogInput[]): BuiltInRuntimeRendererCatalogEmission;
}

/** Workspace-lived analyzer support consumed while constructing complete app generations. */
export interface SemanticRuntimeSupport extends FrameworkSupportCatalogs, TypeSystemProgramSourceCatalog {}

class FrameworkSupportCatalogEntry<TEmission> {
  constructor(
    readonly emission: TEmission,
    readonly authority: ComputationGenerationAuthority,
  ) {}
}

/**
 * Owns semantic-runtime's immutable framework support corpus independently of every app generation.
 *
 * Registration selections, checker projections, and authored provenance remain app-owned. This authority only interns
 * semantic-runtime's modeled framework catalog facts so the first app that needs one cannot become its lifetime owner.
 * The logical catalog keys identify this analyzer corpus; installed-package profile selection is a separate concern.
 */
export class FrameworkSupportAuthority implements SemanticRuntimeSupport {
  private readonly syntaxByKey = new Map<string, FrameworkSupportCatalogEntry<BuiltInSyntaxCatalogEmission>>();
  private readonly resourcesByKey = new Map<string, FrameworkSupportCatalogEntry<BuiltInResourceCatalogEmission>>();
  private readonly renderersByKey = new Map<string, FrameworkSupportCatalogEntry<BuiltInRuntimeRendererCatalogEmission>>();
  private intrinsicDiKeyAuthority: ComputationGenerationAuthority | null = null;
  private readonly programSources: TypeSystemProgramSourceAuthority;

  constructor(
    private readonly store: KernelStore,
    private readonly lifecycle: ComputationLifecycleRegistry,
    workspaceKey: string,
    workspaceRootDir: string | null = null,
  ) {
    this.programSources = new TypeSystemProgramSourceAuthority(store, lifecycle, workspaceKey, workspaceRootDir);
  }

  sourceFile(
    publication: KernelPublicationContext,
    projectKey: string,
    fileName: string,
    role: SourceFileRole,
  ): TypeSystemProgramSourcePublication {
    return this.programSources.sourceFile(publication, projectKey, fileName, role);
  }

  /** Publish the fixed support corpus before any app-generation or answer-local lifetime begins. */
  initializeKnownSupport(): void {
    this.initializeIntrinsicDiKeyIdentities();
    this.materializeSyntaxCatalogs([
      ...Object.values(RuntimeHtmlBuiltInSyntaxCatalogs),
      ...Object.values(ExtensionBuiltInSyntaxCatalogs),
    ]);
    this.materializeResourceCatalogs(allBuiltInResourceCatalogInputs());
    this.materializeRendererCatalogs(Object.values(RuntimeRendererCatalogs));
  }

  private initializeIntrinsicDiKeyIdentities(): void {
    if (this.intrinsicDiKeyAuthority?.isCurrent() === true) {
      return;
    }
    const run = this.lifecycle.begin({
      kind: 'framework-support-di-keys',
      reconciliationKey: 'intrinsic',
      summary: 'Canonical framework-intrinsic DI key identities.',
    });
    run.publish(new KernelPublicationPlan(new KernelStoreBatch(
      frameworkIntrinsicDiKeys.map((key) => new InterfaceDiKeyIdentity(
        this.store.handles.identity(frameworkIntrinsicDiKeyLocal(key)),
        key,
      )),
      'framework-support-di-keys',
    )));
    const commit = run.commit();
    if (commit.state !== ComputationCommitState.Committed) {
      throw computationCommitCurrentnessError(
        commit,
        `Framework intrinsic DI keys were rejected as ${commit.state}.`,
      );
    }
    this.intrinsicDiKeyAuthority = this.lifecycle.admitCommittedGeneration(
      run.computationId,
      run.runSequence,
      'framework-support-di-keys',
    );
  }

  materializeSyntaxCatalogs(
    inputs: readonly BuiltInSyntaxCatalogInput[],
  ): BuiltInSyntaxCatalogEmission {
    const emissions = this.uniqueEmissions(
      inputs,
      catalogVariantLocalKey,
      this.syntaxByKey,
      'syntax',
      (publication, input) => new BuiltInSyntaxCatalogMaterializer(this.store, publication).materialize([input]),
    );
    return new BuiltInSyntaxCatalogEmission(
      emissions.flatMap((emission) => emission.catalogs),
      emissions.flatMap((emission) => emission.attributePatterns),
      emissions.flatMap((emission) => emission.bindingCommands),
      emissions.flatMap((emission) => emission.compiledPatterns),
      emissions.flatMap((emission) => emission.records),
    );
  }

  materializeResourceCatalogs(
    inputs: readonly BuiltInResourceCatalogInput[],
  ): BuiltInResourceCatalogEmission {
    const emissions = this.uniqueEmissions(
      inputs,
      catalogVariantLocalKey,
      this.resourcesByKey,
      'resource',
      (publication, input) => new BuiltInResourceCatalogMaterializer(this.store, publication).materialize([input]),
    );
    return new BuiltInResourceCatalogEmission(
      emissions.flatMap((emission) => emission.catalogs),
      emissions.flatMap((emission) => emission.resources),
      emissions.flatMap((emission) => emission.records),
    );
  }

  materializeRendererCatalogs(
    inputs: readonly BuiltInRuntimeRendererCatalogInput[],
  ): BuiltInRuntimeRendererCatalogEmission {
    const emissions = this.uniqueEmissions(
      inputs,
      catalogGroupLocalKey,
      this.renderersByKey,
      'renderer',
      (publication, input) => new BuiltInRuntimeRendererCatalogMaterializer(this.store, publication).materialize([input]),
    );
    return new BuiltInRuntimeRendererCatalogEmission(
      emissions.flatMap((emission) => emission.catalogs),
      emissions.flatMap((emission) => emission.renderers),
      emissions.flatMap((emission) => emission.records),
    );
  }

  private uniqueEmissions<TInput, TEmission>(
    inputs: readonly TInput[],
    keyFor: (input: TInput) => string,
    entries: Map<string, FrameworkSupportCatalogEntry<TEmission>>,
    kind: string,
    materialize: (publication: KernelPublicationContext, input: TInput) => TEmission,
  ): readonly TEmission[] {
    const emissions = new Map<string, TEmission>();
    for (const input of inputs) {
      const key = keyFor(input);
      if (!emissions.has(key)) {
        emissions.set(key, this.ensureCatalog(entries, kind, key, (publication) => materialize(publication, input)));
      }
    }
    return [...emissions.values()];
  }

  private ensureCatalog<TEmission>(
    entries: Map<string, FrameworkSupportCatalogEntry<TEmission>>,
    kind: string,
    key: string,
    materialize: (publication: KernelPublicationContext) => TEmission,
  ): TEmission {
    const current = entries.get(key) ?? null;
    if (current?.authority.isCurrent() === true) {
      return current.emission;
    }

    const run = this.lifecycle.begin({
      kind: 'framework-support-catalog',
      reconciliationKey: `${kind}:${key}`,
      summary: `Canonical ${kind} support catalog ${key}.`,
    });
    let emission: TEmission;
    try {
      emission = materialize(run);
    } catch (error) {
      run.abort();
      throw error;
    }
    const commit = run.commit();
    if (commit.state !== ComputationCommitState.Committed) {
      throw computationCommitCurrentnessError(
        commit,
        `Framework support catalog ${kind}:${key} was rejected as ${commit.state}.`,
      );
    }
    const authority = this.lifecycle.admitCommittedGeneration(
      run.computationId,
      run.runSequence,
      'framework-support-catalog',
    );
    entries.set(key, new FrameworkSupportCatalogEntry(emission, authority));
    return emission;
  }
}
