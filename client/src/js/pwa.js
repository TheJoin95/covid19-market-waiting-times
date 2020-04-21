window.addEventListener("appinstalled", function () {
  ga("send", "event", "PWA", "Installed", "true");
  utils.sendError({
    pwa_installed: true,
  });
});
