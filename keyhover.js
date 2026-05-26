/**
 * KeyHover — Foundry VTT Module
 * Adds a per-sheet toggle that reveals the underlying data path of any
 * named field or data-property element on actor sheets.
 *
 * Hover               → tooltip shows the raw data path
 * Alt + Hover         → tooltip shows inline roll syntax  (@abilities.dex.mod)
 * Middle / Ctrl+Click → copies the path to the clipboard
 * Alt + Middle/Ctrl   → copies the inline roll syntax
 *
 * Compatible with Foundry VTT V11+ (ApplicationV1 actor sheets).
 * System-agnostic — relies solely on standard `name` and `data-property` attributes.
 */

// Formats a raw data path for display or copy.
// When useInlineFormat is true, strips the leading "system." prefix and prepends "@"
// to produce a valid Foundry inline roll reference (e.g. @abilities.dex.mod).
function _formatPath(path, useInlineFormat) {
  return useInlineFormat ? "@" + path.replace(/^system\./, "") : path;
}

// Create the shared floating tooltip once when the world is ready.
// The guard prevents duplicate elements if the module is reloaded during development.
Hooks.once("ready", () => {
  if (document.getElementById("keyhover-tooltip")) return;
  const tip = document.createElement("div");
  tip.id = "keyhover-tooltip";
  tip.hidden = true;
  document.body.appendChild(tip);
});

// Inject the toggle button into every editable actor sheet header.
Hooks.on("getActorSheetHeaderButtons", (app, buttons) => {
  if (!app.isEditable) return;

  if (app._keyHoverActive === undefined) app._keyHoverActive = false;

  buttons.unshift({
    label: "KeyHover",
    class: "keyhover-toggle",
    icon: "fas fa-key",
    onclick: () => {
      app._keyHoverActive = !app._keyHoverActive;
      console.log(`KeyHover for ${app.actor.name} is now ${app._keyHoverActive ? "ON" : "OFF"}`);
      if (!app._keyHoverActive) {
        const tip = document.getElementById("keyhover-tooltip");
        if (tip) tip.hidden = true;
      }
      app.element.find(".keyhover-toggle").toggleClass("active", app._keyHoverActive);
    }
  });
});

// Main logic — runs after each render to (re)attach listeners and restore toggle state.
Hooks.on("renderActorSheet", (app, html) => {
  // Restore active class if the toggle was on before re-render.
  if (app._keyHoverActive) {
    html.find(".keyhover-toggle").addClass("active");
  }

  // Remove stale listeners before attaching fresh ones.
  // Foundry V11/V12 may reuse the same root element across soft re-renders,
  // so we cannot rely on the element being replaced to clear old handlers.
  if (app._keyHoverMoveHandler)  html[0].removeEventListener("mousemove",  app._keyHoverMoveHandler);
  if (app._keyHoverLeaveHandler) html[0].removeEventListener("mouseleave", app._keyHoverLeaveHandler);
  if (app._keyHoverDownHandler)  html[0].removeEventListener("mousedown",  app._keyHoverDownHandler);

  const tip = document.getElementById("keyhover-tooltip");

  // Hide tooltip and clear tracked path when the cursor leaves the sheet.
  app._keyHoverLeaveHandler = () => {
    app._keyHoverLastPath = null;
    if (tip) tip.hidden = true;
  };

  // Track cursor position and update tooltip over valid data elements.
  app._keyHoverMoveHandler = (event) => {
    if (!app._keyHoverActive) {
      if (tip) tip.hidden = true;
      return;
    }

    const el = event.target.closest("[name], [data-property]");

    if (!el) {
      app._keyHoverLastPath = null;
      if (tip) tip.hidden = true;
      return;
    }

    const path = el.getAttribute("name") || el.getAttribute("data-property");

    tip.textContent = _formatPath(path, event.altKey);
    tip.hidden = false;
    // Offset from the cursor so the tooltip does not obscure the element being inspected.
    tip.style.left = `${event.clientX + 14}px`;
    tip.style.top  = `${event.clientY + 14}px`;
    app._keyHoverLastPath = path;
  };

  // Copy data path on Middle-Click or Ctrl+Left-Click.
  app._keyHoverDownHandler = (event) => {
    if (!app._keyHoverActive) return;

    const isMiddleClick = event.button === 1;
    const isCtrlClick  = event.button === 0 && event.ctrlKey;
    if (!isMiddleClick && !isCtrlClick) return;

    const el = event.target.closest("[name], [data-property]");
    if (!el) return;

    event.preventDefault();

    const path = el.getAttribute("name") || el.getAttribute("data-property");
    const text = _formatPath(path, event.altKey);

    // navigator.clipboard requires a secure context (HTTPS or localhost).
    // Foundry VTT satisfies this in all normal deployments, but we guard defensively.
    if (!navigator.clipboard) {
      ui.notifications.warn("KeyHover: Clipboard API unavailable in this context.");
      return;
    }

    navigator.clipboard.writeText(text).then(() => {
      ui.notifications.info(`Copied: ${text}`);
    }).catch(() => {
      ui.notifications.warn("KeyHover: Could not write to clipboard.");
    });
  };

  html[0].addEventListener("mousemove",  app._keyHoverMoveHandler);
  html[0].addEventListener("mouseleave", app._keyHoverLeaveHandler);
  html[0].addEventListener("mousedown",  app._keyHoverDownHandler);
});
