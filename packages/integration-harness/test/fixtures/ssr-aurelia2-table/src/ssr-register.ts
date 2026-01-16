import type { IContainer } from "@aurelia/kernel";
import { AureliaTableConfiguration } from "aurelia2-table";

export function register(container: IContainer): void {
  container.register(AureliaTableConfiguration);
}
