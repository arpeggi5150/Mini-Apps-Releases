// Arcana Suite — shell UI: home tiles, module view, profile panel, settings panel.
// Data comes from suite-modules.js (generated from the database) and suite-store.js.
(function () {
  "use strict";
  var MODULES = window.SUITE_MODULES || [];
  var LAYOUT = window.SUITE_LAYOUT;
  var store = window.ArcanaSuiteStore;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var fileName = function (p) { return p.split("/").pop(); };

  // ---------- home tiles ----------
  function tileHtml(m) {
    var meta = '<div class="meta">' +
      (m.live ? '<span class="pill live">Live</span>' : '<span class="pill soon">Coming soon</span>') +
      '<span class="pill">v' + esc(m.version) + (m.live ? "" : " planned") + "</span></div>";
    var act;
    if (m.live) {
      act = '<div class="act"><button class="btn small" type="button" data-open="' + esc(m.id) + '">Open</button></div>';
    } else {
      var url = LAYOUT.planUrl(m.plan);
      act = '<div class="act plan">' + (url
        ? 'Plan: <a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(fileName(m.plan)) + "</a>"
        : "Plan: " + esc(fileName(m.plan)) + " (in the vault)") + "</div>";
    }
    return '<article class="tile' + (m.live ? " live" : "") + '" data-id="' + esc(m.id) + '" style="--accent:' + esc(m.accent) + '">' +
      '<div class="nm">' + esc(m.name) + '</div><div class="job">' + esc(m.job) + "</div>" + meta + act + "</article>";
  }
  function renderTiles() {
    var q = $("search").value.trim().toLowerCase();
    var match = function (m) { return !q || (m.name + " " + m.job + " " + m.status).toLowerCase().indexOf(q) >= 0; };
    var live = MODULES.filter(function (m) { return m.live && match(m); });
    var soon = MODULES.filter(function (m) { return !m.live && match(m); });
    $("liveGrid").innerHTML = live.map(tileHtml).join("");
    $("soonGrid").innerHTML = soon.map(tileHtml).join("");
    $("liveHead").hidden = !live.length;
    $("soonHead").hidden = !soon.length;
    $("noMatch").hidden = !!(live.length || soon.length);
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-open]");
    if (b) { location.hash = "#/m/" + b.dataset.open; return; }
    var t = e.target.closest(".tile.live");
    if (t && !e.target.closest("a")) location.hash = "#/m/" + t.dataset.id;
  });
  $("search").addEventListener("input", renderTiles);

  // ---------- module view (iframes are kept, so your place in a module is kept) ----------
  var frames = {};
  function showModule(id) {
    var m = MODULES.find(function (x) { return x.id === id && x.live; });
    if (!m) { showHome(); return; }
    if (!frames[id]) {
      var f = document.createElement("iframe");
      f.src = LAYOUT.moduleUrl(m.entry);
      f.title = m.name;
      f.dataset.id = id;
      $("frames").appendChild(f);
      frames[id] = f;
    }
    Object.keys(frames).forEach(function (k) { frames[k].classList.toggle("shown", k === id); });
    $("moduleTitle").innerHTML = "<b>" + esc(m.name) + "</b> v" + esc(m.version);
    $("moduleView").classList.add("open");
    document.title = m.name + " · Arcana Suite";
    $("backHome").focus();
  }
  function showHome() {
    $("moduleView").classList.remove("open");
    Object.keys(frames).forEach(function (k) { frames[k].classList.remove("shown"); });
    document.title = "Arcana Suite";
  }
  function route() {
    var m = location.hash.match(/^#\/m\/([\w-]+)$/);
    if (m) showModule(m[1]);
    else showHome();
  }
  $("backHome").addEventListener("click", function () {
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    route();
  });
  window.addEventListener("hashchange", route);

  // ---------- panels ----------
  function openPanel(id) {
    $(id).classList.add("open");
    var first = $(id).querySelector("input,button");
    if (first) first.focus();
  }
  function closePanels() {
    document.querySelectorAll(".overlay.open").forEach(function (o) { o.classList.remove("open"); });
  }
  document.querySelectorAll("[data-close]").forEach(function (b) { b.addEventListener("click", closePanels); });
  document.querySelectorAll(".overlay").forEach(function (o) {
    o.addEventListener("click", function (e) { if (e.target === o) closePanels(); });
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closePanels(); });

  // ---------- profile ----------
  function profileCard() {
    var p = store.getProfile();
    $("profileCard").innerHTML = p
      ? '<div class="profile-line"><p><b>' + esc(p.name) + "</b> · born " + esc(p.birthDate) + " · " +
        esc(p.timeUnknown ? "time unknown" : p.birthTime) + " · " + esc(p.placeUnknown ? "place unknown" : p.birthPlace) +
        '</p><button class="btn ghost small" type="button" id="editProfile">Edit profile</button></div>'
      : '<div class="profile-line"><p>Set up your profile once: name, birth date, time and place. The modules that need it read it from here.</p>' +
        '<button class="btn small" type="button" id="editProfile">Set up profile</button></div>';
    $("editProfile").addEventListener("click", function () { fillForm(store.getProfile()); openPanel("profilePanel"); });
  }
  var editingChartId = null;
  function fillForm(p) {
    p = p || {};
    $("pName").value = p.name || "";
    $("pDate").value = p.birthDate || "";
    $("pTimeUnknown").checked = !!p.timeUnknown || (p.birthDate && !p.birthTime);
    $("pTime").value = p.birthTime || "";
    $("pPlaceUnknown").checked = !!p.placeUnknown || (p.birthDate && !p.birthPlace);
    $("pPlace").value = p.birthPlace || "";
    syncUnknowns();
    $("profileMsg").textContent = "";
  }
  function formValue() {
    return {
      id: editingChartId,
      name: $("pName").value,
      birthDate: $("pDate").value,
      birthTime: $("pTime").value,
      timeUnknown: $("pTimeUnknown").checked,
      birthPlace: $("pPlace").value,
      placeUnknown: $("pPlaceUnknown").checked,
    };
  }
  function syncUnknowns() {
    $("pTime").disabled = $("pTimeUnknown").checked;
    $("pPlace").disabled = $("pPlaceUnknown").checked;
  }
  function say(id, text, err) {
    $(id).textContent = text;
    $(id).className = "msg " + (err ? "err" : "ok");
  }
  $("pTimeUnknown").addEventListener("change", syncUnknowns);
  $("pPlaceUnknown").addEventListener("change", syncUnknowns);
  $("openProfile").addEventListener("click", function () { editingChartId = null; fillForm(store.getProfile()); openPanel("profilePanel"); });
  $("profileForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var v = formValue();
    delete v.id;
    var r = store.setProfile(v);
    if (!r.ok) return say("profileMsg", r.errors.join(" "), true);
    say("profileMsg", "Profile saved." + (r.warnings.length ? " " + r.warnings.join(" ") : ""));
    profileCard();
  });
  $("saveAsChart").addEventListener("click", function () {
    var r = store.saveChart(formValue());
    if (!r.ok) return say("profileMsg", r.errors.join(" "), true);
    say("profileMsg", (editingChartId ? "Chart updated. " : "Chart saved. ") + r.count + " / 100.");
    editingChartId = null;
    renderCharts();
  });

  function renderCharts() {
    var list = store.getCharts();
    $("chartCount").textContent = list.length;
    $("chartList").innerHTML = list.length
      ? list.map(function (c) {
          return '<li><span><a href="#" data-load="' + esc(c.id) + '">' + esc(c.name) + "</a> · " + esc(c.birthDate) + " · " +
            esc(c.birthTime || "time unknown") + " · " + esc(c.birthPlace || "place unknown") +
            '</span><button class="iconbtn" type="button" data-del="' + esc(c.id) + '" aria-label="Delete ' + esc(c.name) + '">✕</button></li>';
        }).join("")
      : '<li class="muted">No saved charts yet.</li>';
  }
  $("chartList").addEventListener("click", function (e) {
    var load = e.target.closest("[data-load]");
    var del = e.target.closest("[data-del]");
    if (load) {
      e.preventDefault();
      var c = store.getCharts().find(function (x) { return x.id === load.dataset.load; });
      if (c) {
        fillForm(c);
        editingChartId = c.id;
        say("profileMsg", 'Loaded "' + c.name + '". Edit and tap "Save as a chart" to update it, or "Save profile" to make it yours.');
      }
    }
    if (del) {
      store.deleteChart(del.dataset.del);
      if (editingChartId === del.dataset.del) editingChartId = null;
      renderCharts();
    }
  });
  $("importAstro").addEventListener("click", function () {
    var r = store.importAstrologyCharts();
    say("chartMsg", r.found
      ? "Found " + r.found + " in the Astrology App. Copied " + r.added + (r.skipped ? ", skipped " + r.skipped + " (already here, incomplete" + (r.full ? ", or the list is full" : "") + ")" : "") + "."
      : "No saved charts found in the Astrology App on this device.", !r.found);
    renderCharts();
  });

  // ---------- settings ----------
  function renderSettings() {
    var s = store.getSettings();
    document.querySelectorAll(".seg[data-setting]").forEach(function (seg) {
      var key = seg.dataset.setting;
      seg.querySelectorAll("button").forEach(function (b) {
        b.setAttribute("aria-pressed", String(s[key] === b.dataset.value));
        b.disabled = key === "houses" && s.reading === "classical" && b.dataset.value === "placidus";
      });
    });
    $("housesNote").textContent = s.reading === "classical"
      ? "Classical uses whole-sign houses. Switch to Modern to choose Placidus."
      : "Modern: Placidus or whole-sign.";
    $("sRedLetters").checked = s.redLetters;
    document.querySelectorAll("[data-canon]").forEach(function (c) { c.checked = s.canons[c.dataset.canon]; });
    var on = Object.keys(s.canons).filter(function (k) { return s.canons[k]; });
    $("canonNote").textContent = on.length === 3 ? "Showing: All canons." : on.length ? "Showing: " + on.join(", ") + "." : "No canon picked: the Bible app will ask you to pick at least one.";
  }
  document.querySelectorAll(".seg[data-setting]").forEach(function (seg) {
    seg.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b || b.disabled) return;
      var patch = {};
      patch[seg.dataset.setting] = b.dataset.value;
      store.setSettings(patch);
      renderSettings();
      say("settingsMsg", "Saved.");
    });
  });
  $("sRedLetters").addEventListener("change", function (e) { store.setSettings({ redLetters: e.target.checked }); renderSettings(); say("settingsMsg", "Saved."); });
  document.querySelectorAll("[data-canon]").forEach(function (c) {
    c.addEventListener("change", function () {
      var patch = { canons: {} };
      patch.canons[c.dataset.canon] = c.checked;
      store.setSettings(patch);
      renderSettings();
      say("settingsMsg", "Saved.");
    });
  });
  $("openSettings").addEventListener("click", function () { renderSettings(); $("settingsMsg").textContent = ""; openPanel("settingsPanel"); });

  // ---------- start ----------
  renderTiles();
  profileCard();
  renderCharts();
  route();
})();
