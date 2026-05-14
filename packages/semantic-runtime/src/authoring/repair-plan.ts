import type { ApplicationTopology } from '../application/index.js';
import { RepairAppOperation, type RepairAppActionTarget, type RepairAppMemberHint } from './operation.js';
import {
  AuthoringIntent,
  AuthoringPlan,
  AuthoringPlanStep,
  AuthoringPrecondition,
} from './plan.js';
import {
  ExpectedSemanticEffect,
  ExpectedSemanticEffectFilter,
} from './expected-effect.js';
import type {
  AuthoringRepairChangeDomain,
  AuthoringRepairKind,
  AuthoringRepairPlanKind,
  AuthoringRepairPlanReadiness,
  AuthoringRepairRuntimeBoundaryKind,
  AuthoringRepairRuntimeIntentKind,
} from './repair.js';

export interface AuthoringRepairPlanCluster {
  readonly key: string;
  readonly repairKind: AuthoringRepairKind | `${AuthoringRepairKind}`;
  readonly planKind: AuthoringRepairPlanKind | `${AuthoringRepairPlanKind}`;
  readonly changeDomain: AuthoringRepairChangeDomain | `${AuthoringRepairChangeDomain}`;
  readonly planReadiness: AuthoringRepairPlanReadiness | `${AuthoringRepairPlanReadiness}`;
  readonly count: number;
  readonly targetMemberNames: readonly string[];
  readonly actionTargets?: readonly RepairAppActionTarget[];
  readonly memberHints?: readonly RepairAppMemberHint[];
  readonly runtimeBoundaryKinds: readonly (AuthoringRepairRuntimeBoundaryKind | `${AuthoringRepairRuntimeBoundaryKind}`)[];
  readonly runtimeIntentKinds: readonly (AuthoringRepairRuntimeIntentKind | `${AuthoringRepairRuntimeIntentKind}`)[];
}

export interface AuthoringRepairPlanRequest {
  /** Concise repair intent shown to a caller before any source edits are attempted. */
  readonly summary: string;
  /** Repair clusters produced by `AuthoringOrientation`; the builder treats them as semantic pressure, not file edits. */
  readonly clusters: readonly AuthoringRepairPlanCluster[];
  /** Optional topology to preserve when the caller is repairing a generated/authored app plan. */
  readonly expectedTopology?: ApplicationTopology | null;
}

export function buildAuthoringRepairPlan(request: AuthoringRepairPlanRequest): AuthoringPlan {
  const clusters = request.clusters.filter((cluster) => cluster.count > 0);
  const topology = request.expectedTopology ?? null;
  return new AuthoringPlan(
    new AuthoringIntent(request.summary, topology),
    repairPlanPreconditions(clusters),
    clusters.map(repairPlanStep),
    topology,
  );
}

function repairPlanPreconditions(
  clusters: readonly AuthoringRepairPlanCluster[],
): readonly AuthoringPrecondition[] {
  const runtimeIntentRequired = clusters.some((cluster) => cluster.planReadiness === 'runtime-intent-required');
  return [
    new AuthoringPrecondition('Repair clusters came from reopened semantic facts, not a stale source snapshot.'),
    new AuthoringPrecondition('Source edit placement and formatting policy are available before applying app-source repairs.'),
    ...(runtimeIntentRequired
      ? [new AuthoringPrecondition('Runtime-policy repair clusters have explicit user or product intent before applying edits.')]
      : []),
  ];
}

function repairPlanStep(cluster: AuthoringRepairPlanCluster): AuthoringPlanStep {
  return new AuthoringPlanStep(
    new RepairAppOperation(
      cluster.key,
      cluster.repairKind,
      cluster.planKind,
      cluster.changeDomain,
      cluster.planReadiness,
      cluster.count,
      cluster.targetMemberNames,
      cluster.actionTargets ?? [],
      cluster.memberHints ?? [],
      cluster.runtimeBoundaryKinds,
      cluster.runtimeIntentKinds,
    ),
    [
      ExpectedSemanticEffect.absent(
        `Repair cluster ${cluster.planKind} should be closed after repair.`,
        'authoring-repair',
        'authoring',
        'semantic-app',
        [new ExpectedSemanticEffectFilter('key', cluster.key)],
      ),
    ],
  );
}
