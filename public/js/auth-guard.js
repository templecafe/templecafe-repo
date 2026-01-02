// Initialize Firebase if needed
if (!firebase.apps.length) firebase.initializeApp(window.firebaseConfig);

const auth = firebase.auth();
const firestore = firebase.firestore();

// Wait for Firebase Auth to stabilize
auth.onAuthStateChanged(async (user) => {
  // Not logged in → go to login
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // Load user role
  const doc = await firestore.collection("users").doc(user.uid).get();
  if (!doc.exists) {
    window.location.href = "index.html";
    return;
  }

  const role = doc.data().role || "guest";

  // Normalize page name
  const page = window.location.pathname.split("/").pop().toLowerCase();

  // -----------------------------
  // PAGE ACCESS RULES
  // -----------------------------

  // Kitchen page → kitchen + admin
  if (page.includes("index-kitchen") &&
      role !== "kitchen" && role !== "admin") {
    window.location.href = "index.html";
    return;
  }

  // Delivery page → delivery + admin
  if (page.includes("index-delivery") &&
      role !== "delivery" && role !== "admin") {
    window.location.href = "index.html";
    return;
  }

  // Counter page → counter + admin
  if (page.includes("index-counter") &&
      role !== "counter" && role !== "admin") {
    window.location.href = "index.html";
    return;
  }

  // Menu editor → admin only
  if (page.includes("menu-editor") &&
      role !== "admin") {
    window.location.href = "index.html";
    return;
  }

  // Home page → allow all logged-in users
});