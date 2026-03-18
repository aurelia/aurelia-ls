import type { RevisionToken } from "../shared/types.js";
import { serializeGraphCompletenessKey, type CompletenessKey } from "./keys.js";
import type { CompletenessWitnessNode } from "./types.js";

function serializeWitnessKey(key: CompletenessKey): string {
  return serializeGraphCompletenessKey(key);
}

function assertWitnessKeyMatchesNode(witness: CompletenessWitnessNode): void {
  if (witness.nodeKind !== "completeness-witness") {
    throw new Error("CompletenessWitnessStore only accepts completeness-witness nodes.");
  }

  if (witness.key.keyKind !== "completeness") {
    throw new Error("CompletenessWitnessStore requires graph CompletenessKey values.");
  }

  if (witness.key.boundaryKey !== witness.boundaryKey) {
    throw new Error("CompletenessWitness.key.boundaryKey must match CompletenessWitness.boundaryKey.");
  }

  if (witness.key.completenessFamily !== witness.completenessFamily) {
    throw new Error("CompletenessWitness.key.completenessFamily must match CompletenessWitness.completenessFamily.");
  }
}

export class CompletenessWitnessStore {
  readonly #witnesses = new Map<string, CompletenessWitnessNode>();
  #currentRevisionToken: RevisionToken = 0;

  public get size(): number {
    return this.#witnesses.size;
  }

  public get currentRevisionToken(): RevisionToken {
    return this.#currentRevisionToken;
  }

  public clear(): void {
    this.#witnesses.clear();
  }

  public delete(key: CompletenessKey): boolean {
    return this.#witnesses.delete(serializeWitnessKey(key));
  }

  public get(key: CompletenessKey): CompletenessWitnessNode | undefined {
    return this.#witnesses.get(serializeWitnessKey(key));
  }

  public has(key: CompletenessKey): boolean {
    return this.#witnesses.has(serializeWitnessKey(key));
  }

  public set(witness: CompletenessWitnessNode): CompletenessWitnessNode {
    assertWitnessKeyMatchesNode(witness);
    witness.revisionToken = this.#issueRevisionToken();
    this.#witnesses.set(serializeWitnessKey(witness.key), witness);
    return witness;
  }

  public values(): IterableIterator<CompletenessWitnessNode> {
    return this.#witnesses.values();
  }

  #issueRevisionToken(): RevisionToken {
    this.#currentRevisionToken += 1;
    return this.#currentRevisionToken;
  }
}
