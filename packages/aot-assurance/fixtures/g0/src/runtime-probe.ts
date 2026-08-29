/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return -- The repository-wide ESLint program cannot resolve the linked framework types under its NodeNext fixture model. */

import {
  IExpressionParser,
  ITemplateCompiler,
  Registration,
  type IContainer,
} from 'aurelia';

import type { RuntimeProbeSnapshot } from '../../../src/contract.js';

export interface RuntimeProbe {
  read(): RuntimeProbeSnapshot;
  exerciseControl(): void;
}

let installedProbe: RuntimeProbe | null = null;

export function readInstalledRuntimeProbe(): RuntimeProbe {
  if (installedProbe == null) throw new Error('Runtime probe was not installed before root hydration.');
  return installedProbe;
}

export function installRuntimeProbe(container: IContainer, lane: 'jit' | 'aot'): RuntimeProbe {
  if (installedProbe != null) return installedProbe;
  const counts = {
    compilerCompile: 0,
    compilerCompileSpread: 0,
    compilerNullTemplateBypass: 0,
    parserParse: 0,
  };

  const parserProbe = lane === 'jit'
    ? countingParser(container.get(IExpressionParser), counts)
    : {
        parse() {
          counts.parserParse++;
          throw new Error('AOT_RUNTIME_PARSE: expression string parsing is forbidden');
        },
      };
  container.deregister(IExpressionParser);
  container.register(Registration.instance(IExpressionParser, parserProbe));

  // Only the JIT control resolves the framework implementation. The AOT lane installs a small interface-compatible
  // object and admits only the framework's null-template bypass (currently AuSlot); it cannot compile markup.
  const compilerProbe = lane === 'jit'
    ? countingCompiler(container.get(ITemplateCompiler), counts)
    : nullTemplateCompilerBypass(counts);
  container.deregister(ITemplateCompiler);
  container.register(Registration.instance(ITemplateCompiler, compilerProbe));

  return installedProbe = {
    read: () => ({
      compilerCompile: counts.compilerCompile,
      compilerCompileSpread: counts.compilerCompileSpread,
      compilerNullTemplateBypass: counts.compilerNullTemplateBypass,
      parserParse: counts.parserParse,
    }),
    exerciseControl() {
      if (lane !== 'jit') throw new Error('Only the JIT lane may exercise the positive compiler control.');
      compilerProbe.compile({
        type: 'custom-element',
        name: 'aot-assurance-probe',
        template: '<span>${value}</span>',
        dependencies: [],
        bindables: {},
        needsCompile: true,
      }, container);
    },
  };
}

function countingParser(parser: any, counts: { parserParse: number }): any {
  return new Proxy(parser, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (property === 'parse') {
        return (...args: unknown[]) => {
          counts.parserParse++;
          return Reflect.apply(value, target, args);
        };
      }
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

function countingCompiler(
  compiler: any,
  counts: { compilerCompile: number; compilerCompileSpread: number },
): any {
  return new Proxy(compiler, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (property === 'compile' || property === 'compileSpread') {
        return (...args: unknown[]) => {
          if (property === 'compile') counts.compilerCompile++;
          else counts.compilerCompileSpread++;
          return Reflect.apply(value, target, args);
        };
      }
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

function nullTemplateCompilerBypass(counts: {
  compilerCompile: number;
  compilerCompileSpread: number;
  compilerNullTemplateBypass: number;
}): any {
  return {
    debug: false,
    resolveResources: false,
    compile(definition: { name?: unknown; needsCompile?: unknown; template?: unknown }) {
      if (definition.template === null) {
        counts.compilerNullTemplateBypass++;
        Reflect.set(definition, 'needsCompile', false);
        return definition;
      }
      counts.compilerCompile++;
      throw new Error(
        'AOT_RUNTIME_COMPILE: ITemplateCompiler.compile is forbidden for '
        + `${String(definition.name)} (needsCompile=${String(definition.needsCompile)})`,
      );
    },
    compileSpread() {
      counts.compilerCompileSpread++;
      throw new Error('AOT_RUNTIME_COMPILE: ITemplateCompiler.compileSpread is forbidden');
    },
  };
}

/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
