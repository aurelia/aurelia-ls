import type { ApplicationTopology } from '../application/index.js';
import type {
  AuthoringPreference,
  AuthoringProfileDescriptor,
} from './ontology.js';
import type { AnyAuthoringOperation } from './operation.js';
import type { ExpectedSemanticEffect } from './expected-effect.js';
import type { AuthoringSourceEditPlan } from './source-plan.js';

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

/** Condition that should be true before applying an authoring plan. */
export class AuthoringPrecondition {
  readonly kind = 'authoring-precondition' as const;

  constructor(
    readonly summary: string,
    readonly required: boolean = true,
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
    /** Concrete source files or source contracts produced by the plan, before any host applies them. */
    readonly sourcePlan: AuthoringSourceEditPlan | null = null,
  ) {}
}
