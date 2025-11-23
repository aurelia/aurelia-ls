export class MyApp {
  public message = "Hello World!";
  public count = 0;
  public items = [
    { name: "Alice" },
    { name: "Bob" },
  ];

  public get greeting(): string {
    return `Welcome ${this.message}`;
  }

  public increment(): void {
    this.count += 1;
  }
}
