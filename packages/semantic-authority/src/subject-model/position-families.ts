import type { PositionFamilyDefinition } from "./types.js";

export const POSITION_FAMILY_DEFINITIONS = [
  { family: "attribute-name", gatingTier: "grammar-only", description: "Grammar-only attribute name occurrence." },
  { family: "attribute-value", gatingTier: "grammar-only", description: "Grammar-only attribute value occurrence." },
  { family: "text-interpolation", gatingTier: "grammar-only", description: "Interpolation segment inside text content." },
  { family: "projection-outlet", gatingTier: "grammar-only", description: "Projection outlet structural location." },
  { family: "projection-routing", gatingTier: "grammar-only", description: "Projection routing marker." },
  { family: "local-declaration", gatingTier: "grammar-only", description: "Grammar-level local declaration site." },
  { family: "let-binding", gatingTier: "grammar-only", description: "Template let-binding declaration." },
  { family: "template-meta", gatingTier: "grammar-only", description: "Template metadata position." },
  { family: "local-bindable-declaration", gatingTier: "grammar-only", description: "Local bindable declaration site." },
  { family: "surrogate-metadata", gatingTier: "grammar-only", description: "Surrogate metadata position." },
  { family: "namespace-sensitive", gatingTier: "grammar-only", description: "Namespace-sensitive grammar position." },
  { family: "binding-command-segment", gatingTier: "vocabulary-gated", description: "Binding-command segment requiring vocabulary admission." },
  { family: "iterator-declaration", gatingTier: "vocabulary-gated", description: "Iterator declaration requiring vocabulary admission." },
  { family: "ref-target", gatingTier: "vocabulary-gated", description: "ref target requiring vocabulary admission." },
  { family: "spread-marker", gatingTier: "vocabulary-gated", description: "Spread marker requiring vocabulary admission." },
  { family: "tag-name", gatingTier: "resource-gated", description: "Resource-gated tag name classification." },
  { family: "template-controller-attribute", gatingTier: "resource-gated", description: "Template-controller attribute site." },
  { family: "identity-override", gatingTier: "resource-gated", description: "Identity override position resolved through resource knowledge." },
] as const satisfies readonly PositionFamilyDefinition[];
