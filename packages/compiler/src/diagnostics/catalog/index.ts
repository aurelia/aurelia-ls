import type {
  DiagnosticDataByCode as CatalogDataByCode,
  DiagnosticStage,
  DiagnosticsCatalogStrict,
} from "../types.js";
import { bindableDiagnostics } from "./bindables.js";
import { expressionDiagnostics } from "./expression.js";
import { gapDiagnostics } from "./gaps-confidence.js";
import { hmrDiagnostics } from "./hmr.js";
import { legacyDiagnostics } from "./legacy.js";
import { metaImportDiagnostics } from "./meta-imports.js";
import { policyDiagnostics } from "./policy.js";
import { projectDiagnostics } from "./project.js";
import { resourceResolutionDiagnostics } from "./resource-resolution.js";
import { ssrDiagnostics } from "./ssr.js";
import { ssrRuntimeDiagnostics } from "./ssr-runtime.js";
import { ssgDiagnostics } from "./ssg.js";
import {
  templateSyntaxDiagnostics,
  templateSyntaxFutureDiagnostics,
} from "./template-syntax.js";
import { toolchainDiagnostics } from "./toolchain.js";

// Canonical diagnostics used by compiler + LSP contracts.
export const diagnosticsCanonical = {
  ...expressionDiagnostics,
  ...templateSyntaxDiagnostics,
  ...resourceResolutionDiagnostics,
  ...bindableDiagnostics,
  ...metaImportDiagnostics,
  ...ssrDiagnostics,
  ...policyDiagnostics,
  ...gapDiagnostics,
} as const satisfies DiagnosticsCatalogStrict;

// Future/legacy diagnostics kept for mapping and roadmap (not emitted by core compiler).
export const diagnosticsFuture = {
  ...templateSyntaxFutureDiagnostics,
  ...toolchainDiagnostics,
  ...ssrRuntimeDiagnostics,
  ...ssgDiagnostics,
  ...hmrDiagnostics,
  ...projectDiagnostics,
  ...legacyDiagnostics,
} as const satisfies DiagnosticsCatalogStrict;

// Union catalog used for normalization/mapping across the repo.
export const diagnosticsCatalog = {
  ...diagnosticsCanonical,
  ...diagnosticsFuture,
} as const satisfies DiagnosticsCatalogStrict;

export const diagnosticsByCategory = {
  expression: expressionDiagnostics,
  "template-syntax": templateSyntaxDiagnostics,
  "resource-resolution": resourceResolutionDiagnostics,
  "bindable-validation": bindableDiagnostics,
  "meta-imports": metaImportDiagnostics,
  ssr: ssrDiagnostics,
  policy: policyDiagnostics,
  gaps: gapDiagnostics,
} as const;

export const diagnosticsByCategoryFuture = {
  "template-syntax": templateSyntaxFutureDiagnostics,
  ssr: ssrRuntimeDiagnostics,
  toolchain: toolchainDiagnostics,
  ssg: ssgDiagnostics,
  hmr: hmrDiagnostics,
  project: projectDiagnostics,
  legacy: legacyDiagnostics,
} as const;

export type DiagnosticCode = keyof typeof diagnosticsCatalog;
export type DiagnosticCanonicalCode = keyof typeof diagnosticsCanonical;
export type DiagnosticFutureCode = keyof typeof diagnosticsFuture;
export type DiagnosticDataByCode = CatalogDataByCode<typeof diagnosticsCatalog>;
export type DiagnosticCanonicalDataByCode = CatalogDataByCode<typeof diagnosticsCanonical>;
export type DiagnosticFutureDataByCode = CatalogDataByCode<typeof diagnosticsFuture>;
export type DiagnosticDataFor<Code extends DiagnosticCode> = DiagnosticDataByCode[Code];
export type DiagnosticCanonicalDataFor<Code extends DiagnosticCanonicalCode> =
  DiagnosticCanonicalDataByCode[Code];
export type DiagnosticFutureDataFor<Code extends DiagnosticFutureCode> = DiagnosticFutureDataByCode[Code];
// Codes must declare stages to be eligible for stage-derived typing.
export type DiagnosticCodeForStage<Stage extends DiagnosticStage> = Extract<
  DiagnosticCode,
  {
    [Code in keyof typeof diagnosticsCatalog]:
      Stage extends StageForSpec<(typeof diagnosticsCatalog)[Code]> ? Code : never;
  }[keyof typeof diagnosticsCatalog] & string
>;

type StageForSpec<Spec> = Spec extends { stages: readonly DiagnosticStage[] }
  ? Spec["stages"][number]
  : never;
