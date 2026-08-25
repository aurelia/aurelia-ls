import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test, vi } from 'vitest';
import {
  createSemanticRuntime,
  isCheckerCallTextSafe,
  NodeSemanticRuntimeProjectInputHost,
  SemanticAppQueryKind,
  SemanticRuntimeProjectInputAuthority,
  SemanticRuntimeProjectInputChange,
  SemanticRuntimeProjectInputChangeKind,
  type SemanticTemplateCursorInfoResult,
  type SemanticTemplateDiagnosticsResult,
} from '../src/index.js';
import type { SemanticSourceReference } from '../src/api/source-reference.js';
import { checkerCallDiagnosticBlocksSelection } from '../src/api/template-call-signature.js';
import { TypeSystemProjectBuilder } from '../src/type-system/project.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('hover selected call signatures', () => {
  test('selects exact overload, generic, receiver, and deferred call carriers from the current checker epoch', async () => {
    expect(isCheckerCallTextSafe(`(value: "line${String.fromCodePoint(0x2028)}separator"): string`)).toBe(false);
    expect(isCheckerCallTextSafe(`(value: "paragraph${String.fromCodePoint(0x2029)}separator"): string`)).toBe(false);
    expect(isCheckerCallTextSafe('(value: string): string')).toBe(true);
    for (const code of [2341, 2445, 2446, 4105]) {
      expect(checkerCallDiagnosticBlocksSelection(code)).toBe(false);
    }
    expect(checkerCallDiagnosticBlocksSelection(18013)).toBe(true);
    expect(checkerCallDiagnosticBlocksSelection(2684)).toBe(true);
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-completion-member-metadata');
    const templatePath = path.join(fixtureRoot, 'src/app.html');
    const scriptPath = path.join(fixtureRoot, 'src/app.ts');
    let templateText = callSignatureTemplate();
    let scriptText = callSignatureScript('string', 'String overload documentation.');
    const overlay = new MutableSourceOverlay();
    overlay.write(templatePath, templateText);
    overlay.write(scriptPath, scriptText);
    const authority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(overlay),
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'hover-call-signature',
      projectInputAuthority: authority,
    });
    let app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const info = (marker: string, token: string): SemanticTemplateCursorInfoResult => app.ask({
      kind: SemanticAppQueryKind.TemplateCursorInfo,
      cursor: cursorAtMarker(templateText, marker, token),
    }).value as SemanticTemplateCursorInfoResult;

    const projectBuild = vi.spyOn(TypeSystemProjectBuilder.prototype, 'build');
    const textOverload = info("tools.overloaded('text')", 'overloaded');
    expect(projectBuild).toHaveBeenCalledTimes(1);
    expect(textOverload.selectedMember).toMatchObject({
      name: 'overloaded',
      memberKind: 'method',
      documentation: null,
    });
    expect(textOverload.selectedCall).toMatchObject({
      status: 'exact',
      callKind: 'member',
      optionalChain: false,
      presentationKind: 'method',
      signatureName: 'overloaded',
      signatureTail: '(value: string): string',
      signatureIsTruncated: false,
      candidateCount: 2,
      selectedCandidateIndex: 0,
      genericParameterCount: 0,
      signatureProvenance: 'declaration',
      documentation: { text: 'String overload documentation.' },
      isDeprecated: true,
      deprecationReason: { text: 'Use textValue.' },
      openReason: null,
    });
    expect(sourceTextAt(templateText, textOverload.selectedCall?.source ?? null)).toBe('overloaded');
    expect(sourceTextAt(templateText, textOverload.selectedCall?.callSource ?? null)).toBe("tools.overloaded('text')");
    expect(sourceTextAt(scriptText, textOverload.selectedCall?.declarationSource ?? null)).toBe('overloaded');
    expect(sourceTextAt(scriptText, textOverload.selectedCall?.documentation?.sources[0] ?? null)).toContain(
      'String overload documentation.',
    );
    expect(sourceTextAt(scriptText, textOverload.selectedCall?.deprecationReason?.sources[0] ?? null)).toContain(
      '@deprecated Use textValue.',
    );
    expect(textOverload.displayText).toContain('Selected call: overloaded(value: string): string; candidate=1/2.');

    const numberOverload = info('tools.overloaded(1)', 'overloaded');
    expect(projectBuild).toHaveBeenCalledTimes(1);
    projectBuild.mockRestore();
    expect(numberOverload.selectedCall).toMatchObject({
      signatureTail: '(value: number): number',
      candidateCount: 2,
      selectedCandidateIndex: 1,
      documentation: { text: 'Number overload documentation.' },
      isDeprecated: false,
      deprecationReason: null,
      openReason: null,
    });

    const identity = info('tools.identity(title)', 'identity');
    expect(identity.selectedCall).toMatchObject({
      signatureName: 'identity',
      signatureTail: '<string>(value: string): string',
      candidateCount: 1,
      selectedCandidateIndex: 0,
      genericParameterCount: 1,
      openReason: null,
    });

    const wrapped = info('tools.wrap(title)', 'wrap');
    expect(wrapped.selectedCall).toMatchObject({
      signatureName: 'wrap',
      signatureTail: '<string>(value: string): Box<string>',
      genericParameterCount: 1,
      openReason: null,
    });

    expect(info('tools.callableProperty(1)', 'callableProperty').selectedCall).toMatchObject({
      signatureName: 'callableProperty',
      presentationKind: 'callable-value',
      signatureTail: '<1>(value: 1) => 1',
      genericParameterCount: 1,
      openReason: null,
    });
    expect(info("tools.callableAccessor('x')", 'callableAccessor').selectedCall).toMatchObject({
      signatureName: 'callableAccessor',
      presentationKind: 'callable-value',
      signatureTail: '<"x">(value: "x") => "x"',
      genericParameterCount: 1,
      openReason: null,
    });

    const valueOnly = info('${tools.overloaded}', 'overloaded');
    expect(valueOnly.selectedCall).toBeNull();
    expect(valueOnly.selectedMember).toMatchObject({ name: 'overloaded' });

    const weak = info('tools.overloaded(weak)', 'overloaded');
    expect(weak.selectedCall).toMatchObject({
      signatureTail: null,
      status: 'open',
      candidateCount: 2,
      selectedCandidateIndex: null,
      declarationSource: null,
      documentation: null,
      isDeprecated: null,
      openReason: expect.stringContaining('Weak any/unknown'),
    });
    expect(weak.missingInputs).toContain('selected-call-signature:open');
    expect(weak.selectedMember).toMatchObject({ name: 'overloaded' });

    const invalid = info('tools.overloaded(true)', 'overloaded');
    expect(invalid.selectedCall).toMatchObject({
      signatureTail: null,
      candidateCount: 2,
      openReason: expect.stringMatching(/TS\d+/u),
    });

    const unqualified = info('rootMethod(title)', 'rootMethod');
    expect(unqualified.selectedCall).toMatchObject({
      callKind: 'scope',
      signatureTail: '(value: string): string',
      openReason: null,
    });
    expect(info('rootWithThis(title)', 'rootWithThis').selectedCall).toMatchObject({
      signatureTail: '(this: ViewModel, value: string): string',
      openReason: null,
    });
    expect(info('items.map(value => rootMethod(value))', 'rootMethod').selectedCall).toMatchObject({
      status: 'exact',
      callKind: 'scope',
      signatureTail: '(value: string): string',
      openReason: null,
    });

    expect(info('tools.identity?.(title)', 'identity').selectedCall).toMatchObject({
      status: 'exact',
      optionalChain: true,
      signatureTail: '<string>(value: string): string',
    });
    expect(info('tools.optionalCallable?.(title)', 'optionalCallable').selectedCall).toMatchObject({
      status: 'exact',
      callKind: 'member',
      optionalChain: true,
      presentationKind: 'callable-value',
      signatureTail: '(value: string) => string | undefined',
      signatureProvenance: 'declaration',
      documentation: { text: 'Optional callable signature documentation.' },
      isDeprecated: true,
      deprecationReason: { text: 'Use identity.' },
    });

    const synthesizedUnion = info('tools.unionCallable(title)', 'unionCallable').selectedCall;
    expect(synthesizedUnion).toMatchObject({
      status: 'exact',
      presentationKind: 'callable-value',
      signatureProvenance: 'synthesized',
      genericParameterCount: 0,
      declarationSource: null,
      documentation: null,
      isDeprecated: null,
      deprecationReason: null,
    });
    expect(synthesizedUnion?.signatureTail).toContain('string | number');
    expect(info('tools.unionStringOnly(title)', 'unionStringOnly').selectedCall).toMatchObject({
      status: 'exact',
      signatureProvenance: 'declaration',
      documentation: { text: 'Must never leak from a synthesized union.' },
      isDeprecated: true,
      deprecationReason: { text: 'Do not surface.' },
    });
    expect(info('tools.intersectionCallable(title)', 'intersectionCallable').selectedCall).toMatchObject({
      status: 'exact',
      presentationKind: 'callable-value',
      signatureProvenance: 'declaration',
      documentation: { text: 'Intersection string signature documentation.' },
    });

    expect(info('tools.identity()', 'identity').selectedCall).toMatchObject({
      status: 'open',
      openReason: expect.stringContaining('TS2554'),
    });
    expect(info('tools.requiresWrongThis(title)', 'requiresWrongThis').selectedCall).toMatchObject({
      status: 'open',
      openReason: expect.stringContaining('TS2684'),
    });
    const privateCall = info('tools.privateOverload(title)', 'privateOverload');
    expect(privateCall.selectedMember).toMatchObject({
      name: 'privateOverload',
      memberKind: 'method',
      visibilityKind: 'private',
    });
    expect(privateCall.selectedCall).toMatchObject({
      status: 'exact',
      signatureTail: '(value: string): string',
      candidateCount: 2,
      selectedCandidateIndex: 0,
    });
    const protectedCall = info('tools.protectedOverload(1)', 'protectedOverload');
    expect(protectedCall.selectedMember).toMatchObject({
      name: 'protectedOverload',
      memberKind: 'method',
      visibilityKind: 'protected',
    });
    expect(protectedCall.selectedCall).toMatchObject({
      status: 'exact',
      signatureTail: '(value: number): number',
      candidateCount: 2,
      selectedCandidateIndex: 1,
    });
    expect(info('tools.literalSpacing(spaced)', 'literalSpacing').selectedCall).toMatchObject({
      status: 'exact',
      signatureTail: '(value: "a  b"): "a  b"',
    });

    const explicitThisInfo = info('$this.rootWithThis(title)', 'rootWithThis');
    const explicitThis = explicitThisInfo.selectedCall;
    expect(explicitThis).toMatchObject({
      status: 'open',
      callKind: 'scope',
      openReason: expect.stringContaining('ordinary exact named scope slot'),
    });
    expect(explicitThisInfo.selectedMember).toMatchObject({
      name: 'rootWithThis',
      memberKind: 'property',
      scopeRole: 'let-local',
    });
    expect(info('$this.rootParentWithThis(title)', 'rootParentWithThis').selectedCall).toMatchObject({
      status: 'exact',
      callKind: 'scope',
      signatureTail: '(this: ViewModel, value: string): string',
    });
    expect(info('<section>${rootWithThis(title)}</section>', 'rootWithThis').selectedCall).toMatchObject({
      status: 'open',
      openReason: expect.stringContaining('ordinary exact named scope slot'),
    });
    expect(info('items.map(value => $this.rootMethod(value))', 'rootMethod').selectedCall).toMatchObject({
      status: 'exact',
      callKind: 'scope',
      openReason: null,
    });
    expect(info('rootMethod(localTitle)', 'rootMethod').selectedCall).toMatchObject({
      status: 'exact',
      callKind: 'scope',
    });
    expect(info('localCall(title)', 'localCall').selectedCall).toMatchObject({
      status: 'open',
      openReason: expect.stringContaining('ordinary exact named scope slot'),
    });
    expect(info('identity($parent.title)', 'identity').selectedCall).toMatchObject({
      status: 'exact',
      callKind: 'scope',
    });
    expect(info('$parent.rootMethod($parent.title)', 'rootMethod').selectedCall).toMatchObject({
      status: 'exact',
      callKind: 'scope',
    });
    expect(info('rootMethod($parent.title)', 'rootMethod').selectedCall).toMatchObject({
      status: 'exact',
      callKind: 'scope',
    });
    expect(info('rootWithThis($parent.title)', 'rootWithThis').selectedCall).toMatchObject({
      status: 'open',
      callKind: 'scope',
      openReason: expect.stringContaining('ordinary exact named scope slot'),
    });
    expect(info('rootParentWithThis($parent.title)', 'rootParentWithThis').selectedCall).toMatchObject({
      status: 'exact',
      callKind: 'scope',
      signatureTail: '(this: ViewModel, value: string): string',
      openReason: null,
    });
    expect(info('<span>${rootMethod(item)}</span>', 'rootMethod').selectedCall).toMatchObject({
      status: 'exact',
      callKind: 'scope',
      signatureTail: '(value: string): string',
    });
    const broadWith = info('<strong>${rootMethod($parent.title)}</strong>', 'rootMethod');
    expect(broadWith.selectedCall).toMatchObject({
      status: 'open',
      signatureTail: null,
      openReason: expect.stringContaining('ordinary exact named scope slot'),
    });
    expect(broadWith.selectedMemberName).toBeNull();
    expect(broadWith.selectedMember).toBeNull();
    expect(broadWith.memberOwnerType).toBeNull();
    expect(broadWith.missingInputs).toContain('scope-named-lookup:open');
    const broadCallStart = templateText.indexOf('rootMethod($parent.title)', templateText.indexOf('<strong>'));
    const broadCallEnd = broadCallStart + 'rootMethod'.length;
    const broadDiagnostics = app.ask({
      kind: SemanticAppQueryKind.TemplateDiagnostics,
      sourceFile: { filePath: 'src/app.html' },
    }).value as SemanticTemplateDiagnosticsResult;
    expect(broadDiagnostics.rows.some((row) =>
      (row.typeScriptDiagnosticCode === 18046 || row.typeScriptDiagnosticCode === 2339)
      && row.source?.start != null
      && row.source.end != null
      && row.source.start < broadCallEnd
      && row.source.end > broadCallStart
    )).toBe(false);
    const nestedRuntimeSlot = info('nestedCall($parent.title)', 'nestedCall');
    expect(nestedRuntimeSlot.selectedMember).toMatchObject({
      name: 'nestedCall',
      scopeRole: 'let-local',
    });
    const nestedCallStart = templateText.indexOf('nestedCall($parent.title)');
    const nestedCallEnd = nestedCallStart + 'nestedCall'.length;
    expect(broadDiagnostics.rows.some((row) =>
      row.typeScriptDiagnosticCode === 2339
      && row.source?.start != null
      && row.source.end != null
      && row.source.start < nestedCallEnd
      && row.source.end > nestedCallStart
    )).toBe(false);
    expect(info('$parent.rootMethod(item)', 'rootMethod').selectedCall).toMatchObject({
      status: 'exact',
      callKind: 'scope',
    });

    expect(info('tools.factory()(title)', 'factory').selectedCall).toMatchObject({
      status: 'exact',
      callKind: 'member',
      signatureTail: '(): (value: string) => string',
    });
    const detached = info('(tools.detached)(title)', 'detached').selectedCall;
    expect(detached).toMatchObject({
      status: 'open',
      callKind: 'function',
      signatureName: 'detached',
      openReason: expect.stringContaining('Detached or returned-function'),
    });
    expect(info('(tools.detached)(title)', 'detached').selectedMember).toMatchObject({ name: 'detached' });
    expect(sourceTextAt(templateText, detached?.callSource ?? null)).toBe('(tools.detached)(title)');
    expect(info('new tools.Constructor(title)', 'Constructor').selectedCall).toMatchObject({
      status: 'open',
      callKind: 'construct',
      openReason: expect.stringContaining('Construct-signature'),
    });
    expect(info('parseInt(title)', 'parseInt').selectedCall).toMatchObject({
      status: 'open',
      callKind: 'global',
    });
    for (const marker of [
      '<aside>${$parent.rootMethod(title)}</aside>',
      '<aside>${$parent.$parent.rootMethod(title)}</aside>',
    ]) {
      const missingAncestor = info(marker, 'rootMethod');
      expect(missingAncestor.selectedCall).toMatchObject({
        status: 'open',
        callKind: 'scope',
      });
      expect(missingAncestor.selectedMemberName).toBeNull();
      expect(missingAncestor.selectedMember).toBeNull();
      expect(missingAncestor.memberOwnerType).toBeNull();
      expect(missingAncestor.missingInputs).toContain('scope-named-lookup:missing-ancestor');
    }

    const longSignature = info(longSignatureCall(), 'longSignature').selectedCall;
    expect(longSignature).toMatchObject({
      status: 'exact',
      signatureIsTruncated: true,
    });
    expect([...(longSignature?.signatureTail ?? '')]).toHaveLength(600);
    expect(info(longSignatureCall(), 'longSignature').displayText).toContain('…; candidate=');

    const nestedOuter = info('tools.identity(tools.overloaded(1))', 'identity');
    const nestedInner = info('tools.identity(tools.overloaded(1))', 'overloaded');
    expect(nestedOuter.selectedCall).toMatchObject({
      signatureTail: '<number>(value: number): number',
      openReason: null,
    });
    expect(nestedInner.selectedCall).toMatchObject({
      signatureTail: '(value: number): number',
      selectedCandidateIndex: 1,
      openReason: null,
    });

    const projectKey = app.project.projectKey;
    templateText = templateText.replace("tools.overloaded('text')", 'tools.overloaded(2)');
    overlay.write(templatePath, templateText);
    authority.advance([new SemanticRuntimeProjectInputChange(
      SemanticRuntimeProjectInputChangeKind.FileValue,
      templatePath,
    )]);
    app = await runtime.openApp({ projectKey, analysisDepth: 'binding-observation' });
    expect(info('tools.overloaded(2)', 'overloaded').selectedCall).toMatchObject({
      signatureTail: '(value: number): number',
      selectedCandidateIndex: 1,
    });

    scriptText = callSignatureScript("'edited'", 'Edited overload documentation.');
    overlay.write(scriptPath, scriptText);
    authority.advance([new SemanticRuntimeProjectInputChange(
      SemanticRuntimeProjectInputChangeKind.FileValue,
      scriptPath,
    )]);
    app = await runtime.openApp({ projectKey, analysisDepth: 'binding-observation' });
    templateText = templateText.replace('tools.overloaded(2)', "tools.overloaded('edited')");
    overlay.write(templatePath, templateText);
    authority.advance([new SemanticRuntimeProjectInputChange(
      SemanticRuntimeProjectInputChangeKind.FileValue,
      templatePath,
    )]);
    app = await runtime.openApp({ projectKey, analysisDepth: 'binding-observation' });
    const edited = info("tools.overloaded('edited')", 'overloaded').selectedCall;
    expect(edited).toMatchObject({
      signatureTail: '(value: string): "edited"',
      selectedCandidateIndex: 0,
      documentation: { text: 'Edited overload documentation.' },
    });
  }, 120_000);

  test('keeps baseline repeat CallScope fallback on the owning view-model receiver without TS2339', async () => {
    const fixtureRoot = path.resolve(packageRoot, '../../fixtures/hello-world');
    const templatePath = path.join(fixtureRoot, 'src/my-app.html');
    const templateText = readFileSync(templatePath, 'utf8');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'hover-call-signature-repeat-fallback',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const info = app.ask({
      kind: SemanticAppQueryKind.TemplateCursorInfo,
      cursor: cursorAtMarker(
        templateText,
        'click.trigger="selectItem(item)"',
        'selectItem',
        'src/my-app.html',
      ),
    }).value as SemanticTemplateCursorInfoResult;

    expect(info.selectedMember).toMatchObject({
      name: 'selectItem',
      memberKind: 'method',
      scopeRole: null,
    });
    expect(info.selectedCall).toMatchObject({
      status: 'exact',
      callKind: 'scope',
      presentationKind: 'method',
      signatureName: 'selectItem',
      signatureTail: '(item: CatalogItem): void',
      openReason: null,
    });

    const answer = await runtime.answerAppQuery({
      kind: SemanticAppQueryKind.TemplateDiagnostics,
      sourceFilePath: templatePath,
      sourceFile: { filePath: templatePath },
      analysisDepth: 'binding-observation',
      diagnosticProjection: 'type-projection',
      appRetention: 'retain-app',
    });
    const diagnostics = answer.value as SemanticTemplateDiagnosticsResult;
    const selectStart = templateText.indexOf('selectItem(item)');
    const selectEnd = selectStart + 'selectItem'.length;
    expect(diagnostics.rows.some((row) =>
      row.typeScriptDiagnosticCode === 2339
      && row.source?.start != null
      && row.source.end != null
      && row.source.start < selectEnd
      && row.source.end > selectStart
    )).toBe(false);
  }, 120_000);

  test('keeps listener arrow CallScope ownership behind the framework event override context', async () => {
    const fixtureRoot = path.join(
      packageRoot,
      'fixtures/pressure/template-expression-resource-combinators',
    );
    const filePath = 'src/function-context-gallery.html';
    const templatePath = path.join(fixtureRoot, filePath);
    const templateText = readFileSync(templatePath, 'utf8');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'hover-call-signature-listener-arrow-owner',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const info = app.ask({
      kind: SemanticAppQueryKind.TemplateCursorInfo,
      cursor: cursorAtMarker(
        templateText,
        'candidate => select(candidate)',
        'select',
        filePath,
      ),
    }).value as SemanticTemplateCursorInfoResult;

    expect(info.selectedMember).toMatchObject({
      name: 'select',
      memberKind: 'method',
      scopeRole: null,
    });
    expect(info.missingInputs).not.toContain('scope-named-lookup:open');
    expect(info.selectedCall).toMatchObject({
      status: 'exact',
      callKind: 'scope',
      signatureTail: '(_item: ExpressionItem): void',
      openReason: null,
    });
    expect(info.missingInputs).not.toContain('selected-call-signature:open');

    const diagnostics = app.ask({
      kind: SemanticAppQueryKind.TemplateDiagnostics,
      sourceFile: { filePath },
      page: { size: 200 },
    }).value as SemanticTemplateDiagnosticsResult;
    expect(diagnostics.rows).toEqual([]);
  }, 120_000);
});

class MutableSourceOverlay {
  private readonly values = new Map<string, string>();

  write(fileName: string, sourceText: string): void {
    this.values.set(path.resolve(fileName), sourceText);
  }

  readFile(fileName: string): string | undefined {
    return this.values.get(path.resolve(fileName));
  }

  fileExists(fileName: string): boolean | undefined {
    return this.values.has(path.resolve(fileName)) ? true : undefined;
  }
}

function callSignatureTemplate(): string {
  return [
    '<template>',
    "  <p>${tools.overloaded('text')}</p>",
    '  <p>${tools.overloaded(1)}</p>',
    '  <p>${tools.identity(title)}</p>',
    '  <p>${tools.wrap(title).value}</p>',
    '  <p>${tools.callableProperty(1)}</p>',
    "  <p>${tools.callableAccessor('x')}</p>",
    '  <p>${tools.overloaded}</p>',
    '  <p>${tools.overloaded(weak)}</p>',
    '  <p>${tools.overloaded(true)}</p>',
    '  <p>${rootMethod(title)}</p>',
    '  <p>${rootWithThis(title)}</p>',
    '  <p>${$this.rootParentWithThis(title)}</p>',
    '  <p>${items.map(value => rootMethod(value)).join(",")}</p>',
    '  <p>${tools.identity(tools.overloaded(1))}</p>',
    '  <p>${tools.identity?.(title)}</p>',
    '  <p>${tools.optionalCallable?.(title)}</p>',
    '  <p>${tools.unionCallable(title)}</p>',
    '  <p>${tools.unionStringOnly(title)}</p>',
    '  <p>${tools.intersectionCallable(title)}</p>',
    '  <p>${tools.identity()}</p>',
    '  <p>${tools.requiresWrongThis(title)}</p>',
    '  <p>${tools.privateOverload(title)}</p>',
    '  <p>${tools.protectedOverload(1)}</p>',
    '  <p>${tools.literalSpacing(spaced)}</p>',
    '  <let local-title.bind="title" local-call.bind="tools.identity" root-with-this.bind="tools.requiresWrongThis"></let>',
    '  <section>${rootWithThis(title)}</section>',
    '  <p>${$this.rootWithThis(title)}</p>',
    '  <p>${rootMethod(localTitle)}</p>',
    '  <p>${localCall(title)}</p>',
    '  <div with.bind="tools">',
    '    <let to-binding-context nested-call.bind="identity"></let>',
    '    <p>${nestedCall($parent.title)}</p>',
    '    <p>${identity($parent.title)}</p>',
    '    <p>${$parent.rootMethod($parent.title)}</p>',
    '    <p>${rootMethod($parent.title)}</p>',
    '    <p>${rootWithThis($parent.title)}</p>',
    '    <p>${rootParentWithThis($parent.title)}</p>',
    '  </div>',
    '  <div repeat.for="item of items"><span>${rootMethod(item)}</span>${$parent.rootMethod(item)}</div>',
    '  <div with.bind="weak"><strong>${rootMethod($parent.title)}</strong></div>',
    '  <p>${items.map(value => $this.rootMethod(value)).join(",")}</p>',
    '  <p>${tools.factory()(title)}</p>',
    '  <p>${(tools.detached)(title)}</p>',
    '  <p>${new tools.Constructor(title).value}</p>',
    '  <p>${parseInt(title)}</p>',
    '  <aside>${$parent.rootMethod(title)}</aside>',
    '  <aside>${$parent.$parent.rootMethod(title)}</aside>',
    `  <p>\${${longSignatureCall()}}</p>`,
    '</template>',
  ].join('\n');
}

function callSignatureScript(
  stringReturnType: string,
  stringDocumentation: string,
): string {
  return [
    "import { customElement } from 'aurelia';",
    "import template from './app.html';",
    '',
    'interface Box<T> { value: T; }',
    'interface OptionalCallable {',
    '  /** Optional callable signature documentation.',
    '   * @deprecated Use identity.',
    '   */',
    '  (value: string): string;',
    '}',
    'interface UnionStringCallable {',
    '  /** Must never leak from a synthesized union.',
    '   * @deprecated Do not surface.',
    '   */',
    '  (value: string): string;',
    '}',
    'interface UnionNumberCallable {',
    '  /** Must never leak either. */',
    '  (value: string): number;',
    '}',
    'interface IntersectionStringCallable {',
    '  /** Intersection string signature documentation. */',
    '  (value: string): string;',
    '}',
    'interface IntersectionNumberCallable {',
    '  (value: number): number;',
    '}',
    'class ConstructedValue { constructor(public value: string) {} }',
    '',
    'class CallTools {',
    `  /** ${stringDocumentation}\n   * @deprecated Use textValue.\n   */`,
    `  overloaded(value: string): ${stringReturnType};`,
    '  /** Number overload documentation. */',
    '  overloaded(value: number): number;',
    '  overloaded(value: string | number): string | number { return value; }',
    '  identity<T>(value: T): T { return value; }',
    '  wrap<T>(value: T): Box<T> { return { value }; }',
    '  callableProperty: <T>(value: T) => T = value => value;',
    '  get callableAccessor(): <T>(value: T) => T { return value => value; }',
    '  optionalCallable: OptionalCallable | undefined = value => value;',
    "  unionCallable: UnionStringCallable | UnionNumberCallable = (value => value) as UnionStringCallable;",
    '  unionStringOnly: UnionStringCallable = value => value;',
    '  intersectionCallable = ((value: string | number) => value) as IntersectionStringCallable & IntersectionNumberCallable;',
    "  spaced: 'a  b' = 'a  b';",
    "  literalSpacing(value: 'a  b'): 'a  b' { return value; }",
    '  requiresWrongThis(this: { tag: number }, value: string): string { return value; }',
    '  private privateOverload(value: string): string;',
    '  private privateOverload(value: number): number;',
    '  private privateOverload(value: string | number): string | number { return value; }',
    '  protected protectedOverload(value: string): string;',
    '  protected protectedOverload(value: number): number;',
    '  protected protectedOverload(value: string | number): string | number { return value; }',
    '  factory(): (value: string) => string { return value => value; }',
    '  detached: (value: string) => string = value => value;',
    '  Constructor = ConstructedValue;',
    `  longSignature(${longSignatureParameters()}): string { return value000; }`,
    '}',
    '',
    "@customElement({ name: 'app', template })",
    'export class App {',
    "  title = 'title';",
    "  spaced: 'a  b' = 'a  b';",
    '  weak: any = null;',
    '  tools = new CallTools();',
    "  items = ['one'];",
    '  rootMethod(value: string): string { return value; }',
    '  rootWithThis(this: App, value: string): string { return value; }',
    '  rootParentWithThis(this: App, value: string): string { return value; }',
    '}',
  ].join('\n');
}

function longSignatureCall(): string {
  return `tools.longSignature(${Array.from({ length: 48 }, () => 'title').join(', ')})`;
}

function longSignatureParameters(): string {
  return Array.from({ length: 48 }, (_, index) =>
    `value${index.toString().padStart(3, '0')}: string`
  ).join(', ');
}

function cursorAtMarker(
  sourceText: string,
  marker: string,
  token: string,
  filePath: string = 'src/app.html',
) {
  const markerStart = sourceText.indexOf(marker);
  if (markerStart < 0) {
    throw new Error(`Expected marker ${marker}.`);
  }
  const tokenStart = sourceText.indexOf(token, markerStart);
  if (tokenStart < markerStart || tokenStart + token.length > markerStart + marker.length) {
    throw new Error(`Expected ${token} inside ${marker}.`);
  }
  const offset = tokenStart + Math.min(1, token.length - 1);
  const lines = sourceText.slice(0, offset).split(/\r?\n/u);
  return {
    filePath,
    line: lines.length - 1,
    character: lines.at(-1)?.length ?? 0,
    offset,
  };
}

function sourceTextAt(sourceText: string, source: SemanticSourceReference | null): string | null {
  return source?.start == null || source.end == null
    ? null
    : sourceText.slice(source.start, source.end);
}
