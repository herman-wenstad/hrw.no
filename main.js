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

// Fade out, then close (×, Esc, click outside).
function closeModal(dlg) {
  if (!dlg.open || dlg.classList.contains("closing")) return;
  dlg.classList.add("closing");
  setTimeout(() => {
    dlg.classList.remove("closing");
    dlg.close();
  }, 250);
}

// ---------- Pull-to-close ----------
// At the top of a modal, scrolling/swiping further up drags the sheet down.
// It follows the gesture continuously and fades as it goes; on release it
// either slides away (past the threshold) or springs back.

const DISMISS_AT = 110;   // px of sheet travel needed to close on release
const RESIST = 0.85;      // sheet travel per px of input

// Drives --pull (px) and --p (0..1 progress) with an eased rAF loop.
function createSheet(dlg) {
  let target = 0, shown = 0, follow = 0.35, raf = null, onArrive = null;
  const fadeDistance = () => window.innerHeight * 0.55;
  const apply = () => {
    dlg.style.setProperty("--pull", `${shown.toFixed(1)}px`);
    dlg.style.setProperty("--p", Math.min(shown / fadeDistance(), 1).toFixed(3));
  };
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
    dismiss: () => moveTo(window.innerHeight, 0.16, () => {
      if (shown < fadeDistance()) return false;
      dlg.close();
      return true;
    }),
    reset: () => {
      cancelAnimationFrame(raf);
      raf = null;
      onArrive = null;
      target = shown = 0;
      dlg.style.removeProperty("--pull");
      dlg.style.removeProperty("--p");
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

  // Ignore gestures inside a scrollable textarea that can still scroll up.
  const inScrollableField = (t) => {
    const ta = t.closest && t.closest("textarea");
    return ta && ta.scrollTop > 0;
  };

  // Mouse wheel / trackpad.
  // Trackpad momentum keeps firing wheel events with *decaying* deltas after the
  // fingers lift. So: arriving at the top on momentum doesn't start a pull (a
  // fresh push is recognised by a pause before it, or by growing deltas), and
  // once pulling, decaying deltas mean the fingers lifted = release.
  let pull = 0, armed = false, swallow = false, lastWheel = 0, lastAbs = 0, decays = 0, idle;
  const releaseWheel = () => {
    clearTimeout(idle);
    if (!armed) return;
    armed = false;
    swallow = true; // ignore the rest of this gesture's momentum
    pull = 0;
    finish();
  };
  dlg.addEventListener("wheel", (e) => {
    const now = performance.now();
    const abs = Math.abs(e.deltaY);
    const gap = now - lastWheel;
    const prevAbs = lastAbs;
    lastWheel = now;
    lastAbs = abs;
    if (gap > 150) swallow = false; // a new gesture

    if (armed) {
      e.preventDefault(); // the sheet moves, not the content
      decays = abs < prevAbs ? decays + 1 : 0;
      if (decays >= 4) return releaseWheel();
      pull = Math.max(0, pull - e.deltaY); // up adds, down takes back
      sheet.drag(pull * RESIST);
      clearTimeout(idle);
      idle = setTimeout(releaseWheel, 180);
      return;
    }

    if (swallow || e.deltaY >= 0 || dlg.scrollTop > 0 || inScrollableField(e.target)) return;
    if (gap > 150 || abs > prevAbs * 1.15 + 1) {
      armed = true;
      decays = 0;
      pull = abs;
      e.preventDefault();
      sheet.drag(pull * RESIST);
      idle = setTimeout(releaseWheel, 180);
    }
  }, { passive: false });

  // Touch: drag down from the top; release to close or spring back.
  // A quick flick closes even if it's short.
  let startY = null, lastY = 0, lastT = 0, vy = 0, dragging = false;
  dlg.addEventListener("touchstart", (e) => {
    dragging = false;
    vy = 0;
    startY = dlg.scrollTop <= 0 && !inScrollableField(e.target) ? e.touches[0].clientY : null;
    lastY = startY;
    lastT = performance.now();
  }, { passive: true });
  dlg.addEventListener("touchmove", (e) => {
    if (startY === null) return;
    const y = e.touches[0].clientY;
    const dy = y - startY;
    if (!dragging && dy <= 0) { startY = null; return; } // scrolling content instead
    dragging = true;
    e.preventDefault(); // stop native bounce while dragging the sheet
    const now = performance.now();
    vy = (y - lastY) / Math.max(1, now - lastT);
    lastY = y;
    lastT = now;
    sheet.drag(dy * RESIST, 1);
  }, { passive: false });
  const endTouch = () => {
    if (dragging) {
      if (vy > 0.6 && sheet.target > 30) sheet.dismiss();
      else finish();
    }
    startY = null;
    dragging = false;
  };
  dlg.addEventListener("touchend", endTouch);
  dlg.addEventListener("touchcancel", endTouch);
});

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
