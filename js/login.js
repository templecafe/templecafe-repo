// Supabase init
const supabaseClient = window.supabaseClient;

/* ---------------------- ELEMENTS ---------------------- */
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

const showSignupBtn = document.getElementById("showSignupBtn");
const backToLoginBtn = document.getElementById("backToLoginBtn");

const googleLoginBtn = document.getElementById("googleLoginBtn");

const loadingOverlay = document.getElementById("loadingOverlay");
const successOverlay = document.getElementById("successOverlay");

const errorPopup = document.getElementById("errorPopup");
const popupMessage = document.getElementById("popupMessage");

const signupSuccessPopup = document.getElementById("signupSuccessPopup");
const loginCard = document.getElementById("loginCard");

/* ---------------------- HELPERS ---------------------- */

function showError(message) {
  popupMessage.textContent = message;
  errorPopup.classList.remove("hidden");

  loginCard.classList.add("shake");
  setTimeout(() => loginCard.classList.remove("shake"), 500);
}

function closeErrorPopup() {
  errorPopup.classList.add("hidden");
}

function showLoading() {
  loadingOverlay.classList.remove("hidden");
}

function hideLoading() {
  loadingOverlay.classList.add("hidden");
}

function showSuccessAndRedirect() {
  successOverlay.classList.remove("hidden");
  setTimeout(() => {
    window.location.href = "index.html";
  }, 1200);
}

function closeSignupSuccess() {
  signupSuccessPopup.classList.add("hidden");
  signupForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
}

/* ---------------------- AUDIT LOGGING (v2 SAFE) ---------------------- */
async function logAudit(action, details = {}) {
  const { data: { session } } = await supabaseClient.auth.getSession();
  const user = session?.user;
  if (!user) return;

  await supabaseClient.from("audit_logs").insert({
    action,
    actorEmail: user.email,
    targetEmail: details.targetEmail || "",
    details: details.details || "",
    timestamp: new Date().toISOString()
  });
}

/* ---------------------- TOGGLE PASSWORD ---------------------- */
document.querySelectorAll(".togglePassword").forEach(icon => {
  icon.addEventListener("click", () => {
    const target = document.getElementById(icon.dataset.target);
    target.type = target.type === "password" ? "text" : "password";
  });
});

/* ---------------------- SWITCH FORMS ---------------------- */
showSignupBtn.addEventListener("click", () => {
  loginForm.classList.add("hidden");
  signupForm.classList.remove("hidden");
});

backToLoginBtn.addEventListener("click", () => {
  signupForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
});

/* ---------------------- LOGIN (v2 CORRECT) ---------------------- */
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!email || !password)
    return showError("Please enter email and password.");

  showLoading();

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    hideLoading();
    logAudit("login_failed", { targetEmail: email });

    let msg = "Something went wrong. Please try again.";
    if (error.message.includes("Invalid login credentials")) msg = "Incorrect email or password.";
    showError(msg);
    return;
  }

  hideLoading();
  showSuccessAndRedirect();

  // Log audit AFTER redirect to avoid blocking login
  setTimeout(() => logAudit("login", { method: "email" }), 1500);
});

/* ---------------------- SIGNUP (v2 CORRECT) ---------------------- */
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("signupEmail").value.trim();
  const pass = document.getElementById("signupPassword").value.trim();
  const confirm = document.getElementById("confirmPassword").value.trim();

  if (!email || !pass || !confirm)
    return showError("All fields are required.");

  if (pass !== confirm)
    return showError("Passwords do not match.");

  if (pass.length < 6)
    return showError("Password must be at least 6 characters.");

  showLoading();

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password: pass
  });

  if (error) {
    hideLoading();
    let msg = "We couldn't create your account.";
    if (error.message.includes("already registered")) msg = "This email is already registered.";
    if (error.message.includes("Password")) msg = "Password must be at least 6 characters.";
    showError(msg);
    return;
  }

  // Insert into users table
  await supabaseClient.from("users").insert({
    uid: data.user.id,
    email: data.user.email,
    role: "guest",
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  });

  // Insert into role_requests table
  await supabaseClient.from("role_requests").insert({
    uid: data.user.id,
    email: data.user.email,
    status: "pending",
    timestamp: new Date().toISOString()
  });

  hideLoading();
  successOverlay.classList.remove("hidden");

  setTimeout(() => {
    successOverlay.classList.add("hidden");
    signupSuccessPopup.classList.remove("hidden");
  }, 1200);

  setTimeout(() => logAudit("signup", { method: "email" }), 1500);
});

/* ---------------------- GOOGLE LOGIN (v2 CORRECT) ---------------------- */
googleLoginBtn.addEventListener("click", async () => {
  showLoading();

  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + "/index.html"
    }
  });

  if (error) {
    hideLoading();
    showError("Google sign-in was cancelled or failed.");
    return;
  }

  hideLoading();
  showSuccessAndRedirect();

  setTimeout(() => logAudit("login", { method: "google" }), 1500);
});
