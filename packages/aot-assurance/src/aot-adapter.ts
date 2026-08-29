import path from 'node:path';

import {
  SemanticAotArtifactProvider,
  type SemanticAotTemplateArtifact,
} from '@aurelia-ls/aot';
import {
  aureliaAot,
  type AotArtifactProvider,
  type AotBuildReceipt,
  type AotBuildSession,
} from '@aurelia-ls/aot-vite';
import type {
  AotAssuranceAdapter,
  AotBuildEvidence,
  AotAdapterRequest,
  EmissionFalsifier,
  RenderedModuleEvidence,
} from './contract.js';

/** Compose the real semantic provider and Vite preset for the private executable harness. */
export function createAotAssuranceAdapter(request: AotAdapterRequest): AotAssuranceAdapter {
  const semanticProvider = new SemanticAotArtifactProvider();
  const provider = falsifyingProvider(semanticProvider, request.falsifier);
  let receipt: AotBuildReceipt | null = null;
  const include = `${request.sourceRoot.replaceAll('\\', '/')}/**/*.{ts,js,html}`;
  return {
    plugins: aureliaAot({
      provider,
      conventions: {
        include,
        transformStandardDecorators: true,
      },
      receipt: {
        onReceipt(value) {
          receipt = value;
        },
      },
    }),
    readEvidence(_moduleGraph: readonly RenderedModuleEvidence[]): Promise<AotBuildEvidence> {
      const semantic = semanticProvider.evidence();
      if (semantic == null || receipt == null) {
        throw new Error('AOT assurance adapter did not receive semantic and Vite build evidence.');
      }
      return Promise.resolve({
        analysisCount: semantic.analysisCount,
        artifacts: semantic.artifacts.map((artifact) => {
          const vite = receipt!.artifacts.find((candidate) => samePath(candidate.sourcePath, artifact.sourcePath));
          if (vite == null) {
            throw new Error(`Vite receipt omitted semantic artifact '${artifact.sourcePath}'.`);
          }
          return {
            generation: semantic.generation,
            sourceId: artifact.sourcePath,
            moduleId: vite.virtualId,
            definitionName: artifact.definitionName,
            needsCompile: artifact.needsCompile,
            sourceMap: {
              generatedFile: artifact.map.file,
              sources: artifact.map.sources,
            },
          };
        }),
      });
    },
  };
}

function falsifyingProvider(
  provider: SemanticAotArtifactProvider,
  falsifier: EmissionFalsifier | undefined,
): AotArtifactProvider {
  if (falsifier == null) return provider;
  return {
    async openBuild(request) {
      const session = await provider.openBuild(request);
      return {
        async artifactFor(templateRequest) {
          const artifact = await session.artifactFor(templateRequest);
          return falsifyArtifact(artifact, falsifier);
        },
      } satisfies AotBuildSession;
    },
  };
}

function falsifyArtifact(
  artifact: SemanticAotTemplateArtifact,
  falsifier: EmissionFalsifier,
): SemanticAotTemplateArtifact {
  switch (falsifier) {
    case 'restore-needs-compile':
      return replaceCode(artifact, /needsCompile: false/u, 'needsCompile: true');
    case 'mutate-instruction':
      return replaceCode(
        artifact,
        /"type": (?:0|1|2|3|10|11|12|13|14|15|16|30|31|32|33|34|35|36|50|52|200)/u,
        '"type": 9999',
      );
    case 'drop-nested-definition':
      return replaceCode(artifact, /^Object\.assign\(\$definition(?!0\b)\d+,.*\);\r?\n/mu, '');
  }
}

function replaceCode(
  artifact: SemanticAotTemplateArtifact,
  pattern: RegExp,
  replacement: string,
): SemanticAotTemplateArtifact {
  const code = artifact.code.replace(pattern, replacement);
  if (code === artifact.code) {
    throw new Error(`AOT emission falsifier '${pattern}' did not match '${artifact.sourcePath}'.`);
  }
  return { ...artifact, code, digest: `${artifact.digest}:falsified` };
}

function samePath(left: string, right: string): boolean {
  const normalize = (value: string): string => {
    const resolved = path.resolve(value).replaceAll('\\', '/');
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
  };
  return normalize(left) === normalize(right);
}
