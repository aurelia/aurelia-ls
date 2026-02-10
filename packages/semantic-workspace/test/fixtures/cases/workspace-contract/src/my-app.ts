import { customElement } from "@aurelia/runtime-html";
import template from "./my-app.html";
import { SummaryPanel } from "./views/summary-panel.js";
import { TablePanel } from "./views/table-panel.js";
import { InlineNote } from "./components/inline-note.js";
import { DeviceDetail } from "./components/device-detail.js";
import { TAttribute } from "./attributes/t.js";
import { DebounceBindingBehavior } from "./binding-behaviors/debounce.js";
import { TitleCaseValueConverter } from "./value-converters/titlecase.js";
import type { Device, DeviceType, FilterState, StatsSummary, ViewMode } from "./models.js";

@customElement({ name: "my-app", template })
export class MyApp {
  static dependencies = [
    SummaryPanel,
    TablePanel,
    InlineNote,
    DeviceDetail,
    TAttribute,
    DebounceBindingBehavior,
    TitleCaseValueConverter,
  ];

  title = "workspace contract";
  viewMode: ViewMode = "list";
  deviceTypes: DeviceType[] = ["amp", "cab", "effect", "capture", "plugin"];
  filters: FilterState = { search: "", type: "all", minRating: 3 };
  noteMessage = "Draft usage notes before refresh";
  stats: StatsSummary = {
    title: "Coverage summary",
    updatedAt: "2026-01-16",
    items: [
      { label: "Elements", value: 7, delta: 2 },
      { label: "Attributes", value: 6 },
      { label: "Converters", value: 2, delta: 1 },
    ],
  };

  items: Device[] = [
    {
      id: "amp-1",
      name: "Rift Echo",
      type: "amp",
      status: "online",
      rating: 4,
      tags: ["tube", "clean"],
      manufacturer: "Axiom",
    },
    {
      id: "cab-1",
      name: "Cinder 2x12",
      type: "cab",
      status: "offline",
      rating: 3,
      tags: ["vintage"],
      manufacturer: "Mesa",
    },
    {
      id: "fx-1",
      name: "Mirage Delay",
      type: "effect",
      status: "online",
      rating: 5,
      tags: ["delay", "ambient"],
    },
    {
      id: "cap-1",
      name: "Signal Capture",
      type: "capture",
      status: "warning",
      rating: 2,
      tags: ["snapshot"],
      manufacturer: "Neural",
    },
    {
      id: "plug-1",
      name: "Pulse Reverb",
      type: "plugin",
      status: "online",
      rating: 4,
      tags: ["reverb", "mix"],
    },
  ];

  activeDevice: Device | null = null;
  detailView = DeviceDetail;

  get filteredItems(): Device[] {
    const search = this.filters.search.trim().toLowerCase();
    return this.items.filter((item) => {
      if (this.filters.type !== "all" && item.type !== this.filters.type) return false;
      if (this.filters.minRating !== undefined && item.rating < this.filters.minRating) return false;
      if (search && !item.name.toLowerCase().includes(search)) return false;
      return true;
    });
  }

  selectDevice(device: Device): void {
    this.activeDevice = device;
  }

  resetFilters(): void {
    this.filters = { ...this.filters, search: "", type: "all" };
  }

  refreshStats(): void {
    this.stats = { ...this.stats, updatedAt: "2026-01-17" };
  }
}
