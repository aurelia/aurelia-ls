import type { ResourceDef, SourceSpan } from "../compiler.js";
import { unwrapSourced } from "../assemble/sourced.js";
import { canonicalElementName } from "../util/naming.js";

export interface LocalTemplateDeclarationIdentity {
  readonly ownerResourceId: string;
  readonly localTemplateName: string;
  readonly declarationFileId: string;
  readonly declarationStartOffset: number;
}

export function createOwnerResourceId(owner: Pick<ResourceDef, "kind" | "name" | "className" | "file">): string {
  const name = unwrapSourced(owner.name) ?? "";
  const className = unwrapSourced(owner.className) ?? "";
  const file = owner.file ?? "";
  return `${owner.kind}|${name}|${className}|${file}`;
}

export function createLocalTemplateDeclarationIdentity(
  owner: Pick<ResourceDef, "kind" | "name" | "className" | "file">,
  localTemplateName: string,
  declarationSpan: SourceSpan,
): LocalTemplateDeclarationIdentity {
  return {
    ownerResourceId: createOwnerResourceId(owner),
    localTemplateName: canonicalLocalTemplateName(localTemplateName),
    declarationFileId: String(declarationSpan.file),
    declarationStartOffset: declarationSpan.start,
  };
}

export function createLocalTemplateDeclarationKey(
  owner: Pick<ResourceDef, "kind" | "name" | "className" | "file">,
  localTemplateName: string,
  declarationSpan: SourceSpan,
): string {
  return serializeLocalTemplateDeclarationIdentity(
    createLocalTemplateDeclarationIdentity(owner, localTemplateName, declarationSpan),
  );
}

export function serializeLocalTemplateDeclarationIdentity(
  identity: LocalTemplateDeclarationIdentity,
): string {
  return [
    identity.ownerResourceId,
    identity.localTemplateName,
    identity.declarationFileId,
    String(identity.declarationStartOffset),
  ].join("|");
}

function canonicalLocalTemplateName(value: string): string {
  const normalized = canonicalElementName(value);
  return normalized ?? value.trim().toLowerCase();
}
