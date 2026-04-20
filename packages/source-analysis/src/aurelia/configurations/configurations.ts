import { BundleArray } from './bundle-array.js';
import {
  ConfigurationScanner,
  type ConfigurationScannerState,
} from './configuration-scanner.js';
import { RegistryObject } from './registry-object.js';

export type ConfigurationSubject =
  | BundleArray
  | RegistryObject;

export interface ConfigurationsState {
  readonly ownerLabel: string;
  readonly allCached: boolean;
  readonly bundleArraysCached: boolean;
  readonly registryObjectsCached: boolean;
  readonly scannerState: ConfigurationScannerState;
}

export class Configurations {
  private allValue: readonly ConfigurationSubject[] | null = null;
  private bundleArraysValue: readonly BundleArray[] | null = null;
  private registryObjectsValue: readonly RegistryObject[] | null = null;
  readonly ownerLabel: string;

  constructor(
    ownerLabel: string,
    private readonly scannerValue: ConfigurationScanner,
  ) {
    this.ownerLabel = ownerLabel;
  }

  readAll(): readonly ConfigurationSubject[] {
    this.allValue ??= this.scannerValue.scanAll();
    return [...this.allValue];
  }

  readBundleArrays(): readonly BundleArray[] {
    this.bundleArraysValue ??= this.readAll().filter(
      (current): current is BundleArray => current instanceof BundleArray,
    );
    return [...this.bundleArraysValue];
  }

  readRegistryObjects(): readonly RegistryObject[] {
    this.registryObjectsValue ??= this.readAll().filter(
      (current): current is RegistryObject => current instanceof RegistryObject,
    );
    return [...this.registryObjectsValue];
  }

  inspectState(): ConfigurationsState {
    return {
      ownerLabel: this.ownerLabel,
      allCached: this.allValue != null,
      bundleArraysCached: this.bundleArraysValue != null,
      registryObjectsCached: this.registryObjectsValue != null,
      scannerState: this.scannerValue.inspectState(),
    };
  }
}
