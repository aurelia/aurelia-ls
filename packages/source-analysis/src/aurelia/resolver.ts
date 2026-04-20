import type { ContainerWorldRef, KeyRef } from './refs.js';
import { Registration } from './registration.js';

export class Resolver {
  private readonly registrationsValue: Registration[] = [];

  constructor(
    readonly key: KeyRef,
    readonly world: ContainerWorldRef,
  ) {}

  addRegistration(
    registration: Registration,
  ): this {
    this.registrationsValue.push(registration);
    return this;
  }

  latest(): Registration | null {
    return this.registrationsValue.at(-1) ?? null;
  }

  all(): readonly Registration[] {
    return [...this.registrationsValue];
  }
}
