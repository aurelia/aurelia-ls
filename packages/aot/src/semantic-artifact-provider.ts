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
  AotArtifactError,
  AotTemplateModuleEmitter,
  type AotRawSourceMap,
  type AotTemplateModuleArtifact,
} from './template-module-emitter.js';

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

export interface SemanticAotArtifactEvidence {
  readonly generation: string;
  readonly analysisCount: 1;
  readonly artifacts: readonly {
    readonly sourcePath: string;
    readonly definitionName: string;
    readonly needsCompile: false;
    readonly digest: string;
    readonly map: AotRawSourceMap;
  }[];
}

interface PendingTemplateArtifact {
  readonly projectRoot: string;
  readonly sourcePath: string;
  readonly handoff: TemplateCompilerCompiledHandoffValue;
}

export class SemanticAotBuildSession {
  readonly #pendingByPath: ReadonlyMap<string, PendingTemplateArtifact>;
  readonly #artifactsByPath = new Map<string, AotTemplateModuleArtifact>();
  readonly #evidenceByPath = new Map<string, SemanticAotArtifactEvidence['artifacts'][number]>();
  readonly #emitter = new AotTemplateModuleEmitter();

  public constructor(
    readonly generation: string,
    pending: readonly PendingTemplateArtifact[],
  ) {
    this.#pendingByPath = new Map(pending.map((artifact) => [canonicalPath(artifact.sourcePath), artifact]));
    if (this.#pendingByPath.size !== pending.length) {
      throw new Error('AOT semantic build produced more than one artifact for one source path.');
    }
  }

  public async artifactFor(request: SemanticAotTemplateRequest): Promise<SemanticAotTemplateArtifact> {
    const key = canonicalPath(request.sourcePath);
    const pending = this.#pendingByPath.get(key);
    if (pending == null) {
      throw new AotArtifactError(
        'AOT_ARTIFACT_INVALID_HANDOFF',
        `No exact semantic AOT handoff exists for '${request.sourcePath}'.`,
        request.sourcePath,
      );
    }
    let artifact = this.#artifactsByPath.get(key);
    if (artifact == null) {
      const sourceText = await readFile(request.sourcePath, 'utf8');
      artifact = this.#emitter.emit({
        handoff: pending.handoff,
        projectRoot: pending.projectRoot,
        sourcePath: request.sourcePath,
        sourceText,
      });
      this.#artifactsByPath.set(key, artifact);
      this.#evidenceByPath.set(key, {
        sourcePath: artifact.sourcePath,
        definitionName: artifact.definitionName,
        needsCompile: artifact.needsCompile,
        digest: artifact.digest,
        map: {
          version: 3,
          file: artifact.map.file,
          sources: [...artifact.map.sources],
          sourcesContent: [...artifact.map.sourcesContent],
          names: [...artifact.map.names],
          mappings: artifact.map.mappings,
        },
      });
    }
    return {
      sourcePath: request.sourcePath,
      code: artifact.code,
      map: artifact.map,
      digest: artifact.digest,
    };
  }

  public evidence(): SemanticAotArtifactEvidence {
    return {
      generation: this.generation,
      analysisCount: 1,
      artifacts: [...this.#evidenceByPath.values()],
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
      const pending = batch.resources.map((resource) => {
        if (resource.value == null) {
          throw new Error('Exact semantic AOT handoff unexpectedly has no value.');
        }
        const sourcePath = resource.source?.path;
        if (sourcePath == null) {
          throw new AotArtifactError(
            'AOT_ARTIFACT_INVALID_HANDOFF',
            `AOT handoff '${resource.value.resourceName}' has no authored source path.`,
            root,
          );
        }
        return {
          projectRoot: app.project.rootDir,
          sourcePath: path.isAbsolute(sourcePath) ? sourcePath : path.resolve(app.project.rootDir, sourcePath),
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
