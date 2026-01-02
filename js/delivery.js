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
  const deliveredGrid = document.getElementById("deliveredGrid");
  const deliveredContainer = document.getElementById("deliveredContainer");
  const showDeliveredBtn = document.getElementById("showDeliveredBtn");

  const emptyState = document.getElementById("emptyState");

  const readyCountEl = document.getElementById("readyCount");
  const incompleteCountEl = document.getElementById("incompleteCount");

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
    document.getElementById("clock").textContent = new Date().toLocaleString();
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
    deliveredGrid.innerHTML = "";

    const orderIds = Object.keys(currentOrders);

    const activeOrders = orderIds.filter(id => {
      const status = currentOrders[id].status;
      return status === "ready" || status === "waiting" || status === "incomplete";
    });

    const deliveredOrders = orderIds.filter(id => currentOrders[id].status === "delivered");

    emptyState.style.display = activeOrders.length === 0 ? "block" : "none";

    let ready = 0, incomplete = 0;

    // ACTIVE ORDERS
    activeOrders.forEach(orderId => {
      const order = currentOrders[orderId];

      if (order.status === "ready") ready++;
      if (order.status === "incomplete") incomplete++;

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
      } else if (order.status === "waiting") {
        timeLabel.textContent = `Waiting ${minutesSince} min`;
      } else {
        timeLabel.textContent = `Incomplete ${minutesSince} min`;
      }

      card.appendChild(timeLabel);

      if (minutesSince >= 15 && minutesSince < 25) {
        card.classList.add("highlight-warning", "blink");
      } else if (minutesSince >= 25) {
        card.classList.add("highlight-danger", "blink");
      }

      card.addEventListener("click", () => openModal(orderId, order));
      ordersGrid.appendChild(card);
    });

    // DELIVERED ORDERS
    deliveredOrders.forEach(orderId => {
      const order = currentOrders[orderId];

      const card = document.createElement("div");
      card.className = "order-card";

      card.innerHTML = `
        <div class="order-status-tag order-status-delivered">Delivered</div>
        <div class="order-number-label">Order #</div>
        <div class="order-number-value">${orderId}</div>
      `;

      card.addEventListener("click", () => openModal(orderId, order));
      deliveredGrid.appendChild(card);
    });

    readyCountEl.textContent = ready;
    incompleteCountEl.textContent = incomplete;
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

    incompleteSection.style.display = "none";
    document.getElementById("otherReasonBox").style.display = "none";

    modalBackdrop.classList.add("show");
  }

  modalCloseBtn.addEventListener("click", () => modalBackdrop.classList.remove("show"));
  modalBackdrop.addEventListener("click", e => {
    if (e.target === modalBackdrop) modalBackdrop.classList.remove("show");
  });

  /* ---------------------- STATUS BUTTONS ---------------------- */
  document.querySelectorAll(".status-btn[data-status]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!authReady) return alert("Please wait, authentication is loading.");

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
      document.getElementById("otherReasonBox").style.display =
        radio.value === "Other" ? "block" : "none";
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

  /* ---------------------- DELIVERED TOGGLE ---------------------- */
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
