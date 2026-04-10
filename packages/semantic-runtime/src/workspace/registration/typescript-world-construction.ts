import path from "node:path";
import ts from "typescript";
import { ClaimHomeKind } from "../../model/claims/claim-model.js";
import {
  getQuestionRouteClaimRoute,
  type QuestionRoute
} from "../../query/framing/question-route.js";
import type { WorldFrame } from "../../query/framing/world-frame.js";
import {
  TypeScriptProjectPort,
  type TypeScriptProjectGeneration
} from "../../typescript/programs/typescript-project-port.js";
import { WorkspacePackageRef } from "../packages/workspace-package.js";
import { ConsultedBoundaryKind, ConsultedBoundaryRef } from "../routes/consulted-boundary.js";
import {
  ConsultedWorldHandle,
} from "./consulted-world.js";
import { CurrentWorldPublicationAssembler } from "../snapshots/current-world-publication-assembler.js";
import type { CurrentWorldPublication } from "../snapshots/current-world-publication.js";
import { CustomElementDeclarationScanner } from "./custom-element-declaration-scanner.js";
import { ExtensionConfigurationScanner } from "./extension-configuration-scanner.js";
import { RegistrationPatternScanner } from "./registration-pattern-scanner.js";
import { TemplateSourceAssociationScanner } from "./template-source-association-scanner.js";
import { CurrentWorldConstructionPlan } from "./current-world-construction-plan.js";

export class TypeScriptWorldConstruction {
  readonly #projectPort: TypeScriptProjectPort;
  readonly #publicationAssembler = new CurrentWorldPublicationAssembler();
  readonly #declarationScanner = new CustomElementDeclarationScanner();
  readonly #extensionConfigurationScanner = new ExtensionConfigurationScanner();
  readonly #registrationPatternScanner = new RegistrationPatternScanner();
  readonly #templateAssociationScanner = new TemplateSourceAssociationScanner();

  public constructor(projectPort: TypeScriptProjectPort) {
    this.#projectPort = projectPort;
  }

  public publishCurrentWorldPublication(
    questionRoute: QuestionRoute,
    worldFrame: WorldFrame
  ): CurrentWorldPublication | undefined {
    return this.publishCurrentWorldPublicationForHome(
      getQuestionRouteClaimRoute(questionRoute).home,
      worldFrame.version
    );
  }

  public publishCurrentWorldPublicationForHome(
    home: ClaimHomeKind,
    worldVersion: number
  ): CurrentWorldPublication | undefined {
    const generation = this.#projectPort.publishCurrentGeneration();
    if (generation === undefined) {
      return undefined;
    }

    const consultedPackage = resolveConsultedPackage(generation);
    const resourceScan = this.#declarationScanner.scan(generation);
    const extensionScan = this.#extensionConfigurationScanner.scan(generation);
    const registrationScan = this.#registrationPatternScanner.scan(generation);
    const templateAssociations = this.#templateAssociationScanner.scan(
      generation,
      resourceScan.recognizedElements
    );
    const consultedWorld = new CurrentWorldConstructionPlan(
      home,
      resourceScan,
      extensionScan,
      registrationScan
    ).createConsultedWorldHandle(
      consultedPackage,
      worldVersion
    );

    return this.#publicationAssembler.publishCurrentWorldPublication(
      consultedWorld,
      consultedPackage,
      resourceScan,
      extensionScan,
      registrationScan,
      templateAssociations
    );
  }
}

function resolveConsultedPackage(
  generation: TypeScriptProjectGeneration
): WorkspacePackageRef {
  const projectRoot = generation.projectRoot ?? resolveCommonProjectRoot(generation.program);
  const manifestPath = path.join(projectRoot, "package.json");

  if (!ts.sys.fileExists(manifestPath)) {
    return new WorkspacePackageRef(projectRoot);
  }

  try {
    const manifestText = ts.sys.readFile(manifestPath);
    if (manifestText === undefined) {
      return new WorkspacePackageRef(projectRoot);
    }

    const manifest = JSON.parse(manifestText) as { readonly name?: string };
    return new WorkspacePackageRef(projectRoot, manifest.name);
  } catch {
    return new WorkspacePackageRef(projectRoot);
  }
}

function resolveCommonProjectRoot(program: ts.Program): string {
  const semanticFiles = program.getSourceFiles().filter(
    (sourceFile) => !sourceFile.isDeclarationFile && !isTypeScriptLibraryFile(sourceFile.fileName)
  );
  if (semanticFiles.length === 0) {
    return "/";
  }

  const directories = semanticFiles.map((sourceFile) => path.dirname(sourceFile.fileName));
  let commonRoot = directories[0] ?? "/";

  for (const directory of directories.slice(1)) {
    while (!directory.startsWith(commonRoot) && commonRoot.length > 1) {
      commonRoot = path.dirname(commonRoot);
    }
  }

  return commonRoot;
}

function isTypeScriptLibraryFile(fileName: string): boolean {
  return fileName.includes("/node_modules/typescript/lib/") ||
    fileName.includes("\\node_modules\\typescript\\lib\\");
}
