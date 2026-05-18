import {
  normalizeSemanticRuntimeInquiryProfile,
  type SemanticRuntimeInquiryProfile,
} from './inquiry-profile.js';

export interface SemanticRuntimeTelemetryOptions {
  /**
   * Consumer lane behind this measurement.
   *
   * Use this to keep CPU/memory trade-offs honest: a cache that helps `lsp-cursor` may be wrong for
   * `mcp-orientation`, and a slow `fixture` verification pass may be perfectly acceptable.
   */
  readonly inquiryProfile?: SemanticRuntimeInquiryProfile | string | null;
  /** Capture process memory samples before and after measured phase boundaries. */
  readonly capturePhaseMemory?: boolean;
  /** Capture cheap kernel count snapshots before and after measured phase boundaries. */
  readonly capturePhaseKernel?: boolean;
  /**
   * Capture high-cardinality kernel breakdowns at phase boundaries.
   *
   * Keep this separate from `captureKernelBreakdowns`: final/open-operation breakdowns are useful memory x-rays, while
   * repeating full breakdown scans at every nested phase boundary can dominate the profile on large apps.
   */
  readonly capturePhaseKernelBreakdowns?: boolean;
  /**
   * Capture shallow product-detail and hot-detail density rows at phase boundaries.
   *
   * This requires phase kernel breakdowns and is intentionally separate from final-operation detail density: peak
   * representation shape is often most visible inside construction phases that are disposed before the public answer.
   */
  readonly capturePhaseDetailDensity?: boolean;
  /** Capture nested materializer phase rows used for substrate profiling. */
  readonly captureFineGrainedPhases?: boolean;
  /** Capture full kernel kind/product/detail breakdowns at the end of the measured operation. */
  readonly captureKernelBreakdowns?: boolean;
}

export interface NormalizedSemanticRuntimeTelemetryOptions {
  readonly inquiryProfile: SemanticRuntimeInquiryProfile;
  readonly capturePhaseMemory: boolean;
  readonly capturePhaseKernel: boolean;
  readonly capturePhaseKernelBreakdowns: boolean;
  readonly capturePhaseDetailDensity: boolean;
  readonly captureFineGrainedPhases: boolean;
  readonly captureKernelBreakdowns: boolean;
}

export function normalizeSemanticRuntimeTelemetryOptions(
  options: SemanticRuntimeTelemetryOptions | null | undefined,
  defaultProfile: SemanticRuntimeInquiryProfile,
): NormalizedSemanticRuntimeTelemetryOptions {
  return {
    inquiryProfile: normalizeSemanticRuntimeInquiryProfile(options?.inquiryProfile ?? defaultProfile),
    capturePhaseMemory: options?.capturePhaseMemory === true,
    capturePhaseKernel: options?.capturePhaseKernel === true,
    capturePhaseKernelBreakdowns: options?.capturePhaseKernelBreakdowns === true,
    capturePhaseDetailDensity: options?.capturePhaseKernelBreakdowns === true
      && options?.capturePhaseDetailDensity === true,
    captureFineGrainedPhases: options?.captureFineGrainedPhases === true,
    captureKernelBreakdowns: options?.captureKernelBreakdowns === true,
  };
}
