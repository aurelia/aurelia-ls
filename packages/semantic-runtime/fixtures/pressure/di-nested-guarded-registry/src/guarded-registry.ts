import { IContainer, customAttribute } from 'aurelia';

let registered = false;

@customAttribute('guarded-once')
export class GuardedOnceCustomAttribute {}

export const InnerRegistry = {
  register(container: IContainer): IContainer {
    if (registered) {
      return container;
    }
    registered = true;
    return container.register(GuardedOnceCustomAttribute);
  },
};
