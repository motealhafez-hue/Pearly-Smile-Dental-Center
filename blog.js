// Mobile-first Blog system: listing + article rendering.
// Data shape matches api/main.py BlogPost + admin Blog editor: slug, title, excerpt, tag, read_time,
// hero_image, meta_title, meta_description, content_html, related_slugs, published.
(function () {
  "use strict";

  /** Default cover for posts without hero_image — clinical, text-free, compressed */
  const DEFAULT_BLOG_COVER =
    "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=960&q=75";

  function currentLang() {
    try {
      const as = window.appState;
      if (as && (as.currentLang === "ar" || as.currentLang === "en")) return as.currentLang;
    } catch (e) {
      /* no-op */
    }
    const stored = localStorage.getItem("ps-lang");
    if (stored === "ar" || stored === "en") return stored;
    const h = document.documentElement && document.documentElement.lang;
    if (h === "ar" || h === "en") return h;
    return "ar";
  }

  function tr(key) {
    try {
      const lang = currentLang();
      const dict = window.TRANSLATIONS || {};
      const v = dict[key];
      return (v && (v[lang] || v.ar || v.en)) || "";
    } catch (e) {
      return "";
    }
  }

  function pickLang(val, lang) {
    if (val == null) return "";
    if (typeof val === "string") return val;
    if (typeof val === "object") return val[lang] || val.ar || val.en || "";
    return String(val);
  }

  function apiBase() {
    try {
      if (
        typeof window.__API_BASE__ !== "undefined" &&
        window.__API_BASE__ !== "" &&
        window.__API_BASE__ !== false &&
        window.__API_BASE__ !== null
      ) {
        return String(window.__API_BASE__).replace(/\/$/, "");
      }
      try {
        var ls = String(window.localStorage.getItem("ps_api_base") || "").trim();
        if (ls) return ls.replace(/\/$/, "");
      } catch (eLs) {
        /* no-op */
      }
      if (location.protocol === "file:") return "http://127.0.0.1:8000";
      var host = String(location.hostname || "").toLowerCase();
      if (host === "127.0.0.1" || host === "localhost" || host === "[::1]") {
        return "http://127.0.0.1:8000";
      }
      return String(location.origin).replace(/\/$/, "");
    } catch (e) {
      return "http://127.0.0.1:8000";
    }
  }

  function currentPageType() {
    const el = document.documentElement;
    if (!el) return "";
    const fromDs = el.dataset && el.dataset.page;
    if (fromDs) return fromDs;
    return el.getAttribute("data-page") || "";
  }

  function extractBlogSlug() {
    const path = location.pathname || "";
    const marker = "/blog/";
    const idx = path.indexOf(marker);
    if (idx !== -1) {
      let rest = path.slice(idx + marker.length).replace(/\/+$/, "");
      const segment = rest.split("/")[0] || "";
      if (!segment) return "";
      try {
        return decodeURIComponent(segment);
      } catch (e) {
        return segment;
      }
    }
    try {
      const u = new URL(location.href);
      return String(u.searchParams.get("slug") || "").trim();
    } catch (e2) {
      return "";
    }
  }

  function resolveArticleHtml(post, lang) {
    if (!post || typeof post !== "object") return "";
    const keys = ["content_html", "content", "body", "html"];
    for (let i = 0; i < keys.length; i++) {
      const html = pickLang(post[keys[i]], lang);
      if (html && String(html).trim()) return String(html);
    }
    return "";
  }

  function resolveHeroImage(post) {
    if (!post || typeof post !== "object") return "";
    const v = post.hero_image || post.image || post.cover_image;
    return v ? String(v) : "";
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function postUrl(slug) {
    if (typeof window.psBlogPostUrl === "function") {
      return window.psBlogPostUrl(slug);
    }
    const s = encodeURIComponent(String(slug || "").trim());
    if (location.protocol === "file:") return "blog-post.html?slug=" + s;
    const dir = (location.pathname || "").replace(/[^/]+$/, "");
    return (dir || "./") + "blog-post.html?slug=" + s;
  }

  function safeSlugId(slug) {
    const s = String(slug || "post")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return (s || "post").slice(0, 64);
  }

  function absolutePostHref(slug) {
    const path = postUrl(slug);
    try {
      return new URL(path, location.href).href;
    } catch (e) {
      return path;
    }
  }

  /** Semantic blog card markup (listing, related, home teaser) — shared structure for SEO. */
  function htmlPsBlogCard(p, lang) {
    const title = pickLang(p.title, lang);
    const excerpt = (pickLang(p.excerpt, lang) || "").trim();
    const tagText = pickLang(p.tag, lang);
    const coverSrc = resolveHeroImage(p) || DEFAULT_BLOG_COVER;
    const href = postUrl(p.slug);
    const urlProp = absolutePostHref(p.slug);
    const titleId = "ps-blog-card-title-" + safeSlugId(p.slug);
    const readMore = tr("blogReadMore") || "Read more";
    const rt = p.read_time
      ? lang === "ar"
        ? String(p.read_time) + " " + (tr("blogReadTimeSuffix") || "دقائق قراءة")
        : String(p.read_time) + " " + (tr("blogReadTimeSuffix") || "min read")
      : tr("blogQuickRead") || "";

    const metaParts = [];
    if (tagText) {
      metaParts.push('<span class="ps-blog-card__tag">' + escapeHtml(tagText) + "</span>");
    }
    if (rt) {
      metaParts.push('<span class="ps-blog-card__readtime">' + escapeHtml(rt) + "</span>");
    }
    const metaRow = metaParts.length
      ? '<div class="ps-blog-card__meta">' + metaParts.join("") + "</div>"
      : "";

    const excerptBlock = excerpt
      ? '<p class="ps-blog-card__excerpt" itemprop="description">' + escapeHtml(excerpt) + "</p>"
      : "";

    return (
      '<article class="ps-blog-card" itemscope itemtype="https://schema.org/BlogPosting">' +
      '<link itemprop="url" href="' +
      escapeHtml(urlProp) +
      '" />' +
      '<a class="ps-blog-card__surface" href="' +
      escapeHtml(href) +
      '" aria-labelledby="' +
      escapeHtml(titleId) +
      '">' +
      '<figure class="ps-blog-card__figure">' +
      '<img class="ps-blog-card__img" src="' +
      escapeHtml(coverSrc) +
      '" alt="' +
      escapeHtml(title || readMore) +
      '" width="960" height="540" loading="lazy" decoding="async" itemprop="image" />' +
      "</figure>" +
      '<div class="ps-blog-card__body">' +
      metaRow +
      '<h3 class="ps-blog-card__title" id="' +
      escapeHtml(titleId) +
      '" itemprop="headline">' +
      escapeHtml(title || "") +
      "</h3>" +
      excerptBlock +
      '<span class="ps-blog-card__cta"><span class="ps-blog-card__cta-text">' +
      escapeHtml(readMore) +
      "</span></span>" +
      "</div></a></article>"
    );
  }

  function markSameOriginBlogApi() {
    try {
      if (
        location.protocol !== "file:" &&
        typeof window.psMarkBlogApiAvailable === "function" &&
        apiBase().replace(/\/$/, "") === location.origin
      ) {
        window.psMarkBlogApiAvailable({ sameOrigin: true });
      }
    } catch (e) {
      /* no-op */
    }
  }

  function setMetaTitle(t) {
    if (!t) return;
    document.title = t;
  }

  function setMetaDescription(desc) {
    if (!desc) return;
    let el = document.querySelector('meta[name="description"]');
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", "description");
      document.head.appendChild(el);
    }
    el.setAttribute("content", desc);
  }

  function setCanonical(url) {
    if (!url) return;
    const byId = document.getElementById("blog-canonical-link");
    if (byId) {
      byId.setAttribute("href", url);
      return;
    }
    let el = document.querySelector('link[rel="canonical"]');
    if (!el) {
      el = document.createElement("link");
      el.setAttribute("rel", "canonical");
      document.head.appendChild(el);
    }
    el.setAttribute("href", url);
  }

  function setAbsoluteCanonical(pathOrUrl) {
    try {
      const base = location.protocol === "file:" ? apiBase() : location.origin;
      const u =
        pathOrUrl.indexOf("http") === 0
          ? pathOrUrl
          : base.replace(/\/$/, "") + (pathOrUrl.indexOf("/") === 0 ? pathOrUrl : "/" + pathOrUrl);
      setCanonical(u);
    } catch (e) {
      setCanonical(pathOrUrl);
    }
  }

  function upsertMeta(attrName, attrVal, content) {
    let el = document.querySelector(`meta[${attrName}="${attrVal}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attrName, attrVal);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  }

  function setSocialMeta(opts) {
    const { title, description, imageUrl, url, type } = opts;
    if (title) {
      upsertMeta("property", "og:title", title);
      upsertMeta("name", "twitter:title", title);
    }
    if (description) {
      upsertMeta("property", "og:description", description);
      upsertMeta("name", "twitter:description", description);
    }
    if (imageUrl) {
      upsertMeta("property", "og:image", imageUrl);
      upsertMeta("name", "twitter:image", imageUrl);
    }
    if (url) upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:type", type || "article");
    upsertMeta("property", "og:site_name", "Pearly Smile Dental Center");
  }

  function formatPostDate(iso, lang) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const loc = lang === "ar" ? "ar-SA" : "en-GB";
    try {
      return new Intl.DateTimeFormat(loc, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(d);
    } catch (e) {
      return iso.slice(0, 10);
    }
  }

  function tagsMatch(a, b, lang) {
    return pickLang(a, lang) === pickLang(b, lang);
  }

  async function fetchJson(path) {
    const url = apiBase().replace(/\/$/, "") + path;
    const r = await fetch(url, { credentials: "omit" });
    if (!r.ok) {
      const err = new Error("HTTP " + r.status + " " + url);
      err.status = r.status;
      throw err;
    }
    return r.json();
  }

  // #region agent log
  function _dbgBlogPad(message, hypothesisId, data) {
    fetch("http://127.0.0.1:7564/ingest/b2698cbe-56cc-4593-963c-a04c198ebff3", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "efd322" },
      body: JSON.stringify({
        sessionId: "efd322",
        runId: "navpad-pre",
        hypothesisId: hypothesisId,
        location: "blog.js:_dbgBlogPad",
        message: message,
        data: data || {},
        timestamp: Date.now(),
      }),
    }).catch(function () {});
  }
  // #endregion

  function initBlogNavbarBehavior() {
    const page = currentPageType();
    if (page !== "blog" && page !== "blog_post") return;
    const header = document.querySelector("header.mobile-nav");
    if (!header) return;

    /* Never auto-hide the navbar on blog pages — it felt "blocked" by the tall hero + scroll. */
    header.classList.remove("blog-nav-hidden");

    let ticking = false;
    function apply() {
      const y = Math.max(0, window.scrollY || 0);
      header.classList.toggle("blog-nav-elevated", y > 12);
      ticking = false;
    }

    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(apply);
      },
      { passive: true }
    );
    window.addEventListener("resize", apply, { passive: true });
    apply();
  }

  /**
   * Blog article only: set #blogPostMain padding-top from the *actual* fixed header height.
   * CSS guesses (rem/vw) break when the nav wraps to two rows — this matches the real bar every time.
   */
  function syncBlogPostMainUnderNav() {
    const pt = currentPageType();
    if (pt !== "blog_post") {
      // #region agent log
      _dbgBlogPad("syncBlogPostMainUnderNav skip: pageType", "H1", { pageType: pt, dsPage: document.documentElement && document.documentElement.getAttribute("data-page") });
      // #endregion
      return;
    }
    const main = document.getElementById("blogPostMain");
    const header = document.querySelector("header.mobile-nav");
    if (!main || !header) {
      // #region agent log
      _dbgBlogPad("syncBlogPostMainUnderNav skip: missing el", "H2", { hasMain: !!main, hasHeader: !!header });
      // #endregion
      return;
    }
    const b = header.getBoundingClientRect();
    const pad = Math.max(Math.ceil(b.bottom) + 28, 128);
    main.style.paddingTop = pad + "px";
    var cs = "";
    try {
      cs = window.getComputedStyle(main).paddingTop;
    } catch (e) {
      cs = "err";
    }
    // #region agent log
    _dbgBlogPad("syncBlogPostMainUnderNav applied", "H3_H4", {
      headerTop: Math.round(b.top * 10) / 10,
      headerBottom: Math.round(b.bottom * 10) / 10,
      headerH: Math.round(b.height * 10) / 10,
      padPx: pad,
      computedPaddingTop: cs,
      scrollY: typeof window.scrollY === "number" ? window.scrollY : 0,
    });
    // #endregion

    /* After layout: bump padding if article (or title) still starts above the fixed header bottom */
    var titleEl = document.getElementById("blog-title");
    var hdrEl = header;
    var mainEl = main;
    var basePad = pad;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        try {
          if (currentPageType() !== "blog_post") return;
          var hR = hdrEl.getBoundingClientRect();
          var gap = 12;
          var bump = 0;
          var art = mainEl.querySelector(".blog-reader-article") || document.getElementById("blogPostingArticle");
          if (art && art.getClientRects().length) {
            var aR = art.getBoundingClientRect();
            if (aR.top < hR.bottom + gap) bump = Math.max(bump, Math.ceil(hR.bottom + gap - aR.top));
          }
          if (titleEl && titleEl.getClientRects().length) {
            var tR = titleEl.getBoundingClientRect();
            if (tR.height >= 2 && tR.top < hR.bottom + gap) bump = Math.max(bump, Math.ceil(hR.bottom + gap - tR.top));
          }
          if (bump <= 0) return;
          var cur = parseFloat(mainEl.style.paddingTop, 10);
          if (isNaN(cur)) cur = basePad;
          var nextPad = cur + bump + 8;
          mainEl.style.paddingTop = nextPad + "px";
          // #region agent log
          _dbgBlogPad("syncBlogPostMainUnderNav overlapFix", "H6", {
            bump: bump,
            nextPadPx: nextPad,
            articleTop: art ? Math.round(art.getBoundingClientRect().top * 10) / 10 : null,
            titleTop: titleEl ? Math.round(titleEl.getBoundingClientRect().top * 10) / 10 : null,
            headerBottom: Math.round(hR.bottom * 10) / 10,
          });
          // #endregion
        } catch (e2) {
          // #region agent log
          _dbgBlogPad("syncBlogPostMainUnderNav overlapFix err", "H6", { err: String(e2 && e2.message ? e2.message : e2) });
          // #endregion
        }
      });
    });
  }

  function scheduleBlogPostMainPadSync() {
    if (currentPageType() !== "blog_post") return;
    // #region agent log
    _dbgBlogPad("scheduleBlogPostMainPadSync", "H5", { readyState: document.readyState });
    // #endregion
    requestAnimationFrame(function () {
      syncBlogPostMainUnderNav();
    });
  }

  /**
   * Re-measure when the fixed navbar changes size — applies to every slug (old + new posts),
   * same blog-post.html shell. Also after i18n removes ps-i18n-pending (App.init) when nav text reflows.
   */
  function attachBlogPostNavPadObservers() {
    if (currentPageType() !== "blog_post") return;
    const root = document.documentElement;
    if (root._psBlogNavPadAttached) return;
    root._psBlogNavPadAttached = true;

    const header = document.querySelector("header.mobile-nav");
    if (header && typeof ResizeObserver !== "undefined" && !header._psBlogPadRO) {
      var ro = new ResizeObserver(function () {
        scheduleBlogPostMainPadSync();
      });
      ro.observe(header);
      header._psBlogPadRO = ro;
    }

    window.addEventListener(
      "load",
      function () {
        scheduleBlogPostMainPadSync();
      },
      { once: true, passive: true }
    );

    if (typeof MutationObserver !== "undefined" && root && !root._psBlogPadMO) {
      var moTimer = null;
      var mo = new MutationObserver(function () {
        clearTimeout(moTimer);
        moTimer = setTimeout(function () {
          scheduleBlogPostMainPadSync();
        }, 16);
      });
      mo.observe(root, { attributes: true, attributeFilter: ["class"] });
      root._psBlogPadMO = mo;
    }

    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(
        function () {
          scheduleBlogPostMainPadSync();
        },
        { timeout: 2500 }
      );
    }
  }

  // -----------------------
  // Listing
  // -----------------------
  function renderListing(posts) {
    const grid = document.getElementById("blogGrid");
    if (!grid) return;

    const prevAbort = grid._psBlogListingAbort;
    if (prevAbort) {
      try {
        prevAbort.abort();
      } catch (e) {
        /* no-op */
      }
    }
    const listSignal = new AbortController();
    grid._psBlogListingAbort = listSignal;
    const signal = listSignal.signal;

    const searchEl = document.getElementById("blogSearch");
    const tagEl = document.getElementById("blogTag");
    const prevBtn = document.getElementById("blogPrev");
    const nextBtn = document.getElementById("blogNext");
    const infoEl = document.getElementById("blogPageInfo");

    const PAGE_SIZE = 9;
    let page = 1;
    let q = "";
    let tag = "";
    const lang = currentLang();

    const tags = Array.from(
      new Set(
        (posts || [])
          .map((p) => (p && p.tag ? pickLang(p.tag, lang) : ""))
          .filter(Boolean)
      )
    ).sort();
    if (tagEl) {
      const allLabel = tr("blogAllTags") || "";
      tagEl.innerHTML = "";
      const optAll = document.createElement("option");
      optAll.value = "";
      optAll.textContent = allLabel;
      tagEl.appendChild(optAll);
      tags.forEach((t) => {
        const o = document.createElement("option");
        o.value = t;
        o.textContent = t;
        tagEl.appendChild(o);
      });
    }

    function matches(p) {
      if (!p) return false;
      if (tag && pickLang(p.tag, lang) !== tag) return false;
      if (!q) return true;
      const hay = (
        pickLang(p.title, lang) +
        " " +
        pickLang(p.excerpt, lang) +
        " " +
        pickLang(p.tag, lang)
      ).toLowerCase();
      return hay.includes(q);
    }

    function paint() {
      const filtered = (posts || []).filter(matches);
      const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      page = clamp(page, 1, totalPages);
      const start = (page - 1) * PAGE_SIZE;
      const pageRows = filtered.slice(start, start + PAGE_SIZE);

      grid.innerHTML = "";
      if (!pageRows.length) {
        grid.innerHTML = '<div class="empty-hint">' + escapeHtml(tr("blogNoArticles") || "No articles found.") + "</div>";
      } else {
        grid.innerHTML = pageRows.map((p) => htmlPsBlogCard(p, lang)).join("");
      }

      if (infoEl) infoEl.textContent = "Page " + page + " / " + totalPages;
      if (prevBtn) prevBtn.disabled = page <= 1;
      if (nextBtn) nextBtn.disabled = page >= totalPages;
    }

    if (searchEl) {
      searchEl.addEventListener(
        "input",
        () => {
          q = String(searchEl.value || "").trim().toLowerCase();
          page = 1;
          paint();
        },
        { signal }
      );
    }
    if (tagEl) {
      tagEl.addEventListener(
        "change",
        () => {
          tag = String(tagEl.value || "");
          page = 1;
          paint();
        },
        { signal }
      );
    }
    if (prevBtn) prevBtn.addEventListener("click", () => ((page -= 1), paint()), { signal });
    if (nextBtn) nextBtn.addEventListener("click", () => ((page += 1), paint()), { signal });

    paint();
  }

  // -----------------------
  // Article
  // -----------------------
  async function renderArticle() {
    const titleEl = document.getElementById("blog-title") || document.getElementById("articleTitle");
    const excerptEl = document.getElementById("articleExcerpt");
    const contentEl = document.getElementById("blog-content") || document.getElementById("articleContent");
    const relatedGrid = document.getElementById("relatedGrid");
    const kickerEl = document.getElementById("articleKicker");
    const publishedEl = document.getElementById("articlePublishedTime");
    const readTimeEl = document.getElementById("articleReadTime");
    const featuredFig = document.getElementById("articleFeaturedFigure");
    const featuredImg = document.getElementById("articleFeaturedImg");
    const langMeta = document.getElementById("blogPostingLangMeta");

    if (!contentEl) {
      console.error("[Pearly Blog] Missing #blog-content (or #articleContent) container.");
      const main = document.getElementById("blogPostMain") || document.querySelector("main");
      if (main) {
        main.insertAdjacentHTML(
          "beforeend",
          '<div class="blog-post-shell"><div class="empty-hint">' +
            escapeHtml(tr("blogNotFound") || "Blog page layout error.") +
            "</div></div>"
        );
      }
      scheduleBlogPostMainPadSync();
      return;
    }

    const slug = String(extractBlogSlug() || "").trim();
    console.log("[Pearly Blog] Slug:", slug);

    if (!slug) {
      contentEl.innerHTML =
        '<div class="empty-hint">' + escapeHtml(tr("blogMissingSlug") || "Missing article slug.") + "</div>";
      scheduleBlogPostMainPadSync();
      return;
    }

    try {
      const post = await fetchJson("/api/blog/" + encodeURIComponent(slug));
      console.log("[Pearly Blog] Data:", post);

      markSameOriginBlogApi();
      const lang = currentLang();

      if (langMeta) langMeta.setAttribute("content", lang === "en" ? "en" : "ar");

      /* Reading column follows article language (fixes EN punctuation under site RTL, e.g. "?Why…") */
      const articleRoot = document.getElementById("blogPostingArticle");
      if (articleRoot) {
        articleRoot.setAttribute("dir", lang === "en" ? "ltr" : "rtl");
        articleRoot.setAttribute("lang", lang === "en" ? "en" : "ar");
      }

      const metaTitle = pickLang(post.meta_title, lang) || pickLang(post.title, lang) || "Blog | Pearly Smile";
      const metaDesc =
        pickLang(post.meta_description, lang) || pickLang(post.excerpt, lang) || "Pearly Smile blog article.";
      const headline = pickLang(post.title, lang) || "";
      const heroUrl = resolveHeroImage(post);

      setMetaTitle(metaTitle);
      setMetaDescription(metaDesc);

      const origin = location.protocol === "file:" ? apiBase() : location.origin;
      const canonicalPath =
        location.protocol === "file:"
          ? "blog-post.html?slug=" + encodeURIComponent(slug)
          : "/blog/" + encodeURIComponent(slug);
      const absoluteUrl = origin.replace(/\/$/, "") + (canonicalPath.indexOf("/") === 0 ? canonicalPath : "/" + canonicalPath);
      setAbsoluteCanonical(absoluteUrl);

      setSocialMeta({
        title: metaTitle,
        description: metaDesc,
        imageUrl: heroUrl || undefined,
        url: absoluteUrl,
        type: "article",
      });

      if (titleEl) {
        titleEl.textContent = headline;
        titleEl.removeAttribute("data-translate");
      }
      if (excerptEl) excerptEl.textContent = pickLang(post.excerpt, lang) || "";

      const tagText = pickLang(post.tag, lang);
      if (kickerEl) {
        if (tagText) {
          kickerEl.textContent = tagText;
          kickerEl.hidden = false;
        } else {
          kickerEl.textContent = "";
          kickerEl.hidden = true;
        }
      }

      const rtLine = post.read_time
        ? lang === "ar"
          ? String(post.read_time) + " " + (tr("blogReadTimeSuffix") || "دقائق قراءة")
          : String(post.read_time) + " " + (tr("blogReadTimeSuffix") || "min read")
        : tr("blogQuickRead") || "";
      if (readTimeEl) {
        readTimeEl.textContent = rtLine;
        readTimeEl.hidden = !rtLine;
      }

      const pubIso = post.published_at || post.updated_at || "";
      if (publishedEl) {
        if (pubIso) {
          publishedEl.setAttribute("datetime", pubIso);
          publishedEl.textContent = formatPostDate(pubIso, lang);
          publishedEl.hidden = false;
        } else {
          publishedEl.textContent = "";
          publishedEl.removeAttribute("datetime");
          publishedEl.hidden = true;
        }
      }

      /* Separator between author and date: show only when there is a date */
      const sepDate = document.querySelector(".blog-reader-meta-row .blog-reader-meta-sep:not(.blog-reader-meta-sep--read)");
      if (sepDate) sepDate.hidden = !pubIso;

      /* Separator between date and readtime: show only when both are present */
      const sepRead = document.querySelector(".blog-reader-meta-sep--read");
      if (sepRead) sepRead.hidden = !pubIso || !rtLine;

      if (pubIso) upsertMeta("property", "article:published_time", pubIso);
      if (post.updated_at || post.published_at) {
        upsertMeta("property", "article:modified_time", post.updated_at || post.published_at);
      }
      if (tagText) upsertMeta("property", "article:section", tagText);
      upsertMeta("property", "article:author", "Pearly Smile Dental Center");
      upsertMeta("name", "keywords", [tagText, headline, "dental clinic", "Pearly Smile"].filter(Boolean).join(", "));

      if (featuredFig && featuredImg) {
        if (heroUrl) {
          featuredImg.alt = headline ? headline : tr("blogPageTitle") || "";
          featuredImg.onload = function () {
            try {
              const w = featuredImg.naturalWidth;
              const h = featuredImg.naturalHeight;
              if (w > 0 && h > 0) {
                featuredImg.setAttribute("width", String(w));
                featuredImg.setAttribute("height", String(h));
              }
            } catch (e0) {
              /* no-op */
            }
            featuredImg.onload = null;
          };
          featuredImg.src = heroUrl;
          featuredFig.hidden = false;
        } else {
          featuredFig.hidden = true;
          featuredImg.removeAttribute("src");
          featuredImg.removeAttribute("width");
          featuredImg.removeAttribute("height");
        }
      }

      const bodyHtml = resolveArticleHtml(post, lang);
      if (!bodyHtml.trim()) {
        contentEl.innerHTML =
          '<div class="empty-hint">' +
          escapeHtml(tr("blogEmptyContent") || "This article has no body content yet.") +
          "</div>";
      } else {
        contentEl.innerHTML = bodyHtml;
      }

      if (relatedGrid) {
        const all = await fetchJson("/api/blog");
        const related = [];
        const wanted = Array.isArray(post.related_slugs) ? post.related_slugs.map(String) : [];
        if (wanted.length) {
          const map = new Map(all.map((p) => [String(p.slug), p]));
          wanted.forEach((s) => {
            const p = map.get(s);
            if (p && p.slug !== post.slug) related.push(p);
          });
        } else {
          (all || []).forEach((p) => {
            if (!p || p.slug === post.slug) return;
            if (post.tag && p.tag && tagsMatch(post.tag, p.tag, lang)) related.push(p);
          });
        }
        const top = related.slice(0, 4);
        relatedGrid.innerHTML = top.length
          ? top.map((p) => htmlPsBlogCard(p, lang)).join("")
          : '<div class="empty-hint">' + escapeHtml(tr("blogNoRelated") || "No related articles yet.") + "</div>";
      }

      if (typeof Analytics !== "undefined" && Analytics.trackEvent) {
        Analytics.trackEvent("page_view", { page: (location.pathname || "") + "" });
      }

      try {
        const pageUrl = absoluteUrl;
        const excerpt = pickLang(post.excerpt, lang) || "";
        const tagTextLd = pickLang(post.tag, lang) || "";
        const ld = {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: headline,
          description: metaDesc || excerpt || "",
          image: heroUrl ? [heroUrl] : undefined,
          url: pageUrl,
          mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
          datePublished: pubIso ? pubIso : undefined,
          dateModified: post.updated_at || post.published_at || undefined,
          keywords: [tagTextLd, headline].filter(Boolean).join(", "),
          author: {
            "@type": "Organization",
            name: "Pearly Smile Dental Center",
          },
          publisher: {
            "@type": "Organization",
            name: "Pearly Smile Dental Center",
          },
          inLanguage: lang === "en" ? "en" : "ar",
        };
        let el = document.getElementById("ps-jsonld-blogpost");
        if (!el) {
          el = document.createElement("script");
          el.type = "application/ld+json";
          el.id = "ps-jsonld-blogpost";
          document.head.appendChild(el);
        }
        el.textContent = JSON.stringify(ld);
      } catch (e) {}
    } catch (e) {
      console.error("[Pearly Blog] Failed to load article:", slug, e);
      contentEl.innerHTML =
        '<div class="empty-hint">' + escapeHtml(tr("blogNotFound") || "Article not found.") + "</div>";
    } finally {
      // #region agent log
      _dbgBlogPad("renderArticle finally", "H5", { slug: String(extractBlogSlug() || "").trim() });
      // #endregion
      scheduleBlogPostMainPadSync();
    }
  }

  // Public API for global LanguageManager hook
  window.Blog = {
    refreshLanguage: function (forcedLang) {
      const page = currentPageType();
      if (page === "blog") {
        setMetaDescription(tr("blogPageDescription"));
        fetchJson("/api/blog")
          .then((posts) => {
            markSameOriginBlogApi();
            renderListing(Array.isArray(posts) ? posts : []);
          })
          .catch(() => {});
      } else if (page === "blog_post") {
        renderArticle();
      }
    },
    /** Called from App.init after i18n — nav text reflows; re-measure #blogPostMain padding */
    resyncArticleMainPad: function () {
      // #region agent log
      _dbgBlogPad("Blog.resyncArticleMainPad", "H7", { page: currentPageType() });
      // #endregion
      scheduleBlogPostMainPadSync();
    },
  };

  // Init
  const page = currentPageType();
  // #region agent log
  _dbgBlogPad("blog.js init", "H1_H5", {
    page,
    dataPageAttr: document.documentElement && document.documentElement.getAttribute("data-page"),
    readyState: document.readyState,
    path: typeof location !== "undefined" ? location.pathname : "",
  });
  // #endregion
  initBlogNavbarBehavior();
  if (page === "blog_post") {
    scheduleBlogPostMainPadSync();
    attachBlogPostNavPadObservers();
    let _blogPadResizeT = null;
    window.addEventListener(
      "resize",
      function () {
        clearTimeout(_blogPadResizeT);
        _blogPadResizeT = setTimeout(scheduleBlogPostMainPadSync, 100);
      },
      { passive: true }
    );
    if (typeof document !== "undefined" && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(scheduleBlogPostMainPadSync).catch(function () {});
    }
  }
  if (page === "blog") {
    setMetaDescription(tr("blogPageDescription"));
    fetchJson("/api/blog")
      .then((posts) => {
        markSameOriginBlogApi();
        renderListing(Array.isArray(posts) ? posts : []);
      })
      .catch(() => {
        const grid = document.getElementById("blogGrid");
        if (grid) grid.innerHTML = '<div class="empty-hint">' + escapeHtml(tr("blogStartApi") || "Unable to load blog posts. Start the API server.") + "</div>";
      });
  } else if (page === "blog_post") {
    function bootArticle() {
      scheduleBlogPostMainPadSync();
      renderArticle();
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", bootArticle, { once: true });
    } else {
      bootArticle();
    }
  }
})();

