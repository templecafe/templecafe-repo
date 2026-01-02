document.addEventListener("DOMContentLoaded", () => {

  /* ---------------------- FIREBASE INIT ---------------------- */
  if (!firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
  }

  const auth = firebase.auth();
  const firestore = firebase.firestore();

  const logList = document.getElementById("logList");

  const filterAction = document.getElementById("filterAction");
  const filterActor = document.getElementById("filterActor");
  const filterTarget = document.getElementById("filterTarget");
  const filterSearch = document.getElementById("filterSearch");
  const filterFrom = document.getElementById("filterFrom");
  const filterTo = document.getElementById("filterTo");

  const applyFiltersBtn = document.getElementById("applyFiltersBtn");
  const clearFiltersBtn = document.getElementById("clearFiltersBtn");

  let allLogs = [];

  /* ---------------------- AUTH CHECK ---------------------- */
  auth.onAuthStateChanged(async (user) => {
    if (!user) return window.location.href = "login.html";

    const adminDoc = await firestore.collection("users").doc(user.uid).get();

    if (!adminDoc.exists || adminDoc.data().role !== "admin") {
      alert("Access denied. Admins only.");
      return window.location.href = "index.html";
    }

    loadLogs();
  });

  /* ---------------------- LOAD LOGS ---------------------- */
  function loadLogs() {
    firestore.collection("auditLogs")
      .orderBy("timestamp", "desc")
      .limit(500)
      .onSnapshot(snapshot => {
        allLogs = [];
        snapshot.forEach(doc => allLogs.push(doc.data()));
        renderLogs(allLogs);
      });
  }

 function renderLogs(logs) {
  logList.innerHTML = "";

  if (!logs.length) {
    logList.innerHTML = "<p>No logs match your filters.</p>";
    return;
  }

  logs.forEach(data => {
    const action = (data.action || "").replace("_", " ").toUpperCase();
    const actor = data.actorEmail || data.actor || "—";
    const target = data.targetEmail || "—";
    const details = data.details || data.method || "—";
    const timestamp = data.timestamp ? data.timestamp.toDate().toLocaleString() : "—";

    logList.innerHTML += `
      <div class="log-card">
        <strong>${action}</strong><br>
        Actor: ${actor}<br>
        Target: ${target}<br>
        Details: ${details}<br>
        <div class="timestamp">${timestamp}</div>
      </div>
    `;
  });
}


  /* ---------------------- APPLY FILTERS ---------------------- */
  applyFiltersBtn.addEventListener("click", () => {
    let filtered = [...allLogs];

    const action = filterAction.value;
    const actor = filterActor.value.toLowerCase();
    const target = filterTarget.value.toLowerCase();
    const search = filterSearch.value.toLowerCase();
    const from = filterFrom.value;
    const to = filterTo.value;

    if (action) {
      filtered = filtered.filter(l => l.action === action);
    }

    if (actor) {
      filtered = filtered.filter(l => l.actorEmail.toLowerCase().includes(actor));
    }

    if (target) {
      filtered = filtered.filter(l => l.targetEmail.toLowerCase().includes(target));
    }

    if (search) {
      filtered = filtered.filter(l =>
        l.details.toLowerCase().includes(search) ||
        l.actorEmail.toLowerCase().includes(search) ||
        l.targetEmail.toLowerCase().includes(search)
      );
    }

    if (from) {
      const fromDate = new Date(from);
      filtered = filtered.filter(l => l.timestamp && l.timestamp.toDate() >= fromDate);
    }

    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59);
      filtered = filtered.filter(l => l.timestamp && l.timestamp.toDate() <= toDate);
    }

    renderLogs(filtered);
  });

  /* ---------------------- CLEAR FILTERS ---------------------- */
  clearFiltersBtn.addEventListener("click", () => {
    filterAction.value = "";
    filterActor.value = "";
    filterTarget.value = "";
    filterSearch.value = "";
    filterFrom.value = "";
    filterTo.value = "";

    renderLogs(allLogs);
  });

});