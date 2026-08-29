import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  createSemanticRuntime,
} from '@aurelia-ls/semantic-runtime';
import {
  materializeSemanticAppTemplateCompilerHandoffs,
  TemplateCompilerCompiledHandoffState,
  type SemanticAppTemplateCompilerHandoffResource,
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
  type AotSourceTransformArtifact,
  type AotSourceTransformResourcePlan,
} from './source-transform.js';
import {
  AotArtifactError,
  AotTemplateModuleEmitter,
  type AotRawSourceMap,
  type AotTemplateModuleArtifact,
} from './template-module-emitter.js';

export const AOT_COMPILER_PATCH_PAYLOAD_MODULE_PREFIX = 'virtual:aurelia-aot/payload/';

export interface SemanticAotBuildRequest {
  readonly root: string;
  readonly mode: string;
  readonly environmentName: string;
  readonly sourcemap: boolean | 'inline' | 'hidden';
}

export interface SemanticAotTemplateRequest {
  readonly sourcePath: string;
}

export interface SemanticAotTemplateArtifact {
  readonly sourcePath: string;
  readonly code: string;
  readonly map: AotRawSourceMap;
  readonly digest: string;
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

export class SemanticAotBuildSession {
  readonly #pendingByVariant: ReadonlyMap<string, PendingResourceArtifact>;
  readonly #pendingByPayloadSpecifier: ReadonlyMap<string, PendingResourceArtifact>;
  readonly #pendingByCarrierPath: ReadonlyMap<string, readonly PendingResourceArtifact[]>;
  readonly #pendingByTemplatePath: ReadonlyMap<string, readonly PendingResourceArtifact[]>;
  readonly #fullArtifactsByVariant = new Map<string, AotTemplateModuleArtifact>();
  readonly #patchArtifactsByVariant = new Map<string, AotCompilerPatchModuleArtifact>();
  readonly #evidenceByVariant = new Map<string, SemanticAotArtifactEvidence['artifacts'][number]>();
  readonly #fullEmitter = new AotTemplateModuleEmitter();
  readonly #patchEmitter = new AotCompilerPatchModuleEmitter();
  readonly #sourceEmitter = new AotSourceTransformEmitter();

  public constructor(
    readonly generation: string,
    pending: readonly PendingResourceArtifact[],
  ) {
    this.#pendingByVariant = new Map(pending.map((artifact) => [artifact.compilerVariantKey, artifact]));
    this.#pendingByPayloadSpecifier = new Map(pending.map((artifact) => [artifact.payloadSpecifier, artifact]));
    if (this.#pendingByVariant.size !== pending.length || this.#pendingByPayloadSpecifier.size !== pending.length) {
      throw new Error('AOT semantic build produced duplicate resource compiler variants.');
    }
    this.#pendingByCarrierPath = groupPendingByPath(pending, (artifact) => artifact.carrierSourcePath);
    this.#pendingByTemplatePath = groupPendingByPath(pending, (artifact) => artifact.templateSourcePath);
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
    let artifact = this.#fullArtifactsByVariant.get(pending.compilerVariantKey);
    if (artifact == null) {
      const sourceText = await readFile(pending.templateSourcePath, 'utf8');
      artifact = this.#fullEmitter.emit({
        handoff: pending.handoff,
        projectRoot: pending.projectRoot,
        sourcePath: pending.templateSourcePath,
        sourceText,
      });
      this.#fullArtifactsByVariant.set(pending.compilerVariantKey, artifact);
      this.#recordEvidence(pending, artifact);
    }
    return {
      sourcePath: request.sourcePath,
      code: artifact.code,
      map: artifact.map,
      digest: artifact.digest,
    };
  }

  public async transformSource(
    request: SemanticAotSourceTransformRequest,
  ): Promise<SemanticAotSourceTransformArtifact | null> {
    const pending = this.#pendingByCarrierPath.get(canonicalPath(request.sourcePath)) ?? [];
    if (pending.length === 0) return null;
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
      resources: plans,
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
    const pending = this.#pendingByPayloadSpecifier.get(request.specifier);
    if (pending == null) return null;
    const artifact = await this.#patchArtifactFor(pending);
    return {
      specifier: request.specifier,
      code: artifact.code,
      map: artifact.map,
      digest: artifact.digest,
    };
  }

  async #patchArtifactFor(pending: PendingResourceArtifact): Promise<AotCompilerPatchModuleArtifact> {
    let artifact = this.#patchArtifactsByVariant.get(pending.compilerVariantKey);
    if (artifact != null) return artifact;
    const sourceText = await readFile(pending.templateSourcePath, 'utf8');
    artifact = this.#patchEmitter.emit({
      handoff: pending.handoff,
      projectRoot: pending.projectRoot,
      sourcePath: pending.templateSourcePath,
      sourceText,
    });
    this.#patchArtifactsByVariant.set(pending.compilerVariantKey, artifact);
    this.#recordEvidence(pending, artifact);
    return artifact;
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
      });
      const batch = materializeSemanticAppTemplateCompilerHandoffs({
        app,
        includeAuthoringResources: true,
      });
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
      return this.#lastSession = new SemanticAotBuildSession(generation, pending);
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  }

  public evidence(): SemanticAotArtifactEvidence | null {
    return this.#lastSession?.evidence() ?? null;
  }
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

function groupPendingByPath(
  pending: readonly PendingResourceArtifact[],
  selectPath: (artifact: PendingResourceArtifact) => string,
): ReadonlyMap<string, readonly PendingResourceArtifact[]> {
  const groups = new Map<string, PendingResourceArtifact[]>();
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
