// ---------------------------------------------------------
// KITCHEN.JS — CLEAN, FIXED, REAL-TIME WORKING VERSION
// ---------------------------------------------------------

console.log("KITCHEN JS LOADED");

// Firebase DB
const db = firebase.database();

// DOM Elements
const containerKitchenOrders = document.getElementById("containerKitchenOrders");
const audioAlertWaiting = document.getElementById("audioAlertWaiting");

const popupKitchen = document.getElementById("popupKitchen");
const popupKitchenTitle = document.getElementById("popupKitchenTitle");

const btnFilterReady = document.getElementById("btnFilterReady");
const btnFilterWaiting = document.getElementById("btnFilterWaiting");
const btnFilterPrep = document.getElementById("btnFilterPrep");
const btnFilterDelivered = document.getElementById("btnFilterDelivered");
const btnFilterAll = document.getElementById("btnFilterAll");

const btnKitchenAccept = document.getElementById("btnKitchenAccept");
const btnKitchenReady = document.getElementById("btnKitchenReady");
const btnKitchenCancel = document.getElementById("btnKitchenCancel");

// State
let currentFilter = "all";
let firebaseOrders = {};
let lastWaitingList = [];

let selectedCounter = "Food Canteen";
let selectedOrder = "";

// ---------------------------------------------------------
// FILTER HANDLERS
// ---------------------------------------------------------
function setFilter(filter) {
  currentFilter = filter;

  document.querySelectorAll(".filter-btn").forEach(btn =>
    btn.classList.remove("filter-active")
  );

  const map = {
    ready: btnFilterReady,
    waiting: btnFilterWaiting,
    in_preparation: btnFilterPrep,
    delivered: btnFilterDelivered,
    all: btnFilterAll
  };

  map[filter]?.classList.add("filter-active");

  renderOrders();
}

// ---------------------------------------------------------
// FIREBASE REAL-TIME LISTENER (ONLY ONE, FIXED)
// ---------------------------------------------------------
db.ref("orders/Food Canteen").on("value", snap => {
  console.log("🔥 SNAP VALUE:", snap.val());

  firebaseOrders = snap.val() || {};
  detectNewWaiting();
  renderOrders();
});

// ---------------------------------------------------------
// WAITING ALERT DETECTION
// ---------------------------------------------------------
function detectNewWaiting() {
  const currentWaiting = [];

  for (const [num, info] of Object.entries(firebaseOrders)) {
    if (info.status === "waiting") currentWaiting.push(num);
  }

  const newOnes = currentWaiting.filter(n => !lastWaitingList.includes(n));

  if (newOnes.length > 0) audioAlertWaiting.play();

  lastWaitingList = currentWaiting;
}

// ---------------------------------------------------------
// TIME FORMATTER
// ---------------------------------------------------------
function formatRelativeTime(timestamp) {
  if (!timestamp) return "";

  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Waiting for seconds";
  if (diffMin < 60) return `Waiting for ${diffMin} minutes`;

  const hours = Math.floor(diffMin / 60);
  const minutes = diffMin % 60;

  return `Waiting for ${hours}h ${minutes}m`;
}

// ---------------------------------------------------------
// RENDER ORDERS (FLAT STRUCTURE)
// ---------------------------------------------------------
function renderOrders() {
  containerKitchenOrders.innerHTML = "";

  let allOrders = [];

  for (const [orderNum, info] of Object.entries(firebaseOrders)) {
    allOrders.push({
      counter: "Food Canteen",
      order: orderNum,
      ...info
    });
  }

  const sortOrder = { waiting: 1, in_preparation: 2, ready: 3, delivered: 4 };
  allOrders.sort((a, b) => sortOrder[a.status] - sortOrder[b.status]);

  const filtered = allOrders.filter(o =>
    currentFilter === "all" || o.status === currentFilter
  );

  filtered.forEach(info => {
    const priorityClass =
      info.status === "in_preparation" ? "priority-prep" :
      info.priority === "high" ? "priority-high" :
      info.priority === "medium" ? "priority-medium" :
      info.priority === "low" ? "priority-low" : "";

    const deliveredClass = info.status === "delivered" ? "order-delivered" : "";
    const relativeTime = info.placedAt ? formatRelativeTime(info.placedAt) : "";

    const statusLabel =
      info.status === "in_preparation"
        ? `<div class="order-status" style="color:#8e44ad; font-weight:bold;">IN PREPARATION</div>`
        : "";

    const card = document.createElement("div");
    card.className = `order-card ${priorityClass} ${deliveredClass}`;
    card.innerHTML = `
      <div class="order-number num-${info.status}">${info.order}</div>
      ${statusLabel}
      ${info.comment ? `<div class="order-comment">📝 ${info.comment}</div>` : ""}
      ${info.priority ? `<div class="order-priority">Priority: ${info.priority.toUpperCase()}</div>` : ""}
      ${relativeTime ? `<div class="order-time">${relativeTime}</div>` : ""}
    `;

    if (info.status !== "delivered") {
      card.addEventListener("click", () => openKitchenPopup(info.counter, info.order));
    }

    containerKitchenOrders.appendChild(card);
  });
}

// ---------------------------------------------------------
// POPUP HANDLERS
// ---------------------------------------------------------
function openKitchenPopup(counter, orderNum) {
  selectedCounter = counter;
  selectedOrder = orderNum;

  popupKitchenTitle.textContent = "Update Order #" + orderNum;
  popupKitchen.style.display = "flex";
}

function closeKitchenPopup() {
  popupKitchen.style.display = "none";
}

function kitchenAcceptOrder() {
  db.ref(`orders/${selectedCounter}/${selectedOrder}`).update({
    status: "in_preparation"
  });
  closeKitchenPopup();
}

function kitchenSetReady() {
  db.ref(`orders/${selectedCounter}/${selectedOrder}`).update({
    status: "ready",
    comment: "",
    priority: "",
    placedAt: ""
  });
  closeKitchenPopup();
}

// ---------------------------------------------------------
// EVENT LISTENERS
// ---------------------------------------------------------
btnFilterReady.addEventListener("click", () => setFilter("ready"));
btnFilterWaiting.addEventListener("click", () => setFilter("waiting"));
btnFilterPrep.addEventListener("click", () => setFilter("in_preparation"));
btnFilterDelivered.addEventListener("click", () => setFilter("delivered"));
btnFilterAll.addEventListener("click", () => setFilter("all"));

btnKitchenAccept.addEventListener("click", kitchenAcceptOrder);
btnKitchenReady.addEventListener("click", kitchenSetReady);
btnKitchenCancel.addEventListener("click", closeKitchenPopup);

// Auto-refresh every 30 seconds
setInterval(renderOrders, 30000);