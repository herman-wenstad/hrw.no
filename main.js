// Web3Forms access key — get one at https://web3forms.com (free) and paste it here.
const WEB3FORMS_KEY = "YOUR_ACCESS_KEY";

const LOREM_1 = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";
const LOREM_2 = "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";

// Mock content — two items per role. Replace `shot` with an image path when ready.
const WORK = {
  founder: {
    title: "Founder.",
    items: [
      { name: "plyo", role: "Co-Founder & CPO", shot: null, text: [LOREM_1, LOREM_2] },
      { name: "Company Two", role: "Founder & CEO", shot: null, text: [LOREM_1, LOREM_2] },
    ],
  },
  advisor: {
    title: "Advisor.",
    items: [
      { name: "Client One", role: "Board Advisor", shot: null, text: [LOREM_1, LOREM_2] },
      { name: "Client Two", role: "Product Advisor", shot: null, text: [LOREM_1, LOREM_2] },
    ],
  },
  maker: {
    title: "Maker.",
    items: [
      { name: "Smuud", role: "Designer & Developer", shot: null, text: [LOREM_1, LOREM_2] },
      { name: "Transkriber", role: "Designer & Developer", shot: null, text: [LOREM_1, LOREM_2] },
    ],
  },
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const workModal = document.getElementById("work-modal");
const contactModal = document.getElementById("contact-modal");

function renderWork(key) {
  const data = WORK[key];
  document.getElementById("work-title").textContent = data.title;
  document.getElementById("work-body").innerHTML = data.items.map((item) => `
    <article class="work">
      <div class="work-logo"><i aria-hidden="true"></i>${esc(item.name)}</div>
      ${item.shot
        ? `<img class="work-shot" src="${esc(item.shot)}" alt="${esc(item.name)} screenshot">`
        : `<div class="work-shot" aria-hidden="true">Screenshot</div>`}
      <h3>${esc(item.role)}</h3>
      ${item.text.map((p) => `<p>${esc(p)}</p>`).join("")}
    </article>`).join("");
}

function open(key) {
  if (key === "contact") {
    contactModal.showModal();
  } else {
    renderWork(key);
    workModal.showModal();
    workModal.scrollTop = 0;
  }
}

document.querySelectorAll("[data-modal]").forEach((btn) =>
  btn.addEventListener("click", () => open(btn.dataset.modal))
);

// After a modal closes, the rest of that wheel gesture (incl. trackpad
// momentum) must not scroll the page behind it (it would snap to About).
// Locked synchronously at close; unlocks after a short pause in wheel input.
let pageLocked = false, pageLockLast = 0, pageLockStart = 0;
function closeDialog(dlg) {
  pageLocked = true;
  pageLockLast = pageLockStart = performance.now();
  dlg.close();
}

// Fade out, then close (×, Esc, click outside).
function closeModal(dlg) {
  if (!dlg.open || dlg.classList.contains("closing")) return;
  dlg.classList.add("closing");
  setTimeout(() => {
    dlg.classList.remove("closing");
    closeDialog(dlg);
  }, 250);
}

// ---------- Pull-to-close ----------
// At the bottom of a modal, scrolling/swiping further down pushes the sheet up
// and off the top. Two steps, so it's never closed by accident:
//   1. The first push past the bottom only bounces (capped, springs back),
//      briefly revealing the sheet's bottom edge and the page underneath.
//   2. A new, separate push then moves the sheet with the gesture; on release
//      it slides off the top (past the threshold) or springs back.
// Scrolling back up into the content resets to step 1.

const DISMISS_AT = 110;   // px of sheet travel needed to close on release
const RESIST = 0.85;      // sheet travel per px of input
const BOUNCE_MAX = 64;    // px the first (hint) push can move the sheet
const bounce = (input) => BOUNCE_MAX * (1 - Math.exp(-input / 90));

// Drives --pull (px, negative = up) with an eased rAF loop.
function createSheet(dlg) {
  let target = 0, shown = 0, follow = 0.35, raf = null, onArrive = null;
  const apply = () => dlg.style.setProperty("--pull", `${(-shown).toFixed(1)}px`);
  const tick = () => {
    shown += (target - shown) * follow;
    if (Math.abs(target - shown) < 0.5) shown = target;
    apply();
    if (onArrive && onArrive()) { onArrive = null; raf = null; return; }
    raf = shown !== target ? requestAnimationFrame(tick) : null;
  };
  const moveTo = (px, f = 0.35, done = null) => {
    target = Math.max(0, px);
    follow = f;
    onArrive = done;
    if (!raf) raf = requestAnimationFrame(tick);
  };
  return {
    get target() { return target; },
    drag: (px, f) => moveTo(px, f),
    springBack: () => moveTo(0, 0.2),
    dismiss: () => moveTo(window.innerHeight * 1.15, 0.16, () => {
      if (shown < window.innerHeight) return false;
      closeDialog(dlg);
      return true;
    }),
    reset: () => {
      cancelAnimationFrame(raf);
      raf = null;
      onArrive = null;
      target = shown = 0;
      dlg.style.removeProperty("--pull");
    },
  };
}

document.querySelectorAll("dialog.modal").forEach((dlg) => {
  dlg.querySelector(".modal-close").addEventListener("click", () => closeModal(dlg));
  // Close when clicking empty space around the content column.
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) closeModal(dlg);
  });
  dlg.addEventListener("cancel", (e) => {
    e.preventDefault();
    closeModal(dlg);
  });

  const sheet = createSheet(dlg);
  dlg.addEventListener("close", () => sheet.reset());

  const finish = () => (sheet.target > DISMISS_AT ? sheet.dismiss() : sheet.springBack());

  // Step 1 → 2 state. `closeReady` is set once the bounce has happened.
  let closeReady = false;
  const setReady = (on) => { closeReady = on; };
  dlg.addEventListener("close", () => setReady(false));
  dlg.addEventListener("scroll", () => {
    if (closeReady && dlg.scrollHeight - dlg.clientHeight - dlg.scrollTop > 40) setReady(false);
  }, { passive: true });

  // Moves the sheet for a gesture in the given mode, and ends it.
  const dragFor = (mode, input, f) =>
    sheet.drag(mode === "hint" ? bounce(input) : input * RESIST, f);
  const endFor = (mode) => {
    if (mode === "hint") {
      sheet.springBack();
      setReady(true);
    } else {
      finish();
    }
  };

  const atBottom = () => dlg.scrollTop + dlg.clientHeight >= dlg.scrollHeight - 2;

  // Ignore gestures inside a textarea that can still scroll down.
  const inScrollableField = (t) => {
    const ta = t.closest && t.closest("textarea");
    return ta && ta.scrollTop + ta.clientHeight < ta.scrollHeight - 1;
  };
  // A textarea that can scroll in this direction keeps native wheel scrolling.
  const textareaTakes = (t, dy) => {
    const ta = t.closest && t.closest("textarea");
    if (!ta) return false;
    return dy > 0 ? ta.scrollTop + ta.clientHeight < ta.scrollHeight - 1 : ta.scrollTop > 0;
  };

  // The modal scrolls its own content on wheel input (always preventDefault).
  // Browsers decide at the start of a trackpad gesture whether it scrolls
  // natively; if the sheet takes a gesture and hands it back halfway, native
  // scrolling stays frozen until the fingers lift. Owning the scroll avoids that.
  // Small (trackpad) deltas apply 1:1; big (mouse wheel) steps glide.
  let scrollTarget = 0, scrollRaf = null;
  const maxScroll = () => dlg.scrollHeight - dlg.clientHeight;
  const scrollContent = (dy) => {
    if (Math.abs(dy) < 50) {
      cancelAnimationFrame(scrollRaf);
      scrollRaf = null;
      dlg.scrollTop += dy;
      scrollTarget = dlg.scrollTop;
      return;
    }
    if (!scrollRaf) scrollTarget = dlg.scrollTop;
    scrollTarget = Math.max(0, Math.min(maxScroll(), scrollTarget + dy));
    const step = () => {
      const d = scrollTarget - dlg.scrollTop;
      if (Math.abs(d) < 1) { dlg.scrollTop = scrollTarget; scrollRaf = null; return; }
      dlg.scrollTop += d * 0.25;
      scrollRaf = requestAnimationFrame(step);
    };
    if (!scrollRaf) scrollRaf = requestAnimationFrame(step);
  };
  const wheelPx = (e) => (e.deltaMode === 1 ? e.deltaY * 40 : e.deltaMode === 2 ? e.deltaY * dlg.clientHeight : e.deltaY);
  dlg.addEventListener("close", () => { cancelAnimationFrame(scrollRaf); scrollRaf = null; });

  // Mouse wheel / trackpad.
  // Trackpad momentum keeps firing wheel events with *decaying* deltas after the
  // fingers lift. So: arriving at the bottom on momentum doesn't start a pull (a
  // fresh push is recognised by a pause before it, or by growing deltas), and
  // once pulling, decaying deltas mean the fingers lifted = release.
  let pull = 0, armed = false, mode = "hint", swallow = false, lastWheel = 0, lastAbs = 0, decays = 0, idle;
  const releaseWheel = () => {
    clearTimeout(idle);
    if (!armed) return;
    armed = false;
    swallow = true; // ignore the rest of this gesture's momentum
    pull = 0;
    endFor(mode);
  };
  dlg.addEventListener("wheel", (e) => {
    const dy = wheelPx(e);
    if (textareaTakes(e.target, dy)) return; // native textarea scrolling
    e.preventDefault();
    if (dlg.classList.contains("closing")) return;

    const now = performance.now();
    const abs = Math.abs(dy);
    const gap = now - lastWheel;
    const prevAbs = lastAbs;
    lastWheel = now;
    lastAbs = abs;
    if (gap > 150) swallow = false; // a new gesture

    if (armed) {
      // Reversing during the bounce, or back past the start of a close drag:
      // the content scrolls again straight away.
      if (dy < 0 && (mode === "hint" || pull + dy <= 0)) {
        clearTimeout(idle);
        armed = false;
        pull = 0;
        sheet.springBack();
        scrollContent(dy);
        return;
      }
      decays = abs < prevAbs ? decays + 1 : 0;
      if (decays >= 4) return releaseWheel();
      pull = Math.max(0, pull + dy); // down adds, up takes back
      if (mode === "hint") pull = Math.min(pull, 200); // bounce is capped; so is the input to undo
      dragFor(mode, pull);
      clearTimeout(idle);
      idle = setTimeout(releaseWheel, 180);
      return;
    }

    const fresh = gap > 150 || abs > prevAbs * 1.15 + 1;
    if (!swallow && dy > 0 && atBottom() && !scrollRaf && fresh) {
      armed = true;
      mode = closeReady ? "close" : "hint";
      decays = 0;
      pull = abs;
      dragFor(mode, pull);
      idle = setTimeout(releaseWheel, 180);
      return;
    }
    scrollContent(dy);
  }, { passive: false });

  // Touch: at the bottom, drag up; release to close or spring back.
  // A quick flick closes even if it's short.
  let startY = null, lastY = 0, lastT = 0, vy = 0, dragging = false, touchMode = "hint";
  dlg.addEventListener("touchstart", (e) => {
    dragging = false;
    touchMode = closeReady ? "close" : "hint";
    vy = 0;
    startY = atBottom() && !inScrollableField(e.target) ? e.touches[0].clientY : null;
    lastY = startY;
    lastT = performance.now();
  }, { passive: true });
  dlg.addEventListener("touchmove", (e) => {
    if (startY === null) return;
    const y = e.touches[0].clientY;
    const dy = startY - y; // upward finger travel
    if (!dragging && dy <= 0) { startY = null; return; } // scrolling content instead
    dragging = true;
    e.preventDefault(); // stop native bounce while dragging the sheet
    const now = performance.now();
    vy = (lastY - y) / Math.max(1, now - lastT); // upward speed
    lastY = y;
    lastT = now;
    dragFor(touchMode, dy, 1);
  }, { passive: false });
  const endTouch = () => {
    if (dragging) {
      if (touchMode === "close" && vy > 0.6 && sheet.target > 30) sheet.dismiss();
      else endFor(touchMode);
    }
    startY = null;
    dragging = false;
  };
  dlg.addEventListener("touchend", endTouch);
  dlg.addEventListener("touchcancel", endTouch);
});

window.addEventListener("wheel", (e) => {
  if (!pageLocked || e.target.closest("dialog[open]")) return;
  const now = performance.now();
  if (now - pageLockLast > 200 || now - pageLockStart > 2500) { pageLocked = false; return; }
  pageLockLast = now;
  e.preventDefault();
}, { passive: false });

// Contact form → Web3Forms
const form = document.getElementById("contact-form");
const status = document.getElementById("form-status");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  status.className = "form-status";

  if (WEB3FORMS_KEY === "YOUR_ACCESS_KEY") {
    status.textContent = "Form not connected yet — email herman@hrw.no instead.";
    status.classList.add("err");
    return;
  }

  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  status.textContent = "Sending…";

  const payload = Object.fromEntries(new FormData(form));
  payload.access_key = WEB3FORMS_KEY;
  payload.subject = "New message from hrw.no";
  payload.botcheck = form.botcheck.checked;

  try {
    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    form.reset();
    status.textContent = "Thanks — message sent.";
    status.classList.add("ok");
  } catch {
    status.textContent = "Something went wrong. Please email herman@hrw.no.";
    status.classList.add("err");
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("year").textContent = new Date().getFullYear();
