/**
 * Application entry point.
 * Registers resources and starts the app.
 */
import { Aurelia, Registration } from "aurelia";
import { MyApp } from "./my-app";
import { CortexDevices } from "./cortex-devices";
import { UserProfile } from "./user-profile";
import { DateFormatValueConverter } from "./date-format";

const au = new Aurelia();
au.register(
  CortexDevices,
  UserProfile,
  DateFormatValueConverter,
);
au.app(MyApp);
au.start();
