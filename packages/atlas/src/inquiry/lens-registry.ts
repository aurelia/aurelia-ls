import { LensId, type LensImplementation, type LensSpec } from "./lens-contracts.js";

/** Small registry for implemented lens objects. */
export class LensRegistry {
  /** Implementations keyed by stable lens id. */
  readonly #implementations = new Map<LensId, LensImplementation>();

  constructor(
    /** Initial lens implementations to register. */
    implementations: readonly LensImplementation[] = [],
  ) {
    for (const implementation of implementations) {
      this.register(implementation);
    }
  }

  /** Specs for currently implemented lenses. */
  get implementedSpecs(): readonly LensSpec[] {
    return [...this.#implementations.values()].map(
      (implementation) => implementation.spec,
    );
  }

  /** Register or replace one lens implementation. */
  register(implementation: LensImplementation): void {
    this.#implementations.set(implementation.spec.id, implementation);
  }

  /** Find an implemented lens by id. */
  find(id: LensId): LensImplementation | undefined {
    return this.#implementations.get(id);
  }
}
