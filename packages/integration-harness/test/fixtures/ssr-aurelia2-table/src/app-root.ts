export class AppRoot {
  public items = [
    { name: "Amp Deluxe" },
    { name: "Cab Classic" },
    { name: "FX Chorus" },
  ];

  public filters = [
    { value: "", keys: ["name"] },
  ];

  public $displayData: Array<{ name: string }> = [];
}
