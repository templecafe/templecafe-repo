/* ============================================================
   THEME INITIALIZATION
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("menuHubTheme") || "light";
  document.body.classList.remove("light", "dark");
  document.body.classList.add(savedTheme);

  document.getElementById("themeToggle").checked = savedTheme === "dark";
});

/* ============================================================
   THEME TOGGLE
============================================================ */
document.getElementById("themeToggle").addEventListener("change", () => {
  const newTheme = document.getElementById("themeToggle").checked ? "dark" : "light";

  document.body.classList.remove("light", "dark");
  document.body.classList.add(newTheme);

  localStorage.setItem("menuHubTheme", newTheme);
});

/* ============================================================
   CARD CLICK HANDLERS
============================================================ */
document.querySelectorAll(".menu-card[data-link]").forEach(card => {
  card.addEventListener("click", () => {
    window.location.href = card.dataset.link;
  });
});

/* ============================================================
   DISPLAY POPUP
============================================================ */
document.getElementById("openDisplay").addEventListener("click", () => {
  document.getElementById("displayPopup").style.display = "flex";
});

document.getElementById("closeDisplay").addEventListener("click", () => {
  document.getElementById("displayPopup").style.display = "none";
});

/* ============================================================
   FULLSCREEN OPTIONS
============================================================ */
document.querySelectorAll("[data-fullscreen]").forEach(btn => {
  btn.addEventListener("click", () => {
    window.location.href = btn.dataset.fullscreen;
  });
});