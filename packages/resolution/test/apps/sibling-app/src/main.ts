import { Aurelia } from "aurelia";
import { MyApp } from "./my-app";
import { NavBar } from "./nav-bar";
import { UserCard } from "./user-card";

/**
 * Application entry point.
 *
 * Registers components globally.
 */
Aurelia.register(NavBar, UserCard).app(MyApp).start();
