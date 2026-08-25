import type {
  AddressHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import type { ProductDetailReadView } from '../kernel/product-details.js';
import { readFieldProvenance } from '../kernel/provenance.js';
import type {
  InterpolationInstruction,
  PropertyBindingInstruction,
  SetPropertyInstruction,
} from './instruction-ir.js';
import { TemplateProductDetails } from './product-details.js';

export const enum TemplateInstructionAuthoredValueSourceClosure {
  /** Exact authored attribute value address and its matching provenance are both retained. */
  Exact = 'exact',
  /** Only a broader instruction or attribute carrier remains available. */
  Carrier = 'carrier',
  /** No authored source carrier can be recovered. */
  Unavailable = 'unavailable',
}

/** Authored HTML value lineage reached through one generated template instruction. */
export class TemplateInstructionAuthoredValueSource {
  constructor(
    readonly closure: TemplateInstructionAuthoredValueSourceClosure,
    readonly instructionProductHandle: ProductHandle,
    /** Readable HtmlAttribute product whose structural occupancy proves this lineage. */
    readonly attributeProductHandle: ProductHandle | null,
    /** Best available authored carrier, exact when `closure` is `exact`. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Exact authored attribute-value provenance; never synthesized from generated instruction provenance. */
    readonly provenanceHandle: ProvenanceHandle | null,
  ) {}
}

export type TemplateInstructionWithAuthoredAttributeValue =
  | SetPropertyInstruction
  | PropertyBindingInstruction
  | InterpolationInstruction;

/** Follow a generated instruction's retained HtmlAttribute reference to its authored value witness. */
export function templateInstructionAuthoredValueSource(
  publication: ProductDetailReadView,
  instruction: TemplateInstructionWithAuthoredAttributeValue,
): TemplateInstructionAuthoredValueSource {
  const attributeReference = instruction.attribute;
  const attribute = attributeReference?.productHandle == null
    ? null
    : publication.readProductDetail(
        TemplateProductDetails.HtmlAttribute,
        attributeReference.productHandle,
      );
  const valueAddressHandle = attribute?.valueAddressHandle ?? null;
  const provenanceHandle = attribute == null
    ? null
    : readFieldProvenance(attribute.fieldProvenance, 'value');
  const sourceAddressHandle = valueAddressHandle
    ?? attribute?.sourceAddressHandle
    ?? attributeReference?.addressHandle
    ?? instruction.sourceAddressHandle;
  const closure = valueAddressHandle != null && provenanceHandle != null
    ? TemplateInstructionAuthoredValueSourceClosure.Exact
    : sourceAddressHandle == null
      ? TemplateInstructionAuthoredValueSourceClosure.Unavailable
      : TemplateInstructionAuthoredValueSourceClosure.Carrier;
  return new TemplateInstructionAuthoredValueSource(
    closure,
    instruction.productHandle,
    attribute?.productHandle ?? null,
    sourceAddressHandle,
    provenanceHandle,
  );
}
