import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  createSemanticRuntime,
  FrameworkCapabilityConfigurationState,
  FrameworkDiEffectCoverageState,
  type SemanticAppNominatedEntry,
} from '@aurelia-ls/semantic-runtime';
import {
  materializeSemanticAppTemplateCompilerHandoffs,
  materializeSemanticAppStandardConfigurationSourceAttachments,
  CustomElementTemplateModuleRole,
  ResourceCarrierKind,
  StandardConfigurationSourceCarrierKind,
  TemplateCompilerCompiledHandoffState,
  type SemanticAppTemplateCompilerHandoffResource,
  type StandardConfigurationSourceAttachment,
  type TemplateCompilerCompiledHandoffValue,
} from '@aurelia-ls/semantic-runtime/browser-template';
import {
  AotCompilerPatchModuleEmitter,
  type AotCompilerPatchModuleArtifact,
} from './compiler-patch-module-emitter.js';
import {
  AOT_COMPILER_PATCH_RUNTIME_MODULE_ID,
  AOT_COMPILER_PATCH_RUNTIME_MODULE_SOURCE,
} from './compiler-patch-runtime-module.js';
import {
  AotSourceTransformEmitter,
  AotSourceTransformError,
  type AotSourceTransformArtifact,
  type AotSourceTransformBrowserFacadePlan,
  type AotSourceTransformConfigurationPlan,
  type AotSourceTransformResourcePlan,
} from './source-transform.js';
import {
  AotRuntimeConfigurationModuleEmitter,
  AotRuntimeConfigurationPlan,
  type AotRuntimeConfigurationModuleArtifact,
} from './runtime-configuration.js';
import {
  AotArtifactError,
  AotTemplateModuleEmitter,
  createAotRawSourceMap,
  digestAotArtifact,
  type AotRawSourceMap,
  type AotTemplateModuleArtifact,
} from './template-module-emitter.js';

export const AOT_COMPILER_PATCH_PAYLOAD_MODULE_PREFIX = 'virtual:aurelia-aot/payload/';

export type SemanticAotRuntimeConfigurationMode =
  | 'preserve'
  | 'replace-explicit'
  | 'require-replaceable';

export interface SemanticAotBuildRequest {
  readonly root: string;
  readonly mode: string;
  readonly environmentName: string;
  readonly sourcemap: boolean | 'inline' | 'hidden';
  /** Explicit dormant app factory activation; exported functions are never executed merely because they exist. */
  readonly nominatedEntry?: SemanticAppNominatedEntry | null;
  /** Omit to preserve every authored StandardConfiguration occurrence. */
  readonly runtimeConfiguration?: SemanticAotRuntimeConfigurationMode;
}

export interface SemanticAotTemplateRequest {
  readonly sourcePath: string;
}

export interface SemanticAotTemplateArtifact {
  readonly sourcePath: string;
  readonly code: string;
  readonly map: AotRawSourceMap;
  readonly digest: string;
  readonly payload: SemanticAotTemplatePayloadReference | null;
}

export interface SemanticAotTemplatePayloadReference {
  readonly carrierSourcePath: string;
  readonly resourceKey: string;
  readonly compilerVariantKey: string;
  readonly definitionName: string;
  readonly payloadSpecifier: string;
  readonly payloadDigest: string;
}

export interface SemanticAotSourceTransformRequest {
  readonly sourcePath: string;
  readonly code: string;
}

export type SemanticAotSourceTransformArtifact = AotSourceTransformArtifact;

export interface SemanticAotVirtualModuleRequest {
  readonly specifier: string;
}

export interface SemanticAotVirtualModuleArtifact {
  readonly specifier: string;
  readonly code: string;
  readonly map: AotRawSourceMap | null;
  readonly digest: string;
}

export interface SemanticAotArtifactEvidence {
  readonly generation: string;
  readonly analysisCount: 1;
  readonly artifacts: readonly {
    readonly sourcePath: string;
    readonly carrierSourcePath: string;
    readonly resourceKey: string;
    readonly compilerVariantKey: string;
    readonly payloadSpecifier: string;
    readonly definitionName: string;
    readonly needsCompile: false;
    readonly digest: string;
    readonly map: AotRawSourceMap;
  }[];
  readonly runtimeConfiguration: SemanticAotRuntimeConfigurationEvidence;
}

export interface SemanticAotRuntimeConfigurationEvidence {
  readonly mode: SemanticAotRuntimeConfigurationMode;
  readonly occurrences: readonly SemanticAotRuntimeConfigurationOccurrenceEvidence[];
  readonly modules: readonly {
    readonly moduleSpecifier: string;
    readonly planDigest: string;
    readonly digest: string;
    readonly enableCoercion: boolean;
    readonly coerceNullish: boolean;
  }[];
}

export interface SemanticAotRuntimeConfigurationOccurrenceEvidence {
  readonly operationProductHandle: string;
  readonly operationOrdinal: number;
  readonly carrierKind: string;
  readonly coverageState: string;
  readonly openSummary: string | null;
  readonly nestedDiCoverageState: string;
  readonly nestedDiOpenSummary: string | null;
  readonly sourcePath: string | null;
  readonly start: number | null;
  readonly end: number | null;
  readonly disposition: 'preserved' | 'replaced' | 'non-replaceable';
  readonly moduleSpecifier: string | null;
  readonly reasonKind: string | null;
  readonly reason: string | null;
}

interface PendingResourceArtifact {
  readonly projectRoot: string;
  readonly templateSourcePath: string;
  readonly carrierSourcePath: string;
  readonly resourceKey: string;
  readonly compilerVariantKey: string;
  readonly payloadSpecifier: string;
  readonly handoff: TemplateCompilerCompiledHandoffValue;
}

interface PendingRuntimeConfigurationReplacement {
  readonly sourcePath: string;
  readonly configuration: AotSourceTransformConfigurationPlan | null;
  readonly browserFacade: AotSourceTransformBrowserFacadePlan | null;
}

interface RuntimeConfigurationBuildPlan {
  readonly replacements: readonly PendingRuntimeConfigurationReplacement[];
  readonly artifacts: ReadonlyMap<string, AotRuntimeConfigurationModuleArtifact>;
  readonly evidence: SemanticAotRuntimeConfigurationEvidence;
}

export class SemanticAotBuildSession {
  readonly #pendingByVariant: ReadonlyMap<string, PendingResourceArtifact>;
  readonly #pendingByPayloadSpecifier: ReadonlyMap<string, PendingResourceArtifact>;
  readonly #pendingByCarrierPath: ReadonlyMap<string, readonly PendingResourceArtifact[]>;
  readonly #pendingByTemplatePath: ReadonlyMap<string, readonly PendingResourceArtifact[]>;
  readonly #configurationByCarrierPath: ReadonlyMap<string, readonly PendingRuntimeConfigurationReplacement[]>;
  readonly #configurationArtifacts: ReadonlyMap<string, AotRuntimeConfigurationModuleArtifact>;
  readonly #runtimeConfigurationEvidence: SemanticAotRuntimeConfigurationEvidence;
  readonly #templateArtifactsByVariant = new Map<string, AotTemplateModuleArtifact>();
  readonly #patchArtifactPromisesByVariant = new Map<string, Promise<AotCompilerPatchModuleArtifact>>();
  readonly #evidenceByVariant = new Map<string, SemanticAotArtifactEvidence['artifacts'][number]>();
  readonly #fullEmitter = new AotTemplateModuleEmitter();
  readonly #patchEmitter = new AotCompilerPatchModuleEmitter();
  readonly #sourceEmitter = new AotSourceTransformEmitter();

  public constructor(
    readonly generation: string,
    pending: readonly PendingResourceArtifact[],
    runtimeConfiguration: RuntimeConfigurationBuildPlan,
  ) {
    this.#pendingByVariant = new Map(pending.map((artifact) => [artifact.compilerVariantKey, artifact]));
    this.#pendingByPayloadSpecifier = new Map(pending.map((artifact) => [artifact.payloadSpecifier, artifact]));
    if (this.#pendingByVariant.size !== pending.length || this.#pendingByPayloadSpecifier.size !== pending.length) {
      throw new Error('AOT semantic build produced duplicate resource compiler variants.');
    }
    this.#pendingByCarrierPath = groupPendingByPath(pending, (artifact) => artifact.carrierSourcePath);
    this.#pendingByTemplatePath = groupPendingByPath(pending, (artifact) => artifact.templateSourcePath);
    this.#configurationByCarrierPath = groupPendingByPath(
      runtimeConfiguration.replacements,
      (replacement) => replacement.sourcePath,
    );
    this.#configurationArtifacts = runtimeConfiguration.artifacts;
    this.#runtimeConfigurationEvidence = runtimeConfiguration.evidence;
  }

  public async artifactFor(request: SemanticAotTemplateRequest): Promise<SemanticAotTemplateArtifact> {
    const key = canonicalPath(request.sourcePath);
    const candidates = this.#pendingByTemplatePath.get(key) ?? [];
    if (candidates.length !== 1) {
      throw new AotArtifactError(
        'AOT_ARTIFACT_INVALID_HANDOFF',
        candidates.length === 0
          ? `No exact semantic AOT handoff exists for '${request.sourcePath}'.`
          : `Template source '${request.sourcePath}' belongs to ${candidates.length} resource variants and cannot identify one standalone module.`,
        request.sourcePath,
      );
    }
    const pending = candidates[0]!;
    const bridge = pending.handoff.address.sourceAttachment?.templateModuleRole
      === CustomElementTemplateModuleRole.TemplateValue;
    const compilerPayload = await this.#patchArtifactFor(pending);
    this.#recordEvidence(pending, compilerPayload);
    let artifact = this.#templateArtifactsByVariant.get(pending.compilerVariantKey);
    if (artifact == null) {
      const sourceText = await readFile(pending.templateSourcePath, 'utf8');
      const emissionRequest = {
        handoff: pending.handoff,
        projectRoot: pending.projectRoot,
        sourcePath: pending.templateSourcePath,
        sourceText,
      };
      if (bridge) {
        const code = `export { template, template as default } from ${JSON.stringify(pending.payloadSpecifier)};\n`;
        const map = createAotRawSourceMap(emissionRequest, '?aurelia-aot-template-bridge');
        artifact = {
          sourcePath: pending.templateSourcePath,
          definitionName: pending.handoff.resourceName,
          needsCompile: false,
          code,
          map,
          digest: digestAotArtifact(code, map),
        };
      } else {
        artifact = this.#fullEmitter.emit(emissionRequest);
      }
      this.#templateArtifactsByVariant.set(pending.compilerVariantKey, artifact);
    }
    return {
      sourcePath: request.sourcePath,
      code: artifact.code,
      map: artifact.map,
      digest: artifact.digest,
      payload: !bridge
        ? null
        : {
            carrierSourcePath: pending.carrierSourcePath,
            resourceKey: pending.resourceKey,
            compilerVariantKey: pending.compilerVariantKey,
            definitionName: pending.handoff.resourceName,
            payloadSpecifier: pending.payloadSpecifier,
            payloadDigest: compilerPayload.digest,
          },
    };
  }

  public async transformSource(
    request: SemanticAotSourceTransformRequest,
  ): Promise<SemanticAotSourceTransformArtifact | null> {
    const pending = this.#pendingByCarrierPath.get(canonicalPath(request.sourcePath)) ?? [];
    const runtimeReplacements = this.#configurationByCarrierPath.get(canonicalPath(request.sourcePath)) ?? [];
    if (pending.length === 0 && runtimeReplacements.length === 0) return null;
    const plans = await Promise.all(pending.map(async (resource): Promise<AotSourceTransformResourcePlan> => {
      const artifact = await this.#patchArtifactFor(resource);
      const attachment = resource.handoff.address.sourceAttachment;
      if (attachment == null) {
        throw new AotArtifactError(
          'AOT_ARTIFACT_INVALID_HANDOFF',
          `AOT handoff '${resource.handoff.resourceName}' has no resource source attachment.`,
          request.sourcePath,
        );
      }
      const root = rootDefinition(resource.handoff);
      validateAotCarrierPatchHandoff(resource.handoff, request.sourcePath);
      return {
        resourceKey: resource.resourceKey,
        compilerVariantKey: resource.compilerVariantKey,
        definitionName: resource.handoff.resourceName,
        carrierKind: attachment.carrierKind,
        carrier: attachment.carrier,
        targetLocalName: root.header.target?.localName ?? null,
        targetDeclaration: attachment.targetDeclaration,
        payloadSpecifier: resource.payloadSpecifier,
        payloadDigest: artifact.digest,
      };
    }));
    return this.#sourceEmitter.emit({
      sourcePath: request.sourcePath,
      code: request.code,
      resources: collapseEquivalentAotResourcePlans(request.sourcePath, plans),
      configurations: runtimeReplacements.flatMap((replacement) =>
        replacement.configuration == null ? [] : [replacement.configuration]
      ),
      browserFacades: runtimeReplacements.flatMap((replacement) =>
        replacement.browserFacade == null ? [] : [replacement.browserFacade]
      ),
      runtimeModuleSpecifier: AOT_COMPILER_PATCH_RUNTIME_MODULE_ID,
    });
  }

  public async virtualModuleFor(
    request: SemanticAotVirtualModuleRequest,
  ): Promise<SemanticAotVirtualModuleArtifact | null> {
    if (request.specifier === AOT_COMPILER_PATCH_RUNTIME_MODULE_ID) {
      return {
        specifier: request.specifier,
        code: AOT_COMPILER_PATCH_RUNTIME_MODULE_SOURCE,
        map: null,
        digest: `sha256:${createHash('sha256').update(AOT_COMPILER_PATCH_RUNTIME_MODULE_SOURCE).digest('hex')}`,
      };
    }
    const configuration = this.#configurationArtifacts.get(request.specifier);
    if (configuration != null) {
      return {
        specifier: configuration.moduleId,
        code: configuration.code,
        map: null,
        digest: configuration.digest,
      };
    }
    const pending = this.#pendingByPayloadSpecifier.get(request.specifier);
    if (pending == null) return null;
    const artifact = await this.#patchArtifactFor(pending);
    this.#recordEvidence(pending, artifact);
    return {
      specifier: request.specifier,
      code: artifact.code,
      map: artifact.map,
      digest: artifact.digest,
    };
  }

  async #patchArtifactFor(pending: PendingResourceArtifact): Promise<AotCompilerPatchModuleArtifact> {
    let artifact = this.#patchArtifactPromisesByVariant.get(pending.compilerVariantKey);
    if (artifact != null) return artifact;
    artifact = this.#emitPatchArtifact(pending);
    this.#patchArtifactPromisesByVariant.set(pending.compilerVariantKey, artifact);
    return artifact;
  }

  async #emitPatchArtifact(pending: PendingResourceArtifact): Promise<AotCompilerPatchModuleArtifact> {
    const sourceText = await readFile(pending.templateSourcePath, 'utf8');
    return this.#patchEmitter.emit({
      handoff: pending.handoff,
      projectRoot: pending.projectRoot,
      sourcePath: pending.templateSourcePath,
      sourceText,
    });
  }

  #recordEvidence(
    pending: PendingResourceArtifact,
    artifact: Pick<AotTemplateModuleArtifact, 'sourcePath' | 'definitionName' | 'needsCompile' | 'digest' | 'map'>,
  ): void {
    this.#evidenceByVariant.set(pending.compilerVariantKey, {
      sourcePath: artifact.sourcePath,
      carrierSourcePath: pending.carrierSourcePath,
      resourceKey: pending.resourceKey,
      compilerVariantKey: pending.compilerVariantKey,
      payloadSpecifier: pending.payloadSpecifier,
      definitionName: artifact.definitionName,
      needsCompile: artifact.needsCompile,
      digest: artifact.digest,
      map: copyRawSourceMap(artifact.map),
    });
  }

  public evidence(): SemanticAotArtifactEvidence {
    return {
      generation: this.generation,
      analysisCount: 1,
      artifacts: [...this.#evidenceByVariant.values()],
      runtimeConfiguration: this.#runtimeConfigurationEvidence,
    };
  }
}

/** Whole-project semantic-runtime provider structurally compatible with the Vite AOT adapter. */
export class SemanticAotArtifactProvider {
  #lastSession: SemanticAotBuildSession | null = null;

  public async openBuild(request: SemanticAotBuildRequest): Promise<SemanticAotBuildSession> {
    const root = path.resolve(request.root);
    const storeKey = `aot-build:${createHash('sha256').update(root).digest('hex').slice(0, 24)}`;
    const runtime = await createSemanticRuntime({
      workspaceRoot: root,
      projectDiscovery: 'single-root',
      storeKey,
    });
    try {
      const app = await runtime.openApp({
        analysisDepth: 'runtime-topology',
        includeAuthoringTemplates: true,
        telemetry: { inquiryProfile: 'aot' },
        nominatedEntry: request.nominatedEntry,
      });
      const batch = materializeSemanticAppTemplateCompilerHandoffs({
        app,
        includeAuthoringResources: true,
      });
      const runtimeConfiguration = runtimeConfigurationBuildPlan(
        root,
        request.runtimeConfiguration ?? 'preserve',
        materializeSemanticAppStandardConfigurationSourceAttachments(app),
      );
      const unavailable = batch.resources.filter((resource) =>
        resource.state !== TemplateCompilerCompiledHandoffState.Exact
      );
      if (unavailable.length > 0) {
        throw unavailableHandoffError(root, unavailable);
      }
      const pending = batch.resources.map((resource): PendingResourceArtifact => {
        if (resource.value == null) {
          throw new Error('Exact semantic AOT handoff unexpectedly has no value.');
        }
        const templateSourcePath = resource.source?.path;
        const attachment = resource.value.address.sourceAttachment;
        if (templateSourcePath == null || attachment == null) {
          throw new AotArtifactError(
            'AOT_ARTIFACT_INVALID_HANDOFF',
            `AOT handoff '${resource.value.resourceName}' has no authored template path or resource source attachment.`,
            root,
          );
        }
        const absoluteTemplateSourcePath = path.isAbsolute(templateSourcePath)
          ? templateSourcePath
          : path.resolve(app.project.rootDir, templateSourcePath);
        const compilerVariantKey = compilerVariantKeyFor(resource.value);
        return {
          projectRoot: app.project.rootDir,
          templateSourcePath: absoluteTemplateSourcePath,
          carrierSourcePath: path.resolve(attachment.carrier.sourceFilePath),
          resourceKey: resource.value.address.definitionProductHandle,
          compilerVariantKey,
          payloadSpecifier: `${AOT_COMPILER_PATCH_PAYLOAD_MODULE_PREFIX}${compilerVariantKey.slice('sha256:'.length)}`,
          handoff: resource.value,
        };
      });
      app.requireCurrent();
      const generation = `${app.analysisGenerationReference.computationId}:${app.analysisGenerationReference.runSequence}`;
      return this.#lastSession = new SemanticAotBuildSession(generation, pending, runtimeConfiguration);
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  }

  public evidence(): SemanticAotArtifactEvidence | null {
    return this.#lastSession?.evidence() ?? null;
  }
}

interface RuntimeConfigurationSourceSlice {
  readonly sourceFilePath: string;
  readonly start: number;
  readonly end: number;
  readonly oldText: string;
}

interface RuntimeConfigurationRefusal {
  readonly reasonKind: string;
  readonly summary: string;
}

interface RuntimeConfigurationOccurrencePlan {
  readonly attachment: StandardConfigurationSourceAttachment;
  readonly locus: RuntimeConfigurationSourceSlice | null;
  readonly source: RuntimeConfigurationSourceSlice | null;
  readonly carrierKind: StandardConfigurationSourceCarrierKind;
  readonly coercion: { readonly enableCoercion: boolean; readonly coerceNullish: boolean } | null;
  readonly artifact: AotRuntimeConfigurationModuleArtifact | null;
  refusal: RuntimeConfigurationRefusal | null;
  replace: boolean;
}

function runtimeConfigurationBuildPlan(
  root: string,
  mode: SemanticAotRuntimeConfigurationMode,
  attachments: readonly StandardConfigurationSourceAttachment[],
): RuntimeConfigurationBuildPlan {
  const emitter = new AotRuntimeConfigurationModuleEmitter();
  const occurrences = attachments.map((attachment): RuntimeConfigurationOccurrencePlan => {
    const carrier = attachment.carrier;
    const locus = carrier.carrierKind === StandardConfigurationSourceCarrierKind.ExplicitRegistrationValue
      ? carrier.valueExpression
      : carrier.source;
    const source = carrier.carrierKind === StandardConfigurationSourceCarrierKind.ExplicitRegistrationValue
      ? carrier.valueExpression
      : carrier.carrierKind === StandardConfigurationSourceCarrierKind.BrowserFacadeDefault
        ? carrier.facadeReference
        : carrier.source;
    let refusal: RuntimeConfigurationRefusal | null = null;
    if (carrier.carrierKind === StandardConfigurationSourceCarrierKind.Unavailable) {
      refusal = {
        reasonKind: carrier.reason.reasonKind,
        summary: carrier.reason.summary,
      };
    } else if (carrier.carrierKind === StandardConfigurationSourceCarrierKind.BrowserFacadeDefault && !carrier.replaceable) {
      refusal = {
        reasonKind: carrier.reason?.reasonKind ?? 'browser-facade-reference-unavailable',
        summary: carrier.reason?.summary ?? 'The browser Aurelia facade has no exact replaceable source reference.',
      };
    }
    const coercion = closedRuntimeCoercion(attachment);
    if (refusal == null && coercion == null) {
      refusal = {
        reasonKind: 'open-coercion',
        summary: `StandardConfiguration coercion is not statically closed (${attachment.openSummary ?? 'open configured value'}).`,
      };
    }
    if (
      refusal == null
      && (
        attachment.coverageState !== FrameworkDiEffectCoverageState.Closed
        || attachment.openSummary != null
      )
    ) {
      refusal = {
        reasonKind: 'incomplete-effect-coverage',
        summary: `StandardConfiguration effect coverage is '${attachment.coverageState}'${
          attachment.openSummary == null ? '' : `: ${attachment.openSummary}`
        }`,
      };
    }
    const artifact = refusal == null && coercion != null && mode !== 'preserve'
      ? emitter.emit(new AotRuntimeConfigurationPlan([], coercion))
      : null;
    return {
      attachment,
      locus,
      source,
      carrierKind: carrier.carrierKind,
      coercion,
      artifact,
      refusal,
      replace: false,
    };
  });

  const candidatesBySlice = new Map<string, RuntimeConfigurationOccurrencePlan[]>();
  if (mode !== 'preserve') {
    for (const occurrence of occurrences) {
      if (occurrence.source == null || occurrence.artifact == null || occurrence.refusal != null) continue;
      if (
        mode === 'replace-explicit'
        && occurrence.carrierKind !== StandardConfigurationSourceCarrierKind.ExplicitRegistrationValue
      ) continue;
      const key = `${occurrence.carrierKind}\0${configurationSliceKey(occurrence.source)}`;
      const group = candidatesBySlice.get(key) ?? [];
      group.push(occurrence);
      candidatesBySlice.set(key, group);
    }
  }

  const replacements: PendingRuntimeConfigurationReplacement[] = [];
  const artifacts = new Map<string, AotRuntimeConfigurationModuleArtifact>();
  const moduleEvidence = new Map<string, SemanticAotRuntimeConfigurationEvidence['modules'][number]>();
  for (const candidates of candidatesBySlice.values()) {
    const moduleSpecifiers = new Set(candidates.map((candidate) => candidate.artifact!.moduleId));
    if (moduleSpecifiers.size !== 1) {
      const refusal = {
        reasonKind: 'conflicting-closed-coercion-plan',
        summary: 'One authored StandardConfiguration expression produces different closed coercion plans across active app worlds.',
      };
      for (const candidate of candidates) candidate.refusal = refusal;
      continue;
    }
    const selected = candidates[0]!;
    const source = selected.source!;
    const artifact = selected.artifact!;
    for (const candidate of candidates) candidate.replace = true;
    const replacementSource = {
      start: source.start,
      end: source.end,
      oldText: source.oldText,
    };
    replacements.push({
      sourcePath: path.resolve(source.sourceFilePath),
      configuration: selected.carrierKind === StandardConfigurationSourceCarrierKind.ExplicitRegistrationValue
        ? {
            value: replacementSource,
            moduleSpecifier: artifact.moduleId,
            expectedDigest: artifact.digest,
            exportName: 'AotConfiguration',
          }
        : null,
      browserFacade: selected.carrierKind === StandardConfigurationSourceCarrierKind.BrowserFacadeDefault
        ? {
            reference: replacementSource,
            moduleSpecifier: artifact.moduleId,
            expectedDigest: artifact.digest,
            exportName: 'AotBrowserAurelia',
          }
        : null,
    });
    artifacts.set(artifact.moduleId, artifact);
    const coercion = selected.coercion!;
    moduleEvidence.set(artifact.moduleId, {
      moduleSpecifier: artifact.moduleId,
      planDigest: artifact.planDigest,
      digest: artifact.digest,
      enableCoercion: coercion.enableCoercion,
      coerceNullish: coercion.coerceNullish,
    });
  }

  if (mode === 'require-replaceable') {
    const refused = occurrences.filter((occurrence) => !occurrence.replace);
    if (refused.length > 0) {
      throw unavailableRuntimeConfigurationError(root, refused);
    }
  }

  return {
    replacements: replacements.sort((left, right) =>
      canonicalPath(left.sourcePath).localeCompare(canonicalPath(right.sourcePath))
      || runtimeReplacementStart(left) - runtimeReplacementStart(right)
    ),
    artifacts,
    evidence: {
      mode,
      occurrences: occurrences.map((occurrence) => ({
        operationProductHandle: occurrence.attachment.operationProductHandle,
        operationOrdinal: occurrence.attachment.operationOrdinal,
        carrierKind: occurrence.carrierKind,
        coverageState: occurrence.attachment.coverageState,
        openSummary: occurrence.attachment.openSummary,
        nestedDiCoverageState: occurrence.attachment.nestedDiCoverageState,
        nestedDiOpenSummary: occurrence.attachment.nestedDiOpenSummary,
        sourcePath: occurrence.locus == null ? null : path.resolve(occurrence.locus.sourceFilePath),
        start: occurrence.locus?.start ?? null,
        end: occurrence.locus?.end ?? null,
        disposition: mode === 'preserve' || (
          mode === 'replace-explicit'
          && occurrence.carrierKind !== StandardConfigurationSourceCarrierKind.ExplicitRegistrationValue
        )
          ? 'preserved'
          : occurrence.replace
            ? 'replaced'
            : 'non-replaceable',
        moduleSpecifier: occurrence.replace ? occurrence.artifact!.moduleId : null,
        reasonKind: occurrence.refusal?.reasonKind ?? null,
        reason: occurrence.refusal?.summary ?? null,
      })),
      modules: [...moduleEvidence.values()].sort((left, right) =>
        left.moduleSpecifier.localeCompare(right.moduleSpecifier)
      ),
    },
  };
}

function closedRuntimeCoercion(
  attachment: StandardConfigurationSourceAttachment,
): { readonly enableCoercion: boolean; readonly coerceNullish: boolean } | null {
  if (
    attachment.coercion.enableCoercion.state === FrameworkCapabilityConfigurationState.Open
    || attachment.coercion.coerceNullish.state === FrameworkCapabilityConfigurationState.Open
  ) {
    return null;
  }
  return {
    enableCoercion: attachment.coercion.enableCoercion.recoveryValue,
    coerceNullish: attachment.coercion.coerceNullish.recoveryValue,
  };
}

function runtimeReplacementStart(replacement: PendingRuntimeConfigurationReplacement): number {
  return replacement.configuration?.value.start ?? replacement.browserFacade?.reference.start ?? -1;
}

function configurationSliceKey(source: RuntimeConfigurationSourceSlice): string {
  return `${canonicalPath(source.sourceFilePath)}\0${source.start}\0${source.end}\0${source.oldText}`;
}

function unavailableRuntimeConfigurationError(
  root: string,
  occurrences: readonly RuntimeConfigurationOccurrencePlan[],
): AotArtifactError {
  const detail = occurrences.map((occurrence) => {
    const source = occurrence.locus == null
      ? '(source unavailable)'
      : `${occurrence.locus.sourceFilePath}:${occurrence.locus.start}`;
    return `${source} [${occurrence.carrierKind}]: ${occurrence.refusal?.summary ?? 'no exact replacement plan'}`;
  }).join('; ');
  return new AotArtifactError(
    'AOT_ARTIFACT_UNSUPPORTED_VALUE',
    `AOT runtime configuration profile 'require-replaceable' could not replace every spent StandardConfiguration occurrence: ${detail}`,
    root,
  );
}

function unavailableHandoffError(
  root: string,
  resources: readonly SemanticAppTemplateCompilerHandoffResource[],
): AotArtifactError {
  const detail = resources.map((resource) => {
    const source = resource.source?.label ?? resource.source?.path ?? '(unknown template)';
    const reasons = resource.reasons.map((reason) => `${reason.stage}/${reason.reasonKind}`).join(', ');
    return `${source}: ${resource.state}${reasons.length === 0 ? '' : ` (${reasons})`}`;
  }).join('; ');
  return new AotArtifactError(
    'AOT_ARTIFACT_INVALID_HANDOFF',
    `Semantic-runtime could not produce exact AOT handoffs: ${detail}`,
    root,
  );
}

function canonicalPath(value: string): string {
  const resolved = path.resolve(value).replaceAll('\\', '/');
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function compilerVariantKeyFor(handoff: TemplateCompilerCompiledHandoffValue): string {
  const address = handoff.address;
  const digest = createHash('sha256')
    .update(address.definitionProductHandle)
    .update('\0')
    .update(address.compilerWorldProductHandle)
    .update('\0')
    .update(handoff.source.authoredSourceRevision)
    .update('\0')
    .update(handoff.schemaVersion)
    .digest('hex');
  return `sha256:${digest}`;
}

function rootDefinition(handoff: TemplateCompilerCompiledHandoffValue) {
  const root = handoff.definitions.find((definition) => definition.definitionId === handoff.rootDefinitionId);
  if (root == null) {
    throw new AotArtifactError(
      'AOT_ARTIFACT_INVALID_HANDOFF',
      `AOT handoff '${handoff.resourceName}' has no root definition.`,
      handoff.source.source?.path ?? '(unknown source)',
    );
  }
  return root;
}

/** Collapse compiler-world variants only when they produce the same exact payload for one resource carrier. */
export function collapseEquivalentAotResourcePlans(
  sourcePath: string,
  plans: readonly AotSourceTransformResourcePlan[],
): readonly AotSourceTransformResourcePlan[] {
  const byResource = new Map<string, AotSourceTransformResourcePlan[]>();
  for (const plan of plans) {
    const variants = byResource.get(plan.resourceKey) ?? [];
    variants.push(plan);
    byResource.set(plan.resourceKey, variants);
  }
  const collapsed: AotSourceTransformResourcePlan[] = [];
  for (const [resourceKey, variants] of byResource) {
    const ordered = [...variants].sort((left, right) =>
      left.compilerVariantKey.localeCompare(right.compilerVariantKey)
    );
    const selected = ordered[0]!;
    const incompatible = ordered.find((candidate) =>
      candidate.payloadDigest !== selected.payloadDigest
      || candidate.carrierKind !== selected.carrierKind
      || candidate.carrier.start !== selected.carrier.start
      || candidate.carrier.end !== selected.carrier.end
      || candidate.carrier.oldText !== selected.carrier.oldText
    );
    if (incompatible != null) {
      throw new AotSourceTransformError(
        'AOT_SOURCE_INVALID_PLAN',
        `Resource '${resourceKey}' has non-equivalent compiler variants '${selected.compilerVariantKey}' and '${incompatible.compilerVariantKey}' in one runtime module.`,
        sourcePath,
        resourceKey,
      );
    }
    collapsed.push(selected);
  }
  return collapsed.sort((left, right) =>
    left.carrier.start - right.carrier.start
    || right.carrier.end - left.carrier.end
    || left.compilerVariantKey.localeCompare(right.compilerVariantKey)
  );
}

/** Refuse the known pre-conventions TDZ shape until conventions expose a cooperative post-transform attachment hook. */
export function validateAotCarrierPatchHandoff(
  handoff: TemplateCompilerCompiledHandoffValue,
  sourcePath: string,
): void {
  const attachment = handoff.address.sourceAttachment;
  if (attachment?.carrierKind !== ResourceCarrierKind.Convention) return;
  const root = rootDefinition(handoff);
  const inFileDependency = root.header.dependencies.find((dependency) =>
    dependency.localName != null
    && dependency.moduleKey != null
    && normalizeModuleKey(dependency.moduleKey) === normalizeModuleKey(attachment.owningModuleKey)
  );
  if (inFileDependency == null) return;
  const dependencyName = inFileDependency.localName ?? '(anonymous dependency)';
  throw new AotArtifactError(
    'AOT_ARTIFACT_UNSUPPORTED_HEADER',
    `Convention resource '${handoff.resourceName}' has in-file dependency '${dependencyName}'. Aurelia conventions may relocate the class after the authored AOT attachment point.`,
    sourcePath,
  );
}

function groupPendingByPath<T>(
  pending: readonly T[],
  selectPath: (artifact: T) => string,
): ReadonlyMap<string, readonly T[]> {
  const groups = new Map<string, T[]>();
  for (const artifact of pending) {
    const key = canonicalPath(selectPath(artifact));
    const group = groups.get(key) ?? [];
    group.push(artifact);
    groups.set(key, group);
  }
  return groups;
}

function copyRawSourceMap(map: AotRawSourceMap): AotRawSourceMap {
  return {
    version: 3,
    file: map.file,
    sources: [...map.sources],
    sourcesContent: [...map.sourcesContent],
    names: [...map.names],
    mappings: map.mappings,
  };
}

function normalizeModuleKey(value: string): string {
  return value.replaceAll('\\', '/').replace(/^\.\//u, '').toLowerCase();
}
