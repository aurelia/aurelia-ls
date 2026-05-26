import { AppBuilderDomainSlotKind } from './domain-model.js';
import type { AppBuilderReferenceScenarioId } from './reference-scenario.js';
import type { AppBuilderSolutionSpaceId } from './solution-space.js';

/** Public starter-domain preset used to fill domain slots when the caller has not supplied a domain yet. */
export enum AppBuilderDomainPresetId {
  /** Simple task list domain for first collection, form, repeat, checked, and add-item starter pressure. */
  TaskList = 'task-list',
}

/** Primitive value kind for generated starter-domain fields. */
export enum AppBuilderDomainFieldValueKind {
  /** Human-readable string field. */
  Text = 'text',
  /** Boolean state field. */
  Boolean = 'boolean',
  /** Numeric scalar field. */
  Number = 'number',
}

/** Field supplied by a starter-domain preset before app-builder lowers source text. */
export interface AppBuilderDomainFieldDescriptor {
  readonly name: string;
  readonly title: string;
  readonly valueKind: AppBuilderDomainFieldValueKind;
  readonly required?: boolean;
}

/** Starter-domain preset that fills concrete domain slots without becoming pattern ontology. */
export interface AppBuilderDomainPresetDescriptor {
  readonly id: AppBuilderDomainPresetId;
  readonly title: string;
  readonly summary: string;
  readonly entityTitle: string;
  readonly entityTypeName: string;
  readonly collectionMemberName: string;
  readonly identityMemberName: string;
  readonly fields: readonly AppBuilderDomainFieldDescriptor[];
  readonly slotKinds: readonly AppBuilderDomainSlotKind[];
  readonly solutionSpaceIds?: readonly AppBuilderSolutionSpaceId[];
  readonly referenceScenarioIds?: readonly AppBuilderReferenceScenarioId[];
}
