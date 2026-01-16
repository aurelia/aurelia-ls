import { bindable, customElement } from "@aurelia/runtime-html";
import template from "./summary-panel.html";
import type { StatsSummary } from "../models.js";
import { PulseDot } from "../components/pulse-dot.js";
import { IfNot } from "../attributes/if-not.js";
import { Tooltip } from "../attributes/tooltip.js";
import { Shorten } from "../resources.js";
import { TitleCaseValueConverter } from "../value-converters/titlecase.js";

@customElement({ name: "summary-panel", template })
export class SummaryPanel {
  static dependencies = [PulseDot, IfNot, Tooltip, Shorten, TitleCaseValueConverter];

  @bindable stats!: StatsSummary;
  @bindable({ attribute: "updated-at" }) updatedAt = "";
  @bindable({ attribute: "on-refresh" }) onRefresh: (() => void) | null = null;

  refresh(): void {
    this.onRefresh?.();
  }
}
