// Self-hosted fonts (bundled, no runtime network requests). Latin subset only — the UI
// is English-only, so shipping cyrillic/greek/vietnamese subsets would be dead weight.
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import "@fontsource/jetbrains-mono/latin-600.css";
import "@fontsource/jetbrains-mono/latin-700.css";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";

import "./styles/tokens.css";
import "./styles/app.css";

import { mountApp } from "./ui/app";

const root = document.querySelector<HTMLDivElement>("#app");
if (root) {
  mountApp(root);
}
