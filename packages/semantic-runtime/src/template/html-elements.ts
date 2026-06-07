/** Standard HTML void elements that cannot own child content or end tags. */
export enum HtmlVoidElementName {
  /** `area` image-map area element. */
  Area = 'area',
  /** `base` document base URL element. */
  Base = 'base',
  /** `br` line-break element. */
  Br = 'br',
  /** `col` table-column element. */
  Col = 'col',
  /** `embed` embedded external content element. */
  Embed = 'embed',
  /** `hr` thematic-break element. */
  Hr = 'hr',
  /** `img` image element. */
  Img = 'img',
  /** `input` form-input element. */
  Input = 'input',
  /** `link` external-resource link element. */
  Link = 'link',
  /** `meta` document metadata element. */
  Meta = 'meta',
  /** `param` object parameter element. */
  Param = 'param',
  /** `source` media-source element. */
  Source = 'source',
  /** `track` media text-track element. */
  Track = 'track',
  /** `wbr` word-break opportunity element. */
  Wbr = 'wbr',
}

/** Stable list used by template parsing and source emission for HTML void-element policy. */
export const HTML_VOID_ELEMENT_NAMES = [
  HtmlVoidElementName.Area,
  HtmlVoidElementName.Base,
  HtmlVoidElementName.Br,
  HtmlVoidElementName.Col,
  HtmlVoidElementName.Embed,
  HtmlVoidElementName.Hr,
  HtmlVoidElementName.Img,
  HtmlVoidElementName.Input,
  HtmlVoidElementName.Link,
  HtmlVoidElementName.Meta,
  HtmlVoidElementName.Param,
  HtmlVoidElementName.Source,
  HtmlVoidElementName.Track,
  HtmlVoidElementName.Wbr,
] as const;

/** Return true when a tag name is an HTML void element. */
export function isHtmlVoidElement(tagName: string): boolean {
  return (HTML_VOID_ELEMENT_NAMES as readonly string[]).includes(tagName.toLowerCase());
}
