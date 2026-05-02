import { BasisKind } from "../basis.js";
import {
  ContinuationKind,
  ContinuationPriority,
  type Continuation,
} from "../continuation.js";
import type { Inquiry } from "../inquiry.js";
import type { LensId } from "../lens.js";
import { NavigationPlane, NavigationRelation } from "../navigation.js";
import { route } from "./framework-support.js";

export interface ProjectionContinuationOptions {
  readonly lens?: LensId;
  readonly filters?: Inquiry["filters"];
  readonly basis?: readonly BasisKind[];
}

export function projectionContinuation(
  inquiry: Inquiry,
  id: string,
  projection: string,
  rationale: string,
  options: ProjectionContinuationOptions = {},
): Continuation {
  return {
    id,
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Primary,
    rationale,
    inquiry: {
      ...inquiry,
      ...(options.lens === undefined ? {} : { lens: options.lens }),
      projection,
      ...(options.filters === undefined
        ? {}
        : { filters: options.filters }),
      page: undefined,
    },
    route: route(
      NavigationPlane.Semantic,
      NavigationRelation.ProjectionOf,
      options.basis ?? [BasisKind.AtlasContract],
      rationale,
    ),
  };
}

export function nextPageContinuation(
  inquiry: Inquiry,
  id: string,
  rationale: string,
  nextOffset: number,
  limit: number,
): Continuation {
  return {
    id,
    kind: ContinuationKind.NextPage,
    priority: ContinuationPriority.Primary,
    rationale,
    inquiry: {
      ...inquiry,
      page: { size: limit, cursor: String(nextOffset) },
    },
    route: route(
      NavigationPlane.Addressing,
      NavigationRelation.NextPageOf,
      [],
      rationale,
    ),
  };
}
