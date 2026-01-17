import type { TypeScriptServices } from "@aurelia-ls/compiler";
import type { Logger } from "@aurelia-ls/resolution";
import { createPathUtils, type PathUtils } from "./paths.js";
import { OverlayFs } from "./overlay-fs.js";
import { TsService, type TsServiceConfig } from "./ts-service.js";
import { TsServicesAdapter } from "./typescript-services.js";
import { VmReflectionService } from "./vm-reflection.js";
import { ProjectProgram, type TypeScriptProject } from "./project.js";

export interface TypeScriptEnvironment {
  readonly paths: PathUtils;
  readonly overlayFs: OverlayFs;
  readonly tsService: TsService;
  readonly typescript: TypeScriptServices;
  readonly vmReflection: VmReflectionService;
  readonly project: TypeScriptProject;
}

export interface TypeScriptEnvironmentOptions extends TsServiceConfig {
  readonly logger: Logger;
}

export function createTypeScriptEnvironment(options: TypeScriptEnvironmentOptions): TypeScriptEnvironment {
  const paths = createPathUtils();
  const overlayFs = new OverlayFs(paths);
  const tsService = new TsService(overlayFs, paths, options.logger);
  const project = new ProjectProgram({
    logger: options.logger,
    paths,
    workspaceRoot: options.workspaceRoot ?? null,
    tsconfigPath: options.tsconfigPath ?? null,
    configFileName: options.configFileName,
  });
  if (options.workspaceRoot || options.tsconfigPath || options.configFileName) {
    tsService.configure({
      workspaceRoot: options.workspaceRoot ?? null,
      tsconfigPath: options.tsconfigPath ?? null,
      configFileName: options.configFileName,
    });
  }
  const typescript = new TsServicesAdapter(tsService, paths);
  const vmReflection = new VmReflectionService(tsService, paths, options.logger);
  return { paths, overlayFs, tsService, typescript, vmReflection, project };
}
