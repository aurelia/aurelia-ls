type Brand<T extends string> = { readonly __brand: T };

export type AbsPath = string & Brand<"AbsPath">;
export type OverlayPath = string & Brand<"OverlayPath">;
export type HtmlPath = string & Brand<"HtmlPath">;

export type Range = readonly [start: number, end: number];

export interface RangeMap {
  kind: "interpolation";
  html: Range;
  ts: Range;
}

export interface OverlayArtifact {
  overlayPath: OverlayPath;
  overlayText: string;
  maps: readonly RangeMap[];
}
