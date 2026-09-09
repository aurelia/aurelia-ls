import path from 'node:path';

import ts from 'typescript';
import type { Plugin } from 'vite';

const probeModuleId = 'virtual:aurelia-aot-assurance/g0-runtime-probe';
const resolvedProbeModuleId = `\0${probeModuleId}`;
const installName = '$installG0RuntimeProbe';

/**
 * Install observation instrumentation after the app has been analyzed and compiled. The authored app must not
 * request a runtime parser merely so the harness can prove that the compiled app never requests one.
 */
export function createG0RuntimeProbePlugin(lane: 'jit' | 'aot', fixtureRoot: string): Plugin {
  const appFile = path.resolve(fixtureRoot, 'src/g0-app.ts');
  let instrumented = false;
  return {
    name: `aot-assurance:g0-runtime-probe:${lane}`,
    apply: 'build',
    enforce: 'post',
    resolveId(id) {
      return id === probeModuleId ? resolvedProbeModuleId : null;
    },
    load(id) {
      return id === resolvedProbeModuleId ? probeModuleSource(lane) : null;
    },
    transform(code, id) {
      if (path.resolve(id) !== appFile) return null;
      if (instrumented) this.error('G0 runtime probe attempted to instrument its app twice.');
      instrumented = true;
      const result = ts.transpileModule(code, {
        fileName: id,
        compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, sourceMap: true },
        transformers: {
          before: [context => sourceFile => {
            const classes = sourceFile.statements.filter((statement): statement is ts.ClassDeclaration =>
              ts.isClassDeclaration(statement) && statement.name?.text === 'G0App'
            );
            if (classes.length !== 1 || classes[0]!.members.some(ts.isConstructorDeclaration)) {
              throw new Error('G0 runtime probe expects exactly one constructor-free G0App declaration.');
            }
            const appClass = classes[0]!;
            const factory = context.factory;
            const constructor = factory.createConstructorDeclaration(undefined, [], factory.createBlock([
              factory.createExpressionStatement(factory.createCallExpression(factory.createIdentifier(installName), undefined, [])),
            ], true));
            const instrumentedClass = factory.updateClassDeclaration(
              appClass, appClass.modifiers, appClass.name, appClass.typeParameters, appClass.heritageClauses,
              [constructor, ...appClass.members],
            );
            const probeImport = factory.createImportDeclaration(undefined, factory.createImportClause(
              false, undefined, factory.createNamedImports([
                factory.createImportSpecifier(false, factory.createIdentifier('installG0RuntimeProbe'), factory.createIdentifier(installName)),
              ]),
            ), factory.createStringLiteral(probeModuleId));
            return factory.updateSourceFile(sourceFile, [probeImport, ...sourceFile.statements.map(statement =>
              statement === appClass ? instrumentedClass : statement
            )]);
          }],
        },
      });
      return { code: result.outputText, map: result.sourceMapText ?? null };
    },
    buildEnd(error) {
      if (error == null && !instrumented) this.error('G0 runtime probe did not encounter its app module.');
    },
  };
}

function probeModuleSource(lane: 'jit' | 'aot'): string {
  return `
import { IAurelia, IExpressionParser, Registration, resolve } from 'aurelia';

export function installG0RuntimeProbe() {
  if (window.__aotAssuranceProbe != null) throw new Error('G0 runtime probe was already installed.');
  const container = resolve(IAurelia).container;
  const counts = { parserParse: 0 };
  const parserProbe = ${JSON.stringify(lane)} === 'jit'
    ? new Proxy(container.get(IExpressionParser), {
        get(target, property, receiver) {
          const value = Reflect.get(target, property, receiver);
          if (property === 'parse') return (...args) => {
            counts.parserParse++;
            return Reflect.apply(value, target, args);
          };
          return typeof value === 'function' ? value.bind(target) : value;
        },
      })
    : { parse() {
        counts.parserParse++;
        throw new Error('AOT_RUNTIME_PARSE: expression string parsing is forbidden');
      } };
  container.deregister(IExpressionParser);
  container.register(Registration.instance(IExpressionParser, parserProbe));
  window.__aotAssuranceProbe = { read: () => ({ parserParse: counts.parserParse }) };
}
`;
}
