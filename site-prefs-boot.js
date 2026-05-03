/**
 * Early boot: language (navigator) + theme (prefers-color-scheme), persisted in localStorage.
 * Only seeds missing keys — never overwrites existing ps-lang / ps-theme (user choice).
 * Public site: html lang/dir + .dark-theme. Admin: .admin-root + theme-dark/light + lang/dir.
 */
(function () {
  "use strict";

  /* Ensure UTF-8 before any other head work (avoids wrong decoding on slow connections). */
  try {
    var headCharset = document.head;
    if (headCharset && !document.querySelector("meta[charset]")) {
      var cs = document.createElement("meta");
      cs.setAttribute("charset", "UTF-8");
      headCharset.insertBefore(cs, headCharset.firstChild);
    }
  } catch (eCharset) {
    /* no-op */
  }

  var LANG_KEY = "ps-lang";
  var THEME_KEY = "ps-theme";
  var LEGACY_ADMIN_THEME = "ps_admin_theme";

  function get(k) {
    try {
      return window.localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  }

  function set(k, v) {
    try {
      window.localStorage.setItem(k, v);
    } catch (e) {
      /* private mode */
    }
  }

  function detectLang() {
    var list = [];
    try {
      if (navigator.languages && navigator.languages.length) {
        for (var i = 0; i < navigator.languages.length; i++) list.push(navigator.languages[i]);
      }
    } catch (e1) {}
    try {
      if (navigator.language) list.push(navigator.language);
    } catch (e2) {}
    for (var j = 0; j < list.length; j++) {
      var tag = String(list[j] || "").toLowerCase().trim();
      if (!tag) continue;
      if (tag === "ar" || tag.indexOf("ar-") === 0) return "ar";
    }
    return "en";
  }

  function detectTheme() {
    try {
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
      }
    } catch (e) {}
    return "light";
  }

  var hadLang = get(LANG_KEY);
  var hadTheme = get(THEME_KEY);

  if (hadLang == null || hadLang === "") {
    set(LANG_KEY, detectLang());
  }
  if (hadTheme == null || hadTheme === "") {
    var legacy = get(LEGACY_ADMIN_THEME);
    if (legacy === "dark" || legacy === "light") {
      set(THEME_KEY, legacy);
    } else {
      set(THEME_KEY, detectTheme());
    }
  }

  var lang = get(LANG_KEY) || "ar";
  if (lang !== "ar" && lang !== "en") lang = "ar";
  var theme = get(THEME_KEY) || "light";
  if (theme !== "dark" && theme !== "light") theme = "light";

  var root = document.documentElement;
  var isAdmin = root.classList && root.classList.contains("admin-root");

  if (isAdmin) {
    root.lang = lang === "ar" ? "ar" : "en";
    root.dir = lang === "ar" ? "rtl" : "ltr";
    root.classList.toggle("theme-dark", theme === "dark");
    root.classList.toggle("theme-light", theme !== "dark");
  } else {
    root.lang = lang === "en" ? "en" : "ar";
    root.dir = lang === "en" ? "ltr" : "rtl";
    root.classList.toggle("dark-theme", theme === "dark");
  }

  /* Public: hide first paint until main script applies i18n (no flash of wrong-dir or garbled placeholders on navigation). */
  if (!isAdmin) {
    try {
      var headI18n = document.head;
      if (headI18n && !document.getElementById("ps-i18n-pending-style")) {
        var stI18n = document.createElement("style");
        stI18n.id = "ps-i18n-pending-style";
        stI18n.textContent = "html.ps-i18n-pending body{visibility:hidden!important}";
        headI18n.appendChild(stI18n);
      }
      root.classList.add("ps-i18n-pending");
      setTimeout(function () {
        try {
          root.classList.remove("ps-i18n-pending");
          var rm = document.getElementById("ps-i18n-pending-style");
          if (rm) rm.remove();
        } catch (t1) {
          /* no-op */
        }
      }, 8000);
    } catch (eI18n) {
      /* no-op */
    }
  }

  try {
    var head0 = document.head;
    if (head0) {
      var m = document.querySelector('meta[http-equiv="content-language"]');
      if (!m) {
        m = document.createElement("meta");
        m.setAttribute("http-equiv", "content-language");
        head0.appendChild(m);
      }
      m.setAttribute("content", lang === "ar" ? "ar" : "en");
    }
  } catch (em) {
    /* no-op */
  }

  /* SEO: hreflang on public http(s) pages only */
  try {
    var headSeo = document.head;
    if (headSeo && !isAdmin && !root.getAttribute("data-ps-seo-boot")) {
      root.setAttribute("data-ps-seo-boot", "1");
      var origin = "";
      var path = "/";
      try {
        origin = location.origin || "";
        path = location.pathname || "/";
      } catch (e3) {}
      if (origin && location.protocol !== "file:") {
        var abs = origin + (path.indexOf("/") === 0 ? path : "/" + path);
        function addLink(rel, hreflang, href) {
          var l = document.createElement("link");
          l.setAttribute("rel", rel);
          l.setAttribute("hreflang", hreflang);
          l.setAttribute("href", href);
          headSeo.appendChild(l);
        }
        addLink("alternate", "x-default", abs);
        addLink("alternate", "ar", abs);
        addLink("alternate", "en", abs);
      }
    }
  } catch (e4) {
    /* no-op */
  }

  /* CMS / FastAPI base: local dev always talks to uvicorn :8000 (see start-api.bat). */
  try {
    var locApi = window.location || {};
    var protoApi = String(locApi.protocol || "");
    var hostApi = String(locApi.hostname || "").toLowerCase();
    var already =
      typeof window.__API_BASE__ !== "undefined" &&
      window.__API_BASE__ !== "" &&
      window.__API_BASE__ !== null &&
      window.__API_BASE__ !== false;
    if (!already) {
      if (
        protoApi === "file:" ||
        hostApi === "127.0.0.1" ||
        hostApi === "localhost" ||
        hostApi === "[::1]"
      ) {
        window.__API_BASE__ = "http://127.0.0.1:8000";
      }
    }
  } catch (eApiBase) {
    /* no-op */
  }
})();

