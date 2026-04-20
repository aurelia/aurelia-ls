import { AttributePatternDefinition } from './attribute-pattern-definition.js';
import { BindingBehaviorDefinition } from './binding-behavior-definition.js';
import { BindingCommandDefinition } from './binding-command-definition.js';
import { CustomAttributeDefinition } from './custom-attribute-definition.js';
import { CustomElementDefinition } from './custom-element-definition.js';
import type { ResourceDefinitionKind } from './contracts.js';
import type { DefinitionCarrier } from './definition-carrier.js';
import type { ResourceCandidate } from './resource-candidate.js';
import { ResourceScanner } from './resource-scanner.js';
import { TemplateControllerDefinition } from './template-controller-definition.js';
import { ValueConverterDefinition } from './value-converter-definition.js';

export type ResourceDefinition =
  | AttributePatternDefinition
  | BindingBehaviorDefinition
  | BindingCommandDefinition
  | CustomAttributeDefinition
  | CustomElementDefinition
  | TemplateControllerDefinition
  | ValueConverterDefinition;

export interface ResourcesState {
  readonly ownerLabel: string;
  readonly allCached: boolean;
  readonly candidatesCached: boolean;
  readonly definitionCarriersCached: boolean;
  readonly cachedKinds: readonly ResourceDefinitionKind[];
}

// This is a lazy query/cache facade over resource scanning. The expensive work
// belongs to the scanner seam beneath it; this class owns memoization and
// ergonomic reads over already-materialized resource definitions.
export class Resources {
  private allValue: readonly ResourceDefinition[] | null = null;
  private candidatesValue: readonly ResourceCandidate[] | null = null;
  private definitionCarriersValue: readonly DefinitionCarrier[] | null = null;
  private readonly byKind = new Map<ResourceDefinitionKind, readonly ResourceDefinition[]>();
  private readonly scannerValue: ResourceScanner;
  readonly ownerLabel: string;

  constructor(
    ownerLabel: string,
    scanner: ResourceScanner,
  ) {
    this.ownerLabel = ownerLabel;
    this.scannerValue = scanner;
  }

  readAll(): readonly ResourceDefinition[] {
    this.allValue ??= this.scannerValue.scanAll();
    return [...this.allValue];
  }

  readCandidates(): readonly ResourceCandidate[] {
    this.candidatesValue ??= this.scannerValue.scanCandidates();
    return [...this.candidatesValue];
  }

  readDefinitionCarriers(): readonly DefinitionCarrier[] {
    this.definitionCarriersValue ??= this.scannerValue.scanDefinitionCarriers();
    return [...this.definitionCarriersValue];
  }

  readByKind<TKind extends ResourceDefinitionKind>(
    kind: TKind,
  ): readonly Extract<ResourceDefinition, { kind: TKind }>[] {
    const cached = this.byKind.get(kind);
    if (cached != null) {
      return [...cached] as unknown as readonly Extract<ResourceDefinition, { kind: TKind }>[];
    }

    const definitions = this.readAll();
    const filtered = definitions.filter(
      (resource): resource is Extract<ResourceDefinition, { kind: TKind }> => resource.kind === kind,
    );
    this.byKind.set(kind, filtered);
    return [...filtered];
  }

  readCustomElements(): readonly CustomElementDefinition[] {
    return this.readByKind('custom-element');
  }

  readCustomAttributes(): readonly CustomAttributeDefinition[] {
    return this.readByKind('custom-attribute');
  }

  readTemplateControllers(): readonly TemplateControllerDefinition[] {
    return this.readByKind('template-controller');
  }

  readValueConverters(): readonly ValueConverterDefinition[] {
    return this.readByKind('value-converter');
  }

  readBindingBehaviors(): readonly BindingBehaviorDefinition[] {
    return this.readByKind('binding-behavior');
  }

  readBindingCommands(): readonly BindingCommandDefinition[] {
    return this.readByKind('binding-command');
  }

  readAttributePatterns(): readonly AttributePatternDefinition[] {
    return this.readByKind('attribute-pattern');
  }

  inspectState(): ResourcesState {
    return {
      ownerLabel: this.ownerLabel,
      allCached: this.allValue != null,
      candidatesCached: this.candidatesValue != null,
      definitionCarriersCached: this.definitionCarriersValue != null,
      cachedKinds: [...this.byKind.keys()],
    };
  }
}
