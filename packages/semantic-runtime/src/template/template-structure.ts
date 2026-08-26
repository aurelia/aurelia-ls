import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import {
  productDetailAddressHandle,
  productDetailHandle,
  productDetailIdentityHandle,
} from '../kernel/product-details.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type {
  BrowserTemplateAttributeLocationJoinKind,
  BrowserTemplateDraftAuthority,
  BrowserTemplateDraftLocationKind,
  BrowserTemplateSourceLocation,
} from './browser-template-draft.js';
import type {
  BrowserTemplateCarrierKind,
  BrowserTemplateCarrierSelectionReason,
} from './browser-template-selection.js';
import type { TemplateSourceReference } from './compilation-unit.js';
import {
  HtmlIrNodeKind,
  type HtmlNamespaceKind,
} from './html-ir.js';

const StructuralTreeDetailKind = 'template.structural-tree';
const StructuralNodeDetailKind = 'template.structural-node';
const StructuralAttributeDetailKind = 'template.structural-attribute';

export type BrowserEffectiveTemplateTreeField =
  | 'templateSource'
  | 'parserAuthority'
  | 'inputFragment'
  | 'carrierKind'
  | 'carrierReason'
  | 'compilerCarrier'
  | 'authoredCarrier'
  | 'compilerContent'
  | 'discardedInputNodes'
  | 'source';

export type BrowserEffectiveTemplateNodeField =
  | 'tree'
  | 'kind'
  | 'name'
  | 'namespace'
  | 'attributes'
  | 'children'
  | 'templateContent'
  | 'value'
  | 'parserLocation'
  | 'source';

export type BrowserEffectiveTemplateAttributeField =
  | 'tree'
  | 'owner'
  | 'name'
  | 'namespace'
  | 'value'
  | 'parserLocation'
  | 'source';

/** Reference to one immutable structural tree interpretation of an authored template. */
export class TemplateStructuralTreeReference {
  readonly treeKind = 'browser-effective' as const;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly addressHandle: AddressHandle | null,
  ) {}
}

/** Reference to one node occurrence in a structural tree. */
export class TemplateStructuralNodeReference {
  constructor(
    readonly treeProductHandle: ProductHandle,
    readonly nodeKind: HtmlIrNodeKind,
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly addressHandle: AddressHandle | null,
  ) {}
}

/** Reference to one effective attribute occurrence in a structural tree. */
export class TemplateStructuralAttributeReference {
  constructor(
    readonly treeProductHandle: ProductHandle,
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly addressHandle: AddressHandle | null,
    readonly name: string,
  ) {}
}

/** Browser-effective structural tree plus the separate Aurelia carrier-selection result. */
export class BrowserEffectiveTemplateTree {
  readonly treeKind = 'browser-effective' as const;

  constructor(
    readonly templateSource: TemplateSourceReference,
    readonly parserAuthority: BrowserTemplateDraftAuthority,
    readonly inputFragment: TemplateStructuralNodeReference,
    readonly carrierKind: BrowserTemplateCarrierKind,
    readonly carrierReason: BrowserTemplateCarrierSelectionReason,
    /** Effective HTML template element supplied to the compiler, including a generated wrapper when required. */
    readonly compilerCarrier: TemplateStructuralNodeReference,
    readonly authoredCarrier: TemplateStructuralNodeReference | null,
    readonly compilerContent: TemplateStructuralNodeReference,
    readonly discardedInputNodes: readonly TemplateStructuralNodeReference[],
    readonly fieldProvenance: readonly FieldProvenance<BrowserEffectiveTemplateTreeField>[] = [],
  ) {}

  get productHandle(): ProductHandle {
    return productDetailHandle(this, StructuralTreeDetailKind);
  }

  get identityHandle(): IdentityHandle {
    return productDetailIdentityHandle(this, StructuralTreeDetailKind);
  }

  get sourceAddressHandle(): AddressHandle | null {
    return productDetailAddressHandle(this, StructuralTreeDetailKind);
  }

  toReference(): TemplateStructuralTreeReference {
    return new TemplateStructuralTreeReference(
      this.productHandle,
      this.identityHandle,
      this.sourceAddressHandle,
    );
  }
}

/** Explicit fragment node; template content is never flattened into ordinary element children. */
export class BrowserEffectiveTemplateFragment {
  readonly nodeKind = HtmlIrNodeKind.Fragment;

  constructor(
    readonly tree: TemplateStructuralTreeReference,
    readonly children: readonly TemplateStructuralNodeReference[],
    readonly fieldProvenance: readonly FieldProvenance<BrowserEffectiveTemplateNodeField>[] = [],
  ) {}

  get productHandle(): ProductHandle {
    return productDetailHandle(this, StructuralNodeDetailKind);
  }

  get identityHandle(): IdentityHandle {
    return productDetailIdentityHandle(this, StructuralNodeDetailKind);
  }

  get sourceAddressHandle(): AddressHandle | null {
    return productDetailAddressHandle(this, StructuralNodeDetailKind);
  }

  toReference(): TemplateStructuralNodeReference {
    return structuralNodeReference(this);
  }
}

/** Effective browser element value; this is a record, not a DOM implementation. */
export class BrowserEffectiveTemplateElement {
  readonly nodeKind = HtmlIrNodeKind.Element;

  constructor(
    readonly tree: TemplateStructuralTreeReference,
    readonly tagName: string,
    readonly namespace: HtmlNamespaceKind,
    readonly namespaceUri: string,
    readonly attributes: readonly TemplateStructuralAttributeReference[],
    readonly children: readonly TemplateStructuralNodeReference[],
    readonly templateContent: TemplateStructuralNodeReference | null,
    readonly locationKind: BrowserTemplateDraftLocationKind,
    readonly sourceLocation: BrowserTemplateSourceLocation | null,
    readonly startTagSourceLocation: BrowserTemplateSourceLocation | null,
    readonly endTagSourceLocation: BrowserTemplateSourceLocation | null,
    readonly fieldProvenance: readonly FieldProvenance<BrowserEffectiveTemplateNodeField>[] = [],
  ) {}

  get productHandle(): ProductHandle {
    return productDetailHandle(this, StructuralNodeDetailKind);
  }

  get identityHandle(): IdentityHandle {
    return productDetailIdentityHandle(this, StructuralNodeDetailKind);
  }

  get sourceAddressHandle(): AddressHandle | null {
    return productDetailAddressHandle(this, StructuralNodeDetailKind);
  }

  toReference(): TemplateStructuralNodeReference {
    return structuralNodeReference(this);
  }
}

export class BrowserEffectiveTemplateText {
  readonly nodeKind = HtmlIrNodeKind.Text;

  constructor(
    readonly tree: TemplateStructuralTreeReference,
    readonly text: string,
    readonly locationKind: BrowserTemplateDraftLocationKind,
    readonly sourceLocation: BrowserTemplateSourceLocation | null,
    readonly fieldProvenance: readonly FieldProvenance<BrowserEffectiveTemplateNodeField>[] = [],
  ) {}

  get productHandle(): ProductHandle {
    return productDetailHandle(this, StructuralNodeDetailKind);
  }

  get identityHandle(): IdentityHandle {
    return productDetailIdentityHandle(this, StructuralNodeDetailKind);
  }

  get sourceAddressHandle(): AddressHandle | null {
    return productDetailAddressHandle(this, StructuralNodeDetailKind);
  }

  toReference(): TemplateStructuralNodeReference {
    return structuralNodeReference(this);
  }
}

export class BrowserEffectiveTemplateComment {
  readonly nodeKind = HtmlIrNodeKind.Comment;

  constructor(
    readonly tree: TemplateStructuralTreeReference,
    readonly text: string,
    readonly locationKind: BrowserTemplateDraftLocationKind,
    readonly sourceLocation: BrowserTemplateSourceLocation | null,
    readonly fieldProvenance: readonly FieldProvenance<BrowserEffectiveTemplateNodeField>[] = [],
  ) {}

  get productHandle(): ProductHandle {
    return productDetailHandle(this, StructuralNodeDetailKind);
  }

  get identityHandle(): IdentityHandle {
    return productDetailIdentityHandle(this, StructuralNodeDetailKind);
  }

  get sourceAddressHandle(): AddressHandle | null {
    return productDetailAddressHandle(this, StructuralNodeDetailKind);
  }

  toReference(): TemplateStructuralNodeReference {
    return structuralNodeReference(this);
  }
}

export class BrowserEffectiveTemplateDoctype {
  readonly nodeKind = HtmlIrNodeKind.Doctype;

  constructor(
    readonly tree: TemplateStructuralTreeReference,
    readonly name: string,
    readonly publicId: string,
    readonly systemId: string,
    readonly locationKind: BrowserTemplateDraftLocationKind,
    readonly sourceLocation: BrowserTemplateSourceLocation | null,
    readonly fieldProvenance: readonly FieldProvenance<BrowserEffectiveTemplateNodeField>[] = [],
  ) {}

  get productHandle(): ProductHandle {
    return productDetailHandle(this, StructuralNodeDetailKind);
  }

  get identityHandle(): IdentityHandle {
    return productDetailIdentityHandle(this, StructuralNodeDetailKind);
  }

  get sourceAddressHandle(): AddressHandle | null {
    return productDetailAddressHandle(this, StructuralNodeDetailKind);
  }

  toReference(): TemplateStructuralNodeReference {
    return structuralNodeReference(this);
  }
}

/** Browser-effective attribute value and parser-location association. */
export class BrowserEffectiveTemplateAttribute {
  constructor(
    readonly tree: TemplateStructuralTreeReference,
    readonly owner: TemplateStructuralNodeReference,
    readonly name: string,
    readonly value: string,
    readonly namespaceUri: string | null,
    readonly prefix: string | null,
    readonly locationJoinKind: BrowserTemplateAttributeLocationJoinKind,
    readonly parserLocationKey: string | null,
    readonly sourceTokenName: string | null,
    readonly sourceLocation: BrowserTemplateSourceLocation | null,
    readonly fieldProvenance: readonly FieldProvenance<BrowserEffectiveTemplateAttributeField>[] = [],
  ) {}

  get productHandle(): ProductHandle {
    return productDetailHandle(this, StructuralAttributeDetailKind);
  }

  get identityHandle(): IdentityHandle {
    return productDetailIdentityHandle(this, StructuralAttributeDetailKind);
  }

  get sourceAddressHandle(): AddressHandle | null {
    return productDetailAddressHandle(this, StructuralAttributeDetailKind);
  }

  toReference(): TemplateStructuralAttributeReference {
    return new TemplateStructuralAttributeReference(
      this.tree.productHandle,
      this.productHandle,
      this.identityHandle,
      this.sourceAddressHandle,
      this.name,
    );
  }
}

export type BrowserEffectiveTemplateNode =
  | BrowserEffectiveTemplateFragment
  | BrowserEffectiveTemplateElement
  | BrowserEffectiveTemplateText
  | BrowserEffectiveTemplateComment
  | BrowserEffectiveTemplateDoctype;

function structuralNodeReference(
  node: BrowserEffectiveTemplateNode,
): TemplateStructuralNodeReference {
  return new TemplateStructuralNodeReference(
    node.tree.productHandle,
    node.nodeKind,
    node.productHandle,
    node.identityHandle,
    node.sourceAddressHandle,
  );
}
