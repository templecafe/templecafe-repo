if (!firebase.apps.length) firebase.initializeApp(window.firebaseConfig);

const auth = firebase.auth();
const firestore = firebase.firestore();
const realtime = firebase.database();

const pendingRequestsDiv = document.getElementById("pendingRequests");
const userListDiv = document.getElementById("userList");
const auditLogsBtn = document.getElementById("auditLogsBtn");

/* ---------------------- DEBUG MODE ---------------------- */
const DEBUG = true;
function debugLog(...args) {
  if (DEBUG) console.log("[ROLE-MGMT DEBUG]", ...args);
}

debugLog("Role management JS loaded.");

/* ---------------------- AUTH CHECK ---------------------- */
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    debugLog("No user logged in. Redirecting to login.");
    window.location.href = "login.html";
    return;
  }

  debugLog("Logged in as:", user.email, "UID:", user.uid);

  const doc = await firestore.collection("users").doc(user.uid).get();

  debugLog("Admin Firestore doc:", doc.exists ? doc.data() : "NO DOC FOUND");

  if (!doc.exists) {
    debugLog("ERROR: Admin Firestore document missing.");
    alert("Admin Firestore document missing.");
    return;
  }

  if (doc.data().role !== "admin") {
    debugLog("ERROR: User is NOT admin. Role =", doc.data().role);
    alert("Access denied. Admins only.");
    window.location.href = "index.html";
    return;
  }

  debugLog("Admin verified. Loading data...");

  auditLogsBtn.style.display = "block";
  auditLogsBtn.onclick = () => window.location.href = "audit-log.html";

  listenForRoleRequests();
  loadAllUsers();
});

/* ---------------------- ROLE SYNC FUNCTION ---------------------- */
async function syncRoleToRealtime(uid, role) {
  try {
    await realtime.ref("roles/" + uid).set(role);
    debugLog("Synced to Realtime DB:", uid, role);
  } catch (err) {
    console.error("Realtime sync failed:", err);
  }
}

/* ---------------------- PENDING REQUESTS ---------------------- */
function listenForRoleRequests() {
  debugLog("Listening for pending role requests...");

  firestore.collection("roleRequests")
    .where("status", "==", "pending")
    .orderBy("timestamp", "asc")
    .onSnapshot(snapshot => {

      debugLog("Snapshot received. Size:", snapshot.size);

      pendingRequestsDiv.innerHTML = "";

      if (snapshot.empty) {
        debugLog("No pending requests found.");
        pendingRequestsDiv.innerHTML = "<p>No pending requests.</p>";
        return;
      }

      snapshot.forEach(doc => {
        const data = doc.data();
        const uid = doc.id;

        debugLog("Pending request:", uid, data);

        const container = document.createElement("div");
        container.className = "request-item";

        const info = document.createElement("div");
        info.textContent = data.email || uid;

        const actions = document.createElement("div");

        const select = document.createElement("select");
        select.className = "role-select";
        ["delivery", "menuhub", "display", "admin"].forEach(r => {
          const opt = document.createElement("option");
          opt.value = r;
          opt.textContent = r.toUpperCase();
          select.appendChild(opt);
        });

        const approveBtn = document.createElement("button");
        approveBtn.className = "btn btn-approve";
        approveBtn.textContent = "Approve";
        approveBtn.onclick = () => approveRole(uid, data.email, select.value);

        const rejectBtn = document.createElement("button");
        rejectBtn.className = "btn btn-reject";
        rejectBtn.textContent = "Reject";
        rejectBtn.onclick = () => rejectRole(uid);

        actions.appendChild(select);
        actions.appendChild(approveBtn);
        actions.appendChild(rejectBtn);

        container.appendChild(info);
        container.appendChild(actions);

        pendingRequestsDiv.appendChild(container);
      });
    }, err => {
      debugLog("ERROR reading roleRequests:", err);
    });
}

/* ---------------------- APPROVE / REJECT ---------------------- */
async function approveRole(uid, email, role) {
  debugLog("Approving role:", uid, email, role);

  try {
    await firestore.collection("users").doc(uid).set({
      email: email,
      role: role
    }, { merge: true });

    await firestore.collection("roleRequests").doc(uid).set({
      status: "approved"
    }, { merge: true });

    await syncRoleToRealtime(uid, role);

    alert("Role updated to " + role.toUpperCase());
  } catch (err) {
    console.error(err);
    alert("Error approving role.");
  }
}

async function rejectRole(uid) {
  debugLog("Rejecting role:", uid);

  try {
    await firestore.collection("roleRequests").doc(uid).set({
      status: "rejected"
    }, { merge: true });

    alert("Request rejected.");
  } catch (err) {
    console.error(err);
    alert("Error rejecting request.");
  }
}

/* ---------------------- USER LIST + CHANGE ROLE ---------------------- */
function loadAllUsers() {
  debugLog("Loading all users...");

  firestore.collection("users").onSnapshot(snapshot => {
    debugLog("Users snapshot size:", snapshot.size);

    userListDiv.innerHTML = "";

    if (snapshot.empty) {
      userListDiv.innerHTML = "<p>No users found.</p>";
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      const uid = doc.id;

      debugLog("User:", uid, data);

      const row = document.createElement("div");
      row.className = "user-item";

      const info = document.createElement("div");
      info.textContent = data.email || uid;

      const roleSelect = document.createElement("select");
      roleSelect.className = "role-select";

      ["guest", "delivery", "menuhub", "display", "admin"].forEach(r => {
        const opt = document.createElement("option");
        opt.value = r;
        opt.textContent = r.toUpperCase();
        if (data.role === r) opt.selected = true;
        roleSelect.appendChild(opt);
      });

      roleSelect.onchange = async () => {
        const newRole = roleSelect.value;
        debugLog("Updating role:", uid, "→", newRole);

        await firestore.collection("users").doc(uid).update({
          role: newRole
        });

        await syncRoleToRealtime(uid, newRole);

        alert("Role updated.");
      };

      row.appendChild(info);
      row.appendChild(roleSelect);

      userListDiv.appendChild(row);
    });
  }, err => {
    debugLog("ERROR reading users:", err);
  });
}
