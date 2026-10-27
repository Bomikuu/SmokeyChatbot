export const createSmokeySurface = (host: HTMLElement, stylesheetUrl: string, inlineCss = "") => {
  if (
    host.childNodes.length ||
    (host.shadowRoot && (host.dataset.smokeySurface !== "v1" || host.shadowRoot.childNodes.length))
  )
    throw new Error("Smokey needs an empty owned container.");
  host.dataset.smokeySurface = "v1";
  const root = host.shadowRoot || host.attachShadow({ mode: "open" });
  const sheet = stylesheetUrl ? document.createElement("link") : document.createElement("style");
  if (sheet instanceof HTMLLinkElement) {
    sheet.rel = "stylesheet";
    sheet.href = stylesheetUrl;
  } else sheet.textContent = inlineCss;
  const content = document.createElement("div"),
    portal = document.createElement("div");
  content.className = "smokey-root bg-background text-foreground";
  portal.className = "smokey-root text-foreground";
  root.append(sheet, content, portal);
  return {
    host,
    root,
    content,
    portal,
    setTheme: (theme: "light" | "dark") => {
      for (const node of [content, portal]) {
        node.classList.toggle("dark", theme === "dark");
        node.style.colorScheme = theme;
      }
    },
    destroy: () => {
      root.replaceChildren();
    },
  };
};
export type SmokeySurface = ReturnType<typeof createSmokeySurface>;
