import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { ContainerReference } from '../di/container-reference.js';
import type { ResourceTargetReference } from '../resources/resource-reference.js';
import type { ControllerReference } from './controller.js';

export type AppRootConfigField =
  | 'host'
  | 'component'
  | 'allowActionlessForm'
  | 'strictBinding'
  | 'ssrScope'
  | 'source';

export type AppRootField =
  | 'config'
  | 'host'
  | 'component'
  | 'container'
  | 'controller'
  | 'platform'
  | 'source';

/** Runtime-shaped app-root configuration before AppRoot construction spends it. */
@auLink('runtime-html:IAppRootConfig')
export class AppRootConfig {
  constructor(
    /** Host element/source address when the host expression is closed enough for navigation. */
    readonly hostAddressHandle: AddressHandle | null,
    /** Root component class or instance reference. */
    readonly component: ResourceTargetReference | null,
    /** Whether actionless form submit behavior is explicitly allowed. */
    readonly allowActionlessForm: boolean | null,
    /** Root-level strict binding override. */
    readonly strictBinding: boolean | null,
    /** SSR scope product handle when hydration manifests are modeled later. */
    readonly ssrScopeProductHandle: ProductHandle | null,
    /** Source address for the config expression. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<AppRootConfigField>[] = [],
  ) {}
}

/** Reference to a modeled AppRoot without retaining a live runtime object. */
export class AppRootReference {
  constructor(
    /** Identity for this modeled app root, when construction has closed. */
    readonly identityHandle: IdentityHandle | null,
    /** Product handle for the materialized AppRoot, when emitted. */
    readonly productHandle: ProductHandle | null,
    /** Source address for the expression that created or mentioned the AppRoot. */
    readonly addressHandle: AddressHandle | null,
    /** Local source name used only for traces while identity is still open. */
    readonly localName: string | null,
  ) {}
}

/**
 * Runtime-shaped AppRoot model.
 *
 * This captures the app root's container, root component, host, and controller link before lifecycle execution. The
 * controller may remain open until controller construction has been materialized by a later configuration/DI pass.
 */
@auLink('runtime-html:AppRoot')
export class AppRoot {
  constructor(
    /** Product handle for the materialized-product envelope that represents this app root. */
    readonly productHandle: ProductHandle,
    /** Identity for this modeled app root. */
    readonly identityHandle: IdentityHandle,
    /** Runtime-shaped root config that produced this app root. */
    readonly config: AppRootConfig,
    /** Container passed to AppRoot construction. */
    readonly container: ContainerReference,
    /** Host element/source address used by AppRoot. */
    readonly hostAddressHandle: AddressHandle | null,
    /** Root component class or instance reference. */
    readonly component: ResourceTargetReference | null,
    /** Root custom-element controller, once controller creation is modeled. */
    readonly controller: ControllerReference | null,
    /** Platform product or identity handle once host platform resolution is modeled. */
    readonly platformHandle: IdentityHandle | ProductHandle | null,
    /** Source address for the AppRoot construction or static app admission expression. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<AppRootField>[] = [],
  ) {}

  /** Store-local reference for app/configuration products that point at this root. */
  toReference(): AppRootReference {
    return new AppRootReference(
      this.identityHandle,
      this.productHandle,
      this.sourceAddressHandle,
      null,
    );
  }
}
