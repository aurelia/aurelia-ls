import ts from 'typescript';
import type { KernelStore } from '../kernel/store.js';
import { InquiryLocusKind } from '../inquiry/locus.js';
import type { TemplateCompletionCursorContext } from '../inquiry/template-completion.js';
import {
  ExpressionParseResultInspector,
  type ExpressionNamedCall,
} from '../expression/parse-result-inspection.js';
import type { SourceSpan } from '../expression/source-span.js';
import {
  checkerSignatureDeprecationReason,
  checkerSignatureDocumentation,
  checkerSignatureIsDeprecated,
  CHECKER_MEMBER_TEXT_MAX_SOURCES,
  type CheckerTypeMemberTextDraft,
} from '../type-system/checker-member-surface.js';
import type { TypeSystemProject } from '../type-system/project.js';
import type { TypeSystemOverlayDiagnostic } from '../type-system/diagnostics.js';
import { readTemplateExpressionParse } from '../template/expression-parse-product.js';
import {
  type TemplateTypeSystemOverlayEmission,
  type TemplateTypeSystemOverlayExpressionProbe,
} from '../template/template-type-system-overlay.js';
import type { SemanticTemplateCursorMemberTextRow } from './contracts.js';
import {
  describeAddress,
  sourceReferenceForParserSpan,
  sourceReferenceForProjectTsNode,
  sourceReferenceForUnqualifiedTypeScriptNode,
  type SemanticSourceReference,
} from './source-reference.js';

export const CHECKER_CALL_SIGNATURE_MAX_CODE_POINTS = 600;
export const CHECKER_CALL_OPEN_REASON_MAX_CODE_POINTS = 320;

export interface TemplateCallOverlayContext {
  readonly emission: TemplateTypeSystemOverlayEmission;
  readonly typeSystem: TypeSystemProject | null;
  /** Diagnostics retained with the shared overlay checker epoch; never recomputed by a cursor read. */
  readonly diagnostics: readonly TypeSystemOverlayDiagnostic[];
}

export interface TemplateSelectedCallSignatureProjection {
  readonly status: 'exact' | 'open';
  readonly callKind: 'scope' | 'member' | 'global' | 'function' | 'construct';
  readonly optionalChain: boolean;
  readonly presentationKind: 'method' | 'callable-value' | null;
  readonly signatureName: string;
  readonly signatureTail: string | null;
  readonly signatureIsTruncated: boolean;
  readonly candidateCount: number;
  readonly selectedCandidateIndex: number | null;
  readonly genericParameterCount: number | null;
  readonly signatureProvenance: 'declaration' | 'synthesized' | null;
  readonly source: SemanticSourceReference;
  readonly callSource: SemanticSourceReference;
  readonly declarationSource: SemanticSourceReference | null;
  readonly documentation: SemanticTemplateCursorMemberTextRow | null;
  readonly isDeprecated: boolean | null;
  readonly deprecationReason: SemanticTemplateCursorMemberTextRow | null;
  readonly openReason: string | null;
}

export function templateSelectedCallSignature(
  store: KernelStore,
  cursorContext: TemplateCompletionCursorContext,
  readOverlayContext: () => TemplateCallOverlayContext | null,
): TemplateSelectedCallSignatureProjection | null {
  const locus = cursorContext.query.locus;
  const parseHandle = cursorContext.query.expressionParseProductHandle;
  if (locus.kind !== InquiryLocusKind.SourceCursor || locus.cursor.offset == null || parseHandle == null) {
    return null;
  }
  const parse = readTemplateExpressionParse(store, parseHandle);
  if (parse == null || !ExpressionParseResultInspector.hasCanonicalAst(parse.result)) {
    return null;
  }
  const call = ExpressionParseResultInspector.namedCallAtOffset(parse.result, locus.cursor.offset);
  if (call == null) {
    return null;
  }
  const expressionSource = parse.sourceAddressHandle == null
    ? null
    : describeAddress(store, parse.sourceAddressHandle);
  const source = sourceReferenceForParserSpan(
    expressionSource?.path ?? locus.cursor.filePath,
    call.name.span,
    'active-template-token',
  );
  const callSource = sourceReferenceForParserSpan(
    expressionSource?.path ?? locus.cursor.filePath,
    call.span,
    'template-expression',
  );
  const open = (
    openReason: string,
    candidateCount = 0,
  ): TemplateSelectedCallSignatureProjection => ({
    status: 'open',
    callKind: call.callKind,
    optionalChain: call.optionalChain,
    presentationKind: null,
    signatureName: call.name.name,
    signatureTail: null,
    signatureIsTruncated: false,
    candidateCount,
    selectedCandidateIndex: null,
    genericParameterCount: null,
    signatureProvenance: null,
    source,
    callSource,
    declarationSource: null,
    documentation: null,
    isDeprecated: null,
    deprecationReason: null,
    openReason: boundedOpenReason(openReason),
  });

  if (call.callKind === 'global') {
    return open(
      'Global call receiver semantics are not an authenticated template member call.',
    );
  }
  if (call.callKind === 'function') {
    return open(
      'Detached or returned-function receiver semantics are not authenticated for selected signatures yet.',
    );
  }
  if (call.callKind === 'construct') {
    return open(
      'Construct-signature selection is not authenticated for template hovers yet.',
    );
  }
  if (
    call.callKind === 'scope'
    && (
      cursorContext.selectedScopeSlot == null
      || cursorContext.selectedScopeSlot.scopeRole != null
      || cursorContext.selectedScopeSlot.slot.name !== call.name.name
    )
  ) {
    return open('CallScope did not resolve one ordinary exact named scope slot at the cursor.');
  }

  const overlayContext = readOverlayContext();
  if (overlayContext == null) {
    return open('No current template overlay context was available for call selection.');
  }
  const overlay = overlayContext.emission;
  if (overlay.overlaySource == null) {
    return open('No TypeScript overlay was available for the selected call expression.');
  }
  const probes = exactCallProbes(overlay.expressionProbes, parse.productHandle, call.name.span);
  if (probes.length === 0) {
    return open('No exact overlay expression probe owned the selected call occurrence.');
  }
  const overlayTypeSystem = overlayContext.typeSystem;
  if (overlayTypeSystem == null) {
    return open('The selected call overlay could not enter one current checker program.');
  }
  const sourceFile = overlayTypeSystem.readProgramSourceFileByHostPath(overlay.overlaySource.fileName);
  if (sourceFile == null) {
    return open('The current checker program did not retain the selected overlay source file.');
  }
  const projections = probes.flatMap((probe) => {
    const initializer = variableInitializer(sourceFile, probe.localName);
    const overlayCall = initializer == null
      ? null
      : exactOverlayCall(overlay.overlaySource!, sourceFile, initializer, call);
    return overlayCall == null
      ? []
      : [selectedSignatureForOverlayCall(
          overlayTypeSystem,
          sourceFile,
          overlayCall,
          call,
          source,
          callSource,
          overlayContext.diagnostics,
          open,
        )];
  });
  if (projections.length !== probes.length || projections.length === 0) {
    return open('Exact overlay source segments did not conserve every selected call probe.');
  }
  const first = projections[0]!;
  return projections.every((projection) => sameCallProjection(first, projection))
    ? first
    : open(`${projections.length} overlay call probes did not converge on one signature.`);
}

function selectedSignatureForOverlayCall(
  typeSystem: TypeSystemProject,
  sourceFile: ts.SourceFile,
  call: ts.CallExpression,
  authoredCall: ExpressionNamedCall,
  source: SemanticSourceReference,
  callSource: SemanticSourceReference,
  diagnostics: readonly TypeSystemOverlayDiagnostic[],
  open: (reason: string, candidateCount?: number) => TemplateSelectedCallSignatureProjection,
): TemplateSelectedCallSignatureProjection {
  const programCall = typeSystem.readProgramExpression(call);
  if (programCall == null || !ts.isCallExpression(programCall)) {
    return open('The selected overlay call did not enter the current checker program.');
  }
  const bareCallScope = authoredCall.callKind === 'scope'
    && !ts.isPropertyAccessExpression(programCall.expression);
  const checker = typeSystem.checker;
  const rawCalleeType = typeSystem.readProgramTypeAtLocation(programCall.expression);
  if (rawCalleeType == null) {
    return open('The selected overlay callee did not enter the current checker program.');
  }
  const calleeType = checker.getNonNullableType(rawCalleeType);
  const signatures = checker.getSignaturesOfType(calleeType, ts.SignatureKind.Call);
  if (signatures.length === 0) {
    return open('The selected overlay callee has no checker call signatures.');
  }
  const resolvedCandidates: ts.Signature[] = [];
  const resolved = typeSystem.readProgramResolvedSignature(programCall, resolvedCandidates);
  const candidates = resolvedCandidates.length > 0 ? resolvedCandidates : signatures;
  const candidateCount = candidates.length;
  if (candidateCount > 1) {
    for (const argument of programCall.arguments) {
      const type = typeSystem.readProgramTypeAtLocation(argument);
      if (type == null) {
        return open('A selected call argument did not enter the current checker program.', candidateCount);
      }
      if ((type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) !== 0) {
        return open('Weak any/unknown call arguments cannot authenticate one overload.', candidateCount);
      }
    }
  }
  const callStart = programCall.getStart(sourceFile);
  const callEnd = programCall.getEnd();
  const diagnostic = diagnostics.find((candidate) =>
    candidate.diagnostic.phase === 'semantic'
    && candidate.diagnostic.category === 'error'
    && candidate.diagnostic.source != null
    && candidate.diagnostic.source.fileName === sourceFile.fileName
    && checkerCallDiagnosticBlocksSelection(candidate.diagnostic.code)
    && candidate.diagnostic.source.start < callEnd
    && Math.max(candidate.diagnostic.source.end, candidate.diagnostic.source.start + 1) > callStart
  ) ?? null;
  if (diagnostic != null) {
    return open(`TypeScript diagnostic TS${diagnostic.diagnostic.code} prevents exact call-signature selection.`, candidateCount);
  }
  if (resolved == null) {
    return open('TypeScript did not resolve one call signature.', candidateCount);
  }
  const signatureProvenance = callableUnionConstituentCount(rawCalleeType) > 1
    ? 'synthesized'
    : 'declaration';
  const declaration = resolved.getDeclaration() ?? null;
  if (signatureProvenance === 'declaration' && declaration == null) {
    return open('TypeScript did not resolve one declaration-backed call signature.', candidateCount);
  }
  if (bareCallScope && resolved.thisParameter != null) {
    return open(
      'Lexical CallScope overlay selection cannot authenticate an explicit TypeScript this-parameter receiver.',
      candidateCount,
    );
  }
  const selectedCandidateIndex = candidates.findIndex((signature) =>
    signature === resolved
    || (
      signatureProvenance === 'declaration'
      && declaration != null
      && signature.getDeclaration() === declaration
    )
  );
  if (candidateCount > 1 && selectedCandidateIndex < 0) {
    return open('The resolved signature did not identify one member of the checker candidate family.', candidateCount);
  }
  const selectedBasis = candidates[selectedCandidateIndex < 0 ? 0 : selectedCandidateIndex] ?? null;
  const presentationKind = signaturePresentationKind(typeSystem, programCall, declaration);
  const formatFlags = ts.TypeFormatFlags.NoTruncation
    | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope
    | ts.TypeFormatFlags.WriteTypeArgumentsOfSignature
    | (presentationKind === 'callable-value' ? ts.TypeFormatFlags.WriteArrowStyleSignature : 0);
  const rawSignatureTail = checker.signatureToString(
    resolved,
    programCall,
    formatFlags,
    ts.SignatureKind.Call,
  );
  const signatureTail = boundedSignatureTail(rawSignatureTail);
  if (signatureTail == null || (!rawSignatureTail.startsWith('(') && !rawSignatureTail.startsWith('<'))) {
    return open('The instantiated checker signature violated the compact call-tail contract.', candidateCount);
  }
  const documentation = signatureProvenance === 'declaration' && declaration != null
    ? checkerSignatureDocumentation(checker, resolved, declaration)
    : null;
  const deprecated = signatureProvenance === 'declaration' && declaration != null
    ? checkerSignatureIsDeprecated(resolved)
    : null;
  return {
    status: 'exact',
    callKind: authoredCall.callKind,
    optionalChain: authoredCall.optionalChain,
    presentationKind,
    signatureName: authoredCall.name.name,
    signatureTail: signatureTail.text,
    signatureIsTruncated: signatureTail.isTruncated,
    candidateCount,
    selectedCandidateIndex: selectedCandidateIndex < 0 ? 0 : selectedCandidateIndex,
    genericParameterCount: signatureProvenance === 'declaration'
      ? declaration?.typeParameters?.length ?? selectedBasis?.typeParameters?.length ?? 0
      : resolved.typeParameters?.length ?? selectedBasis?.typeParameters?.length ?? 0,
    signatureProvenance,
    source,
    callSource,
    declarationSource: signatureProvenance === 'declaration' && declaration != null
      ? sourceReferenceForProjectTsNode(typeSystem.project, declarationNameNode(declaration) ?? declaration)
      : null,
    documentation: memberTextRow(documentation),
    isDeprecated: deprecated,
    deprecationReason: deprecated === true
      && declaration != null
      ? memberTextRow(checkerSignatureDeprecationReason(resolved, declaration))
      : null,
    openReason: null,
  };
}

/** Aurelia can invoke TypeScript keyword-private/protected members; only runtime-inaccessible or call-invalid rows block. */
export function checkerCallDiagnosticBlocksSelection(code: number): boolean {
  switch (code) {
    case 2341:
    case 2445:
    case 2446:
    case 4105:
      return false;
    default:
      return true;
  }
}

interface BoundedSignatureTail {
  readonly text: string;
  readonly isTruncated: boolean;
}

function boundedSignatureTail(raw: string): BoundedSignatureTail | null {
  const normalized = raw.normalize('NFC');
  if (!isCheckerCallTextSafe(normalized)) {
    return null;
  }
  const codePoints = [...normalized];
  return codePoints.length <= CHECKER_CALL_SIGNATURE_MAX_CODE_POINTS
    ? { text: normalized, isTruncated: false }
    : {
        text: codePoints.slice(0, CHECKER_CALL_SIGNATURE_MAX_CODE_POINTS).join('').trimEnd(),
        isTruncated: true,
      };
}

function boundedOpenReason(raw: string): string {
  const normalized = raw.normalize('NFC');
  if (!isCheckerCallTextSafe(normalized)) {
    return 'Call-signature selection remained open.';
  }
  const codePoints = [...normalized];
  return codePoints.length <= CHECKER_CALL_OPEN_REASON_MAX_CODE_POINTS
    ? normalized
    : `${codePoints.slice(0, CHECKER_CALL_OPEN_REASON_MAX_CODE_POINTS - 1).join('').trimEnd()}…`;
}

/** Shared transport invariant for normalized checker call text carried into IDE/MCP presentation. */
export function isCheckerCallTextSafe(value: string): boolean {
  return value.length > 0
    && value === value.normalize('NFC')
    && value === value.trim()
    && ![...value].some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint < 0x20
        || (codePoint >= 0x7f && codePoint <= 0x9f)
        || codePoint === 0x061c
        || codePoint === 0x200e
        || codePoint === 0x200f
        || codePoint === 0x2028
        || codePoint === 0x2029
        || (codePoint >= 0x202a && codePoint <= 0x202e)
        || (codePoint >= 0x2066 && codePoint <= 0x2069)
        || codePoint === 0xfeff;
    });
}

function signaturePresentationKind(
  typeSystem: TypeSystemProject,
  call: ts.CallExpression,
  declaration: ts.SignatureDeclaration | null,
): 'method' | 'callable-value' {
  const name = tsCallNameNode(call);
  const declarations = name == null
    ? []
    : typeSystem.readProgramSymbolAtLocation(name)?.getDeclarations() ?? [];
  return (
    declarations.length > 0
    && declarations.every((candidate) => ts.isMethodDeclaration(candidate) || ts.isMethodSignature(candidate))
  ) || (declaration != null && (ts.isMethodDeclaration(declaration) || ts.isMethodSignature(declaration)))
    ? 'method'
    : 'callable-value';
}

function callableUnionConstituentCount(type: ts.Type): number {
  return type.isUnion()
    ? type.types.filter((constituent) =>
        (constituent.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined)) === 0
        && constituent.getCallSignatures().length > 0
      ).length
    : 1;
}

function exactCallProbes(
  probes: readonly TemplateTypeSystemOverlayExpressionProbe[],
  expressionProductHandle: string,
  callNameSpan: SourceSpan,
): readonly TemplateTypeSystemOverlayExpressionProbe[] {
  return probes.filter((probe) =>
    probe.semanticProductHandle === expressionProductHandle
    && probe.sourceStart != null
    && probe.sourceEnd != null
    && probe.sourceStart <= callNameSpan.start
    && callNameSpan.end <= probe.sourceEnd
  );
}

function exactOverlayCall(
  overlay: NonNullable<TemplateTypeSystemOverlayEmission['overlaySource']>,
  sourceFile: ts.SourceFile,
  initializer: ts.Expression,
  authoredCall: ExpressionNamedCall,
): ts.CallExpression | null {
  const initializerStart = initializer.getStart(sourceFile);
  const initializerEnd = initializer.getEnd();
  const containingSegments = overlay.segments.filter((segment) =>
    segment.sourceStart != null
    && segment.sourceEnd != null
    && segment.sourceStart <= authoredCall.name.span.start
    && authoredCall.name.span.end <= segment.sourceEnd
    && segment.generatedEnd - segment.generatedStart === segment.sourceEnd - segment.sourceStart
    && initializerStart <= segment.generatedStart
    && segment.generatedEnd <= initializerEnd
  );
  const exactNameSegments = containingSegments.filter((segment) =>
    segment.sourceStart === authoredCall.name.span.start
    && segment.sourceEnd === authoredCall.name.span.end
  );
  const segments = exactNameSegments.length > 0 ? exactNameSegments : containingSegments;
  const mappedRanges = [...new Map(segments.map((segment) => {
    const generatedStart = segment.generatedStart
      + authoredCall.name.span.start
      - segment.sourceStart!;
    const generatedEnd = generatedStart + authoredCall.name.span.end - authoredCall.name.span.start;
    return [`${generatedStart}:${generatedEnd}`, { generatedStart, generatedEnd }] as const;
  })).values()];
  if (mappedRanges.length !== 1) {
    return null;
  }
  const mapped = mappedRanges[0]!;
  const calls = namedTsCalls(initializer).filter((call) => {
    const name = tsCallNameNode(call);
    return name != null
      && name.getStart(sourceFile) === mapped.generatedStart
      && name.getEnd() === mapped.generatedEnd
      && tsCallName(call) === authoredCall.name.name
      && call.arguments.length === authoredCall.args.length;
  });
  return calls.length === 1 ? calls[0]! : null;
}

function variableInitializer(
  sourceFile: ts.SourceFile,
  localName: string,
): ts.Expression | null {
  let result: ts.Expression | null = null;
  const visit = (node: ts.Node): void => {
    if (
      result == null
      && ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.name.text === localName
    ) {
      result = node.initializer ?? null;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return result;
}

function namedTsCalls(root: ts.Node): readonly ts.CallExpression[] {
  const calls: ts.CallExpression[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && tsCallName(node) != null) {
      calls.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return calls.sort((left, right) => left.getStart() - right.getStart());
}

function tsCallName(call: ts.CallExpression): string | null {
  const node = tsCallNameNode(call);
  return node == null ? null : node.text;
}

function tsCallNameNode(call: ts.CallExpression): ts.Identifier | null {
  const expression = call.expression;
  return ts.isIdentifier(expression)
    ? expression
    : ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.name)
      ? expression.name
      : null;
}

function sameCallProjection(
  left: TemplateSelectedCallSignatureProjection,
  right: TemplateSelectedCallSignatureProjection,
): boolean {
  return left.callKind === right.callKind
    && left.status === right.status
    && left.optionalChain === right.optionalChain
    && left.presentationKind === right.presentationKind
    && left.signatureName === right.signatureName
    && left.signatureTail === right.signatureTail
    && left.signatureIsTruncated === right.signatureIsTruncated
    && left.candidateCount === right.candidateCount
    && left.selectedCandidateIndex === right.selectedCandidateIndex
    && left.genericParameterCount === right.genericParameterCount
    && left.signatureProvenance === right.signatureProvenance
    && left.isDeprecated === right.isDeprecated
    && left.openReason === right.openReason
    && sameSource(left.source, right.source)
    && sameSource(left.callSource, right.callSource)
    && sameSource(left.declarationSource, right.declarationSource)
    && sameMemberText(left.documentation, right.documentation)
    && sameMemberText(left.deprecationReason, right.deprecationReason);
}

function sameMemberText(
  left: SemanticTemplateCursorMemberTextRow | null,
  right: SemanticTemplateCursorMemberTextRow | null,
): boolean {
  return left == null || right == null
    ? left === right
    : left.format === right.format
      && left.text === right.text
      && left.isTruncated === right.isTruncated
      && left.sourceCount === right.sourceCount
      && left.sources.length === right.sources.length
      && left.sources.every((source, index) => sameSource(source, right.sources[index] ?? null));
}

function sameSource(
  left: SemanticSourceReference | null,
  right: SemanticSourceReference | null,
): boolean {
  return left == null || right == null
    ? left === right
    : left.path === right.path && left.start === right.start && left.end === right.end;
}

function declarationNameNode(declaration: ts.SignatureDeclaration): ts.Node | null {
  return 'name' in declaration && declaration.name != null ? declaration.name : null;
}

function memberTextRow(
  text: CheckerTypeMemberTextDraft | null,
): SemanticTemplateCursorMemberTextRow | null {
  return text == null
    ? null
    : {
        format: 'plaintext',
        text: text.text,
        isTruncated: text.isTruncated,
        sourceCount: text.sourceCount,
        sources: text.sourceNodes.slice(0, CHECKER_MEMBER_TEXT_MAX_SOURCES)
          .map(sourceReferenceForUnqualifiedTypeScriptNode),
      };
}
