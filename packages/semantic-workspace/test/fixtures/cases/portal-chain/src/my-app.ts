import { customElement } from "@aurelia/runtime-html";
import template from "./my-app.html";

type HostContext = {
  title: string;
  note: string;
};

@customElement({ name: "portal-chain", template })
export class PortalChain {
  showPortal = true;
  target = "#overlay";
  host: HostContext = { title: "Portal", note: "Pinned" };

  close(): void {
    this.showPortal = false;
  }
}
