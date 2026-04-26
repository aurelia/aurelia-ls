import type {
  SourceFileRef,
  SourceNodeRef,
  SourceSpan,
  TemplateNodeRef,
  TemplateRef,
} from '../refs.js';
import {
  EvidenceSource,
  EvidenceWitness,
  ProvenanceSet,
  readProvenanceSet,
  type ProvenanceMode,
} from '../provenance/index.js';

export const TEMPLATE_DOM_PHASE_KINDS = [
  'authored',
  'parsed',
  'compiled',
  'hydration-adopted',
] as const;

export type TemplateDomPhaseKind =
  typeof TEMPLATE_DOM_PHASE_KINDS[number];

export const TEMPLATE_DOM_SOURCE_KINDS = [
  'markup-string',
  'dom-node',
  'source-file',
  'typescript-node',
  'compiler-generated',
  'compiler-transformed',
  'runtime-adopted',
  'parser-recovery',
  'open',
] as const;

export type TemplateDomSourceKind =
  typeof TEMPLATE_DOM_SOURCE_KINDS[number];

export const TEMPLATE_DOM_PROVENANCE_FIELD_KINDS = [
  'tree',
  'node',
  'parent-child-edge',
  'tag-name',
  'namespace',
  'attribute-name',
  'attribute-value',
  'text',
  'comment',
  'marker',
  'location-pair',
  'target-index',
  'parser-recovery',
] as const;

export type TemplateDomProvenanceFieldKind =
  typeof TEMPLATE_DOM_PROVENANCE_FIELD_KINDS[number];

export const TEMPLATE_DOM_PROVENANCE_MODES = [
  'selected',
  'merged',
  'generated',
  'recovered',
  'presence-only',
] as const satisfies readonly ProvenanceMode[];

export type TemplateDomProvenanceMode =
  typeof TEMPLATE_DOM_PROVENANCE_MODES[number];

export class TemplateDomSource {
  readonly kind = 'template-dom-source' as const;
  readonly evidenceSource: EvidenceSource;

  constructor(
    readonly sourceKind: TemplateDomSourceKind,
    readonly template: TemplateRef | null = null,
    readonly file: SourceFileRef | null = null,
    readonly sourceNode: SourceNodeRef | null = null,
    readonly span: SourceSpan | null = null,
    readonly snippet: string | null = null,
    readonly note: string | null = null,
  ) {
    this.evidenceSource = new EvidenceSource({
      sourceKind,
      file,
      sourceNode,
      template,
      span,
      snippet,
      note,
    });
  }
}

export class TemplateDomWitness {
  readonly kind = 'template-dom-witness' as const;
  readonly evidence: EvidenceWitness<TemplateDomProvenanceFieldKind, TemplateDomSourceKind>;

  constructor(
    readonly field: TemplateDomProvenanceFieldKind,
    readonly source: TemplateDomSource,
    readonly node: TemplateNodeRef | null = null,
    readonly note: string | null = null,
  ) {
    this.evidence = new EvidenceWitness(
      field,
      source.sourceKind,
      node == null ? source.evidenceSource : EvidenceSource.templateNode(node, note),
      note,
    );
  }
}

export class TemplateDomProvenance {
  readonly kind = 'template-dom-provenance' as const;
  readonly provenanceSet: ProvenanceSet<
    TemplateDomProvenanceFieldKind,
    TemplateDomProvenanceMode,
    TemplateDomWitness
  >;

  constructor(
    readonly field: TemplateDomProvenanceFieldKind,
    readonly mode: TemplateDomProvenanceMode,
    readonly selected: TemplateDomWitness | null,
    readonly contributors: readonly TemplateDomWitness[] = [],
    readonly note: string | null = null,
  ) {
    this.provenanceSet = new ProvenanceSet(field, mode, selected, contributors, note);
  }
}

export function readTemplateDomProvenance(
  provenance: readonly TemplateDomProvenance[],
  field: TemplateDomProvenanceFieldKind,
): TemplateDomProvenance | null {
  return readProvenanceSet(provenance, field);
}
