import path from 'node:path';
import ts from 'typescript';
import type { AddressHandle, ProductHandle } from '../kernel/handles.js';

export type TypeSystemOverlaySourceKind =
  | 'html-module-declaration'
  | 'semantic-checker-surface';

export type TypeSystemOverlayDiagnosticPolicy =
  | 'hidden-from-project-diagnostics';

export type TypeSystemOverlaySourceSegmentRole =
  | 'module-declaration'
  | 'semantic-surface'
  | 'contract-proof';

export interface TypeSystemOverlaySourceSegment {
  readonly role: TypeSystemOverlaySourceSegmentRole;
  readonly generatedStart: number;
  readonly generatedEnd: number;
  readonly semanticProductHandle: ProductHandle | null;
  readonly sourceAddressHandle: AddressHandle | null;
  readonly sourceStart: number | null;
  readonly sourceEnd: number | null;
  readonly label: string | null;
}

export interface TypeSystemOverlaySource {
  readonly kind: TypeSystemOverlaySourceKind;
  readonly fileName: string;
  readonly text: string;
  readonly scriptKind: ts.ScriptKind;
  readonly diagnosticPolicy: TypeSystemOverlayDiagnosticPolicy;
  readonly originKey: string;
  readonly segments: readonly TypeSystemOverlaySourceSegment[];
}

export interface TypeSystemOverlaySourceBuildOptions {
  readonly kind: TypeSystemOverlaySourceKind;
  readonly fileName: string;
  readonly originKey: string;
  readonly scriptKind?: ts.ScriptKind;
  readonly diagnosticPolicy?: TypeSystemOverlayDiagnosticPolicy;
}

export interface TypeSystemOverlaySegmentBuildOptions {
  readonly role: TypeSystemOverlaySourceSegmentRole;
  readonly semanticProductHandle?: ProductHandle | null;
  readonly sourceAddressHandle?: AddressHandle | null;
  readonly sourceStart?: number | null;
  readonly sourceEnd?: number | null;
  readonly label?: string | null;
}

/** Builds generated overlay text while preserving exact generated-to-authored source segment boundaries. */
export class TypeSystemOverlaySourceBuilder {
  private text = '';
  private readonly segments: TypeSystemOverlaySourceSegment[] = [];

  constructor(
    private readonly options: TypeSystemOverlaySourceBuildOptions,
  ) {}

  append(text: string): this {
    this.text += text;
    return this;
  }

  appendLine(text = ''): this {
    return this.append(`${text}\n`);
  }

  appendSegment(
    text: string,
    options: TypeSystemOverlaySegmentBuildOptions,
  ): this {
    const generatedStart = this.text.length;
    this.text += text;
    this.segments.push({
      role: options.role,
      generatedStart,
      generatedEnd: this.text.length,
      semanticProductHandle: options.semanticProductHandle ?? null,
      sourceAddressHandle: options.sourceAddressHandle ?? null,
      sourceStart: options.sourceStart ?? null,
      sourceEnd: options.sourceEnd ?? null,
      label: options.label ?? null,
    });
    return this;
  }

  build(): TypeSystemOverlaySource {
    return {
      kind: this.options.kind,
      fileName: this.options.fileName,
      text: this.text,
      scriptKind: this.options.scriptKind ?? ts.ScriptKind.TS,
      diagnosticPolicy: this.options.diagnosticPolicy ?? 'hidden-from-project-diagnostics',
      originKey: this.options.originKey,
      segments: this.segments,
    };
  }
}

export function buildInitialTypeSystemOverlaySources(rootDir: string): readonly TypeSystemOverlaySource[] {
  return [
    htmlModuleDeclarationOverlaySource(rootDir),
  ];
}

export function createTypeSystemOverlaySourceFile(source: TypeSystemOverlaySource): ts.SourceFile {
  return ts.createSourceFile(
    source.fileName,
    source.text,
    ts.ScriptTarget.Latest,
    true,
    source.scriptKind,
  );
}

export function typeSystemOverlaySegmentAt(
  source: TypeSystemOverlaySource,
  position: number,
): TypeSystemOverlaySourceSegment | null {
  return source.segments.find((segment) =>
    segment.generatedStart <= position && position < segment.generatedEnd
  ) ?? null;
}

function htmlModuleDeclarationOverlaySource(rootDir: string): TypeSystemOverlaySource {
  const fileName = path.join(rootDir, '.semantic-runtime', 'overlays', 'html-module.d.ts');
  return new TypeSystemOverlaySourceBuilder({
    kind: 'html-module-declaration',
    fileName,
    originKey: 'semantic-runtime:html-module-declaration',
  })
    .appendSegment(
      [
        "declare module '*.html' {",
        '  const template: string;',
        '  export default template;',
        '}',
        '',
      ].join('\n'),
      {
        role: 'module-declaration',
        label: '*.html module declaration',
      },
    )
    .build();
}
