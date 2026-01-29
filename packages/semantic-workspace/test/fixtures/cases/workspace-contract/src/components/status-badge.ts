import { bindable, containerless, customElement } from "@aurelia/runtime-html";
import template from "./status-badge.html";
import type { DeviceStatus } from "../models.js";
import { TitleCaseValueConverter } from "../value-converters/titlecase.js";

@containerless
@customElement({ name: "status-badge", template })
export class StatusBadge {
  static dependencies = [TitleCaseValueConverter];

  @bindable({ primary: true }) status: DeviceStatus = "offline";
  @bindable level = 0;
  @bindable({ attribute: "is-active" }) isActive = false;

  get label(): string {
    return this.status.toString();
  }
}
