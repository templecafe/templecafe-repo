// Prevent double execution
if (window.loginScriptLoaded) {
  console.warn("Login script already loaded — skipping duplicate execution");
} else {
  window.loginScriptLoaded = true;

  document.addEventListener("DOMContentLoaded", () => {

    const auth = firebase.auth();
    const db = window.firestore;
    const rtdb = firebase.database();

    console.log("Login JS Loaded");

    if (!db) {
      console.error("Firestore instance missing — window.firestore is undefined");
      alert("Firestore not initialized. Check config.js loading order.");
      return;
    }

    // Elements
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");
    const showSignupBtn = document.getElementById("showSignupBtn");
    const backToLoginBtn = document.getElementById("backToLoginBtn");
    const googleLoginBtn = document.getElementById("googleLoginBtn");
    const errorMsg = document.getElementById("errorMsg");

    /* ----------------------------------------------------------
       AUDIT LOGGING
    ---------------------------------------------------------- */
    function logAudit(action, actorUID, actorEmail, targetUID, targetEmail, details) {
      return db.collection("auditLogs").add({
        action,
        actorUID,
        actorEmail,
        targetUID,
        targetEmail,
        details,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    /* ----------------------------------------------------------
       ALWAYS REDIRECT TO HOME (index.html)
    ---------------------------------------------------------- */
    function redirectToHome() {
      window.location.replace("index.html");
    }

    /* ----------------------------------------------------------
       MIRROR ROLE TO REALTIME DATABASE
    ---------------------------------------------------------- */
    function mirrorRoleToRTDB(uid, role) {
      return rtdb.ref("userRoles/" + uid).set({ role: role });
    }

    /* ----------------------------------------------------------
       RATE LIMITING HELPERS
    ---------------------------------------------------------- */
    async function checkRateLimit(email) {
      const snap = await db.collection("users").where("email", "==", email).limit(1).get();
      if (snap.empty) return { allowed: true };

      const userDoc = snap.docs[0];
      const data = userDoc.data();
      const sec = data.security || {};

      const now = Date.now();

      if (sec.lockedUntil && sec.lockedUntil.toMillis() > now) {
        return {
          allowed: false,
          message: `Too many failed attempts. Try again after ${sec.lockedUntil.toDate().toLocaleTimeString()}`
        };
      }

      return { allowed: true, userDoc };
    }

    async function recordFailedAttempt(userDoc) {
      if (!userDoc) return;

      const ref = db.collection("users").doc(userDoc.id);
      const sec = userDoc.data().security || {};

      const now = Date.now();
      const lastFailed = sec.lastFailed ? sec.lastFailed.toMillis() : 0;

      let failed = sec.failedAttempts || 0;

      // Reset if last failure was long ago
      if (now - lastFailed > 10 * 60 * 1000) {
        failed = 0;
      }

      failed++;

      const update = {
        security: {
          failedAttempts: failed,
          lastFailed: firebase.firestore.FieldValue.serverTimestamp()
        }
      };

      // Lock after 5 failures
      if (failed >= 5) {
        update.security.lockedUntil = firebase.firestore.Timestamp.fromMillis(now + 15 * 60 * 1000);
      }

      return ref.update(update);
    }

    async function clearFailedAttempts(uid) {
      return db.collection("users").doc(uid).update({
        security: {
          failedAttempts: 0,
          lastFailed: null,
          lockedUntil: null
        }
      });
    }

    /* ----------------------------------------------------------
       TOGGLE FORMS
    ---------------------------------------------------------- */
    showSignupBtn.addEventListener("click", () => {
      loginForm.classList.add("hidden");
      signupForm.classList.remove("hidden");
      errorMsg.textContent = "";
    });

    backToLoginBtn.addEventListener("click", () => {
      signupForm.classList.add("hidden");
      loginForm.classList.remove("hidden");
      errorMsg.textContent = "";
    });

    /* ----------------------------------------------------------
       LOGIN WITH RATE LIMITING
    ---------------------------------------------------------- */
    loginForm.addEventListener("submit", async e => {
      e.preventDefault();

      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value;

      // Check rate limit BEFORE attempting login
      const rate = await checkRateLimit(email);
      if (!rate.allowed) {
        errorMsg.textContent = rate.message;
        return;
      }

      auth.signInWithEmailAndPassword(email, password)
        .then(async result => {
          const uid = result.user.uid;

          // Clear failed attempts on success
          await clearFailedAttempts(uid);

          const doc = await db.collection("users").doc(uid).get();
          const role = doc.data().role;

          await Promise.all([
            db.collection("users").doc(uid).update({
              lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            }),
            mirrorRoleToRTDB(uid, role),
            logAudit("login", uid, email, uid, email, "User logged in")
          ]);

          redirectToHome();
        })
        .catch(async err => {
          errorMsg.textContent = err.message;

          // Record failed attempt
          if (rate.userDoc) {
            await recordFailedAttempt(rate.userDoc);
          }
        });
    });

    /* ----------------------------------------------------------
       SIGNUP
    ---------------------------------------------------------- */
    signupForm.addEventListener("submit", e => {
      e.preventDefault();

      const email = document.getElementById("signupEmail").value.trim();
      const password = document.getElementById("signupPassword").value;
      const confirmPasswordValue = document.getElementById("confirmPassword").value;

      if (password !== confirmPasswordValue) {
        errorMsg.textContent = "Passwords do not match.";
        return;
      }

      auth.createUserWithEmailAndPassword(email, password)
        .then(async result => {
          const uid = result.user.uid;
          const role = "guest";

          const userDoc = {
            email: result.user.email,
            role: role,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            provider: "password",
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
            security: {
              failedAttempts: 0,
              lastFailed: null,
              lockedUntil: null
            }
          };

          await Promise.all([
            db.collection("users").doc(uid).set(userDoc),
            mirrorRoleToRTDB(uid, role),
            logAudit("signup", uid, email, uid, email, "New user created")
          ]);

          redirectToHome();
        })
        .catch(err => {
          errorMsg.textContent = err.message;
        });
    });

    /* ----------------------------------------------------------
       GOOGLE LOGIN (not rate-limited)
    ---------------------------------------------------------- */
    googleLoginBtn.addEventListener("click", () => {
      const provider = new firebase.auth.GoogleAuthProvider();

      auth.signInWithPopup(provider)
        .then(async result => {
          const uid = result.user.uid;
          const userRef = db.collection("users").doc(uid);

          const doc = await userRef.get();

          if (!doc.exists) {
            const role = "guest";

            await Promise.all([
              userRef.set({
                email: result.user.email,
                role: role,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                provider: "google",
                displayName: result.user.displayName || "",
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                security: {
                  failedAttempts: 0,
                  lastFailed: null,
                  lockedUntil: null
                }
              }),
              mirrorRoleToRTDB(uid, role),
              logAudit("google_login", uid, result.user.email, uid, result.user.email, "Google login")
            ]);
          } else {
            const role = doc.data().role;

            await Promise.all([
              userRef.update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
              }),
              mirrorRoleToRTDB(uid, role),
              logAudit("google_login", uid, result.user.email, uid, result.user.email, "Google login")
            ]);
          }

          redirectToHome();
        })
        .catch(err => {
          errorMsg.textContent = err.message;
        });
    });

  });
}