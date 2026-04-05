import path from "node:path";
import ts from "typescript";
import type { ClaimRouteRef } from "../../model/claims/claim-model.js";
import { ClaimHomeKind } from "../../model/claims/claim-model.js";
import type { QuestionRoute } from "../../query/framing/question-route.js";
import type { WorldFrame } from "../../query/framing/world-frame.js";
import { createLineageRef, type LineageRef } from "../../substrate/lineage/lineage-ref.js";
import {
  type CurrentWorldSummaryValue,
  type PublishedSubstrateClaim,
  type SubstrateClaimRef
} from "../../substrate/claims/substrate-claim-ref.js";
import { createCurrentWorldSummaryClaim } from "../../substrate/storage/substrate-storage.js";
import {
  TypeScriptProjectPort,
  type TypeScriptProjectGeneration
} from "../../typescript/programs/typescript-project-port.js";
import { WorkspacePackageRef } from "../packages/workspace-package.js";
import { ConsultedBoundaryKind, ConsultedBoundaryRef } from "../routes/consulted-boundary.js";
import {
  ConsultationRoleKind,
  ConstructorArchetypeKind,
  ConsultedWorldHandle,
  LookupRegimeKind,
  MaterializationTimingKind,
  NamingSurfaceKind,
  RegistrationPathKind,
  WorldRegimeKind
} from "./consulted-world.js";
import { ResourceAdmissionEvaluator, type RecognizedCustomElement } from "../../evaluators/resources/resource-admission-evaluator.js";
import type { CurrentWorldPublication } from "../snapshots/current-world-publication.js";

export class TypeScriptWorldConstruction {
  readonly #projectPort: TypeScriptProjectPort;
  readonly #resourceAdmissionEvaluator = new ResourceAdmissionEvaluator();

  public constructor(projectPort: TypeScriptProjectPort) {
    this.#projectPort = projectPort;
  }

  public publishCurrentWorldPublication(
    questionRoute: QuestionRoute,
    worldFrame: WorldFrame
  ): CurrentWorldPublication | undefined {
    return this.publishCurrentWorldPublicationForHome(
      questionRoute.claimRoute.home,
      worldFrame.version
    );
  }

  public readPublishedClaim(
    claimRoute: ClaimRouteRef,
    worldVersion: number
  ): PublishedSubstrateClaim | undefined {
    if (claimRoute.home !== ClaimHomeKind.CurrentWorldSummary) {
      return undefined;
    }

    const publication = this.publishCurrentWorldPublicationForHome(
      claimRoute.home,
      worldVersion
    );

    if (publication === undefined) {
      return undefined;
    }

    return createCurrentWorldSummaryClaim(
      claimRoute.home,
      worldVersion,
      createCurrentWorldSummary(publication),
      publication
    );
  }

  public readLineage(ref: SubstrateClaimRef): LineageRef | undefined {
    if (ref.home !== ClaimHomeKind.CurrentWorldSummary) {
      return undefined;
    }

    return createLineageRef(ref.home, ref.worldVersion);
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
    const boundary = new ConsultedBoundaryRef(
      ConsultedBoundaryKind.Package,
      consultedPackage.rootPath
    );
    const worldRef = [
      "consulted-world",
      consultedPackage.packageName ?? "anonymous-package",
      `${worldVersion}`
    ].join(":");
    const consultedWorld = new ConsultedWorldHandle(
      worldRef,
      boundary,
      [boundary],
      selectConsultationRole(home),
      WorldRegimeKind.DefinitionMerge,
      consultedPackage.rootPath,
      RegistrationPathKind.ResourceRegistration,
      [ConstructorArchetypeKind.AggregateBundle],
      LookupRegimeKind.CurrentPlusRootResource,
      MaterializationTimingKind.Eager,
      [NamingSurfaceKind.ExportName, NamingSurfaceKind.ResourceName]
    );

    return this.#resourceAdmissionEvaluator.publishCurrentWorldPublication(
      consultedWorld,
      consultedPackage,
      scanCustomElements(generation)
    );
  }
}

export function createCurrentWorldSummary(
  publication: CurrentWorldPublication
): CurrentWorldSummaryValue {
  return {
    publishedClaimCount: 1,
    consultedPackageCount: 1,
    recognizedResourceCount: publication.recognizedResourceCount,
    admittedResourceCount: publication.admittedResourceCount,
    activeResourceCount: publication.activeResourceCount
  };
}

function selectConsultationRole(
  home: ClaimHomeKind
): ConsultationRoleKind {
  return home === ClaimHomeKind.CurrentWorldSummary
    ? ConsultationRoleKind.CurrentWorldActiveLocalWorld
    : ConsultationRoleKind.AdmittedRegistrationWorld;
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

function scanCustomElements(
  generation: TypeScriptProjectGeneration
): readonly RecognizedCustomElement[] {
  const customElements: RecognizedCustomElement[] = [];

  for (const sourceFile of generation.listSemanticSourceFiles()) {
    for (const statement of sourceFile.statements) {
      if (!ts.isClassDeclaration(statement) || statement.name === undefined) {
        continue;
      }

      if (!isExportedClass(statement)) {
        continue;
      }

      const resourceName = readCustomElementName(statement);
      if (resourceName === undefined) {
        continue;
      }

      customElements.push(
        {
          className: statement.name.text,
          exportName: statement.name.text,
          resourceName,
          fileName: sourceFile.fileName
        }
      );
    }
  }

  return customElements;
}

function isExportedClass(node: ts.ClassDeclaration): boolean {
  return node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function readCustomElementName(node: ts.ClassDeclaration): string | undefined {
  const decorators = ts.canHaveDecorators(node)
    ? ts.getDecorators(node)
    : undefined;
  if (decorators === undefined) {
    return undefined;
  }

  for (const decorator of decorators) {
    if (!ts.isCallExpression(decorator.expression)) {
      continue;
    }

    if (!ts.isIdentifier(decorator.expression.expression)) {
      continue;
    }

    if (decorator.expression.expression.text !== "customElement") {
      continue;
    }

    const [firstArgument] = decorator.expression.arguments;
    if (firstArgument !== undefined && ts.isStringLiteralLike(firstArgument)) {
      return firstArgument.text;
    }
  }

  return undefined;
}

function isTypeScriptLibraryFile(fileName: string): boolean {
  return fileName.includes("/node_modules/typescript/lib/") ||
    fileName.includes("\\node_modules\\typescript\\lib\\");
}
