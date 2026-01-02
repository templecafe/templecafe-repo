document.addEventListener("DOMContentLoaded", () => {

  /* ------------------ FIREBASE INIT ------------------ */
  if (!firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
  }

  const db = firebase.database();

  const staticMenuList = document.getElementById("staticMenuList");
  const scrollContent  = document.getElementById("scrollContent");

  /* ------------------ FULLSCREEN BUTTON ------------------ */
  const fsBtn = document.getElementById("fullscreenBtn");

  if (fsBtn) {
    fsBtn.addEventListener("click", () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    });

    document.addEventListener("fullscreenchange", () => {
      if (document.fullscreenElement) {
        fsBtn.classList.add("hidden");
      } else {
        fsBtn.classList.remove("hidden");
      }
    });
  }

  /* ------------------ ANALOG CLOCK ------------------ */
  function updateAnalogClock() {
    const now     = new Date();
    const seconds = now.getSeconds();
    const minutes = now.getMinutes();
    const hours   = now.getHours();

    const secondHand = document.querySelector(".hand.second");
    const minuteHand = document.querySelector(".hand.minute");
    const hourHand   = document.querySelector(".hand.hour");

    const secondAngle = seconds * 6;                         // 360 / 60
    const minuteAngle = minutes * 6 + seconds * 0.1;         // 6° per min + 0.1° per sec
    const hourAngle   = (hours % 12) * 30 + minutes * 0.5;   // 30° per hour + 0.5° per min

    if (secondHand) secondHand.style.transform = `rotate(${secondAngle}deg)`;
    if (minuteHand) minuteHand.style.transform = `rotate(${minuteAngle}deg)`;
    if (hourHand)   hourHand.style.transform   = `rotate(${hourAngle}deg)`;
  }

  updateAnalogClock();
  setInterval(updateAnalogClock, 1000);

  /* ------------------ WEATHER ------------------ */
  async function loadWeather() {
    const apiKey = "9670bd1677a5ade2293159e931926ba2";
    const city   = "Ballwin,US";

    try {
      const url =
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=imperial&appid=${apiKey}`;

      const res  = await fetch(url);
      const data = await res.json();

      if (!data || !data.main) return;

      const tempEl = document.getElementById("weatherTemp");
      const iconEl = document.getElementById("weatherIcon");
      const cityEl = document.getElementById("weatherCity");

      if (tempEl) {
        tempEl.textContent = Math.round(data.main.temp) + "°F";
      }

      if (iconEl && data.weather && data.weather[0]) {
        iconEl.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}.png`;
      }

      if (cityEl) {
        cityEl.textContent = "Ballwin";
      }

    } catch (err) {
      console.error("Weather load error:", err);
    }
  }

  loadWeather();
  setInterval(loadWeather, 5 * 60 * 1000);

  /* ------------------ TICKER ------------------ */
  db.ref("announcements/message").on("value", snap => {
    const text = snap.val() || "";
    const tickerEl = document.getElementById("tickerText");
    if (tickerEl) {
      tickerEl.textContent = text;
    }
  });

  /* ------------------ MENU LOADING ------------------ */
  db.ref("todayMenu").on("value", async (snap) => {
    const today = snap.val() || {};

    if (staticMenuList) staticMenuList.innerHTML = "";
    if (scrollContent)  scrollContent.innerHTML  = "";

    const allItems = [];

    // Collect all items from Firebase into a flat array
    for (const category in today) {
      for (const itemID in today[category]) {
        try {
          const itemSnap = await db.ref(`menu/${category}/${itemID}`).once("value");
          const item = itemSnap.val();
          if (!item) continue;

          allItems.push({ id: itemID, category, ...item });
        } catch (err) {
          console.error("Error loading menu item:", category, itemID, err);
        }
      }
    }

    /* ---------- LEFT STATIC MENU ---------- */
    for (const category in today) {
      // Category header
      const header = document.createElement("li");
      header.className = "category-header";
      header.textContent = category.toUpperCase();
      staticMenuList.appendChild(header);

      // Items under that category
      for (const itemID in today[category]) {
        const item = allItems.find(
          i => i.id === itemID && i.category === category
        );
        if (!item) continue;

        const li = document.createElement("li");
        li.className = "menu-item-row";
        li.innerHTML = `
          <span class="item-name">${item.name}</span>
          <span class="item-price">${item.price || ""}</span>
        `;
        staticMenuList.appendChild(li);
      }
    }

    // Auto column switching on the left menu
    const totalItems = staticMenuList
      ? staticMenuList.querySelectorAll(".menu-item-row").length
      : 0;

    if (staticMenuList) {
      staticMenuList.classList.toggle("three-columns", totalItems > 30);
      staticMenuList.classList.toggle("two-columns",   totalItems <= 30);
    }

    /* ---------- RIGHT SCROLLING MENU ---------- */
    allItems.forEach(item => {
      const div = document.createElement("div");
      div.className = "menu-item";

      const translation = item.translations
        ? Object.values(item.translations).join(", ")
        : "";

      div.innerHTML = `
        <img src="${item.image || 'images/no-photo.png'}" alt="${item.name}">
        <div>
          <div class="name">${item.name}</div>
          <div class="translation">${translation}</div>
        </div>
      `;

      scrollContent.appendChild(div);
    });

    // Duplicate for seamless scroll if there is content
    if (scrollContent && scrollContent.children.length > 0) {
      scrollContent.innerHTML += scrollContent.innerHTML;
    }

    // Restart scroll animation after items load
    if (scrollContent) {
      scrollContent.style.animation = "none";
      void scrollContent.offsetWidth;  // force reflow
      scrollContent.style.animation = "";
    }
  });

});
