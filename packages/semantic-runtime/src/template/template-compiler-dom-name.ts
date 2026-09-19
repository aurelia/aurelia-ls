/** DOM names with an explicit cross-version admission boundary. */
const invalidAttributeLocalName = /[\0\t\n\f\r />=]/;
const invalidNamespacePrefix = /[\0\t\n\f\r />]/;

// XML 1.0 Name remains a cross-browser admission subset, not the definition of valid modern DOM names.
// https://www.w3.org/TR/xml/#NT-NameStartChar
const legacyNameStart = ':A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF'
  + '\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\u{10000}-\\u{EFFFF}';
// eslint-disable-next-line no-misleading-character-class -- XML NameChar explicitly admits individual combining code points.
const legacyName = new RegExp(`^[${legacyNameStart}][${legacyNameStart}\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$`, 'u');

export type CompilerDomAttributeNameIssue = 'InvalidCharacterError' | 'NamespaceError' | 'dom-name-compatibility';

export interface CompilerDomAttributeName {
  readonly name: string;
  readonly namespaceUri: string | null;
  readonly prefix: string | null;
}

/**
 * Validate non-namespace setter names. The modern DOM relaxed historical XML restrictions; browser versions still
 * differ. Newly admitted spellings remain unsupported until target-browser authority exists, rather than being
 * incorrectly reported as InvalidCharacterError. https://dom.spec.whatwg.org/#concept-element-attributes-set-value
 */
export function compilerDomAttributeNameIssue(name: string): CompilerDomAttributeNameIssue | null {
  if (name.length === 0 || invalidAttributeLocalName.test(name)) return 'InvalidCharacterError';
  return legacyName.test(name) ? null : 'dom-name-compatibility';
}

/** Element validation is distinct from attribute validation: modern element names can contain `=`. */
export function compilerDomElementNameIssue(name: string): CompilerDomAttributeNameIssue | null {
  if (name.length === 0 || /[\0\t\n\f\r />]/u.test(name)) return 'InvalidCharacterError';
  if (!/^[A-Za-z:_\u0080-\u{10FFFF}]/u.test(name)) return 'InvalidCharacterError';
  return legacyName.test(name) ? null : 'dom-name-compatibility';
}

/** Namespace validation and extraction, with the same explicit cross-version name boundary. */
export function compilerDomNamespacedAttributeName(
  namespaceUri: string | null,
  qualifiedName: string,
): CompilerDomAttributeName | CompilerDomAttributeNameIssue {
  const colon = qualifiedName.indexOf(':');
  const prefix = colon < 0 ? null : qualifiedName.slice(0, colon);
  const name = colon < 0 ? qualifiedName : qualifiedName.slice(colon + 1);
  if (prefix != null && (prefix.length === 0 || invalidNamespacePrefix.test(prefix))) return 'InvalidCharacterError';
  if (name.length === 0 || invalidAttributeLocalName.test(name)) return 'InvalidCharacterError';
  if (!legacyName.test(name) || name.includes(':') || prefix != null && !legacyName.test(prefix)) {
    return 'dom-name-compatibility';
  }
  if (prefix != null && namespaceUri == null
    || prefix === 'xml' && namespaceUri !== 'http://www.w3.org/XML/1998/namespace'
    || (qualifiedName === 'xmlns' || prefix === 'xmlns') && namespaceUri !== 'http://www.w3.org/2000/xmlns/'
    || namespaceUri === 'http://www.w3.org/2000/xmlns/' && qualifiedName !== 'xmlns' && prefix !== 'xmlns') {
    return 'NamespaceError';
  }
  return { name, prefix, namespaceUri };
}
