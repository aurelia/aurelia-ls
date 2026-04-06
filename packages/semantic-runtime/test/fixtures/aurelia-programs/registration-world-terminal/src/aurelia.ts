export class Aurelia {
  public register(..._registrations: readonly unknown[]): this {
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

export class AuComposeBoundary {
  public static boundary(_provider: () => Promise<unknown>): unknown {
    return {};
  }
}
