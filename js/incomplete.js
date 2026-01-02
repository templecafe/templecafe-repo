document.addEventListener("DOMContentLoaded", () => {

  /* ---------------------- FIREBASE INIT (v8 ONLY) ---------------------- */
  if (!firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
  }

  const auth = firebase.auth();
  const firestore = firebase.firestore();
  const db = firebase.database();

  let authReady = false;

  /* ---------------------- ROLE + LOGIN GUARD ---------------------- */
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    const doc = await firestore.collection("users").doc(user.uid).get();
    const role = doc.exists ? doc.data().role : "guest";

    // Only admin + delivery allowed
    if (role !== "admin" && role !== "delivery") {
      window.location.href = "index.html";
      return;
    }

    authReady = true; // NOW writes are safe
  });

  /* ---------------------- DOM ELEMENTS ---------------------- */
  const ordersGrid = document.getElementById("ordersGrid");
  const readyGrid = document.getElementById("readyGrid");
  const deliveredGrid = document.getElementById("deliveredGrid");

  const readyContainer = document.getElementById("readyContainer");
  const deliveredContainer = document.getElementById("deliveredContainer");

  const showReadyBtn = document.getElementById("showReadyBtn");
  const showDeliveredBtn = document.getElementById("showDeliveredBtn");

  const emptyState = document.getElementById("emptyState");

  const incompleteCountEl = document.getElementById("incompleteCount");
  const readyCountEl = document.getElementById("readyCount");

  const modalBackdrop = document.getElementById("orderModalBackdrop");
  const modalTitle = document.getElementById("modalTitle");
  const modalStatusText = document.getElementById("modalStatusText");
  const modalItemsList = document.getElementById("modalItemsList");
  const modalMeta = document.getElementById("modalMeta");
  const modalCloseBtn = document.getElementById("modalCloseBtn");

  const incompleteSection = document.getElementById("incompleteSection");
  const markIncompleteBtn = document.getElementById("markIncompleteBtn");
  const submitIncompleteBtn = document.getElementById("submitIncompleteBtn");

  let currentOrders = {};
  let selectedOrderId = null;

  /* ---------------------- CLOCK ---------------------- */
  setInterval(() => {
    const clockEl = document.getElementById("clock");
    if (clockEl) {
      clockEl.textContent = new Date().toLocaleString();
    }
  }, 1000);

  /* ---------------------- SUBSCRIBE TO ORDERS ---------------------- */
  function subscribeToOrders() {
    const ordersRef = db.ref("orders/Food Canteen");

    ordersRef.on("value", (snapshot) => {
      currentOrders = snapshot.val() || {};
      renderOrders();
    });
  }
  subscribeToOrders();

  /* ---------------------- RENDER ORDERS ---------------------- */
  function renderOrders() {
    ordersGrid.innerHTML = "";
    readyGrid.innerHTML = "";
    deliveredGrid.innerHTML = "";

    const orderIds = Object.keys(currentOrders);

    const incompleteOrders = orderIds.filter(id => currentOrders[id].status === "incomplete");
    const readyOrders = orderIds.filter(id => currentOrders[id].status === "ready");
    const deliveredOrders = orderIds.filter(id => currentOrders[id].status === "delivered");

    emptyState.style.display = incompleteOrders.length === 0 ? "block" : "none";

    incompleteCountEl.textContent = incompleteOrders.length;
    readyCountEl.textContent = readyOrders.length;

    // INCOMPLETE ORDERS (main)
    incompleteOrders.forEach(orderId => {
      const order = currentOrders[orderId];
      const card = createOrderCard(orderId, order);
      ordersGrid.appendChild(card);
    });

    // READY ORDERS (collapsible)
    readyOrders.forEach(orderId => {
      const order = currentOrders[orderId];
      const card = createOrderCard(orderId, order);
      readyGrid.appendChild(card);
    });

    // DELIVERED ORDERS (collapsible)
    deliveredOrders.forEach(orderId => {
      const order = currentOrders[orderId];
      const card = createOrderCard(orderId, order);
      deliveredGrid.appendChild(card);
    });
  }

  /* ---------------------- CREATE ORDER CARD ---------------------- */
  function createOrderCard(orderId, order) {
    const card = document.createElement("div");
    card.className = "order-card";

    const tag = document.createElement("div");
    tag.className = "order-status-tag";

    if (order.status === "ready") tag.classList.add("order-status-ready");
    if (order.status === "incomplete") tag.classList.add("order-status-incomplete");
    if (order.status === "waiting") tag.classList.add("order-status-waiting");
    if (order.status === "delivered") tag.classList.add("order-status-delivered");

    tag.textContent =
      order.status === "incomplete"
        ? "Partial Delivered"
        : order.status.charAt(0).toUpperCase() + order.status.slice(1);

    card.appendChild(tag);

    card.innerHTML += `
      <div class="order-number-label">Order #</div>
      <div class="order-number-value">${orderId}</div>
    `;

    const minutesSince = Math.floor((Date.now() - order.createdAt) / 60000);

    const timeLabel = document.createElement("div");
    timeLabel.className = "order-wait-time";

    if (order.status === "ready") {
      timeLabel.textContent = `Ready ${minutesSince} min`;
    } else if (order.status === "delivered") {
      timeLabel.textContent = `Delivered ${minutesSince} min`;
    } else {
      timeLabel.textContent = `Waiting ${minutesSince} min`;
    }

    card.appendChild(timeLabel);

    if (order.status !== "delivered") {
      if (minutesSince >= 15 && minutesSince < 25) {
        card.classList.add("highlight-warning", "blink");
      } else if (minutesSince >= 25) {
        card.classList.add("highlight-danger", "blink");
      }
    }

    card.addEventListener("click", () => openModal(orderId, order));

    return card;
  }

  setInterval(renderOrders, 60000);

  /* ---------------------- MODAL ---------------------- */
  function openModal(orderId, order) {
    selectedOrderId = orderId;

    modalTitle.textContent = `Order #${orderId}`;
    modalStatusText.textContent =
      order.status === "incomplete" ? "partial delivered" : order.status;

    modalItemsList.innerHTML = "";
    modalMeta.innerHTML = `
      <div>Placed: ${new Date(order.createdAt).toLocaleString()}</div>
    `;

    collapseIncompleteSection();

    modalBackdrop.classList.add("show");
  }

  modalCloseBtn.addEventListener("click", () => modalBackdrop.classList.remove("show"));
  modalBackdrop.addEventListener("click", e => {
    if (e.target === modalBackdrop) modalBackdrop.classList.remove("show");
  });

  function collapseIncompleteSection() {
    incompleteSection.style.display = "none";
    document.getElementById("otherReasonBox").style.display = "none";
    document.querySelectorAll("input[name='incompleteReason']").forEach(r => r.checked = false);
  }

  /* ---------------------- STATUS BUTTONS ---------------------- */
  document.querySelectorAll(".status-btn[data-status]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!authReady) return alert("Please wait, authentication is loading.");

      collapseIncompleteSection();

      const newStatus = btn.dataset.status;

      await db.ref(`orders/Food Canteen/${selectedOrderId}/status`).set(newStatus);

      modalBackdrop.classList.remove("show");
    });
  });

  /* ---------------------- INCOMPLETE REASON ---------------------- */
  markIncompleteBtn.addEventListener("click", () => {
    incompleteSection.style.display = "block";
  });

  document.querySelectorAll("input[name='incompleteReason']").forEach(radio => {
    radio.addEventListener("change", () => {
      if (radio.value === "Other") {
        const box = document.getElementById("otherReasonBox");
        box.style.display = "block";

        setTimeout(() => {
          document.getElementById("otherReasonInput").focus();
        }, 50);

      } else {
        document.getElementById("otherReasonBox").style.display = "none";
      }
    });
  });

  submitIncompleteBtn.addEventListener("click", async () => {
    if (!authReady) return alert("Please wait, authentication is loading.");

    const selected = document.querySelector("input[name='incompleteReason']:checked");
    let reasonValue = "";

    if (selected) {
      reasonValue = selected.value;

      if (reasonValue === "Other") {
        const custom = document.getElementById("otherReasonInput").value.trim();
        if (custom) reasonValue = custom;
      }
    }

    await db.ref(`orders/Food Canteen/${selectedOrderId}/status`).set("incomplete");

    await db.ref(`orders/Food Canteen/${selectedOrderId}/reason`).set(reasonValue || "");

    modalBackdrop.classList.remove("show");
  });

  /* ---------------------- READY COLLAPSIBLE ---------------------- */
  showReadyBtn.addEventListener("click", () => {
    const isOpen = readyContainer.classList.contains("show");

    if (isOpen) {
      readyContainer.classList.remove("show");
      showReadyBtn.textContent = "Show Ready Orders";
    } else {
      readyContainer.classList.add("show");
      showReadyBtn.textContent = "Hide Ready Orders";
    }
  });

  /* ---------------------- DELIVERED COLLAPSIBLE ---------------------- */
  showDeliveredBtn.addEventListener("click", () => {
    const isOpen = deliveredContainer.classList.contains("show");

    if (isOpen) {
      deliveredContainer.classList.remove("show");
      showDeliveredBtn.textContent = "Show Delivered Orders";
    } else {
      deliveredContainer.classList.add("show");
      showDeliveredBtn.textContent = "Hide Delivered Orders";
    }
  });

});
