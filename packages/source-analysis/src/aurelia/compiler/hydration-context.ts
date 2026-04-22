import type { ElementController } from './controller.js';
import type { PreparedHydrateElementInstruction } from './prepared-resource-hydration.js';

export class HydrationContext {
  constructor(
    readonly id: string,
    readonly controller: ElementController,
    readonly instruction: PreparedHydrateElementInstruction | null = null,
    readonly parent: HydrationContext | null = null,
    readonly note: string | null = null,
  ) {}
}
