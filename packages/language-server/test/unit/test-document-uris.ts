import path from "node:path";
import { pathToFileURL } from "node:url";
import { WorkspaceDocumentUris } from "../../src/utils/document-uri.js";

export function testWorkspaceDocumentUris(workspaceRoot: string): WorkspaceDocumentUris {
  const documentUris = new WorkspaceDocumentUris();
  documentUris.configure(pathToFileURL(path.resolve(workspaceRoot)).toString());
  return documentUris;
}
