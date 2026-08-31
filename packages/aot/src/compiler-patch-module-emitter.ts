import type {
  TemplateCompilerCompiledHandoffAddress,
  TemplateCompilerCompiledHandoffDefinition,
} from '@aurelia-ls/semantic-runtime/browser-template';

import {
  AotArtifactError,
  AotCompiledTemplateEmission,
  AotLocalDefinitionEmission,
  createAotRawSourceMap,
  digestAotArtifact,
  type AotDefinitionDependencyPlan,
  type AotRawSourceMap,
  type AotTemplateModuleEmissionRequest,
} from './template-module-emitter.js';

export interface AotCompilerPatchModuleArtifact {
  readonly sourcePath: string;
  readonly definitionName: string;
  readonly address: TemplateCompilerCompiledHandoffAddress;
  readonly needsCompile: false;
  readonly code: string;
  readonly map: AotRawSourceMap;
  readonly digest: string;
}

export type AotCompilerPatchModuleEmissionRequest = AotTemplateModuleEmissionRequest;

/**
 * Emit only compiler-owned root fields. Authored metadata remains executable in its owning source module.
 * Generated template-controller and projection definitions remain complete values reached through instruction wires.
 */
export class AotCompilerPatchModuleEmitter {
  public emit(request: AotCompilerPatchModuleEmissionRequest): AotCompilerPatchModuleArtifact {
    const emission = new AotCompiledTemplateEmission(request);
    const locals = new AotLocalDefinitionEmission(emission);
    const generatedDefinitions = emission.definitions.filter((definition) => definition !== emission.root);
    assertGeneratedDefinitionsHaveNoDependencies(generatedDefinitions, request);
    const generatedDependencies: AotDefinitionDependencyPlan = {
      imports: [],
      byDefinitionId: new Map(generatedDefinitions.map((definition) => [definition.definitionId, []])),
    };
    const rootVariable = emission.variableFor(emission.root.definitionId);
    const lines: string[] = [
      ...(!locals.hasLocals
        ? []
        : ["import { CustomElement } from '@aurelia/runtime-html';", '']),
      ...emission.declarationLines(),
      '',
      ...locals.typeDeclarationLines(),
      ...(locals.hasLocals ? [''] : []),
    ];

    for (const definition of [...generatedDefinitions].reverse()) {
      lines.push(
        `Object.assign(${emission.variableFor(definition.definitionId)}, ${emission.completeDefinitionValue(definition, generatedDependencies)});`,
      );
    }
    lines.push(`Object.assign(${rootVariable}, ${emission.compilerPatchValue()});`);
    if (locals.hasLocals) {
      lines.push(
        'function $materializeCompilerAddedDependencies($ownerType, $ownerDefinition) {',
        ...locals.materializationLines('$ownerType', '$ownerDefinition', '  '),
        `  return [${locals.directRootTypeVariables().join(', ')}];`,
        '}',
        `${rootVariable}.materializeCompilerAddedDependencies = $materializeCompilerAddedDependencies;`,
      );
    }
    lines.push(
      '',
      `export const template = ${rootVariable}.template;`,
      `export const instructions = ${rootVariable}.instructions;`,
      `export const surrogates = ${rootVariable}.surrogates;`,
      `export const hasSlots = ${rootVariable}.hasSlots;`,
      `export const needsCompile = ${rootVariable}.needsCompile;`,
      `export const compilerAddedDependencies = ${rootVariable}.compilerAddedDependencies;`,
      `export default ${rootVariable};`,
      '',
    );

    const code = lines.join('\n');
    const map = createAotRawSourceMap(request, '?aurelia-aot-compiler-patch');
    return {
      sourcePath: request.sourcePath,
      definitionName: request.handoff.resourceName,
      address: request.handoff.address,
      needsCompile: false,
      code,
      map,
      digest: digestAotArtifact(code, map),
    };
  }
}

function assertGeneratedDefinitionsHaveNoDependencies(
  definitions: readonly TemplateCompilerCompiledHandoffDefinition[],
  request: AotCompilerPatchModuleEmissionRequest,
): void {
  const definition = definitions.find((candidate) => candidate.header.dependencies.length > 0);
  if (definition == null) return;
  throw new AotArtifactError(
    'AOT_ARTIFACT_UNSUPPORTED_HEADER',
    `Generated definition '${definition.definitionId}' unexpectedly carries resource dependencies.`,
    request.sourcePath,
  );
}
