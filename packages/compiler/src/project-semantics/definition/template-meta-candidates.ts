import type {
  CustomElementDef,
  NormalizedPath,
  ResourceDef,
} from "../compiler.js";
import type { AnalysisGap } from "../evaluate/types.js";
import type { LocalTemplateDefinition } from "../extract/file-facts.js";
import type { TemplateFactCollection } from "../extract/template-facts.js";
import {
  buildCustomElementTemplateMetaOverlay,
  buildLocalTemplateCustomElementDefinition,
  hasLocalTemplateSurfaceOnlyMeta,
  hasNonImportTemplateMeta,
  ownerClassName,
} from "./template-meta-resource.js";
import { createLocalTemplateDeclarationKey } from "./local-template-identity.js";

export interface TemplateMetaCandidateResult {
  readonly candidates: readonly ResourceDef[];
  readonly gaps: readonly AnalysisGap[];
  readonly localTemplateAuthorities: ReadonlyMap<string, CustomElementDef>;
}

export function collectTemplateMetaDefinitionCandidates(
  templateFacts: TemplateFactCollection,
): TemplateMetaCandidateResult {
  const candidates: ResourceDef[] = [];
  const gaps: AnalysisGap[] = [];
  const localTemplateAuthorities = new Map<string, CustomElementDef>();

  for (const template of templateFacts.owned) {
    if (hasNonImportTemplateMeta(template.rootTemplateMeta)) {
      candidates.push(
        buildCustomElementTemplateMetaOverlay(
          template.owner,
          template.templateFile,
          template.rootTemplateMeta,
        ),
      );
    }

    collectLocalTemplateAuthorities(
      template.localTemplateDefinitions,
      template.owner,
      template.sourcePath,
      template.templateFile,
      template.origin,
      localTemplateAuthorities,
      gaps,
    );
  }

  for (const ambiguity of templateFacts.ambiguities) {
    if (hasNonImportTemplateMeta(ambiguity.rootTemplateMeta)) {
      gaps.push({
        what: `template metadata owner for '${ambiguity.templateFile}'`,
        why: {
          kind: "unsupported-pattern",
          path: ambiguity.sourcePath,
          reason: `template-meta-owner-ambiguous:${ambiguity.templateFile}`,
        },
        where: { file: ambiguity.templateFile },
        suggestion:
          "Use one external-template custom element per file, or align template basename with one resource name.",
      });
    }

    if (ambiguity.localTemplateDefinitions.length > 0) {
      gaps.push({
        what: `local template owner for '${ambiguity.templateFile}'`,
        why: {
          kind: "unsupported-pattern",
          path: ambiguity.sourcePath,
          reason: `local-template-owner-ambiguous:${ambiguity.templateFile}`,
        },
        where: { file: ambiguity.templateFile },
        suggestion:
          "Use one external-template custom element per file, or align template basename with one resource name.",
      });
    }
  }

  for (const missingOwner of templateFacts.missingOwners) {
    if (missingOwner.localTemplateDefinitions.length === 0) continue;
    gaps.push({
      what: `local template owner for '${missingOwner.templateFile}'`,
      why: {
        kind: "unsupported-pattern",
        path: missingOwner.sourcePath,
        reason: `local-template-owner-missing:${missingOwner.templateFile}`,
      },
      where: { file: missingOwner.templateFile },
      suggestion:
        "Declare at least one external-template custom element in the source file for this template.",
    });
  }

  return { candidates, gaps, localTemplateAuthorities };
}

function collectLocalTemplateAuthorities(
  definitions: readonly LocalTemplateDefinition[],
  owner: CustomElementDef,
  sourcePath: NormalizedPath,
  templateFile: NormalizedPath,
  origin: "sibling" | "inline",
  out: Map<string, CustomElementDef>,
  gaps: AnalysisGap[],
): void {
  if (definitions.length === 0) return;
  const className = ownerClassName(owner);

  for (const definition of definitions) {
    const localTemplateResource = buildLocalTemplateCustomElementDefinition(
      definition.localTemplateName,
      templateFile,
      className,
      definition.templateMeta,
    );
    const replayKey = createLocalTemplateDeclarationKey(
      owner,
      definition.localTemplateName.value,
      definition.span,
    );
    out.set(replayKey, localTemplateResource);

    if (!hasLocalTemplateSurfaceOnlyMeta(definition.templateMeta)) continue;
    gaps.push({
      what: `local template non-bindable metadata for '${definition.localTemplateName.value}'`,
      why: {
        kind: "unsupported-pattern",
        path: sourcePath,
        reason: `local-template-meta-surface-only:${origin}:${definition.localTemplateName.value}`,
      },
      where: { file: templateFile },
      suggestion:
        "Local template non-bindable metadata is currently treated as surface-only evidence; only bindables affect definition authority.",
    });
  }
}
