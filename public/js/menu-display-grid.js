document.addEventListener("DOMContentLoaded", () => {

  /* ---------------------- FIREBASE INIT ---------------------- */
  if (!firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
  }

  const db = firebase.database();

  /* ---------------------- FULLSCREEN ---------------------- */
  const fullscreenOverlay = document.getElementById("fullscreenOverlay");

  function enterFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    fullscreenOverlay.style.display = "none";
  }

  fullscreenOverlay.addEventListener("click", enterFullscreen);
  setTimeout(enterFullscreen, 1200);

  /* ---------------------- CLOCK ---------------------- */
  function updateClock() {
    const now = new Date();
    document.getElementById("bannerClock").textContent =
      now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  setInterval(updateClock, 1000);
  updateClock();

  /* ---------------------- LANGUAGE ROTATION ---------------------- */
  const indianLanguages = ["ta", "ml", "kn", "te", "hi"];
  let currentLangIndex = 0;

  function updateVisibleLanguage() {
    const langElements = document.querySelectorAll(".item-lang");

    langElements.forEach(el => {
      let langs = {};
      try {
        langs = JSON.parse(el.dataset.langs || "{}");
      } catch (e) {}

      const langCode = indianLanguages[currentLangIndex];

      el.style.opacity = 0;
      setTimeout(() => {
        el.innerHTML = langs[langCode] || "";
        el.style.opacity = 1;
      }, 300);
    });
  }

  setInterval(() => {
    currentLangIndex = (currentLangIndex + 1) % indianLanguages.length;
    updateVisibleLanguage();
  }, 6000);

  /* ---------------------- MENU LOADING ---------------------- */
  function loadMenu() {
    const dbRef = db.ref();

    Promise.all([
      dbRef.child("todayMenu").once("value"),
      dbRef.child("menu").once("value")
    ])
    .then(([todaySnap, menuSnap]) => {
      const today = todaySnap.val() || {};
      const menu = menuSnap.val() || {};
      renderMenu(today, menu);
    });
  }

  function renderMenu(today, menu) {
    let html = "";
    let count = 0;

    Object.keys(today).forEach(cat => {
      const items = today[cat] || {};

      html += `<div class="category-header">${cat}</div>`;

      Object.keys(items).forEach(itemKey => {
        const item = menu?.[cat]?.[itemKey];
        if (!item) return;

        const t = item.translations || {};

        html += `
          <div class="menu-tile">
            <img src="${item.image || 'images/default.jpg'}" class="item-img">
            <div class="item-info">
              <div class="item-name">${item.name}</div>
              <div class="item-lang" data-langs='${JSON.stringify(t)}'>
                ${t.ta || ""}
              </div>
              <div class="item-price">${item.price.replace("₹","")}</div>
            </div>
          </div>
        `;

        count++;
      });
    });

    if (count === 0) {
      html = `
        <div class="menu-tile">
          <div class="item-info">
            <div class="item-name">No items found for today</div>
          </div>
        </div>
      `;
    }

    document.getElementById("menuGrid").innerHTML = html;
    document.getElementById("menuGridClone").innerHTML = html;

    updateVisibleLanguage();
  }

  loadMenu();

  /* ---------------------- SMOOTH GPU SCROLL ---------------------- */
  let scrollPos = 0;
  const scrollSpeed = 0.4;

  function autoScrollGrid() {
    const content = document.getElementById("scrollContent");
    const grid = document.getElementById("menuGrid");

    scrollPos -= scrollSpeed;

    const gap = 16;
    if (Math.abs(scrollPos) >= grid.offsetHeight + gap) {
      scrollPos = 0;
    }

    content.style.transform = `translateY(${scrollPos}px)`;

    requestAnimationFrame(autoScrollGrid);
  }

  autoScrollGrid();

});