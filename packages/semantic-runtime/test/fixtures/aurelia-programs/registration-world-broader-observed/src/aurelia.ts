export type ConfigurationProvider = (options: Record<string, unknown>) => void;

export interface ConfigurationCarrier {
  customize(provider?: ConfigurationProvider): ConfigurationCarrier;
  register(): void;
}

function createConfigurationCarrier(): ConfigurationCarrier {
  return {
    customize(_provider?: ConfigurationProvider) {
      return createConfigurationCarrier();
    },
    register() {}
  };
}

export class Aurelia {
  public register(..._registrations: readonly unknown[]): this {
    return this;
  }

  public app(_root: unknown): this {
    return this;
  }
}

export class ServiceContainer {
  public register(..._registrations: readonly unknown[]): void {}
}

export class AppTask {
  public static activating(
    _callback: (container: ServiceContainer) => void
  ): unknown {
    return {};
  }
}

export class FeatureBundle {
  public static register(): void {}
}

export const FeatureConfiguration = createConfigurationCarrier();
export const RouterConfiguration = createConfigurationCarrier();
