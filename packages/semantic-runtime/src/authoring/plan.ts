import type { ApplicationTopology } from '../application/index.js';
import type {
  AuthoringProfileDescriptor,
  AuthoringTargetKind,
} from './ontology.js';
import type { AnyAuthoringOperation } from './operation.js';

/** User or AI request after it has been normalized into semantic authoring intent. */
export class AuthoringIntent {
  readonly kind = 'authoring-intent' as const;

  constructor(
    /** Concise requested outcome, such as "minimal app with router" or "add customer dashboard". */
    readonly summary: string,
    /** App topology the request should create or move toward, when known. */
    readonly targetTopology: ApplicationTopology | null = null,
    /** Authoring profile selected for this plan, when already known. */
    readonly profile: AuthoringProfileDescriptor | null = null,
    /** Human choices that are known to be taste or product requirements rather than framework facts. */
    readonly preferences: readonly AuthoringPreference[] = [],
  ) {}
}

/** A user- or AI-owned preference that can influence authoring shape without becoming semantic truth. */
export class AuthoringPreference {
  readonly kind = 'authoring-preference' as const;

  constructor(
    readonly name: string,
    readonly value: string,
  ) {}
}

/** Condition that should be true before applying an authoring plan. */
export class AuthoringPrecondition {
  readonly kind = 'authoring-precondition' as const;

  constructor(
    readonly summary: string,
    readonly required: boolean = true,
  ) {}
}

/** Semantic effect an authoring plan expects after its edits are applied and the app is reopened. */
export class ExpectedSemanticEffect {
  readonly kind = 'expected-semantic-effect' as const;

  constructor(
    /** Product-facing expectation, not a file snapshot assertion. */
    readonly summary: string,
    /** Optional app topology node this expectation belongs to. */
    readonly topologyNodeKind: AuthoringTargetKind | null = null,
  ) {}
}

/** One ordered step in an authoring plan. */
export class AuthoringPlanStep {
  readonly kind = 'authoring-plan-step' as const;

  constructor(
    readonly operation: AnyAuthoringOperation,
    readonly expectedEffects: readonly ExpectedSemanticEffect[] = [],
  ) {}
}

/** Semantic edit plan produced before writing files. */
export class AuthoringPlan {
  readonly kind = 'authoring-plan' as const;

  constructor(
    readonly intent: AuthoringIntent,
    readonly preconditions: readonly AuthoringPrecondition[],
    readonly steps: readonly AuthoringPlanStep[],
    readonly expectedTopology: ApplicationTopology | null,
  ) {}
}
