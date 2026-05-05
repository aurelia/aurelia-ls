import type { ApplicationTopology } from '../application/index.js';
import type { ExpectedSemanticEffect } from './plan.js';

export type AuthoringVerificationOutcome =
  | 'satisfied'
  | 'open'
  | 'failed'
  | 'unsupported';

/** Compact seam row preserved from verification without depending on the API facade. */
export class AuthoringVerificationOpenSeam {
  readonly kind = 'authoring-verification-open-seam' as const;

  constructor(
    readonly seamKindKey: string,
    readonly summary: string,
    readonly sourceLabel: string | null = null,
  ) {}
}

/** Request to reopen an authored app and compare semantic facts against plan expectations. */
export class AuthoringVerificationRequest {
  readonly kind = 'authoring-verification-request' as const;

  constructor(
    readonly expectedTopology: ApplicationTopology,
    readonly expectedEffects: readonly ExpectedSemanticEffect[],
  ) {}
}

/** Result of one expected semantic effect after reopening the app. */
export class AuthoringVerificationEffectResult {
  readonly kind = 'authoring-verification-effect-result' as const;

  constructor(
    readonly expectedEffect: ExpectedSemanticEffect,
    readonly outcome: AuthoringVerificationOutcome,
    readonly summary: string,
  ) {}
}

/** Closed-loop answer after applying a plan and re-analyzing the app. */
export class AuthoringVerificationResult {
  readonly kind = 'authoring-verification-result' as const;

  constructor(
    readonly effectResults: readonly AuthoringVerificationEffectResult[],
    readonly openSeams: readonly AuthoringVerificationOpenSeam[] = [],
  ) {}
}
