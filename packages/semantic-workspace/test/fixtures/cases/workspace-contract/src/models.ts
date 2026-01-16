export type ViewMode = "list" | "grid" | "compact";

export type DeviceType = "amp" | "cab" | "effect" | "capture" | "plugin";

export type DeviceStatus = "online" | "offline" | "warning";

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  rating: number;
  tags: string[];
  manufacturer?: string;
}

export interface FilterState {
  search: string;
  type: DeviceType | "all";
  minRating?: number;
}

export interface StatEntry {
  label: string;
  value: number;
  delta?: number;
}

export interface StatsSummary {
  title: string;
  updatedAt: string;
  items: StatEntry[];
}
