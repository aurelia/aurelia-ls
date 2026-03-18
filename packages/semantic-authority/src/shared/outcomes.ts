import type { DegradationForm, NotApplicableReason, SemanticOutcome, WitnessFamily } from "./enums.js";

export type InlineCompleteness =
  | { readonly state: "structurally-safe" }
  | { readonly state: "witness-satisfied"; readonly witnessFamily: WitnessFamily }
  | { readonly state: "open"; readonly degradations: readonly DegradationForm[] };

export interface BlockingBundleEntry {
  readonly sectionPath: string;
  readonly completeness: InlineCompleteness & { readonly state: "open" };
}

export type BlockingBundle = readonly BlockingBundleEntry[];

export interface NotApplicableResponse {
  readonly applicable: false;
  readonly reason: NotApplicableReason;
}

export interface ApplicableResponse<TPayload> {
  readonly applicable: true;
  readonly outcome: SemanticOutcome;
  readonly payload: TPayload;
}
