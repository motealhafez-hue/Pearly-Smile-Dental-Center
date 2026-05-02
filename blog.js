// Mobile-first Blog system: listing + article rendering.
(function () {
  "use strict";

  function currentLang() {
    return localStorage.getItem("ps-lang") || document.documentElement.lang || "ar";
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
      return location.protocol === "file:" ? "http://127.0.0.1:8000" : location.origin;
    } catch (e) {
      return "http://127.0.0.1:8000";
    }
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
    const s = encodeURIComponent(slug || "");
    if (location.protocol === "file:") return "blog-post.html?slug=" + s;
    return "/blog/" + s;
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
    let el = document.querySelector('link[rel="canonical"]');
    if (!el) {
      el = document.createElement("link");
      el.setAttribute("rel", "canonical");
      document.head.appendChild(el);
    }
    el.setAttribute("href", url);
  }

  async function fetchJson(path) {
    const r = await fetch(apiBase() + path);
    if (!r.ok) throw new Error("Request failed");
    return r.json();
  }

  // -----------------------
  // Listing
  // -----------------------
  function renderListing(posts) {
    const grid = document.getElementById("blogGrid");
    if (!grid) return;

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
        grid.innerHTML = pageRows
          .map((p) => {
            const title = pickLang(p.title, lang);
            const excerpt = pickLang(p.excerpt, lang);
            const tagText = pickLang(p.tag, lang);
            const imgStyle = p.hero_image
              ? "background-image:url('" + String(p.hero_image).replace(/'/g, "%27") + "')"
              : "";
            const rt = p.read_time
              ? (lang === "ar"
                  ? String(p.read_time) + " " + (tr("blogReadTimeSuffix") || "دقائق قراءة")
                  : String(p.read_time) + " " + (tr("blogReadTimeSuffix") || "min read"))
              : tr("blogQuickRead") || "Quick read";
            const tg = tagText ? '<span class="offer-tag">' + escapeHtml(tagText) + "</span>" : "";
            return (
              '<a class="offer-card" href="' +
              escapeHtml(postUrl(p.slug)) +
              '">' +
              '<div class="offer-image" aria-hidden="true" style="' +
              escapeHtml(imgStyle) +
              '"></div>' +
              '<div class="offer-content">' +
              tg +
              "<h3>" +
              escapeHtml(title || "") +
              "</h3>" +
              '<p style="margin-top:10px">' +
              escapeHtml(excerpt || "") +
              "</p>" +
              '<span style="margin-top:12px;color:var(--muted);font-weight:700">' +
              escapeHtml(rt) +
              "</span>" +
              '<span class="btn btn-secondary" style="margin-top:14px">' +
              escapeHtml(tr("blogReadMore") || "Read more") +
              "</span>" +
              "</div></a>"
            );
          })
          .join("");
      }

      if (infoEl) infoEl.textContent = "Page " + page + " / " + totalPages;
      if (prevBtn) prevBtn.disabled = page <= 1;
      if (nextBtn) nextBtn.disabled = page >= totalPages;
    }

    if (searchEl) {
      searchEl.addEventListener("input", () => {
        q = String(searchEl.value || "").trim().toLowerCase();
        page = 1;
        paint();
      });
    }
    if (tagEl) {
      tagEl.addEventListener("change", () => {
        tag = String(tagEl.value || "");
        page = 1;
        paint();
      });
    }
    if (prevBtn) prevBtn.addEventListener("click", () => ((page -= 1), paint()));
    if (nextBtn) nextBtn.addEventListener("click", () => ((page += 1), paint()));

    paint();
  }

  // -----------------------
  // Article
  // -----------------------
  async function renderArticle() {
    const titleEl = document.getElementById("articleTitle");
    const excerptEl = document.getElementById("articleExcerpt");
    const metaEl = document.getElementById("articleMeta");
    const heroEl = document.getElementById("articleHero");
    const contentEl = document.getElementById("articleContent");
    const relatedGrid = document.getElementById("relatedGrid");
    if (!contentEl) return;

    let slug = "";
    if (location.protocol === "file:") {
      const u = new URL(location.href);
      slug = u.searchParams.get("slug") || "";
    } else {
      const m = location.pathname.match(/\/blog\/(.+)$/);
      slug = m ? decodeURIComponent(m[1]) : "";
    }
    slug = String(slug || "").trim();
    if (!slug) {
      contentEl.innerHTML = '<div class="empty-hint">' + escapeHtml(tr("blogMissingSlug") || "Missing article slug.") + "</div>";
      return;
    }

    try {
      const post = await fetchJson("/api/blog/" + encodeURIComponent(slug));
      const lang = currentLang();

      const metaTitle = pickLang(post.meta_title, lang) || pickLang(post.title, lang) || "Blog | Pearly Smile";
      const metaDesc =
        pickLang(post.meta_description, lang) || pickLang(post.excerpt, lang) || "Pearly Smile blog article.";
      setMetaTitle(metaTitle);
      setMetaDescription(metaDesc);
      setCanonical(location.protocol === "file:" ? "blog-post.html?slug=" + encodeURIComponent(slug) : location.href);

      if (titleEl) titleEl.textContent = pickLang(post.title, lang) || "";
      if (excerptEl) excerptEl.textContent = pickLang(post.excerpt, lang) || "";
      if (metaEl) {
        const rt = post.read_time
          ? (lang === "ar"
              ? String(post.read_time) + " " + (tr("blogReadTimeSuffix") || "دقائق قراءة")
              : String(post.read_time) + " " + (tr("blogReadTimeSuffix") || "min read"))
          : tr("blogQuickRead") || "Quick read";
        const tagText = pickLang(post.tag, lang);
        const tag = tagText ? " · " + tagText : "";
        metaEl.textContent = rt + tag;
      }
      if (heroEl && post.hero_image) {
        heroEl.style.backgroundImage =
          "linear-gradient(180deg, rgba(15,23,42,0.58), rgba(15,23,42,0.12)), url('" +
          String(post.hero_image).replace(/'/g, "%27") +
          "')";
        heroEl.style.backgroundSize = "cover";
        heroEl.style.backgroundPosition = "center";
      }

      // Content is admin-managed HTML (trusted). Keep structure clean for SEO.
      contentEl.innerHTML = pickLang(post.content_html, lang) || "";

      // Related
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
          // fallback: same tag
          (all || []).forEach((p) => {
            if (!p || p.slug === post.slug) return;
            if (post.tag && p.tag === post.tag) related.push(p);
          });
        }
        const top = related.slice(0, 4);
        relatedGrid.innerHTML = top.length
          ? top
              .map((p) => {
                const title = pickLang(p.title, lang);
                const excerpt = pickLang(p.excerpt, lang);
                const tagText = pickLang(p.tag, lang);
                const imgStyle = p.hero_image
                  ? "background-image:url('" + String(p.hero_image).replace(/'/g, "%27") + "')"
                  : "";
                return (
                  '<a class="offer-card" href="' +
                  escapeHtml(postUrl(p.slug)) +
                  '">' +
                  '<div class="offer-image" aria-hidden="true" style="' +
                  escapeHtml(imgStyle) +
                  '"></div>' +
                  '<div class="offer-content">' +
                  (tagText ? '<span class="offer-tag">' + escapeHtml(tagText) + "</span>" : "") +
                  "<h3>" +
                  escapeHtml(title || "") +
                  "</h3>" +
                  "<p>" +
                  escapeHtml(excerpt || "") +
                  "</p>" +
                  '<span class="btn btn-secondary" style="margin-top:14px">' +
                  escapeHtml(tr("blogReadMore") || "Read more") +
                  "</span>" +
                  "</div></a>"
                );
              })
              .join("")
          : '<div class="empty-hint">' + escapeHtml(tr("blogNoRelated") || "No related articles yet.") + "</div>";
      }

      // Tracking
      if (typeof Analytics !== "undefined" && Analytics.trackEvent) {
        Analytics.trackEvent("page_view", { page: (location.pathname || "") + "" });
      }

      // JSON-LD BlogPosting (AI/search friendly)
      try {
        const origin = location.protocol === "file:" ? apiBase() : location.origin;
        const pageUrl = origin + (location.pathname || "/");
        const title = pickLang(post.title, lang) || "";
        const excerpt = pickLang(post.excerpt, lang) || "";
        const tagText = pickLang(post.tag, lang) || "";
        const heroUrl = post.hero_image ? String(post.hero_image) : "";
        const ld = {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: title,
          description: metaDesc || excerpt || "",
          image: heroUrl ? heroUrl : undefined,
          url: pageUrl,
          mainEntityOfPage: pageUrl,
          keywords: [tagText, title].filter(Boolean).join(", "),
          publisher: { "@type": "Organization", name: "Pearly Smile Dental Center" },
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
      contentEl.innerHTML = '<div class="empty-hint">' + escapeHtml(tr("blogNotFound") || "Article not found.") + "</div>";
    }
  }

  // Public API for global LanguageManager hook
  window.Blog = {
    refreshLanguage: function () {
      // Repaint dynamic content to match new lang
      const page = document.documentElement && document.documentElement.dataset ? document.documentElement.dataset.page : "";
      if (page === "blog") {
        setMetaDescription(tr("blogPageDescription"));
        fetchJson("/api/blog")
          .then((posts) => renderListing(Array.isArray(posts) ? posts : []))
          .catch(() => {});
      } else if (page === "blog_post") {
        renderArticle();
      }
    },
  };

  // Init
  const page = document.documentElement && document.documentElement.dataset ? document.documentElement.dataset.page : "";
  if (page === "blog") {
    setMetaDescription(tr("blogPageDescription"));
    fetchJson("/api/blog")
      .then((posts) => renderListing(Array.isArray(posts) ? posts : []))
      .catch(() => {
        const grid = document.getElementById("blogGrid");
        if (grid) grid.innerHTML = '<div class="empty-hint">' + escapeHtml(tr("blogStartApi") || "Unable to load blog posts. Start the API server.") + "</div>";
      });
  } else if (page === "blog_post") {
    renderArticle();
  }
})();

