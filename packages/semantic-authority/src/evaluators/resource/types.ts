import type {
  ObservationSourceSurface,
  ReferenceKind,
  ResourceKind,
} from "../../shared/index.js";
import type { ResourceKey } from "../../graph/index.js";

export interface BindableObservationDatum {
  readonly propertyName: string;
  readonly attribute?: string;
  readonly callback?: string | null;
  readonly mode?: "toView" | "fromView" | "twoWay" | "oneTime" | "default";
  readonly set?: boolean;
}

export interface DeclarationReferenceDatum {
  readonly referenceKind?: ReferenceKind;
  readonly span: {
    readonly start: number;
    readonly end: number;
  };
}

export interface ResourceObservationDatum {
  readonly datumKind: "resource-observation";
  readonly declarationReference?: DeclarationReferenceDatum;
  readonly declarationSurfaceId: string;
  readonly fields?: Readonly<Record<string, unknown>>;
  readonly bindables?: readonly BindableObservationDatum[];
  readonly resourceKind: ResourceKind;
  readonly subjectKey: ResourceKey;
}

export function isResourceObservationDatum(value: unknown): value is ResourceObservationDatum {
  return (
    typeof value === "object"
    && value !== null
    && (value as { readonly datumKind?: unknown }).datumKind === "resource-observation"
  );
}

export function sourceSurfacePrecedence(sourceSurface: ObservationSourceSurface): number {
  switch (sourceSurface) {
    case "decorator":
      return 5;
    case "define-call":
      return 4;
    case "static-au":
      return 3;
    case "template-meta":
      return 2;
    case "convention":
      return 1;
    case "config":
    case "npm-package":
    case "builtin":
      return 0;
  }
}
