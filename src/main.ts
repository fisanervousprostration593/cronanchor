import { APP_NAME, APP_TAGLINE } from "./core/meta";

// Placeholder bootstrap — the real UI is wired up in Phase 4.
const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  app.innerHTML = `<main><h1>${APP_NAME}</h1><p>${APP_TAGLINE}</p></main>`;
}
