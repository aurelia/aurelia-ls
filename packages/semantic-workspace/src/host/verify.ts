import { stableHash } from "@aurelia-ls/compiler/pipeline/hash.js";
import { hashEnvelopeForReplay } from "./replay-log.js";
import type {
  ReplayableCommandInvocation,
  SemanticAuthorityEnvelope,
  SemanticAuthorityParityAdapter,
  VerifyDeterminismArgs,
  VerifyDeterminismResult,
  VerifyGapConservationArgs,
  VerifyGapConservationResult,
  VerifyParityArgs,
  VerifyParityResult,
} from "./types.js";

export interface HostVerifierDispatchOptions {
  readonly record?: boolean;
  readonly runId?: string | null;
}

export type HostVerifierDispatcher = (
  invocation: ReplayableCommandInvocation,
  options?: HostVerifierDispatchOptions,
) => Promise<SemanticAuthorityEnvelope<unknown>>;

export interface HostVerifierOptions {
  readonly dispatch: HostVerifierDispatcher;
  readonly parityAdapter?: SemanticAuthorityParityAdapter;
}

export class HostVerifier {
  readonly #dispatch: HostVerifierDispatcher;
  readonly #parityAdapter?: SemanticAuthorityParityAdapter;

  constructor(options: HostVerifierOptions) {
    this.#dispatch = options.dispatch;
    this.#parityAdapter = options.parityAdapter;
  }

  async verifyDeterminism(
    args: VerifyDeterminismArgs,
  ): Promise<VerifyDeterminismResult> {
    const runs = Math.max(2, args.runs ?? 2);
    const observedHashes: string[] = [];
    for (let index = 0; index < runs; index += 1) {
      const envelope = await this.#dispatch(args.invocation, { record: false });
      observedHashes.push(hashEnvelopeForReplay(envelope));
    }
    const baselineHash = observedHashes[0] ?? null;
    const divergenceIndexes: number[] = [];
    if (baselineHash) {
      for (let index = 0; index < observedHashes.length; index += 1) {
        if (observedHashes[index] !== baselineHash) {
          divergenceIndexes.push(index);
        }
      }
    }
    return {
      deterministic: divergenceIndexes.length === 0,
      runs,
      baselineHash,
      observedHashes,
      divergenceIndexes,
    };
  }

  async verifyParity(args: VerifyParityArgs): Promise<VerifyParityResult> {
    const hostEnvelope = await this.#dispatch(args.invocation, { record: false });
    const hostResult = hostEnvelope.result;
    const hostHash = stableHash(hostResult);
    if (!this.#parityAdapter) {
      return {
        parity: false,
        hostHash,
        adapterHash: null,
        adapterAvailable: false,
        adapterName: null,
      };
    }

    const adapterRaw = await this.#parityAdapter.execute(args.invocation);
    const adapterResult = unwrapAdapterResult(adapterRaw);
    let hostComparable = hostResult;
    let adapterComparable = adapterResult;
    if (this.#parityAdapter.normalize) {
      const normalized = this.#parityAdapter.normalize({
        invocation: args.invocation,
        hostResult,
        adapterResult,
      });
      if (normalized) {
        hostComparable = normalized.host;
        adapterComparable = normalized.adapter;
      }
    }
    const normalizedHostHash = stableHash(hostComparable);
    const adapterHash = stableHash(adapterComparable);
    return {
      parity: normalizedHostHash === adapterHash,
      hostHash: normalizedHostHash,
      adapterHash,
      adapterAvailable: true,
      adapterName: this.#parityAdapter.name ?? "parity-adapter",
    };
  }

  async verifyGapConservation(
    args: VerifyGapConservationArgs,
  ): Promise<VerifyGapConservationResult> {
    const envelope = await resolveEnvelope(args, this.#dispatch);
    if (!envelope) {
      return {
        conserved: false,
        examinedGapCount: 0,
        missingFields: ["request.envelope|request.invocation"],
        statusWasDegraded: false,
      };
    }
    if (envelope.status !== "degraded") {
      return {
        conserved: true,
        examinedGapCount: 0,
        missingFields: [],
        statusWasDegraded: false,
      };
    }

    const missingFields: string[] = [];
    const gaps = envelope.epistemic.gaps;
    for (const [index, gap] of gaps.entries()) {
      const prefix = `epistemic.gaps[${index}]`;
      if (!gap.what || gap.what.trim().length === 0) {
        missingFields.push(`${prefix}.what`);
      }
      if (!gap.why || gap.why.trim().length === 0) {
        missingFields.push(`${prefix}.why`);
      }
      if (!gap.howToClose || gap.howToClose.trim().length === 0) {
        missingFields.push(`${prefix}.howToClose`);
      }
    }

    return {
      conserved: missingFields.length === 0,
      examinedGapCount: gaps.length,
      missingFields,
      statusWasDegraded: true,
    };
  }
}

async function resolveEnvelope(
  args: VerifyGapConservationArgs,
  dispatch: HostVerifierDispatcher,
): Promise<SemanticAuthorityEnvelope<unknown> | null> {
  if (args.envelope) return args.envelope;
  if (!args.invocation) return null;
  return dispatch(args.invocation, { record: false });
}

function unwrapAdapterResult(value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return value;
  }
  if ("result" in value) {
    const maybeEnvelope = value as { result?: unknown };
    return maybeEnvelope.result;
  }
  return value;
}
