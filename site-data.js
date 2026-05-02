/**
 * Loads CMS JSON from the API and hydrates the DOM without changing layout/CSS hooks.
 * Expects window.__API_BASE__ (e.g. same origin when served via uvicorn). If unset, uses location.origin.
 */
(function (global) {
  "use strict";

  function apiRoot() {
    if (global.__API_BASE__ === false || global.__API_BASE__ === "") return null;
    const raw = global.__API_BASE__ != null ? String(global.__API_BASE__) : "";
    const base = raw.replace(/\/$/, "") || (global.location && global.location.origin) || "";
    return base || null;
  }

  function t(obj, lang) {
    if (!obj || typeof obj !== "object") return "";
    return obj[lang] || obj.ar || obj.en || "";
  }

  function currentLang() {
    return global.localStorage.getItem("ps-lang") || document.documentElement.lang || "ar";
  }

  function markCms(el) {
    if (el) el.dataset.cmsBound = "1";
  }

  function pickByIds(list, ids) {
    if (!Array.isArray(list) || !Array.isArray(ids)) return [];
    const map = new Map(list.map((item) => [item.id, item]));
    return ids.map((id) => map.get(id)).filter(Boolean);
  }

  function applyStats(data, lang) {
    const s = data.stats || {};
    const map = [
      ["patients", s.patients],
      ["doctors", s.doctors],
      ["staff", s.staff],
    ];
    map.forEach(([key, val]) => {
      const el = document.querySelector('.counter[data-stat="' + key + '"]');
      if (el && val != null) {
        el.dataset.target = String(val);
        el.textContent = "0";
        markCms(el);
      }
    });

    const aboutMap = [
      ["aboutPatients", s.aboutPatients ?? s.patients],
      ["aboutDoctors", s.aboutDoctors ?? s.doctors],
      ["aboutStaff", s.aboutStaff ?? s.staff],
      ["aboutSatisfaction", s.aboutSatisfaction],
    ];
    aboutMap.forEach(([key, val]) => {
      const el = document.querySelector('.stat-number[data-stat="' + key + '"]');
      if (el && val != null) {
        el.dataset.count = String(val);
        el.textContent = "0";
        markCms(el);
      }
    });
  }

  function renderHomeServices(container, data, lang) {
    if (!container) return;
    const ids = data.homeFeaturedServiceIds || [];
    const services = pickByIds(data.services || [], ids);
    if (!services.length) return;
    /* Replace only when API returned usable rows (keeps static HTML on failure). */
    container.innerHTML = services
      .map(
        () =>
          '<article class="service-card"><h3 data-cms-bound="1"></h3><p data-cms-bound="1"></p></article>'
      )
      .join("");
    const cards = container.querySelectorAll(".service-card");
    services.forEach((svc, i) => {
      const card = cards[i];
      if (!card) return;
      const h3 = card.querySelector("h3");
      const p = card.querySelector("p");
      if (h3) h3.textContent = t(svc.title, lang);
      if (p) p.textContent = t(svc.text, lang);
    });
  }

  function serviceFlipCard(svc, _delay, lang) {
    const title = t(svc.title, lang);
    const text = t(svc.text, lang);
    const more = t(svc.more, lang);
    const icon = svc.icon || "🦷";
    const imgUrl = svc && svc.image ? String(svc.image) : "";
    const imgHtml = imgUrl
      ? '<div class="service-photo-wrap"><img class="service-photo" loading="lazy" decoding="async" alt="" src="' +
        escapeHtml(imgUrl) +
        '" /></div>'
      : "";
    const href = svc.href || "#";
    const slug = svc.id || "service";
    return (
      '<article class="service-card flip-card" data-service="' +
      slug +
      '" tabindex="0" aria-expanded="false">' +
      '<div class="flip-inner">' +
      '<div class="flip-front">' +
      imgHtml +
      '<div class="service-icon" aria-hidden="true">' +
      icon +
      "</div>" +
      '<h3 data-cms-bound="1">' +
      escapeHtml(title) +
      "</h3>" +
      '<p data-cms-bound="1">' +
      escapeHtml(text) +
      "</p>" +
      "</div>" +
      '<div class="flip-back">' +
      '<div class="service-back-content">' +
      '<h3 data-cms-bound="1">' +
      escapeHtml(title) +
      "</h3>" +
      '<p data-cms-bound="1">' +
      escapeHtml(more) +
      "</p>" +
      '<a class="btn btn-secondary read-more-btn" href="' +
      escapeHtml(href) +
      '" data-translate="readMore">' +
      (lang === "en" ? "Read More" : "اقرأ المزيد") +
      "</a>" +
      "</div></div></div></article>"
    );
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function absMediaUrl(path) {
    const p = String(path || "").trim();
    if (!p) return "";
    if (p.indexOf("http://") === 0 || p.indexOf("https://") === 0) return p;
    const base = apiRoot();
    const normalized = p.charAt(0) === "/" ? p : "/" + p;
    return base ? base.replace(/\/$/, "") + normalized : normalized;
  }

  function ctaPick(ha, field, translateKey, lang) {
    var o = ha && ha.cta && ha.cta[field];
    if (o && typeof o === "object" && (o.ar || o.en)) return t(o, lang);
    var T = global.TRANSLATIONS;
    if (T && translateKey && T[translateKey]) return T[translateKey][lang] || T[translateKey].en || "";
    return "";
  }

  function ctaHrefPick(ha, key, def) {
    var v = ha && ha.cta && ha.cta[key];
    var s = v != null ? String(v).trim() : "";
    return s || def;
  }

  function renderHomeAbout(container, data, lang) {
    if (!container) return;
    var ha = data && data.homeAbout;
    if (!ha || typeof ha !== "object") return;

    var pillRows = Array.isArray(ha.pills) ? ha.pills : [];
    var cardRows = Array.isArray(ha.cards) ? ha.cards : [];
    var tagRows = Array.isArray(ha.tags) ? ha.tags : [];

    var imgUrl = absMediaUrl(ha.visual && ha.visual.image);
    var visualCls =
      "about-showcase__visual about-preview-glass" + (imgUrl ? " about-showcase__visual--has-image" : "");

    var pillsHtml = "";
    pillRows.forEach(function (pill) {
      var tx = pill && pill.title ? t(pill.title, lang) : "";
      if (tx) pillsHtml += '<li class="about-showcase__pill" data-cms-bound="1">' + escapeHtml(tx) + "</li>";
    });

    var cardsHtml = "";
    cardRows.forEach(function (row, idx) {
      var ic = row && row.icon != null ? String(row.icon).trim() : "";
      var tit = row && row.title ? t(row.title, lang) : "";
      var body = row && row.text ? t(row.text, lang) : "";
      var iconClass = "about-showcase__card-icon";
      if (ic) iconClass += " about-showcase__card-icon--emoji";
      else if (idx % 3 === 1) iconClass += " about-showcase__card-icon--alt";
      else if (idx % 3 === 2) iconClass += " about-showcase__card-icon--spark";
      var iconInner = ic ? '<span class="about-showcase__card-emoji" data-cms-bound="1">' + escapeHtml(ic) + "</span>" : "";
      cardsHtml +=
        '<article class="about-showcase__card about-preview-glass" data-cms-bound="1">' +
        '<span class="' +
        iconClass +
        '" aria-hidden="true">' +
        iconInner +
        "</span>" +
        '<h3 class="about-showcase__card-title" data-cms-bound="1">' +
        escapeHtml(tit) +
        "</h3>" +
        '<p class="about-showcase__card-text" data-cms-bound="1">' +
        escapeHtml(body) +
        "</p></article>";
    });

    var tagsHtml = "";
    tagRows.forEach(function (tag) {
      var tx = tag && tag.title ? t(tag.title, lang) : "";
      if (tx) tagsHtml += '<li class="about-showcase__tag" data-cms-bound="1">' + escapeHtml(tx) + "</li>";
    });

    var hlLabel = ha.highlightsLabel ? t(ha.highlightsLabel, lang) : "";
    var eyebrow = ha.eyebrow ? t(ha.eyebrow, lang) : "";
    var title = ha.title ? t(ha.title, lang) : "";
    var desc = ha.description ? t(ha.description, lang) : "";
    var vk = ha.visual && ha.visual.kicker ? t(ha.visual.kicker, lang) : "";
    var vs = ha.visual && ha.visual.sub ? t(ha.visual.sub, lang) : "";
    var chip = ha.visual && ha.visual.chip ? t(ha.visual.chip, lang) : "";

    var imgBlock = imgUrl
      ? '<img class="about-showcase__visual-photo" src="' +
        escapeHtml(imgUrl) +
        '" alt="' +
        escapeHtml(chip || "") +
        '" loading="lazy" decoding="async" data-cms-bound="1" />'
      : "";

    container.innerHTML =
      '<div class="about-showcase__grid" data-cms-bound="1">' +
      '<div class="about-showcase__main">' +
      (eyebrow
        ? '<p class="about-showcase__eyebrow eyebrow eyebrow-dark" data-cms-bound="1">' + escapeHtml(eyebrow) + "</p>"
        : "") +
      (title
        ? '<h2 class="about-showcase__title" id="aboutPreviewHeading" data-cms-bound="1">' + escapeHtml(title) + "</h2>"
        : "") +
      (desc ? '<p class="about-showcase__lead" data-cms-bound="1">' + escapeHtml(desc) + "</p>" : "") +
      (pillsHtml
        ? '<ul class="about-showcase__pills" aria-label="Highlights">' + pillsHtml + "</ul>"
        : "") +
      (hlLabel
        ? '<p class="about-showcase__highlights-label" data-cms-bound="1">' + escapeHtml(hlLabel) + "</p>"
        : "") +
      (cardsHtml ? '<div class="about-showcase__highlights" aria-label="Features">' + cardsHtml + "</div>" : "") +
      '<div class="about-showcase__actions">' +
      '<a href="' +
      escapeHtml(ctaHrefPick(ha, "primaryHref", "#booking")) +
      '" class="btn btn-primary about-showcase__cta-primary" data-cms-bound="1">' +
      escapeHtml(ctaPick(ha, "primaryLabel", "heroBook", lang)) +
      "</a>" +
      '<a href="' +
      escapeHtml(ctaHrefPick(ha, "secondaryHref", "about.html")) +
      '" class="btn btn-secondary" data-cms-bound="1">' +
      escapeHtml(ctaPick(ha, "secondaryLabel", "learnMore", lang)) +
      "</a>" +
      '<a href="' +
      escapeHtml(ctaHrefPick(ha, "tertiaryHref", "#stats")) +
      '" class="btn btn-secondary about-showcase__btn-tertiary" data-cms-bound="1">' +
      escapeHtml(ctaPick(ha, "tertiaryLabel", "aboutPreviewViewStats", lang)) +
      "</a>" +
      "</div></div>" +
      '<aside class="about-showcase__media" aria-label="Clinic visual">' +
      '<div class="' +
      visualCls +
      '">' +
      '<div class="about-showcase__visual-inner">' +
      imgBlock +
      '<div class="about-showcase__visual-mesh" aria-hidden="true"></div>' +
      '<div class="about-showcase__visual-ring" aria-hidden="true"></div>' +
      '<div class="about-showcase__visual-content">' +
      (vk ? '<p class="about-showcase__visual-kicker" data-cms-bound="1">' + escapeHtml(vk) + "</p>" : "") +
      (vs ? '<p class="about-showcase__visual-sub" data-cms-bound="1">' + escapeHtml(vs) + "</p>" : "") +
      (chip ? '<span class="about-showcase__visual-chip" data-cms-bound="1">' + escapeHtml(chip) + "</span>" : "") +
      "</div></div></div>" +
      (tagsHtml ? '<ul class="about-showcase__media-tags" aria-label="Facts">' + tagsHtml + "</ul>" : "") +
      "</aside></div>";
  }

  function renderServicesPageGrid(container, data, lang) {
    if (!container) return;
    const list = data.services || [];
    if (!list.length) return;
    container.innerHTML = list
      .map((svc, idx) => serviceFlipCard(svc, idx * 70, lang))
      .join("");
  }

  function renderHomeDoctors(container, data, lang) {
    if (!container) return;
    const ids = data.homeDoctorIds || [];
    const doctors = pickByIds(data.homeDoctors || [], ids);
    if (!doctors.length) return;
    container.innerHTML = doctors
      .map(
        () =>
          '<div class="doctor-card" data-cms-bound="1"><div class="doc-img"></div><h4 data-cms-bound="1"></h4><span data-cms-bound="1"></span></div>'
      )
      .join("");
    const cards = container.querySelectorAll(".doctor-card");
    doctors.forEach((doc, i) => {
      const card = cards[i];
      if (!card) return;
      const imgHost = card.querySelector(".doc-img");
      const h4 = card.querySelector("h4");
      const span = card.querySelector("span");
      if (h4) h4.textContent = t(doc.name, lang);
      if (span) span.textContent = t(doc.role, lang);
      const url = doc && doc.image ? String(doc.image) : "";
      if (imgHost) {
        imgHost.innerHTML = "";
        if (url) {
          const img = document.createElement("img");
          img.src = url;
          img.alt = "";
          img.loading = "lazy";
          img.decoding = "async";
          imgHost.appendChild(img);
          imgHost.classList.add("has-img");
        } else {
          imgHost.classList.remove("has-img");
        }
      }
    });
  }

  function teamDoctorArticle(doc, index, lang) {
    const name = t(doc.name, lang);
    const role = t(doc.role, lang);
    const delay = index * 70;
    const nid = "cms-doc-" + index;
    const imgUrl = doc && doc.image ? String(doc.image) : "";
    const imgHtml = imgUrl
      ? '<img class="doc-photo" loading="lazy" decoding="async" alt="" src="' + escapeHtml(imgUrl) + '" />'
      : "";
    return (
      '<article class="doctor-card flip-card reveal" data-cms-bound="1" data-reveal-delay="' +
      delay +
      '" tabindex="0" aria-labelledby="' +
      nid +
      '-name">' +
      '<div class="flip-inner">' +
      '<div class="flip-front">' +
      '<div class="doc-img" aria-hidden="true">' +
      imgHtml +
      "</div>" +
      '<h4 id="' +
      nid +
      '-name" data-cms-bound="1">' +
      escapeHtml(name) +
      "</h4>" +
      '<div class="lang-chips" aria-hidden="true"><span class="lang-chip">EN</span><span class="lang-chip">AR</span></div>' +
      "</div>" +
      '<div class="flip-back">' +
      '<div class="back-content">' +
      '<p class="role" data-cms-bound="1">' +
      escapeHtml(role) +
      "</p>" +
      '<div class="lang-chips"><span class="lang-chip">EN</span><span class="lang-chip">AR</span></div>' +
      '<button class="btn view-profile" type="button" data-translate="viewProfile">' +
      (lang === "en" ? "View Profile" : "عرض البروفايل") +
      "</button>" +
      "</div></div></div></article>"
    );
  }

  function renderTeamDoctors(container, data, lang) {
    if (!container) return;
    const list = data.doctors || [];
    if (!list.length) return;
    container.innerHTML = list.map((d, i) => teamDoctorArticle(d, i, lang)).join("");
  }

  function renderOffersGrid(container, data, lang) {
    if (!container) return;
    const offers = data.offers || [];
    if (!offers.length) return;
    container.innerHTML = offers
      .map((off) => {
        const oid = off && off.id != null ? String(off.id).replace(/"/g, "") : "";
        return (
          '<article class="offer-card"' +
          (oid ? ' data-offer-id="' + oid + '"' : "") +
          ">" +
          '<div class="offer-image" aria-hidden="true"></div>' +
          '<div class="offer-content">' +
          '<span class="offer-tag" data-cms-bound="1"></span>' +
          '<p data-cms-bound="1"></p>' +
          '<a href="index.html#booking" class="btn btn-primary" data-translate="bookNowButton">' +
          (lang === "en" ? "Book Now" : "احجز الآن") +
          "</a>" +
          "</div></article>"
        );
      })
      .join("");
    const cards = container.querySelectorAll(".offer-card");
    offers.forEach((off, i) => {
      const card = cards[i];
      if (!card) return;
      const img = card.querySelector(".offer-image");
      const tag = card.querySelector(".offer-tag");
      const p = card.querySelector("p");
      if (img && off && off.image) {
        const url = String(off.image || "").trim();
        if (url) img.style.backgroundImage = "url('" + url.replace(/'/g, "%27") + "')";
      }
      if (tag) tag.textContent = t(off.title, lang);
      if (p) p.textContent = t(off.text, lang);
    });
  }

  function applyOffersPageCopy(data, lang) {
    const page = data.offersPage;
    if (!page || typeof page !== "object") return;
    const pairs = [
      ["cms-offers-hero-eyebrow", page.heroEyebrow],
      ["cms-offers-hero-title", page.heroTitle],
      ["cms-offers-section-eyebrow", page.sectionEyebrow],
      ["cms-offers-section-title", page.sectionTitle],
    ];
    pairs.forEach(([id, field]) => {
      const el = document.getElementById(id);
      if (el && field) {
        el.textContent = t(field, lang);
        markCms(el);
      }
    });
  }

  function syncTranslationsForBooking(data) {
    const T = global.TRANSLATIONS;
    if (!T || !data.doctors) return;
    data.doctors.forEach((d, idx) => {
      const i = idx + 1;
      if (d.name) {
        T["teamDoctor" + i + "Name"] = { ar: d.name.ar || "", en: d.name.en || "" };
      }
      if (d.role) {
        T["teamDoctor" + i + "Role"] = { ar: d.role.ar || "", en: d.role.en || "" };
      }
    });
  }

  function apply(data) {
    if (!data) return;
    global.__SITE_DATA__ = data;
    const lang = currentLang();
    syncTranslationsForBooking(data);
    applyStats(data, lang);

    renderHomeServices(document.getElementById("cms-home-services"), data, lang);
    renderServicesPageGrid(document.getElementById("cms-services-grid"), data, lang);
    renderHomeDoctors(document.getElementById("cms-home-doctors"), data, lang);
    renderTeamDoctors(document.getElementById("cms-team-doctors"), data, lang);
    renderOffersGrid(document.getElementById("cms-offers-grid"), data, lang);
    applyOffersPageCopy(data, lang);
    renderHomeAbout(document.getElementById("cms-home-about"), data, lang);
    if (typeof global.RevealObserver !== "undefined" && typeof global.RevealObserver.refresh === "function") {
      global.RevealObserver.refresh();
    }

    document.dispatchEvent(new CustomEvent("cms-data-applied", { detail: data }));
  }

  function refreshLanguage() {
    const data = global.__SITE_DATA__;
    if (!data) return;
    const lang = currentLang();
    syncTranslationsForBooking(data);
    applyStats(data, lang);
    renderHomeServices(document.getElementById("cms-home-services"), data, lang);
    renderServicesPageGrid(document.getElementById("cms-services-grid"), data, lang);
    renderHomeDoctors(document.getElementById("cms-home-doctors"), data, lang);
    renderTeamDoctors(document.getElementById("cms-team-doctors"), data, lang);
    if (typeof global.RevealObserver !== "undefined" && typeof global.RevealObserver.refresh === "function") {
      global.RevealObserver.refresh();
    }
    renderOffersGrid(document.getElementById("cms-offers-grid"), data, lang);
    applyOffersPageCopy(data, lang);
    renderHomeAbout(document.getElementById("cms-home-about"), data, lang);
    if (typeof global.RevealObserver !== "undefined" && typeof global.RevealObserver.refresh === "function") {
      global.RevealObserver.refresh();
    }

    document.querySelectorAll("#cms-services-grid .read-more-btn").forEach((btn) => {
      const key = "readMore";
      if (global.TRANSLATIONS && global.TRANSLATIONS[key]) {
        btn.textContent = global.TRANSLATIONS[key][lang] || btn.textContent;
      }
    });
    document.querySelectorAll("#cms-team-doctors .view-profile").forEach((btn) => {
      const key = "viewProfile";
      if (global.TRANSLATIONS && global.TRANSLATIONS[key]) {
        btn.textContent = global.TRANSLATIONS[key][lang] || btn.textContent;
      }
    });
    document.querySelectorAll("#cms-offers-grid [data-translate='bookNowButton']").forEach((btn) => {
      const key = "bookNowButton";
      if (global.TRANSLATIONS && global.TRANSLATIONS[key]) {
        btn.textContent = global.TRANSLATIONS[key][lang] || btn.textContent;
      }
    });
  }

  function load() {
    const root = apiRoot();
    if (!root) return Promise.resolve(null);
    const url = root + "/api/data";
    return fetch(url, { credentials: "omit" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json) apply(json);
        return json;
      })
      .catch(() => null);
  }

  global.SiteData = { load, apply, refreshLanguage, apiRoot };
})(typeof window !== "undefined" ? window : globalThis);
