Hooks.once("ready", () => {
  if (document.getElementById("keyhover-tooltip")) return;
  const tip = document.createElement("div");
  tip.id = "keyhover-tooltip";
  tip.hidden = true;
  document.body.appendChild(tip);
});

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

Hooks.on("renderActorSheet", (app, html) => {
  if (app._keyHoverActive) {
    html.find(".keyhover-toggle").addClass("active");
  }

  if (app._keyHoverMoveHandler) {
    html[0].removeEventListener("mousemove", app._keyHoverMoveHandler);
  }
  if (app._keyHoverLeaveHandler) {
    html[0].removeEventListener("mouseleave", app._keyHoverLeaveHandler);
  }

  const tip = document.getElementById("keyhover-tooltip");

  app._keyHoverLeaveHandler = () => {
    app._keyHoverLastPath = null;
    if (tip) tip.hidden = true;
  };

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
    const display = event.altKey ? "@" + path.replace(/^system\./, "") : path;

    tip.textContent = display;
    tip.hidden = false;
    tip.style.left = `${event.clientX + 14}px`;
    tip.style.top = `${event.clientY + 14}px`;
    app._keyHoverLastPath = path;
  };

  html[0].addEventListener("mousemove", app._keyHoverMoveHandler);
  html[0].addEventListener("mouseleave", app._keyHoverLeaveHandler);
});
