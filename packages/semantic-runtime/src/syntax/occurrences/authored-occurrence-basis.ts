import type {
  TemplateSourceKind,
  TemplateViewStrategyKind
} from "../../workspace/templates/template-source-association.js";

export const enum SyntaxCarrierKind {
  TemplateSourceBasis = 1
}

export class AuthoredOccurrenceBasis {
  public constructor(
    public readonly occurrenceRef: string,
    public readonly occurrenceCarrierRef: string,
    public readonly worldRef: string,
    public readonly templateSourceRef: string,
    public readonly ownerResourceName: string,
    public readonly viewStrategy: TemplateViewStrategyKind,
    public readonly sourceKind: TemplateSourceKind,
    public readonly offset: number,
    public readonly note: string,
    public readonly templateFileName?: string
  ) {}

  public get carrierKind(): SyntaxCarrierKind {
    return SyntaxCarrierKind.TemplateSourceBasis;
  }
}
