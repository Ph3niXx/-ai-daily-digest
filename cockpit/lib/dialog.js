// Dialog — toasts + confirm + prompt themés, remplacent alert/confirm/prompt natifs.
// API impérative exposée sur window (comme snooze.js), sans dépendance React :
//   cockpitToast(message, { kind })            -> non bloquant (info|success|error)
//   cockpitConfirm(message, { danger, ... })   -> Promise<boolean>
//   cockpitPrompt(message, defaultValue)       -> Promise<string|null>
// Themé via tokens CSS (.ck-* dans styles.css). Esc=annuler, Enter=confirmer,
// clic hors modale=annuler, focus restauré à la fermeture. textContent => pas d'injection.
// L'anim d'entrée est neutralisée par le kill-switch global prefers-reduced-motion.
(function () {
  function ensureContainer() {
    let c = document.getElementById("cockpit-toast-root");
    if (!c) {
      c = document.createElement("div");
      c.id = "cockpit-toast-root";
      c.className = "ck-toast-root";
      c.setAttribute("aria-live", "polite");
      document.body.appendChild(c);
    }
    return c;
  }

  function toast(message, opts) {
    opts = opts || {};
    const kind = opts.kind || "info";
    const el = document.createElement("div");
    el.className = "ck-toast ck-toast--" + kind;
    el.setAttribute("role", kind === "error" ? "alert" : "status");
    el.textContent = message;
    ensureContainer().appendChild(el);
    requestAnimationFrame(() => el.classList.add("is-in"));
    const close = () => {
      el.classList.remove("is-in");
      setTimeout(() => el.remove(), 220);
    };
    el.addEventListener("click", close);
    setTimeout(close, opts.duration || (kind === "error" ? 5200 : 3600));
    return close;
  }

  function modal(cfg) {
    return new Promise((resolve) => {
      const prev = document.activeElement;
      const overlay = document.createElement("div");
      overlay.className = "ck-dialog-overlay";

      const box = document.createElement("div");
      box.className = "ck-dialog";
      box.setAttribute("role", "dialog");
      box.setAttribute("aria-modal", "true");

      const msg = document.createElement("p");
      msg.className = "ck-dialog-msg";
      msg.textContent = cfg.message;
      box.appendChild(msg);

      let inputEl = null;
      if (cfg.prompt) {
        inputEl = document.createElement("input");
        inputEl.className = "ck-dialog-input";
        inputEl.type = "text";
        inputEl.value = cfg.defaultValue || "";
        box.appendChild(inputEl);
      }

      const actions = document.createElement("div");
      actions.className = "ck-dialog-actions";
      const cancelBtn = document.createElement("button");
      cancelBtn.className = "ck-dialog-btn ck-dialog-btn--cancel";
      cancelBtn.textContent = cfg.cancelLabel || "Annuler";
      const okBtn = document.createElement("button");
      okBtn.className = "ck-dialog-btn ck-dialog-btn--ok" + (cfg.danger ? " is-danger" : "");
      okBtn.textContent = cfg.confirmLabel || "Confirmer";
      actions.appendChild(cancelBtn);
      actions.appendChild(okBtn);
      box.appendChild(actions);

      overlay.appendChild(box);
      document.body.appendChild(overlay);

      const cleanup = (val) => {
        document.removeEventListener("keydown", onKey, true);
        overlay.classList.remove("is-in");
        setTimeout(() => overlay.remove(), 180);
        if (prev && prev.focus) { try { prev.focus(); } catch (e) {} }
        resolve(val);
      };
      const onConfirm = () => cleanup(cfg.prompt ? (inputEl.value || "") : true);
      const onCancel = () => cleanup(cfg.prompt ? null : false);
      const onKey = (e) => {
        if (e.key === "Escape") { e.preventDefault(); onCancel(); }
        else if (e.key === "Enter" && (!cfg.prompt || document.activeElement === inputEl)) { e.preventDefault(); onConfirm(); }
      };
      okBtn.addEventListener("click", onConfirm);
      cancelBtn.addEventListener("click", onCancel);
      overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) onCancel(); });
      document.addEventListener("keydown", onKey, true);

      requestAnimationFrame(() => {
        overlay.classList.add("is-in");
        (inputEl || okBtn).focus();
        if (inputEl) inputEl.select();
      });
    });
  }

  window.cockpitToast = toast;
  window.cockpitConfirm = function (message, opts) {
    opts = opts || {};
    return modal({ message, danger: opts.danger, confirmLabel: opts.confirmLabel, cancelLabel: opts.cancelLabel });
  };
  window.cockpitPrompt = function (message, defaultValue) {
    return modal({ message, prompt: true, defaultValue, confirmLabel: "Enregistrer" });
  };
})();
