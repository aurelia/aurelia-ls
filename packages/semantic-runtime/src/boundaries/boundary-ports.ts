import { BoundaryRouteKind } from "../model/boundary-routes/boundary-routes.js";

export interface TypedEnrichmentBoundary {
  readonly route: BoundaryRouteKind.TypedEnrichment;
}

export interface CandidateDiscoveryBoundary {
  readonly route: BoundaryRouteKind.CandidateDiscovery;
}

export interface ProtocolProjectionBoundary {
  readonly route: BoundaryRouteKind.ProtocolProjection;
}

export interface WorkspaceAuthoringBoundary {
  readonly route: BoundaryRouteKind.WorkspaceAuthoring;
}

export interface BoundaryPortSet {
  readonly typedEnrichment?: TypedEnrichmentBoundary;
  readonly candidateDiscovery?: CandidateDiscoveryBoundary;
  readonly protocolProjection?: ProtocolProjectionBoundary;
  readonly workspaceAuthoring?: WorkspaceAuthoringBoundary;
}

export const EMPTY_BOUNDARY_PORT_SET: BoundaryPortSet = {};

export function hasBoundaryPort(
  ports: BoundaryPortSet,
  route: BoundaryRouteKind
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
