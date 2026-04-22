export const TOOLING_ACTIVATION_STATUS_KINDS = [
  'active',
  'inactive',
  'open',
] as const;

export type ToolingActivationStatusKind =
  typeof TOOLING_ACTIVATION_STATUS_KINDS[number];

export const BUILD_TOOL_KINDS = [
  'vite',
  'webpack',
  'parcel',
] as const;

export type BuildToolKind =
  typeof BUILD_TOOL_KINDS[number];

export const AURELIA_CONVENTIONS_DRIVER_KINDS = [
  'plugin-conventions',
  'vite-plugin',
  'webpack-loader',
  'parcel-transformer',
  'plugin-gulp',
  'ts-jest',
  'babel-jest',
] as const;

export type AureliaConventionsDriverKind =
  typeof AURELIA_CONVENTIONS_DRIVER_KINDS[number];

export const TOOLING_EVIDENCE_CARRIER_KINDS = [
  'explicit-option',
  'config-file',
  'config-body',
  'package-json-dependency',
  'package-json-dev-dependency',
  'missing-package-json',
  'bounded-scan-open',
] as const;

export type ToolingEvidenceCarrierKind =
  typeof TOOLING_EVIDENCE_CARRIER_KINDS[number];

export class ToolingEvidence {
  constructor(
    readonly carrier: ToolingEvidenceCarrierKind,
    readonly location: string | null = null,
    readonly note: string | null = null,
  ) {}
}

export class BuildToolActivation {
  constructor(
    readonly kind: BuildToolKind | null = null,
    readonly status: ToolingActivationStatusKind = 'open',
    readonly evidence: readonly ToolingEvidence[] = [],
    readonly note: string | null = null,
  ) {}

  isActive(): boolean {
    return this.status === 'active';
  }
}

export class AureliaConventionsActivation {
  constructor(
    readonly status: ToolingActivationStatusKind = 'open',
    readonly driver: AureliaConventionsDriverKind | null = null,
    readonly evidence: readonly ToolingEvidence[] = [],
    readonly note: string | null = null,
  ) {}

  isActive(): boolean {
    return this.status === 'active';
  }
}

// NOTE: this is a tooling-only ownership surface. Runtime Aurelia does not
// have a build-tool environment object, but the clean-room needs one because
// convention-assisted resource ingress depends on preprocessing/toolchain law
// rather than on runtime metadata alone.
export class ToolingEnvironment {
  constructor(
    readonly rootDir: string,
    readonly buildTool: BuildToolActivation = new BuildToolActivation(),
    readonly conventions: AureliaConventionsActivation = new AureliaConventionsActivation(),
  ) {}
}
