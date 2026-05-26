// Formats a raw data path for display or copy.
// Alt-mode strips the "system." prefix and prepends "@" for inline roll syntax.
function _formatPath(path, useInlineFormat) {
  return useInlineFormat ? "@" + path.replace(/^system\./, "") : path;
}

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

  // Clean up listeners from the previous render to prevent stacking.
  if (app._keyHoverMoveHandler) {
    html[0].removeEventListener("mousemove", app._keyHoverMoveHandler);
  }
  if (app._keyHoverLeaveHandler) {
    html[0].removeEventListener("mouseleave", app._keyHoverLeaveHandler);
  }
  if (app._keyHoverDownHandler) {
    html[0].removeEventListener("mousedown", app._keyHoverDownHandler);
  }

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
    tip.style.left = `${event.clientX + 14}px`;
    tip.style.top = `${event.clientY + 14}px`;
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

    navigator.clipboard.writeText(text).then(() => {
      ui.notifications.info(`Copied: ${text}`);
    });
  };

  html[0].addEventListener("mousemove", app._keyHoverMoveHandler);
  html[0].addEventListener("mouseleave", app._keyHoverLeaveHandler);
  html[0].addEventListener("mousedown", app._keyHoverDownHandler);
});
