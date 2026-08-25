declare module 'aurelia' {
  export const bindable: any;
  export const customAttribute: any;
  export const customElement: any;
  export const INode: any;
  export const resolve: any;
  export const valueConverter: any;

  const Aurelia: {
    app(config: unknown): {
      start(): Promise<void> | void;
    };
  };

  export default Aurelia;
}
