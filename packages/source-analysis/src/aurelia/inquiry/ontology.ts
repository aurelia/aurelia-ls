/**
 * Inquiry ontology.
 *
 * These names classify questions and answers, not app semantics, transports, or presentation policy. A relation here
 * says what the caller is trying to inspect; a durable relationship discovered in an Aurelia app should still become
 * kernel vocabulary and claims.
 */

export const enum InquiryFamilyKind {
  /** Enumerate known records, products, source files, resources, or graph rows. */
  Inventory = 'inventory',
  /** Resolve a name, handle, source locus, or symbolic reference to semantic targets. */
  Resolve = 'resolve',
  /** Produce candidates at a cursor or incomplete frontier. */
  Complete = 'complete',
  /** Explain why a fact, product, or edge exists. */
  Explain = 'explain',
  /** Return adjacent graph structure around a selected locus or product. */
  Neighborhood = 'neighborhood',
  /** Answer what is visible or available from a locus. */
  Visibility = 'visibility',
  /** Answer what depends on or may change because of a selected thing. */
  Impact = 'impact',
  /** Surface open seams, diagnostics, or unsupported paths. */
  Validate = 'validate',
  /** Hydrate a durable handle into current-run detail. */
  Hydrate = 'hydrate',
}

export const enum InquirySubjectKind {
  /** Whole active analysis workspace. */
  Workspace = 'workspace',
  /** One project frame inside the workspace. */
  Project = 'project',
  /** Admitted source file. */
  SourceFile = 'source-file',
  /** TypeScript module or module export/import relation. */
  Module = 'module',
  /** Aurelia resource definition, header, catalog row, or visibility row. */
  Resource = 'resource',
  /** Aurelia configuration flow, option, task, or app root. */
  Configuration = 'configuration',
  /** Registration admission before container spending. */
  Registration = 'registration',
  /** Abstract DI container, resolver, slot, lookup, or key. */
  DependencyInjection = 'dependency-injection',
  /** Controller, app root controller, custom-element controller, or custom-attribute controller. */
  Controller = 'controller',
  /** Template document, node, attribute, value site, or compiler context. */
  Template = 'template',
  /** Aurelia expression parse result, AST, or parser candidate. */
  Expression = 'expression',
  /** Lowered binding or binding-command behavior. */
  Binding = 'binding',
  /** Lowered rendering instruction or instruction sequence. */
  Instruction = 'instruction',
  /** Any handle-bearing kernel record before the caller has narrowed the family. */
  KernelRecord = 'kernel-record',
  /** Kernel materialized product envelope. */
  Product = 'product',
  /** Kernel semantic claim or claim neighborhood. */
  Claim = 'claim',
  /** Provenance, evidence, derivation, or source lineage. */
  Explanation = 'explanation',
  /** Open seam, recovery state, unsupported path, or diagnostic pressure. */
  OpenSeam = 'open-seam',
}

export const enum InquiryRelationKind {
  /** Enumerate contained or owned things. */
  Contains = 'contains',
  /** Locate declarations or definition-like source anchors. */
  Declares = 'declares',
  /** Locate references or usage-like source anchors. */
  References = 'references',
  /** Resolve a symbolic or source-level reference to target semantics. */
  ResolvesTo = 'resolves-to',
  /** Determine whether a semantic thing is visible from a locus. */
  VisibleIn = 'visible-in',
  /** Trace configuration or registration admission into a container world. */
  RegisteredIn = 'registered-in',
  /** Trace configuration flow or options that shaped a product. */
  ConfiguredBy = 'configured-by',
  /** Follow materialized outputs from source/evaluation/template/compiler steps. */
  Produces = 'produces',
  /** Follow inputs consumed by source/evaluation/template/compiler steps. */
  Consumes = 'consumes',
  /** Follow lowering from authored source into compiler products. */
  LowersTo = 'lowers-to',
  /** Follow parser output from source text into syntax or expression products. */
  ParsesAs = 'parses-as',
  /** Follow dependency or data-flow edges between semantic products. */
  DependsOn = 'depends-on',
  /** Find reverse dependencies or change impact. */
  Impacts = 'impacts',
  /** Expand evidence, provenance, derivation, or source context. */
  ExplainedBy = 'explained-by',
  /** Expand a durable product handle into current-run product detail. */
  HydratesTo = 'hydrates-to',
  /** Surface open seams or unsupported paths that block closure. */
  BlockedBy = 'blocked-by',
  /** Produce candidate answers without claiming resolution. */
  OffersCandidate = 'offers-candidate',
}

/** Description of what a query is trying to learn before projection or presentation policy is applied. */
export class InquiryIntent {
  readonly kind = 'inquiry-intent' as const;

  constructor(
    /** Broad answer family for routing, continuation choice, and workbench grouping. */
    readonly familyKind: InquiryFamilyKind,
    /** Main semantic subject the caller is asking about. */
    readonly subjectKind: InquirySubjectKind,
    /** Relationship being inspected; null when the family is enough. */
    readonly relationKind: InquiryRelationKind | null = null,
  ) {}
}

export const InquiryIntents = {
  SelectorResolution: new InquiryIntent(
    InquiryFamilyKind.Resolve,
    InquirySubjectKind.SourceFile,
    InquiryRelationKind.ResolvesTo,
  ),
  AdmittedSourceInventory: new InquiryIntent(
    InquiryFamilyKind.Inventory,
    InquirySubjectKind.SourceFile,
    InquiryRelationKind.Contains,
  ),
  ProductDetailHydration: new InquiryIntent(
    InquiryFamilyKind.Hydrate,
    InquirySubjectKind.Product,
    InquiryRelationKind.HydratesTo,
  ),
  ClaimNeighborhood: new InquiryIntent(
    InquiryFamilyKind.Neighborhood,
    InquirySubjectKind.Claim,
    InquiryRelationKind.Contains,
  ),
  ProvenanceTrace: new InquiryIntent(
    InquiryFamilyKind.Explain,
    InquirySubjectKind.Explanation,
    InquiryRelationKind.ExplainedBy,
  ),
  OpenSeamInspection: new InquiryIntent(
    InquiryFamilyKind.Validate,
    InquirySubjectKind.OpenSeam,
    InquiryRelationKind.BlockedBy,
  ),
  TemplateCompletion: new InquiryIntent(
    InquiryFamilyKind.Complete,
    InquirySubjectKind.Template,
    InquiryRelationKind.OffersCandidate,
  ),
  ExpressionCompletion: new InquiryIntent(
    InquiryFamilyKind.Complete,
    InquirySubjectKind.Expression,
    InquiryRelationKind.OffersCandidate,
  ),
} as const;
