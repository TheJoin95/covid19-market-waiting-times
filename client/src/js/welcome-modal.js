// Welcome Modal

const showWelcomeModal = () => {
  var welcomeModal = document.getElementById("welcome-modal");
  welcomeModal.classList.add("show");
  welcomeModal.focus();

  if (TimesApp.lMap !== null) {
    document.querySelector(".welcome-modal__actions").style.display = "none";
  }
};

const hideWelcomeModal = () => {
  var welcomeModal = document.getElementById("welcome-modal");
  welcomeModal.classList.remove("show");

  if (TimesApp.lMap === null) {
    window.localStorage.setItem("hasSeenWelcomeModal", "true");
    TimesApp.initGeodata();
  }
};

exports.shouldShowWelcomeModal = () => {
  var hasSeenWelcomeModal = window.localStorage.getItem("hasSeenWelcomeModal");
  
  if (hasSeenWelcomeModal) {
    return hasSeenWelcomeModal === 'true' ? false : true;
  }
  
  return true;
}

window.hideWelcomeModal = hideWelcomeModal;
window.showWelcomeModal = showWelcomeModal;
exports.hideWelcomeModal = hideWelcomeModal;
exports.showWelcomeModal = showWelcomeModal;