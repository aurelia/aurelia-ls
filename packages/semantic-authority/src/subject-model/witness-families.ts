import type { WitnessFamilyDefinition } from "./types.js";

export const WITNESS_FAMILY_DEFINITIONS = [
  { family: "open-boundary", closability: "terminal-open", description: "Openness is the final state and carried explicitly." },
  { family: "declaration-surface", closability: "closable", description: "Declaration-form witness used to justify closure." },
  { family: "support-bundle", closability: "closable", description: "Positive support bundle witness." },
  { family: "grammar-shape", closability: "closable", description: "Grammar-shape completeness witness." },
  { family: "resource-admission", closability: "closable", description: "Resource-admission completeness witness." },
  { family: "vocabulary-admission", closability: "closable", description: "Vocabulary-admission completeness witness." },
  { family: "resource-scope", closability: "closable", description: "Resource-scope completeness witness." },
  { family: "template-scope", closability: "closable", description: "Template-scope completeness witness." },
  { family: "type-closure", closability: "open-placeholder", description: "Type-closure witness family with remaining upstream completeness pressure." },
] as const satisfies readonly WitnessFamilyDefinition[];
