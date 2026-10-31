const AWAY_TITLE = "Come back! 👀";

/** While the visitor is on another tab, the title asks them back and the eye in the favicon closes. */
export function initPresence() {
  const title = document.title;
  const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"][type="image/svg+xml"]');
  const open = icon?.href;
  const shut = icon && new URL("favicon-away.svg", icon.href).href;
  document.addEventListener("visibilitychange", () => {
    document.title = document.hidden ? AWAY_TITLE : title;
    if (icon) icon.href = (document.hidden ? shut : open)!;
  });
}
