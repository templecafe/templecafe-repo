/* -----------------------------------------------------------
   FIREBASE INIT
----------------------------------------------------------- */
if (!firebase.apps.length) {
  firebase.initializeApp(window.firebaseConfig);
}

const db = firebase.database();

let fullMenu = {};
let todayMenu = {};
let selectedItems = {}; // key -> { category }

/* -----------------------------------------------------------
   LOAD DATA
----------------------------------------------------------- */
function loadData() {
  db.ref("menu").once("value", snap => {
    fullMenu = snap.val() || {};

    db.ref("todayMenu").once("value", snap2 => {
      todayMenu = snap2.val() || {};
      rebuildSelectedItems();
      populateCategoryFilter();
      buildUI();
      updateStats();
      updatePreview();
    });
  });
}

/* Convert todayMenu structure into selectedItems */
function rebuildSelectedItems() {
  selectedItems = {};

  Object.keys(todayMenu).forEach(cat => {
    Object.keys(todayMenu[cat]).forEach(key => {
      selectedItems[key] = { category: cat };
    });
  });
}

/* -----------------------------------------------------------
   BUILD UI (Cards + Categories)
----------------------------------------------------------- */
function buildUI() {
  const container = document.getElementById("categoriesContainer");
  container.innerHTML = "";

  const searchTerm = document.getElementById("searchInput").value.trim().toLowerCase();
  const filterCat = document.getElementById("filterCategory").value;

  Object.keys(fullMenu).forEach(cat => {
    if (filterCat !== "__all__" && filterCat !== cat) return;

    const items = fullMenu[cat] || {};

    const block = document.createElement("div");
    block.className = "category-block";

    const header = document.createElement("div");
    header.className = "category-header";
    header.innerHTML = `
      <span>${cat}</span>
      <span class="arrow">▼</span>
    `;

    const itemsDiv = document.createElement("div");
    itemsDiv.className = "category-items";

    header.onclick = () => {
      const isHidden = itemsDiv.style.display === "none";
      itemsDiv.style.display = isHidden ? "grid" : "none";
      header.querySelector(".arrow").style.transform = isHidden ? "rotate(0deg)" : "rotate(-90deg)";
    };

    Object.entries(items).forEach(([key, item]) => {
      const name = item.name.toLowerCase();
      if (searchTerm && !name.includes(searchTerm)) return;

      const card = document.createElement("div");
      card.className = "item-card";
      card.dataset.cat = cat;
      card.dataset.key = key;

      if (selectedItems[key]) card.classList.add("selected");

      card.innerHTML = `
        <img src="${item.image}" class="item-img">
        <div class="item-name">${item.name}</div>
        <div class="item-price">₹${item.price}</div>
      `;

      card.onclick = () => toggleSelection(card);

      itemsDiv.appendChild(card);
    });

    block.appendChild(header);
    block.appendChild(itemsDiv);
    container.appendChild(block);
  });
}

/* -----------------------------------------------------------
   SELECTION HANDLING
----------------------------------------------------------- */
function toggleSelection(card) {
  const key = card.dataset.key;
  const cat = card.dataset.cat;

  card.classList.toggle("selected");

  if (card.classList.contains("selected")) {
    selectedItems[key] = { category: cat };
  } else {
    delete selectedItems[key];
  }

  updateStats();
  updatePreview();
}

/* -----------------------------------------------------------
   PREVIEW PANEL
----------------------------------------------------------- */
function updatePreview() {
  const preview = document.getElementById("previewList");
  preview.innerHTML = "";

  const grouped = {};

  Object.keys(selectedItems).forEach(key => {
    const cat = selectedItems[key].category;
    const item = fullMenu[cat][key];
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item.name);
  });

  Object.keys(grouped).forEach(cat => {
    const catHeader = document.createElement("div");
    catHeader.className = "preview-cat";
    catHeader.textContent = cat;
    preview.appendChild(catHeader);

    grouped[cat].forEach(name => {
      const row = document.createElement("div");
      row.className = "preview-item";
      row.textContent = name;
      preview.appendChild(row);
    });
  });
}

/* -----------------------------------------------------------
   STATS
----------------------------------------------------------- */
function updateStats() {
  const total = Object.values(fullMenu).reduce((sum, cat) => sum + Object.keys(cat).length, 0);
  const selected = Object.keys(selectedItems).length;

  document.getElementById("statTotal").textContent = "Total: " + total;
  document.getElementById("statSelected").textContent = "Selected: " + selected;
}

/* -----------------------------------------------------------
   CATEGORY FILTER
----------------------------------------------------------- */
function populateCategoryFilter() {
  const select = document.getElementById("filterCategory");
  select.innerHTML = "";

  const allOpt = document.createElement("option");
  allOpt.value = "__all__";
  allOpt.textContent = "All Categories";
  select.appendChild(allOpt);

  Object.keys(fullMenu).forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
}

/* -----------------------------------------------------------
   SAVE TODAY MENU
----------------------------------------------------------- */
function saveTodayMenu() {
  const today = {};

  Object.keys(selectedItems).forEach(key => {
    const cat = selectedItems[key].category;
    if (!today[cat]) today[cat] = {};
    today[cat][key] = true;
  });

  db.ref("todayMenu").set(today, () => {
    alert("Today's menu saved!");
  });
}

/* -----------------------------------------------------------
   PRESET POPUP
----------------------------------------------------------- */
function openPresetPopup() {
  document.getElementById("presetPopup").style.display = "flex";

  db.ref("presets").once("value", snap => {
    const presets = snap.val() || {};
    const list = document.getElementById("presetList");
    list.innerHTML = "";

    Object.keys(presets).forEach(name => {
      const btn = document.createElement("button");
      btn.className = "top-action-btn";
      btn.style.width = "100%";
      btn.textContent = name;
      btn.onclick = () => loadPreset(name);
      list.appendChild(btn);
    });
  });
}

function closePresetPopup() {
  document.getElementById("presetPopup").style.display = "none";
}

/* -----------------------------------------------------------
   LOAD PRESET
----------------------------------------------------------- */
function loadPreset(name) {
  db.ref("presets/" + name).once("value", snap => {
    const preset = snap.val() || {};

    db.ref("todayMenu").set(preset, () => {
      alert("Preset loaded!");
      todayMenu = preset;
      rebuildSelectedItems();
      closePresetPopup();
      buildUI();
      updateStats();
      updatePreview();
    });
  });
}

/* -----------------------------------------------------------
   LOAD YESTERDAY
----------------------------------------------------------- */
function loadYesterdayMenu() {
  db.ref("yesterdayMenu").once("value", snap => {
    const y = snap.val() || {};

    db.ref("todayMenu").set(y, () => {
      alert("Yesterday's menu loaded!");
      todayMenu = y;
      rebuildSelectedItems();
      buildUI();
      updateStats();
      updatePreview();
    });
  });
}

/* -----------------------------------------------------------
   SEARCH + FILTER LISTENERS
----------------------------------------------------------- */
document.getElementById("searchInput").addEventListener("input", () => {
  buildUI();
});

document.getElementById("filterCategory").addEventListener("change", () => {
  buildUI();
});

/* -----------------------------------------------------------
   INIT
----------------------------------------------------------- */
loadData();
