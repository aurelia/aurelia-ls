import {
  ApplicationComponent,
  ApplicationComponentReference,
  ApplicationEntrypoint,
  ApplicationFile,
  type ApplicationFileRole,
  type ApplicationImport,
  type ApplicationModuleSpecifier,
  ApplicationRoute,
  ApplicationService,
  ApplicationStyleAsset,
  type ApplicationStyleAssetKind,
  type ApplicationStyleOwnerKind,
  type ApplicationStyleSourceKind,
  ApplicationTemplateAsset,
  ApplicationTopology,
  type ApplicationRegistration,
} from './topology.js';
import { moduleSpecifier } from './module-specifier.js';

export interface ApplicationStyleTopologySpec {
  readonly path?: string | null;
  readonly importSpecifier?: ApplicationModuleSpecifier | null;
  readonly assetKind: ApplicationStyleAssetKind;
  readonly sourceKind: ApplicationStyleSourceKind;
}

export interface ApplicationComponentTopologySpec {
  readonly className: string;
  /** Source file that will import or otherwise reference this component. */
  readonly referenceFromPath: string;
  readonly sourcePath: string;
  readonly elementName: string;
  readonly templatePath?: string | null;
  readonly templateImportSpecifier?: ApplicationModuleSpecifier | null;
  readonly styles?: readonly ApplicationStyleTopologySpec[];
  readonly dependencies?: readonly ApplicationComponentReference[];
}

export interface ApplicationEntrypointTopologySpec {
  readonly path: string;
  readonly startupLane: string;
  readonly rootComponent: ApplicationComponentReference;
  readonly imports?: readonly ApplicationImport[];
}

export interface ApplicationServiceTopologySpec {
  readonly className: string;
  readonly sourcePath: string;
  readonly role?: Extract<ApplicationFileRole, 'service-source' | 'state-source' | 'model-source'>;
  readonly registration?: ApplicationRegistration | null;
}

export interface ApplicationRouteTopologySpec {
  readonly path: string;
  readonly component: ApplicationComponentReference;
  readonly title?: string | null;
}

export interface ApplicationComponentTopologyResult {
  readonly component: ApplicationComponent;
  readonly reference: ApplicationComponentReference;
}

/** Mutable authoring-side topology assembler with file de-duplication and app-level lifetime. */
export class ApplicationTopologyBuilder {
  private entrypointValue: ApplicationEntrypoint | null = null;
  private readonly filesByKey = new Map<string, ApplicationFile>();
  private readonly components: ApplicationComponent[] = [];
  private readonly services: ApplicationService[] = [];
  private readonly registrations: ApplicationRegistration[] = [];
  private readonly styles: ApplicationStyleAsset[] = [];
  private readonly routes: ApplicationRoute[] = [];

  constructor(
    readonly rootDir: string,
  ) {}

  file(path: string, role: ApplicationFileRole): ApplicationFile {
    const key = `${path}\0${role}`;
    let file = this.filesByKey.get(key) ?? null;
    if (file == null) {
      file = new ApplicationFile(path, role);
      this.filesByKey.set(key, file);
    }
    return file;
  }

  entrypoint(spec: ApplicationEntrypointTopologySpec): ApplicationEntrypoint {
    const entrypoint = new ApplicationEntrypoint(
      this.file(spec.path, 'entrypoint'),
      spec.startupLane,
      spec.rootComponent,
      spec.imports ?? [],
    );
    this.entrypointValue = entrypoint;
    return entrypoint;
  }

  component(spec: ApplicationComponentTopologySpec): ApplicationComponentTopologyResult {
    const reference = new ApplicationComponentReference(
      spec.className,
      moduleSpecifier(spec.referenceFromPath, spec.sourcePath, false),
    );
    const file = this.file(spec.sourcePath, 'component-source');
    const template = spec.templatePath == null
      ? null
      : new ApplicationTemplateAsset(
        this.file(spec.templatePath, 'component-template'),
        spec.templateImportSpecifier ?? moduleSpecifier(spec.sourcePath, spec.templatePath, true),
      );
    const styles = (spec.styles ?? []).map((style) =>
      this.styleAsset('component', style, spec.sourcePath)
    );
    const component = new ApplicationComponent(reference, file, spec.elementName, template, styles, spec.dependencies ?? []);
    this.components.push(component);
    return { component, reference };
  }

  globalStyle(spec: ApplicationStyleTopologySpec): ApplicationStyleAsset {
    return this.styleAsset('global', spec);
  }

  service(spec: ApplicationServiceTopologySpec): ApplicationService {
    const service = new ApplicationService(
      spec.className,
      this.file(spec.sourcePath, spec.role ?? 'service-source'),
      spec.registration ?? null,
    );
    this.services.push(service);
    return service;
  }

  registration(registration: ApplicationRegistration): ApplicationRegistration {
    this.registrations.push(registration);
    return registration;
  }

  route(spec: ApplicationRouteTopologySpec): ApplicationRoute {
    const route = new ApplicationRoute(spec.path, spec.component, spec.title ?? null);
    this.routes.push(route);
    return route;
  }

  toTopology(): ApplicationTopology {
    return new ApplicationTopology(
      this.rootDir,
      this.entrypointValue,
      [...this.filesByKey.values()],
      [...this.components],
      [...this.services],
      [...this.registrations],
      [...this.styles],
      [...this.routes],
    );
  }

  private styleAsset(
    ownerKind: ApplicationStyleOwnerKind,
    spec: ApplicationStyleTopologySpec,
    fromPath: string | null = null,
  ): ApplicationStyleAsset {
    const file = spec.path == null
      ? null
      : this.file(spec.path, styleFileRoleForOwner(ownerKind));
    const importSpecifier = spec.importSpecifier ??
      (spec.path == null ? null : moduleSpecifier(fromPath ?? spec.path, spec.path, true));
    const style = new ApplicationStyleAsset(
      ownerKind,
      spec.assetKind,
      spec.sourceKind,
      file,
      importSpecifier,
    );
    this.styles.push(style);
    return style;
  }
}

function styleFileRoleForOwner(ownerKind: ApplicationStyleOwnerKind): Extract<ApplicationFileRole, 'component-style' | 'global-style'> {
  return ownerKind === 'component' ? 'component-style' : 'global-style';
}
