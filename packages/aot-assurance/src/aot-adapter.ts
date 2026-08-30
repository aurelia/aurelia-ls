import path from 'node:path';

import {
  SemanticAotArtifactProvider,
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
  const falsification = falsifyingProvider(semanticProvider, request.falsifier);
  let receipt: AotBuildReceipt | null = null;
  const include = `${request.sourceRoot.replaceAll('\\', '/')}/**/*.{ts,js,html}`;
  return {
    plugins: aureliaAot({
      provider: falsification.provider,
      runtimeConfiguration: 'require-replaceable',
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
      falsification.assertExercised();
      const semantic = semanticProvider.evidence();
      if (semantic == null || receipt == null) {
        throw new Error('AOT assurance adapter did not receive semantic and Vite build evidence.');
      }
      return Promise.resolve({
        analysisCount: semantic.analysisCount,
        artifacts: semantic.artifacts.map((artifact) => {
          const vite = receipt!.artifacts.find((candidate) =>
            candidate.compilerVariantKey === artifact.compilerVariantKey
          ) ?? receipt!.artifacts.find((candidate) =>
            candidate.compilerVariantKey == null && samePath(candidate.sourcePath, artifact.sourcePath)
          );
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

interface FalsifyingProviderResult {
  readonly provider: AotArtifactProvider;
  assertExercised(): void;
}

function falsifyingProvider(
  provider: SemanticAotArtifactProvider,
  falsifier: EmissionFalsifier | undefined,
): FalsifyingProviderResult {
  if (falsifier == null) {
    return { provider, assertExercised() {} };
  }
  let mutationCount = 0;
  return {
    provider: {
      async openBuild(request) {
        const session = await provider.openBuild(request);
        const payloadSpecifiers = new Set<string>();
        return {
          async artifactFor(templateRequest) {
            const artifact = await session.artifactFor(templateRequest);
            return falsifyArtifact(artifact, falsifier, () => mutationCount++);
          },
          async transformSource(sourceRequest) {
            const artifact = await session.transformSource(sourceRequest);
            for (const resource of artifact?.resources ?? []) {
              payloadSpecifiers.add(resource.payloadSpecifier);
            }
            return artifact == null ? null : {
              ...artifact,
              digest: `${artifact.digest}:falsified-payload-wire`,
              resources: artifact.resources.map((resource) => ({
                ...resource,
                payloadDigest: `${resource.payloadDigest}:falsified`,
              })),
            };
          },
          async virtualModuleFor(virtualRequest) {
            const artifact = await session.virtualModuleFor(virtualRequest);
            return artifact != null && payloadSpecifiers.has(virtualRequest.specifier)
              ? falsifyArtifact(artifact, falsifier, () => mutationCount++)
              : artifact;
          },
        } satisfies AotBuildSession;
      },
    },
    assertExercised() {
      if (mutationCount === 0) {
        throw new Error(`AOT emission falsifier '${falsifier}' did not mutate any emitted payload.`);
      }
    },
  };
}

function falsifyArtifact<TArtifact extends { readonly code: string; readonly digest: string }>(
  artifact: TArtifact,
  falsifier: EmissionFalsifier,
  onMutation: () => void,
): TArtifact {
  switch (falsifier) {
    case 'restore-needs-compile':
      return replaceCode(artifact, /(?:needsCompile|"needsCompile"): false/u, '"needsCompile": true', onMutation);
    case 'mutate-instruction':
      return replaceCode(
        artifact,
        /"type": (?:0|1|2|3|10|11|12|13|14|15|16|30|31|32|33|34|35|36|50|52|200)/u,
        '"type": 9999',
        onMutation,
      );
    case 'drop-nested-definition':
      return replaceCode(
        artifact,
        /^Object\.assign\(\$definition(?!0\b)\d+,[\s\S]*?(?=^Object\.assign\(\$definition\d+,)/mu,
        '',
        onMutation,
      );
  }
}

function replaceCode<TArtifact extends { readonly code: string; readonly digest: string }>(
  artifact: TArtifact,
  pattern: RegExp,
  replacement: string,
  onMutation: () => void,
): TArtifact {
  const code = artifact.code.replace(pattern, replacement);
  if (code !== artifact.code) onMutation();
  return { ...artifact, code, digest: `${artifact.digest}:falsified` };
}

function samePath(left: string, right: string): boolean {
  const normalize = (value: string): string => {
    const resolved = path.resolve(value).replaceAll('\\', '/');
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
  };
  return normalize(left) === normalize(right);
}
