export class Home {
  title = "Home";
  welcomeMessage = "Welcome to the Kitchen Sink Router Demo";
  visitCount = 0;

  binding() {
    this.visitCount++;
  }
}
