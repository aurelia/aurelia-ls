import { DI, Registration } from '@aurelia/kernel';
import { AppTask, Aurelia, customElement } from '@aurelia/runtime-html';

const sharedValue = { marker: 'shared-registration-application' };
const sharedRegistration = Registration.instance(
  'shared-registration-application',
  sharedValue,
);
const sharedTask = AppTask.creating(() => undefined);

export const firstContainer = DI.createContainer();
export const secondContainer = DI.createContainer();

const SharedRegistry = {
  register(container: ReturnType<typeof DI.createContainer>): void {
    container.register(sharedRegistration);
  },
};

firstContainer.register(SharedRegistry);
firstContainer.register(SharedRegistry);
firstContainer.register(sharedTask);
firstContainer.register(sharedTask);
secondContainer.register(SharedRegistry);

@customElement({
  name: 'first-registration-application-app',
  template: '<template>first</template>',
})
class FirstRegistrationApplicationApp {}

@customElement({
  name: 'second-registration-application-app',
  template: '<template>second</template>',
})
class SecondRegistrationApplicationApp {}

new Aurelia(firstContainer).app({
  host: document.body,
  component: FirstRegistrationApplicationApp,
});

new Aurelia(secondContainer).app({
  host: document.body,
  component: SecondRegistrationApplicationApp,
});
