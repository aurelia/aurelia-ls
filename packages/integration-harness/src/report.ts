import type { AssertionFailure } from "./schema.js";
import type { IntegrationRun } from "./runner.js";

export interface ScenarioReport {
  id: string;
  title?: string;
  tags?: readonly string[];
  timings: IntegrationRun["timings"];
  failures: readonly AssertionFailure[];
}

export interface HarnessReport {
  total: number;
  failed: number;
  scenarios: readonly ScenarioReport[];
}

export function buildScenarioReport(
  run: IntegrationRun,
  failures: readonly AssertionFailure[],
): ScenarioReport {
  return {
    id: run.scenario.id,
    title: run.scenario.title,
    tags: run.scenario.tags,
    timings: run.timings,
    failures,
  };
}

export function buildHarnessReport(reports: readonly ScenarioReport[]): HarnessReport {
  const failed = reports.filter((report) => report.failures.length > 0).length;
  return {
    total: reports.length,
    failed,
    scenarios: reports,
  };
}
