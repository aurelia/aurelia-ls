import { customElement } from "@aurelia/runtime-html";
import template from "./controllers-branches.html";

interface User {
  displayName: string;
}

interface ActiveUser extends User {
  task: Promise<User>;
}

interface Detail {
  title: string;
}

@customElement({ name: "controllers-branches", template })
export class ControllersBranches {
  isReady = true;
  activeUser: ActiveUser = {
    displayName: "Ada Lovelace",
    task: Promise.resolve({ displayName: "Ada Lovelace" }),
  };
  userPromise: Promise<User> = Promise.resolve({ displayName: "Grace Hopper" });
  detailPromise: Promise<Detail> = Promise.resolve({ title: "Detail" });
  mode = "primary";
  modePrimary = "primary";
}
