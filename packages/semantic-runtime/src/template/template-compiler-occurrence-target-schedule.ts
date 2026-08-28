import type { ClaimEndpointHandle } from '../kernel/claim.js';
import type { AddressHandle } from '../kernel/handles.js';
import {
  TemplateCompilerContainerlessReplacementPlacement,
  TemplateCompilerMarkerTargetPlacement,
  type TemplateCompilerTargetRowPlan,
} from './compiler-target-plan.js';
import { TemplateCompilerLiveAttributeDisposition } from './template-compiler-live-attribute-owner.js';
import {
  TemplateCompilerElementOccurrence,
  type TemplateCompilerAttributeOccurrence,
  type TemplateCompilerTextOccurrence,
} from './template-compiler-occurrence.js';
import {
  TemplateCompilerTextExpansionOutputKind,
  type TemplateCompilerElementLoweringSite,
  type TemplateCompilerLetLoweringSite,
  type TemplateCompilerOccurrenceAttributeDispositionDraft,
  type TemplateCompilerOccurrenceTargetRowDraft,
  type TemplateCompilerTextLoweringSite,
  type TemplateCompilerTextExpansionDraft,
} from './template-compiler-occurrence-row-assembly.js';
import type {
  TemplateCompilerOccurrenceTargetPlanAssembly,
  TemplateCompilerOccurrenceTargetAttributeDispositionMapping,
  TemplateCompilerOccurrenceTargetRowMapping,
} from './template-compiler-occurrence-target-plan.js';

const occurrenceTargetScheduleAuthority = {};

type TemplateCompilerElementTargetLoweringSite =
  | TemplateCompilerElementLoweringSite
  | TemplateCompilerLetLoweringSite;
const schedulesByAssembly = new WeakMap<
  TemplateCompilerOccurrenceTargetPlanAssembly,
  TemplateCompilerOccurrenceTargetSchedule
>();

export const enum TemplateCompilerOccurrenceTargetScheduleEntryKind {
  AttributeDisposition = 'attribute-disposition',
  ElementTarget = 'element-target',
  TextExpansion = 'text-expansion',
}

export class TemplateCompilerOccurrenceAttributeScheduleEntry {
  readonly entryKind = TemplateCompilerOccurrenceTargetScheduleEntryKind.AttributeDisposition;

  constructor(readonly mapping: TemplateCompilerOccurrenceTargetAttributeDispositionMapping) {}

  get disposition(): TemplateCompilerOccurrenceAttributeDispositionDraft {
    return this.mapping.draft;
  }

  get operationKey(): string {
    return this.disposition.stableSlotKey;
  }

  get occurrence(): TemplateCompilerAttributeOccurrence {
    return this.disposition.attribute;
  }

  get causeHandles(): readonly ClaimEndpointHandle[] {
    return this.mapping.causeHandles;
  }

  get sourceAddressHandle(): AddressHandle | null {
    return this.disposition.attribute.inputReference?.addressHandle ?? null;
  }
}

export class TemplateCompilerOccurrenceElementTargetScheduleEntry {
  readonly entryKind = TemplateCompilerOccurrenceTargetScheduleEntryKind.ElementTarget;
  readonly occurrence: TemplateCompilerElementOccurrence;

  constructor(readonly mapping: TemplateCompilerOccurrenceTargetRowMapping) {
    if (
      !(mapping.draft.occurrence instanceof TemplateCompilerElementOccurrence)
      || (
        !(mapping.row.placement instanceof TemplateCompilerMarkerTargetPlacement)
        && !(mapping.row.placement instanceof TemplateCompilerContainerlessReplacementPlacement)
      )
    ) {
      throw new Error(`Element schedule entry '${mapping.row.localKey}' lost its element occurrence.`);
    }
    this.occurrence = mapping.draft.occurrence;
  }

  get operationKey(): string {
    return this.mapping.row.localKey;
  }

  get causeHandles(): readonly ClaimEndpointHandle[] {
    return rowCauseHandles(this.mapping.row);
  }

  get sourceAddressHandle(): AddressHandle | null {
    return this.mapping.row.sourceAddressHandle;
  }
}

export class TemplateCompilerOccurrenceTextExpansionScheduleEntry {
  readonly entryKind = TemplateCompilerOccurrenceTargetScheduleEntryKind.TextExpansion;
  readonly causeHandles: readonly ClaimEndpointHandle[];

  constructor(
    readonly contextLocalKey: string,
    readonly expansion: TemplateCompilerTextExpansionDraft,
    readonly mappings: readonly TemplateCompilerOccurrenceTargetRowMapping[],
  ) {
    this.causeHandles = mappings.flatMap((mapping) => rowCauseHandles(mapping.row));
  }

  get operationKey(): string {
    return `${this.contextLocalKey}:${this.expansion.stableSlotKey}`;
  }

  get occurrence(): TemplateCompilerTextOccurrence {
    return this.expansion.site.event.text;
  }

  get sourceAddressHandle(): AddressHandle | null {
    return this.expansion.site.event.text.inputReference?.addressHandle ?? null;
  }
}

export type TemplateCompilerOccurrenceTargetScheduleEntry =
  | TemplateCompilerOccurrenceAttributeScheduleEntry
  | TemplateCompilerOccurrenceElementTargetScheduleEntry
  | TemplateCompilerOccurrenceTextExpansionScheduleEntry;

/** One exact mechanical operation schedule derived from a receipt-bound occurrence target plan. */
export class TemplateCompilerOccurrenceTargetSchedule {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly assembly: TemplateCompilerOccurrenceTargetPlanAssembly,
    readonly entries: readonly TemplateCompilerOccurrenceTargetScheduleEntry[],
    readonly attributeDispositionsBySite: ReadonlyMap<
      TemplateCompilerElementLoweringSite,
      readonly TemplateCompilerOccurrenceAttributeDispositionDraft[]
    >,
    readonly elementRowBySite: ReadonlyMap<
      TemplateCompilerElementTargetLoweringSite,
      TemplateCompilerOccurrenceTargetRowMapping
    >,
    readonly textExpansionBySite: ReadonlyMap<
      TemplateCompilerTextLoweringSite,
      TemplateCompilerTextExpansionDraft
    >,
    readonly textRowsByExpansion: ReadonlyMap<
      TemplateCompilerTextExpansionDraft,
      readonly TemplateCompilerOccurrenceTargetRowMapping[]
    >,
  ) {
    if (
      authority !== occurrenceTargetScheduleAuthority
      || entries.some((entry) => entry.operationKey.length === 0 || entry.causeHandles.length === 0)
    ) {
      throw new Error('Occurrence target schedule lost assembly, operation, or cause authority.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === occurrenceTargetScheduleAuthority;
  }
}

/** Preflight the complete operation partition without mutating execution or structural state. */
export function buildTemplateCompilerOccurrenceTargetSchedule(
  assembly: TemplateCompilerOccurrenceTargetPlanAssembly,
): TemplateCompilerOccurrenceTargetSchedule {
  const existing = schedulesByAssembly.get(assembly) ?? null;
  if (existing != null) return existing;
  if (!assembly.isModuleConstructed()) {
    throw new Error('Occurrence target scheduling requires one module-constructed plan assembly.');
  }
  const rows = assembly.rows;
  const mappingsByDraft = new Map(assembly.rowMappings.map((mapping) => [mapping.draft, mapping] as const));
  const dispositionMappingsByDraft = new Map(
    assembly.attributeDispositionMappings.map((mapping) => [mapping.draft, mapping] as const),
  );
  const attributeDispositionsBySite = groupBy(rows.attributeDispositions, (disposition) => disposition.site);
  const elementRowBySite = new Map<
    TemplateCompilerElementTargetLoweringSite,
    TemplateCompilerOccurrenceTargetRowMapping
  >();
  const textExpansionBySite = new Map<
    TemplateCompilerTextLoweringSite,
    TemplateCompilerTextExpansionDraft
  >();
  const textRowsByExpansion = new Map<
    TemplateCompilerTextExpansionDraft,
    readonly TemplateCompilerOccurrenceTargetRowMapping[]
  >();
  const scheduledMappings = new Set<TemplateCompilerOccurrenceTargetRowMapping>();

  for (const draft of rows.rows) {
    const mapping = mappingsByDraft.get(draft) ?? null;
    if (mapping == null || mapping.row.occurrence !== draft.occurrence) {
      throw new Error(`Occurrence row '${draft.stableSlotKey}' lost its exact target-plan mapping.`);
    }
    if (draft.site.siteKind === 'element' || draft.site.siteKind === 'let') {
      if (elementRowBySite.has(draft.site)) {
        throw new Error(`Element site '${draft.stableSlotKey}' is not one exact native row.`);
      }
      elementRowBySite.set(draft.site, mapping);
      scheduledMappings.add(mapping);
    }
  }
  for (const expansion of rows.textExpansions) {
    if (textExpansionBySite.has(expansion.site)) {
      throw new Error(`Text site '${expansion.stableSlotKey}' repeats its expansion band.`);
    }
    const mappings = rowsForTextExpansion(rows.rows, mappingsByDraft, expansion);
    textExpansionBySite.set(expansion.site, expansion);
    textRowsByExpansion.set(expansion, mappings);
    for (const mapping of mappings) scheduledMappings.add(mapping);
  }
  if (
    [...attributeDispositionsBySite.keys()].some((site) => site.siteKind !== 'element')
    || [...elementRowBySite.keys()].some((site) => site.siteKind !== 'element' && site.siteKind !== 'let')
    || [...textExpansionBySite.keys()].some((site) => site.siteKind !== 'text')
    || scheduledMappings.size !== assembly.rowMappings.length
    || assembly.rowMappings.some((mapping) => !scheduledMappings.has(mapping))
  ) {
    throw new Error('Occurrence target execution schedule lost site kind or row coverage.');
  }

  const entries: TemplateCompilerOccurrenceTargetScheduleEntry[] = [];
  for (const site of rows.receipt.orderedSites) {
    if (site.siteKind === 'element' || site.siteKind === 'let') {
      const dispositions = site.siteKind === 'element'
        ? attributeDispositionsBySite.get(site) ?? []
        : [];
      for (const disposition of dispositions) {
        if (disposition.disposition === TemplateCompilerLiveAttributeDisposition.Removed) {
          const mapping = dispositionMappingsByDraft.get(disposition) ?? null;
          if (mapping == null) {
            throw new Error(`Attribute disposition '${disposition.stableSlotKey}' has no funded cause mapping.`);
          }
          entries.push(new TemplateCompilerOccurrenceAttributeScheduleEntry(mapping));
        }
      }
      const mapping = elementRowBySite.get(site) ?? null;
      if (mapping != null) entries.push(new TemplateCompilerOccurrenceElementTargetScheduleEntry(mapping));
    } else {
      const expansion = textExpansionBySite.get(site) ?? null;
      if (expansion != null) {
        entries.push(new TemplateCompilerOccurrenceTextExpansionScheduleEntry(
          assembly.targetPlan.root.localKey,
          expansion,
          textRowsByExpansion.get(expansion)!,
        ));
      }
    }
  }
  const schedule = new TemplateCompilerOccurrenceTargetSchedule(
    occurrenceTargetScheduleAuthority,
    assembly,
    entries,
    attributeDispositionsBySite,
    elementRowBySite,
    textExpansionBySite,
    textRowsByExpansion,
  );
  schedulesByAssembly.set(assembly, schedule);
  return schedule;
}

function rowsForTextExpansion(
  drafts: readonly TemplateCompilerOccurrenceTargetRowDraft[],
  mappingsByDraft: ReadonlyMap<TemplateCompilerOccurrenceTargetRowDraft, TemplateCompilerOccurrenceTargetRowMapping>,
  expansion: TemplateCompilerTextExpansionDraft,
): readonly TemplateCompilerOccurrenceTargetRowMapping[] {
  const mappings = drafts.flatMap((draft) => {
    if (draft.site !== expansion.site || draft.textOutput == null) return [];
    const mapping = mappingsByDraft.get(draft);
    return mapping == null ? [] : [mapping];
  });
  const holeCount = expansion.outputs.filter((output) =>
    output.outputKind === TemplateCompilerTextExpansionOutputKind.Hole
  ).length;
  if (
    mappings.length !== holeCount
    || mappings.some((mapping, index) => mapping.draft.textOutput?.holeIndex !== index)
  ) {
    throw new Error(`Text expansion '${expansion.stableSlotKey}' lost exact hole-row order.`);
  }
  return mappings;
}

function rowCauseHandles(row: TemplateCompilerTargetRowPlan): readonly ClaimEndpointHandle[] {
  const causes = row.instructions.map((instruction) => instruction.productHandle);
  if (causes.length === 0) {
    throw new Error(`Compiler target row '${row.localKey}' has no semantic cause.`);
  }
  return causes;
}

function groupBy<TValue, TKey>(
  values: readonly TValue[],
  keyFor: (value: TValue) => TKey,
): ReadonlyMap<TKey, readonly TValue[]> {
  const result = new Map<TKey, TValue[]>();
  for (const value of values) {
    const key = keyFor(value);
    const existing = result.get(key);
    if (existing == null) result.set(key, [value]);
    else existing.push(value);
  }
  return result;
}
