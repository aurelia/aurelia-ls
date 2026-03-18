import type { GrammarShapeDefinition } from "./types.js";

export const GRAMMAR_SHAPE_DEFINITIONS = [
  {
    classificationFamilyId: "claim.position.grammar-only-classification",
    gatingTier: "grammar-only",
    description: "Grammar-only position classification grouped by fixed grammar shape without admission or reachability gates.",
    completenessFamily: "grammar-shape",
    positionFamilies: [
      "attribute-name",
      "attribute-value",
      "text-interpolation",
      "projection-outlet",
      "projection-routing",
      "local-declaration",
      "let-binding",
      "template-meta",
      "local-bindable-declaration",
      "surrogate-metadata",
      "namespace-sensitive",
    ],
  },
  {
    classificationFamilyId: "claim.position.vocabulary-gated-classification",
    gatingTier: "vocabulary-gated",
    description: "Classification gated by grammar-shape and vocabulary admission closure.",
    completenessFamily: "vocabulary-admission",
    positionFamilies: [
      "binding-command-segment",
      "iterator-declaration",
      "ref-target",
      "spread-marker",
    ],
  },
  {
    classificationFamilyId: "claim.position.resource-gated-classification",
    gatingTier: "resource-gated",
    description: "Classification gated by grammar-shape, resource admission, and resource reachability closure.",
    completenessFamily: "resource-scope",
    positionFamilies: [
      "tag-name",
      "template-controller-attribute",
      "identity-override",
    ],
  },
] as const satisfies readonly GrammarShapeDefinition[];
