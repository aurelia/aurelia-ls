import type { Exports } from '../exports/index.js';
import { BindingBehaviorMaterializer } from './binding-behavior-materializer.js';
import { BindingCommandMaterializer } from './binding-command-materializer.js';
import { CustomAttributeMaterializer } from './custom-attribute-materializer.js';
import { CustomElementMaterializer } from './custom-element-materializer.js';
import { DefinitionCarrierCollector } from './definition-carrier-collector.js';
import type { DefinitionCarrier } from './definition-carrier.js';
import { ResourceRecognizer } from './resource-recognizer.js';
import type { ResourceCandidate } from './resource-candidate.js';
import type { ResourceDefinition } from './resources.js';
import { ValueConverterMaterializer } from './value-converter-materializer.js';

export interface ResourceScannerOptions {
  readonly exports: Exports;
  readonly resourceSeeds?: readonly ResourceDefinition[];
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
}

// This seam owns the expensive cold path for resource reads. Today it only
// returns seeded definitions so the higher-level API shape can harden without
// pretending that export classification and resource materialization are done.
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
      ?? new ResourceRecognizer({ exports: options.exports });
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
    const carriers = this.scanDefinitionCarriers();
    void carriers;

    // TODO: cold resource scans should spend recognized candidates plus carrier
    // convergence to materialize real definitions with field-level provenance.
    // This is where decorator/static-$au/metadata/convention precedence will
    // eventually need to land. The current seed-only return is still a
    // scaffolding floor, not the real materialization story.
    return this.resourceSeedsValue.map((resource) =>
      resource.kind === 'custom-element'
        ? this.customElementMaterializerValue.materialize(resource)
        : resource.kind === 'custom-attribute' || resource.kind === 'template-controller'
          ? this.customAttributeMaterializerValue.materialize(resource)
        : resource.kind === 'binding-command'
          ? this.bindingCommandMaterializerValue.materialize(resource)
        : resource.kind === 'value-converter'
          ? this.valueConverterMaterializerValue.materialize(resource)
        : resource.kind === 'binding-behavior'
          ? this.bindingBehaviorMaterializerValue.materialize(resource)
          : resource,
    );
  }

  inspectState(): ResourceScannerState {
    return {
      exportOwnerLabel: this.exportsValue.ownerLabel,
      recognizerExportOwnerLabel: this.recognizerValue.inspectState().exportOwnerLabel,
      carrierCollectorExportOwnerLabel: this.definitionCarrierCollectorValue.inspectState().exportOwnerLabel,
      seedCount: this.resourceSeedsValue.length,
    };
  }
}
