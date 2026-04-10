class RegistrationBuilder {
  public aliasTo(_key: unknown): this {
    return this;
  }
}

export class Aurelia {
  public register(..._registrations: readonly unknown[]): this {
    return this;
  }
}

export const Registration = {
  singleton(_key: unknown, _implementation: unknown): RegistrationBuilder {
    return new RegistrationBuilder();
  }
};

export class Container {
  public register(..._registrations: readonly unknown[]): void {}
}

export class FeatureConfiguration {
  public static register(): void {}
}

export class ApiClient {}
