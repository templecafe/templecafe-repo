/* ---------------------- FIREBASE INIT ---------------------- */
if (!firebase.apps.length) {
  firebase.initializeApp(window.firebaseConfig);
}

const db = firebase.database();

/* ---------------------- STATE ---------------------- */
let currentFilter = "all";
let firebaseOrders = {};
let selectedCounter = "";
let selectedOrder = "";
let selectedPriority = "";

/* ---------------------- ELEMENTS ---------------------- */
const deliveryContainer = document.getElementById("deliveryContainer");
const waitingInput = document.getElementById("waitingInput");
const otherReason = document.getElementById("otherReason");

/* ---------------------- FILTER LOGIC ---------------------- */
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    currentFilter = btn.dataset.filter;

    document.querySelectorAll(".filter-btn").forEach(b =>
      b.classList.remove("filter-active")
    );

    btn.classList.add("filter-active");
    renderOrders();
  });
});

/* ---------------------- LOAD ORDERS ---------------------- */
db.ref("orders").on("value", snap => {
  firebaseOrders = snap.val() || {};
  renderOrders();
});

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
  deliveryContainer.innerHTML = "";

  let allOrders = [];

  for (const [counterName, orders] of Object.entries(firebaseOrders)) {
    for (const [orderNum, info] of Object.entries(orders)) {
      allOrders.push({ counter: counterName, order: orderNum, ...info });
    }
  }

  const sortOrder = {
    waiting: 1,
    in_preparation: 2,
    ready: 3,
    delivered: 4
  };

  allOrders.sort((a, b) => {
    const s = sortOrder[a.status] - sortOrder[b.status];
    if (s !== 0) return s;
    return (a.waitingSince || 0) - (b.waitingSince || 0);
  });

  const filtered = allOrders.filter(o =>
    currentFilter === "all" || o.status === currentFilter
  );

  filtered.forEach(info => {
    /* STATUS ICONS */
    const statusIcon =
      info.status === "waiting" ? "⏳" :
      info.status === "in_preparation" ? "👨‍🍳" :
      info.status === "ready" ? "🔥" :
      info.status === "delivered" ? "📦" : "";

    /* TILE BACKGROUND COLOR */
    const tileColorClass =
      info.status === "waiting" ? "tile-waiting" :
      info.status === "in_preparation" ? "tile-prep" :
      info.status === "ready" ? "tile-ready" :
      info.status === "delivered" ? "tile-delivered" : "";

    /* NUMBER COLOR */
    const numberColorClass =
      info.status === "waiting" ? "order-waiting" :
      info.status === "in_preparation" ? "order-inprep" :
      info.status === "ready" ? "order-ready" :
      info.status === "delivered" ? "order-delivered" : "";

    /* PRIORITY BORDER */
    const priorityClass =
      info.status === "in_preparation" ? "priority-prep" :
      info.priority === "high" ? "priority-high" :
      info.priority === "medium" ? "priority-medium" :
      info.priority === "low" ? "priority-low" : "";

    /* TIME */
    let relativeTime = "";
    let timeClass = "";
    let tileBlinkClass = "";

    if (info.waitingSince) {
      const diffMs = Date.now() - info.waitingSince;
      const diffMin = Math.floor(diffMs / 60000);

      relativeTime = formatRelativeTime(info.waitingSince);

      if (diffMin >= 30) timeClass = "time-warning";
      if (diffMin >= 45) tileBlinkClass = "blink";
    }

    const statusLabel =
      info.status === "in_preparation"
        ? `<div class="order-status">IN PREPARATION</div>`
        : "";

    deliveryContainer.innerHTML += `
      <div class="order-tile ${priorityClass} ${tileBlinkClass} ${tileColorClass}"
           onclick="openStatusPopup('${info.counter}', '${info.order}')">

        <div class="order-header">
          <span class="status-icon">${statusIcon}</span>
          <span class="order-number ${numberColorClass}">${info.order}</span>
        </div>

        ${statusLabel}

        ${info.comment ? `<div class="order-comment">📝 ${info.comment}</div>` : ""}

        ${info.priority ? `<div class="order-priority">Priority: ${info.priority.toUpperCase()}</div>` : ""}

        ${relativeTime ? `<div class="order-time ${timeClass}">${relativeTime}</div>` : ""}
      </div>
    `;
  });
}

/* ---------------------- POPUP ---------------------- */
function openStatusPopup(counter, orderNum) {
  selectedCounter = counter;
  selectedOrder = orderNum;

  document.getElementById("popupOrderTitle").textContent =
    "Update Order #" + orderNum;

  waitingInput.style.display = "none";
  otherReason.style.display = "none";

  resetPriorityButtons();
  selectedPriority = "";

  document.getElementById("statusPopup").style.display = "flex";
}

document.getElementById("btnCancelPopup").onclick = () => {
  closePopup();
};

/* ---------------------- DELIVERED ---------------------- */
document.getElementById("btnDelivered").onclick = () => {
  db.ref(`orders/${selectedCounter}/${selectedOrder}`).update({
    status: "delivered",
    comment: "",
    priority: "",
    waitingSince: ""
  });
  closePopup();
};

/* ---------------------- WAITING ---------------------- */
document.getElementById("btnWaiting").onclick = () => {
  if (waitingInput.style.display === "block") {
    waitingInput.style.display = "none";
  } else {
    waitingInput.style.display = "block";
    waitingInput.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

/* ---------------------- AUTO PRIORITY SELECTION ---------------------- */
document.querySelectorAll('input[name="waitReason"]').forEach(radio => {
  radio.addEventListener("change", () => {
    const p = radio.dataset.priority;
    if (p) {
      selectedPriority = p;
      updatePriorityUI();
    }

    if (radio.value === "Other") {
      otherReason.style.display = "block";
    } else {
      otherReason.style.display = "none";
    }
  });
});

/* PRIORITY BUTTONS */
document.getElementById("priorityHigh").onclick = () => selectPriority("high");
document.getElementById("priorityMedium").onclick = () => selectPriority("medium");
document.getElementById("priorityLow").onclick = () => selectPriority("low");

function selectPriority(level) {
  selectedPriority = level;
  updatePriorityUI();
}

function resetPriorityButtons() {
  document.getElementById("priorityHigh").classList.remove("priority-selected");
  document.getElementById("priorityMedium").classList.remove("priority-selected");
  document.getElementById("priorityLow").classList.remove("priority-selected");
}

function updatePriorityUI() {
  resetPriorityButtons();

  if (selectedPriority === "high") {
    document.getElementById("priorityHigh").classList.add("priority-selected");
  }
  if (selectedPriority === "medium") {
    document.getElementById("priorityMedium").classList.add("priority-selected");
  }
  if (selectedPriority === "low") {
    document.getElementById("priorityLow").classList.add("priority-selected");
  }
}

/* ---------------------- SUBMIT WAITING ---------------------- */
document.getElementById("btnSubmitWaiting").onclick = () => {
  const selected = document.querySelector('input[name="waitReason"]:checked');

  if (!selected) {
    alert("Please select a reason");
    return;
  }

  let reason = selected.value;

  if (reason === "Other") {
    const other = otherReason.value.trim();
    if (!other) {
      alert("Please enter a reason");
      return;
    }
    reason = other;
  }

  db.ref(`orders/${selectedCounter}/${selectedOrder}`).update({
    status: "waiting",
    comment: reason,
    priority: selectedPriority,
    waitingSince: Date.now()
  });

  closePopup();
};

/* ---------------------- CLOSE POPUP ---------------------- */
function closePopup() {
  document.getElementById("statusPopup").style.display = "none";
}