// Arcana Suite — where the modules and plan files are, relative to this shell's index.html.
// Vault layout (default): programs/divination-suite/index.html, modules in programs/mini-apps/<app>/.
// Release layout (Mini-Apps-Releases): divination-suite/index.html, modules in ../<app>/,
// and plan files are not published (they live in the private vault), so plan links show as text.
// The release copy of this file sets mode "release"; nothing else differs between the two builds.
window.SUITE_LAYOUT = {
  mode: "release",
  // vault-relative path ("programs/mini-apps/astrology-app/index.html") -> URL from this page
  moduleUrl: function (vaultPath) {
    return this.mode === "release" ? "../" + vaultPath.replace(/^programs\/mini-apps\//, "") : "../../" + vaultPath;
  },
  // Plans are shown as text in a release, and in the packaged EXE (opened with ?plans=0).
  planUrl: function (vaultPath) {
    var noPlans = typeof location !== "undefined" && /[?&]plans=0\b/.test(location.search);
    return this.mode === "release" || noPlans ? null : "../../" + vaultPath;
  },
};
