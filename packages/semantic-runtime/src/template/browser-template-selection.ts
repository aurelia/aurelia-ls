import {
  BrowserTemplateDraftNodeKind,
  BrowserTemplateElementDraft,
  type BrowserTemplateFragmentDraft,
  type BrowserTemplateNodeDraft,
} from './browser-template-draft.js';
import { HtmlNamespaceKind } from './html-ir.js';

export const BROWSER_TEMPLATE_CARRIER_SELECTION_SCHEMA_VERSION =
  'semantic-runtime/browser-template-carrier-selection/v1' as const;

export const enum BrowserTemplateCarrierKind {
  AuthoredTemplate = 'authored-template',
  SynthesizedWrapper = 'synthesized-wrapper',
}

export const enum BrowserTemplateCarrierSelectionReason {
  SelectedTemplate = 'selected-template',
  NoElement = 'no-element',
  FirstElementNotHtmlTemplate = 'first-element-not-html-template',
  LaterElementSibling = 'later-element-sibling',
  MeaningfulPreviousTextSibling = 'meaningful-previous-text-sibling',
  MeaningfulNextTextSibling = 'meaningful-next-text-sibling',
}

/** Product-free result of Aurelia's string-input `TemplateElementFactory` carrier-selection rule. */
export class BrowserTemplateCarrierSelectionDraft {
  readonly schemaVersion = BROWSER_TEMPLATE_CARRIER_SELECTION_SCHEMA_VERSION;

  constructor(
    readonly carrierKind: BrowserTemplateCarrierKind,
    readonly reason: BrowserTemplateCarrierSelectionReason,
    /** Present only when Aurelia selects and unwraps an authored HTML template element. */
    readonly authoredCarrier: BrowserTemplateElementDraft | null,
    /** The effective template content that the compiler will traverse. */
    readonly content: BrowserTemplateFragmentDraft,
    /** Input-fragment nodes removed by authored-template selection, including any framework-discarded siblings. */
    readonly discardedInputNodes: readonly BrowserTemplateNodeDraft[],
  ) {}
}

/**
 * Reproduce the framework's current string-markup carrier selection after browser fragment parsing.
 * This intentionally retains the immediate-sibling rule, including its comment-shield behavior.
 */
export function selectBrowserTemplateCompilerCarrier(
  input: BrowserTemplateFragmentDraft,
): BrowserTemplateCarrierSelectionDraft {
  const firstElementIndex = input.children.findIndex((node) => node instanceof BrowserTemplateElementDraft);
  if (firstElementIndex < 0) {
    return synthesizedWrapper(input, BrowserTemplateCarrierSelectionReason.NoElement);
  }
  const firstElement = input.children[firstElementIndex] as BrowserTemplateElementDraft;
  if (firstElement.namespace !== HtmlNamespaceKind.Html || firstElement.tagName !== 'template') {
    return synthesizedWrapper(input, BrowserTemplateCarrierSelectionReason.FirstElementNotHtmlTemplate);
  }
  if (input.children.slice(firstElementIndex + 1).some((node) => node instanceof BrowserTemplateElementDraft)) {
    return synthesizedWrapper(input, BrowserTemplateCarrierSelectionReason.LaterElementSibling);
  }
  if (isMeaningfulText(input.children[firstElementIndex - 1])) {
    return synthesizedWrapper(input, BrowserTemplateCarrierSelectionReason.MeaningfulPreviousTextSibling);
  }
  if (isMeaningfulText(input.children[firstElementIndex + 1])) {
    return synthesizedWrapper(input, BrowserTemplateCarrierSelectionReason.MeaningfulNextTextSibling);
  }
  if (firstElement.templateContent == null) {
    throw new Error('An effective HTML template element must carry a template-content fragment.');
  }
  return new BrowserTemplateCarrierSelectionDraft(
    BrowserTemplateCarrierKind.AuthoredTemplate,
    BrowserTemplateCarrierSelectionReason.SelectedTemplate,
    firstElement,
    firstElement.templateContent,
    input.children.filter((_, index) => index !== firstElementIndex),
  );
}

function synthesizedWrapper(
  input: BrowserTemplateFragmentDraft,
  reason: BrowserTemplateCarrierSelectionReason,
): BrowserTemplateCarrierSelectionDraft {
  return new BrowserTemplateCarrierSelectionDraft(
    BrowserTemplateCarrierKind.SynthesizedWrapper,
    reason,
    null,
    input,
    [],
  );
}

function isMeaningfulText(node: BrowserTemplateNodeDraft | undefined): boolean {
  return node?.nodeKind === BrowserTemplateDraftNodeKind.Text && node.text.trim().length > 0;
}
