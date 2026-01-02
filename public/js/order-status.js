document.addEventListener("DOMContentLoaded", () => {

  if (!firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
  }

  const db = firebase.database();
  const COUNTER = "Food Canteen";

  const inputBox = document.getElementById("inputBox");
  const getStatusBtn = document.getElementById("getStatusBtn");
  const statusBox = document.getElementById("statusBox");
  const frame = statusBox.querySelector(".status-box-frame");

  let lastOrder = null;
  let lastStatus = null;

  /* ---------------------- INTEGER-ONLY FILTER ---------------------- */
  inputBox.addEventListener("input", () => {
    inputBox.value = inputBox.value.replace(/[^\d]/g, "");
  });

  /* ---------------------- REALTIME LISTENER ---------------------- */
  function attachRealtimeListener(orderNum) {
    if (!orderNum) return;

    db.ref(`orders/${COUNTER}/${orderNum}`).on("value", snap => {
      const data = snap.val();
      if (!data) {
        showNotFound();
        return;
      }
      updateStatus(data.status);
    });
  }

  /* ---------------------- MANUAL REFRESH ---------------------- */
  function manualRefresh() {
    const num = inputBox.value.trim();

    if (!/^\d+$/.test(num)) {
      frame.textContent = "Please enter a valid whole number.";
      statusBox.className = "status-card";
      return;
    }

    db.ref(`orders/${COUNTER}/${num}`).once("value").then(snap => {
      const data = snap.val();
      if (!data) {
        showNotFound();
        return;
      }
      updateStatus(data.status);
    });
  }

  /* ---------------------- STATUS HANDLING ---------------------- */
  function showNotFound() {
    frame.textContent = "Order not found";
    statusBox.className = "status-card shake";
    setTimeout(() => statusBox.classList.remove("shake"), 400);
  }

  function updateStatus(status) {

    /* ---------------------- OVERRIDES ---------------------- */
    let displayStatus = status;
    let displayIcon = "";
    let cssStatus = status;

    if (status === "waiting") {
      displayStatus = "In Progress";
      cssStatus = "in_preparation";
      displayIcon = "👨‍🍳";
    }

    const icons = {
      waiting: "⏳",
      in_preparation: "👨‍🍳",
      ready: "🔥",
      delivered: "📦",
      incomplete: "⚠️"
    };

    if (!displayIcon) {
      displayIcon = icons[status];
    }

    if (status === "incomplete") {
      displayStatus = "partial delivered";
    }

    /* ---------------------- STATUS TRANSITION ANIMATION ---------------------- */
    if (lastStatus !== status) {
      statusBox.classList.add("status-transition");

      setTimeout(() => {
        statusBox.classList.remove("status-transition");
      }, 350);
    }

    /* ---------------------- MOBILE VIBRATION ---------------------- */
    if (navigator.vibrate && lastStatus !== status) {
      if (status === "ready") navigator.vibrate(120);
      else if (status === "delivered") navigator.vibrate([80, 40, 80]);
      else navigator.vibrate(40);
    }

    lastStatus = status;

    /* ---------------------- UPDATE UI ---------------------- */
    frame.innerHTML = `${displayIcon}  ${displayStatus.toUpperCase()}`;

    statusBox.className = `status-card bg-${cssStatus}`;
  }

  /* ---------------------- EVENTS ---------------------- */
  inputBox.addEventListener("input", () => {
    const num = inputBox.value.trim();

    if (/^\d+$/.test(num) && num !== lastOrder) {
      lastOrder = num;
      attachRealtimeListener(num);
    }
  });

  getStatusBtn.addEventListener("click", manualRefresh);

});
