export class NodeTypesApp {
  private readonly payload = Buffer.from('semantic-runtime');

  get bufferSize(): number {
    return this.payload.byteLength;
  }
}
