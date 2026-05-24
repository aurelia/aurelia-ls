export class ProjectDiagnosticState {
  readonly summary: string = 42;

  registerInvalidDomListener(): void {
    document.addEventListener('click', 123);
  }
}
