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

// Fade out, then close.
function closeModal(dlg) {
  if (!dlg.open || dlg.classList.contains("closing")) return;
  dlg.classList.add("closing");
  setTimeout(() => {
    dlg.classList.remove("closing");
    dlg.close();
  }, 250);
}

// Scrolling/swiping further up while already at the top of a modal closes it.
const PULL_TO_CLOSE = 90; // px of upward intent needed

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

  // Ignore gestures inside a scrollable textarea that can still scroll up.
  const inScrollableField = (t) => {
    const ta = t.closest && t.closest("textarea");
    return ta && ta.scrollTop > 0;
  };

  // Mouse wheel / trackpad. Only a gesture that *starts* at the top counts,
  // so scrolling (or momentum) up to the top doesn't close the modal by itself.
  let pull = 0, lastWheel = 0, startedAtTop = false;
  dlg.addEventListener("wheel", (e) => {
    const now = performance.now();
    if (now - lastWheel > 250) { // new gesture
      startedAtTop = dlg.scrollTop <= 0;
      pull = 0;
    }
    lastWheel = now;
    if (!startedAtTop || e.deltaY >= 0 || inScrollableField(e.target)) { pull = 0; return; }
    pull += -e.deltaY;
    if (pull > PULL_TO_CLOSE) { pull = 0; closeModal(dlg); }
  }, { passive: true });

  // Touch: swipe down (content moves down = scrolling up) from the top
  let startY = null;
  dlg.addEventListener("touchstart", (e) => {
    startY = dlg.scrollTop <= 0 && !inScrollableField(e.target) ? e.touches[0].clientY : null;
  }, { passive: true });
  dlg.addEventListener("touchmove", (e) => {
    if (startY !== null && e.touches[0].clientY - startY > PULL_TO_CLOSE) {
      startY = null;
      closeModal(dlg);
    }
  }, { passive: true });
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
