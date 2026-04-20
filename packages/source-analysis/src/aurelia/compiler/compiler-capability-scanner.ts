import fs from 'node:fs';
import ts from 'typescript';

import { AdmittedSubject } from '../admissions/index.js';
import type { HelperCall, RegistryFactoryMethod, RegistryMethod } from '../configurations/index.js';
import type {
  AttributePatternDefinition,
  BindingCommandDefinition,
  ResourceDefinition,
  Resources,
} from '../resources/index.js';
import {
  AttributePatternCapability,
  BindingCommandCapability,
  TemplateCompilerHookCapability,
  type CompilerCapability,
} from './compiler-capability.js';

export interface CompilerCapabilityScannerOptions {
  readonly resources: Resources;
}

export interface CompilerCapabilityScannerState {
  readonly ownerLabel: string;
}

export class CompilerCapabilityScanner {
  private readonly resourcesValue: Resources;
  private readonly parsedFiles = new Map<string, ts.SourceFile | null>();

  constructor(
    options: CompilerCapabilityScannerOptions,
  ) {
    this.resourcesValue = options.resources;
  }

  readCapabilitiesFor(
    admittedSubjects: readonly AdmittedSubject[],
    methods: readonly (RegistryMethod | RegistryFactoryMethod)[] = [],
  ): readonly CompilerCapability[] {
    const capabilities: CompilerCapability[] = [];

    for (const subject of admittedSubjects) {
      switch (subject.declarationKind) {
        case 'binding-command': {
          const definition = this.findBindingCommandDefinition(subject.referenceName);
          if (definition != null) {
            capabilities.push(new BindingCommandCapability(
              `${subject.id}:binding-command-capability`,
              subject,
              definition.name,
              definition.aliases,
              'Closed through existing binding-command definition materialization.',
            ));
          }
          break;
        }
        case 'attribute-pattern': {
          const definition = this.findAttributePatternDefinition(subject.referenceName);
          if (definition != null) {
            capabilities.push(new AttributePatternCapability(
              `${subject.id}:attribute-pattern-capability`,
              subject,
              definition.pattern,
              definition.symbols,
              'Closed through existing attribute-pattern definition materialization.',
            ));
          }
          break;
        }
      }
    }

    for (const method of methods) {
      for (const helperCall of method.helperCalls) {
        if (helperCall.calleeName !== 'TemplateCompilerHooks.define') {
          continue;
        }

        const hookName = this.readTemplateCompilerHookName(helperCall);
        capabilities.push(new TemplateCompilerHookCapability(
          `${helperCall.id}:template-compiler-hook-capability`,
          new AdmittedSubject(
            `${helperCall.id}:template-compiler-hook-subject`,
            helperCall.source,
            hookName ?? 'TemplateCompilerHooks.define',
            'registry',
            'registry-registration',
            null,
            null,
            'Shallow compiler-hook admission recovered from TemplateCompilerHooks.define(...) call witness.',
          ),
          hookName,
          // TODO: keep this shallow for now. Hook presence matters for
          // compiler-world understanding, but actual hook phase semantics
          // belong to a later template-compiler seam.
          'Closed shallowly from TemplateCompilerHooks.define(...) call witness.',
        ));
      }
    }

    return capabilities;
  }

  inspectState(): CompilerCapabilityScannerState {
    return {
      ownerLabel: this.resourcesValue.ownerLabel,
    };
  }

  private findBindingCommandDefinition(
    referenceName: string,
  ): BindingCommandDefinition | null {
    const resource = this.findResourceByTypeName(referenceName);
    return resource?.kind === 'binding-command'
      ? resource
      : null;
  }

  private findAttributePatternDefinition(
    referenceName: string,
  ): AttributePatternDefinition | null {
    const resource = this.findResourceByTypeName(referenceName);
    return resource?.kind === 'attribute-pattern'
      ? resource
      : null;
  }

  private findResourceByTypeName(
    referenceName: string,
  ): ResourceDefinition | null {
    return this.resourcesValue.readAll().find((current) => {
      const type = current.type;
      return 'name' in type && typeof type.name === 'string' && type.name === referenceName;
    }) ?? null;
  }

  private readTemplateCompilerHookName(
    helperCall: HelperCall,
  ): string | null {
    const filePath = helperCall.source.file.path;
    const sourceFile = this.readSourceFile(filePath);
    if (sourceFile == null) {
      return null;
    }

    const callNode = findNodeBySpan(
      sourceFile,
      helperCall.source.span.start,
      helperCall.source.span.end,
    );
    if (callNode == null || !ts.isCallExpression(callNode)) {
      return null;
    }

    const firstArgument = callNode.arguments[0];
    if (firstArgument == null) {
      return null;
    }

    if (ts.isIdentifier(firstArgument)) {
      return firstArgument.text;
    }

    if (ts.isClassExpression(firstArgument) && firstArgument.name != null) {
      return firstArgument.name.text;
    }

    return null;
  }

  private readSourceFile(
    filePath: string,
  ): ts.SourceFile | null {
    if (this.parsedFiles.has(filePath)) {
      return this.parsedFiles.get(filePath) ?? null;
    }

    try {
      const text = fs.readFileSync(filePath, 'utf8');
      const parsed = ts.createSourceFile(
        filePath,
        text,
        ts.ScriptTarget.Latest,
        true,
        filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      this.parsedFiles.set(filePath, parsed);
      return parsed;
    } catch {
      this.parsedFiles.set(filePath, null);
      return null;
    }
  }
}

function findNodeBySpan(
  sourceFile: ts.SourceFile,
  start: number,
  end: number,
): ts.Node | null {
  let best: ts.Node | null = null;

  const visit = (node: ts.Node) => {
    const nodeStart = node.getStart(sourceFile);
    if (nodeStart === start && node.end === end) {
      best = node;
      return;
    }
    if (start >= nodeStart && end <= node.end) {
      ts.forEachChild(node, visit);
    }
  };

  visit(sourceFile);
  return best;
}
