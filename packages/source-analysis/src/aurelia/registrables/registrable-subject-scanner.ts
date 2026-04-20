import type { Export, Exports } from '../exports/index.js';
import type { SourceNodeRef } from '../refs.js';
import type { Resources } from '../resources/index.js';
import type { Configurations } from '../configurations/index.js';
import { RegistrableSubject } from './registrable-subject.js';

export interface RegistrableSubjectScannerOptions {
  readonly configurations: Configurations;
  readonly exports: Exports;
  readonly resources: Resources;
}

export interface RegistrableSubjectScannerState {
  readonly ownerLabel: string;
}

export class RegistrableSubjectScanner {
  private readonly configurationsValue: Configurations;
  private readonly exportsValue: Exports;
  private readonly resourcesValue: Resources;

  constructor(
    options: RegistrableSubjectScannerOptions,
  ) {
    this.configurationsValue = options.configurations;
    this.exportsValue = options.exports;
    this.resourcesValue = options.resources;
  }

  readSubject(
    id: string,
    source: SourceNodeRef,
    referenceName: string,
  ): RegistrableSubject {
    // TODO: this is a deliberately thin admission classifier aimed at
    // StandardConfiguration-style built-ins. It is not yet the full Aurelia
    // admission algebra for all registrable exports.
    const matchingExports = this.exportsValue.find(referenceName);
    if (matchingExports.length === 1) {
      const resolvedExport = matchingExports[0] ?? null;
      if (resolvedExport == null) {
        return new RegistrableSubject(
          id,
          source,
          referenceName,
          'open',
          null,
          null,
          `Reference ${referenceName} matched an empty export resolution unexpectedly.`,
        );
      }
      const resource = this.resourcesValue.readAll().find((current) => {
        const typeName = 'name' in current.type && typeof current.type.name === 'string'
          ? current.type.name
          : null;
        return typeName === referenceName;
      }) ?? null;
      if (resource != null) {
        return new RegistrableSubject(
          id,
          source,
          referenceName,
          classifyRegistrableResourceSubjectKind(resource.kind),
          resolvedExport,
          resource.kind,
          `Resolved ${referenceName} through existing resource definitions.`,
        );
      }

      if (this.configurationsValue.readRegistryObjects().some((current) => current.sourceExport.name === referenceName)) {
        return new RegistrableSubject(
          id,
          source,
          referenceName,
          'registry',
          resolvedExport,
          null,
          `Resolved ${referenceName} as a registry-valued export.`,
        );
      }

      return classifyExportPath(id, source, referenceName, resolvedExport);
    }

    if (matchingExports.length > 1) {
      return new RegistrableSubject(
        id,
        source,
        referenceName,
        'open',
        null,
        null,
        `Reference ${referenceName} is ambiguous across multiple exported Aurelia subjects.`,
      );
    }

    return new RegistrableSubject(
      id,
      source,
      referenceName,
      'open',
      null,
      null,
      `Reference ${referenceName} does not yet resolve to a unique exported Aurelia subject.`,
    );
  }

  inspectState(): RegistrableSubjectScannerState {
    return {
      ownerLabel: this.exportsValue.ownerLabel,
    };
  }
}

function classifyExportPath(
  id: string,
  source: SourceNodeRef,
  referenceName: string,
  resolvedExport: Export,
): RegistrableSubject {
  const declarationFile = resolvedExport.sourceFile?.path?.replace(/\\/g, '/') ?? null;
  if (declarationFile == null) {
    return new RegistrableSubject(
      id,
      source,
      referenceName,
      'open',
      resolvedExport,
      null,
      'Resolved export has no declaration-file grounding yet.',
    );
  }

  if (
    declarationFile.includes('/renderer')
    || declarationFile.includes('/renderers/')
    || referenceName.endsWith('Renderer')
  ) {
    return new RegistrableSubject(id, source, referenceName, 'renderer', resolvedExport, null, 'Classified from declaration path under renderer surfaces.');
  }

  if (referenceName.endsWith('Registration')) {
    return new RegistrableSubject(id, source, referenceName, 'registry', resolvedExport, null, 'Classified from registration-shaped export naming.');
  }

  // TODO: do not infer resource family from declaration path or naming here.
  // Atlas pressure is clear that:
  // - binding-command is a compiler-root-only resource-definition family
  // - attribute-pattern is a distinct registrable-metadata-registry carrier
  // - convention-derived declaration policy is its own truth family
  //
  // So resource-kind closure must come from a dedicated resource-admission /
  // convention-policy seam, not from file-path heuristics.
  return new RegistrableSubject(
    id,
    source,
    referenceName,
    'service',
    resolvedExport,
    null,
    'Defaulted to service-like registrable subject after resource/renderer/registry checks.',
  );
}

function classifyRegistrableResourceSubjectKind(
  resourceKind: import('../resources/index.js').ResourceDefinitionKind,
): RegistrableSubject['kind'] {
  switch (resourceKind) {
    case 'binding-command':
    case 'attribute-pattern':
      return 'compiler-resource';
    case 'custom-element':
    case 'custom-attribute':
    case 'template-controller':
    case 'value-converter':
    case 'binding-behavior':
      return 'template-resource';
  }
}
