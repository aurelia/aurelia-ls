// Root CE with all resources registered via static dependencies.
// This exercises the full discovery pipeline for locally-registered resources.
import { customElement } from "@aurelia/runtime-html";
import template from "./app.html";
import { MatrixPanel } from "./components/matrix-panel.js";
import { MatrixBadge } from "./components/matrix-badge.js";
import { MatrixHighlightCA } from "./attributes/matrix-highlight.js";
import { MatrixTooltip } from "./attributes/matrix-tooltip.js";
import { FormatDateValueConverter } from "./converters/format-date.js";
import { RateLimitBindingBehavior } from "./behaviors/rate-limit.js";
import type { MatrixItem, MatrixGroup, Severity, Status } from "./models.js";

@customElement({ name: "app", template })
export class App {
  static dependencies = [
    MatrixPanel,
    MatrixBadge,
    MatrixHighlightCA,
    MatrixTooltip,
    FormatDateValueConverter,
    RateLimitBindingBehavior,
  ];

  // ── View model properties (typed for expression completions) ──
  title = "Feature Matrix";
  showDetail = true;
  total = 42;
  noteMessage = "Test note";
  activeSeverity: Severity = "info";

  groups: MatrixGroup[] = [
    {
      title: "Group A",
      collapsed: false,
      items: [
        { name: "Alpha", label: "A1", status: "active", severity: "info", date: new Date(), count: 10, tags: ["core"] },
        { name: "Beta", label: "B1", status: "pending", severity: "warn", date: new Date(), count: 5, tags: ["ext"] },
      ],
    },
  ];

  items: MatrixItem[] = [
    { name: "Gamma", label: "G1", status: "active", severity: "success", date: new Date(), count: 7, tags: ["core", "v2"] },
    { name: "Delta", label: "D1", status: "inactive", severity: "error", date: new Date(), count: 0, tags: [] },
  ];

  get indexedItems(): [number, MatrixItem][] {
    return this.items.map((item, i) => [i, item]);
  }

  get filteredItems(): MatrixItem[] {
    return this.items.filter((item) => item.status === "active");
  }

  selectItem(item: MatrixItem): void {
    this.noteMessage = item.name;
  }

  refreshData(): void {
    this.total = this.items.reduce((sum, item) => sum + item.count, 0);
  }
}
