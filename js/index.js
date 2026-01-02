document.addEventListener("DOMContentLoaded", () => {
  const supabaseClient = window.supabaseClient;

  /* ---------------------- DOM ELEMENTS ---------------------- */
  const welcomeScreen = document.getElementById("welcomeScreen");
  const protectedTiles = document.getElementById("protectedTiles");
  const welcomeName = document.getElementById("welcomeName");
  const roleBadge = document.getElementById("roleBadge");
  const lastLogin = document.getElementById("lastLogin");
  const pendingBadge = document.getElementById("pendingBadge");

  const tileDesk = document.getElementById("tileDesk");
  const tileMenuHub = document.getElementById("tileMenuHub");
  const tileDisplay = document.getElementById("tileDisplay");
  const tileUserRoles = document.getElementById("tileUserRoles");
  const tileOrderStatus = document.getElementById("tileOrderStatus");
  const tileMobileMenu = document.getElementById("tileMobileMenu");
  const tileTVScreens = document.getElementById("tileTVScreens");

  const changePasswordLink = document.getElementById("changePasswordLink");
  const resetStaffPasswordLink = document.getElementById("resetStaffPasswordLink");
  const logoutLink = document.getElementById("logoutLink");
  const requestRoleBtn = document.getElementById("requestRoleBtn");

  /* ---------------------- DESK POPUP ---------------------- */
  const deskPopup = document.getElementById("deskPopup");
  const closeDeskPopupBtn = document.getElementById("closeDeskPopup");

  // Open Desk popup
  tileDesk.addEventListener("click", () => {
    deskPopup.classList.remove("hidden");
  });

  // Close Desk popup
  closeDeskPopupBtn.addEventListener("click", () => {
    deskPopup.classList.add("hidden");
  });

  /* ---------------------- ROLE LOGIC ---------------------- */
  function showTilesBasedOnRole(role) {
    // Hide all protected tiles first
    tileUserRoles.classList.add("hidden");
    tileOrderStatus.classList.add("hidden");
    tileMobileMenu.classList.add("hidden");
    tileTVScreens.classList.add("hidden");
    resetStaffPasswordLink.classList.add("hidden");
    changePasswordLink.classList.add("hidden");
    logoutLink.classList.add("hidden");
    requestRoleBtn.classList.add("hidden");

    if (role === "admin") {
      tileUserRoles.classList.remove("hidden");
      tileOrderStatus.classList.remove("hidden");
      tileMobileMenu.classList.remove("hidden");
      tileTVScreens.classList.remove("hidden");
      resetStaffPasswordLink.classList.remove("hidden");
      changePasswordLink.classList.remove("hidden");
      logoutLink.classList.remove("hidden");
    }

    if (role === "delivery") {
      tileDesk.classList.remove("hidden");   // Desk tile for delivery role
      logoutLink.classList.remove("hidden");
    }

    if (role === "menuhub") {
      tileMenuHub.classList.remove("hidden");
      logoutLink.classList.remove("hidden");
    }

    if (role === "display") {
      tileDisplay.classList.remove("hidden");
      logoutLink.classList.remove("hidden");
    }

    if (role === "guest") {
      requestRoleBtn.classList.remove("hidden");
    }
  }

  /* ---------------------- AUTH STATE ---------------------- */
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (!session) {
      welcomeScreen.style.display = "block";
      protectedTiles.classList.add("hidden");
      return;
    }

    const user = session.user;

    const { data } = await supabaseClient
      .from("users")
      .select("role, name")
      .eq("uid", user.id)
      .single();

    const role = data?.role || "guest";
    const name = data?.name || user.email;

    welcomeScreen.style.display = "none";
    protectedTiles.classList.remove("hidden");

    welcomeName.textContent = name;
    roleBadge.textContent = role.toUpperCase();
    roleBadge.className = "role-badge role-" + role;

    showTilesBasedOnRole(role);
  });

});
