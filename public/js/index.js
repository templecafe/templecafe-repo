document.addEventListener("DOMContentLoaded", () => {
  const supabaseClient = window.supabaseClient;

  /* ---------------------- DOM ELEMENTS ---------------------- */
  const welcomeScreen = document.getElementById("welcomeScreen");
  const protectedTiles = document.getElementById("protectedTiles");
  const welcomeBox = document.getElementById("welcomeBox");
  const welcomeName = document.getElementById("welcomeName");
  const lastLogin = document.getElementById("lastLogin");
  const roleBadge = document.getElementById("roleBadge");
  const pendingBadge = document.getElementById("pendingBadge");
  const offlineBanner = document.getElementById("offlineBanner");

  const tileDelivery = document.getElementById("tileDelivery");
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

  /* ---------------------- DELIVERY POPUP ---------------------- */
  const deliveryPopup = document.getElementById("deliveryPopup");
  const deliveryOrdersList = document.getElementById("deliveryOrdersList");
  const closeDeliveryPopupBtn = document.getElementById("closeDeliveryPopup");

  tileDelivery.addEventListener("click", openDeliveryPopup);
  closeDeliveryPopupBtn.addEventListener("click", () => deliveryPopup.classList.add("hidden"));

  async function openDeliveryPopup() {
    deliveryPopup.classList.remove("hidden");
    await loadDeliveryOrders();
  }

  async function loadDeliveryOrders() {
    deliveryOrdersList.innerHTML = "<p>Loading...</p>";

    const { data, error } = await supabaseClient
      .from("orders")
      .select("*")
      .eq("status", "ready")
      .order("placedAt", { ascending: true });

    if (error) {
      deliveryOrdersList.innerHTML = "<p>Error loading orders.</p>";
      return;
    }

    if (!data.length) {
      deliveryOrdersList.innerHTML = "<p>No orders ready for delivery.</p>";
      return;
    }

    deliveryOrdersList.innerHTML = "";

    data.forEach(order => {
      const div = document.createElement("div");
      div.classList.add("delivery-item");

      div.innerHTML = `
        <span>Order #${order.id} — ${order.location}</span>
        <button data-id="${order.id}">Deliver</button>
      `;

      div.querySelector("button").addEventListener("click", () => markDelivered(order.id));
      deliveryOrdersList.appendChild(div);
    });
  }

  async function markDelivered(orderId) {
    await supabaseClient.from("orders").update({ status: "delivered" }).eq("id", orderId);
    loadDeliveryOrders();
  }

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
      tileDelivery.classList.remove("hidden");
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
