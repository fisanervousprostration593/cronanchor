// Self-hosted fonts (bundled, no runtime network requests).
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/jetbrains-mono/700.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";

import "./styles/tokens.css";
import "./styles/app.css";

import { mountApp } from "./ui/app";

const root = document.querySelector<HTMLDivElement>("#app");
if (root) {
  mountApp(root);
}
