import { describe, expect, it } from './test-harness.js';

import {
  collectRegistrationEffects,
  getRegistrationAliasTargetExpression,
  getRegistrationTargetExpression,
  getRegistrationValueExpression,
} from '../src/aurelia/index.js';
import {
  resolveAureliaFrameworkRepoPath,
} from '../src/aurelia-framework-goldens.js';

const repoPath = resolveAureliaFrameworkRepoPath();

if (!repoPath) {
  describe('Aurelia registration effect discovery', () => {
    it('skips when the Aurelia framework repo is unavailable', { skip: true }, () => {});
  });
} else {
  const records = collectRegistrationEffects({ repoPath });

  const findRecord = (
    ownerName: string,
    sourceIncludes: string,
  ) => records.find((record) =>
    record.owner.location.name === ownerName
    && record.sourceExpressionText.includes(sourceIncludes));

  describe('Aurelia registration effect discovery', () => {
    it('finds interface default builder registrations with structured targets', () => {
      const logger = findRecord('ILogger', 'DefaultLogger');
      expect(logger).toBeDefined();
      expect(logger?.locality).toBe('interface-default-builder');
      expect(logger?.api?.apiId).toBe('di.createInterface');
      expect(logger?.registration?.kind).toBe('singleton');
      expect(logger?.registration?.targetMode).toBe('implicit-interface-self');
      expect(logger?.registration && getRegistrationValueExpression(logger.registration)).toBe('DefaultLogger');
    });

    it('finds static register emitters created through createImplementationRegister', () => {
      const templateCompiler = findRecord('TemplateCompiler', 'createImplementationRegister(ITemplateCompiler)');
      expect(templateCompiler).toBeDefined();
      expect(templateCompiler?.locality).toBe('static-register-field');
      expect(templateCompiler?.effectKind).toBe('register-emitter');
      expect(templateCompiler?.api?.apiId).toBe('createImplementationRegister');
      expect(templateCompiler?.emitterInterfaceKeyExpressionText).toBe('ITemplateCompiler');
    });

    it('finds destructured registration helper aliases inside resource register methods', () => {
      const aliasRegistration = records.find((record) =>
        record.owner.location.name === 'BindingCommandDefinition'
        && record.effectKind === 'registration-call'
        && record.sourceExpressionText === 'aliasRegistration($Type, key)');
      expect(aliasRegistration).toBeDefined();
      expect(aliasRegistration?.locality).toBe('resource-register-method');
      expect(aliasRegistration?.effectKind).toBe('registration-call');
      expect(aliasRegistration?.api?.apiId).toBe('registration.aliasTo');
      expect(aliasRegistration?.api?.detectionKind).toBe('destructured-alias');
      expect(aliasRegistration?.registration && getRegistrationTargetExpression(aliasRegistration.registration)).toBe('$Type');
      expect(aliasRegistration?.registration && getRegistrationAliasTargetExpression(aliasRegistration.registration)).toBe('key');
    });

    it('finds exported object register methods that bulk-register other surfaces', () => {
      const runtimeTemplateCompiler = findRecord('RuntimeTemplateCompilerImplementation', 'container.register(');
      expect(runtimeTemplateCompiler).toBeDefined();
      expect(runtimeTemplateCompiler?.locality).toBe('exported-object-register-method');
      expect(runtimeTemplateCompiler?.effectKind).toBe('container-register-call');
      expect(runtimeTemplateCompiler?.containerRegisterArgumentTexts).toEqual([
        'TemplateCompiler',
        'AttrMapper',
        'ResourceResolver',
      ]);
    });

    it('finds exported object registry constructors that return nested register emitters', () => {
      const customize = records.find((record) =>
        record.owner.location.name === 'RouterConfiguration'
        && record.locality === 'exported-object-registry-constructor'
        && record.effectKind === 'register-emitter');
      expect(customize).toBeDefined();
      expect(customize?.api).toBeNull();
      expect(customize?.sourceExpressionText).toContain('register(container: IContainer)');
    });

    it('finds AppTask-based registration constructors and their nested runtime calls', () => {
      const shadowDomEmitter = records.find((record) =>
        record.owner.location.name === 'StyleConfiguration'
        && record.locality === 'exported-object-registry-constructor'
        && record.effectKind === 'register-emitter');
      expect(shadowDomEmitter).toBeDefined();
      expect(shadowDomEmitter?.api?.apiId).toBe('app-task.creating');
      expect(shadowDomEmitter?.emitterInterfaceKeyExpressionText).toBe('IContainer');

      const shadowDomNestedCall = records.find((record) =>
        record.owner.location.name === 'StyleConfiguration'
        && record.locality === 'local-runtime-call'
        && record.effectKind === 'container-register-call');
      expect(shadowDomNestedCall).toBeDefined();
      expect(shadowDomNestedCall?.containerRegisterArgumentTexts).toEqual([
        'instanceRegistration(IShadowDOMGlobalStyles, factory.createStyles(config.sharedStyles, null))',
      ]);
    });
  });
}
