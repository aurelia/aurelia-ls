import { IContainer, resolve } from '@aurelia/kernel';

export class LookupService {
  readonly label = 'lookup';
}

export class ResolveContextApp {
  private readonly container = resolve(IContainer);
  readonly fieldLookup = resolve(LookupService);
  readonly fieldNullishLookup = resolve(undefined as unknown as typeof LookupService);
  readonly ctorLookup: LookupService;
  readonly ctorNullishLookup: LookupService;

  constructor() {
    this.ctorLookup = resolve(LookupService);
    this.ctorNullishLookup = resolve(null as unknown as typeof LookupService);
  }

  laterLookup(): LookupService {
    return resolve(LookupService);
  }

  invokeNative(): unknown {
    return this.container.invoke(Array);
  }

  getFactoryNative(): unknown {
    return this.container.getFactory(Array);
  }

  getNullish(): unknown {
    return this.container.get(null as never);
  }

  getEphemeralObject(): unknown {
    return this.container.get({} as never);
  }

  getFactoryEphemeralObject(): unknown {
    return this.container.getFactory({} as never);
  }
}
