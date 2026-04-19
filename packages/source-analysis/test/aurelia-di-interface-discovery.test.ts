import { describe, expect, it } from './test-harness.js';

import {
  collectAureliaDiInterfaceExports,
} from '../src/aurelia/index.js';
import {
  resolveAureliaFrameworkRepoPath,
} from '../src/aurelia-framework-goldens.js';

const repoPath = resolveAureliaFrameworkRepoPath();

if (!repoPath) {
  describe('Aurelia DI interface discovery', () => {
    it('skips when the Aurelia framework repo is unavailable', { skip: true }, () => {});
  });
} else {
  const records = collectAureliaDiInterfaceExports({ repoPath });
  const findRecord = (
    packageName: string,
    exportedName: string,
  ) => records.find((record) =>
    record.package.name === packageName
    && record.export.name === exportedName);

  describe('Aurelia DI interface discovery', () => {
    it('finds a broad set of exported DI interface values', () => {
      expect(records.length).toBeGreaterThan(20);
    });

    it('finds direct kernel interface creations', () => {
      const container = findRecord('@aurelia/kernel', 'IContainer');
      expect(container).toBeDefined();
      expect(container?.surface.name).toBe('IContainer');
      expect(container?.surface.exportAliasPath).toEqual([]);
      expect(container?.surface.factoryAliasPath).toEqual([]);
      expect(container?.registration).toBeNull();
    });

    it('finds exported aliases of interface symbols', () => {
      const serviceLocator = findRecord('@aurelia/kernel', 'IServiceLocator');
      expect(serviceLocator).toBeDefined();
      expect(serviceLocator?.surface.declaredAt?.name).toBe('IContainer');
      expect(serviceLocator?.surface.name).toBe('IContainer');
      expect(serviceLocator?.surface.exportAliasPath).toContain('IContainer');
    });

    it('extracts default registrations from DI.createInterface builders', () => {
      const logger = findRecord('@aurelia/kernel', 'ILogger');
      const windowRecord = findRecord('@aurelia/runtime-html', 'IWindow');

      expect(logger?.registration?.kind).toBe('singleton');
      expect(logger?.registration?.expressionText).toBe('DefaultLogger');
      expect(windowRecord?.registration?.kind).toBe('callback');
    });

    it('follows createInterface aliases through helper modules', () => {
      const syntaxInterpreter = findRecord('@aurelia/template-compiler', 'ISyntaxInterpreter');
      expect(syntaxInterpreter).toBeDefined();
      expect(syntaxInterpreter?.surface.factoryAliasPath).toContain('tcCreateInterface');
      expect(syntaxInterpreter?.surface.name).toBe('ISyntaxInterpreter');
      expect(syntaxInterpreter?.registration?.kind).toBe('singleton');
    });
  });
}
