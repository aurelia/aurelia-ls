// NOTE: runtime publishes an AuSlotsInfo instance into element/attribute child
// containers via createElementContainer(...) / invokeAttribute(...). The
// clean-room keeps the same runtime-facing name and shape here. Provenance-rich
// projection extraction stays on prepared instructions / structural carriers,
// not on the DI-published slot info surface itself.
export class AuSlotsInfo {
  constructor(
    readonly projectedSlots: readonly string[],
    readonly note: string | null = null,
  ) {}
}
