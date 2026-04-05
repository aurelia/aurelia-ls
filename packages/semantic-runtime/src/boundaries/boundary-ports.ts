import { BoundaryRouteKind, type BoundaryRouteKind as BoundaryRouteKindValue } from "../model/boundary-routes/boundary-routes.js";

export interface TypedEnrichmentBoundary {
  readonly route: typeof BoundaryRouteKind.TypedEnrichment;
}

export interface CandidateDiscoveryBoundary {
  readonly route: typeof BoundaryRouteKind.CandidateDiscovery;
}

export interface ProtocolProjectionBoundary {
  readonly route: typeof BoundaryRouteKind.ProtocolProjection;
}

export interface WorkspaceAuthoringBoundary {
  readonly route: typeof BoundaryRouteKind.WorkspaceAuthoring;
}

export interface BoundaryPortSet {
  readonly typedEnrichment?: TypedEnrichmentBoundary;
  readonly candidateDiscovery?: CandidateDiscoveryBoundary;
  readonly protocolProjection?: ProtocolProjectionBoundary;
  readonly workspaceAuthoring?: WorkspaceAuthoringBoundary;
}

export const EMPTY_BOUNDARY_PORT_SET: BoundaryPortSet = Object.freeze({});

export function hasBoundaryPort(
  ports: BoundaryPortSet,
  route: BoundaryRouteKindValue
): boolean {
  switch (route) {
    case BoundaryRouteKind.TypedEnrichment:
      return ports.typedEnrichment !== undefined;
    case BoundaryRouteKind.CandidateDiscovery:
      return ports.candidateDiscovery !== undefined;
    case BoundaryRouteKind.ProtocolProjection:
      return ports.protocolProjection !== undefined;
    case BoundaryRouteKind.WorkspaceAuthoring:
      return ports.workspaceAuthoring !== undefined;
    default:
      return false;
  }
}
