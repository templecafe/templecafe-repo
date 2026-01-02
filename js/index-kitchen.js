/* ---------------------- FIREBASE INIT ---------------------- */
if (!firebase.apps.length) {
  firebase.initializeApp(window.firebaseConfig);
}

const db = firebase.database();

/* ---------------------- STATE ---------------------- */
let currentFilter = "all";
let firebaseOrders = {};
let lastWaitingCount = 0;


window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const filter = btn.dataset.filter;
      if (!filter) return;
      setFilter(filter);
    });
  });
});
let kitchenSelectedCounter = "Food Canteen";
let kitchenSelectedOrder = "";

/* ---------------------- ELEMENTS ---------------------- */
const kitchenContainer = document.getElementById("kitchenContainer");
const alertSound = document.getElementById("alertSound");

/* ---------------------- EDIT MENU BUTTON ---------------------- */
const editMenuBtn = document.getElementById("editMenuBtn");
if (editMenuBtn) {
  editMenuBtn.addEventListener("click", () => {
    window.location.href = "daily-menu.html";
  });
}

/* ---------------------- FIREBASE LISTENER ---------------------- */
db.ref("orders").on("value", snap => {
  const allCounters = snap.val() || {};
  firebaseOrders = allCounters["Food Canteen"] || {};
  detectNewWaiting();
  renderOrders();
});

/* ---------------------- FILTER LOGIC ---------------------- */
function setFilter(filter) {
  currentFilter = filter;

  // Remove highlight from all buttons
  document.querySelectorAll(".filter-btn").forEach(btn =>
    btn.classList.remove("filter-active")
  );

  // Determine correct ID
  const id =
    filter === "in_preparation"
      ? "in_preparation"
      : "filter" + filter.charAt(0).toUpperCase() + filter.slice(1);

  // Highlight active button
  document.getElementById(id)?.classList.add("filter-active");

  renderOrders();
}

/* ---------------------- NEW WAITING ALERT ---------------------- */
function detectNewWaiting() {
  const currentWaiting = [];

  for (const [orderNum, info] of Object.entries(firebaseOrders)) {
    if (info.status === "waiting") currentWaiting.push(orderNum);
  }

  const newOnes = currentWaiting.filter(n => !lastWaitingList.includes(n));

  if (newOnes.length > 0 && alertSound) {
    alertSound.play();
  }

  lastWaitingList = currentWaiting;
}

/* ---------------------- TIME FORMAT ---------------------- */
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

/* ---------------------- RENDER ORDERS ---------------------- */
function renderOrders() {
  kitchenContainer.innerHTML = "";

  let allOrders = [];

  // Your structure: orders/Food Canteen/<orderNum>
  for (const [orderNum, info] of Object.entries(firebaseOrders)) {
    allOrders.push({
      counter: "Food Canteen",
      order: orderNum,
      ...info
    });
  }

  const sortOrder = { waiting: 1, in_preparation: 2, ready: 3, delivered: 4 };

  allOrders.sort((a, b) => sortOrder[a.status] - sortOrder[b.status]);

  // FILTER WORKS HERE
  const filtered = allOrders.filter(o =>
    currentFilter === "all" || o.status === currentFilter
  );

  // RENDER ONLY FILTERED ORDERS
  filtered.forEach(info => {
    const priorityClass =
      info.status === "in_preparation" ? "priority-prep" :
      info.priority === "high" ? "priority-high" :
      info.priority === "medium" ? "priority-medium" :
      info.priority === "low" ? "priority-low" : "";

    const deliveredClass = info.status === "delivered" ? "order-delivered" : "";

    const relativeTime = info.waitingSince
      ? formatRelativeTime(info.waitingSince)
      : "";

    const statusLabel =
      info.status === "in_preparation"
        ? `<div class="order-status" style="color:#8e44ad; font-weight:bold;">IN PREPARATION</div>`
        : "";

    kitchenContainer.innerHTML += `
      <div class="order-card ${priorityClass} ${deliveredClass}"
           onclick="handleKitchenClick('Food Canteen', '${info.order}', '${info.status}')">

        <div class="order-number num-${info.status}">${info.order}</div>

        ${statusLabel}

        ${info.comment ? `<div class="order-comment">📝 ${info.comment}</div>` : ""}

        ${info.priority ? `<div class="order-priority">Priority: ${info.priority.toUpperCase()}</div>` : ""}

        ${relativeTime ? `<div class="order-time">${relativeTime}</div>` : ""}
      </div>
    `;
  });
}

/* ---------------------- POPUP ACTIONS ---------------------- */
function handleKitchenClick(counter, orderNum, status) {
  if (status === "delivered") return;
  openKitchenPopup(counter, orderNum);
}

function openKitchenPopup(counter, orderNum) {
  kitchenSelectedCounter = counter;
  kitchenSelectedOrder = orderNum;

  document.getElementById("kitchenPopupTitle").textContent =
    "Update Order #" + orderNum;

  document.getElementById("kitchenPopup").style.display = "flex";
}

function closeKitchenPopup() {
  document.getElementById("kitchenPopup").style.display = "none";
}

function kitchenAcceptOrder() {
  db.ref(`orders/${kitchenSelectedCounter}/${kitchenSelectedOrder}`).update({
    status: "in_preparation"
  });
  closeKitchenPopup();
}

function kitchenSetReady() {
  db.ref(`orders/${kitchenSelectedCounter}/${kitchenSelectedOrder}`).update({
    status: "ready",
    comment: "",
    priority: "",
    waitingSince: ""
  });
  closeKitchenPopup();
}

/* ---------------------- PERIODIC REFRESH ---------------------- */
setInterval(renderOrders, 30000);