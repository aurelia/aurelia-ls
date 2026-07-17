/** Currentness capability carried by any analysis object that can read or publish generation-owned state. */
export interface GenerationAuthority {
  isCurrent(): boolean;
  requireCurrent(): void;
}
