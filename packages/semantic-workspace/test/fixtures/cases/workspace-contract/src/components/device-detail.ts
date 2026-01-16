import { bindable, customElement } from "@aurelia/runtime-html";
import template from "./device-detail.html";
import type { Device } from "../models.js";
import { StatusBadge } from "./status-badge.js";
import { LabelChip } from "./label-chip.js";
import { Tooltip } from "../attributes/tooltip.js";
import { CopyToClipboardAttribute } from "../resources.js";

@customElement({ name: "device-detail", template })
export class DeviceDetail {
  static dependencies = [StatusBadge, LabelChip, Tooltip, CopyToClipboardAttribute];

  @bindable device: Device | null = null;

  get tags(): string[] {
    return this.device?.tags ?? [];
  }
}
