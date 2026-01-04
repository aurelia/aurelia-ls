import { IRouteableComponent, type Params } from "@aurelia/router";

export class User implements IRouteableComponent {
  static parameters = ["id"];

  id: string = "";
  name: string = "";
  role: string = "";
  isLoading = true;

  // Simulated user data
  private userData: Record<string, { name: string; role: string }> = {
    "1": { name: "Alice", role: "Admin" },
    "2": { name: "Bob", role: "User" },
    "3": { name: "Charlie", role: "Moderator" },
  };

  load(params: Params) {
    this.id = params.id as string;
    const data = this.userData[this.id];
    if (data) {
      this.name = data.name;
      this.role = data.role;
    }
    this.isLoading = false;
  }
}
