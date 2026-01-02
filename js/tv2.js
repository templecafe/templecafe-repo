/* ============================================================
   Firebase Init
============================================================ */
if (!firebase.apps.length) {
  firebase.initializeApp(window.firebaseConfig);
}

const db = firebase.database();
let lastReadyList = [];
let lastWaitingList = [];

/* ============================================================
   AUTO FULLSCREEN — NO AUTH CHECK
============================================================ */
document.addEventListener("DOMContentLoaded", () => {

  // DIRECTLY START THE TV DISPLAY (no login required)
  setupOrdersListener();
  setupTicker();
  attemptAutoFullscreen();

});

/* ============================================================
   FULLSCREEN HANDLING
============================================================ */
function attemptAutoFullscreen() {
  const elem = document.documentElement;
  const fsBtn = document.getElementById("fullscreenBtn");

  if (elem.requestFullscreen) elem.requestFullscreen().catch(() => {});
  fsBtn.style.display = "none";

  setTimeout(() => {
    if (!document.fullscreenElement) fsBtn.style.display = "flex";
  }, 800);
}

document.getElementById("fullscreenBtn").addEventListener("click", () => {
  const elem = document.documentElement;
  if (elem.requestFullscreen) elem.requestFullscreen();
});

/* ============================================================
   REALTIME ORDERS LISTENER
============================================================ */
function setupOrdersListener() {
  db.ref("orders").on("value", snapshot => {
    const data = snapshot.val() || {};
    renderFromData(data);
  });
}

/* ============================================================
   RENDERING LOGIC
============================================================ */
function renderFromData(data) {
  const now = Date.now();

  const ready = [];
  const waiting = [];
  const incomplete = [];

  for (const [counter, orders] of Object.entries(data)) {
    for (const [num, info] of Object.entries(orders)) {
      const createdAt = info.createdAt || 0;
      const minutes = createdAt ? Math.floor((now - createdAt) / 60000) : 0;

      if (info.status === "ready") {
        ready.push({ num, minutes });
      } else if (info.status === "waiting") {
        waiting.push({ num, minutes });
      } else if (info.status === "incomplete") {
        incomplete.push({ num, minutes });
      }
    }
  }

  ready.sort((a, b) => Number(a.num) - Number(b.num));
  waiting.sort((a, b) => Number(a.num) - Number(b.num));
  incomplete.sort((a, b) => Number(a.num) - Number(b.num));

  /* ------------------------------------------------------------
     NEW READY + PARTIAL READY SOUNDS
  ------------------------------------------------------------ */

  const readyIds = ready.map(r => r.num);
  const newlyReady = readyIds.filter(id => !lastReadyList.includes(id));

  if (newlyReady.length > 0) {
    const sound = document.getElementById("readySound");
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  }

  ready.forEach(r => {
    if (newlyReady.includes(r.num)) {
      r.justAppeared = true;
      r.burst = true;
    }
  });

  lastReadyList = readyIds;

  const waitingIds = waiting.map(w => w.num);
  const newlyPartial = waitingIds.filter(id => !lastWaitingList.includes(id));

  if (newlyPartial.length > 0) {
    const sound = document.getElementById("partialReadySound");
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  }

  lastWaitingList = waitingIds;

  /* ------------------------------------------------------------
     CLASS LOGIC
  ------------------------------------------------------------ */
  function readyTimeClass(minutes) {
    if (minutes >= 30) return "ready-wait-30";
    if (minutes >= 15) return "ready-wait-15";
    return "";
  }

  function otherTimeClass(minutes) {
    if (minutes >= 30) return "tile-30";
    if (minutes >= 15) return "tile-15";
    return "";
  }

  /* ------------------------------------------------------------
     RENDER LISTS
  ------------------------------------------------------------ */
  renderList("readyGrid", ready, (r) => `
    <div class="ready-tile 
         ${r.burst ? "ready-burst" : ""}
         ${r.justAppeared ? "ready-flash" : ""}
         ${r.minutes >= 30 ? "ready-pulse-30 ready-glow-30" : ""}
         ${readyTimeClass(r.minutes)}">
      ${r.num}
    </div>
  `);

  renderList("progressList", waiting, (w) => `
    <div class="progress-item ${otherTimeClass(w.minutes)}">
      <div class="icon">🍲</div>
      <div>${w.num}</div>
    </div>
  `);

  renderList("incompleteList", incomplete, (i) => `
    <div class="progress-item partial-ready-tile
         ${i.minutes >= 30 ? "partial-wait-30 partial-pulse" :
           i.minutes >= 15 ? "partial-wait-15 partial-pulse" : ""}">
      <div class="partial-icon">⏳</div>
      <div class="partial-number">${i.num}</div>
    </div>
  `);
}

/* ============================================================
   RENDER LIST — WITH SCROLLING
============================================================ */
function renderList(elementId, items, templateFn) {
  const listEl = document.getElementById(elementId);
  const scrollBox = listEl.parentElement;

  stopContinuousScroll(scrollBox);

  const newHTML = items.map(templateFn).join("");
  listEl._originalHTML = newHTML;

  if (items.length === 0) {
    listEl.innerHTML = "";
    scrollBox.classList.add("auto-height");
    scrollBox.classList.remove("fixed-height");
    scrollBox.scrollTop = 0;
    return;
  }

  if (elementId === "readyGrid" && items.length <= 20 ||
      elementId === "progressList" && items.length <= 6 ||
      elementId === "incompleteList" && items.length <= 6) {

    listEl.innerHTML = newHTML;
    scrollBox.classList.add("auto-height");
    scrollBox.classList.remove("fixed-height");
    scrollBox.scrollTop = 0;
    return;
  }

  scrollBox.classList.remove("auto-height");
  scrollBox.classList.add("fixed-height");

  rebuildClone(listEl);
  startContinuousScroll(scrollBox, listEl);
}

/* ============================================================
   CLONE REBUILD
============================================================ */
function rebuildClone(listEl) {
  const original = listEl._originalHTML || "";
  listEl.innerHTML = original;
  listEl._readyToScroll = false;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        listEl.innerHTML = original + original;
        listEl._readyToScroll = true;
      });
    });
  });
}

/* ============================================================
   STOP SCROLL
============================================================ */
function stopContinuousScroll(scrollBox) {
  if (scrollBox && scrollBox._scrollFrame) {
    cancelAnimationFrame(scrollBox._scrollFrame);
    scrollBox._scrollFrame = null;
  }
}

/* ============================================================
   SCROLL ENGINE
============================================================ */
function startContinuousScroll(scrollBox, listEl) {
  if (scrollBox._scrollFrame) return;

  const speed = 0.5;

  function loop() {
    if (!listEl._readyToScroll) {
      scrollBox._scrollFrame = requestAnimationFrame(loop);
      return;
    }

    scrollBox.scrollTop += speed;

    const midpoint = listEl.scrollHeight / 2;

    if (scrollBox.scrollTop >= midpoint) {
      scrollBox.scrollTop = 0;
    }

    scrollBox._scrollFrame = requestAnimationFrame(loop);
  }

  scrollBox._scrollFrame = requestAnimationFrame(loop);
}

/* ============================================================
   TICKER
============================================================ */
function setupTicker() {
  const tickerContent = document.getElementById("tickerContent");
  if (!tickerContent) return;

  db.ref("settings/ticker").on("value", snap => {
    const data = snap.val() || {};
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    if (data.lastUpdated && now - data.lastUpdated > oneDay) {
      db.ref("settings/ticker").update({
        message: "",
        lastUpdated: now
      });
    }

    const msg = data.message?.trim()
      ? data.message
      : data.defaultMessage || "Welcome to the Hindu Temple of St Louis";

    tickerContent.textContent = msg;

    tickerContent.style.animation = "none";
    void tickerContent.offsetWidth;
    tickerContent.style.animation = "tickerScroll 18s linear infinite";
  });
}
/* ============================================================
   SAFE AREA + SIMULATION
============================================================ */
function toggleSafeArea() {
  document.body.classList.toggle("safe-area");
}

function simulate1080p() {
  document.getElementById("simulator").className = "simulate-1080p";
}

function simulate4k() {
  document.getElementById("simulator").className = "simulate-4k";
}

function disableSimulation() {
  document.getElementById("simulator").className = "";
}

/* ============================================================
   RESET SCROLL EVERY 30s
============================================================ */
setInterval(() => {
  const scrollBoxes = document.querySelectorAll(".scroll-box.fixed-height");
  scrollBoxes.forEach(box => {
    box.scrollTop = 0;
  });
}, 30000);

/* ============================================================
   FULLSCREEN BUTTON VISIBILITY
============================================================ */
document.addEventListener("fullscreenchange", () => {
  const fsBtn = document.getElementById("fullscreenBtn");

  if (document.fullscreenElement) {
    fsBtn.style.display = "none";
  } else {
    fsBtn.style.display = "flex";
  }
});
