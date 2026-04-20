import type { SourceNodeRef } from '../refs.js';
import type { FrameworkApi } from './framework-api.js';

export const FRAMEWORK_API_INGRESS_STATUS_KINDS = [
  'closed',
  'open',
  'miss',
] as const;

export type FrameworkApiIngressStatusKind =
  typeof FRAMEWORK_API_INGRESS_STATUS_KINDS[number];

export const FRAMEWORK_API_ROUTE_STEP_KINDS = [
  'call-expression',
  'member-access',
  'import-binding',
  'local-alias',
  'relative-import-follow',
  'export-alias',
  'unsupported-shape',
] as const;

export type FrameworkApiRouteStepKind =
  typeof FRAMEWORK_API_ROUTE_STEP_KINDS[number];

export class FrameworkApiRouteStep {
  constructor(
    readonly kind: FrameworkApiRouteStepKind,
    readonly source: SourceNodeRef | null,
    readonly detail: string,
  ) {}
}

export class FrameworkApiIngress {
  constructor(
    readonly id: string,
    readonly source: SourceNodeRef,
    readonly status: FrameworkApiIngressStatusKind,
    readonly api: FrameworkApi | null,
    readonly route: readonly FrameworkApiRouteStep[] = [],
    readonly note: string | null = null,
  ) {}
}
