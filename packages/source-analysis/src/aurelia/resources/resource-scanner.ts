import type { Exports } from '../exports/index.js';
import { DefinitionCarrierCollector } from './definition-carrier-collector.js';
import type { DefinitionCarrier } from './definition-carrier.js';
import { ResourceRecognizer } from './resource-recognizer.js';
import type { ResourceCandidate } from './resource-candidate.js';
import type { ResourceDefinition } from './resources.js';

export interface ResourceScannerOptions {
  readonly exports: Exports;
  readonly resourceSeeds?: readonly ResourceDefinition[];
  readonly recognizer?: ResourceRecognizer;
  readonly definitionCarrierCollector?: DefinitionCarrierCollector;
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
    return [...this.resourceSeedsValue];
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
