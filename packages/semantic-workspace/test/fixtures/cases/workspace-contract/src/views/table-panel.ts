import { bindable, customElement } from "@aurelia/runtime-html";
import template from "./table-panel.html";
import type { Device, DeviceType, FilterState } from "../models.js";
import { StatusBadge } from "../components/status-badge.js";
import { LabelChip } from "../components/label-chip.js";
import { IfNot } from "../attributes/if-not.js";
import { AutSort } from "../attributes/aut-sort.js";
import { AureliaTable } from "../attributes/aurelia-table.js";
import { Tooltip } from "../attributes/tooltip.js";
import { TAttribute } from "../attributes/t.js";
import { DebounceBindingBehavior } from "../binding-behaviors/debounce.js";
import { TitleCaseValueConverter } from "../value-converters/titlecase.js";

@customElement({ name: "table-panel", template })
export class TablePanel {
  static dependencies = [
    StatusBadge,
    LabelChip,
    IfNot,
    AutSort,
    AureliaTable,
    Tooltip,
    TAttribute,
    DebounceBindingBehavior,
    TitleCaseValueConverter,
  ];

  @bindable items: readonly Device[] = [];
  @bindable filters!: FilterState;
  @bindable view = "list";
  @bindable select: ((device: Device) => void) | null = null;

  kinds: DeviceType[] = ["amp", "cab", "effect", "capture", "plugin"];

  get displayItems(): readonly Device[] {
    if (!this.filters || this.filters.type === "all") return this.items;
    return this.items.filter((item) => item.type === this.filters.type);
  }

  clearFilters(): void {
    this.filters = { ...this.filters, search: "", type: "all" };
  }

  choose(device: Device): void {
    this.select?.(device);
  }
}
