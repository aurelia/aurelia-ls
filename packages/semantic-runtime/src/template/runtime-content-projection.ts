import type {
  AuSlotsInfo,
  RuntimeHydrationContext,
  ViewFactory,
} from '../configuration/controller.js';
import type { Container } from '../di/container.js';
import type { AddressHandle } from '../kernel/handles.js';
import type { CompiledTemplate } from './compiled-template.js';
import type {
  HydrateElementInstruction,
  HydrateElementProjectionDefinition,
} from './instruction-ir.js';
import type { RuntimeControllerFrame } from './runtime-controller.js';

export const enum RuntimeContentProjectionSelectionKind {
  /** Provider-authored content matched the outlet's static name. */
  Projected = 'projected',
  /** No provider content matched, so the outlet's own fallback definition was selected. */
  Fallback = 'fallback',
  /** Neither provider content nor fallback content exists for the outlet. */
  Empty = 'empty',
}

export const enum RuntimeContentProjectionClosureKind {
  /** Selection and bounded synthetic-view construction closed over concrete compiler products. */
  Complete = 'complete',
  /** Selection was known, but one or more compiler/render products needed by the view remained open. */
  Open = 'open',
}

/**
 * One statically reachable AuSlot view realization.
 *
 * The synthetic view is retained by the AuSlot resource. It is deliberately not represented as a
 * member of the AuSlot controller's runtime `children` collection.
 */
export class RuntimeContentProjectionView {
  constructor(
    readonly selectionKind: RuntimeContentProjectionSelectionKind,
    readonly closureKind: RuntimeContentProjectionClosureKind,
    readonly slotName: string,
    readonly outletInstruction: HydrateElementInstruction,
    readonly outletController: RuntimeControllerFrame,
    readonly providerInstruction: HydrateElementInstruction | null,
    readonly projection: HydrateElementProjectionDefinition | null,
    readonly compiledTemplate: CompiledTemplate | null,
    readonly declaringController: RuntimeControllerFrame | null,
    readonly receivingController: RuntimeControllerFrame | null,
    readonly viewFactory: ViewFactory | null,
    readonly syntheticController: RuntimeControllerFrame | null,
    readonly factoryContainer: Container | null,
    /** Exact IHydrationContext visible while this view factory creates its synthetic view. */
    readonly factoryHydrationContext: RuntimeHydrationContext | null,
    readonly slotsInfo: AuSlotsInfo | null,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}
