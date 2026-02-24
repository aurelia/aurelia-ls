// Domain types for the feature-matrix fixture.
// Typed to exercise TS tier C features (member completions, type-driven
// value completions, expression type checking).

export type Severity = "info" | "warn" | "error" | "success";
export type Status = "active" | "inactive" | "pending";

export interface MatrixItem {
  name: string;
  label: string;
  status: Status;
  severity: Severity;
  date: Date;
  count: number;
  tags: string[];
}

export interface MatrixGroup {
  title: string;
  items: MatrixItem[];
  collapsed: boolean;
}
