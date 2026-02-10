import type { DiagnosticCode } from "../catalog/index.js";

export type AuDiagnosticMapping = {
  auCode: string;
  canonical: DiagnosticCode | readonly DiagnosticCode[];
  aurCode?: string | readonly string[];
  data?: Readonly<Record<string, unknown>>;
  status: "direct" | "conditional" | "legacy";
  notes?: string;
};

export const AU_DIAGNOSTIC_MAP: Record<string, AuDiagnosticMapping> = {
  AU0101: {
    auCode: "AU0101",
    canonical: "aurelia/unknown-behavior",
    aurCode: "AUR0101",
    data: { resourceKind: "binding-behavior" },
    status: "direct",
  },
  AU0102: {
    auCode: "AU0102",
    canonical: "aurelia/invalid-binding-pattern",
    aurCode: "AUR0102",
    status: "direct",
  },
  AU0103: {
    auCode: "AU0103",
    canonical: "aurelia/unknown-converter",
    aurCode: "AUR0103",
    data: { resourceKind: "value-converter" },
    status: "direct",
  },
  AU0106: {
    auCode: "AU0106",
    canonical: "aurelia/invalid-binding-pattern",
    aurCode: "AUR0106",
    status: "direct",
  },
  AU0704: {
    auCode: "AU0704",
    canonical: "aurelia/invalid-command-usage",
    aurCode: "AUR0704",
    status: "direct",
  },
  AU0705: {
    auCode: "AU0705",
    canonical: "aurelia/unknown-command",
    aurCode: "AUR0713",
    status: "direct",
  },
  AU0810: {
    auCode: "AU0810",
    canonical: "aurelia/invalid-command-usage",
    aurCode: "AUR0810",
    status: "direct",
  },
  AU0813: {
    auCode: "AU0813",
    canonical: "aurelia/invalid-command-usage",
    aurCode: "AUR0813",
    status: "direct",
  },
  AU0815: {
    auCode: "AU0815",
    canonical: "aurelia/invalid-command-usage",
    aurCode: "AUR0815",
    status: "direct",
  },
  AU0816: {
    auCode: "AU0816",
    canonical: "aurelia/invalid-command-usage",
    aurCode: "AUR0816",
    status: "direct",
  },
  AU1101: {
    auCode: "AU1101",
    canonical: "aurelia/unknown-controller",
    aurCode: "AUR0754",
    data: { resourceKind: "template-controller" },
    status: "direct",
  },
  AU1102: {
    auCode: "AU1102",
    canonical: "aurelia/unknown-element",
    aurCode: "AUR0752",
    data: { resourceKind: "custom-element" },
    status: "direct",
  },
  AU1103: {
    auCode: "AU1103",
    canonical: "aurelia/unknown-event",
    data: { resourceKind: "event" },
    status: "direct",
    notes: "Previously surfaced as aurelia/AU1103; migrate to canonical code.",
  },
  AU1104: {
    auCode: "AU1104",
    canonical: ["aurelia/unknown-bindable", "aurelia/unknown-attribute"],
    aurCode: ["AUR0707", "AUR0753"],
    status: "conditional",
    notes: "Depends on whether the target resolves to a bindable or attribute.",
  },
  AU1105: {
    auCode: "AU1105",
    canonical: "aurelia/repeat/missing-iterator",
    status: "direct",
  },
  AU1106: {
    auCode: "AU1106",
    canonical: "aurelia/invalid-command-usage",
    status: "direct",
  },
  AU1107: {
    auCode: "AU1107",
    canonical: "aurelia/unknown-element",
    aurCode: "AUR0752",
    data: { resourceKind: "custom-element" },
    status: "direct",
  },
  AU1108: {
    auCode: "AU1108",
    canonical: "aurelia/unknown-attribute",
    aurCode: "AUR0753",
    data: { resourceKind: "custom-attribute" },
    status: "direct",
  },
  AU1201: {
    auCode: "AU1201",
    canonical: "aurelia/invalid-binding-pattern",
    status: "direct",
  },
  AU1202: {
    auCode: "AU1202",
    canonical: "aurelia/invalid-binding-pattern",
    status: "direct",
  },
  AU1203: {
    auCode: "AU1203",
    canonical: "aurelia/expr-parse-error",
    status: "direct",
    notes: "Must set data.recovery = true.",
  },
  AU1301: {
    auCode: "AU1301",
    canonical: "aurelia/expr-type-mismatch",
    status: "direct",
  },
  AU1302: {
    auCode: "AU1302",
    canonical: "aurelia/expr-type-mismatch",
    status: "direct",
  },
  AU1303: {
    auCode: "AU1303",
    canonical: "aurelia/expr-type-mismatch",
    status: "direct",
  },
  AU9996: {
    auCode: "AU9996",
    canonical: "aurelia/invalid-binding-pattern",
    aurCode: "AUR9996",
    status: "direct",
  },
};
