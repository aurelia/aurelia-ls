import type { PositionFamilyDefinition } from "./types.js";

export const POSITION_FAMILY_DEFINITIONS = [
  { family: "attribute-name", gatingTier: "grammar-only", classificationFamilyId: "claim.position.grammar-only-classification", description: "Grammar-only attribute name occurrence." },
  { family: "attribute-value", gatingTier: "grammar-only", classificationFamilyId: "claim.position.grammar-only-classification", description: "Grammar-only attribute value occurrence." },
  { family: "text-interpolation", gatingTier: "grammar-only", classificationFamilyId: "claim.position.grammar-only-classification", description: "Interpolation segment inside text content." },
  { family: "projection-outlet", gatingTier: "grammar-only", classificationFamilyId: "claim.position.grammar-only-classification", description: "Projection outlet structural location." },
  { family: "projection-routing", gatingTier: "grammar-only", classificationFamilyId: "claim.position.grammar-only-classification", description: "Projection routing marker." },
  { family: "local-declaration", gatingTier: "grammar-only", classificationFamilyId: "claim.position.grammar-only-classification", description: "Grammar-level local declaration site." },
  { family: "let-binding", gatingTier: "grammar-only", classificationFamilyId: "claim.position.grammar-only-classification", description: "Template let-binding declaration." },
  { family: "template-meta", gatingTier: "grammar-only", classificationFamilyId: "claim.position.grammar-only-classification", description: "Template metadata position." },
  { family: "local-bindable-declaration", gatingTier: "grammar-only", classificationFamilyId: "claim.position.grammar-only-classification", description: "Local bindable declaration site." },
  { family: "surrogate-metadata", gatingTier: "grammar-only", classificationFamilyId: "claim.position.grammar-only-classification", description: "Surrogate metadata position." },
  { family: "namespace-sensitive", gatingTier: "grammar-only", classificationFamilyId: "claim.position.grammar-only-classification", description: "Namespace-sensitive grammar position." },
  { family: "binding-command-segment", gatingTier: "vocabulary-gated", classificationFamilyId: "claim.position.vocabulary-gated-classification", description: "Binding-command segment requiring vocabulary admission." },
  { family: "iterator-declaration", gatingTier: "vocabulary-gated", classificationFamilyId: "claim.position.vocabulary-gated-classification", description: "Iterator declaration requiring vocabulary admission." },
  { family: "ref-target", gatingTier: "vocabulary-gated", classificationFamilyId: "claim.position.vocabulary-gated-classification", description: "ref target requiring vocabulary admission." },
  { family: "spread-marker", gatingTier: "vocabulary-gated", classificationFamilyId: "claim.position.vocabulary-gated-classification", description: "Spread marker requiring vocabulary admission." },
  { family: "tag-name", gatingTier: "resource-gated", classificationFamilyId: "claim.position.resource-gated-classification", description: "Resource-gated tag name classification." },
  { family: "template-controller-attribute", gatingTier: "resource-gated", classificationFamilyId: "claim.position.resource-gated-classification", description: "Template-controller attribute site." },
  { family: "identity-override", gatingTier: "resource-gated", classificationFamilyId: "claim.position.resource-gated-classification", description: "Identity override position resolved through resource knowledge." },
] as const satisfies readonly PositionFamilyDefinition[];
