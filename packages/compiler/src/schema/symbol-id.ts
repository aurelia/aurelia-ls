import { brandString, normalizePathForId } from "../model/identity.js";
import { stableHash } from "../pipeline/hash.js";
import type { SymbolId } from "./types.js";

export type SymbolIdNamespace = "sym" | "local" | "bindable";
const SYMBOL_ID_SEPARATOR = ":";
const SYMBOL_ID_HASH_PATTERN = /^[0-9a-f]{64}$/;

export interface ResourceSymbolIdInput {
  readonly kind: string;
  readonly name: string;
  readonly origin: string;
  readonly sourceKey: string | null;
  readonly packageName: string | null;
}

export interface LocalSymbolIdInput {
  readonly file: string;
  readonly frame: string;
  readonly name: string;
}

export interface BindableSymbolIdInput {
  readonly owner: SymbolId;
  readonly property: string;
}

export interface ParsedSymbolId {
  readonly namespace: SymbolIdNamespace;
  readonly hash: string;
}

export function createResourceSymbolId(input: ResourceSymbolIdInput): SymbolId {
  return withNamespace("sym", {
    kind: input.kind,
    name: input.name,
    origin: input.origin,
    source: input.sourceKey,
    package: input.packageName,
  });
}

export function createLocalSymbolId(input: LocalSymbolIdInput): SymbolId {
  return withNamespace("local", {
    kind: "local",
    file: String(normalizePathForId(input.file)),
    frame: input.frame,
    name: input.name,
  });
}

export function createBindableSymbolId(input: BindableSymbolIdInput): SymbolId {
  return withNamespace("bindable", {
    kind: "bindable",
    owner: input.owner,
    property: input.property,
  });
}

export function parseSymbolId(value: SymbolId | string): ParsedSymbolId | null {
  const raw = String(value);
  const sep = raw.indexOf(SYMBOL_ID_SEPARATOR);
  if (sep <= 0 || sep === raw.length - 1) return null;
  const namespace = raw.slice(0, sep);
  if (!isSymbolIdNamespace(namespace)) return null;
  const hash = raw.slice(sep + 1);
  if (!SYMBOL_ID_HASH_PATTERN.test(hash)) return null;
  return { namespace, hash };
}

export function symbolIdNamespace(value: SymbolId | string): SymbolIdNamespace | null {
  return parseSymbolId(value)?.namespace ?? null;
}

export function isSymbolId(value: string): value is SymbolId {
  return parseSymbolId(value) !== null;
}

export function isSymbolIdNamespace(value: string): value is SymbolIdNamespace {
  return value === "sym" || value === "local" || value === "bindable";
}

function withNamespace(namespace: SymbolIdNamespace, payload: unknown): SymbolId {
  return brandString<"SymbolId">(`${namespace}${SYMBOL_ID_SEPARATOR}${stableHash(payload)}`);
}
