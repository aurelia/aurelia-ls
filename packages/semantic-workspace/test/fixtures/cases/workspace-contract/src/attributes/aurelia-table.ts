import { bindable, customAttribute } from "@aurelia/runtime-html";

@customAttribute("aurelia-table")
export class AureliaTable {
  @bindable({ primary: true }) data: readonly unknown[] = [];
  @bindable({ attribute: "display-data" }) displayData: readonly unknown[] = [];
  @bindable filters: Record<string, unknown> | null = null;
  @bindable pageSize?: number;
}
