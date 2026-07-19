import { IContainer, Registration } from '@aurelia/kernel';

export class ModulePlainClass {}
export class SecondModulePlainClass {}

export const ModuleFactoryRegistration = Registration.instance(
  'module-instance',
  { marker: 'module-instance' },
);

export const ModuleMethodRegistry = {
  register(container: IContainer): void {
    container.register(Registration.instance('module-method', { marker: 'module-method' }));
  },
};

export const ModuleArrowRegistry = {
  register: (container: IContainer): void => {
    container.register(Registration.instance('module-arrow', { marker: 'module-arrow' }));
  },
};

export const ignoredPrimitive = 'not-a-registry';
