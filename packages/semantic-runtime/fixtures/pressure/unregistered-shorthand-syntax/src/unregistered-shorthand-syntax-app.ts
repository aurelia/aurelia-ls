export class UnregisteredShorthandSyntaxApp {
  value = 'draft';
  label = 'Save';

  save(): void {
    this.label = 'Saved';
  }
}
