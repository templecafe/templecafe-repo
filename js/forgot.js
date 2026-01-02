document.addEventListener("DOMContentLoaded", () => {

  /* ----------------------------------------------------------
     FIREBASE INIT
  ---------------------------------------------------------- */
  if (!firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
  }

  const auth = firebase.auth();
  const firestore = firebase.firestore ? firebase.firestore() : null;

  /* ----------------------------------------------------------
     ELEMENTS
  ---------------------------------------------------------- */
  const emailInput = document.getElementById("email");
  const resetBtn = document.getElementById("resetBtn");
  const messageBox = document.getElementById("message");

  /* ----------------------------------------------------------
     LOADING SPINNER
  ---------------------------------------------------------- */
  function showLoading() {
    if (!document.getElementById("loadingOverlay")) {
      const overlay = document.createElement("div");
      overlay.id = "loadingOverlay";
      overlay.style = `
        position: fixed; top:0; left:0; width:100%; height:100%;
        background: rgba(0,0,0,0.4);
        display:flex; justify-content:center; align-items:center;
        z-index:9999;
      `;
      overlay.innerHTML = `
        <div style="
          width:60px; height:60px; border-radius:50%;
          border:6px solid #fff; border-top-color:#1f6feb;
          animation: spin 0.8s linear infinite;
        "></div>
      `;
      document.body.appendChild(overlay);

      if (!document.getElementById("spinStyle")) {
        const style = document.createElement("style");
        style.id = "spinStyle";
        style.innerHTML = `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }

  function hideLoading() {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.remove();
  }

  /* ----------------------------------------------------------
     AUDIT LOGGING (optional)
  ---------------------------------------------------------- */
  function logAudit(action, details, email) {
    if (!firestore) return;
    firestore.collection("auditLogs").add({
      action,
      details,
      actorEmail: email || "",
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(() => {});
  }

  /* ----------------------------------------------------------
     RESET PASSWORD
  ---------------------------------------------------------- */
  resetBtn.addEventListener("click", () => {
    const email = emailInput.value.trim();
    messageBox.innerHTML = "";

    if (!email) {
      messageBox.innerHTML = `<div class="err">Please enter your email</div>`;
      return;
    }

    showLoading();

    auth.sendPasswordResetEmail(email)
      .then(() => {
        messageBox.innerHTML = `<div class="msg">Password reset link sent!</div>`;
        logAudit("password_reset_request", "User requested password reset", email);
      })
      .catch(err => {
        messageBox.innerHTML = `<div class="err">${err.message}</div>`;
      })
      .finally(hideLoading);
  });

});