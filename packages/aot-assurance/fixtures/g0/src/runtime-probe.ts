/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return -- The repository-wide ESLint program cannot resolve the linked framework types under its NodeNext fixture model. */

import {
  IExpressionParser,
  Registration,
  type IContainer,
} from 'aurelia';

import type { RuntimeProbeSnapshot } from '../../../src/contract.js';

export interface RuntimeProbe {
  read(): RuntimeProbeSnapshot;
}

let installedProbe: RuntimeProbe | null = null;

export function readInstalledRuntimeProbe(): RuntimeProbe {
  if (installedProbe == null) throw new Error('Runtime probe was not installed before root hydration.');
  return installedProbe;
}

export function installRuntimeProbe(container: IContainer, lane: 'jit' | 'aot'): RuntimeProbe {
  if (installedProbe != null) return installedProbe;
  const counts = {
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

  return installedProbe = {
    read: () => ({
      parserParse: counts.parserParse,
    }),
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

/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
