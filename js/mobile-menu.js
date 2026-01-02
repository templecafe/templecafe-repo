document.addEventListener("DOMContentLoaded", () => {

  /* ----------------------------------------------------------
     FIREBASE INIT
  ---------------------------------------------------------- */
  if (!firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
  }

  const db = firebase.database();

  /* ----------------------------------------------------------
     FULLSCREEN
  ---------------------------------------------------------- */
  function enterFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    document.getElementById("fullscreenOverlay").style.display = "none";
  }

  document.getElementById("fullscreenOverlay").addEventListener("click", enterFullscreen);
  setTimeout(() => enterFullscreen(), 1200);

  /* ----------------------------------------------------------
     CLOCK
  ---------------------------------------------------------- */
  function updateClock() {
    const now = new Date();
    document.getElementById("bannerClock").textContent =
      now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  setInterval(updateClock, 1000);
  updateClock();

  /* ----------------------------------------------------------
     LANGUAGE ROTATION
  ---------------------------------------------------------- */
  const indianLanguages = ["ta", "ml", "kn", "te", "hi"];
  let currentLangIndex = 0;

  setInterval(() => {
    currentLangIndex = (currentLangIndex + 1) % indianLanguages.length;
    updateVisibleLanguage();
  }, 6000);

  function updateVisibleLanguage() {
    const langElements = document.querySelectorAll(".item-lang");

    langElements.forEach(el => {
      const langCode = indianLanguages[currentLangIndex];

      const text =
        langCode === "ta" ? el.dataset.ta :
        langCode === "te" ? el.dataset.te :
        langCode === "kn" ? el.dataset.kn :
        langCode === "hi" ? el.dataset.hi :
        langCode === "ml" ? el.dataset.ml :
        "";

      el.style.opacity = 0;
      setTimeout(() => {
        el.textContent = text || "";
        el.style.opacity = 1;
      }, 300);
    });
  }

  /* ----------------------------------------------------------
     MENU LOADING
  ---------------------------------------------------------- */
  function loadMenu() {
    const dbRef = db.ref();

    Promise.all([
      dbRef.child("todayMenu").once("value"),
      dbRef.child("menu").once("value")
    ])
    .then(([todaySnap, menuSnap]) => {
      const todayRaw = todaySnap.val() || {};
      const menu = menuSnap.val() || {};

      const today = {};

      Object.entries(todayRaw).forEach(([key, value]) => {
        if (typeof value === "object" && !value.category) {
          const cat = key;
          today[cat] = value;
        } else if (value.category) {
          const cat = value.category;
          if (!today[cat]) today[cat] = {};
          today[cat][key] = true;
        }
      });

      renderMenu(today, menu);
    });
  }

  function renderMenu(today, menu) {
    let html = "";
    let count = 0;

    Object.keys(today).forEach(cat => {
      html += `<div class="category-header">${cat}</div>`;

      Object.keys(today[cat]).forEach(itemKey => {
        const item = menu?.[cat]?.[itemKey];
        if (!item) return;

        const t = item.translations || {};

        html += `
          <div class="menu-tile">
            <img src="${item.image || 'images/default.jpg'}" class="item-img">
            <div class="item-info">
              <div class="item-name">${item.name}</div>
              <div class="item-lang"
                   data-ta="${t.ta || ""}"
                   data-te="${t.te || ""}"
                   data-kn="${t.kn || ""}"
                   data-hi="${t.hi || ""}"
                   data-ml="${t.ml || ""}">
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

    updateVisibleLanguage();
  }

  loadMenu();

  /* ----------------------------------------------------------
     MANUAL SCROLL + SCROLL-TO-TOP BUTTON
  ---------------------------------------------------------- */
  const wrapper = document.getElementById("scrollWrapper");
  const scrollTopBtn = document.getElementById("scrollTopBtn");

  wrapper.addEventListener("scroll", () => {
    scrollTopBtn.style.display = wrapper.scrollTop > 200 ? "flex" : "none";
  });

  scrollTopBtn.addEventListener("click", () => {
    wrapper.scrollTo({ top: 0, behavior: "smooth" });
  });

});