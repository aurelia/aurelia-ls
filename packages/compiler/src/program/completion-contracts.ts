import type { TextRange } from "../model/text.js";
export type CompletionConfidence = "exact" | "high" | "partial" | "low";
export type CompletionOrigin = "builtin" | "config" | "source" | "unknown";

export interface TemplateCompletionItem {
  label: string;
  kind?: string;
  detail?: string;
  documentation?: string;
  insertText?: string;
  sortText?: string;
  confidence?: CompletionConfidence;
  origin?: CompletionOrigin;
  range?: TextRange;
  source: "template" | "typescript";
}
