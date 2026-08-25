import { DI, Registration } from '@aurelia/kernel';

export const primaryContainer = DI.createContainer();
primaryContainer.register(Registration.instance('primary-root', { marker: 'primary-root' }));

export function readPrimaryContainer() {
  return primaryContainer;
}

export const secondaryContainer = DI.createContainer();
secondaryContainer.register(Registration.instance('secondary-root', { marker: 'secondary-root' }));

export const childParentContainer = DI.createContainer();
childParentContainer.register(Registration.instance('parent-only', { marker: 'parent-only' }));

export const childContainer = childParentContainer.createChild();
childContainer.register(Registration.instance('child-only', { marker: 'child-only' }));
export class ChildContainerRegistrationValue {}
childContainer.register(Registration.instance('child-order', ChildContainerRegistrationValue));
