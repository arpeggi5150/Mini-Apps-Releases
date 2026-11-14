// Arcana Suite — shared store (profile, saved charts, settings). One job: read/write on-device data.
// Contract for modules (they read it in their own build steps, never write the suite's keys
// except through this API):
//   localStorage["arcanaSuite.profile"]  -> {name, birthDate, birthTime, timeUnknown, birthPlace, placeUnknown, updatedAt}
//   localStorage["arcanaSuite.charts"]   -> [{id, name, birthDate, birthTime, birthPlace, savedAt}]  (max 100)
//   localStorage["arcanaSuite.settings"] -> {reading, zodiac, houses, redLetters, canons:{protestant,catholic,orthodox}}
// Inside the suite a module can also call window.parent.ArcanaSuiteStore.
(function (root) {
  "use strict";
  var KEYS = { profile: "arcanaSuite.profile", charts: "arcanaSuite.charts", settings: "arcanaSuite.settings" };
  var CHART_MAX = 100;
  var ASTRO_APP_KEY = "astrologyAppCharts"; // Astrology App v1.4.0's own list — read only, never written
  var DEFAULT_SETTINGS = {
    reading: "classical", // classical | modern
    zodiac: "tropical", // tropical (default) | sidereal
    houses: "whole-sign", // whole-sign | placidus (placidus only in modern)
    redLetters: false, // Bible only
    canons: { protestant: true, catholic: true, orthodox: true }, // Bible only; all on = All
  };

  function createStore(storage) {
    function read(key, fallback) {
      try {
        var raw = storage.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    }
    function write(key, value) {
      try {
        storage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;
      }
    }
    function str(v, max) {
      return typeof v === "string" ? v.trim().slice(0, max || 120) : "";
    }
    function validDate(d) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
      var t = new Date(d + "T00:00:00Z");
      return !isNaN(t) && t.toISOString().slice(0, 10) === d;
    }
    function validTime(t) {
      return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
    }

    // ---- profile ----
    function cleanProfile(p) {
      p = p || {};
      var errors = [];
      var out = {
        name: str(p.name, 60),
        birthDate: str(p.birthDate, 10),
        timeUnknown: !!p.timeUnknown,
        birthTime: null,
        placeUnknown: !!p.placeUnknown,
        birthPlace: null,
      };
      if (!out.name) errors.push("Add a name.");
      if (!validDate(out.birthDate)) errors.push("Add a valid birth date.");
      if (!out.timeUnknown) {
        var t = str(p.birthTime, 5);
        if (validTime(t)) out.birthTime = t;
        else errors.push("Add a birth time, or tick \"I don't know my birth time\".");
      }
      if (!out.placeUnknown) {
        var pl = str(p.birthPlace, 120);
        if (pl) out.birthPlace = pl;
        else errors.push("Add a birth place, or tick \"I don't know my birth place\".");
      }
      var warnings = [];
      if (validDate(out.birthDate)) {
        var y = +out.birthDate.slice(0, 4);
        if (y < 1800 || y > 2050) warnings.push("The astro engine is verified for 1800–2050 only. Readings outside that range are approximate.");
      }
      return { profile: out, errors: errors, warnings: warnings };
    }
    function getProfile() {
      var p = read(KEYS.profile, null);
      return p && typeof p === "object" ? p : null;
    }
    function setProfile(p) {
      var r = cleanProfile(p);
      if (r.errors.length) return { ok: false, errors: r.errors, warnings: r.warnings };
      r.profile.updatedAt = new Date().toISOString();
      if (!write(KEYS.profile, r.profile)) return { ok: false, errors: ["This device would not save it (storage blocked or full)."], warnings: r.warnings };
      return { ok: true, profile: r.profile, errors: [], warnings: r.warnings };
    }
    function clearProfile() {
      try {
        storage.removeItem(KEYS.profile);
      } catch (e) {}
    }

    // ---- saved charts (up to 100) ----
    function getCharts() {
      var l = read(KEYS.charts, []);
      return Array.isArray(l) ? l : [];
    }
    function sameChart(a, b) {
      return a.name === b.name && a.birthDate === b.birthDate && (a.birthTime || null) === (b.birthTime || null) && (a.birthPlace || null) === (b.birthPlace || null);
    }
    function saveChart(p) {
      var r = cleanProfile(p);
      if (r.errors.length) return { ok: false, errors: r.errors };
      var list = getCharts();
      var c = { name: r.profile.name, birthDate: r.profile.birthDate, birthTime: r.profile.birthTime, birthPlace: r.profile.birthPlace };
      var i = p && p.id ? list.findIndex(function (x) { return x.id === p.id; }) : -1;
      if (i < 0 && list.some(function (x) { return sameChart(x, c); })) return { ok: false, errors: ["That chart is already saved."] };
      if (i < 0 && list.length >= CHART_MAX) return { ok: false, errors: ["Saved charts are full (100). Delete one to save another."] };
      c.id = i >= 0 ? list[i].id : "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      c.savedAt = new Date().toISOString();
      if (i >= 0) list[i] = c;
      else list.push(c);
      if (!write(KEYS.charts, list)) return { ok: false, errors: ["This device would not save it (storage blocked or full)."] };
      return { ok: true, chart: c, count: list.length };
    }
    function deleteChart(id) {
      var list = getCharts().filter(function (x) { return x.id !== id; });
      write(KEYS.charts, list);
      return list.length;
    }
    // One-way copy from the Astrology App's own saved charts. Never writes that app's key.
    function importAstrologyCharts() {
      var src = read(ASTRO_APP_KEY, []);
      if (!Array.isArray(src)) src = [];
      var added = 0, skipped = 0, full = false;
      src.forEach(function (a) {
        if (full) { skipped++; return; }
        var r = saveChart({
          name: a.name || "Unnamed",
          birthDate: a.date,
          birthTime: a.time || "",
          timeUnknown: !a.time,
          birthPlace: a.place && a.place !== "Unknown" && a.place !== "—" ? a.place : "",
          placeUnknown: !a.place || a.place === "Unknown" || a.place === "—",
        });
        if (r.ok) added++;
        else {
          skipped++;
          if (/full/.test(r.errors[0])) full = true;
        }
      });
      return { found: src.length, added: added, skipped: skipped, full: full };
    }

    // ---- settings ----
    function cleanSettings(s) {
      s = s || {};
      var out = {
        reading: s.reading === "modern" ? "modern" : "classical",
        zodiac: s.zodiac === "sidereal" ? "sidereal" : "tropical",
        houses: s.houses === "placidus" ? "placidus" : "whole-sign",
        redLetters: !!s.redLetters,
        canons: { protestant: true, catholic: true, orthodox: true },
      };
      if (out.reading === "classical") out.houses = "whole-sign"; // Classical = whole-sign houses (Astro v2 design)
      if (s.canons && typeof s.canons === "object") {
        ["protestant", "catholic", "orthodox"].forEach(function (k) {
          if (k in s.canons) out.canons[k] = !!s.canons[k];
        });
      }
      return out;
    }
    function getSettings() {
      return cleanSettings(read(KEYS.settings, DEFAULT_SETTINGS));
    }
    function setSettings(patch) {
      var cur = getSettings();
      var next = Object.assign({}, cur, patch || {});
      if (patch && patch.canons) next.canons = Object.assign({}, cur.canons, patch.canons);
      next = cleanSettings(next);
      write(KEYS.settings, next);
      return next;
    }

    return {
      KEYS: KEYS,
      CHART_MAX: CHART_MAX,
      DEFAULT_SETTINGS: cleanSettings(DEFAULT_SETTINGS),
      getProfile: getProfile,
      setProfile: setProfile,
      clearProfile: clearProfile,
      getCharts: getCharts,
      saveChart: saveChart,
      deleteChart: deleteChart,
      importAstrologyCharts: importAstrologyCharts,
      getSettings: getSettings,
      setSettings: setSettings,
    };
  }

  if (typeof module === "object" && module.exports) module.exports = { createStore: createStore };
  if (root) {
    var storage;
    try {
      storage = root.localStorage;
      storage.getItem(KEYS.profile);
    } catch (e) {
      storage = null;
    }
    if (!storage) {
      var mem = {};
      storage = { getItem: function (k) { return k in mem ? mem[k] : null; }, setItem: function (k, v) { mem[k] = String(v); }, removeItem: function (k) { delete mem[k]; } };
    }
    root.ArcanaSuiteStore = createStore(storage);
  }
})(typeof window !== "undefined" ? window : null);
