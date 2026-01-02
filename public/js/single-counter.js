// Firebase DB
const db = firebase.database();
const COUNTER = "Food Canteen";

// DOM Elements
const inputOrderNumber = document.getElementById("inputOrderNumber");
const btnAddOrder = document.getElementById("btnAddOrder");

const btnFilterWaiting = document.getElementById("btnFilterWaiting");
const btnFilterPrep = document.getElementById("btnFilterPrep");
const btnFilterReady = document.getElementById("btnFilterReady");
const btnFilterDelivered = document.getElementById("btnFilterDelivered");
const btnFilterAll = document.getElementById("btnFilterAll");
const btnClearDelivered = document.getElementById("btnClearDelivered");

const containerCounterTiles = document.getElementById("containerCounterTiles");
const audioNewOrder = document.getElementById("audioNewOrder");

// State
let currentFilter = "waiting";
let allOrders = {};

// -------------------------
// ADD ORDER
// -------------------------
function addOrder() {
  const orderNum = (inputOrderNumber.value || "").trim();
  if (!orderNum) {
    alert("Please enter an order number.");
    return;
  }

  db.ref(`orders/${COUNTER}/${orderNum}`).once("value", snap => {
    if (snap.exists()) {
      alert("This order number already exists.");
      return;
    }

    db.ref(`orders/${COUNTER}/${orderNum}`).set({
      status: "waiting",
      placedAt: Date.now()
    });

    audioNewOrder.play();
    inputOrderNumber.value = "";
    inputOrderNumber.focus();
  });
}

// -------------------------
// FILTER HANDLER
// -------------------------
function setFilter(filter) {
  currentFilter = filter;

  document.querySelectorAll(".filter-btn").forEach(btn =>
    btn.classList.remove("filter-active")
  );

  const map = {
    waiting: btnFilterWaiting,
    in_preparation: btnFilterPrep,
    ready: btnFilterReady,
    delivered: btnFilterDelivered,
    all: btnFilterAll
  };

  map[filter]?.classList.add("filter-active");

  renderTiles();
}

// -------------------------
// FIREBASE LISTENER
// -------------------------
db.ref(`orders/${COUNTER}`).on("value", snap => {
  allOrders = snap.val() || {};
  renderTiles();
});

// -------------------------
// RENDER TILES
// -------------------------
function renderTiles() {
  containerCounterTiles.innerHTML = "";

  const orders = Object.entries(allOrders).map(([order, info]) => ({
    order,
    ...info
  }));

  const sortOrder = {
    waiting: 1,
    in_preparation: 2,
    ready: 3,
    delivered: 4
  };

  orders.sort((a, b) => sortOrder[a.status] - sortOrder[b.status]);

  const filtered = orders.filter(
    o => currentFilter === "all" || o.status === currentFilter
  );

  filtered.forEach(info => {
    const statusClass =
      info.status === "waiting"
        ? "status-waiting"
        : info.status === "in_preparation"
        ? "status-inprep"
        : info.status === "ready"
        ? "status-ready"
        : "status-delivered";

    const tile = document.createElement("div");
    tile.className = `tile ${statusClass}`;
    tile.id = `tile-${info.order}`;

    const editable = info.status === "waiting";

    tile.innerHTML = `
      <div class="order-number num-${info.status}">${info.order}</div>
      <div class="status-label">
        ${
          info.status === "waiting"
            ? "WAITING"
            : info.status === "in_preparation"
            ? "IN PREP"
            : info.status.toUpperCase()
        }
      </div>

      ${
        editable
          ? `
        <button class="edit-btn" data-edit="${info.order}">EDIT</button>
        <button class="delete-btn" data-delete="${info.order}">DELETE</button>
      `
          : ""
      }
    `;

    containerCounterTiles.appendChild(tile);
  });

  attachTileEvents();
}

// -------------------------
// TILE BUTTON EVENTS
// -------------------------
function attachTileEvents() {
  document.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => editOrder(btn.dataset.edit));
  });

  document.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", () => deleteOrder(btn.dataset.delete));
  });
}

// -------------------------
// EDIT ORDER
// -------------------------
function editOrder(oldNum) {
  const tile = document.getElementById(`tile-${oldNum}`);

  tile.innerHTML = `
    <input id="editInput-${oldNum}" class="edit-input" type="number" value="${oldNum}">
    <button class="save-btn" data-save="${oldNum}">SAVE</button>
    <button class="cancel-btn" data-cancel="${oldNum}">X</button>
  `;

  document.querySelector(`[data-save="${oldNum}"]`)
    .addEventListener("click", () => saveOrder(oldNum));

  document.querySelector(`[data-cancel="${oldNum}"]`)
    .addEventListener("click", renderTiles);
}

// -------------------------
// SAVE ORDER
// -------------------------
function saveOrder(oldNum) {
  const newNum = document.getElementById(`editInput-${oldNum}`).value.trim();

  if (!newNum) {
    alert("Order number cannot be empty.");
    return;
  }

  const ref = db.ref(`orders/${COUNTER}`);

  ref.once("value", snap => {
    const data = snap.val() || {};

    if (data[newNum] && newNum !== oldNum) {
      alert(`Order number ${newNum} already exists.`);
      return;
    }

    db.ref(`orders/${COUNTER}/${oldNum}`).once("value", snap2 => {
      const orderData = snap2.val();

      db.ref(`orders/${COUNTER}/${newNum}`).set(orderData);
      db.ref(`orders/${COUNTER}/${oldNum}`).remove();
    });
  });
}

// -------------------------
// DELETE ORDER
// -------------------------
function deleteOrder(orderNum) {
  if (!confirm(`Delete order ${orderNum}?`)) return;
  db.ref(`orders/${COUNTER}/${orderNum}`).remove();
}

// -------------------------
// CLEAR DELIVERED
// -------------------------
function clearDelivered() {
  if (!confirm("Clear all delivered orders?")) return;

  const ref = db.ref(`orders/${COUNTER}`);

  ref.once("value", snap => {
    const data = snap.val() || {};

    for (const [orderNum, info] of Object.entries(data)) {
      if (info.status === "delivered") {
        db.ref(`orders/${COUNTER}/${orderNum}`).remove();
      }
    }
  });
}

// -------------------------
// EVENT LISTENERS
// -------------------------
btnAddOrder.addEventListener("click", addOrder);

inputOrderNumber.addEventListener("keypress", e => {
  if (e.key === "Enter") addOrder();
});

btnFilterWaiting.addEventListener("click", () => setFilter("waiting"));
btnFilterPrep.addEventListener("click", () => setFilter("in_preparation"));
btnFilterReady.addEventListener("click", () => setFilter("ready"));
btnFilterDelivered.addEventListener("click", () => setFilter("delivered"));
btnFilterAll.addEventListener("click", () => setFilter("all"));

btnClearDelivered.addEventListener("click", clearDelivered);