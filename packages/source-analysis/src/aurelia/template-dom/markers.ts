import {
  readTemplateDomProvenance,
  type TemplateDomProvenance,
  type TemplateDomProvenanceFieldKind,
} from './provenance.js';

export const AURELIA_TEMPLATE_MARKER_TEXT = {
  hydrationTarget: 'au',
  renderLocationStart: 'au-start',
  renderLocationEnd: 'au-end',
} as const;

export type AureliaTemplateMarkerText =
  typeof AURELIA_TEMPLATE_MARKER_TEXT[keyof typeof AURELIA_TEMPLATE_MARKER_TEXT];

export const TEMPLATE_COMMENT_MARKER_KINDS = [
  'hydration-target',
  'render-location-start',
  'render-location-end',
  'ordinary-comment',
  'unknown-aurelia-marker',
] as const;

export type TemplateCommentMarkerKind =
  typeof TEMPLATE_COMMENT_MARKER_KINDS[number];

export class HydrationTargetMarker {
  readonly kind = 'hydration-target' as const;
  readonly text = AURELIA_TEMPLATE_MARKER_TEXT.hydrationTarget;

  constructor(
    readonly targetIndex: number | null = null,
    readonly targetNodeId: string | null = null,
    readonly provenance: readonly TemplateDomProvenance[] = [],
  ) {}

  readProvenance(
    field: TemplateDomProvenanceFieldKind,
  ): TemplateDomProvenance | null {
    return readTemplateDomProvenance(this.provenance, field);
  }
}

export class RenderLocationStartMarker {
  readonly kind = 'render-location-start' as const;
  readonly text = AURELIA_TEMPLATE_MARKER_TEXT.renderLocationStart;

  constructor(
    readonly pairId: string | null = null,
    readonly endMarkerId: string | null = null,
    readonly provenance: readonly TemplateDomProvenance[] = [],
  ) {}

  readProvenance(
    field: TemplateDomProvenanceFieldKind,
  ): TemplateDomProvenance | null {
    return readTemplateDomProvenance(this.provenance, field);
  }
}

export class RenderLocationEndMarker {
  readonly kind = 'render-location-end' as const;
  readonly text = AURELIA_TEMPLATE_MARKER_TEXT.renderLocationEnd;

  constructor(
    readonly pairId: string | null = null,
    readonly startMarkerId: string | null = null,
    readonly targetIndex: number | null = null,
    readonly provenance: readonly TemplateDomProvenance[] = [],
  ) {}

  readProvenance(
    field: TemplateDomProvenanceFieldKind,
  ): TemplateDomProvenance | null {
    return readTemplateDomProvenance(this.provenance, field);
  }
}

export class OrdinaryCommentMarker {
  readonly kind = 'ordinary-comment' as const;

  constructor(
    readonly text: string,
    readonly provenance: readonly TemplateDomProvenance[] = [],
  ) {}

  readProvenance(
    field: TemplateDomProvenanceFieldKind,
  ): TemplateDomProvenance | null {
    return readTemplateDomProvenance(this.provenance, field);
  }
}

export class UnknownAureliaMarker {
  readonly kind = 'unknown-aurelia-marker' as const;

  constructor(
    readonly text: string,
    readonly provenance: readonly TemplateDomProvenance[] = [],
  ) {}

  readProvenance(
    field: TemplateDomProvenanceFieldKind,
  ): TemplateDomProvenance | null {
    return readTemplateDomProvenance(this.provenance, field);
  }
}

export class RenderLocationMarkerPair {
  readonly kind = 'render-location-marker-pair' as const;

  constructor(
    readonly id: string,
    readonly startMarkerId: string,
    readonly endMarkerId: string,
    readonly targetIndex: number | null = null,
    readonly provenance: readonly TemplateDomProvenance[] = [],
  ) {}

  readProvenance(
    field: TemplateDomProvenanceFieldKind,
  ): TemplateDomProvenance | null {
    return readTemplateDomProvenance(this.provenance, field);
  }
}

export type TemplateCommentMarker =
  | HydrationTargetMarker
  | RenderLocationStartMarker
  | RenderLocationEndMarker
  | OrdinaryCommentMarker
  | UnknownAureliaMarker;

export function classifyTemplateCommentMarker(
  text: string,
): TemplateCommentMarkerKind {
  switch (text) {
    case AURELIA_TEMPLATE_MARKER_TEXT.hydrationTarget:
      return 'hydration-target';
    case AURELIA_TEMPLATE_MARKER_TEXT.renderLocationStart:
      return 'render-location-start';
    case AURELIA_TEMPLATE_MARKER_TEXT.renderLocationEnd:
      return 'render-location-end';
    default:
      return text.startsWith('au-') ? 'unknown-aurelia-marker' : 'ordinary-comment';
  }
}

export function createTemplateCommentMarker(
  text: string,
  provenance: readonly TemplateDomProvenance[] = [],
): TemplateCommentMarker {
  switch (classifyTemplateCommentMarker(text)) {
    case 'hydration-target':
      return new HydrationTargetMarker(null, null, provenance);
    case 'render-location-start':
      return new RenderLocationStartMarker(null, null, provenance);
    case 'render-location-end':
      return new RenderLocationEndMarker(null, null, null, provenance);
    case 'unknown-aurelia-marker':
      return new UnknownAureliaMarker(text, provenance);
    case 'ordinary-comment':
      return new OrdinaryCommentMarker(text, provenance);
  }
}
