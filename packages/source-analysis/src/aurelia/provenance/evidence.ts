import type {
  SourceFileRef,
  SourceNodeRef,
  SourceSpan,
  TemplateNodeRef,
  TemplateRef,
} from '../refs.js';

export const EVIDENCE_SOURCE_KINDS = [
  'source-file',
  'source-node',
  'template',
  'template-node',
  'markup-string',
  'dom-node',
  'typescript-node',
  'compiler-generated',
  'compiler-transformed',
  'runtime-adopted',
  'parser-recovery',
  'external-location',
  'open',
] as const;

export type EvidenceSourceKind =
  typeof EVIDENCE_SOURCE_KINDS[number];

export const PROVENANCE_MODES = [
  'selected',
  'merged',
  'aggregated',
  'overlay',
  'generated',
  'recovered',
  'policy-generated',
  'presence-only',
] as const;

export type ProvenanceMode =
  typeof PROVENANCE_MODES[number];

export interface EvidenceSourceInit {
  readonly sourceKind: EvidenceSourceKind;
  readonly file?: SourceFileRef | null;
  readonly sourceNode?: SourceNodeRef | null;
  readonly template?: TemplateRef | null;
  readonly templateNode?: TemplateNodeRef | null;
  readonly span?: SourceSpan | null;
  readonly snippet?: string | null;
  readonly note?: string | null;
  readonly location?: string | null;
}

export class EvidenceSource {
  readonly kind = 'evidence-source' as const;
  readonly sourceKind: EvidenceSourceKind;
  readonly file: SourceFileRef | null;
  readonly sourceNode: SourceNodeRef | null;
  readonly template: TemplateRef | null;
  readonly templateNode: TemplateNodeRef | null;
  readonly span: SourceSpan | null;
  readonly snippet: string | null;
  readonly note: string | null;
  readonly location: string | null;

  constructor(
    init: EvidenceSourceInit,
  ) {
    this.sourceKind = init.sourceKind;
    this.file = init.file ?? null;
    this.sourceNode = init.sourceNode ?? null;
    this.template = init.template ?? null;
    this.templateNode = init.templateNode ?? null;
    this.span = init.span ?? null;
    this.snippet = init.snippet ?? null;
    this.note = init.note ?? null;
    this.location = init.location ?? null;
  }

  static sourceFile(
    file: SourceFileRef,
    note: string | null = null,
  ): EvidenceSource {
    return new EvidenceSource({ sourceKind: 'source-file', file, note });
  }

  static sourceNode(
    sourceNode: SourceNodeRef,
    note: string | null = null,
  ): EvidenceSource {
    return new EvidenceSource({
      sourceKind: 'source-node',
      file: sourceNode.file,
      sourceNode,
      span: sourceNode.span,
      note,
    });
  }

  static template(
    template: TemplateRef,
    note: string | null = null,
  ): EvidenceSource {
    return new EvidenceSource({
      sourceKind: 'template',
      file: template.file,
      template,
      span: template.span,
      note,
    });
  }

  static templateNode(
    templateNode: TemplateNodeRef,
    note: string | null = null,
  ): EvidenceSource {
    return new EvidenceSource({
      sourceKind: 'template-node',
      file: templateNode.template.file,
      sourceNode: templateNode.source,
      template: templateNode.template,
      templateNode,
      span: templateNode.source?.span ?? null,
      note,
    });
  }

  static generated(
    note: string | null = null,
  ): EvidenceSource {
    return new EvidenceSource({ sourceKind: 'compiler-generated', note });
  }

  static externalLocation(
    location: string,
    note: string | null = null,
  ): EvidenceSource {
    return new EvidenceSource({
      sourceKind: 'external-location',
      note,
      location,
    });
  }

  static open(
    note: string | null = null,
  ): EvidenceSource {
    return new EvidenceSource({ sourceKind: 'open', note });
  }
}

export class EvidenceWitness<
  TField extends string = string,
  TBasis extends string = string,
> {
  readonly kind = 'evidence-witness' as const;

  constructor(
    readonly field: TField,
    readonly basis: TBasis,
    readonly source: EvidenceSource,
    readonly note: string | null = null,
  ) {}
}

export class ProvenanceSet<
  TField extends string = string,
  TMode extends string = ProvenanceMode,
  TWitness = EvidenceWitness<TField>,
> {
  readonly kind = 'provenance-set' as const;

  constructor(
    readonly field: TField,
    readonly mode: TMode,
    readonly selected: TWitness | null,
    readonly contributors: readonly TWitness[] = [],
    readonly note: string | null = null,
  ) {}
}

export class OpenSeamEvidence<TKind extends string = string> {
  readonly kind = 'open-seam-evidence' as const;

  constructor(
    readonly seamKind: TKind,
    readonly source: EvidenceSource | null = null,
    readonly location: string | null = null,
    readonly note: string | null = null,
  ) {}

  static fromSourceNode<TKind extends string>(
    seamKind: TKind,
    source: SourceNodeRef | null,
    location: string | null = null,
    note: string | null = null,
  ): OpenSeamEvidence<TKind> {
    return new OpenSeamEvidence(
      seamKind,
      source == null ? null : EvidenceSource.sourceNode(source, note),
      location,
      note,
    );
  }
}

export class MaterializationRecord<
  TOwner = unknown,
  TProduct = unknown,
  TOpenSeam = unknown,
> {
  readonly kind = 'materialization-record' as const;

  constructor(
    readonly owner: TOwner,
    readonly products: readonly TProduct[] = [],
    readonly openSeams: readonly TOpenSeam[] = [],
    readonly note: string | null = null,
  ) {}
}

export function readProvenanceSet<
  TField extends string,
  TSet extends { readonly field: TField },
>(
  provenance: readonly TSet[],
  field: TField,
): TSet | null {
  return provenance.find((current) => current.field === field) ?? null;
}

export function compactProvenanceSets<TSet>(
  provenance: readonly (TSet | null | undefined)[],
): readonly TSet[] {
  return provenance.filter((current): current is TSet => current != null);
}
