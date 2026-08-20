import ts from 'typescript';
import {
  CheckerTypeMemberKind,
  CheckerTypeMemberVisibilityKind,
  type CheckerTypeMember,
} from './type-shape.js';
import { checkerCallableContextSignatures } from './checker-signature-parameters.js';

export const CHECKER_MEMBER_DOCUMENTATION_MAX_CODE_POINTS = 800;
export const CHECKER_MEMBER_DOCUMENTATION_MAX_LINES = 8;
export const CHECKER_MEMBER_DEPRECATION_REASON_MAX_CODE_POINTS = 240;
export const CHECKER_MEMBER_DEPRECATION_REASON_MAX_LINES = 1;
export const CHECKER_MEMBER_TEXT_MAX_SOURCES = 8;

/** Current-checker plaintext ready for source publication into a member carrier. */
export interface CheckerTypeMemberTextDraft {
  readonly text: string;
  readonly isTruncated: boolean;
  readonly sourceCount: number;
  readonly sourceNodes: readonly ts.Node[];
}

export function declarationsForCheckerSymbol(symbol: ts.Symbol | null): readonly ts.Declaration[] {
  return symbol?.getDeclarations() ?? [];
}

export function checkerSymbolMemberKind(
  symbol: ts.Symbol,
  declarations: readonly ts.Declaration[] = declarationsForCheckerSymbol(symbol),
): CheckerTypeMemberKind {
  if ((symbol.flags & ts.SymbolFlags.Method) !== 0) {
    return CheckerTypeMemberKind.Method;
  }
  if ((symbol.flags & (ts.SymbolFlags.GetAccessor | ts.SymbolFlags.SetAccessor)) !== 0) {
    return CheckerTypeMemberKind.Accessor;
  }
  if ((symbol.flags & ts.SymbolFlags.Constructor) !== 0) {
    return CheckerTypeMemberKind.Constructor;
  }
  if ((symbol.flags & ts.SymbolFlags.Property) !== 0) {
    return CheckerTypeMemberKind.Property;
  }
  if (declarations.some((declaration) => ts.isCallSignatureDeclaration(declaration))) {
    return CheckerTypeMemberKind.CallSignature;
  }
  if (declarations.some((declaration) => ts.isIndexSignatureDeclaration(declaration))) {
    return CheckerTypeMemberKind.IndexSignature;
  }
  return CheckerTypeMemberKind.Unknown;
}

export function checkerSymbolIsOptional(
  symbol: ts.Symbol,
  declarations: readonly ts.Declaration[] = declarationsForCheckerSymbol(symbol),
): boolean {
  return (symbol.flags & ts.SymbolFlags.Optional) !== 0
    || declarations.some((declaration) => 'questionToken' in declaration && declaration.questionToken != null);
}

export function checkerDeclarationsAreReadonly(
  declarations: readonly ts.Declaration[],
): boolean {
  return declarations.some((declaration) =>
    ts.canHaveModifiers(declaration)
    && ts.getModifiers(declaration)?.some((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword) === true
  );
}

export function checkerTypeMemberVisibilityKind(
  member: CheckerTypeMember,
): CheckerTypeMemberVisibilityKind {
  return member.carrier == null
    ? CheckerTypeMemberVisibilityKind.Unknown
    : checkerDeclarationsVisibilityKind(member.carrier.declarations);
}

/** Whether every current checker declaration marks this member deprecated through JSDoc. */
export function checkerTypeMemberIsDeprecated(member: CheckerTypeMember): boolean {
  const declarations = member.carrier?.declarations ?? [];
  return declarations.length > 0 && declarations.every((declaration) =>
    ts.getJSDocDeprecatedTag(declaration) != null
  );
}

/**
 * Project one unambiguous symbol-level main comment through TypeScript's own documentation merge/display carrier.
 *
 * Overloads and accessor groups deliberately remain null until a selected-signature lane can authenticate which
 * declaration owns the displayed prose. JSDoc tags are not part of `getDocumentationComment` and are not grafted on.
 */
export function checkerSymbolMemberDocumentation(
  checker: ts.TypeChecker,
  symbol: ts.Symbol,
  declarations: readonly ts.Declaration[] = declarationsForCheckerSymbol(symbol),
): CheckerTypeMemberTextDraft | null {
  if (declarations.length !== 1) {
    return null;
  }
  const text = boundedCheckerMemberText(
    checkerDocumentationPlaintext(symbol.getDocumentationComment(checker)),
    CHECKER_MEMBER_DOCUMENTATION_MAX_LINES,
    CHECKER_MEMBER_DOCUMENTATION_MAX_CODE_POINTS,
  );
  if (text == null) {
    return null;
  }
  const sourceNodes = documentationMainCommentSources(declarations[0]!);
  if (sourceNodes.length === 0) {
    return null;
  }
  return {
    ...text,
    sourceCount: sourceNodes.length,
    sourceNodes,
  };
}

/**
 * Expose a deprecation reason only when the established all-declarations rule closes and every declaration supplies
 * the same nonempty normalized reason. Mixed/missing reasons retain only the deprecation boolean.
 */
export function checkerDeclarationsDeprecationReason(
  declarations: readonly ts.Declaration[],
): CheckerTypeMemberTextDraft | null {
  if (declarations.length === 0) {
    return null;
  }
  const tagsByDeclaration = declarations.map((declaration) =>
    ts.getJSDocTags(declaration).filter((tag): tag is ts.JSDocDeprecatedTag =>
      ts.isJSDocDeprecatedTag(tag)
    )
  );
  if (tagsByDeclaration.some((tags) => tags.length === 0)) {
    return null;
  }
  const tags = tagsByDeclaration.flat();
  const reasons = tags.map((tag) => normalizeCheckerDeprecationReason(
    checkerJSDocCommentPlaintext(tag.comment),
  ));
  const reason = reasons[0] ?? '';
  if (reason.length === 0 || reasons.some((candidate) => candidate !== reason)) {
    return null;
  }
  const text = boundedCheckerMemberText(
    reason,
    CHECKER_MEMBER_DEPRECATION_REASON_MAX_LINES,
    CHECKER_MEMBER_DEPRECATION_REASON_MAX_CODE_POINTS,
  );
  if (text == null) {
    return null;
  }
  return {
    ...text,
    sourceCount: tags.length,
    sourceNodes: tags,
  };
}

interface BoundedCheckerMemberText {
  readonly text: string;
  readonly isTruncated: boolean;
}

function checkerDocumentationPlaintext(
  parts: readonly ts.SymbolDisplayPart[],
): string {
  let result = '';
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index]!;
    if (part.kind !== 'link') {
      result += part.text;
      continue;
    }
    if (!part.text.startsWith('{@link')) {
      continue;
    }
    const linkParts: ts.SymbolDisplayPart[] = [];
    while (++index < parts.length && parts[index]!.kind !== 'link') {
      linkParts.push(parts[index]!);
    }
    result += checkerDocumentationLinkLabel(linkParts);
  }
  return result;
}

function checkerDocumentationLinkLabel(
  parts: readonly ts.SymbolDisplayPart[],
): string {
  const explicitText = parts
    .filter((part) => part.kind === 'linkText')
    .map((part) => part.text.trim())
    .filter((text) => text.length > 0)
    .join(' ');
  const name = parts
    .filter((part) => part.kind === 'linkName')
    .map((part) => part.text.trim())
    .filter((text) => text.length > 0)
    .join(' ');
  return checkerDocumentationPlainLinkLabel(name, explicitText);
}

/** @internal Flatten TypeScript's string or node-array JSDoc comment carrier without preserving active links. */
export function checkerJSDocCommentPlaintext(
  comment: string | ts.NodeArray<ts.JSDocComment> | undefined,
): string {
  if (comment == null) {
    return '';
  }
  if (typeof comment === 'string') {
    return normalizeCheckerMemberPlaintext(comment.replace(
      /\{@link(?:code|plain)?\s+([^}]+)\}/giu,
      (_match, body: string) => checkerDocumentationStringLinkLabel(body),
    ));
  }
  return normalizeCheckerMemberPlaintext(comment.map((node) => {
    if (!ts.isJSDocLinkLike(node)) {
      return node.text;
    }
    const name = node.name?.getText(node.getSourceFile()).trim() ?? '';
    return checkerDocumentationPlainLinkLabel(name, node.text.trim());
  }).join(''));
}

function checkerDocumentationPlainLinkLabel(
  name: string,
  text: string,
): string {
  const explicitText = text.replace(/^\|\s*/u, '').trim();
  const textTarget = checkerDocumentationExternalLink(explicitText);
  if (textTarget != null) {
    return textTarget.label;
  }
  const nameTarget = checkerDocumentationExternalLink(name);
  if (nameTarget != null) {
    return explicitText;
  }
  if (
    /^[a-z][a-z0-9+.-]*$/iu.test(name)
    && /^(?::|[+.-][a-z0-9+.-]*:)/iu.test(explicitText)
  ) {
    return checkerDocumentationExternalLink(`${name}${explicitText}`)?.label ?? '';
  }
  return explicitText.length > 0 ? explicitText : name;
}

function checkerDocumentationStringLinkLabel(body: string): string {
  const normalized = body.trim();
  const pipeIndex = normalized.indexOf('|');
  if (pipeIndex >= 0) {
    return checkerDocumentationPlainLinkLabel(
      normalized.slice(0, pipeIndex).trim(),
      normalized.slice(pipeIndex + 1).trim(),
    );
  }
  const [target = '', ...labelParts] = normalized.split(/\s+/u);
  return checkerDocumentationPlainLinkLabel(target, labelParts.join(' '));
}

function checkerDocumentationExternalLink(
  value: string,
): { readonly label: string } | null {
  const colonIndex = value.indexOf(':');
  const scheme = colonIndex < 0
    ? ''
    : value.slice(0, colonIndex).replace(/\s+/gu, '');
  const normalized = /^[a-z][a-z0-9+.-]*$/iu.test(scheme)
    ? `${scheme}${value.slice(colonIndex)}`
    : value;
  const match = /^[a-z][a-z0-9+.-]*:[^\s]*(?:\s+(.+))?$/iu.exec(normalized);
  return match == null ? null : { label: match[1]?.trim() ?? '' };
}

function documentationMainCommentSources(
  declaration: ts.Declaration,
): readonly ts.JSDoc[] {
  return ts.getJSDocCommentsAndTags(declaration).filter((node): node is ts.JSDoc =>
    ts.isJSDoc(node)
    && normalizeCheckerMemberPlaintext(ts.getTextOfJSDocComment(node.comment) ?? '').length > 0
  );
}

function boundedCheckerMemberText(
  rawText: string,
  maxLines: number,
  maxCodePoints: number,
): BoundedCheckerMemberText | null {
  const normalized = normalizeCheckerMemberPlaintext(rawText);
  if (normalized.length === 0) {
    return null;
  }
  const lines = normalized.split('\n');
  let isTruncated = lines.length > maxLines;
  let text = lines.slice(0, maxLines).join('\n').trimEnd();
  const codePoints = [...text];
  if (codePoints.length > maxCodePoints) {
    isTruncated = true;
    text = codePoints.slice(0, maxCodePoints).join('').trimEnd();
    const wordBoundary = Math.max(text.lastIndexOf(' '), text.lastIndexOf('\n'));
    if (wordBoundary >= Math.floor(maxCodePoints * 0.75)) {
      text = text.slice(0, wordBoundary).trimEnd();
    }
  }
  return text.length === 0 ? null : { text, isTruncated };
}

function normalizeCheckerMemberPlaintext(rawText: string): string {
  const normalizedWhitespace = rawText
    .normalize('NFC')
    .replace(/\r\n?/gu, '\n')
    .replace(/\t/gu, '  ');
  return replaceCheckerMemberControlCharacters(normalizedWhitespace)
    .replace(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/gu, '')
    .split('\n')
    .map((line) => line.replace(/[ \t]+([,.;:!?])/gu, '$1').trimEnd())
    .join('\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim();
}

function replaceCheckerMemberControlCharacters(text: string): string {
  return [...text].map((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return (codePoint < 0x20 && codePoint !== 0x0a)
      || (codePoint >= 0x7f && codePoint <= 0x9f)
      ? ' '
      : character;
  }).join('');
}

function normalizeCheckerDeprecationReason(rawText: string): string {
  return normalizeCheckerMemberPlaintext(rawText).replace(/\s+/gu, ' ').trim();
}

/** Whether the projected member can be invoked through Aurelia's non-nullish runtime call lane. */
export function checkerTypeMemberIsCallable(
  member: CheckerTypeMember,
): boolean {
  const carrier = member.carrier;
  if (carrier?.valueType != null) {
    return checkerCallableContextSignatures(carrier.checker, carrier.valueType).length > 0;
  }
  return member.memberKind === CheckerTypeMemberKind.Method
    || member.memberKind === CheckerTypeMemberKind.CallSignature;
}

export function checkerDeclarationsVisibilityKind(
  declarations: readonly ts.Declaration[],
): CheckerTypeMemberVisibilityKind {
  if (declarations.length === 0) {
    return CheckerTypeMemberVisibilityKind.Unknown;
  }
  if (declarations.some((declaration) =>
    ts.isPropertyDeclaration(declaration)
    && ts.isPrivateIdentifier(declaration.name)
  )) {
    return CheckerTypeMemberVisibilityKind.Private;
  }
  const declarationModifiers = declarations.map((declaration) =>
    ts.canHaveModifiers(declaration) ? ts.getModifiers(declaration) ?? [] : []
  );
  if (declarationModifiers.some((modifiers) =>
    modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.PrivateKeyword)
  )) {
    return CheckerTypeMemberVisibilityKind.Private;
  }
  if (declarationModifiers.some((modifiers) =>
    modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ProtectedKeyword)
  )) {
    return CheckerTypeMemberVisibilityKind.Protected;
  }
  return CheckerTypeMemberVisibilityKind.Public;
}
