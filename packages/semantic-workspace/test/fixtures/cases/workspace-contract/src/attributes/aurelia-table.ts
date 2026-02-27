import { bindable, customAttribute } from "@aurelia/runtime-html";

@customAttribute("aurelia-table")
export class AureliaTable {
  @bindable({ primary: true }) data: readonly unknown[] = [];
  @bindable({ attribute: "display-data", mode: 6 /* twoWay */ }) displayData: readonly unknown[] = [];
  @bindable filters: Record<string, unknown> | null = null;
  @bindable pageSize?: number;
  @bindable({ attribute: "total-items", mode: 6 /* twoWay */ }) totalItems = 0;
}
