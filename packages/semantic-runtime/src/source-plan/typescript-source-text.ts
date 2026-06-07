import {
  sourcePlanContributionTypeScriptImportRequirements,
  sourcePlanTypeScriptImportContributions,
  type SourcePlanContribution,
} from './source-plan.js';
import { typeScriptImportStatements, type TypeScriptImportRequirement } from './typescript-import-source.js';

/** Complete TypeScript source text plus the source-plan contribution ledger used to assemble it. */
export interface TypeScriptSourceText {
  readonly text: string;
  readonly contributions: readonly SourcePlanContribution[];
}

/** Assemble TypeScript imports from requirements and contributed fragments before appending body text. */
export function typeScriptSourceText(
  bodyText: string,
  importRequirements: readonly TypeScriptImportRequirement[] = [],
  contributions: readonly SourcePlanContribution[] = [],
): TypeScriptSourceText {
  const allContributions = [
    ...sourcePlanTypeScriptImportContributions(importRequirements),
    ...contributions,
  ];
  const importText = typeScriptImportStatements(
    sourcePlanContributionTypeScriptImportRequirements(allContributions),
  );
  return {
    text: `${importText}${importText.length === 0 || bodyText.length === 0 ? '' : '\n'}${bodyText}`,
    contributions: allContributions,
  };
}
