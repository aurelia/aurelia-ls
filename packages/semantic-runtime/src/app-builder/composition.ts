import type { AppBuilderAureliaLoweringSelection } from './aurelia-lowering-option.js';
import type { AppBuilderDomainSlot } from './domain-model.js';
import type { AppBuilderStarterIntentId } from './intent.js';
import type { AppBuilderPatternId } from './pattern.js';
import type { AppBuilderReferenceScenarioId } from './reference-scenario.js';
import type { AppBuilderSeedProfileId } from './seed-profile.js';
import type { AppBuilderSolutionSpaceId } from './solution-space.js';
import type { ExpectedSemanticEffectKind } from '../fixture-verification/expected-effect.js';
import type { SourcePatternUsePolicy } from '../source-plan/source-plan.js';

/** Compact app-building answer: intent resolved to reusable mechanics plus domain slots and verification promises. */
export interface AppBuilderPatternComposition {
  readonly id: string;
  readonly title: string;
  readonly primaryPatternId: AppBuilderPatternId;
  readonly patternIds: readonly AppBuilderPatternId[];
  readonly sourcePolicy: SourcePatternUsePolicy;
  readonly seedProfileIds?: readonly AppBuilderSeedProfileId[];
  readonly starterIntentIds?: readonly AppBuilderStarterIntentId[];
  readonly solutionSpaceIds?: readonly AppBuilderSolutionSpaceId[];
  readonly domainSlots: readonly AppBuilderDomainSlot[];
  readonly aureliaLowering?: AppBuilderAureliaLoweringSelection;
  readonly verificationEffectKinds: readonly ExpectedSemanticEffectKind[];
  readonly referenceScenarioIds?: readonly AppBuilderReferenceScenarioId[];
  readonly summary: string;
}
