import * as ts from "typescript";
import {
  ClaimOutcomeKind,
  ClaimQualifierKind,
  ClaimHomeKind
} from "../../model/claims/claim-model.js";
import { ClosureStatusKind } from "../../model/semantic-runtime-handles.js";
import type { QuestionRoute } from "../../query/framing/question-route.js";
import type { CurrentWorldPublication } from "../../workspace/snapshots/current-world-publication.js";
import {
  TemplateSourceKind,
  type AssociatedTemplateSource
} from "../../workspace/templates/template-source-association.js";
import { AuthoredOccurrenceBasis } from "./authored-occurrence-basis.js";

export class AuthoredOccurrencePublicationDecision {
  public constructor(
    public readonly outcome: ClaimOutcomeKind,
    public readonly qualifier: ClaimQualifierKind,
    public readonly closureStatus: ClosureStatusKind,
    public readonly basis?: AuthoredOccurrenceBasis
  ) {}
}

export class AuthoredOccurrenceBasisPublisher {
  public publish(
    questionRoute: QuestionRoute,
    publication: CurrentWorldPublication
  ): AuthoredOccurrencePublicationDecision {
    if (questionRoute.claimRoute.home !== ClaimHomeKind.AuthoredOccurrenceBasis) {
      return new AuthoredOccurrencePublicationDecision(
        ClaimOutcomeKind.NoClaim,
        ClaimQualifierKind.WorldOpen,
        ClosureStatusKind.Open
      );
    }

    const target = questionRoute.authoredOccurrenceTarget;
    if (target === undefined) {
      return new AuthoredOccurrencePublicationDecision(
        ClaimOutcomeKind.NoClaim,
        ClaimQualifierKind.WorldOpen,
        ClosureStatusKind.Open
      );
    }

    const matchedResource = publication.resources.find(
      (resource) =>
        resource.templateAssociation?.templateSourceRef === target.templateSourceRef
    );
    const association = matchedResource?.templateAssociation;
    if (matchedResource === undefined || association === undefined) {
      return new AuthoredOccurrencePublicationDecision(
        ClaimOutcomeKind.NoClaim,
        ClaimQualifierKind.WorldOpen,
        ClosureStatusKind.Open
      );
    }

    const templateText = readTemplateText(association);
    if (templateText === undefined || target.offset < 0 || target.offset >= templateText.length) {
      return new AuthoredOccurrencePublicationDecision(
        ClaimOutcomeKind.NoClaim,
        ClaimQualifierKind.WorldOpen,
        ClosureStatusKind.Open
      );
    }

    return new AuthoredOccurrencePublicationDecision(
      ClaimOutcomeKind.Present,
      ClaimQualifierKind.WorldOpen,
      ClosureStatusKind.Partial,
      new AuthoredOccurrenceBasis(
        createOccurrenceRef(publication.consultedWorld.worldRef, target.templateSourceRef, target.offset),
        createOccurrenceCarrierRef(target.templateSourceRef),
        publication.consultedWorld.worldRef,
        target.templateSourceRef,
        matchedResource.resourceName,
        association.viewStrategy,
        association.sourceKind ?? TemplateSourceKind.ExternalFile,
        target.offset,
        "Template-source association and occurrence locus are closed, but syntax classification and lowering stay downstream of this basis slice.",
        association.templateFileName
      )
    );
  }
}

function readTemplateText(
  association: AssociatedTemplateSource
): string | undefined {
    if (association.sourceKind === TemplateSourceKind.ExternalFile) {
      if (association.templateFileName === undefined) {
        return undefined;
      }

    return ts.sys.readFile(association.templateFileName) ?? undefined;
  }

  return association.templateText;
}

function createOccurrenceRef(
  worldRef: string,
  templateSourceRef: string,
  offset: number
): string {
  return `occurrence:${worldRef}:${templateSourceRef}:${offset}`;
}

function createOccurrenceCarrierRef(
  templateSourceRef: string
): string {
  return `occurrence-carrier:template-source-basis:${templateSourceRef}`;
}
