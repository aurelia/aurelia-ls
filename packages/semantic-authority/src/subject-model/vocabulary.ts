import {
  DEGRADATION_FORM_ONLY_VALUES,
  DEGRADATION_TARGET_CATEGORIES,
  DEGRADATION_TARGET_FORM_RELATIONS,
} from "../shared/degradation-targets.js";
import type { VocabularyCatalogDefinition } from "./types.js";

export const SUBJECT_MODEL_VOCABULARIES = [
  {
    catalogId: "binding-mode",
    description: "TraitValue binding-mode vocabulary from EB-7.",
    source: "encoding-bridge:EB-7",
    entries: [
      { id: "toView", meaning: "Explicit one-way flow to the view." },
      { id: "fromView", meaning: "Explicit one-way flow from the view." },
      { id: "twoWay", meaning: "Explicit bidirectional binding." },
      { id: "oneTime", meaning: "One-time snapshot binding." },
      { id: "default", meaning: "No explicit mode; defer to the command default." },
    ],
  },
  {
    catalogId: "binding-command-kind",
    description: "Governed binding-command semantic vocabulary from EB-8.",
    source: "encoding-bridge:EB-8",
    entries: [
      { id: "one-time", meaning: "One-time binding command." },
      { id: "to-view", meaning: "To-view binding command." },
      { id: "two-way", meaning: "Two-way binding command." },
      { id: "from-view", meaning: "From-view binding command." },
      { id: "trigger", meaning: "Trigger command." },
      { id: "capture", meaning: "Capture command." },
      { id: "delegate", meaning: "Delegate command." },
      { id: "attr", meaning: "Attribute binding command." },
      { id: "class", meaning: "Class binding command." },
      { id: "style", meaning: "Style binding command." },
      { id: "spread", meaning: "Spread binding command." },
    ],
  },
  {
    catalogId: "reference-site-kind",
    description: "ReferenceEntry siteKind vocabulary from EB-12.",
    source: "encoding-bridge:EB-12",
    entries: [
      { id: "declaration", meaning: "Declaration site for the referenced entity." },
      { id: "tag-name", meaning: "Template tag name reference." },
      { id: "attribute-name", meaning: "Template attribute name reference." },
      { id: "binding-command", meaning: "Binding-command reference." },
      { id: "binding-behavior", meaning: "Binding-behavior reference." },
      { id: "attribute-pattern", meaning: "Attribute-pattern match." },
      { id: "import", meaning: "Template <import> reference." },
      { id: "registration", meaning: "Programmatic registration reference." },
      { id: "expression-ref", meaning: "Expression-level scope reference." },
    ],
  },
  {
    catalogId: "observation-source-surface",
    description: "Shared Observation.witnessSource and Observation.sourceSurface vocabulary from EB-14 and EB-15.",
    source: "encoding-bridge:EB-14/EB-15",
    entries: [
      { id: "decorator", meaning: "Decorator analysis." },
      { id: "static-au", meaning: "static $au analysis." },
      { id: "convention", meaning: "Convention matching." },
      { id: "define-call", meaning: "define(...) call analysis." },
      { id: "template-meta", meaning: "<template> meta analysis." },
      { id: "config", meaning: "Layer 1 consumer configuration observation." },
      { id: "npm-package", meaning: "NPM package analysis." },
      { id: "builtin", meaning: "Built-in resource definition analysis." },
    ],
  },
  {
    catalogId: "degradation-target-category",
    description: "Per-node DegradationTarget category vocabulary from EB-5 with explicit form/target separation.",
    source: "encoding-bridge:EB-5",
    entries: DEGRADATION_TARGET_CATEGORIES.map((category) => {
      const relation = DEGRADATION_TARGET_FORM_RELATIONS[category];
      return {
        id: category,
        meaning:
          relation.relation === "shared-identifier"
            ? `Shared identifier with facade-level DegradationForm \`${relation.form}\`.`
            : "Graph-node-only degradation target category with no facade-level DegradationForm twin.",
      };
    }),
  },
  {
    catalogId: "degradation-form-only",
    description: "Facade-level DegradationForm identifiers with no graph-node DegradationTarget twin.",
    source: "g7-facade-contract:4.2",
    entries: DEGRADATION_FORM_ONLY_VALUES.map((form) => ({
      id: form,
      meaning: "Facade-level completeness form with no graph-node DegradationTarget category.",
    })),
  },
] as const satisfies readonly VocabularyCatalogDefinition[];
