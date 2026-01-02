/* ============================================================
   FIREBASE INIT
============================================================ */
if (!firebase.apps.length) {
  firebase.initializeApp(window.firebaseConfig);
}
const db = firebase.database();

/* ============================================================
   GLOBAL STATE
============================================================ */
let currentCategory = "";
let currentKey = "";
let selectedItems = {};     // key -> { category }
let fullMenuCache = {};     // category -> { key -> item }

/* ============================================================
   UTILS
============================================================ */
function $(id) {
  return document.getElementById(id);
}

/* ============================================================
   LOAD MENU (CARD UI + FILTER SUPPORT)
============================================================ */
function loadMenu() {
  db.ref("menu").once("value", snap => {
    fullMenuCache = snap.val() || {};
    renderMenuWithFilters();
    populateFilterCategoryDropdown();
  });
}

/* Re-render menu based on search/filter state */
function renderMenuWithFilters() {
  const container = $("menuContainer");
  container.innerHTML = "";

  const searchTerm = $("searchInput")?.value.trim().toLowerCase() || "";
  const filterCat = $("filterCategory")?.value || "__all__";
  const filterSel = $("filterSelection")?.value || "all";

  let totalItems = 0;
  let selectedCount = Object.keys(selectedItems).length;

  const categories = Object.keys(fullMenuCache);
  if (!categories.length) {
    container.innerHTML = "<p>No menu items found.</p>";
    updateStats(0, 0);
    updateTodayPreview();
    return;
  }

  const mainBlock = document.createElement("div");
  mainBlock.className = "category-block";

  const mainTitle = document.createElement("h2");
  mainTitle.className = "category-title";
  mainTitle.textContent = "Menu";

  const mainItemsDiv = document.createElement("div");
  mainItemsDiv.className = "category-items";
  mainItemsDiv.style.display = "block";

  categories.forEach(cat => {
    if (filterCat !== "__all__" && filterCat !== cat) return;

    const itemsInCat = fullMenuCache[cat] || {};
    const itemEntries = Object.entries(itemsInCat);

    const catBlock = document.createElement("div");
    catBlock.style.marginBottom = "15px";

    const catTitle = document.createElement("h3");
    catTitle.className = "category-title";
    catTitle.style.fontSize = "1.1rem";
    catTitle.innerHTML = `
      <span class="cat-arrow" id="arrow-${cat}">▼</span>
      <span>${cat}</span>
    `;

    catTitle.onclick = () => {
      const items = catBlock.querySelector(".category-items");
      const arrow = document.getElementById(`arrow-${cat}`);
      if (items.style.display === "none") {
        items.style.display = "block";
        arrow.style.transform = "rotate(0deg)";
      } else {
        items.style.display = "none";
        arrow.style.transform = "rotate(-90deg)";
      }
    };

    const catItemsDiv = document.createElement("div");
    catItemsDiv.className = "category-items";
    catItemsDiv.style.display = "block";

    let catHasAnyVisible = false;

    itemEntries.forEach(([key, item]) => {
      const name = (item.name || "").toLowerCase();
      const isSelected = !!selectedItems[key];

      // Filter by search
      if (searchTerm && !name.includes(searchTerm)) return;

      // Filter by selection state
      if (filterSel === "selected" && !isSelected) return;
      if (filterSel === "unselected" && isSelected) return;

      const card = document.createElement("div");
      card.className = "menu-item-card";
      card.dataset.cat = cat;
      card.dataset.key = key;

      card.innerHTML = `
        <div class="select-badge">✔</div>
        <img src="${item.image || ""}" class="item-image">
        <div class="item-info">
          <div class="item-name">${item.name || ""}</div>
          <div class="item-price">${item.price || ""}</div>
        </div>
        <button type="button" class="edit-btn">Edit</button>
        <button type="button" class="delete-btn">Delete</button>
      `;

      if (isSelected) card.classList.add("selected");

      catItemsDiv.appendChild(card);
      totalItems++;
      catHasAnyVisible = true;
    });

    if (catHasAnyVisible) {
      catBlock.appendChild(catTitle);
      catBlock.appendChild(catItemsDiv);
      mainItemsDiv.appendChild(catBlock);
    }
  });

  mainBlock.appendChild(mainTitle);
  mainBlock.appendChild(mainItemsDiv);
  container.appendChild(mainBlock);

  updateStats(totalItems, selectedCount);
  updateTodayPreview();
}

/* ============================================================
   STATS + PREVIEW
============================================================ */
function updateStats(total, selected) {
  if ($("statTotalItems")) $("statTotalItems").textContent = total;
  if ($("statSelectedItems")) $("statSelectedItems").textContent = selected;
}

function updateTodayPreview() {
  const preview = $("todayPreviewList");
  if (!preview) return;

  preview.innerHTML = "";

  const keys = Object.keys(selectedItems);
  if (!keys.length) {
    const empty = document.createElement("div");
    empty.className = "preview-empty";
    empty.textContent = "No items selected yet.";
    preview.appendChild(empty);
    return;
  }

  // Group by category for nicer preview
  const grouped = {};
  keys.forEach(key => {
    const cat = selectedItems[key].category;
    if (!fullMenuCache[cat]) return;
    const item = fullMenuCache[cat][key];
    if (!item) return;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item.name);
  });

  Object.keys(grouped).forEach(cat => {
    const catTitle = document.createElement("div");
    catTitle.className = "preview-item";
    catTitle.style.fontWeight = "bold";
    catTitle.style.background = "#fbe8b2";
    catTitle.textContent = cat;
    preview.appendChild(catTitle);

    grouped[cat].forEach(name => {
      const row = document.createElement("div");
      row.className = "preview-item";
      row.textContent = name;
      preview.appendChild(row);
    });
  });
}

/* ============================================================
   CARD SELECTION (REPLACES CHECKBOXES)
============================================================ */
document.addEventListener("click", e => {
  const card = e.target.closest(".menu-item-card");
  if (!card) return;

  // Ignore edit/delete button clicks
  if (e.target.closest(".edit-btn") || e.target.closest(".delete-btn")) {
    return;
  }

  card.classList.toggle("selected");

  const key = card.dataset.key;
  const cat = card.dataset.cat;

  if (card.classList.contains("selected")) {
    selectedItems[key] = { category: cat };
  } else {
    delete selectedItems[key];
  }

  updateStats(
    parseInt($("statTotalItems").textContent || "0", 10),
    Object.keys(selectedItems).length
  );
  updateTodayPreview();
});

/* ============================================================
   EDIT / DELETE BUTTON HANDLERS
============================================================ */
document.addEventListener("click", e => {
  if (e.target.closest(".edit-btn")) {
    const card = e.target.closest(".menu-item-card");
    openItemPopup(card.dataset.cat, card.dataset.key);
  }

  if (e.target.closest(".delete-btn")) {
    const card = e.target.closest(".menu-item-card");
    deleteItem(card.dataset.cat, card.dataset.key);
  }
});

/* ============================================================
   DELETE ITEM
============================================================ */
function deleteItem(cat, key) {
  if (!confirm("Delete this item?")) return;
  db.ref(`menu/${cat}/${key}`).remove(() => {
    // Also remove from selection if present
    delete selectedItems[key];
    loadMenu();
  });
}

/* ============================================================
   ITEM POPUP (EDIT)
============================================================ */
function openItemPopup(cat, key) {
  currentCategory = cat;
  currentKey = key;

  $("itemPopup").style.display = "flex";
  $("popupTitle").textContent = "Edit Item";

  populateCategoryDropdown();
  resetTranslationBox();

  db.ref(`menu/${cat}/${key}`).once("value", snap => {
    const item = snap.val() || {};
    $("itemName").value = item.name || "";
    // item.price is stored like "$5.00" → strip "$"
    $("itemPrice").value = (item.price || "").replace(/^\$/, "");
    $("previewImage").src = item.image || "";
    updateTranslationPreview(item.name || "");
  });
}

/* ============================================================
   ITEM POPUP (NEW)
============================================================ */
function openItemPopupForNew() {
  currentCategory = null;
  currentKey = null;

  $("popupTitle").textContent = "Add Item";
  $("itemName").value = "";
  $("itemPrice").value = "";
  $("previewImage").src = "";

  resetTranslationBox();
  populateCategoryDropdown();

  $("newCategoryBox").style.display = "none";
  $("itemPopup").style.display = "flex";
}

function closeItemPopup() {
  $("itemPopup").style.display = "none";
}

/* ============================================================
   IMAGE PREVIEW
============================================================ */
function previewFile() {
  const file = $("itemImage").files[0];
  const reader = new FileReader();
  reader.onload = () => {
    $("previewImage").src = reader.result;
  };
  if (file) reader.readAsDataURL(file);
}

/* ============================================================
   TRANSLATIONS
============================================================ */
$("itemName")?.addEventListener("input", e => {
  updateTranslationPreview(e.target.value);
});

function resetTranslationBox() {
  $("taLine").textContent = "Tamil:";
  $("teLine").textContent = "Telugu:";
  $("knLine").textContent = "Kannada:";
  $("hiLine").textContent = "Hindi:";
  $("mlLine").textContent = "Malayalam:";
}

function updateTranslationPreview(name) {
  name = (name || "").trim();
  if (!name) return resetTranslationBox();

  if (typeof getTranslationForItem !== "function") return resetTranslationBox();

  const t = getTranslationForItem(name);
  if (!t) return resetTranslationBox();

  $("taLine").textContent = "Tamil: " + (t.ta || "");
  $("teLine").textContent = "Telugu: " + (t.te || "");
  $("knLine").textContent = "Kannada: " + (t.kn || "");
  $("hiLine").textContent = "Hindi: " + (t.hi || "");
  $("mlLine").textContent = "Malayalam: " + (t.ml || "");
}

/* ============================================================
   SAVE ITEM
============================================================ */
function saveItem() {
  let category = $("itemCategory").value;

  if (category === "__new__") {
    category = $("newCategoryInput").value.trim();
    if (!category) {
      alert("Please enter a new category name");
      return;
    }
  }

  const name = $("itemName").value.trim();
  const price = $("itemPrice").value.trim();
  const img = $("previewImage").src;

  if (!name || !price || !img) {
    alert("Please fill all fields");
    return;
  }

  const formattedPrice = `$${price}`;

  let translations = {};
  if (typeof getTranslationForItem === "function") {
    translations = getTranslationForItem(name) || {};
  }

  const data = { name, price: formattedPrice, image: img, translations };

  if (currentKey) {
    if (category !== currentCategory) {
      db.ref(`menu/${currentCategory}/${currentKey}`).remove();
      db.ref(`menu/${category}/${currentKey}`).set(data, () => {
        closeItemPopup();
        loadMenu();
      });
    } else {
      db.ref(`menu/${category}/${currentKey}`).set(data, () => {
        closeItemPopup();
        loadMenu();
      });
    }
  } else {
    const newKey = db.ref().child("menu").push().key;
    db.ref(`menu/${category}/${newKey}`).set(data, () => {
      closeItemPopup();
      loadMenu();
    });
  }
}

/* ============================================================
   TODAY MENU (CARD SELECTION)
============================================================ */
function saveSelectedAsTodayMenu() {
  const today = {};

  Object.keys(selectedItems).forEach(key => {
    const cat = selectedItems[key].category;
    if (!today[cat]) today[cat] = {};
    today[cat][key] = true;
  });

  firebase.database().ref("todayMenu").set(today, () => {
    alert("Today's menu updated!");
  });
}



/* Clear all selections */
function clearAllSelection() {
  selectedItems = {};
  renderMenuWithFilters();
}

/* ============================================================
   TICKER POPUP
============================================================ */
function openTickerPopup() {
  $("tickerPopup").style.display = "flex";
  db.ref("settings/ticker/message").once("value", snap => {
    $("tickerText").value = snap.val() || "";
  });
}

function closeTickerPopup() {
  $("tickerPopup").style.display = "none";
}

function saveTickerMessage() {
  const msg = $("tickerText").value.trim();
  db.ref("settings/ticker").set({ message: msg })
    .then(() => {
      alert("Ticker updated!");
      closeTickerPopup();
    })
    .catch(err => alert("Error saving ticker: " + err.message));
}

/* ============================================================
   PRESETS
============================================================ */
function openSavePresetPopup() {
  $("presetSavePopup").style.display = "flex";
}

function closeSavePresetPopup() {
  $("presetSavePopup").style.display = "none";
}

function savePreset() {
  const name = $("presetNameInput").value.trim();
  if (!name) return alert("Enter preset name");

  db.ref("todayMenu").once("value", snap => {
    db.ref("presets/" + name).set(snap.val() || {}, () => {
      alert("Preset saved");
      closeSavePresetPopup();
    });
  });
}

function openLoadPresetPopup() {
  $("presetLoadPopup").style.display = "flex";
  const list = $("presetList");
  list.innerHTML = "Loading...";

  db.ref("presets").once("value", snap => {
    const presets = snap.val() || {};
    list.innerHTML = "";

    Object.keys(presets).forEach(name => {
      const btn = document.createElement("button");
      btn.className = "preset-btn top-action-btn";
      btn.style.width = "100%";
      btn.style.marginBottom = "8px";
      btn.textContent = name;
      btn.onclick = () => loadPreset(name);
      list.appendChild(btn);
    });

    if (!Object.keys(presets).length) list.textContent = "No presets saved yet.";
  });
}

function closeLoadPresetPopup() {
  $("presetLoadPopup").style.display = "none";
}

function loadPreset(name) {
  db.ref("presets/" + name).once("value", snap => {
    const data = snap.val() || {};
    selectedItems = data;
    db.ref("todayMenu").set(data, () => {
      alert("Preset loaded and today's menu updated");
      closeLoadPresetPopup();
      renderMenuWithFilters();
    });
  });
}

function openDeletePresetPopup() {
  $("presetDeletePopup").style.display = "flex";
  const list = $("presetDeleteList");
  list.innerHTML = "Loading...";

  db.ref("presets").once("value", snap => {
    const presets = snap.val() || {};
    list.innerHTML = "";

    Object.keys(presets).forEach(name => {
      const btn = document.createElement("button");
      btn.className = "preset-btn delete top-action-btn danger";
      btn.style.width = "100%";
      btn.textContent = "Delete " + name;
      btn.onclick = () => deletePreset(name);
      list.appendChild(btn);
    });

    if (!Object.keys(presets).length) list.textContent = "No presets saved yet.";
  });
}

function closeDeletePresetPopup() {
  $("presetDeletePopup").style.display = "none";
}

function deletePreset(name) {
  if (!confirm("Delete preset '" + name + "'?")) return;
  db.ref("presets/" + name).remove(() => {
    alert("Preset deleted");
    openDeletePresetPopup();
  });
}

/* ============================================================
   CATEGORY DROPDOWN
============================================================ */
function populateCategoryDropdown() {
  const select = $("itemCategory");
  if (!select) return;
  select.innerHTML = "";

  db.ref("menu").once("value", snap => {
    const menu = snap.val() || {};

    Object.keys(menu).forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      select.appendChild(opt);
    });

    const newOpt = document.createElement("option");
    newOpt.value = "__new__";
    newOpt.textContent = "+ Add New Category";
    select.appendChild(newOpt);

    if (currentCategory) select.value = currentCategory;
  });
}

function handleCategoryChange() {
  const select = $("itemCategory");
  $("newCategoryBox").style.display =
    select.value === "__new__" ? "block" : "none";
}

/* Populate filter category dropdown */
function populateFilterCategoryDropdown() {
  const select = $("filterCategory");
  if (!select) return;

  const current = select.value;
  select.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "__all__";
  allOption.textContent = "All Categories";
  select.appendChild(allOption);

  Object.keys(fullMenuCache).forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });

  if (current && [...select.options].some(o => o.value === current)) {
    select.value = current;
  }
}

/* ============================================================
   PRICE VALIDATION
============================================================ */
function validatePrice(input) {
  let value = input.value.replace(/[^0-9.]/g, "");
  const parts = value.split(".");
  if (parts.length > 2) value = parts[0] + "." + parts.slice(1).join("");
  if (parts[1]?.length > 2) value = parts[0] + "." + parts[1].slice(0, 2);
  input.value = value;
}

/* ============================================================
   INIT — attach all listeners AFTER DOM is ready
============================================================ */
document.addEventListener("DOMContentLoaded", () => {

  loadMenu();

  // Item popup
  $("btnAddItem").addEventListener("click", openItemPopupForNew);
  $("btnSaveItem").addEventListener("click", saveItem);
  $("btnCancelItem").addEventListener("click", closeItemPopup);

  // Today menu
  $("btnDailyMenu").addEventListener("click", saveSelectedAsTodayMenu);
  $("btnClearSelection").addEventListener("click", clearAllSelection);

  // Ticker popup
  $("btnTicker").addEventListener("click", openTickerPopup);
  $("btnSaveTicker").addEventListener("click", saveTickerMessage);
  $("btnCancelTicker").addEventListener("click", closeTickerPopup);

  // Presets
  $("btnSavePreset").addEventListener("click", openSavePresetPopup);
  $("btnConfirmSavePreset").addEventListener("click", savePreset);
  $("btnCancelSavePreset").addEventListener("click", closeSavePresetPopup);

  $("btnLoadPreset").addEventListener("click", openLoadPresetPopup);
  $("btnCloseLoadPreset").addEventListener("click", closeLoadPresetPopup);

  $("btnDeletePreset").addEventListener("click", openDeletePresetPopup);
  $("btnCloseDeletePreset").addEventListener("click", closeDeletePresetPopup);

  // Filters
  $("searchInput").addEventListener("input", () => renderMenuWithFilters());
  $("filterCategory").addEventListener("change", () => renderMenuWithFilters());
  $("filterSelection").addEventListener("change", () => renderMenuWithFilters());
});
