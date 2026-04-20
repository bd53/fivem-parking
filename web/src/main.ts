import { mount } from "svelte";
import App from "./App.svelte";
import "./index.scss";

if (import.meta.env.DEV) {
        import("./mock");
}

mount(App, { target: document.getElementById("app")! });
