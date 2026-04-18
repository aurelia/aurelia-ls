import { DI, Registration, inject } from '@aurelia/kernel';
import { customElement } from '@aurelia/runtime-html';

export interface Logger {
  log(message: string): void;
}

export const ILogger = DI.createInterface<Logger>('ILogger');

export class ConsoleLogger implements Logger {
  public log(message: string): void {
    console.log(message);
  }
}

export const LoggerRegistration = Registration.singleton(ILogger, ConsoleLogger);

@customElement({ name: 'app-root', template: '<template></template>' })
@inject(ILogger)
export class AppRoot {
  public constructor(private readonly logger: Logger) {
    this.logger.log('fixture');
  }
}
