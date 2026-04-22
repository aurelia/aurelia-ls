import type { Exports } from '../exports/index.js';
import { KeyRef } from '../refs.js';
import { AttributePatternDefinition } from './attribute-pattern-definition.js';
import { BindingBehaviorDefinition } from './binding-behavior-definition.js';
import { BindingBehaviorIdentity } from './binding-behavior-support.js';
import { BindingBehaviorMaterializer } from './binding-behavior-materializer.js';
import { BindingCommandDefinition } from './binding-command-definition.js';
import { BindingCommandIdentity } from './binding-command-support.js';
import { BindingCommandMaterializer } from './binding-command-materializer.js';
import { CustomAttributeDefinition } from './custom-attribute-definition.js';
import { CustomAttributeIdentity } from './custom-attribute-support.js';
import { CustomAttributeMaterializer } from './custom-attribute-materializer.js';
import { CustomElementDefinition } from './custom-element-definition.js';
import { CustomElementIdentity } from './custom-element-support.js';
import { CustomElementMaterializer } from './custom-element-materializer.js';
import { DefinitionCarrierCollector } from './definition-carrier-collector.js';
import type { DefinitionCarrier } from './definition-carrier.js';
import { ResourceRecognizer } from './resource-recognizer.js';
import type { ResourceCandidate } from './resource-candidate.js';
import type { ResourceDefinition } from './resources.js';
import { TemplateControllerDefinition } from './template-controller-definition.js';
import { ValueConverterDefinition } from './value-converter-definition.js';
import { ValueConverterIdentity } from './value-converter-support.js';
import { ValueConverterMaterializer } from './value-converter-materializer.js';

export interface ResourceScannerOptions {
  readonly exports: Exports;
  readonly resourceSeeds?: readonly ResourceDefinition[];
  readonly conventionsActive?: boolean;
  readonly recognizer?: ResourceRecognizer;
  readonly definitionCarrierCollector?: DefinitionCarrierCollector;
  readonly customElementMaterializer?: CustomElementMaterializer;
  readonly customAttributeMaterializer?: CustomAttributeMaterializer;
  readonly bindingCommandMaterializer?: BindingCommandMaterializer;
  readonly valueConverterMaterializer?: ValueConverterMaterializer;
  readonly bindingBehaviorMaterializer?: BindingBehaviorMaterializer;
}

export interface ResourceScannerState {
  readonly exportOwnerLabel: string;
  readonly recognizerExportOwnerLabel: string;
  readonly carrierCollectorExportOwnerLabel: string;
  readonly seedCount: number;
  readonly recognizedCount: number;
}

// This seam now converges real export-backed resource candidates into skeletal
// definitions, then lets family-specific materializers close declaration-local
// fields. Seeds remain available for special framework rows that still need
// bespoke treatment, but they no longer define the whole floor.
export class ResourceScanner {
  private readonly exportsValue: Exports;
  private readonly recognizerValue: ResourceRecognizer;
  private readonly definitionCarrierCollectorValue: DefinitionCarrierCollector;
  private readonly customElementMaterializerValue: CustomElementMaterializer;
  private readonly customAttributeMaterializerValue: CustomAttributeMaterializer;
  private readonly bindingCommandMaterializerValue: BindingCommandMaterializer;
  private readonly valueConverterMaterializerValue: ValueConverterMaterializer;
  private readonly bindingBehaviorMaterializerValue: BindingBehaviorMaterializer;
  private readonly resourceSeedsValue: readonly ResourceDefinition[];

  constructor(
    options: ResourceScannerOptions,
  ) {
    this.exportsValue = options.exports;
    this.recognizerValue = options.recognizer
      ?? new ResourceRecognizer({
        exports: options.exports,
        conventionsActive: options.conventionsActive,
      });
    this.definitionCarrierCollectorValue = options.definitionCarrierCollector
      ?? new DefinitionCarrierCollector({
        recognizer: this.recognizerValue,
      });
    this.customElementMaterializerValue = options.customElementMaterializer
      ?? new CustomElementMaterializer();
    this.customAttributeMaterializerValue = options.customAttributeMaterializer
      ?? new CustomAttributeMaterializer();
    this.bindingCommandMaterializerValue = options.bindingCommandMaterializer
      ?? new BindingCommandMaterializer();
    this.valueConverterMaterializerValue = options.valueConverterMaterializer
      ?? new ValueConverterMaterializer();
    this.bindingBehaviorMaterializerValue = options.bindingBehaviorMaterializer
      ?? new BindingBehaviorMaterializer();
    this.resourceSeedsValue = [...(options.resourceSeeds ?? [])];
  }

  scanCandidates(): readonly ResourceCandidate[] {
    return this.recognizerValue.recognizeAll();
  }

  scanDefinitionCarriers(): readonly DefinitionCarrier[] {
    return this.definitionCarrierCollectorValue.collectAll();
  }

  scanAll(): readonly ResourceDefinition[] {
    const recognized = this.materializeRecognizedDefinitions(this.scanCandidates());
    const merged = mergeDefinitions(recognized, this.resourceSeedsValue);

    // TODO: attribute-patterns still rely on special/bespoke ingress rows.
    // Their runtime definition shape is multi-pattern and registrable-metadata
    // driven, so the current single-row resource model needs a dedicated slice
    // before export-backed AP materialization would be honest.
    //
    // TODO: convention-assisted ingress should not become active here until a
    // separate build-tool/conventions activation layer proves that
    // plugin-conventions (or an equivalent transform) is actually in play for
    // the owning project. The current scanner therefore only benefits from
    // convention names when the recognizer was activated through project-owned
    // tooling law (or a deliberate explicit override in tests/manual wiring).
    return merged.map((resource) => ensureResourceKey(this.materializeDefinition(resource)));
  }

  inspectState(): ResourceScannerState {
    return {
      exportOwnerLabel: this.exportsValue.ownerLabel,
      recognizerExportOwnerLabel: this.recognizerValue.inspectState().exportOwnerLabel,
      carrierCollectorExportOwnerLabel: this.definitionCarrierCollectorValue.inspectState().exportOwnerLabel,
      seedCount: this.resourceSeedsValue.length,
      recognizedCount: this.scanCandidates().length,
    };
  }

  private materializeRecognizedDefinitions(
    candidates: readonly ResourceCandidate[],
  ): readonly ResourceDefinition[] {
    const result: ResourceDefinition[] = [];

    for (const candidate of candidates) {
      const kind = candidate.possibleKinds[0] ?? null;
      const type = candidate.sourceExport.symbol;
      if (kind == null || type == null) {
        continue;
      }

      const conventionName = readConventionName(candidate);
      const definition = kind === 'custom-element'
        ? new CustomElementDefinition(
          createRecognizedDefinitionId(candidate, kind),
          type,
          new CustomElementIdentity(conventionName),
        )
        : kind === 'custom-attribute'
          ? new CustomAttributeDefinition(
            createRecognizedDefinitionId(candidate, kind),
            type,
            new CustomAttributeIdentity(conventionName),
          )
        : kind === 'template-controller'
          ? new TemplateControllerDefinition(
            createRecognizedDefinitionId(candidate, kind),
            type,
            new CustomAttributeIdentity(conventionName),
          )
        : kind === 'binding-command'
          ? new BindingCommandDefinition(
            createRecognizedDefinitionId(candidate, kind),
            type,
            null,
            conventionName,
          )
        : kind === 'value-converter'
          ? new ValueConverterDefinition(
            createRecognizedDefinitionId(candidate, kind),
            type,
            null,
            conventionName,
          )
        : kind === 'binding-behavior'
          ? new BindingBehaviorDefinition(
            createRecognizedDefinitionId(candidate, kind),
            type,
            null,
            conventionName,
          )
          : null;

      if (definition != null) {
        result.push(definition);
      }
    }

    return result;
  }

  private materializeDefinition(
    resource: ResourceDefinition,
  ): ResourceDefinition {
    return resource.kind === 'custom-element'
      ? this.customElementMaterializerValue.materialize(resource)
      : resource.kind === 'custom-attribute' || resource.kind === 'template-controller'
        ? this.customAttributeMaterializerValue.materialize(resource)
      : resource.kind === 'binding-command'
        ? this.bindingCommandMaterializerValue.materialize(resource)
      : resource.kind === 'value-converter'
        ? this.valueConverterMaterializerValue.materialize(resource)
      : resource.kind === 'binding-behavior'
        ? this.bindingBehaviorMaterializerValue.materialize(resource)
        : resource;
  }
}

function createRecognizedDefinitionId(
  candidate: ResourceCandidate,
  kind: ResourceDefinition['kind'],
): string {
  const ownerId = candidate.sourceExport.symbol?.id
    ?? `export:${candidate.sourceExport.name}`;
  return `recognized-resource:${kind}:${ownerId}`;
}

function readConventionName(
  candidate: ResourceCandidate,
): string | null {
  const kind = candidate.possibleKinds[0] ?? null;
  if (
    kind == null
    || !candidate.recognitionPaths.some((current) => current.kind === 'convention' && current.status === 'matched')
  ) {
    return null;
  }

  return deriveConventionName(kind, candidate.sourceExport.name);
}

function deriveConventionName(
  kind: ResourceDefinition['kind'],
  exportName: string,
): string | null {
  switch (kind) {
    case 'custom-element':
      return deriveKebabConventionName(exportName, 'CustomElement');
    case 'custom-attribute':
      return deriveKebabConventionName(exportName, 'CustomAttribute');
    case 'template-controller':
      return deriveKebabConventionName(exportName, 'TemplateController');
    case 'value-converter':
      return deriveLowerCamelConventionName(exportName, 'ValueConverter');
    case 'binding-behavior':
      return deriveLowerCamelConventionName(exportName, 'BindingBehavior');
    case 'binding-command':
      return deriveLowerCamelConventionName(exportName, 'BindingCommand');
    case 'attribute-pattern':
      return null;
  }
}

function deriveKebabConventionName(
  exportName: string,
  suffix: string,
): string | null {
  const base = stripSuffix(exportName, suffix);
  return base == null || base.length === 0
    ? null
    : toKebabCase(base);
}

function deriveLowerCamelConventionName(
  exportName: string,
  suffix: string,
): string | null {
  const base = stripSuffix(exportName, suffix);
  return base == null || base.length === 0
    ? null
    : `${base[0]!.toLowerCase()}${base.slice(1)}`;
}

function stripSuffix(
  value: string,
  suffix: string,
): string | null {
  return value.endsWith(suffix)
    ? value.slice(0, Math.max(0, value.length - suffix.length))
    : null;
}

function toKebabCase(
  value: string,
): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function mergeDefinitions(
  recognized: readonly ResourceDefinition[],
  seeded: readonly ResourceDefinition[],
): readonly ResourceDefinition[] {
  const byIdentity = new Map<string, ResourceDefinition>();

  for (const current of recognized) {
    byIdentity.set(readResourceIdentityKey(current), current);
  }

  for (const current of seeded) {
    byIdentity.set(readResourceIdentityKey(current), current);
  }

  return [...byIdentity.values()];
}

function readResourceIdentityKey(
  resource: ResourceDefinition,
): string {
  return `${resource.kind}:${readTypeIdentity(resource.type)}`;
}

function readTypeIdentity(
  type: ResourceDefinition['type'],
): string {
  return type.kind === 'symbol'
    ? type.id
    : type.id;
}

function ensureResourceKey(
  resource: ResourceDefinition,
): ResourceDefinition {
  if (resource.key != null) {
    return resource;
  }

  const owner = resource.type;
  const name = 'name' in resource ? resource.name : null;
  if (name == null) {
    return resource;
  }

  const key = new KeyRef(
    `au:resource:${resource.kind}:${name}`,
    'resource',
    owner,
    name,
  );

  switch (resource.kind) {
    case 'custom-element':
      return new CustomElementDefinition(
        resource.id,
        resource.type,
        new CustomElementIdentity(
          resource.identity.name,
          resource.identity.aliases,
          key,
          resource.identity.provenance,
          resource.identity.note,
        ),
        resource.policy,
        resource.bindableSurface,
        resource.dependencyContribution,
        resource.templateSource,
        resource.watchSurface,
        resource.lifecycleHooks,
        resource.childrenSurface,
        resource.slottedSurface,
        resource.slotTopology,
      );
    case 'custom-attribute':
      return new CustomAttributeDefinition(
        resource.id,
        resource.type,
        new CustomAttributeIdentity(
          resource.identity.name,
          resource.identity.aliases,
          key,
          resource.identity.provenance,
          resource.identity.note,
        ),
        resource.bindableSurface,
        resource.policy,
        resource.dependencyContribution,
        resource.defaultBindingMode,
        resource.watchSurface,
        resource.lifecycleHooks,
      );
    case 'template-controller':
      return new TemplateControllerDefinition(
        resource.id,
        resource.type,
        new CustomAttributeIdentity(
          resource.identity.name,
          resource.identity.aliases,
          key,
          resource.identity.provenance,
          resource.identity.note,
        ),
        resource.bindableSurface,
        resource.policy,
        resource.dependencyContribution,
        resource.watchSurface,
        resource.lifecycleHooks,
      );
    case 'binding-command':
      return new BindingCommandDefinition(
        resource.id,
        resource.type,
        key,
        resource.name,
        resource.aliases,
        new BindingCommandIdentity(
          resource.identity.name,
          resource.identity.aliases,
          key,
          resource.identity.provenance,
          resource.identity.note,
        ),
        resource.buildBasis,
      );
    case 'value-converter':
      return new ValueConverterDefinition(
        resource.id,
        resource.type,
        key,
        resource.name,
        resource.aliases,
        new ValueConverterIdentity(
          resource.identity.name,
          resource.identity.aliases,
          key,
          resource.identity.provenance,
          resource.identity.note,
        ),
        resource.behavior,
      );
    case 'binding-behavior':
      return new BindingBehaviorDefinition(
        resource.id,
        resource.type,
        key,
        resource.name,
        resource.aliases,
        new BindingBehaviorIdentity(
          resource.identity.name,
          resource.identity.aliases,
          key,
          resource.identity.provenance,
          resource.identity.note,
        ),
        resource.execution,
      );
    case 'attribute-pattern':
      return new AttributePatternDefinition(
        resource.id,
        resource.type,
        key,
        resource.pattern,
        resource.symbols,
      );
  }
}
